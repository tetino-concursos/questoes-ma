'use strict';

// Read Git objects only. Never check out, import or execute the proposed files.
const {execFileSync} = require('node:child_process');
const {TextDecoder} = require('node:util');
const path = require('node:path');
const ROOT = new Set(['.gitignore', 'CNAME', 'index.html', 'admin.html', 'site.html']);
const CONTROL = new Set(['.github/scripts/publication-guard.cjs', '.github/workflows/publication-guard.yml']);
const EXT = new Set(['.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.ico', '.ttf', '.otf', '.woff', '.woff2', '.wasm', '.txt']);
const TEXT = new Set(['.css', '.js', '.json', '.svg', '.txt', '.html', '.cjs', '.yml']);
const MAX_FILE = 20 * 1024 * 1024;
const MAX_TOTAL = 100 * 1024 * 1024;
const patterns = [
  ['private-key', /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/],
  ['supabase-secret', /\bsb_secret_[A-Za-z0-9_-]{16,}/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['provider-secret', /\b(?:sk_live_[A-Za-z0-9]{16,}|sk-proj-[A-Za-z0-9_-]{24,}|APP_USR-\d{12,}-[A-Za-z0-9-]{20,})/],
];

function allowed(name) {
  if (ROOT.has(name) || CONTROL.has(name)) return true;
  if (!name.startsWith('tetino_assets/')) return false;
  const parts = name.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || p.startsWith('.') || /[\\\x00-\x1f\x7f]/.test(p))) return false;
  if (parts.some(p => /(?:^|[._ -])(?:env|secret|credentials?|backup|dump|private|debug|migration|migracao)(?:[._ -]|$)/i.test(p))) return false;
  return EXT.has(path.posix.extname(name).toLowerCase()) || /(?:^|\/)(?:LICENSE|OFL)(?:\.txt)?$/.test(name) || /\.LICENSE$/.test(name);
}

function inspect(name, buffer) {
  const errors = [];
  // Scan binary bytes as well; text decodability is checked separately.
  const raw = buffer.toString('utf8');
  for (const [id, regex] of patterns) if (regex.test(raw)) errors.push(id);
  for (const match of raw.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      if (payload.role !== 'anon') errors.push('non-public-jwt');
    } catch { errors.push('unclassified-jwt'); }
  }
  if (TEXT.has(path.posix.extname(name).toLowerCase()) || ROOT.has(name) || /(?:^|\/)LICENSE$|\.LICENSE$/.test(name)) {
    try { new TextDecoder('utf-8', {fatal: true}).decode(buffer); } catch { errors.push('invalid-text-encoding'); }
    if (buffer.includes(0)) errors.push('binary-in-text');
  }
  if (name === 'CNAME' && raw.trim() !== 'tetinoconcursos.com.br') errors.push('unexpected-domain');
  return [...new Set(errors)];
}

function verify(ref, base, cwd = process.cwd()) {
  const git = (...args) => execFileSync('git', args, {cwd, maxBuffer: MAX_FILE + 1024 * 1024, timeout: 20000, stdio: ['pipe', 'pipe', 'pipe']});
  const resolve = (r, kind) => {
    if (typeof r !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(r) || r.startsWith('-')) throw new Error('invalid-ref');
    return git('rev-parse', '--verify', r + '^{' + kind + '}').toString().trim();
  };
  const target = resolve(ref, 'tree');
  let trees = [target];
  if (base) {
    const head = resolve(ref, 'commit'), start = resolve(base, 'commit');
    git('merge-base', start, head); // Fail closed if shallow history cannot establish a common base.
    const commits = git('rev-list', '--max-count=51', head, '--not', start).toString().trim().split('\n').filter(Boolean);
    if (commits.length > 50) throw new Error('too-many-new-commits');
    trees.push(...commits.map(c => resolve(c, 'tree')));
  }
  trees = [...new Set(trees)];
  const checked = new Set(), failures = [];
  let fileCount = 0;
  for (const tree of trees) {
    const entries = git('ls-tree', '-r', '-l', '-z', tree).toString('utf8').split('\0').filter(Boolean);
    if (!entries.length || entries.length > 2000) throw new Error('invalid-file-count');
    const found = new Set();
    let total = 0;
    for (const entry of entries) {
      const m = /^(\d+) (\w+) ([a-f0-9]{40,64})\s+(\d+|-)\t([\s\S]+)$/.exec(entry);
      if (!m) throw new Error('invalid-tree-entry');
      const [, mode, type, sha, bytes, name] = m;
      found.add(name); fileCount++;
      // Do not print attacker-controlled paths or matching secret values to CI logs.
      if (mode !== '100644' || type !== 'blob' || !allowed(name)) { failures.push('forbidden-path-or-mode'); continue; }
      const size = Number(bytes); total += size;
      if (!Number.isSafeInteger(size) || size > MAX_FILE || total > MAX_TOTAL) throw new Error('size-budget-exceeded');
      const key = name + ':' + sha;
      if (!checked.has(key)) {
        checked.add(key);
        const body = git('cat-file', 'blob', sha);
        failures.push(...inspect(name, body));
      }
    }
    for (const required of [...ROOT, ...CONTROL]) if (!found.has(required)) failures.push('required-file-missing');
  }
  if (failures.length) throw new Error([...new Set(failures)].sort().join(','));
  return {status: 'APROVADO COM EVIDÊNCIA', tree: target, trees: trees.length, entries: fileCount, blobs: checked.size};
}

if (require.main === module) {
  try {
    if (process.argv.length < 3 || process.argv.length > 4) throw new Error('usage: node publication-guard.cjs REF [BASE]');
    console.log(JSON.stringify(verify(process.argv[2], process.argv[3])));
  } catch (error) {
    // Git stderr can include proposed content: only emit our bounded error categories.
    const code = error.status !== undefined ? 'git-read-failed' : String(error.message).slice(0, 300);
    console.error(JSON.stringify({status: 'REPROVADO', reason: code}));
    process.exitCode = 1;
  }
}
module.exports = {allowed, inspect, verify};
