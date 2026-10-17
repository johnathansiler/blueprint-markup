// bpm-v107: per-device-type colors. Tap a type in the Color sheet (Device type colors) or its swatch in the Layers panel to pick a color;
// pins, list dots, Layers swatches, the color sheet and exports (all drawn from TYPES[k].c) follow. Reset to default per type or for all.
// "Panels (all)" and "VESDA (all parts)" change as one group. Stored per device in localStorage 'bpm-typeColors' ({type:color}).
(()=>{const KEY='bpm-typeColors',DEF={};for(const [k,t] of Object.entries(TYPES))DEF[k]=t.c;
 const PG=typeof PANEL_GRP!=='undefined'?PANEL_GRP:[],VG=Object.keys(DEF).filter(k=>typeof VESDA_C!=='undefined'&&DEF[k]===VESDA_C);
 const grpOf=k=>PG.includes(k)?{ks:PG,n:'Panels (all)'}:VG.includes(k)?{ks:VG,n:'VESDA (all parts)'}:{ks:[k],n:(TYPES[k]?.n||k).replace(/ – .*/,'')};
 let O={};try{O=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{O={}}
 const syncGrp=()=>{try{for(const c of Object.keys(CGRP))delete CGRP[c];const pc=TYPES[PG[0]]?.c,vc=VG.length&&TYPES[VG[0]].c;if(pc)CGRP[pc]='Panels (all)';if(vc)CGRP[vc]='VESDA (all parts)'}catch{}};
 const apply=()=>{for(const k of Object.keys(DEF))if(TYPES[k])TYPES[k].c=O[k]||DEF[k];syncGrp()};apply();
 const refresh=()=>{try{requestDraw(false)}catch{}try{afterChange()}catch{}try{window.layPanelRender&&layPanelRender()}catch{}try{document.dispatchEvent(new CustomEvent('bpm-typecolors'))}catch{}};
 window.typeColor={get:k=>TYPES[k]?.c,def:k=>DEF[k],group:grpOf,
  set(k,c){const g=grpOf(k);for(const x of g.ks){if(!DEF[x])continue;if(c&&c.toLowerCase()!==DEF[x].toLowerCase())O[x]=c;else delete O[x]}localStorage.setItem(KEY,JSON.stringify(O));apply();refresh()},
  reset(k){this.set(k,null)},resetAll(){O={};localStorage.removeItem(KEY);apply();refresh()},changed:()=>Object.keys(O)};
 const ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const PAL=['#e11d48','#dc2626','#991b1b','#f97316','#f59e0b','#facc15','#84cc16','#16a34a','#0d9488','#2dd4bf','#06b6d4','#0ea5e9','#2563eb','#4f46e5','#7c3aed','#c026d3','#db2777','#78350f','#64748b','#000000'];
 // one type (or group): palette + Custom… + Reset to default
 function pick(k,back){const g=grpOf(k),cur=(TYPES[k].c||'').toLowerCase(),df=DEF[k];let d=$('#tcDlg');if(!d){d=ce('dialog');d.id='tcDlg';document.body.append(d)}
  d.innerHTML=`<div class="cHead"><b>Color: ${esc(g.n)}</b><span class="sp"></span><button type="button" class="btn" id="tcX">✕<span class="tl">Close</span></button></div><div class="cBody">
   ${g.ks.length>1?`<p class="tcNote">Changes all ${g.ks.length} ${esc(g.n.replace(/ \(.*\)/,''))} types together.</p>`:''}
   <div class="tcCur"><i style="background:${cur}"></i><span>Now ${cur}${cur===df.toLowerCase()?' (default)':''}</span></div>
   <div class="cGrid tcPal">${PAL.map(c=>`<button type="button" class="cSw${c===cur?' on':''}" data-c="${c}" aria-label="Use ${c}" title="${c}"><i style="background:${c}"></i><span class="cSl">${c}</span></button>`).join('')}</div>
   <div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><label class="btn tcCust" title="Pick any color">🎨<span class="tl">Custom…</span><input type="color" id="tcIn" value="${cur||'#000000'}" style="position:absolute;opacity:0;width:1px;height:1px"></label>
   <button type="button" class="btn" id="tcRes" ${cur===df.toLowerCase()?'disabled':''} title="Back to ${df}">↺<span class="tl">Reset to default</span></button>${back?`<button type="button" class="btn" id="tcBack">‹<span class="tl">All types</span></button>`:''}</div></div>`;
  const done=c=>{typeColor.set(k,c);toast(`${g.n}: ${c?c:'default color'} · pins, list and exports updated`);if(back)list();else d.close()};
  d.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>done(b.dataset.c));d.querySelector('#tcIn').onchange=e=>done(e.target.value);
  d.querySelector('#tcRes').onclick=()=>done(null);d.querySelector('#tcX').onclick=()=>d.close();if(back)d.querySelector('#tcBack').onclick=()=>list();d.onclick=e=>{if(e.target===d)d.close()};if(!d.open)d.showModal()}
 // every type (groups once)
 function rows(){const seen=new Set(),R=[];for(const k of Object.keys(TYPES).sort((a,b)=>grpOf(a).n.localeCompare(grpOf(b).n))){const g=grpOf(k);if(seen.has(g.n))continue;seen.add(g.n);R.push({k,n:g.n,c:TYPES[k].c,ch:g.ks.some(x=>O[x])})}return R}
 const rowHtml=r=>`<button type="button" class="tcRow" data-tk="${r.k}" title="Change the color of ${esc(r.n)}"><i style="background:${r.c}"></i><span>${esc(r.n)}</span>${r.ch?'<small>changed</small>':''}</button>`;
 function list(){let d=$('#tcDlg');if(!d){d=ce('dialog');d.id='tcDlg';document.body.append(d)}
  d.innerHTML=`<div class="cHead"><b>Device type colors</b><span class="sp"></span><button type="button" class="btn" id="tcX">✕<span class="tl">Close</span></button></div><div class="cBody"><p class="tcNote">Tap a type to change its color.</p><div class="tcList">${rows().map(rowHtml).join('')}</div>
   <div class="row" style="margin-top:10px"><button type="button" class="btn" id="tcAll" ${Object.keys(O).length?'':'disabled'}>↺<span class="tl">Reset all to default</span></button></div></div>`;
  d.querySelectorAll('[data-tk]').forEach(b=>b.onclick=()=>pick(b.dataset.tk,true));d.querySelector('#tcX').onclick=()=>d.close();d.querySelector('#tcAll').onclick=()=>{typeColor.resetAll();toast('All device colors back to default');list()};d.onclick=e=>{if(e.target===d)d.close()};if(!d.open)d.showModal()}
 window.typeColorPick=pick;window.typeColorList=list;
 // Color sheet: a "Device type colors" section (tap a type)
 const _cs=window.colSheet;if(_cs){window.colSheet=function(){_cs();const d=$('#colDlg');if(!d)return;const body=d.querySelector('.cBody');if(!body||body.querySelector('.tcSec'))return;
  const s=ce('div','tcSec',`<h4>Device type colors <small>(tap a type to change it)</small></h4><div class="tcList">${rows().map(rowHtml).join('')}</div><div class="row" style="margin-top:6px"><button type="button" class="btn" id="tcAll2" ${Object.keys(O).length?'':'disabled'}>↺<span class="tl">Reset all to default</span></button></div>`);body.append(s);
  s.querySelectorAll('[data-tk]').forEach(b=>b.onclick=()=>{d.close();pick(b.dataset.tk)});s.querySelector('#tcAll2').onclick=()=>{typeColor.resetAll();d.close();toast('All device colors back to default')}}}
 // Layers panel: swatch tap = pick color (row tap still toggles the layer); plus a labeled Colors… button
 const lp=$('#lyrP');if(lp){lp.addEventListener('click',e=>{const sw=e.target.closest('.tlSw'),r=e.target.closest('.lpRow');if(sw&&r&&r.dataset.k&&r.dataset.k!=='__mk'&&TYPES[r.dataset.k]){e.preventDefault();e.stopImmediatePropagation();pick(r.dataset.k)}},true);
  new MutationObserver(()=>{const a=lp.querySelector('.lpAN');if(a&&!a.querySelector('#lpCol')){const b=ce('button','btn','🎨<span class="tl">Colors…</span>');b.type='button';b.id='lpCol';b.title='Change device type colors';b.onclick=()=>list();a.append(b)}lp.querySelectorAll('.lpRow .tlSw').forEach(s=>{if(!s.title)s.title='Tap the swatch to change this type\u2019s color'})}).observe(lp,{childList:true,subtree:true})}
 document.addEventListener('bpm-typecolors',()=>{const lp=$('#lyrP');if(lp&&!lp.hidden){const b=document.getElementById('tb2Lay');/* re-render via counts on next open */try{lp.querySelectorAll('.lpRow').forEach(r=>{const k=r.dataset.k,s=r.querySelector('.tlSw');if(s&&TYPES[k])s.style.background=TYPES[k].c})}catch{}}});
 setTimeout(()=>{try{requestDraw(false)}catch{}},0);
})();
