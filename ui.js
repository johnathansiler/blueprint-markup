// bpm-v139: built from src/ui by tools/build.js. Do not edit here.
// ===== src/ui/00-helpers.js =====
// @shared-globals: small DOM helpers shared by every file in src/ui (bpm-v139). They are script-level constants, not window properties.
// by(id): element by id · ce(tag, className, html): new element · ceA(tag, props, html): new element with properties copied in
const by=id=>document.getElementById(id);
const ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const ceA=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e};
;
// ===== src/ui/10-field-ux.js =====
// @shared-globals: this file declares top-level names other files use, so tools/build.js joins it unwrapped.
// bpm-v86: field UX (compact walk, quick-place, bulk pass, pre-send check, export menu, detect ordering) + two-tech split/merge.
// Loaded after app.js; shares its globals (classic scripts).
(()=>{const ce=ceA;
const relayout=()=>{requestAnimationFrame(()=>{dispatchEvent(new Event('resize'))})};

// ---------- 1) compact walk mode ----------
const _start=startWalk,_exit=exitWalk;
startWalk=function(...a){if(plan&&!pins.length)return walkHint();const r=_start.apply(this,a);if(walk){document.body.classList.add('walking');relayout()}return r};
exitWalk=function(...a){document.body.classList.remove('walking');const r=_exit.apply(this,a);relayout();return r};
const _pick=walkPick;walkPick=async function(...a){if(plan&&!pins.length)return walkHint();return _pick.apply(this,a)};
function walkHint(){const w=$('#walk');w.hidden=false;w.innerHTML=`<div class="wh"><b>🚶 Walk</b><span class="sp"></span><button type="button" class="btn" id="wHx">✕</button></div><div class="wtx">This plan has no pins yet. Place pins with 📍, or let Detect find the devices on the plan.</div><div class="row"><button type="button" class="btn pri" id="wHdet">🔍 Detect devices</button></div>`;
 w.querySelector('#wHx').onclick=()=>{w.hidden=true};w.querySelector('#wHdet').onclick=()=>{w.hidden=true;$('#detBtn').click()}}
// bpm-v100: compact walk info: each fact once, date+time without the year, no tester name (still stored on the pin), capped scrollable area
const wDate=t=>{const d=new Date(t);return d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})};
function wInfo(p){const f=[];if(p.location)f.push(esc(p.location));if(p.page!==page)f.push('pg '+p.page);if(p.model)f.push(esc(p.model));
 if(p.status&&p.status!=='not tested')f.push(`<b class="wSt ${p.status==='passed'?'ok':p.status==='failed'?'bad':p.status==='corrected'?'fix':''}">${esc(p.status)}</b>${p.testedAt?' '+wDate(p.testedAt):''}`);if(p.notes)f.push('📝 '+esc(String(p.notes).slice(0,140)));
 return f.length?`<div class="wInfo">${f.join(' · ')}</div>`:''}
renderWalk=function(){const w=$('#walk');if(!walk){w.hidden=true;return}const S=walkSet(),N=S.length,done=S.filter(p=>!untested(p)).length,p=walk.p&&pins.find(x=>x.id===walk.p.id)||walk.p;
 /* bpm-v129: the ⋯ Types list shows only the device types this walk was started with (remembered on the first render of a new walk) */if(!walk.t0)walk.t0=walk.types?[...walk.types]:[...new Set(pins.map(x=>x.type))];const types=walk.t0.filter(t=>pins.some(x=>x.type===t)),nm=p?`${esc(TYPES[p.type]?.n||p.type)} ${p.address?esc(p.address):'<small>(no address)</small>'}`:'';
 const more=`<details class="wMore"><summary title="More">⋯</summary><div class="row"><select id="wType" title="Types: test only one of the types this walk started with" aria-label="Types"><option value="">Types</option>${types.map(t=>`<option value="${t}"${walk.type===t?' selected':''}>${esc(TYPES[t]?.n||t)}</option>`).join('')}</select>${SR?`<button type="button" class="btn" id="wMic" aria-pressed="${srec?'true':'false'}">${srec?'🎤 Voice on: tap to stop':'🎤 Voice off: tap to start'}</button>`:''}<button type="button" class="btn" id="wGoto">📍 Go to…</button>${p?'<button type="button" class="btn" id="wOpen">📋 Checklist</button>':''}</div></details>`;
 const head=`<div class="wh"><span class="wDot" style="background:${p?(TYPES[p.type]||TYPES.other).c:'#64748b'}"></span><span class="wName">${p?nm:`${done} of ${N} tested`}</span><small class="wCnt">${p?`${Math.min(done+1,N)}/${N}`:''}</small>${more}<button type="button" class="btn" id="wExit" title="Exit walk">✕ Exit</button></div>`;
 if(!p)w.innerHTML=head+`<div class="wtx">${walk.skip.size?`No untested devices left (${walk.skip.size} skipped).`:'All devices in this set are tested. 🎉'}</div><div class="row">${walk.hist?.length?'<button type="button" class="btn" id="wPrev">⏮ Back</button>':''}${walk.skip.size?'<button type="button" class="btn" id="wRe">Revisit skipped</button>':''}</div>`;
 else if(walk.fail){/* bpm-v111: after the reason is picked on the Fail wheel: compact card with an optional note, Skip / Save */walk.fr??=[];const R0=walk.fr[0]||'Other';
  w.innerHTML=`<div class="wfCard" role="group" aria-label="Fail note"><div class="wfH"><span class="wDot" style="background:${(TYPES[p.type]||TYPES.other).c}"></span><div class="wfT"><b>${nm}</b><small>✖ Fail · ${esc(R0)}</small></div></div>
  <input id="wfNote" class="wfN" type="text" placeholder="Note (optional)" aria-label="Note (optional)" value="${esc(walk.fnote||'')}" enterkeyhint="done">
  <div class="wfB2"><label class="wfCritL" title="Mark as a critical deficiency"><input type="checkbox" id="wCrit"${walk.fcrit?' checked':''}><span>⚠ Critical</span></label><button type="button" class="pB" id="wSkipN" title="Save the fail without a note" aria-label="Skip note"><i>⏭</i><small>Skip</small></button><button type="button" class="pB pri" id="wSave" title="Save the fail with this note" aria-label="Save"><i>✔</i><small>Save</small></button></div></div>`}
 else w.innerHTML=head+wInfo(p)+`<div id="wHeard" class="wHeard"${walk.heard?'':' hidden'}>🎤 “${esc(walk.heard||'')}”</div><div class="wb4"><button type="button" class="btn" id="wPrev"${walk.hist?.length?'':' disabled'}>⏮ Back</button><button type="button" class="btn ok" id="wPass" title="Pass = every checklist item passes">✔ Pass</button><button type="button" class="btn danger" id="wFail">✖ Fail</button><button type="button" class="btn" id="wSkip">⏭ Skip</button></div>`;
 w.hidden=false;const q=x=>w.querySelector(x);
 if(q('#wExit'))q('#wExit').onclick=()=>exitWalk();if(q('#wGoto'))q('#wGoto').onclick=walkGoto;if(q('#wType'))q('#wType').onchange=e=>{walk.type=e.target.value;walk.skip.clear();walkGo(nearestFrom(walkLeft(),walk.p))};if(q('#wMic'))q('#wMic').onclick=startVoice;
 if(q('#wRe'))q('#wRe').onclick=()=>{walk.skip.clear();walkGo(nearestFrom(walkLeft(),null))};
 if(q('#wPass'))q('#wPass').onclick=()=>testPin(p,'pass');if(q('#wFail'))q('#wFail').onclick=()=>walkFailCard(p);if(q('#wSkip'))q('#wSkip').onclick=()=>{walk.skip.add(p.id);walkNext()};
 if(q('#wOpen'))q('#wOpen').onclick=()=>openPin(pins.find(x=>x.id===p.id)||p);if(q('#wPrev'))q('#wPrev').onclick=walkPrev;if(q('#wFailX'))q('#wFailX').onclick=()=>{walk.fail=false;walk.fr=[];walk.fnote='';walk.fcrit=false;renderWalk()};
 const keep=()=>{if(q('#wfNote'))walk.fnote=q('#wfNote').value;if(q('#wCrit'))walk.fcrit=q('#wCrit').checked};
 w.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{keep();const r=b.dataset.r,i=walk.fr.indexOf(r);if(i>=0)walk.fr.splice(i,1);else walk.fr.push(r);renderWalk()});
 const saveF=withNote=>{keep();const R=[...walk.fr],c=walk.fcrit,n=withNote?walk.fnote:'';walk.fail=false;walk.fr=[];walk.fnote='';walk.fcrit=false;testPin(p,'fail',R[0]||'Other',c,R.slice(1),n)};
 if(q('#wSave'))q('#wSave').onclick=()=>saveF(true);if(q('#wSkipN'))q('#wSkipN').onclick=()=>saveF(false);if(q('#wfNote'))q('#wfNote').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();saveF(true)}}};
// bpm-v129: walk Fail opens the full pin card (checklist, fail reason, critical, codes, notes, photos) set to Failed, scrolled to the checklist. Save stores it and the walk moves on; Close without changes leaves the device untested.
window.walkFailCard=async function(p0){const p=pins.find(x=>x.id===p0.id)||p0;await openPin(p);if(!ckl.some(c=>c.v==='fail'))ckl=ckl.map(c=>({...c,v:c.v==='pass'?'':c.v}));/* Fail after Pass clears the auto-pass answers */
 form.elements.status.value='failed';failUI();renderChecks();try{dlg._wf=JSON.stringify(pinDraft().a)}catch{dlg._wf=null}
 const go=()=>{const k=dlg.querySelector('.ckbar'),t=dlg.querySelector('.pcTop');if(k)dlg.scrollTop=Math.max(0,k.offsetTop-(t?t.offsetHeight:0)-6)};requestAnimationFrame(()=>{go();setTimeout(go,120)})};
// bpm-v111: the fail reasons that apply to a device type = the reasons its own checklist items map to (same mapping testPin uses), in the usual order
window.failReasonsFor=t=>{let ck=[];try{ck=checkItems(t)||[]}catch{}const got=new Set(ck.map(c=>reasonFor(c.t||c)).filter(r=>r&&r!=='Other')),ord=REASONS.filter(r=>r!=='Other');const L=[...ord.filter(r=>got.has(r)),...[...got].filter(r=>!ord.includes(r))];return L.length?L:ord};

// ---------- 2) quick-place pins: Edit chip ----------
let chipT=0;window.quickChip=function(p){let c=$('#editChip');if(!c){c=ce('button',{id:'editChip',type:'button',className:'btn pri'});stage.append(c)}if(!p){c.hidden=true;return}
 const s=toS(p.x,p.y);c.textContent='✎ Edit';c.style.left=Math.max(4,Math.min(stage.clientWidth-80,s.x+14))+'px';c.style.top=Math.max(4,Math.min(stage.clientHeight-44,s.y-48))+'px';c.hidden=false;c.dataset.id=p.id;
 c.onclick=e=>{e.stopPropagation();c.hidden=true;const q=pins.find(x=>x.id===c.dataset.id);if(q)openPin(q)};clearTimeout(chipT);chipT=setTimeout(()=>c.hidden=true,8000);
 toast(`${TYPES[p.type]?.n||p.type} pin placed`,true)};
stage.addEventListener('pointerdown',e=>{const c=$('#editChip');if(c&&!c.hidden&&e.target!==c)setTimeout(()=>{if(tool!=='pin')c.hidden=true},0)},true);
addEventListener('wheel',()=>{const c=$('#editChip');if(c)c.hidden=true},{passive:true});

// ---------- 3) bulk pass on a box / multi selection ----------
const RES=['status','checks','reason','reasonText','severity','notes','testedAt','tester','codes'];
const _rsb=renderSelBar;renderSelBar=function(...a){_rsb.apply(this,a);const b=$('#selBar');if(b.hidden)return;const it=(tool==='select'?selItems():msel).filter(isPinO);if(!it.length)return;
 const x=ce('button',{type:'button',className:'btn ok',id:'bulkPass',title:'Pass every checklist item of the selected pins'},`✔ Pass selected (${it.length})`);x.onclick=()=>bulkPass(it);b.append(x)};
window.bulkPass=async function(list){const tn=await getTester(),now=Date.now(),L=[];for(const p0 of list){const p=pins.find(x=>x.id===p0.id);if(!p)continue;const b=structuredClone(p),a={...b,checks:(b.checks||checkItems(b.type)).map(c=>({...c,v:'pass'})),status:'passed',reason:'',reasonText:'',severity:'',testedAt:now,tester:tn};L.push({store:'pins',id:p.id,before:b,after:a})}
 if(!L.length)return;await changeMulti(L);msel=[];sel=null;renderSelBar();draw();toast(`Passed ${L.length} pin${L.length>1?'s':''}`,true);return L.length};

// ---------- 5) pre-send check before report / PDF / PNG export ----------
async function preIssues(scope){const D=scope==='project'?await projData():[{pl:plan,pins:pins.slice()}],out=[];
 for(const d of D)for(const p of d.pins){const nm=`${TYPES[p.type]?.n||p.type} ${p.address||'(no address)'}`+(D.length>1?` · ${d.pl.name||''} ${pgT(d.pl.id,p.page)}`:` · ${pgT(d.pl.id,p.page)}`);
  if(untested(p))out.push({k:'untested',t:`Untested: ${nm}`,pl:d.pl.id,p});
  else if(String(p.status).includes('fail')){if(!p.reason)out.push({k:'reason',t:`Fail without reason: ${nm}`,pl:d.pl.id,p});const md=await byIdx('media','pinId',p.id);if(!md.some(m=>(m.kind||'photo')!=='audio'))out.push({k:'photo',t:`Fail without photo: ${nm}`,pl:d.pl.id,p})}}
 const tn=tester===null?await get('meta','tester'):tester,j=project?await getJob():{};if(!(tn||j.techName))out.push({k:'tester',t:'Tester name is missing'});if(!(j.techLic||j.license))out.push({k:'lic',t:'Tester license # is missing'});return out}
window.preSend=async function(scope,label){const iss=await preIssues(scope);if(!iss.length)return true;let d=$('#preDlg');if(!d){d=ce('dialog',{id:'preDlg'});document.body.append(d)}
 const grp=k=>iss.filter(i=>i.k===k);const n=k=>grp(k).length;
 d.innerHTML=`<h3 style="margin:4px 0">Before you send: ${esc(label)}</h3><small style="color:#d4d4d4">${n('untested')} untested · ${n('reason')+n('photo')} fail issue(s) · ${n('tester')+n('lic')} tester issue(s)</small><ul id="preL">${iss.slice(0,200).map((i,x)=>`<li><span>${esc(i.t)}</span><button type="button" class="btn" data-go="${x}">Go to</button></li>`).join('')}</ul><div class="row"><button type="button" class="btn" id="preX">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="preGo">Export anyway</button></div>`;
 return new Promise(res=>{d.onclose=()=>res(false);/* bpm-v98: Escape/close resolves too (was a silent hang) */d.querySelector('#preX').onclick=()=>{d.close();res(false)};d.querySelector('#preGo').onclick=()=>{d.close();res(true)};
  d.querySelectorAll('[data-go]').forEach(b=>b.onclick=async()=>{const i=iss[+b.dataset.go];d.close();res(false);document.querySelectorAll('dialog[open]').forEach(x=>x.close());
   if(i.p){if(plan?.id!==i.pl)await openPlan(i.pl,i.p.page);else if(page!==i.p.page)await openPlan(i.pl,i.p.page);const q=pins.find(x=>x.id===i.p.id);if(q){centerOn(q.x,q.y,Math.max(view.s,1),stage.clientWidth/2,stage.clientHeight/2);draw();openPin(q)}}
   else if(i.k==='tester'&&!(project&&(await getJob()).techName))$('#jobBtn').click();else $('#jobBtn').click()});d.showModal()})};
const guard=(id,scope,label)=>{const b=$(id),o=b.onclick;if(!o)return;b.onclick=async e=>{if(await preSend(scope,label))return o.call(b,e)}};
guard('#reportPdf','project','Report PDF');guard('#defPdf','project','Deficiencies PDF');guard('#exPdf','plan','Plan PDF');guard('#exPng','plan','Plan PNG');

// ---------- export menu ----------
$('#exMenu').onclick=e=>{e.stopPropagation();$('#exPop').hidden=!$('#exPop').hidden};document.addEventListener('click',e=>{if(!e.target.closest('.exWrap'))$('#exPop').hidden=true});
['#exPng','#exPdf'].forEach(i=>$(i).addEventListener('click',()=>$('#exPop').hidden=true));

// ---------- detect: types found on this plan first ----------
const _det=$('#detBtn').onclick;$('#detBtn').onclick=async(...a)=>{const r=await _det.apply($('#detBtn'),a);try{orderDetTypes()}catch(e){}return r};
function orderDetTypes(){const found=new Set([...ghosts.filter(g=>g.planId===undefined||true).map(g=>g.g),...pins.map(p=>p.detG||p.g||p.type)]);const box=$('#detTypes');if(!box)return;
 const gs=[...box.querySelectorAll('.detGrp')];for(const g of gs){const ls=[...g.querySelectorAll('label')].filter(l=>l.querySelector('input[value]'));let any=0;for(const l of ls){const v=l.querySelector('input[value]').value;if(found.has(v)){any++;l.classList.add('found');if(!l.querySelector('.fnd'))l.append(ce('small',{className:'fnd'},' • on this plan'))}}
  ls.filter(l=>l.classList.contains('found')).reverse().forEach(l=>{const h=g.querySelector('.detGh');h?h.after(l):g.prepend(l)});g.dataset.found=any}
 gs.filter(g=>+g.dataset.found).reverse().forEach(g=>box.prepend(g))}
window.orderDetTypes=orderDetTypes;
})();
// bpm-v87: every icon-only button gets a compact visible label (from a map, else its title / aria-label)
(()=>{const MAP={'✋':'Pan','➤':'Select','▢':'Box','◯':'Circle','✔':'Check','☁':'Cloud','↗':'Arrow','╱':'Line','⟋':'Line','🧲':'Magnet','📐':'Snap','T':'Text','📏':'Measure','📍':'Pin','🗑':'Delete','↶':'Undo','↷':'Redo','⤢':'Fit','📷':'QR code','📄':'Sheet','🔍':'Detect','👁':'Layers','▤':'Pages','⟳':'Rotate','🎤':'Voice','✕':'Close','＋':'New','+':'New','✎':'Rename','💾':'Save','📥':'Import','🗂':'Project','📤':'Share','📂':'Open','◀':'Previous','▶':'Next','⋯':'More','⏮':'Back','⏭':'Skip','−':'Zoom out','-':'Zoom out'};
 const icon=s=>!/[A-Za-z]{2,}/.test(s);
 const lab=b=>{if(b.querySelector('.tl')||b.closest('#ptx')||b.classList.contains('pcEdge')||b.classList.contains('pcRsz'))return;/* v131: card resize grips show only a line */const t=(b.innerText||b.textContent).trim();if(t&&!icon(t))return;const k=[...t][0],tt=(b.title||b.getAttribute('aria-label')||'').replace(/\(.*?\)/g,'').trim();
  let l=MAP[t]||MAP[k]||'';if(b.id==='cSnap')l='Snap';if(!l&&tt)l=tt.split(/[:,.;–—/]/)[0].split(/\s+/).slice(0,2).join(' ');if(!l)return;if(l.length>8)l=l.split(' ')[0].slice(0,9);b.append(Object.assign(document.createElement('span'),{className:'tl',textContent:l}))};
 const run=r=>(r.querySelectorAll?r:document).querySelectorAll('button,label.btn').forEach(lab);
 run(document);new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1){if(n.tagName==="BUTTON")lab(n);else run(n)}else{const b=m.target.closest&&m.target.closest("button");if(b)lab(b)}}).observe(document.body,{childList:true,subtree:true});window.labelButtons=()=>run(document)})();

// docked full-width walk bar on wide screens: keep the side panel's last rows reachable above it
const _rw2=renderWalk;renderWalk=function(...a){const r=_rw2.apply(this,a);const w=$('#walk');document.documentElement.style.setProperty('--walkH',(w&&!w.hidden?w.offsetHeight:0)+'px');wBlink();return r};

// bpm-v101: walk blink. The CURRENT pin itself fades 1 → ~0.15 → 1 (~1 s; reduced motion: 1 → 0.55, ~2.4 s) so the print symbol shows through.
// It is drawn in the pin's own drawPin call on the overlay canvas (same transform as every pin); geometry untouched.
// While a pan/pinch is in flight the overlay carries a CSS transform relative to the last full draw, so blink frames are drawn in THAT frame (view=drawn) and stay glued to the symbol.
const RM=matchMedia('(prefers-reduced-motion: reduce)');let wbRaf=0,wbLast=0;
window.walkBlinkAlpha=()=>{if(!walk||!walk.p)return 1;const t=performance.now();return RM.matches?.775+.225*Math.cos(t/2400*2*Math.PI):.575+.425*Math.cos(t/1000*2*Math.PI)};
function wBlink(){if(wbRaf)return;const step=t=>{wbRaf=0;if(!walk||!walk.p||!plan){requestDraw(false);return}if(t-wbLast>=33){wbLast=t;if(walk.p.page===page){const keep=view;if(ov.style.transform&&drawn)view={...drawn};try{drawOverlay()}finally{view=keep}}}wbRaf=requestAnimationFrame(step)};wbRaf=requestAnimationFrame(step)}
const _sw2=startWalk;startWalk=function(...a){const r=_sw2.apply(this,a);wBlink();return r};
;
// ===== src/ui/11-pen-tool.js =====
try{
// bpm-v104: pen/curve tool (cubic Bezier), node editing for curves/polylines/lines (via the v103 Edit button), extra shapes,
// dashed/dotted line styles, and text styles (font, B/I/U/S, size, color, alignment, box) in the selection bar.
// Markups only: pins, Detect and pin geometry are never touched. Every change goes through change()/changeMulti(), so it undoes,
// redoes, persists to IndexedDB and is drawn by drawMarkup() in PNG/PDF exports.
(()=>{
const dist=(a,b,c,d)=>Math.hypot(a-c,b-d),ce=(t,cls)=>{const e=document.createElement(t);if(cls)e.className=cls;return e};
// ---------- node model ----------
// path markup: {type:'path', x1,y1,x2,y2 (bbox incl. control points), pp:[{x,y (rel x1,y1), ix,iy,ox,oy (handles rel anchor), k:'c'|'s'}], closed, arrow}
const nodeable=m=>!!m&&(m.type==='path'||m.type==='zig'||m.type==='zarrow'||m.type==='line'||m.type==='arrow');
function nodesOf(m){if(m.type==='path')return{N:m.pp.map(n=>({x:m.x1+n.x,y:m.y1+n.y,ix:n.ix||0,iy:n.iy||0,ox:n.ox||0,oy:n.oy||0,k:n.k||'c'})),closed:!!m.closed,arrow:!!m.arrow};
 if(m.type==='zig'||m.type==='zarrow')return{N:zPts(m).map(([x,y])=>({x,y,ix:0,iy:0,ox:0,oy:0,k:'c'})),closed:false,arrow:m.type==='zarrow'};
 return{N:[{x:m.x1,y:m.y1,ix:0,iy:0,ox:0,oy:0,k:'c'},{x:m.x2,y:m.y2,ix:0,iy:0,ox:0,oy:0,k:'c'}],closed:false,arrow:m.type==='arrow'}}
const curvy=N=>N.some(n=>n.ix||n.iy||n.ox||n.oy);
function writeNodes(m,N,closed,arrow){
 if(m.type!=='path'&&!closed&&!curvy(N)){if(N.length===2&&(m.type==='line'||m.type==='arrow')){m.type=arrow?'arrow':'line';m.x1=N[0].x;m.y1=N[0].y;m.x2=N[1].x;m.y2=N[1].y;return m}
  m.type=arrow?'zarrow':'zig';delete m.pp;delete m.closed;delete m.arrow;return zFinish(m,N.map(n=>[n.x,n.y]))}
 m.type='path';delete m.rp;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const n of N)for(const[x,y]of[[n.x,n.y],[n.x+n.ix,n.y+n.iy],[n.x+n.ox,n.y+n.oy]]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
 m.x1=x0;m.y1=y0;m.x2=x1;m.y2=y1;m.pp=N.map(n=>({x:n.x-x0,y:n.y-y0,ix:n.ix,iy:n.iy,ox:n.ox,oy:n.oy,k:n.k}));m.closed=!!closed;if(arrow)m.arrow=true;else delete m.arrow;return m}
function segs(N,closed){const S=[];for(let i=0;i<N.length-1+(closed?1:0);i++){const a=N[i],b=N[(i+1)%N.length];S.push([a.x,a.y,a.x+a.ox,a.y+a.oy,b.x+b.ix,b.y+b.iy,b.x,b.y,i])}return S}
function pathTo(c,N,closed){if(!N.length)return;c.moveTo(N[0].x,N[0].y);for(const s of segs(N,closed))c.bezierCurveTo(s[2],s[3],s[4],s[5],s[6],s[7]);if(closed)c.closePath()}
const bez=(s,t)=>{const u=1-t;return[u*u*u*s[0]+3*u*u*t*s[2]+3*u*t*t*s[4]+t*t*t*s[6],u*u*u*s[1]+3*u*u*t*s[3]+3*u*t*t*s[5]+t*t*t*s[7]]};
function nearSeg(N,closed,x,y,tol){let best=null;for(const s of segs(N,closed)){let p=[s[0],s[1]];for(let k=1;k<=24;k++){const q=bez(s,k/24),dx=q[0]-p[0],dy=q[1]-p[1],t=Math.max(0,Math.min(1,((x-p[0])*dx+(y-p[1])*dy)/((dx*dx+dy*dy)||1))),d=dist(p[0]+t*dx,p[1]+t*dy,x,y);if(d<tol&&(!best||d<best.d))best={d,i:s[8],t:(k-1+t)/24};p=q}}return best}
// split segment i at t (de Casteljau) so the curve keeps its exact shape
function splitAt(N,closed,i,t){const a=N[i],b=N[(i+1)%N.length],P0=[a.x,a.y],P1=[a.x+a.ox,a.y+a.oy],P2=[b.x+b.ix,b.y+b.iy],P3=[b.x,b.y],L=(p,q)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
 const A=L(P0,P1),B=L(P1,P2),C=L(P2,P3),D=L(A,B),E=L(B,C),M=L(D,E),cv=curvy([a,b]);
 const n={x:M[0],y:M[1],ix:cv?D[0]-M[0]:0,iy:cv?D[1]-M[1]:0,ox:cv?E[0]-M[0]:0,oy:cv?E[1]-M[1]:0,k:cv?'s':'c'};if(cv){a.ox=A[0]-a.x;a.oy=A[1]-a.y;b.ix=C[0]-b.x;b.iy=C[1]-b.y}
 N.splice(i+1,0,n);return i+1}
function smooth(N,closed,i){const n=N[i],L=N.length,p=N[(i-1+L)%L],q=N[(i+1)%L],hasP=closed||i>0,hasQ=closed||i<L-1;
 let dx,dy;if(hasP&&hasQ){dx=q.x-p.x;dy=q.y-p.y}else if(hasQ){dx=q.x-n.x;dy=q.y-n.y}else{dx=n.x-p.x;dy=n.y-p.y}const d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
 const li=hasP?dist(p.x,p.y,n.x,n.y)/3:0,lo=hasQ?dist(q.x,q.y,n.x,n.y)/3:0;n.ix=-ux*li;n.iy=-uy*li;n.ox=ux*lo;n.oy=uy*lo;n.k='s'}
window.PEN_API={nodesOf,writeNodes,splitAt,smooth,nearSeg};
// ---------- styles ----------
const LSK='bpm-ls';let LS=localStorage.getItem(LSK)||'solid';window.lineStyle=()=>LS;
const FONTS=[['sans','Sans','sans-serif'],['serif','Serif','Georgia,"Times New Roman",Times,serif'],['mono','Mono','ui-monospace,Menlo,Consolas,"Courier New",monospace'],['narrow','Narrow','"Arial Narrow","Roboto Condensed","Liberation Sans Narrow",sans-serif'],['hand','Hand','"Comic Sans MS","Chalkboard SE","Comic Neue",cursive']];
const FF=k=>(FONTS.find(f=>f[0]===k)||FONTS[0])[2];
const fontOf=m=>`${m.it?'italic ':''}${m.b===false?'':'bold '}${m.fs}px ${FF(m.ff)}`; // legacy text (no fields) = exactly the old 'bold Npx sans-serif'
const NOSTYLE=new Set(['text','dim','cal','darea','dpath','check']);
function dash(c,m){if(NOSTYLE.has(m.type))return;const ls=m.ls||(m===draft?(LS!=='solid'?LS:''):'');if(!ls)return;const lw=(m.w||3)/MK_S;c.setLineDash(ls==='dot'?[.01,lw*2.2]:[lw*3.2,lw*2.2])}
function shapePts(m){const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1),cx=x+w/2,cy=y+h/2,P=[];
 if(m.type==='tri')return[[cx,y],[x+w,y+h],[x,y+h]];
 if(m.type==='poly'){const n=m.n||6;for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n;P.push([cx+w/2*Math.cos(a),cy+h/2*Math.sin(a)])}return P}
 if(m.type==='star'){const n=m.n||5;for(let i=0;i<2*n;i++){const a=-Math.PI/2+i*Math.PI/n,r=i%2?.45:1;P.push([cx+w/2*r*Math.cos(a),cy+h/2*r*Math.sin(a)])}return P}return P}
const _dm=drawMarkup;
drawMarkup=function(c,m,s){
 if(m.type==='text')return drawText(c,m);
 c.save();dash(c,m);
 if(m.type==='path'||m.type==='rrect'||m.type==='arc'||m.type==='tri'||m.type==='poly'||m.type==='star'){c.globalAlpha=opOf(m,false);c.strokeStyle=m.color;c.lineWidth=(m.w||3)/MK_S;c.lineJoin=c.lineCap='round';
  const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);c.beginPath();
  if(m.type==='path'){const{N,closed}=nodesOf(m);pathTo(c,N,closed);c.stroke();if(m.arrow&&N.length>1){const b=N[N.length-1],a=N[N.length-2];let tx=b.ix?b.x+b.ix:a.x+a.ox,ty=b.iy?b.y+b.iy:a.y+a.oy;if(dist(tx,ty,b.x,b.y)<.01){tx=a.x;ty=a.y}const an=Math.atan2(b.y-ty,b.x-tx),L=Math.max(c.lineWidth*4,12/MK_S);c.setLineDash([]);c.beginPath();c.moveTo(b.x-L*Math.cos(an-.45),b.y-L*Math.sin(an-.45));c.lineTo(b.x,b.y);c.lineTo(b.x-L*Math.cos(an+.45),b.y-L*Math.sin(an+.45));c.stroke()}}
  else if(m.type==='rrect'){const r=Math.min(w,h)*.22;c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h);c.stroke()}
  else if(m.type==='arc'){c.ellipse(x+w/2,y+h,w/2||.1,h||.1,0,Math.PI,2*Math.PI);c.stroke()}
  else{const P=shapePts(m);c.lineJoin='miter';c.miterLimit=10;P.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.stroke()}
  c.restore();return}
 _dm(c,m,s);c.restore()};
function drawText(c,m){c.save();c.globalAlpha=opOf(m,false);c.font=fontOf(m);c.textBaseline='top';const L=String(m.text||'').split('\n'),lh=m.fs*1.15,W=Math.max(...L.map(t=>c.measureText(t).width),1),al=m.al||'left';
 if(m.box){const p=m.fs*.22;c.fillStyle='#fff';c.fillRect(m.x1-p,m.y1-p,W+2*p,L.length*lh+2*p-m.fs*.1);c.strokeStyle=m.color;c.lineWidth=Math.max(1,m.fs/14);c.strokeRect(m.x1-p,m.y1-p,W+2*p,L.length*lh+2*p-m.fs*.1)}
 L.forEach((t,i)=>{const tw=c.measureText(t).width,x=m.x1+(al==='center'?(W-tw)/2:al==='right'?W-tw:0),y=m.y1+i*lh;c.textAlign='left';
  if(!m.box){c.lineWidth=m.fs/5;c.strokeStyle='#fff';c.lineJoin='round';c.strokeText(t,x,y)}c.fillStyle=m.color;c.fillText(t,x,y);
  const th=Math.max(1,m.fs/14);if(m.u)c.fillRect(x,y+m.fs*.98,tw,th);if(m.st)c.fillRect(x,y+m.fs*.52,tw,th)});c.restore()}
const _tb=textBox;textBox=function(m){octx.save();octx.font=fontOf(m);const L=String(m.text||'').split('\n'),w=Math.max(...L.map(t=>octx.measureText(t).width),0);octx.restore();m.x2=m.x1+w;m.y2=m.y1+m.fs*1.15*L.length;return m};
const _tp=tedPos;tedPos=function(){_tp();if(!ted)return;const m=ted.m,e=ted.el;Object.assign(e.style,{fontFamily:FF(m.ff),fontWeight:m.b===false?'normal':'bold',fontStyle:m.it?'italic':'normal',textDecoration:[m.u?'underline':'',m.st?'line-through':''].join(' ').trim()||'none',textAlign:m.al||'left'})};
// new markups pick up the current line style
const _ch=change;change=async function(s,b,a,me){if(s==='markups'&&!b&&a&&!a.ls&&LS!=='solid'&&!NOSTYLE.has(a.type))a.ls=LS;return _ch.call(this,s,b,a,me)};
// path hit test follows the curve (closed paths also by their inside); other types unchanged
const HC=document.createElement('canvas').getContext('2d');
function onPath(m,w){const tol=10/view.s;const{N,closed}=nodesOf(m),P=new Path2D();pathTo(P,N,closed);HC.setTransform(1,0,0,1,0,0);HC.lineWidth=Math.max(tol*2.8,(m.w||3)/MK_S+tol);return HC.isPointInStroke(P,w.x,w.y)||(closed&&HC.isPointInPath(P,w.x,w.y))}
const _hit=hit;hit=function(w){const r=_hit(w);if(r&&r.kind==='m'&&r.o.type==='path'&&!onPath(r.o,w)){const o=r.o,pg=o.page;o.page=-1;try{return hit(w)}finally{o.page=pg}}return r};
const _hd=handles;handles=function(m){return nodeable(m)&&edOn(m)?[]:m.type==='path'?[]:_hd(m)};
// ---------- shared pointer plumbing ----------
const ST=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
const P2=new Map();let G=null,pinch=null;
const R=()=>matchMedia('(pointer:coarse)').matches?24:16; // touch targets ≥24 px radius on phone/Fold
// ---------- pen tool + point editing (bpm-v105: Illustrator-like) ----------
// While drawing: every anchor and handle of the in-progress path is shown and can be dragged (a tap on one never adds a point).
// Finishing (Done, double-tap, tap the first point) goes straight into point editing. One labeled pen tools bar serves both.
let PD=null;   // in-progress path {N:[], sel, last:{t,x,y,i}, hover}
let PM='add';  // pen-mode bar mode: 'add' (tap adds / inserts on the line) | 'sel' (direct select only) | 'del' | 'move'
let NE={id:null,i:-1,mode:'sel',brk:false}; // point editing: selected node + mode ('sel' | 'add' | 'del' | 'move')
const edItem=()=>tool==='select'&&sel?.kind==='m'&&nodeable(sel.o)&&edOn(sel.o)?sel.o:null;
const isSm=n=>!!n&&(n.k==='s'||!!(n.ix||n.iy||n.ox||n.oy));
const allH=N=>{const o=[];N.forEach((n,i)=>{for(const h of['i','o'])if(n[h+'x']||n[h+'y'])o.push([i,h])});return o};
function nodeHit(N,closed,sx,sy,seg){const r=R();let best=null,bd=1e9;const tryP=(x,y,h)=>{const q=toS(x,y),d=Math.hypot(q.x-sx,q.y-sy);if(d<r&&d<bd){bd=d;best=h}};
 N.forEach((n,i)=>tryP(n.x,n.y,{kind:'a',i}));for(const[i,h]of allH(N)){const n=N[i];tryP(n.x+n[h+'x'],n.y+n[h+'y'],{kind:'h',i,h})}if(best)return best;
 if(seg){const w=toW(sx,sy),s=nearSeg(N,closed,w.x,w.y,r/view.s);if(s)return{kind:'s',i:s.i,t:s.t}}return null}
function dragNode(N,h,w,brk){if(h.kind==='a'){const n=N[h.i];n.x=w.x;n.y=w.y;return}const n=N[h.i],o=h.h==='i'?'o':'i';n[h.h+'x']=w.x-n.x;n[h.h+'y']=w.y-n.y;
 if(n.k==='s'&&!brk){const L=Math.hypot(n[o+'x'],n[o+'y'])||Math.hypot(n[h.h+'x'],n[h.h+'y']),d=Math.hypot(n[h.h+'x'],n[h.h+'y'])||1;n[o+'x']=-n[h.h+'x']/d*L;n[o+'y']=-n[h.h+'y']/d*L}else n.k='c'}
function convert(N,closed,i){if(isSm(N[i])){const n=N[i];n.ix=n.iy=n.ox=n.oy=0;n.k='c'}else smooth(N,closed,i)}
// ---- the pen tools bar ----
function penBar(){let b=$('#penBar');if(!b){b=ce('div');b.id='penBar';b.setAttribute('role','toolbar');b.setAttribute('aria-label','Pen tools');stage.append(b)}
 const m=edItem(),pen=tool==='pen'&&!!plan;if(!pen&&!m){b.hidden=true;b.innerHTML='';toastLift();return}b.hidden=false;
 let N=[],closed=false,i=-1,mode;if(pen){N=PD?.N||[];i=PD?.sel??-1;mode=PM}else{({N,closed}=nodesOf(m));i=NE.id===m.id?NE.i:-1;mode=NE.mode}
 const n=N.length,on=k=>mode===k?' on':'',B=(id,ic,l,t,x='')=>`<button type="button" class="btn pbB${x}" id="${id}" title="${t}"><span class="pbI">${ic}</span><span class="pbL">${l}</span></button>`;
 const hint=pen?(mode==='sel'?'Tap a point to select it, drag points or handles':mode==='del'?'Tap a point to delete it':mode==='move'?'Drag to move the whole path':!n?'Tap for a corner, drag for a curve':n<2?'Tap the next point · drag for handles':'Tap the first point to close · double-tap or Done to finish')
  :(mode==='del'?'Tap a point to delete it':mode==='move'?'Drag to move the shape':mode==='add'?'Tap the line to add a point':i<0?'Tap a point · drag points or handles · tap the line to add':'Point '+(i+1)+' of '+n);
 b.classList.toggle('ne',!pen);
 b.innerHTML=`<span class="pbH">${hint}</span>`+B('pbOk','✓','Done',pen?'Finish the path and edit its points':'Finish editing points',' pri'+(pen&&n<2?' dis':''))+B('pbSel','↖','Select point','Direct select: tap or drag points and handles, never adds',on('sel'))+B('pbAdd','＋','Add point',pen?'Tap to add points (tap on the line inserts one)':'Tap the line to add a point',on('add'))
  +B('neDel','－','Delete point',i>=0?'Delete the selected point':'Then tap the point to delete',on('del')+(n<=2&&!pen?' dis':''))+B('neSm','⇄',isSm(N[i])?'Convert: sharp':'Convert: smooth','Convert the selected point between smooth (curve handles) and sharp (corner)',i<0?' dis':'')
  +B('neBrk','⟂','Break handles','Move one curve handle without the other (same as holding Alt)',NE.brk?' on':'')+(!pen&&(n>2||closed)?B('neCl',closed?'⊂':'○',closed?'Open path':'Close path',closed?'Open the path':'Close the path'):'')
  +B('pbMove','✥','Move shape','Drag anywhere to move the whole path',on('move'))+(pen?B('pbUndo','↶','Undo point','Remove the last point',n?'':' dis')+B('pbX','✕','Cancel','Discard this path',n?'':' dis'):'')
;
 b.querySelectorAll('.dis').forEach(x=>x.disabled=true);
 const setMode=k=>{if(pen)PM=PM===k&&k!=='add'?'add':k;else NE.mode=NE.mode===k&&k!=='sel'?'sel':k;penBar();requestDraw(false)};
 b.querySelector('#pbSel').onclick=()=>setMode('sel');b.querySelector('#pbAdd').onclick=()=>setMode('add');b.querySelector('#pbMove').onclick=()=>setMode('move');
 b.querySelector('#neBrk').onclick=()=>{NE.brk=!NE.brk;penBar()};
 b.querySelector('#neDel').onclick=()=>{if(i>=0)return pen?penOp('del'):neOp('del');setMode('del')};
 b.querySelector('#neSm').onclick=()=>pen?penOp('smooth'):neOp('smooth');
 if(b.querySelector('#neCl'))b.querySelector('#neCl').onclick=()=>neOp('close');
 if(pen){b.querySelector('#pbUndo').onclick=()=>{PD?.N.pop();if(PD)PD.sel=-1;if(!PD?.N.length)PD=null;penBar();requestDraw(false)};b.querySelector('#pbX').onclick=()=>{PD=null;PM='add';penBar();requestDraw(false)};b.querySelector('#pbOk').onclick=()=>penDone(false)}
 else b.querySelector('#pbOk').onclick=()=>{NE.mode='sel';setEdit(null);toast('Points saved')};
 // sit just above the selection bar when it is showing
 const sb=$('#selBar');if(sb&&!sb.hidden){const S=stage.getBoundingClientRect(),Q=sb.getBoundingClientRect();b.style.bottom=Math.max(8,S.bottom-Q.top+6)+'px'}else b.style.bottom='';/* v113: selBar already rides above the phone Pages strip, so this stays above both */
 toastLift();const a=b.querySelector('.on');if(a&&b.scrollWidth>b.clientWidth&&(a.offsetLeft<b.scrollLeft||a.offsetLeft+a.offsetWidth>b.scrollLeft+b.clientWidth))b.scrollLeft=Math.max(0,a.offsetLeft-40)}
window.penBar=penBar;
// keep toasts above the floating tool bars so they never cover a button
function toastLift(){const t=$('#toast');if(!t)return;const S=stage.getBoundingClientRect();let top=null;for(const id of['#penBar','#shpChip','#fhBar']){const e=$(id);if(e&&!e.hidden){const r=e.getBoundingClientRect();if(r.height)top=Math.min(top??1e9,r.top)}}
 /* bpm-v140: also clear the Detect suggestions bar (a long notice used to cover Review, By type, Check and Reject all); not in a walk, where the notice sits at the top */
 const g=$('#ghBar');if(g&&!g.hidden&&!t.hidden&&!walk){const r=g.getBoundingClientRect(),q=t.getBoundingClientRect();if(r.height&&r.left<q.right&&q.left<r.right)top=Math.min(top??1e9,r.top)}
 t.style.bottom=top!=null?Math.round(S.bottom-top+6)+'px':''}window.toastLift=toastLift;
{const _t=toast;toast=function(...a){const r=_t.apply(this,a);try{toastLift()}catch(e){}return r};const _g=renderGhostBar;renderGhostBar=function(...a){const r=_g.apply(this,a);try{toastLift()}catch(e){}return r}}
function penOp(op){if(!PD)return;const N=PD.N,i=PD.sel??-1;if(op==='del'){if(i<0)return;N.splice(i,1);PD.sel=-1;if(!N.length)PD=null}else if(op==='smooth'){if(i<0)return;convert(N,false,i)}penBar();requestDraw(false)}
async function penDone(closed){const P=PD;PD=null;PM='add';if(!P||P.N.length<2){penBar();requestDraw(false);return}
 const m={id:uid(),planId:plan.id,page,type:'path',color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};writeNodes(m,P.N,closed,false);m.type='path';await change('markups',null,m);
 enterPoints(m.id);toast(closed?'Closed curve added · edit its points':'Curve added · edit its points')}
function enterPoints(id){const sb=document.querySelector('[data-t=select]');if(tool!=='select'&&sb)sb.click();tool='select';const o=markups.find(x=>x.id===id);if(!o)return;sel={kind:'m',o};msel=[];NE={id,i:-1,mode:'sel',brk:false};setEdit(id);penBar();requestDraw(false)}
window.penDone=penDone;window.penState=()=>PD&&structuredClone(PD);window.enterPoints=enterPoints;
document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{if(PD&&b.dataset.t!=='pen')penDone(false);if(b.dataset.t!=='pen')PM='add';setTimeout(()=>{penBar();renderSelBar()},0)}));
addEventListener('keydown',e=>{if(tool!=='pen'||!PD||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;if(e.key==='Enter'){e.preventDefault();penDone(false)}else if(e.key==='Escape'){PD=null;penBar();requestDraw(false)}else if(e.key==='Backspace'){e.preventDefault();PD.N.pop();PD.sel=-1;if(!PD.N.length)PD=null;penBar();requestDraw(false)}});
// ---- point-edit operations on a saved path / polyline / line ----
async function neCommit(m,before,msg){await change('markups',before,m);const o=markups.find(x=>x.id===m.id);if(o&&sel?.o?.id===o.id)sel.o=o;renderSelBar();requestDraw(false);if(msg)toast(msg)}
window.neSelect=i=>{const m=edItem();if(m){NE={...NE,id:m.id,i};renderSelBar();requestDraw(false)}};window.neState=()=>({...NE});
const setM=(m,o)=>{for(const k of['rp','pp','closed','arrow','n'])if(!(k in o))delete m[k];Object.assign(m,o)};
async function neOp(op,at){const m=edItem();if(!m)return;const b=structuredClone(m),o=structuredClone(m),{N,closed,arrow}=nodesOf(o);let i=at??(NE.id===m.id?NE.i:-1),cl=closed;
 if(op==='del'){if(i<0||N.length<=2)return;N.splice(i,1);NE.i=Math.min(i,N.length-1);if(at!=null)NE.i=-1}
 else if(op==='smooth'){if(i<0)return;convert(N,cl,i)}
 else if(op==='close'){if(N.length<3&&!cl)return;cl=!cl}
 writeNodes(o,N,cl,arrow);setM(m,o);await neCommit(m,b,{del:'Point deleted',smooth:isSm(N[i])?'Smooth point':'Sharp point',close:cl?'Path closed':'Path opened'}[op])}
window.neOp=neOp;
// ---------- pointer handling (capture phase, ahead of app.js) ----------
function startPinch(){const[a,b]=[...P2.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}}}
const eat=e=>{e.stopImmediatePropagation();e.preventDefault()};
const onCv=e=>e.target===cv||e.target===ov;window.__onCv=onCv;
stage.addEventListener('pointerdown',e=>{if(e.button>0||!onCv(e))return;if(e.isPrimary&&P2.size){P2.clear();pinch=null;G=null}const m=edItem(),pen=tool==='pen'&&plan;if(!pen&&!m&&!P2.size)return;
 if(P2.size){P2.set(e.pointerId,ST(e));if(P2.size===2){if(G?.added&&PD){PD.N.pop();if(!PD.N.length)PD=null}if(G?.ne&&G.moved){const mm=edItem();if(mm)setM(mm,structuredClone(G.b))}G=null;startPinch()}eat(e);return}
 const s=ST(e),w=toW(s.x,s.y);
 if(pen){P2.set(e.pointerId,s);stage.setPointerCapture?.(e.pointerId);eat(e);const N=PD?.N||[];
  if(PM==='move'){if(N.length)G={pen:1,move:1,sx:s.x,sy:s.y,N0:structuredClone(N)};return}
  const h=N.length?nodeHit(N,false,s.x,s.y,PM==='add'):null;
  if(h&&h.kind!=='s'){G={pen:1,pick:h,sx:s.x,sy:s.y,N0:structuredClone(N),alt:e.altKey};return}
  if(h&&h.kind==='s'){G={pen:1,seg:h,sx:s.x,sy:s.y};return}
  if(PM!=='add'){G={pen:1,none:1,sx:s.x,sy:s.y};return}
  PD??={N:[],sel:-1};PD.N.push({x:w.x,y:w.y,ix:0,iy:0,ox:0,oy:0,k:'c'});PD.sel=-1;G={pen:1,added:1,sx:s.x,sy:s.y,i:PD.N.length-1};PD.last={t:performance.now(),x:s.x,y:s.y,i:PD.N.length-1};penBar();requestDraw(false);return}
 const{N,closed}=nodesOf(m);
 if(NE.mode==='move'){P2.set(e.pointerId,s);eat(e);G={ne:1,h:{kind:'s'},sx:s.x,sy:s.y,b:structuredClone(m),N,closed,moved:0};return}
 const h=nodeHit(N,closed,s.x,s.y,true);if(!h)return;P2.set(e.pointerId,s);eat(e);
 G={ne:1,h,sx:s.x,sy:s.y,b:structuredClone(m),N,closed,alt:e.altKey,moved:0};if(h.kind==='a'&&NE.mode!=='del'){NE={...NE,id:m.id,i:h.i};renderSelBar()}requestDraw(false)},true);
stage.addEventListener('pointermove',e=>{if(!P2.has(e.pointerId)){if(tool==='pen'&&PD&&e.pointerType==='mouse'){PD.hover=toW(ST(e).x,ST(e).y);requestDraw(false)}return}const s=ST(e);P2.set(e.pointerId,s);e.stopImmediatePropagation();
 if(pinch&&P2.size>=2){const[a,b]=[...P2.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=pinch,sc=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s:sc,x:c.x-wx*sc,y:c.y-wy*sc};fastView();return}
 if(!G)return;if(Math.hypot(s.x-G.sx,s.y-G.sy)>(e.pointerType==='mouse'?4:7))G.moved=1;if(!G.moved)return;const w=toW(s.x,s.y);
 if(G.pen){if(G.added){const n=PD.N[G.i];n.ox=w.x-n.x;n.oy=w.y-n.y;n.ix=-n.ox;n.iy=-n.oy;n.k='s'}
  else if(G.pick&&PD){const N=structuredClone(G.N0);dragNode(N,G.pick,w,G.alt||e.altKey||NE.brk);PD.N=N;PD.sel=G.pick.i}
  else if(G.move&&PD){const a=toW(G.sx,G.sy);PD.N=G.N0.map(n=>({...n,x:n.x+w.x-a.x,y:n.y+w.y-a.y}))}
  requestDraw(false);return}
 if(G.ne){const m=edItem();if(!m)return;const N=structuredClone(G.N),h=G.h;
  if(h.kind==='s'){const a=toW(G.sx,G.sy);for(const n of N){n.x+=w.x-a.x;n.y+=w.y-a.y}}else dragNode(N,h,w,G.alt||e.altKey||NE.brk);
  const o=structuredClone(G.b);writeNodes(o,N,G.closed,nodesOf(G.b).arrow);setM(m,o);requestDraw(false)}},true);
const up=async e=>{if(!P2.has(e.pointerId))return;P2.delete(e.pointerId);e.stopImmediatePropagation();if(pinch){if(P2.size<2)pinch=null;if(!P2.size)G=null;return}
 const g=G;G=null;if(!g)return;
 if(g.pen){const now=performance.now();
  if(g.pick&&!g.moved&&PD){const i=g.pick.i,N=PD.N,lt=PD.last;
   if(PM==='del'&&g.pick.kind==='a'){N.splice(i,1);PD.sel=-1;if(!N.length)PD=null}
   else if(g.pick.kind==='a'&&i===0&&N.length>=2&&PM==='add')return penDone(true);
   else if(g.pick.kind==='a'&&i===N.length-1&&lt&&now-lt.t<400&&PM==='add'&&N.length>=2)return penDone(false);
   else PD.sel=g.pick.kind==='a'?i:g.pick.i;
   if(PD)PD.last={t:now,x:g.sx,y:g.sy,i}}
  else if(g.seg&&!g.moved&&PD){PD.sel=splitAt(PD.N,false,g.seg.i,g.seg.t);PD.last={t:0}}
  else if(g.none&&!g.moved&&PD)PD.sel=-1;
  penBar();requestDraw(false);return}
 if(g.ne){const m=edItem();if(!m)return;
  if(!g.moved){if(NE.mode==='del'&&g.h.kind==='a'){NE.mode='sel';return neOp('del',g.h.i)}
   if(g.h.kind==='s'&&NE.mode!=='move'){const b=structuredClone(m),o=structuredClone(m),{N,closed,arrow}=nodesOf(o);const ni=splitAt(N,closed,g.h.i,g.h.t);writeNodes(o,N,closed,arrow);setM(m,o);NE={...NE,id:m.id,i:ni};await neCommit(m,b,'Point added')}
   else{renderSelBar();requestDraw(false)}return}
  await neCommit(m,g.b)}};
stage.addEventListener('pointerup',up,true);stage.addEventListener('pointercancel',up,true);
// ---------- overlay: in-progress path + point editor (all anchors and handles visible) ----------
const _do0=drawOverlay0;drawOverlay0=function(){_do0();const c=octx;if(!plan||!pageW)return;c.save();setT(c);const s=view.s,coarse=R()>16,r=(coarse?7:5)/s;
 const knob=(x,y,sq,on,first)=>{c.beginPath();if(sq)c.rect(x-r,y-r,2*r,2*r);else c.arc(x,y,r*.85,0,7);c.fillStyle=on?'#2563eb':first?'#bfdbfe':'#fff';c.fill();c.lineWidth=1.8/s;c.strokeStyle='#2563eb';c.stroke()};
 const hdl=n=>{for(const h of['i','o']){if(!(n[h+'x']||n[h+'y']))continue;const x=n.x+n[h+'x'],y=n.y+n[h+'y'];c.beginPath();c.moveTo(n.x,n.y);c.lineTo(x,y);c.lineWidth=1.3/s;c.strokeStyle='#2563eb';c.setLineDash([]);c.stroke();knob(x,y,false,false)}};
 if(tool==='pen'&&PD&&PD.N.length){const N=PD.N;c.globalAlpha=1;c.strokeStyle=$('#color').value;c.lineWidth=(SZ[$('#size').value]||3)/MK_S;c.lineCap=c.lineJoin='round';c.beginPath();pathTo(c,N,false);c.stroke();
  if(PD.hover&&!G&&PM==='add'){const l=N[N.length-1];c.setLineDash([4/s,3/s]);c.lineWidth=1/s;c.strokeStyle='#2563eb';c.beginPath();c.moveTo(l.x,l.y);c.bezierCurveTo(l.x+l.ox,l.y+l.oy,PD.hover.x,PD.hover.y,PD.hover.x,PD.hover.y);c.stroke();c.setLineDash([])}
  N.forEach(hdl);N.forEach((n,i)=>knob(n.x,n.y,true,i===PD.sel,i===0&&N.length>1))}
 const m=edItem();if(m&&m.page===page){const{N,closed}=nodesOf(m);if(NE.id!==m.id)NE={id:m.id,i:-1,mode:'sel',brk:NE.brk};
  c.setLineDash([]);c.globalAlpha=.45;c.lineWidth=1/s;c.strokeStyle='#60a5fa';c.beginPath();pathTo(c,N,closed);c.stroke();c.globalAlpha=1;
  N.forEach(hdl);N.forEach((n,i)=>knob(n.x,n.y,true,i===NE.i))}
 c.restore()};
// ---------- shapes -> editable points ----------
const SHP=new Set(['rect','rrect','ellipse','tri','poly','star','arc','cloud']);
function shapeNodes(m){const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1),K=.5523,nd=(px,py,ix=0,iy=0,ox=0,oy=0,k='c')=>({x:px,y:py,ix,iy,ox,oy,k});
 if(m.type==='rect')return{N:[nd(x,y),nd(x+w,y),nd(x+w,y+h),nd(x,y+h)],closed:true};
 if(m.type==='ellipse'){const a=w/2,b=h/2,cx=x+a,cy=y+b;return{N:[nd(cx,y,-a*K,0,a*K,0,'s'),nd(x+w,cy,0,-b*K,0,b*K,'s'),nd(cx,y+h,a*K,0,-a*K,0,'s'),nd(x,cy,0,b*K,0,-b*K,'s')],closed:true}}
 if(m.type==='arc'){const a=w/2,cx=x+a;return{N:[nd(x,y+h,0,0,0,-h*K),nd(cx,y,-a*K,0,a*K,0,'s'),nd(x+w,y+h,0,-h*K,0,0)],closed:false}}
 if(m.type==='rrect'){const r=Math.min(w,h)*.22,k=r*K;return{N:[nd(x+r,y,0,0,0,0),nd(x+w-r,y,0,0,k,0),nd(x+w,y+r,0,-k,0,0),nd(x+w,y+h-r,0,0,0,k),nd(x+w-r,y+h,k,0,0,0),nd(x+r,y+h,0,0,-k,0),nd(x,y+h-r,0,k,0,0),nd(x,y+r,0,0,0,-k)].map((n,i,A)=>i===0?{...n,ix:-k}:n),closed:true}}
 if(m.type==='cloud'){const s=view.s,r=Math.max(6/s,Math.min(w,h)/8,1),P=[],seg=(ax,ay,bx,by)=>{const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.round(L/(2*r)));for(let i=0;i<n;i++)P.push([ax+(bx-ax)*i/n,ay+(by-ay)*i/n])};
  seg(x,y,x+w,y);seg(x+w,y,x+w,y+h);seg(x+w,y+h,x,y+h);seg(x,y+h,x,y);const N=P.map(([px,py])=>nd(px,py));
  for(let i=0;i<N.length;i++){const a=N[i],b=N[(i+1)%N.length],L=Math.hypot(b.x-a.x,b.y-a.y),ang=Math.atan2(b.y-a.y,b.x-a.x),q=L/2*4/3,nx=Math.sin(ang)*q,ny=-Math.cos(ang)*q;a.ox=nx;a.oy=ny;b.ix=nx;b.iy=ny}return{N,closed:true}}
 return{N:shapePts(m).map(([px,py])=>nd(px,py)),closed:true}}
async function toPoints(id){const m=markups.find(x=>x.id===id);if(!m||!SHP.has(m.type))return;const b=structuredClone(m),o=structuredClone(m),{N,closed}=shapeNodes(m);delete o.n;writeNodes(o,N,closed,false);o.type='path';
 await change('markups',b,o);enterPoints(id);toast('Shape converted to points · drag points or handles')}
window.toPoints=toPoints;
// right after drawing a shape: offer Edit points / Resize
function shapeChip(id){let c=$('#shpChip');if(!c){c=ce('div');c.id='shpChip';stage.append(c)}clearTimeout(c._t);
 c.innerHTML=`<span class="pbH">Shape added</span><button type="button" class="btn pbB" id="scPts"><span class="pbI">◇</span><span class="pbL">Edit points</span></button><button type="button" class="btn pbB" id="scRs"><span class="pbI">⤡</span><span class="pbL">Resize</span></button><button type="button" class="btn pbB" id="scX" title="Close"><span class="pbI">✕</span><span class="pbL">Close</span></button>`;c.hidden=false;
 c.querySelector('#scPts').onclick=()=>{c.hidden=true;toPoints(id)};c.querySelector('#scRs').onclick=()=>{c.hidden=true;const sb=document.querySelector('[data-t=select]');if(sb)sb.click();const o=markups.find(x=>x.id===id);if(!o)return;sel={kind:'m',o};msel=[];setEdit(id)};c.querySelector('#scX').onclick=()=>{c.hidden=true;toastLift()};c._t=setTimeout(()=>{c.hidden=true;toastLift()},9000);toastLift()}
window.shapeChip=shapeChip;
{const _c2=change;change=async function(s,b,a,me){const r=await _c2.call(this,s,b,a,me);if(s==='markups'&&!b&&a&&SHP.has(a.type)&&tool===a.type)shapeChip(a.id);return r}}
stage.addEventListener('pointerdown',e=>{const c=$('#shpChip');if(c&&!c.hidden&&!c.contains(e.target))c.hidden=true},true);
// ---------- selection bar: node tools + text styles ----------
const _rsb=renderSelBar;renderSelBar=function(...a){_rsb.apply(this,a);setTimeout(penBar,0);const b=$('#selBar');if(!b||b.hidden)return;
 const one=tool==='select'&&selItems().length===1?selItems()[0]:null;if(one&&one.planId&&SHP.has(one.type)){const x=ce('button','btn');x.type='button';x.id='mkPts';x.title='Convert this shape to a path so its points can be edited';x.textContent='◇ Edit points';x.onclick=()=>toPoints(one.id);b.append(x)}
 const T=(tool==='select'?selItems():msel).filter(o=>o.type==='text');if(T.length)b.append(textBar(T))};
function textBar(T){const f=T[0],g=ce('span','sbGrp sbTxt');const tg=(k,l,t,st)=>`<button type="button" class="btn sbT${T.every(o=>k==='b'?o.b!==false:o[k])?' on':''}" data-tk="${k}" title="${t}" aria-pressed="${T.every(o=>k==='b'?o.b!==false:o[k])}" style="${st}">${l}</button>`;
 const fs=Math.round(f.fs),SZS=[...new Set([6,8,10,12,14,18,24,32,48,64,96,128,fs])].sort((a,b)=>a-b);
 g.innerHTML=`<i class="sbSep"></i><small class="sbHint">Text${T.length>1?' ×'+T.length:''}</small><label class="sbL">Font <select id="txFont">${FONTS.map(([k,l,c])=>`<option value="${k}"${(f.ff||'sans')===k?' selected':''} style="font-family:${c.replace(/"/g,"'")}">${l}</option>`).join('')}</select></label>`
  +tg('b','B','Bold','font-weight:800')+tg('it','I','Italic','font-style:italic;font-family:serif')+tg('u','U','Underline','text-decoration:underline')+tg('st','S','Strike','text-decoration:line-through')
  +`<label class="sbL">Size <select id="txSize">${SZS.map(v=>`<option value="${v}"${v===fs?' selected':''}>${v}</option>`).join('')}</select></label><label class="sbL sbCol" title="Text color">Color <input type="color" id="txCol" value="${/^#[0-9a-f]{6}$/i.test(f.color)?f.color:'#e11d48'}"></label>`
  +['left','center','right'].map((a,i)=>`<button type="button" class="btn sbT${(f.al||'left')===a?' on':''}" data-al="${a}" title="Align ${a}">${['⇤ Left','↔ Center','⇥ Right'][i]}</button>`).join('')
  +`<button type="button" class="btn sbT${T.every(o=>o.box)?' on':''}" data-tk="box" title="White background with a frame">▭ Box</button>`;
 const apply=async fn=>{const L=[];for(const o0 of T){const o=markups.find(x=>x.id===o0.id);if(!o)continue;const b=structuredClone(o),a=structuredClone(o);fn(a);textBox(a);L.push({store:'markups',id:o.id,before:b,after:a})}if(!L.length)return;await changeMulti(L);const ids=new Set(L.map(x=>x.id));msel=msel.map(o=>ids.has(o.id)?markups.find(x=>x.id===o.id)||o:o);if(sel?.o&&ids.has(sel.o.id))sel.o=markups.find(x=>x.id===sel.o.id)||sel.o;renderSelBar();requestDraw(false)};
 g.querySelector('#txFont').onchange=e=>apply(a=>{if(e.target.value==='sans')delete a.ff;else a.ff=e.target.value});
 g.querySelector('#txSize').onchange=e=>apply(a=>{a.fs=+e.target.value});g.querySelector('#txCol').onchange=e=>apply(a=>{a.color=e.target.value});
 g.querySelectorAll('[data-tk]').forEach(x=>x.onclick=()=>{const k=x.dataset.tk,on=!x.classList.contains('on');apply(a=>{if(k==='b'){if(on)delete a.b;else a.b=false}else if(on)a[k]=true;else delete a[k]})});
 g.querySelectorAll('[data-al]').forEach(x=>x.onclick=()=>apply(a=>{if(x.dataset.al==='left')delete a.al;else a.al=x.dataset.al}));return g}
// ---------- line style API (Width sheet) ----------
window.setLineStyle=async v=>{LS=v;localStorage.setItem(LSK,v);const it=(tool==='select'?selItems():msel).filter(o=>o.planId&&'x1'in o&&!NOSTYLE.has(o.type)&&!('address'in o));if(!it.length)return;
 const L=it.map(o0=>{const o=markups.find(x=>x.id===o0.id),b=structuredClone(o),a=structuredClone(o);if(v==='solid')delete a.ls;else a.ls=v;return{store:'markups',id:o.id,before:b,after:a}});await changeMulti(L);const ids=new Set(L.map(x=>x.id));msel=msel.map(o=>ids.has(o.id)?markups.find(x=>x.id===o.id)||o:o);renderSelBar();requestDraw(false)};
})();
// accurate hint when Edit opens on a curve / polyline / line
{const _t=toast;toast=function(msg,u){if(typeof msg==='string'&&/^Edit mode/.test(msg)&&tool==='select'&&sel?.kind==='m'&&(sel.o.type==='path'||sel.o.type==='zig'||sel.o.type==='zarrow'||sel.o.type==='line'||sel.o.type==='arrow')&&edOn(sel.o))msg='Edit points: drag a point or handle · tap the line to add a point';return _t.call(this,msg,u)}}
// ---------- bpm-v105: Freehand (✍) with live stabilization + Bezier fitting on release ----------
(()=>{const FK='bpm-fh-smooth';let SM=+(localStorage.getItem(FK)??60);if(!isFinite(SM))SM=60;window.fhSmooth=()=>SM;
 const lerp=(a,b,t)=>a+(b-a)*t;
 let F=null,FP=new Map(),fpinch=null; // F = active stroke {id,raw:[[sx,sy,t]],B:[[x,y]] brush (plan), bs:{x,y} brush screen, t0, moved}
 const ST2=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 const palm=e=>e.pointerType==='touch'&&(e.width>34||e.height>34);
 // bpm-v106: live input = coalesced pointer samples -> velocity-adaptive 1-euro filter (strong smoothing when slow, little lag when fast)
 // -> light lazy brush (kept short so tight turns are not cut). Smoothing slider drives the filter cutoff, brush radius, resample step, RDP tolerance.
 const t01=()=>.25+.75*SM/100;
 function oe(prev,x,dt,dx,mc,beta){const fc=mc+beta*Math.abs(dx),a=1/(1+1/(2*Math.PI*fc*dt));return prev+(x-prev)*a}
 function feed(s){const t=t01();F.raw.push([s.x,s.y,s.t||performance.now()]);F.fitN=null;const now=s.t||performance.now(),E=F.oe||(F.oe={x:s.x,y:s.y,dx:0,dy:0,t:now});let dt=Math.max(1,now-E.t)/1000;if(dt>0.1)dt=0.1;
  const mc=lerp(3.5,0.9,t),beta=lerp(.06,.012,t),ad=1/(1+1/(2*Math.PI*1.0*dt));const vx=(s.x-E.x)/dt,vy=(s.y-E.y)/dt;E.dx+=(vx-E.dx)*ad;E.dy+=(vy-E.dy)*ad;
  E.x=oe(E.x,s.x,dt,E.dx,mc,beta);E.y=oe(E.y,s.y,dt,E.dy,mc,beta);E.t=now;
  // short lazy brush on top (only removes hand tremor; radius well under a tight turn)
  const rad=lerp(.8,5,t),b=F.bs,dx=E.x-b.x,dy=E.y-b.y,d=Math.hypot(dx,dy);if(d>rad){b.x+=dx*(d-rad)/d;b.y+=dy*(d-rad)/d}
  const w=toW(b.x,b.y),L=F.B[F.B.length-1];if(!L||Math.hypot(w.x-L[0],w.y-L[1])*view.s>.8){F.B.push([w.x,w.y]);F.fitN=null}}
 function rdp(P,eps){if(P.length<3)return P.slice();let i0=0,dm=0;const[a,b]=[P[0],P[P.length-1]],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);
  for(let i=1;i<P.length-1;i++){const d=L?Math.abs(dx*(a[1]-P[i][1])-dy*(a[0]-P[i][0]))/L:Math.hypot(P[i][0]-a[0],P[i][1]-a[1]);if(d>dm){dm=d;i0=i}}return dm>eps?rdp(P.slice(0,i0+1),eps).slice(0,-1).concat(rdp(P.slice(i0),eps)):[a,b]}
 function resample(P,step){if(P.length<2)return P;const O=[P[0]];let acc=0;for(let i=1;i<P.length;i++){let[ax,ay]=P[i-1];const[bx,by]=P[i];let d=Math.hypot(bx-ax,by-ay);while(acc+d>=step){const k=(step-acc)/d;ax+=(bx-ax)*k;ay+=(by-ay)*k;O.push([ax,ay]);d=Math.hypot(bx-ax,by-ay);acc=0}acc+=d}const l=P[P.length-1],q=O[O.length-1];if(Math.hypot(l[0]-q[0],l[1]-q[1])>step*.3)O.push(l);else O[O.length-1]=l;return O}
 // intentional corners: turning angle over ±k samples above ~62° and a local maximum → kept sharp (segments are fitted separately, cusp node)
 function corners(P,step){const k=Math.max(2,Math.round(7/step*(1/view.s))||2),C=[],ang=new Array(P.length).fill(0);
  for(let i=k;i<P.length-k;i++){const a=P[i-k],b=P[i],c=P[i+k],v1x=b[0]-a[0],v1y=b[1]-a[1],v2x=c[0]-b[0],v2y=c[1]-b[1],l1=Math.hypot(v1x,v1y),l2=Math.hypot(v2x,v2y);if(!l1||!l2)continue;ang[i]=Math.acos(Math.max(-1,Math.min(1,(v1x*v2x+v1y*v2y)/(l1*l2))))}
  const th=lerp(52,70,t01())*Math.PI/180;for(let i=k;i<P.length-k;i++){if(ang[i]<th)continue;let mx=true;for(let j=i-k;j<=i+k;j++)if(ang[j]>ang[i]||(ang[j]===ang[i]&&j<i)){mx=false;break}if(mx&&(!C.length||i-C[C.length-1]>=k))C.push(i)}return C}
 const smoothSeg=(P,win,passes)=>{for(let p=0;p<passes;p++){P=P.map((q,i)=>{if(i===0||i===P.length-1)return q;const w=Math.min(win,i,P.length-1-i);let sx=0,sy=0,n=0;for(let j=i-w;j<=i+w;j++){sx+=P[j][0];sy+=P[j][1];n++}return[sx/n,sy/n]})}return P};
 // centripetal Catmull-Rom (alpha .5) → cubic Bezier handles: no overshoot / self-loops on uneven spacing
 function crHandles(K){const n=K.length,N=K.map(([x,y])=>({x,y,ix:0,iy:0,ox:0,oy:0,k:'s'}));if(n<2)return N;
  const G=i=>i<0?[2*K[0][0]-K[1][0],2*K[0][1]-K[1][1]]:i>=n?[2*K[n-1][0]-K[n-2][0],2*K[n-1][1]-K[n-2][1]]:K[i];
  for(let i=0;i<n-1;i++){const P0=G(i-1),P1=K[i],P2=K[i+1],P3=G(i+2),dd=(A,B)=>Math.max(1e-6,Math.pow(Math.hypot(B[0]-A[0],B[1]-A[1]),.5)),d1=dd(P0,P1),d2=dd(P1,P2),d3=dd(P2,P3);
   const b1=[0,1].map(j=>(d1*d1*P2[j]-d2*d2*P0[j]+(2*d1*d1+3*d1*d2+d2*d2)*P1[j])/(3*d1*(d1+d2))),b2=[0,1].map(j=>(d3*d3*P1[j]-d2*d2*P3[j]+(2*d3*d3+3*d3*d2+d2*d2)*P2[j])/(3*d3*(d3+d2)));
   N[i].ox=b1[0]-P1[0];N[i].oy=b1[1]-P1[1];N[i+1].ix=b2[0]-P2[0];N[i+1].iy=b2[1]-P2[1]}return N}
 // final + live fit, from the raw samples in screen px (zero-phase, so no lag at corners):
 // arc-length resample (speed carried along) -> corner split -> velocity-adaptive smoothing (1-euro idea: wide when slow = tremor, narrow when fast)
 // -> RDP (tolerance from the slider) -> centripetal Catmull-Rom Bezier. Nodes are converted to plan coords at the end.
 function resampleT(P,step){const O=[[P[0][0],P[0][1],0]];let acc=0;const sp=i=>{const a=P[Math.max(0,i-1)],b=P[i];const dt=Math.max(4,(b[2]||0)-(a[2]||0));return Math.hypot(b[0]-a[0],b[1]-a[1])/dt*1000};
  for(let i=1;i<P.length;i++){let ax=P[i-1][0],ay=P[i-1][1];const bx=P[i][0],by=P[i][1],v=sp(i);let d=Math.hypot(bx-ax,by-ay);if(i===1)O[0][2]=v;while(acc+d>=step){const k=(step-acc)/d;ax+=(bx-ax)*k;ay+=(by-ay)*k;O.push([ax,ay,v]);d=Math.hypot(bx-ax,by-ay);acc=0}acc+=d}
  const l=P[P.length-1],q=O[O.length-1];if(Math.hypot(l[0]-q[0],l[1]-q[1])>step*.3)O.push([l[0],l[1],q[2]]);else{q[0]=l[0];q[1]=l[1]}return O}
 function fitScreen(raw){const t=t01();if(raw.length<2)return null;const step=lerp(1.5,3,t);let P=resampleT(raw,step);if(P.length<2)return null;
  const C=corners(P,step*view.s),cuts=[0,...C,P.length-1],wslow=lerp(2,7,t)*lerp(2,5,t),eps=lerp(.6,3.2,t),out=[];
  for(let s=0;s<cuts.length-1;s++){let S=P.slice(cuts[s],cuts[s+1]+1);if(S.length<2)continue;
   for(let pass=0;pass<2;pass++)S=S.map((q,i)=>{if(i===0||i===S.length-1)return q;const w=Math.max(0,Math.round(wslow/(1+q[2]/600)/step));const h=Math.min(w,i,S.length-1-i);if(!h)return q;let sx=0,sy=0,sw=0;for(let j=i-h;j<=i+h;j++){const g=Math.exp(-2*((j-i)/(h+1))**2);sx+=S[j][0]*g;sy+=S[j][1]*g;sw+=g}return[sx/sw,sy/sw,q[2]]});
   const vm=S.reduce((a,q)=>a+q[2],0)/S.length;let K=rdp(S.map(q=>[q[0],q[1]]),eps*(1+Math.min(1.5,vm/1500)));if(K.length<2)K=[[S[0][0],S[0][1]],[S[S.length-1][0],S[S.length-1][1]]];const N=crHandles(K);
   if(out.length){const L=out[out.length-1];L.ox=N[0].ox;L.oy=N[0].oy;L.k='c';N.shift()}out.push(...N)}
  if(!out.length)return null;out[0].k=out[out.length-1].k='c';
  return out.map(n=>{const p=toW(n.x,n.y),i=toW(n.x+n.ix,n.y+n.iy),o=toW(n.x+n.ox,n.y+n.oy);return{x:p.x,y:p.y,ix:i.x-p.x,iy:i.y-p.y,ox:o.x-p.x,oy:o.y-p.y,k:n.k}})}
 function fit(B){if(!B||B.length<2)return null;const S=B.map(([x,y],i)=>{const s=toS(x,y);return[s.x,s.y,i*16]});return fitScreen(S)}
 // the live preview draws the same fit as the final stroke (cached per brush length)
 function liveNodes(){if(!F)return null;if(F.fitN&&F.fitL===F.raw.length&&F.fitV===view)return F.fitN;F.fitN=fitScreen(F.raw);F.fitL=F.raw.length;F.fitV=view;return F.fitN}
 window.FH_API={fit,fitScreen,rdp,resample,corners};
 async function finish(){const S=F;F=null;requestDraw(false);if(!S)return;if(S.B.length<2||!S.moved)return;
  const N=fitScreen(S.raw);if(!N)return;
  const m={id:uid(),planId:plan.id,page,type:'path',fh:1,color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};PEN_API.writeNodes(m,N,false,false);m.type='path';
  window.fhLast={raw:S.raw.map(([x,y])=>{const q=toW(x,y);return[q.x,q.y]}),stab:S.B.slice(),nodes:N.length,id:m.id};await change('markups',null,m)}
 const startPinch=()=>{const[a,b]=[...FP.values()];fpinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}}};
 stage.addEventListener('pointerdown',e=>{if(tool!=='free'||!plan||e.button>0||!(e.target===cv||e.target===ov))return;if(e.isPrimary&&FP.size){FP.clear();fpinch=null;F=null}e.stopImmediatePropagation();e.preventDefault();
  if(palm(e))return; // palm / large contact: ignored
  if(F&&F.pt==='pen'&&e.pointerType==='touch')return; // stylus drawing: touches are palms
  if(FP.size>=2)return; // third finger etc.: ignored
  const s=ST2(e);
  if(FP.size===1){ // second finger: early -> two-finger pan/zoom (stroke discarded); late -> resting palm, ignored
   if(F&&(F.moved>24||performance.now()-F.t0>350))return;F=null;FP.set(e.pointerId,s);startPinch();requestDraw(false);return}
  FP.set(e.pointerId,s);stage.setPointerCapture?.(e.pointerId);F={pid:e.pointerId,pt:e.pointerType,raw:[[s.x,s.y,performance.now()]],bs:{x:s.x,y:s.y},B:[[toW(s.x,s.y).x,toW(s.x,s.y).y]],t0:performance.now(),moved:0,s0:s}},true);
 stage.addEventListener('pointermove',e=>{if(tool!=='free'||!FP.has(e.pointerId))return;e.stopImmediatePropagation();const s=ST2(e);FP.set(e.pointerId,s);
  if(fpinch&&FP.size>=2){const[a,b]=[...FP.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=fpinch,sc=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s:sc,x:c.x-wx*sc,y:c.y-wy*sc};fastView();return}
  if(!F||F.pid!==e.pointerId)return;const ev=e.getCoalescedEvents?e.getCoalescedEvents():[];for(const c of(ev.length?ev:[e])){const q=ST2(c);q.t=c.timeStamp;F.moved=Math.max(F.moved,Math.hypot(q.x-F.s0.x,q.y-F.s0.y));feed(q)}requestDraw(false)},true);
 const fup=e=>{if(tool!=='free'&&!FP.has(e.pointerId))return;if(!FP.has(e.pointerId))return;e.stopImmediatePropagation();FP.delete(e.pointerId);
  if(fpinch){if(FP.size<2)fpinch=null;if(!FP.size)drawBase&&requestDraw(true);return}if(F&&F.pid===e.pointerId)finish()};
 stage.addEventListener('pointerup',fup,true);stage.addEventListener('pointercancel',e=>{if(F&&F.pid===e.pointerId){F=null;requestDraw(false)}fup(e)},true);
 const _o=drawOverlay0;drawOverlay0=function(){_o();if(!F||F.B.length<2||!plan)return;const c=octx;c.save();setT(c);c.globalAlpha=toolOp(false);c.strokeStyle=$('#color').value;c.lineWidth=(SZ[$('#size').value]||3)/MK_S;c.lineCap=c.lineJoin='round';
  const ls=window.lineStyle?lineStyle():'solid',lw=c.lineWidth;if(ls==='dash')c.setLineDash([lw*3.2,lw*2.2]);else if(ls==='dot')c.setLineDash([.01,lw*2.2]);
  const N=liveNodes();if(!N||N.length<2){c.restore();return}c.beginPath();c.moveTo(N[0].x,N[0].y);for(let i=1;i<N.length;i++){const p=N[i-1],q=N[i];c.bezierCurveTo(p.x+p.ox,p.y+p.oy,q.x+q.ix,q.y+q.iy,q.x,q.y)}c.stroke();c.restore()};
 // options bar: labeled Smoothing slider (Light .. Strong), remembered
 function fhBar(){let b=$('#fhBar');if(!b){b=document.createElement('div');b.id='fhBar';stage.append(b)}if(tool!=='free'){b.hidden=true;setTimeout(toastLift,0);return}b.hidden=false;
  b.innerHTML=`<span class="pbH">✍ Freehand</span><label class="fhL" for="fhSm">Smoothing</label><span class="fhE">Light</span><input type="range" id="fhSm" min="0" max="100" step="5" value="${SM}" aria-label="Smoothing, light to strong"><span class="fhE">Strong</span><b id="fhV">${SM}</b>`;
  setTimeout(toastLift,0);const r=b.querySelector('#fhSm');r.oninput=()=>{SM=+r.value;localStorage.setItem(FK,String(SM));b.querySelector('#fhV').textContent=SM}}
 window.fhBar=fhBar;document.querySelectorAll('[data-t]').forEach(x=>x.addEventListener('click',()=>{if(F&&x.dataset.t!=='free'){F=null}setTimeout(fhBar,0)}));
})();
}catch(e){console.error('11-pen-tool.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/12-split-merge.js =====
// @shared-globals: this file declares top-level names other files use, so tools/build.js joins it unwrapped.
// bpm-v86: two-tech split & merge by file. mergePins() is PURE (no DOM/DB), so a future automatic
// transport (WebRTC peer, cloud relay) can feed it the same pin records + change log.
// Per-pin result record: RES fields + updatedAt (ms) + dev (device id) + by (tech name). Split copies carry
// srcPin (origin pin id) and base {u,st} = origin's updatedAt/status at split time.
const RES_F=['status','checks','reason','reasonText','severity','notes','testedAt','tester','codes','correctedAt','correctedBy','corrNote','rdSens','rdCd','rdDb','prev'];
const resKey=p=>JSON.stringify(RES_F.map(k=>{const v=p?.[k];return v===''||v==null?null:v}))/* bpm-v136: an empty field and a missing one are the same result (a result merged in once is not a conflict when the same file is merged again) */;
// bpm-v135: the merge also brings back edits made on the second phone (address, model, location, type, position) and new pins/drawings.
// Each split pin carries base.ev = its edit fields at split time, so the merge can tell which phone changed which field. Both changed one field: the newest edit wins.
const EDIT_G={address:['address'],model:['model'],location:['location'],type:['type'],position:['x','y','ang','bw','bh','vert']},EDIT_F=Object.values(EDIT_G).flat();
const editKey=p=>JSON.stringify(EDIT_F.map(k=>p?.[k]??null));
const pickEdit=p=>{const o={};for(const k of EDIT_F)if(p&&p[k]!==undefined)o[k]=p[k];return o};
const gv=(o,g)=>JSON.stringify(EDIT_G[g].map(k=>o?.[k]??null));
function mergeEdits(l,r){const ev=r.base&&r.base.ev;if(!ev)return null;const out={fields:{},groups:[],conflicts:[]};
 for(const g of Object.keys(EDIT_G)){const b=gv(ev,g),rv=gv(r,g),lv=gv(l,g);if(rv===b||rv===lv)continue;
  if(lv===b){out.groups.push(g);for(const k of EDIT_G[g])out.fields[k]=r[k]}
  else{const rn=(r.editAt||0)>(l.editAt||0);out.conflicts.push({g,won:rn?'remote':'local',local:lv,remote:rv});if(rn){out.groups.push(g);for(const k of EDIT_G[g])out.fields[k]=r[k]}}}
 if(out.groups.length){out.fields.editAt=Math.max(r.editAt||0,l.editAt||0)}return out}
function mergePins(local,remote,opt={}){const L=new Map(local.map(p=>[p.id,p])),out={apply:[],conflicts:[],same:0,unchanged:0,missing:[],added:[],edits:[],again:0},pm=opt.planMap||null;
 /* bpm-v136: pins this phone already took in from a returned file remember the other phone's pin id (mergedFrom), so merging the same file again finds them instead of adding copies */
 const MF=new Map(local.filter(p=>p.mergedFrom).map(p=>[p.mergedFrom,p]));
 for(const r of remote){let id=r.srcPin||r.id,l=L.get(id);if(!l&&!r.srcPin&&MF.has(r.id)){l=MF.get(r.id);id=l.id;out.again++}
  if(!l){/* bpm-v135: a pin placed on the second phone (no origin pin) comes back as a new pin on the matching plan */if(!r.srcPin&&!r.base&&pm&&pm[r.planId])out.added.push({...r,planId:pm[r.planId]});else out.missing.push(id);continue}
  const ed=mergeEdits(l,r);if(ed&&(ed.groups.length||ed.conflicts.length))out.edits.push({id,...ed});
  const bu=r.base?r.base.u||0:null,ru=r.updatedAt||0,lu=l.updatedAt||0;
  const rc=bu===null?ru>0:ru>bu;if(!rc||resKey(r)===resKey(l)){rc&&resKey(r)===resKey(l)?out.same++:out.unchanged++;continue}
  const lc=bu===null?(lu>0&&l.dev!==r.dev&&lu!==ru):lu>bu;
  if(!lc||(bu===null&&ru>lu&&l.dev===r.dev))out.apply.push({id,fields:pickRes(r)});
  else if(bu===null&&l.dev===r.dev)out.unchanged++;
  else out.conflicts.push({id,local:l,remote:r})}
 return out}
function pickRes(p){const o={};for(const k of [...RES_F,'updatedAt','dev','by'])o[k]=p[k]??(k==='checks'||k==='codes'?undefined:'');return o}
function mergeLog(a=[],b=[]){const k=e=>e.pin+'|'+e.at+'|'+e.dev,m=new Map();for(const e of [...a,...b])m.set(k(e),e);return[...m.values()].sort((x,y)=>x.at-y.at).slice(-5000)}
window.mergePins=mergePins;window.mergeLog=mergeLog;
const mkHash=m=>{const{id,planId,srcMk,mbase,updatedAt,mergedFrom,...r}=m||{};return JSON.stringify(r,Object.keys(r).sort())};
// bpm-v135: drawings (markups). Changed only on their phone: theirs is used. Changed on both: the newest wins. New drawings are added. A drawing they deleted is kept here (listed in the summary).
function mergeMarkups(local,remote,pm,splitIds){const L=new Map(local.map(m=>[m.id,m])),out={apply:[],added:[],conflicts:[],gone:0,again:0};const seen=new Set();
 /* bpm-v136: drawings already taken in remember the other phone's drawing id (mergedFrom); identical drawings (taken in by version 135) are also recognised */
 const MF=new Map(local.filter(m=>m.mergedFrom).map(m=>[m.mergedFrom,m])),HS=new Set(local.filter(m=>!m.srcMk).map(m=>m.planId+'|'+mkHash(m)));
 for(const r of remote){if(r.srcMk){seen.add(r.srcMk);const l=L.get(r.srcMk);if(!l||!r.mbase)continue;const rh=mkHash(r),lh=mkHash(l);if(rh===r.mbase||rh===lh)continue;
   if(lh===r.mbase)out.apply.push({id:l.id,m:r});else{const rn=(r.updatedAt||0)>(l.updatedAt||0);out.conflicts.push({id:l.id,won:rn?'remote':'local'});if(rn)out.apply.push({id:l.id,m:r})}}
  else if(pm&&pm[r.planId]){const ex=MF.get(r.id);if(ex){out.again++;if(mkHash(ex)!==mkHash(r)&&(r.updatedAt||0)>(ex.updatedAt||0))out.apply.push({id:ex.id,m:r});continue}
   if(HS.has(pm[r.planId]+'|'+mkHash(r))){out.again++;continue}out.added.push({...r,planId:pm[r.planId]})}}
 if(splitIds)for(const id of splitIds)if(!seen.has(id)&&L.has(id))out.gone++;return out}
window.mergeMarkups=mergeMarkups;window.mkHash=mkHash;
(()=>{const ce=ceA;
 const DEV=localStorage.getItem('bpm-dev')||(()=>{const d='d'+Math.random().toString(36).slice(2,10);localStorage.setItem('bpm-dev',d);return d})();window.DEVICE_ID=DEV;
 async function stamp(b,a){if(a&&b&&editKey(a)!==editKey(b)){a.editAt=Date.now();a.editDev=DEV}if(!a||resKey(a)===resKey(b))return;a.updatedAt=Date.now();a.dev=DEV;a.by=(tester===null?await get('meta','tester'):tester)||'';
  if(project){const k='chlog:'+project.id,l=(await get('meta',k))||[];l.push({pin:a.srcPin||a.id,at:a.updatedAt,dev:DEV,by:a.by,st:a.status||''});await put('meta',l.slice(-5000),k)}}
 const _c=change;change=async function(s,b,a,m){if(s==='pins')await stamp(b,a);if(s==='markups'&&a)a.updatedAt=Date.now();return _c.call(this,s,b,a,m)};
 const _cm=changeMulti;changeMulti=async function(list){for(const e of list){if(e.store==='pins')await stamp(e.before,e.after);if(e.store==='markups'&&e.after)e.after.updatedAt=Date.now()}return _cm.call(this,list)};

 async function shareOrSave(blob,name){const f=new File([blob],name,{type:'application/octet-stream'});
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:name});return'shared'}catch(e){if(e.name==='AbortError')return'cancel';if(e.name==='NotAllowedError'&&await uiConfirm(name+' is ready.',{ok:'Share file',cancel:'Save to device'})){try{await navigator.share({files:[f],title:name});return'shared'}catch(e2){if(e2.name==='AbortError')return'cancel'}}}}dl(blob,name);return'saved'}
 window.buildSplit=async function(sel){const all=await readBpm(await buildBpm(project.id)),man=all.man,z=all.z,ids=new Set(sel.map(p=>p.id)),plIds=new Set(sel.map(p=>p.planId));
  const plans=man.plans.filter(p=>plIds.has(p.id)),media=man.media.filter(m=>ids.has(m.pinId)),files=[];
  for(const p of plans)if(p.file)files.push({name:p.file,blob:z.get(p.file).blob});for(const m of media){if(m.file)files.push({name:m.file,blob:z.get(m.file).blob});if(m.annotFile)files.push({name:m.annotFile,blob:z.get(m.annotFile).blob})}
  const at=Date.now(),m2={...man,project:{...man.project,name:man.project.name+' – split',split:{projectId:project.id,from:DEV,at,n:sel.length}},plans,media,
   pins:man.pins.filter(p=>ids.has(p.id)).map(p=>({...p,srcPin:p.srcPin||p.id,base:{u:p.updatedAt||0,st:p.status,e:p.editAt||0,ev:pickEdit(p)}})),markups:man.markups.filter(m=>plIds.has(m.planId)).map(m=>({...m,srcMk:m.srcMk||m.id,mbase:mkHash(m)})),split:{projectId:project.id,from:DEV,at}};
  m2.split.mk=m2.markups.map(m=>m.srcMk);delete m2.learned;files.unshift({name:'project.json',blob:new Blob([JSON.stringify(m2)],{type:'application/json'})});return zipBlob(files)};
 function selected(d){const pg=new Set([...d.querySelectorAll('[data-pg]:checked')].map(b=>+b.dataset.pg)),ty=new Set([...d.querySelectorAll('[data-ty]:checked')].map(b=>b.dataset.ty)),A=d._area;
  return pins.filter(p=>pg.has(p.page)&&(!ty.size||ty.has(p.type))&&(!A||(p.x>=A.x0&&p.x<=A.x1&&p.y>=A.y0&&p.y<=A.y1)))}
 async function openSplit(area){if(!plan)return toast('Open a plan first');let d=$('#splitDlg');if(!d){d=ce('dialog',{id:'splitDlg'});document.body.append(d)}
  const all=await byIdx('pins','planId',plan.id),pgs=[...new Set(all.map(p=>p.page))].sort((a,b)=>a-b),tys=[...new Set(all.map(p=>p.type))];d._area=area||null;
  /* bpm-v103: redesigned Split: title, 2-step layout, grouped sections, chip toggles with live counts, summary, prominent Share/Save */
  const cnt=f=>all.filter(f).length,dot=t=>(TYPES[t]||TYPES.other).c;d.classList.add('spD');
  d.innerHTML=`<div class="spHd"><div><h3>⇆ Split for a second technician</h3><small>Give some pins to another phone. They test them and send the file back; ⇄ Merge pulls their results in by pin ID.</small></div><button type="button" class="btn spClose" id="spX2" title="Close">✕<span>Close</span></button></div>
  <ol class="spSteps"><li class="on"><b>1</b> Choose devices</li><li><b>2</b> Share or save</li></ol>
  <section class="spSec"><h4>Pages</h4><div class="spChips">${pgs.map(n=>`<label class="spChip"><input type="checkbox" data-pg="${n}"${n===page?' checked':''}><span>${esc(pgT(plan.id,n))}</span><em>${cnt(p=>p.page===n)}</em></label>`).join('')}</div></section>
  <section class="spSec"><h4>Device types <small>none ticked = all types</small></h4><div class="spChips">${tys.map(t=>`<label class="spChip"><input type="checkbox" data-ty="${t}"><i style="background:${dot(t)}"></i><span>${esc(TYPES[t]?.n||t)}</span><em data-tc="${t}">${cnt(p=>p.type===t)}</em></label>`).join('')}</div></section>
  <section class="spSec"><h4>Area</h4><div class="spArea"><span id="spA">${area?'▭ Drawn area on '+esc(pgT(plan.id,page)):'Whole page'}</span><span class="sp"></span><button type="button" class="btn" id="spDraw">▭ Draw area</button>${area?'<button type="button" class="btn" id="spClr">Clear area</button>':''}</div></section>
  <div class="spSum" id="spSum"></div>
  <div class="spFt"><button type="button" class="btn" id="spX">Cancel</button><button type="button" class="btn pri spGo" id="spGo">⇪ Share / Save split · <b id="spN"></b></button></div>`;
  if(area)d.querySelectorAll('[data-pg]').forEach(b=>b.checked=+b.dataset.pg===page);
  const upd=()=>{const S=selected(d),n=S.length,T=[...new Set(S.map(p=>p.type))],P=[...new Set(S.map(p=>p.page))].sort((a,b)=>a-b),ut=S.filter(p=>!p.status||p.status==='not tested').length;
   d.querySelector('#spN').textContent=`${n} pin${n===1?'':'s'}`;d.querySelector('#spGo').disabled=!n;
   const pg=new Set([...d.querySelectorAll('[data-pg]:checked')].map(b=>+b.dataset.pg)),A=d._area;d.querySelectorAll('[data-tc]').forEach(e=>{const t=e.dataset.tc;e.textContent=all.filter(p=>p.type===t&&pg.has(p.page)&&(!A||(p.x>=A.x0&&p.x<=A.x1&&p.y>=A.y0&&p.y<=A.y1))).length});
   d.querySelector('#spSum').innerHTML=n?`<b>${n}</b> pin${n===1?'':'s'} · ${T.length} type${T.length===1?'':'s'} · ${P.map(x=>esc(pgT(plan.id,x))).join(', ')}<br><small>${ut} untested · ${n-ut} already have a result${A?' · inside the drawn area':''}</small>`:'<small>Nothing selected yet. Tick at least one page.</small>'};
  d.onchange=upd;upd();
  d.querySelector('#spX').onclick=()=>d.close();d.querySelector('#spX2').onclick=()=>d.close();if(d.querySelector('#spClr'))d.querySelector('#spClr').onclick=()=>{d.close();openSplit()};
  d.querySelector('#spDraw').onclick=()=>{d.close();document.querySelectorAll('dialog[open]').forEach(x=>x.close());drawArea(a=>openSplit(a))};
  d.querySelector('#spGo').onclick=async()=>{const sel=selected(d);busy(1,'Building split…');let b,nm;try{b=await buildSplit(sel);nm=fsafe(project.name)+'-split-'+sel.length+'.marker';window.__lastSplit=b}catch(e){busy(0);d.close();return alert('Split failed: '+e.message)}busy(0);
   const f=new File([b],nm,{type:'application/octet-stream'}),canSh=!!(navigator.canShare&&navigator.canShare({files:[f]}));
   const step2=msg=>{d.querySelector('.spSteps').innerHTML='<li class="done"><b>✓</b> Choose devices</li><li class="on"><b>2</b> Share or save</li>';d.querySelectorAll('.spSec,#spSum').forEach(e=>e.hidden=true);
    d.querySelector('.spFt').innerHTML=`<div class="spReady"><div class="spFile">📦 <b>${esc(nm)}</b><small>${sel.length} pins · ${(b.size/1048576).toFixed(1)} MB</small></div>${msg||''}</div><div class="spFt2">${canSh?'<button type="button" class="btn pri spGo" id="spShare">⇪ Share file</button><button type="button" class="btn" id="spSave">⬇ Save to device</button>':''}<button type="button" class="btn" id="spDone">Done</button></div>`;
    const q=x=>d.querySelector(x);if(q('#spShare'))q('#spShare').onclick=async()=>{try{await navigator.share({files:[f],title:nm});toast(`Split of ${sel.length} pins shared`);d.close()}catch(e){if(e.name!=='AbortError')toast('Share failed: '+e.message)}};
    if(q('#spSave'))q('#spSave').onclick=()=>{dl(b,nm);toast(`Split of ${sel.length} pins saved`);d.close()};q('#spDone').onclick=()=>d.close()};
   if(canSh)step2();else{dl(b,nm);toast(`Split of ${sel.length} pins saved`);step2('<small class="spOk">✓ Saved to your downloads. Send it to the second technician.</small>')}};
  if(!d.open)d.showModal()}
 function drawArea(cb){const o=ce('div',{id:'areaOv'});o.style.cssText='position:absolute;inset:0;z-index:8;cursor:crosshair;touch-action:none;background:#0002';const r=ce('div');r.style.cssText='position:absolute;border:2px dashed #fbbf24;background:#fbbf2422;display:none';o.append(r,ce('div',{},'<div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);background:var(--gray-16);padding:4px 10px;border-radius:6px">Drag a box around the area</div>'));stage.append(o);
  let s=null;o.onpointerdown=e=>{o.setPointerCapture(e.pointerId);const b=stage.getBoundingClientRect();s={x:e.clientX-b.left,y:e.clientY-b.top,b}};
  o.onpointermove=e=>{if(!s)return;const x=e.clientX-s.b.left,y=e.clientY-s.b.top;Object.assign(r.style,{display:'block',left:Math.min(x,s.x)+'px',top:Math.min(y,s.y)+'px',width:Math.abs(x-s.x)+'px',height:Math.abs(y-s.y)+'px'})};
  o.onpointerup=e=>{if(!s)return;const x=e.clientX-s.b.left,y=e.clientY-s.b.top,a=toW(s.x,s.y),c=toW(x,y);o.remove();cb({x0:Math.min(a.x,c.x),x1:Math.max(a.x,c.x),y0:Math.min(a.y,c.y),y1:Math.max(a.y,c.y)})}}
 window.openSplit=openSplit;

 window.mergeFile=async function(file){if(!project)throw new Error('open the project first');const{z,man}=await readBpm(file),pid=man.split?.projectId||man.project?.split?.projectId||man.project?.id;
  if(pid!==project.id){busy(0);const ok=await uiConfirm('This file was split from a different project. Merge anyway (pins match by ID only)?',{ok:'Merge anyway',cancel:'Cancel'});if(!ok)return null;busy(1,'Merging…')}
  const remote=man.pins,keys=new Set(remote.map(p=>p.srcPin||p.id)),local=[];for(const pl of (await all('plans')).filter(p=>p.projectId===project.id))for(const p of await byIdx('pins','planId',pl.id))if(keys.has(p.id)||(p.mergedFrom&&keys.has(p.mergedFrom)))local.push(p);
  /* bpm-v135: plan map (their plan id -> our plan id) for new pins and drawings */const myPl=(await all('plans')).filter(p=>p.projectId===project.id),myIds=new Set(myPl.map(p=>p.id)),planMap={};
  for(const rp of man.plans||[]){const o=rp.srcPlan||rp.id;if(myIds.has(o))planMap[rp.id]=o}
  const res=mergePins(local,remote,{planMap});const lm=[];for(const id of new Set(Object.values(planMap)))lm.push(...await byIdx('markups','planId',id));
  res.mk=mergeMarkups(lm,man.markups||[],planMap,man.split?.mk||man.project?.split?.mk||null);res.file={z,man};return res};
 async function applyMerge(res,picks){const{z,man}=res.file,byKey=new Map(man.pins.map(p=>[p.srcPin||p.id,p])),L=new Map();for(const pl of (await all('plans')).filter(p=>p.projectId===project.id))for(const p of await byIdx('pins','planId',pl.id))L.set(p.id,p);
  for(const p of L.values())if(p.mergedFrom&&byKey.has(p.mergedFrom)&&!byKey.has(p.id))byKey.set(p.id,byKey.get(p.mergedFrom));
  const take=[...res.apply,...res.conflicts.filter(c=>picks[c.id]==='remote').map(c=>({id:c.id,fields:pickRes(c.remote)}))];let nm=0;
  const haveM=new Set((await all('media')).map(m=>m.srcMedia||m.id));
  for(const t of take){const l=L.get(t.id);if(!l)continue;const a={...l,...t.fields};for(const k in t.fields)if(t.fields[k]===undefined)delete a[k];await put('pins',a);
   const r=byKey.get(t.id);if(!r)continue;for(const m of man.media.filter(m=>m.pinId===r.id)){if(haveM.has(m.srcMedia||m.id))continue;const{file:f,type,size,annotFile,annotType,...x}=m,o={...x,id:uid()+'m',srcMedia:m.srcMedia||m.id,pinId:t.id};if(f&&z.get(f))o.blob=new Blob([await z.get(f).blob.arrayBuffer()],{type});if(annotFile&&z.get(annotFile))o.annot=new Blob([await z.get(annotFile).blob.arrayBuffer()],{type:annotType});await put('media',o);nm++}}
  const copyMedia=async(rid,pid)=>{for(const m of man.media.filter(m=>m.pinId===rid)){if(haveM.has(m.srcMedia||m.id))continue;const{file:f,type,size,annotFile,annotType,...x}=m,o={...x,id:uid()+'m',srcMedia:m.srcMedia||m.id,pinId:pid};if(f&&z.get(f))o.blob=new Blob([await z.get(f).blob.arrayBuffer()],{type});if(annotFile&&z.get(annotFile))o.annot=new Blob([await z.get(annotFile).blob.arrayBuffer()],{type:annotType});await put('media',o);nm++}};
  // bpm-v135: edits (address, model, location, type, position), new pins, drawings
  let ne=0,na=0;const eg={};for(const e of res.edits||[]){if(!e.groups.length)continue;const l=(await get('pins',e.id));if(!l)continue;await put('pins',{...l,...e.fields});ne++;for(const g of e.groups)eg[g]=(eg[g]||0)+1}
  for(const r of res.added||[]){if(await get('pins',r.id)||[...L.values()].some(p=>p.mergedFrom===r.id))continue;const{base,srcPin,...x}=r,o={...x,id:uid()+'n',mergedFrom:r.id};await put('pins',o);await copyMedia(r.id,o.id);na++}
  const mk=res.mk||{apply:[],added:[],conflicts:[],gone:0};let mu=0,ma=0;
  for(const a of mk.apply){const l=await get('markups',a.id);if(!l)continue;const{srcMk,mbase,id,planId,...x}=a.m;await put('markups',{...x,id:l.id,planId:l.planId});mu++}
  for(const r of mk.added){const{srcMk,mbase,...x}=r;await put('markups',{...x,id:uid()+'k',mergedFrom:r.id});ma++}
  const k='chlog:'+project.id;await put('meta',mergeLog((await get('meta',k))||[],man.changelog||[]),k);
  if(plan){pins=await byIdx('pins','planId',plan.id);markups=await byIdx('markups','planId',plan.id);draw();window.renderList&&renderList()}return{pins:take.length,media:nm,edits:ne,editGroups:eg,added:na,mkChanged:mu,mkAdded:ma,mkGone:mk.gone,mkConflicts:mk.conflicts.length,editConflicts:(res.edits||[]).reduce((a,e)=>a+e.conflicts.length,0)}}
 window.applyMerge=applyMerge;
 const fmtR=p=>`<b>${esc(p.status||'not tested')}</b>${p.reason?' · '+esc(p.reason):''}${p.notes?'<br>📝 '+esc(p.notes):''}<br><small>${esc(p.by||p.tester||'?')} · ${p.updatedAt?new Date(p.updatedAt).toLocaleString():'—'}</small>`;
 const GN={address:'address',model:'model',location:'location',type:'device type',position:'position'};
 function mergeSummary(res,r,picks){const L=[],c=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
  if(r.pins)L.push(`${c(r.pins,'test result')} brought in`);if(r.added)L.push(`${c(r.added,'new device')} added`);
  for(const[g,n]of Object.entries(r.editGroups||{}))L.push(`${n} ${GN[g]} change${n===1?'':'s'}`);
  if(r.mkAdded)L.push(`${c(r.mkAdded,'new drawing')} added`);if(r.mkChanged)L.push(`${c(r.mkChanged,'changed drawing')} updated`);if(r.media)L.push(`${r.media} photo / media file${r.media===1?'':'s'}`);
  {const ag=(res.again||0)+(res.mk?.again||0);if(ag)L.push(`Already brought in by an earlier merge, not added again: ${ag} (devices and drawings)`)}
  const C=[];const rc=res.conflicts.length;if(rc){const th=res.conflicts.filter(x=>picks[x.id]==='remote').length;C.push(`${c(rc,'test result')} changed on both phones: kept ${th} from their phone and ${rc-th} from this phone`)}
  const ec=(res.edits||[]).flatMap(e=>e.conflicts);if(ec.length){const th=ec.filter(x=>x.won==='remote').length;C.push(`${c(ec.length,'edit')} made on both phones: the newest kept (${th} theirs, ${ec.length-th} this phone)`)}
  if(r.mkConflicts)C.push(`${c(r.mkConflicts,'drawing')} changed on both phones: the newest kept`);
  const N=[];if(res.missing.length)N.push(`${c(res.missing.length,'device')} from their file not found here (deleted on this phone), not brought back`);if(r.mkGone)N.push(`${c(r.mkGone,'drawing')} deleted on their phone kept here`);
  return{L,C,N}}
 window.mergeSummary=mergeSummary;
 const newer=c=>(c.remote.updatedAt||0)>(c.local.updatedAt||0)?'remote':'local';
 async function mergeUI(file){busy(1,'Merging…');let res;try{res=await mergeFile(file)}catch(e){busy(0);return alert('Merge failed: '+e.message)}busy(0);if(!res)return;
  const fin=async picks=>{const r=await applyMerge(res,picks);const S=mergeSummary(res,r,picks);toast(`Merged ${r.pins} pin result${r.pins===1?'':'s'}${r.media?`, ${r.media} photo/media`:''}${r.added?`, ${r.added} new device${r.added===1?'':'s'}`:''}${res.missing.length?` · ${res.missing.length} not found`:''}`);window.__lastMerge={...res,file:null,result:r,summary:S};
   let d=$('#mrgSum');if(!d){d=ce('dialog',{id:'mrgSum'});document.body.append(d)}
   d.innerHTML=`<h3 style="margin:4px 0">⇄ Merge summary</h3><b>Brought in from their phone</b><ul>${(S.L.length?S.L:['Nothing new']).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${S.C.length?`<b>Changed on both phones</b><ul>${S.C.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${S.N.length?`<b>Not merged</b><ul>${S.N.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<div class="row"><span class="sp"></span><button type="button" class="btn pri" id="mrgSumX">Done</button></div>`;
   d.querySelector('#mrgSumX').onclick=()=>d.close();d.showModal()};
  if(!res.conflicts.length)return fin({});let d=$('#mrgDlg');if(!d){d=ce('dialog',{id:'mrgDlg'});document.body.append(d)}
  /* bpm-v135: the newest result is picked for each conflict (change it if needed) */
  d.innerHTML=`<h3 style="margin:4px 0">⇄ ${res.conflicts.length} conflict${res.conflicts.length>1?'s':''}</h3><small style="color:#d4d4d4">Tested on both phones. The newest result is picked; change it if needed. ${res.apply.length} other result(s) merge automatically.</small><div id="mrgL">${res.conflicts.map(c=>{const n=newer(c);return`<div class="mc"><h4>${esc(TYPES[c.local.type]?.n||c.local.type)} ${esc(c.local.address||'')}</h4><label><input type="radio" name="m_${c.id}" value="local"${n==='local'?' checked':''}> This phone${n==='local'?' <b class="mNew">newest</b>':''}<br>${fmtR(c.local)}</label><label><input type="radio" name="m_${c.id}" value="remote"${n==='remote'?' checked':''}> Their phone${n==='remote'?' <b class="mNew">newest</b>':''}<br>${fmtR(c.remote)}</label></div>`}).join('')}</div><div class="row"><button type="button" class="btn" id="mrgX">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="mrgGo">Merge</button></div>`;
  d.querySelector('#mrgX').onclick=()=>d.close();d.querySelector('#mrgGo').onclick=async()=>{const p={};res.conflicts.forEach(c=>p[c.id]=d.querySelector(`[name="m_${c.id}"]:checked`).value);d.close();await fin(p)};d.showModal()}
 window.mergeUI=mergeUI;
 $('#splitBtn').onclick=()=>openSplit().catch(e=>{console.error(e);uiAlert('Split could not open: '+e.message)});
 $('#mergeBtn').onclick=()=>{const i=ce('input',{type:'file',accept:'.marker,.bpm,application/zip,application/octet-stream'});i.onchange=()=>i.files[0]&&mergeUI(i.files[0]);i.click()};
})();
;
// ===== src/ui/13-pin-transform.js =====
try{
// bpm-v87: pin transform handles (rotate / resize / two-finger) for the selected or just-placed pin.
// Writes p.ang (radians), p.bw, p.bh — the same fields Detect writes — so drawPin / outset / de-overlap stay on the bpm-v50 standard.
(()=>{let quick=null,drag=null;const D=Math.PI/180,MIN=4.5,MAX=200;
 const _q=quickChip;quickChip=function(p){quick=p?p.id:null;const r=_q.apply(this,arguments);sync();return r};
 const target=()=>{if(!plan||walk)return null;if(tool==='select'&&!msel.length&&sel&&isPinO(sel.o))return sel.o;if(quick)return pins.find(p=>p.id===quick&&p.page===page)||null;return null};
 const box=document.createElement('div');box.id='ptx';box.hidden=true;box.innerHTML='<div class="pxB"></div><div class="pxS"></div><div class="pxR" data-h="rot" title="Rotate (Snap: 15°)"></div>'+['nw','ne','se','sw'].map(c=>`<div class="pxH ${c}" data-h="${c}" title="Resize (Snap: keep ratio)"></div>`).join('')+'<div class="pxA"></div>';stage.append(box);
 const dims=p=>{const[,w,h]=pshOf(p);return[w,h]};
 function sync(){const p=target();if(!p){box.hidden=true;return}const[w,h]=dims(p),f=OFFMAP&&OFFMAP.get(p.id),c=toS(p.x+(f?f.dx:0),p.y+(f?f.dy:0)),W=Math.max(w*view.s,16),H=Math.max(h*view.s,16),a=isFinite(p.ang)?p.ang:0;
  box.hidden=false;Object.assign(box.style,{left:c.x+'px',top:c.y+'px',width:W+'px',height:H+'px',transform:`translate(-50%,-50%) rotate(${a}rad)`});
  const deg=((Math.round(a/D*10)/10)%360+360)%360;box.querySelector('.pxA').textContent=deg.toFixed(deg%1?1:0)+'°';box.querySelector('.pxA').style.transform=`rotate(${-a}rad)`;box.dataset.id=p.id}
 const _ov=drawOverlay;drawOverlay=function(){const r=_ov.apply(this,arguments);sync();return r};
 const live=(p,o)=>{Object.assign(p,o);requestDraw(false);sync()};
 const commit=async(p,b)=>{const a=structuredClone(p);Object.assign(p,b);if(JSON.stringify([a.ang,a.bw,a.bh])!==JSON.stringify([b.ang,b.bw,b.bh]))await change('pins',b,a);draw()};
 function begin(p,kind,pts){const[w,h]=dims(p);drag={p,kind,b:structuredClone(p),w,h,a:isFinite(p.ang)?p.ang:0,pts}}
 const ctr=p=>{const f=OFFMAP&&OFFMAP.get(p.id),r=stage.getBoundingClientRect(),c=toS(p.x+(f?f.dx:0),p.y+(f?f.dy:0));return{x:c.x+r.left,y:c.y+r.top}};
 const clampS=v=>Math.max(MIN,Math.min(MAX,v));
 box.addEventListener('pointerdown',e=>{const h=e.target.dataset.h;if(!h)return;e.stopPropagation();e.preventDefault();const p=pins.find(x=>x.id===box.dataset.id);if(!p)return;box.setPointerCapture(e.pointerId);const ch=$('#editChip');if(ch)ch.hidden=true;begin(p,h,null);drag.id=e.pointerId});
 box.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();const p=drag.p,c=ctr(p),dx=e.clientX-c.x,dy=e.clientY-c.y;
  if(drag.kind==='rot'){let a=Math.atan2(dy,dx)+Math.PI/2;if(snapK())a=Math.round(a/(15*D))*15*D;a=((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI);live(p,{ang:a,bw:drag.b.bw||drag.w,bh:drag.b.bh||drag.h})}
  else{const C=Math.cos(-drag.a),S=Math.sin(-drag.a),lx=(dx*C-dy*S)/view.s,ly=(dx*S+dy*C)/view.s;let w=clampS(Math.abs(lx)*2),h=clampS(Math.abs(ly)*2);if(snapK()){const k=Math.max(w/drag.w,h/drag.h);w=clampS(drag.w*k);h=clampS(drag.h*k)}live(p,{bw:+w.toFixed(2),bh:+h.toFixed(2),ang:drag.a||p.ang})}});
 const end=e=>{if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();const d=drag;drag=null;commit(d.p,d.b)};box.addEventListener('pointerup',end);['click','dblclick','pointerup'].forEach(k=>box.addEventListener(k,e=>{if(e.target.dataset.h)e.stopPropagation()}));box.addEventListener('pointercancel',end);
 // two-finger rotate / pinch on the selected pin (touch): both fingers near the pin
 const T=new Map();let g=null;
 stage.addEventListener('pointerdown',e=>{if(e.target===cv&&!g&&!drag)quick=quick&&tool==='pin'?quick:null;if(e.pointerType!=='touch')return;const p=target();if(!p||box.hidden){T.clear();return}
  const r=box.getBoundingClientRect(),m=48,inn=e.clientX>r.left-m&&e.clientX<r.right+m&&e.clientY>r.top-m&&e.clientY<r.bottom+m;if(!inn&&!T.size)return;T.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(T.size===2&&inn){e.stopImmediatePropagation();const[a,b]=[...T.values()];begin(p,'pinch');g={d:Math.hypot(b.x-a.x,b.y-a.y),t:Math.atan2(b.y-a.y,b.x-a.x)};const first=[...T.keys()][0];
   stage.dispatchEvent(new PointerEvent('pointercancel',{pointerId:first,pointerType:'touch',bubbles:true}));if(drag.b.x!==p.x||drag.b.y!==p.y){Object.assign(p,{x:drag.b.x,y:drag.b.y})}}},true);
 stage.addEventListener('pointermove',e=>{if(!g||!T.has(e.pointerId))return;e.stopImmediatePropagation();T.set(e.pointerId,{x:e.clientX,y:e.clientY});const[a,b]=[...T.values()],d=Math.hypot(b.x-a.x,b.y-a.y),t=Math.atan2(b.y-a.y,b.x-a.x),k=d/Math.max(1,g.d);
  let an=drag.a+(t-g.t);if(snapK())an=Math.round(an/(15*D))*15*D;an=((an%(2*Math.PI))+2*Math.PI)%(2*Math.PI);live(drag.p,{ang:an,bw:+clampS(drag.w*k).toFixed(2),bh:+clampS(drag.h*k).toFixed(2)})},true);
 const tend=e=>{if(!T.has(e.pointerId))return;T.delete(e.pointerId);if(g){e.stopImmediatePropagation();if(T.size<2){g=null;const d=drag;drag=null;T.clear();if(d)commit(d.p,d.b)}}};
 stage.addEventListener('pointerup',tend,true);stage.addEventListener('pointercancel',e=>{if(g&&e.isTrusted===false)return;tend(e)},true);
 document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.t!=='pin')quick=null;sync()}));
 window.ptxSync=sync;
})();
}catch(e){console.error('13-pin-transform.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/14-model-picker.js =====
try{
// bpm-v88: pin Model picker — scrollable, searchable list of ALL catalog models grouped by type/category.
(()=>{const sel=$('#dModelSel'),btn=document.createElement('button');btn.type='button';btn.id='dModelBtn';btn.className='btn';sel.style.display='none';sel.after(btn);
 const dlg=document.createElement('dialog');dlg.id='mdlDlg';dlg.innerHTML=`<div class="mdH"><b>Model</b><span class="sp"></span><button type="button" class="btn" id="mdX">✕ Close</button></div><input id="mdQ" type="search" placeholder="Search model or description…" autocomplete="off"><div id="mdL"></div>`;document.body.append(dlg);
 const lbl=()=>{const v=form.elements.model.value.trim();btn.innerHTML=`<span class="mdV">${v?esc(v):'— none —'}</span> ▾`;btn.title=v&&MODEL_DESC[v]||'Pick a model'};
 const _mo=modelOpts;modelOpts=async function(...a){const r=await _mo.apply(this,a);lbl();return r};sel.addEventListener('change',lbl);
 async function groups(t){const c=await customModels(),G=[],seen=new Set();const add=(k,n,ms)=>{ms=[...new Set(ms)].filter(Boolean);if(ms.length)G.push({k,n,ms})};
  const ty=Object.keys(TYPES),order=[t,...ty.filter(x=>x!==t)];
  for(const x of order){const S=MODELS[x]||[];add('t:'+x,TYPES[x].n,S);S.forEach(m=>seen.add(m));const C=(c[x]||[]).filter(m=>!S.includes(m));add('c:'+x,TYPES[x].n+' · My models',C)}
  const byC={};for(const p of CATALOG)if(!seen.has(p.m))(byC[p.c||'Other']??=[]).push(p.m);for(const[k,ms]of Object.entries(byC))add('k:'+k,k,ms);
  try{await userParts();add('my','My devices',Object.keys(UPARTS||{}))}catch{}return G}
 async function render(){const t=form.elements.type.value,q=$('#mdQ').value.trim().toLowerCase(),v=form.elements.model.value.trim(),G=await groups(t);
  const row=m=>`<button type="button" class="mdI${m===v?' on':''}" data-m="${esc(m)}"><b>${esc(m)}</b>${MODEL_DESC[m]?`<small>${esc(MODEL_DESC[m])}</small>`:''}${UPARTS&&UPARTS[m]?'<i class="myB">My devices</i>':''}</button>`;
  const hit=m=>!q||m.toLowerCase().includes(q)||(MODEL_DESC[m]||'').toLowerCase().includes(q);
  let h=`<button type="button" class="mdI" data-m=""><b>— none —</b></button><button type="button" class="mdI" data-m="__custom"><b>Custom…</b><small>Type a model not in the list</small></button>`,n=0;
  for(const g of G){const ms=g.ms.filter(hit);if(!ms.length)continue;n+=ms.length;const own=g.k==='t:'+t||g.k==='c:'+t;h+=`<details class="mdG" data-k="${esc(g.k)}"${own||q?' open':''}><summary>${esc(g.n)} <small>${ms.length}</small></summary>${ms.map(row).join('')}</details>`}
  if(q&&!n)h+=`<div class="mdE">No match. Use Custom… to type “${esc(q)}”.</div>`;$('#mdL').innerHTML=h}
 btn.onclick=async()=>{$('#mdQ').value='';await render();dlg.showModal();const o=$('#mdL .mdI.on');if(o)o.scrollIntoView({block:'center'})};
 $('#mdQ').oninput=render;$('#mdX').onclick=()=>dlg.close();
 $('#mdL').onclick=e=>{const b=e.target.closest('.mdI');if(!b)return;const m=b.dataset.m;if(m&&m!=='__custom'&&![...sel.options].some(o=>o.value===m))sel.add(new Option(m,m),sel.options[sel.options.length-1]);sel.value=m;if(m!=='__custom')form.elements.model.value=m;sel.dispatchEvent(new Event('change',{bubbles:true}));if(typeof dsBtnSync==='function')dsBtnSync();lbl();dlg.close()};
 window.mdlRender=render;lbl()})();
$('#dQrBtn').before($('#dDsBtn'));
}catch(e){console.error('14-model-picker.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/15-toolbar-wheels.js =====
try{
// bpm-v89: grouped, labeled toolbar (2 rows on phone) + 3D wheel pickers + Customize (order, accent, theme, density).
// Original controls are MOVED (not cloned) so every existing handler keeps working.
(()=>{const T=$('#tools'),q=s=>T.querySelector(s)||document.querySelector(s);
 const UI=Object.assign({order:['draw','style','edit','pins','review','ref'],acc:'#7e7e7e',theme:'dark',dens:'normal',last:{}},JSON.parse(localStorage.getItem('bpm-ui')||'{}'));
 // bpm-v137: grey theme; the old default blue accent becomes the new grey default (a chosen non-default accent is kept)
 if(UI.acc==='#3b82f6'&&!UI.accSet)UI.acc='#7e7e7e';
 const save=()=>localStorage.setItem('bpm-ui',JSON.stringify(UI));
 const hid=ce('div');hid.id='tbHidden';hid.hidden=true;document.body.append(hid);
 const O=s=>{const e=document.querySelector(s);if(e)hid.append(e);return e};
 const tb=s=>document.querySelector(`[data-t="${s}"]`);
 // ---- list picker ----
 // bpm-v141: every former rolling wheel is a plain list like the Menu (user: "Remove the rolling menu. Make them all like the menu on the top left").
 // Same API as before, so every caller is unchanged: wheelOpen(title,items,cur,cb); wheelAnchor(button). One tap per row, full-word labels, icon beside the label,
 // Back on a list opened from another list, ✕ Close / Escape / tap outside to close, arrow keys move between rows. Destructive lists (Clear pins, Clear markups,
 // Delete pins) still need a second tap on the same row. "Cancel" rows are not shown (✕ Close does that). window.listGroups(title,items) may group rows (Menu).
 const MS=ce('div','mnuOv');MS.id='mnuSheet';MS.hidden=true;MS.setAttribute('role','dialog');MS.setAttribute('aria-modal','true');document.body.append(MS);
 let LASTA=null,PRESS=null,STK=[],pickT=0,CUR=null;
 document.addEventListener('pointerdown',e=>{if(MS.contains(e.target))return;const a=e.target.closest&&e.target.closest('button,summary,label,.btn,select,[data-w]');if(a)LASTA=a},true);
 window.wheelAnchor=a=>{LASTA=a};
 const DESTR=t=>/^(clear (pins|markups)|delete pins)$/i.test(String(t||'').trim());
 const txt=it=>String((it&&(it.l||String(it.html||'').replace(/<[^>]*>/g,'')))||'').trim();
 const isCancel=it=>/^\W*cancel$/i.test(txt(it));
 function close(){MS.hidden=true;MS.innerHTML='';if(PRESS){PRESS.classList.remove('whPressed');PRESS=null}CUR=null}
 window.menuListClose=()=>{close();STK=[]};
 function rowHtml(x,i,on){let ic=x.i||'',lab=esc(x.l||'');if(x.html){const t=document.createElement('div');t.innerHTML=x.html;const e=t.querySelector('.whIc');if(e){ic=`<span style="${esc(e.getAttribute('style')||'')}">${e.innerHTML}</span>`;e.remove()}lab=t.innerHTML.trim()}
  return `<button type="button" role="menuitem" class="btn mnuI${on?' on':''}" data-i="${i}"${on?' aria-current="true"':''}><span class="mnuIc" aria-hidden="true">${ic}</span><span class="tl">${lab}</span></button>`}
 function wheelOpen(title,items,cur,cb){const par=Date.now()-pickT<2500&&STK.length?STK[STK.length-1]:null;if(!par)STK=[];
  const me={title,items,cur,cb,par};CUR=me;const markOn=cur>0||!items.some(x=>typeof x.run==='function');
  const G=(window.listGroups&&window.listGroups(title,items))||[[null,items.map((x,i)=>i)]];
  MS.innerHTML=`<div class="mnuP" role="menu" aria-label="${esc(title)}"><div class="mnuH">${par?'<button type="button" class="btn" id="mnuBack">◀ Back</button>':''}<b class="mnuT">${esc(title)}</b><span class="sp"></span><button type="button" class="btn" id="mnuX">✕ Close</button></div>`+
   `<div class="mnuB">${G.map(([g,ix])=>[g,ix.filter(i=>items[i]&&!isCancel(items[i]))]).filter(g=>g[1].length).map(([g,ix])=>`<section class="mnuG">${g?`<h4>${esc(g)}</h4>`:''}<div class="mnuL">${ix.map(i=>rowHtml(items[i],i,markOn&&i===cur)).join('')}</div></section>`).join('')}</div>`+
   `<div class="mnuCf" role="status" aria-live="polite" hidden>Tap again to confirm</div></div>`;
  MS.hidden=false;if(PRESS)PRESS.classList.remove('whPressed');PRESS=LASTA&&LASTA.isConnected&&!MS.contains(LASTA)?LASTA:null;if(PRESS)PRESS.classList.add('whPressed');
  MS.querySelector('#mnuX').onclick=()=>{close();STK=[]};
  const bk=MS.querySelector('#mnuBack');if(bk)bk.onclick=()=>{const p=me.par;close();STK=p.par?[p.par]:[];pickT=p.par?Date.now():0;wheelOpen(p.title,p.items,p.cur,p.cb)};
  const cf=MS.querySelector('.mnuCf');let pend=null;
  MS.querySelectorAll('.mnuI').forEach(b=>b.onclick=()=>{const i=+b.dataset.i,x=items[i];
   if(DESTR(title)){if(pend!==b){MS.querySelectorAll('.mnuI.pend').forEach(e=>e.classList.remove('pend'));pend=b;b.classList.add('pend');cf.hidden=false;b.after(cf);return}}
   close();pickT=Date.now();STK=[...STK.filter(s=>s!==me),me].slice(-4);cb(x,i)});
  const f=MS.querySelector('.mnuI.on')||MS.querySelector('.mnuI');f&&f.focus({preventScroll:false})}
 MS.addEventListener('pointerdown',e=>{if(e.target===MS){close();STK=[]}});
 addEventListener('keydown',e=>{if(MS.hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();STK=[]}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const B=[...MS.querySelectorAll('.mnuI')],i=B.indexOf(document.activeElement),n=e.key==='ArrowDown'?Math.min(B.length-1,i+1):Math.max(0,i-1);B[n]&&B[n].focus()}},true);
 window.wheelOpen=wheelOpen;window.listOpen=wheelOpen;window.listIsOpen=()=>!MS.hidden;
 // ---- grouped wheel buttons (tap = last pick; tap again or ▾ = wheel) ----
 const mkWheelBtn=(key,label,items,isOn)=>{const b=ce('button','tool tbw');b.type='button';b.dataset.w=key;
  const it=()=>items().find(x=>x.k===UI.last[key])||items()[0],show=()=>{const x=it();b.innerHTML=`${x.i}<span class="tl">${label} ▾</span>`;b.title=label+': '+x.l;b.classList.toggle('on',!!isOn(x))};
  const open=()=>{const L=items();wheelOpen(label,L.map(x=>({...x,html:`<span class="whIc">${x.i}</span>${esc(x.l)}`})),L.indexOf(it()),x=>{UI.last[key]=x.k;save();x.run();show()})};
  b.onclick=e=>{const r=b.getBoundingClientRect(),car=e.clientY>r.bottom-14;const x=it();if(car||isOn(x))open();else{x.run();show()}};b._show=show;show();return b};
 const tool1=(t,i,l)=>({k:t,i,l,run:()=>tb(t).click(),on:()=>tool===t});
 const pill=(k,n,els)=>{const g=ce('div','tbG');g.dataset.g=k;g.append(ce('i','tbN',n),...els.filter(Boolean));return g};
 const zig=tb('zig').querySelector('svg').outerHTML;
 const SH=[tool1('rect','▢','Box'),tool1('rrect','<span class="rrI">▢</span>','Rounded box'),tool1('ellipse','◯','Ellipse'),tool1('arc','◠','Arc'),tool1('tri','△','Triangle'),tool1('poly','⬡','Polygon'),tool1('star','☆','Star'),tool1('cloud','☁','Revision cloud'),tool1('check','✔','Check mark')];
 const LN=[tool1('line','╱','Line'),tool1('arrow','↗','Arrow'),tool1('pen','✒','Pen (curves)'),tool1('free','✍','Freehand'),tool1('zig',zig,'Zigzag'),tool1('measure','📏','Measure')];
 const SEL=[tool1('select','➤','Select'),tool1('pan','✋','Pan')];
 const sizes=()=>[...['S','M','L','XL'].map((s,i)=>({k:'s'+i,i:'≡',l:'Size '+s,run:()=>{$('#size').value=i;$('#size').dispatchEvent(new Event('change',{bubbles:true}))}})),...[25,50,75,100].map(o=>({k:'o'+o,i:'◐',l:'Opacity '+o+'%',run:()=>{$('#opac').value=o;$('#opac').dispatchEvent(new Event('input',{bubbles:true}));$('#opac').dispatchEvent(new Event('change',{bubbles:true}))}})),
  {k:'mag',i:'🧲',l:'Magnet '+($('#mkSnap').classList.contains('on')?'on → off':'off → on'),run:()=>$('#mkSnap').click()}];

 // bpm-v102: Width picker. Same values/behavior as before (#size 0..3 -> SZ px, text SZT font); each option previews its real stroke in the current color.
 const WN=['Thin','Medium','Thick','Extra thick'];
 function mkWidthBtn(){const b=ce('button','tool tbw tbWid');b.type='button';b.dataset.w='width';
  const show=()=>{const i=+$('#size').value||0,c=$('#color').value,w=SZ[i];b.innerHTML=`<svg class="wPv" width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><line x1="3" y1="9" x2="23" y2="9" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/></svg><span class="tl">Width ▾</span>`;b.title=`Line width: ${WN[i]} (${w} px)`;b.setAttribute('aria-label',b.title)};
  b.onclick=()=>widBar(b,show);b._show=show;show();$('#color').addEventListener('input',show);$('#color').addEventListener('change',show);$('#size').addEventListener('change',show);return b}
 /* bpm-v129: Width opens a small bar of three labelled buttons side by side above it: Width and Style each open a wheel, Opacity opens a sliding bar.
  The magnet is no longer repeated here (it is on the main bar). Tap Width again, tap outside or press Escape to close the bar. */
 const LSN=[['solid','Solid'],['dash','Dashed'],['dot','Dotted']];
 const lsSvg=(k,w=24)=>`<svg width="${w}" height="10" viewBox="0 0 ${w} 10" aria-hidden="true"><line x1="3" y1="5" x2="${w-3}" y2="5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="${k==='dash'?'6 4':k==='dot'?'0.1 5':'none'}"/></svg>`;
 let WB=null,WBO=null,WBA=null,WBS=null;
 function wbClose(){if(WB)WB.hidden=true;if(WBO)WBO.hidden=true;if(WBA)WBA.classList.remove('on')}
 function wbPlace(el,a){const r=a.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;el.style.left=Math.round(Math.max(8,Math.min(innerWidth-8-w,r.left+r.width/2-w/2)))+'px';el.style.top=Math.round(Math.max(8,r.top-8-h))+'px'}
 function wbRender(){const i=+$('#size').value||0,c=$('#color').value,ls=window.lineStyle?lineStyle():'solid',op=+$('#opac').value||100;
  WB.innerHTML=`<button type="button" class="btn" data-wb="width" title="Line width: ${WN[i]} (${SZ[i]} px)"><svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7" stroke="${c}" stroke-width="${SZ[i]}" stroke-linecap="round"/></svg><span class="wbL">Width</span></button>`+
   `<button type="button" class="btn" data-wb="style" title="Line style: ${(LSN.find(x=>x[0]===ls)||LSN[0])[1]}">${lsSvg(ls)}<span class="wbL">Style</span></button>`+
   `<button type="button" class="btn${WBO&&!WBO.hidden?' on':''}" data-wb="opacity" title="Opacity: ${op}%"><span aria-hidden="true">◐</span><span class="wbL">Opacity</span></button>`;
  WB.querySelector('[data-wb=width]').onclick=e=>{const a=e.currentTarget,i0=+$('#size').value||0;if(WBO)WBO.hidden=true;wheelAnchor(a);
   wheelOpen('Line width',[...SZ.map((w,k)=>({k,html:`<span class="whIc"><svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/></svg></span>${WN[k]} · ${w} px`})),{k:null,html:'<span class="whIc">✕</span>Cancel'}],i0,x=>{if(!x||x.k==null)return;$('#size').value=x.k;$('#size').dispatchEvent(new Event('change',{bubbles:true}));WBS&&WBS();wbRender()})};
  WB.querySelector('[data-wb=style]').onclick=e=>{const a=e.currentTarget,cur=window.lineStyle?lineStyle():'solid';if(WBO)WBO.hidden=true;wheelAnchor(a);
   wheelOpen('Line style',[...LSN.map(([k,l])=>({k,html:`<span class="whIc">${lsSvg(k)}</span>${l}`})),{k:null,html:'<span class="whIc">✕</span>Cancel'}],Math.max(0,LSN.findIndex(x=>x[0]===cur)),async x=>{if(!x||x.k==null)return;if(window.setLineStyle)await setLineStyle(x.k);wbRender()})};
  WB.querySelector('[data-wb=opacity]').onclick=e=>{const a=e.currentTarget;if(WBO&&!WBO.hidden){WBO.hidden=true;wbRender();return}
   if(!WBO){WBO=ce('div','wbOp');WBO.id='wbOp';WBO.setAttribute('role','group');WBO.setAttribute('aria-label','Opacity');document.body.append(WBO)}
   const o=$('#opac'),v=+o.value||100;WBO.innerHTML=`<span class="wbOL">Opacity</span><input type="range" id="wbOpR" min="${o.min||15}" max="${o.max||100}" step="1" value="${v}" aria-label="Opacity"><b id="wbOpV">${v}%</b>`;WBO.hidden=false;
   const r=WBO.querySelector('#wbOpR');r.oninput=()=>{o.value=r.value;WBO.querySelector('#wbOpV').textContent=r.value+'%';o.dispatchEvent(new Event('input',{bubbles:true}))};r.onchange=()=>{o.dispatchEvent(new Event('change',{bubbles:true}));wbRender()};
   wbRender();wbPlace(WBO,WB)}}
 function widBar(btn,show){WBS=show;WBA=btn;if(WB&&!WB.hidden){wbClose();return}
  if(!WB){WB=ce('div','widBar');WB.id='widBar';WB.setAttribute('role','toolbar');WB.setAttribute('aria-label','Line options');document.body.append(WB);
   document.addEventListener('pointerdown',e=>{if(!WB||WB.hidden)return;const t=e.target;if(WB.contains(t)||(WBO&&WBO.contains(t))||(WBA&&WBA.contains(t))||t.closest&&t.closest('#mnuSheet'))return;wbClose()},true);
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&WB&&!WB.hidden&&document.querySelector('#mnuSheet')?.hidden!==false)wbClose()});addEventListener('resize',()=>{if(WB&&!WB.hidden&&WBA){wbPlace(WB,WBA);if(WBO&&!WBO.hidden)wbPlace(WBO,WB)}})}
  if(WBO)WBO.hidden=true;wbRender();WB.hidden=false;btn.classList.add('on');wbPlace(WB,btn)}
 window.widthSheet=()=>widBar(B.width,B.width._show);document.addEventListener('pointerup',()=>setTimeout(()=>B.width&&B.width._show(),0),true);
 const pinT=()=>Object.entries(TYPES).map(([k,v])=>({k,i:`<span class="tbDot" style="background:${v.c}"></span>`,l:v.n,run:()=>{$('#pinType').value=k;$('#pinType').dispatchEvent(new Event('change',{bubbles:true}));tb('pin').click()}}));
 const more=()=>[{k:'fit',i:'⤢',l:'Fit to screen',run:()=>$('#fit').click()},{k:'del',i:'🗑',l:'Delete selected',run:()=>$('#del').click()},{k:'mag',i:'🧲',l:'Magnet snap '+($('#mkSnap').classList.contains('on')?'(on)':'(off)'),run:()=>$('#mkSnap').click()},{k:'cz',i:'⚙',l:'Customize toolbar',run:()=>openCz()}];
 const share=()=>[{k:'split',i:'⇆',l:'Split for second technician',run:()=>$('#splitBtn').click()},{k:'merge',i:'⇄',l:'Merge returned file',run:()=>$('#mergeBtn').click()}];
 // move originals out of the way
 ['pan','select','rect','rrect','ellipse','arc','tri','poly','star','check','cloud','arrow','line','pen','free','stamp','zig','measure','pin'].forEach(t=>hid.append(tb(t)));['#mkSnap','#pinType','#size','#del','#fit'].forEach(O);const opl=document.querySelector('#tools .opac');if(opl)hid.append(opl);
 const B={shapes:mkWheelBtn('shapes','Shapes',()=>SH,x=>x.on()),lines:mkWheelBtn('lines','Lines',()=>LN,x=>x.on()),width:mkWidthBtn(),
  place:mkWheelBtn('place','Place',pinT,()=>tool==='pin'),select:mkWheelBtn('select','Select',()=>SEL,x=>x.on()),share:mkWheelBtn('share','Share',share,()=>0),more:mkWheelBtn('more','More',more,()=>0)};
 const text=tb('text');hid.append(text);const textB=ce('button','tool','T<span class="tl">Text</span>');textB.type='button';textB.onclick=()=>text.click();
 const col=$('#color');const colW=ce('label','tool tbCol');colW.append(col,ce('span','tl','Color'));
 // bpm-v100: Color sheet: the basic markup colors + every distinct device pin color (read from TYPES, so new types appear automatically) + Custom… (native picker)
 const BASIC=[['#e11d48','Red (default)'],['#f97316','Orange'],['#facc15','Yellow'],['#16a34a','Green'],['#0ea5e9','Light blue'],['#2563eb','Blue'],['#7c3aed','Purple'],['#000000','Black'],['#64748b','Gray'],['#ffffff','White']];
 const colSheet=()=>{let d=$('#colDlg');if(!d){d=ce('dialog');d.id='colDlg';document.body.append(d)}const cur=col.value.toLowerCase(),dev=new Map();
  for(const [k,t] of Object.entries(TYPES)){if(!t.c)continue;const c=t.c.toLowerCase();if(!dev.has(c))dev.set(c,[]);dev.get(c).push(t.n.replace(/ – .*/,''))}
  const sw=(c,lab,names)=>`<button type="button" class="cSw${c.toLowerCase()===cur?' on':''}" data-c="${c}" title="${esc(names||lab)}" aria-label="${esc((names||lab)+' '+c)}"><i style="background:${c}"></i><span class="cSl">${esc(lab)}</span></button>`;
  d.innerHTML=`<div class="cHead"><b>Color</b><span class="sp"></span><button type="button" class="btn" id="cX">✕<span class="tl">Close</span></button></div><div class="cBody"><h4>Markup colors</h4><div class="cGrid">${BASIC.map(([c,l])=>sw(c,l)).join('')}</div>
   <h4>Device colors</h4><div class="cGrid">${[...dev].map(([c,ns])=>{const G=typeof CGRP!=='undefined'&&Object.entries(CGRP).find(([k])=>k.toLowerCase()===c);/* bpm-v106: a shared group color shows once with its group name */return sw(c,G?G[1]:ns.join(', '),(G?G[1]+': ':'')+ns.join(', '))}).join('')}</div>
   <div class="row" style="margin-top:10px"><button type="button" class="btn" id="cCust">🎨<span class="tl">Custom…</span></button></div></div>`;
  const pick=c=>{col.value=c;col.dispatchEvent(new Event('input',{bubbles:true}));col.dispatchEvent(new Event('change',{bubbles:true}));d.close()};
  d.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>pick(b.dataset.c));d.querySelector('#cX').onclick=()=>d.close();d.querySelector('#cCust').onclick=()=>{d.close();col.click()};d.showModal()};
 colW.addEventListener('click',e=>{if(e.target===col&&e.isTrusted===false)return;e.preventDefault();colSheet()});window.colSheet=colSheet;
 const pass=ce('button','tool','✔<span class="tl">Pass</span>');pass.type='button';pass.id='tbPass';pass.onclick=()=>{const it=(msel.length?msel:sel?[sel.o]:[]).filter(isPinO);if(!it.length)return toast('Select pins first (Select ▾), then Pass');bulkPass(it)};
 const walkB=$('#walkBtn');walkB.classList.add('tool');
 const freeB=ce('button','tool tbFree','✍<span class="tl">Freehand</span>');freeB.type='button';freeB.id='tbFree';freeB.title='Freehand (smoothed)';freeB.onclick=()=>tb('free').click();document.addEventListener('click',()=>setTimeout(()=>freeB.classList.toggle('on',tool==='free'),0),true);
 const stampB=ce('button','tool tbStamp','🔖<span class="tl">Stamp</span>');stampB.type='button';stampB.id='tbStamp';stampB.title='Stamp: tap the plan to place';stampB.onclick=()=>tb('stamp').click();document.addEventListener('click',()=>setTimeout(()=>stampB.classList.toggle('on',tool==='stamp'),0),true);
 const G={draw:pill('draw','DRAW',[B.shapes,B.lines,freeB,stampB,textB,$('#cSnap')]),style:pill('style','STYLE',[colW,B.width]),edit:pill('edit','EDIT',[B.more]),
  pins:pill('pins','PINS',[B.place,$('#detBtn'),walkB]),review:pill('review','SELECT',[B.select,pass,B.share]),ref:pill('ref','SHEETS',[$('#dsBtn'),$('#qrTool')])};
 window.TBX={B,pass,freeB,stampB,textB,colW,G,T};/* bpm-v132: the Big task bar (nav132.js) re-homes these same buttons */
 const rest=[...T.children];T.innerHTML='';const r1=ce('div','tbR'),r2=ce('div','tbR');T.append(r1,r2);rest.forEach(e=>hid.append(e));
 // bpm-v102: wide screens (≥800px) show tools from the wheels/menus as direct labeled buttons, group by group, as long as both rows still fit; the rest stay as wheels. Phone unchanged.
 const flat=(x,lab)=>{const b=ce('button','tool tbFlat',`${x.i}<span class="tl">${esc(lab||x.l)}</span>`);b.type='button';b.title=x.l;b.onclick=()=>{x.run();setTimeout(flatSync,0)};b._x=x;return b};
 const SHORT={rect:'Box',ellipse:'Circle',cloud:'Cloud',check:'Check',line:'Line',arrow:'Arrow',zig:'Zigzag',measure:'Measure',select:'Select',pan:'Pan',fit:'Fit',del:'Delete',mag:'Magnet',cz:'Customize',tlay:'Layers ▾',split:'Split',merge:'Merge'};
 const EXP=[['shapes',()=>SH],['lines',()=>LN],['select',()=>SEL],['share',share],['more',more]];
 function flatSync(){window.tlayMark&&tlayMark();document.querySelectorAll('#tools .tbFlat').forEach(b=>{const x=b._x;b.classList.toggle('on',!!(x.on&&x.on()))})}
 const WMQ=matchMedia('(min-width:800px)');const FL={};
 const ensure=k=>{if(FL[k])return FL[k];const w=B[k];FL[k]=EXP.find(e=>e[0]===k)[1]().filter(x=>x.k!=='free').map(x=>{const f=flat(x,SHORT[x.k]);f.hidden=true;return f});w.after(...FL[k]);return FL[k]};
 const setExp=(k,on)=>{const f=ensure(k);B[k].hidden=on;f.forEach(b=>b.hidden=!on)};
 function place(){const o=UI.order.filter(k=>G[k]).concat(Object.keys(G).filter(k=>!UI.order.includes(k)));r1.replaceChildren(...o.map(k=>G[k]),...(window.TB_EXTRA||[]));r2.replaceChildren();r2.hidden=true;fade()}
 // bpm-v102: ONE row everywhere; scrolls horizontally (momentum) with an edge fade where it doesn't fit
 function fade(){const L=r1.scrollLeft>2,R=r1.scrollLeft+r1.clientWidth<r1.scrollWidth-2;r1.classList.toggle('fL',L);r1.classList.toggle('fR',R)}r1.addEventListener('scroll',fade,{passive:true});
 const fits=()=>r1.scrollWidth<=r1.clientWidth+1;
 function layout(){if(window.navLayout){window.navLayout();return}place();const wide=WMQ.matches;T.classList.toggle('tbWide',wide);const exp=[];for(const [k] of EXP)setExp(k,false);
  if(wide)for(const [k] of EXP){setExp(k,true);if(fits())exp.push(k);else setExp(k,false)}flatSync();T.dataset.exp=exp.join(',');fade()}
 window.tbLayout=layout;WMQ.addEventListener('change',layout);let lrT=0;new ResizeObserver(()=>{clearTimeout(lrT);lrT=setTimeout(layout,120)}).observe(T);document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#tools,.wh'))setTimeout(flatSync,0)},true);
 layout();T.classList.add('tbNew');
 const refresh=()=>Object.values(B).forEach(b=>b._show());document.addEventListener('click',()=>setTimeout(refresh,0),true);new MutationObserver(()=>refresh()).observe(hid,{subtree:true,attributes:true,attributeFilter:['class']});
 // ---- theme / accent / density ----
 function applyUI(){const r=document.documentElement;r.style.setProperty('--acc',UI.acc);const dark=UI.theme==='dark'||(UI.theme==='auto'&&!matchMedia('(prefers-color-scheme: light)').matches);document.body.classList.toggle('light',!dark);document.body.classList.toggle('dense',UI.dens==='compact');dispatchEvent(new Event('resize'))}
 applyUI();matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',applyUI);
 const cz=ce('dialog');cz.id='czDlg';document.body.append(cz);
 function openCz(){const N={draw:'✏ Draw',style:'🎨 Style',edit:'↶ Edit',pins:'📍 Pins',review:'✔ Review',ref:'📄 Reference'},AC=['#7e7e7e','#3b82f6','#22c55e','#f97316','#e11d48','#a855f7','#14b8a6'];
  cz.innerHTML=`<h3 style="margin:4px 0">⚙ Customize</h3><div id="czL"${window.navLayout?' hidden':''}><small style="color:var(--mu2)">Order of groups (first 3 = row 1). Saved on this device.</small>${UI.order.map((k,i)=>`<div class="czI"><span>${N[k]}</span><span class="sp"></span><button type="button" class="btn" data-up="${i}"${i?'':' disabled'}>▲ Up</button><button type="button" class="btn" data-dn="${i}"${i<UI.order.length-1?'':' disabled'}>▼ Down</button></div>`).join('')}</div>
  <b>Accent</b><div class="czA">${AC.map(c=>`<button type="button" class="czS${c===UI.acc?' on':''}" data-acc="${c}" style="background:${c}" aria-label="Accent ${c}"><span class="tl">${c===UI.acc?'✓':'&nbsp;'}</span></button>`).join('')}<label class="btn">Custom<input type="color" id="czAc" value="${UI.acc}"></label></div>
  <b>Theme</b><div class="row">${['dark','light','auto'].map(t=>`<button type="button" class="btn${UI.theme===t?' pri':''}" data-th="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <b>Density</b><div class="row">${['compact','normal'].map(t=>`<button type="button" class="btn${UI.dens===t?' pri':''}" data-dn2="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <div class="row"><button type="button" class="btn" id="czR">Reset</button><span class="sp"></span><button type="button" class="btn pri" id="czX">Done</button></div>`;
  const upd=()=>{save();layout();applyUI();openCz()};
  cz.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const i=+b.dataset.up;[UI.order[i-1],UI.order[i]]=[UI.order[i],UI.order[i-1]];upd()});
  cz.querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>{const i=+b.dataset.dn;[UI.order[i+1],UI.order[i]]=[UI.order[i],UI.order[i+1]];upd()});
  cz.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{UI.acc=b.dataset.acc;UI.accSet=1;upd()});cz.querySelector('#czAc').onchange=e=>{UI.acc=e.target.value;UI.accSet=1;upd()};
  cz.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{UI.theme=b.dataset.th;upd()});cz.querySelectorAll('[data-dn2]').forEach(b=>b.onclick=()=>{UI.dens=b.dataset.dn2;upd()});
  cz.querySelector('#czR').onclick=()=>{UI.order=['draw','style','edit','pins','review','ref'];UI.acc='#7e7e7e';delete UI.accSet;UI.theme='dark';UI.dens='normal';upd()};cz.querySelector('#czX').onclick=()=>cz.close();if(!cz.open)cz.showModal()}
 window.openCz=openCz;
 const czB=ce('button','btn','⚙<span class="tl">Customize</span>');czB.type='button';czB.id='czBtn';czB.title='Customize toolbar';czB.onclick=openCz;$('#top').append(czB);
})();
}catch(e){console.error('15-toolbar-wheels.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/16-guides.js =====
try{
// bpm-v90: offline Guides panel. Every figure below carries its source link; no other numbers are stated.
(()=>{
const S={
 iec:['IEC 60062 (resistor colour code)','https://webstore.iec.ch/publication/24233'],
 xtri:['Siemens XTRI-S/D/R Installation Instructions A6V101055479','https://sid.siemens.com/r/A6V101055479/32659825931___en-US_32659819403'],
 tri:['Siemens TRI-S/D/R Installation Instructions (copy)','https://firealarmresources.com/siemens-cerberus-pyrotronics/siemens-tri-s-tri-d-tri-r-addressable-interface-modules-installation-instruction/'],
 htri:['Siemens HTRI-M Installation Instructions','https://sid.siemens.com/api/khub/documents/f1d3yj5RteO5FSi6D2loIQ/content'],
 pad3:['Siemens FACP Accessories data sheet (PAD-3)','https://sid.siemens.com/api/khub/documents/u7u0PW161R6RzwZinvnBdA/content'],
 tm:['Siemens Desigo Fire Safety Modular Operation Manual A6V11231620 – Trouble Messages','https://sid.siemens.com/r/A6V11231620/21774530443_31188591243__en-US_25271540491']};
window.gCite=h=>h.replace(/\[(\w+)\]/g,(m,x)=>S[x]?`<sup><a href="${S[x][1]}" target="_blank" rel="noopener" title="${esc(S[x][0])}">[${x}]</a></sup>`:m);
const src=(...k)=>`<div class="gSrc">Sources: ${k.map(x=>`<a href="${S[x][1]}" target="_blank" rel="noopener">${esc(S[x][0])}</a>`).join(' · ')}</div>`;
const CC=[['black',0,1],['brown',1,10,'1%'],['red',2,100,'2%'],['orange',3,1e3],['yellow',4,1e4],['green',5,1e5,'0.5%'],['blue',6,1e6,'0.25%'],['violet',7,1e7,'0.1%'],['grey',8,1e8,'0.05%'],['white',9,1e9],['gold',null,.1,'5%'],['silver',null,.01,'10%']];
const TCR={brown:'100 ppm/K',red:'50 ppm/K',orange:'15 ppm/K',yellow:'25 ppm/K',blue:'10 ppm/K',violet:'5 ppm/K'};
const HEX={black:'#000',brown:'#7c3f00',red:'#dc2626',orange:'#f97316',yellow:'#facc15',green:'#16a34a',blue:'#2563eb',violet:'#7c3aed',grey:'#9ca3af',white:'#fff',gold:'#c9a227',silver:'#c0c0c0'};
const fmtR=v=>v>=1e6?+(v/1e6).toPrecision(4)+' MΩ':v>=1e3?+(v/1e3).toPrecision(4)+' kΩ':+v.toPrecision(4)+' Ω';
function resistor(){const st={n:4,b:['brown','black','red','gold','brown','brown']};
 const el=ce('div','gBody');const draw=()=>{const n=st.n,dig=n===4?2:3,b=st.b;
  const sel=(i,opts)=>`<select data-b="${i}">${opts.map(c=>`<option${b[i]===c?' selected':''}>${c}</option>`).join('')}</select>`;
  const D=CC.filter(c=>c[1]!=null).map(c=>c[0]),M=CC.map(c=>c[0]),T=CC.filter(c=>c[3]).map(c=>c[0]);
  const parts=[];for(let i=0;i<dig;i++)parts.push(sel(i,D));parts.push(sel(dig,M));parts.push(sel(dig+1,T));if(n===6)parts.push(sel(dig+2,Object.keys(TCR)));
  let v=0;for(let i=0;i<dig;i++)v=v*10+CC.find(c=>c[0]===b[i])[1];v*=CC.find(c=>c[0]===b[dig])[2];const tol=CC.find(c=>c[0]===b[dig+1])?.[3]||'?';
  el.innerHTML=gCite(`<div class="row">${[4,5,6].map(k=>`<button type="button" class="btn${k===n?' pri':''}" data-n="${k}">${k} bands</button>`).join('')}</div>
  <svg viewBox="0 0 300 70" class="gRes"><line x1="0" y1="35" x2="300" y2="35" stroke="#94a3b8" stroke-width="4"/><rect x="60" y="12" width="180" height="46" rx="20" fill="#e7d3a8"/>${b.slice(0,n).map((c,i)=>`<rect x="${78+i*(140/(n))}" y="12" width="12" height="46" fill="${HEX[c]}" stroke="#0003"/>`).join('')}</svg>
  <div class="row gSel">${parts.join('')}</div><div class="gBig">${fmtR(v)} ±${tol}${n===6?' · '+TCR[b[dig+2]]:''}</div>
  <h4>Value → bands</h4><div class="row"><input id="gRv" placeholder="e.g. 470, 4.7k, 24k" style="max-width:160px"><button type="button" class="btn" id="gRgo">Show bands</button></div><div id="gRo"></div>
  <h4>Siemens EOL / supervision resistors (from Siemens docs)</h4><table class="gT"><tr><th>Device</th><th>EOL</th><th>Note</th></tr>
  <tr><td>XTRI-S / XTRI-D / XTRI-R inputs</td><td>470 Ω, 1%, ½ W (P/N A5Q00073045)</td><td>At last switch; TB-EOL S54322-F4-A2 [xtri]</td></tr>
  <tr><td>TRI-S / TRI-D / TRI-R inputs</td><td>470 Ω, ¼ W (P/N 140-820164)</td><td>At last switch; EL-30/31 plate [tri]</td></tr>
  <tr><td>HTRI-M</td><td>470 Ω, ¼ W (P/N 140-820164)</td><td>Ground fault detected &lt;25 kΩ on orange terminals [htri]</td></tr>
  <tr><td>PAD-3 NAC outputs</td><td>24 kΩ on each Class B circuit</td><td>[pad3]</td></tr></table>
  <small>Desigo FC20xx panel NAC EOL value: not stated in the documents reviewed; check the panel's installation manual. Always use the EOL value printed in the specific device's install sheet.</small>
  ${src('iec','xtri','tri','htri','pad3')}`);
  el.querySelectorAll('[data-n]').forEach(x=>x.onclick=()=>{st.n=+x.dataset.n;draw()});el.querySelectorAll('[data-b]').forEach(s=>s.onchange=()=>{st.b[+s.dataset.b]=s.value;draw()});
  el.querySelector('#gRgo').onclick=()=>{const m=String(el.querySelector('#gRv').value).trim().toLowerCase().match(/^([\d.]+)\s*([kmr]?)/);if(!m)return;let v=parseFloat(m[1])*(m[2]==='k'?1e3:m[2]==='m'?1e6:1);const out=[];
   for(const d of [2,3]){const e=Math.floor(Math.log10(v))-(d-1);const sig=Math.round(v/10**e);if(sig>=10**d)continue;const mult=CC.find(c=>Math.abs(c[2]-10**e)<1e-9*10**e);if(!mult)continue;const ds=String(sig).padStart(d,'0').split('').map(x=>CC[+x][0]);
    out.push(`<div><b>${d+2}-band:</b> ${[...ds,mult[0],'gold (±5%) / brown (±1%)'].map(c=>`<span class="gChip" style="--c:${HEX[c.split(' ')[0]]||'#555'}">${c}</span>`).join(' ')}</div>`)}
   el.querySelector('#gRo').innerHTML=out.join('')||'No exact band code for that value.'}};draw();return el}
// bpm-v100: Ohm's law power wheel. Enter any 2 of V/I/R/P (with units); the other 2 show instantly, and the formula used lights up on the wheel.
function ohm(){const el=ce('div','gBody ohmW');
 const Q={V:{n:'Voltage',u:[['mV',1e-3],['V',1]],d:1},I:{n:'Current',u:[['mA',1e-3],['A',1]],d:0},R:{n:'Resistance',u:[['Ω',1],['kΩ',1e3],['MΩ',1e6]],d:0},P:{n:'Power',u:[['mW',1e-3],['W',1]],d:1}};
 // formula for each unknown from each known pair (key = sorted pair)
 const F={V:{IR:['I × R',(v)=>v.I*v.R],IP:['P ÷ I',v=>v.P/v.I],PR:['√(P × R)',v=>Math.sqrt(v.P*v.R)]},I:{RV:['V ÷ R',v=>v.V/v.R],PV:['P ÷ V',v=>v.P/v.V],PR:['√(P ÷ R)',v=>Math.sqrt(v.P/v.R)]},
  R:{IV:['V ÷ I',v=>v.V/v.I],PV:['V² ÷ P',v=>v.V*v.V/v.P],IP:['P ÷ I²',v=>v.P/(v.I*v.I)]},P:{IV:['V × I',v=>v.V*v.I],RV:['V² ÷ R',v=>v.V*v.V/v.R],IR:['I² × R',v=>v.I*v.I*v.R]}};
 const POS={V:[0,'top'],I:[90,'right'],R:[180,'bottom'],P:[270,'left']};
 const arc=(a0,a1,r0,r1)=>{const p=(a,r)=>[200+r*Math.sin(a*Math.PI/180),200-r*Math.cos(a*Math.PI/180)].map(x=>x.toFixed(1)).join(',');return`M${p(a0,r1)}A${r1},${r1} 0 0 1 ${p(a1,r1)}L${p(a1,r0)}A${r0},${r0} 0 0 0 ${p(a0,r0)}Z`};
 el.innerHTML=`<svg viewBox="0 0 400 400" class="ohmSvg" role="group" aria-label="Ohm's law wheel">${Object.entries(POS).map(([k,[a]])=>`<path class="ohmQ" data-q="${k}" d="${arc(a-44,a+44,62,196)}"/>`).join('')}
  <circle cx="200" cy="200" r="58" class="ohmHub"/><text x="200" y="210" class="ohmHubT" text-anchor="middle">V·I·R·P</text>
  ${Object.entries(POS).map(([k,[a]])=>{const r=128,x=200+r*Math.sin(a*Math.PI/180),y=200-r*Math.cos(a*Math.PI/180);return`<g class="ohmL" data-q="${k}"><text x="${x}" y="${y-22}" text-anchor="middle" class="ohmK">${k}</text><text x="${x}" y="${y+10}" text-anchor="middle" class="ohmV" data-v="${k}">—</text><text x="${x}" y="${y+36}" text-anchor="middle" class="ohmF" data-f="${k}"></text></g>`}).join('')}</svg>
  <div class="ohmMsg" id="ohmMsg">Tap a quadrant or a box and enter any 2 values.</div>
  <div class="ohmIn">${Object.entries(Q).map(([k,q])=>`<label class="ohmRow" data-r="${k}"><span class="ohmLab"><b>${k}</b> ${q.n}</span><input data-k="${k}" inputmode="decimal" enterkeyhint="next" autocomplete="off" aria-label="${q.n}"><select data-u="${k}" aria-label="${q.n} unit">${q.u.map(([u],i)=>`<option value="${i}"${i===q.d?' selected':''}>${u}</option>`).join('')}</select></label>`).join('')}</div>
  <div class="row ohmBtns"><button type="button" class="btn" id="gOx">✕<span class="tl">Clear</span></button></div>
  <h4>Fire alarm presets</h4><div class="ohmPre">
   <button type="button" class="btn" data-p="V:24:1">24 V<span class="tl">24 V NAC (nominal)</span></button>
   <button type="button" class="btn" data-p="V:12:1">12 V<span class="tl">12 V (nominal)</span></button>
   <button type="button" class="btn" data-p="R:470:0">470 Ω<span class="tl">XTRI/TRI input EOL [xtri][tri]</span></button>
   <button type="button" class="btn" data-p="R:24:1">24 kΩ<span class="tl">PAD-3 Class B NAC EOL [pad3]</span></button></div>
  <small>Always use the EOL value printed in the specific device's install sheet. Ohm's law V = I·R; power P = V·I.</small>${src('xtri','tri','pad3')}`;
 const inp=k=>el.querySelector(`[data-k=${k}]`),uni=k=>el.querySelector(`[data-u=${k}]`),mul=k=>Q[k].u[+uni(k).value][1];
 let order=[];// last two keys the user typed
 const fmt=(k,v)=>{if(!isFinite(v))return'—';const us=Q[k].u;let u=us[0];for(const x of us)if(Math.abs(v)>=x[1]*.9999)u=x;const n=v/u[1],a=Math.abs(n),s=a>=100?n.toFixed(1):a>=10?n.toFixed(2):n.toFixed(3);return(+s).toString()+' '+u[0]};
 const val=k=>{const t=inp(k).value.trim().replace(',','.');if(!t)return null;const v=parseFloat(t);return isFinite(v)&&v>0?v*mul(k):NaN};
 const calc=()=>{const kn=order.filter(k=>val(k)!=null).slice(-2),v={};el.querySelectorAll('.ohmQ,.ohmL,.ohmRow').forEach(x=>x.classList.remove('known','calc'));el.querySelectorAll('[data-f]').forEach(x=>x.textContent='');
  for(const k of 'VIRP'){const x=val(k);if(kn.includes(k)){v[k]=x;el.querySelector(`[data-v=${k}]`).textContent=isFinite(x)?fmt(k,x):'?';el.querySelectorAll(`[data-q=${k}],[data-r=${k}]`).forEach(e=>e.classList.add('known'))}}
  const msg=el.querySelector('#ohmMsg');if(kn.length<2||kn.some(k=>!isFinite(v[k]))){for(const k of 'VIRP')if(!kn.includes(k)){el.querySelector(`[data-v=${k}]`).textContent='—';if(order.length<2||!kn.includes(k))inp(k).placeholder=''}msg.textContent=kn.some(k=>!isFinite(v[k]))?'Enter a number above 0.':kn.length?'Enter one more value.':'Tap a quadrant or a box and enter any 2 values.';return}
  const key=kn.slice().sort().join('');const used=[];for(const k of 'VIRP'){if(kn.includes(k))continue;const [f,fn]=F[k][key];const r=fn(v);el.querySelector(`[data-v=${k}]`).textContent=fmt(k,r);el.querySelector(`[data-f=${k}]`).textContent=k+' = '+f;inp(k).value='';inp(k).placeholder=fmt(k,r);el.querySelectorAll(`[data-q=${k}],[data-r=${k}]`).forEach(e=>e.classList.add('calc'));used.push(k+' = '+f)}
  msg.textContent='From '+kn.join(' and ')+': '+used.join(' · ')};
 for(const k of 'VIRP'){inp(k).oninput=()=>{order=order.filter(x=>x!==k);if(inp(k).value.trim())order.push(k);calc()};uni(k).onchange=calc}
 el.querySelectorAll('.ohmQ,.ohmL').forEach(q=>q.onclick=()=>{const k=q.dataset.q;if(!order.includes(k)&&order.length>=2){const drop=order.shift();inp(drop).value=''}inp(k).focus()});
 el.querySelector('#gOx').onclick=()=>{order=[];for(const k of 'VIRP'){inp(k).value='';inp(k).placeholder='';uni(k).value=Q[k].d}calc()};
 el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const [k,n,u]=b.dataset.p.split(':');inp(k).value=n;uni(k).value=u;order=order.filter(x=>x!==k);order.push(k);if(order.length>2){const drop=order.shift();inp(drop).value=''}calc()});
 calc();return el}
const H=(h)=>()=>ce('div','gBody',h);
function trouble(){const el=ce('div','gBody');el.innerHTML=`<input id="gTq" type="search" placeholder="Search trouble message…" style="width:100%"><div id="gTl">Loading…</div>${src('tm')}<small>Messages and descriptions are quoted from the Siemens manual above (Desigo Fire Safety Modular). FC-series (FC2025/FC2050) message texts are not included yet.</small>`;
 // bpm-v102: same sourced entries, regrouped by kind of trouble (keyword rules on the quoted text; nothing added).
 const TC=[['gf','⏚','Ground fault',/\bground/i],['oth','⚙','Configuration / other',/printer|tamper|reset operation|expansion card|invalid parameter|config(uration)? (fault|error|mismatch)|cfg mismatch|mismatch/i],['sup','🟨','Supervisory / disabled',/supervisory|^disarmed|^disabled: manual|^disabled: invalid/i],['pwr','🔋','Power / AC / battery',/\bac\b|battery|charger|supply|power|voltage|brownout|overcurrent|fuse/i],
  ['com','📡','Communication / network / dialer',/comm|network|dialer|dnet|hnet|xnet|can bus|asi|voip|media adapter|ring|not responding|responding|mdact/i],['wir','〰','Open / short / wiring (SLC / NAC)',/\bopen|short|class a|isolator|wiring|\bnac\b|\bline\b/i],
  ['dev','🧩','Device / module trouble',/dev\.|device|detector|det\.|module|base|board|ram|rom|fpga|led|iec|input|ntc|mic|signal|software|supervision|hw fail/i],['oth2','⚙','Configuration / other',/./]];
 const cat=([a,b])=>{const k=(TC.find(c=>c[0]!=='oth2'&&c[3].test(a))||TC.find(c=>c[3].test(b)))[0];return k==='oth2'?'oth':k};
 fetch('guides-trouble.json').then(r=>r.json()).then(L=>{const G=['gf','wir','pwr','com','dev','sup','oth'].map(k=>TC.find(c=>c[0]===k)).map(c=>[c,L.filter(e=>cat(e)===c[0])]).filter(g=>g[1].length);const shut=new Set();
  const r=()=>{const q=el.querySelector('#gTq').value.toLowerCase(),M=G.map(([c,l])=>[c,l.filter(([a,b])=>!q||(a+' '+b).toLowerCase().includes(q))]).filter(g=>g[1].length);
   el.querySelector('#gTl').innerHTML=`<div class="gTJ">${M.map(([c,l])=>`<button type="button" class="btn gTC" data-j="${c[0]}">${c[1]} ${esc(c[2])} <b>${l.length}</b></button>`).join('')}</div>`+(M.map(([c,l])=>`<details class="gTS" id="gts-${c[0]}"${q||!shut.has(c[0])?' open':''}><summary><h4>${c[1]} ${esc(c[2])} <small>(${l.length})</small></h4></summary><table class="gT"><tr><th>Message</th><th>Meaning (Siemens)</th></tr>${l.map(([a,b])=>`<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}</table></details>`).join('')||'<p>No match.</p>');
   el.querySelectorAll('.gTS').forEach(d=>d.ontoggle=()=>{if(!q){const k=d.id.slice(4);d.open?shut.delete(k):shut.add(k)}});
   el.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{const d=el.querySelector('#gts-'+b.dataset.j);d.open=true;d.scrollIntoView({block:'start',behavior:'smooth'})})};
  el.querySelector('#gTq').oninput=r;r()}).catch(()=>el.querySelector('#gTl').textContent='Not available offline yet — open once while online.');return el}
const GUIDES=[['res','🎨','Resistor codes',resistor],['trb','⚠','Trouble codes',trouble],['ohm','Ω','Ohm\'s law',ohm],['sym','🔣','Symbols',()=>window.symbolGuide?window.symbolGuide():ce('div','gBody','Loading…')]];
const d=ce('dialog');d.id='gDlg';d.innerHTML=`<div class="gHead"><b>📘 Guides</b><span class="sp"></span><button type="button" class="btn" id="gX">✕ Close</button></div><div class="gTabs">${GUIDES.map(([k,i,n])=>`<button type="button" class="btn" data-g="${k}">${i}<span class="tl">${esc(n)}</span></button>`).join('')}</div><div id="gC"></div>`;document.body.append(d);
const show=k=>{const g=GUIDES.find(x=>x[0]===k)||GUIDES[0];d.querySelectorAll('[data-g]').forEach(b=>b.classList.toggle('pri',b.dataset.g===g[0]));const c=$('#gC');c.innerHTML='';const b=g[3]();b.innerHTML=b.innerHTML.replace(/\[(\w+)\]/g,(m,x)=>S[x]?`<sup><a href="${S[x][1]}" target="_blank" rel="noopener" title="${esc(S[x][0])}">[${x}]</a></sup>`:m);c.append(b);localStorage.setItem('bpm-guide',g[0])};
// re-run interactive builders after the citation rewrite keeps listeners only for string guides; interactive ones attach listeners on elements, so rebind by rebuilding:
const showI=k=>{const g=GUIDES.find(x=>x[0]===k)||GUIDES[0];if(['res','ohm','trb','sym'].includes(g[0])){d.querySelectorAll('[data-g]').forEach(b=>b.classList.toggle('pri',b.dataset.g===g[0]));const c=$('#gC');c.innerHTML='';const el=g[3]();if(g[0]==='ohm')el.querySelectorAll('.tl,small').forEach(x=>x.innerHTML=window.gCite(x.innerHTML));c.append(el);localStorage.setItem('bpm-guide',g[0])}else show(k)};
d.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>showI(b.dataset.g));d.querySelector('#gX').onclick=()=>d.close();
window.openGuides=k=>{showI(k||localStorage.getItem('bpm-guide')||'res');d.showModal()};
// own button on the main toolbar (separate HELP group)
const b=ce('button','tool','📘<span class="tl">Guides</span>');b.type='button';b.id='guidesBtn';b.title='Field guides (offline)';b.onclick=()=>openGuides();
const g=ce('div','tbG');g.dataset.g='help';g.append(ce('i','tbN','HELP'),b);(window.TB_EXTRA??=[]).push(g);if(window.tbLayout)tbLayout();else $('#tools').append(g);
})();
}catch(e){console.error('16-guides.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/17-symbol-legend.js =====
try{
// bpm-v90: master symbol legend (IndexedDB meta 'symMaster'), legend scan on plan open, tap-to-teach,
// and template matchers for Detect. Matches are returned as ordinary detector items (existing det type for the
// chosen device group), so they flow through the unchanged bpm-v50 items → ghosts → accept path (geometry, outset, de-overlap).
(()=>{
 let M=null;/* bpm-v136: the master legend no longer ships seeded symbol images (they were cut from project plans). It starts empty and is filled
    by legend scans and tap-to-teach on this device; anything already on this device is kept. */
 const seedIn=async L=>L;
 const load=async()=>M??=await seedIn((await get('meta','symMaster'))||[]),save=async()=>{await put('meta',M,'symMaster')};window.symMaster=async()=>(await load()).slice();
 const dgOf=t=>Object.keys(DG).find(k=>DG[k].t===t),detOf=g=>Object.keys(D2G).find(k=>D2G[k]===g);
 const KW=[/* bpm-v106 (more specific first) */[/fire ?fighter.{0,4}s?.{0,3}(tele)?phone|fire ?fighter.{0,12}jack|phone jack|telephone jack|\bfft\b|warden station/i,'ffphone'],[/vesda.*(power supply|psu)/i,'vpsu'],[/capillary/i,'vcap'],[/sampling (point|hole)/i,'vsp'],[/sampling tee|\btee\b/i,'vtee'],[/laser ?focus/i,'vlf'],[/vesda.*(network|interface|hli)/i,'vnet'],[/vesda.*remote|remote (display|enclosure).*vesda/i,'vrem'],[/vesda|aspirat/i,'vesda'],[/multi.?criteria|multi.?sensor/i,'multi'],[/smoke control station|firefighter.?s? smoke control|\bfscs\b/i,'scs'],[/local operator console|\bloc\b/i,'loc'],[/operator safety switch/i,'oss'],[/(fire|smoke|fire\/smoke).?damper|\bdamper\b/i,'damper'],[/backflow/i,'bfp'],[/pull ?box/i,'pullbox'],[/\bpad-?[45]\b|power (expander|booster|extender)|nac (extender|expander|power)/i,'pad'],[/low.?frequency|520 ?hz/i,'lfs'],[/\bbell\b/i,'bell'],[/end.of.line|\beol\b/i,'eol'],[/\bfarp\b|remote (fire alarm )?(control )?panel/i,'farp'],[/\bfaap\b/i,'panelbox'],[/speaker.?strobe|spkr.?strobe/i,'spkstrobe'],[/horn.?strobe/i,'horn'],[/line.?array|column/i,'linearray'],[/speaker|spkr/i,'speaker'],[/smoke|photo|ionization|fireprint/i,'smoke'],[/duct/i,'duct'],[/heat|thermal|rate.of.rise/i,'heat'],[/pull|manual station|manual pull/i,'pull'],[/speaker.?strobe|spkr.?strobe/i,'spkstrobe'],[/line.?array|column/i,'linearray'],[/horn|sounder|chime/i,'horn'],[/strobe|visual/i,'strobe'],[/flow/i,'flow'],[/tamper|valve|supervisory switch/i,'tamper'],[/door holder|magnetic/i,'doorholder'],[/relay/i,'relay'],[/monitor|module|interface|control module/i,'module'],[/junction|j-?box/i,'jbox'],[/surge|tvss|spd/i,'surge'],[/annunciator/i,'panelbox'],[/remote (alarm )?(indicator|led|lamp)/i,'rai'],[/dact|communicator|dialer|communication transmitter/i,'dact'],[/terminal cabinet|fatc/i,'fatc'],[/control panel|facp/i,'panel']];
 const guess=s=>(KW.find(([r])=>r.test(s))||[0,''])[1];
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 // ---- rendering + grayscale helpers ----
 async function render(pg,s,R){const v1=pg.getViewport({scale:1});R=R||{x:0,y:0,w:v1.width,h:v1.height};R={x:Math.max(0,R.x),y:Math.max(0,R.y),w:Math.min(v1.width-Math.max(0,R.x),R.w),h:Math.min(v1.height-Math.max(0,R.y),R.h)};const vp=pg.getViewport({scale:s,offsetX:-R.x*s,offsetY:-R.y*s}),c=document.createElement('canvas');c.width=Math.ceil(R.w*s);c.height=Math.ceil(R.h*s);c._ox=R.x;c._oy=R.y;const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:x,viewport:vp}).promise;return c}
 const grayOf=(c,x=0,y=0,w=c.width,h=c.height)=>{const d=c.getContext('2d',{willReadFrequently:true}).getImageData(x,y,w,h).data,g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=255-(d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114);return{g,w,h}};
 function inkBox(G,th=60){let x0=G.w,y0=G.h,x1=-1,y1=-1,n=0;for(let y=0;y<G.h;y++)for(let x=0;x<G.w;x++)if(G.g[y*G.w+x]>th){n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}return n<6?null:{x0,y0,x1,y1,n}}
 function mainBox(G,th=60){const W=G.w,H=G.h,lab=new Int32Array(W*H).fill(-1),cs=[];for(let i=0;i<W*H;i++){if(G.g[i]<=th||lab[i]>=0)continue;const st=[i],b={x0:W,y0:H,x1:-1,y1:-1,n:0};lab[i]=cs.length;while(st.length){const j=st.pop(),x=j%W,y=(j/W)|0;b.n++;if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const k=Y*W+X;if(lab[k]<0&&G.g[k]>th){lab[k]=cs.length;st.push(k)}}}cs.push(b)}
  if(!cs.length)return null;const A=b=>(b.x1-b.x0+1)*(b.y1-b.y0+1),m={...cs.sort((a,b)=>A(b)-A(a))[0]};for(const b of cs)if(b.x0>=m.x0-1&&b.x1<=m.x1+1&&b.y0>=m.y0-1&&b.y1<=m.y1+1)continue;else if(b.n>3&&b.x0>=m.x0&&b.x1<=m.x1&&b.y0>=m.y0&&b.y1<=m.y1){}
  return A(m)<30?null:m}
 const b64=u=>{let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s)},unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 // crop a symbol at page scale S (px per pt) around a pt-rect; tighten to ink; returns {img,tpl,bb}
 function crop(c,S,r){r={...r,x:r.x-(c._ox||0),y:r.y-(c._oy||0)};const x=Math.max(0,Math.floor(r.x*S)),y=Math.max(0,Math.floor(r.y*S)),w=Math.min(c.width-x,Math.ceil(r.w*S)),h=Math.min(c.height-y,Math.ceil(r.h*S));if(w<4||h<4)return null;
  const G=grayOf(c,x,y,w,h),b=mainBox(G);if(!b)return null;const p=2,X=Math.max(0,b.x0-p),Y=Math.max(0,b.y0-p),W=Math.min(w-X,b.x1-b.x0+1+2*p),H=Math.min(h-Y,b.y1-b.y0+1+2*p);if(W<5||H<5)return null;
  const o=document.createElement('canvas');o.width=W;o.height=H;o.getContext('2d').drawImage(c,x+X,y+Y,W,H,0,0,W,H);const T=grayOf(o),u=new Uint8Array(W*H);for(let i=0;i<u.length;i++)u[i]=T.g[i];
  return{img:o.toDataURL('image/png'),tpl:{w:W,h:H,s:S,g:b64(u)},bb:{x:(x+X)/S+(c._ox||0),y:(y+Y)/S+(c._oy||0),w:W/S,h:H/S}}}
 // ---- legend scan ----
 async function scanLegend(doc,pages){const out=[],have=new Set((await load()).map(m=>norm(m.name)));const S=3;
  for(const n of pages){const pg=await doc.getPage(n),vp=pg.getViewport({scale:1});let tc;try{tc=await pg.getTextContent()}catch{continue}
   const items=tc.items.filter(t=>(t.str||'').trim()).map(t=>{const m=pdfjsLib.Util.transform(vp.transform,t.transform);return{s:t.str.trim(),x:m[4],y:m[5],h:Math.hypot(m[2],m[3])||t.height||8,w:t.width||0}});
   const heads=items.filter(t=>/^((fire alarm|device|notification|back-of-house|initiating)[ -])*(symbols?|legend|symbol legend|symbol schedule)$/i.test(t.s)&&!/wire|subscript|pathway|circuit|abbrev/i.test(t.s));if(!heads.length)continue;let c=null;
   for(const H of heads){const next=heads.filter(h=>h!==H&&h.y>H.y+20&&Math.abs(h.x-H.x)<300).sort((a,b)=>a.y-b.y)[0],yEnd=next?next.y-4:H.y+900;
    const col=items.filter(t=>/^symbols?$/i.test(t.s)&&t.y>H.y&&t.y<H.y+60&&Math.abs(t.x-H.x)<400).sort((a,b)=>Math.abs(a.x-H.x)-Math.abs(b.x-H.x))[0];
    const reg=items.filter(t=>t!==H&&t.y>(col?col.y:H.y)+4&&t.y<yEnd&&t.x>(col?col.x+20:H.x-300)&&t.x<H.x+400&&/[A-Za-z]{3,}/.test(t.s)&&!/^(qty|quantity|description|symbol|legend|abbreviation|notes?)$/i.test(t.s));if(!reg.length)continue;
    const cnt={};reg.forEach(t=>{const v=Math.round(t.x/6);cnt[v]=(cnt[v]||0)+1});const lx=+Object.entries(cnt).sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0]*6;
    const lines=reg.filter(t=>Math.abs(t.x-lx)<10).sort((a,b)=>a.y-b.y);const ents=[];for(const t of lines){const E=ents[ents.length-1];if(E&&t.y-E.last<t.h*1.35){E.t.push(t);E.last=t.y}else ents.push({t:[t],last:t.y})}
    for(const E of ents){const f=E.t[0],label=E.t.map(t=>t.s).join(' ').replace(/\s+/g,' ').trim();if(label.length<3||label.length>80||have.has(norm(label)))continue;
     const x0=Math.max(col?col.x-70:f.x-110,(items.filter(t=>t.y>f.y-f.h*2&&t.y<E.last+f.h&&t.x<f.x-30&&!/^\d+$/.test(t.s)&&t.s.length>3).map(t=>t.x+t.w+4).sort((a,b)=>b-a)[0])||0),y0=f.y-f.h-8,y1=E.last+8;c=await render(pg,S,{x:x0-12,y:y0-12,w:f.x-x0+24,h:y1-y0+24});
     const r=crop(c,S,{x:x0,y:y0,w:f.x-6-x0,h:y1-y0});if(!r)continue;have.add(norm(label));out.push({...r,name:label,type:guess(label),tag:tagOfLabel(label),page:n,src:'legend',_c:c,_S:S})}}}
  return out}
 window.scanLegend=scanLegend;
 // bpm-v98: legend/symbol-table regions on a page (Detect marks suggestions inside them low-confidence: they're legend samples, not devices)
 const LRC=new Map();window.legendRects=async(pg,n)=>{const k=(plan?.id||'')+':'+n;if(LRC.has(k))return LRC.get(k);const vp=pg.getViewport({scale:1});let tc;try{tc=await pg.getTextContent()}catch{tc={items:[]}}
  const items=tc.items.filter(t=>(t.str||'').trim()).map(t=>{const m=pdfjsLib.Util.transform(vp.transform,t.transform);return{s:t.str.trim(),x:m[4],y:m[5]}});
  const heads=items.filter(t=>/^((fire alarm|device|notification|back-of-house|initiating)[ -])*(symbols?|legend|symbol legend|symbol schedule)$/i.test(t.s)&&!/wire|subscript|pathway|circuit|abbrev/i.test(t.s));
  const out=heads.map(H=>{const next=heads.filter(h=>h!==H&&h.y>H.y+20&&Math.abs(h.x-H.x)<300).sort((a,b)=>a.y-b.y)[0];return{x:H.x-320,y:H.y-10,w:760,h:(next?next.y-4:H.y+900)-(H.y-10)}});LRC.set(k,out);return out};
 // ---- bpm-v94: crop step (touch-friendly box with edge/corner handles, zoomed preview, Reset/Cancel/Save) ----
 const cd=ce('dialog');cd.id='cropDlg';document.body.append(cd);
 function cropUI(src,auto,title){return new Promise(done=>{const VW=Math.min(340,innerWidth-48),VH=Math.min(300,innerHeight*.42),k=Math.min(VW/src.width,VH/src.height,8),dw=Math.round(src.width*k),dh=Math.round(src.height*k);
  const def={...(auto||{x:0,y:0,w:src.width,h:src.height})};let b={...def};
  cd.innerHTML=`<h3 style="margin:4px 0">✂ ${esc(title||'Crop symbol')}</h3><small>Drag the box or its edges/corners to fit just the symbol.</small>
   <div class="cpW" style="width:${dw}px;height:${dh}px"><canvas id="cpV" width="${dw}" height="${dh}"></canvas><div class="cpB" id="cpB">${['nw','n','ne','e','se','s','sw','w'].map(h=>`<i class="cpH" data-h="${h}"></i>`).join('')}</div></div>
   <div class="row"><b>Preview</b><canvas id="cpP" width="120" height="120" class="cpP"></canvas></div>
   <div class="row"><button type="button" class="btn" id="cpR">↺ Reset</button><button type="button" class="btn" id="cpX">✕ Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="cpS">💾 Save</button></div>`;
  const v=cd.querySelector('#cpV'),B=cd.querySelector('#cpB'),P=cd.querySelector('#cpP');v.getContext('2d').drawImage(src,0,0,dw,dh);
  const clamp=()=>{b.w=Math.max(4,Math.min(b.w,src.width));b.h=Math.max(4,Math.min(b.h,src.height));b.x=Math.max(0,Math.min(b.x,src.width-b.w));b.y=Math.max(0,Math.min(b.y,src.height-b.h))};
  const paint=()=>{clamp();Object.assign(B.style,{left:b.x*k+'px',top:b.y*k+'px',width:b.w*k+'px',height:b.h*k+'px'});const g=P.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,120,120);const z=Math.min(116/b.w,116/b.h);g.imageSmoothingEnabled=z<2;g.drawImage(src,b.x,b.y,b.w,b.h,60-b.w*z/2,60-b.h*z/2,b.w*z,b.h*z)};paint();
  let drag=null;B.onpointerdown=e=>{e.preventDefault();e.stopPropagation();B.setPointerCapture(e.pointerId);drag={h:e.target.dataset.h||'m',x:e.clientX,y:e.clientY,b:{...b}}};
  B.onpointermove=e=>{if(!drag)return;const dx=(e.clientX-drag.x)/k,dy=(e.clientY-drag.y)/k,o=drag.b,h=drag.h;b={...o};
   if(h==='m'){b.x=o.x+dx;b.y=o.y+dy}else{if(h.includes('w')){const nx=Math.min(o.x+o.w-4,Math.max(0,o.x+dx));b.w=o.x+o.w-nx;b.x=nx}if(h.includes('e'))b.w=Math.max(4,Math.min(src.width-o.x,o.w+dx));if(h.includes('n')){const ny=Math.min(o.y+o.h-4,Math.max(0,o.y+dy));b.h=o.y+o.h-ny;b.y=ny}if(h.includes('s'))b.h=Math.max(4,Math.min(src.height-o.y,o.h+dy))}paint()};
  B.onpointerup=B.onpointercancel=()=>drag=null;
  cd.querySelector('#cpR').onclick=()=>{b={...def};paint()};const fin=r=>{cd.onclose=null;cd.close();done(r)};cd.querySelector('#cpX').onclick=()=>fin(null);cd.querySelector('#cpS').onclick=()=>fin({x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.w),h:Math.round(b.h)});cd.onclose=()=>done(null);cd.showModal()})}
 window.cropUI=cropUI;
 // exact crop (no auto-tighten) of canvas px box → {img,tpl,bb}
 function exact(c,S,b){const o=document.createElement('canvas');o.width=b.w;o.height=b.h;const g=o.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,b.w,b.h);g.drawImage(c,b.x,b.y,b.w,b.h,0,0,b.w,b.h);const T=grayOf(o),u=new Uint8Array(b.w*b.h);for(let i=0;i<u.length;i++)u[i]=T.g[i];
  return{img:o.toDataURL('image/png'),tpl:{w:b.w,h:b.h,s:S,g:b64(u)},bb:{x:b.x/S+(c._ox||0),y:b.y/S+(c._oy||0),w:b.w/S,h:b.h/S}}}
 const pxBox=(c,S,bb)=>bb?{x:Math.round((bb.x-(c._ox||0))*S),y:Math.round((bb.y-(c._oy||0))*S),w:Math.round(bb.w*S),h:Math.round(bb.h*S)}:null;
 const tagOfLabel=s=>/remote\s+(alarm\s+)?indicat|\bRI\b/i.test(s)?'RI':/weather.?proof|water.?proof|\bWP\b/i.test(s)?'WP':'';
 // ---- review dialog ----
 const rv=ce('dialog');rv.id='symRv';document.body.append(rv);
 function review(cands,title){if(!cands.length)return toast('No new symbols found');const opts=t=>`<option value="">— skip —</option>`+Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${k===t?' selected':''}>${esc(v.n)}</option>`).join('');
  rv.innerHTML=`<h3 style="margin:4px 0">🔣 ${esc(title)}</h3><small>Confirm each symbol's device type (skip any that aren't devices). Confirmed symbols join your master legend and Detect will look for them.</small><div class="symL">${cands.map((c,i)=>`<div class="symR"><img src="${c.img}" alt=""><div><input data-n="${i}" value="${esc(c.name||'')}" placeholder="Name"><select data-t="${i}">${opts(c.type)}</select><div class="row"><input data-g="${i}" value="${esc(c.tag||'')}" placeholder="Tag (RI/WP/R)" maxlength="3" class="symTag" aria-label="Modifier tag">${c._c?`<button type="button" class="btn" data-c="${i}">✂ Crop</button>`:''}</div></div></div>`).join('')}</div><div class="row"><button type="button" class="btn" id="symRx">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="symRok">Add to master</button></div>`;
  rv.querySelector('#symRx').onclick=()=>rv.close();rv.querySelectorAll('[data-c]').forEach(bt=>bt.onclick=async()=>{const c=cands[+bt.dataset.c],r=await cropUI(c._c,pxBox(c._c,c._S,c.bb),c.name||'Crop symbol');rv.open||rv.showModal();if(!r)return;Object.assign(c,exact(c._c,c._S,r));bt.closest('.symR').querySelector('img').src=c.img});rv.querySelector('#symRok').onclick=async()=>{await load();let k=0;cands.forEach((c,i)=>{const t=rv.querySelector(`[data-t="${i}"]`).value;if(!t)return;M.push({id:uid(),name:rv.querySelector(`[data-n="${i}"]`).value.trim()||TYPES[t].n,type:t,notes:'',img:c.img,tpl:c.tpl,tag:(rv.querySelector(`[data-g="${i}"]`)?.value||'').trim().toUpperCase(),src:c.src||'legend',planId:plan?.id,page:c.page,bb:c.bb,created:Date.now()});k++});await save();rv.close();toast(`Added ${k} symbol${k===1?'':'s'} to the master legend`);if($('#gDlg')?.open&&window.openGuides)openGuides('sym')};
  rv.showModal()}
 window.symReview=review;
 // bpm-v98: non-blocking chip instead of a modal on plan load (B1)
 function legendChip(c,pl){let h=document.getElementById('legChip');if(!h){h=ce('div','legChip');h.id='legChip';h.setAttribute('role','status');(document.getElementById('stage')||document.body).append(h);
   // bpm-v100: sit below the selection bar so the chip never covers Multi/Box/Deselect
   const sb=document.getElementById('selBar');if(sb){const pos=()=>{h.style.top=(sb.hidden||!sb.offsetHeight?8:sb.offsetTop+sb.offsetHeight+6)+'px'};new ResizeObserver(pos).observe(sb);new MutationObserver(pos).observe(sb,{attributes:true,attributeFilter:['hidden'],childList:true});pos()}}
  h.innerHTML=`<button type="button" class="btn" id="legRev">🔣 ${c.length} new legend symbol${c.length>1?'s':''} · <b>Review</b></button><button type="button" class="btn" id="legX" title="Dismiss" aria-label="Dismiss">✕</button>`;h.hidden=false;
  h.querySelector('#legRev').onclick=()=>{h.hidden=true;if(plan===pl)review(c,`Legend found: ${c.length} new symbol${c.length>1?'s':''}`)};h.querySelector('#legX').onclick=()=>h.hidden=true;busyClear()}
 // bpm-v140: on a phone the chip sat on top of the busy notice (its text and progress were hidden, only Stop showed); the notice moves just below the chip while both show
 function busyClear(){const b=document.getElementById('busy'),h=document.getElementById('legChip');if(!b)return;b.style.top='';if(b.hidden||!h||h.hidden)return;
  if(!h._bzObs){h._bzObs=1;new MutationObserver(busyClear).observe(h,{attributes:true,attributeFilter:['hidden','style']})}
  const a=b.getBoundingClientRect(),q=h.getBoundingClientRect();if(a.left<q.right&&q.left<a.right&&a.top<q.bottom&&q.top<a.bottom)b.style.top=(h.offsetTop+h.offsetHeight+6)+'px'}
 {const _bz=busy;busy=function(...a){const r=_bz.apply(this,a);busyClear();return r}}
 window.legendChip=legendChip;
 // auto-scan new plans once
 let legSeq=0;const _op=openPlan;openPlan=async function(id,...a){const lc=document.getElementById('legChip');if(lc)lc.hidden=true;const r=await _op.call(this,id,...a);const my=++legSeq;try{if(pdf&&plan&&!(await get('meta','legendScan:'+plan.id))){const pl=plan;const c=await scanLegend(pdf,Array.from({length:Math.min(pl.pages,40)},(_,i)=>i+1));if(my===legSeq&&plan&&plan.id===pl.id){await put('meta',Date.now(),'legendScan:'+pl.id);if(c.length)legendChip(c,plan)}}}
  /* bpm-v140: a plan counts as scanned only when its scan finishes and it is still the open plan; opening a plan again (or another one) while a scan runs starts a fresh scan, so the legend is never lost; the expected cancel is not a console warning */
  catch(e){if(!/Cancel/i.test(e&&e.name||''))console.warn('legend scan',e)}return r};
 // ---- tap to teach ----
 window.teachSymbol=()=>{if(!plan||!pdf)return toast('Open a PDF plan first');document.querySelectorAll('dialog[open]').forEach(d=>d.close());const o=ce('div','teachOv','<div class="teachTip">Tap the middle of a device symbol</div>');stage.append(o);
  o.onpointerdown=async e=>{e.stopPropagation();const r=stage.getBoundingClientRect(),w=toW(e.clientX-r.left,e.clientY-r.top);o.remove();const S=3,pg=await pdf.getPage(page),c=await render(pg,S,{x:w.x-40,y:w.y-40,w:80,h:80}),k=crop(c,S,{x:w.x-16,y:w.y-16,w:32,h:32});const box=pxBox(c,S,k?.bb)||{x:72,y:72,w:96,h:96},cr=await cropUI(c,box,'Crop the symbol');if(!cr)return;const ex=exact(c,S,cr);let tag='';try{if(window.tagsNear)tag=(await tagsNear(pg,page,w.x,w.y,Math.max(ex.bb.w,ex.bb.h))).mods.join('+')}catch{}review([{...ex,name:'',type:'',tag,page,src:'tap',_c:c,_S:S}],'Teach symbol')}};
 {const d=$('#detBtn'),t=ce('button',d?.className||'tool','🎓<span class="tl">Teach</span>');t.id='teachBtn';t.type='button';t.title='Teach a symbol: tap it on the plan, crop, confirm type';t.onclick=()=>teachSymbol();d?d.after(t):$('#tools').append(t)}
 // ---- template matcher for Detect ----
 const tplCache=new Map();
 function tplAt(m,S){const k=m.id+'@'+S.toFixed(3);if(tplCache.has(k))return tplCache.get(k);const t=m.tpl,u=unb64(t.g),f=S/t.s,w=Math.max(4,Math.round(t.w*f)),h=Math.max(4,Math.round(t.h*f)),g=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx0=Math.floor(x/f),sx1=Math.max(sx0+1,Math.min(t.w,Math.floor((x+1)/f))),sy0=Math.floor(y/f),sy1=Math.max(sy0+1,Math.min(t.h,Math.floor((y+1)/f)));let a=0,n=0;for(let yy=sy0;yy<sy1&&yy<t.h;yy++)for(let xx=sx0;xx<sx1&&xx<t.w;xx++){a+=u[yy*t.w+xx];n++}g[y*w+x]=n?a/n:0}
  let mu=0;for(const v of g)mu+=v;mu/=g.length;let sd=0;for(let i=0;i<g.length;i++){g[i]-=mu;sd+=g[i]*g[i]}const o={g,w,h,sd:Math.sqrt(sd)};tplCache.set(k,o);return o}
 function integ(G){const W=G.w,H=G.h,I=new Float64Array((W+1)*(H+1)),I2=new Float64Array((W+1)*(H+1));for(let y=0;y<H;y++){let a=0,b=0;for(let x=0;x<W;x++){const v=G.g[y*W+x];a+=v;b+=v*v;I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+a;I2[(y+1)*(W+1)+x+1]=I2[y*(W+1)+x+1]+b}}G.I=I;G.I2=I2;return G}
 function ncc(G,T,th,x0=0,y0=0,x1=G.w-T.w,y1=G.h-T.h){if(!G.I)integ(G);const W=G.w,I=G.I,I2=G.I2,n=T.w*T.h,hits=[];if(!T.sd)return hits;const box=(A,x,y)=>A[(y+T.h)*(W+1)+x+T.w]-A[y*(W+1)+x+T.w]-A[(y+T.h)*(W+1)+x]+A[y*(W+1)+x];
  for(let y=Math.max(0,y0);y<=Math.min(y1,G.h-T.h);y++)for(let x=Math.max(0,x0);x<=Math.min(x1,W-T.w);x++){const s=box(I,x,y),s2=box(I2,x,y),vr=s2-s*s/n;if(vr<n*40)continue;let cc=0;for(let j=0;j<T.h;j++){const o=(y+j)*W+x,t=j*T.w;for(let i=0;i<T.w;i++)cc+=G.g[o+i]*T.g[t+i]}const r=cc/(Math.sqrt(vr)*T.sd);if(r>=th)hits.push({x,y,r})}return hits}
 const half=A=>{const w=A.w>>1,h=A.h>>1,g=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=2*y*A.w+2*x;g[y*w+x]=(A.g[i]+A.g[i+1]+A.g[i+A.w]+A.g[i+A.w+1])/4}return{g,w,h}};
 const med=a=>{a=a.filter(v=>v>0).sort((x,y)=>x-y);return a.length?a[a.length>>1]:0};

 // bpm-v99: phantom-pin guard. A master-template hit must (1) score NCC >= MT.r, (2) sit on real dark ink that matches the
 // template's own ink (faint grey watermark/background art, blank paper and table lines are rejected), and (3) not sit on
 // word text (room names, titles, title-block) or in the legend. Only removes candidates; geometry of kept items untouched.
 const MT={r:.86,dark:128,hit:.6,cover:.45};window.MT=MT;
 function realInk(G,T,h){let tN=0,tHit=0,gN=0,gCov=0,mx=0;let tm=0;for(const v of T.g)tm=Math.max(tm,v);const W=G.w;
  for(let j=0;j<T.h;j++)for(let i=0;i<T.w;i++){const g=G.g[(h.y+j)*W+h.x+i],t=T.g[j*T.w+i]>tm*.3;if(g>mx)mx=g;const dk=g>=MT.dark;if(t){tN++;if(dk)tHit++}if(dk){gN++;let near=false;for(let dj=-1;dj<=1&&!near;dj++)for(let di=-1;di<=1;di++){const jj=j+dj,ii=i+di;if(jj>=0&&jj<T.h&&ii>=0&&ii<T.w&&T.g[jj*T.w+ii]>tm*.3){near=true;break}}if(near)gCov++}}
  return mx>=160&&tN>0&&tHit/tN>=MT.hit&&gN>0&&gCov/gN>=MT.cover}
 const TXC=new Map();async function textBoxes(pg){const k=(plan?.id||'')+':'+pg.pageNumber;if(TXC.has(k))return TXC.get(k);const vp=pg.getViewport({scale:1});let tc;try{tc=await pg.getTextContent()}catch{tc={items:[]}}
  const out=[];for(const t of tc.items){const s=(t.str||'').trim();if(s.replace(/[^A-Za-z0-9]/g,'').length<3)continue;const m=pdfjsLib.Util.transform(vp.transform,t.transform),fh=Math.hypot(m[2],m[3])||Math.hypot(m[0],m[1]),w=(t.width||0)*(fh/(Math.hypot(t.transform[2],t.transform[3])||1)),vert=Math.abs(m[1])>Math.abs(m[0]);
   const x0=m[4],y0=m[5];let b=vert?{x0:x0-fh*.2,x1:x0+fh*1.1,y0:Math.min(y0,y0+(m[1]>0?w:-w)),y1:Math.max(y0,y0+(m[1]>0?w:-w))}:{x0:Math.min(x0,x0+w),x1:Math.max(x0,x0+w),y0:y0-fh,y1:y0+fh*.25};out.push({x0:b.x0-2,x1:b.x1+2,y0:b.y0-2,y1:b.y1+2})}
  TXC.set(k,out);return out}
 function nccAt(G,T,x0,y0,x1,y1){const W=G.w,n=T.w*T.h;let best=null;if(!T.sd)return null;for(let y=Math.max(0,y0);y<=Math.min(y1,G.h-T.h);y++)for(let x=Math.max(0,x0);x<=Math.min(x1,W-T.w);x++){let s=0,s2=0,cc=0;for(let j=0;j<T.h;j++){const o=(y+j)*W+x,t=j*T.w;for(let i=0;i<T.w;i++){const v=G.g[o+i];s+=v;s2+=v*v;cc+=v*T.g[t+i]}}const vr=s2-s*s/n;if(vr<n*40)continue;const r=cc/(Math.sqrt(vr)*T.sd);if(!best||r>best.r)best={x,y,r}}return best&&best.r>=.8?best:null}
 // dark-ink connected components (8-px dilation not needed: symbols are drawn closed), skipping word text; capped size
 function inkBlobs(G,TX){const W=G.w,H=G.h,seen=new Uint8Array(W*H),out=[],st=new Int32Array(W*H>>2);for(let i=0;i<W*H;i++){if(seen[i]||G.g[i]<MT.dark)continue;let sp=0;st[sp++]=i;seen[i]=1;let x0=W,y0=H,x1=0,y1=0,cnt=0,big=false;
   while(sp){const j=st[--sp],x=j%W,y=(j/W)|0;cnt++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(x1-x0>80||y1-y0>80)big=true;
    for(const k of [j-1,j+1,j-W,j+W,j-W-1,j-W+1,j+W-1,j+W+1]){if(k<0||k>=W*H||seen[k]||G.g[k]<MT.dark)continue;const kx=k%W;if(Math.abs(kx-x)>1)continue;seen[k]=1;if(sp<st.length)st[sp++]=k}}
   if(big||x1-x0<5||y1-y0<5)continue;const cx=(x0+x1)/2,cy=(y0+y1)/2;if(TX&&TX.some(b=>cx>b.x0&&cx<b.x1&&cy>b.y0&&cy<b.y1))continue;out.push({x0,y0,x1,y1})}return out}
 /* bpm-v103: taught / master-legend matches go through the same pin geometry as built-in Detect:
    bw/bh = OUTER edge of the printed black outline, measured on a 4x render (same meaning as the worker's vector bw/bh),
    x/y = that outline's true center, ang 0 (templates match unrotated), shape = the type's pin shape (PSH), or the
    template's ink outline (shk) when the type has no shape of its own or the print clearly uses another shape.
    The pin then gets the same locked fill/outset/de-overlap as any built-in pin. Types without a vector detector
    (heat, panel, other) are matched too. */
 const GS=4;
 function outlineAt(G,cx,cy,tw,th){const W=G.w,H=G.h,seen=new Uint8Array(W*H),st=new Int32Array(W*H);let best=null;
  for(let i=0;i<W*H;i++){if(seen[i]||G.g[i]<MT.dark)continue;let sp=0,x0=W,y0=H,x1=-1,y1=-1;const px=[];st[sp++]=i;seen[i]=1;
   while(sp){const j=st[--sp],x=j%W,y=(j/W)|0;px.push(j);if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
    for(const k of[j-1,j+1,j-W,j+W,j-W-1,j-W+1,j+W-1,j+W+1]){if(k<0||k>=W*H||seen[k]||G.g[k]<MT.dark)continue;if(Math.abs(k%W-x)>1)continue;seen[k]=1;st[sp++]=k}}
   const w=x1-x0+1,h=y1-y0+1;if(!(cx>=x0-1&&cx<=x1+1&&cy>=y0-1&&cy<=y1+1))continue;if(w<tw*.55||h<th*.55||w>tw*1.35||h>th*1.35)continue;
   if(!best||w*h>best.w*best.h)best={x0,y0,x1,y1,w,h,px}}
  return best}
 function kindOf(O,W){/* filled-silhouette widths: rect ~1 at 25% height, circle ~.87, hex ~.75, diamond ~.5; area ratio rect 1, circ .785, hex .75, dia .5 */
  const w=O.w,h=O.h,M=new Uint8Array(w*h);for(const j of O.px){const x=j%W-O.x0,y=((j/W)|0)-O.y0;M[y*w+x]=1}
  const out=new Uint8Array(w*h),q=[];for(let x=0;x<w;x++)for(const y of[0,h-1]){const k=y*w+x;if(!M[k]&&!out[k]){out[k]=1;q.push(k)}}for(let y=0;y<h;y++)for(const x of[0,w-1]){const k=y*w+x;if(!M[k]&&!out[k]){out[k]=1;q.push(k)}}
  while(q.length){const k=q.pop(),x=k%w,y=(k/w)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const kk=Y*w+X;if(!M[kk]&&!out[kk]){out[kk]=1;q.push(kk)}}}
  let A=0;for(let i=0;i<w*h;i++)if(!out[i])A++;const row=f=>{const y=Math.round((h-1)*f);let a=w,b=-1;for(let x=0;x<w;x++)if(!out[y*w+x]){if(x<a)a=x;b=x}return b<a?0:(b-a+1)/w};
  const ar=A/(w*h),r25=(row(.25)+row(.75))/2,r05=(row(.06)+row(.94))/2;
  if(ar>.9&&r05>.85)return'rect';if(ar<.62&&r25<.65)return'dia';if(r05>.4&&r25<.84)return'hex';if(ar>.7&&ar<.86)return'circ';return null}
 async function geomAt(pg,x,y,T){const R={x:x-T.w,y:y-T.h,w:T.w*2,h:T.h*2},c=await render(pg,GS,R),G=grayOf(c),cx=(x-c._ox)*GS,cy=(y-c._oy)*GS;
  const O=outlineAt(G,cx,cy,T.w*GS,T.h*GS);if(!O)return null;const bw=(O.w)/GS,bh=(O.h)/GS;
  return{x:c._ox+(O.x0+O.x1+1)/2/GS,y:c._oy+(O.y0+O.y1+1)/2/GS,bw:+bw.toFixed(2),bh:+bh.toFixed(2),kind:kindOf(O,G.w)}}
 const shkFor=(type,kind)=>{const v=PSH[type];if(!kind)return null;if(!v||type==='other')return kind;return v[0]===kind?null:kind};
 window.masterGeom=geomAt;
 // bpm-v106: seeded entries only cover types Detect has no glyph for (VESDA, PAD-4/PAD-5, dampers…), and only on plans whose text names that device (legend), so other plans see no new suggestions
 const PTX=new Map();async function planText(){const k=plan?.id||'';if(PTX.has(k))return PTX.get(k);let t='';try{for(let i=1;i<=pdf.numPages;i++){const tc=await (await pdf.getPage(i)).getTextContent();t+=' '+tc.items.map(o=>o.str).join(' ')}}catch{}PTX.set(k,t);return t}
 // bpm-v108: seeded legend templates for the no-glyph types match only when this plan's text (its legend) names the device
 const SKW={heat:'\\bHEAT\\s+DET',multi:'MULTI[- ]?CRITERI',pad:'\\bPAD-?[45]\\b|NOTIFICATION APPLIANCE (PANEL|EXTENDER)',damper:'\\bDAMPER',scs:'SMOKE CONTROL STATION|\\bFSCS\\b',loc:"LOCAL OPERATOR'?S? CONSOLE",oss:'OPERATOR SAFETY SWITCH',eol:'END[- ]OF[- ]LINE',bfp:'BACKFLOW',pullbox:'ELECTRICAL PULL ?BOX',ffphone:'FIRE ?FIGHTER.{0,6}(TELE)?PHONE|PHONE JACK|\\bFFT\\b',
  speaker:'SPEAKER ONLY',lfs:'LOW[- ]FREQUENCY SOUNDER',bell:'\\bBELL\\b',vesda:'VESDA',vpsu:'VESDA POWER SUPPLY',vsp:'VESDA SAMPLING POINT',vcap:'CAPILLARY',vlf:'LASER FOCUS',vnet:'VESDA NETWORK',vrem:'VESDA REMOTE',vtee:'SAMPLING (TUBE )?TEE'};window.SKW=SKW;
 window.planTextAll=()=>planText();
 window.masterItems=async(pg,n,vp,existing)=>{const PT=await planText();const L=(await load()).filter(m=>{if(!m.tpl||!dgOf(m.type))return false;if(m.src!=='seed')return true;const kw=m.kw||SKW[m.type];return !!(DG[dgOf(m.type)]?.x&&kw&&new RegExp(kw,'i').test(PT))});if(!L.length)return[];
  // scale: plan symbols are usually drawn smaller than the legend; estimate from Detect's own sized items on this page (same type first, else all)
  const tw=m=>m.tpl.w/m.tpl.s,sized=existing.filter(i=>i.bw>0),allR=med(sized.map(i=>i.bw))/(med(L.map(tw))||1);
  const c=await render(pg,1),G=grayOf(c),out=[],TX=await textBoxes(pg),LR=await legendRects(pg,n).catch(()=>null),BL=inkBlobs(G,TX);
  for(const m of L){const same=sized.filter(i=>i.type===detOf(dgOf(m.type))),k=same.length?med(same.map(i=>i.bw))/tw(m):allR,ks0=k>0?[Math.min(1,k)]:[1,.75,.55,.4],ks=m.src==='tap'&&!ks0.includes(1)?[1,...ks0]:ks0; // bpm-v103: a symbol taught on a plan is already at plan scale
   for(const kk of ks){const T=tplAt(m,kk),T2=tplAt(m,kk/2);if(T.w*T.h>6000||T.w<8||T.h<6)continue;const keep=[];
    // bpm-v99 (speed): test only real dark-ink blobs about the template's size, never a full-page sliding window
    for(const bl of BL){const bw=bl.x1-bl.x0+1,bh=bl.y1-bl.y0+1;if(bw<T.w*.6||bw>T.w*1.5||bh<T.h*.6||bh>T.h*1.5)continue;const cx=Math.round((bl.x0+bl.x1+1-T.w)/2),cy=Math.round((bl.y0+bl.y1+1-T.h)/2);
     const best=nccAt(G,T,cx-3,cy-3,cx+3,cy+3);if(!best)continue;if(keep.some(q=>Math.abs(q.x-best.x)<T.w*.7&&Math.abs(q.y-best.y)<T.h*.7))continue;keep.push(best)}
    for(const h of keep){const x=h.x+T.w/2,y=h.y+T.h/2;if(h.r<MT.r||!realInk(G,T,h)||(TX&&TX.some(b=>x>b.x0&&x<b.x1&&y>b.y0&&y<b.y1))||(LR&&LR.some(b=>x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h)))continue;if(m.bb&&m.planId===plan?.id&&m.page===n&&x>m.bb.x-2&&x<m.bb.x+m.bb.w+2&&y>m.bb.y-2&&y<m.bb.y+m.bb.h+2)continue;
     if([...existing,...out].some(o=>Math.hypot(o.x-x,o.y-y)<Math.max(10,T.w*.6)))continue;if(window.tagsNear){let t='';try{t=(await tagsNear(pg,n,x,y,Math.max(T.w,T.h))).mods.join('+')}catch{}if(t!==(m.tag||''))continue}out.push({type:detOf(dgOf(m.type))||null,g:dgOf(m.type),x,y,fp:{s:'master',gl:m.name.slice(0,12),v:[0,0,0,0,0,0,0]},master:m.id,_T:[T.w,T.h],_mt:m.type})}if(keep.length&&m.src==='tap')break}}
  // bpm-v103: geometry for every match: vector outline via Detect's geom() first, raster outline (4x render) as the fallback for scanned plans
  let V=[];try{V=out.length&&window.vecProbe?await vecProbe(pg,out.map(o=>({x:o.x,y:o.y,w:o._T[0],h:o._T[1]}))):[]}catch(e){console.warn('vector probe',e)}
  for(let i=0;i<out.length;i++){const o=out[i],T={w:o._T[0],h:o._T[1]};let gm=V[i]||null,src='vec';if(!gm){gm=await geomAt(pg,o.x,o.y,T).catch(()=>null);src='ras'}
   if(gm&&Math.hypot(gm.x-o.x,gm.y-o.y)<Math.max(T.w,T.h)*.35&&gm.bw>4&&gm.bh>4){o.x=gm.x;o.y=gm.y;o.bw=+gm.bw.toFixed(3);o.bh=+gm.bh.toFixed(3);if(gm.ang)o.ang=gm.ang;o.gsrc=src;const sk=shkFor(o._mt,gm.kind);if(sk)o.shk=sk}delete o._T;delete o._mt}
  return out};
 // ---- Symbols guide ----
 window.symbolGuide=()=>{const el=ce('div','gBody');const draw=async()=>{await load();
  el.innerHTML=`<div class="row"><button type="button" class="btn" id="syAdd">➕ Add custom</button><button type="button" class="btn" id="syTeach">👆 Teach from plan</button><button type="button" class="btn" id="syScan">🔎 Scan plan legend</button></div>
  <h4>App pin symbols</h4><div class="symG">${Object.entries(TYPES).map(([k,v])=>`<div class="symC"><canvas data-k="${k}" width="56" height="44"></canvas><small>${esc(v.n)}</small></div>`).join('')}</div>
  <h4>My master legend (${M.length})</h4><div class="symG">${M.map(m=>`<div class="symC"><img src="${m.img}" alt=""><small><b>${esc(m.name)}</b><br>${esc(TYPES[m.type]?.n||m.type)}${m.tpl?' · Detect':''}${m.notes?'<br>'+esc(m.notes):''}</small><div class="row"><button type="button" class="btn" data-e="${m.id}">✎ Edit</button><button type="button" class="btn danger" data-d="${m.id}">🗑 Delete</button></div></div>`).join('')||'<small>None yet. Open a plan with a legend, or teach a symbol.</small>'}</div>`;
  el.querySelectorAll('canvas[data-k]').forEach(cv=>{const c=cv.getContext('2d'),k=cv.dataset.k,[,w,h]=pshOf(k),s=Math.min(40/w,30/h,2.4);c.save();c.translate(28,22);c.scale(s,s);try{drawPin(c,{type:k,x:0,y:0,status:'not tested'},1,false,false,true)}catch{}c.restore()});
  el.querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{if(!await uiConfirm('Delete this symbol from the master legend?'))return;M=M.filter(m=>m.id!==b.dataset.d);await save();draw()});
  el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>edit(M.find(m=>m.id===b.dataset.e)));
  el.querySelector('#syAdd').onclick=()=>edit(null);el.querySelector('#syTeach').onclick=()=>teachSymbol();
  el.querySelector('#syScan').onclick=async()=>{if(!pdf)return toast('Open a PDF plan first');busy(1,'Scanning legend');try{const c=await scanLegend(pdf,Array.from({length:plan.pages},(_,i)=>i+1));busy(0);review(c,`Legend: ${c.length} new symbol${c.length===1?'':'s'}`)}catch(e){busy(0);toast('Legend scan failed')}}};
  const ed=ce('dialog');ed.id='symEd';document.body.append(ed);
  function edit(m){const o=m||{name:'',type:'',notes:'',img:''};ed.innerHTML=`<h3 style="margin:4px 0">${m?'✎ Edit':'➕ New'} symbol</h3><label>Name <input id="seN" value="${esc(o.name)}"></label><label>Device type <select id="seT">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${k===o.type?' selected':''}>${esc(v.n)}</option>`).join('')}</select></label><label>Notes <textarea id="seO">${esc(o.notes||'')}</textarea></label>
   <div class="row"><b>Image</b><span class="sp"></span><button type="button" class="btn" id="seClr">🧽 Clear</button><label class="btn">📷 Photo<input type="file" accept="image/*" capture="environment" id="seF" hidden></label><label class="btn" id="seUpL">⬆ Upload<input type="file" accept="image/*" id="seU" hidden></label></div><canvas id="seC" width="240" height="160" class="seC"></canvas>
   <div class="row"><button type="button" class="btn" id="seX">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="seS">💾 Save</button></div>`;
   const cv=ed.querySelector('#seC'),c=cv.getContext('2d');const blank=()=>{c.fillStyle='#fff';c.fillRect(0,0,240,160)};blank();if(o.img){const im=new Image();im.onload=()=>{const k=Math.min(220/im.width,140/im.height);c.drawImage(im,120-im.width*k/2,80-im.height*k/2,im.width*k,im.height*k)};im.src=o.img}
   let dn=null;cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);const r=cv.getBoundingClientRect();dn=[(e.clientX-r.left)*240/r.width,(e.clientY-r.top)*160/r.height]};cv.onpointermove=e=>{if(!dn)return;const r=cv.getBoundingClientRect(),p=[(e.clientX-r.left)*240/r.width,(e.clientY-r.top)*160/r.height];c.strokeStyle='#111';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(...dn);c.lineTo(...p);c.stroke();dn=p};cv.onpointerup=()=>dn=null;
   ed.querySelector('#seClr').onclick=blank;const pick=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const im=new Image();im.src=URL.createObjectURL(f);try{await im.decode()}catch{return toast('Could not read that image')}const z=Math.min(1,900/Math.max(im.width,im.height)),src=document.createElement('canvas');src.width=Math.round(im.width*z);src.height=Math.round(im.height*z);const sg=src.getContext('2d');sg.fillStyle='#fff';sg.fillRect(0,0,src.width,src.height);sg.drawImage(im,0,0,src.width,src.height);URL.revokeObjectURL(im.src);
    const G=grayOf(src),ib=inkBox(G,90),auto=ib?{x:Math.max(0,ib.x0-4),y:Math.max(0,ib.y0-4),w:Math.min(src.width,ib.x1-ib.x0+9),h:Math.min(src.height,ib.y1-ib.y0+9)}:null,r=await cropUI(src,auto,'Crop the symbol');ed.open||ed.showModal();if(!r)return;blank();const kk=Math.min(230/r.w,150/r.h);c.drawImage(src,r.x,r.y,r.w,r.h,120-r.w*kk/2,80-r.h*kk/2,r.w*kk,r.h*kk)};
   ed.querySelector('#seF').onchange=pick;ed.querySelector('#seU').onchange=pick;
   ed.querySelector('#seX').onclick=()=>ed.close();ed.querySelector('#seS').onclick=async()=>{await load();const v={name:ed.querySelector('#seN').value.trim()||'Custom symbol',type:ed.querySelector('#seT').value,notes:ed.querySelector('#seO').value.trim(),img:cv.toDataURL('image/png')};
    if(m)Object.assign(m,v,{updated:Date.now()});else M.push({id:uid(),...v,src:'user',created:Date.now()});await save();ed.close();draw()};ed.showModal()}
  draw();return el};
})();
}catch(e){console.error('17-symbol-legend.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/18-text-tags.js =====
try{
// bpm-v94: device-identifying text tags beside a detected glyph. TYPE ONLY — never touches x/y/ang/bw/bh/outset.
// RI = remote indicator, WP = weatherproof variant, R = relay. Status tags (N)/(E)/(ER)/(ETN)/(ETR) are ignored for typing and kept as metadata. They never touch x/y/ang/bw/bh/outset.
(()=>{
const STATUS=new Set(['N','E','ER','EX','NEW','EXISTING','ETN','ETR']),MODS=['RI','WP','R'];
// Which detect groups a modifier re-types. RI on any light/notification glyph → Remote indicator; R on a module glyph → Relay. WP never changes type.
const RETYPE={RI:{from:['strobe','spkw','spkc','horn','la'],to:'rai',det:'RAI'},R:{from:['module'],to:'relay',det:'RELAY'}};
function parseTags(words){const toks=[];for(const w of words)for(const t of String(w).toUpperCase().replace(/[^A-Z0-9()]+/g,' ').split(/\s+/))if(t)toks.push(t);
 const mods=new Set(),status=new Set();for(let t of toks){const par=/^\(.*\)$/.test(t);t=t.replace(/[()]/g,'');if(!t)continue;if(STATUS.has(t)&&(par||t.length<=2||t==='ETN'||t==='ETR')){status.add(t==='EX'||t==='EXISTING'?'E':t==='NEW'?'N':t);continue}if(MODS.includes(t))mods.add(t)}
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
// bpm-v126: when the legend lists BOTH, candela/wattage is not enough. A status label that belongs only to the horn row (vector segment counts) types the nearest SPK_* (≤30 pt) as horn.
const WATT=/(?:^|[^A-Z0-9.\/])(?:\d+(?:\.\d+)?|\d\/\d|\/\d)\s?W(?![A-Z])/,CDR=/\d+\s?CD(?![A-Z])/;
window.hornTag=ws=>{const s=' '+ws.join(' ').toUpperCase();return WATT.test(s)?'spk':CDR.test(s)?'horn':null};
function hornAssign(spec){if(spec.legendOnly==='horn'||spec.legendOnly==='spk')return spec.legendOnly;
 const only=spec.hornOnly,has=spec.status&&only&&(typeof only.has==='function'?only.has(spec.status):only.indexOf(spec.status)>=0);
 if(spec.both){if(has)return 'horn';if(spec.status)return 'spk';if(spec.watt)return 'spk';if(spec.rowHorn)return 'horn';return 'spk'}
 if(spec.watt)return 'spk';if(spec.candela)return 'horn';if(spec.rowHorn)return 'horn';return 'spk'}
window.hornAssign=hornAssign;
function nearestStatus(labels,x,y,maxD){let b=null,bd=maxD;for(const lb of labels||[]){const d=Math.hypot(x-lb.x,y-lb.y);if(d<=bd){bd=d;b=lb}}return b}
window.nearestStatus=nearestStatus;
const LG=new Map();async function legendKind(pl){if(LG.has(pl.id))return LG.get(pl.id);let t='';for(let n=1;n<=pdf.numPages;n++){try{t+=' '+(await textOf(await pdf.getPage(n),n)).map(o=>o.s).join(' ')}catch{}}t=t.toUpperCase();
 const spk=/SPEAKER\s*[\/-]?\s*STROBE|SPKR\s*[\/-]?\s*STROBE/.test(t),horn=/HORN\s*[\/-]?\s*STROBE/.test(t),r={spk,horn,only:spk&&!horn?'spk':horn&&!spk?'horn':null};LG.set(pl.id,r);return r}
window.legendNA=async pl=>(await legendKind(pl)).only;
const SPKG=new Set(['spkw','spkc']);
// bpm-v110: legend lists BOTH horn/strobe and speaker/strobe → read which drawing each legend row uses (filled cone = *_BOH, open = *_FOH) and let the rows decide per drawing (majority of rows; tie → speaker/strobe)
const LHS=new Map();window.legendHS=async pl=>{if(LHS.has(pl.id))return LHS.get(pl.id);const M={BOH:{horn:0,spk:0},FOH:{horn:0,spk:0}},RX=/(HORN|SPEAKER|SPKR)\s*\/\s*STROBE/i;let w=null;
 try{const O=pdfjsLib.OPS,keep=new Set(DOPS.map(k=>O[k]).filter(v=>v!==undefined));for(let n=1;n<=pdf.numPages;n++){if(plan!==pl)break;const pg=window.detPage?await detPage(n):await pdf.getPage(n),tc=await pg.getTextContent(),vp=pg.getViewport({scale:1});
  const rows=[];for(const q of tc.items){const s=(q.str||'').trim(),m=s.match(RX);if(!m||/^(WHERE|ALL|PROVIDE|NOTE)\b/i.test(s)||s.length>60)continue;const t=pdfjsLib.Util.transform(vp.transform,q.transform);rows.push({k:/HORN/i.test(m[1])?'horn':'spk',x:t[4],y:t[5]})}
  if(!rows.some(r=>r.k==='horn')||!rows.some(r=>r.k==='spk'))continue;const ol=window.vecOL?await vecOL(n,pg):await pg.getOperatorList(),fn=[],args=[];for(let j=0;j<ol.fnArray.length;j++)if(keep.has(ol.fnArray[j])){fn.push(ol.fnArray[j]);args.push(ol.argsArray[j])}
  w=w||new Worker('detect.js');const r=await new Promise((res,rej)=>{w.onmessage=e=>e.data.ok?res(e.data):rej(new Error(e.data.err));w.onerror=e=>{e.preventDefault?.();rej(new Error(e.message||'legend worker'))};w.postMessage({id:'leg'+n,fn,args,O,vt:vp.transform,W:vp.width,H:vp.height,want:null})});
  for(const h of rows){let b=null,bd=1e9;for(const o of r.items){if(!/^SPK_(BOH|FOH)/.test(o.type))continue;const dy=Math.abs(o.y-h.y),dx=h.x-o.x;if(dy<22&&dx>0&&dx<260&&dx+dy*3<bd){bd=dx+dy*3;b=o}}if(b)M[/BOH/.test(b.type)?'BOH':'FOH'][h.k]++}}}
 catch(e){console.warn('legend horn rows',e)}finally{try{w&&w.terminate()}catch{}}LHS.set(pl.id,M);window.__hornRows=M;return M};
const LC=new Map();let labW=null;
async function pageStatusLabels(n,pg){const ck=(plan&&plan.id||'')+':'+n;if(LC.has(ck))return LC.get(ck);
 const O=pdfjsLib.OPS,keep=new Set(DOPS.map(k=>O[k]).filter(v=>v!==undefined)),ol=window.vecOL?await vecOL(n,pg):await pg.getOperatorList(),fn=[],args=[];
 for(let j=0;j<ol.fnArray.length;j++)if(keep.has(ol.fnArray[j])){fn.push(ol.fnArray[j]);args.push(ol.argsArray[j])}
 const vp=pg.getViewport({scale:1});if(!labW)labW=new Worker('detect.js');
 const labels=await new Promise((res,rej)=>{labW.onmessage=e=>e.data.ok?res(e.data.labels||[]):rej(new Error(e.data.err));labW.onerror=e=>{e.preventDefault?.();try{labW.terminate()}catch{}labW=null;rej(new Error(e.message||'label worker'))};labW.postMessage({id:'st'+n,fn,args,O,vt:vp.transform,W:vp.width,H:vp.height,labels:1})});
 LC.set(ck,labels);return labels}
const LHO=new Map();
async function legendHornOnly(pl){if(LHO.has(pl.id))return LHO.get(pl.id);const RX=/(HORN|SPEAKER|SPKR)\s*\/\s*STROBE/i,used=new Map();
 try{for(let n=1;n<=pdf.numPages;n++){if(plan!==pl)break;const pg=window.detPage?await detPage(n):await pdf.getPage(n),tc=await pg.getTextContent(),vp=pg.getViewport({scale:1}),rows=[];
  for(const q of tc.items){const s=(q.str||'').trim(),m=s.match(RX);if(!m||/^(WHERE|ALL|PROVIDE|NOTE)\b/i.test(s)||s.length>60)continue;const t=pdfjsLib.Util.transform(vp.transform,q.transform);rows.push({k:/HORN/i.test(m[1])?'horn':'spk',x:t[4],y:t[5]})}
  if(!rows.some(r=>r.k==='horn')||!rows.some(r=>r.k==='spk'))continue;const labels=await pageStatusLabels(n,pg),ranked=[];
  for(const h of rows){let b=null,bd=1e9;for(const lb of labels){const dy=Math.abs(lb.y-h.y),dx=h.x-lb.x;if(dy>18||dx<-40||dx>200)continue;const d=dy*3+Math.abs(dx)*.25;if(d<bd){bd=d;b=lb}}if(b)ranked.push({h,b,bd})}
  ranked.sort((a,c)=>a.bd-c.bd);const taken=new Set();for(const {h,b} of ranked){if(taken.has(b))continue;taken.add(b);let set=used.get(b.status);if(!set)used.set(b.status,set=new Set());set.add(h.k)}}}
 catch(e){console.warn('legend horn status',e)}
 const only=new Set();for(const [st,set] of used)if(set.has('horn')&&!set.has('spk'))only.add(st);LHO.set(pl.id,only);window.__hornStatus={only:[...only],rows:[...used].map(([s,set])=>[s,[...set]])};return only}
window.hornPass=async(pages,groups,pl,opt={})=>{const G=hornPass.gen=(hornPass.gen||0)+1,st={legend:null,pages:{},changed:[]};window.__horn=st;let k=0,byStatus=0;
 if(groups&&!groups.includes('horn')&&!opt.force)return 0;const kind=opt.noLegend?{only:null,spk:false,horn:false}:await legendKind(pl);const leg=kind.only;st.legend=leg;st.both=!!(kind.spk&&kind.horn);
 let hornOnly=null;if(st.both){try{hornOnly=await legendHornOnly(pl)}catch(e){console.warn('horn status',e);hornOnly=new Set()}}st.hornOnly=hornOnly?[...hornOnly]:null;
 for(const n of pages){if(plan!==pl||G!==hornPass.gen)return k;const gh=ghosts.filter(g=>g.page===n),cand=gh.filter(g=>SPKG.has(g.g)&&!g.fromG);if(!cand.length)continue;const ps=st.pages[n]={spk:0,horn:0,tagW:0,tagCD:0,none:0,by:leg?'legend':st.both?'status':'tag'};
  const near=new Map();if(st.both){try{const pg=window.detPage?await detPage(n):await pdf.getPage(n),labels=await pageStatusLabels(n,pg);for(const g of cand){const b=nearestStatus(labels,g.x,g.y,30);near.set(g,b);if(b)g.plan=b.status}}catch(e){console.warn('status labels',e)}}
  let own=null;const need=st.both?cand.filter(g=>!near.get(g)):cand;
  if(!leg&&need.length){const pg=await pdf.getPage(n),toks=[];for(const g of need){const r=await (window.wordsNearX)(pg,n,g.x,g.y,Math.max(g.bw||0,g.bh||0)||13);for(const w of r.words)if(!toks.some(o=>o.s===w.s&&Math.hypot(o.x-w.x,o.y-w.y)<3))toks.push(w)}
   own=new Map(cand.map(g=>[g,[]]));for(const t of toks){let b=null,bd=1e9;for(const g of gh){const d=Math.hypot(g.x-t.x,g.y-t.y)/(Math.max(g.bw||0,g.bh||0)||13);if(d<bd){bd=d;b=g}}if(b&&own.has(b)&&need.includes(b))own.get(b).push(t.s)}}
  const LM=leg||(st.both&&!need.length)?null:await legendHS(pl);st.rows=LM;
  for(const g of cand){let tg=null,rowHorn=false;const lb=near.get(g),status=lb?lb.status:null;
   if(!leg&&need.includes(g)){tg=hornTag(own.get(g));if(tg==='spk')ps.tagW++;else if(tg==='horn')ps.tagCD++;else ps.none++;const rm=LM&&LM[/BOH/.test(g.det||'')?'BOH':'FOH'];if(!tg&&rm&&rm.horn>rm.spk)rowHorn=1}else if(st.both)ps.none++;
   const v=hornAssign({legendOnly:leg,both:st.both,status,hornOnly,watt:tg==='spk',candela:!st.both&&tg==='horn',rowHorn});
   g.hornBy=leg?'legend':(st.both&&v==='horn'?'status':rowHorn?'legend-row':(tg&&!st.both?'tag':'default'));
   if(v==='horn'){ps.horn++;if(g.hornBy==='status')byStatus++;if(plan!==pl)return k;g.fromG=g.g;g.shp=DG[g.g]?.t;g.g='horn';g.det=/BOH/.test(g.det||'')?'HORN_BOH':'HORN_FOH';g.low=g.low||'tag';st.changed.push({page:n,id:g.id,x:Math.round(g.x),y:Math.round(g.y)});k++}else ps.spk++}}
 if(k&&plan===pl){try{draw();renderGhostBar()}catch{}toast(`Tags read: ${k} speaker/strobe suggestion${k===1?'':'s'} re-typed to horn/strobe (${byStatus?'legend status label':'candela only'}, marked ? to check)`)}return k};
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
const VMAP={VPS:['vpsu','VESDA_PSU'],VLF:['vlf','VESDA_LF'],VRE:['vrem','VESDA_REM'],VNI:['vnet','VESDA_NET'],FSCS:['scs','SCS'],SCS:['scs','SCS'],TVSS:['surge','SURGE'],FFT:['ffphone','FFPHONE'],FTJ:['ffphone','FFPHONE']};
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
}catch(e){console.error('18-text-tags.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/19-pins-panel.js =====
try{
// bpm-v102: decluttered Pins panel. Regroups the EXISTING controls (same ids and handlers), so every function stays reachable.
(()=>{const P=$('#panel');if(!P)return;const ph=P.querySelector('.ph');
 const dd=(id,label,title,ids)=>{const d=document.createElement('details');d.className='pDd';d.id=id;d.innerHTML=`<summary class="btn" title="${title}">${label} ▾</summary><div class="pDm"></div>`;const m=d.querySelector('.pDm');for(const i of ids){const e=by(i);if(e){e.classList.add('pDi');m.append(e)}}
  m.addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(()=>d.open=false,0)});return d};
 // (b) labels inside menus
 by('csvBtn').textContent='📋 Device list spreadsheet';by('countCsv').textContent='🔢 Counts spreadsheet';by('checkCsv').textContent='☑ Checklist spreadsheet';by('reportPdf').textContent='📄 Report PDF';
 by('clrBtn').textContent='🗑 Delete Pins';by('clrMBtn').textContent='🗑 Delete Markups';by('testerBtn').innerHTML='Tester';
 const row2=document.createElement('div');row2.className='row pinsOnly pTools';
 row2.append(dd('pExp','Export','Export: device list, counts, checklist, report',['csvBtn','countCsv','checkCsv','reportPdf']),dd('pEdit','Edit','Split for a second technician / merge a returned file',['splitBtn','mergeBtn']),dd('pDel','Delete','Delete all pins or all markups (asks first)',['clrBtn','clrMBtn']),by('testerBtn'));
 ph.after(row2);by('pDel').querySelector('summary').classList.add('danger');
 // (c) search + filters in one row; summary + counts on one small line
 const q=by('q'),f=by('fType').parentElement;f.classList.add('pFlt');f.prepend(q);q.placeholder='Search…';q.title='Search address, location, type, notes';
 const sumL=document.createElement('div');sumL.className='pSumL pinsOnly';by('sum').before(sumL);sumL.append(by('sum'),by('counts'));by('sum').open=false;
 // old split/merge/export row is now empty → remove it
 const old=by('reportPdf')&&[...P.querySelectorAll('.row.pinsOnly')].find(r=>r!==row2&&!r.children.length);if(old)old.remove();
 // close menus on outside tap
 document.addEventListener('pointerdown',e=>{P.querySelectorAll('details.pDd[open]').forEach(d=>{if(!d.contains(e.target))d.open=false})},true);
})();
// bpm-v103: the Pins panel menus (Export, Edit, Delete) open as the same floating wheel, anchored to the tapped button
(()=>{if(!window.wheelOpen)return;document.querySelectorAll('#panel details.pDd, details.pDd').forEach(d=>{const s=d.querySelector('summary');if(!s||s.dataset.wh)return;s.dataset.wh=1;
 s.addEventListener('click',e=>{e.preventDefault();d.open=false;const B=[...d.querySelectorAll('.pDm button')].filter(b=>!b.disabled&&!b.hidden&&b.style.display!=='none');if(!B.length)return;window.wheelAnchor&&wheelAnchor(s);
  wheelOpen(s.textContent.replace('▾','').trim(),B.map(b=>({l:b.textContent.trim(),b})),0,it=>it&&it.b.click())})})})();
}catch(e){console.error('19-pins-panel.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/20-pins-header.js =====
try{
// bpm-v106 (option C): compact Pins panel. Top: Pins | Deficiencies segmented bar with counts, full-width search, labeled filter buttons (Type, Status, Page; Loop removed in v118)
// that open the floating wheel. Middle: one progress/counts line, then the scrolling list. Bottom bar pinned inside the panel (wheels open upward):
// Export, Split, Tester, Clear (Deficiencies tab: Deficiencies spreadsheet, Deficiencies PDF, Tester). Reuses the existing controls (same ids and handlers).
(()=>{const P=$('#panel');if(!P||!window.wheelOpen)return;const mk=ce;
 P.classList.add('pC');const ph=P.querySelector('.ph');
 // segmented Pins | Deficiencies (bpm-v133: spelled out)
 const seg=mk('div','pSeg');by('modePins').innerHTML='Pins <b id="pinCount"></b>';by('modeDefs').innerHTML='⚠ Deficiencies <b id="defCount" class="r"></b>';seg.append(by('modePins'),by('modeDefs'));ph.prepend(seg);
 by('closeList').title='Close the Pins panel';
 // old header tools row (Export / Edit / Delete menus + Tester) is replaced by the bottom bar; the hidden originals keep their handlers
 const old=P.querySelector('.pTools');if(old){old.hidden=true;old.classList.add('pOld')}
 // search on its own full-width row
 const q=by('q'),qr=mk('div','pQ');qr.append(q);ph.after(qr);q.placeholder='🔍 Search…';
 // filters: buttons showing their value; the selects / checkbox stay (hidden) as the source of truth
 const fr=by('fType').parentElement;fr.classList.add('pOldF');fr.hidden=true;const fb=mk('div','pFB');qr.after(fb);
 const fire=e=>{e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};
 const selF=(id,k,all)=>({k,id,vals:()=>[...by(id).options].map(o=>({v:o.value,l:o.value?o.textContent:all})),cur:()=>by(id).value,set:v=>{by(id).value=v;fire(by(id))},lab:()=>{const s=by(id);return s.value?s.options[s.selectedIndex].textContent:'All'}});
 const F=[selF('fType','Type','All types'),selF('fStat','Status','All status'),/* bpm-v118: Loop filter removed (user request); loop numbers stay in rows, walk, deficiencies and exports */
  {k:'Page',id:'allPages',vals:()=>[{v:'',l:'This page'},{v:'1',l:'All pages'}],cur:()=>by('allPages').checked?'1':'',set:v=>{by('allPages').checked=!!v;fire(by('allPages'))},lab:()=>by('allPages').checked?'All':'This'}];
 for(const f of F){const b=mk('button','pF');b.type='button';b.id='pF'+f.k;b.innerHTML=`<span class="k">${f.k} ▾</span><span class="v"></span>`;f.b=b;fb.append(b);
  b.onclick=()=>{const V=f.vals(),c=Math.max(0,V.findIndex(x=>x.v===f.cur()));wheelAnchor(b);wheelOpen(f.k,V.map(x=>({...x,l:x.l})),c,x=>{f.set(x.v);paint()})}}
 // bpm-v118: three filters (Type, Status, Page) in one row of equal widths when they fit, else a 2-column grid whose last button spans the row
 {const fit=()=>{const on=fb.clientWidth>=225;if(fb.classList.contains('f3')!==on)fb.classList.toggle('f3',on)};new ResizeObserver(fit).observe(fb);fit()}
 {const fl=by('fLoop');if(fl&&fl.value){fl.value='';fire(fl)}}
 // bottom bar (pinned inside the panel)
 const bb=mk('div','pBB pinsOnly'),bd=mk('div','pBB defsOnly');P.append(bb,bd);
 const clk=id=>()=>{const e=by(id);e&&e.click()};
 const btn=(bar,id,ic,l,run)=>{const b=mk('button','pB',`<i>${ic}</i><small>${l}</small>`);b.type='button';b.id=id;b.onclick=run;bar.append(b);return b};
 const menu=(title,items)=>function(){wheelAnchor(this);wheelOpen(title,items.map(x=>({...x,html:`<span class="whIc">${x.i}</span>${esc(x.l)}`})),0,x=>x.run())};
 btn(bb,'pbExp','⤓','Export',menu('Export',[{i:'📋',l:'Device list spreadsheet',run:clk('csvBtn')},{i:'🔢',l:'Counts spreadsheet',run:clk('countCsv')},{i:'☑',l:'Checklist spreadsheet',run:clk('checkCsv')},{i:'📄',l:'Report PDF',run:clk('reportPdf')}]));
 btn(bb,'pbSplit','⇆','Split',menu('Split',[{i:'⇆',l:'Split for second technician',run:clk('splitBtn')},{i:'⇄',l:'Merge returned file',run:clk('mergeBtn')}]));
 btn(bb,'pbTester','👤','Tester',clk('testerBtn'));
 btn(bb,'pbClear','🗑','Clear',menu('Clear',[{i:'🗑',l:'Clear pins…',run:clk('clrBtn')},{i:'🗑',l:'Clear markups…',run:clk('clrMBtn')}]));
 const dr=by('defCsv').parentElement;dr.classList.add('pOldD');dr.hidden=true;
 btn(bd,'pbDefCsv','📋','Deficiencies spreadsheet',clk('defCsv')).title='Deficiencies spreadsheet (CSV file)';btn(bd,'pbDefPdf','📄','Deficiencies PDF',clk('defPdf')).title='Deficiencies PDF';btn(bd,'pbDefTester','👤','Tester',clk('testerBtn'));
 for(const b of [...bb.children,...bd.children])b.title=b.title||b.textContent.trim();
 // values + counts
 function paint(){for(const f of F){const v=f.lab();const e=f.b.querySelector('.v');if(e.textContent!==v)e.textContent=v;f.b.classList.toggle('act',!!f.cur());f.b.title=`${f.k}: ${f.vals().find(x=>x.v===f.cur())?.l||v}`}
  const n=(typeof pins!=='undefined'?pins:[]).length,pc=by('pinCount');if(pc&&pc.textContent!==String(n))pc.textContent=n;const dc=by('defCount');if(dc)dc.hidden=!dc.textContent}
 window.pinsHdrPaint=paint;['fType','fStat','allPages'].forEach(i=>by(i).addEventListener('input',paint));setInterval(()=>{if(!P.hidden)paint()},500);paint();
 // phone: lift the panel's bottom by the app toolbar (+ selection bar when showing) wherever they overlap it, like the walk bar
 function lift(){if(P.hidden)return;if(document.body.classList.contains('rl')){P.style.removeProperty('--pLift');return}/* v113: the layout manager (rail.js) owns the panel geometry */let h=0;if(!matchMedia('(min-width:800px)').matches){const r=P.getBoundingClientRect();for(const s of['#tools','#selBar','#mBar','#ghBar']){const e=$(s);if(!e||e.hidden||!e.offsetParent)continue;const q=e.getBoundingClientRect();if(q.width&&q.right>r.left+2&&q.left<r.right-2&&q.top<r.bottom)h=Math.max(h,r.bottom-q.top)}}
  let tp='';if(!matchMedia('(min-width:800px)').matches){let b=0;for(const s of['#proj','#top']){const e=$(s);if(e&&!e.hidden&&e.offsetParent){const q=e.getBoundingClientRect();if(q.top<innerHeight/3)b=Math.max(b,q.bottom)}}tp=b?Math.round(b)+'px':''}if(P.style.top!==tp)P.style.top=tp;
  const v=Math.max(0,Math.round(h))+'px';if(P.style.getPropertyValue('--pLift')!==v)P.style.setProperty('--pLift',v)}
 setInterval(lift,250);addEventListener('resize',lift);new MutationObserver(lift).observe(P,{attributes:true,attributeFilter:['hidden']});
})();
}catch(e){console.error('20-pins-header.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/21-stamp-tool.js =====
try{
// bpm-v107: Stamp tool. Labeled stamp bar (shape picker wheel, Size, Color, Opacity, Rotation + 0/45/90, Fill/Outline + stroke width, live preview,
// My stamps = saved + recent, IndexedDB). Each tap on the plan places one stamp centered at the tap until another tool is chosen.
// A placed stamp is a normal closed (or open) path markup with m.stamp={k,sz,rot,fill,dx,dy}: select/Edit/Copy/Multi/Box/Undo/Layers/export all
// work like any markup; Properties can change color, opacity, size and rotation. Pins are never touched.
(()=>{
 const K=.5523,P=(pts)=>({N:pts.map(([x,y])=>({x,y,ix:0,iy:0,ox:0,oy:0,k:'c'})),closed:true});
 const circ=(rx,ry,cy=0)=>({N:[[0,-ry],[rx,0],[0,ry],[-rx,0]].map(([x,y],i)=>{const h=i%2?[0,ry*K]:[rx*K,0];const s=i===0||i===3?1:-1;return{x,y:y+cy,ix:-h[0]*(i===0?1:i===2?-1:0),iy:-h[1]*(i===1?1:i===3?-1:0),ox:h[0]*(i===0?1:i===2?-1:0),oy:h[1]*(i===1?1:i===3?-1:0),k:'s'}}),closed:true});
 const reg=(n,r,r2,rot=-Math.PI/2)=>{const p=[];const m=r2?2*n:n;for(let i=0;i<m;i++){const a=rot+i*2*Math.PI/m,rr=r2&&i%2?r2:r;p.push([rr*Math.cos(a),rr*Math.sin(a)])}return p};
 const xs=(()=>{const t=.2,pl=[[-t/2,-.5],[t/2,-.5],[t/2,-t/2],[.5,-t/2],[.5,t/2],[t/2,t/2],[t/2,.5],[-t/2,.5],[-t/2,t/2],[-.5,t/2],[-.5,-t/2],[-t/2,-t/2]],c=Math.SQRT1_2;return pl.map(([x,y])=>[(x-y)*c*1.25,(x+y)*c*1.25])})();
 const rrect=(w,h,r)=>{const x=w/2,y=h/2,k=r*K;return{N:[{x:-x+r,y:-y,ix:-k,iy:0,ox:0,oy:0},{x:x-r,y:-y,ix:0,iy:0,ox:k,oy:0},{x:x,y:-y+r,ix:0,iy:-k,ox:0,oy:0},{x:x,y:y-r,ix:0,iy:0,ox:0,oy:k},{x:x-r,y:y,ix:k,iy:0,ox:0,oy:0},{x:-x+r,y:y,ix:0,iy:0,ox:-k,oy:0},{x:-x,y:y-r,ix:0,iy:k,ox:0,oy:0},{x:-x,y:-y+r,ix:0,iy:0,ox:0,oy:-k}].map(n=>({...n,k:'c'})),closed:true}};
 const cloud=()=>{const n=10,C=[];for(let i=0;i<n;i++){const a=i*2*Math.PI/n;C.push([.42*Math.cos(a),.28*Math.sin(a)])}const N=C.map(([x,y])=>({x,y,ix:0,iy:0,ox:0,oy:0,k:'c'}));
  for(let i=0;i<n;i++){const a=N[i],b=N[(i+1)%n],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,l=Math.hypot(mx,my)||1,d=Math.hypot(b.x-a.x,b.y-a.y),nx=mx/l*d*.6,ny=my/l*d*.6;a.ox=nx;a.oy=ny;b.ix=nx;b.iy=ny}return{N,closed:true}};
 const heart={N:[{x:0,y:-.25,ix:0,iy:-.25,ox:0,oy:-.25,k:'c'},{x:-.5,y:-.1,ix:0,iy:-.4,ox:0,oy:.3,k:'s'},{x:0,y:.45,ix:-.1,iy:-.15,ox:.1,oy:-.15,k:'c'},{x:.5,y:-.1,ix:0,iy:.3,ox:0,oy:-.4,k:'s'}],closed:true};
 const arc={N:[{x:-.5,y:.25,ix:0,iy:0,ox:0,oy:-.5*K,k:'c'},{x:0,y:-.25,ix:-.5*K,iy:0,ox:.5*K,oy:0,k:'s'},{x:.5,y:.25,ix:0,iy:-.5*K,ox:0,oy:0,k:'c'}],closed:false};
 const SHP=[['check','✔','Check',()=>P([[-.48,.02],[-.32,-.14],[-.12,.08],[.36,-.42],[.5,-.28],[-.12,.36]])],['x','✖','X',()=>P(xs)],['star','★','Star',()=>P(reg(5,.5,.2))],
  ['circle','●','Circle',()=>circ(.5,.5)],['square','■','Square',()=>P([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]])],['triangle','▲','Triangle',()=>P([[0,-.5],[.5,.4],[-.5,.4]])],
  ['diamond','◆','Diamond',()=>P([[0,-.5],[.38,0],[0,.5],[-.38,0]])],['arrow','➜','Arrow',()=>P([[-.5,-.14],[.08,-.14],[.08,-.34],[.5,0],[.08,.34],[.08,.14],[-.5,.14]])],
  ['heart','♥','Heart',()=>heart],['flag','⚑','Flag',()=>P([[-.4,.5],[-.4,-.5],[.45,-.28],[-.3,-.06],[-.3,.5]])],
  // existing v104 markup shapes
  ['rect','▢','Box',()=>P([[-.5,-.32],[.5,-.32],[.5,.32],[-.5,.32]])],['rrect','▢','Rounded box',()=>rrect(1,.64,.14)],['ellipse','◯','Ellipse',()=>circ(.5,.32)],['arc','◠','Arc',()=>arc],
  ['tri','△','Triangle (outline)',()=>P([[0,-.45],[.5,.42],[-.5,.42]])],['poly','⬡','Polygon',()=>P(reg(6,.5))],['star5','☆','Star (outline)',()=>P(reg(5,.5,.2))],['cloud','☁','Revision cloud',()=>cloud()]];
 const SH=Object.fromEntries(SHP.map(s=>[s[0],s]));
 const DEF={k:'check',sz:28,op:100,rot:0,fill:true,sw:2},FK='bpm-stamp';let S=Object.assign({},DEF,JSON.parse(localStorage.getItem(FK)||'{}'));if(!SH[S.k])S.k='check';
 const save=()=>localStorage.setItem(FK,JSON.stringify(S));let MINE=[],RECENT=[];
 (async()=>{try{MINE=(await get('meta','stampsMine'))||[];RECENT=(await get('meta','stampsRecent'))||[]}catch{}})();
 // nodes for a config at center (cx,cy) in plan units (size = longest side)
 function build(cfg,cx,cy){const sh=SH[cfg.k]||SH.check,g=sh[3](),a=(cfg.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),z=cfg.sz,R=(x,y)=>[(x*c-y*s)*z,(x*s+y*c)*z];
  return{N:g.N.map(n=>{const[x,y]=R(n.x,n.y),[ix,iy]=R(n.ix,n.iy),[ox,oy]=R(n.ox,n.oy);return{x:cx+x,y:cy+y,ix,iy,ox,oy,k:n.k||'c'}}),closed:g.closed}}
 const canFill=k=>(SH[k]?SH[k][3]().closed:false);
 function makeMarkup(cfg,cx,cy){const{N,closed}=build(cfg,cx,cy),fill=!!cfg.fill&&closed;const m={id:uid(),planId:plan.id,page,type:'path',color:cfg.color||$('#color').value,w:fill?Math.max(.8,cfg.sw*.5):cfg.sw,opacity:clampOp((cfg.op||100)/100),fill:fill||undefined};
  PEN_API.writeNodes(m,N,closed,false);m.type='path';m.stamp={k:cfg.k,sz:cfg.sz,rot:cfg.rot||0,fill,sw:cfg.sw,dx:cx-m.x1,dy:cy-m.y1};return m}
 window.STAMP_API={build,makeMarkup,shapes:SHP.map(s=>s[0]),cfg:()=>({...S,color:$('#color').value}),set:o=>{Object.assign(S,o);save();bar()},rebake};
 // rebake a placed stamp (Properties: size / rotation); keeps its center, color, opacity
 function rebake(m,o){const st=m.stamp;if(!st)return m;const cx=m.x1+st.dx,cy=m.y1+st.dy,cfg={k:st.k,sz:o.sz??st.sz,rot:o.rot??st.rot,fill:st.fill,sw:st.sw};const{N,closed}=build(cfg,cx,cy);const a=structuredClone(m);
  PEN_API.writeNodes(a,N,closed,false);a.type='path';a.stamp={...st,sz:cfg.sz,rot:cfg.rot,dx:cx-a.x1,dy:cy-a.y1};return a}
 // preview svg / canvas
 function svgOf(cfg,px=34,col){const{N,closed}=build({...cfg,sz:.8},0,0);let d=`M${N[0].x} ${N[0].y}`;const seg=(p,q)=>`C${p.x+p.ox} ${p.y+p.oy} ${q.x+q.ix} ${q.y+q.iy} ${q.x} ${q.y}`;for(let i=1;i<N.length;i++)d+=seg(N[i-1],N[i]);if(closed)d+=seg(N[N.length-1],N[0])+'Z';
  const c=col||$('#color').value,fill=cfg.fill&&closed;return`<svg width="${px}" height="${px}" viewBox="-.5 -.5 1 1" aria-hidden="true"><path d="${d}" fill="${fill?c:'none'}" stroke="${c}" stroke-width="${fill?.03:Math.max(.04,cfg.sw*.02)}" stroke-linejoin="round" opacity="${(cfg.op||100)/100}"/></svg>`}
 window.stampSvg=svgOf;
 // ---- tool button + bar ----
 const tb=$('[data-t="stamp"]');
 function bar(){let b=$('#stBar');if(!b){b=ce('div');b.id='stBar';b.setAttribute('role','toolbar');b.setAttribute('aria-label','Stamp');stage.append(b)}if(tool!=='stamp'){b.hidden=true;window.toastLift&&setTimeout(toastLift,0);return}b.hidden=false;
  const sh=SH[S.k],cf=canFill(S.k),chip=(c,i,kind)=>`<button type="button" class="btn stChip" data-${kind}="${i}" title="${esc(c.name||SH[c.k]?.[2]||'')}">${svgOf(c,22,c.color)}<span class="tl">${esc(c.name||'')}</span></button>`;
  b.innerHTML=`<div class="stR"><span class="pbH">🔖 Stamp</span><span class="stPv" title="Preview">${svgOf(S,40)}</span>
   <button type="button" class="btn stB" id="stShape" title="Shape">${sh[1]}<span class="tl">${esc(sh[2])} ▾</span></button>
   <button type="button" class="btn stB" id="stCol" title="Color"><span class="stSw" style="background:${$('#color').value}"></span><span class="tl">Color</span></button>
   <button type="button" class="btn stB${S.fill&&cf?' on':''}" id="stFill" ${cf?'':'disabled'} title="Fill or outline">${S.fill&&cf?'◼':'◻'}<span class="tl">${S.fill&&cf?'Fill':'Outline'}</span></button>
   <button type="button" class="btn stB" id="stSave" title="Save these settings as a named stamp">＋<span class="tl">Save stamp</span></button></div>
   <div class="stR stS"><label class="stL">Size <input type="range" id="stSz" min="8" max="160" step="2" value="${S.sz}"><b id="stSzV">${S.sz}</b></label>
   <label class="stL">Opacity <input type="range" id="stOp" min="15" max="100" step="5" value="${S.op}"><b id="stOpV">${S.op}%</b></label>
   <label class="stL">Rotation <input type="range" id="stRot" min="0" max="359" step="1" value="${S.rot}"><b id="stRotV">${S.rot}°</b></label>
   <span class="stSnap">${[0,45,90].map(a=>`<button type="button" class="btn stA${S.rot===a?' on':''}" data-rot="${a}">${a}°</button>`).join('')}</span>
   <label class="stL"${S.fill&&cf?' hidden':''}>Stroke <input type="range" id="stSw" min="1" max="8" step="1" value="${S.sw}"><b id="stSwV">${S.sw}</b></label></div>
   <div class="stR stMine"><span class="stH">My stamps</span>${MINE.map((c,i)=>chip(c,i,'mine')).join('')||'<small class="stE">none saved yet</small>'}<span class="stH">Recent</span>${RECENT.map((c,i)=>chip(c,i,'rec')).join('')||'<small class="stE">—</small>'}</div>`;
  const q=s=>b.querySelector(s),pv=()=>{q('.stPv').innerHTML=svgOf(S,40)};
  q('#stShape').onclick=function(){wheelAnchor(this);wheelOpen('Stamp shape',SHP.map(s=>({k:s[0],l:s[2],html:`<span class="whIc">${svgOf({...S,k:s[0],rot:0},20,'#fff')}</span>${esc(s[2])}`})),SHP.findIndex(s=>s[0]===S.k),x=>{S.k=x.k;save();bar()})};
  q('#stCol').onclick=()=>{colSheet();const d=$('#colDlg');if(d){const f=()=>{bar();d.removeEventListener('close',f)};d.addEventListener('close',f)}};
  q('#stFill').onclick=()=>{S.fill=!S.fill;save();bar()};
  const rng=(id,k,fmt)=>{const r=q(id);r.oninput=()=>{S[k]=+r.value;q(id+'V').textContent=fmt(S[k]);if(k==='rot')b.querySelectorAll('.stA').forEach(x=>x.classList.toggle('on',+x.dataset.rot===S.rot));save();pv()}};
  rng('#stSz','sz',v=>v);rng('#stOp','op',v=>v+'%');rng('#stRot','rot',v=>v+'°');if(q('#stSw'))rng('#stSw','sw',v=>v);
  b.querySelectorAll('.stA').forEach(x=>x.onclick=()=>{S.rot=+x.dataset.rot;save();bar()});
  b.querySelectorAll('[data-mine],[data-rec]').forEach(x=>{x.onclick=()=>{const c=x.dataset.mine!=null?MINE[+x.dataset.mine]:RECENT[+x.dataset.rec];Object.assign(S,{k:c.k,sz:c.sz,op:c.op,rot:c.rot,fill:c.fill,sw:c.sw});if(c.color){$('#color').value=c.color;$('#color').dispatchEvent(new Event('input',{bubbles:true}))}save();bar()}});
  q('#stSave').onclick=async()=>{const nm=await uiPrompt('Name this stamp',SH[S.k][2]);if(nm==null||!String(nm).trim())return;MINE.unshift({...S,color:$('#color').value,name:String(nm).trim().slice(0,24)});MINE=MINE.slice(0,24);await put('meta',MINE,'stampsMine');bar();toast('Saved to My stamps')};
  window.toastLift&&setTimeout(toastLift,0)}
 window.stampBar=bar;document.querySelectorAll('[data-t]').forEach(x=>x.addEventListener('click',()=>setTimeout(bar,0)));
 $('#color').addEventListener('input',()=>{if(tool==='stamp')bar()});
 // ---- placing: a tap (no drag, one finger) on the plan places one stamp; drags/pinches pan and zoom as usual ----
 let dn=null;
 stage.addEventListener('pointerdown',e=>{if(tool!=='stamp'||!plan||!(e.target===cv||e.target===ov))return;dn=dn&&dn.n?{...dn,multi:true}:{x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId,n:1}},true);
 stage.addEventListener('pointerup',async e=>{if(tool!=='stamp'||!dn||dn.id!==e.pointerId){if(dn&&dn.id!==e.pointerId)dn.multi=true;return}const d=dn;dn=null;if(d.multi||Math.hypot(e.clientX-d.x,e.clientY-d.y)>8||performance.now()-d.t>700)return;
  e.stopImmediatePropagation();try{if(typeof ptrs!=='undefined')ptrs.delete(e.pointerId);gesture=null}catch{}
  const r=stage.getBoundingClientRect(),w=toW(e.clientX-r.left,e.clientY-r.top),cfg={...S,color:$('#color').value},m=makeMarkup(cfg,w.x,w.y);await change('markups',null,m);requestDraw(false);
  const key=JSON.stringify([cfg.k,cfg.sz,cfg.op,cfg.rot,cfg.fill,cfg.sw,cfg.color]);RECENT=[cfg,...RECENT.filter(c=>JSON.stringify([c.k,c.sz,c.op,c.rot,c.fill,c.sw,c.color])!==key)].slice(0,6);try{await put('meta',RECENT,'stampsRecent')}catch{}
  const rr=$('#stBar .stMine');if(rr)bar()},true);
 stage.addEventListener('pointercancel',()=>{dn=null},true);
 // ---- Properties: size + rotation for selected stamps ----
 const bk=$('#bkM');if(bk){const d=ce('div');d.id='bkSt';d.innerHTML=`<b>Stamps</b><label><input type="checkbox" id="bkRotOn" style="width:auto"> Rotation <input type="range" id="bkRot" min="0" max="359" value="0" style="width:110px;vertical-align:middle"> <span id="bkRotLbl">0°</span></label>
   <span class="row" style="gap:4px">${[0,45,90].map(a=>`<button type="button" class="btn" data-bkrot="${a}">${a}°</button>`).join('')}</span>
   <label><input type="checkbox" id="bkSzOn" style="width:auto"> Size <input type="range" id="bkSz" min="8" max="160" step="2" value="28" style="width:110px;vertical-align:middle"> <span id="bkSzLbl">28</span></label>`;bk.after(d);
  const r=$('#bkRot'),z=$('#bkSz');r.oninput=()=>{$('#bkRotOn').checked=true;$('#bkRotLbl').textContent=r.value+'°'};z.oninput=()=>{$('#bkSzOn').checked=true;$('#bkSzLbl').textContent=z.value};
  d.querySelectorAll('[data-bkrot]').forEach(x=>x.onclick=()=>{r.value=x.dataset.bkrot;r.oninput()});
  const _ob=window.openBulk||openBulk;openBulk=function(){_ob();const st=selItems().filter(o=>o.stamp);d.hidden=!st.length;$('#bkRotOn').checked=$('#bkSzOn').checked=false;if(st.length){r.value=st[0].stamp.rot||0;z.value=st[0].stamp.sz;$('#bkRotLbl').textContent=r.value+'°';$('#bkSzLbl').textContent=z.value}};
  const go=$('#bkGo'),_og=go.onclick;go.onclick=async e=>{const ro=$('#bkRotOn').checked?+r.value:null,so=$('#bkSzOn').checked?+z.value:null,st=selItems().filter(o=>o.stamp&&o.planId===plan?.id);
   const other=$('#bkCOn').checked||$('#bkSize').value||$('#bkOOn').checked||$('#bkStatus').value||$('#bkType').value;if(other)await _og.call(go,e);else $('#bulkDlg').close();
   if((ro!=null||so!=null)&&st.length){const L=st.map(o=>{const cur=markups.find(x=>x.id===o.id)||o;return{store:'markups',id:o.id,before:cur,after:rebake(cur,{rot:ro??undefined,sz:so??undefined})}});await changeMulti(L);requestDraw(false);toast(`Stamp${L.length>1?'s':''} updated · Undo ↶ in the top bar`)}}}
})();
}catch(e){console.error('21-stamp-tool.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/22-page-kind.js =====
try{
// bpm-v107: page kind for Detect. bpm-v128: demolition plans are skipped too. Riser and wiring sheets get no Detect pins (bpm-v108: also equipment-detail and schedule/calculation sheets). The kind is read from the title block's SHEET TITLE field
// (falling back to the big drawing titles next to the sheet number). A floor-plan title (… PLAN) always wins, so a small "wiring" detail
// box on a plan never skips it. Per-page override "Detect this page anyway" is remembered (IndexedDB meta 'detAny').
(()=>{const KC=new Map();let ANY=null;
 const RISER=/\bRISER\b(?!\s*DETAIL)|\bFAS[- ]?RISER/i,WIRE=/\bWIRING\s+(DIAGRAMS?|DETAILS?)\b|\bTYPICAL\s+WIRING\b|\bPOINT[- ]TO[- ]POINT\b|\bSCHEMATICS?\b|\bONE[- ]LINE\b/i,PLAN=/\bPLANS?\b/i,DEMO=/\bDEMOLITION\b|\bDEMO\s+PLANS?\b/i,EXIST=/\bEXISTING\b/i,NEWW=/\bNEW\b|RENOVATION|PROPOSED|ADDITION/i,NEWP=/\b(RENOVATION|NEW\s+WORK|NEW\s+CONSTRUCTION|PROPOSED)\s+PLANS?\b/i;
 async function loadAny(){if(ANY)return ANY;let a=null;try{a=await get('meta','detAny')}catch{}ANY=new Set(Array.isArray(a)?a:[]);return ANY}
 window.detAnyway=async(pid,n,on)=>{await loadAny();const k=pid+':'+n;if(on===undefined)return ANY.has(k);if(on)ANY.add(k);else ANY.delete(k);try{await put('meta',[...ANY],'detAny')}catch{}return on};
 function classify(items){const I=[];for(const t of items){const s=(t.str||'').trim();if(!s)continue;const tr=t.transform,sz=Math.max(Math.hypot(tr[2],tr[3]),Math.hypot(tr[0],tr[1])*0)||t.height||0,l=Math.hypot(tr[0],tr[1])||1;I.push({s,sz,x:tr[4],y:tr[5],dx:tr[0]/l,dy:tr[1]/l})}
  // 1. SHEET TITLE field: the bigger lines just after the label, in its reading direction
  let title='';const lab=I.find(t=>/^SHEET\s*TITLE\s*:?$/i.test(t.s))||I.find(t=>/SHEET\s*TITLE\s*:/i.test(t.s));
  if(lab){const dn={x:lab.dy,y:-lab.dx},L=[];for(const t of I){if(t===lab||t.sz<lab.sz*1.25)continue;const rx=t.x-lab.x,ry=t.y-lab.y,al=rx*lab.dx+ry*lab.dy,ac=rx*dn.x+ry*dn.y;if(ac>0&&ac<t.sz*6&&al>-lab.sz*3&&al<lab.sz*45)L.push({...t,ac,al})}
   L.sort((a,b)=>a.ac-b.ac||a.al-b.al);let last=null;for(const t of L){if(last!=null&&t.ac-last>t.sz*2.6)break;title+=(title?' ':'')+t.s;last=t.ac}
   const inl=lab.s.replace(/^.*SHEET\s*TITLE\s*:?/i,'').trim();if(inl)title=inl+' '+title}
  // 2. sheet number + big drawing titles
  const SN=I.filter(t=>/^X?FAS-?\d{3}[A-Z]?$/i.test(t.s)).sort((a,b)=>b.sz-a.sz)[0]||null,mx=Math.max(0,...I.map(t=>t.sz)),thr=SN?SN.sz*.8:mx*.6;
  const big=I.filter(t=>t.sz>=thr&&t.s.length>3&&/[A-Z]{3}/i.test(t.s)&&t!==SN).map(t=>t.s);
  const src=title?'sheet title':'drawing titles',txt=title||big.join(' | ');
  let kind=null,why='';
  // bpm-v128: a demolition plan shows the existing devices that come out, not the new install, so Detect skips it like a riser sheet (the "… PLAN" rule would otherwise keep it). Read from the sheet title (or the big drawing titles when there is no SHEET TITLE field).
  if(DEMO.test(txt)&&!NEWP.test(txt)){kind='demolition';why=`${src}: ${(txt.match(/[^|]*DEMO[^|]*/i)||[txt])[0].trim()}`}
  else if(PLAN.test(txt)&&EXIST.test(txt)&&!NEWW.test(txt)){kind='existing';why=`${src}: ${(txt.match(/[^|]*EXISTING[^|]*/i)||[txt])[0].trim()}`} // bpm-v128: an existing-conditions plan ("EXISTING … PLAN", nothing new on it)
  else if(PLAN.test(txt)&&!RISER.test(title)){kind=null;why='plan title'}
  else if(RISER.test(txt)){kind='riser';why=`${src}: ${(txt.match(/[^|]*RISER[^|]*/i)||[txt])[0].trim()}`}
  else if(WIRE.test(txt)||(title&&/\bWIRING\b/i.test(title))){kind='wiring';why=`${src}: ${(txt.match(/[^|]*(WIRING|POINT|SCHEMATIC|ONE[- ]LINE)[^|]*/i)||[txt])[0].trim()}`}
  // bpm-v108: other non-plan sheets by their sheet title (equipment details / elevations / graphic displays; schedules, matrices, calculations, index)
  else if(/\bDETAILS?\b|\bELEVATIONS?\b|GRAPHIC DISPLAY|ISOMETRIC/i.test(txt)){kind='detail';why=`${src}: ${txt.trim()}`}
  else if(/\bSCHEDULES?\b|\bMATRIX\b|CALCULATIONS?\b|INDEX SHEET|COVER SHEET/i.test(txt)){kind='schedule';why=`${src}: ${txt.trim()}`}
  else if(!title&&SN&&/^X?FAS-?50\d$/i.test(SN.s)&&!PLAN.test(big.join(' '))){kind='riser';why=`sheet no. ${SN.s} (riser series)`}
  return{kind,why:why.slice(0,90),title:title.slice(0,90),sheet:SN?SN.s:''}}
 window.pageKindOf=classify;
 window.pageKind=async(pid,n,pg)=>{const k=pid+':'+n;if(KC.has(k))return KC.get(k);const p=(async()=>{try{const P=pg||(window.detPage?await detPage(n):await pdf.getPage(n)),tc=await P.getTextContent();return classify(tc.items)}catch(e){return{kind:null,why:'no text',title:''}}})();KC.set(k,p);return p};
 // Sheets list (Pages): note + override on the current page
 window.pkDecorate=async b=>{if(!plan||!pdf||!b)return;await loadAny();const pid=plan.id;for(const x of b.querySelectorAll('[data-pg]')){const n=+x.dataset.pg,k=await pageKind(pid,n);if(plan?.id!==pid)return;x.querySelector('.thSk')?.remove();x.nextElementSibling?.classList?.contains('thAny')&&x.nextElementSibling.remove();
   if(!k.kind)continue;const any=ANY.has(pid+':'+n),s=document.createElement('span');s.className='thSk'+(any?' any':'');s.textContent=any?`Detect on (${k.kind})`:`Skipped: ${k.kind}`;s.title=`Detect ${any?'runs here anyway':'skips this page'} — ${k.why}`;x.append(s);
   if(n===page){const o=document.createElement('button');o.type='button';o.className='btn thAny';o.dataset.anyPg=n;o.textContent=any?'Skip this page again':'Detect this page anyway';o.title=k.why;o.onclick=async e=>{e.stopPropagation();await detAnyway(pid,n,!any);toast(any?`Page ${n}: Detect will skip it (${k.kind})`:`Page ${n}: Detect will run here`);renderThumbs()};x.after(o)}}};
 const _rt=renderThumbs;renderThumbs=function(){_rt();const b=$('#thumbs');if(b&&!b.hidden)pkDecorate(b)};
})();
}catch(e){console.error('22-page-kind.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/23-type-layers.js =====
try{
// bpm-v102: pin TYPE layers. Per project (localStorage 'bpm-tlay:<projectId>'). Hidden types are not drawn, not hit-testable,
// not in the Pins list (a note says how many are hidden), skipped by Walk. Pin data, geometry, totals and exports are untouched.
(()=>{window.HT=new Set();let pid=null;const K=()=>'bpm-tlay:'+pid;
 const load=()=>{let id=null;try{id=project?.id||null}catch{}if(id===pid)return;pid=id;HT=window.HT=new Set(id?JSON.parse(localStorage.getItem(K())||'[]'):[]);mark()};
 const save=()=>{if(pid)localStorage.setItem(K(),JSON.stringify([...HT]));mark();window.lpRender&&lpRender();try{sel=null;msel=msel.filter(tVis)}catch{}draw();renderList();if(walk&&walk.p&&!tVis(walk.p))walkNext()};
 const mark=()=>{const on=HT.size>0;document.querySelectorAll('[data-tlay],#tools .tbFlat').forEach(b=>{if(b.dataset.tlay!=null||b._x?.k==='tlay')b.classList.toggle('tlHid',on)});const m=document.querySelector('#tools [data-w=more]');if(m)m.classList.toggle('tlHid',on)};
 window.tlayMark=mark;setInterval(load,700);
 const sw=t=>`<i class="tlSw${t.sq?' sq':''}" style="background:${t.c}">${esc(t.l||'')}</i>`;
 async function counts(){const n={};try{for(const pl of(await all('plans')).filter(p=>p.projectId===project.id))for(const p of await byIdx('pins','planId',pl.id))n[p.type]=(n[p.type]||0)+1}catch{for(const p of pins)n[p.type]=(n[p.type]||0)+1}return n}
 async function open(){if(!project)return uiAlert('Open a project first.');load();const n=await counts();let d=$('#tlDlg');if(!d){d=document.createElement('dialog');d.id='tlDlg';document.body.append(d)}
  const ks=Object.keys(n).filter(k=>TYPES[k]).sort((a,b)=>TYPES[a].n.localeCompare(TYPES[b].n));
  d.innerHTML=`<div class="cHead"><b>Layers: device types</b><span class="sp"></span><button type="button" class="btn" id="tlX">✕<span class="tl">Close</span></button></div>
   <div class="row tlAN"><button type="button" class="btn" id="tlAll">Show all</button><button type="button" class="btn" id="tlNone">Hide all</button><span class="sp"></span><small id="tlInfo"></small></div>
   <div class="tlList">${ks.length?ks.map(k=>`<label class="tlRow"><input type="checkbox" data-k="${k}"${HT.has(k)?'':' checked'}>${sw(TYPES[k])}<span class="tlN">${esc(TYPES[k].n.replace(/ – .*/,''))}</span><small>${n[k]}</small></label>`).join(''):'<p>No pins in this project yet.</p>'}</div>
   <small class="wNote">Hidden types stay in totals and every export. More view options: <a href="#" id="tlMore">Filters</a>.</small>`;
  const info=()=>{const h=ks.filter(k=>HT.has(k)).length;d.querySelector('#tlInfo').textContent=h?`${h} of ${ks.length} hidden`:'All shown'};info();
  d.querySelectorAll('[data-k]').forEach(c=>c.onchange=()=>{c.checked?HT.delete(c.dataset.k):HT.add(c.dataset.k);info();save()});
  d.querySelector('#tlAll').onclick=()=>{HT.clear();d.querySelectorAll('[data-k]').forEach(c=>c.checked=true);info();save()};
  d.querySelector('#tlNone').onclick=()=>{ks.forEach(k=>HT.add(k));d.querySelectorAll('[data-k]').forEach(c=>c.checked=false);info();save()};
  d.querySelector('#tlX').onclick=()=>d.close();d.querySelector('#tlMore').onclick=e=>{e.preventDefault();d.close();$('#layBtn').click()};d.onclick=e=>{if(e.target===d)d.close()};if(!d.open)d.showModal()}
 window.tlayOpen=open;window.tlaySave=()=>{load();save()};window.tlayLoad=load;
})();
}catch(e){console.error('23-type-layers.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/24-top-bar.js =====
try{
// bpm-v102: top bar "Option B" — breadcrumb line + ONE row of uniform icon-over-label buttons (two rows on phone).
// Original controls are kept (hidden or moved), so every existing handler keeps working. Dropdowns use the wheel picker.
(()=>{const P=$('#proj'),T=$('#top');if(!P||!T||!window.wheelOpen)return;
 const H=document.createElement('div');H.id='tb2Hidden';H.hidden=true;document.body.append(H);
 const mk=(id,ic,lab,run,title)=>{const b=document.createElement('button');b.type='button';b.className='btn tb2';b.id=id;b.innerHTML=`<span class="tb2i">${ic}</span><span class="tl">${lab}</span>`;b.title=title||lab.replace(' ▾','');if(run)b.onclick=run;return b};
 const relabel=(el,ic,lab)=>{el.classList.add('tb2');el.innerHTML=`<span class="tb2i">${ic}</span><span class="tl">${lab}</span>`;return el};
 const wheel=(title,items,cur)=>wheelOpen(title,items.map(x=>({...x,html:`<span class="whIc">${x.i||''}</span>${esc(x.l)}`})),Math.max(0,cur??0),x=>x.run());
 const click=id=>()=>by(id).click();
 // ---- breadcrumb ----
 const bc=document.createElement('div');bc.id='tb2Crumb';
 [...P.childNodes].forEach(n=>H.append(n));P.append(bc);P.classList.add('tb2P');
 const pageName=()=>{try{return plan&&pnm(plan.id,page)}catch{return''}};
 const crumb=()=>{let s;try{const pr=by('projSel').selectedOptions[0]?.text||'Project';if(!plan)s=`${esc(pr)} › <span class="tb2m">no plan open</span>`;else{const nm=pageName();s=`${esc(pr)} › <b>${esc(plan.name||'Plan')}</b> · Page ${page}${nm?' “'+esc(nm)+'”':''} of ${plan.pages||1} · ${pins.length} pin${pins.length===1?'':'s'}`}}catch{s=''}if(bc._s!==s){bc._s=s;bc.innerHTML=s;bc.title=bc.textContent}};
 // ---- buttons ----
 const projB=mk('tb2Proj','📁','Project ▾',()=>{const ps=[...by('projSel').options];wheel('Project',[{i:'＋',l:'New project',run:click('projNew')},{i:'✎',l:'Rename project',run:click('projRen')},{i:'💾',l:'Save project file',run:click('projSave')},{i:'📥',l:'Open project file…',run:()=>by('bpmFile').click()},{i:'🗑',l:'Delete project',run:click('projDel')},...ps.map(o=>({i:o.selected?'✓':'↪',l:'Switch to: '+o.text,run:()=>{by('projSel').value=o.value;by('projSel').dispatchEvent(new Event('change',{bubbles:true}))}}))],0)},'Project: new, rename, save, open, delete, switch');
 const planB=mk('tb2Plan','📄','Plan ▾',()=>{const ps=[...by('planSel').options].filter(o=>o.value);wheel('Plan',[{i:'📂',l:'Open plan (PDF / image)…',run:()=>by('file').click()},{i:'✎',l:'Rename page',run:()=>plan?pnRename(page):uiAlert('Open a plan first.')},{i:'🗑',l:'Delete plan',run:click('planDel')},...ps.map(o=>({i:o.selected?'✓':'↪',l:'Switch to: '+o.text,run:()=>{by('planSel').value=o.value;by('planSel').dispatchEvent(new Event('change',{bubbles:true}))}}))],0)},'Plan: open, rename page, delete, switch');
 const prev=relabel(by('prev'),'◀','Previous'),next=relabel(by('next'),'▶','Next');
 const pageB=mk('tb2Page','<b class="tb2n">–</b>','Page ▾',()=>{const o=[...by('pageSel').options];if(!o.length)return uiAlert('Open a plan first.');wheel('Page',o.map(x=>({i:'',l:x.text,run:()=>{by('pageSel').value=x.value;by('pageSel').dispatchEvent(new Event('change',{bubbles:true}))}})),by('pageSel').selectedIndex)},'Go to page');
 const zoomB=mk('tb2Zoom','<b class="tb2n" id="tb2Z">—</b>','Zoom',()=>by('fit')?.click(),'Current zoom (tap: fit to screen)');
 const rot=relabel(by('rotBtn'),'⟳','Rotate'),pg=relabel(by('thBtn'),'▤','Pages');
 const layB=mk('tb2Lay','◧','Layers',()=>tlayOpen(),'Layers: show/hide device types (plus Filters)');layB.dataset.tlay='';
 const exW=document.querySelector('#top .exWrap');relabel(by('exMenu'),'⤓','Export');const mic=relabel(by('micBtn'),'🎤','Voice');const pinsB=relabel(by('listBtn'),'📍','Pins');
 const czMore=[{i:'⚙',l:'Customize',run:()=>by('czBtn')?.click()}];
 const moreB=mk('tb2More','⋯','More ▾',()=>{const ph=matchMedia('(max-width:599px)').matches,L=[...czMore];if(!ph&&matchMedia('(max-width:879px)').matches){L.push({i:'⟳',l:'Rotate view'+(VR?` (now ${VR}°)`:''),run:()=>rot.click()});if(!mic.hidden)L.push({i:'🎤',l:'Voice',run:()=>mic.click()})}/* bpm-v112: tablet portrait keeps Pins on screen */if(ph){L.push({i:'⟳',l:'Rotate view'+(VR?` (now ${VR}°)`:''),run:()=>rot.click()});if(!mic.hidden)L.push({i:'🎤',l:'Voice',run:()=>mic.click()});L.push({i:'⤓',l:'Export plan as PNG',run:click('exPng')},{i:'⤓',l:'Export plan as PDF',run:click('exPdf')})}L.push({i:'👁',l:'Filters (markups, labels, status)',run:click('layBtn')});wheel('More',L,0)},'More');
 [...T.children].forEach(n=>{if(![exW,mic].includes(n))H.append(n)});
 const sp=()=>{const s=document.createElement('span');s.className='sp';return s},br=document.createElement('i');br.className='tb2Br';
 const s1=sp(),s2=sp();s1.classList.add('tb2S1');s2.classList.add('tb2S2');// bpm-v105: Undo / Redo live in the top bar (same #undo/#redo buttons, so updUR() greys them out); phone: first on row 2, Rotate moves into More
 const und=relabel(by('undo'),'↶','Undo'),red=relabel(by('redo'),'↷','Redo');und.classList.remove('tool');red.classList.remove('tool');und.title='Undo (Control+Z)';red.title='Redo (Control+Y)';
 T.append(projB,planB,und,red,prev,pageB,next,pg,zoomB,br,s1,rot,layB,exW,mic,pinsB,s2,moreB);/* bpm-v113: Pages toggle sits with Prev/Page/Next */[s1,rot,pg,layB,exW,mic,pinsB,s2,moreB].forEach(e=>e&&e.classList.add('tb2R2'));T.classList.add('tb2T');
 by('czBtn')&&H.append(by('czBtn'));
 const upd=()=>{crumb();try{pageB.querySelector('.tb2n').textContent=plan?`${page}/${plan.pages||1}`:'–';by('tb2Z').textContent=by('zoomPct').textContent}catch{}};setInterval(upd,400);upd();window.tb2Upd=upd;
})();
}catch(e){console.error('24-top-bar.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/25-layers-panel.js =====
try{
// bpm-v106: docked Layers panel (right of the plan, about the left page strip's width). Same v102 data as the Layers dialog:
// one layer per pin type (window.HT, per project, localStorage 'bpm-tlay:<projectId>') plus Markups (Filters' shapes/clouds/text).
// Wide (≥800px): a grid column, so the plan area shrinks for it (no overlap with pins). Narrower: slide-over from the right, closed by ✕ or the top-bar button.
(()=>{const KEY='bpm-layPanel',P=document.createElement('aside');P.id='lyrP';P.hidden=true;P.setAttribute('aria-label','Layers');document.body.append(P);
 const WMQ=matchMedia('(min-width:800px)');let N={},nT=0,busyN=false;
 const isOpen=()=>!P.hidden,btn=()=>document.getElementById('tb2Lay');
 async function counts(){if(busyN)return;busyN=true;const n={};try{const pl=(await all('plans')).filter(p=>p.projectId===project?.id);for(const q of pl){const ps=plan&&q.id===plan.id?pins:await byIdx('pins','planId',q.id);for(const p of ps)n[p.type]=(n[p.type]||0)+1}}catch{for(const p of pins)n[p.type]=(n[p.type]||0)+1}finally{busyN=false}N=n;render()}
 const mkOn=()=>lay.shapes!==false||lay.clouds!==false||lay.text!==false;
 const setMk=v=>{lay.shapes=lay.clouds=lay.text=v;laySave();try{layToForm()}catch{}};
 const eye=on=>`<span class="lpEye" aria-hidden="true">${on?'👁':'<s>👁</s>'}</span>`;
 function render(){if(!isOpen())return;try{tlayLoad&&tlayLoad()}catch{}const H=window.HT||new Set(),ks=Object.keys(N).filter(k=>TYPES[k]).sort((a,b)=>TYPES[a].n.localeCompare(TYPES[b].n));
  const nm=(()=>{try{return markups.length}catch{return 0}})(),hid=ks.filter(k=>H.has(k)).length+(mkOn()?0:1);
  const row=(k,on,sw,lab,c,tt)=>`<button type="button" class="lpRow${on?'':' off'}" data-k="${k}" aria-pressed="${on}" title="${esc(tt)}">${eye(on)}${sw}<span class="lpN">${esc(lab)}</span><small class="lpC">${c}</small></button>`;
  P.innerHTML=`<div class="lpHead"><b>Layers</b><span class="sp"></span><button type="button" class="btn lpX" id="lpX" title="Close the Layers panel" aria-label="Close the Layers panel">✕<span class="tl">Close</span></button></div>
   <div class="lpAN"><button type="button" class="btn" id="lpAll" title="Show every layer">👁<span class="tl">Show all</span></button><button type="button" class="btn" id="lpNone" title="Hide every layer">🚫<span class="tl">Hide all</span></button></div>
   <small class="lpInfo">${!project?'Open a project':hid?hid+' hidden':'All shown'}</small>
   <div class="lpList">${row('__mk',mkOn(),'<i class="tlSw lpMk">✎</i>','Markups',nm,'Markups (shapes, clouds, text) on this plan')}
   ${ks.length?ks.map(k=>row(k,!H.has(k),`<i class="tlSw${TYPES[k].sq?' sq':''}" style="background:${TYPES[k].c}">${esc(TYPES[k].l||'')}</i>`,TYPES[k].n.replace(/ – .*/,''),N[k],TYPES[k].n+' – '+N[k]+' in this project')).join(''):'<p class="lpE">No pins yet</p>'}</div>
   <button type="button" class="btn lpMore" id="lpMore" title="More view options (labels, status, suggestions)">⚙<span class="tl">Filters…</span></button>`;
  P.querySelector('#lpX').onclick=()=>set(false);P.querySelector('#lpMore').onclick=()=>{if(!WMQ.matches)set(false);$('#layBtn').click()};
  P.querySelectorAll('.lpRow').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(k==='__mk')return setMk(!mkOn()),render();const H=window.HT;if(!H)return;H.has(k)?H.delete(k):H.add(k);tlaySave()});
  P.querySelector('#lpAll').onclick=()=>{window.HT&&HT.clear();if(!mkOn())setMk(true);tlaySave()};
  P.querySelector('#lpNone').onclick=()=>{if(window.HT)ks.forEach(k=>HT.add(k));if(mkOn())setMk(false);tlaySave()}}
 window.lpRender=render;
 function place(){if(WMQ.matches){P.style.top=P.style.bottom='';return}const t=document.getElementById('top'),b=document.getElementById('tools');P.style.top=Math.round(t?t.getBoundingClientRect().bottom:0)+'px';P.style.bottom=Math.round(b?innerHeight-b.getBoundingClientRect().top:0)+'px'}
 function set(on,quiet){if(on&&window.pinsPanel)try{pinsPanel(false)}catch{}/* bpm-v111: Layers replaces Pins in the right-side slot */P.hidden=!on;document.body.classList.toggle('lpOn',on);const b=btn();if(b){b.classList.toggle('pri',on);b.setAttribute('aria-pressed',on)}if(!quiet)localStorage.setItem(KEY,on?'1':'0');if(on){place();counts()}try{resize()}catch{}}
 window.layPanel=set;window.layPanelToggle=()=>set(!isOpen());
 // top-bar Layers button opens/closes the panel (the full dialog is still in the bottom toolbar's Layers ▾)
 const hook=()=>{const b=btn();if(!b)return setTimeout(hook,200);b.onclick=()=>window.layPanelToggle();b.title='Layers panel: show/hide device types and markups';set(localStorage.getItem(KEY)==='1',true)};hook();
 WMQ.addEventListener('change',()=>{place();try{resize()}catch{}});addEventListener('resize',place);
 // keep counts fresh
 let tm=0;const later=()=>{clearTimeout(tm);tm=setTimeout(()=>isOpen()&&counts(),500)};
 {const _ac=window.afterChange;if(typeof afterChange==='function'){const a0=afterChange;afterChange=function(){a0.apply(this,arguments);later()}}}
 let lastK='';setInterval(()=>{if(!isOpen())return;const k=(project?.id||'')+':'+(plan?.id||'')+':'+pins.length+':'+markups.length+':'+(window.HT?HT.size:0)+':'+mkOn();if(k!==lastK){lastK=k;counts()}},800);
})();
}catch(e){console.error('25-layers-panel.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/26-pin-delete.js =====
try{
// bpm-v106: floating "Delete" beside the tapped/selected pin (anchored to it through pan / zoom / rotate; sits just outside the pin's status ring so the
// print symbol stays visible). Tapping it opens the delete options as the floating wheel anchored to the button, with Cancel: this pin / N selected,
// all of this type on the page or plan, all pins on the page or plan. Everything goes through changeMulti → one top-bar Undo step. (The pin sheet no longer has Delete.)
(()=>{let PDT=null,dn=null;const B=document.createElement('button');B.type='button';B.id='pinDelF';B.className='btn danger';B.hidden=true;stage.append(B);
 window.pdTap=p=>{PDT=p?p.id:null};
 const tapPin=()=>PDT&&pins.find(p=>p.id===PDT&&p.page===page)||null;
 function items(){if(walk||!plan)return[];const S=selItems().filter(o=>isPinO(o)&&o.page===page&&tVis(o));if(S.length)return S;if(tool!=='select'){const p=tapPin();if(p&&tVis(p)&&pVis(p))return[p]}return[]}
 const scr=p=>{const o=OFFMAP&&OFFMAP.get(p.id);return toS(p.x+(o?o.dx:0),p.y+(o?o.dy:0))};
 let lastK='';function tick(){requestAnimationFrame(tick);const L=items(),modal=[...document.querySelectorAll('dialog[open]')].length>0||(document.querySelector('#mnuSheet')&&!document.querySelector('#mnuSheet').hidden);
  const mine=B.classList.contains('whPressed')&&document.querySelector('#mnuSheet')&&!document.querySelector('#mnuSheet').hidden;if(mine)return;
  if(!L.length||modal){if(!B.hidden)B.hidden=true;return}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const SW=stage.clientWidth,SH=stage.clientHeight,onS=L.filter(p=>{const s=scr(p);return s.x>=0&&s.x<=SW&&s.y>=0&&s.y<=SH});for(const p of (onS.length?onS:L)){const s=scr(p),h=pinHalf(p)*view.s+2;x0=Math.min(x0,s.x-h);x1=Math.max(x1,s.x+h);y0=Math.min(y0,s.y-h);y1=Math.max(y1,s.y+h)}
  const lab=L.length>1?`Delete ${L.length}`:'Delete';if(B._l!==lab){B._l=lab;B.innerHTML=`<span class="pdI">🗑</span><span class="tl">${lab}</span>`}
  if(B.hidden)B.hidden=false;const W=stage.clientWidth,H=stage.clientHeight,bw=B.offsetWidth||64,bh=B.offsetHeight||40;
  let x=x1+8,y=(y0+y1)/2-bh/2;if(x+bw>W-4)x=x0-8-bw;if(x<4){x=Math.max(4,Math.min(W-bw-4,(x0+x1)/2-bw/2));y=y1+8;if(y+bh>H-4)y=y0-8-bh}
  y=Math.max(4,Math.min(H-bh-4,y));const k=Math.round(x)+','+Math.round(y);if(k!==lastK){lastK=k;B.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`}
  const off=x1<0||x0>W||y1<0||y0>H;B.style.visibility=off?'hidden':''}
 requestAnimationFrame(tick);
 // a tap (not a pan) on empty plan or another item clears the tapped pin
 stage.addEventListener('pointerdown',e=>{if(e.target===cv||e.target===ov)dn={x:e.clientX,y:e.clientY,n:(dn&&dn.t>performance.now()-400)?2:1,t:performance.now()}},true);
 stage.addEventListener('pointerup',e=>{if(!dn||!PDT)return;const d=Math.hypot(e.clientX-dn.x,e.clientY-dn.y);dn=null;if(d>8)return;const r=stage.getBoundingClientRect(),w=toW(e.clientX-r.left,e.clientY-r.top),h=hit(w);if(!(h&&h.kind==='p'&&h.o.id===PDT))setTimeout(()=>{if(!document.querySelector('#pinDlg[open]'))PDT=null},0)},true);
 async function run(list,what){list=list.filter(p=>p.planId===plan?.id);if(!list.length)return toast('Nothing to delete');const L=[];for(const p of list)L.push({store:'pins',id:p.id,before:p,after:null,media:await byIdx('media','pinId',p.id,true)});
  sel=null;msel=[];PDT=null;await changeMulti(L);try{renderSelBar()}catch{}requestDraw(false);toast(`Deleted ${what} · Undo ↶ in the top bar`)}
 B.addEventListener('pointerdown',e=>e.stopPropagation());
 B.onclick=e=>{e.stopPropagation();const L=items();if(!L.length)return;const p=L[0],T=TYPES[p.type]||TYPES.other,tn=T.n.replace(/ – .*/,''),pg=pins.filter(x=>x.page===page),same=pg.filter(x=>x.type===p.type),sameAll=pins.filter(x=>x.type===p.type);
  const nm=x=>x+' pin'+(x===1?'':'s'),opts=[];
  if(L.length>1)opts.push({i:'☑',l:`Delete ${L.length} selected`,run:()=>run(L,nm(L.length)+' (selection)')});else opts.push({i:'📍',l:'Delete this pin'+(p.address?` (${p.address})`:''),run:()=>run([p],'1 pin')});
  if(L.length===1||new Set(L.map(x=>x.type)).size===1){opts.push({i:'◆',l:`All ${tn} on this page (${same.length})`,run:()=>run(same,`${nm(same.length)} · ${tn} on page ${page}`)});if(plan.pages>1)opts.push({i:'◆',l:`All ${tn} on this plan (${sameAll.length})`,run:()=>run(sameAll,`${nm(sameAll.length)} · ${tn} on this plan`)})}
  opts.push({i:'▤',l:`All pins on this page (${pg.length})`,run:()=>run(pg,`${nm(pg.length)} on page ${page}`)});if(plan.pages>1)opts.push({i:'▦',l:`All pins on this plan (${pins.length})`,run:()=>run(pins.slice(),`${nm(pins.length)} on this plan`)});
  opts.push({i:'✕',l:'Cancel',run:()=>{}});window.wheelAnchor&&wheelAnchor(B);wheelOpen('Delete pins',opts.map(o=>({...o,html:`<span class="whIc">${o.i}</span>${esc(o.l)}`})),0,o=>o.run())};
 window.pinDelFloat=B;
})();
}catch(e){console.error('26-pin-delete.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/27-type-colors.js =====
try{
// bpm-v107: per-device-type colors. Tap a type in the Color sheet (Device type colors) or its swatch in the Layers panel to pick a color;
// pins, list dots, Layers swatches, the color sheet and exports (all drawn from TYPES[k].c) follow. Reset to default per type or for all.
// "Panels (all)" and "VESDA (all parts)" change as one group. Stored per device in localStorage 'bpm-typeColors' ({type:color}).
(()=>{const KEY='bpm-typeColors',DEF={};for(const [k,t] of Object.entries(TYPES))DEF[k]=t.c;
 const PG=typeof PANEL_GRP!=='undefined'?PANEL_GRP:[],VG=Object.keys(DEF).filter(k=>typeof VESDA_C!=='undefined'&&DEF[k]===VESDA_C);
 const grpOf=k=>PG.includes(k)?{ks:PG,n:'Panels (all)'}:VG.includes(k)?{ks:VG,n:'VESDA (all parts)'}:{ks:[k],n:(TYPES[k]?.n||k).replace(/ – .*/,'')};
 let O={};try{O=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{O={}}
 const syncGrp=()=>{try{for(const c of Object.keys(CGRP))delete CGRP[c];const pc=TYPES[PG[0]]?.c,vc=VG.length&&TYPES[VG[0]].c;if(pc)CGRP[pc]='Panels (all)';if(vc)CGRP[vc]='VESDA (all parts)'}catch{}};
 const apply=()=>{for(const k of Object.keys(DEF))if(TYPES[k])TYPES[k].c=O[k]||DEF[k];syncGrp()};apply();
 const refresh=()=>{try{requestDraw(false)}catch{}try{afterChange()}catch{}try{window.layPanelRender&&layPanelRender()}catch{}try{document.dispatchEvent(new CustomEvent('bpm-typecolors'))}catch{}};
 window.typeColor={get:k=>TYPES[k]?.c,def:k=>DEF[k],group:grpOf,
  set(k,c){const g=grpOf(k);for(const x of g.ks){if(!DEF[x])continue;if(c&&c.toLowerCase()!==DEF[x].toLowerCase())O[x]=c;else delete O[x]}localStorage.setItem(KEY,JSON.stringify(O));apply();refresh()},
  reset(k){this.set(k,null)},resetAll(){O={};localStorage.removeItem(KEY);apply();refresh()},changed:()=>Object.keys(O)};
 const PAL=['#e11d48','#dc2626','#991b1b','#f97316','#f59e0b','#facc15','#84cc16','#16a34a','#0d9488','#2dd4bf','#06b6d4','#0ea5e9','#2563eb','#4f46e5','#7c3aed','#c026d3','#db2777','#78350f','#64748b','#000000'];
 // one type (or group): palette + Custom… + Reset to default
 function pick(k,back){const g=grpOf(k),cur=(TYPES[k].c||'').toLowerCase(),df=DEF[k];let d=$('#tcDlg');if(!d){d=ce('dialog');d.id='tcDlg';document.body.append(d)}
  d.innerHTML=`<div class="cHead"><b>Color: ${esc(g.n)}</b><span class="sp"></span><button type="button" class="btn" id="tcX">✕<span class="tl">Close</span></button></div><div class="cBody">
   ${g.ks.length>1?`<p class="tcNote">Changes all ${g.ks.length} ${esc(g.n.replace(/ \(.*\)/,''))} types together.</p>`:''}
   <div class="tcCur"><i style="background:${cur}"></i><span>Now ${cur}${cur===df.toLowerCase()?' (default)':''}</span></div>
   <div class="cGrid tcPal">${PAL.map(c=>`<button type="button" class="cSw${c===cur?' on':''}" data-c="${c}" aria-label="Use ${c}" title="${c}"><i style="background:${c}"></i><span class="cSl">${c}</span></button>`).join('')}</div>
   <div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><label class="btn tcCust" title="Pick any color">🎨<span class="tl">Custom…</span><input type="color" id="tcIn" value="${cur||'#000000'}" style="position:absolute;opacity:0;width:1px;height:1px"></label>
   <button type="button" class="btn" id="tcRes" ${cur===df.toLowerCase()?'disabled':''} title="Back to ${df}">↺<span class="tl">Reset to default</span></button>${back?`<button type="button" class="btn" id="tcBack">‹<span class="tl">All types</span></button>`:''}</div></div>`;
  const done=c=>{typeColor.set(k,c);toast(`${g.n}: ${c?c:'default color'} · pins, list and exports updated`);if(back)list();else d.close()};
  d.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>done(b.dataset.c));d.querySelector('#tcIn').onchange=e=>done(e.target.value);
  d.querySelector('#tcRes').onclick=()=>done(null);d.querySelector('#tcX').onclick=()=>d.close();if(back)d.querySelector('#tcBack').onclick=()=>list();d.onclick=e=>{if(e.target===d)d.close()};if(!d.open)d.showModal()}
 // every type (groups once)
 function rows(){const seen=new Set(),R=[];for(const k of Object.keys(TYPES).sort((a,b)=>grpOf(a).n.localeCompare(grpOf(b).n))){const g=grpOf(k);if(seen.has(g.n))continue;seen.add(g.n);R.push({k,n:g.n,c:TYPES[k].c,ch:g.ks.some(x=>O[x])})}return R}
 const rowHtml=r=>`<button type="button" class="tcRow" data-tk="${r.k}" title="Change the color of ${esc(r.n)}"><i style="background:${r.c}"></i><span>${esc(r.n)}</span>${r.ch?'<small>changed</small>':''}</button>`;
 function list(){let d=$('#tcDlg');if(!d){d=ce('dialog');d.id='tcDlg';document.body.append(d)}
  d.innerHTML=`<div class="cHead"><b>Device type colors</b><span class="sp"></span><button type="button" class="btn" id="tcX">✕<span class="tl">Close</span></button></div><div class="cBody"><p class="tcNote">Tap a type to change its color.</p><div class="tcList">${rows().map(rowHtml).join('')}</div>
   <div class="row" style="margin-top:10px"><button type="button" class="btn" id="tcAll" ${Object.keys(O).length?'':'disabled'}>↺<span class="tl">Reset all to default</span></button></div></div>`;
  d.querySelectorAll('[data-tk]').forEach(b=>b.onclick=()=>pick(b.dataset.tk,true));d.querySelector('#tcX').onclick=()=>d.close();d.querySelector('#tcAll').onclick=()=>{typeColor.resetAll();toast('All device colors back to default');list()};d.onclick=e=>{if(e.target===d)d.close()};if(!d.open)d.showModal()}
 window.typeColorPick=pick;window.typeColorList=list;
 // Color sheet: a "Device type colors" section (tap a type)
 const _cs=window.colSheet;if(_cs){window.colSheet=function(){_cs();const d=$('#colDlg');if(!d)return;const body=d.querySelector('.cBody');if(!body||body.querySelector('.tcSec'))return;
  const s=ce('div','tcSec',`<h4>Device type colors <small>(tap a type to change it)</small></h4><div class="tcList">${rows().map(rowHtml).join('')}</div><div class="row" style="margin-top:6px"><button type="button" class="btn" id="tcAll2" ${Object.keys(O).length?'':'disabled'}>↺<span class="tl">Reset all to default</span></button></div>`);body.append(s);
  s.querySelectorAll('[data-tk]').forEach(b=>b.onclick=()=>{d.close();pick(b.dataset.tk)});s.querySelector('#tcAll2').onclick=()=>{typeColor.resetAll();d.close();toast('All device colors back to default')}}}
 // Layers panel: swatch tap = pick color (row tap still toggles the layer); plus a labeled Colors… button
 const lp=$('#lyrP');if(lp){lp.addEventListener('click',e=>{const sw=e.target.closest('.tlSw'),r=e.target.closest('.lpRow');if(sw&&r&&r.dataset.k&&r.dataset.k!=='__mk'&&TYPES[r.dataset.k]){e.preventDefault();e.stopImmediatePropagation();pick(r.dataset.k)}},true);
  new MutationObserver(()=>{const a=lp.querySelector('.lpAN');if(a&&!a.querySelector('#lpCol')){const b=ce('button','btn','🎨<span class="tl">Colors…</span>');b.type='button';b.id='lpCol';b.title='Change device type colors';b.onclick=()=>list();a.append(b)}lp.querySelectorAll('.lpRow .tlSw').forEach(s=>{if(!s.title)s.title='Tap the swatch to change this type\u2019s color'})}).observe(lp,{childList:true,subtree:true})}
 document.addEventListener('bpm-typecolors',()=>{const lp=$('#lyrP');if(lp&&!lp.hidden){const b=document.getElementById('tb2Lay');/* re-render via counts on next open */try{lp.querySelectorAll('.lpRow').forEach(r=>{const k=r.dataset.k,s=r.querySelector('.tlSw');if(s&&TYPES[k])s.style.background=TYPES[k].c})}catch{}}});
 setTimeout(()=>{try{requestDraw(false)}catch{}},0);
})();
}catch(e){console.error('27-type-colors.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/28-side-panels.js =====
try{
// bpm-v113: ONE layout manager for all side panels. Left slot = page preview only (open by default; phone: bottom strip above the tool bar);
// right slot = Pins OR Layers (same default width as Layers). Panels span exactly the plan's vertical extent (never over the bottom bars),
// never overlap each other, and the plan's margins track the panels' VISIBLE edges every frame, so the plan resizes with each slide.
// Drag handles on inner edges (no Expand button), clamped by the neighbour's minimum, width remembered per panel. Slides use the Layers motion.
(()=>{
 const B=document.body,ST=by('stage'),TH=by('thumbs'),THB=by('thBtn');if(!ST||!TH||!THB)return;
 const PH=()=>innerWidth<600,RM=matchMedia('(prefers-reduced-motion: reduce)'),PLANMIN=()=>PH()?0:160;
 THB.setAttribute('aria-label','Pages: show or hide the page preview');
 // ---- slide in/out (Layers motion), instant-old + width-tween for same-side swaps ----
 let NOTR=0,rzT;const NOANIM=new WeakSet(),OUT=new WeakSet();
 function slideOut(el){if(el)el.classList.remove('rlNoIn');if(!el||RM.matches||NOANIM.has(el)){NOANIM.delete(el);return}OUT.add(el);el.classList.remove('rlOut');void el.offsetWidth;el.classList.add('rlOut');const me={};el._rlO=me;
  const fin=()=>{if(el._rlO!==me)return;el._rlO=null;el.classList.remove('rlOut');OUT.delete(el);sync()};el.addEventListener('animationend',fin,{once:true});setTimeout(fin,260);follow(300)}
 function swapIn(el,fromW,toW){if(!el)return;el.classList.add('rlNoIn');if(RM.matches||Math.abs(fromW-toW)<1)return;el._tw=1;el.style.transition='none';el.style.width=fromW+'px';void el.offsetWidth;el.style.transition='width .18s ease-out';el.style.width=toW+'px';follow(360);
  clearTimeout(el._twT);el._twT=setTimeout(()=>{el._tw=0;el.style.transition='';sync()},230)}
 const T_={pages:0,right:0};// last open/resize time per side (layout priority)
 let openR=null;
 const partner=el=>el.id==='panel'?by('lyrP'):el.id==='lyrP'?by('panel'):null,kOf=el=>el.id==='panel'?'pins':'layers';
 function swapR(nu,old){if(nu._swd)return;nu._swd=1;requestAnimationFrame(()=>{nu._swd=0});NOANIM.add(old);swapIn(nu,old.getBoundingClientRect().width||eff[kOf(old)]||W_[kOf(old)],eff[kOf(nu)]||W_[kOf(nu)])}
 function watch(el,side){if(!el||el._rlW)return;el._rlW=1;let was=el.hidden;new MutationObserver(()=>{const h=el.hidden,o=partner(el);
   if(h&&!was){was=true;if(o&&!o.hidden)swapR(o,el);slideOut(el)}
   else if(!h&&was){was=false;el._rlO=null;el.classList.remove('rlOut');OUT.delete(el);T_[side]=performance.now();
    if(o&&openR===kOf(o))swapR(el,o);else if(!el._swd)el.classList.remove('rlNoIn')}
   else if(!h&&was===false&&!el._swd)el.classList.add('rlNoIn');/* hidden+shown in one tick: no net change, so no replayed slide */
   sync();follow(360)}).observe(el,{attributes:true,attributeFilter:['hidden']})}
 // ---- widths ----
 const NAR={pages:()=>innerWidth<1000?118:132,pins:()=>PH()?Math.min(260,Math.round(innerWidth*.82)):124,layers:()=>PH()?Math.min(260,Math.round(innerWidth*.82)):124};
 const MAX=()=>PH()?innerWidth-16:Math.round(innerWidth*.5);
 const key=k=>'bpm-pw-'+k+(PH()?'-ph':'');
 const getW=k=>{const v=+localStorage.getItem(key(k));const n=NAR[k]();return v?Math.max(n,Math.min(MAX(),v)):n};
 const W_={},eff={};
 const setW=(k,w,save)=>{W_[k]=Math.round(Math.max(NAR[k](),Math.min(clampMax(k),w)));if(save)localStorage.setItem(key(k),String(W_[k]));if(k==='pages')T_.pages=performance.now();else T_.right=performance.now();sync()};
 const rightK=()=>{const pn=by('panel'),ly=by('lyrP');return pn&&!pn.hidden?'pins':ly&&!ly.hidden?'layers':null};
 function clampMax(k){let m=MAX();if(!PH()){const other=k==='pages'?rightK():(TH.hidden?null:'pages');if(other)m=Math.min(m,innerWidth-PLANMIN()-NAR[other]())}return m}
 // ---- drag handles (inner edge, no button) ----
 const PAN={pages:{el:TH,side:'L',nm:'page preview'},pins:{el:by('panel'),side:'R',nm:'Pins panel'},layers:{el:null,side:'R',nm:'Layers panel'}};
 const G={};for(const k of Object.keys(PAN)){const g=ce('div','pGrip','<span class="pgBar" aria-hidden="true"></span>');g.dataset.k=k;g.hidden=true;g.setAttribute('role','separator');g.setAttribute('aria-orientation','vertical');g.setAttribute('aria-label','Drag to resize the '+PAN[k].nm);g.title='Drag to resize the '+PAN[k].nm;B.append(g);G[k]=g;
  g.addEventListener('pointerdown',e=>{const el=PAN[k].el;if(!el)return;e.preventDefault();g.setPointerCapture(e.pointerId);g.classList.add('drag');B.classList.add('rlDrag');const r=el.getBoundingClientRect();
   const mv=ev=>setW(k,PAN[k].side==='L'?ev.clientX-r.left:r.right-ev.clientX,false),up=()=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);g.removeEventListener('pointercancel',up);g.classList.remove('drag');B.classList.remove('rlDrag');setW(k,W_[k],true)};
   g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)})}
 const shown=e=>e&&(!e.hidden||OUT.has(e))&&getComputedStyle(e).display!=='none';
 // bpm-v116: walk bar needs ~260px for its buttons in one or two labeled rows
const WALKMIN=260,LEGMIN=210;let WKH=0,WKSTRIP=0,LGH=0;
// bpm-v116: device name always in full: wrap to 2 lines, then shrink down to 12px; never an ellipsis (a 3rd line only if even 12px cannot fit)
function fitName(w){const n=w.querySelector('.wName');if(!n||!n.offsetParent)return;const k=n.textContent+'|'+n.clientWidth;if(n._fk===k)return;n.style.fontSize='';
 let fs=parseFloat(getComputedStyle(n).fontSize);const two=()=>{const lh=parseFloat(getComputedStyle(n).lineHeight)||fs*1.2;return n.scrollHeight<=lh*2+2&&n.scrollWidth<=n.clientWidth+1};
 while(!two()&&fs>12){fs=Math.max(12,fs-1);n.style.fontSize=fs+'px'}n._fk=n.textContent+'|'+n.clientWidth}
// ---- the layout manager ----
 function sync(){const ly=by('lyrP'),pn=by('panel');PAN.layers.el=ly;watch(ly,'right');const ph=PH(),walkOn=typeof walk!=='undefined'&&!!walk;
  B.classList.add('rl');B.classList.toggle('rlPh',ph);
  for(const k in PAN)if(W_[k]==null)W_[k]=getW(k);
  const thOn=!TH.hidden,rk=rightK();
  // widths: the most recently opened/resized side keeps its width, the other shrinks toward its minimum; if even that does not fit, the older side closes
  let wl=W_.pages,wr=rk?W_[rk]:0;
  if(!ph&&thOn&&rk){const avail=innerWidth-PLANMIN();if(wl+wr>avail){const keepL=T_.pages>=T_.right;
    if(keepL){wr=Math.max(NAR[rk](),avail-wl);if(wl+wr>avail){wl=Math.max(NAR.pages(),avail-wr);if(wl+wr>avail){(rk==='pins'?window.pinsPanel&&pinsPanel(false):window.layPanel&&layPanel(false));return}}}
    else{wl=Math.max(NAR.pages(),avail-wr);if(wl+wr>avail){wr=Math.max(NAR[rk](),avail-wl);if(wl+wr>avail){TH.hidden=true;THB.classList.remove('pri');return}}}}}
  eff.pages=wl;if(rk)eff[rk]=wr;
  B.style.setProperty('--thW',wl+'px');
  for(const [e,k] of [[pn,'pins'],[ly,'layers']]){if(!e||e._tw)continue;e.style.width=(k===rk?wr:W_[k])+'px'}
  const sr=ST.getBoundingClientRect(),top=Math.round(sr.top),h=Math.round(sr.height);
  if(!ph){TH.style.top=top+'px';TH.style.height=h+'px';TH.style.left='0px'}else{TH.style.top=TH.style.height=TH.style.left=''}
  // bpm-v116: walk bar placement. If the free width beside the right panel is below what the walk bar needs (WALKMIN), the bar takes the full-width strip
  // above the bottom toolbar (above the phone Pages strip) and the panels stop above it; --wkR (the bar's right inset) moves on the panels' .18s clock
  const wk=by('walk'),wkOn=walkOn&&wk&&!wk.hidden;const wf=!!(wkOn&&ph&&rk&&innerWidth-wr<WALKMIN);
  B.classList.toggle('rlWF',wf);
  {const v=(wf?0:(ph&&rk?wr:0))+'px';if(ST.style.getPropertyValue('--wkR')!==v)ST.style.setProperty('--wkR',v)}
  if(wkOn)fitName(wk);
  // bpm-v117: legend banner. Phone with a right panel and a free area narrower than LEGMIN: the banner leaves the plan top and takes the full-width strip
  // above the walk bar / Pages strip / toolbar (never one letter per line); the panels stop above it. Otherwise it stays centred in the free area.
  const lg=by('legChip'),lgOn=lg&&!lg.hidden;const lf=!!(lgOn&&ph&&rk&&innerWidth-wr<LEGMIN);B.classList.toggle('rlLF',lf);
  WKH=0;if(wf){const o=wk.style.right;wk.style.right='0px';WKH=Math.ceil(wk.getBoundingClientRect().height);wk.style.right=o}
  if(B.style.getPropertyValue('--wkH')!==WKH+'px')B.style.setProperty('--wkH',WKH+'px');
  LGH=lf?Math.ceil(lg.getBoundingClientRect().height)+6:0;/* v119: banner sits 6px above the bar below it; the panel sits flush on the banner */
  applyBottom(sr);
  {const v=(ph&&thOn?TH.offsetHeight:0)+'px';WKSTRIP=ph&&thOn?TH.offsetHeight:0;if(B.style.getPropertyValue('--phStrip')!==v)B.style.setProperty('--phStrip',v)}/* phone: plan-bottom bars (pen, shape, freehand, stamp, Detect, walk, toast) sit above the strip */
  // plan margins: target = the panels' final widths, moved with the SAME duration/easing as the panel slide/width tween (one CSS clock, so the plan edge and the
 // panel edge are in step in every frame); instant while dragging, rotating or with reduced motion
 const L=!ph&&thOn?wl:0,Rr=!ph&&rk?wr:0,tr=RM.matches||B.classList.contains('rlDrag')||NOTR?'none':'margin-left .18s ease-out,margin-right .18s ease-out,--frR .18s ease-out,--wkR .18s ease-out';
 if(ST.style.transition!==tr)ST.style.transition=tr;if(ST.style.marginLeft!==L+'px')ST.style.marginLeft=L+'px';if(ST.style.marginRight!==Rr+'px')ST.style.marginRight=Rr+'px';
 // Detect pop-up: on phone the right panel overlays the plan, so the pop-up keeps to the free part (and steps aside if there is no room)
  // floating banners/pills/toasts (legend chip, Detect pop-up, toast, selection/pen/shape bars): kept inside the FREE plan area. On phone the right panel overlays
  // the plan, so the free area ends at the panel's final left edge; --frR moves on the same .18s ease-out clock as the panel slide (registered @property)
  {const fr=(ph&&rk?wr:0)+'px';if(ST.style.getPropertyValue('--frR')!==fr)ST.style.setProperty('--frR',fr)}
  // grips
  for(const k in PAN){const g=G[k],el=PAN[k].el,on=shown(el)&&!OUT.has(el)&&!walkOn&&!(ph&&k==='pages');if(!on){if(!g.hidden)g.hidden=true;continue}const r=el.getBoundingClientRect();g.hidden=false;
   const x=PAN[k].side==='L'?r.right:r.left;g.style.left=Math.round(x-12)+'px';g.style.top=Math.round(r.top)+'px';g.style.height=Math.round(r.height)+'px'}
  openR=rk}
 // right panels: exactly the stage's vertical extent; phone: above the Pages strip (followed frame by frame while it slides)
 function applyBottom(sr){sr=sr||ST.getBoundingClientRect();/* phone: stop at the strip's FINAL top; the height transition (same .18s ease-out as the strip's slide) keeps the two edges together every frame */
  const bot=PH()&&!TH.hidden&&getComputedStyle(TH).display!=='none'?Math.min(sr.bottom,(TH.offsetParent===ST?sr.top:0)+TH.offsetTop):sr.bottom;/* v119: on phone the strip is position:absolute inside #stage, so offsetTop is stage-relative: add the stage top (was off by the stage top = gap above the strip) *//* v116: full-width walk bar below the panels */const bot2=WKH||LGH?Math.min(bot,sr.bottom-(B.style.getPropertyValue('--phStrip')?parseFloat(B.style.getPropertyValue('--phStrip'))||0:0)-WKH-LGH):bot;
  /* v119: the banner / walk strip appear and disappear at once (no slide), so a change of that reserve resizes the panel at once too (no gap, no overlap) */
 const rsv=WKH+'|'+LGH,rsvCh=applyBottom._r!==undefined&&applyBottom._r!==rsv;applyBottom._r=rsv;
 for(const e of [by('panel'),by('lyrP')]){if(!e)continue;
  /* v116: a panel sliding out keeps its height (it never grows over the walk strip); a panel opening takes its height at once, then slides in */
  if(e.hidden){e._op=0;continue}const fresh=!e._op;e._op=1;
  e.style.top=Math.round(sr.top)+'px';const hv=Math.max(80,Math.round(bot2-sr.top))+'px';
  if(e.style.height!==hv){if(fresh||rsvCh){e.classList.add('rlNoH');e.style.height=hv;void e.offsetHeight;requestAnimationFrame(()=>e.classList.remove('rlNoH'))}else e.style.height=hv}e.style.bottom='auto'}}
 let folT=0,SLID=0;function follow(ms){folT=Math.max(folT,performance.now()+ms);if(follow.on)return;follow.on=1;try{if(!SLIDING){SLIDING=1;SLID=1}}catch{}
  const st=()=>{try{sync()}catch(e){console.error(e)}if(performance.now()<folT)requestAnimationFrame(st);else{follow.on=0;if(SLID){SLID=0;try{SLIDING=0;scheduleRender()}catch{}}}};requestAnimationFrame(st)}/* no PDF re-render during a slide; one real render at the end */
 window.railSync=sync;
// bpm-v117: re-run the layout when the legend banner shows/hides
{let q=0;const hook=()=>{const lg=by('legChip');if(!lg||lg._rlObs)return!!lg;lg._rlObs=1;new MutationObserver(()=>{if(q)return;q=1;requestAnimationFrame(()=>{q=0;try{sync();/* v120: the card keeps clear of a banner that appears/leaves while it is open */window.pinCardPlace&&by('pinDlg')&&by('pinDlg').open&&pinCardPlace()}catch(e){console.error(e)}})}).observe(lg,{attributes:true,attributeFilter:['hidden'],childList:true});return true};
 if(!hook()){const mo=new MutationObserver(()=>{if(hook()){mo.disconnect();try{sync()}catch{}}});mo.observe(ST,{childList:true})}}
// bpm-v116: re-run the layout when the walk bar shows/hides or re-renders (name fit, full-width strip, panel bottoms)
{const wk=by('walk');if(wk){let q=0;new MutationObserver(()=>{if(q)return;q=1;requestAnimationFrame(()=>{q=0;try{sync()}catch(e){console.error(e)}})}).observe(wk,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true})}}
 new MutationObserver(()=>{if(!TH.hidden)T_.pages=performance.now();sync();follow(360)}).observe(TH,{attributes:true,attributeFilter:['hidden']});
 watch(TH,'pages');watch(by('panel'),'right');
 // labeled Close on every panel header
 const cl=by('closeList');const clL=()=>{if(!cl)return;if(!cl.querySelector('.tl'))cl.innerHTML='✕<span class="tl">Close</span>';if(cl.getAttribute('aria-label')!=='Close the Pins panel'){cl.setAttribute('aria-label','Close the Pins panel');cl.title='Close the Pins panel'}};clL();if(cl)new MutationObserver(clL).observe(cl,{childList:true,characterData:true,subtree:true});
 const thx=()=>{const x=TH.querySelector('#thX');if(x&&!x.dataset.rl){x.dataset.rl=1;x.innerHTML='✕<span class="tl">Close</span>';x.setAttribute('aria-label','Close the page preview');x.title='Close the page preview'}const r=TH.querySelector('#thRn');if(r&&!r.getAttribute('aria-label'))r.setAttribute('aria-label','Rename the current page')};new MutationObserver(thx).observe(TH,{childList:true,subtree:true});thx();
 addEventListener('resize',()=>{for(const k in PAN)W_[k]=getW(k);NOTR=1;sync();clearTimeout(rzT);rzT=setTimeout(()=>{NOTR=0;sync()},300)/* bpm-v140: put the slide back right after a resize (it used to stay off until the next panel change) */;follow(120)});
 new ResizeObserver(()=>sync()).observe(ST);
 let lastK='';setInterval(()=>{const k=[TH.hidden,TH.offsetHeight,rightK(),typeof walk!=='undefined'&&!!walk,innerWidth,innerHeight,ST.getBoundingClientRect().top|0].join();if(k!==lastK){lastK=k;sync()}},250);
 // ---- pin card: beside the selected pin, inside the plan area (never over panels or bars); below it, shorter, when there is no room ----
 const D=by('pinDlg');
 const DB=ce('button','btn danger pcDel','<span aria-hidden="true">🗑</span><span class="tl">Delete</span>');DB.type='button';DB.setAttribute('aria-label','Delete this pin');DB.title='Delete this pin (closes the card, then the delete options)';
 const pinNow=()=>{try{return cur&&cur.page===page&&cur.x!=null?cur:null}catch{return null}};
 if(D){D.append(DB);DB.onclick=e=>{e.preventDefault();const p=pinNow();D.close();if(!p)return;try{window.pdTap&&pdTap(p)}catch{}let n=0;const go=()=>{const b=by('pinDelF');if(b&&!b.hidden){window.wheelAnchor&&wheelAnchor(b);b.click()}else if(n++<20)requestAnimationFrame(go)};requestAnimationFrame(go)}}
 const off=()=>{B.classList.remove('pcOn','pcC');if(D){D.style.left=D.style.top=D.style.maxHeight=D.style.width=D.style.height=D.style.position=D.style.margin=D.style.inset=D.style.maxWidth='';const z=pcSize();if(z){D.style.width=Math.round(Math.min(z.w,innerWidth-16))+'px';D.style.height=D.style.maxHeight=Math.round(Math.min(z.h,innerHeight-16))+'px'}}edgeSync()};
 // bpm-v129: the pin card opens larger (full free width on phones, ~460 px on Fold/tablet, all the free height) and has a labelled Resize handle (bottom-right, finger drag).
 // The chosen size is remembered per screen size class (Fold closed / phone / Fold open / tablet / desktop) and always clamped to the screen.
 const pcCls=()=>{const w=innerWidth,h=innerHeight;return w<380?'foldClosed':w<600?'phone':(w<1000&&Math.abs(w-h)/h<.2)?'foldOpen':w<1300?'tablet':'desktop'};
 const pcKey=()=>'bpm-pcsz2-'+pcCls();/* v130: new key, so sizes saved by v129 (smaller defaults) no longer apply */
 function pcSize(){try{const z=JSON.parse(localStorage.getItem(pcKey())||'null');return z&&z.w>0&&z.h>0?z:null}catch{return null}}
 let LIM=null;
 const RZ=ce('div','pcRszRow','<button type="button" class="pcRsz" aria-label="Resize the card from the bottom-right corner (drag)"></button>');const RB=RZ.firstChild;
 // bpm-v130: resize from any edge. A labelled grip sits on the middle of each edge (top, bottom, left, right; 44 px touch areas, finger drag), and the Resize button keeps the bottom-right corner.
 // Drags are clamped to the screen with 8 px margins; the top edge never goes above 8 px, so Save and Close stay on screen. The size is saved per screen size class.
 const EDGES={t:['⇕','top'],b:['⇕','bottom'],l:['⇔','left'],r:['⇔','right']},EG={};
 function edgeSync(){if(!D)return;const show=D.open&&!D.hidden;for(const k in EG){const g=EG[k];if(!show){g.hidden=true;continue}g.hidden=false}if(!show)return;const r=D.getBoundingClientRect();if(!r.width)return;
  const cx=r.left+r.width/2,cy=r.top+Math.min(r.height/2,Math.max(90,r.height*.45)),vv=window.visualViewport,de=document.documentElement,W=Math.min(innerWidth,de.clientWidth||innerWidth,vv?vv.width:innerWidth),H=Math.min(innerHeight,de.clientHeight||innerHeight,vv?vv.height:innerHeight),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const put=(g,x,y)=>{g.style.left=Math.round(cl(x,0,W-g.offsetWidth))+'px';g.style.top=Math.round(cl(y,0,H-g.offsetHeight))+'px'};
  put(EG.t,cx-EG.t.offsetWidth/2,r.top-34);put(EG.b,cx-EG.b.offsetWidth/2,r.bottom-10);put(EG.l,r.left-34,cy-EG.l.offsetHeight/2);put(EG.r,r.right-10,cy-EG.r.offsetHeight/2);
  /* v131: the thin line sits exactly on the card edge even when a grip is clamped onto the screen */
  EG.t.style.setProperty('--o',(r.top-parseFloat(EG.t.style.top))+'px');EG.b.style.setProperty('--o',(r.bottom-parseFloat(EG.b.style.top))+'px');EG.l.style.setProperty('--o',(r.left-parseFloat(EG.l.style.left))+'px');EG.r.style.setProperty('--o',(r.right-parseFloat(EG.r.style.left))+'px')}
 setInterval(()=>{if(D&&D.open&&!D._rsz)edgeSync()},400);/* v130: safety re-sync so grips never stay where an old layout put them */
 function startRz(e,dirs,el){if(e.button>0)return;e.preventDefault();e.stopPropagation();try{el.setPointerCapture(e.pointerId)}catch{}const r=D.getBoundingClientRect(),x0=e.clientX,y0=e.clientY,m=8;D._rsz=1;el.classList.add('drag');
  const minW=Math.min(260,r.width),minH=Math.min(220,r.height),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  D.style.position='fixed';D.style.margin='0';D.style.inset='auto';D.style.maxWidth='none';
  const mv=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;let L=r.left,R=r.right,T=r.top,Bt=r.bottom;
    if(dirs.includes('l'))L=cl(r.left+dx,m,R-minW);if(dirs.includes('r'))R=cl(r.right+dx,L+minW,innerWidth-m);
    if(dirs.includes('t'))T=cl(r.top+dy,m,Bt-minH);if(dirs.includes('b'))Bt=cl(r.bottom+dy,T+minH,innerHeight-m);
    D.style.left=Math.round(L)+'px';D.style.top=Math.round(T)+'px';D.style.width=Math.round(R-L)+'px';D.style.height=D.style.maxHeight=Math.round(Bt-T)+'px';edgeSync()};
  const up=()=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.classList.remove('drag');D._rsz=0;const q=D.getBoundingClientRect();try{const pp=pinNow();D._upos={id:pp&&pp.id,x:q.left,y:q.top}}catch{}/* v131: the card stays where the user resized it (no snap back to the auto position) */try{localStorage.setItem(pcKey(),JSON.stringify({w:Math.round(q.width),h:Math.round(q.height)}))}catch{}edgeSync()};
  el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
 if(D){D.append(RZ);RB.addEventListener('click',e=>e.preventDefault());RB.addEventListener('pointerdown',e=>startRz(e,'rb',RB));
  for(const k in EDGES){const g=ce('button','pcEdge pcE-'+k,'');/* bpm-v131: no words, no tab: the grip only shows a thin line on the card edge (aria-label kept for screen readers) */g.type='button';g.dataset.edge=k;g.setAttribute('aria-label','Resize the card from the '+EDGES[k][1]+' edge (drag)');g.title='Drag the '+EDGES[k][1]+' edge to resize the card';g.hidden=true;
   g.addEventListener('click',e=>e.preventDefault());g.addEventListener('pointerdown',e=>startRz(e,k,g));D.append(g);EG[k]=g}
  new ResizeObserver(()=>edgeSync()).observe(D);D.addEventListener('animationend',edgeSync);new MutationObserver(()=>requestAnimationFrame(edgeSync)).observe(D,{attributes:true,attributeFilter:['open','style']});addEventListener('resize',()=>requestAnimationFrame(edgeSync))}
 // bpm-v123: the toast, the Detect pop-up and the update banner are not card keep-outs for placement (that would drop a phone card into the fallback sheet). After the card is placed they move to a free spot so they neither cover the card nor sit behind it.
 const overlaps=(a,b)=>a.width>0&&b.width>0&&a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
 const clearNudge=e=>{if(e&&e.dataset.nudge){e.style.top='';e.style.bottom='';delete e.dataset.nudge}};
 function bannerList(){return['ghBar','toast','updBar'].map(by).filter(e=>e&&!e.hidden&&e.getBoundingClientRect().height>0)}
 function nudgeBanners(){for(const id of['toast','ghBar','updBar'])clearNudge(by(id));if(!D||!D.open)return;const sr=ST.getBoundingClientRect();
  const hit=()=>bannerList().some(e=>overlaps(e.getBoundingClientRect(),D.getBoundingClientRect()));if(!hit())return;
  if(B.classList.contains('pcOn')){const c0=D.getBoundingClientRect();let top=c0.top,bot=c0.bottom;
   for(const e of bannerList()){const r=e.getBoundingClientRect(),box={left:c0.left,right:c0.right,top,bottom:bot,width:c0.width,height:bot-top};if(!overlaps(r,box))continue;if(r.top>=(top+bot)/2)bot=Math.min(bot,r.top-8);else top=Math.max(top,r.bottom+8)}
   if(bot-top>=200&&top>=sr.top-1&&bot<=sr.bottom+1){D.style.top=Math.round(top)+'px';D.style.maxHeight=Math.round(bot-top)+'px';if(!hit())return}}
  // fallback sheet, or a card with no free band: park the banners in a strip at the top of the plan and keep the card below it
  let y=4;for(const e of bannerList()){const h=e.getBoundingClientRect().height;e.style.top=Math.round(y)+'px';e.style.bottom='auto';e.dataset.nudge='1';y+=h+6}
  const limit=sr.top+y+4,c=D.getBoundingClientRect();
  if(B.classList.contains('pcOn')){const nt=Math.max(c.top,limit),mh=c.bottom-nt;if(mh>=200){D.style.top=Math.round(nt)+'px';D.style.maxHeight=Math.round(mh)+'px'}}
  else D.style.maxHeight=Math.max(220,Math.round(innerHeight-limit-8))+'px'}
 function placeCard(){if(D&&D._rsz)return;if(!D||!D.open){off();nudgeBanners();return}const p=pinNow();if(!p){off();nudgeBanners();return}
  const sr=ST.getBoundingClientRect(),s=toS(p.x,p.y),X0=sr.left+s.x,Y0=sr.top+s.y,m=8,ph=PH(),gap=ph?30:104,L0=sr.left+m;let T0=sr.top+m,R0=sr.right-m,B0=sr.bottom-m;
  if(ph){/* phone panels overlay the plan: the card keeps to the free part */if(shown(TH)&&!TH.hidden)B0=Math.min(B0,(TH.offsetParent===ST?sr.top:0)+TH.offsetTop-m);/* v120: strip top in screen coordinates (offsetTop is stage-relative; final top, unaffected by the strip's slide) */for(const e of [by('panel'),by('lyrP')])if(e&&!e.hidden&&shown(e))R0=Math.min(R0,e.getBoundingClientRect().left-m)}
  /* v120: bars below the free plan area (banner strip, walk bar) also bound the card's bottom */
  let TB=0;
  for(const e of [by('legChip'),by('walk')]){if(!e||e.hidden||!shown(e))continue;const q=e.getBoundingClientRect();if(!q.height||q.left>=R0||q.right<=L0)continue;if(q.top>sr.top+sr.height/2)B0=Math.min(B0,q.top-m);else if(e.id==='legChip')TB=q.bottom+m}
  const T0n=T0;if(TB)T0=Math.max(T0,TB);/* top-floating banner: kept clear unless that leaves no room for the card (then the card may cover the transient banner rather than fall back to the dialog) */
  /* v130: twice the v129 default (v129: phone = the free width, Fold/tablet 460 px wide; up to 620 px tall), clamped to the free plan area with 8 px margins,
     or the size the user dragged it to. It sits beside the pin when there is room, otherwise on the side away from the pin, spanning the free height. */
  const Z=pcSize();let cw=Math.min(Z?Z.w:2*(ph?R0-L0:460),R0-L0);const ch=Math.min(Z?Z.h:2*620,B0-T0);
  /* v130: the card never falls back to the centred dialog (which covers the Pages strip and bars) just because the pin is briefly off the plan
     (walk mode pans to the next pin); it keeps to the free plan area, placed for the nearest on-screen point, and Delete hides until the pin is back */
  let X=X0,Y=Y0;const pinOut=X<sr.left||X>sr.right||Y<sr.top||Y>sr.bottom;
  /* a small free area shrinks the card to fit (it scrolls) rather than dropping it over the bars; only a free area under 150 px falls back */
  if(cw<150||ch<150){off();nudgeBanners();return}
  let x,y,mh=ch,compact=false;
  {const X_=Math.max(L0,Math.min(R0,X)),Y_=Math.max(T0,Math.min(B0,Y));if(pinOut){X=X_;Y=Y_}}
  if(R0-X-gap>=cw)x=X+gap;else if(X-gap-L0>=cw)x=X-gap-cw;else{compact=true;x=X>(L0+R0)/2?L0:R0-cw}
  y=Math.max(T0,Math.min(B0-mh,Y-mh/2));
  if(D._upos&&D._upos.id===p.id){x=Math.max(L0,Math.min(R0-cw,D._upos.x));y=Math.max(T0,Math.min(B0-mh,D._upos.y))}
  B.classList.add('pcOn');B.classList.toggle('pcC',compact);DB.hidden=pinOut||!pins.some(x=>x.id===p.id);if(X>=x-4&&X<=x+cw+4&&Y>=y-4&&Y<=y+mh+4){/* v130: the big card covers the pin: Delete sits just above the card's top-left corner instead of on top of the card */DB.style.left=Math.round(x)+'px';DB.style.top=Math.round(Math.max(4,y-52))+'px'}else{DB.style.left=Math.round(Math.min(R0-80,X+14))+'px';DB.style.top=Math.round(Y-20)+'px'}
  D.style.left=Math.round(x)+'px';D.style.top=Math.round(y)+'px';D.style.width=Math.round(cw)+'px';D.style.maxHeight=Math.round(mh)+'px';D.style.height=Math.round(mh)+'px';LIM={R:R0,B:B0};nudgeBanners();edgeSync()}
 if(D){new MutationObserver(()=>{D._upos=null;if(D.open)requestAnimationFrame(placeCard);else{off();nudgeBanners()}}).observe(D,{attributes:true,attributeFilter:['open']});addEventListener('resize',()=>D.open&&placeCard())}
 let lastV='';setInterval(()=>{if(!D||!D.open)return;const r_=ST.getBoundingClientRect(),k=JSON.stringify(view)+r_.left+','+r_.top+','+r_.width+','+innerHeight+'|'+(by('toast')&&!by('toast').hidden?1:0)+(by('ghBar')&&!by('ghBar').hidden?1:0)+(by('updBar')&&!by('updBar').hidden?1:0)+'|'+(()=>{/* v130: the plan chip appearing, or the walk bar / Pages strip appearing or moving, re-places the card */let o='';const lc=by('legChip');o+=lc&&!lc.hidden&&shown(lc)?'L;':'-;';/* chip: only appearing/disappearing (the card itself nudges its position) */for(const id of['walk','thumbs']){const e=by(id);if(e&&!e.hidden&&shown(e)){const q=e.getBoundingClientRect();o+=id+Math.round(q.top)+','+Math.round(q.right)+';'}}return o})();if(k!==lastV){lastV=k;placeCard()}},250);
 for(const id of['toast','ghBar','updBar']){const e=by(id);if(e)new MutationObserver(()=>{if(D&&D.open)requestAnimationFrame(placeCard)}).observe(e,{attributes:true,attributeFilter:['hidden']})}
 window.pinCardPlace=placeCard;
 sync();
})();
}catch(e){console.error('28-side-panels.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/29-deficiency-list.js =====
try{
// bpm-v115: deficiency list. Photo/thumbnail tap -> full-size viewer (pinch/zoom, swipe between that device's photos, video/voice players, labeled Close).
// Text tap -> the list STAYS open; the plan (free area beside/above the panel) smoothly pans/zooms to the device (switching page if needed), selects it with
// a short blink, and the tapped row is marked as the current item.
(()=>{const $$=s=>document.querySelector(s),L=$$('#defList');if(!L||typeof renderDefs!=='function')return;
 let CUR=null;
 // ---------- viewer ----------
 const V=document.createElement('div');V.id='mViewer';V.hidden=true;V.setAttribute('role','dialog');V.setAttribute('aria-label','Photo viewer');
 V.innerHTML='<div class="mvTop"><span class="mvT"></span><span class="sp"></span><button type="button" class="btn" id="mvClose" aria-label="Close the viewer">✕<span class="tl">Close</span></button></div><div class="mvStage"></div><div class="mvNav"><button type="button" class="btn" id="mvPrev" aria-label="Previous item">◀<span class="tl">Previous</span></button><span class="mvN"></span><button type="button" class="btn" id="mvNext" aria-label="Next item">▶<span class="tl">Next</span></button></div>';
 document.body.append(V);const VS=V.querySelector('.mvStage');let M=[],MI=0,urls=[],Z={s:1,x:0,y:0};
 const freeU=()=>{urls.forEach(URL.revokeObjectURL);urls=[]};
 function show(){VS.innerHTML='';Z={s:1,x:0,y:0};const m=M[MI];if(!m)return;const u=URL.createObjectURL(m.kind==='photo'?(m.annot||m.blob):m.blob);urls.push(u);
  let el;if(m.kind==='video'){el=document.createElement('video');el.controls=true;el.playsInline=true}else if(m.kind==='audio'||m.kind==='voice'){el=document.createElement('audio');el.controls=true}else{el=document.createElement('img');el.alt='Deficiency photo'}
  el.src=u;el.className='mvM';VS.append(el);V.querySelector('.mvN').textContent=M.length>1?`${MI+1} / ${M.length}`:'';V.querySelector('#mvPrev').hidden=V.querySelector('#mvNext').hidden=M.length<2;apply()}
 const apply=()=>{const e=VS.querySelector('img.mvM');if(e)e.style.transform=`translate(${Z.x}px,${Z.y}px) scale(${Z.s})`};
 const go=d=>{if(M.length<2)return;MI=(MI+d+M.length)%M.length;show()};
 async function openViewer(pinId,title){const ms=(await byIdx('media','pinId',pinId)).filter(m=>['photo','video','audio','voice'].includes(m.kind)).sort((a,b)=>(a.kind==='photo'?0:1)-(b.kind==='photo'?0:1)||a.created-b.created);
  if(!ms.length)return;M=ms;MI=0;V.querySelector('.mvT').textContent=title||'';V.hidden=false;requestAnimationFrame(()=>V.classList.add('in'));show()}
 const closeV=()=>{V.classList.remove('in');V.hidden=true;VS.innerHTML='';freeU()};
 V.querySelector('#mvClose').onclick=closeV;V.querySelector('#mvPrev').onclick=()=>go(-1);V.querySelector('#mvNext').onclick=()=>go(1);
 document.addEventListener('keydown',e=>{if(V.hidden)return;if(e.key==='Escape')closeV();else if(e.key==='ArrowLeft')go(-1);else if(e.key==='ArrowRight')go(1)});
 // pinch / pan / swipe
 const P=new Map();let g0=null;
 VS.addEventListener('pointerdown',e=>{if(!VS.querySelector('img.mvM'))return;VS.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});g0={Z:{...Z},pts:[...P.values()].map(p=>({...p})),t:performance.now()}});
 VS.addEventListener('pointermove',e=>{if(!P.has(e.pointerId)||!g0)return;P.set(e.pointerId,{x:e.clientX,y:e.clientY});const pts=[...P.values()];
  if(pts.length>=2&&g0.pts.length>=2){const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),c=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});const k=d(pts[0],pts[1])/Math.max(1,d(g0.pts[0],g0.pts[1])),c0=c(g0.pts[0],g0.pts[1]),c1=c(pts[0],pts[1]);
   Z.s=Math.max(1,Math.min(8,g0.Z.s*k));Z.x=g0.Z.x+(c1.x-c0.x);Z.y=g0.Z.y+(c1.y-c0.y)}else if(Z.s>1.01){Z.x=g0.Z.x+(pts[0].x-g0.pts[0].x);Z.y=g0.Z.y+(pts[0].y-g0.pts[0].y)}apply()});
 const up=e=>{const p0=g0&&g0.pts[0],q=P.get(e.pointerId);P.delete(e.pointerId);if(!P.size&&g0&&p0&&q&&g0.pts.length===1&&Z.s<=1.01){const dx=q.x-p0.x;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(q.y-p0.y))go(dx<0?1:-1)}if(!P.size)g0=null;else g0={Z:{...Z},pts:[...P.values()].map(p=>({...p}))}};
 VS.addEventListener('pointerup',up);VS.addEventListener('pointercancel',up);
 VS.addEventListener('wheel',e=>{if(!VS.querySelector('img.mvM'))return;e.preventDefault();Z.s=Math.max(1,Math.min(8,Z.s*(e.deltaY<0?1.15:1/1.15)));if(Z.s===1)Z.x=Z.y=0;apply()},{passive:false});
 VS.addEventListener('dblclick',()=>{Z=Z.s>1?{s:1,x:0,y:0}:{s:2.5,x:0,y:0};apply()});
 // ---------- fly to the device, list stays open ----------
 async function flyTo(plId,pinId,li){CUR=pinId;L.querySelectorAll('li.cur').forEach(x=>{x.classList.remove('cur');x.removeAttribute('aria-current')});if(li){li.classList.add('cur');li.setAttribute('aria-current','true')}
  if(plan?.id!==plId){const p0=await get('pins',pinId);await openPlan(plId,p0?.page||1);const pn=$$('#panel');if(pn.hidden&&window.pinsPanel)pinsPanel(true);if(!$$('#panel').classList.contains('defmode'))setMode(true)}
  const p=pins.find(x=>x.id===pinId);if(!p)return;if(p.page!==page)await gotoPage(p.page);
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  // free plan area: the plan box minus the overlaying right panel (phone) and the Pages strip (phone)
  const st=getComputedStyle(stage),frR=parseFloat(st.getPropertyValue('--frR'))||0,phS=parseFloat(getComputedStyle(document.body).getPropertyValue('--phStrip'))||0;
  const W=stage.clientWidth-frR,H=stage.clientHeight-phS,s=Math.max(view.s,1.5/dpr()*2),d=rotP(p.x,p.y),v1={s,x:W/2-d.x*s,y:H/2-d.y*s};
  sel={kind:'p',o:p};await slideTo(v1,700);if(CUR!==pinId)return;
  for(let i=0;i<3;i++){sel=null;draw();await new Promise(r=>setTimeout(r,140));sel={kind:'p',o:p};draw();await new Promise(r=>setTimeout(r,140))}}
 window.defFlyTo=flyTo;window.defViewer=openViewer;
 // ---------- wire rows after each render ----------
 function wire(){for(const li of L.querySelectorAll('li[data-id]')){if(li._dw)continue;li._dw=1;li.onclick=null;li.tabIndex=0;li.setAttribute('role','button');
   const th=li.querySelector('.thumb'),tx=li.querySelector('div');if(li.dataset.id===CUR)li.classList.add('cur');
   if(th&&th.tagName==='IMG'){th.setAttribute('role','button');th.setAttribute('aria-label','Open the photo full size');th.title='Open the photo full size'}
   li.addEventListener('click',e=>{if(e.target.closest('.thumb')&&th&&th.tagName==='IMG'){e.stopPropagation();openViewer(li.dataset.id,(tx&&tx.querySelector('b')?.textContent||'')+' '+(tx?tx.textContent.split('\n')[0].slice(0,60):''));return}flyTo(li.dataset.pl,li.dataset.id,li)});
   li.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();flyTo(li.dataset.pl,li.dataset.id,li)}})}}
 new MutationObserver(wire).observe(L,{childList:true});wire();
})();
}catch(e){console.error('29-deficiency-list.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/30-task-bar.js =====
try{
// bpm-v132: "Big task bar" navigation (user-approved Option A).
// Top row: Menu ▾, Prev, Page ▾, Next, Undo, Pages, Pins (wide screens add Layers, Teach, QR).
// Bottom row: Detect and Sheets (double width, coloured), Place ▾, Walk test, Draw ▾ (phone) or the drawing tools laid out (wide), More ▾.
// Every original button is MOVED or reached through Menu ▾ / More ▾ / Draw ▾, so all existing handlers keep working. Walk-test bar unchanged.
(()=>{const X=window.TBX,T=$('#tools'),TOP=$('#top');if(!X||!T||!TOP||!window.wheelOpen)return;
 const HOLD=document.createElement('div');HOLD.id='navHold';HOLD.hidden=true;document.body.append(HOLD);
 const W=k=>T.querySelector(`[data-w="${k}"]`)||document.querySelector(`#navHold [data-w="${k}"],#navDraw [data-w="${k}"]`);
 const wide=()=>innerWidth>=760;
 const wheel=(anchor,title,items)=>{try{wheelAnchor&&wheelAnchor(anchor)}catch{}wheelOpen(title,items.map(x=>({...x,html:`<span class="whIc">${x.i||''}</span>${esc(x.l)}`})),0,x=>x.run())};
 const sub=(anchor,title,items)=>()=>setTimeout(()=>wheel(anchor,title,items()),220);
 const click=id=>()=>{const e=by(id);e&&e.click()};
 const mkTop=(id,ic,lab,run,title)=>{const b=document.createElement('button');b.type='button';b.className='btn tb2';b.id=id;b.innerHTML=`<span class="tb2i">${ic}</span><span class="tl">${lab}</span>`;b.title=title||lab.replace(' ▾','');b.onclick=run;return b};
 const mkTool=(id,ic,lab,run,cls='')=>{const b=document.createElement('button');b.type='button';b.className='tool navB '+cls;b.id=id;b.innerHTML=`<span class="navI">${ic}</span><span class="tl">${lab}</span>`;b.title=lab.replace(' ▾','');b.onclick=run;return b};
 // ---------- Menu ▾ (Project + Plan + Export + Share + Customize: each in one place) ----------
 const menuB=mkTop('navMenu','☰','Menu ▾',function(){const a=this;
  const projSw=()=>[...by('projSel').options].map(o=>({i:o.selected?'✓':'↪',l:o.text,run:()=>{by('projSel').value=o.value;by('projSel').dispatchEvent(new Event('change',{bubbles:true}))}}));
  const planSw=()=>[...by('planSel').options].filter(o=>o.value).map(o=>({i:o.selected?'✓':'↪',l:o.text,run:()=>{by('planSel').value=o.value;by('planSel').dispatchEvent(new Event('change',{bubbles:true}))}}));
  const exp=()=>[{i:'⤓',l:'Plan as PDF',run:click('exPdf')},{i:'⤓',l:'Plan as picture (PNG)',run:click('exPng')},{i:'📋',l:'Device list spreadsheet',run:click('csvBtn')},{i:'🔢',l:'Counts spreadsheet',run:click('countCsv')},{i:'☑',l:'Checklist spreadsheet',run:click('checkCsv')},{i:'📄',l:'Report PDF',run:click('reportPdf')}];
  const shr=()=>[{i:'⇆',l:'Split for second technician',run:click('splitBtn')},{i:'⇄',l:'Merge returned file',run:click('mergeBtn')}];
  wheel(a,'Menu',[{i:'📂',l:'Open plan (PDF / image)…',run:()=>by('file').click()},{i:'💾',l:'Save project file',run:click('projSave')},{i:'⤓',l:'Export…',run:sub(a,'Export',exp)},{i:'⇪',l:'Share…',run:sub(a,'Share',shr)},
   {i:'↪',l:'Switch plan…',run:sub(a,'Switch plan',planSw)},{i:'✎',l:'Rename page',run:()=>plan?pnRename(page):uiAlert('Open a plan first.')},{i:'🗑',l:'Delete plan',run:click('planDel')},
   {i:'＋',l:'New project',run:click('projNew')},{i:'📥',l:'Open project file…',run:()=>by('bpmFile').click()},{i:'↪',l:'Switch project…',run:sub(a,'Switch project',projSw)},{i:'✎',l:'Rename project',run:click('projRen')},{i:'🗑',l:'Delete project',run:click('projDel')},
   ...(window.menuExtra?menuExtra(a,sub):[]),/* bpm-v135: Start next inspection, Save install sheets for offline use, Backup reminder, Storage */
   {i:'⚙',l:'Customize (theme, accent, size)',run:()=>openCz()}])},'Menu: project, plan, save, export, share, customize');
 // ---------- More ▾ (rarely used tools) ----------
 const moreB=mkTool('navMore','⋯','More ▾',function(){const a=this,w=wide(),L=[];
  if(!w)L.push({i:'◧',l:'Layers',run:()=>tlayOpen()},{i:'📷',l:'Scan QR code',run:click('qrTool')},{i:'🎓',l:'Teach a symbol',run:click('teachBtn')});
  L.push({i:'➤',l:'Select',run:()=>{const t=document.querySelector('[data-t="select"]');t&&t.click()}},{i:'✋',l:'Pan',run:()=>{const t=document.querySelector('[data-t="pan"]');t&&t.click()}},
   {i:'⤢',l:'Fit to screen',run:click('fit')},{i:'⟳',l:'Rotate view'+(typeof VR!=="undefined"&&VR?` (now ${VR}°)`:""),run:click('rotBtn')});
  const mic=by('micBtn');if(mic&&!mic.hidden)L.push({i:'🎤',l:'Voice',run:()=>mic.click()});
  L.push({i:'📘',l:'Guides',run:click('guidesBtn')},{i:'↷',l:'Redo',run:click('redo')},{i:'🗑',l:'Delete selected',run:click('del')},{i:'🧲',l:'Magnet snap '+(by('mkSnap')?.classList.contains('on')?'(on)':'(off)'),run:click('mkSnap')});
  if(w)L.push({i:'📐',l:'Angle snap (15°)',run:click('cSnap')},{i:'✍',l:'Freehand',run:()=>X.freeB.click()});
  L.push({i:'👁',l:'Filters (markups, labels, status)',run:click('layBtn')});
  if(window.moreExtra)L.push(...moreExtra(a));
  wheel(a,'More',L)});
 // ---------- Draw ▾ (phone): a small panel with the real drawing buttons ----------
 const DR=document.createElement('div');DR.id='navDraw';DR.hidden=true;DR.setAttribute('role','dialog');DR.setAttribute('aria-label','Drawing tools');document.body.append(DR);
 const drawB=mkTool('navDrawB','✏️','Draw ▾',()=>{DR.hidden=!DR.hidden;drawB.classList.toggle('on',!DR.hidden);if(!DR.hidden)placeDR()});
 function placeDR(){const r=T.getBoundingClientRect();DR.style.bottom=Math.round(innerHeight-r.top+6)+'px'}
 DR.addEventListener('click',e=>{const b=e.target.closest('button,label');if(!b)return;/* a tool was picked: close the panel (wheel / width bar open from the button first) */if(b.dataset.w==='width'||b.classList.contains('tbCol'))return;setTimeout(()=>{DR.hidden=true;drawB.classList.remove('on')},250)});
 document.addEventListener('pointerdown',e=>{if(!DR.hidden&&!DR.contains(e.target)&&!drawB.contains(e.target)&&!e.target.closest('#mnuSheet,.wbBar,#colDlg,.wbO')){DR.hidden=true;drawB.classList.remove('on')}},true);
 // ---------- top-row extras on wide screens (proxies of the real buttons) ----------
 const teachT=mkTop('navTeach','🎓','Teach',click('teachBtn'),'Teach a symbol');const qrT=mkTop('navQr','📷','QR code',click('qrTool'),'Scan an install-sheet QR code');
 const layT=by('tb2Lay');
 // ---------- big buttons ----------
 const det=by('detBtn'),ds=by('dsBtn'),walk=by('walkBtn');
 det.classList.add('navBig','navDet');ds.classList.add('navBig','navSh');
 if(ds.querySelector('.tl'))ds.querySelector('.tl').textContent='Sheets';
 if(walk.querySelector('.tl'))walk.querySelector('.tl').textContent='Walk test';
 // things that now live only in Menu / More (kept for their handlers, never shown)
 const pass=X.pass;
 if(X.textB&&!X.textB.id)X.textB.id='tbText';if(X.colW&&!X.colW.id)X.colW.id='tbColor';
 function layout(){const w=wide(),B=X.B;
  ['shapes','lines','select','share','more','place','width'].forEach(k=>B[k]&&(B[k].hidden=false));T.classList.remove('tbWide');T.querySelectorAll('.tbFlat').forEach(f=>f.hidden=true);
  // bottom row
  const r=document.createElement('div');r.className='tbR navR';
  const draw=[B.shapes,B.lines,X.textB,X.stampB,X.colW,B.width];
  r.append(det,ds,B.place,walk);if(w){r.append(...draw);HOLD.append(drawB);DR.hidden=true}else{r.append(drawB);DR.replaceChildren(B.shapes,B.lines,X.freeB,X.stampB,X.textB,by('cSnap'),X.colW,B.width)}
  r.append(moreB);
  if(w)HOLD.append(X.freeB,by('cSnap'));
  [pass,B.share,B.select,B.more,by('qrTool'),by('teachBtn'),by('guidesBtn')].forEach(e=>e&&HOLD.append(e));
  T.querySelectorAll('.tbG').forEach(g=>HOLD.append(g));
  T.replaceChildren(r);T.classList.add('navT');T.classList.toggle('navWide',w);
  // top row
  const top=[menuB,by('prev'),by('tb2Page'),by('next'),by('undo'),by('thBtn'),by('listBtn')];if(w)top.push(layT,teachT,qrT);
  const keep=new Set(top);[...TOP.children].forEach(e=>{if(!keep.has(e))HOLD.append(e)});TOP.replaceChildren(...top);TOP.classList.add('navTop');
  window.tlayMark&&tlayMark();if(!DR.hidden)placeDR()}
 window.navLayout=layout;layout();addEventListener('resize',()=>{clearTimeout(layout._t);layout._t=setTimeout(layout,100)});
 // Pins panel: Export and Split now live only in Menu ▾ (one place each)
 const hidePB=()=>['pbExp','pbSplit'].forEach(id=>{const e=by(id);if(e&&!e.hidden){e.hidden=true;e.classList.add('navGone')}});hidePB();new MutationObserver(hidePB).observe(document.body,{childList:true,subtree:true});
})();
}catch(e){console.error('30-task-bar.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/31-backup-reminder.js =====
try{
// bpm-v135: Menu and More extra items registry (window.menuExtra / moreExtra, V135.MX / V135.MO), persistent storage, daily backup reminder.
// Classic script: uses the app's shared globals (project, plan, pins, change, get/put, toast, uiConfirm …). DOM helpers by/ce/ceA: src/ui/00-helpers.js.
(()=>{const ce=ceA;
 const MX=[],MO=[];window.menuExtra=(a,sub)=>MX.flatMap(f=>f(a,sub)||[]);window.moreExtra=a=>MO.flatMap(f=>f(a)||[]);window.V135={MX,MO,by,ce};
 // ---------- 1. Persistent storage + daily backup reminder ----------
 // Ask the browser to keep this site's data (IndexedDB plans, pins, photos) instead of clearing it when the phone runs low on space.
 const ST={asked:false,granted:null};window.V135.storage=ST;
 async function askPersist(){ST.asked=true;try{if(!navigator.storage||!navigator.storage.persist)return ST.granted=null;ST.granted=(await navigator.storage.persisted?.())||await navigator.storage.persist()}catch(e){ST.granted=false}return ST.granted}
 window.askPersist=askPersist;askPersist();
 const DAY=864e5,K=()=>project&&project.id;
 const dirtyAt=()=>+(localStorage.getItem('bpm-bkdirty:'+K())||0);
 const markDirty=()=>{if(K())localStorage.setItem('bpm-bkdirty:'+K(),Date.now())};
 const _c=change;change=async function(...a){const r=await _c.apply(this,a);markDirty();return r};
 const _cm=changeMulti;changeMulti=async function(...a){const r=await _cm.apply(this,a);markDirty();return r};
 async function bkInfo(){const pid=K();if(!pid)return null;return{last:+(await get('meta','bk:'+pid)||0),snooze:+(await get('meta','bkSnooze:'+pid)||0),off:!!(await get('meta','bkOff')),dirty:dirtyAt()}}
 async function bkDue(){const i=await bkInfo();if(!i||i.off)return false;const now=Date.now();if(!i.dirty||i.dirty<=i.last)return false;if(i.snooze&&now<i.snooze)return false;return !i.last||now-i.last>=DAY*0.8}
 const fmtD=t=>t?new Date(t).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):'never';
 let bar=null;function bkBar(){if(bar)return bar;bar=ce('div',{id:'bkBar',hidden:true},`<span id="bkTxt"></span><button type="button" class="btn pri" id="bkSave">💾 Save project file</button><button type="button" class="btn" id="bkLater">Remind me tomorrow</button>`);bar.setAttribute('role','status');
  (by('stage')||document.body).append(bar);by('bkSave').onclick=()=>{bar.hidden=true;by('projSave').click()};
  by('bkLater').onclick=async()=>{const t=new Date();t.setHours(24,0,0,0);/* next morning */await put('meta',t.getTime()+6*36e5,'bkSnooze:'+K());bar.hidden=true;toast('Backup reminder snoozed until tomorrow')};return bar}
 async function bkCheck(){const b=bkBar();if(!await bkDue()){b.hidden=true;return false}const i=await bkInfo();by('bkTxt').textContent=`Save a backup project file today. Last backup: ${fmtD(i.last)}.`;b.hidden=false;return true}
 window.bkCheck=bkCheck;window.bkInfo135=bkInfo;window.bkSaved=async pid=>{await put('meta',Date.now(),'bk:'+pid);await del('meta','bkSnooze:'+pid);if(bar)bar.hidden=true};
 const _lp=loadProject;loadProject=async function(...a){const r=await _lp.apply(this,a);setTimeout(bkCheck,1500);return r};
 setInterval(bkCheck,10*60e3);document.addEventListener('visibilitychange',()=>{if(!document.hidden)bkCheck()});
 MX.push(()=>[{i:'⏰',l:'Backup reminder…',run:async()=>{const i=await bkInfo();if(!i)return uiAlert('Open a project first.');
   const msg=`Daily backup reminder is ${i.off?'off':'on'}. Last backup project file for this project: ${fmtD(i.last)}.\n\nPhone storage protection: ${ST.granted?'on (the browser keeps this app’s data)':ST.granted===false?'not granted (the browser may clear this app’s data when space runs low, so save backups)':'not supported in this browser'}.`;
   if(await uiConfirm(msg,{ok:i.off?'Turn reminder on':'Turn reminder off',cancel:'Close'})){await put('meta',!i.off,'bkOff');toast('Backup reminder '+(i.off?'on':'off'));bkCheck()}if(!ST.granted)askPersist()}}]);
})();
}catch(e){console.error('31-backup-reminder.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/32-visit-times.js =====
try{
// bpm-v135/v136: Inspection and Testing Record visit times (Start now / End now buttons); old signature data dropped on project load.
// ---------- 3. Inspection and Testing Record: visit times (bpm-v136: on-screen signatures removed) ----------
(()=>{const {by}=window.V135;
 /* bpm-v136: signatures are gone. Old projects may still hold signature data from version 135; drop it quietly on load. */
 const dropSig=async pid=>{if(!pid)return;try{if(await get('meta','sig:'+pid))await del('meta','sig:'+pid);if(await get('meta','sigPrev:'+pid))await del('meta','sigPrev:'+pid)}catch{}};window.dropSig=dropSig;
 const _lp=loadProject;loadProject=async function(...a){const r=await _lp.apply(this,a);dropSig(project&&project.id);return r};
 const now=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
 const f=by('jobForm');if(f){by('itmStartNow').onclick=()=>{f.elements.startTime.value=now()};by('itmEndNow').onclick=()=>{f.elements.finishTime.value=now()}}
})();
}catch(e){console.error('32-visit-times.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/33-next-inspection.js =====
try{
// bpm-v135/v136/v138: Start next inspection (Save backup and start), Last visit record (window.prevTxt, window.lastVisitPhotos).
// ---------- 5. Start next inspection (keep last results for comparison) ----------
(()=>{const {by,ce,MX}=window.V135;const K=()=>project&&project.id;
 const RESET=['testedAt','tester','reason','reasonText','severity','codes','correctedAt','correctedBy','corrNote','rdSens','rdCd','rdDb'];
 const VISIT=['inspDate','testDate','result','startTime','finishTime','notifyBefore','notifyAfter','sigAlarm','sigSuper','sigTrouble','sigRestore','simNote'];
 const tested=p=>p.status&&p.status!=='not tested'||p.testedAt;
 function snap(p,j){const o={status:p.status||'not tested',inspDate:j.inspDate||'',endedAt:Date.now()};for(const k of ['testedAt','tester','reason','reasonText','severity','corrNote','correctedAt','rdSens','rdCd','rdDb'])if(p[k]!=null&&p[k]!=='')o[k]=structuredClone(p[k]);const ck=(p.checks||[]).filter(c=>c.v);if(ck.length)o.checks=ck.map(c=>({t:c.t,v:c.v}));return o}
 async function nextInsp(){if(!K())return uiAlert('Open a project first.');const pid=K(),j=(await get('meta','job:'+pid))||{},D=await projData(),n=D.reduce((a,d)=>a+d.pins.length,0),nt=D.reduce((a,d)=>a+d.pins.filter(tested).length,0);
  if(!n)return uiAlert('This project has no devices yet.');
  /* bpm-v138: the main button saves a backup project file first, then starts; "Start without backup" skips the backup */
  const ch=await uiConfirm(`Start the next inspection for this project?\n\nAll ${n} devices go back to "not tested". Checklists, fail reasons and readings are cleared for the new visit.\n\nThe last result of every device (${nt} tested) and its photos move to a "Last visit" record: it shows on the pin card as "Last visit" and in the device spreadsheet, so you can compare.\n\nSave backup and start saves a project file of this visit first.`,{ok:'Save backup and start',alt:'Start without backup',cancel:'Cancel',danger:false});
  if(!ch)return false;if(ch===true&&!await saveBackup(pid))return false;
  busy(1,'Starting next inspection');try{const now=Date.now(),who=(typeof tester==='string'&&tester)||'';
   /* bpm-v136: everything is prepared first, then written in ONE IndexedDB transaction (pins, photos, job record). If the app is closed or anything fails
      midway, the browser keeps none of it: the project is either fully on the old visit or fully on the new one. Last visit's photos move off the pin into
      its last-visit record (media.lastVisit = when that visit ended), so the new visit starts with no photos. */
   const P=[],M=[];
   for(const{pl,pins:ps}of D)for(const p0 of ps){const p=pl.id===plan?.id?(pins.find(x=>x.id===p0.id)||p0):p0,a=structuredClone(p);
    const md=(await byIdx('media','pinId',p.id)).filter(m=>!m.lastVisit);
    if(tested(p)||md.length){a.prev=snap(p,j);if(md.length)a.prev.photos=md.length}else delete a.prev;
    for(const m of md)M.push({...m,lastVisit:now});
    a.status='not tested';if(Array.isArray(a.checks))a.checks=a.checks.map(c=>({...c,v:''}));for(const k of RESET)delete a[k];a.updatedAt=now;a.dev=window.DEVICE_ID;a.by=who;P.push(a)}
   const nj={...j};for(const k of VISIT)nj[k]='';
   const d=await db();await new Promise((res,rej)=>{const t=d.transaction(['pins','media','meta'],'readwrite');t.oncomplete=res;t.onerror=()=>rej(t.error||new Error('save failed'));t.onabort=()=>rej(t.error||new Error('save cancelled'));
    try{const sp=t.objectStore('pins'),sm=t.objectStore('media'),sx=t.objectStore('meta');for(const a of P)sp.put(a);for(const m of M)sm.put(m);sx.put({...j,endedAt:now},'jobPrev:'+pid);sx.put(nj,'job:'+pid)}
    catch(e){try{t.abort()}catch{}rej(e)}});
   for(const a of P){const i=pins.findIndex(x=>x.id===a.id);if(i>=0)pins[i]=a}
   if(plan)await openPlan(plan.id,page);afterChange?.();toast(`Next inspection started: ${P.length} devices reset, last visit kept`+(M.length?` (${M.length} photo${M.length===1?'':'s'} moved to last visit)`:''));return true}
  catch(e){showErr('Could not start the next inspection. Nothing was changed: '+e.message);try{if(plan)await openPlan(plan.id,page)}catch{}return false}finally{busy(0)}}
 // bpm-v138: backup project file before the next inspection (same file as Menu > Save project file, learned rules included when there are any)
 async function saveBackup(pid){const pr=project;if(!pr||pr.id!==pid)return false;busy(1,'Saving backup');prog(0);
  try{let wl=false;try{wl=(await learnedRules()).length>0}catch{}const r=await deliver(fsafe(pr.name)+'.bpm','application/octet-stream','.bpm',async()=>{const b=await buildBpm(pr.id,wl,prog);window.__lastBpm=b;return b});
   if(!r){uiAlert('Backup not saved, so the next inspection was not started.');return false}window.bkSaved&&bkSaved(pr.id);toast(`Backup saved: "${pr.name}"`);return true}
  catch(e){showErr('Saving the backup failed, so the next inspection was not started: '+e.message);return false}finally{busy(0)}}
 window.nextInsp=nextInsp;
 const prevTxt=p=>{const v=p&&p.prev;if(!v)return'';return `Last visit${v.inspDate?' ('+v.inspDate+')':v.endedAt?' (ended '+new Date(v.endedAt).toLocaleDateString()+')':''}: ${v.status}${v.reason?' · '+v.reason:''}${v.testedAt?' · '+fmtT(v.testedAt):''}${v.tester?' by '+v.tester:''}${typeof rdTxt==='function'&&rdTxt({...v,type:p.type})?' · '+rdTxt({...v,type:p.type}):''}${v.photos?' · '+v.photos+' photo'+(v.photos===1?'':'s'):''}`};
 window.prevTxt=prevTxt;
 /* bpm-v136: last visit's photos are viewed from the pin card with a labelled button; they are not part of the current visit */
 async function lastPhotos(p){const ms=(await byIdx('media','pinId',p.id,true)).filter(m=>m.lastVisit&&m.blob&&(m.kind||'photo')==='photo').sort((a,b)=>b.lastVisit-a.lastVisit||(a.created||0)-(b.created||0));if(!ms.length)return toast('No photos from the last visit');
  const d=ce('dialog',{id:'lvDlg'},`<form method="dialog"><h3 style="margin:4px 0">📷 Last visit photos</h3><small style="color:#a2a2a2">${esc(TYPES[p.type]?.n||p.type)} ${esc(p.address||'')}: photos from the last visit. They are kept for comparison and are not part of this visit.</small><div class="lvG"></div><div class="row"><span class="sp"></span><button class="btn">✕ Close</button></div></form>`);
  const us=[];for(const m of ms){const u=URL.createObjectURL(m.blob);us.push(u);const im=ce('img');im.src=u;im.alt='Last visit photo';d.querySelector('.lvG').append(im)}document.body.append(d);d.addEventListener('close',()=>{us.forEach(URL.revokeObjectURL);d.remove()});d.showModal()}
 window.lastVisitPhotos=lastPhotos;
 // the pin card's Last visit row is filled by openPin (src/app/03-card.js) with prevTxt and lastVisitPhotos
 MX.push(()=>[{i:'🔁',l:'Start next inspection…',run:nextInsp}]);
})();
}catch(e){console.error('33-next-inspection.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/34-photos-sheets.js =====
try{
// bpm-v135: smaller saved photos (window.shrinkPhoto, Menu > Make saved photos smaller) and this job's install sheets offline.
// ---------- 9. Smaller saved photos + save this job's install sheets for offline use ----------
(()=>{const {MX}=window.V135;const K=()=>project&&project.id;
 const MAXD=2048,Q=.82,MINB=700*1024;
 // Phone camera photos are 3–12 MB each. Store a copy at most 2048 px on the long side (sharp enough to read labels and wiring), JPEG 82 %.
 async function shrink(blob){try{if(!blob||!/^image\/(jpeg|png|webp|heic|heif)/i.test(blob.type||''))return blob;const bm=await createImageBitmap(blob,{imageOrientation:'from-image'});const w=bm.width,h=bm.height,s=Math.min(1,MAXD/Math.max(w,h));
   if(s===1&&blob.size<=MINB){bm.close?.();return blob}const cv=document.createElement('canvas');cv.width=Math.round(w*s);cv.height=Math.round(h*s);const g=cv.getContext('2d');g.drawImage(bm,0,0,cv.width,cv.height);bm.close?.();
   const out=await new Promise(r=>cv.toBlob(r,'image/jpeg',Q));if(!out||out.size>=blob.size)return blob;out.origSize=blob.size;return out}catch(e){return blob}}
 window.shrinkPhoto=shrink;
 // addMedia (src/app/03-card.js) stores photos through shrinkPhoto
 async function shrinkAll(){if(!K())return uiAlert('Open a project first.');const D=await projData(),ids=new Set(D.flatMap(d=>d.pins.map(p=>p.id))),M=(await all('media')).filter(m=>ids.has(m.pinId)&&m.kind==='photo'&&m.blob);
  if(!M.length)return uiAlert('This project has no saved photos.');const tot=M.reduce((a,m)=>a+(m.blob.size||0),0);
  if(!await uiConfirm(`Make the ${M.length} saved photos in this project smaller?\n\nThey use ${(tot/1048576).toFixed(1)} MB now. Each photo is kept at up to ${MAXD} pixels on its long side, sharp enough to read labels. Drawings on photos are kept.`,{ok:'Make photos smaller',cancel:'Cancel'}))return;
  busy(1,'Making photos smaller');let after=0,n=0;try{for(const m of M){const b=await shrink(m.blob);if(b!==m.blob){m.blob=b;n++;await put('media',m)}after+=m.blob.size}}finally{busy(0)}
  toast(`${n} photo${n===1?'':'s'} made smaller: ${(tot/1048576).toFixed(1)} MB → ${(after/1048576).toFixed(1)} MB`);if(typeof cur!=='undefined'&&cur&&$('#pinDlg').open)showMedia();return{n,before:tot,after}}
 window.shrinkAllPhotos=shrinkAll;
 // the install sheets for the models used in this project's devices, saved into the offline sheet cache in one step
 async function jobSheets(){const D=await projData(),ms=[...new Set(D.flatMap(d=>d.pins.map(p=>String(p.model||'').trim()).filter(Boolean)))],fs=new Set(),none=[];
  for(const m of ms){const L=[...(INSTALL[m]||[]),DATASHEETS[m]].filter(u=>u&&String(u).startsWith('docs/'));if(L.length)L.forEach(u=>fs.add(u));else none.push(m)}return{ms,fs:[...fs],none}}
 async function saveJobSheets(){if(!K())return uiAlert('Open a project first.');const{ms,fs,none}=await jobSheets();
  if(!ms.length)return uiAlert('No device in this project has a model yet, so there are no install sheets to save. Set models on the pin cards, or use Sheets > Save all offline for every sheet.');
  if(!fs.length)return uiAlert(`None of the ${ms.length} models in this project has an install sheet stored in Marker.`);
  const c=await caches.open(DOC_CACHE);let ok=0,had=0,bad=0;busy(1,'Saving install sheets');try{for(const f of fs){const abs=new URL(f,location.href).href;if(await c.match(abs)){had++;continue}try{const r=await fetch(abs);if(r.ok){await c.put(abs,r);ok++}else bad++}catch(e){bad++}}}finally{busy(0)}
  const msg=`${fs.length-bad} of ${fs.length} install sheets for this job are saved for offline use (${ok} new, ${had} already saved).${bad?` ${bad} could not be downloaded: try again when online.`:''}${none.length?`\n\nNo stored sheet for: ${none.join(', ')}.`:''}`;uiAlert(msg);return{n:fs.length,ok,had,bad,none}}
 window.saveJobSheets=saveJobSheets;window.jobSheets=jobSheets;
 MX.push(()=>[{i:'📄',l:'Save this job’s install sheets offline',run:saveJobSheets},{i:'🗜',l:'Make saved photos smaller…',run:shrinkAll}]);
})();
}catch(e){console.error('34-photos-sheets.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/35-screen-zoom.js =====
try{
// ---------- bpm-v135 item 11: app-screen pinch zoom + Menu > Reset screen zoom ----------
(()=>{const {MX}=window.V135;
 // ---- item 11: app-screen pinch zoom (bpm-v135). The page may now be pinch-zoomed (small text, photos, dialogs);
 // the plan keeps its own pinch zoom: #stage is touch-action:none, and iOS page gestures that start on the plan are cancelled.
 const stg=document.getElementById('stage');if(stg)for(const ev of['gesturestart','gesturechange'])stg.addEventListener(ev,e=>e.preventDefault(),{passive:false});
 const VPC='width=device-width,initial-scale=1,minimum-scale=1';let zBusy=0;
 /* lock the page scale to 1 until the browser has actually applied it (or 0.7 s), then unlock so pinch-to-zoom keeps working */
 function resetZoom(){const m=document.querySelector('meta[name=viewport]');if(!m||zBusy)return;zBusy=1;const t0=performance.now();m.content=VPC+',maximum-scale=1';
  const vv=window.visualViewport;const chk=()=>{const t=performance.now()-t0;if(t>700||t>150&&(!vv||Math.abs(vv.scale-1)<.01)){m.content=VPC;zBusy=0;return}requestAnimationFrame(chk)};requestAnimationFrame(chk)}
 window.resetScreenZoom=resetZoom;
 MX.push(()=>[{i:'🔍',l:'Reset screen zoom',run:resetZoom}]);
})();
}catch(e){console.error('35-screen-zoom.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/36-detect-one-tap.js =====
try{
// bpm-v138: one-tap Detect (the Detect button reruns the last types and pages; window.detectSettings opens the dialog). More > Detect types and pages.
// Classic script; shares the app's globals. by/ce: src/ui/00-helpers.js.
(()=>{const MO=window.V135&&V135.MO;
 // ---------- 1) one-tap Detect ----------
 // After Detect has been run once from the dialog, the Detect button runs again straight away with the same device types and pages.
 // The first time, the dialog opens with every type ticked and "All pages" chosen (Detect still reads only main floor plan pages and never pins gray devices).
 // "Detect types and pages…" (suggestions bar and More) opens the dialog to change them. After an all-pages run with nothing on this page, it goes to the first page with suggestions.
 const detB=by('detBtn'),openDet=detB&&detB.onclick;
 const detDlgOpen=async()=>{if(!openDet)return;await openDet.call(detB);const d=by('detDlg');if(!d||!d.open)return;const s=await get('meta','detectSel');
  if(!(s&&Array.isArray(s.groups)&&s.groups.length)){by('detAll')&&by('detAll').click();const f=by('detForm');if(f&&f.elements.scope)f.elements.scope.value='all'}};
 window.detectSettings=detDlgOpen;
 if(detB&&openDet){detB.onclick=async function(){if(!plan||!pdf||det)return openDet.call(this);const s=await get('meta','detectSel'),one=await get('meta','detectOneTap');
   if(one&&s&&Array.isArray(s.groups)&&s.groups.length){const ok=new Set(Object.keys(DG));const g=s.groups.filter(k=>ok.has(k));if(g.length)return runDetect(g,!!s.all)}return detDlgOpen()};
  by('detForm')&&by('detForm').addEventListener('submit',e=>{if(e.submitter?.value==='go')put('meta',1,'detectOneTap')},true)}
 // runDetect (src/app/04-detect.js) folds the legend banner and goes to the first page with suggestions
 // renderGhostBar (src/app/04-detect.js) adds the "Detect types and pages" button that calls detectSettings
 if(MO)MO.push(()=>[{i:'🔍',l:'Detect types and pages…',run:()=>plan?detDlgOpen():uiAlert('Open a plan first.')}]);
})();
}catch(e){console.error('36-detect-one-tap.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/37-walk-flow.js =====
try{
// bpm-v138: walk flow. Walk dialog type ticks and order choice, quick fail reasons on the walk bar, Pages strip tucked away during a walk,
// legend banner folding (window.foldLegend; More > Review legend symbols).
// Classic script; shares the app's globals. by/ce: src/ui/00-helpers.js.
(()=>{const MO=window.V135&&V135.MO;
 // ---------- 2) walk test starts with the devices you actually test ----------
 // Until a walk has been started in this version, the picker ticks every type except panels, cabinets, junction boxes, EOL resistors, surge protectors,
 // pull boxes and backflow preventers (they stay in the list to tick). After that, the last choice is remembered as before.
 const NOWALK=new Set(['panel','dact','fatc','panelbox','jbox','surge','eol','pullbox','bfp','pad','other']);
 window.walkTestable=t=>!NOWALK.has(t);
 const ordKey='bpm-walkOrder';window.WALK_ORDER=localStorage.getItem(ordKey)==='addr'?'addr':'near';
 const _wp=walkPick;walkPick=async function(...a){if(plan&&pins.length)await askTesterOnce();const seen=await get('meta','walkTypesV138');const r=await _wp.apply(this,a);const d=by('walkDlg');
  if(d&&d.open){if(!seen)d.querySelectorAll('#wkTypes input[value]').forEach(b=>b.checked=walkTestable(b.value));
   d.querySelectorAll('[name=wkOrder]').forEach(i=>i.checked=i.value===WALK_ORDER);ordSub()}return r};
 const ordSub=()=>{const s=by('wkSub');if(s)s.textContent=WALK_ORDER==='addr'?'Visits untested pins of the ticked types, page by page in address order.':'Visits untested pins of the ticked types, nearest first.'};
 document.addEventListener('change',e=>{if(e.target.name==='wkOrder'){WALK_ORDER=e.target.value==='addr'?'addr':'near';localStorage.setItem(ordKey,WALK_ORDER);ordSub()}});
 document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#wkGo'))put('meta',1,'walkTypesV138')},true);

 // ---------- 13) walk order: nearest first, or page by page in address order ----------
 // the address order itself is in nearestFrom (src/app/05-walk.js)

 // ---------- 3) quick fail reasons on the walk bar ----------
 // Fail shows the reasons that fit this device type (from its checklist) as buttons; one tap saves the fail and moves on. Open full card is one tap away.
 const _rw=renderWalk;renderWalk=function(...a){const r=_rw.apply(this,a);try{quickFail()}catch(e){console.error(e)}return r};
 function quickFail(){const w=by('walk');if(!walk||!walk.p||!w||w.hidden)return;const p=pins.find(x=>x.id===walk.p.id)||walk.p;
  if(walk.qf!==p.id){const f=w.querySelector('#wFail');if(f)f.onclick=()=>{walk.qf=p.id;walk.qcrit=false;renderWalk()};return}
  const R=[...(window.failReasonsFor?failReasonsFor(p.type):REASONS.filter(x=>x!=='Other')),'Other'],T=TYPES[p.type]||TYPES.other;
  w.innerHTML=`<div class="wfCard qfCard" role="group" aria-label="Fail reason"><div class="wfH"><span class="wDot" style="background:${T.c}"></span><div class="wfT"><b>${esc(T.n||p.type)} ${p.address?esc(p.address):'<small>(no address)</small>'}</b><small>✖ Fail: tap the reason</small></div></div>
  <div class="qfR">${R.map(x=>`<button type="button" class="btn danger" data-qr="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="qfB"><label class="wfCritL" title="Mark as a critical deficiency"><input type="checkbox" id="qfCrit"${walk.qcrit?' checked':''}><span>⚠ Critical</span></label><span class="sp"></span><button type="button" class="btn" id="qfCard">📋 Open full card</button><button type="button" class="btn" id="qfX">Cancel</button></div></div>`;
  const q=s=>w.querySelector(s);q('#qfCrit').onchange=e=>{walk.qcrit=e.target.checked};
  q('#qfX').onclick=()=>{walk.qf=null;renderWalk()};q('#qfCard').onclick=()=>{walk.qf=null;renderWalk();walkFailCard(p)};
  w.querySelectorAll('[data-qr]').forEach(b=>b.onclick=()=>{const c=!!walk.qcrit;walk.qf=null;walk.qcrit=false;testPin(p,'fail',b.dataset.qr,c)})}

 // ---------- 9 + 10) during a walk: no Delete on the pin card, Pages strip tucked away, legend banner folded ----------
 let thWas=null;
 /* the walk bar and the strip change at the same moment: the side panel jumps to its new bottom at once (no height slide, so it never overlaps the walk bar) */
 const noH=()=>{document.body.classList.add('v138NoT');clearTimeout(noH._t);noH._t=setTimeout(()=>document.body.classList.remove('v138NoT'),600);for(const id of ['panel','lyrP']){const e=by(id);if(e){e.classList.add('v138NoH');clearTimeout(e._v138h);e._v138h=setTimeout(()=>e.classList.remove('v138NoH'),600)}}};
 const _sw=startWalk;startWalk=function(...a){noH();window.foldLegend&&foldLegend();const th=by('thumbs');if(th&&!th.hidden&&plan&&pins.length){thWas=true;th.hidden=true;by('thBtn')&&by('thBtn').classList.remove('pri')}else thWas=null;
  const r=_sw.apply(this,a);if(!walk&&thWas&&th){th.hidden=false;by('thBtn')&&by('thBtn').classList.add('pri');thWas=null}dispatchEvent(new Event('resize'));return r};
 const _ew=exitWalk;exitWalk=function(...a){noH();const r=_ew.apply(this,a);const th=by('thumbs');if(thWas&&th&&plan){th.hidden=false;by('thBtn')&&by('thBtn').classList.add('pri');try{renderThumbs()}catch{}}thWas=null;dispatchEvent(new Event('resize'));return r};

 // legend banner: shown once when a plan is first opened; it folds into More ("Review legend symbols") when Detect runs, a walk starts or a pin card opens
 let LEG=null;function foldLegend(){const lg=by('legChip');if(!lg||lg.hidden)return;const rb=lg.querySelector('#legRev');if(rb&&rb.onclick)LEG={run:rb.onclick,t:rb.textContent.replace(/·\s*Review/,'').replace(/^\W+/,'').trim(),pl:plan&&plan.id};lg.hidden=true}
 window.foldLegend=foldLegend;
 // openPin (src/app/03-card.js) folds the legend banner when a pin card opens
 if(MO)MO.push(()=>LEG&&plan&&LEG.pl===plan.id?[{i:'🔣',l:'Review legend symbols ('+LEG.t+')',run:()=>{const f=LEG.run;LEG=null;f()}}]:[]);
})();
}catch(e){console.error('37-walk-flow.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/38-pins-open-card.js =====
try{
// bpm-v138: Pins list rows get an Open card button (wraps renderList; bpm-v140: the search and filter inputs call the wrapped one too).
// Classic script; shares the app's globals. by/ce: src/ui/00-helpers.js.
(()=>{
 // ---------- 8) Pins list: each row has Open card ----------
 const _rl=renderList;renderList=function(...a){const r=_rl.apply(this,a);const L=by('pinList');if(L)L.querySelectorAll('li[data-id]').forEach(li=>{if(li.querySelector('.pOpen'))return;
  const b=ce('button','btn pOpen','Open card');b.type='button';b.title='Open this pin’s card';b.onclick=async e=>{e.stopPropagation();const id=li.dataset.id;await jumpTo(plan.id,id);const p=pins.find(x=>x.id===id);if(p)openPin(p)};li.append(b)});return r};
})();
}catch(e){console.error('38-pins-open-card.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/39-menu-list.js =====
try{
// bpm-v138: Menu as a grouped list (Job, Plan, Files, Settings). bpm-v141: the list sheet itself now lives in src/ui/15-toolbar-wheels.js and is used by
// every former wheel; this file only supplies the Menu's groups through window.listGroups(title,items) -> [[group name, [item indexes]], ...].
// bpm-v142: Finish inspection in Job, Address sweep in Plan.
// Classic script; shares the app's globals.
(()=>{
 const GR=[['Job',/^(New project|Open project file|Switch project|Rename project|Delete project|Start next inspection|Finish inspection)/],['Plan',/^(Open plan|Switch plan|Rename page|Delete plan|Address sweep)/],
  ['Files',/^(Save project file|Export|Share|Backup reminder|Save this job|Make saved photos)/],['Settings',/^(Reset screen zoom|Customize)/]];
 window.listGroups=(title,items)=>{if(title!=='Menu')return null;const used=new Set();
  const g=GR.map(([n,rx])=>[n,items.map((x,i)=>i).filter(i=>{const ok=!used.has(i)&&rx.test(items[i].l||'');if(ok)used.add(i);return ok})]);
  const rest=items.map((x,i)=>i).filter(i=>!used.has(i));if(rest.length)g[2][1].push(...rest);return g};
})();
}catch(e){console.error('39-menu-list.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/40-empty-screen.js =====
try{
// bpm-v138: empty first screen buttons (Open plan, New project).
// Classic script; shares the app's globals. by/ce: src/ui/00-helpers.js.
(()=>{
 // ---------- 14) empty first screen: real Open plan and New project buttons ----------
 const eo=by('emOpen'),en=by('emNew');if(eo)eo.onclick=()=>by('file').click();if(en)en.onclick=()=>by('projNew').click();
})();
}catch(e){console.error('40-empty-screen.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/41-detect-cancel.js =====
try{
// bpm-v141: Cancel at the top of the Detect pop-up (like Save / Close at the top of the pin card). Closes it without running Detect.
(()=>{const d=by('detDlg'),h=d&&d.querySelector('#detForm>h3');if(!h)return;
 const row=ce('div','row detTopRow');h.replaceWith(row);row.append(h,ce('span','sp'));
 const b=ce('button','btn','Cancel');b.type='button';b.id='detCancelTop';b.title='Close without detecting';b.onclick=()=>d.close('cancel');row.append(b)})();
}catch(e){console.error('41-detect-cancel.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/42-address-sweep.js =====
try{
// bpm-v142: Address sweep (recommendation 4). Type the first address once, then tap the devices in order: each tapped device gets the next address.
// The loop stays inside the address (L1D001, L1D002 …); there is no loop field and no panel import. Only the address changes: pin position, size and
// type are never touched. Every address goes through change() so the top-bar Undo works too. Menu > Address sweep…, and Finish inspection's No address group.
// Classic script; shares the app's globals (plan, pins, page, walk, sel, msel, change, openPin, toast, uiPrompt, uiAlert …).
(()=>{const MX=window.V135&&V135.MX;
 // next address: the last number in the address goes up by one and keeps its zero padding (L1D009 -> L1D010, 2-099 -> 2-100)
 const parseA=a=>{const m=String(a||'').trim().match(/^(.*?)(\d+)(\D*)$/);return m?{pre:m[1],n:+m[2],w:m[2].length,suf:m[3]}:null};
 const nextA=(a,k=1)=>{const p=parseA(a);if(!p)return null;const n=Math.max(0,p.n+k);return p.pre+String(n).padStart(p.w,'0')+p.suf};
 window.sweepNext=nextA;
 const SW={on:false,next:'',hist:[],n:0,last:null,tapT:0,planId:null,tm:0};window.SWEEP=SW;
 const key=()=>'bpm-sweep:'+(project&&project.id||'');
 let bar=null;
 function mkBar(){if(bar)return bar;bar=ce('div','',`<div class="swH"><b class="swT">Address sweep</b><span class="swN"></span></div><div class="swS"></div>
  <div class="swB"><button type="button" class="btn" id="swUndo">Undo last</button><button type="button" class="btn" id="swSkip">Skip number</button><button type="button" class="btn" id="swEdit">Change next address</button><button type="button" class="btn pri" id="swDone">Done</button></div>`);
  bar.id='swBar';bar.hidden=true;bar.setAttribute('role','status');document.body.append(bar);
  by('swUndo').onclick=undoLast;by('swSkip').onclick=()=>{const n=nextA(SW.next);if(n){SW.next=n;save();render();toast('Skipped a number. Next: '+n,true)}};
  by('swEdit').onclick=async()=>{const a=await ask(SW.next);if(a){SW.next=a;SW.last=null;save();render()}};by('swDone').onclick=()=>stop(true);return bar}
 const save=()=>{try{localStorage.setItem(key(),SW.next)}catch{}};
 const used=a=>pins.some(p=>p.address&&String(p.address).trim().toUpperCase()===String(a).trim().toUpperCase()&&p.id!==SW.last);
 function render(){if(!bar)return;by('swUndo').disabled=!SW.hist.length;
  bar.querySelector('.swN').textContent=`Next: ${SW.next} · ${SW.n} set`;
  bar.querySelector('.swS').textContent=used(SW.next)?`${SW.next} is already on another device on this plan. Tap a device to use it anyway, or Skip number.`:'Tap each device in order. Each one gets the next address.';place()}
 // sits just above the big bottom bar (and the Pages strip / Detect suggestions bar when they show)
 function place(){if(!bar||bar.hidden)return;let top=innerHeight;for(const s of['#tools','#thumbs','#ghBar','#bkBar']){const e=document.querySelector(s);if(!e||e.hidden)continue;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')continue;const r=e.getBoundingClientRect();if(r.height>0&&r.top>innerHeight*0.45&&r.top<top)top=r.top}
  bar.style.bottom=Math.max(6,Math.round(innerHeight-top+6))+'px'}
 async function ask(def){for(;;){const a=await uiPrompt('Address sweep\n\nType the first address. Then tap the devices in order: each one gets the next address (for example L1D001, then L1D002, L1D003 …). The loop is part of the address.',def||'',{ok:'Start sweep',cancel:'Cancel'});
   if(a===null)return null;const t=String(a).trim();if(parseA(t))return t;uiAlert('The address has to end in a number, for example L1D001.')}}
 async function start(){if(!plan)return uiAlert('Open a plan first.');if(walk)return uiAlert('Leave the walk test first, then start the address sweep.');
  const a=await ask(SW.on?SW.next:(localStorage.getItem(key())||''));if(!a)return false;
  try{const t=document.querySelector('[data-t="select"]');if(t&&tool!=='select')t.click()}catch{}
  Object.assign(SW,{on:true,next:a,hist:[],n:0,last:null,planId:plan.id});save();mkBar().hidden=false;document.body.classList.add('sweeping');render();
  clearInterval(SW.tm);SW.tm=setInterval(place,500);toast('Address sweep: tap the device for '+a,true);return true}
 function stop(say){if(!SW.on)return;SW.on=false;clearInterval(SW.tm);if(bar)bar.hidden=true;document.body.classList.remove('sweeping');if(say)toast(`Address sweep done: ${SW.n} address${SW.n===1?'':'es'} set`,true)}
 async function assign(p){const q=pins.find(x=>x.id===p.id);if(!q)return;
  if(SW.last===q.id){toast(`Already set to ${q.address}. Use Undo last to change it.`,true);return}
  const a=SW.next,b=structuredClone(q),na={...b,address:a,updatedAt:Date.now()};await change('pins',b,na);
  SW.hist.push({id:q.id,was:b.address||'',a});SW.n++;SW.last=q.id;SW.next=nextA(a)||a;save();sel=null;msel=[];try{renderSelBar()}catch{}draw();render();
  toast(`${TYPES[q.type]?.n||q.type}: ${a}${b.address&&b.address!==a?` (was ${b.address})`:''}`,true)}
 async function undoLast(){const h=SW.hist.pop();if(!h)return;const q=pins.find(x=>x.id===h.id);
  if(q&&String(q.address)===h.a){const b=structuredClone(q);await change('pins',b,{...b,address:h.was,updatedAt:Date.now()})}
  SW.n=Math.max(0,SW.n-1);SW.next=h.a;SW.last=SW.hist.length?SW.hist[SW.hist.length-1].id:null;save();draw();render();toast('Undone. Next: '+h.a,true)}
 window.sweepStart=start;window.sweepStop=stop;
 // a tap on a pin on the plan gives it the next address instead of opening its card (cards from the Pins list still open)
 document.addEventListener('pointerup',e=>{if(SW.on&&typeof cv!=='undefined'&&(e.target===cv||e.target===stage))SW.tapT=Date.now()},true);
 const fromTap=()=>SW.on&&!walk&&Date.now()-SW.tapT<1500;
 const _op=openPin;openPin=function(p,...r){if(fromTap()&&p&&p.id){SW.tapT=0;assign(p);return}return _op.call(this,p,...r)};
 const _pd=window.pdTap;if(_pd)window.pdTap=p=>_pd(fromTap()?null:p);
 // a walk test, another project or another plan ends the sweep
 const _sw=startWalk;startWalk=function(...a){stop(false);return _sw.apply(this,a)};
 const _lp=loadProject;loadProject=async function(...a){stop(false);return _lp.apply(this,a)};
 const _o=openPlan;openPlan=async function(id,...a){const r=await _o.call(this,id,...a);if(SW.on&&plan&&plan.id!==SW.planId){SW.hist=[];SW.last=null;SW.planId=plan.id;render()}return r};
 addEventListener('resize',place);
 if(MX)MX.push(()=>[{i:'#',l:'Address sweep…',run:start}]);
})();
}catch(e){console.error('42-address-sweep.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/43-finish-inspection.js =====
try{
// bpm-v142: Finish inspection step (recommendation 5). One screen with what's left, grouped instead of one row per device: not tested by page and by
// type, failed without a photo or a reason, no address by page, tester details. Then one button makes the report PDF and saves the project file (the
// backup) in one go. Menu > Finish inspection…  Uses the same checks as the Before you send list; Go to buttons are per group, not per device.
// Classic script; shares the app's globals (project, plan, pins, page, walk, projData, pnAll, pgT, untested, byIdx, getJob, deliver, buildBpm …).
(()=>{const MX=window.V135&&V135.MX;let d=null,FIN={skipPre:false};
 const _ps=window.preSend;window.preSend=async function(...a){if(FIN.skipPre)return true;return _ps.apply(this,a)};
 const isFail=p=>String(p.status).includes('fail');
 async function gather(){await pnAll();const D=await projData(),multi=D.length>1,G={total:0,tested:0,failed:0,left:0,pg:new Map(),ty:new Map(),noPhoto:[],noReason:[],noAddr:new Map(),noAddrN:0,tester:'',lic:''};
  const pgName=(pl,n)=>(multi?(pl.name||'Plan')+' · ':'')+pgT(pl.id,n);
  for(const{pl,pins:ps}of D)for(const p of ps.slice().sort((a,b)=>a.page-b.page||a.y-b.y||a.x-b.x)){G.total++;const k=pl.id+'|'+p.page;
   if(untested(p)){G.left++;const g=G.pg.get(k)||{pl:pl.id,page:p.page,t:pgName(pl,p.page),n:0,p};g.n++;G.pg.set(k,g);G.ty.set(p.type,(G.ty.get(p.type)||0)+1)}else G.tested++;
   if(isFail(p)){G.failed++;const nm={pl:pl.id,p,t:`${TYPES[p.type]?.n||p.type} ${p.address||'(no address)'} · ${pgName(pl,p.page)}`};if(!p.reason)G.noReason.push(nm);
    const md=await byIdx('media','pinId',p.id);if(!md.some(m=>!m.lastVisit&&(m.kind||'photo')!=='audio'))G.noPhoto.push(nm)}
   if(!String(p.address||'').trim()){G.noAddrN++;const g=G.noAddr.get(k)||{pl:pl.id,page:p.page,t:pgName(pl,p.page),n:0,p};g.n++;G.noAddr.set(k,g)}}
  const tn=tester===null?await get('meta','tester'):tester,j=project?await getJob():{};G.tester=tn||j.techName||'';G.lic=j.techLic||j.license||'';return G}
 async function goTo(pl,pg,p,card){d&&d.close();document.querySelectorAll('dialog[open]').forEach(x=>x.close());if(plan?.id!==pl||page!==pg)await openPlan(pl,pg);
  if(p){const q=pins.find(x=>x.id===p.id);if(q){centerOn(q.x,q.y,Math.max(view.s,1),stage.clientWidth/2,stage.clientHeight/2);draw();if(card)openPin(q)}}}
 const row=(t,n,btn,data)=>`<li><span class="finR">${esc(t)}</span>${n!=null?`<b class="finC">${n}</b>`:''}${btn?`<button type="button" class="btn" data-go="${data}">${btn}</button>`:''}</li>`;
 const none=t=>`<div class="finOk">✔ ${esc(t)}</div>`;
 async function open(){if(!project)return uiAlert('Open a project first.');if(walk)return uiAlert('Leave the walk test first, then finish the inspection.');
  busy(1,'Checking what is left');let G;try{G=await gather()}finally{busy(0)}
  if(!G.total)return uiAlert('This project has no devices yet.');
  if(!d){d=ce('dialog','');d.id='finDlg';document.body.append(d)}
  const GO=[],go=(x)=>(GO.push(x),GO.length-1),pgs=[...G.pg.values()],tys=[...G.ty.entries()].sort((a,b)=>b[1]-a[1]),na=[...G.noAddr.values()];
  const failRows=L=>L.slice(0,50).map(x=>row(x.t,null,'Go to device',go({pl:x.pl,p:x.p,card:1}))).join('')+(L.length>50?`<li><span class="finR">and ${L.length-50} more</span></li>`:'');
  d.innerHTML=`<div class="finTop"><h3>Finish inspection</h3><span class="sp"></span><button type="button" class="btn" id="finX">Close</button></div>
   <div class="finBody"><p class="finSum"><b>${G.tested} of ${G.total}</b> devices tested · ${G.failed} failed · ${G.left} not tested</p>
   <section id="finLeft"><h4>Not tested yet (${G.left})</h4>${G.left?`<div class="finSub">By page</div><ul class="finL">${pgs.map(g=>row(g.t,g.n,'Go to page',go({pl:g.pl,page:g.page,p:g.p}))).join('')}</ul><div class="finSub">By type</div><ul class="finL">${tys.map(([t,n])=>row(TYPES[t]?.n||t,n)).join('')}</ul>`:none('Every device is tested')}</section>
   <section id="finPhoto"><h4>Failed without a photo (${G.noPhoto.length})</h4>${G.noPhoto.length?`<ul class="finL">${failRows(G.noPhoto)}</ul>`:none('Every failed device has a photo')}</section>
   <section id="finReason"><h4>Failed without a reason (${G.noReason.length})</h4>${G.noReason.length?`<ul class="finL">${failRows(G.noReason)}</ul>`:none('Every failed device has a reason')}</section>
   <section id="finAddr"><h4>No address (${G.noAddrN})</h4>${G.noAddrN?`<ul class="finL">${na.map(g=>row(g.t,g.n,'Go to page',go({pl:g.pl,page:g.page,p:g.p}))).join('')}</ul><button type="button" class="btn" id="finSweep">Start address sweep</button>`:none('Every device has an address')}</section>
   <section id="finTester"><h4>Tester</h4>${G.tester&&G.lic?none(`${G.tester}, license ${G.lic}`):`<div class="finWarn">${!G.tester?'Tester name is missing. ':''}${!G.lic?'Tester license number is missing.':''}</div><button type="button" class="btn" id="finJob">Open job info</button>`}</section></div>
   <div class="finFoot"><label><input type="checkbox" id="finRep" checked> Make the report PDF</label><label><input type="checkbox" id="finBpm" checked> Save the project file (your backup)</label>
    <div class="row"><span class="sp"></span><button type="button" class="btn pri" id="finGo">Finish and save</button></div></div>`;
  d.querySelector('#finX').onclick=()=>d.close();
  d.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const x=GO[+b.dataset.go];goTo(x.pl,x.p?.page??x.page,x.p,x.card)});
  const sw=d.querySelector('#finSweep');if(sw)sw.onclick=async()=>{const g=na[0];await goTo(g.pl,g.page,null);window.sweepStart&&sweepStart()};
  const jb=d.querySelector('#finJob');if(jb)jb.onclick=()=>{d.close();by('jobBtn')&&by('jobBtn').click()};
  d.querySelector('#finGo').onclick=()=>finish(d.querySelector('#finRep').checked,d.querySelector('#finBpm').checked);
  d.showModal();d.querySelector('.finBody').scrollTop=0;return true}
 async function saveFile(){const pr=project;busy(1,'Saving project file');prog(0);
  try{let wl=false;try{wl=(await learnedRules()).length>0}catch{}const r=await deliver(fsafe(pr.name)+'.bpm','application/octet-stream','.bpm',async()=>{const b=await buildBpm(pr.id,wl,prog);window.__lastBpm=b;return b});
   if(r){window.bkSaved&&await bkSaved(pr.id);return 'saved'}return 'cancelled'}catch(e){showErr('Saving the project file failed: '+e.message);return 'failed'}finally{busy(0)}}
 async function makeReport(){const b=by('reportPdf');if(!b||!b.onclick)return 'failed';let got=false;const _dl=window.dl;window.dl=function(blob,name,...r){if(/inspection-report\.pdf$/.test(name))got=true;return _dl.call(this,blob,name,...r)};
  FIN.skipPre=true;try{await b.onclick(new Event('click'))}catch(e){showErr('Report failed: '+e.message)}finally{FIN.skipPre=false;window.dl=_dl}return got?'saved':'failed'}
 async function finish(rep,bpm){if(!rep&&!bpm)return uiAlert('Tick the report, the project file, or both.');const R=[];
  d.querySelector('#finGo').disabled=true;
  try{if(rep)R.push(['Report PDF',await makeReport()]);if(bpm)R.push(['Project file (backup)',await saveFile()])}finally{const g=d.querySelector('#finGo');if(g)g.disabled=false}
  const W={saved:'saved',cancelled:'not saved (cancelled)',failed:'not saved (failed)'};window.__finLast=R;
  d.querySelector('.finBody').innerHTML=`<p class="finSum">${R.every(r=>r[1]==='saved')?'All done.':'Finished with a problem.'}</p><ul class="finL">${R.map(([t,s])=>`<li><span class="finR">${t}</span><b class="finC ${s==='saved'?'finY':'finN'}">${W[s]}</b></li>`).join('')}</ul>`;
  d.querySelector('.finFoot').innerHTML=`<div class="row"><span class="sp"></span><button type="button" class="btn pri" id="finClose">Close</button></div>`;d.querySelector('#finClose').onclick=()=>d.close();
  if(!d.open)d.showModal();toast(R.map(([t,s])=>t+' '+W[s]).join(' · '),true)}
 window.finishOpen=open;
 if(MX)MX.push(()=>[{i:'🏁',l:'Finish inspection…',run:open}]);
})();
}catch(e){console.error('43-finish-inspection.js',e);setTimeout(()=>{throw e})}
// ===== src/ui/99-ui-ready.js =====
try{
// bpm-v141: last file of ui.js. Marks that the screen code started, for the update self-heal in src/app/09-update-heal.js.
window.__bpmUI=1;
}catch(e){console.error('99-ui-ready.js',e);setTimeout(()=>{throw e})}
