(() => {
  'use strict';
  const root = document.querySelector('#courses-section .ttp-section');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Map();
  const timers = new Map();
  let frame = 0, point = null, currentCard = null, currentObject = null;
  function pulse(el) {
    if (!el) return;
    if (el.matches('.ttp-card')) {
      clearTimeout(timers.get(el));
      el.classList.add('ttp-is-active');
      timers.set(el, setTimeout(() => { el.classList.remove('ttp-is-active'); timers.delete(el); }, 560));
    }
    if (reduced.matches) return;
    running.get(el)?.cancel();
    const middle = el.matches('.ttp-media') ? 'scale(1.015)' :
      el.matches('.ttp-arrow-slot') ? 'translateX(3px)' : 'translateY(-3px)';
    const a = el.animate([
      { transform: 'none' },
      { transform: middle, offset: .42 },
      { transform: 'none' }
    ], { duration: 460, easing: 'ease-out' });
    running.set(el, a);
    const cleanup = () => { if (running.get(el) === a) running.delete(el); };
    a.onfinish = a.oncancel = cleanup;
  }
  function inside(el, p) {
    const r = el.getBoundingClientRect();
    return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
  }
  function follow(p) {
    point = p;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!point || !root.getClientRects().length) return;
      const cards = [...root.querySelectorAll('.ttp-card')];
      const objects = [...root.querySelectorAll('.ttp-media, .ttp-arrow-slot')];
      const card = cards.find(el => inside(el, point)) || null;
      const object = objects.find(el => inside(el, point)) || null;
      if (card !== currentCard) { currentCard = card; pulse(card); }
      if (object !== currentObject) { currentObject = object; pulse(object); }
    });
  }
  function reset() { point = null; currentCard = currentObject = null; }
  root.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch') follow({ x: e.clientX, y: e.clientY });
  }, { passive: true });
  root.addEventListener('pointerleave', reset, { passive: true });
  function touch(e) {
    if (e.touches.length === 1) follow({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }
  document.addEventListener('touchstart', touch, { passive: true });
  document.addEventListener('touchmove', touch, { passive: true });
  document.addEventListener('touchend', reset, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });
  root.addEventListener('focusin', e => pulse(e.target.closest('.ttp-card')));
  root.addEventListener('click', e => pulse(e.target.closest('.ttp-card')));
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      for (const a of running.values()) a.cancel();
      running.clear();
      reset();
    }
  });
})();
