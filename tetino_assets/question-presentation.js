/* Presentation only. Content and answer keys still come from authorized RPCs. */
(()=>{
 'use strict';
 function paragraphs(value){
  return String(value||'').replace(/\r\n?/g,'\n').replace(/([^\n])\s+(?=Justificativa:)/gi,(all,last,offset,source)=>/CORRETA$/i.test(source.slice(0,offset+1))?all:last+'\n\n')
   .replace(/\s+\(([A-E])\)\s+/g,(all,letter,offset,source)=>/(?:alternativa|letra|opção)\s*$/i.test(source.slice(0,offset))?all:'\n\n('+letter+') ')
   .replace(/\s+(?=(?:INCORRETA|CORRETA)\s+JUSTIFICATIVA\b)/g,'\n\n')
   .replace(/([.!?]) +(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g,(all,punctuation,offset,source)=>/(?:\b(?:Art|arts|nº|Dr|Dra|Sr|Sra|etc)|\b[A-Z])$/i.test(source.slice(0,offset))?all:punctuation+'\n\n')
   .replace(/\n{3,}/g,'\n\n').trim();
 }
 function comment(value){
  let text=String(value||'').trim().replace(/^Gabarito(?:\s+oficial)?\s+[A-E]\s*[.:]\s*/i,'')
   .replace(/^Gabarito(?:\s+oficial)?\s+[A-E],\s*/i,'');
  // Remove only paragraphs that merely repeat an appeal outcome; retain reasoning.
  text=text.replace(/A decisão oficial manteve [A-E] e confirmou que\s+/i,'')
   .replace(/O comentário deve deixar essa diferença clara, sem trocar o gabarito oficial:\s*/i,'');
  text=text.split(/\n\s*\n/).filter(p=>! /^(?:(?:O recurso foi|A (?:decisão|justificativa)(?: oficial)? (?:indeferiu|mantém|manteve)|A banca (?:indeferiu|manteve|confirmou))\b|Nesta questão, houve recurso\b|Para responder à prova, preserve [A-E] e a justificativa oficial\b)/i.test(p.trim())).join('\n\n');
  text=text.replace(/(?:^|\n\s*\n)Ainda não há, no material analisado, uma comparação de várias provas que permita afirmar que esse tema seja recorrente ou prever sua presença na próxima avaliação\.\s*/g,'')
   .replace(/;\s*não prova, sozinho, frequência de cobrança em outras provas\./g,'.')
   .replace(/;\s*não autoriza afirmar que a banca sempre repete essa estratégia ou que cobrará o mesmo assunto em outra cidade\./g,'.');
  return paragraphs(text);
 }
 function appeal(value){return paragraphs(String(value||'').replace(/^\s*Resultado da Análise:\s*(?:INDEFERIDO(?:\s+PRELIMINARMENTE)?|DEFERIDO(?:\s+PARCIALMENTE)?)\s*\.\s*/i,''));}
 function decorate(node,correct,options=false){
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),texts=[];while(walker.nextNode())texts.push(walker.currentNode);
  for(const text of texts){
   const value=text.data,rx=options?/^\([A-E]\)[^\n]*|\([A-E]\)|\b(?:INCORRETA|CORRETA)\b|\b[A-E]\b/gm:/\([A-E]\)|\b(?:INCORRETA|CORRETA)\b|\b[A-E]\b/g,fragment=document.createDocumentFragment();let pos=0,match;
   while((match=rx.exec(value))){
    const token=match[0],letter=token.match(/^\(([A-E])\)/)?.[1]||token.replace(/[()]/g,''),label=/^(?:INCORRETA|CORRETA)$/.test(token),before=value.slice(0,match.index),after=value.slice(rx.lastIndex);
    const clauseStart=/(?:^|\n\s*\n|;\s*)$/.test(before),subjectLetter=!options&&/[BCDE]/.test(letter)&&clauseStart&&/^\s+(?!(?:a|o|as|os|um|uma|isso|isto|esse|essa|esses|essas|portanto|assim|então|quando|se|por|para|com|sem|ao|na|no)\b)[a-záàâãéêíóôõúç]{3,}\b/.test(after);
    const reference=token.startsWith('(')||subjectLetter||/^\s+é(?:\s|$)/.test(after)||(!options&&/\b(?:apenas|torna|corresponde\s+a|formulação\s+de)\s*$/i.test(before))||/\b(?:alternativas?|letras?|opç(?:ão|ões)|em|afasta|eliminando|sustenta|resposta(?:\s+é)?)\s*$/i.test(before)||/\b[A-E](?:,\s*[A-E])*(?:\s+e)?\s*$/.test(before)||/^\s*(?:[,;]|e\s+[A-E](?![\p{L}\p{N}_])|erra(?![\p{L}\p{N}_])|é(?![\p{L}\p{N}_])|não(?![\p{L}\p{N}_])|nega(?![\p{L}\p{N}_])|introduz(?![\p{L}\p{N}_])|cria(?![\p{L}\p{N}_])|inverte(?![\p{L}\p{N}_])|recupera(?![\p{L}\p{N}_])|exagera(?![\p{L}\p{N}_])|afirma(?![\p{L}\p{N}_])|apresenta(?![\p{L}\p{N}_])|traduz(?![\p{L}\p{N}_])|restringe(?![\p{L}\p{N}_])|coloca(?![\p{L}\p{N}_])|recomenda(?![\p{L}\p{N}_])|transforma(?![\p{L}\p{N}_])|atribui(?![\p{L}\p{N}_])|descreve(?![\p{L}\p{N}_])|reduz(?![\p{L}\p{N}_])|reúne(?![\p{L}\p{N}_])|proíbe(?![\p{L}\p{N}_])|foca(?![\p{L}\p{N}_])|trata(?![\p{L}\p{N}_])|toma(?![\p{L}\p{N}_])|utiliza(?![\p{L}\p{N}_])|inventa(?![\p{L}\p{N}_])|acrescenta(?![\p{L}\p{N}_])|pressupõe(?![\p{L}\p{N}_])|deslocam(?![\p{L}\p{N}_])|reconhece(?![\p{L}\p{N}_])|propõe(?![\p{L}\p{N}_])|presume(?![\p{L}\p{N}_])|distingue(?![\p{L}\p{N}_])|substitui(?![\p{L}\p{N}_])|preserva(?![\p{L}\p{N}_])|como resposta(?![\p{L}\p{N}_]))/u.test(after);
    if(!label&&!reference)continue;
    fragment.append(document.createTextNode(value.slice(pos,match.index)));const strong=document.createElement('strong');strong.textContent=token;if(!label)strong.className=letter===correct?'tt-answer-correct':'tt-answer-incorrect';fragment.append(strong);pos=rx.lastIndex;
   }
   fragment.append(document.createTextNode(value.slice(pos)));text.replaceWith(fragment);
  }
 }
 function sourceOnly(value){const parts=String(value||'').trim().split(/\n\s*\n/);return parts.length>1&&/^Texto\s+\d+\s*[–—-]\s*Para\s+(?:as?\s+)?quest(?:ões|ão)\b/i.test(parts[0])&&parts.slice(1).every(p=>/^(?:Tirinha de |Disponível em:|Fonte:|https?:\/\/)/i.test(p));}
 function parseSupport(value){
  const source=String(value||''),formats=[];let text='',bold=0,underline=0,pos=0;
  const append=part=>{const start=text.length;text+=part;if(part&&(bold||underline))formats.push({start,end:text.length,bold:bold>0,underline:underline>0});};
  for(const match of source.matchAll(/\[\[(\/)?(B|U)\]\]/g)){append(source.slice(pos,match.index));const change=match[1]?-1:1;if(match[2]==='B')bold=Math.max(0,bold+change);else underline=Math.max(0,underline+change);pos=match.index+match[0].length;}
  append(source.slice(pos));return {text,formats};
 }
 function renderSupport(node,text,formats,marks){
  const points=[...new Set([0,text.length,...formats.flatMap(f=>[f.start,f.end]),...marks.flatMap(m=>[m.start,m.end])])].filter(n=>Number.isInteger(n)&&n>=0&&n<=text.length).sort((a,b)=>a-b),fragment=document.createDocumentFragment();
  for(let i=0;i<points.length-1;i++){const start=points[i],end=points[i+1],active=formats.filter(f=>f.start<=start&&f.end>=end),mark=marks.find(m=>m.start<=start&&m.end>=end);let part=document.createTextNode(text.slice(start,end));
   if(active.some(f=>f.underline)){const u=document.createElement('u');u.append(part);part=u;}
   if(active.some(f=>f.bold)){const strong=document.createElement('strong');strong.append(part);part=strong;}
   if(mark){const highlight=document.createElement('mark');highlight.style.backgroundColor=mark.color;highlight.append(part);part=highlight;}
   fragment.append(part);
  }
  node.replaceChildren(fragment);
 }
 window.TeTinoQuestionPresentation=Object.freeze({paragraphs,comment,appeal,decorate,sourceOnly,parseSupport,renderSupport});
})();
