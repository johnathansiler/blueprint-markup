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
 document.addEventListener('pointerup',e=>{if(SW.on&&typeof cv!=='undefined'&&e.target===cv)SW.tapT=Date.now()},true);
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
