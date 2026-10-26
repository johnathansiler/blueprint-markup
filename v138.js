// bpm-v138: flow improvements (fewer taps, fewer surprises). Loaded last; shares the app's globals (classic scripts).
// 1 one-tap Detect · 2 walk test starts with testable devices · 3 quick fail reasons on the walk bar · 6 Menu as a grouped list ·
// 7 tester name asked at project creation (app.js) · 8 Open card on each Pins list row · 9 no Delete on the pin card during a walk ·
// 10 legend banner folds into More; Pages strip hidden during a walk · 11 Accept all with Undo (app.js) · 12 Save backup and start (v135.js) ·
// 13 walk order choice · 14 Open plan / New project buttons on the empty screen
(()=>{const by=id=>document.getElementById(id);const ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const MO=window.V135&&V135.MO;

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
 const nat=(a,b)=>String(a||'\uffff').localeCompare(String(b||'\uffff'),undefined,{numeric:true});
 const addrCmp=(a,b)=>a.page-b.page||nat(a.address,b.address)||a.y-b.y||a.x-b.x;
 const _nf=nearestFrom;nearestFrom=function(L,from){if(!walk||WALK_ORDER!=='addr'||!L.length)return _nf.call(this,L,from);const S=L.slice().sort(addrCmp);
  if(!from)return S[0];if(from.id==null){const same=S.filter(p=>p.page===from.page);return same[0]||S[0]}
  return S.find(p=>addrCmp(p,from)>0)||S[0]};

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

 // ---------- 8) Pins list: each row has Open card ----------
 const _rl=renderList;renderList=function(...a){const r=_rl.apply(this,a);const L=by('pinList');if(L)L.querySelectorAll('li[data-id]').forEach(li=>{if(li.querySelector('.pOpen'))return;
  const b=ce('button','btn pOpen','Open card');b.type='button';b.title='Open this pin’s card';b.onclick=async e=>{e.stopPropagation();const id=li.dataset.id;await jumpTo(plan.id,id);const p=pins.find(x=>x.id===id);if(p)openPin(p)};li.append(b)});return r};

 // ---------- 6) Menu: a plain grouped list (Job, Plan, Files, Settings), one tap per row ----------
 // The Menu button's items (and its Export / Share / Switch lists) show as a list instead of the wheel. Every item and handler is the same as before.
 const GR=[['Job',/^(New project|Open project file|Switch project|Rename project|Delete project|Start next inspection)/],['Plan',/^(Open plan|Switch plan|Rename page|Delete plan)/],
  ['Files',/^(Save project file|Export|Share|Backup reminder|Save this job|Make saved photos)/],['Settings',/^(Reset screen zoom|Customize)/]];
 const SUBS=new Set(['Export','Share','Switch plan','Switch project']);
 let lastA=null,menuT=0;const _wa=window.wheelAnchor;window.wheelAnchor=a=>{lastA=a;return _wa&&_wa(a)};
 const SH=ce('div','mnuOv');SH.id='mnuSheet';SH.hidden=true;SH.setAttribute('role','dialog');SH.setAttribute('aria-modal','true');document.body.append(SH);
 const close=()=>{SH.hidden=true;SH.innerHTML=''};window.menuListClose=close;
 SH.addEventListener('pointerdown',e=>{if(e.target===SH)close()});addEventListener('keydown',e=>{if(e.key==='Escape'&&!SH.hidden){e.preventDefault();close()}},true);
 function menuList(title,items,cb){const top=title==='Menu';let groups;
  if(top){const used=new Set();groups=GR.map(([g,rx])=>[g,items.filter(x=>{const ok=!used.has(x)&&rx.test(x.l||'');if(ok)used.add(x);return ok})]);const rest=items.filter(x=>!used.has(x));if(rest.length)groups[2][1].push(...rest)}
  else groups=[[null,items]];
  SH.innerHTML=`<div class="mnuP" role="menu" aria-label="${esc(title)}"><div class="mnuH">${top?'':'<button type="button" class="btn" id="mnuBack">◀ Back</button>'}<b class="mnuT">${esc(title)}</b><span class="sp"></span><button type="button" class="btn" id="mnuX">✕ Close</button></div><div class="mnuB">${
   groups.filter(g=>g[1].length).map(([g,L])=>`<section class="mnuG">${g?`<h4>${g}</h4>`:''}<div class="mnuL">${L.map(x=>`<button type="button" role="menuitem" class="btn mnuI" data-i="${items.indexOf(x)}"><span class="mnuIc" aria-hidden="true">${x.i||''}</span><span class="tl">${esc(x.l)}</span></button>`).join('')}</div></section>`).join('')}</div></div>`;
  SH.hidden=false;SH.querySelector('#mnuX').onclick=close;const bk=SH.querySelector('#mnuBack');if(bk)bk.onclick=()=>{close();by('navMenu')&&by('navMenu').click()};
  SH.querySelectorAll('.mnuI').forEach(b=>b.onclick=()=>{const x=items[+b.dataset.i];close();menuT=SUBS.has((x.l||'').replace(/…$/,''))?Date.now():0;cb(x)});
  const f=SH.querySelector('.mnuI');f&&f.focus({preventScroll:true})}
 const _wo=window.wheelOpen;window.wheelOpen=function(title,items,cur,cb){const m=by('navMenu');
  if(m&&lastA===m&&(title==='Menu'||(SUBS.has(title)&&Date.now()-menuT<2000))){lastA=null;return menuList(title,items,cb)}return _wo.apply(this,arguments)};

 // ---------- 14) empty first screen: real Open plan and New project buttons ----------
 const eo=by('emOpen'),en=by('emNew');if(eo)eo.onclick=()=>by('file').click();if(en)en.onclick=()=>by('projNew').click();
})();
