(() => {
  'use strict';
  const hero = document.querySelector('#inicio');
  if (!hero) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let current = null;
  let frame = 0;
  let point = null;

  function followTouch(event) {
    if (reducedMotion.matches || !event.touches.length) return;
    const touch = event.touches[0];
    point = { x: touch.clientX, y: touch.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!point || reducedMotion.matches) return;
      const device = document.elementFromPoint(point.x, point.y)?.closest('.hero-device');
      if (!device || !hero.contains(device)) { current = null; return; }
      if (device === current) return;
      current = device;
      const animation = device.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-7px) scale(1.012)', offset: 0.45 },
        { transform: 'translateY(0) scale(1)' }
      ], { duration: 440, easing: 'ease-out' });
      animations.add(animation);
      animation.onfinish = animation.oncancel = () => animations.delete(animation);
    });
  }
  function endTouch() { current = null; point = null; }
  // Passive listeners keep native vertical scrolling and pinch zoom available.
  document.addEventListener('touchstart', followTouch, { passive: true });
  document.addEventListener('touchmove', followTouch, { passive: true });
  document.addEventListener('touchend', endTouch, { passive: true });
  document.addEventListener('touchcancel', endTouch, { passive: true });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { for (const animation of animations) animation.cancel(); endTouch(); }
  });
})();
