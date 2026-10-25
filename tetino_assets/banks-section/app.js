(() => {
  'use strict';
  const root = document.querySelector('#bancas .ttb-section');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...root.querySelectorAll('.ttb-card2')];
  const objects = [...root.querySelectorAll('.ttb-card3, .ttb-arrow-slot, .ttb-trophy-slot, .ttb-rail .ttb-card')];
  const running = new Map();
  const lights = new Map();
  let frame = 0, point = null, activeCard = null, activeObject = null;
  function light(el) {
    if (!el) return;
    clearTimeout(lights.get(el));
    el.classList.add('ttb-is-lit');
    lights.set(el, setTimeout(() => {
      el.classList.remove('ttb-is-lit');
      lights.delete(el);
    }, 780));
  }
  function pulse(el) {
    if (!el) return;
    light(el);
    if (reduced.matches) return;
    running.get(el)?.cancel();
    const animation = el.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-3px) scale(1.008)', offset: .42 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 520, easing: 'ease-out' });
    running.set(el, animation);
    const clean = () => { if (running.get(el) === animation) running.delete(el); };
    animation.onfinish = animation.oncancel = clean;
  }
  function hit(el, p) {
    const b = el.getBoundingClientRect();
    return p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
  }
  function follow(p) {
    point = p;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!point) return;
      // Read all positions before starting animations.
      const card = cards.find(el => hit(el, point)) || null;
      const object = objects.find(el => hit(el, point)) || null;
      if (card !== activeCard) { activeCard = card; pulse(card); }
      if (object !== activeObject) { activeObject = object; pulse(object); }
    });
  }
  function reset() { point = null; activeCard = activeObject = null; }
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
  root.addEventListener('focusin', e => {
    const card = e.target.closest('.ttb-card2');
    pulse(card);
  });
  root.addEventListener('click', e => {
    const card = e.target.closest('.ttb-card2');
    pulse(card);
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { for (const a of running.values()) a.cancel(); running.clear(); reset(); }
  });
})();
