// bpm-v106: docked Layers panel (right of the plan, about the left page strip's width). Same v102 data as the Layers dialog:
// one layer per pin type (window.HT, per project, localStorage 'bpm-tlay:<projectId>') plus Markups (Filters' shapes/clouds/text).
// Wide (≥800px): a grid column, so the plan area shrinks for it (no overlap with pins). Narrower: slide-over from the right, closed by ✕ or the top-bar button.
(()=>{const KEY='bpm-layPanel',P=document.createElement('aside');P.id='lyrP';P.hidden=true;P.setAttribute('aria-label','Layers');document.body.append(P);
 const WMQ=matchMedia('(min-width:800px)');let N={},nT=0,busyN=false;
 const isOpen=()=>!P.hidden,btn=()=>document.getElementById('tb2Lay');
 async function counts(){if(busyN)return;busyN=true;const n={};try{const pl=(await all('plans')).filter(p=>p.projectId===project?.id);for(const q of pl){const ps=plan&&q.id===plan.id?pins:await byIdx('pins','planId',q.id);for(const p of ps)n[p.type]=(n[p.type]||0)+1}}catch{for(const p of pins)n[p.type]=(n[p.type]||0)+1}finally{busyN=false}N=n;render()}
 const mkOn=()=>lay.shapes!==false||lay.clouds!==false||lay.text!==false;
 const setMk=v=>{lay.shapes=lay.clouds=lay.text=v;laySave();try{layToForm()}catch{}};
 const eye=on=>`<span class="lpEye" aria-hidden="true">${on?'👁':'<s>👁</s>'}</span>`;
 function render(){if(!isOpen())return;try{tlayLoad&&tlayLoad()}catch{}const H=window.HT||new Set(),ks=Object.keys(N).filter(k=>TYPES[k]).sort((a,b)=>TYPES[a].n.localeCompare(TYPES[b].n));
  const nm=(()=>{try{return markups.length}catch{return 0}})(),hid=ks.filter(k=>H.has(k)).length+(mkOn()?0:1);
  const row=(k,on,sw,lab,c,tt)=>`<button type="button" class="lpRow${on?'':' off'}" data-k="${k}" aria-pressed="${on}" title="${esc(tt)}">${eye(on)}${sw}<span class="lpN">${esc(lab)}</span><small class="lpC">${c}</small></button>`;
  P.innerHTML=`<div class="lpHead"><b>Layers</b><span class="sp"></span><button type="button" class="btn lpX" id="lpX" title="Close the Layers panel">✕<span class="tl">Close</span></button></div>
   <div class="lpAN"><button type="button" class="btn" id="lpAll" title="Show every layer">👁<span class="tl">Show all</span></button><button type="button" class="btn" id="lpNone" title="Hide every layer">🚫<span class="tl">Hide all</span></button></div>
   <small class="lpInfo">${!project?'Open a project':hid?hid+' hidden':'All shown'}</small>
   <div class="lpList">${row('__mk',mkOn(),'<i class="tlSw lpMk">✎</i>','Markups',nm,'Markups (shapes, clouds, text) on this plan')}
   ${ks.length?ks.map(k=>row(k,!H.has(k),`<i class="tlSw${TYPES[k].sq?' sq':''}" style="background:${TYPES[k].c}">${esc(TYPES[k].l||'')}</i>`,TYPES[k].n.replace(/ – .*/,''),N[k],TYPES[k].n+' – '+N[k]+' in this project')).join(''):'<p class="lpE">No pins yet</p>'}</div>
   <button type="button" class="btn lpMore" id="lpMore" title="More view options (labels, status, suggestions)">⚙<span class="tl">Filters…</span></button>`;
  P.querySelector('#lpX').onclick=()=>set(false);P.querySelector('#lpMore').onclick=()=>{if(!WMQ.matches)set(false);$('#layBtn').click()};
  P.querySelectorAll('.lpRow').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(k==='__mk')return setMk(!mkOn()),render();const H=window.HT;if(!H)return;H.has(k)?H.delete(k):H.add(k);tlaySave()});
  P.querySelector('#lpAll').onclick=()=>{window.HT&&HT.clear();if(!mkOn())setMk(true);tlaySave()};
  P.querySelector('#lpNone').onclick=()=>{if(window.HT)ks.forEach(k=>HT.add(k));if(mkOn())setMk(false);tlaySave()}}
 window.lpRender=render;
 function place(){if(WMQ.matches){P.style.top=P.style.bottom='';return}const t=document.getElementById('top'),b=document.getElementById('tools');P.style.top=Math.round(t?t.getBoundingClientRect().bottom:0)+'px';P.style.bottom=Math.round(b?innerHeight-b.getBoundingClientRect().top:0)+'px'}
 function set(on,quiet){if(on&&window.pinsPanel)try{pinsPanel(false)}catch{}/* bpm-v111: Layers replaces Pins in the right-side slot */P.hidden=!on;document.body.classList.toggle('lpOn',on);const b=btn();if(b){b.classList.toggle('pri',on);b.setAttribute('aria-pressed',on)}if(!quiet)localStorage.setItem(KEY,on?'1':'0');if(on){place();counts()}try{resize()}catch{}}
 window.layPanel=set;window.layPanelToggle=()=>set(!isOpen());
 // top-bar Layers button opens/closes the panel (the full dialog is still in the bottom toolbar's Layers ▾)
 const hook=()=>{const b=btn();if(!b)return setTimeout(hook,200);b.onclick=()=>window.layPanelToggle();b.title='Layers panel: show/hide device types and markups';set(localStorage.getItem(KEY)==='1',true)};hook();
 WMQ.addEventListener('change',()=>{place();try{resize()}catch{}});addEventListener('resize',place);
 // keep counts fresh
 let tm=0;const later=()=>{clearTimeout(tm);tm=setTimeout(()=>isOpen()&&counts(),500)};
 {const _ac=window.afterChange;if(typeof afterChange==='function'){const a0=afterChange;afterChange=function(){a0.apply(this,arguments);later()}}}
 let lastK='';setInterval(()=>{if(!isOpen())return;const k=(project?.id||'')+':'+(plan?.id||'')+':'+pins.length+':'+markups.length+':'+(window.HT?HT.size:0)+':'+mkOn();if(k!==lastK){lastK=k;counts()}},800);
})();
