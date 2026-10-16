// bpm-v86: field UX (compact walk, quick-place, bulk pass, pre-send check, export menu, detect ordering) + two-tech split/merge.
// Loaded after app.js; shares its globals (classic scripts).
(()=>{const ce=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e};
const relayout=()=>{requestAnimationFrame(()=>{dispatchEvent(new Event('resize'))})};

// ---------- 1) compact walk mode ----------
const _start=startWalk,_exit=exitWalk;
startWalk=function(...a){if(plan&&!pins.length)return walkHint();const r=_start.apply(this,a);if(walk){document.body.classList.add('walking');relayout()}return r};
exitWalk=function(...a){document.body.classList.remove('walking');const r=_exit.apply(this,a);relayout();return r};
const _pick=walkPick;walkPick=async function(...a){if(plan&&!pins.length)return walkHint();return _pick.apply(this,a)};
function walkHint(){const w=$('#walk');w.hidden=false;w.innerHTML=`<div class="wh"><b>🚶 Walk</b><span class="sp"></span><button type="button" class="btn" id="wHx">✕</button></div><div class="wtx">This plan has no pins yet. Place pins with 📍, or let Detect find the devices on the plan.</div><div class="row"><button type="button" class="btn pri" id="wHdet">🔍 Detect devices</button></div>`;
 w.querySelector('#wHx').onclick=()=>{w.hidden=true};w.querySelector('#wHdet').onclick=()=>{w.hidden=true;$('#detBtn').click()}}
renderWalk=function(){const w=$('#walk');if(!walk){w.hidden=true;return}const S=walkSet(),N=S.length,done=S.filter(p=>!untested(p)).length,p=walk.p&&pins.find(x=>x.id===walk.p.id)||walk.p;
 const types=[...new Set(pins.map(x=>x.type))],nm=p?`${esc(TYPES[p.type]?.n||p.type)} ${p.address?esc(p.address):'<small>(no address)</small>'}`:'';
 const more=`<details class="wMore"><summary title="More">⋯</summary><div class="row"><select id="wType" title="Only this type"><option value="">All types</option>${types.map(t=>`<option value="${t}"${walk.type===t?' selected':''}>${esc(TYPES[t]?.n||t)}</option>`).join('')}</select>${SR?'<button type="button" class="btn" id="wMic">🎤</button>':''}<button type="button" class="btn" id="wGoto">📍 Go to…</button>${p?'<button type="button" class="btn" id="wOpen">📋 Checklist</button>':''}</div></details>`;
 const head=`<div class="wh"><span class="wDot" style="background:${p?(TYPES[p.type]||TYPES.other).c:'#64748b'}"></span><span class="wName">${p?nm:`${done} of ${N} tested`}</span><small class="wCnt">${p?`${Math.min(done+1,N)}/${N}${p.loop?' · L'+esc(p.loop):''}${p.location?' · '+esc(p.location):''}`:''}</small>${more}<button type="button" class="btn" id="wExit" title="Exit walk">✕ Exit</button></div>`;
 if(!p)w.innerHTML=head+`<div class="wtx">${walk.skip.size?`No untested devices left (${walk.skip.size} skipped).`:'All devices in this set are tested. 🎉'}</div><div class="row">${walk.hist?.length?'<button type="button" class="btn" id="wPrev">⏮ Back</button>':''}${walk.skip.size?'<button type="button" class="btn" id="wRe">Revisit skipped</button>':''}</div>`;
 else if(walk.fail)w.innerHTML=head+`<div class="row"><b>Fail reason</b><label class="wCrit"><input type="checkbox" id="wCrit"> Critical</label><span class="sp"></span><button type="button" class="btn" id="wFailX">Cancel</button></div><div class="reasons">${REASONS.map(r=>`<button type="button" class="btn danger" data-r="${r}">${r}</button>`).join('')}</div>`;
 else w.innerHTML=head+`<div id="wHeard" class="wHeard"${walk.heard?'':' hidden'}>🎤 “${esc(walk.heard||'')}”</div><div class="wb4"><button type="button" class="btn" id="wPrev"${walk.hist?.length?'':' disabled'}>⏮ Back</button><button type="button" class="btn ok" id="wPass" title="Pass = every checklist item passes">✔ Pass</button><button type="button" class="btn danger" id="wFail">✖ Fail</button><button type="button" class="btn" id="wSkip">⏭ Skip</button></div><div class="wNote">✔ Pass marks every checklist item as passed</div>`;
 w.hidden=false;const q=x=>w.querySelector(x);
 q('#wExit').onclick=()=>exitWalk();if(q('#wGoto'))q('#wGoto').onclick=walkGoto;if(q('#wType'))q('#wType').onchange=e=>{walk.type=e.target.value;walk.skip.clear();walkGo(nearestFrom(walkLeft(),walk.p))};if(q('#wMic'))q('#wMic').onclick=startVoice;
 if(q('#wRe'))q('#wRe').onclick=()=>{walk.skip.clear();walkGo(nearestFrom(walkLeft(),null))};
 if(q('#wPass'))q('#wPass').onclick=()=>testPin(p,'pass');if(q('#wFail'))q('#wFail').onclick=()=>{walk.fail=true;renderWalk()};if(q('#wSkip'))q('#wSkip').onclick=()=>{walk.skip.add(p.id);walkNext()};
 if(q('#wOpen'))q('#wOpen').onclick=()=>openPin(pins.find(x=>x.id===p.id)||p);if(q('#wPrev'))q('#wPrev').onclick=walkPrev;if(q('#wFailX'))q('#wFailX').onclick=()=>{walk.fail=false;renderWalk()};
 w.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>testPin(p,'fail',b.dataset.r,q('#wCrit').checked))};

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
 for(const d of D)for(const p of d.pins){const nm=`${TYPES[p.type]?.n||p.type} ${p.address||'(no address)'}`+(D.length>1?` · ${d.pl.name||''} pg ${p.page}`:` · pg ${p.page}`);
  if(untested(p))out.push({k:'untested',t:`Untested: ${nm}`,pl:d.pl.id,p});
  else if(String(p.status).includes('fail')){if(!p.reason)out.push({k:'reason',t:`Fail without reason: ${nm}`,pl:d.pl.id,p});const md=await byIdx('media','pinId',p.id);if(!md.some(m=>(m.kind||'photo')!=='audio'))out.push({k:'photo',t:`Fail without photo: ${nm}`,pl:d.pl.id,p})}}
 const tn=tester===null?await get('meta','tester'):tester,j=project?await getJob():{};if(!(tn||j.techName))out.push({k:'tester',t:'Tester name is missing'});if(!(j.techLic||j.license))out.push({k:'lic',t:'Tester license # is missing'});return out}
window.preSend=async function(scope,label){const iss=await preIssues(scope);if(!iss.length)return true;let d=$('#preDlg');if(!d){d=ce('dialog',{id:'preDlg'});document.body.append(d)}
 const grp=k=>iss.filter(i=>i.k===k);const n=k=>grp(k).length;
 d.innerHTML=`<h3 style="margin:4px 0">Before you send: ${esc(label)}</h3><small style="color:#cbd5e1">${n('untested')} untested · ${n('reason')+n('photo')} fail issue(s) · ${n('tester')+n('lic')} tester issue(s)</small><ul id="preL">${iss.slice(0,200).map((i,x)=>`<li><span>${esc(i.t)}</span><button type="button" class="btn" data-go="${x}">Go to</button></li>`).join('')}</ul><div class="row"><button type="button" class="btn" id="preX">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="preGo">Export anyway</button></div>`;
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
(()=>{const MAP={'✋':'Pan','➤':'Select','▢':'Box','◯':'Circle','✔':'Check','☁':'Cloud','↗':'Arrow','╱':'Line','⟋':'Line','🧲':'Magnet','📐':'Snap','T':'Text','📏':'Measure','📍':'Pin','🗑':'Delete','↶':'Undo','↷':'Redo','⤢':'Fit','📷':'QR','📄':'Sheet','🔍':'Detect','👁':'Layers','▤':'Pages','⟳':'Rotate','🎤':'Voice','✕':'Close','＋':'New','+':'New','✎':'Rename','💾':'Save','📥':'Import','🗂':'Project','📤':'Share','📂':'Open','◀':'Prev','▶':'Next','⋯':'More','⏮':'Back','⏭':'Skip','−':'Out','-':'Out'};
 const icon=s=>!/[A-Za-z]{2,}/.test(s);
 const lab=b=>{if(b.querySelector('.tl')||b.closest('#ptx'))return;const t=(b.innerText||b.textContent).trim();if(t&&!icon(t))return;const k=[...t][0],tt=(b.title||b.getAttribute('aria-label')||'').replace(/\(.*?\)/g,'').trim();
  let l=MAP[t]||MAP[k]||'';if(b.id==='cSnap')l='Snap';if(!l&&tt)l=tt.split(/[:,.;–—/]/)[0].split(/\s+/).slice(0,2).join(' ');if(!l)return;if(l.length>8)l=l.split(' ')[0].slice(0,9);b.append(Object.assign(document.createElement('span'),{className:'tl',textContent:l}))};
 const run=r=>(r.querySelectorAll?r:document).querySelectorAll('button,label.btn').forEach(lab);
 run(document);new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1){if(n.tagName==="BUTTON")lab(n);else run(n)}else{const b=m.target.closest&&m.target.closest("button");if(b)lab(b)}}).observe(document.body,{childList:true,subtree:true});window.labelButtons=()=>run(document)})();
