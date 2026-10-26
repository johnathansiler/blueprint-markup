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
 const v=await uiPrompt('Real length of that line?\nExamples: 10\'  ·  10\' 6"  ·  10.5 ft  ·  126 in  ·  3.2 m','');if(v===null)return;const ft=parseLen(v);if(!ft||ft<=0){uiAlert('Could not read that length. Try 10\' 6", 10.5 ft or 3.2 m.');return}
 const ppf=px/ft,cur=SCL[plan.id]||{def:null,pages:{}};const all_=pdf&&pdf.numPages>1?await uiConfirm(`Scale set: ${fmtLen(ft)} = ${px.toFixed(0)} pt.\n\nOK = use for ALL pages of this plan\nCancel = this page (${page}) only`):true;
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
 if($('#mClr'))$('#mClr').onclick=async()=>{if(!await uiConfirm(pp?`Remove the page ${page} scale (falls back to the plan scale if set)?`:'Remove this plan\'s scale?'))return;const v=SCL[plan.id];if(pp)delete v.pages[page];else v.def=null;await put('meta',v,'scale:'+plan.id);renderMBar();draw()};
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
async function walkPick(){if(!plan)return uiAlert('Open a plan first.');if(!pins.length)return uiAlert('This plan has no pins yet. Place pins or use 🔍 Detect devices first.');
 const last=(await get('meta','walkTypes'))||null,types=[...new Set(pins.map(p=>p.type))].sort((a,b)=>(TYPES[a]?.n||a).localeCompare(TYPES[b]?.n||b));
 $('#wkTypes').innerHTML=types.map(t=>{const all_=pins.filter(p=>p.type===t),un=all_.filter(untested).length;return`<label><input type="checkbox" value="${t}"${!last||last.includes(t)?' checked':''}><span class="dot" style="display:inline-block;background:${(TYPES[t]||TYPES.other).c}"></span> ${esc(TYPES[t]?.n||t)} <small style="color:#a2a2a2">${un} untested / ${all_.length}</small></label>`}).join('');
 const bx=()=>[...document.querySelectorAll('#wkTypes input')];$('#wkAll').onclick=()=>bx().forEach(b=>b.checked=true);$('#wkNone').onclick=()=>bx().forEach(b=>b.checked=false);$('#wkProj').parentElement.hidden=true;
 $('#wkGo').onclick=async()=>{const sel_=bx().filter(b=>b.checked).map(b=>b.value);if(!sel_.length){uiAlert('Tick at least one device type.');return}await put('meta',sel_,'walkTypes');$('#walkDlg').close();startWalk('',sel_.length===types.length?null:sel_)};$('#walkDlg').showModal()}
// ---------- v15: page thumbnails ----------
var THB={},thObs=null;
function thumbsWanted(){return true}/* bpm-v113: page preview open by default on every viewport */
async function thumbFor(n){const key=plan.id+':'+n;if(THB[key])return THB[key];let url=null;try{
  if(pdf){const pg=await pdf.getPage(n),vp=pg.getViewport({scale:1}),sc=Math.min(150/vp.width,150/vp.height),c=document.createElement('canvas');c.width=Math.ceil(vp.width*sc);c.height=Math.ceil(vp.height*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
   if(n===page&&baseBm)x.drawImage(baseBm.c,0,0,c.width,c.height);else await pg.render({canvasContext:x,viewport:pg.getViewport({scale:sc})}).promise;url=c.toDataURL('image/jpeg',.7)}
  else if(bmp){const c=document.createElement('canvas'),sc=Math.min(150/pageW,150/pageH);c.width=Math.ceil(pageW*sc);c.height=Math.ceil(pageH*sc);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);url=c.toDataURL('image/jpeg',.7)}}catch{}
 THB[key]=url;return url}
function renderThumbs(){const b=$('#thumbs');if(!plan||b.hidden)return;const N=plan.pages||1;
 b.innerHTML=`<div class="thh"><b>Pages</b><button type="button" class="btn thRn" id="thRn" title="Rename the current page (or long-press a thumbnail)">✎<span class="tl">Rename</span></button><button type="button" class="btn" id="thX" title="Hide">✕</button></div>`+Array.from({length:N},(_,i)=>{const n=i+1,ps=pins.filter(p=>p.page===n),f=ps.filter(p=>p.status==='failed').length,r=ROTS[n]||0;
  return`<button type="button" class="th${n===page?' on':''}" data-pg="${n}"><img alt="" data-n="${n}"${THB[plan.id+':'+n]?` src="${THB[plan.id+':'+n]}"`:''} style="transform:rotate(${r}deg)"><span class="thn">${n}</span>${pnm(plan.id,n)?`<span class="thNm" title="${esc(pnm(plan.id,n))}">${esc(pnm(plan.id,n))}</span>`:''}${ps.length?`<span class="thb${f?' f':''}">${f?f+'✖':ps.length}</span>`:''}</button>`}).join('');
 $('#thX').onclick=()=>{b.hidden=true;thUserOff=true;$('#thBtn').classList.remove('pri')};
 $('#thRn').onclick=()=>pnRename(page);b.querySelectorAll('[data-pg]').forEach(x=>{let lt=0,lp=false;x.onpointerdown=()=>{lp=false;clearTimeout(lt);lt=setTimeout(()=>{lp=true;pnRename(+x.dataset.pg)},550)};x.onpointerup=x.onpointerleave=x.onpointercancel=()=>clearTimeout(lt);x.oncontextmenu=e=>{e.preventDefault()};x.addEventListener('click',e=>{if(lp){e.stopImmediatePropagation();e.preventDefault();lp=false}},true)});b.querySelectorAll('[data-pg]').forEach(x=>x.onclick=()=>{const n=+x.dataset.pg;if(n!==page){$('#pageSel').value=n;gotoPage(n).then(()=>{MS.pts=[];renderMBar();renderThumbs()})}});
 if(thObs)thObs.disconnect();thObs=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){const im=e.target;thObs.unobserve(im);if(!im.src)setTimeout(async()=>{const u=await thumbFor(+im.dataset.n);if(u)im.src=u},30)}},{root:b});
 b.querySelectorAll('img[data-n]').forEach(im=>thObs.observe(im));b.querySelector('.th.on')?.scrollIntoView({block:'nearest',inline:'nearest'})}
/* bpm-v129: once the user closes Pages it stays closed (page changes, walk Pass/Fail/next device) until the user opens it again; a newly opened plan starts with Pages open as before */
var thUserOff=false,thPlanId=null;
$('#thBtn').onclick=()=>{const b=$('#thumbs');b.hidden=!b.hidden;thUserOff=b.hidden;$('#thBtn').classList.toggle('pri',!b.hidden);renderThumbs()};
{const _ac=afterChange;afterChange=function(){_ac();if(!$('#thumbs').hidden)renderThumbs()}}
// open the strip by default on wide screens, after first render
setTimeout(()=>{if(thumbsWanted()&&plan&&$('#thumbs').hidden){$('#thumbs').hidden=false;$('#thBtn').classList.add('pri');renderThumbs()}},1500);
{const _g=gotoPage;gotoPage=async function(n,seq){const r=await _g(n,seq);if(plan&&plan.id!==thPlanId){thPlanId=plan.id;thUserOff=false}if(!$('#thumbs').hidden)renderThumbs();else if(thumbsWanted()&&plan&&!thUserOff){$('#thumbs').hidden=false;$('#thBtn').classList.add('pri');renderThumbs()}return r}}
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
$('#ckReset').onclick=async ()=>{if(ckl.some(c=>c.v)&&!await uiConfirm('Replace this pin\'s checklist with the current template? Answers on this pin are cleared.'))return;ckl=checkItems(form.elements.type.value);renderChecks()};

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
const PANEL_T=new Set(['panel','dact','fatc','panelbox','farp','scs','loc','pad','vesda']),PANEL_G=new Set(['facp','dact','fatc','panelbox','farp','scs','loc','pad','vesda']); // bpm-v106: + new box types
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
function walkGoto(){if(!walk)return;let d=$('#wGotoDlg');if(!d){d=document.createElement('dialog');d.id='wGotoDlg';d.style.cssText='max-width:520px;width:94vw;max-height:85vh;padding:10px;background:#0a0a0a;color:#e7e7e7;border:1px solid #262626;border-radius:10px';document.body.appendChild(d)}
 const cur=walk.p?.id,S=walkSet(),st={pass:'✔',fail:'✖'};let f='',only=true;
 const draw_=()=>{const L=S.filter(p=>(!only||untested(p))&&(!f||[p.address,p.location,TYPES[p.type]?.n||p.type].join(' ').toLowerCase().includes(f))).sort((a,b)=>a.page-b.page||String(a.address||'').localeCompare(String(b.address||''),undefined,{numeric:true}));
  d.querySelector('#wgL').innerHTML=L.length?L.map(p=>{const t=untested(p)?(walk.skip.has(p.id)?'⏭':'○'):(String(p.status).toLowerCase().includes('fail')?'✖':'✔');return `<button type="button" class="btn" data-id="${p.id}" style="display:flex;width:100%;gap:8px;align-items:center;text-align:left;min-height:44px;margin:3px 0${p.id===cur?';border:2px solid #38bdf8':''}"><span style="width:18px">${t}</span><span class="dot" style="display:inline-block;background:${(TYPES[p.type]||TYPES.other).c}"></span><span style="flex:1">${esc(TYPES[p.type]?.n||p.type)} ${p.address?esc(p.address):'<small style="color:#a2a2a2">(no address)</small>'}${p.location?' · '+esc(p.location):''}</span><small style="color:#a2a2a2">${esc(pgT(plan.id,p.page))}</small></button>`}).join(''):'<div style="padding:12px;color:#a2a2a2">No matching devices.</div>';
  d.querySelectorAll('#wgL [data-id]').forEach(b=>b.onclick=()=>{const p=pins.find(x=>x.id===b.dataset.id);d.close();if(p&&walk){walk.skip.delete(p.id);walkGo(p)}})};
 d.innerHTML=`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><b style="flex:1">📍 Go to device</b><button type="button" class="btn" id="wgX">✕</button></div><input id="wgF" type="search" placeholder="Search address, location, type" style="width:100%;margin-bottom:6px"><label style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><input type="checkbox" id="wgU" checked style="width:20px;height:20px;min-height:20px"> Untested only</label><div id="wgL" style="overflow:auto;max-height:60vh"></div><small style="color:#a2a2a2">Tip: you can also tap any pin on the plan to jump to it.</small>`;
 d.querySelector('#wgX').onclick=()=>d.close();d.querySelector('#wgF').oninput=e=>{f=e.target.value.trim().toLowerCase();draw_()};d.querySelector('#wgU').onchange=e=>{only=e.target.checked;draw_()};draw_();d.showModal()}

