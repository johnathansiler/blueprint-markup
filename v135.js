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
// ---------- 5. Start next inspection (keep last results for comparison) ----------
(()=>{const {by,ce,MX}=window.V135;const K=()=>project&&project.id;
 const RESET=['testedAt','tester','reason','reasonText','severity','codes','correctedAt','correctedBy','corrNote','rdSens','rdCd','rdDb'];
 const VISIT=['inspDate','testDate','result','startTime','finishTime','notifyBefore','notifyAfter','sigAlarm','sigSuper','sigTrouble','sigRestore','simNote'];
 const tested=p=>p.status&&p.status!=='not tested'||p.testedAt;
 function snap(p,j){const o={status:p.status||'not tested',inspDate:j.inspDate||'',endedAt:Date.now()};for(const k of ['testedAt','tester','reason','reasonText','severity','corrNote','correctedAt','rdSens','rdCd','rdDb'])if(p[k]!=null&&p[k]!=='')o[k]=structuredClone(p[k]);const ck=(p.checks||[]).filter(c=>c.v);if(ck.length)o.checks=ck.map(c=>({t:c.t,v:c.v}));return o}
 async function nextInsp(){if(!K())return uiAlert('Open a project first.');const pid=K(),j=(await get('meta','job:'+pid))||{},D=await projData(),n=D.reduce((a,d)=>a+d.pins.length,0),nt=D.reduce((a,d)=>a+d.pins.filter(tested).length,0);
  if(!n)return uiAlert('This project has no devices yet.');
  if(!await uiConfirm(`Start the next inspection for this project?\n\nAll ${n} devices go back to "not tested". Checklists, fail reasons, readings and signatures are cleared for the new visit.\n\nThe last result of every device (${nt} tested) is kept: it shows on the pin card as "Last inspection" and in the device spreadsheet, so you can compare.\n\nTip: save a backup project file first (Menu > Save project file).`,{ok:'Start next inspection',cancel:'Cancel'}))return false;
  busy(1,'Starting next inspection');try{const now=Date.now(),who=(typeof tester==='string'&&tester)||'';let c=0;
   for(const{pl,pins:ps}of D)for(const p0 of ps){const p=pl.id===plan?.id?(pins.find(x=>x.id===p0.id)||p0):p0,a=structuredClone(p);if(tested(p))a.prev=snap(p,j);
    a.status='not tested';if(Array.isArray(a.checks))a.checks=a.checks.map(c=>({...c,v:''}));for(const k of RESET)delete a[k];a.updatedAt=now;a.dev=window.DEVICE_ID;a.by=who;await put('pins',a);if(pl.id===plan?.id){const i=pins.findIndex(x=>x.id===a.id);if(i>=0)pins[i]=a}c++}
   await put('meta',{...j,endedAt:now},'jobPrev:'+pid);const nj={...j};for(const k of VISIT)nj[k]='';await put('meta',nj,'job:'+pid);
   const sg=await get('meta','sig:'+pid);if(sg){await put('meta',sg,'sigPrev:'+pid);await del('meta','sig:'+pid)}
   if(plan)await openPlan(plan.id,page);afterChange?.();toast(`Next inspection started: ${c} devices reset, last results kept`);return true}
  catch(e){showErr('Could not start the next inspection: '+e.message)}finally{busy(0)}}
 window.nextInsp=nextInsp;
 const prevTxt=p=>{const v=p&&p.prev;if(!v)return'';const R=window.RD||{};return `Last inspection${v.inspDate?' ('+v.inspDate+')':''}: ${v.status}${v.reason?' · '+v.reason:''}${v.testedAt?' · '+fmtT(v.testedAt):''}${v.tester?' by '+v.tester:''}${typeof rdTxt==='function'&&rdTxt({...v,type:p.type})?' · '+rdTxt({...v,type:p.type}):''}`};
 window.prevTxt=prevTxt;
 const _op=openPin;openPin=async function(p,...r){let e=by('prevInfo');if(!e){const t=by('testedInfo');if(t){e=ce('small',{id:'prevInfo'});t.after(e)}}if(e){const s=prevTxt(p);e.textContent=s;e.hidden=!s}return _op.call(this,p,...r)};
 MX.push(()=>[{i:'🔁',l:'Start next inspection…',run:nextInsp}]);
})();
// ---------- 9. Smaller saved photos + save this job's install sheets for offline use ----------
(()=>{const {MX}=window.V135;const K=()=>project&&project.id;
 const MAXD=2048,Q=.82,MINB=700*1024;
 // Phone camera photos are 3–12 MB each. Store a copy at most 2048 px on the long side (sharp enough to read labels and wiring), JPEG 82 %.
 async function shrink(blob){try{if(!blob||!/^image\/(jpeg|png|webp|heic|heif)/i.test(blob.type||''))return blob;const bm=await createImageBitmap(blob,{imageOrientation:'from-image'});const w=bm.width,h=bm.height,s=Math.min(1,MAXD/Math.max(w,h));
   if(s===1&&blob.size<=MINB){bm.close?.();return blob}const cv=document.createElement('canvas');cv.width=Math.round(w*s);cv.height=Math.round(h*s);const g=cv.getContext('2d');g.drawImage(bm,0,0,cv.width,cv.height);bm.close?.();
   const out=await new Promise(r=>cv.toBlob(r,'image/jpeg',Q));if(!out||out.size>=blob.size)return blob;out.origSize=blob.size;return out}catch(e){return blob}}
 window.shrinkPhoto=shrink;
 const _am=addMedia;addMedia=async function(kind,blob,name){if(kind==='photo'){const b=await shrink(blob);if(b!==blob&&name)name=String(name).replace(/\.(png|heic|heif|webp)$/i,'.jpg');return _am.call(this,kind,b,name)}return _am.call(this,kind,blob,name)};
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

 // ---- item 11: app-screen pinch zoom (bpm-v135). The page may now be pinch-zoomed (small text, photos, dialogs);
 // the plan keeps its own pinch zoom: #stage is touch-action:none, and iOS page gestures that start on the plan are cancelled.
 const stg=document.getElementById('stage');if(stg)for(const ev of['gesturestart','gesturechange'])stg.addEventListener(ev,e=>e.preventDefault(),{passive:false});
 function resetZoom(){const m=document.querySelector('meta[name=viewport]');if(!m)return;const c=m.content;m.content='width=device-width,initial-scale=1,maximum-scale=1';setTimeout(()=>{m.content=c},350)}
 window.resetScreenZoom=resetZoom;
 MX.push(()=>[{i:'🔍',l:'Reset screen zoom',run:resetZoom}]);
})();
