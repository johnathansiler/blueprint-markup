// bpm-v152: Find reads the current page as a picture with PP-OCRv6 (onnxruntime-web).
// Pass 1: black text-pen strokes only. Pass 2: full-page tiles for leftover ink.
// Grammar, near-match, cache, Cancel, and All-pages text-only stay as in v151 (plus i→1).
(()=>{
 const VER=4,S=150/72,TILE=1600,OV=256,INK=0.0004;
 const VOCAB=['FATC','FACP','AIO','EOL','VF','WS'];
 const AIO_MISS=new Set(['MLO','ALO','ATO','NIO','A1O','AI0','A10']);
 const mem=new Map();
 let worker=null,loadP=null,reqN=0,pending=new Map(),detMs=0,recMs=0,boxN=0,ocrTiles=0;
 const key=(id,n)=>id+':'+n, dbKey=(id,n)=>'findOcr:v'+VER+':'+id+':'+n;
 const cancelledErr=()=>{const e=new Error('cancelled');e.cancelled=true;return e};

 function getWorker(){
  if(worker)return worker;
  worker=new Worker('vendor/ppocr/ppocr-worker.js');
  worker.onmessage=e=>{
   const d=e.data||{},p=pending.get(d.requestId);
   if(!p)return; pending.delete(d.requestId);
   if(d.type==='error')p.no(new Error(d.error||'ppocr failed'));
   else p.ok(d);
  };
  worker.onerror=e=>{try{e.preventDefault&&e.preventDefault()}catch(_){}
   const err=new Error(e.message||'ppocr worker failed');
   for(const[,p] of pending)p.no(err); pending.clear();};
  return worker;
 }
 function callWorker(msg,transfer){
  const requestId=++reqN;
  return new Promise((ok,no)=>{
   pending.set(requestId,{ok,no});
   try{getWorker().postMessage(Object.assign({requestId},msg),transfer||[])}
   catch(e){pending.delete(requestId);no(e)}
  });
 }
 async function ensureEngine(onProg){
  if(loadP)return loadP;
  onProg&&onProg({msg:'Getting the picture reader ready…'});
  loadP=callWorker({type:'init'}).catch(e=>{loadP=null;throw e});
  return loadP;
 }
 async function ocrImageData(id){
  const buf=id.data.buffer.slice(id.data.byteOffset, id.data.byteOffset+id.data.byteLength);
  const r=await callWorker({type:'ocr',w:id.width,h:id.height,buf},[buf]);
  detMs+=(r.detMs||0); recMs+=(r.recMs||0); boxN+=(r.boxes||0); ocrTiles++;
  return r.words||[];
 }

 function fix(t){t=String(t||'').replace(/¢/g,'c').replace(/\s+/g,' ').trim();
  t=t.replace(/^[Ili]:(?=\d)/,'1:').replace(/([:\-])O(?=\d)/g,'$10').replace(/O(?=\d{2})/g,'0');return t}
 function canonAddr(t){t=fix(t).replace(/--+/g,'-').replace(/\s+/g,'');
  const d=s=>s.replace(/[Ili]/g,'1').replace(/[Oo]/g,'0');
  let m=t.match(/^([0-9IliOo])[:\-]([0-9IliOo]{3})-([0-9IliOo]{2,3})$/);if(m)return d(m[1])+':'+d(m[2])+'-'+d(m[3]);
  m=t.match(/^([0-9IliOo])([0-9IliOo]{3})-([0-9IliOo]{2,3})$/);if(m)return d(m[1])+':'+d(m[2])+'-'+d(m[3]);
  m=t.match(/^([0-9IliOo]):([0-9IliOo]{3})([0-9IliOo]{2,3})$/);if(m)return d(m[1])+':'+d(m[2])+'-'+d(m[3]);return t}
 function keep(t,cf){t=vocabSnap(canonAddr(t));if(!t||!/[A-Za-z0-9]/.test(t))return'';if(cf>=35||/\d/.test(t)||t.length>=3)return t;return''}
 function vocabSnap(t){t=String(t||'').trim();if(!t)return t;
  let s=t.replace(/[()]/g,'');
  s=s.replace(/^[Tt](?=5cd)/,'7').replace(/^[Ili](?=5cd)/,'1').replace(/^[Ili](?=85cd)/,'1');
  let m=t.match(/^(FATC|FACP|AIO|EOL)\s*\(?[NESW]?\)?$/i);if(m)return m[1].toUpperCase();
  m=s.match(/^(\d{2,3})\s*c(?:d)?(?![a-z0-9-])/i);if(m && !/^\d+-\d+cd/i.test(s))return m[1]+'cd';
  m=s.match(/^(\d{2,3})cd/i);if(m && !/^\d+-\d+cd/i.test(s) && !/^\d+cd\d{2,}/i.test(s))return m[1]+'cd';
  const u=t.replace(/[^A-Za-z0-9]/g,'').toUpperCase();
  if(AIO_MISS.has(u))return'AIO';
  for(const v of VOCAB){if(u===v)return v;if(u.length!==v.length||v.length<4)continue;
   let d=0;for(let i=0;i<v.length;i++)if(u[i]!==v[i])d++;if(d===1)return v}
  return t}
 const CONF={'5':'96','9':'5','6':'58','0':'o','o':'0','1':'li','l':'1i','i':'1l'};
 function isConf(a,b){a=String(a).toLowerCase();b=String(b).toLowerCase();return a===b||(CONF[a]||'').includes(b)}
 function oneDigitConf(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++){if(a[i]===b[i])continue;if(!isConf(a[i],b[i]))return false;d++}return d===1}
 function isAddr(t){return/^\d:\d{3}-\d{2,3}$/.test(t)}
 function completeFrag(raw,L,M){if(isAddr(raw))return null;const pre=L+':'+M;
  let m=String(raw).match(new RegExp('(?:^|[^0-9])('+M+'-(\\d{2,3}))(?:[^0-9]|$)'));
  if(m)return pre+'-'+m[2];
  m=String(raw).match(/^(\d{1,3})-(\d{2,3})$/);
  if(m&&(M.endsWith(m[1])||oneDigitConf(m[1].padStart(M.length,'0'),M)))return pre+'-'+m[2];
  m=String(raw).match(new RegExp('^'+L+M+'-{1,2}(\\d{2,3})$'));if(m)return pre+'-'+m[1];
  return null}
 function prefixFix(words){const addrs=words.filter(w=>isAddr(w.t));if(!addrs.length)return words;
  const loopC=new Map(),modC=new Map();
  for(const w of addrs){const m=w.t.match(/^(\d):(\d{3})-/);loopC.set(m[1],(loopC.get(m[1])||0)+1);modC.set(m[2],(modC.get(m[2])||0)+1)}
  const best=m=>[...m].sort((a,b)=>b[1]-a[1])[0];
  const bL=best(loopC),bM=best(modC);if(!bL)return words;
  if(bL[1]>=2){
   for(const w of words){if(!isAddr(w.t))continue;const m=w.t.match(/^(\d):(\d{3})-(\d{2,3})$/);let L=m[1],M=m[2],D=m[3],ch=0;
    if(L!==bL[0]&&isConf(L,bL[0])&&(M===(bM&&bM[0])||(bM&&bM[1]>=2&&oneDigitConf(M,bM[0])))){L=bL[0];ch=1}
    if(bM&&bM[1]>=2&&M!==bM[0]&&oneDigitConf(M,bM[0])&&L===bL[0]){M=bM[0];ch=1}
    if(ch)w.t=L+':'+M+'-'+D}}
  if(bM){for(const w of words){if(isAddr(w.t))continue;const t=completeFrag(w.t,bL[0],bM[0]);if(t)w.t=t}}
  return words}
 function cdFix(words){const cds=words.map(w=>String(w.t||'').match(/^(\d{2,3})cd$/i)).filter(Boolean).map(m=>m[1]+'cd');
  if(cds.length<2)return words;
  const c=new Map();for(const t of cds)c.set(t,(c.get(t)||0)+1);
  const best=[...c].sort((a,b)=>b[1]-a[1])[0];if(!best||best[1]<2)return words;
  const want=best[0],wn=want.replace('cd','');
  for(const w of words){const m=String(w.t||'').match(/^(\d{2,3})cd$/i);if(!m)continue;const got=m[1];
   if(got===wn)continue;if(got.length===wn.length&&oneDigitConf(got,wn))w.t=want}
  return words}
 function lineJoin(words){const L=[...words].sort((a,b)=>a.y-b.y||a.x-b.x),out=[];
  for(const w of L){const prev=out[out.length-1],mid=w.y+w.h/2,pm=prev&&(prev.y+prev.h/2);
   const gap=prev?w.x-(prev.x+prev.w):999,em=prev?Math.max(prev.h,w.h):1;
   const long=s=>s.length>16;
   const tight=prev&&Math.abs(mid-pm)<em*0.55&&w.x>=prev.x-2&&gap<=em*0.7&&!isAddr(prev.t)&&!isAddr(w.t)&&!long(prev.t)&&!long(w.t);
   if(!tight){out.push({t:w.t,x:w.x,y:w.y,w:w.w,h:w.h,cf:w.cf,parts:[w]});continue}
   prev.t=canonAddr(prev.t+w.t);prev.w=Math.max(prev.x+prev.w,w.x+w.w)-prev.x;prev.y=Math.min(prev.y,w.y);
   prev.h=Math.max(prev.y+prev.h,w.y+w.h)-prev.y;prev.cf=Math.max(prev.cf,w.cf);prev.parts.push(w)}
  return out}
 function isCanonTag(t){return isAddr(t)||VOCAB.includes(t)||/^\d{2,3}cd$/i.test(t)}
 function dedupe(words){const o=[];for(const w of words){const hit=o.find(p=>Math.abs((p.x+p.w/2)-(w.x+w.w/2))<Math.max(6,Math.min(p.w,w.w)*.4)&&Math.abs((p.y+p.h/2)-(w.y+w.h/2))<Math.max(4,Math.min(p.h,w.h)*.4));
  if(!hit)o.push(w);
  else if(isCanonTag(w.t)&&!isCanonTag(hit.t)){hit.t=w.t;hit.x=w.x;hit.y=w.y;hit.w=w.w;hit.h=w.h;hit.cf=w.cf}
  else if(isCanonTag(hit.t)&&!isCanonTag(w.t)){}
  else if(isAddr(w.t)&&!isAddr(hit.t)){hit.t=w.t;hit.x=w.x;hit.y=w.y;hit.w=w.w;hit.h=w.h;hit.cf=w.cf}
  else if((w.cf||0)>(hit.cf||0)||(w.t.length>hit.t.length+1&&!isAddr(hit.t)&&!isCanonTag(hit.t))){hit.t=w.t;hit.x=w.x;hit.y=w.y;hit.w=w.w;hit.h=w.h;hit.cf=w.cf}}
  return o}
 function wordFrom(t,cf,x,y,w,h){t=keep(t,cf);if(!t)return null;if(w<0.4||h<0.4)return null;return{t,x,y,w,h,cf:cf|0}}
 function overlaps(a,b){const x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return x*y>0.3*Math.max(1,Math.min(a.w*a.h,b.w*b.h))}

 function collectStrokes(fn,args,O,vt){
  const out=[];let ctm=vt.slice(),st=[],stroke=[0,0,0],lw=1,segs=[],cur=null,start=null;
  const ap=(x,y)=>[ctm[0]*x+ctm[2]*y+ctm[4],ctm[1]*x+ctm[3]*y+ctm[5]];
  const mul=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
  const col=a=>{if(!a||!a.length)return[0,0,0];
   if(typeof a[0]==='string'){const h=a[0].replace('#','');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]}
   if(a.length===1){const g=+a[0];return g>1?[g/255,g/255,g/255]:[g,g,g]}
   const k=a[0]>1?1/255:1;return[a[0]*k,a[1]*k,a[2]*k]};
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const close=()=>{if(cur&&start&&dist(cur,start)>1e-6)segs.push({t:'l',p:[cur,start]});cur=start};
  const lwScale=()=> (Math.hypot(ctm[0],ctm[1])+Math.hypot(ctm[2],ctm[3]))/2;
  const paint=(s)=>{if(!s||!segs.length){segs=[];cur=start=null;return}
   const c=stroke;if(!c||Math.max(c[0],c[1],c[2])>=0.12){segs=[];cur=start=null;return}
   const width=lw*lwScale();if(!(width>=0.18&&width<=1.3)){segs=[];cur=start=null;return}
   let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const g of segs)for(const p of g.p){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]}
   const ww=x1-x0,hh=y1-y0;
   if(ww>14&&hh>14&&ww/(hh||1)>=0.7&&ww/(hh||1)<=1.4){segs=[];cur=start=null;return}
   out.push({segs,width,x0,y0,x1,y1});segs=[];cur=start=null};
  for(let i=0;i<fn.length;i++){const f=fn[i],a=args[i];
   if(f===O.save)st.push([ctm,stroke,lw]);
   else if(f===O.restore){const s=st.pop();if(s)[ctm,stroke,lw]=s}
   else if(f===O.transform)ctm=mul(ctm,a);
   else if(f===O.paintFormXObjectBegin){st.push([ctm,stroke,lw]);if(a&&a[0])ctm=mul(ctm,a[0])}
   else if(f===O.paintFormXObjectEnd){const s=st.pop();if(s)[ctm,stroke,lw]=s}
   else if(f===O.setLineWidth)lw=+a[0]||0;
   else if(f===O.setStrokeRGBColor)stroke=col(a);
   else if(f===O.setStrokeGray)stroke=col(a);
   else if(f===O.setStrokeCMYKColor){const K=a[3]>1?a[3]/255:a[3];const kk=1-K;stroke=[kk,kk,kk]}
   else if(f===O.setStrokeColorN)stroke=null;
   else if(f===O.setGState&&a&&a[0]&&typeof a[0]==='object'){const g=a[0];if(g.lineWidth!=null)lw=+g.lineWidth;if(g.strokeColor)stroke=col(Array.isArray(g.strokeColor)?g.strokeColor:[g.strokeColor])}
   else if(f===O.constructPath){const ops=a[0],c=a[1];let j=0;
    for(const op of ops){
     if(op===O.moveTo){cur=start=ap(c[j],c[j+1]);j+=2}
     else if(op===O.lineTo){const p=ap(c[j],c[j+1]);j+=2;if(cur)segs.push({t:'l',p:[cur,p]});cur=p}
     else if(op===O.curveTo){const p1=ap(c[j],c[j+1]),p2=ap(c[j+2],c[j+3]),p=ap(c[j+4],c[j+5]);j+=6;if(cur)segs.push({t:'c',p:[cur,p1,p2,p]});cur=p}
     else if(op===O.curveTo2){const p2=ap(c[j],c[j+1]),p=ap(c[j+2],c[j+3]);j+=4;if(cur)segs.push({t:'c',p:[cur,cur,p2,p]});cur=p}
     else if(op===O.curveTo3){const p1=ap(c[j],c[j+1]),p=ap(c[j+2],c[j+3]);j+=4;if(cur)segs.push({t:'c',p:[cur,p1,p,p]});cur=p}
     else if(op===O.closePath)close();
     else if(op===O.rectangle){const x=c[j],y=c[j+1],w=c[j+2],h=c[j+3];j+=4;const q=[ap(x,y),ap(x+w,y),ap(x+w,y+h),ap(x,y+h)];for(let k=0;k<4;k++)segs.push({t:'l',p:[q[k],q[(k+1)%4]]});cur=start=q[0]}}}
   else if(f===O.stroke)paint(1);else if(f===O.closeStroke){close();paint(1)}
   else if(f===O.fillStroke||f===O.eoFillStroke)paint(1);
   else if(f===O.closeFillStroke||f===O.closeEOFillStroke){close();paint(1)}
   else if(f===O.endPath||f===O.fill||f===O.eoFill){segs=[];cur=start=null}}
  return out;
 }

 function drawStrokes(paths,c,scale,ox,oy){
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
  g.strokeStyle='#000';g.lineCap='butt';g.lineJoin='round';
  const X=p=>(p[0]-ox)*scale, Y=p=>(p[1]-oy)*scale;
  for(const path of paths){
   if(path.x1<ox||path.y1<oy||path.x0>ox+c.width/scale||path.y0>oy+c.height/scale)continue;
   g.lineWidth=Math.max(1, path.width*scale*1.3);
   g.beginPath();
   for(const s of path.segs){
    if(s.t==='l'){g.moveTo(X(s.p[0]),Y(s.p[0]));g.lineTo(X(s.p[1]),Y(s.p[1]))}
    else if(s.t==='c'){g.moveTo(X(s.p[0]),Y(s.p[0]));g.bezierCurveTo(X(s.p[1]),Y(s.p[1]),X(s.p[2]),Y(s.p[2]),X(s.p[3]),Y(s.p[3]))}
   }
   g.stroke();
  }
 }
 function tileInkFrac(id){const d=id.data;let n=0,N=d.length;for(let i=0;i<N;i+=16){if(d[i]<250||d[i+1]<250||d[i+2]<250)n++}return n/((N/16)||1)}

 function finishWords(words){
  let joined=lineJoin(dedupe(words)).map(w=>(w.t=vocabSnap(canonAddr(w.t)),w));
  const extra=[];const RX=/[1-9Iil](?:[ :]|[:\-])[0-9IlOol]{3}-[0-9IlOol]{2,3}|[1-9Iil]:[0-9IlOol]{5,6}/g;
  const TX=/FATC|FACP|AIO|185cd|15cd|30cd|110cd|75cd/gi;
  for(const w of joined){const raw=String(w.t||'');
   if(!isAddr(raw)){let m;RX.lastIndex=0;while((m=RX.exec(raw))){const tt=canonAddr(m[0].replace(/ /g,''));if(tt&&tt!==raw)extra.push({t:tt,x:w.x,y:w.y,w:w.w,h:w.h,cf:w.cf,parts:w.parts})}}
   if(raw.length>4){let m;TX.lastIndex=0;while((m=TX.exec(raw))){if(m[0]!==raw)extra.push({t:vocabSnap(m[0]),x:w.x,y:w.y,w:w.w,h:w.h,cf:w.cf})}}}
  return cdFix(prefixFix(dedupe(joined.concat(extra))));
 }

 async function cached(id,n){const k=key(id,n);if(mem.has(k))return mem.get(k);
  try{const v=await get('meta',dbKey(id,n));if(v&&v.v===VER&&Array.isArray(v.words)){mem.set(k,v);return v}}catch(e){}
  return null}
 async function save(id,n,rec){mem.set(key(id,n),rec);try{await put('meta',rec,dbKey(id,n))}catch(e){console.warn('find ocr cache',e)}}

 async function readPage(n,opt){const onProg=opt&&opt.onProgress||(()=>{}),cancelled=opt&&opt.cancelled||(()=>false);
  if(!pdf||!plan)throw new Error('no plan');
  if(!(opt&&opt.force)){const hit=await cached(plan.id,n);if(hit)return hit}else mem.delete(key(plan.id,n));
  const pg=await pdf.getPage(n),vp=pg.getViewport({scale:1}),fullW=vp.width*S,fullH=vp.height*S,step=TILE-OV;
  const tiles=[];for(let y=0;y<fullH;y+=step)for(let x=0;x<fullW;x+=step)tiles.push({x,y,w:Math.min(TILE,fullW-x),h:Math.min(TILE,fullH-y)});
  await ensureEngine(onProg);
  if(cancelled())throw cancelledErr();
  detMs=recMs=boxN=ocrTiles=0;

  const O=pdfjsLib.OPS;
  let paths=[];
  try{
   const ol=window.vecOL?await vecOL(n,pg):await pg.getOperatorList();
   paths=collectStrokes(ol.fnArray,ol.argsArray,O,vp.transform);
  }catch(e){console.warn('stroke list',e);paths=[]}

  const words=[];
  const addHits=(T,hits,pass)=>{
   for(const z of hits){
    const t=keep(z.t,z.cf|0);if(!t)continue;
    const x=(T.x+(z.x0||0))/S,y=(T.y+(z.y0||0))/S,ww=((z.x1||0)-(z.x0||0))/S,hh=((z.y1||0)-(z.y0||0))/S;
    const wr=wordFrom(t,z.cf|0,x,y,ww,hh);if(wr){wr._pass=pass;words.push(wr)}
   }
  };

  let done=0;
  for(const T of tiles){
   if(cancelled())throw cancelledErr();
   const c=document.createElement('canvas');c.width=T.w;c.height=T.h;
   drawStrokes(paths,c,S,T.x/S,T.y/S);
   const g=c.getContext('2d',{willReadFrequently:true});
   const id=g.getImageData(0,0,T.w,T.h);
   const frac=tileInkFrac(id);
   T._strokeFrac=frac;
   if(frac>=INK){
    onProg({msg:'Reading the drawing as a picture… ('+(done+1)+' of '+tiles.length+')'});
    const hits=await ocrImageData(id);
    addHits(T,hits,1);
   }
   done++;
   c.width=c.height=0;
  }

  // Pass 2: full-page tiles for leftovers. If stroke-pass already found
  // addresses, only fill a few uncovered tiles (i→1 covers the usual typo).
  let leftovers=0;
  const pass1Addr=words.filter(w=>isAddr(canonAddr(w.t))).length;
  const leftoverCap=pass1Addr>=2?6:24;
  for(const T of tiles){
   if(cancelled())throw cancelledErr();
   if(leftovers>=leftoverCap)break;
   const pageBox={x:T.x/S,y:T.y/S,w:T.w/S,h:T.h/S};
   const covered=words.some(w=>overlaps(w,pageBox));
   if(covered&&T._strokeFrac>=INK*4)continue;
   const c=document.createElement('canvas');c.width=T.w;c.height=T.h;
   const g=c.getContext('2d',{willReadFrequently:true});
   g.fillStyle='#fff';g.fillRect(0,0,T.w,T.h);
   const vpt=pg.getViewport({scale:S,offsetX:-T.x,offsetY:-T.y});
   try{await pg.render({canvasContext:g,viewport:vpt}).promise}catch(e){c.width=c.height=0;continue}
   const id=g.getImageData(0,0,T.w,T.h);
   const frac=tileInkFrac(id);
   if(frac<INK||frac>0.04){c.width=c.height=0;continue}
   leftovers++;
   onProg({msg:'Reading leftover areas of the drawing… ('+leftovers+')'});
   const hits=await ocrImageData(id);
   addHits(T,hits,2);
   c.width=c.height=0;
  }

  const all=finishWords(words);
  const recOut={v:VER,words:all,n:all.length,at:Date.now(),scale:S,tiles:tiles.length,leftovers,engine:'ppocr-v6',detMs,recMs,boxN,ocrTiles,paths:paths.length};
  try{window.__ocrDebug={tiles:tiles.length,leftovers,paths:paths.length,ocrTiles,detMs,recMs,boxN,all:all.map(w=>w.t),backend:(await loadP||{}).backend}}catch(e){}
  await save(plan.id,n,recOut);return recOut}
 function clearMem(){mem.clear()}
 window.findOcrCached=cached;window.findOcrRead=readPage;window.findOcrClear=clearMem;window.findOcrJoin=lineJoin;window.findOcrPrefixFix=prefixFix;
 window.ppocrReady=ensureEngine;window.ppocrImage=ocrImageData;
 const _cp=window.closePlan;if(typeof closePlan==='function')closePlan=function(){clearMem();return _cp.apply(this,arguments)};
})();
