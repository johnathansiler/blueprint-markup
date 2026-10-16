// bpm-v88: pin Model picker — scrollable, searchable list of ALL catalog models grouped by type/category.
(()=>{const sel=$('#dModelSel'),btn=document.createElement('button');btn.type='button';btn.id='dModelBtn';btn.className='btn';sel.style.display='none';sel.after(btn);
 const dlg=document.createElement('dialog');dlg.id='mdlDlg';dlg.innerHTML=`<div class="mdH"><b>Model</b><span class="sp"></span><button type="button" class="btn" id="mdX">✕ Close</button></div><input id="mdQ" type="search" placeholder="Search model or description…" autocomplete="off"><div id="mdL"></div>`;document.body.append(dlg);
 const lbl=()=>{const v=form.elements.model.value.trim();btn.innerHTML=`<span class="mdV">${v?esc(v):'— none —'}</span> ▾`;btn.title=v&&MODEL_DESC[v]||'Pick a model'};
 const _mo=modelOpts;modelOpts=async function(...a){const r=await _mo.apply(this,a);lbl();return r};sel.addEventListener('change',lbl);
 async function groups(t){const c=await customModels(),G=[],seen=new Set();const add=(k,n,ms)=>{ms=[...new Set(ms)].filter(Boolean);if(ms.length)G.push({k,n,ms})};
  const ty=Object.keys(TYPES),order=[t,...ty.filter(x=>x!==t)];
  for(const x of order){const S=MODELS[x]||[];add('t:'+x,TYPES[x].n,S);S.forEach(m=>seen.add(m));const C=(c[x]||[]).filter(m=>!S.includes(m));add('c:'+x,TYPES[x].n+' · My models',C)}
  const byC={};for(const p of CATALOG)if(!seen.has(p.m))(byC[p.c||'Other']??=[]).push(p.m);for(const[k,ms]of Object.entries(byC))add('k:'+k,k,ms);
  try{await userParts();add('my','My devices',Object.keys(UPARTS||{}))}catch{}return G}
 async function render(){const t=form.elements.type.value,q=$('#mdQ').value.trim().toLowerCase(),v=form.elements.model.value.trim(),G=await groups(t);
  const row=m=>`<button type="button" class="mdI${m===v?' on':''}" data-m="${esc(m)}"><b>${esc(m)}</b>${MODEL_DESC[m]?`<small>${esc(MODEL_DESC[m])}</small>`:''}${UPARTS&&UPARTS[m]?'<i class="myB">My devices</i>':''}</button>`;
  const hit=m=>!q||m.toLowerCase().includes(q)||(MODEL_DESC[m]||'').toLowerCase().includes(q);
  let h=`<button type="button" class="mdI" data-m=""><b>— none —</b></button><button type="button" class="mdI" data-m="__custom"><b>Custom…</b><small>Type a model not in the list</small></button>`,n=0;
  for(const g of G){const ms=g.ms.filter(hit);if(!ms.length)continue;n+=ms.length;const own=g.k==='t:'+t||g.k==='c:'+t;h+=`<details class="mdG" data-k="${esc(g.k)}"${own||q?' open':''}><summary>${esc(g.n)} <small>${ms.length}</small></summary>${ms.map(row).join('')}</details>`}
  if(q&&!n)h+=`<div class="mdE">No match. Use Custom… to type “${esc(q)}”.</div>`;$('#mdL').innerHTML=h}
 btn.onclick=async()=>{$('#mdQ').value='';await render();dlg.showModal();const o=$('#mdL .mdI.on');if(o)o.scrollIntoView({block:'center'})};
 $('#mdQ').oninput=render;$('#mdX').onclick=()=>dlg.close();
 $('#mdL').onclick=e=>{const b=e.target.closest('.mdI');if(!b)return;const m=b.dataset.m;if(m&&m!=='__custom'&&![...sel.options].some(o=>o.value===m))sel.add(new Option(m,m),sel.options[sel.options.length-1]);sel.value=m;if(m!=='__custom')form.elements.model.value=m;sel.dispatchEvent(new Event('change',{bubbles:true}));if(typeof dsBtnSync==='function')dsBtnSync();lbl();dlg.close()};
 window.mdlRender=render;lbl()})();
$('#dQrBtn').before($('#dDsBtn'));
