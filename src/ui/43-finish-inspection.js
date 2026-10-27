// bpm-v142: Finish inspection step (recommendation 5). One screen with what's left, grouped instead of one row per device: not tested by page and by
// type, failed without a photo or a reason, no address by page, tester details. Then one button makes the report PDF and saves the project file (the
// backup) in one go. Menu > Finish inspection…  Uses the same checks as the Before you send list; Go to buttons are per group, not per device.
// Classic script; shares the app's globals (project, plan, pins, page, walk, projData, pnAll, pgT, untested, byIdx, getJob, deliver, buildBpm …).
(()=>{const MX=window.V135&&V135.MX;let d=null,FIN={skipPre:false};
 const _ps=window.preSend;window.preSend=async function(...a){if(FIN.skipPre)return true;return _ps.apply(this,a)};
 const isFail=p=>String(p.status).includes('fail');
 async function gather(){await pnAll();const D=await projData(),multi=D.length>1,G={total:0,tested:0,failed:0,left:0,pg:new Map(),ty:new Map(),noPhoto:[],noReason:[],noAddr:new Map(),noAddrN:0,tester:'',lic:''};
  const pgName=(pl,n)=>(multi?(pl.name||'Plan')+' · ':'')+pgT(pl.id,n);
  for(const{pl,pins:ps}of D)for(const p of ps.slice().sort((a,b)=>a.page-b.page||a.y-b.y||a.x-b.x)){G.total++;const k=pl.id+'|'+p.page;
   if(untested(p)){G.left++;const g=G.pg.get(k)||{pl:pl.id,page:p.page,t:pgName(pl,p.page),n:0,p};g.n++;G.pg.set(k,g);G.ty.set(p.type,(G.ty.get(p.type)||0)+1)}else G.tested++;
   if(isFail(p)){G.failed++;const nm={pl:pl.id,p,t:`${TYPES[p.type]?.n||p.type} ${p.address||'(no address)'} · ${pgName(pl,p.page)}`};if(!p.reason)G.noReason.push(nm);
    const md=await byIdx('media','pinId',p.id);if(!md.some(m=>!m.lastVisit&&(m.kind||'photo')!=='audio'))G.noPhoto.push(nm)}
   if(!String(p.address||'').trim()){G.noAddrN++;const g=G.noAddr.get(k)||{pl:pl.id,page:p.page,t:pgName(pl,p.page),n:0,p};g.n++;G.noAddr.set(k,g)}}
  const tn=tester===null?await get('meta','tester'):tester,j=project?await getJob():{};G.tester=tn||j.techName||'';G.lic=j.techLic||j.license||'';return G}
 async function goTo(pl,pg,p,card){d&&d.close();document.querySelectorAll('dialog[open]').forEach(x=>x.close());if(plan?.id!==pl||page!==pg)await openPlan(pl,pg);
  if(p){const q=pins.find(x=>x.id===p.id);if(q){centerOn(q.x,q.y,Math.max(view.s,1),stage.clientWidth/2,stage.clientHeight/2);draw();if(card)openPin(q)}}}
 const row=(t,n,btn,data)=>`<li><span class="finR">${esc(t)}</span>${n!=null?`<b class="finC">${n}</b>`:''}${btn?`<button type="button" class="btn" data-go="${data}">${btn}</button>`:''}</li>`;
 const none=t=>`<div class="finOk">✔ ${esc(t)}</div>`;
 async function open(){if(!project)return uiAlert('Open a project first.');if(walk)return uiAlert('Leave the walk test first, then finish the inspection.');
  busy(1,'Checking what is left');let G;try{G=await gather()}finally{busy(0)}
  if(!G.total)return uiAlert('This project has no devices yet.');
  if(!d){d=ce('dialog','');d.id='finDlg';document.body.append(d)}
  const GO=[],go=(x)=>(GO.push(x),GO.length-1),pgs=[...G.pg.values()],tys=[...G.ty.entries()].sort((a,b)=>b[1]-a[1]),na=[...G.noAddr.values()];
  const failRows=L=>L.slice(0,50).map(x=>row(x.t,null,'Go to device',go({pl:x.pl,p:x.p,card:1}))).join('')+(L.length>50?`<li><span class="finR">and ${L.length-50} more</span></li>`:'');
  d.innerHTML=`<div class="finTop"><h3>Finish inspection</h3><span class="sp"></span><button type="button" class="btn" id="finX">Close</button></div>
   <div class="finBody"><p class="finSum"><b>${G.tested} of ${G.total}</b> devices tested · ${G.failed} failed · ${G.left} not tested</p>
   <section id="finLeft"><h4>Not tested yet (${G.left})</h4>${G.left?`<div class="finSub">By page</div><ul class="finL">${pgs.map(g=>row(g.t,g.n,'Go to page',go({pl:g.pl,page:g.page,p:g.p}))).join('')}</ul><div class="finSub">By type</div><ul class="finL">${tys.map(([t,n])=>row(TYPES[t]?.n||t,n)).join('')}</ul>`:none('Every device is tested')}</section>
   <section id="finPhoto"><h4>Failed without a photo (${G.noPhoto.length})</h4>${G.noPhoto.length?`<ul class="finL">${failRows(G.noPhoto)}</ul>`:none('Every failed device has a photo')}</section>
   <section id="finReason"><h4>Failed without a reason (${G.noReason.length})</h4>${G.noReason.length?`<ul class="finL">${failRows(G.noReason)}</ul>`:none('Every failed device has a reason')}</section>
   <section id="finAddr"><h4>No address (${G.noAddrN})</h4>${G.noAddrN?`<ul class="finL">${na.map(g=>row(g.t,g.n,'Go to page',go({pl:g.pl,page:g.page,p:g.p}))).join('')}</ul><button type="button" class="btn" id="finSweep">Start address sweep</button>`:none('Every device has an address')}</section>
   <section id="finTester"><h4>Tester</h4>${G.tester&&G.lic?none(`${G.tester}, license ${G.lic}`):`<div class="finWarn">${!G.tester?'Tester name is missing. ':''}${!G.lic?'Tester license number is missing.':''}</div><button type="button" class="btn" id="finJob">Open job info</button>`}</section></div>
   <div class="finFoot"><label><input type="checkbox" id="finRep" checked> Make the report PDF</label><label><input type="checkbox" id="finBpm" checked> Save the project file (your backup)</label>
    <div class="row"><span class="sp"></span><button type="button" class="btn pri" id="finGo">Finish and save</button></div></div>`;
  d.querySelector('#finX').onclick=()=>d.close();
  d.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const x=GO[+b.dataset.go];goTo(x.pl,x.p?.page??x.page,x.p,x.card)});
  const sw=d.querySelector('#finSweep');if(sw)sw.onclick=async()=>{const g=na[0];await goTo(g.pl,g.page,null);window.sweepStart&&sweepStart()};
  const jb=d.querySelector('#finJob');if(jb)jb.onclick=()=>{d.close();by('jobBtn')&&by('jobBtn').click()};
  d.querySelector('#finGo').onclick=()=>finish(d.querySelector('#finRep').checked,d.querySelector('#finBpm').checked);
  d.showModal();d.querySelector('.finBody').scrollTop=0;return true}
 async function saveFile(){const pr=project;busy(1,'Saving project file');prog(0);
  try{let wl=false;try{wl=(await learnedRules()).length>0}catch{}const r=await deliver(fsafe(pr.name)+'.bpm','application/octet-stream','.bpm',async()=>{const b=await buildBpm(pr.id,wl,prog);window.__lastBpm=b;return b});
   if(r){window.bkSaved&&await bkSaved(pr.id);return 'saved'}return 'cancelled'}catch(e){showErr('Saving the project file failed: '+e.message);return 'failed'}finally{busy(0)}}
 async function makeReport(){const b=by('reportPdf');if(!b||!b.onclick)return 'failed';let got=false;const _dl=window.dl;window.dl=function(blob,name,...r){if(/inspection-report\.pdf$/.test(name))got=true;return _dl.call(this,blob,name,...r)};
  FIN.skipPre=true;try{await b.onclick(new Event('click'))}catch(e){showErr('Report failed: '+e.message)}finally{FIN.skipPre=false;window.dl=_dl}return got?'saved':'failed'}
 async function finish(rep,bpm){if(!rep&&!bpm)return uiAlert('Tick the report, the project file, or both.');const R=[];
  d.querySelector('#finGo').disabled=true;
  try{if(rep)R.push(['Report PDF',await makeReport()]);if(bpm)R.push(['Project file (backup)',await saveFile()])}finally{const g=d.querySelector('#finGo');if(g)g.disabled=false}
  const W={saved:'saved',cancelled:'not saved (cancelled)',failed:'not saved (failed)'};window.__finLast=R;
  d.querySelector('.finBody').innerHTML=`<p class="finSum">${R.every(r=>r[1]==='saved')?'All done.':'Finished with a problem.'}</p><ul class="finL">${R.map(([t,s])=>`<li><span class="finR">${t}</span><b class="finC ${s==='saved'?'finY':'finN'}">${W[s]}</b></li>`).join('')}</ul>`;
  d.querySelector('.finFoot').innerHTML=`<div class="row"><span class="sp"></span><button type="button" class="btn pri" id="finClose">Close</button></div>`;d.querySelector('#finClose').onclick=()=>d.close();
  if(!d.open)d.showModal();toast(R.map(([t,s])=>t+' '+W[s]).join(' · '),true)}
 window.finishOpen=open;
 if(MX)MX.push(()=>[{i:'🏁',l:'Finish inspection…',run:open}]);
})();
