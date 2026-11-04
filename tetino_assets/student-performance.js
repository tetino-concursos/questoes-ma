/* Real account analytics. Latest answers remain the source of the overview.
   The aggregate history RPC is read-only and never submits an answer. */
'use strict';
(() => {
 const DAY=86400000,TZ='America/Fortaleza';
 const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'});
 const dateFormatter=new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit'});
 const fullFormatter=new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',year:'numeric'});
 const numbers=new Intl.NumberFormat('pt-BR');
 let epoch=0,cache=null,inflight=null,owner=null;
 const $=id=>document.getElementById(id);
 const text=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 function dayKey(value){const parts=dayFormatter.formatToParts(new Date(value)),get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;}
 function dayDate(key){return new Date(key+'T12:00:00-03:00');}
 function period(){return $('tt-analytics-period')?.value||'30';}
 function rangeStart(value=period()){
  if(value==='all')return -Infinity;
  const now=dayKey(Date.now()),days=value==='today'?1:Number(value);
  return new Date(now+'T00:00:00-03:00').getTime()-(days-1)*DAY;
 }
 function inPeriod(answer){
  if(!answer)return false;
  if(period()==='all')return true;
  const time=Date.parse(answer.atualizado_em);
  return Number.isFinite(time)&&time>=rangeStart()&&time<=Date.now();
 }
 function classify(hits,total){return !total?'empty':hits/total<.7?'low':hits/total<=.85?'mid':'high';}
 function context(){try{return usuario?{id:usuario.id,auth:authVersion,history:historico,favorites:favoritos}:null;}catch{return null;}}
 function signature(ctx){return ctx.id+'|'+ctx.auth+'|'+period()+'|'+JSON.stringify(ctx.history);}
 function current(ctx,ticket,key){const now=context();return !!now&&now.id===ctx.id&&now.auth===ctx.auth&&ticket===epoch&&signature(now)===key;}
 function el(tag,css,value){const node=document.createElement(tag);if(css)node.className=css;if(value!==undefined)node.textContent=value;return node;}
 function svg(tag,attrs={},value){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,val] of Object.entries(attrs))node.setAttribute(key,String(val));if(value!==undefined)node.textContent=value;return node;}
 function hideHistory(){
  $('tt-perf-chart-wrap').hidden=true;$('tt-perf-values').hidden=true;
  $('tt-perf-daily-rows').replaceChildren();
  for(const node of [...$('tt-daily-chart').children])if(!['title','desc'].includes(node.localName))node.remove();
  text('tt-perf-streak','—');text('tt-perf-comparison','Sem comparação disponível');
 }
 function clear(){
  epoch++;cache=null;inflight=null;owner=null;hideHistory();text('tt-perf-status','');
  for(const id of ['analytics-total','analytics-hits','analytics-errors','analytics-favs'])text(id,'0');
  text('analytics-rate','—');$('analytics-rate').dataset.state='empty';$('analytics-subjects').replaceChildren();
  overview({total:0,hits:0,rate:0});
 }
 function overview(counts){
  const rate=Math.round(counts.rate),misses=counts.total-counts.hits,donut=$('analytics-donut');
  text('analytics-donut-value',counts.total?rate+'%':'—');text('analytics-legend-hits',numbers.format(counts.hits));text('analytics-legend-errors',numbers.format(misses));
  if(donut){donut.style.background=counts.total?`conic-gradient(#0c9772 0% ${counts.rate}%, #e34848 ${counts.rate}% 100%)`:'conic-gradient(#e8eef6 0% 100%)';donut.setAttribute('aria-label',counts.total?`${rate}% de acerto. ${numbers.format(counts.hits)} acertos e ${numbers.format(misses)} erros em ${numbers.format(counts.total)} questões.`:'Sem respostas neste período');}
  if($('tt-overview-period'))$('tt-overview-period').value=period();
 }
 function validate(data){
  if(!data||typeof data!=='object'||!Number.isInteger(data.streak)||data.streak<0||!Array.isArray(data.daily)||data.daily.length>90||typeof data.comparison_available!=='boolean')throw Error('Invalid aggregate');
  for(const field of ['previous_total','previous_hits'])if(!Number.isSafeInteger(data[field])||data[field]<0)throw Error('Invalid total');
  if(data.previous_hits>data.previous_total||!Number.isFinite(Date.parse(data.history_since)))throw Error('Invalid comparison');
  const today=dayKey(Date.now());let previous='';
  for(const item of data.daily){
   if(!item||!/^\d{4}-\d{2}-\d{2}$/.test(item.day)||dayKey(dayDate(item.day))!==item.day||item.day<=previous||item.day>today||!Number.isSafeInteger(item.total)||!Number.isSafeInteger(item.hits)||item.total<0||item.hits<0||item.hits>item.total||typeof item.complete!=='boolean')throw Error('Invalid daily row');
   previous=item.day;
  }
  return data;
 }
 function chart(data){
  const root=$('tt-daily-chart');for(const child of [...root.children])if(!['title','desc'].includes(child.localName))child.remove();
  const points=data.daily.slice(-7);
  if(!points.length){$('tt-perf-chart-wrap').hidden=true;$('tt-perf-values').hidden=true;return;}
  const peak=Math.max(2,...points.map(row=>row.total)),rough=peak/5,magnitude=10**Math.floor(Math.log10(rough));
  const step=Math.max(1,[1,2,5,10].find(n=>n*magnitude>=rough)*magnitude),max=Math.ceil(peak/step)*step;
  const x=i=>96+(points.length===1?352:i/(points.length-1)*704),y=value=>188-value/max*160;
  for(let value=0;value<=max;value+=step){root.append(svg('line',{x1:96,x2:800,y1:y(value),y2:y(value),class:'tt-perf-grid','data-value':value}));root.append(svg('text',{x:80,y:y(value),class:'tt-perf-axis','text-anchor':'end','dominant-baseline':'middle'},numbers.format(value)));}
  for(const [field,css] of [['total','tt-perf-line-answered'],['hits','tt-perf-line-hits']]){
   let segment=[];
   const flush=()=>{if(segment.length)root.append(svg('polyline',{points:segment.join(' '),class:css}));segment=[];};
   points.forEach((point,i)=>{if(!point.complete&&!point.total){flush();return;}segment.push(x(i)+','+y(point[field]));if(!point.complete)flush();});flush();
  }
  // Draw markers after both lines; concentric sizes keep coincident totals visible.
  for(const field of ['total','hits'])points.forEach((point,i)=>{
   if(!point.complete&&!point.total)return;
   const dot=svg('circle',{cx:x(i),cy:y(point[field]),r:field==='total'?7:4.5,class:field==='hits'?'tt-perf-dot':'tt-perf-dot tt-perf-dot-answered','data-day':point.day,'data-series':field,...(!point.complete?{'data-partial':'true'}:{})});
   dot.append(svg('title',{},`${dateFormatter.format(dayDate(point.day))}: ${numbers.format(point[field])} ${field==='hits'?'acertos':'respondidas'}${point.complete?'':' (registro parcial)'}`));root.append(dot);
  });
  for(let i=0;i<points.length;i++)root.append(svg('text',{x:x(i),y:218,class:'tt-perf-date','text-anchor':'middle'},dateFormatter.format(dayDate(points[i].day))));
  const last=points[points.length-1];
  const fragment=document.createDocumentFragment();
  for(const point of points){const tr=el('tr'),format=value=>!point.complete&&!point.total?'Sem registro':numbers.format(value)+(point.complete?'':' (parcial)');for(const value of [fullFormatter.format(dayDate(point.day)),format(point.total),format(point.hits)])tr.append(el('td','',value));fragment.append(tr);}
  $('tt-perf-daily-rows').replaceChildren(fragment);
  text('tt-chart-description',`Respondidas e acertos de ${dateFormatter.format(dayDate(points[0].day))} a ${dateFormatter.format(dayDate(last.day))}. A tabela abaixo contém os valores. Datas sem histórico suficiente não são tratadas como zero.`);
  $('tt-perf-chart-wrap').hidden=false;$('tt-perf-values').hidden=false;
 }
 function showAggregate(data,counts){
  text('tt-perf-streak',numbers.format(data.streak));
  if(period()!=='all'&&data.comparison_available&&data.previous_total&&counts.total){
   const before=100*data.previous_hits/data.previous_total,diff=Math.round((counts.rate-before)*10)/10;
   text('tt-perf-comparison',`Antes: ${Math.round(before)}% · ${diff>0?'+':''}${numbers.format(diff)} p.p.`);
  }else text('tt-perf-comparison',period()==='all'?'Sem comparação neste período':data.comparison_available?'Sem respostas para comparar':'Histórico insuficiente para comparar');
  chart(data);
  const daily=data.daily.slice(-7),limited=daily.some(row=>!row.complete);
  text('tt-perf-status',limited?'O histórico de alguns dias anteriores está incompleto. Consulte os registros disponíveis.':daily.some(row=>row.total)?'':'Você ainda não respondeu questões nos últimos sete dias.');
 }
 async function render(){
  const ctx=context();if(!ctx){clear();return;}
  if(owner&&owner!==ctx.id)clear();owner=ctx.id;
  const rows=Object.values(ctx.history).filter(inPeriod),total=rows.length,hits=rows.filter(row=>row.acertou===true).length;
  const counts={total,hits,rate:total?100*hits/total:0};
  for(const [id,value] of Object.entries({'analytics-total':total,'analytics-hits':hits,'analytics-errors':total-hits,'analytics-favs':window.TeTinoFavorites&&!window.TeTinoFavorites.status().ready?null:ctx.favorites.size}))text(id,value===null?'—':numbers.format(value));
  text('analytics-rate',total?Math.round(counts.rate)+'%':'—');$('analytics-rate').dataset.state=classify(hits,total);
  overview(counts);
  renderNestedPerformance();
  const selected=period();text('tt-daily-caption','Respondidas e acertos nos últimos 7 dias.');
  const key=signature(ctx);
  if(cache&&cache.key===key&&Date.now()-cache.at<60000){showAggregate(cache.data,counts);return;}
  if(inflight?.key===key)return;
  const ticket=++epoch;inflight={key};hideHistory();$('tt-perf-retry').hidden=true;text('tt-perf-status','Carregando seu histórico…');
  try{
   const summary=client.rpc('tetino_evolucao_desempenho',{p_dias:selected==='all'?0:selected==='today'?1:Number(selected)});
   // Only "Hoje" lacks a full week; keep its comparison and fetch the weekly graph separately.
   const request=selected==='today'?Promise.all([summary,client.rpc('tetino_evolucao_desempenho',{p_dias:7})]).then(([current,week])=>{if(current.error)return current;if(week.error)return week;return {data:{...validate(current.data),daily:validate(week.data).daily},error:null};}):summary;
   let timeout;
   const response=await Promise.race([request,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Timeout')),12000);})]).finally(()=>clearTimeout(timeout));
   if(!current(ctx,ticket,key))return;
   if(response.error)throw response.error;
   const data=validate(response.data);cache={key,data,at:Date.now()};showAggregate(data,counts);
  }catch(_){
   if(!current(ctx,ticket,key))return;
   hideHistory();text('tt-perf-status','Não foi possível carregar a evolução. Seus resultados atuais continuam disponíveis.');$('tt-perf-retry').hidden=false;
  }finally{if(ticket===epoch)inflight=null;}
 }
 document.addEventListener('tt-account-updated',()=>{const ctx=context();if(!ctx||ctx.id!==owner)clear();});
 document.addEventListener('tt-study-updated',()=>{
  if(!context()){clear();return;}
  if(document.body.classList.contains('analytics-open'))render();
 });
 document.addEventListener('DOMContentLoaded',()=>{
  $('tt-perf-retry')?.addEventListener('click',()=>{cache=null;render();});
  $('tt-overview-period')?.addEventListener('change',()=>{$('tt-analytics-period').value=$('tt-overview-period').value;render();});
 });
 window.TeTinoPerformance=Object.freeze({render,inPeriod,classify,clear});
})();