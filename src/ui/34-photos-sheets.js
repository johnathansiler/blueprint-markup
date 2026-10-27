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
