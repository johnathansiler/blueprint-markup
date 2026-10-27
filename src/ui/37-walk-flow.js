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
