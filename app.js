'use strict';
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const $=s=>document.querySelector(s);
const TYPES={smoke:{c:'#dc2626',l:'S',n:'Smoke'},heat:{c:'#ea580c',l:'H',n:'Heat'},pull:{c:'#be185d',l:'P',n:'Pull station'},horn:{c:'#7c3aed',l:'HS',n:'Horn/strobe'},panel:{c:'#991b1b',l:'FACP',n:'FACP – Fire Alarm Control Panel',sq:1},dact:{c:'#ca8a04',l:'DACT',n:'DACT – Digital Alarm Communicator Transmitter',sq:1},fatc:{c:'#0e7490',l:'FATC',n:'FATC – Fire Alarm Terminal Cabinet',sq:1},panelbox:{c:'#0f766e',l:'ANN',n:'Annunciator',sq:1},rai:{c:'#e11d48',l:'RI',n:'Remote alarm indicator'},module:{c:'#2563eb',l:'M',n:'Monitor/control module',sq:1},duct:{c:'#b45309',l:'D',n:'Duct detector'},flow:{c:'#0369a1',l:'WF',n:'Waterflow switch'},tamper:{c:'#4d7c0f',l:'TS',n:'Tamper switch'},spkstrobe:{c:'#9333ea',l:'SS',n:'Speaker/strobe'},strobe:{c:'#c026d3',l:'ST',n:'Strobe'},linearray:{c:'#4f46e5',l:'LA',n:'Line array speaker'},relay:{c:'#2dd4bf',l:'R',n:'Relay',sq:1},doorholder:{c:'#db2777',l:'DH',n:'Door holder'},jbox:{c:'#64748b',l:'J',n:'Junction box',sq:1},surge:{c:'#16a34a',l:'SS',n:'Surge protector (TVSS / SPD)',sq:1},other:{c:'#475569',l:'?',n:'Other'}};
// bpm-v106: new device types (user-approved legend review). Existing types keep shape/geometry; only the panel group's colors change.
// Panels (all): every panel / enclosure-panel type shares the FACP color (#991b1b), told apart by shape and label. VESDA (all parts): one shared cyan, told apart by shape.
const PANEL_C='#991b1b',VESDA_C='#06b6d4';
for(const k of['dact','fatc','panelbox'])TYPES[k].c=PANEL_C;
Object.assign(TYPES,{
 farp:{c:PANEL_C,l:'FARP',n:'FARP – Fire Alarm Remote Panel',sq:1},
 scs:{c:PANEL_C,l:'SCS',n:'Smoke control station',sq:1},
 loc:{c:PANEL_C,l:'LOC',n:'Local operator console',sq:1},
 speaker:{c:'#1e3a8a',l:'SP',n:'Speaker (no strobe)'},
 lfs:{c:'#818cf8',l:'LF',n:'Low-frequency sounder'},
 bell:{c:'#eab308',l:'B',n:'Bell – 120 VAC'},
 pad:{c:'#f59e0b',l:'PAD',n:'PAD-4/PAD-5',sq:1},
 multi:{c:'#a16207',l:'MC',n:'Multi-criteria detector'},
 damper:{c:'#57534e',l:'FSD',n:'Fire/smoke damper',sq:1},
 oss:{c:'#84cc16',l:'OSS',n:'Operator safety switch',sq:1},
 eol:{c:'#fda4af',l:'EOL',n:'EOL resistor',sq:1},
 bfp:{c:'#9a3412',l:'BFP',n:'Sprinkler backflow preventer'},
 pullbox:{c:'#78350f',l:'PB',n:'Electrical pull box',sq:1},
 vesda:{c:VESDA_C,l:'VES',n:'VESDA aspirating detector',sq:1},
 vpsu:{c:VESDA_C,l:'PS',n:'VESDA power supply',sq:1},
 vsp:{c:VESDA_C,l:'SP',n:'VESDA sampling point'},
 vcap:{c:VESDA_C,l:'C',n:'VESDA capillary sampling point'},
 vlf:{c:VESDA_C,l:'LF',n:'VESDA laser focus'},
 vnet:{c:VESDA_C,l:'NI',n:'VESDA network interface'},
 vrem:{c:VESDA_C,l:'RE',n:'VESDA remote enclosure',sq:1},
 vtee:{c:VESDA_C,l:'T',n:'VESDA aspirating sampling tee'},
 ffphone:{c:'#0f766e',l:'FT',n:'Firefighter phone jack',sq:1}}); // bpm-v135
// color sheet / legend group names for shared colors
const CGRP={[PANEL_C]:'Panels (all)',[VESDA_C]:'VESDA (all parts)'};const PANEL_GRP=['panel','panelbox','farp','fatc','dact','scs','loc'];
const ST={passed:'#16a34a',failed:'#dc2626',corrected:'#0891b2','in progress':'#f59e0b','not tested':'#94a3b8'},STATUSES=['passed','failed','corrected','in progress','not tested'];
// bpm-v135: "corrected" = a failed device that was fixed. It keeps its fail reason, severity and code references and adds when it was corrected, by whom and what was done.
const isTested=p=>p.status==='passed'||p.status==='failed'||p.status==='corrected',corrTxt=p=>p.status==='corrected'?`Corrected${p.correctedAt?' '+fmtT(p.correctedAt):''}${p.correctedBy?' by '+p.correctedBy:''}${p.corrNote?': '+p.corrNote:''}`:'';
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
Object.assign(CHECKS,{
 farp:['Normal/AC power OK','No trouble/supervisory/alarm conditions','Communicates with main FACP','Controls operate (ack/silence/reset)','Physical condition OK'],
 scs:['Status LEDs match fan/damper positions','Manual override switches operate equipment','Lamp test OK','Communicates with FACP','Physical condition OK'],
 loc:['Display and controls operate','Communicates with FACP','Paging/voice functions OK','Physical condition OK'],
 speaker:['Audible/voice message intelligible','Wattage tap matches plan','Mounted/condition OK'],
 lfs:['Low-frequency tone (520 Hz) audible','Synchronized','Mounted/condition OK'],
 bell:['Audible on alarm','Silences/restores properly','Mounted/condition OK'],
 pad:['AC power and battery OK','NAC outputs operate on alarm','Trouble reported to FACP','Physical condition OK'],
 multi:['Alarm received at panel','Correct address/label at panel','LED/base condition OK','Sensitivity within range','Clean/unobstructed'],
 damper:['Closes on alarm/command','Position indication received','Reopens/resets','Accessible/condition OK'],
 oss:['Switch operates (disables release/automatic action)','Supervisory/trouble shown at panel','Restores on reset','Physical condition OK'],
 eol:['Correct value installed at end of circuit','Circuit supervised (trouble on open)','Secured/labeled'],
 bfp:['Valves supervised (tamper) where required','No leaks','Accessible/identified','Physical condition OK'],
 ffphone:['Handset plugged in: call-in signal received at master station','Two-way voice is clear both ways','Unplugged/open circuit shows trouble at panel','Jack/cover accessible and labeled','Physical condition OK'],
 pullbox:['Cover in place and identified','Wiring secured, no damage','Accessible'],
 vesda:['Airflow within limits','Alarm received at panel','Fault/trouble reported','Filter OK','Physical condition OK'],
 vpsu:['AC power OK','Battery tested and dated','Trouble reported','Physical condition OK'],
 vsp:['Sampling hole clear and labeled','Transport time within limits','Physical condition OK'],
 vcap:['Capillary tube intact and clear','Sampling point labeled','Physical condition OK'],
 vlf:['Display shows normal','Fault/trouble reported','Physical condition OK'],
 vnet:['Communicates with FACP/network','Fault reported on loss of comms','Physical condition OK'],
 vrem:['Display/controls operate','Enclosure secure','Physical condition OK'],
 vtee:['Tee intact and sealed','Pipe clear','Physical condition OK']});
let CKT={};const ckTpl=t=>CKT[t]||CHECKS[t]||CHECKS.other;const checkItems=t=>ckTpl(t).map(t=>({t,v:''}));
const PIN_OP=.5,MK_OP=.8;const pinR=()=>9.6;
// bpm-v26/27: pin silhouettes match the printed plan symbols (shape + size in plan points, measured from the test plan legend:
// hex smoke/duct/module ~15pt, flat flow/tamper diamond ~24x9, 13pt square for pull/notification/J/relay, wide boxes for panels/DH)
const PSH={smoke:['hex',15,13],duct:['hex',15,13],module:['hex',15,13],heat:['circ',13,13],pull:['rect',13,13],horn:['rect',13,13],spkstrobe:['rect',13,13],strobe:['rect',13,13],linearray:['rect',13,13],
 panel:['rect',26,13],dact:['rect',26,13],fatc:['rect',26,13],panelbox:['rect',26,13],doorholder:['rect',7,14],relay:['hex',15,13],jbox:['rect',13,13],surge:['rect',13,13],
 flow:['dia',24,9],tamper:['dia',24,9],rai:['circ',6,6],jceil:['circ',13,13],other:['circ',12,12]};
// bpm-v106: new types on the v50 shape set (hex / circ / rect / dia); Detect/Teach measured bw/bh still override these defaults
Object.assign(PSH,{farp:['rect',26,13],scs:['rect',26,13],loc:['rect',26,13],pad:['rect',26,13],speaker:['rect',13,13],lfs:['rect',13,13],bell:['circ',13,13],multi:['hex',15,13],
 damper:['rect',16,10],oss:['rect',13,13],eol:['rect',9,6],bfp:['dia',24,9],pullbox:['rect',13,13],ffphone:['rect',13,13],
 vesda:['rect',26,13],vpsu:['rect',16,16],vsp:['circ',8,8],vcap:['circ',5,5],vlf:['hex',15,13],vnet:['dia',16,12],vrem:['rect',22,16],vtee:['dia',10,10]});
const PSC=1.3;const PANEL_S=new Set(['panel','dact','fatc','panelbox','farp','scs','loc','pad','vesda']);
// bpm-v37: tight outset — path = print outer size; canvas stroke is centered so gray outer edge = print + LW/2 (thin ring just outside black; no inset, no ~1.3× overhang, no color past the gray)
const pshOf=o=>{if(o&&typeof o==='object'&&o.shk&&o.bw>4&&o.bh>4)return[o.shk,o.bw,o.bh]; /* bpm-v103: taught shape from the template's ink outline */const t=typeof o==='string'?o:o&&(o.shp||o.type),v=PSH[t]||PSH.other;if(PANEL_S.has(t)){if(o&&o.bw>4&&o.bh>4)return['rect',o.bw,o.bh];if(o&&o.vert)return['rect',v[2],v[1]];return['rect',v[1],v[2]]}if(v[0]==='dia'){const W=(o&&o.bw>4&&o.bh>4)?o.bw:v[1],H=(o&&o.bw>4&&o.bh>4)?o.bh:v[2];return['dia',W,H]}if(o&&o.bw>4&&o.bh>4&&(v[0]==='rect'||v[0]==='hex'||v[0]==='circ'))return[v[0],o.bw,o.bh];return[v[0],v[1],v[2]]};
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
// bpm-v125: a failed checklist item reads "<item>: Fail" (a trailing "OK" is dropped). Never "Failed: … OK".
function failItemLabel(t){let s=String(t??'').trim();if(/:\s*Fail$/i.test(s))return s;s=s.replace(/^Fail(?:ed)?:\s*/i,'').replace(/\s+OK\s*$/i,'').trim();return (s||'Check')+': Fail'}
function failReasonText(rt){if(rt==null||rt==='')return rt||'';const parts=String(rt).split(/\s·\s/),head=parts[0];if(!/^Failed:\s*/i.test(head))return String(rt);parts[0]=head.replace(/^Failed:\s*/i,'').split(/\s*;\s*/).map(s=>s.trim()).filter(Boolean).map(failItemLabel).join('; ');return parts.join(' · ')}
window.failItemLabel=failItemLabel;window.failReasonText=failReasonText;
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
/* bpm-v98 (B3): wide layout follows the same media query as the CSS; the Pins toggle is remembered so a resize/rotate can't fight it */const WIDE_MQ=matchMedia('(min-width:800px)');let PANEL_CLOSED=false;const panelBtnSync=()=>{const b=$('#listBtn');if(b){const on=!$('#panel').hidden;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}};WIDE_MQ.addEventListener?.('change',()=>resize());
let lastW=0,lastH=0;function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(lastW&&pageW){const cx=(lastW/2-view.x)/view.s,cy=(lastH/2-view.y)/view.s;view.x=w/2-cx*view.s;view.y=h/2-cy*view.s}const wide=WIDE_MQ.matches;if(wide!==resize.wide){resize.wide=wide;$('#panel').hidden=wide?(PANEL_CLOSED||document.body.classList.contains('lpOn')):true;renderList();panelBtnSync()}lastW=w;lastH=h;cv.width=ov.width=w*dpr();cv.height=ov.height=h*dpr();draw();scheduleRender()}
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
  prog(.3);lay={...LAY0,...((await get('meta','layers:'+id))||{})};layMark();await loadScale(id);ROTS=(await get('meta','rot:'+id))||{};await pnAll();THB={};MS.pts=[];setTimeout(renderMBar,0);markups=await byIdx('markups','planId',id);pins=await byIdx('pins','planId',id);
  await put('meta',id,'last:'+p.projectId);await refreshPlans();$('#empty').hidden=true;await gotoPage(Math.min(pg,p.pages)||1,seq);if(p.kind==='pdf'){VO=null;const P=plan;setTimeout(()=>vecWarm(P),600)}}
 catch(e){if(seq===opSeq){if(loadTask){try{loadTask.destroy()}catch{}loadTask=null}showErr(`Could not open "${p.name}": ${e&&e.message||e}`)}}
 finally{if(seq===opSeq)busy(0)}}
async function buildPageSel(){fillPageSel(null);let labels=null;try{labels=pdf&&await withTimeout(pdf.getPageLabels(),5000,'labels')}catch{}if(labels)fillPageSel(labels)}
// bpm-v102: page names (meta 'pname:'+planId = {page:name}); display only, page order and pin data untouched.
let PNC={};async function pnAll(){const o={};try{for(const pl of(await all('plans')).filter(p=>p.projectId===project?.id))o[pl.id]=(await get('meta','pname:'+pl.id))||{}}catch{}PNC=o;return o}
function pnm(plId,n){return(PNC[plId]||{})[n]||''}function pgT(plId,n){const m=pnm(plId,n);return m?`pg ${n} “${m}”`:`pg ${n}`}
async function pnRename(n){if(!plan)return;const pid=plan.id,cur=pnm(pid,n);let d=$('#pnDlg');if(!d){d=document.createElement('dialog');d.id='pnDlg';document.body.append(d)}
 d.innerHTML=`<form method="dialog" class="uiF"><b>Page ${n} name</b><p class="uiM" style="margin:4px 0;color:#94a3b8;font-size:13px">Shown with the page number in the Pages strip, page picker, walk, Pins list, CSV and reports. Page order is not changed.</p><input class="uiI" id="pnI" maxlength="80" placeholder="e.g. First floor east" value="${esc(cur)}" autocomplete="off"><div class="row" style="margin-top:8px"><button type="button" class="btn" id="pnReset"${cur?'':' disabled'}>↺<span class="tl">Reset to “Page ${n}”</span></button><span class="sp"></span><button type="button" class="btn" id="pnNo">Cancel</button><button class="btn pri" id="pnOk">Save</button></div></form>`;
 const set=async v=>{const m={...(await get('meta','pname:'+pid))||{}};if(v)m[n]=v;else delete m[n];await put('meta',m,'pname:'+pid);(PNC[pid]=m);d.close();fillPageSel(null);renderThumbs();renderList();toast(v?`Page ${n} named “${v}”`:`Page ${n} name reset`)};
 d.querySelector('#pnNo').onclick=()=>d.close();d.querySelector('#pnReset').onclick=()=>set('');d.querySelector('form').onsubmit=e=>{e.preventDefault();set(d.querySelector('#pnI').value.trim().slice(0,80))};d.showModal();d.querySelector('#pnI').focus()}
window.pnRename=pnRename;
function fillPageSel(labels){if(!plan)return;const sel=$('#pageSel');sel.innerHTML='';for(let i=1;i<=plan.pages;i++){const n=pins.filter(x=>x.page===i).length;sel.add(new Option(`${pnm(plan.id,i)?i+' · '+pnm(plan.id,i):labels?.[i-1]||'Pg '+i} / ${plan.pages}${n?` (${n}📍)`:''}`,i))}sel.value=page}
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
/* bpm-v98 (B5): the Fit button shows the WHOLE page (page-open keeps the v34 closer zoom) */function fitAll(){if(!pageW)return;const D=dispWH(),w=stage.clientWidth,h=stage.clientHeight,s=Math.min(w/D.w,h/D.h)*.96;view={s,x:(w-D.w*s)/2,y:(h-D.h*s)/2};draw();scheduleRender()}window.fitAll=fitAll;$('#fit').onclick=fitAll;
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
