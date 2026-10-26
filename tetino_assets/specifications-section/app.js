(() => {
  'use strict';
  const demo = document.querySelector('#detail-section .tsp-demo');
  const tracks = [...demo.querySelectorAll('.tsp-preview-track')];
  const previous = demo.querySelector('.tsp-previous');
  const next = demo.querySelector('.tsp-next');
  const status = demo.querySelector('.tsp-carousel-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const positions = new Map(tracks.map(track => [track, 0]));
  const pulses = new Map();
  let active = matchMedia('(max-width:760px)').matches ? tracks[1] : tracks[0];
  let requested = null;
  let frame = 0;
  let dragging = null;

  function render() {
    frame = 0;
    const width = active.clientWidth;
    if (!width) return;
    const progress = active.scrollLeft / width;
    const index = Math.max(0, Math.min(active.children.length - 1, Math.round(progress)));
    positions.set(active, index);
    previous.disabled = index === 0;
    next.disabled = index === active.children.length - 1;
    const message = `${index + 1} de ${active.children.length}`;
    if (status.textContent !== message) status.textContent = message;
    // Native scrolling handles the gesture; these layers only add depth.
    [...active.children].forEach((slide, i) => {
      const image = slide.querySelector('img');
      const distance = Math.min(1, Math.abs(i - progress));
      image.style.transform = reduced.matches ? '' : `translateY(${distance * 18}px) scale(${1 - distance * 0.045})`;
      image.style.opacity = reduced.matches ? '' : String(1 - distance * 0.18);
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function go(index) {
    requested = Math.max(0, Math.min(active.children.length - 1, index));
    active.scrollTo({ left: requested * active.clientWidth, behavior: reduced.matches ? 'instant' : 'smooth' });
    schedule();
  }
  previous.addEventListener('click', () => go((requested ?? positions.get(active)) - 1));
  next.addEventListener('click', () => go((requested ?? positions.get(active)) + 1));
  tracks.forEach(track => {
    track.addEventListener('scroll', () => { if (track === active) schedule(); }, { passive: true });
    track.addEventListener('scrollend', () => {
      requested = null;
      if (track !== active || dragging || !track.clientWidth) return;
      const left = Math.round(track.scrollLeft / track.clientWidth) * track.clientWidth;
      if (Math.abs(track.scrollLeft - left) > 1) track.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
      schedule();
    });
    track.addEventListener('touchstart', () => { requested = null; }, { passive: true });
    track.addEventListener('touchend', () => {
      if (track !== active) return;
      requestAnimationFrame(() => go(Math.round(track.scrollLeft / track.clientWidth)));
    }, { passive: true });
    track.addEventListener('wheel', () => { requested = null; }, { passive: true });
    track.addEventListener('keydown', event => {
      const delta = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (delta || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        go(event.key === 'Home' ? 0 : event.key === 'End' ? track.children.length - 1 : (requested ?? positions.get(track)) + delta);
      }
    });
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      requested = null;
      dragging = { track, id: event.pointerId, x: event.clientX, y: event.clientY, left: track.scrollLeft, moved: false };
    });
    track.addEventListener('pointermove', event => {
      if (!dragging || dragging.id !== event.pointerId) return;
      const dx = event.clientX - dragging.x;
      if (!dragging.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - dragging.y)) {
        dragging.moved = true;
        track.setPointerCapture(event.pointerId);
        track.classList.add('is-dragging');
      }
      if (dragging.moved) {
        event.preventDefault();
        track.scrollLeft = dragging.left - dx;
      }
    });
    function finish(event) {
      if (!dragging || dragging.id !== event.pointerId) return;
      const moved = dragging.moved;
      dragging = null;
      track.classList.remove('is-dragging');
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      if (moved) go(Math.round(track.scrollLeft / track.clientWidth));
    }
    track.addEventListener('pointerup', finish);
    track.addEventListener('pointercancel', finish);
    track.addEventListener('lostpointercapture', finish);
  });
  function setView(view) {
    const index = positions.get(active);
    requested = null;
    demo.dataset.view = view;
    active = tracks[view === 'mobile' ? 1 : 0];
    positions.set(active, index);
    demo.querySelectorAll('[data-preview-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.previewView === view)));
    previous.setAttribute('aria-controls', active.id);
    next.setAttribute('aria-controls', active.id);
    active.scrollTo({left: index * active.clientWidth, behavior:'instant'});
    schedule();
  }
  demo.querySelectorAll('[data-preview-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.previewView)));
  setView(matchMedia('(max-width:760px)').matches ? 'mobile' : 'desktop');
  document.getElementById('detail-section').addEventListener('tsp:open', () => {
    requested = null;
    tracks.forEach(track => { positions.set(track,0); track.scrollTo({left:0,behavior:'instant'}); });
    schedule();
  });
  document.getElementById('specification-plans').addEventListener('click', () => {
    const plans = document.getElementById('planos');
    plans.focus({preventScroll:true});
    plans.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  });
  new ResizeObserver(() => {
    active.scrollTo({ left: positions.get(active) * active.clientWidth, behavior: 'instant' });
    schedule();
  }).observe(demo.querySelector('.tsp-media'));

  function pulse(target) {
    if (document.getElementById('detail-section').classList.contains('hidden')) return;
    if (!target || reduced.matches) return;
    if (target.matches('.tsp-arrow')) target = target.querySelector('span');
    pulses.get(target)?.cancel();
    const animation = target.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-3px) scale(1.015)', offset: 0.45 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 460, easing: 'ease-out' });
    pulses.set(target, animation);
    animation.finished.then(() => { if (pulses.get(target) === animation) pulses.delete(target); }).catch(() => {});
  }
  const selector = '.tsp-icon-slot, .tsp-card, .tsp-device, .tsp-view-switch button, .tsp-arrow:not(:disabled), .tsp-cta';
  let lastTarget = null;
  let point = null;
  let pointFrame = 0;
  function hover(x, y) {
    point = { x, y };
    if (pointFrame) return;
    pointFrame = requestAnimationFrame(() => {
      pointFrame = 0;
      const target = document.elementFromPoint(point.x, point.y)?.closest(selector);
      if (target !== lastTarget) { lastTarget = target; pulse(target); }
    });
  }
  document.getElementById('detail-section').addEventListener('pointermove', event => {
    if (!dragging?.moved) hover(event.clientX, event.clientY);
  }, { passive: true });
  document.getElementById('detail-section').addEventListener('touchmove', event => {
    const touch = event.touches[0];
    if (touch) hover(touch.clientX, touch.clientY);
  }, { passive: true });
  document.getElementById('detail-section').addEventListener('touchend', () => { lastTarget = null; }, { passive: true });
  document.getElementById('detail-section').addEventListener('focusin', event => pulse(event.target.closest(selector)));
  document.getElementById('detail-section').addEventListener('click', event => pulse(event.target.closest(selector)));
  reduced.addEventListener('change', () => {
    pulses.forEach(animation => animation.cancel());
    pulses.clear();
    tracks.forEach(track => track.querySelectorAll('img').forEach(image => {
      image.style.transform = '';
      image.style.opacity = '';
    }));
    if (reduced.matches) active.scrollTo({ left: positions.get(active) * active.clientWidth, behavior: 'instant' });
    schedule();
  });
  previous.setAttribute('aria-controls', active.id);
  next.setAttribute('aria-controls', active.id);
  schedule();
})();
