'use strict';
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const $=s=>document.querySelector(s);
const TYPES={smoke:{c:'#dc2626',l:'S',n:'Smoke'},heat:{c:'#ea580c',l:'H',n:'Heat'},pull:{c:'#be185d',l:'P',n:'Pull station'},horn:{c:'#7c3aed',l:'HS',n:'Horn/strobe'},panel:{c:'#0f766e',l:'FACP',n:'Panel',sq:1},module:{c:'#2563eb',l:'M',n:'Module',sq:1},other:{c:'#475569',l:'?',n:'Other'}};
const ST={passed:'#16a34a',failed:'#dc2626','not tested':'#ca8a04'};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
// ---------- IndexedDB ----------
let dbp;function db(){return dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('blueprint-markup',2);r.onupgradeneeded=e=>{const d=r.result,t=r.transaction;if(e.oldVersion<1){d.createObjectStore('plans',{keyPath:'id'});for(const s of['markups','pins','media']){const o=d.createObjectStore(s,{keyPath:'id'});o.createIndex(s==='media'?'pinId':'planId',s==='media'?'pinId':'planId')}d.createObjectStore('meta')}
 if(e.oldVersion<2){const pid='p'+uid();d.createObjectStore('projects',{keyPath:'id'}).put({id:pid,name:'My project',created:Date.now()});t.objectStore('meta').put(pid,'project');t.objectStore('plans').openCursor().onsuccess=ev=>{const c=ev.target.result;if(c){c.update({...c.value,projectId:pid});c.continue()}}}};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
async function tx(store,mode,fn){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(store,mode),s=t.objectStore(store);let out;const r=fn(s);if(r)r.onsuccess=()=>out=r.result;t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error)})}
const put=(s,v,k)=>tx(s,'readwrite',o=>o.put(v,k)),get=(s,k)=>tx(s,'readonly',o=>o.get(k)),del=(s,k)=>tx(s,'readwrite',o=>o.delete(k)),all=s=>tx(s,'readonly',o=>o.getAll()),byIdx=(s,i,v)=>tx(s,'readonly',o=>o.index(i).getAll(v));
// ---------- state ----------
const cv=$('#cv'),ctx=cv.getContext('2d'),stage=$('#stage');
let plan=null,pdf=null,page=1,pageW=0,pageH=0,bmp=null,bmpScale=0,renderTask=null,renderTimer=0,baseBm=null,tile=null,project=null;
const ov=$('#ov'),octx=ov.getContext('2d');
let markups=[],pins=[],view={s:1,x:0,y:0},tool='pan',sel=null,draft=null;
const dpr=()=>window.devicePixelRatio||1;
let lastW=0,lastH=0;function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(lastW&&pageW){const cx=(lastW/2-view.x)/view.s,cy=(lastH/2-view.y)/view.s;view.x=w/2-cx*view.s;view.y=h/2-cy*view.s}const wide=innerWidth>=800;if(wide!==resize.wide){resize.wide=wide;$('#panel').hidden=!wide;renderList()}lastW=w;lastH=h;cv.width=ov.width=w*dpr();cv.height=ov.height=h*dpr();draw();scheduleRender()}
new ResizeObserver(()=>resize()).observe(stage);
window.addEventListener('resize',resize);
const toW=(sx,sy)=>({x:(sx-view.x)/view.s,y:(sy-view.y)/view.s});
// ---------- plans ----------
async function refreshPlans(){const ps=(await all('plans')).filter(p=>p.projectId===project?.id).sort((a,b)=>b.added-a.added);$('#planSel').innerHTML=ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')||'<option>(no plans)</option>';if(plan)$('#planSel').value=plan.id}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;e.target.value='';hideErr();busy(1,'Saving');prog(null);let blob;
 // copy the bytes now: some Android file providers hand out File handles that can't be re-read later from IndexedDB
 try{blob=new Blob([await f.arrayBuffer()],{type:f.type||''})}catch(err){showErr(`Could not read "${f.name}": ${err.message}`);return}
 const p={id:uid(),name:f.name,kind:f.type==='application/pdf'||/\.pdf$/i.test(f.name)?'pdf':'image',blob,added:Date.now(),projectId:project.id};await put('plans',p);await openPlan(p.id)};
$('#planSel').onchange=e=>openPlan(e.target.value);
// Loading is guarded: every step has a timeout, errors are shown, the badge always clears, and Stop cancels.
let loadTask=null,opSeq=0;
const withTimeout=(p,ms,msg)=>new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error(msg)),ms);p.then(v=>{clearTimeout(t);res(v)},e=>{clearTimeout(t);rej(e)})});
function stopAll(){opSeq++;if(loadTask){try{loadTask.destroy()}catch{}loadTask=null}if(renderTask){try{renderTask.cancel()}catch{}renderTask=null}clearTimeout(renderTimer);busy(0)}
async function openPlan(id,pg=1){const p=await get('plans',id);if(!p)return;stopAll();const seq=opSeq;hideErr();plan=p;busy(1,'Loading');prog(0);
 try{if(pdf){pdf.destroy();pdf=null}pageW=0;draw();
  if(p.kind==='pdf'){if(!p.blob||!p.blob.size)throw new Error('the stored file is empty');
   const data=new Uint8Array(await withTimeout(p.blob.arrayBuffer(),30000,'reading the stored file timed out'));if(seq!==opSeq)return;prog(.1);
   const t=pdfjsLib.getDocument({data,disableFontFace:false});loadTask=t;t.onProgress=e=>{if(e.total)prog(.1+.2*Math.min(1,e.loaded/e.total))};
   const d=await withTimeout(t.promise,60000,'the PDF engine did not respond within 60 s');if(seq!==opSeq||loadTask!==t){d.destroy();return}loadTask=null;pdf=d;p.pages=d.numPages}else p.pages=1;
  prog(.3);markups=await byIdx('markups','planId',id);pins=await byIdx('pins','planId',id);
  await put('meta',id,'last:'+p.projectId);await refreshPlans();$('#empty').hidden=true;await gotoPage(Math.min(pg,p.pages)||1,seq)}
 catch(e){if(seq===opSeq){if(loadTask){try{loadTask.destroy()}catch{}loadTask=null}showErr(`Could not open "${p.name}": ${e&&e.message||e}`)}}
 finally{if(seq===opSeq)busy(0)}}
async function buildPageSel(){fillPageSel(null);let labels=null;try{labels=pdf&&await withTimeout(pdf.getPageLabels(),5000,'labels')}catch{}if(labels)fillPageSel(labels)}
function fillPageSel(labels){if(!plan)return;const sel=$('#pageSel');sel.innerHTML='';for(let i=1;i<=plan.pages;i++){const n=pins.filter(x=>x.page===i).length;sel.add(new Option(`${labels?.[i-1]||'Pg '+i} / ${plan.pages}${n?` (${n}📍)`:''}`,i))}sel.value=page}
$('#pageSel').onchange=e=>gotoPage(+e.target.value);$('#prev').onclick=()=>plan&&page>1&&gotoPage(page-1);$('#next').onclick=()=>plan&&page<plan.pages&&gotoPage(page+1);
async function gotoPage(n,seq){if(!plan)return;const own=seq===undefined;if(own){if(renderTask){try{renderTask.cancel()}catch{}renderTask=null}seq=++opSeq;hideErr()}
 page=n;sel=null;bmp=null;bmpScale=0;baseBm=tile=null;busy(1,'Rendering');prog(.3);
 try{if(pdf){const pg=await withTimeout(pdf.getPage(n),30000,'reading page '+n+' timed out');if(seq!==opSeq)return;const vp=pg.getViewport({scale:1});pageW=vp.width;pageH=vp.height}
  else{const im=await createImageBitmap(plan.blob);pageW=im.width;pageH=im.height;bmp=im;bmpScale=1}
  put('meta',{plan:plan.id,page:n},'lastPage');fit();prog(.35);await buildPageSel();if(seq!==opSeq)return;prog(.4);
  const ok=await renderPage(true);if(seq!==opSeq)return;if(ok===false)showErr('Could not render this page, even at low resolution. Try ⤢ or reopen the plan.');renderList()}
 catch(e){if(seq===opSeq)showErr('Could not show page '+n+': '+(e&&e.message||e))}
 finally{if(own&&seq===opSeq)busy(0)}}
function fit(){if(!pageW)return;const w=stage.clientWidth,h=stage.clientHeight,s=Math.min(w/pageW,h/pageH)*.95;view={s,x:(w-pageW*s)/2,y:(h-pageH*s)/2};draw()}
$('#fit').onclick=fit;
// crisp re-render: render the page at current zoom*dpr, capped by pixel budget
// Perf: a small full-page base bitmap is rendered once per page; zoomed-in views render only the visible
// region (plus margin) at screen resolution, capped by a pixel budget. Markups live on a separate overlay canvas.
const MAXPX=matchMedia('(pointer:coarse)').matches?16e6:24e6,BASEPX=4e6;
function wantScale(){return Math.min(view.s*dpr(),10)}
function visRect(){return{x:-view.x/view.s,y:-view.y/view.s,w:stage.clientWidth/view.s,h:stage.clientHeight/view.s}}
function covered(t){const v=visRect();return Math.max(0,v.x)>=t.x-1&&Math.max(0,v.y)>=t.y-1&&Math.min(pageW,v.x+v.w)<=t.x+t.w+1&&Math.min(pageH,v.y+v.h)<=t.y+t.h+1}
function baseOK(w){return baseBm&&baseBm.s>=w*.87}
function scheduleRender(){if(!pdf)return;clearTimeout(renderTimer);const w=wantScale();if(!baseBm){renderTimer=setTimeout(renderPage,0);return}
 if(baseOK(w)){if(tile){tile=null;requestDraw()}return}
 if(tile&&w<=tile.s*1.15&&w>=tile.s/2.5&&covered(tile))return;renderTimer=setTimeout(renderPage,180)}
function wantRect(s){const v=visRect();let m=.5,w,h;for(;;){w=v.w*(1+2*m);h=v.h*(1+2*m);if(w*h*s*s<=MAXPX||m<=0)break;m=Math.max(0,m-.1)}
 const x=Math.max(0,v.x-v.w*m),y=Math.max(0,v.y-v.h*m);return{x,y,w:Math.max(1,Math.min(pageW-x,w)),h:Math.max(1,Math.min(pageH-y,h))}}
// Mobile canvas limits: keep every canvas under ~16.7 MP and 8192 px per side; a null context falls back to a smaller size.
const SAFE_AREA=16e6,SAFE_SIDE=8192;
async function raster(pg,s,r,showProg){s=Math.max(s,.02);const k=Math.min(1,Math.sqrt(SAFE_AREA/(r.w*r.h*s*s)),SAFE_SIDE/(r.w*s),SAFE_SIDE/(r.h*s));s*=k;
 const vp=pg.getViewport({scale:s}),c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(r.w*s));c.height=Math.max(1,Math.ceil(r.h*s));
 const cx=c.getContext('2d',{alpha:false});if(!cx)return null;
 let t;try{t=pg.render({canvasContext:cx,viewport:vp,transform:[1,0,0,1,-r.x*s,-r.y*s],background:'#fff'})}catch(e){console.warn('render failed',e);return null}renderTask=t;
 // pdf.js has no render-progress API: phase % (40% = page ready) plus a live count of drawing operations received
 if(showProg)t.onContinue=cont=>{let n=0;try{for(const st of pg._intentStates?.values()||[])n=Math.max(n,st.operatorList?.fnArray?.length||0)}catch{}if(n)$('#busyPct').textContent=`40% · ${n>=1e4?Math.round(n/1e3)+'k':n} ops`;cont()};
 const to=setTimeout(()=>{if(renderTask===t){t.cancel();t.timedOut=1}},45000);
 try{await t.promise}catch(e){if(!/cancel/i.test(e?.name+e?.message))console.warn('render failed',e);return null}finally{clearTimeout(to)}if(renderTask!==t)return null;renderTask=null;if(showProg)prog(1);c._s=s;return c}
async function renderPage(first){if(!pdf){draw();return}const pn=page,seq=opSeq;if(renderTask){renderTask.cancel();renderTask=null}
 const pg=await pdf.getPage(pn);if(pn!==page||seq!==opSeq)return;
 if(!baseBm){let s=Math.min(wantScale(),Math.sqrt(BASEPX/(pageW*pageH))),c=null;for(let i=0;i<3&&!c;i++,s/=2){c=await raster(pg,s,{x:0,y:0,w:pageW,h:pageH},first);if(pn!==page||seq!==opSeq)return}if(!c)return false;baseBm={c,s:c._s};bmpScale=c._s;draw()}
 const want=wantScale();if(baseOK(want)){tile=null;draw();return}
 const r=wantRect(want),c=await raster(pg,want,r);if(!c||pn!==page)return;tile={c,s:c._s,...r};bmpScale=c._s;draw()}
function busy(b,txt){$('#busy').hidden=!b;if(b){$('#busyTxt').textContent=txt||'Working';prog(null)}}
function prog(f){const pc=f==null?null:Math.round(Math.max(0,Math.min(1,f))*100);$('#busyBar').style.width=(pc||0)+'%';$('#busyPct').textContent=pc==null?'…':pc+'%'}
function showErr(m){$('#errTxt').textContent=m;$('#err').hidden=false;busy(0);if(!plan||!pageW)$('#empty').hidden=false}
function hideErr(){$('#err').hidden=true}
$('#stop').onclick=()=>{const loading=!!loadTask||!pageW;stopAll();showErr(loading?'Stopped. Pick a plan above or open it again.':'Stopped rendering. Zoom or tap ⤢ to try again.')};$('#errX').onclick=hideErr;
// ---------- drawing ----------
function cloudPath(c,x1,y1,x2,y2,s){const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.abs(x2-x1),h=Math.abs(y2-y1);const r=Math.max(6/s,Math.min(w,h)/8,1);const pts=[];
 const seg=(ax,ay,bx,by)=>{const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.round(L/(2*r)));for(let i=0;i<n;i++)pts.push([ax+(bx-ax)*i/n,ay+(by-ay)*i/n])};
 seg(x,y,x+w,y);seg(x+w,y,x+w,y+h);seg(x+w,y+h,x,y+h);seg(x,y+h,x,y);c.beginPath();
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,rr=Math.hypot(b[0]-a[0],b[1]-a[1])/2,ang=Math.atan2(b[1]-a[1],b[0]-a[0]);c.moveTo(a[0],a[1]);c.arc(mx,my,rr,ang+Math.PI,ang,false)}c.stroke()}
function drawMarkup(c,m,s){c.save();c.strokeStyle=m.color;c.lineWidth=(m.w||3)/s;c.lineJoin=c.lineCap='round';const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);
 if(m.type==='rect')c.strokeRect(x,y,w,h);
 else if(m.type==='ellipse'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2||.1,h/2||.1,0,0,7);c.stroke()}
 else if(m.type==='check'){c.lineWidth=Math.max(c.lineWidth,Math.min(w,h)/8);c.beginPath();c.moveTo(x,y+h*.55);c.lineTo(x+w*.38,y+h);c.lineTo(x+w,y);c.stroke()}
 else if(m.type==='cloud')cloudPath(c,m.x1,m.y1,m.x2,m.y2,s);c.restore()}
function drawPin(c,p,s,hl){const T=TYPES[p.type]||TYPES.other,r=13/s;c.save();c.translate(p.x,p.y);
 c.fillStyle=T.c;c.strokeStyle=hl?'#facc15':'#fff';c.lineWidth=(hl?4:2)/s;c.beginPath();
 if(T.sq)c.rect(-r,-r,2*r,2*r);else if(p.type==='heat'){c.moveTo(0,-r*1.2);c.lineTo(r*1.1,r*.8);c.lineTo(-r*1.1,r*.8);c.closePath()}else if(p.type==='pull'){c.moveTo(0,-r*1.2);c.lineTo(r*1.2,0);c.lineTo(0,r*1.2);c.lineTo(-r*1.2,0);c.closePath()}else c.arc(0,0,r,0,7);
 c.fill();c.stroke();c.fillStyle='#fff';c.font=`bold ${(T.l.length>2?7:T.l.length>1?9:12)/s}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(T.l,0,p.type==='heat'?r*.15:0);
 c.fillStyle=ST[p.status]||ST['not tested'];c.beginPath();c.arc(r*.9,-r*.9,4.5/s,0,7);c.fill();c.stroke();
 if(p.address){c.font=`${11/s}px sans-serif`;c.textAlign='left';c.lineWidth=3/s;c.strokeStyle='#fff';c.strokeText(p.address,r*1.3,r*.3);c.fillStyle='#111';c.fillText(p.address,r*1.3,r*.3)}c.restore()}
function setT(c){const d=dpr();c.setTransform(view.s*d,0,0,view.s*d,view.x*d,view.y*d)}
function drawBase(){drawn={...view};cv.style.transform=ov.style.transform='';ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);if(!plan||!pageW)return;setT(ctx);
 ctx.fillStyle='#fff';ctx.fillRect(0,0,pageW,pageH);ctx.imageSmoothingQuality='high';if(bmp)ctx.drawImage(bmp,0,0,pageW,pageH);if(baseBm)ctx.drawImage(baseBm.c,0,0,pageW,pageH);if(tile)ctx.drawImage(tile.c,tile.x,tile.y,tile.c.width/tile.s,tile.c.height/tile.s)}
function drawOverlay(){const ctx=octx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ov.width,ov.height);if(!plan||!pageW)return;setT(ctx);
 for(const m of markups)if(m.page===page)drawMarkup(ctx,m,view.s);if(draft)drawMarkup(ctx,draft,view.s);
 if(sel&&sel.kind==='m'){const m=sel.o;ctx.save();ctx.setLineDash([6/view.s,4/view.s]);ctx.strokeStyle='#2563eb';ctx.lineWidth=1.5/view.s;const p=8/view.s;ctx.strokeRect(Math.min(m.x1,m.x2)-p,Math.min(m.y1,m.y2)-p,Math.abs(m.x2-m.x1)+2*p,Math.abs(m.y2-m.y1)+2*p);ctx.restore()}
 for(const p of pins)if(p.page===page)drawPin(ctx,p,view.s,sel&&sel.o===p)}
function draw(){drawBase();drawOverlay()}
// during pan/pinch/wheel move the already-drawn canvases with a cheap CSS transform; repaint once the gesture pauses (150ms) or on release
let drawn=null,gTimer=0;function fastView(){if(drawn){const k=view.s/drawn.s,t=`translate(${view.x-drawn.x*k}px,${view.y-drawn.y*k}px) scale(${k})`;cv.style.transform=ov.style.transform=t}clearTimeout(gTimer);gTimer=setTimeout(()=>{gTimer=0;requestDraw()},150);scheduleRender()}
let raf=0,rafB=0;function requestDraw(b=true){if(b)rafB=1;if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(rafB)drawBase();drawOverlay();rafB=0})}
// ---------- hit testing ----------
function hit(w){const tol=10/view.s;for(const p of[...pins].reverse())if(p.page===page&&Math.hypot(p.x-w.x,p.y-w.y)<18/view.s)return{kind:'p',o:p};
 for(const m of[...markups].reverse()){if(m.page!==page)continue;const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),X=Math.max(m.x1,m.x2),Y=Math.max(m.y1,m.y2);if(w.x>x-tol&&w.x<X+tol&&w.y>y-tol&&w.y<Y+tol)return{kind:'m',o:m}}return null}
// ---------- input ----------
const ptrs=new Map();let gesture=null;
stage.addEventListener('pointerdown',e=>{if(!plan||e.target!==cv)return;stage.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
 if(ptrs.size===2){draft=null;const[a,b]=[...ptrs.values()];gesture={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}};return}
 const w=toW(e.offsetX,e.offsetY);const start={sx:e.offsetX,sy:e.offsetY,moved:false};
 if(tool==='pan'||e.button===1){gesture={type:'pan',...start,v:{...view}};return}
 if(tool==='select'){sel=hit(w);if(sel)gesture={type:'move',...start,w,orig:JSON.parse(JSON.stringify(sel.o))};else gesture={type:'pan',...start,v:{...view}};draw();return}
 if(tool==='pin'){gesture={type:'pin',...start,w};return}
 draft={id:uid(),planId:plan.id,page,type:tool,x1:w.x,y1:w.y,x2:w.x,y2:w.y,color:$('#color').value,w:3};gesture={type:'draw',...start}});
stage.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(!gesture)return;
 if(gesture.type==='pinch'&&ptrs.size>=2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=gesture,s=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s,x:c.x-wx*s,y:c.y-wy*s};fastView();return}
 const dx=e.offsetX-gesture.sx,dy=e.offsetY-gesture.sy;if(Math.hypot(dx,dy)>4)gesture.moved=true;
 if(gesture.type==='pan'){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;fastView()}
 else if(gesture.type==='move'){const o=sel.o,g=gesture.orig,ddx=dx/view.s,ddy=dy/view.s;if(sel.kind==='p'){o.x=g.x+ddx;o.y=g.y+ddy}else{o.x1=g.x1+ddx;o.x2=g.x2+ddx;o.y1=g.y1+ddy;o.y2=g.y2+ddy}requestDraw(false)}
 else if(gesture.type==='draw'){const w=toW(e.offsetX,e.offsetY);draft.x2=w.x;draft.y2=w.y;requestDraw(false)}});
async function up(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);const g=gesture;if(g?.type==='pinch'){if(ptrs.size===0){gesture=null;requestDraw()}return}gesture=null;if(!g)return;if(g.type==='pan')requestDraw();
 const w=toW(e.offsetX,e.offsetY);
 if(!g.moved&&(g.type==='pan'||g.type==='move')){const h=hit(w);if(h&&h.kind==='p'){openPin(h.o);return}}
 if(g.type==='move'&&g.moved)await put(sel.kind==='p'?'pins':'markups',sel.o);
 if(g.type==='pin'){const p={id:uid(),planId:plan.id,page,x:g.w.x,y:g.w.y,type:$('#pinType').value,address:'',loop:'',status:'not tested',notes:'',created:Date.now()};pins.push(p);await put('pins',p);draw();renderList();buildPageSel();openPin(p)}
 if(g.type==='draw'){const d=draft;draft=null;if(d.type==='check'&&!g.moved){const s=24/view.s;d.x1=w.x-s*.4;d.y1=w.y-s*.6;d.x2=w.x+s*.6;d.y2=w.y+s*.4}
  if(Math.abs(d.x2-d.x1)+Math.abs(d.y2-d.y1)>3/view.s){markups.push(d);await put('markups',d)}drawOverlay()}}
stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
const clampS=s=>Math.max(.02,Math.min(s,40));
stage.addEventListener('wheel',e=>{if(!plan)return;e.preventDefault();const k=Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)),s=clampS(view.s*k),wx=(e.offsetX-view.x)/view.s,wy=(e.offsetY-view.y)/view.s;view={s,x:e.offsetX-wx*s,y:e.offsetY-wy*s};fastView()},{passive:false});
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tool=b.dataset.t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));if(tool!=='select'){sel=null;draw()}});
async function deleteSel(){if(!sel)return;if(sel.kind==='m'){markups=markups.filter(m=>m!==sel.o);await del('markups',sel.o.id)}else await deletePin(sel.o);sel=null;draw()}
$('#del').onclick=deleteSel;document.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))deleteSel()});
$('#color').oninput=async e=>{if(sel?.kind==='m'){sel.o.color=e.target.value;await put('markups',sel.o);draw()}};
// ---------- pin dialog ----------
const dlg=$('#pinDlg'),form=$('#pinForm');let cur=null,urls=[];
for(const[k,t]of Object.entries(TYPES)){$('#pinType').add(new Option(t.n,k));$('#dType').add(new Option(t.n,k));$('#fType').add(new Option(t.n,k))}
async function openPin(p){cur=p;for(const k of['type','address','loop','status','notes'])form.elements[k].value=p[k]||'';await showMedia();dlg.showModal()}
async function showMedia(){urls.forEach(URL.revokeObjectURL);urls=[];const ms=await byIdx('media','pinId',cur.id);$('#media').innerHTML='';
 for(const m of ms.sort((a,b)=>a.created-b.created)){const u=URL.createObjectURL(m.blob);urls.push(u);const d=document.createElement('div');d.className='m';
  d.innerHTML=m.kind==='photo'?`<img src="${u}">`:m.kind==='video'?`<video src="${u}" controls playsinline></video>`:`<audio src="${u}" controls></audio>`;
  const x=document.createElement('button');x.type='button';x.className='btn';x.textContent='✕';x.onclick=async()=>{await del('media',m.id);showMedia()};d.append(x);$('#media').append(d)}}
async function addMedia(kind,blob,name){await put('media',{id:uid(),pinId:cur.id,kind,blob,name,created:Date.now()});showMedia()}
$('#addPhoto').onchange=e=>{for(const f of e.target.files)addMedia('photo',f,f.name);e.target.value=''};
$('#addVideo').onchange=e=>{for(const f of e.target.files)addMedia('video',f,f.name);e.target.value=''};
let rec=null;$('#rec').onclick=async()=>{const b=$('#rec');if(rec){rec.stop();return}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true});const ch=[];rec=new MediaRecorder(st);rec.ondataavailable=e=>ch.push(e.data);
  rec.onstop=()=>{st.getTracks().forEach(t=>t.stop());addMedia('audio',new Blob(ch,{type:rec.mimeType||'audio/webm'}),'voice note');rec=null;b.textContent='🎙 Record'};rec.start();b.textContent='⏹ Stop'}catch(err){alert('Microphone unavailable: '+err.message)}};
form.addEventListener('submit',async e=>{if(e.submitter?.value!=='save')return;for(const k of['type','address','loop','status','notes'])cur[k]=form.elements[k].value;await put('pins',cur);draw();renderList()});
dlg.addEventListener('close',()=>{if(rec)rec.stop()});
$('#pinDel').onclick=async()=>{if(!confirm('Delete this pin and its media?'))return;await deletePin(cur);dlg.close()};
async function deletePin(p){pins=pins.filter(x=>x!==p);await del('pins',p.id);for(const m of await byIdx('media','pinId',p.id))await del('media',m.id);draw();renderList();buildPageSel()}
// ---------- list ----------
$('#listBtn').onclick=()=>{$('#panel').hidden=!$('#panel').hidden;renderList()};$('#closeList').onclick=()=>$('#panel').hidden=true;
['#q','#fType','#fStat','#allPages'].forEach(s=>$(s).oninput=renderList);
function renderList(){if($('#panel').hidden)return;const q=$('#q').value.toLowerCase(),ft=$('#fType').value,fs=$('#fStat').value,ap=$('#allPages').checked;
 const L=pins.filter(p=>(ap||p.page===page)&&(!ft||p.type===ft)&&(!fs||p.status===fs)&&(!q||[p.address,p.loop,p.notes,TYPES[p.type]?.n].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.page-b.page||String(a.address).localeCompare(b.address,undefined,{numeric:true}));
 $('#pinList').innerHTML=L.map(p=>`<li data-id="${p.id}"><span class="dot" style="background:${TYPES[p.type].c}"></span><div><b>${esc(TYPES[p.type].n)}</b> ${esc(p.address)}${p.loop?' · Loop '+esc(p.loop):''}<br><small class="st-${p.status.split(' ')[0]}">${p.status}</small> <small>pg ${p.page}</small></div></li>`).join('')||'<li>No pins</li>';
 $('#pinList').querySelectorAll('li[data-id]').forEach(li=>li.onclick=async()=>{const p=pins.find(x=>x.id===li.dataset.id);if(p.page!==page)await gotoPage(p.page);const s=Math.max(view.s,1.5/dpr()*2);view={s,x:stage.clientWidth/2-p.x*s,y:stage.clientHeight/2-p.y*s};sel={kind:'p',o:p};draw();scheduleRender();if(innerWidth<700)$('#panel').hidden=true})}
// ---------- export ----------
async function composite(){const sc=Math.min(3,Math.sqrt(30e6/(pageW*pageH)));const c=document.createElement('canvas');c.width=Math.round(pageW*sc);c.height=Math.round(pageH*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(pdf){const pg=await pdf.getPage(page);await pg.render({canvasContext:x,viewport:pg.getViewport({scale:sc})}).promise}else x.drawImage(bmp,0,0,c.width,c.height);
 x.setTransform(sc,0,0,sc,0,0);const ps=1/Math.max(1,Math.max(pageW,pageH)/1200);for(const m of markups)if(m.page===page)drawMarkup(x,m,1/1.5);for(const p of pins)if(p.page===page)drawPin(x,p,ps,false);return c}
const base=()=>`${plan.name.replace(/\.[^.]+$/,'')}-p${page}`;
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
$('#exPng').onclick=async()=>{if(!plan)return;busy(1,'Exporting');try{const c=await composite();await new Promise(r=>c.toBlob(b=>{dl(b,base()+'.png');r()},'image/png'))}catch(e){showErr('PNG export failed: '+e.message)}finally{busy(0)}};
$('#exPdf').onclick=async()=>{if(!plan)return;busy(1,'Exporting');try{const c=await composite();const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:pageW>pageH?'l':'p',unit:'pt',format:[pageW,pageH]});
 doc.addImage(c.toDataURL('image/jpeg',.9),'JPEG',0,0,pageW,pageH);
 const ps=pins.filter(p=>p.page===page);if(ps.length){doc.addPage([612,792],'p');doc.setFontSize(14);doc.text(`Device list - ${plan.name} page ${page}`,40,40);doc.setFontSize(10);let y=64;
  for(const p of ps){if(y>760){doc.addPage([612,792],'p');y=40}doc.text(`${TYPES[p.type].n} | Addr ${p.address||'-'} | Loop ${p.loop||'-'} | ${p.status}${p.notes?' | '+p.notes.slice(0,60):''}`,40,y);y+=16}}
 dl(doc.output('blob'),base()+'.pdf')}catch(e){showErr('PDF export failed: '+e.message)}finally{busy(0)}};
// ---------- projects ----------
async function refreshProjects(){const ps=(await all('projects')).sort((a,b)=>a.created-b.created);$('#projSel').innerHTML=ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');if(project)$('#projSel').value=project.id;return ps}
function closePlan(){stopAll();if(pdf){pdf.destroy();pdf=null}plan=null;markups=[];pins=[];pageW=pageH=0;bmp=baseBm=tile=null;bmpScale=0;sel=null;$('#pageSel').innerHTML='';$('#empty').hidden=false;draw();renderList()}
async function loadProject(id){let ps=await refreshProjects();project=ps.find(p=>p.id===id)||ps[0];
 if(!project){project={id:'p'+uid(),name:'My project',created:Date.now()};await put('projects',project);ps=await refreshProjects()}
 await put('meta',project.id,'project');$('#projSel').value=project.id;closePlan();await refreshPlans();
 const mine=(await all('plans')).filter(p=>p.projectId===project.id).sort((a,b)=>b.added-a.added);if(!mine.length)return;
 let last=await get('meta','last:'+project.id);if(!mine.some(p=>p.id===last))last=mine[0].id;const lp=await get('meta','lastPage');await openPlan(last,lp&&lp.plan===last?lp.page:1)}
$('#projSel').onchange=e=>loadProject(e.target.value);
$('#projNew').onclick=async()=>{const n=prompt('New project name:','Project '+(($('#projSel').options.length||0)+1));if(!n||!n.trim())return;const p={id:'p'+uid(),name:n.trim(),created:Date.now()};await put('projects',p);await loadProject(p.id)};
$('#projRen').onclick=async()=>{if(!project)return;const n=prompt('Rename project:',project.name);if(!n||!n.trim())return;project.name=n.trim();await put('projects',project);await refreshProjects()};
async function deletePlanData(id){for(const m of await byIdx('markups','planId',id))await del('markups',m.id);for(const p of await byIdx('pins','planId',id)){for(const m of await byIdx('media','pinId',p.id))await del('media',m.id);await del('pins',p.id)}await del('plans',id)}
$('#planDel').onclick=async()=>{if(!plan)return;const cur=plan,mine=(await all('plans')).filter(x=>x.projectId===cur.projectId),dups=mine.filter(x=>x.id!==cur.id&&x.name===cur.name&&x.blob?.size===cur.blob?.size);
 if(!confirm(`Delete plan "${cur.name}" and its markups, pins and media? This cannot be undone.`))return;let ids=[cur.id];
 if(dups.length&&confirm(`Also delete ${dups.length} duplicate upload(s) of this same file (same name and size), including any markups on them?`))ids=ids.concat(dups.map(x=>x.id));
 stopAll();hideErr();for(const id of ids)await deletePlanData(id);await loadProject(project.id)};
$('#projDel').onclick=async()=>{if(!project)return;const mine=(await all('plans')).filter(p=>p.projectId===project.id);
 if(!confirm(`Delete project "${project.name}" and its ${mine.length} plan(s), markups, pins and media? This cannot be undone.`))return;
 stopAll();for(const pl of mine)await deletePlanData(pl.id);
 await del('projects',project.id);await del('meta','last:'+project.id);project=null;await loadProject(null)};
// ---------- boot ----------
if('serviceWorker'in navigator&&location.protocol.startsWith('http')){const had=!!navigator.serviceWorker.controller;let done=0;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!done){done=1;location.reload()}});navigator.serviceWorker.register('sw.js')}
(async()=>{resize();await loadProject(await get('meta','project'))})();
