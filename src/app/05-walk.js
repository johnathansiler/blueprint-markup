// ---------- v9: walk mode ----------
const REASONS=['No alarm','Trouble','Damaged','Missing','Obstructed','Dirty/needs cleaning','Other'];
function walkSet(){return pins.filter(p=>tVis(p)&&(!walk.type||p.type===walk.type)&&(!walk.types||walk.types.includes(p.type)))}
function walkLeft(){return walkSet().filter(p=>untested(p)&&!walk.skip.has(p.id))}
// bpm-v138 (folded in bpm-v139): walk order "page by page in address order" (Walk dialog choice, window.WALK_ORDER); otherwise nearest first.
const walkNat=(a,b)=>String(a||'\uffff').localeCompare(String(b||'\uffff'),undefined,{numeric:true});
const walkAddrCmp=(a,b)=>a.page-b.page||walkNat(a.address,b.address)||a.y-b.y||a.x-b.x;
function nearestFrom(L,from){if(!walk||window.WALK_ORDER!=='addr'||!L.length)return nearestFromBase(L,from);const S=L.slice().sort(walkAddrCmp);
 if(!from)return S[0];if(from.id==null){const same=S.filter(p=>p.page===from.page);return same[0]||S[0]}
 return S.find(p=>walkAddrCmp(p,from)>0)||S[0]}
function nearestFromBase(L,from){if(!L.length)return null;if(!from)return L.slice().sort((a,b)=>a.page-b.page)[0];return L.slice().sort((a,b)=>(a.page===from.page?0:1)-(b.page===from.page?0:1)||Math.abs(a.page-from.page)-Math.abs(b.page-from.page)||Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0]}
$('#walkBtn').onclick=()=>walk?exitWalk():walkPick();
function startWalk(type=''){if(!plan)return uiAlert('Open a plan first.');if(!pins.length)return uiAlert('This plan has no pins yet. Add markers with 📍 or use 🔍 Detect devices first.');
 walk={type,types:arguments[1]||null,skip:new Set(),p:null,fail:false};msel=[];sel=null;renderSelBar();renderGhostBar();$('#walkBtn').classList.add('pri');
 const c=toW(stage.clientWidth/2,stage.clientHeight/2),L=walkLeft(),here=L.filter(p=>p.page===page);
 const first=sel?.kind==='p'&&untested(sel.o)?sel.o:nearestFrom(here.length?here:L,here.length?{page,...c}:null);walkGo(first)}
function exitWalk(){if(vPend)vResolve(false,'stop');if(vKeep)voiceStop();{/* bpm-v140: the voice guide closes with the walk (it stayed over the plan) */const g=$('#vGuide');if(g){clearTimeout(g._t);g.hidden=true}}walk=null;$('#walk').hidden=true;$('#walkBtn').classList.remove('pri');renderGhostBar();renderSelBar();draw()}
async function walkGo(p,back){if(!walk)return;walk.hist??=[];if(!back&&walk.p&&p&&walk.p.id!==p.id){walk.hist.push(walk.p.id);if(walk.hist.length>200)walk.hist.shift()}walk.p=p;walk.fail=false;walk.fr=[];walk.fnote='';walk.fcrit=false;renderWalk();if(!p){draw();return}const sKeep=view.s,pgChg=p.page!==page;if(pgChg)await gotoPage(p.page); // bpm-v100: keep the zoom across pages (gotoPage re-fits the view)
 const W=stage.clientWidth,Hh=stage.clientHeight-$('#walk').offsetHeight,s=walk.zoomed?sKeep:Math.max(view.s,Math.min(W,stage.clientHeight)/320),v0={...view};walk.zoomed=true;centerOn(p.x,p.y,s,W/2,Math.max(60,Hh/2));const v1={...view};sel={kind:'p',o:p};if(pgChg){draw();scheduleRender();return} // new page: land directly at the kept zoom (no zoom-out-then-in)
 view=v0;await prefetchPath(v0,v1);if(walk?.p!==p)return;await slideTo(v1)}
function walkNext(){if(!walk)return;const cur=walk.p;walkGo(nearestFrom(walkLeft().filter(p=>p!==cur),cur))}
function walkAfterDialog(){if(!walk||!walk.p)return;const p=pins.find(x=>x.id===walk.p.id);if(!p){walkNext();return}walk.p=p;if(!untested(p))walkNext();else renderWalk()}
function renderWalk(){const w=$('#walk');if(!walk){w.hidden=true;return}const S=walkSet(),N=S.length,done=S.filter(p=>!untested(p)).length,p=walk.p&&pins.find(x=>x.id===walk.p.id)||walk.p;
 const types=[...new Set(pins.map(x=>x.type))];const head=`<div class="wh"><b>🚶 ${p?`${Math.min(done+1,N)} of ${N}`:`${done} of ${N} tested`}</b><select id="wType" title="Only this type"><option value="">All types</option>${types.map(t=>`<option value="${t}"${walk.type===t?' selected':''}>${esc(TYPES[t]?.n||t)}</option>`).join('')}</select><span class="sp"></span>${SR?`<button type="button" class="btn" id="wMic" aria-pressed="${srec?'true':'false'}">${srec?'🎤 Voice on: tap to stop':'🎤 Voice off: tap to start'}</button>`:''}<button type="button" class="btn" id="wGoto" title="Pick any device to test next">📍 Go to…</button><button type="button" class="btn" id="wExit">✕ Exit</button></div>`;
 if(!p){w.innerHTML=head+`<div class="wt">${walk.skip.size?`No untested devices left (${walk.skip.size} skipped).`:'All devices in this set are tested. 🎉'}</div>${walk.hist?.length?'<div class="row"><button type="button" class="btn" id="wPrev">⏮ Previous device</button></div>':''}${walk.skip.size?'<div class="row"><button type="button" class="btn" id="wRe">Revisit skipped</button></div>':''}`}
 else w.innerHTML=head+`<div class="wt"><span class="dot" style="display:inline-block;background:${(TYPES[p.type]||TYPES.other).c}"></span> ${esc(TYPES[p.type]?.n||p.type)} ${p.address?esc(p.address):'<small style="color:#a2a2a2">(no address)</small>'}${p.location?' · '+esc(p.location):''} <small style="color:#a2a2a2">${esc(pgT(plan.id,p.page))}${p.status==='in progress'?' · in progress':''}</small></div>
 <div id="wHeard" style="color:#c0c0c0;font-size:13px"${walk.heard?'':' hidden'}>🎤 “${esc(walk.heard||'')}”</div>
 ${walk.fail?`<div><b>Fail reason</b> <label style="display:inline-flex;gap:4px;align-items:center;margin-left:8px"><input type="checkbox" id="wCrit" style="width:20px;height:20px;min-height:20px"> Critical</label></div><div class="reasons">${REASONS.map(r=>`<button type="button" class="btn danger" data-r="${r}">${r}</button>`).join('')}<button type="button" class="btn" id="wFailX">Cancel</button></div>`
  :`<div class="wb"><button type="button" class="btn" id="wPrev" title="Back to the previous device"${walk.hist?.length?'':' disabled'}>⏮</button><button type="button" class="btn ok" id="wPass">✔ Pass</button><button type="button" class="btn danger" id="wFail">✖ Fail</button><button type="button" class="btn" id="wSkip">⏭ Skip</button></div><div class="row"><button type="button" class="btn" id="wOpen">📋 Open checklist</button><span class="sp"></span><small style="color:#a2a2a2">Pass = all checklist items pass</small></div>`}`;
 w.hidden=false;const q=x=>w.querySelector(x);
 q('#wExit').onclick=exitWalk;q('#wGoto').onclick=walkGoto;q('#wType').onchange=e=>{walk.type=e.target.value;walk.skip.clear();const L=walkLeft();walkGo(nearestFrom(L,walk.p))};if(q('#wMic'))q('#wMic').onclick=startVoice;
 if(q('#wRe'))q('#wRe').onclick=()=>{walk.skip.clear();walkGo(nearestFrom(walkLeft(),null))};
 if(q('#wPass'))q('#wPass').onclick=()=>testPin(p,'pass');if(q('#wFail'))q('#wFail').onclick=()=>{walk.fail=true;renderWalk()};if(q('#wSkip'))q('#wSkip').onclick=()=>{walk.skip.add(p.id);walkNext()};
 if(q('#wOpen'))q('#wOpen').onclick=()=>openPin(pins.find(x=>x.id===p.id)||p);if(q('#wPrev'))q('#wPrev').onclick=walkPrev;if(q('#wFailX'))q('#wFailX').onclick=()=>{walk.fail=false;renderWalk()};
 w.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>testPin(p,'fail',b.dataset.r,q('#wCrit').checked))}
async function testPin(p,res,reason,crit,more,note){p=pins.find(x=>x.id===p.id);if(!p)return;const b=structuredClone(p),a={...b,testedAt:Date.now(),tester:await getTester()};
 if(res==='pass'){a.checks=(b.checks||checkItems(b.type)).map(c=>({...c,v:'pass'}));a.status='passed';a.reason=a.reasonText=a.severity=''}
 else{const ck=b.checks||checkItems(b.type);a.checks=ck.some(c=>c.v==='fail')?ck.map(c=>({...c})):ck.map(c=>({...c,v:c.v==='pass'?'':c.v}));a.status='failed';a.reason=reason||'Other';for(const R of[a.reason,...(more||[]).filter(x=>x&&x!==a.reason)]){/* bpm-v67: walk fail reason → matching checklist item marked Fail; no match → add a 'Fail: reason' item (bpm-v103: once per chosen reason) */const RX={'No alarm':/alarm|activat|audible|signal|received|operat|flash|releas/i,Trouble:/trouble|supervis|wiring/i,Damaged:/condition|mount|damage/i,Obstructed:/obstruct|accessib/i,'Dirty/needs cleaning':/clean/i}[R];var fIt=R!=='Other'&&a.checks.find(c=>reasonFor(c.t)===R)||R!=='Other'&&(RX&&a.checks.find(c=>RX.test(c.t)));if(!fIt){const t='Fail: '+R;fIt=a.checks.find(c=>c.t===t);if(!fIt){fIt={t,v:''};a.checks.push(fIt)}}fIt.v='fail';if(R===a.reason)var fIt0=fIt}a.severity=crit?'Critical':'Non-critical';a.reasonText=b.reasonText?failReasonText(b.reasonText):failItemLabel(fIt0&&fIt0.t);{const xs=(more||[]).filter(x=>x&&x!==a.reason);if(xs.length)a.reasonText=[a.reasonText,'Also: '+xs.join(', ')].filter(Boolean).join(' · ');if(note&&note.trim()){a.reasonText=[a.reasonText,note.trim()].filter(Boolean).join(' · ');a.failNote=note.trim()}}}
 await change('pins',b,a);if(dlg.open&&cur?.id===a.id){const np=pins.find(x=>x.id===a.id)||a;cur=np;ckl=structuredClone(np.checks||checkItems(np.type));renderChecks();form.elements.status&&(form.elements.status.value=np.status||'');}toast(`${TYPES[a.type]?.n||a.type} ${a.address||''}: ${a.status}${res==='fail'?` (${a.reason}${crit?', critical':''})`:''}`,true);
 if(walk&&walk.p?.id===p.id)walkNext()}
// ---------- v9: voice commands (Web Speech API) ----------
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let srec=null;
if(SR)$('#micBtn').hidden=false;
$('#micBtn').onclick=startVoice;
// bpm-v135: hands-free voice during a walk. Started while walking, voice keeps listening between devices (the phone's recognizer stops after each
// phrase or a pause, so Marker starts it again). It stays on until Stop listening, the walk ends, or "stop listening" is said. The walk menu button says Voice on / Voice off.
let vKeep=false;
function voiceOn(b){for(const x of[$('#micBtn'),$('#wMic')])if(x)x.classList.toggle('danger',b);const w=$('#wMic');if(w){w.textContent=b?'🎤 Voice on: tap to stop':'🎤 Voice off: tap to start';w.setAttribute('aria-pressed',b?'true':'false')}
 let c=$('#vChip');if(!c){c=document.createElement('button');c.type='button';c.id='vChip';c.className='btn danger';c.hidden=true;c.onclick=voiceStop;document.body.append(c)}c.textContent='⏹ Voice on: tap to stop listening';const g=$('#vGuide');c.hidden=!(b&&vKeep)||!!(g&&!g.hidden)}
function voiceStop(){if(vPend)vResolve(false,'stop');vKeep=false;const r=srec;if(r){r._stop=true;try{r.stop()}catch{}}voiceOn(false)}
function startVoice(auto){if(!SR)return;if(srec&&auto!==true){voiceStop();return}if(srec)return;
 if(auto!==true)vKeep=!!walk;
 if(!navigator.onLine)toast('You are offline: on many phones voice recognition needs internet. If it fails, use the buttons.');
 let r;try{r=new SR()}catch(e){toast('Voice is not available: '+e.message);return}srec=r;r.lang=navigator.language||'en-US';r.interimResults=false;r.maxAlternatives=1;r.continuous=vKeep;
 const on=voiceOn;on(true);
 if(auto!==true)vGuide('listen');r.onresult=e=>{const R=e.results[e.resultIndex??e.results.length-1]||e.results[0];if(R&&R.isFinal===false)return;const t=R[0].transcript;if(/^\s*(stop listening|voice off|stop voice)\s*[.!]?\s*$/i.test(t)){vGuide('heard',t);voiceStop();toast('Voice off');return}vGuide('heard',t);voiceHeard(t)};
 r.onerror=e=>{const m={network:'Voice recognition needs an internet connection on this device. Use the buttons while offline.','not-allowed':'Microphone access is blocked. Allow the microphone for this site in Chrome settings.','service-not-allowed':'Voice recognition is turned off or unavailable on this device.','no-speech':'Didn\u2019t hear anything. Tap 🎤 and speak again.','audio-capture':'No microphone was found.','language-not-supported':'Voice recognition does not support this language here.'}[e.error]||('Voice error: '+e.error);if(vKeep&&(e.error==='no-speech'||e.error==='aborted'))return;/* hands-free: silence is normal, keep going */if(['not-allowed','service-not-allowed','audio-capture','network','language-not-supported'].includes(e.error))vKeep=false;if(e.error!=='aborted'){toast(m);vGuide('error',m)}};
 r.onend=()=>{if(srec===r)srec=null;if(vKeep&&walk&&!r._stop){setTimeout(()=>{if(vKeep&&walk&&!srec)startVoice(true)},250);return}vKeep=false;on(false);vGuide('end')};try{r.start()}catch(e){srec=null;on(false);toast('Could not start voice: '+e.message);vGuide('error','Could not start voice: '+e.message)}}
// bpm-v130: Voice guide. While Voice listens, a panel shows what to say (the real commands, with examples), what it heard, and that it needs internet.
// It does not change what the commands do. Stop listening / Listen again / Close are labelled buttons. It hides itself 4 s after a command that was understood.
function vGuide(st,txt){let g=$('#vGuide');if(!g){g=document.createElement('div');g.id='vGuide';g.setAttribute('role','dialog');g.setAttribute('aria-label','Voice commands');document.body.append(g);
  g.innerHTML=`<div class="vgH"><span class="vgMic" aria-hidden="true">🎤</span><b class="vgS"></b></div>
  <div class="vgT">Say one of these:</div>
  <ul class="vgL">
   <li><q>pass</q> or <q>good</q>, then <q>yes</q><small>passes this device once you confirm: Marker shows the device, then say <q>yes</q> or <q>confirm</q>, or tap Confirm, within 6 seconds. Anything else cancels.</small></li>
   <li><q>fail</q> + reason<small>during a walk this opens the fail card; otherwise confirm it the same way. E.g. <q>fail damaged</q>, <q>fail no alarm</q>. Add <q>critical</q> for a critical deficiency: <q>fail damaged critical</q>. Reasons: no alarm, trouble, damaged, missing, obstructed, dirty, wrong location</small></li>
   <li><q>skip</q> or <q>next</q><small>skips this device</small></li>
   <li><q>address L1D012</q><small>sets this device's address</small></li>
   <li><q>note</q> + your words<small>adds a note, e.g. <q>note cover cracked</q></small></li>
   <li><q>L1D012 pass</q><small>passes (or <q>L1D012 fail damaged</q> fails) the device with that address, after you confirm</small></li>
   <li><q>stop listening</q><small>turns voice off</small></li>
  </ul>
  <div class="vgKeep">Nothing is recorded until you confirm, and every result has Undo. During a walk, voice stays on between devices (hands-free) until you tap <b>Stop listening</b>, say <q>stop listening</q>, or end the walk.</div>
  <div class="vgHeard" aria-live="polite"></div>
  <div class="vgNet"></div>
  <div class="vgB"><button type="button" class="btn danger" id="vgStop">⏹ Stop listening</button><button type="button" class="btn pri" id="vgAgain">🎤 Listen again</button><button type="button" class="btn" id="vgX">✕ Close</button></div>`;
  g.querySelector('#vgStop').onclick=()=>{voiceStop()};g.querySelector('#vgAgain').onclick=()=>{if(!srec)startVoice()};g.querySelector('#vgX').onclick=()=>{clearTimeout(g._t);g.hidden=true;if(vKeep&&srec){voiceOn(true);return}/* hands-free: closing the guide keeps listening; the Voice on chip stops it */if(srec)try{srec._stop=true;srec.abort?srec.abort():srec.stop()}catch{}}}
 const S=g.querySelector('.vgS'),H=g.querySelector('.vgHeard'),N=g.querySelector('.vgNet'),lis=st==='listen';clearTimeout(g._t);
 N.textContent=navigator.onLine?'Needs an internet connection: the phone sends your voice to Google to turn it into text.':'You are offline. Voice needs an internet connection, so use the buttons until you are back online.';N.classList.toggle('off',!navigator.onLine);
 if(lis){g.hidden=false;g._ok=false;S.textContent=vKeep?'Voice on (hands-free): listening… speak now':'Listening… speak now';H.textContent='';H.className='vgHeard'}
 else if(st==='heard'){S.textContent=vKeep?'Got it. Still listening (voice on)':'Got it';let c={cmd:'?'};try{c=parseVoice(txt)}catch{}g._ok=c.cmd!=='?';H.textContent=`Heard: “${txt}”`+(g._ok?'':' (not a command: try one of the above)');H.className='vgHeard '+(g._ok?'ok':'bad')}
 else if(st==='error'){S.textContent='Voice stopped';H.textContent=txt||'';H.className='vgHeard bad';g._ok=false;g.hidden=false}
 else if(st==='end'){if(S.textContent.startsWith('Listening')){S.textContent='Didn’t hear a command';if(!H.textContent){H.textContent='Tap Listen again and speak after the beep.';H.className='vgHeard bad'}}if(g._ok)g._t=setTimeout(()=>{g.hidden=true},4000)}
 if(st==='heard'&&vKeep&&g._ok){g._t=setTimeout(()=>{g.hidden=true;voiceOn(!!srec)},4000)}g.classList.toggle('on',!!srec||lis);{const ch=$('#vChip');if(ch&&!g.hidden)ch.hidden=true}g.querySelector('#vgStop').hidden=!(srec||lis);g.querySelector('#vgAgain').hidden=!!(srec||lis);
 if(!g.hidden){/* free area between the top bars and the walk bar / Pages strip / tool bar */const vis=e=>e&&!e.hidden&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;let lo=8,hi=innerHeight-8;
  for(const id of['proj','top','tb2']){const e=document.getElementById(id);if(vis(e)){const r=e.getBoundingClientRect();if(r.bottom<innerHeight/2)lo=Math.max(lo,r.bottom+8)}}
  for(const id of['walk','tools','thumbs','ghBar']){const e=document.getElementById(id);if(vis(e)){const r=e.getBoundingClientRect();if(r.top>innerHeight/2&&r.width>innerWidth/2)hi=Math.min(hi,r.top-8)}}
  g.style.top='auto';g.style.bottom=Math.round(innerHeight-hi)+'px';g.style.maxHeight=Math.round(Math.max(160,hi-lo))+'px'}}
addEventListener('resize',()=>{const g=$('#vGuide');if(g&&!g.hidden)vGuide('place')});

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
 if((m=raw.match(/^notes? (.+)$/i)))return{cmd:'note',v:m[1].trim()};
 if((m=t.match(/^(.+?) (pass|passed|passes|fail|failed|fails)\b ?(.*)$/))){const addr=normA(numW(m[1].replace(TYPEW,' ')));if(addr){const f=/^fail/.test(m[2]);return{cmd:f?'fail':'pass',addr,reason:f?reasonOf(m[3]):'',crit:f&&/\bcritical\b/.test(m[3])&&!/non.?critical/.test(m[3])}}}
 return{cmd:'?'}}
// bpm-v136: a spoken pass or fail never records on its own. Marker shows the device and asks to confirm: say "yes" or "confirm",
// or tap Confirm, within V_CONF_MS. Anything else heard, Cancel, Stop listening, or the time running out cancels. The recorded result keeps Undo.
let vPend=null;const V_CONF_MS=6000,V_YES=/^(yes|yeah|yep|confirm|confirmed|yes confirm|confirm it|correct|yes correct)$/;
function vConfirmEl(){let e=$('#vConfirm');if(!e){e=document.createElement('div');e.id='vConfirm';e.setAttribute('role','alertdialog');e.setAttribute('aria-label','Confirm voice result');e.hidden=true;
  e.innerHTML=`<div class="vcQ"></div><div class="vcDev"></div><div class="vcHow">Say <q>yes</q> or <q>confirm</q>, or tap Confirm. Anything else cancels. <b class="vcT"></b></div><div class="vcB"><button type="button" class="btn pri" id="vcOk">✓ Confirm</button><button type="button" class="btn" id="vcNo">✕ Cancel: do not record</button></div>`;
  document.body.append(e);e.querySelector('#vcOk').onclick=()=>vResolve(true,'tap');e.querySelector('#vcNo').onclick=()=>vResolve(false,'tap')}return e}
function vPlace(e){const vis=x=>x&&!x.hidden&&getComputedStyle(x).display!=='none'&&x.getBoundingClientRect().height>0;let hi=innerHeight-8;
 for(const id of['walk','tools','thumbs','ghBar']){const x=document.getElementById(id);if(vis(x)){const r=x.getBoundingClientRect();if(r.top>innerHeight/2&&r.width>innerWidth/2)hi=Math.min(hi,r.top-8)}}e.style.bottom=Math.round(innerHeight-hi)+'px'}
function vAsk(p,c,text){if(vPend)vResolve(false,'new');const e=vConfirmEl(),R=c.cmd==='pass'?'PASS':'FAIL'+(c.reason?' ('+c.reason+(c.crit?', critical':'')+')':'');
 e.querySelector('.vcQ').textContent=`Heard “${text}”. Record ${R}?`;e.querySelector('.vcDev').textContent=`${TYPES[p.type]?.n||p.type}${p.address?' '+p.address:''}${p.model?' · '+p.model:''}`;
 e.querySelector('#vcOk').textContent=`✓ Confirm ${c.cmd==='pass'?'pass':'fail'}`;e.classList.toggle('fail',c.cmd==='fail');
 if(!(walk&&walk.p&&walk.p.id===p.id)){/* show the device */try{centerOn(p.x,p.y,Math.max(view.s,1),stage.clientWidth/2,stage.clientHeight/2);sel={kind:'p',o:p};draw();scheduleRender()}catch{}}
 const g=$('#vGuide');if(g){clearTimeout(g._t);g.hidden=true}const ch=$('#vChip');if(ch)ch.hidden=true;vPlace(e);e.hidden=false;
 const end=Date.now()+V_CONF_MS,tick=()=>{e.querySelector('.vcT').textContent=`Cancels in ${Math.max(0,Math.ceil((end-Date.now())/1000))} s.`};tick();
 vPend={p:p.id,c,text,iv:setInterval(tick,250),to:setTimeout(()=>vResolve(false,'timeout'),V_CONF_MS)};
 if(!vKeep&&SR)setTimeout(()=>{if(vPend&&!srec)startVoice(true)},350)/* one-shot voice: listen once more for the yes */}
async function vResolve(ok,how,heard){const P=vPend;if(!P)return;vPend=null;clearInterval(P.iv);clearTimeout(P.to);const e=$('#vConfirm');if(e)e.hidden=true;
 if(!vKeep&&srec&&how!=='voice'&&how!=='stop'){try{srec._stop=true;srec.abort?srec.abort():srec.stop()}catch{}}if(how!=='stop')voiceOn(!!srec&&vKeep);
 window.__lastConfirm={ok,how};
 if(!ok){if(how!=='new')toast(how==='timeout'?`Not recorded: no confirmation for “${P.text}”`:how==='voice'?`Not recorded: heard “${heard}”, not yes`:'Not recorded: cancelled');return}
 const p=pins.find(x=>x.id===P.p);if(!p){toast('Not recorded: that device is not on this plan page any more');return}await testPin(p,P.c.cmd,P.c.reason,P.c.crit)}
async function runVoice(text){if(vPend){const t=String(text||'').toLowerCase().replace(/[,.!?]/g,'').replace(/\s+/g,' ').trim();window.__lastVoice={text,c:{cmd:V_YES.test(t)?'confirm':'cancel'}};if(V_YES.test(t))await vResolve(true,'voice');else await vResolve(false,'voice',text);return window.__lastVoice.c}
 const c=parseVoice(text);window.__lastVoice={text,c};if(c.cmd==='?'){toast(`Heard “${text}” but didn't understand. Try “pass”, “fail damaged”, “skip”, “address L1D012”.`);return c}
 if(c.cmd==='skip'){if(walk&&walk.p){walk.skip.add(walk.p.id);walkNext();toast(`Heard “${text}”: skipped`)}else toast('“Skip” works in walk mode (🚶).');return c}
 let p=null;if(c.addr){p=pins.find(x=>normA(x.address)===c.addr);if(!p){toast(`Heard “${text}”: no pin with address ${c.addr} in this plan`);return c}}else p=walk?.p?pins.find(x=>x.id===walk.p.id):sel?.kind==='p'?sel.o:null;
 if(!p){toast(`Heard “${text}”: select a pin or start walk mode (🚶) first`);return c}
 /* v131: in a walk test, saying “fail” opens the full checklist card exactly like tapping Fail (v129) instead of recording the fail at once */
 if(c.cmd==='fail'&&walk&&walk.p&&typeof window.walkFailCard==='function'){const g=$('#vGuide');if(g){clearTimeout(g._t);g.hidden=true}await window.walkFailCard(p);return c}
 if(c.cmd==='pass'||c.cmd==='fail'){vAsk(p,c,text);return c}
 const b=structuredClone(p),a={...b};if(c.cmd==='address')a.address=c.v;else if(c.cmd==='note')a.notes=(b.notes?b.notes+'\n':'')+c.v;
 await change('pins',b,a);if(dlg.open&&cur?.id===a.id){const np=pins.find(x=>x.id===a.id)||a;cur=np;ckl=structuredClone(np.checks||checkItems(np.type));renderChecks();form.elements.status&&(form.elements.status.value=np.status||'');}toast(`${TYPES[a.type]?.n||a.type}: ${c.cmd} → ${c.v}`,true);if(walk)renderWalk();return c}
// ---------- v9: learned detection rules (global, IndexedDB 'learned') ----------
let lrCache=null;async function learnedRules(){return lrCache||(lrCache=await all('learned'))}
function fpDist(a,b){if(!a||!b||a.s!==b.s||a.gl!==b.gl)return 1e9;let d=0;for(let i=0;i<Math.max(a.v.length,b.v.length);i++){const x=(a.v[i]||0)-(b.v[i]||0);d+=x*x}return Math.sqrt(d)}
const FP_TH=.75;function matchRule(rules,fp){let best=null,bd=FP_TH;for(const r of rules){const d=fpDist(r.fp,fp);if(d<bd){bd=d;best=r}}return best}
async function learn(fp,g){if(!fp)return;const rules=await learnedRules(),m=matchRule(rules,fp);const r=m?{...m,g,updated:Date.now()}:{id:uid(),fp,g,created:Date.now()};await put('learned',r);lrCache=null;learnInfoUpd()}
function groupFor(type,orig){if(DG[orig]?.t===type)return orig;const ks=Object.keys(DG);return ks.find(k=>DG[k].t===type&&!DG[k].x)||ks.find(k=>DG[k].t===type)||'oth'}
async function learnInfoUpd(){const n=(await learnedRules()).length;$('#learnInfo').textContent=n?`🧠 Learned ${n} symbol${n>1?'s':''} from your corrections (used first).`:'🧠 No learned symbols yet. Rejecting or retyping a suggestion teaches the detector.';$('#learnReset').hidden=!n}
$('#learnReset').onclick=async()=>{if(!await uiConfirm('Forget all learned symbols (in every project)?'))return;await tx('learned','readwrite',o=>o.clear());lrCache=null;learnInfoUpd()};

// ---------- v10: multi-select tools ----------
function selectAll(f){if(!plan||!f)return;const L=[...(f!=='p'?markups.filter(m=>m.page===page&&mVis(m)):[]),...(f!=='m'?pins.filter(p=>p.page===page&&pVis(p)&&tVis(p)):[])];msel=L;sel=null;if(L.length)multiOn=true;renderSelBar();requestDraw(false);toast(L.length?`${L.length} selected`:'Nothing visible on this page')}
async function bulkDelete(){const it=selItems().filter(o=>o.planId===plan?.id);if(!it.length)return;const L=[];for(const o of it){if(isPinO(o))L.push({store:'pins',id:o.id,before:o,after:null,media:await byIdx('media','pinId',o.id,true)});else L.push({store:'markups',id:o.id,before:o,after:null})}
 msel=[];sel=null;await changeMulti(L);renderSelBar();toast(`Deleted ${L.length} item${L.length>1?'s':''}`,true)}
$('#bkType').innerHTML='<option value="">unchanged</option>'+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');
function openBulk(){const it=selItems();if(!it.length)return;const nm=it.filter(o=>!isPinO(o)).length,np=it.length-nm;$('#bkN').textContent=`${it.length} item${it.length>1?'s':''}`;$('#bkM').hidden=!nm;$('#bkP').hidden=!np;
 $('#bkCOn').checked=false;$('#bkColor').value=$('#color').value;$('#bkSize').value='';$('#bkOOn').checked=false;$('#bkOpac').value=$('#opac').value;$('#bkOpacLbl').textContent=$('#opac').value+'%';$('#bkStatus').value='';$('#bkType').value='';$('#bulkDlg').showModal()}
$('#bkColor').oninput=()=>$('#bkCOn').checked=true;$('#bkOpac').oninput=()=>{$('#bkOOn').checked=true;$('#bkOpacLbl').textContent=+$('#bkOpac').value+'%'};
$('#bkGo').onclick=async()=>{$('#bulkDlg').close();await bulkApply({color:$('#bkCOn').checked?$('#bkColor').value:null,size:$('#bkSize').value,opacity:$('#bkOOn').checked?clampOp(+$('#bkOpac').value/100):null,status:$('#bkStatus').value,type:$('#bkType').value})};
async function bulkApply(o){const it=selItems().filter(x=>x.planId===plan?.id),L=[],now=Date.now();let who=null;
 for(const x of it){const b=structuredClone(x);let a=structuredClone(x);
  if(isPinO(x)){if(o.type&&o.type!==a.type){a.type=o.type;delete a.shp}if(o.opacity!=null)a.opacity=o.opacity;
   if(o.status&&o.status!==b.status){if(o.status==='passed'||o.status==='failed'||o.status==='corrected'){who??=await getTester();a.testedAt=now;a.tester=who}if(o.status==='corrected'){a.correctedAt=now;a.correctedBy=who;a.reason=b.reason||'Other';a.severity=b.severity||'Non-critical'}else{delete a.correctedAt;delete a.correctedBy;delete a.corrNote}
    if(o.status==='passed'){a.checks=(b.checks||checkItems(a.type)).map(c=>({...c,v:'pass'}));a.reason=a.reasonText=a.severity=''}
    else if(o.status==='failed'){a.reason=b.reason||'Other';a.severity=b.severity||'Non-critical'}
    else if(o.status==='not tested'){for(const k of['checks','testedAt','tester','reason','reasonText','severity'])delete a[k]}
    a.status=o.status}}
  else{if(o.color)a.color=o.color;if(o.opacity!=null)a.opacity=o.opacity;if(o.size!==''&&o.size!=null){const i=+o.size;a=a.type==='text'?textBox({...a,fs:SZT[i]/view.s}):{...a,w:SZ[i]}}}
  if(JSON.stringify(a)!==JSON.stringify(b))L.push({store:isPinO(x)?'pins':'markups',id:x.id,before:b,after:a})}
 if(!L.length){toast('Nothing to change');return}await changeMulti(L);renderSelBar();toast(`Updated ${L.length} item${L.length>1?'s':''}`,true)}
