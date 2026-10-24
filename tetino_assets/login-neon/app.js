 'use strict';
const ttLoginPassword=document.getElementById('senha');
const ttLoginToggle=document.getElementById('tt-toggle-password');
ttLoginToggle.addEventListener('click',()=>{
 const show=ttLoginPassword.type==='password';
 ttLoginPassword.type=show?'text':'password';
 ttLoginToggle.setAttribute('aria-pressed',String(show));
 ttLoginToggle.setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');
});
ttLoginPassword.addEventListener('keydown',event=>{
 if(event.key==='Enter'&&!event.isComposing){event.preventDefault();document.getElementById('entrar').click()}
});

(() => {
 const screen = document.getElementById('login-screen');
 if (!screen) return;
 const selector = '#entrar,#cadastrar,#recuperar,#tt-toggle-password,.login-logo,.benefit-icon-slot,.tt-login-return a,.icon-mail,.icon-lock';
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 const animations = new Set();
 let current = null;
 let frame = 0;
 let point = null;
 function followTouch(event) {
  if (reducedMotion.matches || document.body.classList.contains('logged-in') || event.touches.length !== 1) return;
  const touch = event.touches[0];
  point = { x: touch.clientX, y: touch.clientY };
  if (frame) return;
  frame = requestAnimationFrame(() => {
   frame = 0;
   if (!point || reducedMotion.matches || document.body.classList.contains('logged-in')) return;
   const target = document.elementFromPoint(point.x, point.y)?.closest(selector);
   if (!target || !screen.contains(target)) { current = null; return; }
   if (target === current) return;
   current = target;
   const animation = target.animate([
    { transform: 'translateY(0) scale(1)' },
    { transform: 'translateY(-7px) scale(1.012)', offset: 0.45 },
    { transform: 'translateY(0) scale(1)' }
   ], { duration: 440, easing: 'ease-out' });
   animations.add(animation);
   animation.onfinish = animation.oncancel = () => animations.delete(animation);
  });
 }
 function endTouch() { current = null; point = null; }
 // Never prevent native scrolling, zoom, focus, clicks or authentication actions.
 document.addEventListener('touchstart', followTouch, { passive: true });
 document.addEventListener('touchmove', followTouch, { passive: true });
 document.addEventListener('touchend', endTouch, { passive: true });
 document.addEventListener('touchcancel', endTouch, { passive: true });
 reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) { for (const animation of animations) animation.cancel(); endTouch(); }
 });
})();
