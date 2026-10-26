(() => {
  'use strict';
  const regions = [...document.querySelectorAll('[data-ending-region]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Map();
  let last = null, point = null, frame = 0;
  const plansLink = document.querySelector('.tte-plan-link');
  plansLink?.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const detail=document.getElementById('detail-section');
    const plans=document.getElementById('planos');
    if(!detail||detail.classList.contains('hidden')||!plans)return;
    event.preventDefault();
    plans.focus({preventScroll:true});
    history.replaceState(null,'','#planos');
    plans.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  });
  function animate(target) {
    if (!target || reduced.matches) return;
    animations.get(target)?.cancel();
    const animation = target.animate([
      { transform:'translateY(0) scale(1)' },
      { transform:'translateY(-3px) scale(1.035)', offset:.45 },
      { transform:'translateY(0) scale(1)' }
    ], { duration:460, easing:'ease-out' });
    animations.set(target, animation);
    animation.finished.then(() => { if (animations.get(target) === animation) animations.delete(target); }).catch(() => {});
  }
  function object(target) {
    const region = target?.closest('[data-ending-region]');
    if (!region) return null;
    return target.closest('[data-ending-motion]') || target.closest('summary')?.querySelector('[data-ending-motion]');
  }
  function pointer(x,y) {
    point = {x,y};
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const target = object(document.elementFromPoint(point.x,point.y));
      if (last !== target) { last = target; animate(target); }
    });
  }
  for (const region of regions) {
    region.addEventListener('pointermove',event => pointer(event.clientX,event.clientY),{passive:true});
    region.addEventListener('touchmove',event => { const touch=event.touches[0];if(touch)pointer(touch.clientX,touch.clientY); },{passive:true});
    region.addEventListener('touchend',()=>{last=null;},{passive:true});
    region.addEventListener('pointerleave',()=>{last=null;},{passive:true});
    region.addEventListener('focusin',event=>animate(object(event.target)));
    region.addEventListener('click',event=>animate(object(event.target)));
  }
  reduced.addEventListener('change',()=>{
    animations.forEach(animation=>animation.cancel());
    animations.clear();last=null;
  });
})();
