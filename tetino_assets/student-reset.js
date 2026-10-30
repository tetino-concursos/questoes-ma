/* Explicit, per-account study reset. Account identity and course access stay intact. */
'use strict';
(() => {
 const $=id=>document.getElementById(id),dialog=$('tt-study-reset-dialog');
 if(!dialog)return;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const storageKey=id=>'tetino_study_reset_v1_'+id;
 let intent=null,busy=false,done=false,fresh=false,preferencesOwner=null,replayed=false;
 function user(){try{return usuario?{id:usuario.id,auth:authVersion}:null;}catch{return null;}}
 function current(ctx){const now=user();return !!now&&now.id===ctx.id&&now.auth===ctx.auth;}
 function status(value,error=false){$('tt-study-reset-status').textContent=value;$('tt-study-reset-status').classList.toggle('tt-reset-error',error);}
 function setBusy(value){busy=value;dialog.setAttribute('aria-busy',String(value));$('tt-study-reset-confirm').disabled=value;$('tt-study-reset-cancel').disabled=value;$('tt-analytics-reset').disabled=value;}
 function initial(){done=false;replayed=false;$('tt-study-reset-title').textContent='Recomeçar seus estudos?';$('tt-study-reset-description').textContent='Ao confirmar, todos os seus dados de estudo serão apagados:';$('tt-study-reset-list').hidden=false;$('tt-study-reset-note').textContent='Esta ação não pode ser desfeita. Sua conta e seus cursos serão mantidos.';$('tt-study-reset-confirm').textContent='Apagar dados de estudo';$('tt-study-reset-cancel').hidden=false;status('');}
 function open(){
  const ctx=user();if(!ctx||busy)return;
  initial();intent={...ctx,key:crypto.randomUUID()};dialog.showModal();
  if(ttCorrecaoEmAndamento||ttQuestionBusy){status('Aguarde a conclusão da questão antes de reiniciar seus estudos.',true);$('tt-study-reset-confirm').disabled=true;}
  else $('tt-study-reset-confirm').disabled=false;
  $('tt-study-reset-cancel').focus();
 }
 function finish(){const go=done,reload=replayed;done=false;dialog.close();intent=null;if(go&&reload){location.reload();return;}if(go){window.ttNavigateToHome?.();document.querySelector('#tt-home [data-shortcut=continue]')?.focus({preventScroll:true});}}
 function applyPreferences(token,resetAt,full=false){
  const ctx=user();if(!ctx)return;
  fresh=true;preferencesOwner=ctx.id;
  for(const key of [favoriteKey(),progressKey(),'tt-cursos-conhecidos:'+ctx.id])if(key)try{localStorage.removeItem(key);}catch{}
  try{localStorage.removeItem('tt-study-theme');localStorage.setItem(storageKey(ctx.id),token);}catch{}
  favoritos=new Set();progressoRestauradoPara=null;
  for(const id of [...FILTER_IDS,'topico','subtopico']){const field=$(id);if(field)field.selectedIndex=0;}
  window.pickerSelected?.clear();window.pickerMode='todas';if($('picker-search'))$('picker-search').value='';
  if(document.body.classList.contains('tt-theme-dark'))$('tt-theme-toggle')?.click();
  try{localStorage.removeItem('tt-study-theme');}catch{}
  document.querySelectorAll('[data-theme]').forEach(button=>button.classList.toggle('selected',button.dataset.theme==='light'));
  document.body.classList.remove('focus-mode','tt-menu-open');
  usuario.user_metadata={...(usuario.user_metadata||{}),tetino_study_reset_token:token,tetino_study_reset_at:resetAt};delete usuario.user_metadata.tetino_exam_date;
  if(full){
   historico={};selecionada=null;corrigida=false;indice=0;
   for(const q of questoes){delete q.correta;delete q.comentario;}
   try{localStorage.removeItem(GUEST_KEY);}catch{}
   window.TeTinoPerformance?.clear();ttQuestionReset(null);
   $('tt-close-texto')?.click();
  }
  document.dispatchEvent(new Event('tt-study-reset'));
 }
 async function syncPreferences(version){
  const ctx=user();if(!ctx)return;
  try{
   const response=await client.auth.getUser(),fresh=response.data?.user;
   if(response.error||!fresh||fresh.id!==ctx.id||!current(ctx)||version!==authVersion)return;
   usuario.user_metadata={...(fresh.user_metadata||{})};
   const token=usuario.user_metadata.tetino_study_reset_token,at=usuario.user_metadata.tetino_study_reset_at;
   if(!uuid.test(token||'')||!Number.isFinite(Date.parse(at)))return;
   let prior=null;try{prior=localStorage.getItem(storageKey(ctx.id));}catch{}
   if(prior!==token)applyPreferences(token,at,false);
   else try{if(!localStorage.getItem(progressKey()))fresh=true;}catch{fresh=true;}
  }catch{ /* A preference refresh never grants or revokes access. */ }
 }
 async function confirmReset(){
  if(done){finish();return;}
  const ctx=intent;if(!ctx||!current(ctx)||busy||ttCorrecaoEmAndamento||ttQuestionBusy)return;
  setBusy(true);status('Reiniciando seus estudos…');$('tt-study-reset-confirm').textContent='Reiniciando…';
  try{
   const {data,error}=await client.rpc('tetino_reiniciar_estudos',{p_confirmacao:ctx.key});
   if(!current(ctx)||intent!==ctx)return;
   if(error)throw error;
   if(!data||data.reset_token!==ctx.key||!Number.isFinite(Date.parse(data.reset_at)))throw Error('Invalid reset receipt');
   if(data.replayed===true){done=true;replayed=true;$('tt-study-reset-title').textContent='Reinício já realizado';$('tt-study-reset-description').textContent='Esta confirmação já foi processada. Atualize a página para carregar seus dados atuais, sem apagar novamente seus estudos.';$('tt-study-reset-list').hidden=true;$('tt-study-reset-note').textContent='Sua conta e seus cursos continuam disponíveis.';$('tt-study-reset-cancel').hidden=true;$('tt-study-reset-confirm').textContent='Atualizar página';status('Nenhuma nova exclusão foi realizada.');return;}
   applyPreferences(data.reset_token,data.reset_at,true);
   document.dispatchEvent(new Event('tt-account-updated'));estatisticas();filtros(false);
   // filtros(false) must not recreate a resume record after the reset.
   try{localStorage.removeItem(progressKey());}catch{}
   done=true;$('tt-study-reset-title').textContent='Pronto para recomeçar';$('tt-study-reset-description').textContent='Seus dados de estudo foram apagados e as configurações voltaram ao padrão inicial.';$('tt-study-reset-list').hidden=true;$('tt-study-reset-note').textContent='Sua conta e seus cursos continuam disponíveis.';$('tt-study-reset-cancel').hidden=true;$('tt-study-reset-confirm').textContent='Ir para o início';status('Reinício concluído.');
  }catch{
   if(current(ctx)&&intent===ctx){status('Não foi possível confirmar o reinício. Tente novamente ou atualize a página para conferir seus dados.',true);$('tt-study-reset-confirm').textContent='Tentar novamente';}
  }finally{setBusy(false);if(current(ctx)&&intent===ctx)$('tt-study-reset-confirm').focus();}
 }
 $('tt-study-reset-confirm').addEventListener('click',confirmReset);
 $('tt-study-reset-cancel').addEventListener('click',finish);
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy)finish();});
 document.addEventListener('click',event=>{if(event.target.closest?.('#picker-apply,#opcoes .option,#responder,#proxima,#anterior,[data-tt-go="questions"],[data-tt-page="questions"]'))fresh=false;},true);
 document.addEventListener('tt-account-updated',()=>{const ctx=user();if(ctx?.id!==preferencesOwner){fresh=false;preferencesOwner=ctx?.id||null;}if(intent&&(!ctx||ctx.id!==intent.id||ctx.auth!==intent.auth)){done=false;intent=null;if(dialog.open)dialog.close();}});
 window.TeTinoStudyReset=Object.freeze({open,syncPreferences,isFresh:()=>fresh});
})();
