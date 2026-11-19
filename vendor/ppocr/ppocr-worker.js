/* bpm-v152: PP-OCRv6 (det+rec) in a Web Worker via onnxruntime-web.
   Models are Apache-2.0 PaddleOCR weights packaged by RapidOCR. No plan data. */
'use strict';
const BASE = self.location.href.replace(/[^/]+$/, '');
let detS = null, recS = null, CHAR = null, ready = null, backend = 'wasm';

function wasmIsolated(){
  try{return !!(self.crossOriginIsolated && typeof SharedArrayBuffer==='function')}catch(e){return false}
}

async function loadOrt(){
  if(self.ort)return;
  importScripts(BASE+'ort.wasm.min.js');
  const ort=self.ort;
  ort.env.wasm.wasmPaths = BASE;
  ort.env.wasm.simd = true;
  const thr = wasmIsolated() ? Math.max(1, Math.min(4, (self.navigator&&self.navigator.hardwareConcurrency)||2)) : 1;
  ort.env.wasm.numThreads = thr;
  ort.env.wasm.proxy = false;
}

async function init(){
  if(ready)return ready;
  ready=(async()=>{
    await loadOrt();
    const keys=await (await fetch(BASE+'ppocr_keys.json')).json();
    CHAR=keys;
    const opts={executionProviders:['wasm']};
    detS=await ort.InferenceSession.create(BASE+'PP-OCRv6_det_small.onnx', opts);
    recS=await ort.InferenceSession.create(BASE+'PP-OCRv6_rec_small.onnx', opts);
    backend='wasm'+((ort.env.wasm.numThreads>1)?'-threads':'')+(ort.env.wasm.simd?'-simd':'');
    return {ok:true, backend, chars:CHAR.length, threads:ort.env.wasm.numThreads};
  })().catch(e=>{ready=null;throw e});
  return ready;
}

function resizeNormDet(rgba,w,h){
  const minLimit=736, maxLimit=960;
  let ratio=1;
  const mn=Math.min(h,w), mx=Math.max(h,w);
  if(mn<minLimit) ratio=minLimit/mn;
  else if(mx>maxLimit) ratio=maxLimit/mx;
  let rh=Math.round(h*ratio/32)*32, rw=Math.round(w*ratio/32)*32;
  if(rh<32)rh=32; if(rw<32)rw=32;
  // draw via OffscreenCanvas when available
  const c = (typeof OffscreenCanvas==='function') ? new OffscreenCanvas(rw,rh) : null;
  let data;
  if(c){
    const g=c.getContext('2d',{willReadFrequently:true});
    const src=(typeof OffscreenCanvas==='function')?new OffscreenCanvas(w,h):null;
    if(!src) throw new Error('no OffscreenCanvas');
    const sg=src.getContext('2d',{willReadFrequently:true});
    const img=new ImageData(new Uint8ClampedArray(rgba), w,h);
    sg.putImageData(img,0,0);
    g.drawImage(src,0,0,rw,rh);
    data=g.getImageData(0,0,rw,rh).data;
  }else{
    // nearest-neighbor fallback
    data=new Uint8ClampedArray(rw*rh*4);
    for(let y=0;y<rh;y++){
      const sy=Math.min(h-1, (y*h/rh)|0);
      for(let x=0;x<rw;x++){
        const sx=Math.min(w-1, (x*w/rw)|0), si=(sy*w+sx)*4, di=(y*rw+x)*4;
        data[di]=rgba[si];data[di+1]=rgba[si+1];data[di+2]=rgba[si+2];data[di+3]=255;
      }
    }
  }
  const out=new Float32Array(3*rh*rw);
  const hw=rh*rw;
  for(let i=0;i<hw;i++){
    const j=i*4;
    out[i]        = (data[j]/255-0.5)/0.5;
    out[hw+i]     = (data[j+1]/255-0.5)/0.5;
    out[2*hw+i]   = (data[j+2]/255-0.5)/0.5;
  }
  return {tensor:out, rw, rh, ratioX:rw/w, ratioY:rh/h};
}

function components(pred, mask, W, H, boxThresh, unclip){
  const seen=new Uint8Array(W*H), st=new Int32Array(W*H);
  const boxes=[];
  for(let i=0,n=W*H;i<n;i++){
    if(!mask[i]||seen[i])continue;
    let sp=0,x0=W,y0=H,x1=0,y1=0,sum=0,cnt=0;
    seen[i]=1; st[sp++]=i;
    while(sp){
      const j=st[--sp],x=j%W,y=(j/W)|0;
      cnt++; sum+=pred[j];
      if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H)continue;
        const k=ny*W+nx; if(!mask[k]||seen[k])continue; seen[k]=1; st[sp++]=k;
      }
    }
    const ww=x1-x0+1, hh=y1-y0+1;
    if(Math.min(ww,hh)<3)continue;
    const score=sum/cnt;
    if(score<boxThresh)continue;
    const area=ww*hh, peri=2*(ww+hh)||1, d=(area*unclip)/peri;
    boxes.push({x0:x0-d, y0:y0-d, x1:x1+d, y1:y1+d, score});
    if(boxes.length>=1000)break;
  }
  return boxes;
}

async function detect(rgba,w,h){
  const pre=resizeNormDet(rgba,w,h);
  const t=new ort.Tensor('float32', pre.tensor, [1,3,pre.rh,pre.rw]);
  const out=await detS.run({x:t});
  const name=detS.outputNames[0];
  const pred=out[name].data; // [1,1,H,W]
  const H=pre.rh, W=pre.rw;
  const mask=new Uint8Array(W*H);
  const TH=0.3;
  for(let i=0;i<W*H;i++) if(pred[i]>TH) mask[i]=1;
  const raw=components(pred, mask, W, H, 0.45, 2.0);
  const boxes=[];
  for(const b of raw){
    const x0=Math.max(0, b.x0/pre.ratioX), y0=Math.max(0, b.y0/pre.ratioY);
    const x1=Math.min(w, b.x1/pre.ratioX), y1=Math.min(h, b.y1/pre.ratioY);
    if((x1-x0)<3||(y1-y0)<3)continue;
    boxes.push({x0,y0,x1,y1,score:b.score});
  }
  boxes.sort((a,b)=>a.y0-b.y0||a.x0-b.x0);
  return boxes;
}

function cropBox(rgba,w,h,b){
  const pad=2;
  const x0=Math.max(0, Math.floor(b.x0)-pad), y0=Math.max(0, Math.floor(b.y0)-pad);
  const x1=Math.min(w, Math.ceil(b.x1)+pad), y1=Math.min(h, Math.ceil(b.y1)+pad);
  const cw=Math.max(1,x1-x0), ch=Math.max(1,y1-y0);
  const out=new Uint8ClampedArray(cw*ch*4);
  for(let y=0;y<ch;y++){
    const sy=y0+y;
    for(let x=0;x<cw;x++){
      const si=((sy)*w+(x0+x))*4, di=(y*cw+x)*4;
      out[di]=rgba[si]; out[di+1]=rgba[si+1]; out[di+2]=rgba[si+2]; out[di+3]=255;
    }
  }
  return {data:out,w:cw,h:ch,x0,y0};
}

function resizeNormRec(img, maxWh){
  const imgH=48, imgW=Math.max(imgH, Math.ceil(imgH*maxWh));
  const h=img.h, w=img.w, ratio=w/h;
  let rw=Math.ceil(imgH*ratio);
  if(rw>imgW)rw=imgW;
  const out=new Float32Array(3*imgH*imgW); // zeros = pad
  for(let y=0;y<imgH;y++){
    const sy=Math.min(h-1, (y*h/imgH)|0);
    for(let x=0;x<rw;x++){
      const sx=Math.min(w-1, (x*w/rw)|0), si=(sy*w+sx)*4;
      const di=y*imgW+x;
      out[di]              = (img.data[si]/255-0.5)/0.5;
      out[imgH*imgW+di]    = (img.data[si+1]/255-0.5)/0.5;
      out[2*imgH*imgW+di]  = (img.data[si+2]/255-0.5)/0.5;
    }
  }
  return {tensor:out, imgW, imgH};
}

function ctcDecode(logits, T, C){
  // logits is Float32Array length T*C, row-major [T,C]
  let last=-1, text='', confs=[];
  for(let t=0;t<T;t++){
    let bi=0, bv=-1e9, off=t*C, rowSum=0, mn=1e9;
    for(let c=0;c<C;c++){const v=logits[off+c]; rowSum+=v; if(v<mn)mn=v; if(v>bv){bv=v;bi=c}}
    if(bi===0||bi===last) {last=bi; continue} // blank or duplicate
    last=bi;
    const ch=CHAR[bi];
    if(ch==null||ch==='blank')continue;
    text+=ch;
    let p;
    if(mn>=-1e-4 && bv<=1.0001 && rowSum>0.8 && rowSum<1.2) p=bv;
    else {
      let z=0; for(let c=0;c<C;c++) z+=Math.exp(Math.min(20, logits[off+c]-bv));
      p=1/z;
    }
    confs.push(p);
  }
  const cf=confs.length?confs.reduce((a,b)=>a+b,0)/confs.length:0;
  return {t:text, cf};
}

async function recognize(crops){
  if(!crops.length)return [];
  const BATCH=8, C=CHAR.length, results=new Array(crops.length);
  const widths=crops.map(c=>c.w/Math.max(1,c.h));
  const order=widths.map((w,i)=>i).sort((a,b)=>widths[a]-widths[b]);
  for(let b=0;b<order.length;b+=BATCH){
    const sl=order.slice(b,b+BATCH);
    let maxWh=320/48;
    for(const i of sl) maxWh=Math.max(maxWh, widths[i]);
    const recs=sl.map(i=>resizeNormRec(crops[i], maxWh));
    const imgW=recs[0].imgW, imgH=recs[0].imgH, n=recs.length;
    const batch=new Float32Array(n*3*imgH*imgW);
    for(let i=0;i<n;i++) batch.set(recs[i].tensor, i*3*imgH*imgW);
    const t=new ort.Tensor('float32', batch, [n,3,imgH,imgW]);
    const out=await recS.run({x:t});
    const name=recS.outputNames[0];
    const pred=out[name];
    const dims=pred.dims; // [n, T, C]
    const Tlen=dims[1], Clen=dims[2], data=pred.data;
    for(let i=0;i<n;i++){
      results[sl[i]]=ctcDecode(data.subarray(i*Tlen*Clen, (i+1)*Tlen*Clen), Tlen, Clen);
    }
  }
  return results;
}

async function ocr(rgba,w,h){
  const t0=performance.now();
  const boxes=await detect(rgba,w,h);
  const t1=performance.now();
  const crops=boxes.map(b=>cropBox(rgba,w,h,b));
  const recs=await recognize(crops);
  const t2=performance.now();
  const words=[];
  for(let i=0;i<boxes.length;i++){
    const r=recs[i], b=boxes[i], c=crops[i];
    if(!r||!r.t)continue;
    words.push({t:r.t, cf:Math.round((r.cf||0)*100), x0:c.x0, y0:c.y0, x1:c.x0+c.w, y1:c.y0+c.h, score:b.score});
  }
  return {words, detMs:Math.round(t1-t0), recMs:Math.round(t2-t1), boxes:boxes.length};
}

self.onmessage=async ev=>{
  const m=ev.data||{};
  try{
    if(m.type==='init'){
      const inf=await init();
      self.postMessage({type:'ready', requestId:m.requestId, ...inf});
      return;
    }
    if(m.type==='ocr'){
      await init();
      const t0=performance.now();
      const out=await ocr(new Uint8ClampedArray(m.buf), m.w, m.h);
      self.postMessage({type:'result', requestId:m.requestId, words:out.words, detMs:out.detMs, recMs:out.recMs, boxes:out.boxes, ms:Math.round(performance.now()-t0), backend});
      return;
    }
  }catch(e){
    self.postMessage({type:'error', requestId:m.requestId, error:String(e&&e.message||e)});
  }
};
