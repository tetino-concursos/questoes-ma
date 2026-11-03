/* Account favorites. Only authenticated RPC results are authoritative. */
(()=>{
 'use strict';
 let owner=null,ownerAuth=null,version=null,ready=false,busy=false,epoch=0,pending=null,started=false;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const key=id=>'tetino_favoritos_v1_'+id,marker=id=>'tetino_favoritos_importados_v2_'+id;
 const context=()=>{try{return usuario?{id:usuario.id,auth:authVersion,ticket:epoch}:null;}catch{return null;}};
 const current=ctx=>{const now=context();return now&&now.id===ctx.id&&now.auth===ctx.auth&&ctx.ticket===epoch;};
 function notice(message){const el=document.getElementById('tt-favorite-status');if(el){el.textContent=message;el.hidden=!message;}}
 function validate(data){if(!data||!uuid.test(data.version)||!Array.isArray(data.ids)||data.ids.some(id=>!/^\d+$/.test(String(id)))||typeof data.legacy_allowed!=='boolean')throw Error('Resposta inválida');return data;}
 function legacy(id){try{const value=JSON.parse(localStorage.getItem(key(id))||'[]');return Array.isArray(value)?[...new Set(value.map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=2147483647))]:[];}catch{return [];}}
 function imported(id){try{return localStorage.getItem(marker(id))==='1';}catch{return false;}}
 function persist(id){try{localStorage.setItem(key(id),JSON.stringify([...favoritos]));localStorage.setItem(marker(id),'1');}catch{}}
 function redraw(changed=false){
  updateFavoriteButton();
  if(changed&&(window.pickerMode==='favoritas'||document.getElementById('modo')?.value==='favoritas')){
   const saved={questionId:lista[indice]?.id,index:indice,selected:selecionada,corrected:corrigida};filtros(false);restorePosition(saved);
  }
  window.pickerRender?.();estatisticas();
 }
 function clear(){epoch++;owner=context()?.id||null;ownerAuth=context()?.auth??null;version=null;ready=false;busy=false;pending=null;favoritos=new Set();notice('');updateFavoriteButton();}
 function apply(ctx,data){
  if(!current(ctx))return;validate(data);const next=new Set(data.ids.map(String));const changed=next.size!==favoritos.size||[...next].some(id=>!favoritos.has(id));
  favoritos=next;version=data.version;ready=true;persist(ctx.id);redraw(changed);
 }
 async function call(name,args){const result=await client.rpc(name,args);if(result.error)throw result.error;return validate(result.data);}
 async function refresh(){
  const initial=context();if(!initial)return;
  started=true;if(owner!==initial.id)clear();if(busy)return;if(pending)return pending;
  const ctx={...initial,ticket:++epoch},old=imported(ctx.id)?[]:legacy(ctx.id);
  const task=(async()=>{
   try{
    let data=await call('tetino_meus_favoritos');if(!current(ctx))return;
    if(data.legacy_allowed)for(let offset=0;offset<old.length;offset+=500){data=await call('tetino_importar_favoritos_legados',{p_ids:old.slice(offset,offset+500),p_versao:data.version});if(!current(ctx))return;}
    apply(ctx,data);notice('');
   }catch{if(current(ctx)){notice('Não foi possível sincronizar seus favoritos. Verifique a conexão e tente novamente.');redraw();}}
  })();pending=task;await task;if(pending===task)pending=null;
 }
 async function toggle(){
  const q=lista[indice],initial=context();if(!q||!initial||!ready||busy)return;
  const ctx={...initial,ticket:++epoch},active=!favoritos.has(String(q.id));busy=true;pending=null;notice('Salvando favorito…');updateFavoriteButton();
  try{const data=await call('tetino_definir_favorito',{p_questao_id:Number(q.id),p_ativo:active,p_versao:version});if(!current(ctx))return;busy=false;apply(ctx,data);saveProgress();notice(active?'Questão adicionada aos favoritos.':'Questão removida dos favoritos.');}
  catch(error){if(current(ctx)){busy=false;notice('Não foi possível salvar o favorito. Atualize a lista e tente novamente.');updateFavoriteButton();if(error.code==='40001')await refresh();}}
  finally{if(current(ctx)){busy=false;updateFavoriteButton();}}
 }
 document.addEventListener('tt-account-updated',()=>{const ctx=context();if((ctx?.id||null)!==owner||(ctx?.auth??null)!==ownerAuth){started=false;clear();}});
 document.addEventListener('tt-study-reset',()=>{clear();if(context())refresh();});
 document.addEventListener('tt-catalog-loaded',()=>{if(started)refresh();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&started)refresh();});
 window.addEventListener('focus',()=>{if(started)refresh();});window.addEventListener('online',()=>{if(started)refresh();});
 setInterval(()=>{if(started&&!document.hidden)refresh();},30000);
 const mount=()=>{const button=document.getElementById('favorite-toggle');if(button&&!document.getElementById('tt-favorite-status')){const status=document.createElement('p');status.id='tt-favorite-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.className='muted';status.hidden=true;button.parentElement.after(status);}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 window.TeTinoFavorites=Object.freeze({refresh,toggle,clear,canToggle:()=>ready&&!busy,status:()=>({ready,busy})});
 if(window.ttFavoritesStartRequested&&context())refresh();
})();
