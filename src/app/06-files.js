// ---------- v10: .bpm project file (ZIP, stored entries, see FORMAT.md) ----------
const BPM_VER=1,BPM_FMT='blueprint-markup-project';
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
async function crcBlob(b,onP){let c=0xFFFFFFFF;const CH=4<<20;for(let o=0;o<b.size;o+=CH){const u=new Uint8Array(await b.slice(o,o+CH).arrayBuffer());for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);onP&&onP(u.length)}return(c^0xFFFFFFFF)>>>0}
// store-only ZIP: the output Blob references the source blobs, so big videos are never copied into one buffer
async function zipBlob(files,onP){const parts=[],cd=[],enc=new TextEncoder();let off=0;if(files.length>65000)throw new Error('too many files for one archive');
 for(const f of files){const nm=enc.encode(f.name),sz=f.blob.size,crc=await crcBlob(f.blob,onP);if(sz>=0xFFFFFFFF||off+sz+nm.length+30>=0xFFFFFFFF)throw new Error('the project is over 4 GB, too large for one file');
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);parts.push(h.buffer,nm,f.blob);
  const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);cd.push(c.buffer,nm);off+=30+nm.length+sz}
 const cs=cd.reduce((a,b)=>a+b.byteLength,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
 return new Blob([...parts,...cd,e.buffer],{type:'application/zip'})}
async function unzipBlob(b){const T=Math.max(0,b.size-65557),tail=new DataView(await b.slice(T).arrayBuffer());let i=tail.byteLength-22;for(;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50)break;if(i<0)throw new Error('this is not a .bpm project file (no ZIP directory found)');
 const n=tail.getUint16(i+10,true),cs=tail.getUint32(i+12,true),co=tail.getUint32(i+16,true);if(co+cs>b.size)throw new Error('the file is truncated');const cdv=new DataView(await b.slice(co,co+cs).arrayBuffer()),out=new Map(),dec=new TextDecoder();let p=0;
 for(let k=0;k<n;k++){if(cdv.getUint32(p,true)!==0x02014b50)throw new Error('the file is damaged (bad directory)');const meth=cdv.getUint16(p+10,true),crc=cdv.getUint32(p+16,true),csz=cdv.getUint32(p+20,true),nl=cdv.getUint16(p+28,true),el=cdv.getUint16(p+30,true),cl=cdv.getUint16(p+32,true),lo=cdv.getUint32(p+42,true),name=dec.decode(new Uint8Array(cdv.buffer,p+46,nl));p+=46+nl+el+cl;
  const lh=new DataView(await b.slice(lo,lo+30).arrayBuffer());if(lh.getUint32(0,true)!==0x04034b50)throw new Error('the file is damaged ('+name+')');const ds=lo+30+lh.getUint16(26,true)+lh.getUint16(28,true);let blob=b.slice(ds,ds+csz);
  if(meth===8)blob=await new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();else if(meth!==0)throw new Error('unsupported compression in '+name);out.set(name,{blob,crc})}return out}
const fsafe=s=>String(s||'project').replace(/[\\/:*?"<>|]+/g,'_').trim()||'project';
async function buildBpm(pid,withLearned,onP){const pr=await get('projects',pid),pls=(await all('plans')).filter(p=>p.projectId===pid).sort((a,b)=>a.added-b.added),files=[];
 const man={format:BPM_FMT,version:BPM_VER,app:'bpm-v105',saved:new Date().toISOString(),project:pr,plans:[],markups:[],pins:[],media:[],layers:{},meta:{},learned:null,mycodes:null};
 for(const pl of pls){const{blob,...m}=pl,f=`plans/${pl.id}.${pl.kind==='pdf'?'pdf':((blob?.type||'').split('/')[1]||'img')}`;if(blob)files.push({name:f,blob});man.plans.push({...m,file:blob?f:null,type:blob?.type||'',size:blob?.size||0});
  man.markups.push(...await byIdx('markups','planId',pl.id));const ps=await byIdx('pins','planId',pl.id);man.pins.push(...ps);
  for(const p of ps)for(const md of await byIdx('media','pinId',p.id,true)){const{blob:mb,annot,...r}=md,e={...r,file:null};if(mb){e.file=`media/${md.id}`;e.type=mb.type;e.size=mb.size;files.push({name:e.file,blob:mb})}if(annot){e.annotFile=`media/${md.id}-annot`;e.annotType=annot.type;files.push({name:e.annotFile,blob:annot})}man.media.push(e)}
  const ly=await get('meta','layers:'+pl.id);if(ly)man.layers[pl.id]=ly;const sc=await get('meta','scale:'+pl.id);if(sc)(man.scales??={})[pl.id]=sc;const ro=await get('meta','rot:'+pl.id);if(ro)(man.rots??={})[pl.id]=ro;const pn=await get('meta','pname:'+pl.id);if(pn&&Object.keys(pn).length)(man.pnames??={})[pl.id]=pn}
 const last=await get('meta','last:'+pid);if(last)man.meta.last=last;const job=await get('meta','job:'+pid);if(job)man.meta.job=job;if(withLearned)man.learned=await all('learned');man.mycodes=await all('mycodes');man.installLinks=(await get('meta','installLinks'))||null;man.userParts=(await get('meta','userParts'))||null;man.cktpl=Object.keys(CKT).length?CKT:null;
 {// bpm-v72: human-readable reports inside the archive (ignored on import)
  const q=v=>/[",\n]/.test(String(v??''))?'"'+String(v).replace(/"/g,'""')+'"':String(v??''),pm=new Map(man.plans.map(p=>[p.id,p.name])),rows=[['plan','page','type','address','model','location','status','reason','severity','codes','tested','tester','notes'],...man.pins.map(p=>[pm.get(p.planId)||'',p.page,TYPES[p.type]?.n||p.type,p.address,p.model||'',p.location||'',p.status,p.reason||'',p.severity||'',(p.codes||[]).map(c=>c.code+' '+c.section).join('; '),p.testedAt?new Date(p.testedAt).toISOString():'',p.tester||'',p.notes||''])];
  files.push({name:'reports/device-list.csv',blob:new Blob([rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv'})});if(job)files.push({name:'reports/job-info.json',blob:new Blob([JSON.stringify(job,null,1)],{type:'application/json'})})}
 man.models=await get('meta','models:custom')||null;man.changelog=(await get('meta','chlog:'+pid))||null;
 files.unshift({name:'project.json',blob:new Blob([JSON.stringify(man)],{type:'application/json'})});const tot=files.reduce((a,f)=>a+f.blob.size,0);let done=0;return zipBlob(files,n=>{done+=n;onP&&onP(done/tot)})}
async function readBpm(file){const z=await unzipBlob(file),mj=z.get('project.json');if(!mj)throw new Error('this file has no project.json, it is not a Marker project');let man;try{man=JSON.parse(await mj.blob.text())}catch{throw new Error('project.json is damaged')}
 if(man.format!==BPM_FMT)throw new Error('this is not a Marker project file');if(!Number.isInteger(man.version)||man.version<1)throw new Error('unknown project file version');if(man.version>BPM_VER)throw new Error(`this file was saved by a newer app (format v${man.version}; this app reads up to v${BPM_VER}). Reload the app to update it, then try again.`);
 for(const k of['plans','markups','pins','media'])if(!Array.isArray(man[k]))throw new Error('project.json is missing '+k);return{z,man}}
async function importBpm(file,replaceId,onP){const{z,man}=await readBpm(file);
 const ent=async(n,type)=>{const e=z.get(n);if(!e)throw new Error('the file is missing '+n);if(await crcBlob(e.blob)!==e.crc)throw new Error(n+' is damaged (checksum mismatch)');return new Blob([await e.blob.arrayBuffer()],{type:type||''})};
 const idm=new Map(),nid=o=>{if(!idm.has(o))idm.set(o,uid()+Math.random().toString(36).slice(2,5));return idm.get(o)};
 const pid=replaceId||'p'+uid(),names=(await all('projects')).filter(p=>p.id!==replaceId).map(p=>p.name);let name=man.project?.name||file.name.replace(/\.(bpm|marker)$/i,'');if(!replaceId&&names.includes(name))name+=' (opened)';
 // 1) read + verify every blob before touching the database
 const plans=[],media=[],N=man.plans.length+man.media.length;let k=0;const tick=()=>onP&&onP(++k/Math.max(1,N));
 for(const m of man.plans){const{file:f,type,size,...r}=m;plans.push({...r,...(man.split?{srcPlan:r.srcPlan||m.id}:{}),id:nid(m.id),projectId:pid,blob:f?await ent(f,type):new Blob([])});tick()}/* bpm-v135: a split copy remembers each plan's origin id so new pins and drawings merge back onto the right plan */
 const planIds=new Set(man.plans.map(p=>p.id)),pinsIn=man.pins.filter(p=>planIds.has(p.planId)).map(p=>{const t=typeof migPanelType==='function'&&migPanelType(p);return t?{...p,type:t}:p}),pinIds=new Set(pinsIn.map(p=>p.id));
 for(const m of man.media){if(!pinIds.has(m.pinId))continue;const{file:f,type,size,annotFile,annotType,...r}=m,o={...r,id:nid(m.id),pinId:nid(m.pinId)};if(f)o.blob=await ent(f,type);if(annotFile)o.annot=await ent(annotFile,annotType);media.push(o);tick()}
 const mk=man.markups.filter(m=>planIds.has(m.planId)).map(m=>({...m,id:nid(m.id),planId:nid(m.planId)})),pn=pinsIn.map(p=>({...p,id:nid(p.id),planId:nid(p.planId)}));
 // 2) write everything; on failure remove what was written
 const wrote=[];try{for(const p of plans){await put('plans',p);wrote.push(['plans',p.id])}for(const m of mk){await put('markups',m);wrote.push(['markups',m.id])}for(const p of pn){await put('pins',p);wrote.push(['pins',p.id])}for(const m of media){await put('media',m);wrote.push(['media',m.id])}
  for(const[o,l]of Object.entries(man.layers||{}))if(idm.has(o))await put('meta',l,'layers:'+idm.get(o));
  for(const[o,l]of Object.entries(man.pnames||{}))if(idm.has(o)&&l&&typeof l==='object'){const c={};for(const[k,v]of Object.entries(l))if(+k>0&&typeof v==='string'&&v.trim())c[+k]=v.trim().slice(0,80);await put('meta',c,'pname:'+idm.get(o))}
  for(const[o,l]of Object.entries(man.rots||{}))if(idm.has(o)&&l&&typeof l==='object')await put('meta',l,'rot:'+idm.get(o));
  if(man.cktpl&&typeof man.cktpl==='object'&&!Object.keys(CKT).length){CKT=sanTpl(man.cktpl);await put('meta',CKT,'cktpl')}
  for(const[o,l]of Object.entries(man.scales||{}))if(idm.has(o)&&l&&typeof l==='object')await put('meta',l,'scale:'+idm.get(o));
  let nl=0;if(Array.isArray(man.learned)&&man.learned.length){const have=new Set((await all('learned')).map(r=>r.id));for(const r of man.learned)if(r&&r.fp&&r.g&&!have.has(r.id)){await put('learned',r);nl++}lrCache=null;learnInfoUpd()}
  let nm=0;if(Array.isArray(man.mycodes)&&man.mycodes.length){const have=new Set((await all('mycodes')).map(r=>r.id));for(const r of man.mycodes)if(r&&r.section&&r.title&&!have.has(r.id)){await put('mycodes',{...r,id:r.id||uid(),personal:true});nm++}MY_CODES=null}
  if(man.installLinks&&typeof man.installLinks==='object'){await userLinks();for(const[m,v]of Object.entries(man.installLinks))if(v&&isHttp(v.url)&&(!ULINKS[m]||(+v.ts||0)>(+ULINKS[m].ts||0)))ULINKS[m]={url:String(v.url).trim(),ts:+v.ts||Date.now()};await put('meta',ULINKS,'installLinks')}
  if(man.userParts&&typeof man.userParts==='object'){await userParts();for(const[m,v]of Object.entries(man.userParts))if(m&&v&&typeof v==='object'&&!UPARTS[m]){UPARTS[m]={d:String(v.d||''),c:String(v.c||'My devices'),t:TYPES[v.t]?v.t:'',ts:+v.ts||Date.now()};if(UPARTS[m].t)await rememberModel(UPARTS[m].t,m)}await put('meta',UPARTS,'userParts')}
  if(replaceId){const old=(await all('plans')).filter(p=>p.projectId===replaceId&&!plans.some(x=>x.id===p.id));for(const o of old)await deletePlanData(o.id);const pr=await get('projects',replaceId);await put('projects',{...pr,...man.project,id:replaceId,name,created:pr?.created||Date.now()})}
  else await put('projects',{...man.project,id:pid,name,created:Date.now()});
  if(man.meta?.last&&idm.has(man.meta.last))await put('meta',idm.get(man.meta.last),'last:'+pid);
  if(man.meta?.job)await put('meta',man.meta.job,'job:'+pid);if(man.models&&typeof man.models==='object'){const cm=await get('meta','models:custom')||{};for(const[t,l]of Object.entries(man.models))if(Array.isArray(l))cm[t]=[...new Set([...(cm[t]||[]),...l.map(String)])];await put('meta',cm,'models:custom');MODELS_C=cm}
  return{pid,name,plans:plans.length,markups:mk.length,pins:pn.length,media:media.length,learned:nl,mycodes:nm}}
 catch(e){for(const[s,id]of wrote.reverse())try{await del(s,id)}catch{}throw e}}
// deliver a file: save picker (desktop Chrome/Edge), else share sheet, else a normal download
async function deliver(name,mime,ext,make){let h=null;if(window.showSaveFilePicker){try{h=await showSaveFilePicker({suggestedName:name,types:[{description:ext==='.bpm'?'Marker project':ext.toUpperCase().slice(1)+' file',accept:{[mime]:[ext]}}]})}catch(e){if(e.name==='AbortError')return null;h=null}}
 const blob=await make();if(h){const w=await h.createWritable();await w.write(blob);await w.close();return'saved as '+h.name}
 const f=new File([blob],name,{type:mime});if(navigator.canShare&&navigator.share&&matchMedia('(pointer:coarse)').matches){try{if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return'shared'}}catch(e){if(e.name==='AbortError')return null}}
 dl(blob,name);return'downloaded'}
$('#projSave').onclick=async()=>{if(!project)return;const n=(await learnedRules()).length;$('#svLN').textContent=n?`(${n})`:'(none yet)';$('#svLearned').disabled=!n;$('#exInfo').textContent='';$('#saveDlg').showModal()};
$('#svGo').onclick=async()=>{const pr=project,wl=$('#svLearned').checked;$('#saveDlg').close();busy(1,'Saving project');prog(0);
 try{const r=await deliver(fsafe(pr.name)+'.bpm','application/octet-stream','.bpm',async()=>{const b=await buildBpm(pr.id,wl,prog);window.__lastBpm=b;return b});if(r){toast(`Project "${pr.name}" ${r} (${(window.__lastBpm.size/1048576).toFixed(1)} MB)`);window.bkSaved&&bkSaved(pr.id)}}catch(e){showErr('Saving the project failed: '+e.message)}finally{busy(0)}};
let opFile=null;$('#bpmFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;hideErr();try{const{man}=await readBpm(f);opFile=f;
 $('#opInfo').innerHTML=`<b>${esc(man.project?.name||f.name)}</b><br><small style="color:#a2a2a2">${man.plans.length} plan(s), ${man.markups.length} markups, ${man.pins.length} pins, ${man.media.length} media · saved ${esc((man.saved||'').slice(0,16).replace('T',' '))} UTC${man.learned?.length?` · ${man.learned.length} learned rules (merged)`:''}</small>`;
 $('#opCur').textContent=project?`"${project.name}"`:'';document.querySelector('#openDlg [name=opMode][value=new]').checked=true;$('#openDlg').showModal()}catch(err){showErr(`Could not open "${f.name}": ${err.message}`)}};
$('#opGo').onclick=async()=>{const f=opFile,rep=document.querySelector('#openDlg [name=opMode]:checked').value==='replace'&&project;if(!f)return;
 if(rep&&!await uiConfirm(`Replace project "${project.name}" with the contents of this file? Its current plans, markups, pins and media will be deleted.`))return;$('#openDlg').close();opFile=null;stopAll();busy(1,'Opening project');prog(0);
 try{const r=await importBpm(f,rep?project.id:null,prog);if(rep)project=null;busy(0);await loadProject(r.pid);toast(`Opened "${r.name}": ${r.plans} plan(s), ${r.pins} pins, ${r.markups} markups, ${r.media} media`)}catch(e){showErr('Opening the project failed: '+e.message)}finally{busy(0)}};
// ---------- v10/v11: export all plans (vector overlay via pdf-lib) ----------
async function planPdf(pl,onPage,outDoc=null){
 await loadScale(pl.id);const L={...LAY0,...((await get('meta','layers:'+pl.id))||{})},mks=await byIdx('markups','planId',pl.id),pns=await byIdx('pins','planId',pl.id);
 const r=await exportPlanPdf(pl,mks,pns,L,onPage,outDoc);return r}
$('#exGo').onclick=async()=>{if(!project)return;const pr=project,mode=document.querySelector('#saveDlg [name=exMode]:checked').value,orig=$('#exOrig').checked;$('#saveDlg').close();busy(1,'Exporting plans');prog(0);
 try{const pls=(await all('plans')).filter(p=>p.projectId===pr.id).sort((a,b)=>a.added-b.added);if(!pls.length)throw new Error('this project has no plans');const zipOut=mode==='zip'||orig,base=fsafe(pr.name);
  const r=await deliver(base+(zipOut?'-plans.zip':'-plans.pdf'),zipOut?'application/zip':'application/pdf',zipOut?'.zip':'.pdf',async()=>{const files=[],used=new Set(),uniq=n=>{let o=n,k=2;while(used.has(o.toLowerCase()))o=n.replace(/(\.[^.]+)?$/,` (${k++})$1`);used.add(o.toLowerCase());return o};let tot=0;
   let one=null;const bt=t=>$('#busyTxt').textContent=t;
   for(let j=0;j<pls.length;j++){const pl=pls[j],stem=fsafe(pl.name.replace(/\.[^.]+$/,'')),op=(i,n)=>{bt(`Exporting ${j+1}/${pls.length}: page ${i}/${n}`);prog((j+i/n)/pls.length)};
    if(mode==='one'){const r=await planPdf(pl,op,one);one=r.doc;tot+=r.pages}
    else{const r=await planPdf(pl,op);const b=await r.doc.save();files.push({name:uniq(`${stem}-marked.pdf`),blob:new Blob([b],{type:'application/pdf'})});tot+=r.pages}
    if(orig&&pl.blob?.size)files.push({name:uniq('original/'+fsafe(pl.name)),blob:pl.blob})}
   if(one){const b=await one.save();files.unshift({name:uniq(base+'-plans.pdf'),blob:new Blob([b],{type:'application/pdf'})})}
   window.__lastExport={pages:tot,files:files.map(f=>[f.name,f.blob.size]),selectable:true};return zipOut?zipBlob(files):files[0].blob});
  if(r)toast(`Exported ${window.__lastExport.pages} page(s) from ${pls.length} plan(s), ${r}`)}catch(e){showErr('Export failed: '+e.message)}finally{busy(0)}};

// ---------- v11: selectable plan PDF (pdf-lib vector page + transparent markup overlay) ----------
const hexRgb=h=>{h=(h||'#000').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255}};
async function pageHasText(jsPage){try{const tc=await jsPage.getTextContent();let n=0;for(const it of tc.items){if((it.str||'').trim()){n++;if(n>=3)return true}}return n>0}catch{return false}}
async function rasterPageOverlay(W,H,drawFn){const sc=Math.min(2.5,Math.sqrt(16e6/(W*H)));const c=document.createElement('canvas');c.width=Math.round(W*sc);c.height=Math.round(H*sc);const x=c.getContext('2d');x.setTransform(sc,0,0,sc,0,0);drawFn(x,1/Math.max(1,Math.max(W,H)/1200),sc);const blob=await new Promise(r=>c.toBlob(r,'image/png'));c.width=c.height=0;return blob}
function drawEmbRotated(page,emb,rot,W,H){const{degrees}=PDFLib,ew=emb.width,eh=emb.height; // bpm-v105: rot = clockwise display rotation (PDF /Rotate + in-app Rotate); pdf-lib rotates counter-clockwise about (x,y)
 if(rot===90)page.drawPage(emb,{x:0,y:H,width:ew,height:eh,rotate:degrees(270)});
 else if(rot===180)page.drawPage(emb,{x:W,y:H,width:ew,height:eh,rotate:degrees(180)});
 else if(rot===270)page.drawPage(emb,{x:W,y:0,width:ew,height:eh,rotate:degrees(90)});
 else page.drawPage(emb,{x:0,y:0,width:ew,height:eh})}
async function overlayOnPage(out,page,W,H,pngBlob){const png=await out.embedPng(await pngBlob.arrayBuffer());page.drawImage(png,{x:0,y:0,width:W,height:H})}
async function rasterFullPage(jsPage,W,H,drawFn,rot){const sc=Math.min(2.5,Math.sqrt(14e6/(W*H)));const c=document.createElement('canvas');c.width=Math.round(W*sc);c.height=Math.round(H*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(jsPage)await jsPage.render({canvasContext:x,viewport:jsPage.getViewport({scale:sc,rotation:rot??(jsPage.rotate||0)})}).promise;x.setTransform(sc,0,0,sc,0,0);drawFn(x,1/Math.max(1,Math.max(W,H)/1200),sc);
 const jpeg=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));c.width=c.height=0;return jpeg}
/** Build a marked-up PDF for one plan. If outDoc is a PDFDocument, pages are appended to it. Returns {doc,pages,blob?}. */
async function exportPlanPdf(pl,mks,pns,L,onPage,outDoc=null){const{PDFDocument}=PDFLib;const out=outDoc||await PDFDocument.create();let pages=0;
 const RT=plan&&pl.id===plan.id?ROTS:((await get('meta','rot:'+pl.id))||{});
 const expMarks=(x,ps,sc,i,vr,W,H,OH)=>{const E=L.exp,pp=pns.filter(p=>p.page===i&&(!E||pVis(p)));vrXf(x,vr,W,H,sc);CR=vr*Math.PI/180;try{for(const m of mks)if(m.page===i&&(!E||mVis(m)))drawMarkup(x,m,1/1.5);OFFMAP=pinOffsets(pp);for(const p of pp)(E?drawPinL:drawPin)(x,p,ps,false)}finally{OFFMAP=null;CR=0}x.setTransform(sc,0,0,sc,0,0);drawLegend(x,ps,pp,OH)};
 const keep=lay;lay=L||lay;try{
 if(pl.kind==='pdf'&&pl.blob?.size){const bytes=new Uint8Array(await pl.blob.arrayBuffer());const src=await PDFDocument.load(bytes,{ignoreEncryption:true});
  const js=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  try{for(let i=1;i<=js.numPages;i++){const jsp=await js.getPage(i),vp=jsp.getViewport({scale:1}),W=vp.width,H=vp.height,rot=jsp.rotate||0,vr=+(RT[i]||0),T=(rot+vr)%360,sw=vr%180!==0,OW=sw?H:W,OH=sw?W:H;
   const drawFn=(x,ps,sc)=>expMarks(x,ps,sc,i,vr,W,H,OH);
   const hasTxt=await pageHasText(jsp);
   if(hasTxt){const emb=await out.embedPage(src.getPage(i-1));const page=out.addPage([OW,OH]);drawEmbRotated(page,emb,T,OW,OH);const ov=await rasterPageOverlay(OW,OH,drawFn);await overlayOnPage(out,page,OW,OH,ov)}
   else{const jpeg=await rasterFullPage(jsp,OW,OH,drawFn,T);const img=await out.embedJpg(await jpeg.arrayBuffer());const page=out.addPage([OW,OH]);page.drawImage(img,{x:0,y:0,width:OW,height:OH})}
   jsp.cleanup();pages++;onPage&&onPage(i,js.numPages)}}finally{js.destroy()}}
 else{const im=await createImageBitmap(pl.blob);const W=im.width,H=im.height,vr=+(RT[1]||0),sw=vr%180!==0,OW=sw?H:W,OH=sw?W:H;
  const jpeg=await rasterFullPage(null,OW,OH,(x,ps,sc)=>{vrXf(x,vr,W,H,sc);x.drawImage(im,0,0,W,H);expMarks(x,ps,sc,1,vr,W,H,OH)});const img=await out.embedJpg(await jpeg.arrayBuffer());const page=out.addPage([OW,OH]);page.drawImage(img,{x:0,y:0,width:OW,height:OH});pages=1;onPage&&onPage(1,1)}
 }finally{lay=keep}
 if(!outDoc){try{out.setTitle((pl.name||'plan')+' (marked up)');out.setProducer('Marker')}catch{}}
 return{doc:out,pages}}
async function mergePdfBlobs(blobs){const{PDFDocument}=PDFLib;const out=await PDFDocument.create();
 for(const b of blobs){const src=await PDFDocument.load(await b.arrayBuffer());const pages=await out.copyPages(src,src.getPageIndices());for(const pg of pages)out.addPage(pg)}
 return new Blob([await out.save()],{type:'application/pdf'})}

// ---------- v11: code references catalog + personal library ----------
const fmtCodes=(cs)=>!cs?.length?'':cs.map(c=>`${c.code} ${c.section}`).join('; ');
const fmtCodeLine=c=>`${c.code} ${c.section} — ${c.title}`;
let CODE_CAT=[],MY_CODES=null,CODE_FAV=[];
async function loadCodes(){if(!CODE_CAT.length){try{CODE_CAT=await(await fetch('codes.json')).json()}catch{CODE_CAT=[]}}
 if(!MY_CODES)MY_CODES=await all('mycodes');CODE_FAV=(await get('meta','codeFav'))||[];return CODE_CAT}
async function allCodeEntries(){await loadCodes();return[...MY_CODES.map(c=>({...c,personal:true})),...CODE_CAT]}
function failedCkText(){return(ckl||[]).filter(c=>c.v==='fail').map(c=>c.t).join(' ').toLowerCase()}
function scoreCode(c,reason,type,ck){let s=0;const pers=!!c.personal;
 if(pers)s+=20; // personal library preferred
 if(c.reasons?.includes(reason))s+=8;
 if(c.types?.includes(type))s+=5;
 const tags=Array.isArray(c.tags)?c.tags:(c.tags?[c.tags]:[]);const blob=`${c.title} ${c.sum||c.text||''} ${tags.join(' ')}`.toLowerCase();
 if(reason){const r=reason.toLowerCase().split('/')[0].trim();if(r&&blob.includes(r))s+=2}
 if(type&&blob.includes(type))s+=1;
 if(ck){for(const w of ck.split(/\W+/).filter(x=>x.length>4)){if(blob.includes(w)){s+=2;break}}}
 return s}
let SUG=[];
async function suggestCodes(){const all=await allCodeEntries();if(!cur)return;const reason=form.elements.reason?.value||cur.reason||'',type=form.elements.type?.value||cur.type||'',ck=failedCkText();
 const scored=all.map(c=>({c,s:scoreCode(c,reason,type,ck)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||a.c.section.localeCompare(b.c.section,undefined,{numeric:true})).slice(0,8);
 SUG=scored.map(x=>x.c);
 const have=new Set((cur.codes||[]).map(c=>c.code+'|'+c.section));
 const left=SUG.filter(c=>!have.has(c.code+'|'+c.section));
 const html=left.length?'<small style="color:#a2a2a2">Suggested (personal first)</small>'+left.map(c=>`<button type="button" class="btn" data-id="${esc(c.id)}">${c.personal?'📌 ':''}<b>${esc(fmtCodeLine(c))}</b></button>`).join(''):'';
 for(const sel of['#codeSug','#codeSugDlg']){const box=$(sel);if(!box)continue;box.innerHTML=html;box.querySelectorAll('[data-id]').forEach(b=>b.onclick=e=>{e.preventDefault();addCodeById(b.dataset.id)})}
 renderCodes()}
function codeHintUpd(){const el=$('#codeHint');if(!el)return;const crit=form.elements.severity.value==='Critical',n=cur?.codes?.length||0;
 el.textContent=crit?(n?'Critical — code reference attached.':'Critical — attach at least one code reference.'):(n?`${n} code reference(s).`:'Optional: attach NFPA 72 / IFC / IBC section references.')}
function renderCodes(){const box=$('#codeList');if(!box||!cur)return;
 box.innerHTML=(cur.codes||[]).map((c,i)=>`<button type="button" class="chip" data-i="${i}" title="${esc(c.sum||c.text||'')}"><span><b>${esc(fmtCodeLine(c))}</b></span><span class="sp"></span>✕</button>`).join('')||'<small style="color:#636363">No codes yet</small>';
 const have=new Set((cur.codes||[]).map(c=>c.code+'|'+c.section));
 const left=(SUG||[]).filter(c=>!have.has(c.code+'|'+c.section));
 if(left.length)box.insertAdjacentHTML('beforeend',`<div class="row" style="gap:6px;margin-top:4px"><button type="button" class="btn pri" id="codeConfirm">✓ Confirm</button><small style="color:#a2a2a2">Keeps attached codes; clears remaining suggestions</small></div>`);
 box.querySelectorAll('[data-i]').forEach(b=>b.onclick=e=>{e.preventDefault();cur.codes.splice(+b.dataset.i,1);renderCodes();codeHintUpd()});
 const cf=$('#codeConfirm');if(cf)cf.onclick=e=>{e.preventDefault();const n=(cur.codes||[]).length;SUG=[];const sug=$('#codeSug');if(sug)sug.innerHTML='';renderCodes();toast(n?`${n} code(s) confirmed`:'Suggestions cleared')};
 codeHintUpd()}
async function openCodePicker(){await loadCodes();$('#codeQ').value='';$('#codeDlg').showModal();renderCodeFav();suggestCodes();filterCodes('');renderMyCodesList();$('#codeQ').focus()}
function renderCodeFav(){const box=$('#codeFav');const all=[...MY_CODES,...CODE_CAT];const favs=CODE_FAV.map(id=>all.find(c=>c.id===id)).filter(Boolean).slice(0,10);
 box.innerHTML=favs.length?'<small style="width:100%;color:#a2a2a2">Recent</small>'+favs.map(c=>`<button type="button" class="chip" data-id="${esc(c.id)}">${c.personal?'📌 ':''}${esc(c.code)} ${esc(c.section)}</button>`).join(''):'';
 box.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>addCodeById(b.dataset.id))}
async function filterCodes(q){const all=await allCodeEntries();q=(q||'').trim().toLowerCase();
 const hits=(!q?all.slice(0,50):all.filter(c=>{const tg=Array.isArray(c.tags)?c.tags:[];const rs=Array.isArray(c.reasons)?c.reasons:[];return `${c.code} ${c.section} ${c.title} ${c.sum||''} ${c.text||''} ${tg.join(' ')} ${rs.join(' ')}`.toLowerCase().includes(q)})).slice(0,60);
 $('#codeHits').innerHTML=hits.map(c=>`<button type="button" class="btn" data-id="${esc(c.id)}">${c.personal?'📌 ':''}<b>${esc(fmtCodeLine(c))}</b><br><small style="color:#a2a2a2">${esc(c.sum||c.text||'')}</small></button>`).join('')||'<small>No matches</small>';
 $('#codeHits').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>addCodeById(b.dataset.id))}
async function addCodeById(id){const all=await allCodeEntries();const c=all.find(x=>x.id===id);if(c)await addCode(c)}
async function addCode(c){if(!c||!cur)return;cur.codes=cur.codes||[];if(cur.codes.some(x=>x.id===c.id||(x.code===c.code&&x.section===c.section))){toast('Already attached');return}
 cur.codes.push({id:c.id,code:c.code,section:c.section,title:c.title,sum:c.sum||c.text||'',note:'',personal:!!c.personal});
 CODE_FAV=[c.id,...CODE_FAV.filter(x=>x!==c.id)].slice(0,16);await put('meta',CODE_FAV,'codeFav');
 // refresh suggestion buttons so attached codes drop out; keep Confirm for leftovers
 const have=new Set(cur.codes.map(x=>x.code+'|'+x.section));
 const left=(SUG||[]).filter(x=>!have.has(x.code+'|'+x.section));
 const html=left.length?'<small style="color:#a2a2a2">Suggested (personal first)</small>'+left.map(x=>`<button type="button" class="btn" data-id="${esc(x.id)}">${x.personal?'📌 ':''}<b>${esc(fmtCodeLine(x))}</b></button>`).join(''):'';
 const sug=$('#codeSug');if(sug){sug.innerHTML=html;sug.querySelectorAll('[data-id]').forEach(b=>b.onclick=e=>{e.preventDefault();addCodeById(b.dataset.id)})}
 renderCodes();renderCodeFav();toast(fmtCodeLine(c)+' added')}
function renderMyCodesList(){const box=$('#myCodeList');if(!box)return;box.innerHTML=MY_CODES.length?MY_CODES.map(c=>`<div class="row" style="align-items:flex-start;gap:6px;margin:4px 0"><button type="button" class="btn" data-use="${esc(c.id)}" style="flex:1;text-align:left;white-space:normal"><b>${esc(fmtCodeLine(c))}</b><br><small style="color:#a2a2a2">${esc((c.text||c.sum||'').slice(0,120))}</small></button><button type="button" class="btn danger" data-del="${esc(c.id)}" title="Delete">🗑</button></div>`).join(''):'<small style="color:#636363">No personal codes yet. Add entries from your NFPA 72 book below.</small>';
 box.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>addCodeById(b.dataset.use));
 box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!await uiConfirm('Delete this personal code?'))return;await del('mycodes',b.dataset.del);MY_CODES=null;await loadCodes();renderMyCodesList();filterCodes($('#codeQ').value);suggestCodes()})}
$('#codeAdd').onclick=e=>{e.preventDefault();openCodePicker()};
$('#codeQ').addEventListener('input',e=>filterCodes(e.target.value));
$('#myCodeSave').onclick=async e=>{e.preventDefault();const code=($('#myCodeStd').value||'NFPA 72').trim(),section=$('#myCodeSec').value.trim(),title=$('#myCodeTitle').value.trim(),text=$('#myCodeText').value.trim();
 if(!section||!title){uiAlert('Section number and title are required.');return}
 const reasons=[...$('#myCodeReasons').selectedOptions].map(o=>o.value),types=[...$('#myCodeTypes').selectedOptions].map(o=>o.value);
 const rec={id:'my-'+uid(),code,section,title,text,sum:text.slice(0,160),reasons,types,tags:['personal'],personal:true,created:Date.now()};
 await put('mycodes',rec);MY_CODES=null;await loadCodes();$('#myCodeSec').value='';$('#myCodeTitle').value='';$('#myCodeText').value='';
 [...$('#myCodeReasons').options].forEach(o=>o.selected=false);[...$('#myCodeTypes').options].forEach(o=>o.selected=false);
 renderMyCodesList();filterCodes($('#codeQ').value);toast('Personal code saved');await addCode(rec)};
$('#myCodeTypes').innerHTML=Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');
loadCodes();

// ---------- v11: job / system info ----------
const JOB0={building:'',address:'',ahj:'',systemType:'Protected premises (local)',monitoring:'',panel:'',inspType:'Annual',inspDate:'',license:'',owner:'',ownerName:'',ownerAddr:'',ownerPhone:'',occupancy:'',panelMake:'',panelModel:'',firmware:'',panelLoc:'',monAcct:'',monPhone:'',monMethod:'',priPower:'',priLoc:'',battery:'',batDate:'',batTest:'',aux:'',company:'',techName:'',techLic:'',installDate:'',testDate:'',nextDate:'',result:'',remarks:'',startTime:'',finishTime:'',notifyBefore:'',notifyAfter:'',sigAlarm:'',sigSuper:'',sigTrouble:'',sigRestore:'',simNote:''};
async function getJob(){return{...JOB0,...((await get('meta','job:'+project.id))||{})}}
async function saveJob(j){await put('meta',j,'job:'+project.id)}
function jobToForm(j){const f=$('#jobForm');for(const k of Object.keys(JOB0))if(f.elements[k])f.elements[k].value=j[k]||JOB0[k]}
function jobFromForm(){const f=$('#jobForm'),j={...JOB0};for(const k of Object.keys(JOB0))j[k]=f.elements[k]?.value?.trim()||'';return j}
$('#jobBtn').onclick=async()=>{if($('#saveDlg').open)$('#saveDlg').close();jobToForm(await getJob());$('#jobDlg').showModal()};
$('#jobSave').onclick=async e=>{e.preventDefault();await saveJob(jobFromForm());$('#jobDlg').close();toast('Job information saved')};
async function ensureJob(){let j=await getJob();if(j.building&&j.inspDate)return j;jobToForm(j);$('#jobDlg').showModal();
 await new Promise(res=>{$('#jobSave').addEventListener('click',function h(ev){ev.preventDefault();$('#jobSave').removeEventListener('click',h);res()},{once:true});
  $('#jobDlg').addEventListener('close',function h(){$('#jobDlg').removeEventListener('close',h);res()},{once:true})});
 j=jobFromForm();if($('#jobDlg').open)$('#jobDlg').close();if(!j.building)j.building=project.name;if(!j.inspDate)j.inspDate=new Date().toISOString().slice(0,10);await saveJob(j);return j}

// ---------- v11: NFPA 72-mapped documents (NOT official NFPA forms) ----------
function nfpaHeader(doc,title,j,tn){
 doc.setFillColor(30,41,59);doc.rect(0,0,612,72,'F');doc.setTextColor(255,255,255);doc.setFont(undefined,'bold');doc.setFontSize(16);doc.text(title,40,28);
 doc.setFont(undefined,'normal');doc.setFontSize(9);
 doc.text('Generated by Marker — maps to NFPA 72 Ch. 7 Documentation and Ch. 14 Inspection, Testing, and Maintenance.',40,46,{maxWidth:530});
 doc.setFontSize(10);doc.text(`Project: ${project.name}    Date: ${j.inspDate||fmtT(Date.now())}    Inspector: ${tn||'-'}${j.license?'  Lic. '+j.license:''}`,40,62);
 doc.setTextColor(120);doc.setFontSize(9);
 doc.text('This is NOT an official NFPA form and does not reproduce NFPA copyrighted form layouts or wording.',40,88,{maxWidth:530});
 doc.setTextColor(0,0,0);return 108}
function nfpaJobBlock(doc,j,y){const L=(t)=>{const ls=doc.splitTextToSize(t,530);doc.text(ls,40,y);y+=ls.length*12+2};doc.setFontSize(11);doc.setFont(undefined,'bold');doc.text('System / job information',40,y);y+=16;doc.setFont(undefined,'normal');doc.setFontSize(10);
 L(`Building: ${j.building||'-'}    Address: ${j.address||'-'}`);L(`Owner/contact: ${j.owner||'-'}    AHJ: ${j.ahj||'-'}`);
 L(`System type: ${j.systemType||'-'}    Monitoring: ${j.monitoring||'-'}`);L(`Control panel: ${j.panel||'-'}    Inspection type: ${j.inspType||'-'}`);
 // bpm-v72: NFPA 72 Ch. 7 record fields (project-level, editable in 🏛 Job info)
 const H=t=>{if(y>730){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.text(t,40,y);y+=13;doc.setFont(undefined,'normal')},v=x=>x||'-';
 H('Property / owner');L(`Owner: ${v(j.ownerName||j.owner)}    Owner address: ${v(j.ownerAddr)}    Phone: ${v(j.ownerPhone)}`);L(`Occupancy / use: ${v(j.occupancy)}`);
 H('Control unit');L(`Manufacturer: ${v(j.panelMake)}    Model: ${v(j.panelModel)}    Firmware/software: ${v(j.firmware)}    Location: ${v(j.panelLoc)}`);
 H('Off-premises monitoring');L(`Company: ${v(j.monitoring)}    Account #: ${v(j.monAcct)}    Phone: ${v(j.monPhone)}    Method: ${v(j.monMethod)}`);
 H('Power supplies');L(`Primary (panel/circuit): ${v(j.priPower)}    Location: ${v(j.priLoc)}`);L(`Secondary / batteries: ${v(j.battery)}    Battery date: ${v(j.batDate)}    Battery test: ${v(j.batTest)}`);L(`Other power supplies (NAC/aux): ${v(j.aux)}`);
 H('Service / technician');L(`Company: ${v(j.company)}    Technician: ${v(j.techName)}    Cert/license #: ${v(j.techLic||j.license)}`);
 H('Dates / result');L(`Installed: ${v(j.installDate)}    Inspection: ${v(j.inspDate)}    Test: ${v(j.testDate)}    Next due: ${v(j.nextDate)}`);L(`Overall test result: ${v(j.result)}`);if(j.remarks)L(`Remarks: ${j.remarks}`);
 doc.setDrawColor(180);doc.line(40,y,572,y);return y+14}
function nfpaFooter(doc,name){const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(120);doc.text(`${name} · Marker report (NFPA 72-mapped) · page ${i} of ${n}`,40,780);doc.setTextColor(0)}}
// bpm-v135: per-device results table for the Inspection and Testing Record
const itmTime=t=>{if(!t)return'';const[h,m]=t.split(':').map(Number);if(isNaN(h))return t;return new Date(2000,0,1,h,m||0).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})};
function itmDeviceTable(doc,D,y){const C=[[40,'Address',52],[94,'Device type',92],[188,'Model',58],[248,'Location',100],[350,'Result',62],[414,'Tested',78],[494,'Readings',78]];
 const head=()=>{doc.setFont(undefined,'bold');doc.setFontSize(8);C.forEach(([x,h])=>doc.text(h,x,y));y+=4;doc.setDrawColor(200);doc.line(40,y,572,y);y+=9;doc.setFont(undefined,'normal')};
 if(y>700){doc.addPage();y=44}y+=6;doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text('Device test results (every device)',40,y);y+=14;
 for(const{pl,pins:ps}of D){if(!ps.length)continue;if(y>730){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.setFontSize(9);doc.text(doc.splitTextToSize(pl.name,530)[0],40,y);y+=12;head();
  for(const p of ps.slice().sort((a,b)=>(a.page-b.page)||sortAddr(a,b))){const cells=[p.address||'-',TYPES[p.type]?.n||p.type,p.model||'',p.location||'',p.status+(p.status==='failed'&&p.reason?' ('+p.reason+')':'')+(p.prev?'\nLast visit: '+p.prev.status:''),p.testedAt?fmtT(p.testedAt):'',rdTxt(p)].map((t,i)=>doc.splitTextToSize(String(t),C[i][2]));
   const h=Math.max(...cells.map(c=>c.length))*9+3;if(y+h>760){doc.addPage();y=44;head()}
   const rc={failed:[185,28,28],corrected:[8,145,178],passed:[21,128,61]}[p.status]||[100,116,139];cells.forEach((c,i)=>{if(i===4)doc.setTextColor(...rc);doc.text(c,C[i][0],y);doc.setTextColor(0)});y+=h}y+=6}
 doc.setFontSize(10);return y}
async function nfpaDeviceStats(D){const by={};for(const{pins:ps}of D)for(const p of ps){const t=p.type||'other';(by[t]??= {t,n:0,pass:0,fail:0,ip:0,nt:0,na:0});by[t].n++;
  if(p.status==='passed')by[t].pass++;else if(p.status==='failed')by[t].fail++;else if(p.status==='corrected')by[t].corr=(by[t].corr||0)+1;else if(p.status==='in progress')by[t].ip++;else by[t].nt++;
  for(const c of p.checks||[])if(c.v==='na')by[t].na++}return Object.values(by).sort((a,b)=>(TYPES[a.t]?.n||'').localeCompare(TYPES[b.t]?.n||''))}
$('#nfpaItm').onclick=async()=>{if(!project)return;$('#saveDlg').close();busy(1,'Building ITM record');try{
 const j=await ensureJob(),D=await projData(),all_=D.flatMap(d=>d.pins),c=cntSt(all_),tn=await getTester(),stats=await nfpaDeviceStats(D),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});
 let y=nfpaHeader(doc,'Inspection & Testing Record',j,tn);y=nfpaJobBlock(doc,j,y);
 // bpm-v135: this visit: times, who was notified, monitoring signal times, simulated tests
 {const v=x=>x||'-',L=t=>{const ls=doc.splitTextToSize(t,530);if(y+ls.length*12>760){doc.addPage();y=44}doc.text(ls,40,y);y+=ls.length*12+2};doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text('This inspection visit',40,y);y+=15;doc.setFont(undefined,'normal');doc.setFontSize(10);
  L(`Date: ${v(j.inspDate)}    Start time: ${v(itmTime(j.startTime))}    Finish time: ${v(itmTime(j.finishTime))}`);L(`Notified before testing: ${v(j.notifyBefore)}`);L(`Notified after testing: ${v(j.notifyAfter)}`);
  L(`Monitoring station signals received: Alarm ${v(itmTime(j.sigAlarm))}    Supervisory ${v(itmTime(j.sigSuper))}    Trouble ${v(itmTime(j.sigTrouble))}    Restored ${v(itmTime(j.sigRestore))}`);
  L(`Simulated tests: ${j.simNote||'None noted. All devices were tested by their normal method.'}`);doc.setDrawColor(180);doc.line(40,y,572,y);y+=14}
 doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text('Summary (live device data)',40,y);y+=14;doc.setFont(undefined,'normal');doc.setFontSize(10);
 doc.text(`Devices: ${c.t}    Passed: ${c.passed}    Failed: ${c.failed}    Corrected: ${c.corr}    In progress: ${c.ip}    Not tested: ${c.nt}    (${c.pct}% tested)`,40,y,{maxWidth:530});y+=18;
 doc.setFont(undefined,'bold');doc.text('Visual inspection / testing results by device type',40,y);y+=6;doc.setFontSize(8);doc.setTextColor(100);doc.text('Mapped to NFPA 72 Chapter 14 inspection and testing tables (section numbers cited in the deficiency list where attached).',40,y+10);doc.setTextColor(0);y+=22;
 doc.setFontSize(9);doc.setFont(undefined,'bold');['Type','Total','Passed','Failed','Corrected','In progress','Not tested'].forEach((h,i)=>doc.text(h,i?125+(i-1)*72:40,y));y+=12;doc.setFont(undefined,'normal');
 for(const r of stats){/* bpm-v135: the full type name wraps inside its column (it used to be cut at 18 characters) */const nm=doc.splitTextToSize(TYPES[r.t]?.n||r.t,82);if(y+nm.length*11>760){doc.addPage();y=44}doc.text(nm,40,y);[r.n,r.pass,r.fail,r.corr||0,r.ip,r.nt].forEach((v,i)=>doc.text(String(v),125+i*72,y));y+=Math.max(12,nm.length*11+1)}
 y+=10;doc.setFont(undefined,'bold');doc.setFontSize(11);if(y>720){doc.addPage();y=44}doc.text('Deficiencies found',40,y);y+=14;doc.setFont(undefined,'normal');doc.setFontSize(10);
 const defs=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='failed').map(p=>({pl,p}))).sort((a,b)=>(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1));
 if(!defs.length){doc.text('None recorded.',40,y);y+=14}
 for(const{pl,p}of defs){const block=[`${p.severity||'-'}: ${TYPES[p.type]?.n||p.type}${p.model?' ['+p.model+']':''} ${p.address||''}${p.location?' @ '+p.location:''} — ${p.reason||''}${p.reasonText?': '+failReasonText(p.reasonText):''}`,`${pl.name} ${pgT(pl.id,p.page)}${p.testedAt?' · '+fmtT(p.testedAt):''}${p.tester?' · '+p.tester:''}`,p.codes?.length?`Code refs: ${fmtCodes(p.codes)} (${(p.codes).map(c=>c.title).join('; ')})`:'Code refs: (none)',p.notes?`Notes: ${p.notes}`:''].filter(Boolean);
  const lines=doc.splitTextToSize(block.join('\n'),530);if(y+lines.length*12>760){doc.addPage();y=44}if(p.severity==='Critical')doc.setTextColor(185,28,28);doc.text(lines,40,y);doc.setTextColor(0);y+=lines.length*12+8}
 {const cd=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='corrected').map(p=>({pl,p})));if(cd.length){if(y>720){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text(`Corrected deficiencies (${cd.length})`,40,y);y+=14;doc.setFont(undefined,'normal');doc.setFontSize(10);
  for(const{pl,p}of cd){const lines=doc.splitTextToSize(`${TYPES[p.type]?.n||p.type}${p.model?' ['+p.model+']':''} ${p.address||''}${p.location?' @ '+p.location:''} — was ${p.severity||'-'}: ${p.reason||''}\n${corrTxt(p)} · ${pl.name} ${pgT(pl.id,p.page)}`,530);if(y+lines.length*12>760){doc.addPage();y=44}doc.text(lines,40,y);y+=lines.length*12+6}}}
 y=itmDeviceTable(doc,D,y);
 y+=8;if(y>620){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text('People',40,y);y+=20;doc.setFont(undefined,'normal');doc.setFontSize(10);
 doc.text(`Inspector: ${j.techName||'-'}  License: ${j.techLic||j.license||'-'}`,40,y);y+=20;
 doc.text(`Owner / representative: ${j.ownerName||j.owner||'-'}`,40,y);y+=20;
 nfpaFooter(doc,project.name);dl(doc.output('blob'),fsafe(project.name)+'-inspection-testing-record.pdf');toast('Inspection & Testing Record exported')}
 catch(e){showErr('ITM record failed: '+e.message)}finally{busy(0)}};

$('#nfpaComp').onclick=async()=>{if(!project)return;$('#saveDlg').close();busy(1,'Building completion record');try{
 const j=await ensureJob(),D=await projData(),all_=D.flatMap(d=>d.pins),c=cntSt(all_),tn=await getTester(),stats=await nfpaDeviceStats(D),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});
 let y=nfpaHeader(doc,'Record of Completion / Acceptance Summary',j,tn);y=nfpaJobBlock(doc,j,y);
 doc.setFontSize(9);doc.setTextColor(100);doc.text('Maps to NFPA 72 Chapter 7 documentation for system completion / acceptance (not an official NFPA Record of Completion form).',40,y,{maxWidth:530});doc.setTextColor(0);y+=28;
 doc.setFont(undefined,'bold');doc.setFontSize(11);doc.text('System inventory (from this project)',40,y);y+=14;doc.setFont(undefined,'normal');doc.setFontSize(10);
 doc.text(`Plans in project: ${D.length}    Devices documented: ${c.t}    Passed: ${c.passed}    Failed: ${c.failed}    Corrected: ${c.corr}    Not tested: ${c.nt}`,40,y,{maxWidth:530});y+=16;
 for(const r of stats){if(y>750){doc.addPage();y=44}doc.text(`${TYPES[r.t]?.n||r.t}: ${r.n} device(s)`,40,y);y+=12}
 y+=10;doc.setFont(undefined,'bold');doc.text('Acceptance checklist (inspector confirms)',40,y);y+=16;doc.setFont(undefined,'normal');
 for(const t of['As-built drawings / device list available (NFPA 72 7.2–7.4 related)','Control unit functions verified','Initiating devices tested or accounted for','Notification appliances tested or accounted for','Off-premises signaling verified (if applicable)','Owner instructed on system operation','Open deficiencies listed below have a correction plan']){if(y>750){doc.addPage();y=44}doc.rect(40,y-8,10,10);doc.text(t,56,y);y+=18}
 y+=6;doc.setFont(undefined,'bold');doc.text('Outstanding deficiencies at acceptance',40,y);y+=14;doc.setFont(undefined,'normal');
 const defs=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='failed').map(p=>({pl,p})));
 if(!defs.length)doc.text('None.',40,y),y+=14;
 {const cd=all_.filter(p=>p.status==='corrected').length;if(cd){doc.text(`Corrected deficiencies: ${cd} (see the Deficiency report for details)`,40,y);y+=14}}
 for(const{pl,p}of defs){const t=`• ${p.severity}: ${TYPES[p.type]?.n||p.type}${p.model?' ['+p.model+']':''} ${p.address||''} — ${p.reason||''}${p.codes?.length?' ['+fmtCodes(p.codes)+']':''} (${pl.name} ${pgT(pl.id,p.page)})`;const ls=doc.splitTextToSize(t,530);if(y+ls.length*12>760){doc.addPage();y=44}doc.text(ls,40,y);y+=ls.length*12+4}
 y+=16;if(y>700){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.text('People',40,y);y+=22;doc.setFont(undefined,'normal');
 doc.text(`Inspector / acceptance tester: ${j.techName?j.techName+(j.techLic?' (Lic. '+j.techLic+')':''):'-'}`,40,y);y+=24;
 nfpaFooter(doc,project.name);dl(doc.output('blob'),fsafe(project.name)+'-record-of-completion.pdf');toast('Record of Completion summary exported')}
 catch(e){showErr('Completion record failed: '+e.message)}finally{busy(0)}};

$('#nfpaDef').onclick=async()=>{if(!project)return;$('#saveDlg').close();busy(1,'Building deficiency list');try{
 const j=await ensureJob(),D=await projData(),tn=await getTester(),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'});
 let y=nfpaHeader(doc,'Deficiency / Impairments List',j,tn);y=nfpaJobBlock(doc,j,y);
 doc.setFontSize(9);doc.setTextColor(100);doc.text('For impairment handling see NFPA 72 10.4; correct deficiencies per the owner\'s procedures and AHJ requirements (NFPA 72 14.2.10 related).',40,y,{maxWidth:530});doc.setTextColor(0);y+=24;
 const defs=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='failed').map(p=>({pl,p}))).sort((a,b)=>(a.p.severity==='Critical'?0:1)-(b.p.severity==='Critical'?0:1)||String(a.p.address).localeCompare(b.p.address,undefined,{numeric:true}));
 doc.setFont(undefined,'bold');doc.setFontSize(11);const ncd=D.flatMap(d=>d.pins).filter(p=>p.status==='corrected').length;doc.text(`${defs.length} deficiency(ies) · ${defs.filter(d=>d.p.severity==='Critical').length} critical${ncd?` · ${ncd} corrected (listed after the log)`:''}`,40,y);y+=16;doc.setFont(undefined,'normal');doc.setFontSize(10);
 if(!defs.length)doc.text('No failed devices in this project.',40,y);
 for(const{pl,p}of defs){const ph=await firstPhoto(p.id);let im=null;if(ph)try{im=await blobJpeg(ph,500)}catch{}
  const head=`${p.severity||'Non-critical'}: ${TYPES[p.type]?.n||p.type}${p.model?' ['+p.model+']':''} ${p.address||'(no address)'}${p.location?' · '+p.location:''}`;
  const body=[`Reason: ${p.reason||'-'}${p.reasonText?' — '+failReasonText(p.reasonText):''}`,p.codes?.length?`Code references:\n`+p.codes.map(c=>`  • ${c.code} ${c.section} — ${c.title}`).join('\n'):'Code references: (none attached)',p.location?`Location: ${p.location}`:'',`Plan: ${pl.name}, page ${p.page}`,`Tested: ${p.testedAt?fmtT(p.testedAt):'-'}${p.tester?' by '+p.tester:''}`,p.notes?`Notes: ${p.notes}`:''].filter(Boolean).join('\n');
  const lines=doc.splitTextToSize(body,im?300:530);const ih=im?Math.min(120,im.h*(160/im.w)):0;const need=Math.max(ih,28+lines.length*12)+16;if(y+need>760){doc.addPage();y=44}
  if(p.severity==='Critical')doc.setTextColor(185,28,28);doc.setFont(undefined,'bold');doc.text(head,40,y+10);doc.setTextColor(0);doc.setFont(undefined,'normal');doc.text(lines,40,y+24);if(im)doc.addImage(im.d,'JPEG',400,y,160,ih);y+=need;doc.setDrawColor(200);doc.line(40,y-8,572,y-8)}
 y+=12;if(y>700){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.text('Impairment / correction log',40,y);y+=18;doc.setFont(undefined,'normal');
 doc.text('Date impaired: ________  Notified monitoring: ☐  Notified AHJ: ☐  Tag posted: ☐',40,y);y+=20;
 doc.text('Corrected by: _____________________  Date restored: ________  Retest result: ________',40,y);y+=28;
 {const cd=D.flatMap(({pl,pins:ps})=>ps.filter(p=>p.status==='corrected').map(p=>({pl,p})));if(cd.length){if(y>700){doc.addPage();y=44}doc.setFont(undefined,'bold');doc.text(`Corrected deficiencies (${cd.length})`,40,y);y+=16;doc.setFont(undefined,'normal');
  for(const{pl,p}of cd){const lines=doc.splitTextToSize(`${TYPES[p.type]?.n||p.type}${p.model?' ['+p.model+']':''} ${p.address||''}${p.location?' · '+p.location:''} — was ${p.severity||'-'}: ${p.reason||''}${p.reasonText?' — '+failReasonText(p.reasonText):''}\n${corrTxt(p)} · Plan: ${pl.name}, page ${p.page}`,530);if(y+lines.length*12>760){doc.addPage();y=44}doc.text(lines,40,y);y+=lines.length*12+6}}}
 nfpaFooter(doc,project.name);dl(doc.output('blob'),fsafe(project.name)+'-deficiencies-impairments.pdf');toast('Deficiency / Impairments list exported')}
 catch(e){showErr('Deficiency list failed: '+e.message)}finally{busy(0)}};



// ---------- v12/v15: clear pins or markups (page / plan / project) ----------
var clrWhat='pins';
async function planIdsOf(){const ids=(await all('plans')).filter(p=>p.projectId===project.id).map(p=>p.id);planIdsOf.cache=ids;return ids}
async function clrCounts(){const arr=clrWhat==='pins'?pins:markups,ids=await planIdsOf(),pr=(await all(clrWhat)).filter(p=>ids.includes(p.planId));return{page:arr.filter(p=>p.page===page).length,plan:arr.length,proj:pr.length}}
function clrInfoUpd(){const v=document.querySelector('#clrDlg [name=clr]:checked').value,n=clrInfoUpd.n||{};const c=n[v]||0,P=clrWhat==='pins';
 $('#clrInfo').textContent=c?`Deletes ${c} ${P?'pin':'markup'}${c>1?'s':''}${P?' plus their photos, videos, voice notes and checklists':' (shapes, text, lines, measurements)'}. `+(v==='proj'?`${P?'Pins':'Markups'} on other plans cannot be undone — save a .bpm first if unsure.`:'Undo (↶) restores them in one step.'):`No ${clrWhat} in this scope.`;$('#clrGo').disabled=!c}
async function clrOpen(what){if(!project)return;clrWhat=what;$('#clrH').textContent=what==='pins'?'🗑 Clear pins':'🗑 Clear markups';const n=await clrCounts();clrInfoUpd.n=n;$('#clrNpage').textContent=`(${n.page})`;$('#clrNplan').textContent=`(${n.plan})`;$('#clrNproj').textContent=`(${n.proj})`;
 document.querySelectorAll('#clrDlg [name=clr]').forEach(r=>{r.disabled=r.value!=='proj'&&!plan;r.onchange=clrInfoUpd});if(!plan)document.querySelector('#clrDlg [value=proj]').checked=true;clrInfoUpd();$('#clrDlg').showModal()}
// bpm-v111: Clear pins… / Clear markups… open the same curved wheel as Delete (scope + count, Cancel). Picking a scope IS the confirm; page / plan clears are one Undo step.
async function clrWheel(what){if(!project)return;clrWhat=what;const n=await clrCounts(),P=what==='pins',W=P?'pin':'markup',pl=x=>`${x} ${W}${x===1?'':'s'}`;
 const opts=[];if(plan){opts.push({i:'📄',l:`This page (${pl(n.page)})`,v:'page',c:n.page},{i:'🗺',l:`This plan (${pl(n.plan)})`,v:'plan',c:n.plan})}opts.push({i:'📁',l:`Whole project (${pl(n.proj)})`,v:'proj',c:n.proj},{i:'✕',l:'Cancel',v:null});
 const go=()=>{if(!window.wheelOpen)return clrOpen(what);wheelOpen(P?'Clear pins':'Clear markups',opts.map(o=>({...o,html:`<span class="whIc">${o.i}</span>${esc(o.l)}`})),0,o=>{if(!o||!o.v)return;if(!o.c){toast(`No ${what} in this scope`);return}clrRun(o.v)})};
 if(window.WHOPEN_T)clearTimeout(WHOPEN_T);const ov=document.querySelector('.whOv');if(ov&&!ov.hidden)window.WHOPEN_T=setTimeout(go,180);else go()}
$('#clrBtn').onclick=()=>clrWheel('pins');$('#clrMBtn').onclick=()=>clrWheel('markups');
$('#clrGo').onclick=async()=>{const v=document.querySelector('#clrDlg [name=clr]:checked').value,c=clrInfoUpd.n[v],P=clrWhat==='pins';
 if(!await uiConfirm(`Delete ${c} ${P?'pin(s) and their media':'markup(s)'}${v==='proj'?' across the whole project':v==='plan'?' on this plan':' on this page'}?`+(v==='proj'?` ${P?'Pins':'Markups'} on other plans cannot be undone.`:'')))return;$('#clrDlg').close();await clrRun(v)};
async function clrRun(v){const P=clrWhat==='pins',st=clrWhat;if(ted)tedEnd(false);busy(1,P?'Clearing pins':'Clearing markups');
 try{const arr=P?pins:markups,L=[];const mine=v==='page'?arr.filter(p=>p.page===page):plan?arr.slice():[];for(const p of mine)L.push(P?{store:'pins',id:p.id,before:p,after:null,media:await byIdx('media','pinId',p.id,true)}:{store:'markups',id:p.id,before:p,after:null});
  sel=null;msel=[];if(L.length)await changeMulti(L);let other=0;
  if(v==='proj'){const ids=await planIdsOf();for(const p of await all(st)){if(!ids.includes(p.planId)||p.planId===plan?.id)continue;if(P)for(const m of await byIdx('media','pinId',p.id,true))await del('media',m.id);await del(st,p.id);other++}}
  draw();renderList();toast(`Cleared ${L.length+other} ${P?'pin':'markup'}(s)`+(L.length?' — undo available for this plan':''),true)}catch(e){showErr('Clear failed: '+e.message)}finally{busy(0)}}
// ---------- v13: split legacy generic Panel pins into FACP / DACT / FATC (best effort) ----------
function migPanelType(p){if(p.type!=='panel'&&p.type!=='other')return null;const d=String(p.detected||'')+' '+String(p.detG||'')+' '+String(p.notes||'');
 if(/\bDACT\b|communicator/i.test(d))return'dact';if(/\bFATC\b|terminal cabinet/i.test(d))return'fatc';if(/PANEL_BOX|panelbox|equipment box/i.test(d))return'panelbox';if(p.type==='other'&&/\bFACP\b/i.test(d))return'panel';return null}
async function migratePanels(){if(await get('meta','mig:v13'))return 0;let n=0;for(const p of await all('pins')){const t=migPanelType(p);if(t&&t!==p.type){p.type=t;await put('pins',p);n++}}await put('meta',1,'mig:v13');return n}

