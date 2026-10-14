'use strict';
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const $=s=>document.querySelector(s);
const TYPES={smoke:{c:'#dc2626',l:'S',n:'Smoke'},heat:{c:'#ea580c',l:'H',n:'Heat'},pull:{c:'#be185d',l:'P',n:'Pull station'},horn:{c:'#7c3aed',l:'HS',n:'Horn/strobe'},panel:{c:'#0f766e',l:'FACP',n:'Panel',sq:1},module:{c:'#2563eb',l:'M',n:'Monitor/control module',sq:1},duct:{c:'#b45309',l:'D',n:'Duct detector'},flow:{c:'#0369a1',l:'WF',n:'Waterflow switch'},tamper:{c:'#4d7c0f',l:'TS',n:'Tamper switch'},spkstrobe:{c:'#9333ea',l:'SS',n:'Speaker/strobe'},strobe:{c:'#c026d3',l:'ST',n:'Strobe'},linearray:{c:'#4f46e5',l:'LA',n:'Line array speaker'},relay:{c:'#78350f',l:'R',n:'Relay',sq:1},doorholder:{c:'#db2777',l:'DH',n:'Door holder'},jbox:{c:'#64748b',l:'J',n:'Junction box',sq:1},other:{c:'#475569',l:'?',n:'Other'}};
const ST={passed:'#16a34a',failed:'#dc2626','in progress':'#f59e0b','not tested':'#94a3b8'},STATUSES=['passed','failed','in progress','not tested'];
// NFPA 72-style default inspection/test items per device type (snapshotted onto each pin when first answered)
const CHECKS={smoke:['Alarm received at panel','Correct address/label at panel','LED/base condition OK','Sensitivity within range','Clean/unobstructed'],
 heat:['Alarm received at panel','Correct address/label at panel','Physical condition OK'],
 pull:['Activates alarm','Correct address/label at panel','Resets properly','Accessible/unobstructed','Physical condition OK'],
 horn:['Audible','Visible/flash','Synchronized','Mounted/condition OK'],
 duct:['Alarm/supervisory received at panel','Correct address/label at panel','Airflow/sampling tube OK','Fan shutdown/relay operates','Physical condition OK'],
 module:['Signal received at panel','Correct address/label at panel','Controlled/monitored circuit operates','Wiring/supervision (trouble on open)','Physical condition OK'],
 flow:['Waterflow alarm received at panel','Correct address/label at panel','Retard/delay within limits','Physical condition OK'],
 tamper:['Supervisory received at panel','Correct address/label at panel','Restores on valve open','Physical condition OK'],
 panel:['Normal/AC power OK','Batteries tested/charged','No trouble/supervisory conditions','Communicator/monitoring signal received','Event log/time correct'],
 spkstrobe:['Audible/voice message intelligible','Strobe flashes','Synchronized with other strobes','Candela/tap setting matches plan','Mounted/condition OK'],
 strobe:['Strobe flashes','Synchronized with other strobes','Candela setting matches plan','Mounted/condition OK'],
 linearray:['Audible/voice message intelligible','Covers intended area','Mounted/aim OK','Physical condition OK'],
 relay:['Operates on alarm (controlled equipment responds)','Correct address/label at panel','Restores on reset','Wiring/supervision OK','Physical condition OK'],
 doorholder:['Releases door on alarm','Door closes and latches fully','Holds door open in normal condition','Physical condition OK'],
 jbox:['Cover in place and identified (red/FA)','Wiring secured, no damage','Accessible'],
 other:['Operates as intended','Correct address/label at panel','Physical condition OK']};
const checkItems=t=>(CHECKS[t]||CHECKS.other).map(t=>({t,v:''}));
function autoStatus(cs){const a=(cs||[]).filter(c=>c.v);if(!a.length)return'not tested';if(a.some(c=>c.v==='fail'))return'failed';return a.length===cs.length?'passed':'in progress'}
function reasonFor(item){return /alarm|activat|audible|signal|received|operat|visible|flash|flow/i.test(item)?'No alarm':/clean/i.test(item)?'Dirty/needs cleaning':/obstruct|accessib/i.test(item)?'Obstructed':/address|label/i.test(item)?'Wrong location':/condition|mount|led|base/i.test(item)?'Damaged':/trouble|supervis|wiring/i.test(item)?'Trouble':'Other'}
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
let markups=[],pins=[],view={s:1,x:0,y:0},tool='pan',sel=null,draft=null,ghosts=[],det=null,detW=null;
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
async function openPlan(id,pg=1){const p=await get('plans',id);if(!p)return;if(det)cancelDetect();stopAll();if(plan?.id!==id){ghosts=[];renderGhostBar()}const seq=opSeq;hideErr();plan=p;busy(1,'Loading');prog(0);
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
 page=n;sel=null;updUR();renderGhostBar();bmp=null;bmpScale=0;baseBm=tile=null;busy(1,'Rendering');prog(.3);
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
$('#stop').onclick=()=>{if(det){cancelDetect('Stopped detecting. Suggestions found so far are kept.');return}const loading=!!loadTask||!pageW;stopAll();showErr(loading?'Stopped. Pick a plan above or open it again.':'Stopped rendering. Zoom or tap ⤢ to try again.')};$('#errX').onclick=hideErr;
// ---------- drawing ----------
function cloudPath(c,x1,y1,x2,y2,s){const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.abs(x2-x1),h=Math.abs(y2-y1);const r=Math.max(6/s,Math.min(w,h)/8,1);const pts=[];
 const seg=(ax,ay,bx,by)=>{const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.round(L/(2*r)));for(let i=0;i<n;i++)pts.push([ax+(bx-ax)*i/n,ay+(by-ay)*i/n])};
 seg(x,y,x+w,y);seg(x+w,y,x+w,y+h);seg(x+w,y+h,x,y+h);seg(x,y+h,x,y);c.beginPath();
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,rr=Math.hypot(b[0]-a[0],b[1]-a[1])/2,ang=Math.atan2(b[1]-a[1],b[0]-a[0]);c.moveTo(a[0],a[1]);c.arc(mx,my,rr,ang+Math.PI,ang,false)}c.stroke()}
function drawMarkup(c,m,s){c.save();c.strokeStyle=m.color;c.lineWidth=(m.w||3)/s;c.lineJoin=c.lineCap='round';const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);
 if(m.type==='rect')c.strokeRect(x,y,w,h);
 else if(m.type==='ellipse'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2||.1,h/2||.1,0,0,7);c.stroke()}
 else if(m.type==='check'){c.lineWidth=Math.max(c.lineWidth,Math.min(w,h)/8);c.beginPath();c.moveTo(x,y+h*.55);c.lineTo(x+w*.38,y+h);c.lineTo(x+w,y);c.stroke()}
 else if(m.type==='cloud')cloudPath(c,m.x1,m.y1,m.x2,m.y2,s);
 else if(m.type==='arrow'||m.type==='line'){c.beginPath();c.moveTo(m.x1,m.y1);c.lineTo(m.x2,m.y2);c.stroke();if(m.type==='arrow'){const a=Math.atan2(m.y2-m.y1,m.x2-m.x1),L=Math.max(c.lineWidth*4,12/s);c.beginPath();c.moveTo(m.x2-L*Math.cos(a-.45),m.y2-L*Math.sin(a-.45));c.lineTo(m.x2,m.y2);c.lineTo(m.x2-L*Math.cos(a+.45),m.y2-L*Math.sin(a+.45));c.stroke()}}
 else if(m.type==='text'){c.font=`bold ${m.fs}px sans-serif`;c.textBaseline='top';c.textAlign='left';c.lineWidth=m.fs/5;c.strokeStyle='#fff';c.strokeText(m.text,m.x1,m.y1);c.fillStyle=m.color;c.fillText(m.text,m.x1,m.y1)}c.restore()}
const isLine=m=>m.type==='arrow'||m.type==='line';
function textBox(m){octx.save();octx.font=`bold ${m.fs}px sans-serif`;const w=octx.measureText(m.text).width;octx.restore();m.x2=m.x1+w;m.y2=m.y1+m.fs*1.15;return m}
function handles(m){if(isLine(m))return[[m.x1,m.y1],[m.x2,m.y2]];const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),X=Math.max(m.x1,m.x2),Y=Math.max(m.y1,m.y2);return[[x,y],[X,y],[X,Y],[x,Y]]}
function handleHit(m,sx,sy){const hs=handles(m);for(let i=hs.length-1;i>=0;i--)if(Math.hypot(hs[i][0]*view.s+view.x-sx,hs[i][1]*view.s+view.y-sy)<22)return i;return -1}
function resizeTo(m,o,h,w){if(isLine(m)){if(h===0){m.x1=w.x;m.y1=w.y}else{m.x2=w.x;m.y2=w.y}return}
 const x0=Math.min(o.x1,o.x2),y0=Math.min(o.y1,o.y2),X0=Math.max(o.x1,o.x2),Y0=Math.max(o.y1,o.y2),L=h===0||h===3,T=h===0||h===1;
 if(m.type==='text'){const nh=Math.max(6/view.s,T?Y0-w.y:w.y-y0);m.fs=o.fs*nh/((Y0-y0)||1);const tw=textBox({...m,x1:0,y1:0}).x2;Object.assign(m,{x1:L?X0-tw:x0,y1:T?Y0-m.fs*1.15:y0});textBox(m);return}
 let x=L?w.x:x0,X=L?X0:w.x,y=T?w.y:y0,Y=T?Y0:w.y;m.x1=Math.min(x,X);m.x2=Math.max(x,X);m.y1=Math.min(y,Y);m.y2=Math.max(y,Y)}
function drawPin(c,p,s,hl,bare){const T=TYPES[p.type]||TYPES.other,r=13/s;c.save();c.translate(p.x,p.y);
 const sc=ST[p.status]||ST['not tested'];if(hl&&!bare){c.beginPath();c.arc(0,0,r*1.75,0,7);c.fillStyle='rgba(56,189,248,.35)';c.fill()}
 c.fillStyle=T.c;c.strokeStyle=bare?'#fff':sc;c.lineWidth=(bare?2:4.5)/s;c.beginPath();
 if(T.sq)c.rect(-r,-r,2*r,2*r);else if(p.type==='heat'){c.moveTo(0,-r*1.2);c.lineTo(r*1.1,r*.8);c.lineTo(-r*1.1,r*.8);c.closePath()}else if(p.type==='pull'){c.moveTo(0,-r*1.2);c.lineTo(r*1.2,0);c.lineTo(0,r*1.2);c.lineTo(-r*1.2,0);c.closePath()}else c.arc(0,0,r,0,7);
 c.fill();c.stroke();c.fillStyle='#fff';c.font=`bold ${(T.l.length>2?7:T.l.length>1?9:12)/s}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(T.l,0,p.type==='heat'?r*.15:0);
 if(bare){c.restore();return}c.fillStyle=sc;c.strokeStyle='#fff';c.lineWidth=1.5/s;c.beginPath();c.arc(r*.95,-r*.95,5.5/s,0,7);c.fill();c.stroke();
 if(p.address){c.font=`${11/s}px sans-serif`;c.textAlign='left';c.lineWidth=3/s;c.lineJoin='round';c.strokeStyle='#fff';c.strokeText(p.address,r*1.3,r*.3);c.fillStyle='#111';c.fillText(p.address,r*1.3,r*.3)}c.restore()}
function setT(c){const d=dpr();c.setTransform(view.s*d,0,0,view.s*d,view.x*d,view.y*d)}
function drawBase(){drawn={...view};cv.style.transform=ov.style.transform='';ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);if(!plan||!pageW)return;setT(ctx);
 ctx.fillStyle='#fff';ctx.fillRect(0,0,pageW,pageH);ctx.imageSmoothingQuality='high';if(bmp)ctx.drawImage(bmp,0,0,pageW,pageH);if(baseBm)ctx.drawImage(baseBm.c,0,0,pageW,pageH);if(tile)ctx.drawImage(tile.c,tile.x,tile.y,tile.c.width/tile.s,tile.c.height/tile.s)}
function drawOverlay(){const ctx=octx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ov.width,ov.height);if(!plan||!pageW)return;setT(ctx);
 for(const m of markups)if(m.page===page)drawMarkup(ctx,m,view.s);if(draft)drawMarkup(ctx,draft,view.s);
 if(sel&&sel.kind==='m'){const m=sel.o;ctx.save();ctx.setLineDash([6/view.s,4/view.s]);ctx.strokeStyle='#2563eb';ctx.lineWidth=1.5/view.s;const p=8/view.s;if(!isLine(m))ctx.strokeRect(Math.min(m.x1,m.x2)-p,Math.min(m.y1,m.y2)-p,Math.abs(m.x2-m.x1)+2*p,Math.abs(m.y2-m.y1)+2*p);
  ctx.setLineDash([]);ctx.fillStyle='#fff';ctx.lineWidth=2.5/view.s;for(const[hx,hy]of handles(m)){ctx.beginPath();ctx.arc(hx,hy,9/view.s,0,7);ctx.fill();ctx.stroke()}ctx.restore()}
 for(const p of pins)if(p.page===page)drawPin(ctx,p,view.s,sel&&sel.o===p);drawGhosts(ctx)}
function draw(){drawBase();drawOverlay()}
// during pan/pinch/wheel move the already-drawn canvases with a cheap CSS transform; repaint once the gesture pauses (150ms) or on release
let drawn=null,gTimer=0;function fastView(){if(drawn){const k=view.s/drawn.s,t=`translate(${view.x-drawn.x*k}px,${view.y-drawn.y*k}px) scale(${k})`;cv.style.transform=ov.style.transform=t}clearTimeout(gTimer);gTimer=setTimeout(()=>{gTimer=0;requestDraw()},150);scheduleRender()}
let raf=0,rafB=0;function requestDraw(b=true){if(b)rafB=1;if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(rafB)drawBase();drawOverlay();rafB=0})}
// ---------- hit testing ----------
function hit(w){const tol=10/view.s;for(const p of[...pins].reverse())if(p.page===page&&Math.hypot(p.x-w.x,p.y-w.y)<18/view.s)return{kind:'p',o:p};
 for(const m of[...markups].reverse()){if(m.page!==page)continue;if(isLine(m)){const dx=m.x2-m.x1,dy=m.y2-m.y1,t=Math.max(0,Math.min(1,((w.x-m.x1)*dx+(w.y-m.y1)*dy)/((dx*dx+dy*dy)||1)));if(Math.hypot(m.x1+t*dx-w.x,m.y1+t*dy-w.y)<tol*1.4)return{kind:'m',o:m};continue}const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),X=Math.max(m.x1,m.x2),Y=Math.max(m.y1,m.y2);if(w.x>x-tol&&w.x<X+tol&&w.y>y-tol&&w.y<Y+tol)return{kind:'m',o:m}}return null}
// ---------- input ----------
const ptrs=new Map();let gesture=null;
stage.addEventListener('pointerdown',e=>{if(!plan||e.target!==cv)return;stage.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
 if(ptrs.size===2){draft=null;const[a,b]=[...ptrs.values()];gesture={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}};return}
 const w=toW(e.offsetX,e.offsetY);const start={sx:e.offsetX,sy:e.offsetY,moved:false};
 if(tool==='pan'||e.button===1){gesture={type:'pan',...start,v:{...view}};return}
 if(tool==='select'){if(sel?.kind==='m'){const hi=handleHit(sel.o,e.offsetX,e.offsetY);if(hi>=0){gesture={type:'resize',h:hi,...start,orig:structuredClone(sel.o)};return}}
  const prev=sel?.o;sel=hit(w);if(sel)gesture={type:'move',...start,w,orig:JSON.parse(JSON.stringify(sel.o)),wasSel:prev===sel.o};else gesture={type:'pan',...start,v:{...view}};requestDraw(false);return}
 if(tool==='pin'){gesture={type:'pin',...start,w};return}
 if(tool==='text'){gesture={type:'text',...start,w};return}
 draft={id:uid(),planId:plan.id,page,type:tool,x1:w.x,y1:w.y,x2:w.x,y2:w.y,color:$('#color').value,w:SZ[$('#size').value]||3};gesture={type:'draw',...start}});
stage.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(!gesture)return;
 if(gesture.type==='pinch'&&ptrs.size>=2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=gesture,s=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s,x:c.x-wx*s,y:c.y-wy*s};fastView();return}
 const dx=e.offsetX-gesture.sx,dy=e.offsetY-gesture.sy;if(Math.hypot(dx,dy)>4)gesture.moved=true;
 if(gesture.type==='pan'){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;fastView()}
 else if(gesture.type==='move'){const o=sel.o,g=gesture.orig,ddx=dx/view.s,ddy=dy/view.s;if(sel.kind==='p'){o.x=g.x+ddx;o.y=g.y+ddy}else{o.x1=g.x1+ddx;o.x2=g.x2+ddx;o.y1=g.y1+ddy;o.y2=g.y2+ddy}requestDraw(false)}
 else if(gesture.type==='resize'){resizeTo(sel.o,gesture.orig,gesture.h,toW(e.offsetX,e.offsetY));requestDraw(false)}
 else if(gesture.type==='draw'){const w=toW(e.offsetX,e.offsetY);draft.x2=w.x;draft.y2=w.y;requestDraw(false)}});
async function up(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);const g=gesture;if(g?.type==='pinch'){if(ptrs.size===0){gesture=null;requestDraw()}return}gesture=null;if(!g)return;if(g.type==='pan')requestDraw();
 const w=toW(e.offsetX,e.offsetY);
 if(!g.moved&&(g.type==='pan'||g.type==='move')){const gh=ghostHit(w);if(gh&&!(g.type==='move'&&g.wasSel)){sel=null;openGhost(gh);return}const h=hit(w);if(h&&h.kind==='p'){openPin(h.o);return}}
 if(!g.moved&&(g.type==='resize'||g.type==='move'&&g.wasSel)&&sel?.o.type==='text'){const t=prompt('Edit text:',sel.o.text);if(t!==null&&t.trim()&&t!==sel.o.text){const b=structuredClone(sel.o);await change('markups',b,textBox({...b,text:t.trim()}))}return}
 if((g.type==='move'||g.type==='resize')&&g.moved&&sel)await change(sel.kind==='p'?'pins':'markups',g.orig,sel.o);
 if(g.type==='text'&&!g.moved){const t=prompt('Text label:');if(t&&t.trim())await change('markups',null,textBox({id:uid(),planId:plan.id,page,type:'text',text:t.trim(),x1:g.w.x,y1:g.w.y,fs:(SZT[$('#size').value]||18)/view.s,color:$('#color').value,w:3}))}
 if(g.type==='pin'){const p={id:uid(),planId:plan.id,page,x:g.w.x,y:g.w.y,type:$('#pinType').value,address:'',loop:'',status:'not tested',notes:'',created:Date.now()};await change('pins',null,p);openPin(pins.find(x=>x.id===p.id))}
 if(g.type==='draw'){const d=draft;draft=null;if(d.type==='check'&&!g.moved){const s=24/view.s;d.x1=w.x-s*.4;d.y1=w.y-s*.6;d.x2=w.x+s*.6;d.y2=w.y+s*.4}
  if(Math.abs(d.x2-d.x1)+Math.abs(d.y2-d.y1)>3/view.s)await change('markups',null,d);else drawOverlay()}}
stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
const clampS=s=>Math.max(.02,Math.min(s,40));
stage.addEventListener('wheel',e=>{if(!plan)return;e.preventDefault();const k=Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)),s=clampS(view.s*k),wx=(e.offsetX-view.x)/view.s,wy=(e.offsetY-view.y)/view.s;view={s,x:e.offsetX-wx*s,y:e.offsetY-wy*s};fastView()},{passive:false});
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tool=b.dataset.t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));if(tool!=='select'){sel=null;draw()}});
async function deleteSel(){if(!sel)return;const o=sel.o,k=sel.kind;sel=null;if(o.planId!==plan?.id)return;if(k==='p')await deletePin(o);else await change('markups',o,null);draw()}
$('#del').onclick=deleteSel;document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||dlg.open)return;if(e.key==='Delete'||e.key==='Backspace')deleteSel();else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}});
$('#color').onchange=async e=>{if(sel?.kind==='m'&&sel.o.color!==e.target.value){const b=structuredClone(sel.o);await change('markups',b,{...b,color:e.target.value})}};
// size: S/M/L/XL -> stroke width (screen px) and text height (screen px at the zoom it was placed)
const SZ=[2,3,5,8],SZT=[12,18,28,40];
$('#size').onchange=async e=>{if(sel?.kind!=='m')return;const b=structuredClone(sel.o),i=+e.target.value;await change('markups',b,b.type==='text'?textBox({...b,fs:SZT[i]/view.s}):{...b,w:SZ[i]})};
// ---------- undo / redo (per plan, this session) ----------
const hist={};const H=()=>hist[plan.id]||(hist[plan.id]={u:[],r:[]});
async function applyState(store,id,o,media){const arr=store==='pins'?pins:markups,i=arr.findIndex(x=>x.id===id);
 if(o){o=structuredClone(o);if(i>=0)arr[i]=o;else arr.push(o);await put(store,o);if(media)for(const m of media)await put('media',m);if(sel?.o.id===id)sel.o=o;return o}
 if(i>=0)arr.splice(i,1);if(sel?.o.id===id)sel=null;await del(store,id);if(store==='pins')for(const m of await byIdx('media','pinId',id))await del('media',m.id)}
async function change(store,before,after,media){if(!plan)return;const id=(after||before).id;await applyState(store,id,after);const h=H();h.u.push({store,id,before:before&&structuredClone(before),after:after&&structuredClone(after),media});if(h.u.length>300)h.u.shift();h.r=[];afterChange()}
async function undo(){if(!plan)return;const h=H(),op=h.u.pop();if(!op)return;if(op.batch){for(const b of op.batch)await applyState(op.store,b.id,b.before);if(op.ghosts)ghosts.push(...structuredClone(op.ghosts))}else await applyState(op.store,op.id,op.before,op.media);h.r.push(op);afterChange()}
async function redo(){if(!plan)return;const h=H(),op=h.r.pop();if(!op)return;if(op.batch){for(const b of op.batch)await applyState(op.store,b.id,b.after);if(op.ghosts){const ids=new Set(op.ghosts.map(g=>g.id));ghosts=ghosts.filter(g=>!ids.has(g.id))}}else await applyState(op.store,op.id,op.after);h.u.push(op);afterChange()}
async function changeBatch(store,afters,gh){if(!plan||!afters.length)return;for(const a of afters)await applyState(store,a.id,a);const h=H();h.u.push({store,batch:afters.map(a=>({id:a.id,before:null,after:structuredClone(a)})),ghosts:gh&&structuredClone(gh)});if(h.u.length>300)h.u.shift();h.r=[];afterChange()}
function updUR(){const h=plan&&hist[plan.id];$('#undo').disabled=!h?.u.length;$('#redo').disabled=!h?.r.length}
function afterChange(){updUR();draw();renderList();renderGhostBar();if(plan)fillPageSel(null)}
$('#undo').onclick=undo;$('#redo').onclick=redo;
// ---------- pin dialog ----------
const dlg=$('#pinDlg'),form=$('#pinForm');let cur=null,urls=[];
for(const[k,t]of Object.entries(TYPES)){$('#pinType').add(new Option(t.n,k));$('#dType').add(new Option(t.n,k));$('#fType').add(new Option(t.n,k))}
const PK=['type','address','loop','status','notes','reason','reasonText','severity'];
let ckl=[];async function openPin(p){cur=p;for(const k of PK)form.elements[k].value=p[k]||(k==='severity'?'Non-critical':'');autoR=false;ckl=structuredClone(p.checks||checkItems(p.type));renderChecks();failUI();$('#testedInfo').textContent=testedTxt(p);await showMedia();dlg.showModal()}
const fmtT=t=>{const d=new Date(t),z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`};
const testedTxt=p=>p.testedAt?`${p.status} ${fmtT(p.testedAt)}${p.tester?' by '+p.tester:''}`:'';
let tester=null;async function getTester(force){if(tester===null)tester=(await get('meta','tester'))||'';if(!tester||force){const n=prompt('Tester name (asked once, saved on this device):',tester);if(n!==null&&n.trim()){tester=n.trim();await put('meta',tester,'tester')}}return tester}
async function showMedia(){urls.forEach(URL.revokeObjectURL);urls=[];const ms=await byIdx('media','pinId',cur.id);$('#media').innerHTML='';
 for(const m of ms.sort((a,b)=>a.created-b.created)){const u=URL.createObjectURL(m.blob);urls.push(u);const d=document.createElement('div');d.className='m';
  if(m.kind==='photo'){const show=m.annot&&!m.showOrig?m.annot:m.blob,uu=show===m.blob?u:URL.createObjectURL(show);if(uu!==u)urls.push(uu);d.innerHTML=`<img src="${uu}">`;
   const bar=document.createElement('div');bar.className='row mbar';const an=document.createElement('button');an.type='button';an.className='btn';an.textContent='✎ Annotate';an.onclick=()=>annotate(m);bar.append(an);
   if(m.annot){const tg=document.createElement('button');tg.type='button';tg.className='btn';tg.textContent=m.showOrig?'Show annotated':'Show original';tg.onclick=async()=>{m.showOrig=!m.showOrig;await put('media',m);showMedia()};bar.append(tg,Object.assign(document.createElement('small'),{textContent:m.showOrig?'original':'annotated'}))}
   d.append(bar)}else d.innerHTML=m.kind==='video'?`<video src="${u}" controls playsinline></video>`:`<audio src="${u}" controls></audio>`;
  const x=document.createElement('button');x.type='button';x.className='btn';x.textContent='✕';x.onclick=async()=>{await del('media',m.id);showMedia()};d.append(x);$('#media').append(d)}}
const photoBlob=m=>m.annot||m.blob;
async function addMedia(kind,blob,name){await put('media',{id:uid(),pinId:cur.id,kind,blob,name,created:Date.now()});showMedia()}
$('#addPhoto').onchange=e=>{for(const f of e.target.files)addMedia('photo',f,f.name);e.target.value=''};
$('#addVideo').onchange=e=>{for(const f of e.target.files)addMedia('video',f,f.name);e.target.value=''};
let rec=null;$('#rec').onclick=async()=>{const b=$('#rec');if(rec){rec.stop();return}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true});const ch=[];rec=new MediaRecorder(st);rec.ondataavailable=e=>ch.push(e.data);
  rec.onstop=()=>{st.getTracks().forEach(t=>t.stop());addMedia('audio',new Blob(ch,{type:rec.mimeType||'audio/webm'}),'voice note');rec=null;b.textContent='🎙 Record'};rec.start();b.textContent='⏹ Stop'}catch(err){alert('Microphone unavailable: '+err.message)}};
function failUI(){$('#failBox').hidden=form.elements.status.value!=='failed'}form.elements.status.addEventListener('change',failUI);
const CV={pass:'Pass',fail:'Fail',na:'N/A'};let autoR=false;form.elements.reason.addEventListener('change',()=>autoR=false);form.elements.reasonText.addEventListener('input',()=>autoR=false);
function renderChecks(){const n=ckl.filter(c=>c.v).length;$('#ckHead').textContent=`Checklist ${n}/${ckl.length}`;
 $('#checks').innerHTML=ckl.map((c,i)=>`<div class="ck ck-${c.v||'none'}"><span>${esc(c.t)}</span><span class="seg">${Object.entries(CV).map(([v,l])=>`<button type="button" data-i="${i}" data-v="${v}" class="${c.v===v?'on '+v:''}">${l}</button>`).join('')}</span></div>`).join('')}
function checksChanged(){const st=autoStatus(ckl);form.elements.status.value=st;
 if(st==='failed'&&(!form.elements.reason.value||autoR)){const f=ckl.filter(c=>c.v==='fail').map(c=>c.t);form.elements.reason.value=reasonFor(f[0]);if(!form.elements.reasonText.value||autoR)form.elements.reasonText.value='Failed: '+f.join('; ');autoR=true}
 failUI();renderChecks()}
$('#checks').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;const c=ckl[+b.dataset.i];c.v=c.v===b.dataset.v?'':b.dataset.v;checksChanged()});
$('#passAll').onclick=()=>{for(const c of ckl)if(!c.v)c.v='pass';checksChanged()};
form.elements.type.addEventListener('change',()=>{if(!ckl.some(c=>c.v)){ckl=checkItems(form.elements.type.value);renderChecks()}});
form.addEventListener('submit',async e=>{if(e.submitter?.value!=='save')return;
 if(form.elements.status.value==='failed'&&!form.elements.reason.value){e.preventDefault();alert('Pick a fail reason for this failed device.');form.elements.reason.focus();return}
 const b=structuredClone(cur),a={...b};for(const k of PK)a[k]=form.elements[k].value;if(ckl.some(c=>c.v)||b.checks)a.checks=structuredClone(ckl);if(a.status!=='failed'){a.reason='';a.reasonText='';a.severity=''}
 if(a.status!==b.status){a.testedAt=Date.now();a.tester=await getTester()}if(JSON.stringify(a)!==JSON.stringify(b))await change('pins',b,a);cur=pins.find(x=>x.id===a.id)});
dlg.addEventListener('close',()=>{if(rec)rec.stop()});
$('#pinDel').onclick=async()=>{if(!confirm('Delete this pin and its media?'))return;await deletePin(cur);dlg.close()};
async function deletePin(p){await change('pins',p,null,await byIdx('media','pinId',p.id))}
// ---------- list ----------
$('#listBtn').onclick=()=>{$('#panel').hidden=!$('#panel').hidden;renderList()};$('#closeList').onclick=()=>$('#panel').hidden=true;
['#q','#fType','#fStat','#fLoop','#allPages'].forEach(s=>$(s).oninput=renderList);
function renderList(){if($('#panel').hidden)return;const q=$('#q').value.toLowerCase(),ft=$('#fType').value,fs=$('#fStat').value,fl=$('#fLoop').value,ap=$('#allPages').checked;
 const loops=[...new Set(pins.map(p=>p.loop||''))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));$('#fLoop').innerHTML='<option value="">All loops</option>'+loops.map(l=>`<option value="${esc(l||'\u2205')}">${l?'Loop '+esc(l):'No loop'}</option>`).join('');$('#fLoop').value=loops.includes(fl==='\u2205'?'':fl)?fl:'';
 renderSummary();renderCounts();if($('#panel').classList.contains('defmode'))renderDefs();
 const L=pins.filter(p=>(ap||p.page===page)&&(!ft||p.type===ft)&&(!fs||p.status===fs)&&(!fl||(p.loop||'\u2205')===fl)&&(!q||[p.address,p.loop,p.notes,TYPES[p.type]?.n].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.page-b.page||String(a.address).localeCompare(b.address,undefined,{numeric:true}));
 $('#pinList').innerHTML=L.map(p=>`<li data-id="${p.id}"><span class="dot" style="background:${TYPES[p.type].c}"></span><div><b>${esc(TYPES[p.type].n)}</b> ${esc(p.address)}${p.loop?' · Loop '+esc(p.loop):''}<br><small class="st-${p.status.split(' ')[0]}">${p.status}</small> <small>pg ${p.page}${p.testedAt?' · '+esc(fmtT(p.testedAt))+(p.tester?' · '+esc(p.tester):''):''}</small></div></li>`).join('')||'<li>No pins</li>';
 $('#pinList').querySelectorAll('li[data-id]').forEach(li=>li.onclick=()=>jumpTo(plan.id,li.dataset.id))}
async function jumpTo(planId,pinId){if(plan?.id!==planId){const p0=await get('pins',pinId);await openPlan(planId,p0?.page||1)}const p=pins.find(x=>x.id===pinId);if(!p)return;if(p.page!==page)await gotoPage(p.page);
 const s=Math.max(view.s,1.5/dpr()*2);view={s,x:stage.clientWidth/2-p.x*s,y:stage.clientHeight/2-p.y*s};sel={kind:'p',o:p};draw();scheduleRender();if(innerWidth<700)$('#panel').hidden=true}
// ---------- project-wide data: deficiencies + device counts ----------
async function projData(){const pls=(await all('plans')).filter(p=>p.projectId===project?.id).sort((a,b)=>a.added-b.added),out=[];for(const pl of pls)out.push({pl,pins:pl.id===plan?.id?pins.slice():await byIdx('pins','planId',pl.id)});return out}
const plName=pl=>pl.name.replace(/\.[^.]+$/,'');
async function firstPhoto(pinId){const ms=(await byIdx('media','pinId',pinId)).filter(m=>m.kind==='photo').sort((a,b)=>a.created-b.created);return ms[0]?photoBlob(ms[0]):null}
let defUrls=[];
async function renderDefs(){const D=await projData(),items=[];for(const{pl,pins:ps}of D)for(const p of ps)if(p.status==='failed')items.push({pl,p});
 items.sort((a,b)=>(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1)||a.pl.added-b.pl.added||String(a.p.address).localeCompare(b.p.address,undefined,{numeric:true}));
 defUrls.forEach(URL.revokeObjectURL);defUrls=[];const html=[];
 for(const{pl,p}of items){const ph=await firstPhoto(p.id);let img='';if(ph){const u=URL.createObjectURL(ph);defUrls.push(u);img=`<img class="thumb" src="${u}">`}
  html.push(`<li data-pl="${pl.id}" data-id="${p.id}">${img||'<span class="thumb"></span>'}<div><b class="${p.severity==='Critical'?'st-failed':''}">${esc(p.severity||'—')}</b> · ${esc(TYPES[p.type]?.n||p.type)} ${esc(p.address)}${p.loop?' · Loop '+esc(p.loop):''}<br>${esc(p.reason||'no reason')}${p.reasonText?': '+esc(p.reasonText):''}${p.notes?'<br><small>'+esc(p.notes)+'</small>':''}<br><small>${esc(plName(pl))} pg ${p.page}${p.testedAt?' · '+esc(fmtT(p.testedAt)):''}${p.tester?' · '+esc(p.tester):''}</small></div></li>`)}
 $('#defList').innerHTML=html.join('')||'<li>No deficiencies (no failed devices) in this project</li>';$('#defCount').textContent=items.length;
 $('#defList').querySelectorAll('li[data-id]').forEach(li=>li.onclick=()=>jumpTo(li.dataset.pl,li.dataset.id));return items}
function setMode(def){$('#panel').classList.toggle('defmode',def);$('#modePins').classList.toggle('on',!def);$('#modeDefs').classList.toggle('on',def);if(def)renderDefs();else renderList()}
$('#modePins').onclick=()=>setMode(false);$('#modeDefs').onclick=()=>setMode(true);
function csvDl(rows,name){const cell=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};dl(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv'}),project.name.replace(/[\\/:*?"<>|]/g,'_')+name)}
$('#defCsv').onclick=async()=>{const items=await renderDefs();csvDl([['plan','page','type','address','loop','severity','reason','reason detail','notes','tested','tester']].concat(items.map(({pl,p})=>[pl.name,p.page,TYPES[p.type]?.n||p.type,p.address,p.loop,p.severity,p.reason,p.reasonText,p.notes,p.testedAt?fmtT(p.testedAt):'',p.tester||''])),'-deficiencies.csv')};
function blobJpeg(b,max=900){return new Promise((res,rej)=>{const u=URL.createObjectURL(b),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);res({d:c.toDataURL('image/jpeg',.85),w:c.width,h:c.height})};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('bad image'))};im.src=u})}
$('#defPdf').onclick=async()=>{busy(1,'Exporting');try{const items=await renderDefs();const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});doc.setFontSize(16);doc.text(`Deficiencies - ${project.name}`,40,44);doc.setFontSize(10);
 doc.text(`${items.length} failed device(s) · ${items.filter(i=>i.p.severity==='Critical').length} critical · generated ${fmtT(Date.now())}`,40,62);let y=84;
 for(const{pl,p}of items){const ph=await firstPhoto(p.id);let im=null;if(ph)try{im=await blobJpeg(ph)}catch{}const ih=im?Math.min(200,im.h*(220/im.w)):0,need=Math.max(ih,70)+18;if(y+need>760){doc.addPage();y=44}
  doc.setFontSize(12);doc.setTextColor(p.severity==='Critical'?185:0,0,0);doc.text(`${p.severity||'-'}: ${TYPES[p.type]?.n||p.type} ${p.address||''}${p.loop?' (Loop '+p.loop+')':''}`,40,y+12);doc.setTextColor(0,0,0);doc.setFontSize(10);
  const lines=doc.splitTextToSize([`Reason: ${p.reason||'-'}${p.reasonText?' - '+p.reasonText:''}`,`Plan: ${pl.name}, page ${p.page}`,`Tested: ${p.testedAt?fmtT(p.testedAt):'-'}${p.tester?' by '+p.tester:''}`,p.notes?`Notes: ${p.notes}`:''].filter(Boolean).join('\n'),im?280:530);doc.text(lines,40,y+28);
  if(im)doc.addImage(im.d,'JPEG',330,y,220,ih);y+=need;doc.setDrawColor(200);doc.line(40,y-6,572,y-6)}
 dl(doc.output('blob'),project.name.replace(/[\\/:*?"<>|]/g,'_')+'-deficiencies.pdf')}catch(e){showErr('Deficiency PDF failed: '+e.message)}finally{busy(0)}};
function countRows(D){const T=Object.keys(TYPES),blk=ps=>T.map(t=>{const a=ps.filter(p=>p.type===t),te=a.filter(p=>p.status==='passed'||p.status==='failed').length,ip=a.filter(p=>p.status==='in progress').length;return{t,n:a.length,te,ip,un:a.length-te-ip}}).filter(r=>r.n);
 return{plans:D.map(({pl,pins:ps})=>({pl,rows:blk(ps)})),total:blk(D.flatMap(d=>d.pins))}}
async function renderCounts(){const PD=await projData();$('#defCount').textContent=PD.flatMap(d=>d.pins).filter(p=>p.status==='failed').length||'';const C=countRows(PD),open=$('#counts').open;const tr=(r)=>`<tr><td>${esc(TYPES[r.t].n)}</td><td>${r.n}</td><td class="st-passed">${r.te}</td><td class="st-in">${r.ip}</td><td class="st-not">${r.un}</td></tr>`,sum=rs=>rs.reduce((a,r)=>[a[0]+r.n,a[1]+r.te,a[2]+r.ip,a[3]+r.un],[0,0,0,0]);
 const t=sum(C.total);$('#counts').innerHTML=`<summary><b>Device counts</b> · project ${t[0]} (${t[1]} tested, ${t[2]} in progress, ${t[3]} untested)</summary><table><tr><th></th><th>#</th><th>tested</th><th>in prog.</th><th>untested</th></tr>${C.plans.filter(b=>b.rows.length).map(b=>`<tr><th colspan="5">${esc(plName(b.pl))}</th></tr>${b.rows.map(tr).join('')}`).join('')}<tr><th colspan="5">Project total</th></tr>${C.total.map(tr).join('')}<tr><td><b>All devices</b></td>${t.map(v=>`<td><b>${v}</b></td>`).join('')}</tr></table>`;$('#counts').open=open;return C}
$('#countCsv').onclick=async()=>{const C=await renderCounts(),rows=[['plan','type','total','tested','in progress','untested']];for(const b of C.plans)for(const r of b.rows)rows.push([b.pl.name,TYPES[r.t].n,r.n,r.te,r.ip,r.un]);for(const r of C.total)rows.push(['PROJECT TOTAL',TYPES[r.t].n,r.n,r.te,r.ip,r.un]);csvDl(rows,'-device-counts.csv')};
const cntSt=a=>{const c={passed:0,failed:0,ip:0,nt:0};for(const p of a)p.status==='passed'?c.passed++:p.status==='failed'?c.failed++:p.status==='in progress'?c.ip++:c.nt++;c.t=a.length;c.pct=c.t?Math.round((c.passed+c.failed)*100/c.t):0;return c};
function renderSummary(){const cnt=a=>{const c={passed:0,failed:0,ip:0,nt:0};for(const p of a)p.status==='passed'?c.passed++:p.status==='failed'?c.failed++:p.status==='in progress'?c.ip++:c.nt++;c.t=a.length;c.pct=c.t?Math.round((c.passed+c.failed)*100/c.t):0;return c};
 const row=(l,a)=>{const c=cnt(a);return `<tr><td>${esc(l)}</td><td>${c.t}</td><td class="st-passed">${c.passed}</td><td class="st-failed">${c.failed}</td><td class="st-in">${c.ip}</td><td class="st-not">${c.nt}</td><td><b>${c.pct}%</b></td></tr>`};
 const grp=(key,lab)=>{const m=new Map();for(const p of pins){const k=key(p);if(!m.has(k))m.set(k,[]);m.get(k).push(p)}return[...m].sort((a,b)=>String(a[0]).localeCompare(b[0],undefined,{numeric:true})).map(([k,a])=>row(lab(k),a)).join('')};
 const o=cnt(pins),open=$('#sum').open;
 $('#sum').innerHTML=`<summary><b>${o.pct}% tested</b> · <span class="st-passed">${o.passed} passed</span> · <span class="st-failed">${o.failed} failed</span> · <span class="st-in">${o.ip} in progress</span> · <span class="st-not">${o.nt} not tested</span> of ${o.t}</summary>${o.t?`<table><tr><th></th><th>#</th><th>✔</th><th>✖</th><th>◐</th><th>–</th><th>done</th></tr>${row('All pages',pins)}<tr><th colspan="7">By loop</th></tr>${grp(p=>p.loop||'',k=>k?'Loop '+k:'No loop')}<tr><th colspan="7">By type</th></tr>${grp(p=>p.type,k=>TYPES[k]?.n||k)}</table>`:''}`;$('#sum').open=open}
$('#testerBtn').onclick=()=>getTester(true);
$('#csvBtn').onclick=async()=>{if(!project)return;const rows=[['plan','page','type','address','loop','status','tested','tester','notes']];
 for(const pl of(await all('plans')).filter(p=>p.projectId===project.id).sort((a,b)=>a.added-b.added))for(const p of(await byIdx('pins','planId',pl.id)).sort((a,b)=>a.page-b.page||String(a.address).localeCompare(b.address,undefined,{numeric:true})))
  rows.push([pl.name,p.page,TYPES[p.type]?.n||p.type,p.address,p.loop,p.status,p.testedAt?fmtT(p.testedAt):'',p.tester||'',p.notes]);
 const cell=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
 dl(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv'}),project.name.replace(/[\\/:*?"<>|]/g,'_')+'-devices.csv')};
// ---------- export ----------
function drawLegend(x,ps){const pp=pins.filter(p=>p.page===page);if(!pp.length)return;const types=[...new Set(pp.map(p=>p.type))],sts=STATUSES.filter(s=>pp.some(p=>(p.status||'not tested')===s));
 const u=1/ps,row=26*u,pad=10*u,rows=1+types.length+sts.length,w=190*u,h=pad*2+rows*row,X=12*u,Y=pageH-h-12*u;
 x.save();x.fillStyle='rgba(255,255,255,.93)';x.strokeStyle='#334155';x.lineWidth=1.5*u;x.fillRect(X,Y,w,h);x.strokeRect(X,Y,w,h);x.fillStyle='#111';x.font=`bold ${13*u}px sans-serif`;x.textBaseline='middle';x.textAlign='left';x.fillText('Legend',X+pad,Y+pad+row/2);
 let y=Y+pad+row*1.5;for(const t of types){drawPin(x,{type:t,x:X+pad+14*u,y},ps,false,true);x.fillStyle='#111';x.font=`${12*u}px sans-serif`;x.textAlign='left';x.textBaseline='middle';x.fillText(TYPES[t]?.n||t,X+pad+34*u,y);y+=row}
 for(const s of sts){x.fillStyle=ST[s];x.strokeStyle='#fff';x.lineWidth=2*u;x.beginPath();x.arc(X+pad+14*u,y,6*u,0,7);x.fill();x.stroke();x.fillStyle='#111';x.font=`${12*u}px sans-serif`;x.textAlign='left';x.fillText('Status: '+s,X+pad+34*u,y);y+=row}x.restore()}
async function composite(){const sc=Math.min(3,Math.sqrt(30e6/(pageW*pageH)));const c=document.createElement('canvas');c.width=Math.round(pageW*sc);c.height=Math.round(pageH*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(pdf){const pg=await pdf.getPage(page);await pg.render({canvasContext:x,viewport:pg.getViewport({scale:sc})}).promise}else x.drawImage(bmp,0,0,c.width,c.height);
 x.setTransform(sc,0,0,sc,0,0);const ps=1/Math.max(1,Math.max(pageW,pageH)/1200);for(const m of markups)if(m.page===page)drawMarkup(x,m,1/1.5);for(const p of pins)if(p.page===page)drawPin(x,p,ps,false);drawLegend(x,ps);return c}
const base=()=>`${plan.name.replace(/\.[^.]+$/,'')}-p${page}`;
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
$('#exPng').onclick=async()=>{if(!plan)return;busy(1,'Exporting');try{const c=await composite();await new Promise(r=>c.toBlob(b=>{dl(b,base()+'.png');r()},'image/png'))}catch(e){showErr('PNG export failed: '+e.message)}finally{busy(0)}};
$('#exPdf').onclick=async()=>{if(!plan)return;busy(1,'Exporting');try{const c=await composite();const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:pageW>pageH?'l':'p',unit:'pt',format:[pageW,pageH]});
 doc.addImage(c.toDataURL('image/jpeg',.9),'JPEG',0,0,pageW,pageH);
 const ps=pins.filter(p=>p.page===page);if(ps.length){doc.addPage([612,792],'p');doc.setFontSize(14);doc.text(`Device list - ${plan.name} page ${page}`,40,40);doc.setFontSize(10);let y=64;
  for(const p of ps){if(y>760){doc.addPage([612,792],'p');y=40}doc.text(`${TYPES[p.type].n} | Addr ${p.address||'-'} | Loop ${p.loop||'-'} | ${p.status}${p.testedAt?' '+fmtT(p.testedAt):''}${p.tester?' by '+p.tester:''}${p.notes?' | '+p.notes.slice(0,50):''}`.slice(0,120),40,y);y+=16}}
 const C=countRows(await projData());if(C.total.length){doc.addPage([612,792],'p');doc.setFontSize(14);doc.text(`Device counts - ${project.name}`,40,40);pdfCounts(doc,C,64)}
 dl(doc.output('blob'),base()+'.pdf')}catch(e){showErr('PDF export failed: '+e.message)}finally{busy(0)}};
// ---------- projects ----------
async function refreshProjects(){const ps=(await all('projects')).sort((a,b)=>a.created-b.created);$('#projSel').innerHTML=ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');if(project)$('#projSel').value=project.id;return ps}
function closePlan(){if(det)cancelDetect();ghosts=[];renderGhostBar();stopAll();if(pdf){pdf.destroy();pdf=null}plan=null;markups=[];pins=[];updUR();pageW=pageH=0;bmp=baseBm=tile=null;bmpScale=0;sel=null;$('#pageSel').innerHTML='';$('#empty').hidden=false;draw();renderList()}
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

// ---------- photo annotation (original kept; annotated copy saved on the media record) ----------
const ann={m:null,img:null,shapes:[],tool:'arrow',drag:null};const acv=$('#annCv'),actx=acv.getContext('2d');
async function annotate(m){ann.m=m;ann.shapes=structuredClone(m.annShapes||[]);const u=URL.createObjectURL(m.blob),im=new Image();await new Promise((r,j)=>{im.onload=r;im.onerror=()=>j(new Error('Could not open photo'));im.src=u});URL.revokeObjectURL(u);
 const k=Math.min(1,2400/Math.max(im.width,im.height));acv.width=Math.round(im.width*k);acv.height=Math.round(im.height*k);ann.img=im;annDraw();$('#annDlg').showModal();fitAnn()}
function fitAnn(){if(!$('#annDlg').open)return;const W=$('#annWrap').clientWidth,H=$('#annWrap').clientHeight,k=Math.min(W/acv.width,H/acv.height);acv.style.width=Math.floor(acv.width*k)+'px';acv.style.height=Math.floor(acv.height*k)+'px'}addEventListener('resize',fitAnn);
function annLW(){return Math.max(3,Math.round(Math.max(acv.width,acv.height)/120))}
function annShape(c,s){c.save();c.strokeStyle=c.fillStyle=s.c;c.lineWidth=s.lw;c.lineCap=c.lineJoin='round';const x=Math.min(s.x1,s.x2),y=Math.min(s.y1,s.y2),w=Math.abs(s.x2-s.x1),h=Math.abs(s.y2-s.y1);
 if(s.t==='box')c.strokeRect(x,y,w,h);else if(s.t==='circle'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2||1,h/2||1,0,0,7);c.stroke()}
 else if(s.t==='arrow'){c.beginPath();c.moveTo(s.x1,s.y1);c.lineTo(s.x2,s.y2);c.stroke();const a=Math.atan2(s.y2-s.y1,s.x2-s.x1),L=s.lw*5;c.beginPath();c.moveTo(s.x2-L*Math.cos(a-.45),s.y2-L*Math.sin(a-.45));c.lineTo(s.x2,s.y2);c.lineTo(s.x2-L*Math.cos(a+.45),s.y2-L*Math.sin(a+.45));c.stroke()}
 else if(s.t==='pen'){c.beginPath();s.pts.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke()}
 else if(s.t==='text'){c.font=`bold ${s.lw*5}px sans-serif`;c.textBaseline='top';c.lineWidth=s.lw*1.5;c.strokeStyle='#fff';c.strokeText(s.text,s.x1,s.y1);c.fillText(s.text,s.x1,s.y1)}c.restore()}
function annDraw(){actx.drawImage(ann.img,0,0,acv.width,acv.height);for(const s of ann.shapes)annShape(actx,s);if(ann.drag)annShape(actx,ann.drag);$('#annUndo').disabled=!ann.shapes.length}
const annPt=e=>{const r=acv.getBoundingClientRect();return[(e.clientX-r.left)*acv.width/r.width,(e.clientY-r.top)*acv.height/r.height]};
acv.addEventListener('pointerdown',e=>{acv.setPointerCapture(e.pointerId);const[x,y]=annPt(e),c=$('#annColor').value,lw=annLW();
 if(ann.tool==='text'){const t=prompt('Text:');if(t&&t.trim()){ann.shapes.push({t:'text',text:t.trim(),x1:x,y1:y,x2:x,y2:y,c,lw});annDraw()}return}
 ann.drag={t:ann.tool,x1:x,y1:y,x2:x,y2:y,c,lw,pts:[[x,y]]}});
acv.addEventListener('pointermove',e=>{if(!ann.drag)return;const[x,y]=annPt(e);ann.drag.x2=x;ann.drag.y2=y;if(ann.drag.t==='pen')ann.drag.pts.push([x,y]);annDraw()});
const annUp=()=>{const d=ann.drag;ann.drag=null;if(d&&(d.t==='pen'?d.pts.length>1:Math.hypot(d.x2-d.x1,d.y2-d.y1)>4)){if(d.t!=='pen')delete d.pts;ann.shapes.push(d)}annDraw()};acv.addEventListener('pointerup',annUp);acv.addEventListener('pointercancel',annUp);
document.querySelectorAll('[data-at]').forEach(b=>b.onclick=()=>{ann.tool=b.dataset.at;document.querySelectorAll('[data-at]').forEach(x=>x.classList.toggle('on',x===b))});
$('#annUndo').onclick=()=>{ann.shapes.pop();annDraw()};$('#annCancel').onclick=()=>$('#annDlg').close();
$('#annSave').onclick=async()=>{const m=ann.m;if(ann.shapes.length){annDraw();m.annot=await new Promise(r=>acv.toBlob(r,'image/jpeg',.9));m.annShapes=structuredClone(ann.shapes)}else{delete m.annot;delete m.annShapes}m.showOrig=false;await put('media',m);$('#annDlg').close();showMedia();if($('#panel').classList.contains('defmode'))renderDefs()};

// ---------- inspection report + checklist CSV ----------
function pdfCounts(doc,C,y){doc.setFontSize(10);const row=(a,b,c,d,e,bold)=>{if(y>760){doc.addPage([612,792],'p');y=40}doc.setFont(undefined,bold?'bold':'normal');doc.text(String(a),40,y);[b,c,d,e].forEach((v,i)=>doc.text(String(v),300+i*70,y));y+=14};
 row('Type','Total','Tested','In progress','Untested',1);for(const b of C.plans.filter(b=>b.rows.length)){y+=4;row(b.pl.name.slice(0,55),'','','','',1);for(const r of b.rows)row('  '+TYPES[r.t].n,r.n,r.te,r.ip,r.un)}
 y+=4;row('Project total','','','','',1);for(const r of C.total)row('  '+TYPES[r.t].n,r.n,r.te,r.ip,r.un);const t=C.total.reduce((a,r)=>[a[0]+r.n,a[1]+r.te,a[2]+r.ip,a[3]+r.un],[0,0,0,0]);row('All devices',...t,1);doc.setFont(undefined,'normal');return y}
const sortAddr=(a,b)=>String(a.loop||'').localeCompare(String(b.loop||''),undefined,{numeric:true})||String(a.address).localeCompare(b.address,undefined,{numeric:true});
$('#reportPdf').onclick=async()=>{if(!project)return;busy(1,'Building report');try{const D=await projData(),all_=D.flatMap(d=>d.pins),c=cntSt(all_),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});const tn=tester===null?await get('meta','tester'):tester;
 let y=0;const need=h=>{if(y+h>760){doc.addPage();y=44}},H=t=>{need(40);y+=8;doc.setFontSize(13);doc.setFont(undefined,'bold');doc.text(t,40,y+12);doc.setFont(undefined,'normal');doc.setDrawColor(150);doc.line(40,y+17,572,y+17);y+=30;doc.setFontSize(10)},L=(t,x=40,col)=>{const ls=doc.splitTextToSize(String(t),572-x);need(ls.length*13);if(col)doc.setTextColor(...col);doc.text(ls,x,y+10);doc.setTextColor(0,0,0);y+=ls.length*13};
 doc.setFillColor(30,41,59);doc.rect(0,0,612,78,'F');doc.setTextColor(255,255,255);doc.setFontSize(18);doc.setFont(undefined,'bold');doc.text('Fire Alarm Inspection Report',40,34);doc.setFont(undefined,'normal');doc.setFontSize(11);
 doc.text(`Project: ${project.name}`,40,54);doc.text(`Date: ${fmtT(Date.now())}    Tester: ${tn||'-'}    Plans: ${D.length}`,40,68);doc.setTextColor(0,0,0);y=92;
 H('Summary');L(`${c.pct}% tested (${c.passed+c.failed} of ${c.t} devices)`);L(`Passed: ${c.passed}    Failed: ${c.failed}    In progress: ${c.ip}    Not tested: ${c.nt}`);
 need(16);const bw=532;let bx=40;for(const[k,v]of[['passed',c.passed],['failed',c.failed],['in progress',c.ip],['not tested',c.nt]]){if(!c.t||!v)continue;const w=bw*v/c.t,h=ST[k];doc.setFillColor(parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16));doc.rect(bx,y+2,w,10,'F');bx+=w}y+=18;
 H('Device counts');y=pdfCounts(doc,countRows(D),y+10)+4;
 const defs=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='failed').map(p=>({pl,p}))).sort((a,b)=>(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1));
 H(`Deficiencies (${defs.length})`);if(!defs.length)L('None.');
 for(const{pl,p}of defs){const ph=await firstPhoto(p.id);let im=null;if(ph)try{im=await blobJpeg(ph,600)}catch{}const ih=im?Math.min(110,im.h*(150/im.w)):0;need(Math.max(ih,56)+8);const y0=y;
  doc.setFont(undefined,'bold');L(`${p.severity||'-'}: ${TYPES[p.type]?.n||p.type} ${p.address||''}${p.loop?' (Loop '+p.loop+')':''}`,40,p.severity==='Critical'?[185,28,28]:null);doc.setFont(undefined,'normal');
  L(`Reason: ${p.reason||'-'}${p.reasonText?' - '+p.reasonText:''}`,48);L(`${pl.name} pg ${p.page} · ${p.testedAt?fmtT(p.testedAt):'-'}${p.tester?' · '+p.tester:''}${p.notes?' · '+p.notes:''}`,48);
  if(im){doc.addImage(im.d,'JPEG',422,y0+2,150,ih);y=Math.max(y,y0+ih+4)}y+=6}
 H('Device checklist results');
 for(const{pl,pins:ps}of D){if(!ps.length)continue;need(30);doc.setFontSize(12);doc.setFont(undefined,'bold');L(pl.name);doc.setFontSize(10);doc.setFont(undefined,'normal');let lp=null;
  for(const p of ps.slice().sort(sortAddr)){if((p.loop||'')!==lp){lp=p.loop||'';need(20);doc.setFont(undefined,'bold');L(lp?`Loop ${lp}`:'No loop',44,[71,85,105]);doc.setFont(undefined,'normal')}
   const h=ST[p.status]||ST['not tested'];need(28);doc.setFillColor(parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16));doc.circle(54,y+7,4,'F');
   doc.setFont(undefined,'bold');L(`${TYPES[p.type]?.n||p.type} ${p.address||'(no address)'} - ${p.status}${p.testedAt?'  '+fmtT(p.testedAt):''}${p.tester?' by '+p.tester:''}`,64);doc.setFont(undefined,'normal');
   for(const ck of p.checks||[]){need(13);doc.text(ck.t,72,y+10);const v=ck.v||'';doc.setTextColor(...(v==='fail'?[185,28,28]:v==='pass'?[21,128,61]:[100,116,139]));doc.text(CV[v]||'—',470,y+10);doc.setTextColor(0,0,0);y+=13}
   if(!p.checks)L('(no checklist recorded)',72,[100,116,139]);y+=4}}
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(120);doc.text(`${project.name} · Inspection report · page ${i} of ${n}`,40,780);doc.setTextColor(0)}
 dl(doc.output('blob'),project.name.replace(/[\\/:*?"<>|]/g,'_')+'-inspection-report.pdf')}catch(e){showErr('Report failed: '+e.message)}finally{busy(0)}};
$('#checkCsv').onclick=async()=>{const rows=[['plan','page','type','address','loop','status','item','result','tested','tester']];
 for(const{pl,pins:ps}of await projData())for(const p of ps.slice().sort(sortAddr)){const base=[pl.name,p.page,TYPES[p.type]?.n||p.type,p.address,p.loop,p.status];const tt=[p.testedAt?fmtT(p.testedAt):'',p.tester||''];
  if(p.checks?.length)for(const c of p.checks)rows.push([...base,c.t,CV[c.v]||'',...tt]);else rows.push([...base,'(no checklist)','',...tt])}
 csvDl(rows,'-checklists.csv')};

// ---------- v8: detect devices (vector symbol matcher in detect.js worker; suggestions are "ghosts" until accepted) ----------
const DG={spkw:{n:'Speaker/strobe – wall',t:'spkstrobe',d:['SPK_FOH_WALL','SPK_BOH_WALL'],note:'wall mounted'},spkc:{n:'Speaker/strobe – ceiling',t:'spkstrobe',d:['SPK_FOH_CEIL','SPK_BOH_CEIL'],note:'ceiling mounted'},
 strobe:{n:'Strobe only',t:'strobe',d:['STROBE_FOH','STROBE_BOH']},la:{n:'Line array speaker',t:'linearray',d:['LINE_ARRAY']},smoke:{n:'Smoke detector',t:'smoke',d:['SMOKE']},module:{n:'Module (monitor/control)',t:'module',d:['MODULE']},
 relay:{n:'Relay',t:'relay',d:['RELAY']},pull:{n:'Pull station',t:'pull',d:['PULL']},dh:{n:'Door holder',t:'doorholder',d:['DOOR_HOLDER']},ft:{n:'Flow / tamper switch',t:'flow',d:['FLOW_TAMPER'],note:'flow or tamper switch, verify'},
 jbox:{n:'Junction box',t:'jbox',d:['JBOX','JBOX_CEIL']},surge:{n:'Surge suppressor',t:'other',d:['SURGE'],note:'surge suppressor'}};
const D2G={};for(const[k,g]of Object.entries(DG))for(const d of g.d)D2G[d]=k;
const DEF_SEL=Object.keys(DG).filter(k=>k!=='jbox'&&k!=='surge');
const gT=g=>TYPES[DG[g.g].t]||TYPES.other;
for(const[k,g]of Object.entries(DG))$('#ghType').add(new Option(g.n,k));
$('#detTypes').innerHTML=Object.entries(DG).map(([k,g])=>`<label><input type="checkbox" value="${k}"><span class="sw" style="background:${TYPES[g.t].c}"></span>${esc(g.n)}</label>`).join('');
const detBoxes=()=>[...document.querySelectorAll('#detTypes input')];
$('#detAll').onclick=()=>detBoxes().forEach(b=>b.checked=true);$('#detNone').onclick=()=>detBoxes().forEach(b=>b.checked=false);
$('#detBtn').onclick=async()=>{if(!plan)return alert('Open a PDF plan first.');if(!pdf)return alert('Detect devices works on vector PDF plans only (not photos or scans).');if(det)return;
 const saved=(await get('meta','detectSel'))||{groups:DEF_SEL,all:false};detBoxes().forEach(b=>b.checked=saved.groups.includes(b.value));
 $('#detForm').elements.scope.value=saved.all?'all':'page';$('#detScope label:last-child').lastChild.textContent=` All ${plan.pages} pages of this plan`;$('#detDlg').showModal()};
$('#detForm').addEventListener('submit',async e=>{if(e.submitter?.value!=='go')return;const groups=detBoxes().filter(b=>b.checked).map(b=>b.value);
 if(!groups.length){e.preventDefault();alert('Tick at least one device type.');return}const all=$('#detForm').elements.scope.value==='all';
 await put('meta',{groups,all},'detectSel');runDetect(groups,all)});
const DOPS=['save','restore','transform','paintFormXObjectBegin','paintFormXObjectEnd','setStrokeRGBColor','setFillRGBColor','setStrokeColorN','setFillColorN','constructPath','stroke','closeStroke','fill','eoFill','fillStroke','eoFillStroke','closeFillStroke','closeEOFillStroke','endPath'];
function cancelDetect(msg){if(!det)return;det.cancel=1;if(det.reject)det.reject(new Error('cancelled'));if(detW){detW.terminate();detW=null}det=null;busy(0);renderGhostBar();if(msg)showErr(msg)}
function detOnWorker(msg){return new Promise((res,rej)=>{if(!detW)detW=new Worker('detect.js');det.reject=rej;detW.onmessage=e=>{det&&(det.reject=null);e.data.ok?res(e.data):rej(new Error(e.data.err))};detW.onerror=e=>{e.preventDefault?.();rej(new Error(e.message||'worker failed'))};detW.postMessage(msg)})}
async function runDetect(groups,all){const want=groups.flatMap(g=>DG[g].d),pl=plan,pages=all?Array.from({length:pl.pages},(_,i)=>i+1):[page],R=det={cancel:0,stats:[]};hideErr();busy(1,'Detecting');prog(0);
 const O=pdfjsLib.OPS,keep=new Set(DOPS.map(k=>O[k]).filter(v=>v!==undefined));let found=0;
 try{for(let i=0;i<pages.length;i++){const n=pages[i],t0=performance.now();$('#busyTxt').textContent=pages.length>1?`Detecting pg ${n}`:'Detecting';
   const pg=await pdf.getPage(n);if(R.cancel||plan!==pl)return;
   if(all&&pages.length>1){let tx='';try{tx=(await pg.getTextContent()).items.map(t=>t.str).join(' ')}catch{}if(/\bSYMBOL\b/i.test(tx)&&/\b(QTY|DESCRIPTION)\b/i.test(tx)&&/LEGEND/i.test(tx)){R.stats.push({page:n,skipped:'legend sheet'});prog((i+1)/pages.length);continue}}
   const ol=await pg.getOperatorList();if(R.cancel||plan!==pl)return;prog((i+.5)/pages.length);
   const fn=[],args=[];for(let j=0;j<ol.fnArray.length;j++)if(keep.has(ol.fnArray[j])){fn.push(ol.fnArray[j]);args.push(ol.argsArray[j])}
   const vp=pg.getViewport({scale:1}),t1=performance.now(),r=await detOnWorker({id:n,fn,args,O,vt:vp.transform,W:vp.width,H:vp.height,want});if(R.cancel||plan!==pl)return;
   const near=(x,y)=>pins.some(p=>p.page===n&&Math.hypot(p.x-x,p.y-y)<18*r.k);
   ghosts=ghosts.filter(g=>!(g.page===n&&groups.includes(g.g)));
   const add=r.items.filter(it=>!near(it.x,it.y)).map(it=>({id:uid(),page:n,x:it.x,y:it.y,det:it.type,g:D2G[it.type]}));ghosts.push(...add);found+=add.length;
   R.stats.push({page:n,ops:ol.fnArray.length,paths:r.paths,found:r.items.length,kept:add.length,skipped:r.items.length-add.length,opsMs:Math.round(t1-t0),workerMs:Math.round(r.ms),totalMs:Math.round(performance.now()-t0),k:r.k});
   prog((i+1)/pages.length);if(n===page)draw();renderGhostBar()}
  window.__detStats=R.stats;if(!found)showErr(`No ${groups.length===Object.keys(DG).length?'':'matching '}device symbols found${all?'':' on this page'}. Detection works on CAD-exported vector plans with standard symbols.`)}
 catch(e){if(!R.cancel)showErr('Detect devices failed: '+(e&&e.message||e))}
 finally{if(det===R){det=null;busy(0)}draw();renderGhostBar()}}
function drawGhosts(c){const s=view.s,r=15/s;for(const g of ghosts){if(g.page!==page)continue;const T=gT(g);c.save();c.translate(g.x,g.y);c.setLineDash([5/s,3/s]);c.lineWidth=3/s;c.strokeStyle=T.c;c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.arc(0,0,r,0,7);c.fill();c.stroke();c.setLineDash([]);
 c.fillStyle=T.c;c.font=`bold ${(T.l.length>2?8:11)/s}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(T.l,0,0);c.fillStyle='#111';c.font=`bold ${9/s}px sans-serif`;c.fillText('?',r*.95,-r*.95);c.restore()}}
function ghostHit(w){let best=null,bd=22/view.s;for(const g of ghosts){if(g.page!==page)continue;const d=Math.hypot(g.x-w.x,g.y-w.y);if(d<bd){bd=d;best=g}}return best}
let curG=null;function openGhost(g){curG=g;$('#ghType').value=g.g;ghInfoUpd();$('#ghDlg').showModal()}
function ghInfoUpd(){const g=curG;if(!g)return;const n=ghosts.filter(x=>x.g===$('#ghType').value).length;$('#ghHead').textContent='Suggested: '+DG[$('#ghType').value].n;$('#ghInfo').textContent=`Becomes a "${TYPES[DG[$('#ghType').value].t].n}" pin (blank address/loop, not tested). Detected as ${g.det.replace(/_/g,' ').toLowerCase()}, page ${g.page}.`;$('#ghAllType').textContent=`Accept all ${n} of this type`}
$('#ghType').onchange=()=>{if(curG){curG.g=$('#ghType').value;ghInfoUpd();draw();renderGhostBar()}};
$('#ghAcc').onclick=async()=>{const g=curG;$('#ghDlg').close();if(g)await acceptGhosts([g])};
$('#ghRej').onclick=()=>{const g=curG;$('#ghDlg').close();if(g){ghosts=ghosts.filter(x=>x!==g);draw();renderGhostBar()}};
$('#ghAllType').onclick=async()=>{const g=curG;$('#ghDlg').close();if(g)await acceptGhosts(ghosts.filter(x=>x.g===g.g))};
async function acceptGhosts(list){if(!plan||!list.length)return;const out=[],used=[];for(const g of list){if(pins.some(p=>p.page===g.page&&Math.hypot(p.x-g.x,p.y-g.y)<14)||out.some(p=>p.page===g.page&&Math.hypot(p.x-g.x,p.y-g.y)<6)){used.push(g);continue}
  const G=DG[g.g],boh=/_BOH/.test(g.det);out.push({id:uid(),planId:plan.id,page:g.page,x:g.x,y:g.y,type:G.t,address:'',loop:'',status:'not tested',notes:'Auto-detected'+(G.note?': '+G.note:'')+(boh?', back-of-house symbol':''),created:Date.now(),detected:g.det});used.push(g)}
 const ids=new Set(used.map(g=>g.id));ghosts=ghosts.filter(g=>!ids.has(g.id));if(out.length)await changeBatch('pins',out,used);else{draw();renderGhostBar()}}
function renderGhostBar(){const b=$('#ghBar');if(!ghosts.length){b.hidden=true;b.innerHTML='';return}const here=ghosts.filter(g=>g.page===page).length,cnt={};for(const g of ghosts)cnt[g.g]=(cnt[g.g]||0)+1;
 b.innerHTML=`<b>🔍 ${ghosts.length} suggestion${ghosts.length>1?'s':''}</b><small>${here} on this page</small>`+Object.entries(cnt).map(([k,n])=>`<button type="button" class="chip" data-g="${k}" style="border-color:${TYPES[DG[k].t].c}" title="Accept all ${esc(DG[k].n)}">${esc(DG[k].n)} ${n}</button>`).join('')+`<span class="sp"></span><button type="button" class="btn pri" id="ghAccAll">✔ Accept all</button><button type="button" class="btn danger" id="ghRejAll">✕ Reject all</button>`;
 b.hidden=false;b.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{const L=ghosts.filter(g=>g.g===c.dataset.g);if(confirm(`Accept all ${L.length} "${DG[c.dataset.g].n}" suggestions as pins?`))acceptGhosts(L)});
 $('#ghAccAll').onclick=()=>{if(confirm(`Accept all ${ghosts.length} suggestions as pins?`))acceptGhosts(ghosts.slice())};$('#ghRejAll').onclick=()=>{if(confirm(`Reject all ${ghosts.length} suggestions?`)){ghosts=[];draw();renderGhostBar()}}}
