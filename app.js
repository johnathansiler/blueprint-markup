'use strict';
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const $=s=>document.querySelector(s);
const TYPES={smoke:{c:'#dc2626',l:'S',n:'Smoke'},heat:{c:'#ea580c',l:'H',n:'Heat'},pull:{c:'#be185d',l:'P',n:'Pull station'},horn:{c:'#7c3aed',l:'HS',n:'Horn/strobe'},panel:{c:'#991b1b',l:'FACP',n:'FACP – Fire Alarm Control Panel',sq:1},dact:{c:'#ca8a04',l:'DACT',n:'DACT – Digital Alarm Communicator Transmitter',sq:1},fatc:{c:'#0e7490',l:'FATC',n:'FATC – Fire Alarm Terminal Cabinet',sq:1},panelbox:{c:'#0f766e',l:'ANN',n:'Annunciator',sq:1},rai:{c:'#e11d48',l:'RI',n:'Remote alarm indicator'},module:{c:'#2563eb',l:'M',n:'Monitor/control module',sq:1},duct:{c:'#b45309',l:'D',n:'Duct detector'},flow:{c:'#0369a1',l:'WF',n:'Waterflow switch'},tamper:{c:'#4d7c0f',l:'TS',n:'Tamper switch'},spkstrobe:{c:'#9333ea',l:'SS',n:'Speaker/strobe'},strobe:{c:'#c026d3',l:'ST',n:'Strobe'},linearray:{c:'#4f46e5',l:'LA',n:'Line array speaker'},relay:{c:'#2dd4bf',l:'R',n:'Relay',sq:1},doorholder:{c:'#db2777',l:'DH',n:'Door holder'},jbox:{c:'#64748b',l:'J',n:'Junction box',sq:1},surge:{c:'#16a34a',l:'SS',n:'Surge protector (TVSS / SPD)',sq:1},other:{c:'#475569',l:'?',n:'Other'}};
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
 panel:['Normal/AC power OK, power-on LED','Batteries tested (load/voltage) and dated','No trouble/supervisory/alarm conditions','Alarm, supervisory and trouble signals received at panel','Lamp/LED/display test OK','Event log/time correct','Zone/device labeling and as-builts on site'],
 dact:['Primary and secondary line/path connected','Test signal received by supervising station','Communication-failure trouble on line loss','Account/zone codes match central station','24-hr test timer set','Physical condition OK'],
 panelbox:['Power/battery OK','No trouble conditions','Physical condition OK'],
 fatc:['Cabinet accessible and identified','Terminals landed/labeled per drawings','Wiring secured, no damage','Cover in place','No unauthorized splices'],
 spkstrobe:['Audible/voice message intelligible','Strobe flashes','Synchronized with other strobes','Candela/tap setting matches plan','Mounted/condition OK'],
 strobe:['Strobe flashes','Synchronized with other strobes','Candela setting matches plan','Mounted/condition OK'],
 linearray:['Audible/voice message intelligible','Covers intended area','Mounted/aim OK','Physical condition OK'],
 relay:['Operates on alarm (controlled equipment responds)','Correct address/label at panel','Restores on reset','Wiring/supervision OK','Physical condition OK'],
 doorholder:['Releases door on alarm','Door closes and latches fully','Holds door open in normal condition','Physical condition OK'],
 surge:['Listed SPD installed per drawings (circuit/location)','Status/protection indicator shows protected','Proper grounding/bonding conductor','Enclosure secure, wiring undamaged','Labeled with circuit served'],
 rai:['LED lights on alarm of associated device','Correct device/location labeled','Restores (LED off) on reset','Visible from intended location','Mounted/condition OK'],
 jbox:['Cover in place and identified (red/FA)','Wiring secured, no damage','Accessible'],
 other:['Operates as intended','Correct address/label at panel','Physical condition OK']};
let CKT={};const ckTpl=t=>CKT[t]||CHECKS[t]||CHECKS.other;const checkItems=t=>ckTpl(t).map(t=>({t,v:''}));
const PIN_OP=.5,MK_OP=.8;const pinR=()=>9.6;
// bpm-v26/27: pin silhouettes match the printed plan symbols (shape + size in plan points, measured from the test plan legend:
// hex smoke/duct/module ~15pt, flat flow/tamper diamond ~24x9, 13pt square for pull/notification/J/relay, wide boxes for panels/DH)
const PSH={smoke:['hex',15,13],duct:['hex',15,13],module:['hex',15,13],heat:['circ',13,13],pull:['rect',13,13],horn:['rect',13,13],spkstrobe:['rect',13,13],strobe:['rect',13,13],linearray:['rect',13,13],
 panel:['rect',26,13],dact:['rect',26,13],fatc:['rect',26,13],panelbox:['rect',26,13],doorholder:['rect',7,14],relay:['hex',15,13],jbox:['rect',13,13],surge:['rect',13,13],
 flow:['dia',24,9],tamper:['dia',24,9],rai:['circ',6,6],jceil:['circ',13,13],other:['circ',12,12]};
const PSC=1.3;const PANEL_S=new Set(['panel','dact','fatc','panelbox']);
// bpm-v37: tight outset — path = print outer size; canvas stroke is centered so gray outer edge = print + LW/2 (thin ring just outside black; no inset, no ~1.3× overhang, no color past the gray)
const pshOf=o=>{const t=typeof o==='string'?o:o&&(o.shp||o.type),v=PSH[t]||PSH.other;if(PANEL_S.has(t)){if(o&&o.bw>4&&o.bh>4)return['rect',o.bw,o.bh];if(o&&o.vert)return['rect',v[2],v[1]];return['rect',v[1],v[2]]}if(v[0]==='dia'){const W=(o&&o.bw>4&&o.bh>4)?o.bw:v[1],H=(o&&o.bw>4&&o.bh>4)?o.bh:v[2];return['dia',W,H]}if(o&&o.bw>4&&o.bh>4&&(v[0]==='rect'||v[0]==='hex'||v[0]==='circ'))return[v[0],o.bw,o.bh];return[v[0],v[1],v[2]]};
// bpm-v35: zoom % readout; pin progress summary = pass/fail/total/left/%
// bpm-v34: default fit/page-switch zoom 60% closer (scale ×1.6)
// bpm-v33: code chips (no checkboxes) + Confirm clears leftover suggestions; hide Loop from pin/bulk UI
// bpm-v32: confirm selected code refs via checkboxes (reverted UI in v33)
// bpm-v31: pin location field; 'Other' reason textbox; removed checklist JSON import/export
// bpm-v30: DH status border 1.2pt (~60%); relay clearer cyan-teal #2dd4bf
// bpm-v39: clean outset — fill uses the print path; the gray stroke uses the path expanded by OUT(t)=LW/2+print-line margin along every edge normal, so the stroke's inner edge sits fully outside the black print line (no gray over black)
// bpm-v41: fill = print interior (d=-PRINT_LW/2 inside the measured outer-black size); status stroke on a true polygon offset so its inner edge sits just outside the black line; flow/tamper use a thinner ring so adjacent TS don't merge
// bpm-v44: from-scratch silhouette. pshOf(t) w/h = OUTER edge of the plan's black print line (measured bw/bh or PSH default).
// Outer size MUST match the print, otherwise our black sits outside the plan's black and color shows past it. No PSC scaling here.
// Three explicit sizes, each a true perpendicular offset d from that outer edge:
//   fill   d=-PRINT_LW        (inner edge of black; fill is also CLIPPED here so no AA bleed)
//   black  d=-PRINT_LW/2      (black stroke centerline, full opacity)
//   status d=GAP+pinLW/2      (status stroke centerline → inner edge GAP outside black)
const PRINT_LW=.85,GAP=.1;const OUT=t=>GAP+pinLW(t)/2;
// half-sizes [a,b,x] for kind k offset by d from outer half-sizes (a,b); hex x = top-vertex half-x
function offHalf(k,a,b,d){if(k==='rect'||k==='circ')return[Math.max(.05,a+d),Math.max(.05,b+d),0];
 if(k==='dia'){const L=Math.hypot(a,b);return[Math.max(.05,a+d*L/b),Math.max(.05,b+d*L/a),0]}
 const s=Math.hypot(a/2,b);return[Math.max(.05,a+d*s/b),Math.max(.05,b+d),Math.max(.02,a/2+(d*s-a*d/2)/b)]}
function shapePath(c,k,a,b,x){if(k==='rect')c.rect(-a,-b,2*a,2*b);else if(k==='dia'){c.moveTo(-a,0);c.lineTo(0,-b);c.lineTo(a,0);c.lineTo(0,b);c.closePath()}
 else if(k==='hex'){x=x??a/2;c.moveTo(-a,0);c.lineTo(-x,-b);c.lineTo(x,-b);c.lineTo(a,0);c.lineTo(x,b);c.lineTo(-x,b);c.closePath()}else c.arc(0,0,a,0,Math.PI*2)}
function pinGeo(t,d){const[k,w,h]=pshOf(t);const W=k==='circ'?w:w,H=k==='circ'?w:h;return[k,...offHalf(k,W/2,H/2,d)]}
function pinPath(c,t,d=0){const[k,a,b,x]=pinGeo(t,d-PRINT_LW/2);shapePath(c,k,a,b,x)} // legacy: d relative to black centerline
function pinFS(c,t,ghost){
 const sa=c.globalAlpha,ss=c.strokeStyle,lw=c.lineWidth,ld=c.getLineDash(),lj=c.lineJoin;
 const F=pinGeo(t,-PRINT_LW),K=pinGeo(t,-PRINT_LW/2),S=pinGeo(t,ghost?0:OUT(t)),k=F[0];
 c.save();c.beginPath();shapePath(c,k,F[1],F[2],F[3]);c.clip();c.beginPath();shapePath(c,k,F[1],F[2],F[3]);c.fill();c.restore();
 if(!ghost){c.globalAlpha=1;c.setLineDash([]);c.strokeStyle='#000';c.lineWidth=PRINT_LW;c.lineJoin='miter';c.beginPath();shapePath(c,k,K[1],K[2],K[3]);c.stroke();c.globalAlpha=sa}
 c.strokeStyle=ss;c.lineJoin='miter';if(ghost){c.lineWidth=lw;c.setLineDash([3,2])}else{c.lineWidth=pinLW(t);c.setLineDash([])}
 c.beginPath();shapePath(c,k,S[1],S[2],S[3]);c.stroke();c.setLineDash(ld);c.lineWidth=lw;c.lineJoin=lj}
const pinHalf=t=>{const[k,w,h]=pshOf(t),r=k==='circ'?w/2:k==='rect'?Math.hypot(w,h)/2:Math.max(w,h)/2;return r+OUT(t)+pinLW(t)/2}; // outer edge of status ring
const pinLW=t=>{const k=typeof t==='string'?t:t&&t.type;return k==='doorholder'||k==='flow'||k==='tamper'?1.2:2}; // bpm-v30: DH status border ~60% so pink fill dominates; others stay 2pt
const clampOp=v=>Math.max(.15,Math.min(1,+(v??1)));
const opOf=(o,isPin)=>clampOp(o&&o.opacity!=null?o.opacity:(isPin?PIN_OP:MK_OP));

function autoStatus(cs){const a=(cs||[]).filter(c=>c.v);if(!a.length)return'not tested';if(a.some(c=>c.v==='fail'))return'failed';return a.length===cs.length?'passed':'in progress'}
function reasonFor(item){return /alarm|activat|audible|signal|received|operat|visible|flash|flow/i.test(item)?'No alarm':/clean/i.test(item)?'Dirty/needs cleaning':/obstruct|accessib/i.test(item)?'Obstructed':/address|label/i.test(item)?'Wrong location':/condition|mount|led|base/i.test(item)?'Damaged':/trouble|supervis|wiring/i.test(item)?'Trouble':'Other'}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
// ---------- IndexedDB ----------
let dbp;function db(){return dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('blueprint-markup',4);r.onupgradeneeded=e=>{const d=r.result,t=r.transaction;if(e.oldVersion<1){d.createObjectStore('plans',{keyPath:'id'});for(const s of['markups','pins','media']){const o=d.createObjectStore(s,{keyPath:'id'});o.createIndex(s==='media'?'pinId':'planId',s==='media'?'pinId':'planId')}d.createObjectStore('meta')}
 if(e.oldVersion<2){const pid='p'+uid();d.createObjectStore('projects',{keyPath:'id'}).put({id:pid,name:'My project',created:Date.now()});t.objectStore('meta').put(pid,'project');t.objectStore('plans').openCursor().onsuccess=ev=>{const c=ev.target.result;if(c){c.update({...c.value,projectId:pid});c.continue()}}}
 if(e.oldVersion<3&&!d.objectStoreNames.contains('learned'))d.createObjectStore('learned',{keyPath:'id'});
 if(e.oldVersion<4&&!d.objectStoreNames.contains('mycodes'))d.createObjectStore('mycodes',{keyPath:'id'})};r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();res(r.result)};r.onblocked=()=>console.info('db upgrade waiting for other tabs');r.onerror=()=>rej(r.error)}))}
async function tx(store,mode,fn){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(store,mode),s=t.objectStore(store);let out;const r=fn(s);if(r)r.onsuccess=()=>out=r.result;t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error)})}
const put=(s,v,k)=>tx(s,'readwrite',o=>o.put(v,k)),get=(s,k)=>tx(s,'readonly',o=>o.get(k)),del=(s,k)=>tx(s,'readwrite',o=>o.delete(k)),all=s=>tx(s,'readonly',o=>o.getAll()),byIdx=(s,i,v)=>tx(s,'readonly',o=>o.index(i).getAll(v));
// ---------- state ----------
const cv=$('#cv'),ctx=cv.getContext('2d'),stage=$('#stage');
let plan=null,pdf=null,page=1,pageW=0,pageH=0,curPH=()=>pageH,bmp=null,bmpScale=0,renderTask=null,renderTimer=0,baseBm=null,tile=null,project=null;
const ov=$('#ov'),octx=ov.getContext('2d');
let markups=[],pins=[],view={s:1,x:0,y:0},tool='pan',sel=null,draft=null,ghosts=[],det=null,detW=null,msel=[],clip=null,pasteArm=false,lpT=0,walk=null;
let MK_SNAP=true; // markup geometry snap (lines/arrows/shapes/clouds)
const LAY0={shapes:true,clouds:true,text:true,pins:true,labels:true,ghosts:true,only:'',dim:false,exp:false};let lay={...LAY0};
const dpr=()=>window.devicePixelRatio||1;
let lastW=0,lastH=0;function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(lastW&&pageW){const cx=(lastW/2-view.x)/view.s,cy=(lastH/2-view.y)/view.s;view.x=w/2-cx*view.s;view.y=h/2-cy*view.s}const wide=innerWidth>=800;if(wide!==resize.wide){resize.wide=wide;$('#panel').hidden=!wide;renderList()}lastW=w;lastH=h;cv.width=ov.width=w*dpr();cv.height=ov.height=h*dpr();draw();scheduleRender()}
new ResizeObserver(()=>resize()).observe(stage);
window.addEventListener('resize',resize);
let VR=0,ROTS={};
// view rotation (display only): plan point -> display point for VR in {0,90,180,270}
const rotP=(x,y)=>VR===90?{x:pageH-y,y:x}:VR===180?{x:pageW-x,y:pageH-y}:VR===270?{x:y,y:pageW-x}:{x,y};
const unrotP=(X,Y)=>VR===90?{x:Y,y:pageH-X}:VR===180?{x:pageW-X,y:pageH-Y}:VR===270?{x:pageW-Y,y:X}:{x:X,y:Y};
const dispWH=()=>VR%180?{w:pageH,h:pageW}:{w:pageW,h:pageH};
const toW=(sx,sy)=>unrotP((sx-view.x)/view.s,(sy-view.y)/view.s);
const toS=(x,y)=>{const d=rotP(x,y);return{x:d.x*view.s+view.x,y:d.y*view.s+view.y}};
function centerOn(x,y,s,cx,cy){const d=rotP(x,y);view={s,x:cx-d.x*s,y:cy-d.y*s}}
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
async function openPlan(id,pg=1){const p=await get('plans',id);if(!p)return;if(det)cancelDetect();stopAll();if(plan?.id!==id){ghosts=[];renderGhostBar();if(walk)exitWalk()}const seq=opSeq;hideErr();plan=p;busy(1,'Loading');prog(0);
 try{if(pdf){pdf.destroy();pdf=null}pageW=0;draw();
  if(p.kind==='pdf'){if(!p.blob||!p.blob.size)throw new Error('the stored file is empty');
   const data=new Uint8Array(await withTimeout(p.blob.arrayBuffer(),30000,'reading the stored file timed out'));if(seq!==opSeq)return;prog(.1);
   const t=pdfjsLib.getDocument({data,disableFontFace:false});loadTask=t;t.onProgress=e=>{if(e.total)prog(.1+.2*Math.min(1,e.loaded/e.total))};
   const d=await withTimeout(t.promise,60000,'the PDF engine did not respond within 60 s');if(seq!==opSeq||loadTask!==t){d.destroy();return}loadTask=null;pdf=d;p.pages=d.numPages}else p.pages=1;
  prog(.3);lay={...LAY0,...((await get('meta','layers:'+id))||{})};layMark();await loadScale(id);ROTS=(await get('meta','rot:'+id))||{};THB={};MS.pts=[];setTimeout(renderMBar,0);markups=await byIdx('markups','planId',id);pins=await byIdx('pins','planId',id);
  await put('meta',id,'last:'+p.projectId);await refreshPlans();$('#empty').hidden=true;await gotoPage(Math.min(pg,p.pages)||1,seq)}
 catch(e){if(seq===opSeq){if(loadTask){try{loadTask.destroy()}catch{}loadTask=null}showErr(`Could not open "${p.name}": ${e&&e.message||e}`)}}
 finally{if(seq===opSeq)busy(0)}}
async function buildPageSel(){fillPageSel(null);let labels=null;try{labels=pdf&&await withTimeout(pdf.getPageLabels(),5000,'labels')}catch{}if(labels)fillPageSel(labels)}
function fillPageSel(labels){if(!plan)return;const sel=$('#pageSel');sel.innerHTML='';for(let i=1;i<=plan.pages;i++){const n=pins.filter(x=>x.page===i).length;sel.add(new Option(`${labels?.[i-1]||'Pg '+i} / ${plan.pages}${n?` (${n}📍)`:''}`,i))}sel.value=page}
$('#pageSel').onchange=e=>gotoPage(+e.target.value).then(()=>{MS.pts=[];renderMBar()});$('#prev').onclick=()=>plan&&page>1&&gotoPage(page-1);$('#next').onclick=()=>plan&&page<plan.pages&&gotoPage(page+1);
async function gotoPage(n,seq){if(!plan)return;const own=seq===undefined;if(own){if(renderTask){try{renderTask.cancel()}catch{}renderTask=null}seq=++opSeq;hideErr()}
 page=n;sel=null;msel=[];updUR();renderGhostBar();renderSelBar();bmp=null;bmpScale=0;baseBm=tile=null;const pcHit=pcGet(n);if(!pcHit)busy(1,'Rendering');prog(.3);
 try{if(pdf){const pg=await withTimeout(pdf.getPage(n),30000,'reading page '+n+' timed out');if(seq!==opSeq)return;const vp=pg.getViewport({scale:1});pageW=vp.width;pageH=vp.height}
  else{const im=await createImageBitmap(plan.blob);pageW=im.width;pageH=im.height;bmp=im;bmpScale=1}
  VR=+(ROTS[n]||0);updRotBtn();if(pcHit){baseBm=pcHit;bmpScale=pcHit.s}
  put('meta',{plan:plan.id,page:n},'lastPage');fit();prog(.35);await buildPageSel();if(seq!==opSeq)return;prog(.4);
  const ok=await renderPage(true);if(seq!==opSeq)return;if(ok===false)showErr('Could not render this page, even at low resolution. Try ⤢ or reopen the plan.');renderList()}
 catch(e){if(seq===opSeq)showErr('Could not show page '+n+': '+(e&&e.message||e))}
 finally{if(own&&seq===opSeq)busy(0)}}
function fit(){if(!pageW)return;const D=dispWH(),w=stage.clientWidth,h=stage.clientHeight,s=Math.min(w/D.w,h/D.h)*.95*1.6;const sw=D.w*s;view={s,x:sw>w?8:(w-sw)/2,y:(h-D.h*s)/2};draw()} // bpm-v86: wider than the stage → left edge stays visible; bpm-v34: page-change/fit zoom 60% closer (×1.6)
$('#fit').onclick=fit;
// bpm-v35: live zoom percentage (100% = 1 CSS px per plan point)
function updZoom(){const el=$('#zoomPct');if(!el)return;el.textContent=plan&&pageW?Math.round(view.s*100)+'%':'—'}
// crisp re-render: render the page at current zoom*dpr, capped by pixel budget
// Perf: a small full-page base bitmap is rendered once per page; zoomed-in views render only the visible
// region (plus margin) at screen resolution, capped by a pixel budget. Markups live on a separate overlay canvas.
let SUPER=0,RGEN=0;/* bpm-v97: SUPER now holds the render generation that was superseded, so a late-cancelled older render can't abort the newer one (blank plan after reload) */const MAXPX=matchMedia('(pointer:coarse)').matches?16e6:24e6,BASEPX=4e6,FIRSTPX=1.2e6;
function wantScale(){return Math.min(view.s*dpr(),10)}
function visRect(){const W=stage.clientWidth,H=stage.clientHeight,P=[toW(0,0),toW(W,0),toW(0,H),toW(W,H)],xs=P.map(p=>p.x),ys=P.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}}
function covered(t){const v=visRect();return Math.max(0,v.x)>=t.x-1&&Math.max(0,v.y)>=t.y-1&&Math.min(pageW,v.x+v.w)<=t.x+t.w+1&&Math.min(pageH,v.y+v.h)<=t.y+t.h+1}
function baseOK(w){return baseBm&&baseBm.s>=w*.87}
function scheduleRender(){if(!pdf||SLIDING)return;clearTimeout(renderTimer);const w=wantScale();if(!baseBm){renderTimer=setTimeout(renderPage,0);return}
 if(baseOK(w)){if(tile){tile=null;requestDraw()}return}
 if(tile&&w<=tile.s*1.15&&w>=tile.s/2.5&&covered(tile))return;renderTimer=setTimeout(renderPage,180)}
function wantRect(s){const v=visRect();let m=.5,w,h;for(;;){w=v.w*(1+2*m);h=v.h*(1+2*m);if(w*h*s*s<=MAXPX||m<=0)break;m=Math.max(0,m-.1)}
 const x=Math.max(0,v.x-v.w*m),y=Math.max(0,v.y-v.h*m);return{x,y,w:Math.max(1,Math.min(pageW-x,w)),h:Math.max(1,Math.min(pageH-y,h))}}
// Mobile canvas limits: keep every canvas under ~16.7 MP and 8192 px per side; a null context falls back to a smaller size.
const SAFE_AREA=16e6,SAFE_SIDE=8192;
async function raster(pg,s,r,showProg){const g0=RGEN;s=Math.max(s,.02);const k=Math.min(1,Math.sqrt(SAFE_AREA/(r.w*r.h*s*s)),SAFE_SIDE/(r.w*s),SAFE_SIDE/(r.h*s));s*=k;
 const vp=pg.getViewport({scale:s}),c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(r.w*s));c.height=Math.max(1,Math.ceil(r.h*s));
 const cx=c.getContext('2d',{alpha:false});if(!cx)return null;
 let t;try{t=pg.render({canvasContext:cx,viewport:vp,transform:[1,0,0,1,-r.x*s,-r.y*s],background:'#fff'})}catch(e){console.warn('render failed',e);return null}renderTask=t;
 // pdf.js has no render-progress API: phase % (40% = page ready) plus a live count of drawing operations received
 if(showProg)t.onContinue=cont=>{let n=0;try{for(const st of pg._intentStates?.values()||[])n=Math.max(n,st.operatorList?.fnArray?.length||0)}catch{}if(n)$('#busyPct').textContent=`40% · ${n>=1e4?Math.round(n/1e3)+'k':n} ops`;cont()};
 const to=setTimeout(()=>{if(renderTask===t){t.cancel();t.timedOut=1}},45000);
 try{await t.promise}catch(e){if(!/cancel/i.test(e?.name+e?.message))console.warn('render failed',e);return null}finally{clearTimeout(to)}if(renderTask!==t){SUPER=g0;return null}renderTask=null;if(showProg)prog(1);c._s=s;return c}
async function renderPage(first){if(!pdf){draw();return}const gen=++RGEN;SUPER=0;const pn=page,seq=opSeq;if(renderTask){renderTask.cancel();renderTask=null}
 const pg=await pdf.getPage(pn);if(pn!==page||seq!==opSeq)return;
 if(!baseBm){const full=Math.min(wantScale(),Math.sqrt(BASEPX/(pageW*pageH)));let s=first?Math.min(full,Math.sqrt(FIRSTPX/(pageW*pageH))):full,c=null;for(let i=0;i<6&&!c;i++,s/=2){c=await raster(pg,s,{x:0,y:0,w:pageW,h:pageH},first);if(pn!==page||seq!==opSeq||gen!==RGEN||SUPER===gen)return}
  if(!c){const r=visRect(),R={x:Math.max(0,r.x),y:Math.max(0,r.y),w:Math.max(1,Math.min(pageW,r.x+r.w)-Math.max(0,r.x)),h:Math.max(1,Math.min(pageH,r.y+r.h)-Math.max(0,r.y))};for(let q=Math.min(wantScale(),Math.sqrt(4e6/(R.w*R.h))),i=0;i<4&&!c;i++,q/=2){c=await raster(pg,q,R);if(pn!==page||seq!==opSeq||gen!==RGEN||SUPER===gen)return}if(c){tile={c,s:c._s,...R};bmpScale=c._s;errClr();draw();return}return false}
  errClr();baseBm={c,s:c._s};bmpScale=c._s;pcPut(pn,baseBm);draw();
  // progressive: sharpen the full-page base in the background once the first paint is up
  if(c._s<full*.87){setTimeout(()=>upgradeBase(pn,seq,full),60);return}}
 const want=wantScale();if(baseOK(want)){tile=null;draw();return}
 const r=wantRect(want);let c=await raster(pg,want,r);if(!c&&SUPER!==RGEN&&pn===page)c=await raster(pg,want/2,r);if(!c||pn!==page)return;tile={c,s:c._s,...r};bmpScale=c._s;errClr();draw()}
function errClr(){if(!$('#err').hidden&&/Could not render|Stopped rendering/.test($('#errTxt').textContent))hideErr()}
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
// v16: markups live in plan space (fixed size relative to the blueprint), same scale as exports
const MK_S=1/1.5;
function drawMarkup(c,m,s){s=MK_S;c.save();c.globalAlpha=opOf(m,false);c.strokeStyle=m.color;c.lineWidth=(m.w||3)/s;c.lineJoin=c.lineCap='round';const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);
 if(m.type==='rect')c.strokeRect(x,y,w,h);
 else if(m.type==='ellipse'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2||.1,h/2||.1,0,0,7);c.stroke()}
 else if(m.type==='check'){c.lineWidth=Math.max(c.lineWidth,Math.min(w,h)/8);c.beginPath();c.moveTo(x,y+h*.55);c.lineTo(x+w*.38,y+h);c.lineTo(x+w,y);c.stroke()}
 else if(m.type==='cloud')cloudPath(c,m.x1,m.y1,m.x2,m.y2,s);
 else if(m.type==='arrow'||m.type==='line'){c.beginPath();c.moveTo(m.x1,m.y1);c.lineTo(m.x2,m.y2);c.stroke();if(m.type==='arrow'){const a=Math.atan2(m.y2-m.y1,m.x2-m.x1),L=Math.max(c.lineWidth*4,12/s);c.beginPath();c.moveTo(m.x2-L*Math.cos(a-.45),m.y2-L*Math.sin(a-.45));c.lineTo(m.x2,m.y2);c.lineTo(m.x2-L*Math.cos(a+.45),m.y2-L*Math.sin(a+.45));c.stroke()}}
 else if(m.type==='zig'||m.type==='zarrow'){const P=zPts(m);if(P.length>1){c.lineJoin='miter';c.miterLimit=10;c.beginPath();P.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();if(m.type==='zarrow'){const[ax,ay]=P[P.length-2],[bx,by]=P[P.length-1],a=Math.atan2(by-ay,bx-ax),L=Math.max(c.lineWidth*4,12/s);c.lineJoin='round';c.beginPath();c.moveTo(bx-L*Math.cos(a-.45),by-L*Math.sin(a-.45));c.lineTo(bx,by);c.lineTo(bx-L*Math.cos(a+.45),by-L*Math.sin(a+.45));c.stroke()}}}
 else if(m.type==='dim'||m.type==='cal'||m.type==='darea'||m.type==='dpath')drawMeasure(c,m,s);
 else if(m.type==='text'){c.font=`bold ${m.fs}px sans-serif`;c.textBaseline='top';c.textAlign='left';c.lineWidth=m.fs/5;c.strokeStyle='#fff';c.strokeText(m.text,m.x1,m.y1);c.fillStyle=m.color;c.fillText(m.text,m.x1,m.y1)}c.restore()}
// bpm-v54/v56: zigzag polyline (zig); zarrow kept for legacy files (still render+select, no toolbar button); points relative to x1,y1 so move works
const ZT=['zig','zarrow'],zPts=m=>(m.rp||[]).map(([dx,dy])=>[m.x1+dx,m.y1+dy]);
function zFinish(m,P){const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);m.x1=Math.min(...xs);m.y1=Math.min(...ys);m.x2=Math.max(...xs);m.y2=Math.max(...ys);m.rp=P.map(([x,y])=>[x-m.x1,y-m.y1]);return m}
const isLine=m=>m.type==='arrow'||m.type==='line'||m.type==='dim'||m.type==='cal';
function textBox(m){octx.save();octx.font=`bold ${m.fs}px sans-serif`;const w=octx.measureText(m.text).width;octx.restore();m.x2=m.x1+w;m.y2=m.y1+m.fs*1.15;return m}
function handles(m){if(m.type==='dpath'||ZT.includes(m.type))return[];if(isLine(m))return[[m.x1,m.y1],[m.x2,m.y2]];const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),X=Math.max(m.x1,m.x2),Y=Math.max(m.y1,m.y2);return[[x,y],[X,y],[X,Y],[x,Y]]}
function handleHit(m,sx,sy){const hs=handles(m),rad=Math.max(8*view.s,18);for(let i=hs.length-1;i>=0;i--){const q=toS(hs[i][0],hs[i][1]);if(Math.hypot(q.x-sx,q.y-sy)<rad)return i}return -1}
function resizeTo(m,o,h,w){if(isLine(m)){if(h===0){m.x1=w.x;m.y1=w.y}else{m.x2=w.x;m.y2=w.y}return}
 const x0=Math.min(o.x1,o.x2),y0=Math.min(o.y1,o.y2),X0=Math.max(o.x1,o.x2),Y0=Math.max(o.y1,o.y2),L=h===0||h===3,T=h===0||h===1;
 if(m.type==='text'){const nh=Math.max(6/view.s,T?Y0-w.y:w.y-y0);m.fs=o.fs*nh/((Y0-y0)||1);const tw=textBox({...m,x1:0,y1:0}).x2;Object.assign(m,{x1:L?X0-tw:x0,y1:T?Y0-m.fs*1.15:y0});textBox(m);return}
 let x=L?w.x:x0,X=L?X0:w.x,y=T?w.y:y0,Y=T?Y0:w.y;m.x1=Math.min(x,X);m.x2=Math.max(x,X);m.y1=Math.min(y,Y);m.y2=Math.max(y,Y)}
let CR=0;function drawPin(c,p,s,hl,bare,nolab){const T=TYPES[p.type]||TYPES.other,r=pinR();c.save();if(!bare)c.globalAlpha=opOf(p,true);const oo=!bare&&OFFMAP&&OFFMAP.get(p.id);if(oo)drawLeader(c,p.x,p.y,p.x+oo.dx,p.y+oo.dy,T.c);c.translate(p.x+(oo?oo.dx:0),p.y+(oo?oo.dy:0));if(CR)c.rotate(-CR);if(isFinite(p.ang)&&p.ang)c.rotate(p.ang);
 // s is kept for call-site compat; pin geometry is in plan points so it scales with view
 const sc=ST[p.status]||ST['not tested'];if(hl&&!bare){c.beginPath();c.arc(0,0,pinHalf(p)+5,0,7);c.fillStyle='rgba(56,189,248,.35)';c.fill()}
 c.fillStyle=T.c;c.strokeStyle=bare?'#fff':sc;c.lineWidth=bare?2:pinLW(p);pinFS(c,p);// bpm-v37: path=print size → gray outer = print+LW/2; bpm-v24+: shape+color only

 if(bare){c.restore();return}c.fillStyle=sc;c.strokeStyle='#fff';c.lineWidth=1.2;c.beginPath();{const[,pw,ph]=pshOf(p);c.arc(pw/2,-ph/2,2.5,0,7)}c.fill();c.stroke();
 if(p.address&&!nolab&&(!oo||!oo.cl||hl||view.s>=2.5)){c.globalAlpha=1;c.font=`10px sans-serif`;c.textAlign='left';c.lineWidth=2.5;c.lineJoin='round';c.strokeStyle='#fff';{const ax=pshOf(p)[1]/2+3;c.strokeText(p.address,ax,3);c.fillStyle='#111';c.fillText(p.address,ax,3)}}c.restore()}
function setT(c){const d=dpr(),s=view.s*d,e=view.x*d,f=view.y*d;
 if(VR===90)c.setTransform(0,s,-s,0,s*pageH+e,f);else if(VR===180)c.setTransform(-s,0,0,-s,s*pageW+e,s*pageH+f);else if(VR===270)c.setTransform(0,-s,s,0,e,s*pageW+f);else c.setTransform(s,0,0,s,e,f)}
function drawBase(){drawn={...view};cv.style.transform=ov.style.transform='';ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);if(!plan||!pageW)return;setT(ctx);
 ctx.fillStyle='#fff';ctx.fillRect(0,0,pageW,pageH);ctx.imageSmoothingQuality='high';if(bmp)ctx.drawImage(bmp,0,0,pageW,pageH);if(baseBm)ctx.drawImage(baseBm.c,0,0,pageW,pageH);if(tile)ctx.drawImage(tile.c,tile.x,tile.y,tile.c.width/tile.s,tile.c.height/tile.s)}
function drawOverlay(){CR=VR*Math.PI/180;try{drawOverlay0()}finally{CR=0}tedPos()}
function drawOverlay0(){const ctx=octx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ov.width,ov.height);if(!plan||!pageW)return;setT(ctx);
 for(const m of markups)if(m.page===page&&mVis(m)&&m.id!==ted?.id)drawMarkup(ctx,m,view.s);if(draft)drawMarkup(ctx,draft,view.s);
 if(sel&&sel.kind==='m'){const m=sel.o;ctx.save();ctx.setLineDash([6/view.s,4/view.s]);ctx.strokeStyle='#2563eb';ctx.lineWidth=1.5/view.s;const p=8/view.s;if(!isLine(m))ctx.strokeRect(Math.min(m.x1,m.x2)-p,Math.min(m.y1,m.y2)-p,Math.abs(m.x2-m.x1)+2*p,Math.abs(m.y2-m.y1)+2*p);
  ctx.setLineDash([]);ctx.fillStyle='#fff';ctx.lineWidth=2;for(const[hx,hy]of handles(m)){ctx.beginPath();ctx.arc(hx,hy,6,0,7);ctx.fill();ctx.stroke()}ctx.restore()}
 OFFMAP=SCRNOFF=pinOffsets([...pins.filter(p=>p.page===page&&pVis(p)),...(lay.ghosts?ghosts.filter(g=>g.page===page):[])]);for(const p of pins)if(p.page===page&&pVis(p))drawPinL(ctx,p,view.s,sel&&sel.o===p||msel.includes(p));drawMsel(ctx);if(lay.ghosts)drawGhosts(ctx);OFFMAP=null;if(walk?.p&&walk.p.page===page){ctx.save();ctx.strokeStyle='#38bdf8';ctx.lineWidth=3;ctx.beginPath();ctx.arc(walk.p.x,walk.p.y,pinR()*2.1,0,7);ctx.stroke();ctx.restore()}}
function draw(){drawBase();drawOverlay();updZoom()}
// during pan/pinch/wheel move the already-drawn canvases with a cheap CSS transform; repaint once the gesture pauses (150ms) or on release
let drawn=null,gTimer=0;function fastView(){if(drawn){const k=view.s/drawn.s,t=`translate(${view.x-drawn.x*k}px,${view.y-drawn.y*k}px) scale(${k})`;cv.style.transform=ov.style.transform=t}updZoom();clearTimeout(gTimer);gTimer=setTimeout(()=>{gTimer=0;requestDraw()},150);scheduleRender()}
let raf=0,rafB=0;function requestDraw(b=true){if(b)rafB=1;if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(rafB)drawBase();drawOverlay();rafB=0})}
// ---------- hit testing ----------
function hit(w){const tol=10/view.s,pr=Math.max(pinR()*1.4,16/view.s);for(const p of[...pins].reverse()){if(p.page!==page||!pVis(p))continue;const o=SCRNOFF&&SCRNOFF.get(p.id);if(o&&Math.hypot(p.x+o.dx-w.x,p.y+o.dy-w.y)<pr)return{kind:'p',o:p}}
 for(const p of[...pins].reverse())if(p.page===page&&pVis(p)&&Math.hypot(p.x-w.x,p.y-w.y)<pr*(SCRNOFF&&SCRNOFF.get(p.id)?.6:1))return{kind:'p',o:p};
 for(const m of[...markups].reverse()){if(m.page!==page||!mVis(m))continue;if(ZT.includes(m.type)){const P=zPts(m);for(let i=1;i<P.length;i++){const[ax,ay]=P[i-1],dx=P[i][0]-ax,dy=P[i][1]-ay,t=Math.max(0,Math.min(1,((w.x-ax)*dx+(w.y-ay)*dy)/((dx*dx+dy*dy)||1)));if(Math.hypot(ax+t*dx-w.x,ay+t*dy-w.y)<tol*1.4)return{kind:'m',o:m}}continue}if(isLine(m)){const dx=m.x2-m.x1,dy=m.y2-m.y1,t=Math.max(0,Math.min(1,((w.x-m.x1)*dx+(w.y-m.y1)*dy)/((dx*dx+dy*dy)||1)));if(Math.hypot(m.x1+t*dx-w.x,m.y1+t*dy-w.y)<tol*1.4)return{kind:'m',o:m};continue}const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),X=Math.max(m.x1,m.x2),Y=Math.max(m.y1,m.y2);if(w.x>x-tol&&w.x<X+tol&&w.y>y-tol&&w.y<Y+tol)return{kind:'m',o:m}}return null}
// ---------- input ----------
const ptrs=new Map();let gesture=null;
// bpm-v71: free draw by default; constrain (15° lines/arrows/zigzag, equal-ratio shapes) while the Snap toggle is on or Shift is held (v55 hold-tool-button removed)
let snapOn=false,shiftDn=false,lastTap=null;const snapK=()=>snapOn||shiftDn;
addEventListener('keydown',e=>{if(e.key==='Shift')shiftDn=true});addEventListener('keyup',e=>{if(e.key==='Shift')shiftDn=false});addEventListener('blur',()=>shiftDn=false);
function constrainPt(d,w){const dx=w.x-d.x1,dy=w.y-d.y1;if(d.type==='line'||d.type==='arrow'||d.type==='dim'){const L=Math.hypot(dx,dy),a=Math.round(Math.atan2(dy,dx)/(Math.PI/12))*(Math.PI/12);return{x:d.x1+L*Math.cos(a),y:d.y1+L*Math.sin(a)}}if(['rect','ellipse','cloud','check'].includes(d.type)){const m=Math.max(Math.abs(dx),Math.abs(dy));return{x:d.x1+(dx<0?-m:m),y:d.y1+(dy<0?-m:m)}}return w}
(function(){const b=$('#cSnap');if(!b)return;const sync=()=>{b.classList.toggle('on',snapOn);b.setAttribute('aria-pressed',snapOn?'true':'false');b.title=snapOn?'Snap ON: 15° lines/arrows/zigzag, equal-ratio shapes — tap to turn off':'Snap off (freeform) — tap for 15° angles / equal ratios (or hold Shift)'};sync();b.onclick=()=>{snapOn=!snapOn;sync()}})();
stage.addEventListener('pointerdown',e=>{if(!plan||e.target!==cv)return;stage.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
 if(ptrs.size===2){draft=null;const[a,b]=[...ptrs.values()];gesture={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}};return}
 const w=toW(e.offsetX,e.offsetY);const start={sx:e.offsetX,sy:e.offsetY,moved:false};
 if(tool==='pan'||e.button===1){gesture={type:'pan',...start,v:{...view}};return}
 if(tool==='select'){if(sel?.kind==='m'){const hi=handleHit(sel.o,e.offsetX,e.offsetY);if(hi>=0){gesture={type:'resize',h:hi,...start,orig:structuredClone(sel.o)};return}}
  {const h0=hit(w),onP=msel.filter(o=>o.page===page);if(h0&&msel.includes(h0.o)){sel=null;gesture={type:'mmove',...start,v:{...view},items:onP,orig:onP.map(o=>structuredClone(o)),tapO:h0.o};return}
   if(!h0&&boxOn){gesture={type:'box',...start,moved:false,w0:w,w1:w};showBox();return}
   if(multiOn){gesture=h0?{type:'mtap',...start,v:{...view},o:h0.o}:{type:'pan',...start,v:{...view}};return}}
  const prev=sel?.o;sel=hit(w);if(sel)gesture={type:'move',...start,w,orig:JSON.parse(JSON.stringify(sel.o)),wasSel:prev===sel.o};else gesture={type:'pan',...start,v:{...view}};requestDraw(false);
  const G0=gesture,hitO=sel?.o;clearTimeout(lpT);lpT=setTimeout(()=>{if(gesture!==G0||G0.moved||ptrs.size!==1)return;if(hitO){gesture=null;toggleMsel(hitO);if(navigator.vibrate)navigator.vibrate(20)}else{gesture={type:'box',...start,moved:false,w0:w,w1:w};showBox()}},450);return}
 if(tool==='pin'){gesture={type:'pin',...start,w};return}
 if(tool==='text'){gesture={type:'text',...start,w};return}
 if(tool==='measure'){if(MS.mode==='path'&&!MS.cal){gesture={type:'mpath',...start,w,v:{...view}};return}const p0=mSnap(w);draft={id:uid(),planId:plan.id,page,type:MS.cal?'cal':MS.mode==='area'?'darea':'dim',x1:p0.x,y1:p0.y,x2:p0.x,y2:p0.y,color:MS.cal?'#0ea5e9':$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};gesture={type:'draw',...start};mRead();return}
 if(tool==='zig'){const p=mkSnap(w);draft={id:uid(),planId:plan.id,page,type:'zig',x1:p.x,y1:p.y,x2:p.x,y2:p.y,rp:[[0,0],[0,0]],color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};gesture={type:'zig',...start,V:[[p.x,p.y]],R:[[p.x,p.y]]};return}
 {let p=w;if(['rect','ellipse','cloud','arrow','line','check'].includes(tool))p=mkSnap(w);draft={id:uid(),planId:plan.id,page,type:tool,x1:p.x,y1:p.y,x2:p.x,y2:p.y,color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};gesture={type:'draw',...start}}});
stage.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(!gesture)return;
 if(gesture.type==='pinch'&&ptrs.size>=2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=gesture,s=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s,x:c.x-wx*s,y:c.y-wy*s};fastView();return}
 const dx=e.offsetX-gesture.sx,dy=e.offsetY-gesture.sy;if(Math.hypot(dx,dy)>4)gesture.moved=true;
 if(gesture.type==='pan'){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;fastView()}
 else if(gesture.type==='mmove'){const ddx=dx/view.s,ddy=dy/view.s;gesture.items.forEach((o,i)=>{const g=gesture.orig[i];if('x1'in g){o.x1=g.x1+ddx;o.x2=g.x2+ddx;o.y1=g.y1+ddy;o.y2=g.y2+ddy}else{o.x=g.x+ddx;o.y=g.y+ddy}});requestDraw(false)}
 else if(gesture.type==='mtap'){if(gesture.moved){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;fastView()}}
 else if(gesture.type==='move'){const o=sel.o,g=gesture.orig;let ddx=dx/view.s,ddy=dy/view.s;if(sel.kind==='p'){o.x=g.x+ddx;o.y=g.y+ddy}else{const s=mkSnapMove(g,ddx,ddy,o);ddx=s.ddx;ddy=s.ddy;o.x1=g.x1+ddx;o.x2=g.x2+ddx;o.y1=g.y1+ddy;o.y2=g.y2+ddy}requestDraw(false)}
 else if(gesture.type==='resize'){resizeTo(sel.o,gesture.orig,gesture.h,mkSnap(toW(e.offsetX,e.offsetY),sel.o));requestDraw(false)}
 else if(gesture.type==='draw'){let w=toW(e.offsetX,e.offsetY);if(draft.type==='dim'||draft.type==='cal')w=mSnap(w,draft);else if(['rect','ellipse','cloud','arrow','line','check'].includes(draft.type))w=mkSnap(w,draft);if(snapK())w=constrainPt(draft,w);draft.x2=w.x;draft.y2=w.y;mRead();requestDraw(false)}
 else if(gesture.type==='zig'){zMove(gesture,toW(e.offsetX,e.offsetY));requestDraw(false)}
 else if(gesture.type==='mpath'){if(gesture.moved){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;fastView()}else{MS.hover=toW(e.offsetX,e.offsetY)}}
 else if(gesture.type==='box'){gesture.w1=toW(e.offsetX,e.offsetY);showBox()}});
async function up(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);clearTimeout(lpT);const g=gesture;if(g?.type==='pinch'){if(ptrs.size===0){gesture=null;requestDraw()}return}gesture=null;if(!g)return;if(g.type==='pan')requestDraw();
 const w=toW(e.offsetX,e.offsetY);
 if(!g.moved){const now=Date.now(),T=lastTap;lastTap={t:now,x:e.offsetX,y:e.offsetY};if(T&&now-T.t<350&&Math.hypot(e.offsetX-T.x,e.offsetY-T.y)<30){lastTap=null;draft=null;sel=null;msel=[];renderSelBar();draw();return}}else lastTap=null;
 if(g.type==='box'){boxSelect(g.w0,g.w1);return}
 if(g.type==='mmove'){if(g.moved){const L=g.items.map((o,i)=>({store:'x1'in o?'markups':'pins',id:o.id,before:g.orig[i],after:structuredClone(o)}));await changeMulti(L);toast(`Moved ${L.length} item${L.length>1?'s':''}`,true)}else toggleMsel(g.tapO);return}
 if(g.type==='mtap'){if(!g.moved)toggleMsel(g.o);else requestDraw();return}
 if(pasteArm&&!g.moved&&g.type!=='pinch'){pasteArm=false;draft=null;await doPaste(w);return}
 if(tool==='select'&&!g.moved&&g.type==='pan'&&msel.length&&!multiOn){msel=[];renderSelBar();requestDraw(false)}
 if(!g.moved&&(g.type==='pan'||g.type==='move')){const gh=ghostHit(w);if(gh&&!(g.type==='move'&&g.wasSel)){sel=null;openGhost(gh);return}const h=hit(w);if(h&&h.kind==='p'){if(walk&&walk.p?.id!==h.o.id){walk.skip.delete(h.o.id);walkGo(h.o);toast('Walk: jumped to this device');return}openPin(h.o);return}}
 if(!g.moved&&(g.type==='resize'||g.type==='move'&&g.wasSel)&&sel?.o.type==='text'){inlineText(sel.o);return}
 if((g.type==='move'||g.type==='resize')&&g.moved&&sel)await change(sel.kind==='p'?'pins':'markups',g.orig,sel.o);
 if(g.type==='text'&&!g.moved){inlineText(null,g.w)}
 if(g.type==='pin'){const p={id:uid(),planId:plan.id,page,x:g.w.x,y:g.w.y,type:$('#pinType').value,address:'',loop:'',status:'not tested',notes:'',created:Date.now(),opacity:toolOp(true)};await change('pins',null,p);quickChip(pins.find(x=>x.id===p.id))} // bpm-v86: quick-place: no form, Edit chip
 if(g.type==='mpath'){if(g.moved){requestDraw();return}await mPathTap(mSnap(w));return}
 if(g.type==='zig'){const d=draft;draft=null;const V=g.V.slice();if(g.tip)V.push(g.tip);if(V.length>1&&Math.hypot(V[V.length-1][0]-V[0][0],V[V.length-1][1]-V[0][1])+(V.length-2)>3/view.s){zFinish(d,V);await change('markups',null,d)}else drawOverlay();return}
 if(g.type==='draw'&&draft?.type==='cal'){const d=draft;draft=null;drawOverlay();await mCalibrate(d);return}
 if(g.type==='draw'){const d=draft;draft=null;if(d.type==='check'&&!g.moved){const s=24/view.s;d.x1=w.x-s*.4;d.y1=w.y-s*.6;d.x2=w.x+s*.6;d.y2=w.y+s*.4}
  if(Math.abs(d.x2-d.x1)+Math.abs(d.y2-d.y1)>3/view.s)await change('markups',null,d);else drawOverlay()}}
// bpm-v71: zigzag corners = RDP-simplified stroke (tolerance in screen px), then keep only real turns (≥28°) between segments ≥ min length; Snap rounds each segment to 15°
function zSeg(a,p){const dx=p[0]-a[0],dy=p[1]-a[1],L=Math.hypot(dx,dy),t=Math.round(Math.atan2(dy,dx)/(Math.PI/12))*(Math.PI/12);return[a[0]+L*Math.cos(t),a[1]+L*Math.sin(t)]}
function rdp(P,eps){if(P.length<3)return P.slice();const A=P[0],B=P[P.length-1],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy);let bi=0,bd=-1;for(let i=1;i<P.length-1;i++){const q=P[i],d=L?Math.abs((q[0]-A[0])*dy-(q[1]-A[1])*dx)/L:Math.hypot(q[0]-A[0],q[1]-A[1]);if(d>bd){bd=d;bi=i}}if(bd<=eps)return[A,B];return[...rdp(P.slice(0,bi+1),eps).slice(0,-1),...rdp(P.slice(bi),eps)]}
function zCorners(P,s){const eps=7/s,minL=16/s,minA=28*Math.PI/180;let V=rdp(P,eps);
 const turn=(a,b,c)=>{const u=Math.atan2(b[1]-a[1],b[0]-a[0]),v=Math.atan2(c[1]-b[1],c[0]-b[0]);let d=Math.abs(v-u)%(2*Math.PI);return d>Math.PI?2*Math.PI-d:d},len=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
 for(;;){if(V.length<3)break;let wi=-1,ws=Infinity;for(let i=1;i<V.length-1;i++){const t=turn(V[i-1],V[i],V[i+1]),l=Math.min(len(V[i-1],V[i]),len(V[i],V[i+1]));const bad=t<minA||l<minL;if(bad){const sc=t/minA+l/minL;if(sc<ws){ws=sc;wi=i}}}if(wi<0)break;V.splice(wi,1)}
 return V}
function zMove(g,w){const p=[w.x,w.y],Rw=g.R,q=Rw[Rw.length-1];if(Math.hypot(p[0]-q[0],p[1]-q[1])>.5/view.s)Rw.push(p);
 let V=zCorners([...Rw,p],view.s);V[0]=Rw[0];if(snapK()){const S=[V[0]];for(let i=1;i<V.length;i++)S.push(zSeg(S[i-1],V[i]));V=S}else{const sp=mkSnap({x:p[0],y:p[1]},draft);V[V.length-1]=[sp.x,sp.y]}
 g.V=V.slice(0,-1);g.tip=V[V.length-1];zFinish(draft,V);mRead()}
stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
const clampS=s=>Math.max(.02,Math.min(s,40));
stage.addEventListener('wheel',e=>{if(!plan)return;e.preventDefault();const k=Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)),s=clampS(view.s*k),wx=(e.offsetX-view.x)/view.s,wy=(e.offsetY-view.y)/view.s;view={s,x:e.offsetX-wx*s,y:e.offsetY-wy*s};fastView()},{passive:false});
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tool=b.dataset.t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));if(tool!=='select'){sel=null;draw()}if(tool==='pin'){$('#opac').value=50;opacLbl()}else if(tool!=='select'&&tool!=='pan'){$('#opac').value=80;opacLbl()}});
(function(){const b=$('#mkSnap');if(!b)return;const sync=()=>{b.classList.toggle('on',MK_SNAP);b.title=MK_SNAP?'Snap markups on — click to free-place':'Snap off — click to snap together';b.setAttribute('aria-pressed',MK_SNAP?'true':'false')};sync();b.onclick=()=>{MK_SNAP=!MK_SNAP;sync();put('meta',MK_SNAP,'mksnap')};get('meta','mksnap').then(v=>{if(v===true||v===false){MK_SNAP=v;sync()}}).catch(()=>{})})();
async function deleteSel(){if(msel.length)return bulkDelete();if(!sel)return;const o=sel.o,k=sel.kind;sel=null;if(o.planId!==plan?.id)return;if(k==='p')await deletePin(o);else await change('markups',o,null);draw()}
$('#del').onclick=deleteSel;document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||dlg.open)return;if(e.key==='Delete'||e.key==='Backspace')deleteSel();else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}});
const SZ=[2,3,5,8],SZT=[12,18,28,40];
const toolOp=isPin=>clampOp((+$('#opac').value|| (isPin?50:80))/100);
function opacLbl(){const v=+$('#opac').value;$('#opacLbl').textContent=v+'%'}
function syncOpacFromSel(){const o=sel?.o||(msel.length===1?msel[0]:null);if(!o)return;const isP=pins.includes(o);$('#opac').value=Math.round(opOf(o,isP)*100);opacLbl()}
$('#color').onchange=async e=>{if(sel?.kind==='m'&&sel.o.color!==e.target.value){const b=structuredClone(sel.o);await change('markups',b,{...b,color:e.target.value})}};
$('#size').onchange=async e=>{if(sel?.kind!=='m')return;const b=structuredClone(sel.o),i=+e.target.value;await change('markups',b,b.type==='text'?textBox({...b,fs:SZT[i]/view.s}):{...b,w:SZ[i]})};
let opacT=0;$('#opac').oninput=()=>{opacLbl();clearTimeout(opacT);opacT=setTimeout(applyOpac,120)};
async function applyOpac(){const v=toolOp(sel?.kind==='p'||(msel[0]&&pins.includes(msel[0])));
 if(msel.length){const L=[];for(const o of msel){const isP=pins.includes(o),b=structuredClone(o);if(Math.abs(opOf(b,isP)-v)<.005)continue;L.push({store:isP?'pins':'markups',id:o.id,before:b,after:{...b,opacity:v}})}if(L.length)await changeMulti(L);renderSelBar();return}
 if(!sel)return;const isP=sel.kind==='p',b=structuredClone(sel.o);if(Math.abs(opOf(b,isP)-v)<.005)return;await change(isP?'pins':'markups',b,{...b,opacity:v})}
// when selecting, show that item's opacity on the slider
const _hitSel=()=>setTimeout(syncOpacFromSel,0);stage.addEventListener('pointerup',_hitSel);
// ---------- undo / redo (per plan, this session) ----------
const hist={};const H=()=>hist[plan.id]||(hist[plan.id]={u:[],r:[]});
async function applyState(store,id,o,media){const arr=store==='pins'?pins:markups,i=arr.findIndex(x=>x.id===id);
 if(o){o=structuredClone(o);if(i>=0)arr[i]=o;else arr.push(o);await put(store,o);if(media)for(const m of media)await put('media',m);if(sel?.o.id===id)sel.o=o;return o}
 if(i>=0)arr.splice(i,1);if(sel?.o.id===id)sel=null;await del(store,id);if(store==='pins')for(const m of await byIdx('media','pinId',id))await del('media',m.id)}
async function change(store,before,after,media){if(!plan)return;const id=(after||before).id;await applyState(store,id,after);const h=H();h.u.push({store,id,before:before&&structuredClone(before),after:after&&structuredClone(after),media});if(h.u.length>300)h.u.shift();h.r=[];afterChange()}
async function undo(){if(!plan)return;const h=H(),op=h.u.pop();if(!op)return;if(op.multi){for(const b of op.multi.slice().reverse())await applyState(b.store,b.id,b.before,b.media)}else if(op.batch){for(const b of op.batch)await applyState(op.store,b.id,b.before);if(op.ghosts)ghosts.push(...structuredClone(op.ghosts))}else await applyState(op.store,op.id,op.before,op.media);h.r.push(op);afterChange()}
async function redo(){if(!plan)return;const h=H(),op=h.r.pop();if(!op)return;if(op.multi){for(const b of op.multi)await applyState(b.store,b.id,b.after)}else if(op.batch){for(const b of op.batch)await applyState(op.store,b.id,b.after);if(op.ghosts){const ids=new Set(op.ghosts.map(g=>g.id));ghosts=ghosts.filter(g=>!ids.has(g.id))}}else await applyState(op.store,op.id,op.after);h.u.push(op);afterChange()}
async function changeMulti(list){if(!plan||!list.length)return;for(const b of list)await applyState(b.store,b.id,b.after);const h=H();h.u.push({multi:list.map(b=>({...b,before:b.before&&structuredClone(b.before),after:b.after&&structuredClone(b.after)}))});if(h.u.length>300)h.u.shift();h.r=[];afterChange()}
async function changeBatch(store,afters,gh){if(!plan||!afters.length)return;for(const a of afters)await applyState(store,a.id,a);const h=H();h.u.push({store,batch:afters.map(a=>({id:a.id,before:null,after:structuredClone(a)})),ghosts:gh&&structuredClone(gh)});if(h.u.length>300)h.u.shift();h.r=[];afterChange()}
function updUR(){const h=plan&&hist[plan.id];$('#undo').disabled=!h?.u.length;$('#redo').disabled=!h?.r.length}
function afterChange(){if(msel.length)msel=msel.map(o=>pins.find(p=>p.id===o.id)||markups.find(m=>m.id===o.id)).filter(Boolean);updUR();draw();renderList();renderGhostBar();if(plan)fillPageSel(null)}
$('#undo').onclick=undo;$('#redo').onclick=redo;
// ---------- pin dialog ----------
const dlg=$('#pinDlg'),form=$('#pinForm');let cur=null,urls=[];
for(const[k,t]of Object.entries(TYPES)){$('#pinType').add(new Option(t.n,k));$('#dType').add(new Option(t.n,k));$('#fType').add(new Option(t.n,k))}
const PK=['type','address','model','location','status','notes','reason','reasonText','severity'];
let ckl=[];async function openPin(p){cur=p;modelOpts(p.type);if(!Array.isArray(cur.codes))cur.codes=[];for(const k of PK)form.elements[k].value=p[k]||(k==='severity'?'Non-critical':'');autoR=false;ckl=structuredClone(p.checks||checkItems(p.type));renderChecks();failUI();rtUpd();renderCodes();$('#testedInfo').textContent=testedTxt(p);await showMedia();dlg.showModal()}
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
function failUI(){$('#failBox').hidden=form.elements.status.value!=='failed';if(!$('#failBox').hidden){codeHintUpd();suggestCodes()}}form.elements.status.addEventListener('change',failUI);form.elements.severity.addEventListener('change',codeHintUpd);
const CV={pass:'Pass',fail:'Fail',na:'N/A'};let autoR=false;const rtUpd=()=>{$('#reasonTextL').hidden=form.elements.reason.value!=='Other'};form.elements.reason.addEventListener('change',()=>{autoR=false;rtUpd();suggestCodes();codeHintUpd()});form.elements.reasonText.addEventListener('input',()=>autoR=false);
function renderChecks(){const n=ckl.filter(c=>c.v).length;$('#ckHead').textContent=`Checklist ${n}/${ckl.length}`;
 $('#checks').innerHTML=ckl.map((c,i)=>`<div class="ck ck-${c.v||'none'}"><span>${esc(c.t)}</span><span class="seg">${Object.entries(CV).map(([v,l])=>`<button type="button" data-i="${i}" data-v="${v}" class="${c.v===v?'on '+v:''}">${l}</button>`).join('')}</span></div>`).join('')}
function checksChanged(){const st=autoStatus(ckl);form.elements.status.value=st;
 if(st==='failed'&&(!form.elements.reason.value||autoR)){const f=ckl.filter(c=>c.v==='fail').map(c=>c.t);form.elements.reason.value=reasonFor(f[0]);rtUpd();if(!form.elements.reasonText.value||autoR)form.elements.reasonText.value='Failed: '+f.join('; ');autoR=true}
 failUI();renderChecks()}
$('#checks').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;const c=ckl[+b.dataset.i];c.v=c.v===b.dataset.v?'':b.dataset.v;checksChanged()});
$('#passAll').onclick=()=>{for(const c of ckl)if(!c.v)c.v='pass';checksChanged()};
form.elements.type.addEventListener('change',()=>{modelOpts(form.elements.type.value);if(!ckl.some(c=>c.v)){ckl=checkItems(form.elements.type.value);renderChecks()}});
form.addEventListener('submit',async e=>{if(e.submitter?.value!=='save')return;
 if(form.elements.status.value==='failed'&&!form.elements.reason.value){e.preventDefault();alert('Pick a fail reason for this failed device.');form.elements.reason.focus();return}
 if(form.elements.status.value==='failed'&&form.elements.severity.value==='Critical'&&!(cur.codes&&cur.codes.length)){e.preventDefault();if(confirm('Critical deficiency needs a code reference. Open the code picker?'))openCodePicker();else alert('Add at least one code reference for a Critical deficiency.');return}
 dlgSave=(async()=>{const b=structuredClone(cur),a={...b};for(const k of PK)a[k]=form.elements[k].value;if(ckl.some(c=>c.v)||b.checks)a.checks=structuredClone(ckl);if(a.status!=='failed'){a.reason='';a.reasonText='';a.severity='';delete a.codes}else if(cur.codes?.length)a.codes=structuredClone(cur.codes);else delete a.codes
 if(a.status!==b.status){a.testedAt=Date.now();a.tester=await getTester()}if(b.fp&&a.type!==b.type){const ng=groupFor(a.type,b.detG);a.detG=ng;learn(b.fp,ng)}if(a.model)rememberModel(a.type,a.model);if(JSON.stringify(a)!==JSON.stringify(b))await change('pins',b,a);cur=pins.find(x=>x.id===a.id)})()});
// bpm-v66: wait for the async Save to land before the walk re-reads the pin (it used to re-render with the pre-save pin)
let dlgSave=null;dlg.addEventListener('close',()=>{if(rec)rec.stop();const w=dlgSave;dlgSave=null;Promise.resolve(w).catch(()=>{}).then(()=>{if(walk)setTimeout(walkAfterDialog,0)})});
$('#pinDel').onclick=async()=>{if(!confirm('Delete this pin and its media?'))return;await deletePin(cur);dlg.close()};
async function deletePin(p){await change('pins',p,null,await byIdx('media','pinId',p.id))}
// ---------- list ----------
$('#listBtn').onclick=()=>{$('#panel').hidden=!$('#panel').hidden;renderList()};$('#closeList').onclick=()=>$('#panel').hidden=true;
['#q','#fType','#fStat','#fLoop','#allPages'].forEach(s=>$(s).oninput=renderList);
function renderList(){if($('#panel').hidden)return;const q=$('#q').value.toLowerCase(),ft=$('#fType').value,fs=$('#fStat').value,fl=$('#fLoop').value,ap=$('#allPages').checked;
 const loops=[...new Set(pins.map(p=>p.loop||''))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));$('#fLoop').innerHTML='<option value="">All loops</option>'+loops.map(l=>`<option value="${esc(l||'\u2205')}">${l?'Loop '+esc(l):'No loop'}</option>`).join('');$('#fLoop').value=loops.includes(fl==='\u2205'?'':fl)?fl:'';
 renderSummary();renderCounts();if($('#panel').classList.contains('defmode'))renderDefs();
 const L=pins.filter(p=>(ap||p.page===page)&&(!ft||p.type===ft)&&(!fs||p.status===fs)&&(!fl||(p.loop||'\u2205')===fl)&&(!q||[p.address,p.loop,p.location,p.notes,TYPES[p.type]?.n].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.page-b.page||String(a.address).localeCompare(b.address,undefined,{numeric:true}));
 $('#pinList').innerHTML=L.map(p=>`<li data-id="${p.id}"><span class="dot" style="background:${TYPES[p.type].c}"></span><div><b>${esc(TYPES[p.type].n)}</b> ${esc(p.address)}${p.loop?' · Loop '+esc(p.loop):''}${p.location?' · '+esc(p.location):''}<br><small class="st-${p.status.split(' ')[0]}">${p.status}</small> <small>pg ${p.page}${p.testedAt?' · '+esc(fmtT(p.testedAt))+(p.tester?' · '+esc(p.tester):''):''}</small></div></li>`).join('')||'<li>No pins</li>';
 $('#pinList').querySelectorAll('li[data-id]').forEach(li=>li.onclick=()=>jumpTo(plan.id,li.dataset.id))}
async function jumpTo(planId,pinId){if(plan?.id!==planId){const p0=await get('pins',pinId);await openPlan(planId,p0?.page||1)}const p=pins.find(x=>x.id===pinId);if(!p)return;if(p.page!==page)await gotoPage(p.page);
 const s=Math.max(view.s,1.5/dpr()*2);centerOn(p.x,p.y,s,stage.clientWidth/2,stage.clientHeight/2);sel={kind:'p',o:p};draw();scheduleRender();if(innerWidth<700)$('#panel').hidden=true}
// ---------- project-wide data: deficiencies + device counts ----------
async function projData(){const pls=(await all('plans')).filter(p=>p.projectId===project?.id).sort((a,b)=>a.added-b.added),out=[];for(const pl of pls)out.push({pl,pins:pl.id===plan?.id?pins.slice():await byIdx('pins','planId',pl.id)});return out}
const plName=pl=>pl.name.replace(/\.[^.]+$/,'');
async function firstPhoto(pinId){const ms=(await byIdx('media','pinId',pinId)).filter(m=>m.kind==='photo').sort((a,b)=>a.created-b.created);return ms[0]?photoBlob(ms[0]):null}
let defUrls=[];
async function renderDefs(){const D=await projData(),items=[];for(const{pl,pins:ps}of D)for(const p of ps)if(p.status==='failed')items.push({pl,p});
 items.sort((a,b)=>(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1)||a.pl.added-b.pl.added||String(a.p.address).localeCompare(b.p.address,undefined,{numeric:true}));
 defUrls.forEach(URL.revokeObjectURL);defUrls=[];const html=[];
 for(const{pl,p}of items){const ph=await firstPhoto(p.id);let img='';if(ph){const u=URL.createObjectURL(ph);defUrls.push(u);img=`<img class="thumb" src="${u}">`}
  html.push(`<li data-pl="${pl.id}" data-id="${p.id}">${img||'<span class="thumb"></span>'}<div><b class="${p.severity==='Critical'?'st-failed':''}">${esc(p.severity||'—')}</b> · ${esc(TYPES[p.type]?.n||p.type)} ${esc(p.address)}${p.loop?' · Loop '+esc(p.loop):''}${p.location?' · '+esc(p.location):''}<br>${esc(p.reason||'no reason')}${p.reasonText?': '+esc(p.reasonText):''}${p.notes?'<br><small>'+esc(p.notes)+'</small>':''}${p.codes?.length?'<br><small style="color:#fbbf24">'+esc(fmtCodes(p.codes))+'</small>':''}<br><small>${esc(plName(pl))} pg ${p.page}${p.testedAt?' · '+esc(fmtT(p.testedAt)):''}${p.tester?' · '+esc(p.tester):''}</small></div></li>`)}
 $('#defList').innerHTML=html.join('')||'<li>No deficiencies (no failed devices) in this project</li>';$('#defCount').textContent=items.length;
 $('#defList').querySelectorAll('li[data-id]').forEach(li=>li.onclick=()=>jumpTo(li.dataset.pl,li.dataset.id));return items}
function setMode(def){$('#panel').classList.toggle('defmode',def);$('#modePins').classList.toggle('on',!def);$('#modeDefs').classList.toggle('on',def);if(def)renderDefs();else renderList()}
$('#modePins').onclick=()=>setMode(false);$('#modeDefs').onclick=()=>setMode(true);
function csvDl(rows,name){const cell=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};dl(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv'}),project.name.replace(/[\\/:*?"<>|]/g,'_')+name)}
$('#defCsv').onclick=async()=>{const items=await renderDefs();csvDl([['plan','page','type','address','loop','location','severity','reason','reason detail','codes','notes','tested','tester']].concat(items.map(({pl,p})=>[pl.name,p.page,TYPES[p.type]?.n||p.type,p.address,p.loop,p.location||'',p.severity,p.reason,p.reasonText,fmtCodes(p.codes),p.notes,p.testedAt?fmtT(p.testedAt):'',p.tester||''])),'-deficiencies.csv')};
function blobJpeg(b,max=900){return new Promise((res,rej)=>{const u=URL.createObjectURL(b),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);res({d:c.toDataURL('image/jpeg',.85),w:c.width,h:c.height})};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('bad image'))};im.src=u})}
$('#defPdf').onclick=async()=>{busy(1,'Exporting');try{const items=await renderDefs();const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});doc.setFontSize(16);doc.text(`Deficiencies - ${project.name}`,40,44);doc.setFontSize(10);
 doc.text(`${items.length} failed device(s) · ${items.filter(i=>i.p.severity==='Critical').length} critical · generated ${fmtT(Date.now())}`,40,62);let y=84;
 for(const{pl,p}of items){const ph=await firstPhoto(p.id);let im=null;if(ph)try{im=await blobJpeg(ph)}catch{}const ih=im?Math.min(200,im.h*(220/im.w)):0,need=Math.max(ih,70)+18;if(y+need>760){doc.addPage();y=44}
  doc.setFontSize(12);doc.setTextColor(p.severity==='Critical'?185:0,0,0);doc.text(`${p.severity||'-'}: ${TYPES[p.type]?.n||p.type} ${p.address||''}${p.loop?' (Loop '+p.loop+')':''}${p.location?' @ '+p.location:''}`,40,y+12);doc.setTextColor(0,0,0);doc.setFontSize(10);
  const lines=doc.splitTextToSize([`Reason: ${p.reason||'-'}${p.reasonText?' - '+p.reasonText:''}`,p.codes?.length?`Codes: ${fmtCodes(p.codes)}`:'',`Plan: ${pl.name}, page ${p.page}`,`Tested: ${p.testedAt?fmtT(p.testedAt):'-'}${p.tester?' by '+p.tester:''}`,p.notes?`Notes: ${p.notes}`:''].filter(Boolean).join('\n'),im?280:530);doc.text(lines,40,y+28);
  if(im)doc.addImage(im.d,'JPEG',330,y,220,ih);y+=need;doc.setDrawColor(200);doc.line(40,y-6,572,y-6)}
 dl(doc.output('blob'),project.name.replace(/[\\/:*?"<>|]/g,'_')+'-deficiencies.pdf')}catch(e){showErr('Deficiency PDF failed: '+e.message)}finally{busy(0)}};
function countRows(D){const T=Object.keys(TYPES),blk=ps=>T.map(t=>{const a=ps.filter(p=>p.type===t),te=a.filter(p=>p.status==='passed'||p.status==='failed').length,ip=a.filter(p=>p.status==='in progress').length;return{t,n:a.length,te,ip,un:a.length-te-ip}}).filter(r=>r.n);
 return{plans:D.map(({pl,pins:ps})=>({pl,rows:blk(ps)})),total:blk(D.flatMap(d=>d.pins))}}
async function renderCounts(){const PD=await projData();$('#defCount').textContent=PD.flatMap(d=>d.pins).filter(p=>p.status==='failed').length||'';const C=countRows(PD),open=$('#counts').open;const tr=(r)=>`<tr><td>${esc(TYPES[r.t].n)}</td><td>${r.n}</td><td class="st-passed">${r.te}</td><td class="st-in">${r.ip}</td><td class="st-not">${r.un}</td></tr>`,sum=rs=>rs.reduce((a,r)=>[a[0]+r.n,a[1]+r.te,a[2]+r.ip,a[3]+r.un],[0,0,0,0]);
 const t=sum(C.total);$('#counts').innerHTML=`<summary><b>Device counts</b> · project ${t[0]} (${t[1]} tested, ${t[2]} in progress, ${t[3]} untested)</summary><table><tr><th></th><th>#</th><th>tested</th><th>in prog.</th><th>untested</th></tr>${C.plans.filter(b=>b.rows.length).map(b=>`<tr><th colspan="5">${esc(plName(b.pl))}</th></tr>${b.rows.map(tr).join('')}`).join('')}<tr><th colspan="5">Project total</th></tr>${C.total.map(tr).join('')}<tr><td><b>All devices</b></td>${t.map(v=>`<td><b>${v}</b></td>`).join('')}</tr></table>`;$('#counts').open=open;return C}
$('#countCsv').onclick=async()=>{const C=await renderCounts(),rows=[['plan','type','total','tested','in progress','untested']];for(const b of C.plans)for(const r of b.rows)rows.push([b.pl.name,TYPES[r.t].n,r.n,r.te,r.ip,r.un]);for(const r of C.total)rows.push(['PROJECT TOTAL',TYPES[r.t].n,r.n,r.te,r.ip,r.un]);csvDl(rows,'-device-counts.csv')};
const cntSt=a=>{const c={passed:0,failed:0,ip:0,nt:0};for(const p of a)p.status==='passed'?c.passed++:p.status==='failed'?c.failed++:p.status==='in progress'?c.ip++:c.nt++;c.t=a.length;c.pct=c.t?Math.round((c.passed+c.failed)*100/c.t):0;return c};
function renderSummary(){ // bpm-v35: progress = pass, fail, total, left, %
 const c={passed:0,failed:0};for(const p of pins)p.status==='passed'?c.passed++:p.status==='failed'?c.failed++:0;c.t=pins.length;c.left=c.t-c.passed-c.failed;c.pct=c.t?Math.round((c.passed+c.failed)*100/c.t):0;
 const open=$('#sum').open;
 $('#sum').innerHTML=`<summary><b>${c.pct}%</b> · <span class="st-passed">${c.passed} pass</span> · <span class="st-failed">${c.failed} fail</span> · ${c.t} total · ${c.left} left</summary>`;
 $('#sum').open=open}
$('#testerBtn').onclick=()=>getTester(true);
$('#csvBtn').onclick=async()=>{if(!project)return;const rows=[['plan','page','type','address','loop','model','location','status','tested','tester','notes']];
 for(const pl of(await all('plans')).filter(p=>p.projectId===project.id).sort((a,b)=>a.added-b.added))for(const p of(await byIdx('pins','planId',pl.id)).sort((a,b)=>a.page-b.page||String(a.address).localeCompare(b.address,undefined,{numeric:true})))
  rows.push([pl.name,p.page,TYPES[p.type]?.n||p.type,p.address,p.loop,p.model||'',p.location||'',p.status,p.testedAt?fmtT(p.testedAt):'',p.tester||'',p.notes]);
 const cell=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
 dl(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv'}),project.name.replace(/[\\/:*?"<>|]/g,'_')+'-devices.csv')};
// ---------- export ----------
function drawLegend(x,ps,PP,PH){const pp=PP||pins.filter(p=>p.page===page&&(!lay.exp||pVis(p)));if(!pp.length)return;const pageH=PH||curPH();const types=[...new Set(pp.map(p=>p.type))],sts=STATUSES.filter(s=>pp.some(p=>(p.status||'not tested')===s));
 const u=1/ps,row=26*u,pad=10*u,rows=1+types.length+sts.length,w=190*u,h=pad*2+rows*row,X=12*u,Y=pageH-h-12*u;
 x.save();x.fillStyle='rgba(255,255,255,.93)';x.strokeStyle='#334155';x.lineWidth=1.5*u;x.fillRect(X,Y,w,h);x.strokeRect(X,Y,w,h);x.fillStyle='#111';x.font=`bold ${13*u}px sans-serif`;x.textBaseline='middle';x.textAlign='left';x.fillText('Legend',X+pad,Y+pad+row/2);
 let y=Y+pad+row*1.5;for(const t of types){drawPin(x,{type:t,x:X+pad+14*u,y},ps,false,true);x.fillStyle='#111';x.font=`${12*u}px sans-serif`;x.textAlign='left';x.textBaseline='middle';x.fillText(TYPES[t]?.n||t,X+pad+34*u,y);y+=row}
 for(const s of sts){x.fillStyle=ST[s];x.strokeStyle='#fff';x.lineWidth=2*u;x.beginPath();x.arc(X+pad+14*u,y,6*u,0,7);x.fill();x.stroke();x.fillStyle='#111';x.font=`${12*u}px sans-serif`;x.textAlign='left';x.fillText('Status: '+s,X+pad+34*u,y);y+=row}x.restore()}
async function composite(){const sc=Math.min(3,Math.sqrt(30e6/(pageW*pageH)));const c=document.createElement('canvas');c.width=Math.round(pageW*sc);c.height=Math.round(pageH*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(pdf){const pg=await pdf.getPage(page);await pg.render({canvasContext:x,viewport:pg.getViewport({scale:sc})}).promise}else x.drawImage(bmp,0,0,c.width,c.height);
 x.setTransform(sc,0,0,sc,0,0);const ps=1/Math.max(1,Math.max(pageW,pageH)/1200);const E=lay.exp;for(const m of markups)if(m.page===page&&(!E||mVis(m)))drawMarkup(x,m,1/1.5);OFFMAP=pinOffsets(pins.filter(p=>p.page===page&&(!E||pVis(p))));for(const p of pins)if(p.page===page&&(!E||pVis(p)))(E?drawPinL:drawPin)(x,p,ps,false);OFFMAP=null;drawLegend(x,ps);return c}
const base=()=>`${plan.name.replace(/\.[^.]+$/,'')}-p${page}`;
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
$('#exPng').onclick=async()=>{if(!plan)return;busy(1,'Exporting');try{const c=await composite();await new Promise(r=>c.toBlob(b=>{dl(b,base()+'.png');r()},'image/png'))}catch(e){showErr('PNG export failed: '+e.message)}finally{busy(0)}};
$('#exPdf').onclick=async()=>{if(!plan)return;busy(1,'Exporting');prog(0);try{
 const r=await exportPlanPdf(plan,markups,pins,lay,(i,n)=>prog(i/Math.max(1,n)));
 const blob=new Blob([await r.doc.save()],{type:'application/pdf'});
 const {jsPDF}=window.jspdf;const list=new jsPDF({unit:'pt',format:'letter'});let y=40;const ps=pins.filter(p=>p.page===page&&(!lay.exp||pVis(p)));
 list.setFontSize(14);list.text(`Device list - ${plan.name} page ${page}`,40,y);y+=20;list.setFontSize(10);
 for(const p of ps){if(y>760){list.addPage();y=40}list.text(`${TYPES[p.type].n}${p.model?' '+p.model:''} | Addr ${p.address||'-'} | Loop ${p.loop||'-'}${p.location?' | '+p.location:''} | ${p.status}${p.testedAt?' '+fmtT(p.testedAt):''}${p.tester?' by '+p.tester:''}${p.notes?' | '+p.notes.slice(0,50):''}${p.codes?.length?' | '+fmtCodes(p.codes):''}`.slice(0,120),40,y);y+=16}
 const C=countRows(await projData());if(C.total.length){list.addPage();list.setFontSize(14);list.text(`Device counts - ${project.name}`,40,40);pdfCounts(list,C,64)}
 const out=ps.length||C.total.length?await mergePdfBlobs([blob,list.output('blob')]):blob;
 window.__lastPlanPdf=out;dl(out,base()+'.pdf');toast('PDF exported (selectable plan text where the source has a text layer)')}
 catch(e){showErr('PDF export failed: '+e.message)}finally{busy(0)}};

// ---------- projects ----------
async function refreshProjects(){const ps=(await all('projects')).sort((a,b)=>a.created-b.created);$('#projSel').innerHTML=ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');if(project)$('#projSel').value=project.id;return ps}
function closePlan(){PCACHE.clear();if(det)cancelDetect();ghosts=[];renderGhostBar();stopAll();if(pdf){pdf.destroy();pdf=null}plan=null;markups=[];pins=[];updUR();pageW=pageH=0;bmp=baseBm=tile=null;bmpScale=0;sel=null;$('#pageSel').innerHTML='';$('#empty').hidden=false;draw();renderList()}
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
(async()=>{resize();try{await migratePanels()}catch(e){console.info('panel migration skipped',e)}await loadProject(await get('meta','project'))})();

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
  doc.setFont(undefined,'bold');L(`${p.severity||'-'}: ${TYPES[p.type]?.n||p.type} ${p.address||''}${p.loop?' (Loop '+p.loop+')':''}${p.location?' @ '+p.location:''}`,40,p.severity==='Critical'?[185,28,28]:null);doc.setFont(undefined,'normal');
  L(`Reason: ${p.reason||'-'}${p.reasonText?' - '+p.reasonText:''}`,48);if(p.codes?.length)L(`Codes: ${fmtCodes(p.codes)}`,48,[180,83,9]);L(`${pl.name} pg ${p.page} · ${p.testedAt?fmtT(p.testedAt):'-'}${p.tester?' · '+p.tester:''}${p.notes?' · '+p.notes:''}`,48);
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
$('#checkCsv').onclick=async()=>{const rows=[['plan','page','type','address','loop','location','status','item','result','tested','tester']];
 for(const{pl,pins:ps}of await projData())for(const p of ps.slice().sort(sortAddr)){const base=[pl.name,p.page,TYPES[p.type]?.n||p.type,p.address,p.loop,p.location||'',p.status];const tt=[p.testedAt?fmtT(p.testedAt):'',p.tester||''];
  if(p.checks?.length)for(const c of p.checks)rows.push([...base,c.t,CV[c.v]||'',...tt]);else rows.push([...base,'(no checklist)','',...tt])}
 csvDl(rows,'-checklists.csv')};

// ---------- v8: detect devices (vector symbol matcher in detect.js worker; suggestions are "ghosts" until accepted) ----------
const DG={spkw:{n:'Speaker/strobe – wall',t:'spkstrobe',d:['SPK_FOH_WALL','SPK_BOH_WALL'],note:'wall mounted'},spkc:{n:'Speaker/strobe – ceiling',t:'spkstrobe',d:['SPK_FOH_CEIL','SPK_BOH_CEIL'],note:'ceiling mounted'},
 strobe:{n:'Strobe only',t:'strobe',d:['STROBE_FOH','STROBE_BOH']},horn:{n:'Horn/strobe',t:'horn',d:['HORN_FOH','HORN_BOH','HORN_WALL','HORN_CEIL'],note:'horn/strobe'},la:{n:'Line array speaker',t:'linearray',d:['LINE_ARRAY']},smoke:{n:'Smoke detector',t:'smoke',d:['SMOKE']},duct:{n:'Duct detector (air duct housing)',t:'duct',d:['DUCT'],note:'duct smoke'},module:{n:'Module (monitor/control)',t:'module',d:['MODULE']},
 relay:{n:'Relay',t:'relay',d:['RELAY']},pull:{n:'Pull station',t:'pull',d:['PULL']},dh:{n:'Door holder',t:'doorholder',d:['DOOR_HOLDER']},flow:{n:'Waterflow switch',t:'flow',d:['FLOW','FLOW_TAMPER'],note:'waterflow'},tamper:{n:'Tamper switch',t:'tamper',d:['TAMPER'],note:'valve tamper'},
 jbox:{n:'Junction box',t:'jbox',d:['JBOX','JBOX_CEIL']},surge:{n:'Surge protector (SS / TVSS)',t:'surge',d:['SURGE'],note:'surge suppressor'},
 facp:{n:'FACP (fire alarm control panel)',t:'panel',d:['FACP'],note:'FACP'},dact:{n:'DACT (communicator)',t:'dact',d:['DACT'],note:'DACT'},fatc:{n:'FATC (terminal cabinet)',t:'fatc',d:['FATC'],note:'FATC'},panelbox:{n:'Annunciator',t:'panelbox',d:['PANEL_BOX'],note:'annunciator'},rai:{n:'Remote alarm indicator (RI)',t:'rai',d:['RAI'],note:'remote alarm indicator'}};
for(const[k,n,t]of[['heat','Heat detector','heat'],['panel','FACP (manual)','panel'],['oth','Other device','other']])DG[k]={n,t,d:[],x:1};
const D2G={};for(const[k,g]of Object.entries(DG))for(const d of g.d)D2G[d]=k;
const DEF_SEL=Object.keys(DG).filter(k=>k!=='jbox');
const gT=g=>TYPES[DG[g.g].t]||TYPES.other;
for(const[k,g]of Object.entries(DG))$('#ghType').add(new Option(g.n,k));
const DGRP=[['Initiating devices',['smoke','heat','pull']],['Notification devices',['horn','spkw','spkc','strobe','la']],['Supervisory devices',['tamper','flow','duct']],['Control',['module','relay','dh']]];
const detLbl=k=>{const g=DG[k];return`<label${g.x?' title="No auto-detect yet – place by hand"':''}><input type="checkbox" value="${k}"${g.x?' disabled data-man="1"':''}><span class="sw" style="background:${TYPES[g.t].c}"></span>${esc(g.n)}${g.x?' <i class="dim">(manual)</i>':''}</label>`};
const inGrp=new Set(DGRP.flatMap(g=>g[1]));
$('#detTypes').innerHTML=DGRP.map(([n,ks],i)=>`<div class="detGrp"><label class="detGh"><input type="checkbox" data-grp="${i}"><b>${esc(n)}</b></label>${ks.map(detLbl).join('')}</div>`).join('')+`<div class="detGrp"><div class="detGh"><b>Other (not grouped)</b></div>${Object.keys(DG).filter(k=>!DG[k].x&&!inGrp.has(k)).map(detLbl).join('')}</div>`;
const grpSync=()=>document.querySelectorAll('#detTypes [data-grp]').forEach(h=>{const bs=[...h.closest('.detGrp').querySelectorAll('input[value]:not([disabled])')],n=bs.filter(b=>b.checked).length;h.checked=n&&n===bs.length;h.indeterminate=n>0&&n<bs.length});
$('#detTypes').addEventListener('change',e=>{const h=e.target.dataset.grp!=null?e.target:null;if(h)h.closest('.detGrp').querySelectorAll('input[value]:not([disabled])').forEach(b=>b.checked=h.checked);grpSync()});
const detBoxes=()=>[...document.querySelectorAll('#detTypes input[value]:not([disabled])')];
$('#detGoTop').onclick=()=>$('#detGo').click();$('#detAll').onclick=()=>{detBoxes().forEach(b=>b.checked=true);grpSync()};$('#detNone').onclick=()=>{detBoxes().forEach(b=>b.checked=false);grpSync()};
$('#detBtn').onclick=async()=>{if(!plan)return alert('Open a PDF plan first.');if(!pdf)return alert('Detect devices works on vector PDF plans only (not photos or scans).');if(det)return;
 const saved=(await get('meta','detectSel'))||{groups:[],all:false};detBoxes().forEach(b=>b.checked=false);grpSync();
 learnInfoUpd();$('#detForm').elements.scope.value=saved.all?'all':'page';$('#detScope label:last-child').lastChild.textContent=` All ${plan.pages} pages of this plan`;$('#detDlg').showModal()};
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
   const vp=pg.getViewport({scale:1}),t1=performance.now(),r=await detOnWorker({id:n,fn,args,O,vt:vp.transform,W:vp.width,H:vp.height,want:null});if(R.cancel||plan!==pl)return;
   const near=(x,y)=>pins.some(p=>p.page===n&&Math.hypot(p.x-x,p.y-y)<18*r.k);
   ghosts=ghosts.filter(g=>!(g.page===n&&groups.includes(g.g)));
   // Label panel boxes using the page text layer (FACP/DACT/SYS/FATC) and drop legend-side hits
   try{const tc=await pg.getTextContent(),TB=vp.width>vp.height?vp.width*.825:vp.width;
    const labs=[];for(const it of tc.items){const s=(it.str||'').trim();if(!s)continue;
     let typ=null;if(/^FACP[-\s]?\d*$/i.test(s))typ='FACP';else if(/^DACT[-\s]?\d*$/i.test(s))typ='DACT';else if(/^FATC[-\s]?\d*$/i.test(s))typ='FATC';else if(/^(SYS\d+|AMP\d*|ANNUN\w*)$/i.test(s))typ='PANEL_BOX';
     else if(/^(TS|TAMPER)$/i.test(s))typ='TAMPER';else if(/^(FS|WF|FLOW)$/i.test(s))typ='FLOW';else if(/^(SS|TVSS|SPD)$/i.test(s))typ='SURGE';if(!typ)continue;
     const m=pdfjsLib.Util.transform(vp.transform,it.transform),x=m[4]+(typ==='SURGE'?(it.width||0)*.5:0),y=m[5]-(it.height||0)*.5;if(x>TB)continue;
     labs.push({type:typ,x,y,vert:Math.abs(m[1])>Math.abs(m[0]),fp:{s:'text',gl:s.slice(0,12),v:[0,0,0,0,0,0,0]}})}
    for(const L of labs){if(!r.items.some(o=>o.type===L.type&&Math.hypot(o.x-L.x,o.y-L.y)<28))r.items.push(L)}
    for(const it of r.items){if(!['FACP','DACT','FATC','PANEL_BOX','FLOW','TAMPER','FLOW_TAMPER'].includes(it.type))continue;
     const lab=labs.find(L=>Math.hypot(L.x-it.x,L.y-it.y)<36);if(lab)it.type=lab.type;
     else if(it.type==='FLOW_TAMPER')it.type='FLOW'}
   }catch{}
   try{if(window.masterItems)r.items.push(...await masterItems(pg,n,vp,r.items))}catch(e){console.warn('master match',e)} // bpm-v92: master-legend templates as extra matchers (same items → ghosts path)
   const rules=await learnedRules();let nl=0;const items=[];for(const it of r.items){let g=D2G[it.type],lr=null;const m=matchRule(rules,it.fp);if(m){lr=m.g;nl++;if(m.g==='none')continue;g=m.g}if(groups.includes(g)||(lr&&DG[g]?.x))items.push({...it,g,learned:!!lr})}
   // bpm-v29/v46: backfill measured bw/bh/ang + true outline center onto existing pins so re-Detect recenters angled pins
   for(const it of items){if(!(it.bw||it.vert))continue;const want=DG[it.g]&&DG[it.g].t;const p=pins.find(p=>p.page===n&&(!p.bw||(p.ang==null&&it.ang)||(it.ang&&Math.hypot(p.x-it.x,p.y-it.y)<8)||(it.g==='surge'&&p.type==='surge'&&Math.hypot(p.x-it.x,p.y-it.y)<8))&&Math.hypot(p.x-it.x,p.y-it.y)<36&&(PANEL_S.has(p.type)||(want&&p.type===want)));if(p){if(it.bw){p.bw=it.bw;p.bh=it.bh;p.x=it.x;p.y=it.y;if(it.ang)p.ang=it.ang;else if(it.ang===0||it.g==='surge')delete p.ang}else if(PANEL_S.has(p.type))p.vert=true;put('pins',p)}}
   try{if(window.applyTags)await applyTags(pg,n,items,groups)}catch(e){console.warn('tags',e)} // bpm-v94: RI/WP/R text tags re-type only (after geometry backfill; x/y/ang/bw/bh untouched; shp keeps the glyph's original silhouette so size/outset stay identical)
   // bpm-v49: SS surge box sits flush beside its AIM hex (~18pt); only an existing surge pin (or a pin right on it) suppresses it
   const add=items.filter(it=>!(it.g==='surge'?pins.some(p=>p.page===n&&Math.hypot(p.x-it.x,p.y-it.y)<(p.type==='surge'?18*r.k:8)):near(it.x,it.y))).map(it=>({id:uid(),page:n,x:it.x,y:it.y,bw:it.bw,bh:it.bh,ang:it.ang,vert:it.vert,det:it.type,g:it.g,fp:it.fp,learned:it.learned,...(it.tags?.length?{tags:it.tags}:{}),...(it.plan?{plan:it.plan}:{}),...(it.fromG?{fromG:it.fromG,shp:DG[it.fromG].t}:{})}));ghosts.push(...add);found+=add.length;
   R.stats.push({page:n,ops:ol.fnArray.length,paths:r.paths,found:items.length,kept:add.length,skipped:items.length-add.length,learnedHits:nl,opsMs:Math.round(t1-t0),workerMs:Math.round(r.ms),totalMs:Math.round(performance.now()-t0),k:r.k});
   prog((i+1)/pages.length);if(n===page)draw();renderGhostBar()}
  window.__detStats=R.stats;if(!found)showErr(`No ${groups.length===Object.keys(DG).length?'':'matching '}device symbols found${all?'':' on this page'}. Detection works on CAD-exported vector plans with standard symbols.`)}
 catch(e){if(!R.cancel)showErr('Detect devices failed: '+(e&&e.message||e))}
 finally{if(det===R){det=null;busy(0)}draw();renderGhostBar()}}
// bpm-v29/v37: ghosts use the same print-matched tight-outset silhouette as accepted pins (dashed stroke + ?), never the old lettered dashed circle
function gPin(g){const t=g.det==='JBOX_CEIL'?'jceil':(DG[g.g]&&DG[g.g].t||'other');return{type:t,bw:g.bw,bh:g.bh,ang:g.ang,vert:g.vert,...(g.shp?{shp:g.shp}:{})}}
function drawGhosts(c){for(const g of ghosts){if(g.page!==page)continue;const T=gT(g),pin=gPin(g);c.save();const oo=OFFMAP&&OFFMAP.get(g.id||g);if(oo)drawLeader(c,g.x,g.y,g.x+oo.dx,g.y+oo.dy,T.c);c.translate(g.x+(oo?oo.dx:0),g.y+(oo?oo.dy:0));if(CR)c.rotate(-CR);if(isFinite(g.ang)&&g.ang)c.rotate(g.ang);
 c.globalAlpha=.55;c.fillStyle=T.c;c.strokeStyle=T.c;c.lineWidth=pinLW(pin);c.setLineDash([3,2]);pinFS(c,pin,1);c.setLineDash([]);
 c.globalAlpha=1;c.fillStyle='#111';c.strokeStyle='#fff';c.lineWidth=1;c.font='bold 8px sans-serif';c.textAlign='center';c.textBaseline='middle';const[,pw,ph]=pshOf(pin);c.beginPath();c.arc(pw/2+1,-ph/2-1,5,0,7);c.fillStyle='#fff';c.fill();c.strokeStyle=T.c;c.stroke();c.fillStyle='#111';c.fillText('?',pw/2+1,-ph/2-1);c.restore()}}
function ghostHit(w){if(!lay.ghosts)return null;let best=null,bd=1e9;for(const g of ghosts){if(g.page!==page)continue;const pr=Math.max(pinHalf(gPin(g))*1.3,14/view.s),o=SCRNOFF&&SCRNOFF.get(g.id||g),d=Math.min(Math.hypot(g.x-w.x,g.y-w.y),o?Math.hypot(g.x+o.dx-w.x,g.y+o.dy-w.y):1e9);if(d<pr&&d<bd){bd=d;best=g}}return best}
let curG=null;function openGhost(g){curG=g;$('#ghType').value=g.g;ghInfoUpd();$('#ghDlg').showModal()}
function ghInfoUpd(){const g=curG;if(!g)return;const n=ghosts.filter(x=>x.g===$('#ghType').value).length;$('#ghHead').textContent='Suggested: '+DG[$('#ghType').value].n;$('#ghInfo').textContent=`Becomes a "${TYPES[DG[$('#ghType').value].t].n}" pin (blank address/loop, not tested). Detected as ${g.det.replace(/_/g,' ').toLowerCase()}, page ${g.page}.`;$('#ghAllType').textContent=`Accept all ${n} of this type`}
$('#ghType').onchange=()=>{if(curG){curG.g=$('#ghType').value;if(curG.fp)learn(curG.fp,curG.g);ghInfoUpd();draw();renderGhostBar()}};
$('#ghAcc').onclick=async()=>{const g=curG;$('#ghDlg').close();if(g)await acceptGhosts([g])};
$('#ghRej').onclick=()=>{const g=curG;$('#ghDlg').close();if(g){if(g.fp)learn(g.fp,'none');ghosts=ghosts.filter(x=>x!==g);draw();renderGhostBar()}};
$('#ghAllType').onclick=async()=>{const g=curG;$('#ghDlg').close();if(g)await acceptGhosts(ghosts.filter(x=>x.g===g.g))};
async function acceptGhosts(list){if(!plan||!list.length)return;const out=[],used=[];for(const g of list){if(pins.some(p=>p.page===g.page&&Math.hypot(p.x-g.x,p.y-g.y)<14)||out.some(p=>p.page===g.page&&Math.hypot(p.x-g.x,p.y-g.y)<6)){used.push(g);continue}
  const G=DG[g.g],boh=/_BOH/.test(g.det);out.push({id:uid(),planId:plan.id,page:g.page,x:g.x,y:g.y,type:G.t,address:'',loop:'',status:'not tested',notes:'',created:Date.now(),...(g.bw?{bw:g.bw,bh:g.bh}:{}),...(g.ang?{ang:g.ang}:{}),...(g.vert?{vert:true}:{}),detected:g.det,detG:g.g,fp:g.fp,opacity:PIN_OP,...(g.tags?{tags:g.tags}:{}),...(g.plan?{planStatus:g.plan}:{}),...(g.shp?{shp:g.shp}:{})});used.push(g)}
 const ids=new Set(used.map(g=>g.id));ghosts=ghosts.filter(g=>!ids.has(g.id));if(out.length)await changeBatch('pins',out,used);else{draw();renderGhostBar()}}
function renderGhostBar(){const b=$('#ghBar');if(!ghosts.length||walk||!lay.ghosts){b.hidden=true;b.innerHTML='';return}const here=ghosts.filter(g=>g.page===page).length,cnt={};for(const g of ghosts)cnt[g.g]=(cnt[g.g]||0)+1;
 b.innerHTML=`<b>🔍 ${ghosts.length} suggestion${ghosts.length>1?'s':''}</b><small>${here} on this page</small>`+Object.entries(cnt).map(([k,n])=>`<button type="button" class="chip" data-g="${k}" style="border-color:${TYPES[DG[k].t].c}" title="Accept all ${esc(DG[k].n)}">${esc(DG[k].n)} ${n}</button>`).join('')+`<span class="sp"></span><button type="button" class="btn pri" id="ghAccAll">✔ Accept all</button><button type="button" class="btn danger" id="ghRejAll">✕ Reject all</button>`;
 b.hidden=false;b.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{const L=ghosts.filter(g=>g.g===c.dataset.g);if(confirm(`Accept all ${L.length} "${DG[c.dataset.g].n}" suggestions as pins?`))acceptGhosts(L)});
 $('#ghAccAll').onclick=()=>{if(confirm(`Accept all ${ghosts.length} suggestions as pins?`))acceptGhosts(ghosts.slice())};$('#ghRejAll').onclick=()=>{if(confirm(`Reject all ${ghosts.length} suggestions?`)){ghosts=[];draw();renderGhostBar()}}}

// ---------- v9: layers / visibility (saved per plan) ----------
const mKind=m=>m.type==='cloud'?'clouds':(m.type==='text'||m.type==='arrow'||m.type==='line')?'text':'shapes';
const untested=p=>p.status!=='passed'&&p.status!=='failed';
function mVis(m){return lay[mKind(m)]!==false}
function pVis(p){if(!lay.pins)return false;if(lay.only==='failed')return p.status==='failed';if(lay.only==='untested')return untested(p);return true}
function drawPinL(c,p,s,hl){if(lay.dim&&p.status==='passed')drawPin(c,{...p,opacity:opOf(p,true)*.35},s,hl,false,!lay.labels);else drawPin(c,p,s,hl,false,!lay.labels)}
const layF=$('#layForm');
function layToForm(){for(const k of['shapes','clouds','text','pins','labels','ghosts','dim','exp'])layF.elements[k].checked=!!lay[k];layF.elements.only.value=lay.only||''}
function layMark(){const d=Object.keys(LAY0).some(k=>k!=='exp'&&lay[k]!==LAY0[k]);$('#layBtn').classList.toggle('pri',d)}
async function laySave(){if(plan)await put('meta',lay,'layers:'+plan.id);layMark();sel=null;draw();renderGhostBar()}
$('#layBtn').onclick=()=>{if(!plan)return alert('Open a plan first.');layToForm();$('#layDlg').showModal()};
layF.addEventListener('change',()=>{for(const k of['shapes','clouds','text','pins','labels','ghosts','dim','exp'])lay[k]=layF.elements[k].checked;lay.only=layF.elements.only.value;laySave()});
$('#layReset').onclick=()=>{lay={...LAY0,exp:lay.exp};layToForm();laySave()};
// ---------- v9: multi-select, copy / cut / paste ----------
const isPinO=o=>pins.includes(o);
function selItems(){return msel.length?msel:sel?[sel.o]:[]}
function toggleMsel(o){if(sel&&sel.o!==o&&!msel.includes(sel.o))msel.push(sel.o);const i=msel.indexOf(o);if(i>=0)msel.splice(i,1);else msel.push(o);sel=null;renderSelBar();requestDraw(false)}
function bb(o){if(isPinO(o)){let[,w,h]=pshOf(o);if(o.ang){const C=Math.abs(Math.cos(o.ang)),S=Math.abs(Math.sin(o.ang));[w,h]=[w*C+h*S,w*S+h*C]}const pad=pinLW(o)/2+OUT(o),f=(OFFMAP||SCRNOFF)&&(OFFMAP||SCRNOFF).get(o.id),x=o.x+(f?f.dx:0),y=o.y+(f?f.dy:0);return{x:x-w/2-pad,y:y-h/2-pad,X:x+w/2+pad,Y:y+h/2+pad}}return isPinO(o)?0:{x:Math.min(o.x1,o.x2),y:Math.min(o.y1,o.y2),X:Math.max(o.x1,o.x2),Y:Math.max(o.y1,o.y2)}}
function drawMsel(c){if(!msel.length)return;c.save();c.setLineDash([5,4]);c.strokeStyle='#38bdf8';c.lineWidth=1.5;const p=pinR()*.6;for(const o of msel){if(o.page!==page)continue;const b=bb(o);c.strokeRect(b.x-p,b.y-p,b.X-b.x+2*p,b.Y-b.y+2*p)}c.restore()}
function showBox(){let d=$('#selBox');if(!d){d=document.createElement('div');d.id='selBox';stage.append(d)}const g=gesture;if(!g||g.type!=='box'){d.remove();return}
 const a=toS(g.w0.x,g.w0.y),b=toS(g.w1.x,g.w1.y);Object.assign(d.style,{left:Math.min(a.x,b.x)+'px',top:Math.min(a.y,b.y)+'px',width:Math.abs(b.x-a.x)+'px',height:Math.abs(b.y-a.y)+'px'})}
function boxSelect(a,b){$('#selBox')?.remove();const x=Math.min(a.x,b.x),X=Math.max(a.x,b.x),y=Math.min(a.y,b.y),Y=Math.max(a.y,b.y),inn=o=>{const q=bb(o),cx=(q.x+q.X)/2,cy=(q.y+q.Y)/2;return cx>=x&&cx<=X&&cy>=y&&cy<=Y};
 const L=[...markups.filter(m=>m.page===page&&mVis(m)&&inn(m)),...pins.filter(p=>p.page===page&&pVis(p)&&inn(p))];for(const o of L)if(!msel.includes(o))msel.push(o);sel=null;renderSelBar();requestDraw(false);toast(`${msel.length} selected`)}
let clipPins=false,multiOn=false,boxOn=false;
function renderSelBar(){const b=$('#selBar'),it=tool==='select'?selItems():msel,ST0=tool==='select'&&plan;if(walk||(!it.length&&!clip&&!ST0)){b.hidden=true;b.innerHTML='';return}const np=it.filter(isPinO).length;
 b.innerHTML=(ST0?`<button type="button" class="btn${multiOn?' on':''}" id="multiBtn" title="Multi-select: tap items to add/remove them">${multiOn?'☑':'☐'} Multi</button><button type="button" class="btn${boxOn?' on':''}" id="boxBtn" title="Box select: drag on empty space to select everything inside">▭ Box</button><select id="selAll" title="Select all on this page"><option value="">All…</option><option value="all">All on page</option><option value="m">Markups</option><option value="p">Pins</option></select>`:'')
  +(it.length?`<b>${it.length} sel.</b><button type="button" class="btn" id="cpBtn">⧉ Copy</button><button type="button" class="btn" id="cutBtn">✂ Cut</button>${np?`<label><input type="checkbox" id="cpPins" ${clipPins?'checked':''}> incl. ${np} pin${np>1?'s':''}</label>`:''}<button type="button" class="btn" id="bulkEd" title="Edit color, size, pin status/type">✎ Edit</button><button type="button" class="btn danger" id="bulkDel" title="Delete selected">🗑</button><button type="button" class="btn" id="selX" title="Clear selection">✕</button>`:'')
  +(clip?`<button type="button" class="btn pri" id="pasteBtn" title="Paste at the same plan position">📋 Paste ${clip.m.length+clip.p.length}</button><button type="button" class="btn" id="pasteAt" title="Paste centred on the next point you tap">📍 at tap</button><button type="button" class="btn" id="clipX" title="Clear clipboard">✕</button>`:'');
 b.hidden=false;const q=x=>b.querySelector(x);
 if(q('#multiBtn'))q('#multiBtn').onclick=()=>{multiOn=!multiOn;if(multiOn&&sel){if(!msel.includes(sel.o))msel.push(sel.o);sel=null}renderSelBar();requestDraw(false)};if(q('#boxBtn'))q('#boxBtn').onclick=()=>{boxOn=!boxOn;renderSelBar()};
 if(q('#selAll'))q('#selAll').onchange=e=>selectAll(e.target.value);if(q('#bulkDel'))q('#bulkDel').onclick=bulkDelete;if(q('#bulkEd'))q('#bulkEd').onclick=openBulk;
 if(q('#cpPins'))q('#cpPins').onchange=e=>clipPins=e.target.checked;
 if(q('#cpBtn'))q('#cpBtn').onclick=()=>doCopy(false);if(q('#cutBtn'))q('#cutBtn').onclick=()=>doCopy(true);if(q('#selX'))q('#selX').onclick=()=>{msel=[];sel=null;renderSelBar();draw()};
 if(q('#pasteBtn'))q('#pasteBtn').onclick=()=>doPaste(null);if(q('#pasteAt'))q('#pasteAt').onclick=()=>{pasteArm=true;toast('Tap where the copied items should go')};if(q('#clipX'))q('#clipX').onclick=()=>{clip=null;pasteArm=false;renderSelBar()}}
async function doCopy(cut){const it=selItems(),ms=it.filter(o=>!isPinO(o)),ps=clipPins?it.filter(isPinO):[];if(!ms.length&&!ps.length){toast(it.length?'Tick "incl. pins" to copy pins':'Nothing selected');return}
 const all=[...ms,...ps],bs=all.map(bb),cx=(Math.min(...bs.map(b=>b.x))+Math.max(...bs.map(b=>b.X)))/2,cy=(Math.min(...bs.map(b=>b.y))+Math.max(...bs.map(b=>b.Y)))/2;
 clip={m:structuredClone(ms),p:structuredClone(ps),cx,cy,from:plan.id,page};
 if(cut){const L=[];for(const m of ms)L.push({store:'markups',id:m.id,before:m,after:null});for(const p of ps)L.push({store:'pins',id:p.id,before:p,after:null,media:await byIdx('media','pinId',p.id)});msel=[];sel=null;await changeMulti(L);toast(`Cut ${all.length} item${all.length>1?'s':''}`,true)}
 else toast(`Copied ${all.length} item${all.length>1?'s':''}${ps.length?` (${ps.length} pin${ps.length>1?'s':''})`:''}`);renderSelBar()}
async function doPaste(at){if(!clip||!plan)return;const dx=at?at.x-clip.cx:0,dy=at?at.y-clip.cy:0,L=[],now=Date.now();
 for(const m of clip.m){const n={...structuredClone(m),id:uid(),planId:plan.id,page,x1:m.x1+dx,y1:m.y1+dy,x2:m.x2+dx,y2:m.y2+dy};L.push({store:'markups',id:n.id,before:null,after:n})}
 for(const p of clip.p){const n={...structuredClone(p),id:uid(),planId:plan.id,page,x:p.x+dx,y:p.y+dy,address:'',location:'',status:'not tested',created:now,opacity:opOf(p,true)};for(const k of['checks','testedAt','tester','reason','reasonText','severity','codes','fp','detected','detG'])delete n[k];L.push({store:'pins',id:n.id,before:null,after:n})}
 await changeMulti(L);const ids=new Set(L.map(x=>x.id));msel=[...markups,...pins].filter(o=>ids.has(o.id));renderSelBar();draw();toast(`Pasted ${L.length} item${L.length>1?'s':''}${at?' at the tapped point':''}`,true)}
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||document.querySelector('dialog[open]'))return;const k=e.key.toLowerCase();if(!(e.ctrlKey||e.metaKey))return;if(k==='c'&&selItems().length){e.preventDefault();doCopy(false)}else if(k==='x'&&selItems().length){e.preventDefault();doCopy(true)}else if(k==='v'&&clip){e.preventDefault();doPaste(null)}});
document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{if(tool!=='select')msel=[];renderSelBar();if(tool!=='measure'){MS.pts=[];MS.cal=false}renderMBar()}));
// keep the selection bar in sync with taps in select mode
stage.addEventListener('pointerup',()=>setTimeout(()=>{if(tool==='select'||clip)renderSelBar()},0));
// ---------- toast with undo ----------
let toastT=0;function toast(msg,canUndo){$('#toastTxt').textContent=msg;$('#toastUndo').hidden=!canUndo;$('#toast').hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>$('#toast').hidden=true,canUndo?6000:3000)}
$('#toastUndo').onclick=async()=>{$('#toast').hidden=true;await undo();if(walk)renderWalk()};
// ---------- v9: walk mode ----------
const REASONS=['No alarm','Trouble','Damaged','Missing','Obstructed','Dirty/needs cleaning','Other'];
function walkSet(){return pins.filter(p=>(!walk.type||p.type===walk.type)&&(!walk.types||walk.types.includes(p.type)))}
function walkLeft(){return walkSet().filter(p=>untested(p)&&!walk.skip.has(p.id))}
function nearestFrom(L,from){if(!L.length)return null;if(!from)return L.slice().sort((a,b)=>a.page-b.page)[0];return L.slice().sort((a,b)=>(a.page===from.page?0:1)-(b.page===from.page?0:1)||Math.abs(a.page-from.page)-Math.abs(b.page-from.page)||Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0]}
$('#walkBtn').onclick=()=>walk?exitWalk():walkPick();
function startWalk(type=''){if(!plan)return alert('Open a plan first.');if(!pins.length)return alert('This plan has no pins yet. Place pins or use 🔍 Detect devices first.');
 walk={type,types:arguments[1]||null,skip:new Set(),p:null,fail:false};msel=[];sel=null;renderSelBar();renderGhostBar();$('#walkBtn').classList.add('pri');
 const c=toW(stage.clientWidth/2,stage.clientHeight/2),L=walkLeft(),here=L.filter(p=>p.page===page);
 const first=sel?.kind==='p'&&untested(sel.o)?sel.o:nearestFrom(here.length?here:L,here.length?{page,...c}:null);walkGo(first)}
function exitWalk(){walk=null;$('#walk').hidden=true;$('#walkBtn').classList.remove('pri');renderGhostBar();renderSelBar();draw()}
async function walkGo(p,back){if(!walk)return;walk.hist??=[];if(!back&&walk.p&&p&&walk.p.id!==p.id){walk.hist.push(walk.p.id);if(walk.hist.length>200)walk.hist.shift()}walk.p=p;walk.fail=false;renderWalk();if(!p){draw();return}if(p.page!==page)await gotoPage(p.page);
 const W=stage.clientWidth,Hh=stage.clientHeight-$('#walk').offsetHeight,s=walk.zoomed?view.s:Math.max(view.s,Math.min(W,stage.clientHeight)/320),v0={...view};walk.zoomed=true;centerOn(p.x,p.y,s,W/2,Math.max(60,Hh/2));const v1={...view};view=v0;sel={kind:'p',o:p};await prefetchPath(v0,v1);if(walk?.p!==p)return;await slideTo(v1)}
function walkNext(){if(!walk)return;const cur=walk.p;walkGo(nearestFrom(walkLeft().filter(p=>p!==cur),cur))}
function walkAfterDialog(){if(!walk||!walk.p)return;const p=pins.find(x=>x.id===walk.p.id);if(!p){walkNext();return}walk.p=p;if(!untested(p))walkNext();else renderWalk()}
function renderWalk(){const w=$('#walk');if(!walk){w.hidden=true;return}const S=walkSet(),N=S.length,done=S.filter(p=>!untested(p)).length,p=walk.p&&pins.find(x=>x.id===walk.p.id)||walk.p;
 const types=[...new Set(pins.map(x=>x.type))];const head=`<div class="wh"><b>🚶 ${p?`${Math.min(done+1,N)} of ${N}`:`${done} of ${N} tested`}</b><select id="wType" title="Only this type"><option value="">All types</option>${types.map(t=>`<option value="${t}"${walk.type===t?' selected':''}>${esc(TYPES[t]?.n||t)}</option>`).join('')}</select><span class="sp"></span>${SR?'<button type="button" class="btn" id="wMic" title="Voice command">🎤</button>':''}<button type="button" class="btn" id="wGoto" title="Pick any device to test next">📍 Go to…</button><button type="button" class="btn" id="wExit">✕ Exit</button></div>`;
 if(!p){w.innerHTML=head+`<div class="wt">${walk.skip.size?`No untested devices left (${walk.skip.size} skipped).`:'All devices in this set are tested. 🎉'}</div>${walk.hist?.length?'<div class="row"><button type="button" class="btn" id="wPrev">⏮ Previous device</button></div>':''}${walk.skip.size?'<div class="row"><button type="button" class="btn" id="wRe">Revisit skipped</button></div>':''}`}
 else w.innerHTML=head+`<div class="wt"><span class="dot" style="display:inline-block;background:${(TYPES[p.type]||TYPES.other).c}"></span> ${esc(TYPES[p.type]?.n||p.type)} ${p.address?esc(p.address):'<small style="color:#94a3b8">(no address)</small>'}${p.loop?' · Loop '+esc(p.loop):''}${p.location?' · '+esc(p.location):''} <small style="color:#94a3b8">pg ${p.page}${p.status==='in progress'?' · in progress':''}</small></div>
 <div id="wHeard" style="color:#93c5fd;font-size:13px"${walk.heard?'':' hidden'}>🎤 “${esc(walk.heard||'')}”</div>
 ${walk.fail?`<div><b>Fail reason</b> <label style="display:inline-flex;gap:4px;align-items:center;margin-left:8px"><input type="checkbox" id="wCrit" style="width:20px;height:20px;min-height:20px"> Critical</label></div><div class="reasons">${REASONS.map(r=>`<button type="button" class="btn danger" data-r="${r}">${r}</button>`).join('')}<button type="button" class="btn" id="wFailX">Cancel</button></div>`
  :`<div class="wb"><button type="button" class="btn" id="wPrev" title="Back to the previous device"${walk.hist?.length?'':' disabled'}>⏮</button><button type="button" class="btn ok" id="wPass">✔ Pass</button><button type="button" class="btn danger" id="wFail">✖ Fail</button><button type="button" class="btn" id="wSkip">⏭ Skip</button></div><div class="row"><button type="button" class="btn" id="wOpen">📋 Open checklist</button><span class="sp"></span><small style="color:#94a3b8">Pass = all checklist items pass</small></div>`}`;
 w.hidden=false;const q=x=>w.querySelector(x);
 q('#wExit').onclick=exitWalk;q('#wGoto').onclick=walkGoto;q('#wType').onchange=e=>{walk.type=e.target.value;walk.skip.clear();const L=walkLeft();walkGo(nearestFrom(L,walk.p))};if(q('#wMic'))q('#wMic').onclick=startVoice;
 if(q('#wRe'))q('#wRe').onclick=()=>{walk.skip.clear();walkGo(nearestFrom(walkLeft(),null))};
 if(q('#wPass'))q('#wPass').onclick=()=>testPin(p,'pass');if(q('#wFail'))q('#wFail').onclick=()=>{walk.fail=true;renderWalk()};if(q('#wSkip'))q('#wSkip').onclick=()=>{walk.skip.add(p.id);walkNext()};
 if(q('#wOpen'))q('#wOpen').onclick=()=>openPin(pins.find(x=>x.id===p.id)||p);if(q('#wPrev'))q('#wPrev').onclick=walkPrev;if(q('#wFailX'))q('#wFailX').onclick=()=>{walk.fail=false;renderWalk()};
 w.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>testPin(p,'fail',b.dataset.r,q('#wCrit').checked))}
async function testPin(p,res,reason,crit){p=pins.find(x=>x.id===p.id);if(!p)return;const b=structuredClone(p),a={...b,testedAt:Date.now(),tester:await getTester()};
 if(res==='pass'){a.checks=(b.checks||checkItems(b.type)).map(c=>({...c,v:'pass'}));a.status='passed';a.reason=a.reasonText=a.severity=''}
 else{const ck=b.checks||checkItems(b.type);a.checks=ck.some(c=>c.v==='fail')?ck.map(c=>({...c})):ck.map(c=>({...c,v:c.v==='pass'?'':c.v}));a.status='failed';a.reason=reason||'Other';{/* bpm-v67: walk fail reason → matching checklist item marked Fail; no match → add a 'Fail: reason' item */const R=a.reason;const RX={'No alarm':/alarm|activat|audible|signal|received|operat|flash|releas/i,Trouble:/trouble|supervis|wiring/i,Damaged:/condition|mount|damage/i,Obstructed:/obstruct|accessib/i,'Dirty/needs cleaning':/clean/i}[R];var fIt=R!=='Other'&&a.checks.find(c=>reasonFor(c.t)===R)||R!=='Other'&&(RX&&a.checks.find(c=>RX.test(c.t)));if(!fIt){const t='Fail: '+R;fIt=a.checks.find(c=>c.t===t);if(!fIt){fIt={t,v:''};a.checks.push(fIt)}}fIt.v='fail'}a.severity=crit?'Critical':'Non-critical';a.reasonText=b.reasonText||(/^Fail: /.test(fIt.t)?'':'Failed: '+fIt.t)}
 await change('pins',b,a);if(dlg.open&&cur?.id===a.id){const np=pins.find(x=>x.id===a.id)||a;cur=np;ckl=structuredClone(np.checks||checkItems(np.type));renderChecks();form.elements.status&&(form.elements.status.value=np.status||'');}toast(`${TYPES[a.type]?.n||a.type} ${a.address||''}: ${a.status}${res==='fail'?` (${a.reason}${crit?', critical':''})`:''}`,true);
 if(walk&&walk.p?.id===p.id)walkNext()}
// ---------- v9: voice commands (Web Speech API) ----------
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let srec=null;
if(SR)$('#micBtn').hidden=false;
$('#micBtn').onclick=startVoice;
function startVoice(){if(!SR)return;if(srec){try{srec.stop()}catch{}return}
 if(!navigator.onLine)toast('You are offline: on many phones voice recognition needs internet. If it fails, use the buttons.');
 let r;try{r=new SR()}catch(e){toast('Voice is not available: '+e.message);return}srec=r;r.lang=navigator.language||'en-US';r.interimResults=false;r.maxAlternatives=1;r.continuous=false;
 const on=b=>{for(const x of[$('#micBtn'),$('#wMic')])if(x)x.classList.toggle('danger',b)};on(true);
 r.onresult=e=>{const t=e.results[0][0].transcript;voiceHeard(t)};
 r.onerror=e=>{const m={network:'Voice recognition needs an internet connection on this device. Use the buttons while offline.','not-allowed':'Microphone access is blocked. Allow the microphone for this site in Chrome settings.','service-not-allowed':'Voice recognition is turned off or unavailable on this device.','no-speech':'Didn\u2019t hear anything. Tap 🎤 and speak again.','audio-capture':'No microphone was found.','language-not-supported':'Voice recognition does not support this language here.'}[e.error]||('Voice error: '+e.error);if(e.error!=='aborted')toast(m)};
 r.onend=()=>{srec=null;on(false)};try{r.start()}catch(e){srec=null;on(false);toast('Could not start voice: '+e.message)}}
function voiceHeard(t){if(walk){walk.heard=t;const h=$('#wHeard');if(h){h.hidden=false;h.textContent='🎤 “'+t+'”'}}runVoice(t)}
const normA=s=>String(s||'').toUpperCase().replace(/\bDASH\b/g,'-').replace(/[\s.]+/g,'');
const NUMW={zero:0,one:1,two:2,to:2,too:2,three:3,four:4,for:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
const numW=s=>s.split(/\s+/).map(w=>w in NUMW?NUMW[w]:w).join(' ');
function reasonOf(r){r=r||'';return /no alarm|not alarm|no signal|didn.?t alarm/.test(r)?'No alarm':/trouble/.test(r)?'Trouble':/damage/.test(r)?'Damaged':/missing/.test(r)?'Missing':/obstruct|blocked/.test(r)?'Obstructed':/dirt|clean|dust/.test(r)?'Dirty/needs cleaning':/wrong|location/.test(r)?'Wrong location':'Other'}
const TYPEW=/\b(smoke|heat|pull|station|horn|strobe|speaker|module|monitor|control|relay|duct|detector|flow|water|tamper|switch|panel|fatc|facp|dact|communicator|terminal|cabinet|door|holder|junction|box|surge|suppressor|spd|tvss|line|array|device)\b/g;
function parseVoice(text){const raw=String(text||'').trim(),t=raw.toLowerCase().replace(/[,!?]/g,'').replace(/\.$/,'').replace(/\s+/g,' ').trim();let m;
 if(/^(skip|next)\b/.test(t))return{cmd:'skip'};
 if(/^(pass|passed|passes|good)$/.test(t))return{cmd:'pass'};
 if((m=t.match(/^(fail|failed|fails)\b ?(.*)$/)))return{cmd:'fail',reason:reasonOf(m[2]),crit:/\bcritical\b/.test(m[2])&&!/non.?critical/.test(m[2])};
 if((m=t.match(/^address (.+)$/)))return{cmd:'address',v:normA(numW(m[1]))};
 if((m=t.match(/^loop (.+)$/)))return{cmd:'loop',v:normA(numW(m[1]))};
 if((m=raw.match(/^notes? (.+)$/i)))return{cmd:'note',v:m[1].trim()};
 if((m=t.match(/^(.+?) (pass|passed|passes|fail|failed|fails)\b ?(.*)$/))){const addr=normA(numW(m[1].replace(TYPEW,' ')));if(addr){const f=/^fail/.test(m[2]);return{cmd:f?'fail':'pass',addr,reason:f?reasonOf(m[3]):'',crit:f&&/\bcritical\b/.test(m[3])&&!/non.?critical/.test(m[3])}}}
 return{cmd:'?'}}
async function runVoice(text){const c=parseVoice(text);window.__lastVoice={text,c};if(c.cmd==='?'){toast(`Heard “${text}” but didn't understand. Try “pass”, “fail damaged”, “skip”, “address L1D012”.`);return c}
 if(c.cmd==='skip'){if(walk&&walk.p){walk.skip.add(walk.p.id);walkNext();toast(`Heard “${text}”: skipped`)}else toast('“Skip” works in walk mode (🚶).');return c}
 let p=null;if(c.addr){p=pins.find(x=>normA(x.address)===c.addr);if(!p){toast(`Heard “${text}”: no pin with address ${c.addr} in this plan`);return c}}else p=walk?.p?pins.find(x=>x.id===walk.p.id):sel?.kind==='p'?sel.o:null;
 if(!p){toast(`Heard “${text}”: select a pin or start walk mode (🚶) first`);return c}
 if(c.cmd==='pass'||c.cmd==='fail'){await testPin(p,c.cmd,c.reason,c.crit);return c}
 const b=structuredClone(p),a={...b};if(c.cmd==='address')a.address=c.v;else if(c.cmd==='loop')a.loop=c.v;else if(c.cmd==='note')a.notes=(b.notes?b.notes+'\n':'')+c.v;
 await change('pins',b,a);if(dlg.open&&cur?.id===a.id){const np=pins.find(x=>x.id===a.id)||a;cur=np;ckl=structuredClone(np.checks||checkItems(np.type));renderChecks();form.elements.status&&(form.elements.status.value=np.status||'');}toast(`${TYPES[a.type]?.n||a.type}: ${c.cmd} → ${c.v}`,true);if(walk)renderWalk();return c}
// ---------- v9: learned detection rules (global, IndexedDB 'learned') ----------
let lrCache=null;async function learnedRules(){return lrCache||(lrCache=await all('learned'))}
function fpDist(a,b){if(!a||!b||a.s!==b.s||a.gl!==b.gl)return 1e9;let d=0;for(let i=0;i<Math.max(a.v.length,b.v.length);i++){const x=(a.v[i]||0)-(b.v[i]||0);d+=x*x}return Math.sqrt(d)}
const FP_TH=.75;function matchRule(rules,fp){let best=null,bd=FP_TH;for(const r of rules){const d=fpDist(r.fp,fp);if(d<bd){bd=d;best=r}}return best}
async function learn(fp,g){if(!fp)return;const rules=await learnedRules(),m=matchRule(rules,fp);const r=m?{...m,g,updated:Date.now()}:{id:uid(),fp,g,created:Date.now()};await put('learned',r);lrCache=null;learnInfoUpd()}
function groupFor(type,orig){if(DG[orig]?.t===type)return orig;const ks=Object.keys(DG);return ks.find(k=>DG[k].t===type&&!DG[k].x)||ks.find(k=>DG[k].t===type)||'oth'}
async function learnInfoUpd(){const n=(await learnedRules()).length;$('#learnInfo').textContent=n?`🧠 Learned ${n} symbol${n>1?'s':''} from your corrections (used first).`:'🧠 No learned symbols yet. Rejecting or retyping a suggestion teaches the detector.';$('#learnReset').hidden=!n}
$('#learnReset').onclick=async()=>{if(!confirm('Forget all learned symbols (in every project)?'))return;await tx('learned','readwrite',o=>o.clear());lrCache=null;learnInfoUpd()};

// ---------- v10: multi-select tools ----------
function selectAll(f){if(!plan||!f)return;const L=[...(f!=='p'?markups.filter(m=>m.page===page&&mVis(m)):[]),...(f!=='m'?pins.filter(p=>p.page===page&&pVis(p)):[])];msel=L;sel=null;if(L.length)multiOn=true;renderSelBar();requestDraw(false);toast(L.length?`${L.length} selected`:'Nothing visible on this page')}
async function bulkDelete(){const it=selItems().filter(o=>o.planId===plan?.id);if(!it.length)return;const L=[];for(const o of it){if(isPinO(o))L.push({store:'pins',id:o.id,before:o,after:null,media:await byIdx('media','pinId',o.id)});else L.push({store:'markups',id:o.id,before:o,after:null})}
 msel=[];sel=null;await changeMulti(L);renderSelBar();toast(`Deleted ${L.length} item${L.length>1?'s':''}`,true)}
$('#bkType').innerHTML='<option value="">unchanged</option>'+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');
function openBulk(){const it=selItems();if(!it.length)return;const nm=it.filter(o=>!isPinO(o)).length,np=it.length-nm;$('#bkN').textContent=`${it.length} item${it.length>1?'s':''}`;$('#bkM').hidden=!nm;$('#bkP').hidden=!np;
 $('#bkCOn').checked=false;$('#bkColor').value=$('#color').value;$('#bkSize').value='';$('#bkOOn').checked=false;$('#bkOpac').value=$('#opac').value;$('#bkOpacLbl').textContent=$('#opac').value+'%';$('#bkStatus').value='';$('#bkType').value='';$('#bulkDlg').showModal()}
$('#bkColor').oninput=()=>$('#bkCOn').checked=true;$('#bkOpac').oninput=()=>{$('#bkOOn').checked=true;$('#bkOpacLbl').textContent=+$('#bkOpac').value+'%'};
$('#bkGo').onclick=async()=>{$('#bulkDlg').close();await bulkApply({color:$('#bkCOn').checked?$('#bkColor').value:null,size:$('#bkSize').value,opacity:$('#bkOOn').checked?clampOp(+$('#bkOpac').value/100):null,status:$('#bkStatus').value,type:$('#bkType').value})};
async function bulkApply(o){const it=selItems().filter(x=>x.planId===plan?.id),L=[],now=Date.now();let who=null;
 for(const x of it){const b=structuredClone(x);let a=structuredClone(x);
  if(isPinO(x)){if(o.type&&o.type!==a.type)a.type=o.type;if(o.opacity!=null)a.opacity=o.opacity;
   if(o.status&&o.status!==b.status){if(o.status==='passed'||o.status==='failed'){who??=await getTester();a.testedAt=now;a.tester=who}
    if(o.status==='passed'){a.checks=(b.checks||checkItems(a.type)).map(c=>({...c,v:'pass'}));a.reason=a.reasonText=a.severity=''}
    else if(o.status==='failed'){a.reason=b.reason||'Other';a.severity=b.severity||'Non-critical'}
    else if(o.status==='not tested'){for(const k of['checks','testedAt','tester','reason','reasonText','severity'])delete a[k]}
    a.status=o.status}}
  else{if(o.color)a.color=o.color;if(o.opacity!=null)a.opacity=o.opacity;if(o.size!==''&&o.size!=null){const i=+o.size;a=a.type==='text'?textBox({...a,fs:SZT[i]/view.s}):{...a,w:SZ[i]}}}
  if(JSON.stringify(a)!==JSON.stringify(b))L.push({store:isPinO(x)?'pins':'markups',id:x.id,before:b,after:a})}
 if(!L.length){toast('Nothing to change');return}await changeMulti(L);renderSelBar();toast(`Updated ${L.length} item${L.length>1?'s':''}`,true)}
// ---------- v10: .bpm project file (ZIP, stored entries, see FORMAT.md) ----------
const BPM_VER=1,BPM_FMT='blueprint-markup-project';
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
async function crcBlob(b,onP){let c=0xFFFFFFFF;const CH=4<<20;for(let o=0;o<b.size;o+=CH){const u=new Uint8Array(await b.slice(o,o+CH).arrayBuffer());for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);onP&&onP(u.length)}return(c^0xFFFFFFFF)>>>0}
// store-only ZIP: the output Blob references the source blobs, so big videos are never copied into one buffer
async function zipBlob(files,onP){const parts=[],cd=[],enc=new TextEncoder();let off=0;if(files.length>65000)throw new Error('too many files for one archive');
 for(const f of files){const nm=enc.encode(f.name),sz=f.blob.size,crc=await crcBlob(f.blob,onP);if(sz>=0xFFFFFFFF||off+sz+nm.length+30>=0xFFFFFFFF)throw new Error('the project is over 4 GB, too large for one file');
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);parts.push(h.buffer,nm,f.blob);
  const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);cd.push(c.buffer,nm);off+=30+nm.length+sz}
 const cs=cd.reduce((a,b)=>a+b.byteLength,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
 return new Blob([...parts,...cd,e.buffer],{type:'application/zip'})}
async function unzipBlob(b){const T=Math.max(0,b.size-65557),tail=new DataView(await b.slice(T).arrayBuffer());let i=tail.byteLength-22;for(;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50)break;if(i<0)throw new Error('this is not a .bpm project file (no ZIP directory found)');
 const n=tail.getUint16(i+10,true),cs=tail.getUint32(i+12,true),co=tail.getUint32(i+16,true);if(co+cs>b.size)throw new Error('the file is truncated');const cdv=new DataView(await b.slice(co,co+cs).arrayBuffer()),out=new Map(),dec=new TextDecoder();let p=0;
 for(let k=0;k<n;k++){if(cdv.getUint32(p,true)!==0x02014b50)throw new Error('the file is damaged (bad directory)');const meth=cdv.getUint16(p+10,true),crc=cdv.getUint32(p+16,true),csz=cdv.getUint32(p+20,true),nl=cdv.getUint16(p+28,true),el=cdv.getUint16(p+30,true),cl=cdv.getUint16(p+32,true),lo=cdv.getUint32(p+42,true),name=dec.decode(new Uint8Array(cdv.buffer,p+46,nl));p+=46+nl+el+cl;
  const lh=new DataView(await b.slice(lo,lo+30).arrayBuffer());if(lh.getUint32(0,true)!==0x04034b50)throw new Error('the file is damaged ('+name+')');const ds=lo+30+lh.getUint16(26,true)+lh.getUint16(28,true);let blob=b.slice(ds,ds+csz);
  if(meth===8)blob=await new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();else if(meth!==0)throw new Error('unsupported compression in '+name);out.set(name,{blob,crc})}return out}
const fsafe=s=>String(s||'project').replace(/[\\/:*?"<>|]+/g,'_').trim()||'project';
async function buildBpm(pid,withLearned,onP){const pr=await get('projects',pid),pls=(await all('plans')).filter(p=>p.projectId===pid).sort((a,b)=>a.added-b.added),files=[];
 const man={format:BPM_FMT,version:BPM_VER,app:'bpm-v97',saved:new Date().toISOString(),project:pr,plans:[],markups:[],pins:[],media:[],layers:{},meta:{},learned:null,mycodes:null};
 for(const pl of pls){const{blob,...m}=pl,f=`plans/${pl.id}.${pl.kind==='pdf'?'pdf':((blob?.type||'').split('/')[1]||'img')}`;if(blob)files.push({name:f,blob});man.plans.push({...m,file:blob?f:null,type:blob?.type||'',size:blob?.size||0});
  man.markups.push(...await byIdx('markups','planId',pl.id));const ps=await byIdx('pins','planId',pl.id);man.pins.push(...ps);
  for(const p of ps)for(const md of await byIdx('media','pinId',p.id)){const{blob:mb,annot,...r}=md,e={...r,file:null};if(mb){e.file=`media/${md.id}`;e.type=mb.type;e.size=mb.size;files.push({name:e.file,blob:mb})}if(annot){e.annotFile=`media/${md.id}-annot`;e.annotType=annot.type;files.push({name:e.annotFile,blob:annot})}man.media.push(e)}
  const ly=await get('meta','layers:'+pl.id);if(ly)man.layers[pl.id]=ly;const sc=await get('meta','scale:'+pl.id);if(sc)(man.scales??={})[pl.id]=sc;const ro=await get('meta','rot:'+pl.id);if(ro)(man.rots??={})[pl.id]=ro}
 const last=await get('meta','last:'+pid);if(last)man.meta.last=last;const job=await get('meta','job:'+pid);if(job)man.meta.job=job;if(withLearned)man.learned=await all('learned');man.mycodes=await all('mycodes');man.installLinks=(await get('meta','installLinks'))||null;man.userParts=(await get('meta','userParts'))||null;man.cktpl=Object.keys(CKT).length?CKT:null;
 {// bpm-v72: human-readable reports inside the archive (ignored on import)
  const q=v=>/[",\n]/.test(String(v??''))?'"'+String(v).replace(/"/g,'""')+'"':String(v??''),pm=new Map(man.plans.map(p=>[p.id,p.name])),rows=[['plan','page','type','address','loop','model','location','status','reason','severity','codes','tested','tester','notes'],...man.pins.map(p=>[pm.get(p.planId)||'',p.page,TYPES[p.type]?.n||p.type,p.address,p.loop,p.model||'',p.location||'',p.status,p.reason||'',p.severity||'',(p.codes||[]).map(c=>c.code+' '+c.section).join('; '),p.testedAt?new Date(p.testedAt).toISOString():'',p.tester||'',p.notes||''])];
  files.push({name:'reports/device-list.csv',blob:new Blob([rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv'})});if(job)files.push({name:'reports/job-info.json',blob:new Blob([JSON.stringify(job,null,1)],{type:'application/json'})})}
 man.models=await get('meta','models:custom')||null;man.changelog=(await get('meta','chlog:'+pid))||null;
 files.unshift({name:'project.json',blob:new Blob([JSON.stringify(man)],{type:'application/json'})});const tot=files.reduce((a,f)=>a+f.blob.size,0);let done=0;return zipBlob(files,n=>{done+=n;onP&&onP(done/tot)})}
async function readBpm(file){const z=await unzipBlob(file),mj=z.get('project.json');if(!mj)throw new Error('this file has no project.json, it is not a Marker project');let man;try{man=JSON.parse(await mj.blob.text())}catch{throw new Error('project.json is damaged')}
 if(man.format!==BPM_FMT)throw new Error('this is not a Marker project file');if(!Number.isInteger(man.version)||man.version<1)throw new Error('unknown project file version');if(man.version>BPM_VER)throw new Error(`this file was saved by a newer app (format v${man.version}; this app reads up to v${BPM_VER}). Reload the app to update it, then try again.`);
 for(const k of['plans','markups','pins','media'])if(!Array.isArray(man[k]))throw new Error('project.json is missing '+k);return{z,man}}
async function importBpm(file,replaceId,onP){const{z,man}=await readBpm(file);
 const ent=async(n,type)=>{const e=z.get(n);if(!e)throw new Error('the file is missing '+n);if(await crcBlob(e.blob)!==e.crc)throw new Error(n+' is damaged (checksum mismatch)');return new Blob([await e.blob.arrayBuffer()],{type:type||''})};
 const idm=new Map(),nid=o=>{if(!idm.has(o))idm.set(o,uid()+Math.random().toString(36).slice(2,5));return idm.get(o)};
 const pid=replaceId||'p'+uid(),names=(await all('projects')).filter(p=>p.id!==replaceId).map(p=>p.name);let name=man.project?.name||file.name.replace(/\.(bpm|marker)$/i,'');if(!replaceId&&names.includes(name))name+=' (opened)';
 // 1) read + verify every blob before touching the database
 const plans=[],media=[],N=man.plans.length+man.media.length;let k=0;const tick=()=>onP&&onP(++k/Math.max(1,N));
 for(const m of man.plans){const{file:f,type,size,...r}=m;plans.push({...r,id:nid(m.id),projectId:pid,blob:f?await ent(f,type):new Blob([])});tick()}
 const planIds=new Set(man.plans.map(p=>p.id)),pinsIn=man.pins.filter(p=>planIds.has(p.planId)).map(p=>{const t=typeof migPanelType==='function'&&migPanelType(p);return t?{...p,type:t}:p}),pinIds=new Set(pinsIn.map(p=>p.id));
 for(const m of man.media){if(!pinIds.has(m.pinId))continue;const{file:f,type,size,annotFile,annotType,...r}=m,o={...r,id:nid(m.id),pinId:nid(m.pinId)};if(f)o.blob=await ent(f,type);if(annotFile)o.annot=await ent(annotFile,annotType);media.push(o);tick()}
 const mk=man.markups.filter(m=>planIds.has(m.planId)).map(m=>({...m,id:nid(m.id),planId:nid(m.planId)})),pn=pinsIn.map(p=>({...p,id:nid(p.id),planId:nid(p.planId)}));
 // 2) write everything; on failure remove what was written
 const wrote=[];try{for(const p of plans){await put('plans',p);wrote.push(['plans',p.id])}for(const m of mk){await put('markups',m);wrote.push(['markups',m.id])}for(const p of pn){await put('pins',p);wrote.push(['pins',p.id])}for(const m of media){await put('media',m);wrote.push(['media',m.id])}
  for(const[o,l]of Object.entries(man.layers||{}))if(idm.has(o))await put('meta',l,'layers:'+idm.get(o));
  for(const[o,l]of Object.entries(man.rots||{}))if(idm.has(o)&&l&&typeof l==='object')await put('meta',l,'rot:'+idm.get(o));
  if(man.cktpl&&typeof man.cktpl==='object'&&!Object.keys(CKT).length){CKT=sanTpl(man.cktpl);await put('meta',CKT,'cktpl')}
  for(const[o,l]of Object.entries(man.scales||{}))if(idm.has(o)&&l&&typeof l==='object')await put('meta',l,'scale:'+idm.get(o));
  let nl=0;if(Array.isArray(man.learned)&&man.learned.length){const have=new Set((await all('learned')).map(r=>r.id));for(const r of man.learned)if(r&&r.fp&&r.g&&!have.has(r.id)){await put('learned',r);nl++}lrCache=null;learnInfoUpd()}
  let nm=0;if(Array.isArray(man.mycodes)&&man.mycodes.length){const have=new Set((await all('mycodes')).map(r=>r.id));for(const r of man.mycodes)if(r&&r.section&&r.title&&!have.has(r.id)){await put('mycodes',{...r,id:r.id||uid(),personal:true});nm++}MY_CODES=null}
  if(man.installLinks&&typeof man.installLinks==='object'){await userLinks();for(const[m,v]of Object.entries(man.installLinks))if(v&&isHttp(v.url)&&(!ULINKS[m]||(+v.ts||0)>(+ULINKS[m].ts||0)))ULINKS[m]={url:String(v.url).trim(),ts:+v.ts||Date.now()};await put('meta',ULINKS,'installLinks')}
  if(man.userParts&&typeof man.userParts==='object'){await userParts();for(const[m,v]of Object.entries(man.userParts))if(m&&v&&typeof v==='object'&&!UPARTS[m]){UPARTS[m]={d:String(v.d||''),c:String(v.c||'My devices'),t:TYPES[v.t]?v.t:'',ts:+v.ts||Date.now()};if(UPARTS[m].t)await rememberModel(UPARTS[m].t,m)}await put('meta',UPARTS,'userParts')}
  if(replaceId){const old=(await all('plans')).filter(p=>p.projectId===replaceId&&!plans.some(x=>x.id===p.id));for(const o of old)await deletePlanData(o.id);const pr=await get('projects',replaceId);await put('projects',{...pr,...man.project,id:replaceId,name,created:pr?.created||Date.now()})}
  else await put('projects',{...man.project,id:pid,name,created:Date.now()});
  if(man.meta?.last&&idm.has(man.meta.last))await put('meta',idm.get(man.meta.last),'last:'+pid);
  if(man.meta?.job)await put('meta',man.meta.job,'job:'+pid);if(man.models&&typeof man.models==='object'){const cm=await get('meta','models:custom')||{};for(const[t,l]of Object.entries(man.models))if(Array.isArray(l))cm[t]=[...new Set([...(cm[t]||[]),...l.map(String)])];await put('meta',cm,'models:custom');MODELS_C=cm}
  return{pid,name,plans:plans.length,markups:mk.length,pins:pn.length,media:media.length,learned:nl,mycodes:nm}}
 catch(e){for(const[s,id]of wrote.reverse())try{await del(s,id)}catch{}throw e}}
// deliver a file: save picker (desktop Chrome/Edge), else share sheet, else a normal download
async function deliver(name,mime,ext,make){let h=null;if(window.showSaveFilePicker){try{h=await showSaveFilePicker({suggestedName:name,types:[{description:ext==='.bpm'?'Marker project':ext.toUpperCase().slice(1)+' file',accept:{[mime]:[ext]}}]})}catch(e){if(e.name==='AbortError')return null;h=null}}
 const blob=await make();if(h){const w=await h.createWritable();await w.write(blob);await w.close();return'saved as '+h.name}
 const f=new File([blob],name,{type:mime});if(navigator.canShare&&navigator.share&&matchMedia('(pointer:coarse)').matches){try{if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return'shared'}}catch(e){if(e.name==='AbortError')return null}}
 dl(blob,name);return'downloaded'}
$('#projSave').onclick=async()=>{if(!project)return;const n=(await learnedRules()).length;$('#svLN').textContent=n?`(${n})`:'(none yet)';$('#svLearned').disabled=!n;$('#exInfo').textContent='';$('#saveDlg').showModal()};
$('#svGo').onclick=async()=>{const pr=project,wl=$('#svLearned').checked;$('#saveDlg').close();busy(1,'Saving project');prog(0);
 try{const r=await deliver(fsafe(pr.name)+'.bpm','application/octet-stream','.bpm',async()=>{const b=await buildBpm(pr.id,wl,prog);window.__lastBpm=b;return b});if(r)toast(`Project "${pr.name}" ${r} (${(window.__lastBpm.size/1048576).toFixed(1)} MB)`)}catch(e){showErr('Saving the project failed: '+e.message)}finally{busy(0)}};
let opFile=null;$('#bpmFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;hideErr();try{const{man}=await readBpm(f);opFile=f;
 $('#opInfo').innerHTML=`<b>${esc(man.project?.name||f.name)}</b><br><small style="color:#94a3b8">${man.plans.length} plan(s), ${man.markups.length} markups, ${man.pins.length} pins, ${man.media.length} media · saved ${esc((man.saved||'').slice(0,16).replace('T',' '))} UTC${man.learned?.length?` · ${man.learned.length} learned rules (merged)`:''}</small>`;
 $('#opCur').textContent=project?`"${project.name}"`:'';document.querySelector('#openDlg [name=opMode][value=new]').checked=true;$('#openDlg').showModal()}catch(err){showErr(`Could not open "${f.name}": ${err.message}`)}};
$('#opGo').onclick=async()=>{const f=opFile,rep=document.querySelector('#openDlg [name=opMode]:checked').value==='replace'&&project;if(!f)return;
 if(rep&&!confirm(`Replace project "${project.name}" with the contents of this file? Its current plans, markups, pins and media will be deleted.`))return;$('#openDlg').close();opFile=null;stopAll();busy(1,'Opening project');prog(0);
 try{const r=await importBpm(f,rep?project.id:null,prog);if(rep)project=null;busy(0);await loadProject(r.pid);toast(`Opened "${r.name}": ${r.plans} plan(s), ${r.pins} pins, ${r.markups} markups, ${r.media} media`)}catch(e){showErr('Opening the project failed: '+e.message)}finally{busy(0)}};
// ---------- v10/v11: export all plans (vector overlay via pdf-lib) ----------
async function planPdf(pl,onPage,outDoc=null){
 await loadScale(pl.id);const L={...LAY0,...((await get('meta','layers:'+pl.id))||{})},mks=await byIdx('markups','planId',pl.id),pns=await byIdx('pins','planId',pl.id);
 const r=await exportPlanPdf(pl,mks,pns,L,onPage,outDoc);return r}
$('#exGo').onclick=async()=>{if(!project)return;const pr=project,mode=document.querySelector('#saveDlg [name=exMode]:checked').value,orig=$('#exOrig').checked;$('#saveDlg').close();busy(1,'Exporting plans');prog(0);
 try{const pls=(await all('plans')).filter(p=>p.projectId===pr.id).sort((a,b)=>a.added-b.added);if(!pls.length)throw new Error('this project has no plans');const zipOut=mode==='zip'||orig,base=fsafe(pr.name);
  const r=await deliver(base+(zipOut?'-plans.zip':'-plans.pdf'),zipOut?'application/zip':'application/pdf',zipOut?'.zip':'.pdf',async()=>{const files=[],used=new Set(),uniq=n=>{let o=n,k=2;while(used.has(o.toLowerCase()))o=n.replace(/(\.[^.]+)?$/,` (${k++})$1`);used.add(o.toLowerCase());return o};let tot=0;
   let one=null;const bt=t=>$('#busyTxt').textContent=t;
   for(let j=0;j<pls.length;j++){const pl=pls[j],stem=fsafe(pl.name.replace(/\.[^.]+$/,'')),op=(i,n)=>{bt(`Exporting ${j+1}/${pls.length}: page ${i}/${n}`);prog((j+i/n)/pls.length)};
    if(mode==='one'){const r=await planPdf(pl,op,one);one=r.doc;tot+=r.pages}
    else{const r=await planPdf(pl,op);const b=await r.doc.save();files.push({name:uniq(`${stem}-marked.pdf`),blob:new Blob([b],{type:'application/pdf'})});tot+=r.pages}
    if(orig&&pl.blob?.size)files.push({name:uniq('original/'+fsafe(pl.name)),blob:pl.blob})}
   if(one){const b=await one.save();files.unshift({name:uniq(base+'-plans.pdf'),blob:new Blob([b],{type:'application/pdf'})})}
   window.__lastExport={pages:tot,files:files.map(f=>[f.name,f.blob.size]),selectable:true};return zipOut?zipBlob(files):files[0].blob});
  if(r)toast(`Exported ${window.__lastExport.pages} page(s) from ${pls.length} plan(s), ${r}`)}catch(e){showErr('Export failed: '+e.message)}finally{busy(0)}};

// ---------- v11: selectable plan PDF (pdf-lib vector page + transparent markup overlay) ----------
const hexRgb=h=>{h=(h||'#000').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255}};
async function pageHasText(jsPage){try{const tc=await jsPage.getTextContent();let n=0;for(const it of tc.items){if((it.str||'').trim()){n++;if(n>=3)return true}}return n>0}catch{return false}}
async function rasterPageOverlay(W,H,drawFn){const sc=Math.min(2.5,Math.sqrt(16e6/(W*H)));const c=document.createElement('canvas');c.width=Math.round(W*sc);c.height=Math.round(H*sc);const x=c.getContext('2d');x.setTransform(sc,0,0,sc,0,0);drawFn(x,1/Math.max(1,Math.max(W,H)/1200));const blob=await new Promise(r=>c.toBlob(r,'image/png'));c.width=c.height=0;return blob}
function drawEmbRotated(page,emb,rot,W,H){const{degrees}=PDFLib,ew=emb.width,eh=emb.height;
 if(rot===90)page.drawPage(emb,{x:H,y:0,width:ew,height:eh,rotate:degrees(90)});
 else if(rot===180)page.drawPage(emb,{x:W,y:H,width:ew,height:eh,rotate:degrees(180)});
 else if(rot===270)page.drawPage(emb,{x:0,y:W,width:ew,height:eh,rotate:degrees(270)});
 else page.drawPage(emb,{x:0,y:0,width:ew,height:eh})}
async function overlayOnPage(out,page,W,H,pngBlob){const png=await out.embedPng(await pngBlob.arrayBuffer());page.drawImage(png,{x:0,y:0,width:W,height:H})}
async function rasterFullPage(jsPage,W,H,drawFn){const sc=Math.min(2.5,Math.sqrt(14e6/(W*H)));const c=document.createElement('canvas');c.width=Math.round(W*sc);c.height=Math.round(H*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(jsPage)await jsPage.render({canvasContext:x,viewport:jsPage.getViewport({scale:sc})}).promise;x.setTransform(sc,0,0,sc,0,0);drawFn(x,1/Math.max(1,Math.max(W,H)/1200));
 const jpeg=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));c.width=c.height=0;return jpeg}
/** Build a marked-up PDF for one plan. If outDoc is a PDFDocument, pages are appended to it. Returns {doc,pages,blob?}. */
async function exportPlanPdf(pl,mks,pns,L,onPage,outDoc=null){const{PDFDocument}=PDFLib;const out=outDoc||await PDFDocument.create();let pages=0;
 const keep=lay;lay=L||lay;try{
 if(pl.kind==='pdf'&&pl.blob?.size){const bytes=new Uint8Array(await pl.blob.arrayBuffer());const src=await PDFDocument.load(bytes,{ignoreEncryption:true});
  const js=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  try{for(let i=1;i<=js.numPages;i++){const jsp=await js.getPage(i),vp=jsp.getViewport({scale:1}),W=vp.width,H=vp.height,rot=jsp.rotate||0;
   const drawFn=(x,ps)=>{const E=L.exp;for(const m of mks)if(m.page===i&&(!E||mVis(m)))drawMarkup(x,m,1/1.5);const pp=pns.filter(p=>p.page===i&&(!E||pVis(p)));OFFMAP=pinOffsets(pp);for(const p of pp)(E?drawPinL:drawPin)(x,p,ps,false);OFFMAP=null;drawLegend(x,ps,pp,H)};
   const hasTxt=await pageHasText(jsp);
   if(hasTxt){const emb=await out.embedPage(src.getPage(i-1));const page=out.addPage([W,H]);drawEmbRotated(page,emb,rot,W,H);const ov=await rasterPageOverlay(W,H,drawFn);await overlayOnPage(out,page,W,H,ov)}
   else{const jpeg=await rasterFullPage(jsp,W,H,drawFn);const img=await out.embedJpg(await jpeg.arrayBuffer());const page=out.addPage([W,H]);page.drawImage(img,{x:0,y:0,width:W,height:H})}
   jsp.cleanup();pages++;onPage&&onPage(i,js.numPages)}}finally{js.destroy()}}
 else{const im=await createImageBitmap(pl.blob);const W=im.width,H=im.height;const drawFn=(x,ps)=>{const E=L.exp;for(const m of mks)if(m.page===1&&(!E||mVis(m)))drawMarkup(x,m,1/1.5);const pp=pns.filter(p=>p.page===1&&(!E||pVis(p)));OFFMAP=pinOffsets(pp);for(const p of pp)(E?drawPinL:drawPin)(x,p,ps,false);OFFMAP=null;drawLegend(x,ps,pp,H)};
  const jpeg=await rasterFullPage(null,W,H,(x,ps)=>{x.drawImage(im,0,0,W,H);drawFn(x,ps)});const img=await out.embedJpg(await jpeg.arrayBuffer());const page=out.addPage([W,H]);page.drawImage(img,{x:0,y:0,width:W,height:H});pages=1;onPage&&onPage(1,1)}
 }finally{lay=keep}
 if(!outDoc){try{out.setTitle((pl.name||'plan')+' (marked up)');out.setProducer('Marker')}catch{}}
 return{doc:out,pages}}
async function mergePdfBlobs(blobs){const{PDFDocument}=PDFLib;const out=await PDFDocument.create();
 for(const b of blobs){const src=await PDFDocument.load(await b.arrayBuffer());const pages=await out.copyPages(src,src.getPageIndices());for(const pg of pages)out.addPage(pg)}
 return new Blob([await out.save()],{type:'application/pdf'})}

// ---------- v11: code references catalog + personal library ----------
const fmtCodes=(cs)=>!cs?.length?'':cs.map(c=>`${c.code} ${c.section}`).join('; ');
const fmtCodeLine=c=>`${c.code} ${c.section} — ${c.title}`;
let CODE_CAT=[],MY_CODES=null,CODE_FAV=[];
async function loadCodes(){if(!CODE_CAT.length){try{CODE_CAT=await(await fetch('codes.json')).json()}catch{CODE_CAT=[]}}
 if(!MY_CODES)MY_CODES=await all('mycodes');CODE_FAV=(await get('meta','codeFav'))||[];return CODE_CAT}
async function allCodeEntries(){await loadCodes();return[...MY_CODES.map(c=>({...c,personal:true})),...CODE_CAT]}
function failedCkText(){return(ckl||[]).filter(c=>c.v==='fail').map(c=>c.t).join(' ').toLowerCase()}
function scoreCode(c,reason,type,ck){let s=0;const pers=!!c.personal;
 if(pers)s+=20; // personal library preferred
 if(c.reasons?.includes(reason))s+=8;
 if(c.types?.includes(type))s+=5;
 const tags=Array.isArray(c.tags)?c.tags:(c.tags?[c.tags]:[]);const blob=`${c.title} ${c.sum||c.text||''} ${tags.join(' ')}`.toLowerCase();
 if(reason){const r=reason.toLowerCase().split('/')[0].trim();if(r&&blob.includes(r))s+=2}
 if(type&&blob.includes(type))s+=1;
 if(ck){for(const w of ck.split(/\W+/).filter(x=>x.length>4)){if(blob.includes(w)){s+=2;break}}}
 return s}
let SUG=[];
async function suggestCodes(){const all=await allCodeEntries();if(!cur)return;const reason=form.elements.reason?.value||cur.reason||'',type=form.elements.type?.value||cur.type||'',ck=failedCkText();
 const scored=all.map(c=>({c,s:scoreCode(c,reason,type,ck)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||a.c.section.localeCompare(b.c.section,undefined,{numeric:true})).slice(0,8);
 SUG=scored.map(x=>x.c);
 const have=new Set((cur.codes||[]).map(c=>c.code+'|'+c.section));
 const left=SUG.filter(c=>!have.has(c.code+'|'+c.section));
 const html=left.length?'<small style="color:#94a3b8">Suggested (personal first)</small>'+left.map(c=>`<button type="button" class="btn" data-id="${esc(c.id)}">${c.personal?'📌 ':''}<b>${esc(fmtCodeLine(c))}</b></button>`).join(''):'';
 for(const sel of['#codeSug','#codeSugDlg']){const box=$(sel);if(!box)continue;box.innerHTML=html;box.querySelectorAll('[data-id]').forEach(b=>b.onclick=e=>{e.preventDefault();addCodeById(b.dataset.id)})}
 renderCodes()}
function codeHintUpd(){const el=$('#codeHint');if(!el)return;const crit=form.elements.severity.value==='Critical',n=cur?.codes?.length||0;
 el.textContent=crit?(n?'Critical — code reference attached.':'Critical — attach at least one code reference.'):(n?`${n} code reference(s).`:'Optional: attach NFPA 72 / IFC / IBC section references.')}
function renderCodes(){const box=$('#codeList');if(!box||!cur)return;
 box.innerHTML=(cur.codes||[]).map((c,i)=>`<button type="button" class="chip" data-i="${i}" title="${esc(c.sum||c.text||'')}"><span><b>${esc(fmtCodeLine(c))}</b></span><span class="sp"></span>✕</button>`).join('')||'<small style="color:#64748b">No codes yet</small>';
 const have=new Set((cur.codes||[]).map(c=>c.code+'|'+c.section));
 const left=(SUG||[]).filter(c=>!have.has(c.code+'|'+c.section));
 if(left.length)box.insertAdjacentHTML('beforeend',`<div class="row" style="gap:6px;margin-top:4px"><button type="button" class="btn pri" id="codeConfirm">✓ Confirm</button><small style="color:#94a3b8">Keeps attached codes; clears remaining suggestions</small></div>`);
 box.querySelectorAll('[data-i]').forEach(b=>b.onclick=e=>{e.preventDefault();cur.codes.splice(+b.dataset.i,1);renderCodes();codeHintUpd()});
 const cf=$('#codeConfirm');if(cf)cf.onclick=e=>{e.preventDefault();const n=(cur.codes||[]).length;SUG=[];const sug=$('#codeSug');if(sug)sug.innerHTML='';renderCodes();toast(n?`${n} code(s) confirmed`:'Suggestions cleared')};
 codeHintUpd()}
async function openCodePicker(){await loadCodes();$('#codeQ').value='';$('#codeDlg').showModal();renderCodeFav();suggestCodes();filterCodes('');renderMyCodesList();$('#codeQ').focus()}
function renderCodeFav(){const box=$('#codeFav');const all=[...MY_CODES,...CODE_CAT];const favs=CODE_FAV.map(id=>all.find(c=>c.id===id)).filter(Boolean).slice(0,10);
 box.innerHTML=favs.length?'<small style="width:100%;color:#94a3b8">Recent</small>'+favs.map(c=>`<button type="button" class="chip" data-id="${esc(c.id)}">${c.personal?'📌 ':''}${esc(c.code)} ${esc(c.section)}</button>`).join(''):'';
 box.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>addCodeById(b.dataset.id))}
async function filterCodes(q){const all=await allCodeEntries();q=(q||'').trim().toLowerCase();
 const hits=(!q?all.slice(0,50):all.filter(c=>{const tg=Array.isArray(c.tags)?c.tags:[];const rs=Array.isArray(c.reasons)?c.reasons:[];return `${c.code} ${c.section} ${c.title} ${c.sum||''} ${c.text||''} ${tg.join(' ')} ${rs.join(' ')}`.toLowerCase().includes(q)})).slice(0,60);
 $('#codeHits').innerHTML=hits.map(c=>`<button type="button" class="btn" data-id="${esc(c.id)}">${c.personal?'📌 ':''}<b>${esc(fmtCodeLine(c))}</b><br><small style="color:#94a3b8">${esc(c.sum||c.text||'')}</small></button>`).join('')||'<small>No matches</small>';
 $('#codeHits').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>addCodeById(b.dataset.id))}
async function addCodeById(id){const all=await allCodeEntries();const c=all.find(x=>x.id===id);if(c)await addCode(c)}
async function addCode(c){if(!c||!cur)return;cur.codes=cur.codes||[];if(cur.codes.some(x=>x.id===c.id||(x.code===c.code&&x.section===c.section))){toast('Already attached');return}
 cur.codes.push({id:c.id,code:c.code,section:c.section,title:c.title,sum:c.sum||c.text||'',note:'',personal:!!c.personal});
 CODE_FAV=[c.id,...CODE_FAV.filter(x=>x!==c.id)].slice(0,16);await put('meta',CODE_FAV,'codeFav');
 // refresh suggestion buttons so attached codes drop out; keep Confirm for leftovers
 const have=new Set(cur.codes.map(x=>x.code+'|'+x.section));
 const left=(SUG||[]).filter(x=>!have.has(x.code+'|'+x.section));
 const html=left.length?'<small style="color:#94a3b8">Suggested (personal first)</small>'+left.map(x=>`<button type="button" class="btn" data-id="${esc(x.id)}">${x.personal?'📌 ':''}<b>${esc(fmtCodeLine(x))}</b></button>`).join(''):'';
 const sug=$('#codeSug');if(sug){sug.innerHTML=html;sug.querySelectorAll('[data-id]').forEach(b=>b.onclick=e=>{e.preventDefault();addCodeById(b.dataset.id)})}
 renderCodes();renderCodeFav();toast(fmtCodeLine(c)+' added')}
function renderMyCodesList(){const box=$('#myCodeList');if(!box)return;box.innerHTML=MY_CODES.length?MY_CODES.map(c=>`<div class="row" style="align-items:flex-start;gap:6px;margin:4px 0"><button type="button" class="btn" data-use="${esc(c.id)}" style="flex:1;text-align:left;white-space:normal"><b>${esc(fmtCodeLine(c))}</b><br><small style="color:#94a3b8">${esc((c.text||c.sum||'').slice(0,120))}</small></button><button type="button" class="btn danger" data-del="${esc(c.id)}" title="Delete">🗑</button></div>`).join(''):'<small style="color:#64748b">No personal codes yet. Add entries from your NFPA 72 book below.</small>';
 box.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>addCodeById(b.dataset.use));
 box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this personal code?'))return;await del('mycodes',b.dataset.del);MY_CODES=null;await loadCodes();renderMyCodesList();filterCodes($('#codeQ').value);suggestCodes()})}
$('#codeAdd').onclick=e=>{e.preventDefault();openCodePicker()};
$('#codeQ').addEventListener('input',e=>filterCodes(e.target.value));
$('#myCodeSave').onclick=async e=>{e.preventDefault();const code=($('#myCodeStd').value||'NFPA 72').trim(),section=$('#myCodeSec').value.trim(),title=$('#myCodeTitle').value.trim(),text=$('#myCodeText').value.trim();
 if(!section||!title){alert('Section number and title are required.');return}
 const reasons=[...$('#myCodeReasons').selectedOptions].map(o=>o.value),types=[...$('#myCodeTypes').selectedOptions].map(o=>o.value);
 const rec={id:'my-'+uid(),code,section,title,text,sum:text.slice(0,160),reasons,types,tags:['personal'],personal:true,created:Date.now()};
 await put('mycodes',rec);MY_CODES=null;await loadCodes();$('#myCodeSec').value='';$('#myCodeTitle').value='';$('#myCodeText').value='';
 [...$('#myCodeReasons').options].forEach(o=>o.selected=false);[...$('#myCodeTypes').options].forEach(o=>o.selected=false);
 renderMyCodesList();filterCodes($('#codeQ').value);toast('Personal code saved');await addCode(rec)};
$('#myCodeTypes').innerHTML=Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');
loadCodes();

// ---------- v11: job / system info ----------
const JOB0={building:'',address:'',ahj:'',systemType:'Protected premises (local)',monitoring:'',panel:'',inspType:'Annual',inspDate:'',license:'',owner:'',ownerName:'',ownerAddr:'',ownerPhone:'',occupancy:'',panelMake:'',panelModel:'',firmware:'',panelLoc:'',monAcct:'',monPhone:'',monMethod:'',priPower:'',priLoc:'',battery:'',batDate:'',batTest:'',aux:'',company:'',techName:'',techLic:'',installDate:'',testDate:'',nextDate:'',result:'',remarks:''};
async function getJob(){return{...JOB0,...((await get('meta','job:'+project.id))||{})}}
async function saveJob(j){await put('meta',j,'job:'+project.id)}
function jobToForm(j){const f=$('#jobForm');for(const k of Object.keys(JOB0))if(f.elements[k])f.elements[k].value=j[k]||JOB0[k]}
function jobFromForm(){const f=$('#jobForm'),j={...JOB0};for(const k of Object.keys(JOB0))j[k]=f.elements[k]?.value?.trim()||'';return j}
$('#jobBtn').onclick=async()=>{if($('#saveDlg').open)$('#saveDlg').close();jobToForm(await getJob());$('#jobDlg').showModal()};
$('#jobSave').onclick=async e=>{e.preventDefault();await saveJob(jobFromForm());$('#jobDlg').close();toast('Job info saved')};
async function ensureJob(){let j=await getJob();if(j.building&&j.inspDate)return j;jobToForm(j);$('#jobDlg').showModal();
 await new Promise(res=>{$('#jobSave').addEventListener('click',function h(ev){ev.preventDefault();$('#jobSave').removeEventListener('click',h);res()},{once:true});
  $('#jobDlg').addEventListener('close',function h(){$('#jobDlg').removeEventListener('close',h);res()},{once:true})});
 j=jobFromForm();if($('#jobDlg').open)$('#jobDlg').close();if(!j.building)j.building=project.name;if(!j.inspDate)j.inspDate=new Date().toISOString().slice(0,10);await saveJob(j);return j}

// ---------- v11: NFPA 72-mapped documents (NOT official NFPA forms) ----------
function nfpaHeader(doc,title,j,tn){
 doc.setFillColor(30,41,59);doc.rect(0,0,612,72,'F');doc.setTextColor(255,255,255);doc.setFont(undefined,'bold');doc.setFontSize(16);doc.text(title,40,28);
 doc.setFont(undefined,'normal');doc.setFontSize(9);
 doc.text('Generated by Marker — maps to NFPA 72 Ch. 7 Documentation and Ch. 14 Inspection, Testing, and Maintenance.',40,46,{maxWidth:530});
 doc.setFontSize(10);doc.text(`Project: ${project.name}    Date: ${j.inspDate||fmtT(Date.now())}    Inspector: ${tn||'-'}${j.license?'  Lic. '+j.license:''}`,40,62);
 doc.setTextColor(120);doc.setFontSize(9);
 doc.text('This is NOT an official NFPA form and does not reproduce NFPA copyrighted form layouts or wording.',40,88,{maxWidth:530});
 doc.setTextColor(0,0,0);return 108}
function nfpaJobBlock(doc,j,y){const L=(t)=>{const ls=doc.splitTextToSize(t,530);doc.text(ls,40,y);y+=ls.length*12+2};doc.setFontSize(11);doc.setFont(undefined,'bold');doc.text('System / job information',40,y);y+=16;doc.setFont(undefined,'normal');doc.setFontSize(10);
 L(`Building: ${j.building||'-'}    Address: ${j.address||'-'}`);L(`Owner/contact: ${j.owner||'-'}    AHJ: ${j.ahj||'-'}`);
 L(`System type: ${j.systemType||'-'}    Monitoring: ${j.monitoring||'-'}`);L(`Control panel: ${j.panel||'-'}    Inspection type: ${j.inspType||'-'}`);
 // bpm-v72: NFPA 72 Ch. 7 record fields (project-level, editable in 🏛 Job info)
 const H=t=>{if(y>730){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.text(t,40,y);y+=13;doc.setFont(undefined,'normal')},v=x=>x||'-';
 H('Property / owner');L(`Owner: ${v(j.ownerName||j.owner)}    Owner address: ${v(j.ownerAddr)}    Phone: ${v(j.ownerPhone)}`);L(`Occupancy / use: ${v(j.occupancy)}`);
 H('Control unit');L(`Manufacturer: ${v(j.panelMake)}    Model: ${v(j.panelModel)}    Firmware/software: ${v(j.firmware)}    Location: ${v(j.panelLoc)}`);
 H('Off-premises monitoring');L(`Company: ${v(j.monitoring)}    Account #: ${v(j.monAcct)}    Phone: ${v(j.monPhone)}    Method: ${v(j.monMethod)}`);
 H('Power supplies');L(`Primary (panel/circuit): ${v(j.priPower)}    Location: ${v(j.priLoc)}`);L(`Secondary / batteries: ${v(j.battery)}    Battery date: ${v(j.batDate)}    Battery test: ${v(j.batTest)}`);L(`Other power supplies (NAC/aux): ${v(j.aux)}`);
 H('Service / technician');L(`Company: ${v(j.company)}    Technician: ${v(j.techName)}    Cert/license #: ${v(j.techLic||j.license)}`);
 H('Dates / result');L(`Installed: ${v(j.installDate)}    Inspection: ${v(j.inspDate)}    Test: ${v(j.testDate)}    Next due: ${v(j.nextDate)}`);L(`Overall test result: ${v(j.result)}`);if(j.remarks)L(`Remarks: ${j.remarks}`);
 doc.setDrawColor(180);doc.line(40,y,572,y);return y+14}
function nfpaFooter(doc,name){const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(120);doc.text(`${name} · Marker report (NFPA 72-mapped) · page ${i} of ${n}`,40,780);doc.setTextColor(0)}}
async function nfpaDeviceStats(D){const by={};for(const{pins:ps}of D)for(const p of ps){const t=p.type||'other';(by[t]??= {t,n:0,pass:0,fail:0,ip:0,nt:0,na:0});by[t].n++;
  if(p.status==='passed')by[t].pass++;else if(p.status==='failed')by[t].fail++;else if(p.status==='in progress')by[t].ip++;else by[t].nt++;
  for(const c of p.checks||[])if(c.v==='na')by[t].na++}return Object.values(by).sort((a,b)=>(TYPES[a.t]?.n||'').localeCompare(TYPES[b.t]?.n||''))}
$('#nfpaItm').onclick=async()=>{if(!project)return;$('#saveDlg').close();busy(1,'Building ITM record');try{
 const j=await ensureJob(),D=await projData(),all_=D.flatMap(d=>d.pins),c=cntSt(all_),tn=await getTester(),stats=await nfpaDeviceStats(D),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});
 let y=nfpaHeader(doc,'Inspection & Testing Record',j,tn);y=nfpaJobBlock(doc,j,y);
 doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text('Summary (live device data)',40,y);y+=14;doc.setFont(undefined,'normal');doc.setFontSize(10);
 doc.text(`Devices: ${c.t}    Passed: ${c.passed}    Failed: ${c.failed}    In progress: ${c.ip}    Not tested: ${c.nt}    (${c.pct}% tested)`,40,y);y+=18;
 doc.setFont(undefined,'bold');doc.text('Visual inspection / testing results by device type',40,y);y+=6;doc.setFontSize(8);doc.setTextColor(100);doc.text('Mapped to NFPA 72 Chapter 14 inspection and testing tables (section numbers cited in the deficiency list where attached).',40,y+10);doc.setTextColor(0);y+=22;
 doc.setFontSize(9);doc.setFont(undefined,'bold');['Type','Total','Passed','Failed','In prog.','Not tested'].forEach((h,i)=>doc.text(h,40+i*85,y));y+=12;doc.setFont(undefined,'normal');
 for(const r of stats){if(y>750){doc.addPage();y=44}doc.text((TYPES[r.t]?.n||r.t).slice(0,18),40,y);[r.n,r.pass,r.fail,r.ip,r.nt].forEach((v,i)=>doc.text(String(v),125+i*85,y));y+=12}
 y+=10;doc.setFont(undefined,'bold');doc.setFontSize(11);if(y>720){doc.addPage();y=44}doc.text('Deficiencies found',40,y);y+=14;doc.setFont(undefined,'normal');doc.setFontSize(10);
 const defs=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='failed').map(p=>({pl,p}))).sort((a,b)=>(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1));
 if(!defs.length){doc.text('None recorded.',40,y);y+=14}
 for(const{pl,p}of defs){const block=[`${p.severity||'-'}: ${TYPES[p.type]?.n||p.type}${p.model?' ['+p.model+']':''} ${p.address||''} (Loop ${p.loop||'-'})${p.location?' @ '+p.location:''} — ${p.reason||''}${p.reasonText?': '+p.reasonText:''}`,`${pl.name} pg ${p.page}${p.testedAt?' · '+fmtT(p.testedAt):''}${p.tester?' · '+p.tester:''}`,p.codes?.length?`Code refs: ${fmtCodes(p.codes)} (${(p.codes).map(c=>c.title).join('; ')})`:'Code refs: (none)',p.notes?`Notes: ${p.notes}`:''].filter(Boolean);
  const lines=doc.splitTextToSize(block.join('\n'),530);if(y+lines.length*12>760){doc.addPage();y=44}if(p.severity==='Critical')doc.setTextColor(185,28,28);doc.text(lines,40,y);doc.setTextColor(0);y+=lines.length*12+8}
 y+=8;if(y>680){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.text('Signatures',40,y);y+=20;doc.setFont(undefined,'normal');
 doc.text(`Inspector: ${j.techName||'_______________________________'}  Sign: ______________  Date: __________  License: `+(j.techLic||j.license||'__________'),40,y);y+=28;
 doc.text('Owner / representative: _______________________________  Date: __________',40,y);y+=28;
 doc.text('AHJ (if required): _______________________________  Date: __________',40,y);
 nfpaFooter(doc,project.name);dl(doc.output('blob'),fsafe(project.name)+'-inspection-testing-record.pdf');toast('Inspection & Testing Record exported')}
 catch(e){showErr('ITM record failed: '+e.message)}finally{busy(0)}};

$('#nfpaComp').onclick=async()=>{if(!project)return;$('#saveDlg').close();busy(1,'Building completion record');try{
 const j=await ensureJob(),D=await projData(),all_=D.flatMap(d=>d.pins),c=cntSt(all_),tn=await getTester(),stats=await nfpaDeviceStats(D),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});
 let y=nfpaHeader(doc,'Record of Completion / Acceptance Summary',j,tn);y=nfpaJobBlock(doc,j,y);
 doc.setFontSize(9);doc.setTextColor(100);doc.text('Maps to NFPA 72 Chapter 7 documentation for system completion / acceptance (not an official NFPA Record of Completion form).',40,y,{maxWidth:530});doc.setTextColor(0);y+=28;
 doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text('System inventory (from this project)',40,y);y+=14;doc.setFont(undefined,'normal');doc.setFontSize(10);
 doc.text(`Plans in project: ${D.length}    Devices documented: ${c.t}    Passed: ${c.passed}    Failed: ${c.failed}    Not tested: ${c.nt}`,40,y);y+=16;
 for(const r of stats){if(y>750){doc.addPage();y=44}doc.text(`${TYPES[r.t]?.n||r.t}: ${r.n} device(s)`,40,y);y+=12}
 y+=10;doc.setFont(undefined,'bold');doc.text('Acceptance checklist (inspector confirms)',40,y);y+=16;doc.setFont(undefined,'normal');
 for(const t of['As-built drawings / device list available (NFPA 72 7.2–7.4 related)','Control unit functions verified','Initiating devices tested or accounted for','Notification appliances tested or accounted for','Off-premises signaling verified (if applicable)','Owner instructed on system operation','Open deficiencies listed below have a correction plan']){if(y>750){doc.addPage();y=44}doc.rect(40,y-8,10,10);doc.text(t,56,y);y+=18}
 y+=6;doc.setFont(undefined,'bold');doc.text('Outstanding deficiencies at acceptance',40,y);y+=14;doc.setFont(undefined,'normal');
 const defs=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='failed').map(p=>({pl,p})));
 if(!defs.length)doc.text('None.',40,y),y+=14;
 for(const{pl,p}of defs){const t=`• ${p.severity}: ${TYPES[p.type]?.n||p.type}${p.model?' ['+p.model+']':''} ${p.address||''} — ${p.reason||''}${p.codes?.length?' ['+fmtCodes(p.codes)+']':''} (${pl.name} pg ${p.page})`;const ls=doc.splitTextToSize(t,530);if(y+ls.length*12>760){doc.addPage();y=44}doc.text(ls,40,y);y+=ls.length*12+4}
 y+=16;if(y>700){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.text('Acceptance signatures',40,y);y+=22;doc.setFont(undefined,'normal');
 doc.text('Installing contractor: _________________________  Date: ________',40,y);y+=24;
 doc.text(`Inspector / acceptance tester: ${j.techName?j.techName+(j.techLic?' (Lic. '+j.techLic+')':'')+'  Sign: ___________':'_________________________'}  Date: ________`,40,y);y+=24;
 doc.text('Owner: _________________________  Date: ________    AHJ: _________________________',40,y);
 nfpaFooter(doc,project.name);dl(doc.output('blob'),fsafe(project.name)+'-record-of-completion.pdf');toast('Record of Completion summary exported')}
 catch(e){showErr('Completion record failed: '+e.message)}finally{busy(0)}};

$('#nfpaDef').onclick=async()=>{if(!project)return;$('#saveDlg').close();busy(1,'Building deficiency list');try{
 const j=await ensureJob(),D=await projData(),tn=await getTester(),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});
 let y=nfpaHeader(doc,'Deficiency / Impairments List',j,tn);y=nfpaJobBlock(doc,j,y);
 doc.setFontSize(9);doc.setTextColor(100);doc.text('For impairment handling see NFPA 72 10.4; correct deficiencies per the owner\'s procedures and AHJ requirements (NFPA 72 14.2.10 related).',40,y,{maxWidth:530});doc.setTextColor(0);y+=24;
 const defs=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='failed').map(p=>({pl,p}))).sort((a,b)=>(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1)||String(a.p.address).localeCompare(b.p.address,undefined,{numeric:true}));
 doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text(`${defs.length} deficiency(ies) · ${defs.filter(d=>d.p.severity==='Critical').length} critical`,40,y);y+=16;doc.setFont(undefined,'normal');doc.setFontSize(10);
 if(!defs.length)doc.text('No failed devices in this project.',40,y);
 for(const{pl,p}of defs){const ph=await firstPhoto(p.id);let im=null;if(ph)try{im=await blobJpeg(ph,500)}catch{}
  const head=`${p.severity||'Non-critical'}: ${TYPES[p.type]?.n||p.type}${p.model?' ['+p.model+']':''} ${p.address||'(no address)'} · Loop ${p.loop||'-'}${p.location?' · '+p.location:''}`;
  const body=[`Reason: ${p.reason||'-'}${p.reasonText?' — '+p.reasonText:''}`,p.codes?.length?`Code references:\n`+p.codes.map(c=>`  • ${c.code} ${c.section} — ${c.title}`).join('\n'):'Code references: (none attached)',p.location?`Location: ${p.location}`:'',`Plan: ${pl.name}, page ${p.page}`,`Tested: ${p.testedAt?fmtT(p.testedAt):'-'}${p.tester?' by '+p.tester:''}`,p.notes?`Notes: ${p.notes}`:''].filter(Boolean).join('\n');
  const lines=doc.splitTextToSize(body,im?300:530);const ih=im?Math.min(120,im.h*(160/im.w)):0;const need=Math.max(ih,28+lines.length*12)+16;if(y+need>760){doc.addPage();y=44}
  if(p.severity==='Critical')doc.setTextColor(185,28,28);doc.setFont(undefined,'bold');doc.text(head,40,y+10);doc.setTextColor(0);doc.setFont(undefined,'normal');doc.text(lines,40,y+24);if(im)doc.addImage(im.d,'JPEG',400,y,160,ih);y+=need;doc.setDrawColor(200);doc.line(40,y-8,572,y-8)}
 y+=12;if(y>700){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.text('Impairment / correction log',40,y);y+=18;doc.setFont(undefined,'normal');
 doc.text('Date impaired: ________  Notified monitoring: ☐  Notified AHJ: ☐  Tag posted: ☐',40,y);y+=20;
 doc.text('Corrected by: _____________________  Date restored: ________  Retest result: ________',40,y);y+=28;
 doc.text('Owner sign: _____________________    Inspector sign: _____________________',40,y);
 nfpaFooter(doc,project.name);dl(doc.output('blob'),fsafe(project.name)+'-deficiencies-impairments.pdf');toast('Deficiency / Impairments list exported')}
 catch(e){showErr('Deficiency list failed: '+e.message)}finally{busy(0)}};



// ---------- v12/v15: clear pins or markups (page / plan / project) ----------
var clrWhat='pins';
async function planIdsOf(){const ids=(await all('plans')).filter(p=>p.projectId===project.id).map(p=>p.id);planIdsOf.cache=ids;return ids}
async function clrCounts(){const arr=clrWhat==='pins'?pins:markups,ids=await planIdsOf(),pr=(await all(clrWhat)).filter(p=>ids.includes(p.planId));return{page:arr.filter(p=>p.page===page).length,plan:arr.length,proj:pr.length}}
function clrInfoUpd(){const v=document.querySelector('#clrDlg [name=clr]:checked').value,n=clrInfoUpd.n||{};const c=n[v]||0,P=clrWhat==='pins';
 $('#clrInfo').textContent=c?`Deletes ${c} ${P?'pin':'markup'}${c>1?'s':''}${P?' plus their photos, videos, voice notes and checklists':' (shapes, text, lines, measurements)'}. `+(v==='proj'?`${P?'Pins':'Markups'} on other plans cannot be undone — save a .bpm first if unsure.`:'Undo (↶) restores them in one step.'):`No ${clrWhat} in this scope.`;$('#clrGo').disabled=!c}
async function clrOpen(what){if(!project)return;clrWhat=what;$('#clrH').textContent=what==='pins'?'🗑 Clear pins':'🗑 Clear markups';const n=await clrCounts();clrInfoUpd.n=n;$('#clrNpage').textContent=`(${n.page})`;$('#clrNplan').textContent=`(${n.plan})`;$('#clrNproj').textContent=`(${n.proj})`;
 document.querySelectorAll('#clrDlg [name=clr]').forEach(r=>{r.disabled=r.value!=='proj'&&!plan;r.onchange=clrInfoUpd});if(!plan)document.querySelector('#clrDlg [value=proj]').checked=true;clrInfoUpd();$('#clrDlg').showModal()}
$('#clrBtn').onclick=()=>clrOpen('pins');$('#clrMBtn').onclick=()=>clrOpen('markups');
$('#clrGo').onclick=async()=>{const v=document.querySelector('#clrDlg [name=clr]:checked').value,c=clrInfoUpd.n[v],P=clrWhat==='pins',st=clrWhat;
 if(!confirm(`Delete ${c} ${P?'pin(s) and their media':'markup(s)'}${v==='proj'?' across the whole project':v==='plan'?' on this plan':' on this page'}?`+(v==='proj'?` ${P?'Pins':'Markups'} on other plans cannot be undone.`:'')))return;$('#clrDlg').close();if(ted)tedEnd(false);busy(1,P?'Clearing pins':'Clearing markups');
 try{const arr=P?pins:markups,L=[];const mine=v==='page'?arr.filter(p=>p.page===page):plan?arr.slice():[];for(const p of mine)L.push(P?{store:'pins',id:p.id,before:p,after:null,media:await byIdx('media','pinId',p.id)}:{store:'markups',id:p.id,before:p,after:null});
  sel=null;msel=[];if(L.length)await changeMulti(L);let other=0;
  if(v==='proj'){const ids=await planIdsOf();for(const p of await all(st)){if(!ids.includes(p.planId)||p.planId===plan?.id)continue;if(P)for(const m of await byIdx('media','pinId',p.id))await del('media',m.id);await del(st,p.id);other++}}
  draw();renderList();toast(`Cleared ${L.length+other} ${P?'pin':'markup'}(s)`+(L.length?' — undo available for this plan':''),true)}catch(e){showErr('Clear failed: '+e.message)}finally{busy(0)}};
// ---------- v13: split legacy generic Panel pins into FACP / DACT / FATC (best effort) ----------
function migPanelType(p){if(p.type!=='panel'&&p.type!=='other')return null;const d=String(p.detected||'')+' '+String(p.detG||'')+' '+String(p.notes||'');
 if(/\bDACT\b|communicator/i.test(d))return'dact';if(/\bFATC\b|terminal cabinet/i.test(d))return'fatc';if(/PANEL_BOX|panelbox|equipment box/i.test(d))return'panelbox';if(p.type==='other'&&/\bFACP\b/i.test(d))return'panel';return null}
async function migratePanels(){if(await get('meta','mig:v13'))return 0;let n=0;for(const p of await all('pins')){const t=migPanelType(p);if(t&&t!==p.type){p.type=t;await put('pins',p);n++}}await put('meta',1,'mig:v13');return n}

// ---------- v14: measure to scale ----------
// Scale is stored per plan in meta 'scale:<planId>' = {def:ppf|null, pages:{[n]:ppf}}; ppf = plan points per real foot.
const SCL={},MS={mode:'line',cal:false,pts:[],hover:null,snap:true,unit:'ft',refs:{smoke:false,pull:false,exit:false}};
const FA_REFS={smoke:{ft:30,n:'Smoke spacing ~30′'},pull:{ft:200,n:'Pull travel 200′'},exit:{ft:5,n:'Pull ≤5′ from exit'}};
async function loadScale(pid){const v=await get('meta','scale:'+pid);SCL[pid]=v&&typeof v==='object'?{def:v.def||null,pages:v.pages||{}}:{def:null,pages:{}};return SCL[pid]}
const ppfOf=(pid,pg)=>{const v=SCL[pid];if(!v)return null;return v.pages?.[pg]||v.def||null};
function parseLen(str){const t=String(str||'').trim().toLowerCase().replace(/[’′]/g,"'").replace(/[”″]/g,'"').replace(/,/g,'.');if(!t)return null;let m;
 if(m=t.match(/^(\d+(?:\.\d+)?)\s*(m|meters?|metres?)$/))return +m[1]/0.3048;
 if(m=t.match(/^(\d+(?:\.\d+)?)\s*(cm)$/))return +m[1]/30.48;
 if(m=t.match(/^(\d+(?:\.\d+)?)\s*(mm)$/))return +m[1]/304.8;
 if(m=t.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*-?\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inch(?:es)?)?)?$/))return +m[1]+(m[2]?+m[2]/12:0);
 if(m=t.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inch(?:es)?)$/))return +m[1]/12;
 if(m=t.match(/^(\d+(?:\.\d+)?)$/))return +m[1];return null}
function fmtLen(ft){if(ft==null||!isFinite(ft))return'?';if(MS.unit==='m'){const v=ft*0.3048;return(v<10?v.toFixed(2):v.toFixed(1))+' m'}let i=Math.round(ft*12),f=Math.floor(i/12);i-=f*12;return`${f}′ ${i}″`}
function fmtArea(sqft){if(MS.unit==='m'){const v=sqft*0.092903;return(v<100?v.toFixed(1):Math.round(v))+' m²'}return Math.round(sqft).toLocaleString()+' ft²'}
function fmtScale(ppf){if(!ppf)return'not calibrated';const fpi=72/ppf,ratio=Math.round(fpi*12);if(MS.unit==='m')return`1:${ratio} (at PDF size)`;const ft=Math.floor(fpi),inch=Math.round((fpi-ft)*12);return`1″ = ${ft}′-${inch}″ · 1:${ratio}`}
const mPts=m=>m.type==='dpath'?(m.rp||[]).map(([dx,dy])=>[m.x1+dx,m.y1+dy]):[[m.x1,m.y1],[m.x2,m.y2]];
function mPathLen(P){let L=0;for(let i=1;i<P.length;i++)L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);return L}
function mLabel(m){const ppf=ppfOf(m.planId,m.page);if(m.type==='cal')return'calibrate';
 if(!ppf)return'⚠ set scale';if(m.type==='darea'){const w=Math.abs(m.x2-m.x1)/ppf,h=Math.abs(m.y2-m.y1)/ppf;return`${fmtLen(w)} × ${fmtLen(h)} · ${fmtArea(w*h)}`}
 return fmtLen(mPathLen(mPts(m))/ppf)}
function mRealLen(m){const ppf=ppfOf(m.planId,m.page);if(!ppf)return null;return m.type==='darea'?null:mPathLen(mPts(m))/ppf}
function refNote(ft){if(ft==null)return'';const o=[];for(const[k,r]of Object.entries(FA_REFS))if(MS.refs[k])o.push(`${ft<=r.ft?'≤':'>'}${r.ft}′ ${k}${ft<=r.ft?' ✓':' !'}`);return o.join(' · ')}
function drawMeasure(c,m,s){const P=mPts(m),lw=c.lineWidth;
 if(m.type==='cal')c.setLineDash([8/s,5/s]);
 if(m.type==='darea'){const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);c.save();c.globalAlpha*=.12;c.fillStyle=m.color;c.fillRect(x,y,w,h);c.restore();c.strokeRect(x,y,w,h)}
 else{c.beginPath();P.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
  // end ticks (perpendicular), and vertex dots for paths
  const tk=(a,b)=>{const ang=Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI/2,L=Math.max(lw*3,8/s);c.beginPath();c.moveTo(a[0]-L*Math.cos(ang),a[1]-L*Math.sin(ang));c.lineTo(a[0]+L*Math.cos(ang),a[1]+L*Math.sin(ang));c.stroke()};
  c.setLineDash([]);if(P.length>=2){tk(P[0],P[1]);tk(P[P.length-1],P[P.length-2])}if(m.type==='dpath')for(const[x,y]of P.slice(1,-1)){c.beginPath();c.arc(x,y,Math.max(lw,3/s),0,7);c.fillStyle=m.color;c.fill()}}
 c.setLineDash([]);let lab=m.label||mLabel(m);if(m===draft&&MS.refs){const n=refNote(mRealLen(m));if(n)lab+=' · '+n}
 let lx,ly;if(m.type==='darea'){lx=(m.x1+m.x2)/2;ly=(m.y1+m.y2)/2}else if(m.type==='dpath'){[lx,ly]=P[P.length-1]}else{lx=(m.x1+m.x2)/2;ly=(m.y1+m.y2)/2}
 const fs=13/s;c.font=`bold ${fs}px sans-serif`;c.textAlign='center';c.textBaseline='bottom';c.lineJoin='round';c.lineWidth=fs/3.5;c.strokeStyle='#fff';c.globalAlpha=Math.max(c.globalAlpha,.9);c.strokeText(lab,lx,ly-4/s);c.fillStyle=m.type==='cal'?'#0369a1':m.color;c.fillText(lab,lx,ly-4/s)}
function mkGeom(self){const pts=[],segs=[];
 const box=(x1,y1,x2,y2)=>{const x=Math.min(x1,x2),y=Math.min(y1,y2),X=Math.max(x1,x2),Y=Math.max(y1,y2);
  pts.push([x,y],[X,y],[X,Y],[x,Y],[(x+X)/2,y],[(x+X)/2,Y],[x,(y+Y)/2],[X,(y+Y)/2]);
  segs.push([x,y,X,y],[X,y,X,Y],[X,Y,x,Y],[x,Y,x,y])};
 for(const m of markups){if(m===self||(self&&self.id&&m.id===self.id)||m.page!==page||!mVis(m))continue;
  if(m.type==='arrow'||m.type==='line'||m.type==='dim'||m.type==='cal'){pts.push([m.x1,m.y1],[m.x2,m.y2]);segs.push([m.x1,m.y1,m.x2,m.y2]);continue}
  if(m.type==='rect'||m.type==='cloud'||m.type==='ellipse'||m.type==='check'||m.type==='darea'){box(m.x1,m.y1,m.x2,m.y2);continue}
  if(m.type==='dpath'){const P=mPts(m);for(const p of P)pts.push(p);for(let i=1;i<P.length;i++)segs.push([P[i-1][0],P[i-1][1],P[i][0],P[i][1]])}}
 if(self&&self.x1!=null)pts.push([self.x1,self.y1]);return{pts,segs}}
function mkSnap(w,self){if(!MK_SNAP)return w;const r=14/view.s,{pts,segs}=mkGeom(self);let best=null,bd=r;
 // Prefer corners/endpoints over bare edge projections so shapes meet at corners when close
 for(const[x,y]of pts){const d=Math.hypot(x-w.x,y-w.y);if(d<bd){bd=d;best={x,y}}}
 if(best)return best;
 for(const[x1,y1,x2,y2]of segs){const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((w.x-x1)*dx+(w.y-y1)*dy)/((dx*dx+dy*dy)||1)));const x=x1+t*dx,y=y1+t*dy,d=Math.hypot(x-w.x,y-w.y);if(d<bd){bd=d;best={x,y}}}
 if(best)return best;let sx=null,sy=null,bdx=r,bdy=r;
 for(const[x,y]of pts){if(Math.abs(x-w.x)<bdx){bdx=Math.abs(x-w.x);sx=x}if(Math.abs(y-w.y)<bdy){bdy=Math.abs(y-w.y);sy=y}}
 return(sx!=null||sy!=null)?{x:sx??w.x,y:sy??w.y}:w}
function mkSnapMove(g,ddx,ddy,self){if(!MK_SNAP)return{ddx,ddy};const r=14/view.s;let best=null,bd=r;
 const trial={type:g.type,x1:g.x1+ddx,y1:g.y1+ddy,x2:g.x2+ddx,y2:g.y2+ddy};
 for(const[hx,hy]of handles(trial)){const s=mkSnap({x:hx,y:hy},self||trial);const d=Math.hypot(s.x-hx,s.y-hy);if(d<bd&&d>1e-6){bd=d;best={dx:s.x-hx,dy:s.y-hy}}}
 return best?{ddx:ddx+best.dx,ddy:ddy+best.dy}:{ddx,ddy}}
function mSnap(w,self){if(!MS.snap)return w;const r=14/view.s;let best=null,bd=r;for(const m of markups){if(m===self||m.page!==page||!['dim','dpath','darea','line','arrow'].includes(m.type))continue;
 const P=m.type==='darea'?[[m.x1,m.y1],[m.x2,m.y1],[m.x2,m.y2],[m.x1,m.y2]]:mPts(m);for(const[x,y]of P){const d=Math.hypot(x-w.x,y-w.y);if(d<bd){bd=d;best={x,y}}}}
 for(const[x,y]of MS.pts){const d=Math.hypot(x-w.x,y-w.y);if(d<bd&&MS.pts.length>2){bd=d;best={x,y}}}return best||w}
function mPathDraft(){if(!MS.pts.length)return null;const P=MS.hover?[...MS.pts,[MS.hover.x,MS.hover.y]]:MS.pts;const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]),x1=Math.min(...xs),y1=Math.min(...ys);
 return{id:'mp',planId:plan.id,page,type:'dpath',x1,y1,x2:Math.max(...xs),y2:Math.max(...ys),rp:P.map(([x,y])=>[x-x1,y-y1]),color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false),_live:1}}
let mLastTap=0;
async function mPathTap(w){const now=Date.now(),last=MS.pts[MS.pts.length-1];if(last&&now-mLastTap<380&&Math.hypot(last[0]-w.x,last[1]-w.y)<20/view.s){mLastTap=0;await mPathDone();return}mLastTap=now;MS.pts.push([w.x,w.y]);MS.hover=null;draft=mPathDraft();mRead();renderMBar();requestDraw(false)}
async function mPathDone(){const d=MS.pts.length>=2?(MS.hover=null,mPathDraft()):null;MS.pts=[];draft=null;if(d){delete d._live;d.id=uid();await change('markups',null,d);toast('Path saved: '+mLabel(d),true)}renderMBar();mRead();drawOverlay()}
async function mCalibrate(d){const px=Math.hypot(d.x2-d.x1,d.y2-d.y1);if(px<4/view.s){toast('Drag along a known dimension to calibrate');return}
 const v=prompt('Real length of that line?\nExamples: 10\'  ·  10\' 6"  ·  10.5 ft  ·  126 in  ·  3.2 m','');if(v===null)return;const ft=parseLen(v);if(!ft||ft<=0){alert('Could not read that length. Try 10\' 6", 10.5 ft or 3.2 m.');return}
 const ppf=px/ft,cur=SCL[plan.id]||{def:null,pages:{}};const all_=pdf&&pdf.numPages>1?confirm(`Scale set: ${fmtLen(ft)} = ${px.toFixed(0)} pt.\n\nOK = use for ALL pages of this plan\nCancel = this page (${page}) only`):true;
 const nv={def:all_?ppf:cur.def,pages:{...cur.pages}};if(all_){nv.pages={}}else nv.pages[page]=ppf;SCL[plan.id]=nv;await put('meta',nv,'scale:'+plan.id);MS.cal=false;renderMBar();draw();toast(`Scale: ${fmtScale(ppf)}${all_?'':' (page '+page+')'}`)}
function mRead(){const el=document.getElementById('mRead');if(!el)return;let m=draft&&['dim','darea','dpath','cal'].includes(draft.type)?draft:null;if(m){const ppf=ppfOf(plan.id,page);
  el.textContent=m.type==='cal'?`${Math.hypot(m.x2-m.x1,m.y2-m.y1).toFixed(0)} pt`:(ppf?mLabel(m)+(refNote(mRealLen(m))?' · '+refNote(mRealLen(m)):''):'⚠ calibrate first')}else el.textContent=MS.pts.length?`${MS.pts.length} pt(s) — tap to add, double-tap or ✔ to finish`:''}
function renderMBar(){const b=$('#mBar');if(tool!=='measure'||!plan){b.hidden=true;return}b.hidden=false;const ppf=ppfOf(plan.id,page),pp=SCL[plan.id]?.pages?.[page];
 b.innerHTML=`<div class="row"><b>📏</b><select id="mMode" title="Measure mode"><option value="line">Line</option><option value="path">Path</option><option value="area">Area</option></select><button type="button" class="btn${MS.cal?' pri':''}" id="mCal" title="Calibrate: drag along a known length">📐 ${MS.cal?'Drag known length…':'Calibrate'}</button><button type="button" class="btn" id="mUnit" title="Units">${MS.unit==='m'?'m':'ft'}</button><label title="Snap to measure endpoints"><input type="checkbox" id="mSnapC"${MS.snap?' checked':''}> snap</label>${MS.pts.length?'<button type="button" class="btn pri" id="mDone">✔ Done</button><button type="button" class="btn" id="mX">✕</button>':''}</div>
 <div class="row"><small id="mScale" class="${ppf?'':'st-failed'}">Scale: ${esc(fmtScale(ppf))}${pp?' · this page':''}</small>${ppf?'<button type="button" class="btn mini" id="mClr" title="Remove calibration">reset</button>':''}</div>
 <div class="row mrefs">${Object.entries(FA_REFS).map(([k,r])=>`<button type="button" class="chip${MS.refs[k]?' on':''}" data-ref="${k}">${esc(r.n)}</button>`).join('')}</div>
 ${Object.values(MS.refs).some(Boolean)?'<small class="mnote">Typical values for reference only — not code enforcement. Verify against the adopted NFPA 72 / IFC edition and the AHJ.</small>':''}<b id="mRead"></b>`;
 $('#mMode').value=MS.mode;$('#mMode').onchange=e=>{MS.mode=e.target.value;MS.pts=[];draft=null;drawOverlay();renderMBar()};
 $('#mCal').onclick=()=>{MS.cal=!MS.cal;MS.pts=[];draft=null;renderMBar();if(MS.cal)toast('Drag along a dimension line or scale bar of known length')};
 $('#mUnit').onclick=async()=>{MS.unit=MS.unit==='m'?'ft':'m';await put('meta',MS.unit,'munit');renderMBar();draw()};$('#mSnapC').onchange=e=>MS.snap=e.target.checked;
 if($('#mDone'))$('#mDone').onclick=mPathDone;if($('#mX'))$('#mX').onclick=()=>{MS.pts=[];draft=null;renderMBar();drawOverlay()};
 if($('#mClr'))$('#mClr').onclick=async()=>{if(!confirm(pp?`Remove the page ${page} scale (falls back to the plan scale if set)?`:'Remove this plan\'s scale?'))return;const v=SCL[plan.id];if(pp)delete v.pages[page];else v.def=null;await put('meta',v,'scale:'+plan.id);renderMBar();draw()};
 b.querySelectorAll('[data-ref]').forEach(x=>x.onclick=()=>{MS.refs[x.dataset.ref]=!MS.refs[x.dataset.ref];renderMBar();mRead()});mRead()}
get('meta','munit').then(u=>{if(u==='m'||u==='ft')MS.unit=u}).catch(()=>{});

// ---------- v15: spellcheck text dialog (native browser spellcheck) ----------
const FA_TERMS=['FACP','FACU','DACT','FATC','NAC','SLC','IDC','SPD','TVSS','ECS','MNS','EVACS','AHJ','ITM','candela','strobe','annunciator','addressable','supervisory','pre-action','preaction','sprinkler','duct','waterflow','tamper','PIV','OS&Y','FDC','ADA','AFF','dB','dBA','NFPA','IFC','IBC','Notifier','Siemens','Simplex','Edwards','Kidde','Gamewell','Silent Knight'];
function faTermsIn(t){const W=new Set(String(t).match(/[A-Za-z&-]+/g)||[]),hit=[];for(const f of FA_TERMS)if([...W].some(w=>w.toLowerCase()===f.toLowerCase()))hit.push(f);return hit}
function askText(title,init){return new Promise(res=>{const d=$('#txtDlg');$('#txtH').textContent=title;const ta=$('#txtIn');ta.value=init||'';const upd=()=>{const h=faTermsIn(ta.value);$('#txtFa').textContent=h.length?'Fire-alarm terms OK even if underlined: '+h.join(', '):'Spell check uses your device keyboard/browser dictionary.'};ta.oninput=upd;upd();
 const done=()=>{d.removeEventListener('close',done);res(d.returnValue==='ok'?ta.value.replace(/\s+$/,''):null)};d.returnValue='';d.addEventListener('close',done);d.showModal();setTimeout(()=>ta.focus(),50)})}
// ---------- v15: rotate page view ----------
function updRotBtn(){const b=$('#rotBtn');if(b)b.innerHTML=(VR?`⟳${VR}°`:'⟳')+'<span class="tl">Rotate</span>'}
async function rotView(dir){if(!plan||!pageW)return;const c=toW(stage.clientWidth/2,stage.clientHeight/2),s=view.s;VR=(VR+(dir<0?270:90))%360;if(VR)ROTS[page]=VR;else delete ROTS[page];await put('meta',{...ROTS},'rot:'+plan.id);
 centerOn(c.x,c.y,s,stage.clientWidth/2,stage.clientHeight/2);tile=null;updRotBtn();draw();scheduleRender();renderThumbs()}
{const b=$('#rotBtn');let lp=0,long=false;b.onclick=e=>{if(long){long=false;return}rotView(1)};b.oncontextmenu=e=>{e.preventDefault();rotView(-1)};
 b.addEventListener('pointerdown',()=>{long=false;lp=setTimeout(()=>{long=true;rotView(-1)},550)});['pointerup','pointerleave','pointercancel'].forEach(k=>b.addEventListener(k,()=>clearTimeout(lp)))}
// ---------- v15: smooth slide (walk) ----------
var slideRaf=0,slideTok=0;
function slideTo(v1,ms=2000){cancelAnimationFrame(slideRaf);const tok=++slideTok,v0={...view},t0=performance.now(),ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 // interpolate in log-scale for zoom, keep the target point fixed in the end state
 return new Promise(res=>{const step=now=>{if(tok!==slideTok){res(false);return}const t=Math.min(1,(now-t0)/ms),k=ease(t),s=Math.exp(Math.log(v0.s)+(Math.log(v1.s)-Math.log(v0.s))*k);
  view={s,x:v0.x+(v1.x-v0.x)*k,y:v0.y+(v1.y-v0.y)*k};if(t<1){SLIDING=1;draw();slideRaf=requestAnimationFrame(step)}else{SLIDING=0;slideRaf=0;view={...v1};draw();scheduleRender();res(true)}};slideRaf=requestAnimationFrame(step)})}
var SLIDING=0;
stage.addEventListener('pointerdown',()=>{if(slideRaf){slideTok++;cancelAnimationFrame(slideRaf);slideRaf=0;SLIDING=0;requestDraw();scheduleRender()}},true);
stage.addEventListener('wheel',()=>{if(slideRaf){slideTok++;cancelAnimationFrame(slideRaf);slideRaf=0;SLIDING=0}},{capture:true,passive:true});
// ---------- v15: walk type picker ----------
async function walkPick(){if(!plan)return alert('Open a plan first.');if(!pins.length)return alert('This plan has no pins yet. Place pins or use 🔍 Detect devices first.');
 const last=(await get('meta','walkTypes'))||null,types=[...new Set(pins.map(p=>p.type))].sort((a,b)=>(TYPES[a]?.n||a).localeCompare(TYPES[b]?.n||b));
 $('#wkTypes').innerHTML=types.map(t=>{const all_=pins.filter(p=>p.type===t),un=all_.filter(untested).length;return`<label><input type="checkbox" value="${t}"${!last||last.includes(t)?' checked':''}><span class="dot" style="display:inline-block;background:${(TYPES[t]||TYPES.other).c}"></span> ${esc(TYPES[t]?.n||t)} <small style="color:#94a3b8">${un} untested / ${all_.length}</small></label>`}).join('');
 const bx=()=>[...document.querySelectorAll('#wkTypes input')];$('#wkAll').onclick=()=>bx().forEach(b=>b.checked=true);$('#wkNone').onclick=()=>bx().forEach(b=>b.checked=false);$('#wkProj').parentElement.hidden=true;
 $('#wkGo').onclick=async()=>{const sel_=bx().filter(b=>b.checked).map(b=>b.value);if(!sel_.length){alert('Tick at least one device type.');return}await put('meta',sel_,'walkTypes');$('#walkDlg').close();startWalk('',sel_.length===types.length?null:sel_)};$('#walkDlg').showModal()}
// ---------- v15: page thumbnails ----------
var THB={},thObs=null;
function thumbsWanted(){return innerWidth>=800}
async function thumbFor(n){const key=plan.id+':'+n;if(THB[key])return THB[key];let url=null;try{
  if(pdf){const pg=await pdf.getPage(n),vp=pg.getViewport({scale:1}),sc=Math.min(150/vp.width,150/vp.height),c=document.createElement('canvas');c.width=Math.ceil(vp.width*sc);c.height=Math.ceil(vp.height*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
   if(n===page&&baseBm)x.drawImage(baseBm.c,0,0,c.width,c.height);else await pg.render({canvasContext:x,viewport:pg.getViewport({scale:sc})}).promise;url=c.toDataURL('image/jpeg',.7)}
  else if(bmp){const c=document.createElement('canvas'),sc=Math.min(150/pageW,150/pageH);c.width=Math.ceil(pageW*sc);c.height=Math.ceil(pageH*sc);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);url=c.toDataURL('image/jpeg',.7)}}catch{}
 THB[key]=url;return url}
function renderThumbs(){const b=$('#thumbs');if(!plan||b.hidden)return;const N=plan.pages||1;
 b.innerHTML=`<div class="thh"><b>Pages</b><button type="button" class="btn" id="thX" title="Hide">✕</button></div>`+Array.from({length:N},(_,i)=>{const n=i+1,ps=pins.filter(p=>p.page===n),f=ps.filter(p=>p.status==='failed').length,r=ROTS[n]||0;
  return`<button type="button" class="th${n===page?' on':''}" data-pg="${n}"><img alt="" data-n="${n}"${THB[plan.id+':'+n]?` src="${THB[plan.id+':'+n]}"`:''} style="transform:rotate(${r}deg)"><span class="thn">${n}</span>${ps.length?`<span class="thb${f?' f':''}">${f?f+'✖':ps.length}</span>`:''}</button>`}).join('');
 $('#thX').onclick=()=>{b.hidden=true;$('#thBtn').classList.remove('pri')};
 b.querySelectorAll('[data-pg]').forEach(x=>x.onclick=()=>{const n=+x.dataset.pg;if(n!==page){$('#pageSel').value=n;gotoPage(n).then(()=>{MS.pts=[];renderMBar();renderThumbs()})}});
 if(thObs)thObs.disconnect();thObs=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){const im=e.target;thObs.unobserve(im);if(!im.src)setTimeout(async()=>{const u=await thumbFor(+im.dataset.n);if(u)im.src=u},30)}},{root:b});
 b.querySelectorAll('img[data-n]').forEach(im=>thObs.observe(im));b.querySelector('.th.on')?.scrollIntoView({block:'nearest',inline:'nearest'})}
$('#thBtn').onclick=()=>{const b=$('#thumbs');b.hidden=!b.hidden;$('#thBtn').classList.toggle('pri',!b.hidden);renderThumbs()};
{const _ac=afterChange;afterChange=function(){_ac();if(!$('#thumbs').hidden)renderThumbs()}}
// open the strip by default on wide screens, after first render
setTimeout(()=>{if(thumbsWanted()&&plan&&$('#thumbs').hidden){$('#thumbs').hidden=false;$('#thBtn').classList.add('pri');renderThumbs()}},1500);
{const _g=gotoPage;gotoPage=async function(n,seq){const r=await _g(n,seq);if(!$('#thumbs').hidden)renderThumbs();else if(thumbsWanted()&&plan){$('#thumbs').hidden=false;$('#thBtn').classList.add('pri');renderThumbs()}return r}}
// ---------- v15: editable checklist templates ----------
function sanTpl(o){const r={};for(const[k,v]of Object.entries(o||{}))if(TYPES[k]&&Array.isArray(v)){const it=v.map(x=>String(x||'').trim().slice(0,160)).filter(Boolean).slice(0,40);if(it.length)r[k]=it}return r}
get('meta','cktpl').then(v=>{if(v)CKT=sanTpl(v)}).catch(()=>{});
var ckEd={t:null,items:[]};
function ckRender(){const t=ckEd.t,ov=!!CKT[t];$('#ckInfo').textContent=(ov?'Custom template.':'Built-in default.')+' New pins of this type use it; existing pins keep their own list until you tap ↺ on the pin.';
 $('#ckItems').innerHTML=ckEd.items.map((x,i)=>`<div class="row ckrow"><input value="${esc(x)}" data-i="${i}" spellcheck="true" lang="en" maxlength="160"><button type="button" class="btn" data-up="${i}" title="Move up"${i?'':' disabled'}>↑</button><button type="button" class="btn" data-dn="${i}" title="Move down"${i<ckEd.items.length-1?'':' disabled'}>↓</button><button type="button" class="btn danger" data-rm="${i}" title="Remove">✕</button></div>`).join('')||'<small>No items.</small>';
 const sync=()=>document.querySelectorAll('#ckItems input').forEach(e=>ckEd.items[+e.dataset.i]=e.value);
 document.querySelectorAll('#ckItems input').forEach(e=>e.oninput=sync);
 document.querySelectorAll('#ckItems [data-up]').forEach(b=>b.onclick=()=>{sync();const i=+b.dataset.up;[ckEd.items[i-1],ckEd.items[i]]=[ckEd.items[i],ckEd.items[i-1]];ckRender()});
 document.querySelectorAll('#ckItems [data-dn]').forEach(b=>b.onclick=()=>{sync();const i=+b.dataset.dn;[ckEd.items[i+1],ckEd.items[i]]=[ckEd.items[i],ckEd.items[i+1]];ckRender()});
 document.querySelectorAll('#ckItems [data-rm]').forEach(b=>b.onclick=()=>{sync();ckEd.items.splice(+b.dataset.rm,1);ckRender()})}
function ckOpen(t){$('#ckType').innerHTML=Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.n)}${CKT[k]?' ✎':''}</option>`).join('');ckEd={t,items:[...ckTpl(t)]};$('#ckType').value=t;ckRender();$('#ckDlg').showModal()}
$('#ckType').onchange=e=>{ckEd={t:e.target.value,items:[...ckTpl(e.target.value)]};ckRender()};
$('#ckAdd').onclick=()=>{ckEd.items.push('');ckRender();const L=document.querySelectorAll('#ckItems input');L[L.length-1]?.focus()};
$('#ckDef').onclick=()=>{ckEd.items=[...(CHECKS[ckEd.t]||CHECKS.other)];ckRender()};
$('#ckSave').onclick=async()=>{document.querySelectorAll('#ckItems input').forEach(e=>ckEd.items[+e.dataset.i]=e.value);const it=ckEd.items.map(x=>x.trim()).filter(Boolean);const def=CHECKS[ckEd.t]||CHECKS.other;
 if(!it.length||JSON.stringify(it)===JSON.stringify(def))delete CKT[ckEd.t];else CKT[ckEd.t]=it;await put('meta',{...CKT},'cktpl');toast(`Template saved for ${TYPES[ckEd.t]?.n||ckEd.t}`);ckOpen(ckEd.t);
 if(dlg.open&&cur&&cur.type===ckEd.t&&!ckl.some(c=>c.v)){ckl=checkItems(cur.type);renderChecks()}};
$('#ckEdit').onclick=()=>ckOpen(form.elements.type.value||cur?.type||'smoke');
$('#ckReset').onclick=()=>{if(ckl.some(c=>c.v)&&!confirm('Replace this pin\'s checklist with the current template? Answers on this pin are cleared.'))return;ckl=checkItems(form.elements.type.value);renderChecks()};

// ---------- v15: inline text editing on the plan (no popup) ----------
var ted=null;
function tedPos(){if(!ted)return;const e=ted.el,m=ted.m,q=toS(m.x1,m.y1),fs=Math.max(8,m.fs*view.s);Object.assign(e.style,{left:q.x+'px',top:q.y+'px',fontSize:fs+'px',lineHeight:'1.15',transform:VR?`rotate(${VR}deg)`:'',transformOrigin:'0 0'});
 e.style.width='1px';e.style.width=Math.max(fs*3,e.scrollWidth+fs*.6)+'px';e.style.height='1px';e.style.height=(e.scrollHeight)+'px'}
function inlineText(m,w){if(ted)tedEnd(true);if(!plan)return;const isNew=!m;
 if(isNew)m={id:uid(),planId:plan.id,page,type:'text',text:'',x1:w.x,y1:w.y,fs:(SZT[$('#size').value]||18)/view.s,color:$('#color').value,w:3,opacity:toolOp(false)};
 const e=document.createElement('textarea');e.className='ted';e.rows=1;e.spellcheck=true;e.lang='en';e.setAttribute('autocapitalize','sentences');e.value=m.text||'';
 Object.assign(e.style,{color:m.color,opacity:opOf(m,false),webkitTextStroke:'0'});stage.append(e);ted={m,el:e,isNew,orig:isNew?null:structuredClone(m)};sel=null;draw();
 e.addEventListener('input',()=>tedPos());e.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();tedEnd(true)}else if(ev.key==='Escape'){ev.preventDefault();tedEnd(false)}ev.stopPropagation()});
 e.addEventListener('blur',()=>setTimeout(()=>{if(ted&&ted.el===e)tedEnd(true)},0));e.addEventListener('pointerdown',ev=>ev.stopPropagation());
 tedPos();setTimeout(()=>{e.focus();e.setSelectionRange(e.value.length,e.value.length)},0)}
async function tedEnd(commit){const t=ted;if(!t)return;ted=null;const v=t.el.value.replace(/\s+$/,'').replace(/^\s+/,'');t.el.remove();
 if(commit&&v){if(t.isNew)await change('markups',null,textBox({...t.m,text:v}));else if(v!==t.orig.text)await change('markups',t.orig,textBox({...t.orig,text:v}))}
 else if(commit&&!v&&!t.isNew){/* emptied existing text: keep original (delete with 🗑) */}
 draw()}
stage.addEventListener('pointerdown',e=>{if(ted&&e.target!==ted.el)tedEnd(true)},true);

// ---------- v16: de-overlap pins & ghosts (display only; stored x,y stay on the device) ----------
var OFFMAP=null,SCRNOFF=null;
const PANEL_T=new Set(['panel','dact','fatc','panelbox']),PANEL_G=new Set(['facp','dact','fatc','panelbox']);
function isPanelO(o){return PANEL_T.has(o.type)||PANEL_G.has(o.g)}
function pinFoot(o){const hw=pinLW(o.g!=null?gPin(o):o)/2;if(o.g!=null)return pinHalf(gPin(o))+hw;return pinHalf(o)+hw}
// bpm-v46: upright foot keeps status pad (v43). Angled OBB foot = print outer only — edge-touching
 // tilted symbols must not be AABB-inflated (v45) or status-padded into a false nudge off the print.
function pinExt(o){const p=o.g!=null?gPin(o):o;const[,w,h]=pshOf(p),pad=pinLW(p)/2+OUT(p);return[w/2+pad,h/2+pad]}
function pinObb(o,x,y){const p=o.g!=null?gPin(o):o,[,w,h]=pshOf(p),a=isFinite(p.ang)&&p.ang?p.ang:0;return{x,y,hw:w/2,hh:h/2,c:Math.cos(a),s:Math.sin(a)}}
function obbPen(A,B){const dx=B.x-A.x,dy=B.y-A.y,axes=[[A.c,A.s],[-A.s,A.c],[B.c,B.s],[-B.s,B.c]];let best=1e9,bx=1,by=0;
 for(const[ax,ay]of axes){const pA=A.hw*Math.abs(ax*A.c+ay*A.s)+A.hh*Math.abs(ax*(-A.s)+ay*A.c),pB=B.hw*Math.abs(ax*B.c+ay*B.s)+B.hh*Math.abs(ax*(-B.s)+ay*B.c),d=Math.abs(dx*ax+dy*ay),pen=pA+pB-d;if(pen<=.05)return null;if(pen<best){best=pen;bx=ax;by=ay;if(dx*ax+dy*ay<0){bx=-ax;by=-ay}}}
 return{pen:best,ax:bx,ay:by}}
function pinOffsets(list){list=list.filter(o=>!['flow','tamper'].includes(o.type)&&!/FLOW|TAMPER/.test(o.det||''));const M=new Map(),n=list.length;if(n<2)return M;const key=o=>o.id||o;
 const E=list.map(pinExt),Ang=list.map(o=>{const p=o.g!=null?gPin(o):o;return isFinite(p.ang)&&p.ang?1:0}),gap=.2,Dmax=Math.max(...E.map(e=>Math.max(e[0],e[1])))*2+gap,X=list.map(o=>o.x),Y=list.map(o=>o.y),C=Math.max(Dmax,1)*3,G=new Map();
 list.forEach((o,i)=>{const k=Math.floor(o.x/C)+','+Math.floor(o.y/C);(G.get(k)||G.set(k,[]).get(k)).push(i)});
 const nb=list.map((o,i)=>{const a=[],gx=Math.floor(o.x/C),gy=Math.floor(o.y/C);for(let u=-1;u<=1;u++)for(let v=-1;v<=1;v++)for(const j of G.get((gx+u)+','+(gy+v))||[])if(j>i)a.push(j);return a});
 let moved=false;for(let it=0;it<90;it++){let any=false;
  for(let i=0;i<n;i++)for(const j of nb[i]){
   if(Ang[i]||Ang[j]){const hit=obbPen(pinObb(list[i],X[i],Y[i]),pinObb(list[j],X[j],Y[j]));if(!hit)continue;any=true;const push=(hit.pen+gap)/2;X[i]-=hit.ax*push;Y[i]-=hit.ay*push;X[j]+=hit.ax*push;Y[j]+=hit.ay*push;continue}
   // bpm-v48: stacked/edge-sharing prints (e.g. dual (E)/(N) box) — print rects only touch, so don't nudge apart
   {const A=pinObb(list[i],X[i],Y[i]),B=pinObb(list[j],X[j],Y[j]),ox=A.hw+B.hw-Math.abs(B.x-A.x),oy=A.hh+B.hh-Math.abs(B.y-A.y);if(ox<=1.5||oy<=1.5)continue}
   const dx=X[j]-X[i],dy=Y[j]-Y[i],px=E[i][0]+E[j][0]-Math.abs(dx),py=E[i][1]+E[j][1]-Math.abs(dy);if(px<=.05||py<=.05)continue;any=true;
   if(px<py){const sx=dx>=0?(dx||((i+j)%2?1:-1))>0?1:-1:-1,push=(px+gap)/2;X[i]-=sx*push;X[j]+=sx*push}else{const sy=dy>0||(dy===0&&(i+j)%2)?1:-1,push=(py+gap)/2;Y[i]-=sy*push;Y[j]+=sy*push}}
  if(!any)break;moved=true}
 if(!moved)return M;
 list.forEach((o,i)=>{const dx=X[i]-o.x,dy=Y[i]-o.y;if(Math.hypot(dx,dy)>.5)M.set(key(o),{dx,dy,cl:1})});
 return M}
function drawLeader(c,x,y,X,Y,col){c.save();c.globalAlpha=Math.max(.7,c.globalAlpha);c.strokeStyle=col;c.lineWidth=1.2;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();c.fillStyle=col;c.strokeStyle='#fff';c.lineWidth=.8;c.beginPath();c.arc(x,y,2.4,0,7);c.fill();c.stroke();c.restore()}

// ---------- v16: sharp walk slide — render one tile covering the whole path before animating ----------
async function prefetchPath(v0,v1){if(!pdf||!pageW)return;const keep=view;try{
 view=v0;const a=visRect();view=v1;const b=visRect();view=keep;
 const x=Math.max(0,Math.min(a.x,b.x)),y=Math.max(0,Math.min(a.y,b.y)),X=Math.min(pageW,Math.max(a.x+a.w,b.x+b.w)),Y=Math.min(pageH,Math.max(a.y+a.h,b.y+b.h));
 const r={x,y,w:Math.max(1,X-x),h:Math.max(1,Y-y)},want=wantScale();if(baseOK(want))return;
 if(tile&&tile.s>=want*.87&&tile.x<=r.x+1&&tile.y<=r.y+1&&tile.x+tile.w>=r.x+r.w-1&&tile.y+tile.h>=r.y+r.h-1)return;
 const pg=await pdf.getPage(page),s=Math.min(want,Math.sqrt(MAXPX/(r.w*r.h)));SLIDING=1;const c=await raster(pg,s,r);if(c)tile={c,s:c._s,...r}}catch(e){console.info('prefetch skipped',e)}finally{view=keep;SLIDING=0}}

function walkPrev(){if(!walk?.hist?.length)return;let p=null;while(walk.hist.length&&!p){const id=walk.hist.pop();p=pins.find(x=>x.id===id)}if(p){walk.skip.delete(p.id);walkGo(p,true)}else renderWalk()}

// ---------- v16 perf: page bitmap LRU cache + background base sharpen ----------
var PCACHE=new Map();const PC_MAX=matchMedia('(pointer:coarse)').matches?3:5;
function pcGet(n){if(!plan)return null;const k=plan.id+':'+n,v=PCACHE.get(k);if(v){PCACHE.delete(k);PCACHE.set(k,v)}return v||null}
function pcPut(n,b){if(!plan||!b)return;const k=plan.id+':'+n;PCACHE.delete(k);PCACHE.set(k,b);while(PCACHE.size>PC_MAX){const[k0,v0]=PCACHE.entries().next().value;PCACHE.delete(k0);if(v0!==baseBm&&v0.c){v0.c.width=v0.c.height=0}}}
async function upgradeBase(pn,seq,full){if(!pdf||pn!==page||seq!==opSeq)return;if(SLIDING||renderTask){setTimeout(()=>upgradeBase(pn,seq,full),250);return}try{const pg=await pdf.getPage(pn);const c=await raster(pg,full,{x:0,y:0,w:pageW,h:pageH});if(!c||pn!==page||seq!==opSeq)return;const old=baseBm;baseBm={c,s:c._s};if(bmpScale<c._s)bmpScale=c._s;pcPut(pn,baseBm);if(old&&old!==baseBm&&old.c&&![...PCACHE.values()].includes(old))old.c.width=old.c.height=0;requestDraw();scheduleRender()}catch{}}

// ---------- v64: walk "Go to" picker — leave the sequence, test any device ----------
function walkGoto(){if(!walk)return;let d=$('#wGotoDlg');if(!d){d=document.createElement('dialog');d.id='wGotoDlg';d.style.cssText='max-width:520px;width:94vw;max-height:85vh;padding:10px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px';document.body.appendChild(d)}
 const cur=walk.p?.id,S=walkSet(),st={pass:'✔',fail:'✖'};let f='',only=true;
 const draw_=()=>{const L=S.filter(p=>(!only||untested(p))&&(!f||[p.address,p.loop,p.location,TYPES[p.type]?.n||p.type].join(' ').toLowerCase().includes(f))).sort((a,b)=>a.page-b.page||String(a.address||'').localeCompare(String(b.address||''),undefined,{numeric:true}));
  d.querySelector('#wgL').innerHTML=L.length?L.map(p=>{const t=untested(p)?(walk.skip.has(p.id)?'⏭':'○'):(String(p.status).toLowerCase().includes('fail')?'✖':'✔');return `<button type="button" class="btn" data-id="${p.id}" style="display:flex;width:100%;gap:8px;align-items:center;text-align:left;min-height:44px;margin:3px 0${p.id===cur?';border:2px solid #38bdf8':''}"><span style="width:18px">${t}</span><span class="dot" style="display:inline-block;background:${(TYPES[p.type]||TYPES.other).c}"></span><span style="flex:1">${esc(TYPES[p.type]?.n||p.type)} ${p.address?esc(p.address):'<small style="color:#94a3b8">(no address)</small>'}${p.loop?' · Loop '+esc(p.loop):''}${p.location?' · '+esc(p.location):''}</span><small style="color:#94a3b8">pg ${p.page}</small></button>`}).join(''):'<div style="padding:12px;color:#94a3b8">No matching devices.</div>';
  d.querySelectorAll('#wgL [data-id]').forEach(b=>b.onclick=()=>{const p=pins.find(x=>x.id===b.dataset.id);d.close();if(p&&walk){walk.skip.delete(p.id);walkGo(p)}})};
 d.innerHTML=`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><b style="flex:1">📍 Go to device</b><button type="button" class="btn" id="wgX">✕</button></div><input id="wgF" type="search" placeholder="Search address, loop, location, type" style="width:100%;margin-bottom:6px"><label style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><input type="checkbox" id="wgU" checked style="width:20px;height:20px;min-height:20px"> Untested only</label><div id="wgL" style="overflow:auto;max-height:60vh"></div><small style="color:#94a3b8">Tip: you can also tap any pin on the plan to jump to it.</small>`;
 d.querySelector('#wgX').onclick=()=>d.close();d.querySelector('#wgF').oninput=e=>{f=e.target.value.trim().toLowerCase();draw_()};d.querySelector('#wgU').onchange=e=>{only=e.target.checked;draw_()};draw_();d.showModal()}

// ---------- bpm-v72: device model numbers per type (seeded + remembered custom entries) ----------
// bpm-v75: smoke/heat/module/relay/pull lists supplied by the user (authoritative); others from bpm-v74: Siemens Fire Safety models only (each verified on a Siemens datasheet / Siemens doc portal / distributor page); other makes via "Custom…"
const MODELS={
 smoke:['FP-11','FPO-11','FPT-11','HFP-11','HFPO-11','HFPT-11','OP921','OOT941','OOH941','FDO421','FDOT421','FDT421','FDOOT441'],
 heat:['FP-11','FPO-11','FPT-11','HFP-11','HFPO-11','HFPT-11','OP921','OOT941','OOH941','FDO421','FDOT421','FDT421','FDOOT441'],
 duct:['FDBZ492','FDBZ492-HR','FDBZ492-R','FDBZ492-PR','AD2-P','AD2-PR'],
 pull:['MSI-10B','MSI-20B','HMS-S','HMS-D','HMS-M','XMS-51','XMS-52','XMS-M'],
 module:['TRI-S','TRI-D','TRI-R','HTRI-S','HTRI-D','HTRI-R','XTRI-S','XTRI-D','XTRI-M','XTRI-R','HLIM','SBGA-34'],
 relay:['TRI-S','TRI-D','TRI-R','HTRI-S','HTRI-D','HTRI-R','XTRI-S','XTRI-D','XTRI-M','XTRI-R','HLIM','SBGA-34'],
 horn:['SC-HS-WR-F','SC-HS-WW-F','SC-HN-WR-N','SC-HN-WW-N'],
 strobe:['SC-ST-WR-F','SC-ST-WW-F'],
 spkstrobe:['SC-SS-WW-F','SC-SS-CW-F','SC-SP-WW-F','SC-SP-CW-F','SL24XSPS-FW'],
 panel:['FireFinder XLS','MXL','FC2025','FC2050','FC922','FC924','FC901','FC2005']};
let MODELS_C=null;async function customModels(){if(!MODELS_C)MODELS_C=(await get('meta','models:custom'))||{};return MODELS_C}
async function rememberModel(t,m){m=String(m||'').trim();if(!m||(MODELS[t]||[]).some(x=>x===m||x.endsWith(' '+m)))return;const c=await customModels();if((c[t]||[]).includes(m))return;c[t]=[...(c[t]||[]),m];await put('meta',c,'models:custom')}
async function modelOpts(t){const c=await customModels(),S=MODELS[t]||[],C=(c[t]||[]).filter(m=>!S.includes(m)),v=form.elements.model.value,sel=$('#dModelSel');
 const op=(m,l)=>`<option value="${esc(m)}"${m===v?' selected':''}>${esc(l||(MODEL_DESC[m]?m+' — '+MODEL_DESC[m]:m))}</option>`;
 sel.innerHTML=op('','— none —')+(S.length?`<optgroup label="Siemens">${S.map(m=>op(m)).join('')}</optgroup>`:'')+(C.length?`<optgroup label="My models">${C.map(m=>op(m)).join('')}</optgroup>`:'')+(v&&!S.includes(v)&&!C.includes(v)?`<optgroup label="Saved on this pin">${op(v)}</optgroup>`:'')+'<option value="__custom">Custom…</option>';
 $('#dModelCL').hidden=true;$('#dModelC').value='';if(typeof dsBtnSync==='function')dsBtnSync();return[...S,...C]}
$('#dModelSel').addEventListener('change',e=>{const c=e.target.value==='__custom';$('#dModelCL').hidden=!c;if(c){$('#dModelC').value='';form.elements.model.value='';$('#dModelC').focus()}else form.elements.model.value=e.target.value});
$('#dModelC').addEventListener('input',e=>{form.elements.model.value=e.target.value.trim()});
// Datasheet links: only URLs fetched and confirmed (v76). Anything else -> Siemens SID search.
const DS_SID='https://sid.siemens.com/v/u/',DS_KH='https://sid.siemens.com/api/khub/documents/',DS_AC='https://assets.new.siemens.com/siemens/assets/api/uuid:';
// bpm-v84: install instructions (English, with wiring; mounting sheets for enclosures/backboxes) mirrored in docs/ so they open in-app and offline. [local file, Siemens source]
const INSTALL={"ABHW-4B":["docs/h_7bfxwMh3nyPbzNa_K1HA.html","https://sid.siemens.com/r/A6V10405587"],"ABHW-4S":["docs/rh24N7YCmSAAXImdl7KBJg.html","https://sid.siemens.com/r/A6V10405588"],"ABHW-4SZ":["docs/3djAvFSqwpM6NO4UxcXK0Q.html","https://sid.siemens.com/r/A6V10806900"],"AC-ADPT":["docs/hmOta_Br1CF_23eTzX31_Q.pdf","https://sid.siemens.com/api/khub/documents/hmOta~Br1CF_23eTzX31_Q/content"],"AD-11P":["docs/resW1Mm0dxQANA9eglw6Ow.pdf","https://sid.siemens.com/api/khub/documents/resW1Mm0dxQANA9eglw6Ow/content"],"AD-HR":["docs/fnmKq7PYoBuO2yHJ7rTzxA.pdf","https://sid.siemens.com/api/khub/documents/fnmKq7PYoBuO2yHJ7rTzxA/content",{"cov":"FireFinder-XLS Control Panel Installation, Operation and Maintenance Manual","p":27}],"AD2-P":["docs/7RUUh1H0nje4wIHbIKKTDA.pdf","https://sid.siemens.com/api/khub/documents/7RUUh1H0nje4wIHbIKKTDA/content"],"AD2-PR":["docs/7RUUh1H0nje4wIHbIKKTDA.pdf","https://sid.siemens.com/api/khub/documents/7RUUh1H0nje4wIHbIKKTDA/content"],"ADBH-11":["docs/nGLyg8Dv_l7hz__Im3dasA.pdf","https://sid.siemens.com/api/khub/documents/nGLyg8Dv~l7hz~_Im3dasA/content"],"AIC":["docs/Y5anHjfmpTpKf_VwZ7s89w.html","https://sid.siemens.com/r/A6V10239138"],"ALCC":["docs/inSidbkkXNE54K8KC3Sc7A.html","https://sid.siemens.com/r/A6V10248630"],"AS-HMC-CR-WP":["docs/fB_YmSSTslE4u9fZ6j8hXQ.pdf","https://sid.siemens.com/api/khub/documents/fB_YmSSTslE4u9fZ6j8hXQ/content",{"cov":"AH / AS Horn and Horn Strobe Appliances, Data Sheet 2578","p":5}],"AS-HMC-CW-WP":["docs/fB_YmSSTslE4u9fZ6j8hXQ.pdf","https://sid.siemens.com/api/khub/documents/fB_YmSSTslE4u9fZ6j8hXQ/content",{"cov":"AH / AS Horn and Horn Strobe Appliances, Data Sheet 2578","p":5}],"AS-HMC-R-WP":["docs/fB_YmSSTslE4u9fZ6j8hXQ.pdf","https://sid.siemens.com/api/khub/documents/fB_YmSSTslE4u9fZ6j8hXQ/content",{"cov":"AH / AS Horn and Horn Strobe Appliances, Data Sheet 2578","p":5}],"AS-MC-R":["docs/asmc.pdf","https://parcelsfolder.portlandmaine.gov/Files/048/048%20%20D010/54%20Grant%20St/AS-MC%20P83947-007B.pdf"],"AS-MC-W":["docs/asmc.pdf","https://parcelsfolder.portlandmaine.gov/Files/048/048%20%20D010/54%20Grant%20St/AS-MC%20P83947-007B.pdf"],"BCM":["docs/66aflG7mRgvdkfZ38Qr_pA.html","https://sid.siemens.com/r/A6V10431793"],"CAB-100-BRKT":["docs/0VcLDzw4wWEE9XsxpyWyOw.pdf","https://sid.siemens.com/api/khub/documents/0VcLDzw4wWEE9XsxpyWyOw/content"],"CAB-55-BRKT":["docs/0VcLDzw4wWEE9XsxpyWyOw.pdf","https://sid.siemens.com/api/khub/documents/0VcLDzw4wWEE9XsxpyWyOw/content"],"CAB-BATT":["docs/0VcLDzw4wWEE9XsxpyWyOw.pdf","https://sid.siemens.com/api/khub/documents/0VcLDzw4wWEE9XsxpyWyOw/content"],"CAB-BATT-R":["docs/XgD23qwmwVwvddavGApIsw.pdf","https://sid.siemens.com/api/khub/documents/XgD23qwmwVwvddavGApIsw/content"],"CAB-MP":["docs/7czfOdooMLUQKKW5wgvyyQ.pdf","https://sid.siemens.com/api/khub/documents/7czfOdooMLUQKKW5wgvyyQ/content"],"CAB1":["docs/x8jjMYn3JCipOxWnMq7ZEQ.pdf","https://sid.siemens.com/api/khub/documents/x8jjMYn3JCipOxWnMq7ZEQ/content"],"CAB1-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB1R":["docs/x8jjMYn3JCipOxWnMq7ZEQ.pdf","https://sid.siemens.com/api/khub/documents/x8jjMYn3JCipOxWnMq7ZEQ/content"],"CAB1R-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB2-BB":["docs/AmBGsxvZWZp1YLEHOdH3lg.pdf","https://sid.siemens.com/api/khub/documents/AmBGsxvZWZp1YLEHOdH3lg/content"],"CAB2-BD":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"CAB2-RB":["docs/AmBGsxvZWZp1YLEHOdH3lg.pdf","https://sid.siemens.com/api/khub/documents/AmBGsxvZWZp1YLEHOdH3lg/content"],"CAB2-RD":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"CAB2-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB2-X":["docs/3gWzGdVzEFFPSFflTNcg6g.pdf","https://sid.siemens.com/api/khub/documents/3gWzGdVzEFFPSFflTNcg6g/content",{"cov":"Desigo Fire Safety Modular system overview, Data Sheet","p":8}],"CAB2-XBD":["docs/sZBjeUiLy_cDLOi5tpSfvg.pdf","https://sid.siemens.com/api/khub/documents/sZBjeUiLy_cDLOi5tpSfvg/content"],"CAB2-XRD":["docs/sZBjeUiLy_cDLOi5tpSfvg.pdf","https://sid.siemens.com/api/khub/documents/sZBjeUiLy_cDLOi5tpSfvg/content"],"CAB2R-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB3-BB":["docs/AmBGsxvZWZp1YLEHOdH3lg.pdf","https://sid.siemens.com/api/khub/documents/AmBGsxvZWZp1YLEHOdH3lg/content"],"CAB3-BD":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"CAB3-RB":["docs/AmBGsxvZWZp1YLEHOdH3lg.pdf","https://sid.siemens.com/api/khub/documents/AmBGsxvZWZp1YLEHOdH3lg/content"],"CAB3-RD":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"CAB3-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB3-X":["docs/3gWzGdVzEFFPSFflTNcg6g.pdf","https://sid.siemens.com/api/khub/documents/3gWzGdVzEFFPSFflTNcg6g/content",{"cov":"Desigo Fire Safety Modular system overview, Data Sheet","p":8}],"CAB3-XBD":["docs/sZBjeUiLy_cDLOi5tpSfvg.pdf","https://sid.siemens.com/api/khub/documents/sZBjeUiLy_cDLOi5tpSfvg/content"],"CAB3-XRD":["docs/sZBjeUiLy_cDLOi5tpSfvg.pdf","https://sid.siemens.com/api/khub/documents/sZBjeUiLy_cDLOi5tpSfvg/content"],"CAB3R-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CC-2":["docs/HQuoNUqMgBIOnpv4z2OR_g.pdf","https://sid.siemens.com/api/khub/documents/HQuoNUqMgBIOnpv4z2OR~g/content"],"CC-5":["docs/HQuoNUqMgBIOnpv4z2OR_g.pdf","https://sid.siemens.com/api/khub/documents/HQuoNUqMgBIOnpv4z2OR~g/content"],"CCL":["docs/HQuoNUqMgBIOnpv4z2OR_g.pdf","https://sid.siemens.com/api/khub/documents/HQuoNUqMgBIOnpv4z2OR~g/content",{"cov":"CC-5 / CC-2 System Cardcage, Installation Instructions","p":6}],"CDC-4":["docs/tDVggeir8kqMtHhJzqJ1Hg.html","https://sid.siemens.com/r/A6V10239127"],"COM-BRK":["docs/14hMvAYFE1rV05Y5L5pf9Q.html","https://sid.siemens.com/r/A6V10406085"],"CRC-6":["docs/XYniFL8ybDsAI_5brEY3gQ.html","https://sid.siemens.com/r/A6V10239114"],"CSB":["docs/fVjdUyd_o6_4vy50u4K_KQ.pdf","https://sid.siemens.com/api/khub/documents/fVjdUyd~o6_4vy50u4K_KQ/content"],"DAC-NET":["docs/Q0Ry4foSZ3cBf_Z2R5GrRg.pdf","https://sid.siemens.com/api/khub/documents/Q0Ry4foSZ3cBf~Z2R5GrRg/content"],"DB-11":["docs/8vAhv9X8MFLkIpWy7WHEkg.html","https://sid.siemens.com/r/A6V10323391"],"DB-11E":["docs/8vAhv9X8MFLkIpWy7WHEkg.html","https://sid.siemens.com/r/A6V10323391"],"DB-HR":["docs/pZ1qSWFHB5SbwT_unJWZDg.pdf","https://sid.siemens.com/api/khub/documents/pZ1qSWFHB5SbwT~unJWZDg/content"],"DB-X11RS":["docs/sjkrRx9r14JLQfuLEfJpkg.pdf","https://sid.siemens.com/api/khub/documents/sjkrRx9r14JLQfuLEfJpkg/content"],"DBBS":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"DFM":["docs/rHxDTWFi01qQOrSU67I8gw.html","https://sid.siemens.com/r/A6V10239120"],"DFM-BRK":["docs/rHxDTWFi01qQOrSU67I8gw.html","https://sid.siemens.com/r/A6V10239120"],"DPU":["docs/Y9Asyh2BGjSx_peGTg0Phw.html","https://sid.siemens.com/r/A6V10276604",{"cov":"Device Programming Unit (DPU) User Guide"}],"EBA2004-A1":["docs/dDmMGfd5ma7Nlemutr8Qyw.pdf","https://sid.siemens.com/api/khub/documents/dDmMGfd5ma7Nlemutr8Qyw/content"],"ENCL-01":["docs/jlzuFX5tQ3kATDMXS92Tww.pdf","https://sid.siemens.com/api/khub/documents/jlzuFX5tQ3kATDMXS92Tww/content"],"FB-300":["docs/AbgOybIbgTyYmBas53tjVQ.html","https://sid.siemens.com/r/A6V10308803"],"FB-301S":["docs/AbgOybIbgTyYmBas53tjVQ.html","https://sid.siemens.com/r/A6V10308803"],"FC-300S":["docs/AbgOybIbgTyYmBas53tjVQ.html","https://sid.siemens.com/r/A6V10308803"],"FC2005":["docs/b_f5hDsoePxHThENYu1QBw.pdf","https://sid.siemens.com/api/khub/documents/b~f5hDsoePxHThENYu1QBw/content"],"FC2025":["docs/rzBs_XcwbHW281Tn8jZbaA.pdf","https://sid.siemens.com/api/khub/documents/rzBs_XcwbHW281Tn8jZbaA/content"],"FC2050":["docs/rzBs_XcwbHW281Tn8jZbaA.pdf","https://sid.siemens.com/api/khub/documents/rzBs_XcwbHW281Tn8jZbaA/content"],"FC901":["docs/b_f5hDsoePxHThENYu1QBw.pdf","https://sid.siemens.com/api/khub/documents/b~f5hDsoePxHThENYu1QBw/content"],"FC922":["docs/yhkbr5vUYxCO0_zS8htYgQ.pdf","https://sid.siemens.com/api/khub/documents/yhkbr5vUYxCO0~zS8htYgQ/content"],"FC924":["docs/yhkbr5vUYxCO0_zS8htYgQ.pdf","https://sid.siemens.com/api/khub/documents/yhkbr5vUYxCO0~zS8htYgQ/content"],"FCA2015-U1":["docs/Kccde2WetBqi0AtmsNESqQ.html","https://sid.siemens.com/r/A6V10334254"],"FCM-6":["docs/8pcsNgifNhvpX9EeY596sA.html","https://sid.siemens.com/r/A6V10239103"],"FCM2041-U2":["docs/GoamzOYNk30lOJTrdQYsHA.pdf","https://sid.siemens.com/api/khub/documents/GoamzOYNk30lOJTrdQYsHA/content"],"FDBZ492":["docs/YqqdzjYkUue8NZa_cCl_BQ.pdf","https://sid.siemens.com/api/khub/documents/YqqdzjYkUue8NZa_cCl~BQ/content"],"FDBZ492-HR":["docs/YqqdzjYkUue8NZa_cCl_BQ.pdf","https://sid.siemens.com/api/khub/documents/YqqdzjYkUue8NZa_cCl~BQ/content"],"FDBZ492-PR":["docs/smKkmSUK7Y7KRmQh0bdrEQ.pdf","https://sid.siemens.com/api/khub/documents/smKkmSUK7Y7KRmQh0bdrEQ/content"],"FDBZ492-R":["docs/YqqdzjYkUue8NZa_cCl_BQ.pdf","https://sid.siemens.com/api/khub/documents/YqqdzjYkUue8NZa_cCl~BQ/content"],"FDCIO422":["docs/YRXYskbZ5PGKiFAkcM9MHg.html","https://sid.siemens.com/r/A6V10324662"],"FDO421":["docs/Ebwr1nF3jtaCyXQmac4yog.pdf","https://sid.siemens.com/api/khub/documents/Ebwr1nF3jtaCyXQmac4yog/content"],"FDOOT441":["docs/statWx0H1lyHNWFm9Hn0Rw.pdf","https://sid.siemens.com/api/khub/documents/statWx0H1lyHNWFm9Hn0Rw/content"],"FDOOTC441":["docs/vzCSoFtYNoQUxIY6Z_UCiw.pdf","https://sid.siemens.com/api/khub/documents/vzCSoFtYNoQUxIY6Z_UCiw/content"],"FDOT421":["docs/9PvLoRhefmFb2UQKUQyXDw.pdf","https://sid.siemens.com/api/khub/documents/9PvLoRhefmFb2UQKUQyXDw/content"],"FDT421":["docs/ZtGvN_uDYM4pvYgJQuYnyg.pdf","https://sid.siemens.com/api/khub/documents/ZtGvN~uDYM4pvYgJQuYnyg/content"],"FHA2043-R1":["docs/y4_dgJkuQjj3nns98C0y0Q.pdf","https://sid.siemens.com/api/khub/documents/y4~dgJkuQjj3nns98C0y0Q/content"],"FJ-303":["docs/XgWCN1Q11NP_rAu0G_VaGg.pdf","https://sid.siemens.com/api/khub/documents/XgWCN1Q11NP~rAu0G_VaGg/content"],"FJ-303SS":["docs/XgWCN1Q11NP_rAu0G_VaGg.pdf","https://sid.siemens.com/api/khub/documents/XgWCN1Q11NP~rAu0G_VaGg/content"],"FJ-304":["docs/Q8G2vfjToSXJhmLpAVPTmw.pdf","https://sid.siemens.com/api/khub/documents/Q8G2vfjToSXJhmLpAVPTmw/content"],"FJ-304SS":["docs/Q8G2vfjToSXJhmLpAVPTmw.pdf","https://sid.siemens.com/api/khub/documents/Q8G2vfjToSXJhmLpAVPTmw/content"],"FMT":["docs/n7Wco5LRa4g10_gfmsK_Mw.html","https://sid.siemens.com/r/A6V10239123"],"FMT-A-ADPT":["docs/Pgt_4Z8gy2jEz8Gc2TbsTg.html","https://sid.siemens.com/r/A6V10333236"],"FN2006-U1":["docs/f8M6j6RsWUefAA0KOtFkyw.pdf","https://sid.siemens.com/api/khub/documents/f8M6j6RsWUefAA0KOtFkyw/content"],"FN2007-U1":["docs/f8M6j6RsWUefAA0KOtFkyw.pdf","https://sid.siemens.com/api/khub/documents/f8M6j6RsWUefAA0KOtFkyw/content"],"FN2012-A1":["docs/W_7Mero1of3jzjlgw6QFTA.pdf","https://sid.siemens.com/api/khub/documents/W_7Mero1of3jzjlgw6QFTA/content"],"FN2013-U1":["docs/JgYZL2EQEgbT8zAxLlMcuQ.pdf","https://sid.siemens.com/api/khub/documents/JgYZL2EQEgbT8zAxLlMcuQ/content"],"FN2014-U1":["docs/JgYZL2EQEgbT8zAxLlMcuQ.pdf","https://sid.siemens.com/api/khub/documents/JgYZL2EQEgbT8zAxLlMcuQ/content"],"FN2016-U1":["docs/fVfsaDJMBc37jhU_HHUiag.html","https://sid.siemens.com/r/A6V13300924"],"FN2017-U1":["docs/Dzy_pmZakLi7_CstaoBkZQ.pdf","https://sid.siemens.com/api/khub/documents/Dzy~pmZakLi7~CstaoBkZQ/content"],"FN2018-U1":["docs/Dzy_pmZakLi7_CstaoBkZQ.pdf","https://sid.siemens.com/api/khub/documents/Dzy~pmZakLi7~CstaoBkZQ/content"],"FP-11":["docs/fr1lBCYYKMDMH4brAhtU4Q.pdf","https://sid.siemens.com/api/khub/documents/fr1lBCYYKMDMH4brAhtU4Q/content"],"FPT-11":["docs/fr1lBCYYKMDMH4brAhtU4Q.pdf","https://sid.siemens.com/api/khub/documents/fr1lBCYYKMDMH4brAhtU4Q/content"],"FT-GLS":["docs/t8p_tEhB3zs9JQPudepQew.pdf","https://sid.siemens.com/api/khub/documents/t8p_tEhB3zs9JQPudepQew/content"],"FTS":["docs/lwPyzPoy6nj9RF8Bqs75xw.pdf","https://sid.siemens.com/api/khub/documents/lwPyzPoy6nj9RF8Bqs75xw/content"],"FTS-C":["docs/gVGS1GhPyDUTRxY3gFz66Q.html","https://sid.siemens.com/r/A6V10239290"],"FTS-CL":["docs/gVGS1GhPyDUTRxY3gFz66Q.html","https://sid.siemens.com/r/A6V10239290"],"FTS-P":["docs/gVGS1GhPyDUTRxY3gFz66Q.html","https://sid.siemens.com/r/A6V10239290"],"FTS-PCL":["docs/gVGS1GhPyDUTRxY3gFz66Q.html","https://sid.siemens.com/r/A6V10239290"],"FireFinder XLS":["docs/fnmKq7PYoBuO2yHJ7rTzxA.pdf","https://sid.siemens.com/api/khub/documents/fnmKq7PYoBuO2yHJ7rTzxA/content"],"GPMI-3":["docs/3gWzGdVzEFFPSFflTNcg6g.pdf","https://sid.siemens.com/api/khub/documents/3gWzGdVzEFFPSFflTNcg6g/content",{"cov":"Desigo Fire Safety Modular system overview, Data Sheet","p":12}],"GPMI-HW-KEY":["docs/3gWzGdVzEFFPSFflTNcg6g.pdf","https://sid.siemens.com/api/khub/documents/3gWzGdVzEFFPSFflTNcg6g/content",{"cov":"Desigo Fire Safety Modular system overview, Data Sheet","p":12}],"HCP":["docs/np5V1RORxjmefAsV9Md07Q.pdf","https://sid.siemens.com/api/khub/documents/np5V1RORxjmefAsV9Md07Q/content"],"HFP-11":["docs/FUZ_rKuqUhOyftNpw_qFNg.pdf","https://sid.siemens.com/api/khub/documents/FUZ~rKuqUhOyftNpw_qFNg/content"],"HFPO-11":["docs/oqPqxj46BMk2yV1wD5Bxfg.pdf","https://sid.siemens.com/api/khub/documents/oqPqxj46BMk2yV1wD5Bxfg/content"],"HFPT-11":["docs/FUZ_rKuqUhOyftNpw_qFNg.pdf","https://sid.siemens.com/api/khub/documents/FUZ~rKuqUhOyftNpw_qFNg/content"],"HI921":["docs/SnJCljUOuAQDAk6_4Kp2Jg.html","https://sid.siemens.com/r/A6V10323932"],"HLIM":["docs/bqMFpBeDmRQpiePFV9V1_g.pdf","https://sid.siemens.com/api/khub/documents/bqMFpBeDmRQpiePFV9V1~g/content"],"HMS-2S":["docs/tsLNu_O9hufODJLyCgpuFg.pdf","https://sid.siemens.com/api/khub/documents/tsLNu~O9hufODJLyCgpuFg/content"],"HMS-D":["docs/BxfYH1zhimXwlZktfpZdyQ.pdf","https://sid.siemens.com/api/khub/documents/BxfYH1zhimXwlZktfpZdyQ/content"],"HMS-M":["docs/WVa0vJzVaHHJ7793T5gqbg.pdf","https://sid.siemens.com/api/khub/documents/WVa0vJzVaHHJ7793T5gqbg/content"],"HMS-S":["docs/BxfYH1zhimXwlZktfpZdyQ.pdf","https://sid.siemens.com/api/khub/documents/BxfYH1zhimXwlZktfpZdyQ/content"],"HMS-SA":["docs/tsLNu_O9hufODJLyCgpuFg.pdf","https://sid.siemens.com/api/khub/documents/tsLNu~O9hufODJLyCgpuFg/content"],"HMSFD":["docs/fnmKq7PYoBuO2yHJ7rTzxA.pdf","https://sid.siemens.com/api/khub/documents/fnmKq7PYoBuO2yHJ7rTzxA/content",{"cov":"FireFinder-XLS Control Panel Installation, Operation and Maintenance Manual","p":28}],"HS-HMC-R":["docs/xT12dkdCvpVUJLJw5Wmfqg.pdf","https://sid.siemens.com/api/khub/documents/xT12dkdCvpVUJLJw5Wmfqg/content",{"cov":"HS Horn and Horn Strobe Notification Appliances, Data Sheet","p":3}],"HS-MC-R":["docs/xT12dkdCvpVUJLJw5Wmfqg.pdf","https://sid.siemens.com/api/khub/documents/xT12dkdCvpVUJLJw5Wmfqg/content",{"cov":"HS Horn and Horn Strobe Notification Appliances, Data Sheet","p":3}],"HS-MC-W":["docs/xT12dkdCvpVUJLJw5Wmfqg.pdf","https://sid.siemens.com/api/khub/documents/xT12dkdCvpVUJLJw5Wmfqg/content",{"cov":"HS Horn and Horn Strobe Notification Appliances, Data Sheet","p":3}],"HTRI-D":["docs/tLkjWFZ2q_O85lSXW_Wstg.pdf","https://sid.siemens.com/api/khub/documents/tLkjWFZ2q~O85lSXW~Wstg/content"],"HTRI-DZ":["docs/DP2K07xOmk1unqxaCVhBNA.pdf","https://sid.siemens.com/api/khub/documents/DP2K07xOmk1unqxaCVhBNA/content"],"HTRI-R":["docs/tLkjWFZ2q_O85lSXW_Wstg.pdf","https://sid.siemens.com/api/khub/documents/tLkjWFZ2q~O85lSXW~Wstg/content"],"HTRI-RZ":["docs/DP2K07xOmk1unqxaCVhBNA.pdf","https://sid.siemens.com/api/khub/documents/DP2K07xOmk1unqxaCVhBNA/content"],"HTRI-S":["docs/tLkjWFZ2q_O85lSXW_Wstg.pdf","https://sid.siemens.com/api/khub/documents/tLkjWFZ2q~O85lSXW~Wstg/content"],"HTRI-SZ":["docs/DP2K07xOmk1unqxaCVhBNA.pdf","https://sid.siemens.com/api/khub/documents/DP2K07xOmk1unqxaCVhBNA/content"],"HZM":["docs/aXLrwo2t1jK6_QyCjsF1QQ.html","https://sid.siemens.com/r/A6V10233195"],"ID-MP":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"ID-SP":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"IIC":["docs/lli3OfNv0ojCWt5f9bRPqQ.pdf","https://sid.siemens.com/api/khub/documents/lli3OfNv0ojCWt5f9bRPqQ/content"],"ILED-XC":["docs/CmuBbkaA4xpDpOqehGCbJg.html","https://sid.siemens.com/r/A6V101055484"],"ILED-XW":["docs/CmuBbkaA4xpDpOqehGCbJg.html","https://sid.siemens.com/r/A6V101055484"],"K-CBL":["docs/JwGVFOaDJrbdwfl8eBzy5A.pdf","https://sid.siemens.com/api/khub/documents/JwGVFOaDJrbdwfl8eBzy5A/content"],"LCM-8":["docs/8pcsNgifNhvpX9EeY596sA.html","https://sid.siemens.com/r/A6V10239103"],"LDC":["docs/9CgjKPkEZ2GwXsGfBwzQ4A.html","https://sid.siemens.com/r/A6V12198164"],"LPB":["docs/LW2CIKIpoOWnLyDQ_gyOkQ.html","https://sid.siemens.com/r/A6V10372609"],"LVM":["docs/MCFZ_HLRde2jgjJmaEPrvw.html","https://sid.siemens.com/r/A6V10239122"],"MBR-2":["docs/6wriW9lgBNI_4fDjCALDTw.pdf","https://sid.siemens.com/api/khub/documents/6wriW9lgBNI~4fDjCALDTw/content"],"MBR-2R":["docs/6wriW9lgBNI_4fDjCALDTw.pdf","https://sid.siemens.com/api/khub/documents/6wriW9lgBNI~4fDjCALDTw/content"],"MLC":["docs/uCqx71clOF_MxdJnfvqBcw.html","https://sid.siemens.com/r/A6V10328217"],"MLE-6":["docs/3KuXIvcBZVlAD2Hc_U2Wfw.pdf","https://sid.siemens.com/api/khub/documents/3KuXIvcBZVlAD2Hc_U2Wfw/content"],"MLE-6R":["docs/3KuXIvcBZVlAD2Hc_U2Wfw.pdf","https://sid.siemens.com/api/khub/documents/3KuXIvcBZVlAD2Hc_U2Wfw/content"],"MME-3":["docs/bfSh_cqHcWrh6Za6GyRqJw.pdf","https://sid.siemens.com/api/khub/documents/bfSh_cqHcWrh6Za6GyRqJw/content"],"MME-3R":["docs/bfSh_cqHcWrh6Za6GyRqJw.pdf","https://sid.siemens.com/api/khub/documents/bfSh_cqHcWrh6Za6GyRqJw/content"],"MOM2-XMP":["docs/8glSNgawWix5roEcC_S6GA.pdf","https://sid.siemens.com/api/khub/documents/8glSNgawWix5roEcC_S6GA/content"],"MSE-2":["docs/7CCQ1qr2O67A_V4qdNRC8g.pdf","https://sid.siemens.com/api/khub/documents/7CCQ1qr2O67A~V4qdNRC8g/content",{"cov":"XLS-MSE2(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-2R":["docs/7CCQ1qr2O67A_V4qdNRC8g.pdf","https://sid.siemens.com/api/khub/documents/7CCQ1qr2O67A~V4qdNRC8g/content",{"cov":"XLS-MSE2(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3L":["docs/0rURXT_PSjS5AOVYD63jDQ.pdf","https://sid.siemens.com/api/khub/documents/0rURXT_PSjS5AOVYD63jDQ/content",{"cov":"MXL-IQ Control Panel Operation, Installation, and Maintenance Manual","p":32}],"MSE-3LR":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3M":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3MR":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3R":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSI-10B":["docs/YQ3w7pVD6bTLgFWKQfwfWg.pdf","https://sid.siemens.com/api/khub/documents/YQ3w7pVD6bTLgFWKQfwfWg/content"],"MSI-20B":["docs/YQ3w7pVD6bTLgFWKQfwfWg.pdf","https://sid.siemens.com/api/khub/documents/YQ3w7pVD6bTLgFWKQfwfWg/content"],"MT-SUR-BOX-W":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"MTE-2":["docs/WvIYrV6zlfUsgVdjeYPWaA.pdf","https://sid.siemens.com/api/khub/documents/WvIYrV6zlfUsgVdjeYPWaA/content"],"MTH-HMC-CR-WP":["docs/gZME4S8vX4keCjU9I_jO9w.pdf","https://sid.siemens.com/api/khub/documents/gZME4S8vX4keCjU9I_jO9w/content",{"cov":"MTH Multi-tone Horn and Horn / Strobe Appliances, Data Sheet","p":4}],"MXL":["docs/0rURXT_PSjS5AOVYD63jDQ.pdf","https://sid.siemens.com/api/khub/documents/0rURXT_PSjS5AOVYD63jDQ/content"],"NIC-C":["docs/ntkfpxZyDbj4PmPnFSHzJA.pdf","https://sid.siemens.com/api/khub/documents/ntkfpxZyDbj4PmPnFSHzJA/content"],"NRC":["docs/eNNtc7hoV9lC5Y1JOpX9pA.html","https://sid.siemens.com/r/A6V10322639"],"OCM-16":["docs/d8iw1m3JIMqKe_96Y_ZyLQ.pdf","https://sid.siemens.com/api/khub/documents/d8iw1m3JIMqKe_96Y~ZyLQ/content"],"OD-BP":["docs/_8jbSr1BGX7nWeMX4QHIzg.pdf","https://sid.siemens.com/api/khub/documents/_8jbSr1BGX7nWeMX4QHIzg/content"],"OD-BP-R":["docs/_8jbSr1BGX7nWeMX4QHIzg.pdf","https://sid.siemens.com/api/khub/documents/_8jbSr1BGX7nWeMX4QHIzg/content"],"OD-GP":["docs/_8jbSr1BGX7nWeMX4QHIzg.pdf","https://sid.siemens.com/api/khub/documents/_8jbSr1BGX7nWeMX4QHIzg/content"],"OD-GP-R":["docs/_8jbSr1BGX7nWeMX4QHIzg.pdf","https://sid.siemens.com/api/khub/documents/_8jbSr1BGX7nWeMX4QHIzg/content"],"OD-LP":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"OH921":["docs/tWXh9B_AwOPeBxPjGU5AHg.html","https://sid.siemens.com/r/A6V10323936"],"OOH941":["docs/nWUDrVFUM_xFElz7qGoXHA.html","https://sid.siemens.com/r/A6V10324659"],"OOHC941":["docs/anfa36cFxwvXlRnbwmsy7g.pdf","https://sid.siemens.com/api/khub/documents/anfa36cFxwvXlRnbwmsy7g/content"],"OP921":["docs/FwPA7t_tDtFLf8H9bDz75g.pdf","https://sid.siemens.com/api/khub/documents/FwPA7t_tDtFLf8H9bDz75g/content"],"PAD-5-CDC":["docs/wBw9h2WTYS8y6Jr_Ink5IA.html","https://sid.siemens.com/r/A6V101030366"],"PAD-5-CLSA":["docs/fny6UXbBPk54ShkOVrTToQ.html","https://sid.siemens.com/r/A6V101030359"],"PAD-5-MB":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PAD5-6A":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PAD5-6A-R":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PAD5-9A":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PAD5-9A-R":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PFT":["docs/icRh4ANWT_RMaa9WvP9fPQ.pdf","https://sid.siemens.com/api/khub/documents/icRh4ANWT~RMaa9WvP9fPQ/content"],"PFT-P":["docs/icRh4ANWT_RMaa9WvP9fPQ.pdf","https://sid.siemens.com/api/khub/documents/icRh4ANWT~RMaa9WvP9fPQ/content"],"PMI-1 UPLD-CBL":["docs/fThMXGAgrPL4IOpLJXI36g.html","https://sid.siemens.com/r/A6V10525432"],"PS-5A":["docs/Pf4qDzsB3XpoBobpdywy9g.pdf","https://sid.siemens.com/api/khub/documents/Pf4qDzsB3XpoBobpdywy9g/content"],"PSC-12":["docs/P9mZCe2CAuHyE_lsSuf_ow.pdf","https://sid.siemens.com/api/khub/documents/P9mZCe2CAuHyE_lsSuf~ow/content"],"PSC-12M":["docs/_JVYXGoSDycovXWFmwWe4w.html","https://sid.siemens.com/r/A6V12021370"],"PSC-ISO-CBL":["docs/UrwGQM4swhIJEGr59uY2Kg.pdf","https://sid.siemens.com/api/khub/documents/UrwGQM4swhIJEGr59uY2Kg/content"],"PSFA":["docs/PxEws9rom2UZ_5sfBNGGJA.html","https://sid.siemens.com/r/A6V12057961"],"PSX-12":["docs/VvXfHgbijCnFWnckJt8_ZA.pdf","https://sid.siemens.com/api/khub/documents/VvXfHgbijCnFWnckJt8~ZA/content"],"PSX-12M":["docs/6Q_Fsyze_G2U1ilgyFUWgg.html","https://sid.siemens.com/r/A6V12021371"],"RCC-1":["docs/Gqz06DTFCcFzHHr459hroQ.pdf","https://sid.siemens.com/api/khub/documents/Gqz06DTFCcFzHHr459hroQ/content"],"RCC-1F":["docs/Gqz06DTFCcFzHHr459hroQ.pdf","https://sid.siemens.com/api/khub/documents/Gqz06DTFCcFzHHr459hroQ/content"],"RCC-1FR":["docs/fnmKq7PYoBuO2yHJ7rTzxA.pdf","https://sid.siemens.com/api/khub/documents/fnmKq7PYoBuO2yHJ7rTzxA/content",{"cov":"FireFinder-XLS Control Panel Installation, Operation and Maintenance Manual","p":32}],"RCC-3F":["docs/y6jGxxkOIdleTWk1LhFubg.pdf","https://sid.siemens.com/api/khub/documents/y6jGxxkOIdleTWk1LhFubg/content"],"RCC-3FR":["docs/y6jGxxkOIdleTWk1LhFubg.pdf","https://sid.siemens.com/api/khub/documents/y6jGxxkOIdleTWk1LhFubg/content"],"REMBOX2":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"REMBOX2-MP":["docs/e6qSmijpdHL0wjwCXtG_JA.html","https://sid.siemens.com/r/A6V10315220"],"REMBOX2R":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"REMBOX4":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"REMBOX4-MP":["docs/e6qSmijpdHL0wjwCXtG_JA.html","https://sid.siemens.com/r/A6V10315220"],"REMBOX4R":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"RL-HC":["docs/IYu3tLPxzE2H8LCSLOBgmw.html","https://sid.siemens.com/r/A6V10233192"],"RL-HW":["docs/IYu3tLPxzE2H8LCSLOBgmw.html","https://sid.siemens.com/r/A6V10233192"],"RNI":["docs/zuCaAByzmyaApIItpvikag.pdf","https://sid.siemens.com/api/khub/documents/zuCaAByzmyaApIItpvikag/content"],"RPM":["docs/v5B0We02XAExZSX04iCtzg.pdf","https://sid.siemens.com/api/khub/documents/v5B0We02XAExZSX04iCtzg/content"],"RPR-1":["docs/eQ__uy9ZnS_5fExFX3CTtg.pdf","https://sid.siemens.com/api/khub/documents/eQ__uy9ZnS_5fExFX3CTtg/content"],"SB-5R":["docs/BxfYH1zhimXwlZktfpZdyQ.pdf","https://sid.siemens.com/api/khub/documents/BxfYH1zhimXwlZktfpZdyQ/content",{"cov":"HMS-S / HMS-D Manual Pull Station, Installation Instructions","p":2}],"SBBS":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"SBGA-34":["docs/vvmO3ESLi28hpLDRrlFLyQ.pdf","https://sid.siemens.com/api/khub/documents/vvmO3ESLi28hpLDRrlFLyQ/content"],"SC-HN-WR-N":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-HN-WW-N":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-HS-WR-F":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-HS-WW-F":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-SP-CW-F":["docs/5IQd0hk4ENyLndsan_803w.pdf","https://sid.siemens.com/api/khub/documents/5IQd0hk4ENyLndsan~803w/content"],"SC-SP-WW-F":["docs/p6sGlAW5pizs_sbClODkPQ.pdf","https://sid.siemens.com/api/khub/documents/p6sGlAW5pizs~sbClODkPQ/content"],"SC-SS-CW-F":["docs/5IQd0hk4ENyLndsan_803w.pdf","https://sid.siemens.com/api/khub/documents/5IQd0hk4ENyLndsan~803w/content"],"SC-SS-WW-F":["docs/p6sGlAW5pizs_sbClODkPQ.pdf","https://sid.siemens.com/api/khub/documents/p6sGlAW5pizs~sbClODkPQ/content"],"SC-ST-WR-F":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-ST-WW-F":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SCM-8":["docs/8pcsNgifNhvpX9EeY596sA.html","https://sid.siemens.com/r/A6V10239103"],"SFP-11":["docs/V2rlmEHjfjL_CYp0Yb_uaA.pdf","https://sid.siemens.com/api/khub/documents/V2rlmEHjfjL_CYp0Yb_uaA/content"],"SFPO-11":["docs/V2rlmEHjfjL_CYp0Yb_uaA.pdf","https://sid.siemens.com/api/khub/documents/V2rlmEHjfjL_CYp0Yb_uaA/content"],"SFPT-11":["docs/V2rlmEHjfjL_CYp0Yb_uaA.pdf","https://sid.siemens.com/api/khub/documents/V2rlmEHjfjL_CYp0Yb_uaA/content"],"SHBBS-R":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"SHBBS-W":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"SIM-16":["docs/aB2ZUgcP375OlIMl5RIsXA.pdf","https://sid.siemens.com/api/khub/documents/aB2ZUgcP375OlIMl5RIsXA/content"],"SL24XSPS-FW":["docs/D17TTjEr4wVSLn6u06_UuQ.pdf","https://sid.siemens.com/api/khub/documents/D17TTjEr4wVSLn6u06~UuQ/content"],"SL2FSSCR-F":["docs/pZjCyJA9dakkgomWFiCroQ.pdf","https://sid.siemens.com/api/khub/documents/pZjCyJA9dakkgomWFiCroQ/content"],"SL2FSSWR-F":["docs/to3i3L7wI9hXxTu8PUBcPw.pdf","https://sid.siemens.com/api/khub/documents/to3i3L7wI9hXxTu8PUBcPw/content"],"SL2MTSWR-F":["docs/ipJRZWyocaqs__jEIbEHfQ.pdf","https://sid.siemens.com/api/khub/documents/ipJRZWyocaqs~~jEIbEHfQ/content"],"SL2SWW-F":["docs/AnthAaOhcPZ3X8TqSwMj8A.pdf","https://sid.siemens.com/api/khub/documents/AnthAaOhcPZ3X8TqSwMj8A/content"],"SLSPSWR-F":["docs/jAQiWg5u3vX6x0B7LvT24A.pdf","https://sid.siemens.com/api/khub/documents/jAQiWg5u3vX6x0B7LvT24A/content"],"SLSPSWW-F":["docs/jAQiWg5u3vX6x0B7LvT24A.pdf","https://sid.siemens.com/api/khub/documents/jAQiWg5u3vX6x0B7LvT24A/content"],"SLSWR-F":["docs/k_R8zBq_05eNxGSuJPDuog.pdf","https://sid.siemens.com/api/khub/documents/k~R8zBq~05eNxGSuJPDuog/content"],"SLSWW-F":["docs/k_R8zBq_05eNxGSuJPDuog.pdf","https://sid.siemens.com/api/khub/documents/k~R8zBq~05eNxGSuJPDuog/content"],"SNU-ASSY":["docs/fThMXGAgrPL4IOpLJXI36g.html","https://sid.siemens.com/r/A6V10525432"],"SNU-KIT":["docs/fThMXGAgrPL4IOpLJXI36g.html","https://sid.siemens.com/r/A6V10525432"],"SPSB-R":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"SSD":["docs/H8B0p6FXwUYCWOm6uLSZ2A.html","https://sid.siemens.com/r/A6V10239126"],"SSD-C":["docs/mefUBJ8oB6DlwrZaM1oU2Q.html","https://sid.siemens.com/r/A6V10239148"],"SSD-C-INT":["docs/mefUBJ8oB6DlwrZaM1oU2Q.html","https://sid.siemens.com/r/A6V10239148"],"SSD-C-REM":["docs/6D5Boa5zEkcltiBttAWGVw.html","https://sid.siemens.com/r/A6V10239129"],"SSD-INT":["docs/H8B0p6FXwUYCWOm6uLSZ2A.html","https://sid.siemens.com/r/A6V10239126"],"TRI-D":["docs/vE8d4MkF3hPb0kEsakionw.pdf","https://sid.siemens.com/api/khub/documents/vE8d4MkF3hPb0kEsakionw/content"],"TRI-R":["docs/vE8d4MkF3hPb0kEsakionw.pdf","https://sid.siemens.com/api/khub/documents/vE8d4MkF3hPb0kEsakionw/content"],"TRI-S":["docs/7P7wAJxq3uqHVN5pVnjbSQ.pdf","https://sid.siemens.com/api/khub/documents/7P7wAJxq3uqHVN5pVnjbSQ/content"],"TSM-1X":["docs/dhw5JRX8WMMQNNCzMGplBw.html","https://sid.siemens.com/r/A6V101055486"],"TZC-8B":["docs/X77dUBqZpTfTlrPIvHZ7mQ.html","https://sid.siemens.com/r/A6V10239124"],"USCG-HPLATE":["docs/QT92wvLMjWVYHhHg3WQzJA.pdf","https://sid.siemens.com/api/khub/documents/QT92wvLMjWVYHhHg3WQzJA/content",{"cov":"Desigo Marine Fire and Detection Equipment, Data Sheet","p":4}],"VESDA-HLI-KIT":["docs/Z06Sl7BCQspWfdW8UGEt_Q.pdf","https://sid.siemens.com/api/khub/documents/Z06Sl7BCQspWfdW8UGEt_Q/content"],"VN2001":["docs/51NcrbpoVz93idEE7X5fGA.pdf","https://sid.siemens.com/api/khub/documents/51NcrbpoVz93idEE7X5fGA/content"],"VN2002":["docs/urBTbdhHdHQqlNva3di5vw.pdf","https://sid.siemens.com/api/khub/documents/urBTbdhHdHQqlNva3di5vw/content"],"VN2003":["docs/urBTbdhHdHQqlNva3di5vw.pdf","https://sid.siemens.com/api/khub/documents/urBTbdhHdHQqlNva3di5vw/content"],"VPM":["docs/Z06Sl7BCQspWfdW8UGEt_Q.pdf","https://sid.siemens.com/api/khub/documents/Z06Sl7BCQspWfdW8UGEt_Q/content"],"VPM-MP":["docs/GnzGtrmMMzGBd5zNSIj5OA.pdf","https://sid.siemens.com/api/khub/documents/GnzGtrmMMzGBd5zNSIj5OA/content"],"WBBS":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"WPSBBS-R":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"WPSBBS-W":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"XDACT-ASSY":["docs/d_n4v8wacxlNtHZ_TEl1BQ.html","https://sid.siemens.com/r/A6V10807278"],"XDLC":["docs/evIVylDZwnBzt_6CGafK0w.html","https://sid.siemens.com/r/A6V101040156"],"XDMC":["docs/g1e7mFOsjyQLtKFSLBi_5Q.pdf","https://sid.siemens.com/api/khub/documents/g1e7mFOsjyQLtKFSLBi~5Q/content"],"XINC":["docs/_p_7V9UzfHLgItDx20gjSA.html","https://sid.siemens.com/r/A6V12412368"],"XLS-EXT-CABLE-PKG":["docs/NOXqvjn1ZQpL5Ds_k2xoUQ.pdf","https://sid.siemens.com/api/khub/documents/NOXqvjn1ZQpL5Ds~k2xoUQ/content"],"XLS-MLE6-ADPT":["docs/Sy57N7XGX4lZ9_c0esTpZg.pdf","https://sid.siemens.com/api/khub/documents/Sy57N7XGX4lZ9~c0esTpZg/content"],"XLS-MLE6R-ADPT":["docs/Sy57N7XGX4lZ9_c0esTpZg.pdf","https://sid.siemens.com/api/khub/documents/Sy57N7XGX4lZ9~c0esTpZg/content"],"XLS-MME3-ADPT":["docs/uSIfr_jNbROVluPilZMmiQ.pdf","https://sid.siemens.com/api/khub/documents/uSIfr~jNbROVluPilZMmiQ/content"],"XLS-MME3R-ADPT":["docs/uSIfr_jNbROVluPilZMmiQ.pdf","https://sid.siemens.com/api/khub/documents/uSIfr~jNbROVluPilZMmiQ/content"],"XLS-MSE2-ADPT":["docs/7CCQ1qr2O67A_V4qdNRC8g.pdf","https://sid.siemens.com/api/khub/documents/7CCQ1qr2O67A~V4qdNRC8g/content"],"XLS-MSE2R-ADPT":["docs/7CCQ1qr2O67A_V4qdNRC8g.pdf","https://sid.siemens.com/api/khub/documents/7CCQ1qr2O67A~V4qdNRC8g/content"],"XLS-MSE3-ADPT":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content"],"XLS-MSE3R-ADPT":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content"],"XLS-RCC1-ADPT":["docs/JRM_awNtOS5lVy4ZU954YQ.pdf","https://sid.siemens.com/api/khub/documents/JRM_awNtOS5lVy4ZU954YQ/content"],"XLS-RCC13-ADPT":["docs/JRM_awNtOS5lVy4ZU954YQ.pdf","https://sid.siemens.com/api/khub/documents/JRM_awNtOS5lVy4ZU954YQ/content"],"XLS-RCC13F-ADPT":["docs/YpND0UJFpDZ4BS0j3oLgwA.pdf","https://sid.siemens.com/api/khub/documents/YpND0UJFpDZ4BS0j3oLgwA/content"],"XLS-RCC13FR-ADPT":["docs/YpND0UJFpDZ4BS0j3oLgwA.pdf","https://sid.siemens.com/api/khub/documents/YpND0UJFpDZ4BS0j3oLgwA/content"],"XMI":["docs/Iba20o1EhXRMLk5km82vvg.html","https://sid.siemens.com/r/A6V10239134"],"XMS-51":["docs/FR2K0WFHAPmK7DukR0nkCg.pdf","https://sid.siemens.com/api/khub/documents/FR2K0WFHAPmK7DukR0nkCg/content"],"XMS-D":["docs/CIHf7A7NaXK_XNzcBNCmpA.html","https://sid.siemens.com/r/A6V11439600"],"XMS-M":["docs/CIHf7A7NaXK_XNzcBNCmpA.html","https://sid.siemens.com/r/A6V11439600"],"XMS-S":["docs/CIHf7A7NaXK_XNzcBNCmpA.html","https://sid.siemens.com/r/A6V11439600"],"XNLC":["docs/Qi6Y1XPO_TLtfNF6EpIUDA.html","https://sid.siemens.com/r/A6V14373883"],"XTRI-D":["docs/417guoKEqc7HqJEVh7ok2w.html","https://sid.siemens.com/r/A6V101055479"],"XTRI-M":["docs/S0k3cb0mZKAbMhy2ns_n_g.html","https://sid.siemens.com/r/A6V101055487"],"XTRI-R":["docs/417guoKEqc7HqJEVh7ok2w.html","https://sid.siemens.com/r/A6V101055479"],"XTRI-S":["docs/417guoKEqc7HqJEVh7ok2w.html","https://sid.siemens.com/r/A6V101055479"],"XVCC":["docs/crSKsCRCX6WCHNGb1ZWViQ.html","https://sid.siemens.com/r/A6V121412366"],"ZAC-40":["docs/GmyEXImd8ajRNoUH5b_5JQ.pdf","https://sid.siemens.com/api/khub/documents/GmyEXImd8ajRNoUH5b~5JQ/content"],"ZAC-40-70":["docs/GmyEXImd8ajRNoUH5b_5JQ.pdf","https://sid.siemens.com/api/khub/documents/GmyEXImd8ajRNoUH5b~5JQ/content"],"ZAM-180":["docs/nJXDWY_v6Go2jjEd68p2iA.html","https://sid.siemens.com/r/A6V10259386"],"ZAM-300":["docs/1sAS_0n2kk9juv0m0OtKJQ.pdf","https://sid.siemens.com/api/khub/documents/1sAS~0n2kk9juv0m0OtKJQ/content"],"ZB-R":["docs/1KE_Owd1hkxxxMQEr9YHEg.pdf","https://sid.siemens.com/api/khub/documents/1KE_Owd1hkxxxMQEr9YHEg/content",{"cov":"ZH and ZR Strobes, Horns and Horn / Strobes, Data Sheet","p":4}],"ZIC-2C":["docs/qYl8lqG_gKNT7Qoj0thS3g.html","https://sid.siemens.com/r/A6V10239144"],"ZIC-4A":["docs/96VJuFTJd27oifjXj3NtXg.html","https://sid.siemens.com/r/A6V10239104"],"ZIC-8B":["docs/R0rg8fFNtQ6tQPTo7_K2LQ.html","https://sid.siemens.com/r/A6V10239143"]};
const DATASHEETS={};for(const m in INSTALL)DATASHEETS[m]=INSTALL[m][0];
// v77 Siemens parts catalog: [category, pin type ('' = catalog only), model, description, datasheet key]. Keys map to URLs fetched and confirmed; '' = Siemens search.
const CAT_U={};
const CATALOG=`Panel cards & modules|panel|FCM2041-U2|Desigo Modular Operator Interface|fcm
Panel cards & modules|panel|CC-5|5-slot card cage|cc
Panel cards & modules|panel|CC-2|2-slot card cage|cc
Panel cards & modules|panel|XDLC|Class X device loop card|xdlc
Panel cards & modules|panel|XNLC|Class X notification loop card|xnlc
Panel cards & modules|panel|MLC|MXL line card|mlc
Panel cards & modules|panel|PSC-12M|Power supply/charger|psc
Panel cards & modules|panel|PSX-12M|Power supply extender|psc
Panel cards & modules|panel|ZIC-4A|Zone indicating card|zic4
Panel cards & modules|panel|ZIC-8B|Zone indicating card|zic8
Panel cards & modules|panel|ZIC-2C|Zone indicating card|zic8
Panel cards & modules|panel|OCM-16|Output control|ocm
Panel cards & modules|panel|SCM-8|Switch control|ctl
Panel cards & modules|panel|LCM-8|LED control|ctl
Panel cards & modules|panel|FCM-6|Fan control|ctl
Panel cards & modules|panel|SIM-16|Supervised input|ov
Panel cards & modules|panel|CDC-4|Conventional detector card|cdc
Panel cards & modules|panel|XVCC|Voice control card|xvcc
Panel cards & modules|panel|TZC-8B|Telephone zone card|tzc
Panel cards & modules|panel|FMT|Firefighters' master telephone|fmt
Panel cards & modules|panel|RNI|Remote network interface|rni
Panel cards & modules|panel|RPM|Remote printer module|rpm
Panel cards & modules|panel|SSD|System status display|ov
Amplifiers|panel|ZAC-40|Zone amplifier card|zac
Amplifiers|panel|ZAM-180|Zone amplifier module|zam
Amplifiers|panel|ZAM-300|Zone amplifier module|
Amplifiers|panel|ZAC-40-70|Zone amplifier card (70 V)|
Amplifiers|panel|EBA2004-A1|Booster amplifier|voice
Amplifiers|panel|DAC-NET|Digital audio card – network|dac
Amplifiers|panel|AIC|Audio input card|aic
Panel cards & modules|panel|NIC-C|Network interface card|nic
Panel cards & modules|panel|XINC|Network ring card|xinc
Network/Fiber|panel|FN2012-A1|Ethernet switch|voice
Network/Fiber|panel|FN2013-U1|Single-mode fiber module|fn13
Network/Fiber|panel|FN2014-U1|Multi-mode fiber module|fn13
Network/Fiber|panel|FN2006-U1|Single-mode X-NET fiber module|fn06
Network/Fiber|panel|FN2007-U1|Multi-mode X-NET fiber module|fn06
Network/Fiber|panel|VN2001|Ethernet module, electrical|voice
Network/Fiber|panel|VN2002|Ethernet module, multi-mode optical|voice
Network/Fiber|panel|VN2003|Ethernet module, single-mode optical|voice
Enclosures & Doors|panel|CAB1|One-row enclosure|encl
Enclosures & Doors|panel|CAB1R|One-row enclosure, red|encl
Enclosures & Doors|panel|CAB2-BB|Two-row back box, black|encl
Enclosures & Doors|panel|CAB2-BD|Two-row inner & outer door set, black|encl
Enclosures & Doors|panel|CAB2-XBD|Two-row transponder door, black|encl
Enclosures & Doors|panel|CAB2-RD|Two-row inner & outer door set, red|encl
Enclosures & Doors|panel|CAB2-XRD|Two-row transponder door, red|encl
Enclosures & Doors|panel|CAB2-RB|Two-row back box, red|encl
Enclosures & Doors|panel|CAB3-BB|Three-row back box, black|encl
Enclosures & Doors|panel|CAB3-BD|Three-row inner & outer door set, black|encl
Enclosures & Doors|panel|CAB3-XBD|Three-row transponder door, black|encl
Enclosures & Doors|panel|CAB3-RD|Three-row inner & outer door set, red|encl
Enclosures & Doors|panel|CAB3-XRD|Three-row transponder door, red|encl
Enclosures & Doors|panel|CAB3-RB|Three-row back box, red|encl
Enclosures & Doors|panel|CAB-MP|Cabinet mounting plate|encl
Enclosures & Doors|panel|COM-BRK|Communication module bracket|fn06
Enclosures & Doors|panel|ID-MP|Inner door mounting plate|encl
Enclosures & Doors|panel|ID-SP|Inner door spacer plate|encl
Enclosures & Doors|panel|OD-LP|Outer door lens plate|encl
Enclosures & Doors|panel|OD-BP|Outer door blank plate|encl
Enclosures & Doors|panel|OD-BP-R|Outer door blank plate, red|encl
Enclosures & Doors|panel|OD-GP|Outer door grill plate|encl
Enclosures & Doors|panel|OD-GP-R|Outer door grill plate, red|encl
Enclosures & Doors|panel|BCM|Blank control module|encl
Enclosures & Doors|panel|CAB-BATT|Battery enclosure|encl
Enclosures & Doors|panel|CAB-BATT-R|Battery enclosure, red|encl
Enclosures & Doors|panel|ENCL-01|Enclosure|encl
Enclosures & Doors|panel|REMBOX2|Remote enclosure, 2 module|encl
Enclosures & Doors|panel|REMBOX2R|Remote enclosure, 2 module, red|encl
Enclosures & Doors|panel|REMBOX2-MP|REMBOX2 mounting plate|encl
Enclosures & Doors|panel|REMBOX4|Remote enclosure, 4 module|encl
Enclosures & Doors|panel|REMBOX4-MP|REMBOX4 mounting plate|encl
Enclosures & Doors|panel|XLS-MLE6-ADPT|MLE-6 enclosure adapter|encl
Enclosures & Doors|panel|XLS-MLE6R-ADPT|MLE-6R enclosure adapter|encl
Enclosures & Doors|panel|XLS-MME3-ADPT|MME-3 enclosure adapter|encl
Enclosures & Doors|panel|XLS-MME3R-ADPT|MME-3R enclosure adapter|encl
Enclosures & Doors|panel|XLS-MSE2-ADPT|MSE-2 enclosure adapter|encl
Enclosures & Doors|panel|XLS-MSE2R-ADPT|MSE-2R enclosure adapter|encl
Enclosures & Doors|panel|XLS-MSE3-ADPT|MSE-3 enclosure adapter|encl
Enclosures & Doors|panel|XLS-MSE3R-ADPT|MSE-3R enclosure adapter|encl
Enclosures & Doors|panel|XLS-RCC13F-ADPT|RCC-1F/3F enclosure adapter|encl
Enclosures & Doors|panel|XLS-RCC13FR-ADPT|RCC-1FR/3FR enclosure adapter|encl
Notification non-ACEND|strobe|SLSWW-F|Wall strobe|sls
Notification non-ACEND|strobe|SLSWR-F|Wall strobe|sls
Notification non-ACEND|spkstrobe|SLSPSWW-F|Wall speaker strobe|slsp
Notification non-ACEND|spkstrobe|SLSPSWR-F|Wall speaker strobe|slsp
Notification non-ACEND|strobe|SL2SWW-F|Wall strobe|sl2
Notification non-ACEND|horn|SL2MTSWR-F|Multi-tone strobe|sl2mt
Notification non-ACEND|horn|SL2FSSCR-F|Ceiling low-frequency sounder strobe|sl2fc
Notification non-ACEND|horn|SL2FSSWR-F|Wall low-frequency sounder strobe|sl2fw
Notification non-ACEND|horn|HS-MC-R|Horn strobe|hs
Notification non-ACEND|horn|HS-MC-W|Horn strobe|hs
Notification non-ACEND|horn|HS-HMC-R|Horn strobe|hs
Notification non-ACEND|horn|AS-MC-R|Audible strobe|as
Notification non-ACEND|horn|AS-MC-W|Audible strobe|as
Notification non-ACEND|horn|AS-HMC-R-WP|Weatherproof horn strobe|
Notification non-ACEND|horn|AS-HMC-CR-WP|Weatherproof horn strobe|
Notification non-ACEND|horn|AS-HMC-CW-WP|Weatherproof horn strobe|
Notification non-ACEND|horn|MTH-HMC-CR-WP|Weatherproof multi-tone horn strobe|mth
Backboxes & Trim||SHBBS-R|Back box|mnt
Backboxes & Trim||SHBBS-W|Back box|mnt
Backboxes & Trim||SBBS|Back box|mnt
Backboxes & Trim||DBBS|Back box|mnt
Backboxes & Trim||SPSB-R|Back box|mnt
Backboxes & Trim||WPSBBS-R|Back box|mnt
Backboxes & Trim||WPSBBS-W|Back box|mnt
Backboxes & Trim||MT-SUR-BOX-W|Back box|mnt
Backboxes & Trim||ZB-R|Back box|zb
Backboxes & Trim||WBBS|Back box|mnt
Backboxes & Trim||FHA2043-R1|Trim kit|voice
Backboxes & Trim||CAB1-TK|Trim kit|encl
Backboxes & Trim||CAB1R-TK|Trim kit|encl
Backboxes & Trim||CAB2-TK|Trim kit|encl
Backboxes & Trim||CAB2R-TK|Trim kit|encl
Backboxes & Trim||CAB3-TK|Trim kit|encl
Backboxes & Trim||CAB3R-TK|Trim kit|encl
PAD-5 & Dialers|panel|PAD5-6A|PAD-5 power supply|pad
PAD-5 & Dialers|panel|PAD5-6A-R|PAD-5 power supply|pad
PAD-5 & Dialers|panel|PAD5-9A|PAD-5 power supply|pad
PAD-5 & Dialers|panel|PAD5-9A-R|PAD-5 power supply|pad
PAD-5 & Dialers|panel|PAD-5-MB|PAD-5 main board|pad
PAD-5 & Dialers|panel|PAD-5-CLSA|PAD-5 Class A/B expansion|pad
PAD-5 & Dialers|panel|PAD-5-CDC|PAD-5 conventional detector card|pad
PAD-5 & Dialers|dact|XDACT-ASSY|DACT mounting assembly|ov
PAD-5 & Dialers|dact|FCA2015-U1|DACT|fca
PAD-5 & Dialers|panel|CAB-100-BRKT|Battery bracket|encl
PAD-5 & Dialers|panel|CAB-55-BRKT|Battery bracket|encl
Panel cards & modules|panel|NRC|Network ring card (legacy)|ov
Panel cards & modules|panel|IIC|Interface isolation card, NRC-NIC bridge (legacy)|ov
Panel cards & modules|panel|CRC-6|Six-relay module|ov
Panel cards & modules|panel|CSB|CAN sounder board|ov
Panel cards & modules|panel|CCL|see datasheet|ov
Panel cards & modules|panel|VPM|VESDA peripheral module|ov
Panel cards & modules|panel|VPM-MP|VPM mounting plate|ov
Panel cards & modules|panel|VESDA-HLI-KIT|VESDA HLI card + socket card|ov
Panel cards & modules|panel|XDMC|Digital message card (legacy)|ov
Panel cards & modules|panel|XMI|Desigo-to-MDACT interface (legacy)|
Panel cards & modules|panel|MOM2-XMP|MOM-2 mounting plate (legacy)|
Panel cards & modules|panel|K-CBL|Printer interface cable|
Panel cards & modules|panel|SNU-ASSY|Single-node upload module (legacy)|ov
Panel cards & modules|panel|SNU-KIT|SNU sales kit (legacy)|ov
Panel cards & modules|panel|PMI-1 UPLD-CBL|PMI upload cable (legacy)|ov
Panel cards & modules||DPU|Device programming/test unit|
Panel cards & modules||GPMI-3|Graphical PMI software|ov
Panel cards & modules||GPMI-HW-KEY|GPMI hardware key|ov
Power supplies|panel|PSFA|Power supply filter assembly|psc
Power supplies|panel|PSC-ISO-CBL|Extender cable for 2× PSC-12M|psc
Power supplies|panel|PS-5A|see datasheet|ov
Power supplies||AC-ADPT|Technician laptop power connector|psc
Power supplies|panel|PSC-12|XLS power supply/charger (legacy)|pscx
Power supplies|panel|PSX-12|XLS power supply extender (legacy)|pscx
Voice / Audio & Telephone|panel|LVM|Live voice module (paging microphone)|ov
Voice / Audio & Telephone|panel|LPB|Local page board|dac
Voice / Audio & Telephone|panel|ALCC|Audio level conversion card|
Amplifiers|panel|ZAM-80|Zone amplifier, 80 W (legacy)|
Voice / Audio & Telephone|panel|FMT-A-ADPT|FMT Class A riser module|ov
Voice / Audio & Telephone|panel|DFM|Fiber converter for DNET (legacy)|
Voice / Audio & Telephone|panel|DFM-BRK|DFM bracket for DNET (legacy)|
Voice / Audio & Telephone||FTS|Remote telephone station|ov
Voice / Audio & Telephone||FTS-P|Remote telephone station|ov
Voice / Audio & Telephone||FTS-C|Remote telephone station|ov
Voice / Audio & Telephone||FTS-CL|Remote telephone station|ov
Voice / Audio & Telephone||FTS-PCL|Remote telephone station|ov
Voice / Audio & Telephone||FB-300|Telephone station flush back box|ov
Voice / Audio & Telephone||FB-301S|Telephone station surface back box|ov
Voice / Audio & Telephone||FC-300S|Key-lock cover with break glass|ov
Voice / Audio & Telephone||FT-GLS|Replacement glass for FC-300S|ov
Voice / Audio & Telephone||MTE-2|Telephone enclosure|ov
Voice / Audio & Telephone||PFT|Portable firefighter phone|ov
Voice / Audio & Telephone||PFT-P|Portable firefighter phone, push-to-talk|ov
Voice / Audio & Telephone||FJ-303|Telephone jack plate|ov
Voice / Audio & Telephone||FJ-303SS|Telephone jack plate, stainless|ov
Voice / Audio & Telephone||FJ-304|Telephone jack plate|ov
Voice / Audio & Telephone||FJ-304SS|Telephone jack plate, stainless|ov
Annunciators|rai|SSD-C|System status display with controls|ov
Annunciators|rai|SSD-C-REM|SSD-C, remote locked cabinet|ov
Annunciators|rai|SSD-INT|System status display, internal|ov
Annunciators|rai|SSD-C-INT|SSD-C, internal|ov
Annunciators|rai|ILED-XC|Addressable remote LED, round plate|iled
Annunciators|rai|ILED-XW|Addressable remote LED, rectangular plate|iled
Annunciators|rai|RL-HW|Remote alarm lamp, wall|
Annunciators|rai|RL-HC|Remote alarm lamp, ceiling|
Network/Fiber|panel|FN2016-U1|XINC Ethernet copper media adapter|xinc
Network/Fiber|panel|FN2017-U1|XINC multi-mode fiber media adapter|xinc
Network/Fiber|panel|FN2018-U1|XINC single-mode fiber media adapter|xinc
Network/Fiber|panel|LDC|Long-distance copper module for XINC|xinc
Detectors|smoke|FDOOTC441|Desigo dual optical/heat + CO detector|fdootc
Detectors|smoke|OOHC941|Cerberus PRO dual optical/heat + CO detector|oohc
Detectors|smoke|OH921|Cerberus PRO optical/heat detector|oh921
Detectors|heat|HI921|Cerberus PRO heat detector|hi921
Detectors|smoke|SFP-11|Canadian H-series optical/heat detector|
Detectors|heat|SFPT-11|Canadian H-series heat detector|
Detectors|smoke|SFPO-11|Canadian H-series optical detector|
Bases||DB-11|Detector mounting base|db11
Bases||DB-11E|Detector mounting base, small|db11
Bases||DB-HR|Relay base, H-series (legacy)|db11
Bases||DB-X11RS|Detector base with relay (legacy)|dbx
Bases||ADBH-11|Audible base, H-series|adbh
Bases||ABHW-4B|Audible base|abhw4b
Bases||ABHW-4S|Audible base, 520 Hz|abhw4s
Bases||ABHW-4SZ|Audible base, 520 Hz, sleeping areas|abhw4sz
Detectors|duct|AD-11P|H-series air duct housing (legacy)|
Detectors|duct|AD-HR|H-series air duct housing with relay (legacy)|
Modules & Stations|module|HTRI-SZ|Single input module, US origin|htri
Modules & Stations|relay|HTRI-RZ|Single input module with relay, US origin|htri
Modules & Stations|module|HTRI-DZ|Dual input module, US origin|htri
Modules & Stations||USCG-HPLATE|Marine metal cover plate for HTRI|htri
Modules & Stations|module|HZM|Remote conventional zone module|hzm
Modules & Stations|module|HCP|Intelligent control point|hcp
Modules & Stations|module|FDCIO422|Addressable input/output module|fdcio
Modules & Stations|module|TSM-1X|Intelligent test switch|tsm
Modules & Stations|pull|HMS-2S|Manual station, two-stage|hms2
Modules & Stations|pull|HMS-SA|Manual station with aux contacts|hms2
Modules & Stations|pull|XMS-S|Class X manual station, single action|xms
Modules & Stations|pull|XMS-D|Class X manual station, double action|xms
Modules & Stations||HMSFD|Double-action adapter for HMS-M|
Modules & Stations||SB-5R|Surface box for HMS|
Modules & Stations|relay|RPR-1|Remote relay|
Enclosures & Doors|panel|CAB2-X|Two-row transponder box + door kit (legacy)|encl2
Enclosures & Doors|panel|CAB3-X|Three-row transponder box + door kit (legacy)|encl2
Enclosures & Doors|panel|XLS-RCC13-ADPT|RCC-1/RCC-3 to SSD adapter (legacy)|ov
Enclosures & Doors|panel|XLS-RCC1-ADPT|RCC-1 to SSD adapter (legacy)|ov
Enclosures & Doors|panel|XLS-EXT-CABLE-PKG|Adapter extension cable kit (legacy)|ov
Enclosures & Doors|panel|REMBOX4R|REMBOX4, red|encl
Enclosures & Doors|panel|MLE-6|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MLE-6R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MME-3|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MME-3R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MBR-2|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MBR-2R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MSE-2|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MSE-2R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MSE-3|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MSE-3R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MSE-3L|Legacy MXL-IQ enclosure (legacy)|ov
Enclosures & Doors|panel|MSE-3LR|Legacy MXL-IQ enclosure, red (legacy)|ov
Enclosures & Doors|panel|MSE-3M|Legacy MXL-IQ enclosure (legacy)|ov
Enclosures & Doors|panel|MSE-3MR|Legacy MXL-IQ enclosure, red (legacy)|ov
Enclosures & Doors|panel|RCC-1|Legacy remote enclosure (legacy)|ov
Enclosures & Doors|panel|RCC-1F|Legacy remote enclosure, flush (legacy)|ov
Enclosures & Doors|panel|RCC-1FR|Legacy remote enclosure, flush red (legacy)|ov
Enclosures & Doors|panel|RCC-3F|Legacy remote enclosure, flush (legacy)|ov
Enclosures & Doors|panel|RCC-3FR|Legacy remote enclosure, flush red (legacy)|ov`.split('\n').map(l=>{const[c,t,m,d,k]=l.split('|');return{c,t,m,d,u:(INSTALL[m]||[''])[0]}});
const MODEL_DESC={};CATALOG.forEach(p=>{MODEL_DESC[p.m]=p.d;if(p.u)DATASHEETS[p.m]=p.u;if(p.t&&!(MODELS[p.t]||[]).includes(p.m))(MODELS[p.t]=MODELS[p.t]||[]).push(p.m)});

{// bpm-v87: door holders confirmed in Siemens docs
 const SDH='https://sid.siemens.com/api/khub/documents/tK3c3EtuyIdOkZnrgDlqZQ/content',PAD4='https://sid.siemens.com/r/A6V10406110/33243998219___en-US_33139400587',dsc={2:'flush wall, concealed wiring',3:'surface wiring',4:'concealed, fully recessed',5:'floor mount',6:'floor mount, double',7:'heavy duty',8:'heavy duty, overhead/vents'};
 for(const n of [2,3,4,5,6,7,8])for(const v of ['A','D']){const m='SDH-'+n+v;MODEL_DESC[m]=`Siemens door holder, ${dsc[n]}, ${v==='A'?'120 VAC':'24 VDC'}`;DATASHEETS[m]=SDH;(MODELS.doorholder??=[]).push(m)}
 for(const[m,d]of[['FM998','Rixson door holder (listed compatible in Siemens PAD-4 manual)'],['DH24120','RSG door holder (listed compatible in Siemens PAD-4 manual)']]){MODEL_DESC[m]=d;DATASHEETS[m]=PAD4;MODELS.doorholder.push(m)}}
const CAT_SET=new Set(CATALOG.map(p=>p.m));
// bpm-v84: user QR-scanned install links (IndexedDB meta 'installLinks', exported in .marker) override built-ins
let ULINKS={};async function userLinks(){ULINKS=(await get('meta','installLinks'))||{};return ULINKS}
const isHttp=u=>{try{const x=new URL(String(u||'').trim());return x.protocol==='http:'||x.protocol==='https:'}catch(e){return false}};
async function setUserLink(m,url){await userLinks();if(url)ULINKS[m]={url,ts:Date.now()};else delete ULINKS[m];await put('meta',ULINKS,'installLinks')}
function dsSearchUrl(m){return 'https://sid.siemens.com/search?q='+encodeURIComponent(m+' installation instructions')}
function dsUrl(m){m=String(m||'').trim();return ULINKS[m]?.url||DATASHEETS[m]||dsSearchUrl(m)}
function dsCov(m){return ULINKS[m]?.url?null:INSTALL[m]?.[2]||null}
function openDs(m){m=String(m||'').trim();if(m)openViewer(dsUrl(m),m,dsCov(m))}
function dsBtnSync(){const m=form.elements.model.value.trim(),b=$('#dDsBtn');b.hidden=false;$('#dQrBtn').hidden=false;/* bpm-v87: always visible */$('#dDsScan').hidden=!(m&&ULINKS[m]);b.title=m?(dsCov(m)?'Covered in: '+dsCov(m).cov+', not a dedicated install sheet':ULINKS[m]||DATASHEETS[m]?'Open '+m+' install sheet':'Search Siemens for '+m+' installation instructions'):'Search Siemens for '+(TYPES[form.elements.type.value]?.n||'device')+' installation instructions'}
// ---------- bpm-v84: in-app install-sheet viewer (pdf.js for PDFs, iframe for HTML, external only as last resort) ----------
const DOC_CACHE='bpm-docs';let IV={pdf:null,z:1,obs:null,tok:0};
async function fetchPdfBytes(url){const abs=new URL(url,location.href).href;
 try{const c=await caches.open(DOC_CACHE),r=await c.match(abs);if(r){const b=new Uint8Array(await r.arrayBuffer());if(b[0]===37&&b[1]===80)return b}}catch(e){}
 try{const r=await fetch(abs,{mode:'cors'});if(!r.ok)return null;const b=new Uint8Array(await r.clone().arrayBuffer());if(!(b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70))return null;try{(await caches.open(DOC_CACHE)).put(abs,new Response(b,{headers:{'Content-Type':'application/pdf'}}))}catch(e){}return b}catch(e){return null}}
function ivMsg(html){$('#ivBody').innerHTML=`<div class="ivMsg">${html}</div>`}
async function openViewer(url,title,cov){const d=$('#ivDlg'),tok=++IV.tok;IV.p=cov?.p||0;{const c=$('#ivCov');c.hidden=!cov;c.textContent=cov?'Covered in: '+cov.cov+(cov.p?' (opens at p. '+cov.p+')':'')+', not a dedicated install sheet':''}$('#ivRep').hidden=true;IV.pdf=null;IV.z=1;$('#ivZ').textContent='100%';$('#ivT').textContent=title||'';const abs=new URL(url,location.href).href;$('#ivExt').href=abs;$('#ivExt').title='Open the original outside Marker';
 $('#ivZo').hidden=$('#ivZi').hidden=$('#ivZ').hidden=true;ivMsg('Loading…');if(!d.open)d.showModal();
 const local=new URL(abs).origin===location.origin;
 if(/\.html?(\?|#|$)/i.test(abs)&&local){$('#ivBody').innerHTML=`<iframe src="${esc(abs)}" title="${esc(title||'')}"></iframe>`;return}
 if(/^https:\/\/sid\.siemens\.com\/search/.test(abs)){ivMsg(`No verified install sheet is stored for <b>${esc(title||'')}</b>.<br><br>Siemens does not allow its search to open inside other apps.<br><br><a class="btn" href="${esc(abs)}" target="_blank" rel="noopener">🔎 Search Siemens (opens outside Marker)</a><br><br><small>Tip: scan the QR code on the part's install sheet (📷 Scan QR) to save its link here.</small>`);return}
 const bytes=await fetchPdfBytes(abs);if(tok!==IV.tok)return;
 if(bytes){try{IV.pdf=await pdfjsLib.getDocument({data:bytes}).promise}catch(e){IV.pdf=null}}
 if(tok!==IV.tok)return;
 if(IV.pdf){$('#ivZo').hidden=$('#ivZi').hidden=$('#ivZ').hidden=false;return ivRender()}
 if(local){ivMsg('This document could not be opened.');return}
 // cross-origin non-PDF or CORS-blocked: try framing; offer external open as last resort
 $('#ivBody').innerHTML=`<div class="ivMsg" style="padding:6px;font-size:.85em">If the page stays blank, the site blocks viewing inside apps: <a class="btn" href="${esc(abs)}" target="_blank" rel="noopener">↗ Open outside Marker</a></div><iframe src="${esc(abs)}" style="height:calc(100% - 44px)" referrerpolicy="no-referrer"></iframe>`}
async function ivRender(){const pdf=IV.pdf,body=$('#ivBody');if(!pdf)return;IV.obs?.disconnect();body.innerHTML='';const W=Math.min(body.clientWidth-16,1100)*IV.z;
 const p1=await pdf.getPage(1),v1=p1.getViewport({scale:1});
 for(let i=1;i<=pdf.numPages;i++){const w=document.createElement('div');w.className='ivPg';w.dataset.p=i;w.style.width=W+'px';w.style.height=(W*v1.height/v1.width)+'px';body.appendChild(w)}
 const tok=IV.tok,z=IV.z;IV.obs=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting&&!e.target.dataset.done){e.target.dataset.done=1;(async()=>{const pg=await pdf.getPage(+e.target.dataset.p);if(tok!==IV.tok||z!==IV.z)return;const v0=pg.getViewport({scale:1}),sc=W/v0.width,dpr=Math.min(devicePixelRatio||1,2),vp=pg.getViewport({scale:sc*dpr});e.target.style.height=(v0.height*sc)+'px';const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;e.target.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise})()}},{root:body,rootMargin:'400px'});
 body.querySelectorAll('.ivPg').forEach(x=>IV.obs.observe(x));if(IV.p>1&&IV.p<=pdf.numPages){const t=body.querySelector(`.ivPg[data-p="${IV.p}"]`);body.scrollTop=t.offsetTop-8;IV.p=0}}
function ivZoom(f){const b=$('#ivBody'),r=b.scrollTop/Math.max(1,b.scrollHeight);IV.z=Math.max(.5,Math.min(4,IV.z*f));$('#ivZ').textContent=Math.round(IV.z*100)+'%';ivRender().then(()=>{b.scrollTop=r*b.scrollHeight})}
$('#ivZi').onclick=()=>ivZoom(1.25);$('#ivZo').onclick=()=>ivZoom(.8);
$('#ivClose').onclick=()=>{IV.tok++;IV.obs?.disconnect();IV.pdf=null;$('#ivBody').innerHTML='';$('#ivDlg').close()};
$('#ivDlg').addEventListener('cancel',e=>{e.preventDefault();$('#ivClose').click()});
$('#dsOff').onclick=async()=>{const fs=[...new Set(Object.values(DATASHEETS).filter(u=>u.startsWith('docs/')))],c=await caches.open(DOC_CACHE);let n=0,bad=0;for(const f of fs){const abs=new URL(f,location.href).href;if(!await c.match(abs)){try{const r=await fetch(abs);if(r.ok)await c.put(abs,r);else bad++}catch(e){bad++}}n++;$('#dsOffI').textContent=`${n}/${fs.length}`}$('#dsOffI').textContent=bad?`${fs.length-bad}/${fs.length} saved offline (${bad} failed)`:`All ${fs.length} install sheets saved offline`};
// ---------- bpm-v84: QR scan → user install link ----------
let QR={stream:null,raf:0,det:null};
function qrStop(){cancelAnimationFrame(QR.raf);clearTimeout(QR.raf);QR.stream?.getTracks().forEach(t=>t.stop());QR.stream=null;const v=$('#qrV');v.srcObject=null}
async function qrDecoder(){if(QR.det)return QR.det;if('BarcodeDetector'in window){try{const f=await BarcodeDetector.getSupportedFormats();if(f.includes('qr_code')){const bd=new BarcodeDetector({formats:['qr_code']});return QR.det=async src=>{const r=await bd.detect(src);return r[0]?.rawValue||null}}}catch(e){}}
 if(!window.jsQR)await new Promise((res,rej)=>{const s=document.createElement('script');s.src='vendor/jsQR.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
 const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});return QR.det=async src=>{const w=src.videoWidth||src.naturalWidth||src.width,h=src.videoHeight||src.naturalHeight||src.height;if(!w||!h)return null;const k=Math.min(1,1000/Math.max(w,h));cv.width=w*k|0;cv.height=h*k|0;cx.drawImage(src,0,0,cv.width,cv.height);const d=cx.getImageData(0,0,cv.width,cv.height),r=jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});return r?.data||null}}
function qrGot(txt){txt=String(txt||'').trim();if(!isHttp(txt)){$('#qrS').textContent='That QR code is not a web link (only http/https links are accepted).';return false}$('#qrU').value=txt;$('#qrS').textContent='Identifying the part…';qrStop();qrInfer(txt);return true}
// bpm-v84: identify the part from the QR link (URL path/query, page title, PDF first-page text) against the catalog
let UPARTS={};async function userParts(){UPARTS=(await get('meta','userParts'))||{};for(const[m,v]of Object.entries(UPARTS))if(!MODEL_DESC[m])MODEL_DESC[m]=v.d||'';return UPARTS}
const pnNorm=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,''),pnBase=x=>pnNorm(String(x||'').toUpperCase().replace(/(-(R|W|F|WP|N|A|INT|INTL|U1|A1|R1)|R)$/,''));
function allParts(){return[...new Set([...CATALOG.map(p=>p.m),...Object.values(MODELS).flat(),...Object.values(MODELS_C||{}).flat(),...Object.keys(UPARTS)])]}
function matchPart(srcs){srcs=[].concat(srcs).filter(Boolean);const ms=allParts().sort((a,b)=>b.length-a.length);let guess='';
 for(const text of srcs){const T=String(text).toUpperCase(),toks=T.split(/[^A-Z0-9-]+/).map(t=>t.replace(/(-(INSTALL|INSTALLATION|INSTRUCTIONS?|MANUAL|DATASHEET|DS|II|EN|US|SHEET))+$/,'')).filter(t=>t.length>=2);let best=null;
  for(const m of ms){const re=new RegExp('(^|[^A-Z0-9-])'+m.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Z0-9]|-[A-Z0-9])','g'),n=(T.match(re)||[]).length;if(n&&(!best||n>best.n))best={m,n}}
  if(best)return{m:best.m,how:'exact'};
  const tn=new Set(toks.map(pnNorm)),tb=new Set(toks.map(pnBase));for(const m of ms)if(pnNorm(m).length>=3&&tn.has(pnNorm(m)))return{m,how:'normalized'};
  for(const m of ms)if(pnBase(m).length>=3&&tb.has(pnBase(m)))return{m,how:'normalized (suffix ignored)'};
  guess=guess||toks.find(t=>/[A-Z]/.test(t)&&/[0-9]/.test(t)&&/^[A-Z]{1,6}[A-Z0-9]*(-[A-Z0-9]+)*$/.test(t)&&!/^(A6V|HTTP|P\d{4}|V\d)/.test(t)&&t.length<=16)||''}
 return{m:null,guess}}
async function qrInferText(url){let a='',pdfT='';try{const u=new URL(url);a=decodeURIComponent(u.pathname.replace(/[\/_+.]/g,' '))+' '+decodeURIComponent(u.search.replace(/[&=?+]/g,' '))}catch(e){}
 const b=await fetchPdfBytes(url);if(b){try{const pdf=await pdfjsLib.getDocument({data:b}).promise,pg=await pdf.getPage(1),tc=await pg.getTextContent();pdfT=tc.items.map(i=>i.str).join(' ');try{const md=await pdf.getMetadata();a+=' '+(md?.info?.Title||'')}catch(e){}}catch(e){}}
 else{try{const r=await fetch(url,{mode:'cors'});if(r.ok&&/html/.test(r.headers.get('content-type')||'')){const h=await r.text(),m=h.match(/<title[^>]*>([^<]*)/i);if(m)a+=' '+m[1]}}catch(e){}}return[a,pdfT]}
async function qrInfer(url){await userParts();const pre=$('#qrP').value.trim();const r=matchPart(await qrInferText(url));QR.inf=r;
 if(r.m){$('#qrP').value=r.m;$('#qrM').textContent=`Identified ${r.m} (${r.how} match)${pre&&pre!==r.m?` — the pin's model was ${pre}`:''}. Confirm or change it, then Continue.`}
 else{if(!pre&&r.guess)$('#qrP').value=r.guess;$('#qrM').textContent=r.guess?`No catalog part matched; part number read as ${r.guess}. Confirm or change it.`:'No part number found in the link. Type the part, then Continue.'}
 $('#qrS').textContent='✓ Link read. Confirm the part, then Continue.';qrPartChg();if(QR.auto&&r.m)qrDecide()}
function qrPartChg(){const m=$('#qrP').value.trim(),known=m&&allParts().includes(m);$('#qrNew').hidden=!m||known;$('#qrHas').hidden=true}
async function openQr(part,auto){QR.auto=!!auto;const d=$('#qrDlg');$('#qrU').value='';$('#qrP').value=part||'';$('#qrS').textContent='Point the camera at the QR code…';$('#qrM').textContent='';$('#qrNew').hidden=$('#qrHas').hidden=true;$('#qrD').value='';$('#qrC').value='My devices';$('#qrT').innerHTML='<option value="">(catalog only)</option>'+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');{const cur=typeof form!=='undefined'&&$('#pinDlg')?.open?form.elements.type?.value:'';if(cur)$('#qrT').value=cur}await userParts();
 const ms=[...new Set([...CATALOG.map(p=>p.m),...Object.values(MODELS).flat(),...Object.values(await customModels()).flat()])].sort();$('#qrPL').innerHTML=ms.map(m=>`<option value="${esc(m)}">${esc(MODEL_DESC[m]||'')}</option>`).join('');
 d.showModal();let det;try{det=await qrDecoder()}catch(e){$('#qrS').textContent='QR decoder unavailable.';return}
 try{QR.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});const v=$('#qrV');v.srcObject=QR.stream;await v.play();
  const loop=async()=>{if(!QR.stream)return;try{const t=await det(v);if(t&&qrGot(t))return}catch(e){}QR.raf=setTimeout(loop,200)};loop()}
 catch(e){$('#qrS').textContent='Camera not available. Use “From image” or paste the link.'}}
$('#qrFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const det=await qrDecoder(),img=new Image();img.src=URL.createObjectURL(f);await img.decode();let t=null;try{t=await det(img)}catch(x){}URL.revokeObjectURL(img.src);if(t)qrGot(t);else $('#qrS').textContent='No QR code found in that image.'};
const viable=m=>!!(ULINKS[m]?.url||DATASHEETS[m]);
async function qrDecide(){const u=$('#qrU').value.trim(),m=$('#qrP').value.trim();if(!isHttp(u)){$('#qrS').textContent='Only http(s) links can be saved.';return}if(!m){$('#qrS').textContent='Choose or type the part this link belongs to.';return}
 await userParts();const known=allParts().includes(m);
 if(known&&viable(m)){QR.pend={m,u};$('#qrHasT').textContent=`${m} already has ${ULINKS[m]?'a scanned':'a verified'} install sheet. It was kept.`;$('#qrHas').hidden=false;$('#qrS').textContent='Existing sheet kept (not replaced).';return 'has'}
 if(known){await setUserLink(m,u);toast(`Saved scanned install link for ${m}`);qrDone(m);return 'saved'}
 const t=$('#qrT').value,d=$('#qrD').value.trim(),c=$('#qrC').value.trim()||'My devices';UPARTS[m]={d,c,t,ts:Date.now()};await put('meta',UPARTS,'userParts');MODEL_DESC[m]=d;if(t)await rememberModel(t,m);await setUserLink(m,u);toast(`Added ${m} to My devices with its install link`);qrDone(m);return 'new'}
function qrDone(m){qrStop();$('#qrDlg').close();dsBtnSync();if($('#dsDlg').open){$('#dsQ').value=m;dsList()}fetchPdfBytes(ULINKS[m]?.url||'')}
$('#qrSave').onclick=qrDecide;$('#qrP').addEventListener('input',qrPartChg);
$('#qrOpen').onclick=()=>{const{m,u}=QR.pend||{};if(!m)return;qrStop();$('#qrDlg').close();openDs(m);$('#ivRep').hidden=false;$('#ivRep').onclick=async()=>{await setUserLink(m,u);$('#ivRep').hidden=true;toast(`Replaced ${m}'s sheet with the scanned link`);dsBtnSync();if($('#dsDlg').open)dsList();openDs(m)}};
$('#qrRep').onclick=async()=>{const{m,u}=QR.pend||{};if(!m)return;await setUserLink(m,u);toast(`Replaced ${m}'s sheet with the scanned link`);qrDone(m)};

$('#qrDlg').addEventListener('close',qrStop);
$('#dsQr').onclick=()=>openQr($('#dsQ').value.trim()&&CATALOG.concat().some(p=>p.m===$('#dsQ').value.trim())?$('#dsQ').value.trim():'');
$('#dQrBtn').onclick=async()=>{const m=form.elements.model.value.trim();await openQr(m);if(!m&&$('#qrT'))$('#qrT').value=form.elements.type.value;QR.pinType=form.elements.type.value};
$('#qrTool').onclick=()=>openQr('',true); // bpm-v85: toolbar scan: auto-match → keep/attach, else new My devices entry
userLinks();userParts();
$('#dDsBtn').onclick=()=>{const m=form.elements.model.value.trim();if(m)return openDs(m);const n=TYPES[form.elements.type.value]?.n||'fire alarm device';openViewer('https://sid.siemens.com/search?q='+encodeURIComponent(n+' installation instructions Siemens'),n+' installation instructions')};
['change','input'].forEach(ev=>{$('#dModelSel').addEventListener(ev,dsBtnSync);$('#dModelC').addEventListener(ev,dsBtnSync)});
// bpm-v82: category/type keywords (notification, NAC, horn, strobe, speaker…) match every notification device; rank part number > category > description
const DS_NOTIF_T=new Set(['horn','spkstrobe','strobe','linearray']),DS_NOTIF_KW=['notification','nac','horn','strobe','speaker','chime','visual','audible','appliance','sounder','acend'];
const dsNotifGrp=(isT,key)=>isT?DS_NOTIF_T.has(key):/notification/i.test(key);
async function dsList(){const c=await customModels(),q=$('#dsQ').value.trim().toLowerCase();let G=[];
 const nq=q.length>=3&&DS_NOTIF_KW.some(k=>k.startsWith(q)||q.startsWith(k));
 const acend=m=>/^SC-/.test(m)||CATALOG.some(p=>p.m===m&&/acend/i.test(p.c));
 const score=(m,g,notif)=>{if(!q)return 0;if(m.toLowerCase().includes(q))return 1;if(g.toLowerCase().includes(q))return 2;if(nq&&(notif||acend(m)))return 2;if((MODEL_DESC[m]||'').toLowerCase().includes(q))return 3;return 9};
 const btn=m=>{const u=ULINKS[m],has=u||DATASHEETS[m];return`<button type="button" class="btn dsM" data-m="${esc(m)}" title="${dsCov(m)?esc('Covered in: '+dsCov(m).cov+', not a dedicated install sheet'):has?'Install instructions':'Siemens search'}">${esc(m)} ${has?(dsCov(m)?'📘':'📄'):'🔎'}${dsCov(m)?'<span class="scB covB">covered</span>':''}${u?'<span class="scB">scanned</span>':''}${UPARTS[m]?'<span class="scB myB">My devices</span>':''}${MODEL_DESC[m]?`<small class="dsD">${esc(MODEL_DESC[m])}</small>`:''}</button>`+(u?`<button type="button" class="btn dsX" data-rep="${esc(m)}" title="Replace scanned link">↻</button><button type="button" class="btn dsX" data-rm="${esc(m)}" title="Remove scanned link">✕</button>`:'')};
 const grp=(key,attr,name,ms)=>{const notif=dsNotifGrp(attr==='data-type',key);const r=ms.map((m,i)=>({m,i,s:score(m,name,notif)})).filter(x=>x.s<9).sort((x,y)=>x.s-y.s||x.i-y.i);if(r.length)G.push({s:r[0].s,o:G.length,h:`<details open class="dsGrp" ${attr}="${esc(key)}"><summary>${esc(name)} <small>(${r.length})</small></summary>`+r.map(x=>btn(x.m)).join('')+'</details>'})};
 for(const t in TYPES)grp(t,'data-type',TYPES[t].n,[...new Set([...(MODELS[t]||[]).filter(m=>!CAT_SET.has(m)),...(c[t]||[])])]);
 for(const k of [...new Set(CATALOG.map(p=>p.c))])grp(k,'data-cat',k,CATALOG.filter(p=>p.c===k).map(p=>p.m));
 for(const k of [...new Set(Object.values(UPARTS).map(v=>v.c||'My devices'))])grp(k,'data-my',k==='My devices'?k:k+' · My devices',Object.keys(UPARTS).filter(m=>(UPARTS[m].c||'My devices')===k));
 G.sort((x,y)=>x.s-y.s||x.o-y.o);
 $('#dsBody').innerHTML=G.map(g=>g.h).join('')||'<small style="color:#94a3b8">No models match.</small>'}
$('#dsBody').onclick=async e=>{const r=e.target.closest('[data-rep]'),x=e.target.closest('[data-rm]'),b=e.target.closest('.dsM');if(r)return openQr(r.dataset.rep);if(x){if(confirm('Remove the scanned link for '+x.dataset.rm+'? The built-in link will be used again.')){await setUserLink(x.dataset.rm,null);dsList();dsBtnSync()}return}if(b)openDs(b.dataset.m)};
$('#dsQ').oninput=dsList;
$('#dsBtn').onclick=async()=>{$('#dsQ').value='';await userLinks();await userParts();await dsList();$('#dsDlg').showModal()};
