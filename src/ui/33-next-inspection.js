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
