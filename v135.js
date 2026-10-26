// bpm-v135: new features. Classic script: uses the app's shared globals (project, plan, pins, change, get/put, toast, uiConfirm …).
(()=>{const by=id=>document.getElementById(id),ce=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e};
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
// ---------- 3. Inspection and Testing Record: on-screen signatures and visit times ----------
(()=>{const {by,ce,MX}=window.V135;let dlg=null;const K=()=>project&&project.id;
 const pad=(cv)=>{const g=cv.getContext('2d');let dn=false,last=null,ink=false;const pt=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
  const clr=()=>{g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.strokeStyle='#cbd5e1';g.beginPath();g.moveTo(20,cv.height-30);g.lineTo(cv.width-20,cv.height-30);g.stroke();ink=false};clr();
  cv.addEventListener('pointerdown',e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);dn=true;last=pt(e)});
  cv.addEventListener('pointermove',e=>{if(!dn)return;const q=pt(e);g.strokeStyle='#0f172a';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(...last);g.lineTo(...q);g.stroke();last=q;ink=true});
  const up=()=>{dn=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  return{clr,ink:()=>ink,set:src=>new Promise(r=>{clr();if(!src)return r();const im=new Image();im.onload=()=>{g.drawImage(im,0,0,cv.width,cv.height);ink=true;r()};im.onerror=r;im.src=src})}};
 let P={};
 function build(){if(dlg)return dlg;dlg=ce('dialog',{id:'sigDlg'},`<form method="dialog"><h3 style="margin:4px 0">✍ Sign the Inspection and Testing Record</h3><small style="color:#94a3b8">Sign with a finger or stylus. Signatures are kept with this project and printed on the record.</small>
  <label>Inspector name <input name="inspName" autocomplete="off"></label><canvas id="sigInsp" width="600" height="160" class="sigPad"></canvas><div class="row"><button type="button" class="btn" id="sigInspClr">Clear inspector signature</button></div>
  <label>Owner / representative name <input name="ownerName" autocomplete="off"></label><canvas id="sigOwner" width="600" height="160" class="sigPad"></canvas><div class="row"><button type="button" class="btn" id="sigOwnerClr">Clear owner signature</button></div>
  <div class="row"><span class="sp"></span><button class="btn" value="cancel">Cancel</button><button type="button" class="btn pri" id="sigSave">Save signatures</button></div></form>`);document.body.append(dlg);
  P.insp=pad(by('sigInsp'));P.owner=pad(by('sigOwner'));by('sigInspClr').onclick=()=>P.insp.clr();by('sigOwnerClr').onclick=()=>P.owner.clr();
  by('sigSave').onclick=async()=>{const f=dlg.querySelector('form'),o=(await get('meta','sig:'+K()))||{},now=Date.now(),mk=(k,nm)=>P[k].ink()?{img:by(k==='insp'?'sigInsp':'sigOwner').toDataURL('image/png'),name:nm,at:(o[k]?.img&&o[k].name===nm&&o[k].img===by(k==='insp'?'sigInsp':'sigOwner').toDataURL('image/png'))?o[k].at:now}:null;
   const s={insp:mk('insp',f.elements.inspName.value.trim()),owner:mk('owner',f.elements.ownerName.value.trim())};await put('meta',s,'sig:'+K());dlg.close();toast('Signatures saved');info()};return dlg}
 async function info(){const e=by('itmSignInfo');if(!e||!K())return;const s=(await get('meta','sig:'+K()))||{};e.textContent=[s.insp?'inspector signed':'',s.owner?'owner signed':''].filter(Boolean).join(', ')||'not signed yet'}
 async function open(){if(!K())return uiAlert('Open a project first.');build();const s=(await get('meta','sig:'+K()))||{},j=(await get('meta','job:'+K()))||{},f=dlg.querySelector('form');
  f.elements.inspName.value=s.insp?.name||j.techName||(typeof tester==='string'?tester:'')||'';f.elements.ownerName.value=s.owner?.name||j.ownerName||j.owner||'';await P.insp.set(s.insp?.img);await P.owner.set(s.owner?.img);dlg.showModal()}
 window.sigOpen=open;
 const now=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
 const f=by('jobForm');if(f){by('itmStartNow').onclick=()=>{f.elements.startTime.value=now()};by('itmEndNow').onclick=()=>{f.elements.finishTime.value=now()};by('itmSign').onclick=open;
  by('jobDlg').addEventListener('toggle',info);new MutationObserver(()=>{if(by('jobDlg').open)info()}).observe(by('jobDlg'),{attributes:true,attributeFilter:['open']})}
 MX.push(()=>[{i:'✍',l:'Sign inspection record…',run:open}]);
})();
