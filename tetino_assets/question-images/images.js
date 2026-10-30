/* Only three known legacy public assets are substituted. Originals stay intact. */
(()=>{
 'use strict';
 const directory=new URL('.',document.currentScript.src);
 const legacy={
  '944cec71-d0f5-4e36-988c-d5dadb1b151e.png':{file:'figure-1.webp',width:1254,height:1254},
  'campanha_questao_10.png':{file:'campaign.webp',width:663,height:701},
  'tirinha_questoes_08_09.png':{file:'comic.webp',width:666,height:838}
 };
 function resolve(value){
  try{const url=new URL(value);if(url.origin!=='https://kdalqvbexttclxtjmsxc.supabase.co'||!url.pathname.startsWith('/storage/v1/object/public/questao-imagens/'))return null;const name=url.pathname.split('/').at(-1),image=Object.hasOwn(legacy,name)?legacy[name]:null;return image?{src:new URL(image.file,directory).href,width:image.width,height:image.height}:null;}catch{return null;}
 }
 async function prepare(file){
  if(!['image/png','image/jpeg'].includes(file.type))return file;
  if(file.size>5*1024*1024)throw Error('A imagem deve ter até 5 MB.');
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  let worker;
  try{
   if(bitmap.width>16383||bitmap.height>16383||bitmap.width*bitmap.height>24000000)throw Error('A imagem excede o limite de dimensões.');
   const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
   const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('Não foi possível ler a imagem.');context.drawImage(bitmap,0,0);
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
   const bytes=await new Promise((resolve,reject)=>{
    worker=new Worker(new URL('encode-worker.js',directory));
    const timer=setTimeout(()=>reject(Error('A conversão demorou demais. Tente novamente.')),45000);
    worker.onmessage=({data})=>{clearTimeout(timer);data.ok?resolve(data.bytes):reject(Error('Não foi possível converter a imagem.'));};
    worker.onerror=()=>{clearTimeout(timer);reject(Error('Não foi possível carregar o conversor de imagens.'));};
    worker.postMessage({width:canvas.width,height:canvas.height,pixels:pixels.buffer},[pixels.buffer]);
   });
   const converted=new File([bytes],file.name.replace(/\.(png|jpe?g)$/i,'')+'.webp',{type:'image/webp'});
   if(converted.size>5*1024*1024)throw Error('A versão WebP excede 5 MB. Use uma imagem menor.');return converted;
  }finally{bitmap.close();worker?.terminate();}
 }
 window.TeTinoQuestionImages=Object.freeze({resolve,prepare});
})();
