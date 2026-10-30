/* Question interactions. Protected content is requested using the signed-in SDK;
   revealing a solution never calls the answer RPC or modifies saved attempts. */
'use strict';
let ttQuestionEpoch=0,ttQuestionRevealed=false,ttQuestionBusy=false,ttQuestionHistoryCursor=null;
const ttQuestionRequests={comment:0,appeal:0,history:0};
let ttQuestionOwner=null;
document.addEventListener('tt-account-updated',()=>{
 const owner=usuario?.id||null;if(owner===ttQuestionOwner)return;ttQuestionOwner=owner;
 ttQuestionReset(null);document.getElementById('opcoes').replaceChildren();document.getElementById('enunciado').textContent='';document.getElementById('feedback').replaceChildren();document.getElementById('feedback').classList.add('hidden');
});
const ttQuestionIcons={eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',cut:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8 8 12 12M8 16 20 4"/>',book:'<path d="M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4V4Zm8 2v15"/>',file:'<path d="M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7m-7 4h5"/>',chart:'<path d="M3 3v18h18M8 16v-5m5 5V6m5 10V9"/>',flag:'<path d="M5 22V3c5-5 9 5 14 0v11c-5 5-9-5-14 0"/>'};
Object.assign(ttQuestionIcons,{
 star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>',
 play:'<path d="m8 4 12 8-12 8V4Z"/>',pause:'<path d="M8 4v16M16 4v16"/>',reset:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
 menu:'<path d="M3 5h18M3 12h18M3 19h18"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
 back:'<path d="M19 12H5m6-6-6 6 6 6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 check:'<path d="m5 12 4 4L19 6"/>',alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>'
});
function ttQElement(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function ttQIcon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','tt-q-icon');svg.setAttribute('aria-hidden','true');svg.innerHTML=ttQuestionIcons[name];return svg;}
function ttQButton(id,text,icon){const button=ttQElement('button','tt-q-button');button.type='button';if(id)button.id=id;if(icon)button.append(ttQIcon(icon));button.append(document.createTextNode(text));return button;}
function ttQSetLabel(element,label,icon){if(element)element.replaceChildren(ttQIcon(icon),document.createTextNode(label));}
function ttQPositionHome(){
 const control=document.querySelector('.tt-page-controls');if(!control)return;
 const body=document.body,profile=body.classList.contains('tt-profile-open');let target=document.querySelector('main');
 function row(anchor,className){if(!anchor)return target;if(anchor.parentElement.classList.contains(className))return anchor.parentElement;const wrapper=ttQElement('div',className);anchor.before(wrapper);wrapper.append(anchor);return wrapper;}
 if(profile)target=row(document.getElementById('tt-prof-back'),'tt-profile-return-row');
 else if(body.classList.contains('tt-view-questions'))target=row(document.querySelector('#tt-question-actions .tt-return-link'),'tt-question-return-row');
 else if(body.classList.contains('tt-view-filter'))target=row(document.querySelector('#tt-prova-selector h2'),'tt-section-title-row');
 else if(body.classList.contains('tt-view-analytics')){const back=document.getElementById('close-analytics');if(back){if(!back.parentElement.classList.contains('tt-analytics-return-row')){const wrapper=ttQElement('div','tt-analytics-return-row');document.querySelector('#desempenho-painel .analytics-heading').before(wrapper);wrapper.append(back);}target=back.parentElement;}}
 if(control.parentElement!==target){if(target===document.querySelector('main'))target.prepend(control);else target.append(control);}
 const toggle=document.getElementById('focus-toggle'),active=body.classList.contains('focus-mode');if(toggle&&toggle.getAttribute('aria-pressed')!==String(active)){toggle.setAttribute('aria-pressed',String(active));ttQSetLabel(toggle,active?'Sair do foco':'Modo foco','focus');}
 const mode=document.getElementById('modo')?.value,current=profile?'profile':body.classList.contains('tt-view-home')?'home':body.classList.contains('tt-view-filter')?'filter':body.classList.contains('tt-view-analytics')?'analytics':mode==='erros'?'errors':mode==='favoritas'?'favorites':'questions';
 document.querySelectorAll('#tt-drawer [data-tt-page]').forEach(link=>{const page=link.dataset.ttPage,selected=link.id!=='tt-manage-access'&&page===current&&(!link.dataset.ttCourse||link.dataset.ttCourse===ttCursoAtivo);if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 const profileButton=document.getElementById('tt-profile-settings');if(profileButton){if(profile)profileButton.setAttribute('aria-current','page');else profileButton.removeAttribute('aria-current');}
 ttQSyncDrawer();
}
let ttQDrawerOpen=false;
function ttQSyncDrawer(){
 const drawer=document.getElementById('tt-drawer');if(!drawer)return;const open=document.body.classList.contains('tt-menu-open')&&!document.body.classList.contains('focus-mode');drawer.inert=!open;drawer.setAttribute('aria-hidden',String(!open));
 if(open!==ttQDrawerOpen){if(open)document.getElementById('tt-menu-close')?.focus({preventScroll:true});else if(drawer.contains(document.activeElement)&&!document.body.classList.contains('focus-mode'))document.getElementById('tt-menu-button')?.focus({preventScroll:true});ttQDrawerOpen=open;}
}
function ttQuestionFocus(active){
 document.body.classList.toggle('focus-mode',active);document.body.classList.remove('tt-menu-open');
 const toggle=document.getElementById('focus-toggle');toggle.setAttribute('aria-pressed',String(active));ttQSetLabel(toggle,active?'Sair do foco':'Modo foco','focus');
 requestAnimationFrame(()=>{if(document.body.classList.contains('focus-mode')!==active)return;const target=active?document.getElementById('tt-q-focus-exit'):toggle;target?.focus({preventScroll:true});const card=document.getElementById('meta')?.closest('.card');if(active)card?.scrollIntoView({block:'start',behavior:'instant'});else toggle.scrollIntoView({block:'center',behavior:'instant'});});
}
document.addEventListener('DOMContentLoaded',()=>{
 const byId=id=>document.getElementById(id);
 for(const [id,label,icon] of [['tt-menu-button','','menu'],['tt-menu-close','','close'],['tt-signup-close','','close'],['tt-prof-back','Voltar aos meus bancos de questões','back'],['tt-timer-pause','Pausar','pause'],['tt-timer-reset','Zerar','reset'],['focus-toggle','Modo foco','focus'],['anterior','Voltar','back'],['proxima','Pular questão','arrow'],['picker-apply','Estudar questões selecionadas','arrow'],['nav-favorites','Questões favoritas','star']])ttQSetLabel(byId(id),label,icon);
 ttQSetLabel(document.querySelector('.session-top strong'),'Painel de estudos','chart');
 const back=document.querySelector('#tt-question-actions .tt-return-link');ttQSetLabel(back,'Voltar aos filtros','back');
 ttQSetLabel(byId('close-analytics'),'Voltar às questões','back');
 const tip=document.querySelector('.nav-tip');if(tip)tip.textContent='Um passo por vez, rumo à aprovação.';
 const sections={'SEUS CONCURSOS':'Seus concursos','REVISÃO':'Revisão','PLANOS':'Planos','SUPORTE':'Suporte'};document.querySelectorAll('#tt-drawer .tt-section').forEach(el=>{el.textContent=sections[el.textContent.trim()]||el.textContent;});
 const drawer=byId('tt-drawer');drawer.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();byId('tt-menu-close').click();return;}if(event.key!=='Tab')return;const items=[...drawer.querySelectorAll('a[href],button:not([disabled])')].filter(el=>!el.closest('[hidden]')&&el.getClientRects().length);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
 const search=byId('picker-search');if(search){search.placeholder='Buscar matéria ou tópico';const wrap=ttQElement('span','tt-picker-search');search.before(wrap);wrap.append(ttQIcon('search'),search);}
 ttQPositionHome();new MutationObserver(ttQPositionHome).observe(document.body,{attributes:true,attributeFilter:['class']});
});
function ttQContext(){return {epoch:ttQuestionEpoch,user:usuario?.id,auth:authVersion,q:lista[indice]};}
function ttQCurrent(ctx){return ctx.epoch===ttQuestionEpoch&&ctx.user===usuario?.id&&ctx.auth===authVersion&&ctx.q===lista[indice];}
function ttQClosePanels(){document.querySelectorAll('#tt-q-panels [aria-controls]').forEach(b=>b.setAttribute('aria-expanded','false'));document.querySelectorAll('#tt-q-panels .tt-q-content').forEach(el=>el.hidden=true);}
function ttQMount(){
 if(document.getElementById('tt-q-solution'))return;
 const exit=ttQButton('tt-q-focus-exit','Sair do foco','focus');exit.classList.add('tt-q-focus-exit');exit.addEventListener('click',()=>ttQuestionFocus(false));document.getElementById('anterior').parentElement.append(exit);
 const solution=ttQButton('tt-q-solution','Ver solução','eye');solution.classList.add('secondary');document.getElementById('responder').parentElement.append(solution);solution.addEventListener('click',ttQReveal);
 const panels=ttQElement('div','tt-q-panels');panels.id='tt-q-panels';panels.hidden=true;
 const nav=ttQElement('div','tt-q-panel-buttons');nav.setAttribute('aria-label','Informações desta questão');panels.append(nav);
 for(const [id,label,icon] of [['comment','Gabarito Comentado','book'],['appeal','Recurso da banca','file'],['history','Estatísticas','chart'],['report','Notificar erro','flag']]){
  const button=ttQButton('tt-q-tab-'+id,label,icon);button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','tt-q-'+id);nav.append(button);
  const content=ttQElement('section','tt-q-content');content.id='tt-q-'+id;content.hidden=true;content.setAttribute('aria-labelledby',button.id);panels.append(content);
  button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')==='true';ttQClosePanels();if(open)return;button.setAttribute('aria-expanded','true');content.hidden=false;if(id==='report')ttQReport(content);else if(id==='history')ttQHistory(false);else ttQContent(id);});
 }
 document.getElementById('contagem').after(panels);
}
function ttQuestionReset(q){
 ttQuestionEpoch++;ttQuestionRevealed=false;ttQuestionBusy=false;ttQuestionHistoryCursor=null;ttQMount();
 document.getElementById('tt-q-panels').hidden=true;document.getElementById('tt-q-solution').hidden=!q;document.getElementById('tt-q-solution').disabled=!q;
 ttQClosePanels();document.querySelectorAll('.tt-q-content').forEach(el=>{el.replaceChildren();el.removeAttribute('aria-busy');});
}
function ttQuestionOption(q,op,index){
 const row=ttQElement('div','tt-q-option-row'),button=ttQElement('button','option'),letter=String.fromCharCode(65+index);
 button.type='button';button.setAttribute('aria-pressed','false');button.append(ttQElement('span','tt-q-letter',letter));
 const text=ttQElement('span','tt-q-option-text');ttRichText(text,op);button.append(text);
 const cut=ttQButton(null,'','cut');cut.className='tt-q-cut';cut.setAttribute('aria-label','Riscar alternativa '+letter);cut.setAttribute('aria-pressed','false');
 cut.addEventListener('click',()=>{if(corrigida||ttQuestionRevealed||ttQuestionBusy||ttCorrecaoEmAndamento)return;const struck=row.classList.toggle('tt-q-struck');cut.setAttribute('aria-pressed',String(struck));cut.setAttribute('aria-label',(struck?'Restaurar':'Riscar')+' alternativa '+letter);if(struck&&selecionada===index){selecionada=null;button.classList.remove('selected');button.setAttribute('aria-pressed','false');saveProgress();}});
 button.addEventListener('click',()=>{if(corrigida||ttQuestionRevealed||ttQuestionBusy||ttCorrecaoEmAndamento)return;selecionada=index;document.querySelectorAll('#opcoes .option').forEach(el=>{el.classList.remove('selected');el.setAttribute('aria-pressed','false');});button.classList.add('selected');button.setAttribute('aria-pressed','true');if(row.classList.contains('tt-q-struck'))cut.click();saveProgress();});
 row.append(button,cut);return row;
}
function ttQuestionFinish(q,choice,isAnswer){
 document.querySelectorAll('#opcoes .option').forEach((el,i)=>{el.classList.remove('selected','correct','wrong');el.disabled=true;el.parentElement.classList.remove('tt-q-struck');if(i===q.correta)el.classList.add('correct');else if(isAnswer&&i===choice)el.classList.add('wrong');});
 document.querySelectorAll('#opcoes .tt-q-cut').forEach(b=>{b.disabled=true;b.setAttribute('aria-pressed','false');});
 const feedback=document.getElementById('feedback');feedback.replaceChildren();if(isAnswer)feedback.append(ttCriarResultado(choice===q.correta));else feedback.textContent='Solução revelada. Nenhuma tentativa foi registrada.';feedback.classList.remove('hidden');
 document.getElementById('responder').textContent='Próxima questão';document.getElementById('responder').disabled=indice>=lista.length-1;
 document.getElementById('tt-q-solution').hidden=true;document.getElementById('tt-q-panels').hidden=false;ttQClosePanels();
}
async function ttQSolution(ctx){
 const {data,error}=await client.rpc('tetino_ver_solucao',{p_questao_id:ctx.q.id});if(!ttQCurrent(ctx))return null;if(error)throw error;
 const row=Array.isArray(data)?data[0]:data,correct=Number(row?.correta);
 if(!row||String(row.questao_id)!==String(ctx.q.id)||!Number.isInteger(correct)||correct<0||correct>=ctx.q.opcoes.length)throw Error('Solução indisponível');
 return {...row,correta:correct};
}
async function ttQReveal(){
 if(ttQuestionBusy||ttCorrecaoEmAndamento||corrigida||ttQuestionRevealed||!usuario||!lista[indice])return;
 const ctx=ttQContext(),button=document.getElementById('tt-q-solution');ttQuestionBusy=true;button.disabled=true;document.getElementById('responder').disabled=true;
 try{const row=await ttQSolution(ctx);if(!row||!ttQCurrent(ctx))return;Object.assign(ctx.q,row);ttQuestionRevealed=true;ttQuestionFinish(ctx.q,null,false);}
 catch{if(ttQCurrent(ctx)){document.getElementById('feedback').textContent='Não foi possível consultar a solução. Tente novamente.';document.getElementById('feedback').classList.remove('hidden');}}
 finally{if(ttQCurrent(ctx)){ttQuestionBusy=false;button.disabled=false;document.getElementById('responder').disabled=(corrigida||ttQuestionRevealed)&&indice>=lista.length-1;}}
}
async function ttQContent(kind){
 const ctx=ttQContext(),request=++ttQuestionRequests[kind],valid=()=>ttQCurrent(ctx)&&request===ttQuestionRequests[kind],panel=document.getElementById('tt-q-'+kind);panel.replaceChildren(ttQElement('p','muted','Consultando conteúdo…'));panel.setAttribute('aria-busy','true');
 try{const row=await ttQSolution(ctx);if(!row||!valid())return;Object.assign(ctx.q,row);panel.replaceChildren();
  if(kind==='comment'){panel.append(ttQElement('h3',null,'Resposta correta: '+String.fromCharCode(65+row.correta)));const text=ttQElement('div','teacher-explanation');ttRichText(text,String(row.comentario||'').trim()||'Comentário em preparação.');panel.append(text);}
  else{panel.append(ttQElement('h3',null,'Recurso da banca'));if(row.resultado_recurso)panel.append(ttQElement('p','tt-q-decision','Resultado: '+row.resultado_recurso));const text=ttQElement('div','teacher-explanation');ttRichText(text,String(row.recurso_banca||'').trim()||'Nenhum recurso da banca foi publicado para esta questão.');panel.append(text);}
 }catch{if(valid()){panel.replaceChildren(ttQElement('p','muted','Não foi possível consultar o conteúdo. Feche e abra este balão para tentar novamente.'));}}
 finally{if(valid())panel.removeAttribute('aria-busy');}
}
async function ttQHistory(more){
 const ctx=ttQContext(),request=++ttQuestionRequests.history,valid=()=>ttQCurrent(ctx)&&request===ttQuestionRequests.history,panel=document.getElementById('tt-q-history');
 if(!more){ttQuestionHistoryCursor=null;panel.replaceChildren(ttQElement('h3',null,'Seu histórico nesta questão'),ttQElement('p','muted','O desempenho considera somente sua última resposta.'));const list=ttQElement('ol','tt-q-history-list');panel.append(list);}
 panel.querySelector('.tt-q-history-status')?.remove();panel.querySelector('.tt-q-history-more')?.remove();
 const status=ttQElement('p','muted tt-q-history-status','Consultando registros…');status.setAttribute('role','status');panel.append(status);
 try{
  const {data,error}=await client.rpc('tetino_historico_questao',{p_questao_id:ctx.q.id,p_antes_id:more?ttQuestionHistoryCursor:null});if(!valid())return;if(error||!Array.isArray(data))throw Error('Histórico indisponível');
  const list=panel.querySelector('ol'),format=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'});
  for(const record of data){const li=ttQElement('li'),text=ttQElement('div'),time=ttQElement('time'),date=new Date(record.respondida_em),answer=Number(record.resposta);time.textContent=Number.isFinite(date.getTime())?format.format(date):'Data não disponível';if(Number.isFinite(date.getTime()))time.dateTime=date.toISOString();text.append(time,ttQElement('p',null,'Você respondeu a opção '+(Number.isInteger(answer)&&answer>=0&&answer<ctx.q.opcoes.length?String.fromCharCode(65+answer):'não disponível')+'.'));if(record.origem==='ultimo_registro_anterior')text.append(ttQElement('small','muted','Última resposta salva antes do histórico completo.'));const result=ttQElement('strong',record.acertou?'tt-q-hit':'tt-q-miss');result.append(ttQIcon(record.acertou?'check':'alert'),document.createTextNode(record.acertou?'Correta':'Incorreta'));li.append(text,result);list.append(li);}
  status.textContent=list.children.length?'':'Você ainda não respondeu a esta questão.';
  if(data.length===50){const last=String(data.at(-1).id);if(!/^\d+$/.test(last)||last===String(ttQuestionHistoryCursor))throw Error('Cursor inválido');ttQuestionHistoryCursor=last;const next=ttQButton(null,'Carregar registros anteriores');next.classList.add('tt-q-history-more');next.addEventListener('click',()=>ttQHistory(true));panel.append(next);}
 }catch{if(valid()){status.textContent='Não foi possível consultar o histórico.';const retry=ttQButton(null,'Tentar novamente');retry.classList.add('tt-q-history-more');retry.addEventListener('click',()=>ttQHistory(more));panel.append(retry);}}
}
function ttQReport(panel){
 panel.replaceChildren(ttQElement('h3',null,'Notificar erro'));const label=ttQElement('label',null,'Descreva o problema encontrado');label.htmlFor='tt-q-report-text';const text=ttQElement('textarea');text.id='tt-q-report-text';text.name='descricao';text.maxLength=1500;text.rows=4;text.placeholder='Ex.: uma alternativa apresenta um erro de digitação…';
 const link=ttQElement('a','tt-q-button','Continuar no WhatsApp');const support=document.querySelector('a[href^="https://wa.me/"]');
 if(support){const url=new URL(support.href);url.search='';link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';const id=lista[indice]?.id;link.addEventListener('click',()=>{url.searchParams.set('text','Olá! Gostaria de notificar um erro na questão '+id+'.\n'+text.value.trim());link.href=url.href;});}
 else{link.removeAttribute('href');link.textContent='Atendimento indisponível no momento.';}
 panel.append(label,text,link,ttQElement('p','muted','A mensagem será aberta para você conferir e enviar.'));
}
