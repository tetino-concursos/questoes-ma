(() => {
  'use strict';
  const control = document.querySelector('#jk-founder .ttf-person-control');
  const portrait = control?.querySelector('.ttf-person-art');
  if (!portrait) return;
  const section = document.querySelector('#jk-founder');
  if (!section) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let animation = null;
  let active = false;
  let point = null;
  let frame = 0;
  function pulse() {
    if (reduced.matches) return;
    animation?.cancel();
    animation = portrait.animate([
      { transform: 'translateY(0) rotate(0) scale(1)' },
      { transform: 'translateY(-5px) rotate(.3deg) scale(1.01)', offset: .45 },
      { transform: 'translateY(0) rotate(0) scale(1)' }
    ], { duration: 480, easing: 'ease-out' });
  }
  function follow(event) {
    if (section.classList.contains('hidden') || reduced.matches || event.touches.length !== 1) return;
    point = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!point) return;
      const target = document.elementFromPoint(point.x, point.y);
      const inside = target && control.contains(target);
      if (inside && !active) pulse();
      active = inside;
    });
  }
  function reset() { active = false; point = null; }
  control.addEventListener('click', pulse);
  document.addEventListener('touchstart', follow, { passive: true });
  document.addEventListener('touchmove', follow, { passive: true });
  document.addEventListener('touchend', reset, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { animation?.cancel(); reset(); }
  });
})();

(() => {
  'use strict';
  const section = document.querySelector('#jk-founder');
  if (!section) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let target = null;
  let point = null;
  let frame = 0;
  function pulse(element) {
    if (!element || reduced.matches) return;
    for (const animation of element.getAnimations()) animation.cancel();
    const animation = element.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-3px) scale(1.012)', offset: .45 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 440, easing: 'ease-out' });
    animations.add(animation);
    animation.onfinish = animation.oncancel = () => animations.delete(animation);
  }
  function follow(event) {
    if (section.classList.contains('hidden') || reduced.matches || event.touches.length !== 1) return;
    point = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!point) return;
      const next = document.elementFromPoint(point.x, point.y)?.closest('#jk-founder [data-reaction]');
      if (next === target) return;
      target = next;
      pulse(target);
    });
  }
  function reset() { target = null; point = null; }
  document.addEventListener('touchstart', follow, { passive: true });
  document.addEventListener('touchmove', follow, { passive: true });
  document.addEventListener('touchend', reset, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { for (const animation of animations) animation.cancel(); reset(); }
  });
})();
