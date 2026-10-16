// bpm-v94: device-identifying text tags beside a detected glyph. TYPE ONLY — never touches x/y/ang/bw/bh/outset.
// RI = remote indicator, WP = weatherproof variant, R = relay. Status tags (N)/(E)/(ER) are ignored for typing and kept as metadata.
(()=>{
const STATUS=new Set(['N','E','ER','EX','NEW','EXISTING']),MODS=['RI','WP','R'];
// Which detect groups a modifier re-types. RI on any light/notification glyph → Remote indicator; R on a module glyph → Relay. WP never changes type.
const RETYPE={RI:{from:['strobe','spkw','spkc','horn','la'],to:'rai',det:'RAI'},R:{from:['module'],to:'relay',det:'RELAY'}};
function parseTags(words){const toks=[];for(const w of words)for(const t of String(w).toUpperCase().replace(/[^A-Z0-9()]+/g,' ').split(/\s+/))if(t)toks.push(t);
 const mods=new Set(),status=new Set();for(let t of toks){const par=/^\(.*\)$/.test(t);t=t.replace(/[()]/g,'');if(!t)continue;if(STATUS.has(t)&&(par||t.length<=2)){status.add(t==='EX'||t==='EXISTING'?'E':t==='NEW'?'N':t);continue}if(MODS.includes(t))mods.add(t)}
 return{mods:[...mods].sort(),status:[...status][0]||''}}
window.parseTags=parseTags;
// ---- text layer, cached per page ----
const tl=new Map();async function textOf(pg,n){const k=(plan?.id||'')+':'+n;if(tl.has(k))return tl.get(k);const vp=pg.getViewport({scale:1});let o=[];try{const tc=await pg.getTextContent();o=tc.items.filter(t=>(t.str||'').trim()).map(t=>{const m=pdfjsLib.Util.transform(vp.transform,t.transform),h=Math.hypot(m[2],m[3])||8;return{s:t.str,x:m[4]+(t.width||0)/2,y:m[5]-h/2,w:t.width||h,h}})}catch{}tl.set(k,o);return o}
// ---- OCR fallback (labels drawn as vector outlines have no text layer). Lazy, offline: vendor/ocr ----
let ocrW=null;async function ocr(){if(ocrW)return ocrW;if(!window.Tesseract)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='vendor/ocr/tesseract.min.js';s.onload=ok;s.onerror=no;document.head.append(s)});
 const base=new URL('vendor/ocr/',location.href).href;ocrW=(async()=>{const w=await Tesseract.createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,gzip:true,cacheMethod:'none'});await w.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()',tessedit_pageseg_mode:'7'});return w})();return ocrW}
async function ocrWords(pg,x,y,r,glyph){const S=4,vp=pg.getViewport({scale:S,offsetX:-(x-r)*S,offsetY:-(y-r)*S}),c=document.createElement('canvas');c.width=c.height=Math.ceil(2*r*S);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:g,viewport:vp}).promise;
 // blank the glyph itself so its strokes aren't read as letters
 if(glyph){g.fillStyle='#fff';g.fillRect((r-glyph/2)*S,(r-glyph/2)*S,glyph*S,glyph*S)}
 // binarize: keep only near-black ink (drops colored wiring/cloud lines)
 const W=c.width,H=c.height,id=g.getImageData(0,0,W,H).data,ink=new Uint8Array(W*H);for(let i=0;i<W*H;i++)ink[i]=Math.max(id[i*4],id[i*4+1],id[i*4+2])<120?1:0;
 // connected components → word boxes (text-height blobs merged along a line); Tesseract reads isolated words far better than a sparse crop
 const lab=new Int32Array(W*H).fill(-1),bx=[];for(let i=0;i<W*H;i++){if(!ink[i]||lab[i]>=0)continue;const st=[i],b={x0:W,y0:H,x1:0,y1:0};lab[i]=bx.length;while(st.length){const j=st.pop(),x=j%W,y=(j/W)|0;if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;for(const k of[j-1,j+1,j-W,j+W])if(k>=0&&k<W*H&&ink[k]&&lab[k]<0&&Math.abs(k%W-x)<=1){lab[k]=bx.length;st.push(k)}}bx.push(b)}
 const ch=bx.filter(b=>{const h=b.y1-b.y0+1,w=b.x1-b.x0+1;return h>=4*S/2&&h<=14*S&&w<=12*S});const words=[];for(const b of ch.sort((a,b)=>a.x0-b.x0)){const h=b.y1-b.y0+1,wd=words.find(w=>Math.min(w.y1,b.y1)-Math.max(w.y0,b.y0)>.5*Math.min(h,w.y1-w.y0+1)&&b.x0-w.x1<h*1.1&&b.x0>=w.x0);if(wd){wd.x1=Math.max(wd.x1,b.x1);wd.y0=Math.min(wd.y0,b.y0);wd.y1=Math.max(wd.y1,b.y1)}else words.push({...b})}
 const w=await ocr(),out=[];for(const q of words.slice(0,8)){const ww=q.x1-q.x0+1,hh=q.y1-q.y0+1,z=Math.max(1,Math.min(4,48/hh)),o=document.createElement('canvas');o.width=Math.ceil(ww*z)+32;o.height=Math.ceil(hh*z)+32;const og=o.getContext('2d'),D=og.createImageData(o.width,o.height);D.data.fill(255);
  for(let y=0;y<o.height;y++)for(let x=0;x<o.width;x++){const sx=q.x0+Math.floor((x-16)/z),sy=q.y0+Math.floor((y-16)/z);if(sx>=q.x0&&sx<=q.x1&&sy>=q.y0&&sy<=q.y1&&ink[sy*W+sx]){const i=(y*o.width+x)*4;D.data[i]=D.data[i+1]=D.data[i+2]=0}}og.putImageData(D,0,0);
  const{data}=await w.recognize(o);const t=(data.text||'').trim().replace(/\s+/g,' '),cf=data.confidence|0;if(t&&cf>=45)out.push({s:t,x:x-r+(q.x0+q.x1)/2/S,y:y-r+(q.y0+q.y1)/2/S})}
 return out}
// words near a point: text layer first, then OCR
async function wordsNear(pg,n,x,y,size,useOcr){const r=Math.max(18,size*1.6),T=await textOf(pg,n),near=T.filter(t=>Math.abs(t.x-x)<r+t.w/2&&Math.abs(t.y-y)<r).map(t=>({s:t.s,x:t.x,y:t.y}));
 if(near.some(t=>/[A-Za-z]/.test(t.s)))return{words:near,src:'text'};if(!useOcr)return{words:near,src:'text'};try{return{words:await ocrWords(pg,x,y,r,size*1.05),src:'ocr'}}catch(e){console.warn('ocr',e);return{words:near,src:'none'}}}
window.tagsNear=async(pg,n,x,y,size)=>parseTags((await wordsNear(pg,n,x,y,size,true)).words.map(w=>w.s));
const OCR_G=new Set(Object.values(RETYPE).flatMap(v=>v.from));
// mutate items in place: g/type/tags/plan status only
// bpm-v98 (B4b): each label token belongs to its NEAREST glyph only (nearest-owner), so a WP/RI/R beside one symbol can't bleed onto a neighbour
window.applyTags=async(pg,n,items,groups)=>{let k=0;const cand=items.filter(it=>OCR_G.has(it.g)||it.master),toks=[],src=new Map();
 for(const it of cand){const sz=Math.max(it.bw||0,it.bh||0)||13,r=await wordsNear(pg,n,it.x,it.y,sz,true);src.set(it,r.src);for(const w of r.words)if(!toks.some(o=>o.s===w.s&&Math.hypot(o.x-w.x,o.y-w.y)<3))toks.push(w)}
 const own=new Map(cand.map(it=>[it,[]]));
 for(const t of toks){let best=null,bd=1e9;for(const it of items){const d=Math.hypot(it.x-t.x,it.y-t.y)/(Math.max(it.bw||0,it.bh||0)||13);if(d<bd){bd=d;best=it}}if(best&&own.has(best))own.get(best).push(t.s)}
 for(const it of cand){const t=parseTags(own.get(it));it.tags=t.mods;it.plan=t.status;it.tagSrc=src.get(it);
  for(const m of t.mods){const R=RETYPE[m];if(R&&R.from.includes(it.g)&&(!groups||groups.includes(R.to))){it.fromG=it.g;it.g=R.to;it.type=R.det;k++;break}}}
 return k};
})();
