/* Lossless libwebp codec already bundled with Playwright 1.64.1.
   ABI mapping follows packages/utils/webp/webp.ts and its generated glue.
   No external service: RGBA pixels and encoded output stay on this computer. */
'use strict';
let codecPromise;
function codec(){return codecPromise??=(async()=>{
 let memory;
 const imports={a:{a:()=>0,b:bytes=>{try{const pages=Math.ceil((bytes-memory.buffer.byteLength)/65536);if(bytes>512*1024*1024)return 0;if(pages>0)memory.grow(pages);return 1;}catch{return 0;}},c:()=>{throw Error('Codec terminated');},d:()=>{},e:()=>{throw Error('Codec aborted');}}};
 const response=await fetch(new URL('webp_codec.wasm',self.location.href));if(!response.ok)throw Error('Codec unavailable');
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),imports);memory=instance.exports.f;instance.exports.g();return instance.exports;
})();}
self.onmessage=async({data})=>{
 let input=0,sizePointer=0,output=0,exports;
 try{
  const {width,height,pixels}=data;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>16383||height>16383||width*height>24000000||!(pixels instanceof ArrayBuffer)||pixels.byteLength!==width*height*4)throw Error('Unsupported dimensions');
  exports=await codec();input=exports.k(pixels.byteLength);sizePointer=exports.k(4);if(!input||!sizePointer)throw Error('Not enough memory');
  new Uint8Array(exports.f.buffer).set(new Uint8Array(pixels),input);
  output=exports.h(input,width,height,100,1,sizePointer); // final flag=1: lossless, no resizing.
  const size=new DataView(exports.f.buffer).getUint32(sizePointer,true);if(!output||!size)throw Error('Encoding failed');
  const result=new Uint8Array(exports.f.buffer,output,size).slice().buffer;self.postMessage({ok:true,bytes:result},[result]);
 }catch{self.postMessage({ok:false});}
 finally{if(exports){if(output)exports.j(output);if(sizePointer)exports.l(sizePointer);if(input)exports.l(input);}}
};
