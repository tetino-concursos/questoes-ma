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
