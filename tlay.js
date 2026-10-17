// bpm-v102: pin TYPE layers. Per project (localStorage 'bpm-tlay:<projectId>'). Hidden types are not drawn, not hit-testable,
// not in the Pins list (a note says how many are hidden), skipped by Walk. Pin data, geometry, totals and exports are untouched.
(()=>{window.HT=new Set();let pid=null;const K=()=>'bpm-tlay:'+pid;
 const load=()=>{let id=null;try{id=project?.id||null}catch{}if(id===pid)return;pid=id;HT=window.HT=new Set(id?JSON.parse(localStorage.getItem(K())||'[]'):[]);mark()};
 const save=()=>{if(pid)localStorage.setItem(K(),JSON.stringify([...HT]));mark();try{sel=null;msel=msel.filter(tVis)}catch{}draw();renderList();if(walk&&walk.p&&!tVis(walk.p))walkNext()};
 const mark=()=>{const on=HT.size>0;document.querySelectorAll('[data-tlay],#tools .tbFlat').forEach(b=>{if(b.dataset.tlay!=null||b._x?.k==='tlay')b.classList.toggle('tlHid',on)});const m=document.querySelector('#tools [data-w=more]');if(m)m.classList.toggle('tlHid',on)};
 window.tlayMark=mark;setInterval(load,700);
 const sw=t=>`<i class="tlSw${t.sq?' sq':''}" style="background:${t.c}">${esc(t.l||'')}</i>`;
 async function counts(){const n={};try{for(const pl of(await all('plans')).filter(p=>p.projectId===project.id))for(const p of await byIdx('pins','planId',pl.id))n[p.type]=(n[p.type]||0)+1}catch{for(const p of pins)n[p.type]=(n[p.type]||0)+1}return n}
 async function open(){if(!project)return uiAlert('Open a project first.');load();const n=await counts();let d=$('#tlDlg');if(!d){d=document.createElement('dialog');d.id='tlDlg';document.body.append(d)}
  const ks=Object.keys(n).filter(k=>TYPES[k]).sort((a,b)=>TYPES[a].n.localeCompare(TYPES[b].n));
  d.innerHTML=`<div class="cHead"><b>Layers: device types</b><span class="sp"></span><button type="button" class="btn" id="tlX">✕<span class="tl">Close</span></button></div>
   <div class="row tlAN"><button type="button" class="btn" id="tlAll">Show all</button><button type="button" class="btn" id="tlNone">Hide all</button><span class="sp"></span><small id="tlInfo"></small></div>
   <div class="tlList">${ks.length?ks.map(k=>`<label class="tlRow"><input type="checkbox" data-k="${k}"${HT.has(k)?'':' checked'}>${sw(TYPES[k])}<span class="tlN">${esc(TYPES[k].n.replace(/ – .*/,''))}</span><small>${n[k]}</small></label>`).join(''):'<p>No pins in this project yet.</p>'}</div>
   <small class="wNote">Hidden types stay in totals and every export. More view options: <a href="#" id="tlMore">Filters</a>.</small>`;
  const info=()=>{const h=ks.filter(k=>HT.has(k)).length;d.querySelector('#tlInfo').textContent=h?`${h} of ${ks.length} hidden`:'All shown'};info();
  d.querySelectorAll('[data-k]').forEach(c=>c.onchange=()=>{c.checked?HT.delete(c.dataset.k):HT.add(c.dataset.k);info();save()});
  d.querySelector('#tlAll').onclick=()=>{HT.clear();d.querySelectorAll('[data-k]').forEach(c=>c.checked=true);info();save()};
  d.querySelector('#tlNone').onclick=()=>{ks.forEach(k=>HT.add(k));d.querySelectorAll('[data-k]').forEach(c=>c.checked=false);info();save()};
  d.querySelector('#tlX').onclick=()=>d.close();d.querySelector('#tlMore').onclick=e=>{e.preventDefault();d.close();$('#layBtn').click()};d.onclick=e=>{if(e.target===d)d.close()};if(!d.open)d.showModal()}
 window.tlayOpen=open;
})();
