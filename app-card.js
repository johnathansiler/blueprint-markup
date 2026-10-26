'use strict';
// bpm-v135: pin card, list, project data, export, projects, start-up hooks, photo annotation, report (split out of app.js; classic script sharing app.js globals, loaded right after the file before it)
// ---------- pin dialog ----------
const dlg=$('#pinDlg'),form=$('#pinForm');let cur=null,urls=[];
for(const[k,t]of Object.entries(TYPES)){$('#pinType').add(new Option(t.n,k));$('#dType').add(new Option(t.n,k));$('#fType').add(new Option(t.n,k))}
const PK=['type','address','model','location','status','notes','reason','reasonText','severity','corrNote','rdSens','rdCd','rdDb'];
// bpm-v135: measured readings by device type
const RD={rdSens:{n:'Sensitivity (% per ft)',s:'Sensitivity',u:'%/ft',t:['smoke','duct'],lo:0.5,hi:4.0},rdCd:{n:'Candela setting',s:'Candela',u:'cd',t:['horn','spkstrobe','strobe']},rdDb:{n:'Sound level',s:'Sound level',u:'dBA',t:['horn','spkstrobe','linearray']}};
const rdKeys=t=>Object.keys(RD).filter(k=>RD[k].t.includes(t)),rdTxt=p=>rdKeys(p.type).filter(k=>p[k]).map(k=>`${RD[k].s} ${p[k]} ${RD[k].u}`).join(', ');
function rdUI(){const t=form.elements.type.value,ks=rdKeys(t);$('#rdBox').hidden=!ks.length;for(const l of document.querySelectorAll('#rdBox [data-rd]'))l.hidden=!ks.includes(l.dataset.rd);const v=parseFloat(form.elements.rdSens.value),R=RD.rdSens;$('#rdHint').textContent=ks.includes('rdSens')&&!isNaN(v)&&(v<R.lo||v>R.hi)?`Sensitivity ${v} is outside the usual ${R.lo.toFixed(1)}–${R.hi.toFixed(1)} % per ft range. Check the device listing.`:''}
let ckl=[];async function openPin(p){cur=p;modelOpts(p.type);if(!Array.isArray(cur.codes))cur.codes=[];for(const k of PK)form.elements[k].value=p[k]||(k==='severity'?'Non-critical':'');if(p.reasonText)form.elements.reasonText.value=failReasonText(p.reasonText);autoR=false;ckl=structuredClone(p.checks||checkItems(p.type));renderChecks();failUI();rdUI();rtUpd();renderCodes();$('#testedInfo').textContent=testedTxt(p);await showMedia();dlg.showModal()}
const fmtShort=t=>{const d=new Date(t);return d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})};
const fmtT=t=>{const d=new Date(t),z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`};
const testedTxt=p=>p.testedAt?`${p.status} ${fmtT(p.testedAt)}${p.tester?' by '+p.tester:''}`:'';
let tester=null,testerAsked=null;async function getTester(force){if(tester===null)tester=(await get('meta','tester'))||'';if(testerAsked===null)testerAsked=!!(await get('meta','testerAsked'));/* bpm-v98: ask once (even if left blank); edit any time with 👤 Tester */if((!tester&&!testerAsked)||force){const n=await uiPrompt('Tester name (asked once, saved on this device; change it any time with 👤 Tester):',tester,{ok:'Save',cancel:'Skip'});testerAsked=true;await put('meta',1,'testerAsked');if(n!==null){tester=n.trim();await put('meta',tester,'tester')}}return tester}
async function showMedia(){urls.forEach(URL.revokeObjectURL);urls=[];const ms=await byIdx('media','pinId',cur.id);$('#media').innerHTML='';
 for(const m of ms.sort((a,b)=>a.created-b.created)){const u=URL.createObjectURL(m.blob);urls.push(u);const d=document.createElement('div');d.className='m';
  if(m.kind==='photo'){const show=m.annot&&!m.showOrig?m.annot:m.blob,uu=show===m.blob?u:URL.createObjectURL(show);if(uu!==u)urls.push(uu);d.innerHTML=`<img src="${uu}">`;
   const bar=document.createElement('div');bar.className='row mbar';const an=document.createElement('button');an.type='button';an.className='btn';an.textContent='✎ Annotate';an.onclick=()=>annotate(m);bar.append(an);
   if(m.annot){const tg=document.createElement('button');tg.type='button';tg.className='btn';tg.textContent=m.showOrig?'Show annotated':'Show original';tg.onclick=async()=>{m.showOrig=!m.showOrig;await put('media',m);showMedia()};bar.append(tg,Object.assign(document.createElement('small'),{textContent:m.showOrig?'original':'annotated'}))}
   d.append(bar)}else d.innerHTML=m.kind==='video'?`<video src="${u}" controls playsinline></video>`:`<audio src="${u}" controls></audio>`;
  const x=document.createElement('button');x.type='button';x.className='btn';x.textContent='✕';x.onclick=async()=>{await del('media',m.id);showMedia()};d.append(x);$('#media').append(d)}}
const photoBlob=m=>m.annot||m.blob;
async function addMedia(kind,blob,name){await put('media',{id:uid(),pinId:cur.id,kind,blob,name,created:Date.now()});showMedia()}
$('#addPhoto').onchange=e=>{for(const f of e.target.files)addMedia('photo',f,f.name);e.target.value=''};
$('#addVideo').onchange=e=>{for(const f of e.target.files)addMedia('video',f,f.name);e.target.value=''};
let rec=null;$('#rec').onclick=async()=>{const b=$('#rec');if(rec){rec.stop();return}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true});const ch=[];rec=new MediaRecorder(st);rec.ondataavailable=e=>ch.push(e.data);
  rec.onstop=()=>{st.getTracks().forEach(t=>t.stop());addMedia('audio',new Blob(ch,{type:rec.mimeType||'audio/webm'}),'voice note');rec=null;b.textContent='🎙 Record'};rec.start();b.textContent='⏹ Stop'}catch(err){uiAlert('Microphone unavailable: '+err.message)}};
function failUI(){const sv=form.elements.status.value;$('#failBox').hidden=sv!=='failed'&&sv!=='corrected';$('#corrBox').hidden=sv!=='corrected';$('#corrBtn').hidden=sv!=='failed';$('#corrInfo').textContent=sv==='corrected'&&cur?.correctedAt?'Corrected '+fmtT(cur.correctedAt)+(cur.correctedBy?' by '+cur.correctedBy:''):'';if(!$('#failBox').hidden){codeHintUpd();suggestCodes()}}form.elements.status.addEventListener('change',failUI);form.elements.type.addEventListener('change',rdUI);form.elements.rdSens.addEventListener('input',rdUI);$('#corrBtn').onclick=()=>{form.elements.status.value='corrected';failUI();form.elements.corrNote.focus()};form.elements.severity.addEventListener('change',()=>codeHintUpd()); /* bpm-v135: codeHintUpd lives in app-files.js, loaded later */
const CV={pass:'Pass',fail:'Fail',na:'N/A'};let autoR=false;const rtUpd=()=>{$('#reasonTextL').hidden=form.elements.reason.value!=='Other'};form.elements.reason.addEventListener('change',()=>{autoR=false;rtUpd();suggestCodes();codeHintUpd()});form.elements.reasonText.addEventListener('input',()=>autoR=false);
function renderChecks(){const n=ckl.filter(c=>c.v).length;$('#ckHead').textContent=`Checklist ${n}/${ckl.length}`;
 $('#checks').innerHTML=ckl.map((c,i)=>`<div class="ck ck-${c.v||'none'}"><span>${esc(c.v==='fail'?failItemLabel(c.t):c.t)}</span><span class="seg">${Object.entries(CV).map(([v,l])=>`<button type="button" data-i="${i}" data-v="${v}" class="${c.v===v?'on '+v:''}">${l}</button>`).join('')}</span></div>`).join('')}
function checksChanged(){let st=autoStatus(ckl);if(form.elements.status.value==='corrected'&&st==='passed')st='corrected';/* bpm-v135: a corrected device that passes its retest stays Corrected */form.elements.status.value=st;
 if(st==='failed'&&(!form.elements.reason.value||autoR)){const f=ckl.filter(c=>c.v==='fail').map(c=>c.t);form.elements.reason.value=reasonFor(f[0]);rtUpd();if(!form.elements.reasonText.value||autoR)form.elements.reasonText.value=f.map(failItemLabel).join('; ');autoR=true}
 failUI();renderChecks()}
$('#checks').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;const c=ckl[+b.dataset.i];c.v=c.v===b.dataset.v?'':b.dataset.v;checksChanged()});
$('#passAll').onclick=()=>{for(const c of ckl)if(!c.v)c.v='pass';checksChanged()};
form.elements.type.addEventListener('change',()=>{modelOpts(form.elements.type.value);if(!ckl.some(c=>c.v)){ckl=checkItems(form.elements.type.value);renderChecks()}});
// bpm-v122: the draft the Save button would write. Built synchronously so a close during a tester prompt can't pick up a different pin.
function pinDraft(){if(!cur)return null;const b=structuredClone(cur),a={...b};for(const k of PK)a[k]=form.elements[k].value;if(ckl.some(c=>c.v)||b.checks)a.checks=structuredClone(ckl);if(a.status!=='failed'&&a.status!=='corrected'){a.reason='';a.reasonText='';a.severity='';delete a.codes}else if(cur.codes?.length)a.codes=structuredClone(cur.codes);else delete a.codes;if(a.status!=='corrected'){delete a.corrNote;delete a.correctedAt;delete a.correctedBy}for(const k of PK)if(a[k]===''&&!(k in b)&&/^(corrNote|rd)/.test(k))delete a[k];if(a.type!==b.type)delete a.shp;return{b,a}}
function pinDirty(){const d=pinDraft();if(!d)return false;if(dlg._wf&&JSON.stringify(d.a)===dlg._wf)return false;/* bpm-v129: a walk Fail card closed untouched changes nothing */const {b,a}=d;for(const k of PK){const bv=b[k]||(k==='severity'?'Non-critical':''),av=a[k]||(k==='severity'?'Non-critical':'');if(String(av)!==String(bv))return true}if(JSON.stringify(a.checks||null)!==JSON.stringify(b.checks||null))return true;if(JSON.stringify(a.codes||null)!==JSON.stringify(b.codes||null))return true;return false}
function pinBlockStop(){if(form.elements.status.value==='failed'&&!form.elements.reason.value){uiAlert('Pick a fail reason for this failed device.');form.elements.reason.focus();return true}if(form.elements.status.value==='failed'&&form.elements.severity.value==='Critical'&&!(cur.codes&&cur.codes.length)){(async()=>{if(await uiConfirm('Critical deficiency needs a code reference. Open the code picker?'))openCodePicker();else uiAlert('Add at least one code reference for a Critical deficiency.')})();return true}return false}
function commitPin(){const d=pinDraft();if(!d)return Promise.resolve();const {b,a}=d;return (async()=>{if(a.status!==b.status){a.testedAt=Date.now();a.tester=await getTester();if(a.status==='corrected'){a.correctedAt=a.testedAt;a.correctedBy=a.tester}}if(b.fp&&a.type!==b.type){const ng=groupFor(a.type,b.detG);a.detG=ng;learn(b.fp,ng)}if(a.model)rememberModel(a.type,a.model);if(JSON.stringify(a)!==JSON.stringify(b))await change('pins',b,a);if(cur&&cur.id===a.id)cur=pins.find(x=>x.id===a.id)||cur})()}
// Close, Escape and Android Back (dialog cancel) keep a dirty card as one undo step. Save is unchanged. A failed pin still needs a reason, and a Critical one still needs a code, or the card stays open.
form.addEventListener('submit',e=>{const save=e.submitter?.value==='save',close=e.submitter?.value==='cancel';if(!save&&!(close&&pinDirty()))return;if(pinBlockStop()){e.preventDefault();return}dlgSave=commitPin()});
dlg.addEventListener('cancel',e=>{if(!pinDirty())return;if(pinBlockStop()){e.preventDefault();return}dlgSave=commitPin()});
// bpm-v66: wait for the async Save to land before the walk re-reads the pin (it used to re-render with the pre-save pin)
let dlgSave=null;dlg.addEventListener('close',()=>{dlg._wf=null;if(rec)rec.stop();const w=dlgSave;dlgSave=null;Promise.resolve(w).catch(()=>{}).then(()=>{if(walk)setTimeout(walkAfterDialog,0)})});
$('#pinDel').onclick=async()=>{if(!await uiConfirm('Delete this pin and its media?'))return;await deletePin(cur);dlg.close()};
async function deletePin(p){await change('pins',p,null,await byIdx('media','pinId',p.id))}
// ---------- list ----------
/* bpm-v111: one side panel at a time — Pins and Layers share the right-side slot; opening one closes the other, its own button closes it */
window.pinsPanel=on=>{const P=$('#panel');if(P.hidden===!on)return;P.hidden=!on;if(WIDE_MQ.matches)PANEL_CLOSED=!on;if(on){try{window.layPanel&&document.body.classList.contains('lpOn')&&layPanel(false)}catch{}renderList()}panelBtnSync();try{resize()}catch{}};
$('#listBtn').onclick=()=>pinsPanel($('#panel').hidden);$('#closeList').onclick=()=>{$('#panel').hidden=true;if(WIDE_MQ.matches)PANEL_CLOSED=true;panelBtnSync()};
['#q','#fType','#fStat','#allPages'].forEach(s=>$(s).oninput=renderList);/* bpm-v131: loops removed from the app */
function renderList(){if($('#panel').hidden)return;const q=$('#q').value.toLowerCase(),ft=$('#fType').value,fs=$('#fStat').value,fl=''/* bpm-v118: Loop filter removed; any saved value ignored */,ap=$('#allPages').checked;

 renderSummary();renderCounts();if($('#panel').classList.contains('defmode'))renderDefs();
 const L0=pins.filter(p=>(ap||p.page===page)&&(!ft||p.type===ft)&&(!fs||p.status===fs)&&(!q||[p.address,p.location,p.notes,TYPES[p.type]?.n].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.page-b.page||String(a.address).localeCompare(b.address,undefined,{numeric:true}));const L=L0.filter(tVis),nH=L0.length-L.length;
 $('#pinList').innerHTML=(nH?`<li class="pHid">👁‍🗨 ${nH} pin${nH>1?'s':''} hidden by layer · <a href="#" onclick="tlayOpen();return false">Layers</a></li>`:'')+L.map(p=>`<li data-id="${p.id}" class="pRow" title="${esc([TYPES[p.type].n,p.address,p.location,p.status,p.testedAt?fmtShort(p.testedAt):''].filter(Boolean).join(' · '))}"><span class="dot" style="background:${TYPES[p.type].c}"></span><b class="pT">${esc(TYPES[p.type].n.replace(/ – .*/,''))}</b>${p.address?`<span class="pA">${esc(p.address)}</span>`:''}<span class="sp"></span><small class="pS st-${p.status.split(' ')[0]}">${p.status==='not tested'?'untested':p.status}</small>${p.testedAt?`<small class="pD">${esc(fmtShort(p.testedAt))}</small>`:''}${ap?`<small class="pD" title="${esc(pgT(plan.id,p.page))}">${esc(pgT(plan.id,p.page))}</small>`:''}</li>`).join('')||'<li>No pins</li>'; // bpm-v102: one compact line per pin (no tester; page only with "all pages")
 $('#pinList').querySelectorAll('li[data-id]').forEach(li=>li.onclick=()=>jumpTo(plan.id,li.dataset.id))}
async function jumpTo(planId,pinId){if(plan?.id!==planId){const p0=await get('pins',pinId);await openPlan(planId,p0?.page||1)}const p=pins.find(x=>x.id===pinId);if(!p)return;if(p.page!==page)await gotoPage(p.page);
 const s=Math.max(view.s,1.5/dpr()*2);centerOn(p.x,p.y,s,stage.clientWidth/2,stage.clientHeight/2);sel={kind:'p',o:p};draw();scheduleRender();if(innerWidth<700)$('#panel').hidden=true}
// ---------- project-wide data: deficiencies + device counts ----------
async function projData(){const pls=(await all('plans')).filter(p=>p.projectId===project?.id).sort((a,b)=>a.added-b.added),out=[];for(const pl of pls)out.push({pl,pins:pl.id===plan?.id?pins.slice():await byIdx('pins','planId',pl.id)});return out}
const plName=pl=>pl.name.replace(/\.[^.]+$/,'');
async function firstPhoto(pinId){const ms=(await byIdx('media','pinId',pinId)).filter(m=>m.kind==='photo').sort((a,b)=>a.created-b.created);return ms[0]?photoBlob(ms[0]):null}
let defUrls=[];
async function renderDefs(){const D=await projData(),items=[];for(const{pl,pins:ps}of D)for(const p of ps)if(p.status==='failed'||p.status==='corrected')items.push({pl,p});
 items.sort((a,b)=>(a.p.status==='corrected'?1:0)-(b.p.status==='corrected'?1:0)||(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1)||a.pl.added-b.pl.added||String(a.p.address).localeCompare(b.p.address,undefined,{numeric:true}));
 defUrls.forEach(URL.revokeObjectURL);defUrls=[];const html=[];
 for(const{pl,p}of items){const ph=await firstPhoto(p.id);let img='';if(ph){const u=URL.createObjectURL(ph);defUrls.push(u);img=`<img class="thumb" src="${u}">`}
  html.push(`<li data-pl="${pl.id}" data-id="${p.id}"${p.status==='corrected'?' class="defCorr"':''}>${img||'<span class="thumb"></span>'}<div>${p.status==='corrected'?`<b class="st-corrected">✔ ${esc(corrTxt(p))}</b><br>`:''}<b class="${p.severity==='Critical'&&p.status!=='corrected'?'st-failed':''}">${esc(p.severity||'—')}</b> · ${esc(TYPES[p.type]?.n||p.type)} ${esc(p.address)}${p.location?' · '+esc(p.location):''}<br>${esc(p.reason||'no reason')}${p.reasonText?': '+esc(failReasonText(p.reasonText)):''}${p.notes?'<br><small>'+esc(p.notes)+'</small>':''}${p.codes?.length?'<br><small style="color:#fbbf24">'+esc(fmtCodes(p.codes))+'</small>':''}<br><small>${esc(plName(pl))} ${esc(pgT(pl.id,p.page))}${p.testedAt?' · '+esc(fmtT(p.testedAt)):''}${p.tester?' · '+esc(p.tester):''}</small></div></li>`)}
 $('#defList').innerHTML=html.join('')||'<li>No deficiencies (no failed devices) in this project</li>';$('#defCount').textContent=items.filter(i=>i.p.status==='failed').length;
 $('#defList').querySelectorAll('li[data-id]').forEach(li=>li.onclick=()=>jumpTo(li.dataset.pl,li.dataset.id));return items}
function setMode(def){$('#panel').classList.toggle('defmode',def);$('#modePins').classList.toggle('on',!def);$('#modeDefs').classList.toggle('on',def);if(def)renderDefs();else renderList()}
$('#modePins').onclick=()=>setMode(false);$('#modeDefs').onclick=()=>setMode(true);
function csvDl(rows,name){const cell=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};dl(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv'}),project.name.replace(/[\\/:*?"<>|]/g,'_')+name)}
$('#defCsv').onclick=async()=>{const items=await renderDefs();csvDl([['plan','page','page name','type','address','location','status','severity','reason','reason detail','codes','notes','tested','tester','corrected on','corrected by','what was fixed']].concat(items.map(({pl,p})=>[pl.name,p.page,pnm(pl.id,p.page),TYPES[p.type]?.n||p.type,p.address,p.location||'',p.status==='corrected'?'corrected':'open',p.severity,p.reason,failReasonText(p.reasonText),fmtCodes(p.codes),p.notes,p.testedAt?fmtT(p.testedAt):'',p.tester||'',p.correctedAt?fmtT(p.correctedAt):'',p.correctedBy||'',p.corrNote||''])),'-deficiencies.csv')};
function blobJpeg(b,max=900){return new Promise((res,rej)=>{const u=URL.createObjectURL(b),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);res({d:c.toDataURL('image/jpeg',.85),w:c.width,h:c.height})};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('bad image'))};im.src=u})}
$('#defPdf').onclick=async()=>{busy(1,'Exporting');try{const items=await renderDefs();const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});doc.setFontSize(16);doc.text(`Deficiencies - ${project.name}`,40,44);doc.setFontSize(10);
 const nOpen=items.filter(i=>i.p.status==='failed');doc.text(`${nOpen.length} failed device(s) · ${nOpen.filter(i=>i.p.severity==='Critical').length} critical · ${items.length-nOpen.length} corrected · generated ${fmtT(Date.now())}`,40,62);let y=84;
 for(const{pl,p}of items){const ph=await firstPhoto(p.id);let im=null;if(ph)try{im=await blobJpeg(ph)}catch{}const ih=im?Math.min(200,im.h*(220/im.w)):0,need=Math.max(ih,70)+18;if(y+need>760){doc.addPage();y=44}
  doc.setFontSize(12);doc.setTextColor(p.severity==='Critical'?185:0,0,0);doc.text(`${p.severity||'-'}: ${TYPES[p.type]?.n||p.type} ${p.address||''}${p.location?' @ '+p.location:''}`,40,y+12);doc.setTextColor(0,0,0);doc.setFontSize(10);
  const lines=doc.splitTextToSize([corrTxt(p),`Reason: ${p.reason||'-'}${p.reasonText?' - '+failReasonText(p.reasonText):''}`,p.codes?.length?`Codes: ${fmtCodes(p.codes)}`:'',`Plan: ${pl.name}, page ${p.page}`,`Tested: ${p.testedAt?fmtT(p.testedAt):'-'}${p.tester?' by '+p.tester:''}`,p.notes?`Notes: ${p.notes}`:''].filter(Boolean).join('\n'),im?280:530);doc.text(lines,40,y+28);
  if(im)doc.addImage(im.d,'JPEG',330,y,220,ih);y+=need;doc.setDrawColor(200);doc.line(40,y-6,572,y-6)}
 dl(doc.output('blob'),project.name.replace(/[\\/:*?"<>|]/g,'_')+'-deficiencies.pdf')}catch(e){showErr('Deficiency PDF failed: '+e.message)}finally{busy(0)}};
function countRows(D){const T=Object.keys(TYPES),blk=ps=>T.map(t=>{const a=ps.filter(p=>p.type===t),te=a.filter(isTested).length,ip=a.filter(p=>p.status==='in progress').length;return{t,n:a.length,te,ip,un:a.length-te-ip}}).filter(r=>r.n);
 return{plans:D.map(({pl,pins:ps})=>({pl,rows:blk(ps)})),total:blk(D.flatMap(d=>d.pins))}}
async function renderCounts(){const PD=await projData();$('#defCount').textContent=PD.flatMap(d=>d.pins).filter(p=>p.status==='failed').length||'';const C=countRows(PD),open=$('#counts').open;const tr=(r)=>`<tr><td>${esc(TYPES[r.t].n)}</td><td>${r.n}</td><td class="st-passed">${r.te}</td><td class="st-in">${r.ip}</td><td class="st-not">${r.un}</td></tr>`,sum=rs=>rs.reduce((a,r)=>[a[0]+r.n,a[1]+r.te,a[2]+r.ip,a[3]+r.un],[0,0,0,0]);
 const t=sum(C.total);$('#counts').innerHTML=`<summary><b>Device counts</b> · project ${t[0]} (${t[1]} tested, ${t[2]} in progress, ${t[3]} untested)</summary><table><tr><th></th><th>#</th><th>tested</th><th>in prog.</th><th>untested</th></tr>${C.plans.filter(b=>b.rows.length).map(b=>`<tr><th colspan="5">${esc(plName(b.pl))}</th></tr>${b.rows.map(tr).join('')}`).join('')}<tr><th colspan="5">Project total</th></tr>${C.total.map(tr).join('')}<tr><td><b>All devices</b></td>${t.map(v=>`<td><b>${v}</b></td>`).join('')}</tr></table>`;$('#counts').open=open;return C}
$('#countCsv').onclick=async()=>{const C=await renderCounts(),rows=[['plan','type','total','tested','in progress','untested']];for(const b of C.plans)for(const r of b.rows)rows.push([b.pl.name,TYPES[r.t].n,r.n,r.te,r.ip,r.un]);for(const r of C.total)rows.push(['PROJECT TOTAL',TYPES[r.t].n,r.n,r.te,r.ip,r.un]);csvDl(rows,'-device-counts.csv')};
const cntSt=a=>{const c={passed:0,failed:0,corr:0,ip:0,nt:0};for(const p of a)p.status==='passed'?c.passed++:p.status==='failed'?c.failed++:p.status==='corrected'?c.corr++:p.status==='in progress'?c.ip++:c.nt++;c.t=a.length;c.pct=c.t?Math.round((c.passed+c.failed+c.corr)*100/c.t):0;return c};
function renderSummary(){ // bpm-v35: progress = pass, fail, total, left, %
 const c={passed:0,failed:0,corr:0};for(const p of pins)p.status==='passed'?c.passed++:p.status==='failed'?c.failed++:p.status==='corrected'?c.corr++:0;c.t=pins.length;c.left=c.t-c.passed-c.failed-c.corr;c.pct=c.t?Math.round((c.passed+c.failed+c.corr)*100/c.t):0;
 const open=$('#sum').open;
 $('#sum').innerHTML=`<summary><b>${c.pct}%</b> · <span class="st-passed">${c.passed} pass</span> · <span class="st-failed">${c.failed} fail</span>${c.corr?` · <span class="st-corrected">${c.corr} corrected</span>`:''} · ${c.t} total · ${c.left} left</summary>`;
 $('#sum').open=open}
$('#testerBtn').onclick=()=>getTester(true);
$('#csvBtn').onclick=async()=>{if(!project)return;await pnAll();const rows=[['plan','page','page name','type','address','model','location','status','tested','tester','notes','corrected on','what was fixed','sensitivity %/ft','candela','sound level dBA','last result','last tested','last readings']];
 for(const pl of(await all('plans')).filter(p=>p.projectId===project.id).sort((a,b)=>a.added-b.added))for(const p of(await byIdx('pins','planId',pl.id)).sort((a,b)=>a.page-b.page||String(a.address).localeCompare(b.address,undefined,{numeric:true})))
  rows.push([pl.name,p.page,pnm(pl.id,p.page),TYPES[p.type]?.n||p.type,p.address,p.model||'',p.location||'',p.status,p.testedAt?fmtT(p.testedAt):'',p.tester||'',p.notes,p.correctedAt?fmtT(p.correctedAt):'',p.corrNote||'',p.rdSens||'',p.rdCd||'',p.rdDb||'',p.prev?.status||'',p.prev?.testedAt?fmtT(p.prev.testedAt):'',p.prev?rdTxt({...p.prev,type:p.type}):'']);
 const cell=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
 dl(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv'}),project.name.replace(/[\\/:*?"<>|]/g,'_')+'-devices.csv')};
// ---------- export ----------
function drawLegend(x,ps,PP,PH){const pp=PP||pins.filter(p=>p.page===page&&(!lay.exp||pVis(p)));if(!pp.length)return;const pageH=PH||curPH();const types=[...new Set(pp.map(p=>p.type))],sts=STATUSES.filter(s=>pp.some(p=>(p.status||'not tested')===s));
 const u=1/ps,row=26*u,pad=10*u,rows=1+types.length+sts.length,w=190*u,h=pad*2+rows*row,X=12*u,Y=pageH-h-12*u;
 x.save();x.fillStyle='rgba(255,255,255,.93)';x.strokeStyle='#334155';x.lineWidth=1.5*u;x.fillRect(X,Y,w,h);x.strokeRect(X,Y,w,h);x.fillStyle='#111';x.font=`bold ${13*u}px sans-serif`;x.textBaseline='middle';x.textAlign='left';x.fillText('Legend',X+pad,Y+pad+row/2);
 let y=Y+pad+row*1.5;for(const t of types){drawPin(x,{type:t,x:X+pad+14*u,y},ps,false,true);x.fillStyle='#111';x.font=`${12*u}px sans-serif`;x.textAlign='left';x.textBaseline='middle';x.fillText(TYPES[t]?.n||t,X+pad+34*u,y);y+=row}
 for(const s of sts){x.fillStyle=ST[s];x.strokeStyle='#fff';x.lineWidth=2*u;x.beginPath();x.arc(X+pad+14*u,y,6*u,0,7);x.fill();x.stroke();x.fillStyle='#111';x.font=`${12*u}px sans-serif`;x.textAlign='left';x.fillText('Status: '+s,X+pad+34*u,y);y+=row}x.restore()}
// bpm-v105: exports follow the in-app orientation: the PDF's own /Rotate plus the in-app Rotate setting (VR), drawing, markups and pins together
function vrXf(x,vr,W,H,s){if(vr===90)x.setTransform(0,s,-s,0,s*H,0);else if(vr===180)x.setTransform(-s,0,0,-s,s*W,s*H);else if(vr===270)x.setTransform(0,-s,s,0,0,s*W);else x.setTransform(s,0,0,s,0,0)}
async function composite(){const vr=+VR||0,sw=vr%180!==0,OW=sw?pageH:pageW,OH=sw?pageW:pageH,sc=Math.min(3,Math.sqrt(30e6/(pageW*pageH)));const c=document.createElement('canvas');c.width=Math.round(OW*sc);c.height=Math.round(OH*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(pdf){const pg=await pdf.getPage(page);await pg.render({canvasContext:x,viewport:pg.getViewport({scale:sc,rotation:((pg.rotate||0)+vr)%360})}).promise}else{vrXf(x,vr,pageW,pageH,sc);x.drawImage(bmp,0,0,pageW,pageH)}
 vrXf(x,vr,pageW,pageH,sc);const ps=1/Math.max(1,Math.max(pageW,pageH)/1200);const E=lay.exp;CR=vr*Math.PI/180;try{for(const m of markups)if(m.page===page&&(!E||mVis(m)))drawMarkup(x,m,1/1.5);OFFMAP=pinOffsets(pins.filter(p=>p.page===page&&(!E||pVis(p))));for(const p of pins)if(p.page===page&&(!E||pVis(p)))(E?drawPinL:drawPin)(x,p,ps,false)}finally{OFFMAP=null;CR=0}x.setTransform(sc,0,0,sc,0,0);drawLegend(x,ps,null,OH);return c}
const base=()=>`${plan.name.replace(/\.[^.]+$/,'')}-p${page}`;
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
$('#exPng').onclick=async()=>{if(!plan)return;busy(1,'Exporting');try{const c=await composite();await new Promise(r=>c.toBlob(b=>{dl(b,base()+'.png');r()},'image/png'))}catch(e){showErr('PNG export failed: '+e.message)}finally{busy(0)}};
$('#exPdf').onclick=async()=>{if(!plan)return;busy(1,'Exporting');prog(0);try{
 const r=await exportPlanPdf(plan,markups,pins,lay,(i,n)=>prog(i/Math.max(1,n)));
 const blob=new Blob([await r.doc.save()],{type:'application/pdf'});
 const {jsPDF}=window.jspdf;const list=new jsPDF({unit:'pt',format:'letter'});let y=40;const ps=pins.filter(p=>p.page===page&&(!lay.exp||pVis(p)));
 list.setFontSize(14);list.text(`Device list - ${plan.name} page ${page}`,40,y);y+=20;list.setFontSize(10);
 for(const p of ps){if(y>760){list.addPage();y=40}list.text(`${TYPES[p.type].n}${p.model?' '+p.model:''} | Addr ${p.address||'-'}${p.location?' | '+p.location:''} | ${p.status}${p.testedAt?' '+fmtT(p.testedAt):''}${p.tester?' by '+p.tester:''}${p.notes?' | '+p.notes.slice(0,50):''}${p.codes?.length?' | '+fmtCodes(p.codes):''}`.slice(0,120),40,y);y+=16}
 const C=countRows(await projData());if(C.total.length){list.addPage();list.setFontSize(14);list.text(`Device counts - ${project.name}`,40,40);pdfCounts(list,C,64)}
 const out=ps.length||C.total.length?await mergePdfBlobs([blob,list.output('blob')]):blob;
 window.__lastPlanPdf=out;dl(out,base()+'.pdf');toast('PDF exported (selectable plan text where the source has a text layer)')}
 catch(e){showErr('PDF export failed: '+e.message)}finally{busy(0)}};

// ---------- projects ----------
async function refreshProjects(){const ps=(await all('projects')).sort((a,b)=>a.created-b.created);$('#projSel').innerHTML=ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');if(project)$('#projSel').value=project.id;return ps}
function closePlan(){PCACHE.clear();if(det)cancelDetect();ghosts=[];renderGhostBar();stopAll();if(pdf){pdf.destroy();pdf=null}plan=null;markups=[];pins=[];updUR();pageW=pageH=0;bmp=baseBm=tile=null;bmpScale=0;sel=null;$('#pageSel').innerHTML='';$('#empty').hidden=false;draw();renderList()}
async function loadProject(id){let ps=await refreshProjects();project=ps.find(p=>p.id===id)||ps[0];
 if(!project){project={id:'p'+uid(),name:'My project',created:Date.now()};await put('projects',project);ps=await refreshProjects()}
 await put('meta',project.id,'project');$('#projSel').value=project.id;closePlan();await refreshPlans();
 const mine=(await all('plans')).filter(p=>p.projectId===project.id).sort((a,b)=>b.added-a.added);if(!mine.length)return;
 let last=await get('meta','last:'+project.id);if(!mine.some(p=>p.id===last))last=mine[0].id;const lp=await get('meta','lastPage');await openPlan(last,lp&&lp.plan===last?lp.page:1)}
$('#projSel').onchange=e=>loadProject(e.target.value);
$('#projNew').onclick=async()=>{const n=await uiPrompt('New project name:','Project '+(($('#projSel').options.length||0)+1));if(!n||!n.trim())return;const p={id:'p'+uid(),name:n.trim(),created:Date.now()};await put('projects',p);await loadProject(p.id)};
$('#projRen').onclick=async()=>{if(!project)return;const n=await uiPrompt('Rename project:',project.name);if(!n||!n.trim())return;project.name=n.trim();await put('projects',project);await refreshProjects()};
async function deletePlanData(id){for(const m of await byIdx('markups','planId',id))await del('markups',m.id);for(const p of await byIdx('pins','planId',id)){for(const m of await byIdx('media','pinId',p.id))await del('media',m.id);await del('pins',p.id)}await del('plans',id)}
$('#planDel').onclick=async()=>{if(!plan)return;const cur=plan,mine=(await all('plans')).filter(x=>x.projectId===cur.projectId),dups=mine.filter(x=>x.id!==cur.id&&x.name===cur.name&&x.blob?.size===cur.blob?.size);
 if(!await uiConfirm(`Delete plan "${cur.name}" and its markups, pins and media? This cannot be undone.`))return;let ids=[cur.id];
 if(dups.length&&await uiConfirm(`Also delete ${dups.length} duplicate upload(s) of this same file (same name and size), including any markups on them?`))ids=ids.concat(dups.map(x=>x.id));
 stopAll();hideErr();for(const id of ids)await deletePlanData(id);await loadProject(project.id)};
$('#projDel').onclick=async()=>{if(!project)return;const mine=(await all('plans')).filter(p=>p.projectId===project.id);
 if(!await uiConfirm(`Delete project "${project.name}" and its ${mine.length} plan(s), markups, pins and media? This cannot be undone.`))return;
 stopAll();for(const pl of mine)await deletePlanData(pl.id);
 await del('projects',project.id);await del('meta','last:'+project.id);project=null;await loadProject(null)};
// ---------- boot ----------
// bpm-v122: a new service worker must not reload the open page. That dropped whatever was typed in the pin card or a walk note. Show Update ready and reload only when Reload is tapped (a dirty pin card is saved first).
function offerUpdate(){const b=$('#updBar');if(!b||!b.hidden)return;b.hidden=false;try{window.pinCardPlace&&pinCardPlace()}catch{}}
window.offerUpdate=offerUpdate;
$('#updReload').onclick=async()=>{const btn=$('#updReload');btn.disabled=true;try{if(dlg.open&&pinDirty()){if(pinBlockStop()){btn.disabled=false;return}await commitPin()}location.reload()}catch(e){btn.disabled=false;showErr('Could not save the open device before reload: '+(e&&e.message||e))}};
if('serviceWorker'in navigator&&location.protocol.startsWith('http')){const had=!!navigator.serviceWorker.controller;let done=0;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!done){done=1;offerUpdate()}});navigator.serviceWorker.register('sw.js')}

// ---------- photo annotation (original kept; annotated copy saved on the media record) ----------
const ann={m:null,img:null,shapes:[],tool:'arrow',drag:null};const acv=$('#annCv'),actx=acv.getContext('2d');
async function annotate(m){ann.m=m;ann.shapes=structuredClone(m.annShapes||[]);const u=URL.createObjectURL(m.blob),im=new Image();await new Promise((r,j)=>{im.onload=r;im.onerror=()=>j(new Error('Could not open photo'));im.src=u});URL.revokeObjectURL(u);
 const k=Math.min(1,2400/Math.max(im.width,im.height));acv.width=Math.round(im.width*k);acv.height=Math.round(im.height*k);ann.img=im;annDraw();$('#annDlg').showModal();fitAnn()}
function fitAnn(){if(!$('#annDlg').open)return;const W=$('#annWrap').clientWidth,H=$('#annWrap').clientHeight,k=Math.min(W/acv.width,H/acv.height);acv.style.width=Math.floor(acv.width*k)+'px';acv.style.height=Math.floor(acv.height*k)+'px'}addEventListener('resize',fitAnn);
function annLW(){return Math.max(3,Math.round(Math.max(acv.width,acv.height)/120))}
function annShape(c,s){c.save();c.strokeStyle=c.fillStyle=s.c;c.lineWidth=s.lw;c.lineCap=c.lineJoin='round';const x=Math.min(s.x1,s.x2),y=Math.min(s.y1,s.y2),w=Math.abs(s.x2-s.x1),h=Math.abs(s.y2-s.y1);
 if(s.t==='box')c.strokeRect(x,y,w,h);else if(s.t==='circle'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2||1,h/2||1,0,0,7);c.stroke()}
 else if(s.t==='arrow'){c.beginPath();c.moveTo(s.x1,s.y1);c.lineTo(s.x2,s.y2);c.stroke();const a=Math.atan2(s.y2-s.y1,s.x2-s.x1),L=s.lw*5;c.beginPath();c.moveTo(s.x2-L*Math.cos(a-.45),s.y2-L*Math.sin(a-.45));c.lineTo(s.x2,s.y2);c.lineTo(s.x2-L*Math.cos(a+.45),s.y2-L*Math.sin(a+.45));c.stroke()}
 else if(s.t==='pen'){c.beginPath();s.pts.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke()}
 else if(s.t==='text'){c.font=`bold ${s.lw*5}px sans-serif`;c.textBaseline='top';c.lineWidth=s.lw*1.5;c.strokeStyle='#fff';c.strokeText(s.text,s.x1,s.y1);c.fillText(s.text,s.x1,s.y1)}c.restore()}
function annDraw(){actx.drawImage(ann.img,0,0,acv.width,acv.height);for(const s of ann.shapes)annShape(actx,s);if(ann.drag)annShape(actx,ann.drag);$('#annUndo').disabled=!ann.shapes.length}
const annPt=e=>{const r=acv.getBoundingClientRect();return[(e.clientX-r.left)*acv.width/r.width,(e.clientY-r.top)*acv.height/r.height]};
acv.addEventListener('pointerdown',async e=>{acv.setPointerCapture(e.pointerId);const[x,y]=annPt(e),c=$('#annColor').value,lw=annLW();
 if(ann.tool==='text'){const t=await uiPrompt('Text:');if(t&&t.trim()){ann.shapes.push({t:'text',text:t.trim(),x1:x,y1:y,x2:x,y2:y,c,lw});annDraw()}return}
 ann.drag={t:ann.tool,x1:x,y1:y,x2:x,y2:y,c,lw,pts:[[x,y]]}});
acv.addEventListener('pointermove',e=>{if(!ann.drag)return;const[x,y]=annPt(e);ann.drag.x2=x;ann.drag.y2=y;if(ann.drag.t==='pen')ann.drag.pts.push([x,y]);annDraw()});
const annUp=()=>{const d=ann.drag;ann.drag=null;if(d&&(d.t==='pen'?d.pts.length>1:Math.hypot(d.x2-d.x1,d.y2-d.y1)>4)){if(d.t!=='pen')delete d.pts;ann.shapes.push(d)}annDraw()};acv.addEventListener('pointerup',annUp);acv.addEventListener('pointercancel',annUp);
document.querySelectorAll('[data-at]').forEach(b=>b.onclick=()=>{ann.tool=b.dataset.at;document.querySelectorAll('[data-at]').forEach(x=>x.classList.toggle('on',x===b))});
$('#annUndo').onclick=()=>{ann.shapes.pop();annDraw()};$('#annCancel').onclick=()=>$('#annDlg').close();
$('#annSave').onclick=async()=>{const m=ann.m;if(ann.shapes.length){annDraw();m.annot=await new Promise(r=>acv.toBlob(r,'image/jpeg',.9));m.annShapes=structuredClone(ann.shapes)}else{delete m.annot;delete m.annShapes}m.showOrig=false;await put('media',m);$('#annDlg').close();showMedia();if($('#panel').classList.contains('defmode'))renderDefs()};

// ---------- inspection report + checklist CSV ----------
function pdfCounts(doc,C,y){doc.setFontSize(10);const row=(a,b,c,d,e,bold)=>{if(y>760){doc.addPage([612,792],'p');y=40}doc.setFont(undefined,bold?'bold':'normal');doc.text(String(a),40,y);[b,c,d,e].forEach((v,i)=>doc.text(String(v),300+i*70,y));y+=14};
 row('Type','Total','Tested','In progress','Untested',1);for(const b of C.plans.filter(b=>b.rows.length)){y+=4;row(b.pl.name.slice(0,55),'','','','',1);for(const r of b.rows)row('  '+TYPES[r.t].n,r.n,r.te,r.ip,r.un)}
 y+=4;row('Project total','','','','',1);for(const r of C.total)row('  '+TYPES[r.t].n,r.n,r.te,r.ip,r.un);const t=C.total.reduce((a,r)=>[a[0]+r.n,a[1]+r.te,a[2]+r.ip,a[3]+r.un],[0,0,0,0]);row('All devices',...t,1);doc.setFont(undefined,'normal');return y}
const sortAddr=(a,b)=>String(a.address).localeCompare(b.address,undefined,{numeric:true});
$('#reportPdf').onclick=async()=>{if(!project)return;await pnAll();busy(1,'Building report');try{const D=await projData(),all_=D.flatMap(d=>d.pins),c=cntSt(all_),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});const tn=tester===null?await get('meta','tester'):tester;
 let y=0;const need=h=>{if(y+h>760){doc.addPage();y=44}},H=t=>{need(40);y+=8;doc.setFontSize(13);doc.setFont(undefined,'bold');doc.text(t,40,y+12);doc.setFont(undefined,'normal');doc.setDrawColor(150);doc.line(40,y+17,572,y+17);y+=30;doc.setFontSize(10)},L=(t,x=40,col)=>{const ls=doc.splitTextToSize(String(t),572-x);need(ls.length*13);if(col)doc.setTextColor(...col);doc.text(ls,x,y+10);doc.setTextColor(0,0,0);y+=ls.length*13};
 doc.setFillColor(30,41,59);doc.rect(0,0,612,78,'F');doc.setTextColor(255,255,255);doc.setFontSize(18);doc.setFont(undefined,'bold');doc.text('Fire Alarm Inspection Report',40,34);doc.setFont(undefined,'normal');doc.setFontSize(11);
 doc.text(`Project: ${project.name}`,40,54);doc.text(`Date: ${fmtT(Date.now())}    Tester: ${tn||'-'}    Plans: ${D.length}`,40,68);doc.setTextColor(0,0,0);y=92;
 H('Summary');L(`${c.pct}% tested (${c.passed+c.failed+c.corr} of ${c.t} devices)`);L(`Passed: ${c.passed}    Failed: ${c.failed}    Corrected: ${c.corr}    In progress: ${c.ip}    Not tested: ${c.nt}`);
 need(16);const bw=532;let bx=40;for(const[k,v]of[['passed',c.passed],['failed',c.failed],['corrected',c.corr],['in progress',c.ip],['not tested',c.nt]]){if(!c.t||!v)continue;const w=bw*v/c.t,h=ST[k];doc.setFillColor(parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16));doc.rect(bx,y+2,w,10,'F');bx+=w}y+=18;
 H('Device counts');y=pdfCounts(doc,countRows(D),y+10)+4;
 const defs=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='failed').map(p=>({pl,p}))).sort((a,b)=>(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1));
 H(`Deficiencies (${defs.length})`);if(!defs.length)L('None.');
 for(const{pl,p}of defs){const ph=await firstPhoto(p.id);let im=null;if(ph)try{im=await blobJpeg(ph,600)}catch{}const ih=im?Math.min(110,im.h*(150/im.w)):0;need(Math.max(ih,56)+8);const y0=y;
  doc.setFont(undefined,'bold');L(`${p.severity||'-'}: ${TYPES[p.type]?.n||p.type} ${p.address||''}${p.location?' @ '+p.location:''}`,40,p.severity==='Critical'?[185,28,28]:null);doc.setFont(undefined,'normal');
  L(`Reason: ${p.reason||'-'}${p.reasonText?' - '+failReasonText(p.reasonText):''}`,48);if(p.codes?.length)L(`Codes: ${fmtCodes(p.codes)}`,48,[180,83,9]);L(`${pl.name} ${pgT(pl.id,p.page)} · ${p.testedAt?fmtT(p.testedAt):'-'}${p.tester?' · '+p.tester:''}${p.notes?' · '+p.notes:''}`,48);
  if(im){doc.addImage(im.d,'JPEG',422,y0+2,150,ih);y=Math.max(y,y0+ih+4)}y+=6}
 {const cd=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='corrected').map(p=>({pl,p})));if(cd.length){H(`Corrected deficiencies (${cd.length})`);for(const{pl,p}of cd){doc.setFont(undefined,'bold');L(`${TYPES[p.type]?.n||p.type} ${p.address||''}${p.location?' @ '+p.location:''}`,40,[8,145,178]);doc.setFont(undefined,'normal');L(`Was: ${p.severity||'-'} · ${p.reason||'-'}${p.reasonText?' - '+failReasonText(p.reasonText):''}`,48);L(corrTxt(p),48);L(`${pl.name} ${pgT(pl.id,p.page)}`,48);y+=6}}}
 H('Device checklist results');
 for(const{pl,pins:ps}of D){if(!ps.length)continue;need(30);doc.setFontSize(12);doc.setFont(undefined,'bold');L(pl.name);doc.setFontSize(10);doc.setFont(undefined,'normal');let lp=null;
  for(const p of ps.slice().sort(sortAddr)){
   const h=ST[p.status]||ST['not tested'];need(28);doc.setFillColor(parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16));doc.circle(54,y+7,4,'F');
   doc.setFont(undefined,'bold');L(`${TYPES[p.type]?.n||p.type} ${p.address||'(no address)'} - ${p.status}${p.testedAt?'  '+fmtT(p.testedAt):''}${p.tester?' by '+p.tester:''}`,64);doc.setFont(undefined,'normal');
   for(const ck of p.checks||[]){need(13);doc.text(ck.v==='fail'?failItemLabel(ck.t):ck.t,72,y+10);const v=ck.v||'';doc.setTextColor(...(v==='fail'?[185,28,28]:v==='pass'?[21,128,61]:[100,116,139]));doc.text(CV[v]||'—',470,y+10);doc.setTextColor(0,0,0);y+=13}
   if(rdTxt(p))L('Readings: '+rdTxt(p),72,[14,116,144]);if(!p.checks)L('(no checklist recorded)',72,[100,116,139]);y+=4}}
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(120);doc.text(`${project.name} · Inspection report · page ${i} of ${n}`,40,780);doc.setTextColor(0)}
 dl(doc.output('blob'),project.name.replace(/[\\/:*?"<>|]/g,'_')+'-inspection-report.pdf')}catch(e){showErr('Report failed: '+e.message)}finally{busy(0)}};
$('#checkCsv').onclick=async()=>{await pnAll();const rows=[['plan','page','page name','type','address','location','status','item','result','tested','tester']];/* status column shows "corrected" for fixed deficiencies */
 for(const{pl,pins:ps}of await projData())for(const p of ps.slice().sort(sortAddr)){const base=[pl.name,p.page,pnm(pl.id,p.page),TYPES[p.type]?.n||p.type,p.address,p.location||'',p.status];const tt=[p.testedAt?fmtT(p.testedAt):'',p.tester||''];
  if(p.checks?.length)for(const c of p.checks)rows.push([...base,c.v==='fail'?failItemLabel(c.t):c.t,CV[c.v]||'',...tt]);else rows.push([...base,'(no checklist)','',...tt])}
 csvDl(rows,'-checklists.csv')};
