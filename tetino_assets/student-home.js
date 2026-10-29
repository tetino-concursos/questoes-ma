/* Personal display preferences only; never grants course access or changes expiry. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 if(!$('tt-home-greeting'))return;
 const adapter=window.ttStudentHomeAdapter||{
  user:()=>typeof usuario==='undefined'?null:usuario,
  stats:()=>({ready:typeof catalogoCarregado!=='undefined'&&catalogoCarregado,
   answers:typeof historico==='undefined'?[]:Object.values(historico)}),
  courseCount:()=>new Set(Object.entries({...TT_CURSOS_IDS,...ttCursosDinamicos}).filter(([key])=>ttTemCurso(key)).map(([,id])=>id)).size,
  navigate:type=>{
   if(!usuario?.id||!catalogoCarregado||!ttTemAlgumCurso())return;
   if(type==='continue'){
    const progress=readProgress();
    if(!progress){window.ttNavigateToFilter?.();return;}
    const saved=questoes.find(q=>String(q.id)===String(progress.questionId));
    if(!saved){window.ttNavigateToFilter?.();return;}
    let course=progress.course||ttCursoAtivo;
    if(!progress.course&&course==='geral'&&!ttEhGeral(saved)&&ttTemCurso('ace'))course='ace';
    if(!ttTemCurso(course)||!ttEscolherCurso(course)){window.ttNavigateToHome?.();return;}
    window.pickerSelected?.clear();window.pickerMode='todas';
    restoreFilters(progress);$('modo').value='todas';filtros(false);
    // Only restore an authorized question; never restore a saved answer key.
    if(!lista.some(q=>String(q.id)===String(progress.questionId))){window.ttNavigateToFilter?.();return;}
    restorePosition({questionId:progress.questionId});window.ttNavigateToQuestions?.();return;
   }
   document.querySelector('.tt-drawer [data-tt-page="'+(type==='performance'?'analytics':'errors')+'"]').click();
  },
  saveDate:async(date,id)=>{
   if(!usuario?.id||usuario.id!==id)throw Error('Session changed');
   const {data,error}=await client.auth.updateUser({data:{tetino_exam_date:date}});
   if(error||!data?.user||usuario?.id!==id||data.user.id!==id)throw Error('Save failed');
   usuario=data.user;
   document.dispatchEvent(new Event('tt-account-updated'));
  }
 };
 const dialog=$('tt-exam-dialog'),input=$('tt-exam-date'),save=$('tt-exam-save');
 let busy=false,editingUser=null;
 const pad=n=>String(n).padStart(2,'0');
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
 function calendar(value){
  if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return null;
  const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date:null;
 }
 function text(id,value){const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value);}
 function render(){
  const user=adapter.user();
  if(!user?.id){
   text('tt-home-course-count','— liberados');
   document.querySelectorAll('#tt-home [data-shortcut]').forEach(b=>{b.disabled=true;});
   text('tt-home-greeting','Olá.');text('tt-exam-count','Sua próxima prova');text('tt-exam-caption','Defina a data para acompanhar sua preparação.');
   ['tt-home-answered','tt-home-hits','tt-home-rate'].forEach(id=>text(id,'—'));
   if(dialog.open&&!busy)dialog.close();return;
  }
  const m=user.user_metadata||{};
  const name=[m.display_name,m.nickname,m.full_name,m.name].find(v=>typeof v==='string'&&v.trim());
  const first=name?.trim().split(/\s+/)[0];text('tt-home-greeting',first?'Olá, '+first+'.':'Olá.');
  const stats=adapter.stats(),answers=Array.isArray(stats.answers)?stats.answers:[];
  const count=stats.ready?(adapter.courseCount?.()??document.querySelectorAll('#tt-course-gallery article:not([hidden]):not(.tt-course-locked)').length):null;
  text('tt-home-course-count',count===null?'— liberados':count===1?'1 liberado':count+' liberados');
  document.querySelectorAll('#tt-home [data-shortcut]').forEach(b=>{b.disabled=!stats.ready||!count;});
  const hits=answers.filter(a=>a?.acertou===true).length;
  text('tt-home-answered',stats.ready?answers.length:'—');text('tt-home-hits',stats.ready?hits:'—');
  text('tt-home-rate',stats.ready?(answers.length?Math.round(hits/answers.length*100):0)+'%':'—');
  text('tt-home-summary-note',stats.ready?'Com base no seu histórico salvo.':'Carregando seu resumo…');
  const target=calendar(m.tetino_exam_date);
  if(target){
   const days=Math.round((target-calendar(today()))/86400000);
   text('tt-exam-number',Math.abs(days));
   text('tt-exam-count',days>1?'Faltam '+days+' dias':days===1?'Falta 1 dia':days===0?'É hoje!':'Prova realizada');
   const label=new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(target);
   text('tt-exam-caption','Sua prova: '+label);text('tt-exam-edit','Alterar data');
  }else{
   text('tt-exam-number','—');
   text('tt-exam-count','Sua próxima prova');text('tt-exam-caption','Defina a data para acompanhar sua preparação.');text('tt-exam-edit','Definir data da prova');
  }
 }
 $('tt-exam-edit').addEventListener('click',()=>{
  const user=adapter.user();if(!user?.id||busy)return;
  editingUser=user.id;input.min=today();input.max='2099-12-31';
  input.value=calendar(user.user_metadata?.tetino_exam_date)?user.user_metadata.tetino_exam_date:'';
  text('tt-exam-error','');input.removeAttribute('aria-invalid');dialog.showModal();input.focus();
 });
 $('tt-exam-cancel').addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 $('tt-exam-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const user=adapter.user(),value=input.value;
  if(!user?.id||user.id!==editingUser){text('tt-exam-error','Sua sessão mudou. Entre novamente.');return;}
  if(!calendar(value)||value<today()){
   text('tt-exam-error','Escolha a data de hoje ou uma data futura.');input.setAttribute('aria-invalid','true');input.focus();return;
  }
  busy=true;save.disabled=true;$('tt-exam-cancel').disabled=true;text('tt-exam-error','');text('tt-exam-save','Salvando…');
  try{
   await adapter.saveDate(value,user.id);
   if(adapter.user()?.id!==user.id)throw Error('Session changed');
   render();dialog.close();$('tt-exam-edit').focus();
  }catch{text('tt-exam-error','Não foi possível salvar a data. Tente novamente.');}
  finally{busy=false;save.disabled=false;$('tt-exam-cancel').disabled=false;text('tt-exam-save','Salvar data');}
 });
 input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');text('tt-exam-error','');});
 document.addEventListener('tt-account-updated',render);
 document.addEventListener('tt-study-updated',render);
 document.addEventListener('tt-courses-updated',render);
 document.querySelectorAll('#tt-home [data-shortcut]').forEach(button=>button.addEventListener('click',()=>{if(!button.disabled)adapter.navigate?.(button.dataset.shortcut);}));
 const invitation='Conheça o TeTino Concursos: https://tetinoconcursos.com.br/';
 $('tt-referral-copy')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(invitation);text('tt-referral-status','Convite copiado. Solicite a validação das indicações pelo WhatsApp.');}catch{text('tt-referral-status','Não foi possível copiar. Tente novamente.');}});
 $('tt-referral-details')?.addEventListener('click',()=>{
  text('tt-home-message-text','A conferência das suas indicações e o resgate são feitos pelo atendimento no WhatsApp. Solicite à equipe a confirmação das indicações pendentes, validadas e recompensadas. Nenhum reembolso é realizado automaticamente por esta tela.');$('tt-home-message').showModal();$('tt-home-message-close').focus();
 });
 $('tt-home-message-close')?.addEventListener('click',()=>$('tt-home-message').close());
 document.querySelectorAll('#tt-home .study-shortcuts button:not(:disabled),#tt-home .referral .actions a,#tt-home .referral .actions button').forEach(el=>{
  el.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')el.classList.add('touch-feedback');},{passive:true});
  ['pointerup','pointercancel','pointerleave'].forEach(type=>el.addEventListener(type,()=>el.classList.remove('touch-feedback'),{passive:true}));
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
 window.addEventListener('focus',render);
 new MutationObserver(render).observe($('tt-user-name'),{childList:true,subtree:true});
 setInterval(()=>{if(!document.hidden)render();},60000);
 window.ttStudentHomeRefresh=render;
 render();
})();
