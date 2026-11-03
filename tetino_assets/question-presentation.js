/* Presentation only. Content and answer keys still come from authorized RPCs. */
(()=>{
 'use strict';
 function paragraphs(value){
  return String(value||'').replace(/\r\n?/g,'\n').replace(/([^\n])\s+(?=Justificativa:)/gi,'$1\n\n')
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
  return paragraphs(text);
 }
 function appeal(value){return paragraphs(String(value||'').replace(/^\s*Resultado da Análise:\s*(?:INDEFERIDO|DEFERIDO(?:\s+PARCIALMENTE)?)\s*\.\s*/i,''));}
 function decorate(node,correct,options=false){
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),texts=[];while(walker.nextNode())texts.push(walker.currentNode);
  for(const text of texts){
   const value=text.data,rx=options?/^\([A-E]\)[^\n]*|\([A-E]\)|\b(?:INCORRETA|CORRETA)\b|\b[A-E]\b/gm:/\([A-E]\)|\b(?:INCORRETA|CORRETA)\b|\b[A-E]\b/g,fragment=document.createDocumentFragment();let pos=0,match;
   while((match=rx.exec(value))){
    const token=match[0],letter=token.match(/^\(([A-E])\)/)?.[1]||token.replace(/[()]/g,''),label=/^(?:INCORRETA|CORRETA)$/.test(token),before=value.slice(0,match.index),after=value.slice(rx.lastIndex);
    const reference=token.startsWith('(')||/(?:alternativas?|letras?|opç(?:ão|ões)|em|afasta|eliminando|sustenta|mantém|manteve|resposta)\s*$/i.test(before)||/\b[A-E](?:,\s*[A-E])*(?:\s+e)?\s*$/.test(before)||/^\s*(?:[,;]|e\s+[A-E]\b|erra\b|é\b|não\b|nega\b|introduz\b|cria\b|inverte\b|recupera\b|exagera\b|afirma\b|apresenta\b|traduz\b|restringe\b|coloca\b|recomenda\b|transforma\b|atribui\b|descreve\b|reduz\b|reúne\b|proíbe\b|foca\b|trata\b|toma\b|utiliza\b|inventa\b|acrescenta\b|pressupõe\b|deslocam\b|reconhece\b)/.test(after);
    if(!label&&!reference)continue;
    fragment.append(document.createTextNode(value.slice(pos,match.index)));const strong=document.createElement('strong');strong.textContent=token;if(!label)strong.className=letter===correct?'tt-answer-correct':'tt-answer-incorrect';fragment.append(strong);pos=rx.lastIndex;
   }
   fragment.append(document.createTextNode(value.slice(pos)));text.replaceWith(fragment);
  }
 }
 function sourceOnly(value){return /^Texto\s+0?[23]\s*[–—-]\s*Para\s+(?:as?\s+)?quest(?:ões|ão)\b/i.test(String(value||'').trim())&&!/\n\n(?:O |A |No |Em )/.test(value);}
 window.TeTinoQuestionPresentation=Object.freeze({paragraphs,comment,appeal,decorate,sourceOnly});
})();
