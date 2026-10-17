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
// bpm-v106: second reader for candela / wattage tags (lowercase 'cd', '1/2W', '15/75cd'); RI/WP/R keep the original uppercase reader
let ocrW2=null;async function ocr2(){if(ocrW2)return ocrW2;await ocr();const base=new URL('vendor/ocr/',location.href).href;ocrW2=(async()=>{const w=await Tesseract.createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,gzip:true,cacheMethod:'none'});await w.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789()/.:,-',tessedit_pageseg_mode:'7'});return w})();return ocrW2}
let ocrW=null;async function ocr(){if(ocrW)return ocrW;if(!window.Tesseract)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='vendor/ocr/tesseract.min.js';s.onload=ok;s.onerror=no;document.head.append(s)});
 const base=new URL('vendor/ocr/',location.href).href;ocrW=(async()=>{const w=await Tesseract.createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,gzip:true,cacheMethod:'none'});await w.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()',tessedit_pageseg_mode:'7'});return w})();return ocrW}
async function ocrWords(pg,x,y,r,glyph,max=8,rd=null,S=4){vp=pg.getViewport({scale:S,offsetX:-(x-r)*S,offsetY:-(y-r)*S}),c=document.createElement('canvas');c.width=c.height=Math.ceil(2*r*S);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:g,viewport:vp}).promise;
 // blank the glyph itself so its strokes aren't read as letters
 if(glyph){g.fillStyle='#fff';g.fillRect((r-glyph/2)*S,(r-glyph/2)*S,glyph*S,glyph*S)}
 // binarize: keep only near-black ink (drops colored wiring/cloud lines)
 const W=c.width,H=c.height,id=g.getImageData(0,0,W,H).data,ink=new Uint8Array(W*H);for(let i=0;i<W*H;i++)ink[i]=Math.max(id[i*4],id[i*4+1],id[i*4+2])<120?1:0;
 // connected components → word boxes (text-height blobs merged along a line); Tesseract reads isolated words far better than a sparse crop
 const lab=new Int32Array(W*H).fill(-1),bx=[];for(let i=0;i<W*H;i++){if(!ink[i]||lab[i]>=0)continue;const st=[i],b={x0:W,y0:H,x1:0,y1:0};lab[i]=bx.length;while(st.length){const j=st.pop(),x=j%W,y=(j/W)|0;if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;for(const k of[j-1,j+1,j-W,j+W])if(k>=0&&k<W*H&&ink[k]&&lab[k]<0&&Math.abs(k%W-x)<=1){lab[k]=bx.length;st.push(k)}}bx.push(b)}
 const ch=bx.filter(b=>{const h=b.y1-b.y0+1,w=b.x1-b.x0+1;return h>=4*S/2&&h<=14*S&&w<=12*S});const words=[];for(const b of ch.sort((a,b)=>a.x0-b.x0)){const h=b.y1-b.y0+1,wd=words.find(w=>Math.min(w.y1,b.y1)-Math.max(w.y0,b.y0)>.5*Math.min(h,w.y1-w.y0+1)&&b.x0-w.x1<h*1.1&&b.x0>=w.x0);if(wd){wd.x1=Math.max(wd.x1,b.x1);wd.y0=Math.min(wd.y0,b.y0);wd.y1=Math.max(wd.y1,b.y1)}else words.push({...b})}
 const w=await (rd||ocr)(),out=[];for(const q of words.slice(0,max)){const ww=q.x1-q.x0+1,hh=q.y1-q.y0+1,z=Math.max(1,Math.min(4,48/hh)),o=document.createElement('canvas');o.width=Math.ceil(ww*z)+32;o.height=Math.ceil(hh*z)+32;const og=o.getContext('2d'),D=og.createImageData(o.width,o.height);D.data.fill(255);
  for(let y=0;y<o.height;y++)for(let x=0;x<o.width;x++){const sx=q.x0+Math.floor((x-16)/z),sy=q.y0+Math.floor((y-16)/z);if(sx>=q.x0&&sx<=q.x1&&sy>=q.y0&&sy<=q.y1&&ink[sy*W+sx]){const i=(y*o.width+x)*4;D.data[i]=D.data[i+1]=D.data[i+2]=0}}og.putImageData(D,0,0);
  const{data}=await w.recognize(o);const t=(data.text||'').trim().replace(/\s+/g,' '),cf=data.confidence|0;if(t&&cf>=45)out.push({s:t,x:x-r+(q.x0+q.x1)/2/S,y:y-r+(q.y0+q.y1)/2/S})}
 return out}
// words near a point: text layer first, then OCR
async function wordsNear(pg,n,x,y,size,useOcr){const r=Math.max(18,size*1.6),T=await textOf(pg,n),near=T.filter(t=>Math.abs(t.x-x)<r+t.w/2&&Math.abs(t.y-y)<r).map(t=>({s:t.s,x:t.x,y:t.y}));
 if(near.some(t=>/[A-Za-z]/.test(t.s)))return{words:near,src:'text'};
 // bpm-v99 (speed): OCR never runs inside Detect; a background pass (ocrPass) reads only glyphs with no text-layer word nearby, cached per spot
 if(!useOcr)return{words:near,src:'text'};const ck=(plan?.id||'')+':'+n+':'+Math.round(x)+':'+Math.round(y)+':'+Math.round(r);if(OC.has(ck))return OC.get(ck);
 let res;try{res={words:await ocrWords(pg,x,y,r,size*1.05),src:'ocr'}}catch(e){console.warn('ocr',e);res={words:near,src:'none'}}OC.set(ck,res);return res}
const OC=new Map();
window.tagsNear=async(pg,n,x,y,size)=>parseTags((await wordsNear(pg,n,x,y,size,true)).words.map(w=>w.s));
const OCR_G=new Set(Object.values(RETYPE).flatMap(v=>v.from));
// mutate items in place: g/type/tags/plan status only
// bpm-v98 (B4b): each label token belongs to its NEAREST glyph only (nearest-owner), so a WP/RI/R beside one symbol can't bleed onto a neighbour
window.applyTags=async(pg,n,items,groups,useOcr=false,only=null)=>{let k=0;const cand=items.filter(it=>(OCR_G.has(it.g)||it.master)&&(!only||only.has(it))),toks=[],src=new Map();
 for(const it of cand){const sz=Math.max(it.bw||0,it.bh||0)||13,r=await wordsNear(pg,n,it.x,it.y,sz,useOcr);src.set(it,r.src);for(const w of r.words)if(!toks.some(o=>o.s===w.s&&Math.hypot(o.x-w.x,o.y-w.y)<3))toks.push(w)}
 const own=new Map(cand.map(it=>[it,[]]));
 for(const t of toks){let best=null,bd=1e9;for(const it of items){const d=Math.hypot(it.x-t.x,it.y-t.y)/(Math.max(it.bw||0,it.bh||0)||13);if(d<bd){bd=d;best=it}}if(best&&own.has(best))own.get(best).push(t.s)}
 for(const it of cand){const t=parseTags(own.get(it));it.tags=t.mods;it.plan=t.status;it.tagSrc=src.get(it);
  if(only&&!t.mods.length&&!t.status)continue;for(const m of t.mods){const R=RETYPE[m];if(R&&R.from.includes(it.g)&&(!groups||groups.includes(R.to))){it.fromG=it.g;it.g=R.to;it.type=R.det;k++;break}}}
 return k};
// bpm-v99: background OCR pass after Detect. Only Detect suggestions (ghosts) whose glyph had no text-layer word nearby; retype is type-only and flagged low='ocr-tag'.
window.ocrPass=async(pages,groups,pl)=>{const G=ocrPass.gen=(ocrPass.gen||0)+1;let k=0;for(const n of pages){if(plan!==pl||G!==ocrPass.gen)return k;const gh=ghosts.filter(g=>g.page===n);
  const need=new Set(gh.filter(g=>(OCR_G.has(g.g))&&!(g.tags&&g.tags.length)&&g.tagSrc!=='text-word'));if(!need.size)continue;const pg=await pdf.getPage(n),T=await textOf(pg,n);
  for(const g of [...need]){const r=Math.max(18,(Math.max(g.bw||0,g.bh||0)||13)*1.6);if(T.some(t=>Math.abs(t.x-g.x)<r+t.w/2&&Math.abs(t.y-g.y)<r&&/[A-Za-z]/.test(t.s)))need.delete(g)}if(!need.size)continue;
  const items=gh.map(g=>({ref:g,x:g.x,y:g.y,bw:g.bw,bh:g.bh,g:g.g,type:g.det})),only=new Set(items.filter(i=>need.has(i.ref)));
  try{await applyTags(pg,n,items,groups,true,only)}catch(e){console.warn('ocr pass',e);continue}
  for(const i of only){const g=i.ref;if(plan!==pl)return k;if(i.tags?.length)g.tags=i.tags;if(i.plan)g.plan=i.plan;if(i.g!==g.g){g.fromG=g.g;g.shp=DG[g.g]?.t;g.g=i.g;g.det=i.type;g.low=g.low||'ocr-tag';k++}}}
 if(k&&plan===pl){try{draw();renderGhostBar()}catch{}toast(`Labels read: ${k} suggestion${k===1?'':'s'} re-typed (marked ? to check)`)}return k};
// bpm-v106: horn/strobe vs speaker/strobe (user-confirmed rule) for the triangle-on-box (SPK_*) glyph. TYPE ONLY, background, after ocrPass (reuses its OCR cache).
//  plan legend lists only ONE of the two → that one (a legend that only has speaker/strobes can't hold horn/strobes; guards a missed wattage line)
//  else adjacent tag: wattage tap (1/2W, 1W, 2W…) → speaker/strobe; candela only → horn/strobe; unreadable → speaker/strobe (default)
const WATT=/(?:^|[^A-Z0-9.\/])(?:\d+(?:\.\d+)?|\d\/\d|\/\d)\s?W(?![A-Z])/,CDR=/\d+\s?CD(?![A-Z])/;
window.hornTag=ws=>{const s=' '+ws.join(' ').toUpperCase();return WATT.test(s)?'spk':CDR.test(s)?'horn':null};
const LG=new Map();window.legendNA=async pl=>{if(LG.has(pl.id))return LG.get(pl.id);let t='';for(let n=1;n<=pdf.numPages;n++){try{t+=' '+(await textOf(await pdf.getPage(n),n)).map(o=>o.s).join(' ')}catch{}}t=t.toUpperCase();
 const spk=/SPEAKER\s*[\/-]?\s*STROBE|SPKR\s*[\/-]?\s*STROBE/.test(t),horn=/HORN\s*[\/-]?\s*STROBE/.test(t),r=spk&&!horn?'spk':horn&&!spk?'horn':null;LG.set(pl.id,r);return r};
const SPKG=new Set(['spkw','spkc']);
// bpm-v110: legend lists BOTH horn/strobe and speaker/strobe → read which drawing each legend row uses (filled cone = *_BOH, open = *_FOH) and let the rows decide per drawing (majority of rows; tie → speaker/strobe)
const LHS=new Map();window.legendHS=async pl=>{if(LHS.has(pl.id))return LHS.get(pl.id);const M={BOH:{horn:0,spk:0},FOH:{horn:0,spk:0}},RX=/(HORN|SPEAKER|SPKR)\s*\/\s*STROBE/i;let w=null;
 try{const O=pdfjsLib.OPS,keep=new Set(DOPS.map(k=>O[k]).filter(v=>v!==undefined));for(let n=1;n<=pdf.numPages;n++){if(plan!==pl)break;const pg=window.detPage?await detPage(n):await pdf.getPage(n),tc=await pg.getTextContent(),vp=pg.getViewport({scale:1});
  const rows=[];for(const q of tc.items){const s=(q.str||'').trim(),m=s.match(RX);if(!m||/^(WHERE|ALL|PROVIDE|NOTE)\b/i.test(s)||s.length>60)continue;const t=pdfjsLib.Util.transform(vp.transform,q.transform);rows.push({k:/HORN/i.test(m[1])?'horn':'spk',x:t[4],y:t[5]})}
  if(!rows.some(r=>r.k==='horn')||!rows.some(r=>r.k==='spk'))continue;const ol=window.vecOL?await vecOL(n,pg):await pg.getOperatorList(),fn=[],args=[];for(let j=0;j<ol.fnArray.length;j++)if(keep.has(ol.fnArray[j])){fn.push(ol.fnArray[j]);args.push(ol.argsArray[j])}
  w=w||new Worker('detect.js');const r=await new Promise((res,rej)=>{w.onmessage=e=>e.data.ok?res(e.data):rej(new Error(e.data.err));w.onerror=e=>{e.preventDefault?.();rej(new Error(e.message||'legend worker'))};w.postMessage({id:'leg'+n,fn,args,O,vt:vp.transform,W:vp.width,H:vp.height,want:null})});
  for(const h of rows){let b=null,bd=1e9;for(const o of r.items){if(!/^SPK_(BOH|FOH)/.test(o.type))continue;const dy=Math.abs(o.y-h.y),dx=h.x-o.x;if(dy<22&&dx>0&&dx<260&&dx+dy*3<bd){bd=dx+dy*3;b=o}}if(b)M[/BOH/.test(b.type)?'BOH':'FOH'][h.k]++}}}
 catch(e){console.warn('legend horn rows',e)}finally{try{w&&w.terminate()}catch{}}LHS.set(pl.id,M);window.__hornRows=M;return M};
window.hornPass=async(pages,groups,pl,opt={})=>{const G=hornPass.gen=(hornPass.gen||0)+1,st={legend:null,pages:{},changed:[]};window.__horn=st;let k=0;
 if(groups&&!groups.includes('horn')&&!opt.force)return 0;const leg=opt.noLegend?null:await legendNA(pl);st.legend=leg;
 for(const n of pages){if(plan!==pl||G!==hornPass.gen)return k;const gh=ghosts.filter(g=>g.page===n),cand=gh.filter(g=>SPKG.has(g.g)&&!g.fromG);if(!cand.length)continue;const ps=st.pages[n]={spk:0,horn:0,tagW:0,tagCD:0,none:0,by:leg?'legend':'tag'};
  let own=null;if(!leg){const pg=await pdf.getPage(n),toks=[];for(const g of cand){const r=await (window.wordsNearX)(pg,n,g.x,g.y,Math.max(g.bw||0,g.bh||0)||13);for(const w of r.words)if(!toks.some(o=>o.s===w.s&&Math.hypot(o.x-w.x,o.y-w.y)<3))toks.push(w)}
   own=new Map(cand.map(g=>[g,[]]));for(const t of toks){let b=null,bd=1e9;for(const g of gh){const d=Math.hypot(g.x-t.x,g.y-t.y)/(Math.max(g.bw||0,g.bh||0)||13);if(d<bd){bd=d;b=g}}if(b&&own.has(b))own.get(b).push(t.s)}}
  const LM=leg?null:await legendHS(pl);st.rows=LM;
  for(const g of cand){let v=leg,byRow=0;if(!v){const tg=hornTag(own.get(g));if(tg==='spk')ps.tagW++;else if(tg==='horn')ps.tagCD++;else ps.none++;const rm=LM&&LM[/BOH/.test(g.det||'')?'BOH':'FOH'];if(!tg&&rm&&rm.horn>rm.spk)byRow=1;v=tg||(byRow?'horn':'spk')}g.hornBy=leg?'legend':byRow?'legend-row':(v&&own&&hornTag(own.get(g))?'tag':'default');
   if(v==='horn'){ps.horn++;if(plan!==pl)return k;g.fromG=g.g;g.shp=DG[g.g]?.t;g.g='horn';g.det=/BOH/.test(g.det||'')?'HORN_BOH':'HORN_FOH';g.low=g.low||'tag';st.changed.push({page:n,id:g.id,x:Math.round(g.x),y:Math.round(g.y)});k++}else ps.spk++}}
 if(k&&plan===pl){try{draw();renderGhostBar()}catch{}toast(`Tags read: ${k} speaker/strobe suggestion${k===1?'':'s'} re-typed to horn/strobe (candela only, marked ? to check)`)}return k};
// bpm-v106: multi-criteria looks the same as smoke → only by legend text: a plan whose legend lists multi-criteria detectors and no plain smoke detector
window.multiPass=async(pages,groups,pl)=>{let t='';for(let n=1;n<=pdf.numPages;n++){try{t+=' '+(await textOf(await pdf.getPage(n),n)).map(o=>o.s).join(' ')}catch{}}t=t.toUpperCase();
 const mc=/MULTI-?\s?CRITERIA/.test(t),sm=/PHOTOELECTRIC|SMOKE\s+DETECTOR|IONIZATION/.test(t.replace(/MULTI-?\s?CRITERIA[^\/]{0,40}/g,''));if(!mc||sm||plan!==pl)return 0;let k=0;
 for(const g of ghosts)if(pages.includes(g.page)&&g.g==='smoke'){g.fromG=g.g;g.shp='smoke';g.g='multi';g.low=g.low||'legend';k++}
 if(k){try{draw();renderGhostBar()}catch{}toast(`Legend lists multi-criteria detectors only: ${k} smoke suggestion${k===1?'':'s'} set to multi-criteria (marked ? to check)`)}return k};
// bpm-v106: speaker-only and low-frequency-sounder symbols look like the line-array glyph (box + triangle) → retype by legend text only:
// the plan never mentions a line array and lists exactly one of plain speaker / low-frequency sounder. Type only; position untouched.
window.linePass=async(pages,groups,pl)=>{let t='';for(let n=1;n<=pdf.numPages;n++){try{t+=' '+(await textOf(await pdf.getPage(n),n)).map(o=>o.s).join(' ')}catch{}}if(plan!==pl)return 0;t=t.toUpperCase();
 if(/LINE\s*-?\s*ARRAY/.test(t))return 0;const p=t.replace(/(SPEAKER|SPKR)\s*[\/-]?\s*STROBE/g,'').replace(/NAC\s+SPEAKERS?|SPEAKERS?\s+(CIRCUIT|WIRE|WIRING|CABLE|LINE)S?/g,''),sp=/\bSPEAKERS?\b|\bSPKR\b/.test(p),lf=/LOW\s*-?\s*FREQ/.test(t);const to=sp&&!lf?'speaker':lf&&!sp?'lfs':null;window.__line={to,n:0};if(!to)return 0;let k=0;
 for(const g of ghosts)if(pages.includes(g.page)&&g.g==='la'&&!g.fromG){g.fromG=g.g;g.shp=DG.la.t;g.g=to;g.det=to==='lfs'?'LFS':'SPEAKER';g.low=g.low||'legend';k++}window.__line.n=k;
 if(k){try{draw();renderGhostBar()}catch{}toast(`Legend lists ${to==='lfs'?'low-frequency sounders':'speakers'} and no line array: ${k} suggestion${k===1?'':'s'} re-typed (marked ? to check)`)}return k};
const OC2=new Map();window.wordsNearX=async(pg,n,x,y,size)=>{const r=await wordsNear(pg,n,x,y,size,true);if(hornTag(r.words.map(w=>w.s)))return r;
 // candela / wattage lines usually sit a little further out than RI/WP (two stacked lines under the address) → one wider OCR read, cached per spot
 const ck=(plan?.id||'')+':'+n+':'+Math.round(x)+':'+Math.round(y);if(!OC2.has(ck)){let w=[];try{w=await ocrWords(pg,x,y,Math.max(36,size*2.8),size*1.05,16,ocr2,8)}catch(e){console.warn('ocr2',e)}OC2.set(ck,w)}const T=await textOf(pg,n),R=Math.max(36,size*2.8);
 return{words:[...r.words,...OC2.get(ck),...T.filter(t=>Math.abs(t.x-x)<R&&Math.abs(t.y-y)<R).map(t=>({s:t.s,x:t.x,y:t.y}))],src:'ocr2'}};
// bpm-v106: panel box letters (FAAP/FARP/FATC/DACT/FACP) for boxes whose letters are vector outlines (no text-layer label). Type only; geometry/shape untouched.
const PNG_={facp:1,dact:1,fatc:1,panelbox:1,farp:1},PMAP=[[/FAAP/,'panelbox','PANEL_BOX'],[/FARP/,'farp','FARP'],[/FATC/,'fatc','FATC'],[/DACT/,'dact','DACT'],[/FACP/,'facp','FACP']];
// VESDA / smoke-control / TVSS box tags (whole-word, and only when the box shows exactly one of them, e.g. "VPS" but not "VPS VLF")
const VMAP={VPS:['vpsu','VESDA_PSU'],VLF:['vlf','VESDA_LF'],VRE:['vrem','VESDA_REM'],VNI:['vnet','VESDA_NET'],FSCS:['scs','SCS'],SCS:['scs','SCS'],TVSS:['surge','SURGE']};
window.panelRead=s=>{const U=String(s).toUpperCase(),c=U.replace(/[^A-Z]/g,'');const m=PMAP.find(([r])=>r.test(c));if(m)return{g:m[1],det:m[2]};
 const v=[...new Set((U.match(/[A-Z]+/g)||[]).filter(w=>VMAP[w]).map(w=>VMAP[w][0]))];if(v.length!==1)return null;const e=Object.values(VMAP).find(x=>x[0]===v[0]);return{g:e[0],det:e[1]}};
window.panelPass=async(pages,groups,pl)=>{const G=panelPass.gen=(panelPass.gen||0)+1;let k=0;window.__panel=[];
 // bpm-v106: an unlabeled box classed as annunciator on a plan whose text never mentions an annunciator / system panel is a plain rectangle (site plans, tables) → drop the suggestion
 {let t='';for(let n=1;n<=pdf.numPages;n++){try{t+=' '+(await textOf(await pdf.getPage(n),n)).map(o=>o.s).join(' ')}catch{}}if(plan!==pl)return 0;
  if(!/ANNUNCIATOR|\bFAAP\b|\bANN\b|SYSTEM\s*\d*\s*PANEL|\bSYS\s?\d/i.test(t)){const before=ghosts.length;ghosts=ghosts.filter(g=>!(pages.includes(g.page)&&g.g==='panelbox'&&!g.lab&&!g.fromG&&g.fp!=='master'&&!(g.fp&&g.fp.s==='master')));window.__panelDrop=before-ghosts.length;if(window.__panelDrop){try{draw();renderGhostBar()}catch{}}}}for(const n of pages){if(plan!==pl||G!==panelPass.gen)return k;const cand=ghosts.filter(g=>g.page===n&&PNG_[g.g]&&!g.lab);if(!cand.length)continue;const pg=await pdf.getPage(n);
  for(const g of cand){const r=Math.max(g.bw||26,g.bh||13)/2+2;let ws=[];try{ws=await ocrWords(pg,g.x,g.y,r,0)}catch(e){console.warn('panel ocr',e);continue}g.lab=1;const m=panelRead(ws.map(w=>w.s).join(' '));window.__panel.push({page:n,g:g.g,read:ws.map(w=>w.s).join(' '),to:m&&m.g});
   if(m&&m.g!==g.g&&DG[m.g]&&(!groups||groups.includes(m.g)||DG[m.g].x||m.det==='SURGE'&&groups.includes('surge'))){if(plan!==pl)return k;g.fromG=g.g;g.shp=DG[g.g]?.t;g.g=m.g;g.det=m.det;g.low=g.low||'ocr-tag';k++}}}
 if(k&&plan===pl){try{draw();renderGhostBar()}catch{}toast(`Panel letters read: ${k} suggestion${k===1?'':'s'} re-typed (marked ? to check)`)}return k};
})();
