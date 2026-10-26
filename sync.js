// bpm-v86: two-tech split & merge by file. mergePins() is PURE (no DOM/DB), so a future automatic
// transport (WebRTC peer, cloud relay) can feed it the same pin records + change log.
// Per-pin result record: RES fields + updatedAt (ms) + dev (device id) + by (tech name). Split copies carry
// srcPin (origin pin id) and base {u,st} = origin's updatedAt/status at split time.
const RES_F=['status','checks','reason','reasonText','severity','notes','testedAt','tester','codes'];
const resKey=p=>JSON.stringify(RES_F.map(k=>p?.[k]??null));
// bpm-v135: the merge also brings back edits made on the second phone (address, model, location, type, position) and new pins/drawings.
// Each split pin carries base.ev = its edit fields at split time, so the merge can tell which phone changed which field. Both changed one field: the newest edit wins.
const EDIT_G={address:['address'],model:['model'],location:['location'],type:['type'],position:['x','y','ang','bw','bh','vert']},EDIT_F=Object.values(EDIT_G).flat();
const editKey=p=>JSON.stringify(EDIT_F.map(k=>p?.[k]??null));
const pickEdit=p=>{const o={};for(const k of EDIT_F)if(p&&p[k]!==undefined)o[k]=p[k];return o};
const gv=(o,g)=>JSON.stringify(EDIT_G[g].map(k=>o?.[k]??null));
function mergeEdits(l,r){const ev=r.base&&r.base.ev;if(!ev)return null;const out={fields:{},groups:[],conflicts:[]};
 for(const g of Object.keys(EDIT_G)){const b=gv(ev,g),rv=gv(r,g),lv=gv(l,g);if(rv===b||rv===lv)continue;
  if(lv===b){out.groups.push(g);for(const k of EDIT_G[g])out.fields[k]=r[k]}
  else{const rn=(r.editAt||0)>(l.editAt||0);out.conflicts.push({g,won:rn?'remote':'local',local:lv,remote:rv});if(rn){out.groups.push(g);for(const k of EDIT_G[g])out.fields[k]=r[k]}}}
 if(out.groups.length){out.fields.editAt=Math.max(r.editAt||0,l.editAt||0)}return out}
function mergePins(local,remote,opt={}){const L=new Map(local.map(p=>[p.id,p])),out={apply:[],conflicts:[],same:0,unchanged:0,missing:[],added:[],edits:[]},pm=opt.planMap||null;
 for(const r of remote){const id=r.srcPin||r.id,l=L.get(id);
  if(!l){/* bpm-v135: a pin placed on the second phone (no origin pin) comes back as a new pin on the matching plan */if(!r.srcPin&&!r.base&&pm&&pm[r.planId])out.added.push({...r,planId:pm[r.planId]});else out.missing.push(id);continue}
  const ed=mergeEdits(l,r);if(ed&&(ed.groups.length||ed.conflicts.length))out.edits.push({id,...ed});
  const bu=r.base?r.base.u||0:null,ru=r.updatedAt||0,lu=l.updatedAt||0;
  const rc=bu===null?ru>0:ru>bu;if(!rc||resKey(r)===resKey(l)){rc&&resKey(r)===resKey(l)?out.same++:out.unchanged++;continue}
  const lc=bu===null?(lu>0&&l.dev!==r.dev&&lu!==ru):lu>bu;
  if(!lc||(bu===null&&ru>lu&&l.dev===r.dev))out.apply.push({id,fields:pickRes(r)});
  else if(bu===null&&l.dev===r.dev)out.unchanged++;
  else out.conflicts.push({id,local:l,remote:r})}
 return out}
function pickRes(p){const o={};for(const k of [...RES_F,'updatedAt','dev','by'])o[k]=p[k]??(k==='checks'||k==='codes'?undefined:'');return o}
function mergeLog(a=[],b=[]){const k=e=>e.pin+'|'+e.at+'|'+e.dev,m=new Map();for(const e of [...a,...b])m.set(k(e),e);return[...m.values()].sort((x,y)=>x.at-y.at).slice(-5000)}
window.mergePins=mergePins;window.mergeLog=mergeLog;
const mkHash=m=>{const{id,planId,srcMk,mbase,updatedAt,...r}=m||{};return JSON.stringify(r,Object.keys(r).sort())};
// bpm-v135: drawings (markups). Changed only on their phone: theirs is used. Changed on both: the newest wins. New drawings are added. A drawing they deleted is kept here (listed in the summary).
function mergeMarkups(local,remote,pm,splitIds){const L=new Map(local.map(m=>[m.id,m])),out={apply:[],added:[],conflicts:[],gone:0};const seen=new Set();
 for(const r of remote){if(r.srcMk){seen.add(r.srcMk);const l=L.get(r.srcMk);if(!l||!r.mbase)continue;const rh=mkHash(r),lh=mkHash(l);if(rh===r.mbase||rh===lh)continue;
   if(lh===r.mbase)out.apply.push({id:l.id,m:r});else{const rn=(r.updatedAt||0)>(l.updatedAt||0);out.conflicts.push({id:l.id,won:rn?'remote':'local'});if(rn)out.apply.push({id:l.id,m:r})}}
  else if(pm&&pm[r.planId])out.added.push({...r,planId:pm[r.planId]})}
 if(splitIds)for(const id of splitIds)if(!seen.has(id)&&L.has(id))out.gone++;return out}
window.mergeMarkups=mergeMarkups;window.mkHash=mkHash;
(()=>{const ce=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e};
 const DEV=localStorage.getItem('bpm-dev')||(()=>{const d='d'+Math.random().toString(36).slice(2,10);localStorage.setItem('bpm-dev',d);return d})();window.DEVICE_ID=DEV;
 async function stamp(b,a){if(a&&b&&editKey(a)!==editKey(b)){a.editAt=Date.now();a.editDev=DEV}if(!a||resKey(a)===resKey(b))return;a.updatedAt=Date.now();a.dev=DEV;a.by=(tester===null?await get('meta','tester'):tester)||'';
  if(project){const k='chlog:'+project.id,l=(await get('meta',k))||[];l.push({pin:a.srcPin||a.id,at:a.updatedAt,dev:DEV,by:a.by,st:a.status||''});await put('meta',l.slice(-5000),k)}}
 const _c=change;change=async function(s,b,a,m){if(s==='pins')await stamp(b,a);if(s==='markups'&&a)a.updatedAt=Date.now();return _c.call(this,s,b,a,m)};
 const _cm=changeMulti;changeMulti=async function(list){for(const e of list){if(e.store==='pins')await stamp(e.before,e.after);if(e.store==='markups'&&e.after)e.after.updatedAt=Date.now()}return _cm.call(this,list)};

 async function shareOrSave(blob,name){const f=new File([blob],name,{type:'application/octet-stream'});
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:name});return'shared'}catch(e){if(e.name==='AbortError')return'cancel';if(e.name==='NotAllowedError'&&await uiConfirm(name+' is ready.',{ok:'Share file',cancel:'Save to device'})){try{await navigator.share({files:[f],title:name});return'shared'}catch(e2){if(e2.name==='AbortError')return'cancel'}}}}dl(blob,name);return'saved'}
 window.buildSplit=async function(sel){const all=await readBpm(await buildBpm(project.id)),man=all.man,z=all.z,ids=new Set(sel.map(p=>p.id)),plIds=new Set(sel.map(p=>p.planId));
  const plans=man.plans.filter(p=>plIds.has(p.id)),media=man.media.filter(m=>ids.has(m.pinId)),files=[];
  for(const p of plans)if(p.file)files.push({name:p.file,blob:z.get(p.file).blob});for(const m of media){if(m.file)files.push({name:m.file,blob:z.get(m.file).blob});if(m.annotFile)files.push({name:m.annotFile,blob:z.get(m.annotFile).blob})}
  const at=Date.now(),m2={...man,project:{...man.project,name:man.project.name+' – split',split:{projectId:project.id,from:DEV,at,n:sel.length}},plans,media,
   pins:man.pins.filter(p=>ids.has(p.id)).map(p=>({...p,srcPin:p.srcPin||p.id,base:{u:p.updatedAt||0,st:p.status,e:p.editAt||0,ev:pickEdit(p)}})),markups:man.markups.filter(m=>plIds.has(m.planId)).map(m=>({...m,srcMk:m.srcMk||m.id,mbase:mkHash(m)})),split:{projectId:project.id,from:DEV,at}};
  m2.split.mk=m2.markups.map(m=>m.srcMk);delete m2.learned;files.unshift({name:'project.json',blob:new Blob([JSON.stringify(m2)],{type:'application/json'})});return zipBlob(files)};
 function selected(d){const pg=new Set([...d.querySelectorAll('[data-pg]:checked')].map(b=>+b.dataset.pg)),ty=new Set([...d.querySelectorAll('[data-ty]:checked')].map(b=>b.dataset.ty)),A=d._area;
  return pins.filter(p=>pg.has(p.page)&&(!ty.size||ty.has(p.type))&&(!A||(p.x>=A.x0&&p.x<=A.x1&&p.y>=A.y0&&p.y<=A.y1)))}
 async function openSplit(area){if(!plan)return toast('Open a plan first');let d=$('#splitDlg');if(!d){d=ce('dialog',{id:'splitDlg'});document.body.append(d)}
  const all=await byIdx('pins','planId',plan.id),pgs=[...new Set(all.map(p=>p.page))].sort((a,b)=>a-b),tys=[...new Set(all.map(p=>p.type))];d._area=area||null;
  /* bpm-v103: redesigned Split: title, 2-step layout, grouped sections, chip toggles with live counts, summary, prominent Share/Save */
  const cnt=f=>all.filter(f).length,dot=t=>(TYPES[t]||TYPES.other).c;d.classList.add('spD');
  d.innerHTML=`<div class="spHd"><div><h3>⇆ Split for a second technician</h3><small>Give some pins to another phone. They test them and send the file back; ⇄ Merge pulls their results in by pin ID.</small></div><button type="button" class="btn spClose" id="spX2" title="Close">✕<span>Close</span></button></div>
  <ol class="spSteps"><li class="on"><b>1</b> Choose devices</li><li><b>2</b> Share or save</li></ol>
  <section class="spSec"><h4>Pages</h4><div class="spChips">${pgs.map(n=>`<label class="spChip"><input type="checkbox" data-pg="${n}"${n===page?' checked':''}><span>${esc(pgT(plan.id,n))}</span><em>${cnt(p=>p.page===n)}</em></label>`).join('')}</div></section>
  <section class="spSec"><h4>Device types <small>none ticked = all types</small></h4><div class="spChips">${tys.map(t=>`<label class="spChip"><input type="checkbox" data-ty="${t}"><i style="background:${dot(t)}"></i><span>${esc(TYPES[t]?.n||t)}</span><em data-tc="${t}">${cnt(p=>p.type===t)}</em></label>`).join('')}</div></section>
  <section class="spSec"><h4>Area</h4><div class="spArea"><span id="spA">${area?'▭ Drawn area on '+esc(pgT(plan.id,page)):'Whole page'}</span><span class="sp"></span><button type="button" class="btn" id="spDraw">▭ Draw area</button>${area?'<button type="button" class="btn" id="spClr">Clear area</button>':''}</div></section>
  <div class="spSum" id="spSum"></div>
  <div class="spFt"><button type="button" class="btn" id="spX">Cancel</button><button type="button" class="btn pri spGo" id="spGo">⇪ Share / Save split · <b id="spN"></b></button></div>`;
  if(area)d.querySelectorAll('[data-pg]').forEach(b=>b.checked=+b.dataset.pg===page);
  const upd=()=>{const S=selected(d),n=S.length,T=[...new Set(S.map(p=>p.type))],P=[...new Set(S.map(p=>p.page))].sort((a,b)=>a-b),ut=S.filter(p=>!p.status||p.status==='not tested').length;
   d.querySelector('#spN').textContent=`${n} pin${n===1?'':'s'}`;d.querySelector('#spGo').disabled=!n;
   const pg=new Set([...d.querySelectorAll('[data-pg]:checked')].map(b=>+b.dataset.pg)),A=d._area;d.querySelectorAll('[data-tc]').forEach(e=>{const t=e.dataset.tc;e.textContent=all.filter(p=>p.type===t&&pg.has(p.page)&&(!A||(p.x>=A.x0&&p.x<=A.x1&&p.y>=A.y0&&p.y<=A.y1))).length});
   d.querySelector('#spSum').innerHTML=n?`<b>${n}</b> pin${n===1?'':'s'} · ${T.length} type${T.length===1?'':'s'} · ${P.map(x=>esc(pgT(plan.id,x))).join(', ')}<br><small>${ut} untested · ${n-ut} already have a result${A?' · inside the drawn area':''}</small>`:'<small>Nothing selected yet. Tick at least one page.</small>'};
  d.onchange=upd;upd();
  d.querySelector('#spX').onclick=()=>d.close();d.querySelector('#spX2').onclick=()=>d.close();if(d.querySelector('#spClr'))d.querySelector('#spClr').onclick=()=>{d.close();openSplit()};
  d.querySelector('#spDraw').onclick=()=>{d.close();document.querySelectorAll('dialog[open]').forEach(x=>x.close());drawArea(a=>openSplit(a))};
  d.querySelector('#spGo').onclick=async()=>{const sel=selected(d);busy(1,'Building split…');let b,nm;try{b=await buildSplit(sel);nm=fsafe(project.name)+'-split-'+sel.length+'.marker';window.__lastSplit=b}catch(e){busy(0);d.close();return alert('Split failed: '+e.message)}busy(0);
   const f=new File([b],nm,{type:'application/octet-stream'}),canSh=!!(navigator.canShare&&navigator.canShare({files:[f]}));
   const step2=msg=>{d.querySelector('.spSteps').innerHTML='<li class="done"><b>✓</b> Choose devices</li><li class="on"><b>2</b> Share or save</li>';d.querySelectorAll('.spSec,#spSum').forEach(e=>e.hidden=true);
    d.querySelector('.spFt').innerHTML=`<div class="spReady"><div class="spFile">📦 <b>${esc(nm)}</b><small>${sel.length} pins · ${(b.size/1048576).toFixed(1)} MB</small></div>${msg||''}</div><div class="spFt2">${canSh?'<button type="button" class="btn pri spGo" id="spShare">⇪ Share file</button><button type="button" class="btn" id="spSave">⬇ Save to device</button>':''}<button type="button" class="btn" id="spDone">Done</button></div>`;
    const q=x=>d.querySelector(x);if(q('#spShare'))q('#spShare').onclick=async()=>{try{await navigator.share({files:[f],title:nm});toast(`Split of ${sel.length} pins shared`);d.close()}catch(e){if(e.name!=='AbortError')toast('Share failed: '+e.message)}};
    if(q('#spSave'))q('#spSave').onclick=()=>{dl(b,nm);toast(`Split of ${sel.length} pins saved`);d.close()};q('#spDone').onclick=()=>d.close()};
   if(canSh)step2();else{dl(b,nm);toast(`Split of ${sel.length} pins saved`);step2('<small class="spOk">✓ Saved to your downloads. Send it to the second technician.</small>')}};
  if(!d.open)d.showModal()}
 function drawArea(cb){const o=ce('div',{id:'areaOv'});o.style.cssText='position:absolute;inset:0;z-index:8;cursor:crosshair;touch-action:none;background:#0002';const r=ce('div');r.style.cssText='position:absolute;border:2px dashed #fbbf24;background:#fbbf2422;display:none';o.append(r,ce('div',{},'<div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);background:#1e293b;padding:4px 10px;border-radius:6px">Drag a box around the area</div>'));stage.append(o);
  let s=null;o.onpointerdown=e=>{o.setPointerCapture(e.pointerId);const b=stage.getBoundingClientRect();s={x:e.clientX-b.left,y:e.clientY-b.top,b}};
  o.onpointermove=e=>{if(!s)return;const x=e.clientX-s.b.left,y=e.clientY-s.b.top;Object.assign(r.style,{display:'block',left:Math.min(x,s.x)+'px',top:Math.min(y,s.y)+'px',width:Math.abs(x-s.x)+'px',height:Math.abs(y-s.y)+'px'})};
  o.onpointerup=e=>{if(!s)return;const x=e.clientX-s.b.left,y=e.clientY-s.b.top,a=toW(s.x,s.y),c=toW(x,y);o.remove();cb({x0:Math.min(a.x,c.x),x1:Math.max(a.x,c.x),y0:Math.min(a.y,c.y),y1:Math.max(a.y,c.y)})}}
 window.openSplit=openSplit;

 window.mergeFile=async function(file){if(!project)throw new Error('open the project first');const{z,man}=await readBpm(file),pid=man.split?.projectId||man.project?.split?.projectId||man.project?.id;
  if(pid!==project.id){busy(0);const ok=await uiConfirm('This file was split from a different project. Merge anyway (pins match by ID only)?',{ok:'Merge anyway',cancel:'Cancel'});if(!ok)return null;busy(1,'Merging…')}
  const remote=man.pins,keys=new Set(remote.map(p=>p.srcPin||p.id)),local=[];for(const pl of (await all('plans')).filter(p=>p.projectId===project.id))for(const p of await byIdx('pins','planId',pl.id))if(keys.has(p.id))local.push(p);
  /* bpm-v135: plan map (their plan id -> our plan id) for new pins and drawings */const myPl=(await all('plans')).filter(p=>p.projectId===project.id),myIds=new Set(myPl.map(p=>p.id)),planMap={};
  for(const rp of man.plans||[]){const o=rp.srcPlan||rp.id;if(myIds.has(o))planMap[rp.id]=o}
  const res=mergePins(local,remote,{planMap});const lm=[];for(const id of new Set(Object.values(planMap)))lm.push(...await byIdx('markups','planId',id));
  res.mk=mergeMarkups(lm,man.markups||[],planMap,man.split?.mk||man.project?.split?.mk||null);res.file={z,man};return res};
 async function applyMerge(res,picks){const{z,man}=res.file,byKey=new Map(man.pins.map(p=>[p.srcPin||p.id,p])),L=new Map();for(const pl of (await all('plans')).filter(p=>p.projectId===project.id))for(const p of await byIdx('pins','planId',pl.id))L.set(p.id,p);
  const take=[...res.apply,...res.conflicts.filter(c=>picks[c.id]==='remote').map(c=>({id:c.id,fields:pickRes(c.remote)}))];let nm=0;
  const haveM=new Set((await all('media')).map(m=>m.srcMedia||m.id));
  for(const t of take){const l=L.get(t.id);if(!l)continue;const a={...l,...t.fields};for(const k in t.fields)if(t.fields[k]===undefined)delete a[k];await put('pins',a);
   const r=byKey.get(t.id);for(const m of man.media.filter(m=>m.pinId===r.id)){if(haveM.has(m.srcMedia||m.id))continue;const{file:f,type,size,annotFile,annotType,...x}=m,o={...x,id:uid()+'m',srcMedia:m.srcMedia||m.id,pinId:t.id};if(f&&z.get(f))o.blob=new Blob([await z.get(f).blob.arrayBuffer()],{type});if(annotFile&&z.get(annotFile))o.annot=new Blob([await z.get(annotFile).blob.arrayBuffer()],{type:annotType});await put('media',o);nm++}}
  const copyMedia=async(rid,pid)=>{for(const m of man.media.filter(m=>m.pinId===rid)){if(haveM.has(m.srcMedia||m.id))continue;const{file:f,type,size,annotFile,annotType,...x}=m,o={...x,id:uid()+'m',srcMedia:m.srcMedia||m.id,pinId:pid};if(f&&z.get(f))o.blob=new Blob([await z.get(f).blob.arrayBuffer()],{type});if(annotFile&&z.get(annotFile))o.annot=new Blob([await z.get(annotFile).blob.arrayBuffer()],{type:annotType});await put('media',o);nm++}};
  // bpm-v135: edits (address, model, location, type, position), new pins, drawings
  let ne=0,na=0;const eg={};for(const e of res.edits||[]){if(!e.groups.length)continue;const l=(await get('pins',e.id));if(!l)continue;await put('pins',{...l,...e.fields});ne++;for(const g of e.groups)eg[g]=(eg[g]||0)+1}
  for(const r of res.added||[]){if(await get('pins',r.id))continue;const{base,srcPin,...x}=r,o={...x,id:uid()+'n',mergedFrom:r.id};await put('pins',o);await copyMedia(r.id,o.id);na++}
  const mk=res.mk||{apply:[],added:[],conflicts:[],gone:0};let mu=0,ma=0;
  for(const a of mk.apply){const l=await get('markups',a.id);if(!l)continue;const{srcMk,mbase,id,planId,...x}=a.m;await put('markups',{...x,id:l.id,planId:l.planId});mu++}
  for(const r of mk.added){const{srcMk,mbase,...x}=r;await put('markups',{...x,id:uid()+'k'});ma++}
  const k='chlog:'+project.id;await put('meta',mergeLog((await get('meta',k))||[],man.changelog||[]),k);
  if(plan){pins=await byIdx('pins','planId',plan.id);markups=await byIdx('markups','planId',plan.id);draw();window.renderList&&renderList()}return{pins:take.length,media:nm,edits:ne,editGroups:eg,added:na,mkChanged:mu,mkAdded:ma,mkGone:mk.gone,mkConflicts:mk.conflicts.length,editConflicts:(res.edits||[]).reduce((a,e)=>a+e.conflicts.length,0)}}
 window.applyMerge=applyMerge;
 const fmtR=p=>`<b>${esc(p.status||'not tested')}</b>${p.reason?' · '+esc(p.reason):''}${p.notes?'<br>📝 '+esc(p.notes):''}<br><small>${esc(p.by||p.tester||'?')} · ${p.updatedAt?new Date(p.updatedAt).toLocaleString():'—'}</small>`;
 const GN={address:'address',model:'model',location:'location',type:'device type',position:'position'};
 function mergeSummary(res,r,picks){const L=[],c=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
  if(r.pins)L.push(`${c(r.pins,'test result')} brought in`);if(r.added)L.push(`${c(r.added,'new device')} added`);
  for(const[g,n]of Object.entries(r.editGroups||{}))L.push(`${n} ${GN[g]} change${n===1?'':'s'}`);
  if(r.mkAdded)L.push(`${c(r.mkAdded,'new drawing')} added`);if(r.mkChanged)L.push(`${c(r.mkChanged,'changed drawing')} updated`);if(r.media)L.push(`${r.media} photo / media file${r.media===1?'':'s'}`);
  const C=[];const rc=res.conflicts.length;if(rc){const th=res.conflicts.filter(x=>picks[x.id]==='remote').length;C.push(`${c(rc,'test result')} changed on both phones: kept ${th} from their phone and ${rc-th} from this phone`)}
  const ec=(res.edits||[]).flatMap(e=>e.conflicts);if(ec.length){const th=ec.filter(x=>x.won==='remote').length;C.push(`${c(ec.length,'edit')} made on both phones: the newest kept (${th} theirs, ${ec.length-th} this phone)`)}
  if(r.mkConflicts)C.push(`${c(r.mkConflicts,'drawing')} changed on both phones: the newest kept`);
  const N=[];if(res.missing.length)N.push(`${c(res.missing.length,'device')} from their file not found here (deleted on this phone), not brought back`);if(r.mkGone)N.push(`${c(r.mkGone,'drawing')} deleted on their phone kept here`);
  return{L,C,N}}
 window.mergeSummary=mergeSummary;
 const newer=c=>(c.remote.updatedAt||0)>(c.local.updatedAt||0)?'remote':'local';
 async function mergeUI(file){busy(1,'Merging…');let res;try{res=await mergeFile(file)}catch(e){busy(0);return alert('Merge failed: '+e.message)}busy(0);if(!res)return;
  const fin=async picks=>{const r=await applyMerge(res,picks);const S=mergeSummary(res,r,picks);toast(`Merged ${r.pins} pin result${r.pins===1?'':'s'}${r.media?`, ${r.media} photo/media`:''}${r.added?`, ${r.added} new device${r.added===1?'':'s'}`:''}${res.missing.length?` · ${res.missing.length} not found`:''}`);window.__lastMerge={...res,file:null,result:r,summary:S};
   let d=$('#mrgSum');if(!d){d=ce('dialog',{id:'mrgSum'});document.body.append(d)}
   d.innerHTML=`<h3 style="margin:4px 0">⇄ Merge summary</h3><b>Brought in from their phone</b><ul>${(S.L.length?S.L:['Nothing new']).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${S.C.length?`<b>Changed on both phones</b><ul>${S.C.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${S.N.length?`<b>Not merged</b><ul>${S.N.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<div class="row"><span class="sp"></span><button type="button" class="btn pri" id="mrgSumX">Done</button></div>`;
   d.querySelector('#mrgSumX').onclick=()=>d.close();d.showModal()};
  if(!res.conflicts.length)return fin({});let d=$('#mrgDlg');if(!d){d=ce('dialog',{id:'mrgDlg'});document.body.append(d)}
  /* bpm-v135: the newest result is picked for each conflict (change it if needed) */
  d.innerHTML=`<h3 style="margin:4px 0">⇄ ${res.conflicts.length} conflict${res.conflicts.length>1?'s':''}</h3><small style="color:#cbd5e1">Tested on both phones. The newest result is picked; change it if needed. ${res.apply.length} other result(s) merge automatically.</small><div id="mrgL">${res.conflicts.map(c=>{const n=newer(c);return`<div class="mc"><h4>${esc(TYPES[c.local.type]?.n||c.local.type)} ${esc(c.local.address||'')}</h4><label><input type="radio" name="m_${c.id}" value="local"${n==='local'?' checked':''}> This phone${n==='local'?' <b class="mNew">newest</b>':''}<br>${fmtR(c.local)}</label><label><input type="radio" name="m_${c.id}" value="remote"${n==='remote'?' checked':''}> Their phone${n==='remote'?' <b class="mNew">newest</b>':''}<br>${fmtR(c.remote)}</label></div>`}).join('')}</div><div class="row"><button type="button" class="btn" id="mrgX">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="mrgGo">Merge</button></div>`;
  d.querySelector('#mrgX').onclick=()=>d.close();d.querySelector('#mrgGo').onclick=async()=>{const p={};res.conflicts.forEach(c=>p[c.id]=d.querySelector(`[name="m_${c.id}"]:checked`).value);d.close();await fin(p)};d.showModal()}
 window.mergeUI=mergeUI;
 $('#splitBtn').onclick=()=>openSplit().catch(e=>{console.error(e);uiAlert('Split could not open: '+e.message)});
 $('#mergeBtn').onclick=()=>{const i=ce('input',{type:'file',accept:'.marker,.bpm,application/zip,application/octet-stream'});i.onchange=()=>i.files[0]&&mergeUI(i.files[0]);i.click()};
})();
