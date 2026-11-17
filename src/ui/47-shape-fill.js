// bpm-v147: Fill for shapes (user: "whenever you make a shape, you need to be able to make a fill, so you could easily fill in a shape").
// A filled shape is painted inside with its own line color at the Fill opacity (m.fill = 0.1..1), under its outline. Lines, arrows, arcs, check marks and text never fill.
// Fill ▾ (Draw panel on the phone, drawing tools on wide screens) opens a small row: No fill / Fill, plus a Fill opacity slider (no wheels).
// The setting applies to new shapes and to a shape that is selected right now. The "Shape added" chip and the selection bar also get a Fill button.
// Markups only: pins and pin geometry are never touched. Every change goes through change()/changeMulti(), so it undoes, redoes, saves and exports.
(()=>{const T=window.TBX;if(typeof drawMarkup!=='function')return;
 const KEY='bpmFill';let F={on:false,a:.4};try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&typeof v==='object')F={on:!!v.on,a:Math.max(.1,Math.min(1,+v.a||.4))}}catch{}
 const saveF=()=>{try{localStorage.setItem(KEY,JSON.stringify(F))}catch{}};
 const FT=new Set(['rect','rrect','ellipse','tri','poly','star','cloud']);
 const canFill=m=>!!(m&&!('planId'in m&&'status'in m)&&(FT.has(m.type)||(m.type==='path'&&m.closed)));
 window.canFill=canFill;
 // ---------- drawing ----------
 function fillPath(c,m){const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);c.beginPath();
  if(m.type==='rect'||m.type==='cloud')c.rect(x,y,w,h);
  else if(m.type==='rrect'){const r=Math.min(w,h)*.22;c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h)}
  else if(m.type==='ellipse')c.ellipse(x+w/2,y+h/2,w/2||.1,h/2||.1,0,0,7);
  else if(m.type==='path'){if(window.penPathTo)penPathTo(c,m)}
  else if(window.penShapePts){const P=penShapePts(m);P.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath()}}
 const fillOf=m=>m.fill!=null?+m.fill:(m===draft&&F.on&&canFill(m)?F.a:0);
 const _dm=drawMarkup;drawMarkup=function(c,m,s){const fa=canFill(m)?fillOf(m):0;
  if(fa>0){c.save();c.setLineDash([]);c.globalAlpha=opOf(m,false)*Math.max(.1,Math.min(1,fa));c.fillStyle=m.color||'#e11d48';fillPath(c,m);c.fill();c.restore()}
  return _dm.apply(this,arguments)};
 // ---------- saving ----------
 const refresh=()=>{msel=msel.map(o=>markups.find(x=>x.id===o.id)||pins.find(x=>x.id===o.id)||o);draw();try{renderSelBar()}catch{}};
 async function setFill(list,v){const L=list.filter(canFill).map(m=>{const before=structuredClone(m),after=structuredClone(m);if(v>0)after.fill=+v.toFixed(2);else delete after.fill;return{store:'markups',id:m.id,before,after}}).filter(x=>JSON.stringify(x.before.fill)!==JSON.stringify(x.after.fill));
  if(!L.length)return 0;if(L.length===1)await change('markups',L[0].before,L[0].after);else await changeMulti(L);refresh();return L.length}
 window.setShapeFill=setFill;
 const selShapes=()=>{try{return selItems().filter(canFill)}catch{return[]}};
 // new shapes take the Fill setting (only shapes drawn with the tool, not pasted or merged ones)
 {const _c=change;change=async function(s,b,a,me){if(s==='markups'&&!b&&a&&canFill(a)&&a.fill==null&&F.on&&tool===a.type)a.fill=F.a;const r=await _c.apply(this,arguments);
   if(s==='markups'&&!b&&a&&canFill(a)&&tool===a.type)chipFill(a.id);return r}}
 // "Shape added" chip: Fill / No fill for the shape just drawn
 function chipFill(id){const c=document.getElementById('shpChip');if(!c||c.hidden)return;const m=markups.find(x=>x.id===id);if(!m)return;
  let b=c.querySelector('#scFill');if(!b){b=document.createElement('button');b.type='button';b.className='btn pbB';b.id='scFill';const x=c.querySelector('#scX');x?c.insertBefore(b,x):c.append(b)}
  const lab=()=>{const o=markups.find(x=>x.id===id),on=o&&o.fill>0;b.innerHTML=`<span class="pbI">${on?'▢':'◼'}</span><span class="pbL">${on?'No fill':'Fill'}</span>`;b.title=on?'Take the fill out of this shape':'Fill this shape with its color';b.setAttribute('aria-label',b.title)};
  lab();b.onclick=async()=>{const o=markups.find(x=>x.id===id);if(!o)return;clearTimeout(c._t);await setFill([o],o.fill>0?0:F.a);lab();c._t=setTimeout(()=>{c.hidden=true;window.toastLift&&toastLift()},9000)}}
 // selection bar: Fill / No fill for selected shapes
 {const _r=renderSelBar;renderSelBar=function(){const r=_r.apply(this,arguments);try{const b=$('#selBar'),L=selShapes();if(b&&!b.hidden&&L.length&&!b.querySelector('#selFill')){const on=L.every(m=>m.fill>0);
    const x=document.createElement('button');x.type='button';x.className='btn';x.id='selFill';x.innerHTML=on?'▢ No fill':'◼ Fill';x.title=on?'Take the fill out of the selected shapes':'Fill the selected shapes with their color';x.setAttribute('aria-label',x.title);
    const ref=b.querySelector('#bulkEd')||b.querySelector('#bulkDel');ref?b.insertBefore(x,ref):b.append(x);x.onclick=async()=>{const n=await setFill(selShapes(),on?0:F.a);toast(n?(on?`Fill taken out of ${n} shape${n>1?'s':''}`:`${n} shape${n>1?'s':''} filled`):'Nothing to fill')}}}catch{}return r}}
 // ---------- Fill ▾ button and its row ----------
 const btn=document.createElement('button');btn.type='button';btn.className='tool tbw tbFill';btn.id='tbFill';btn.dataset.w='fill';
 const col=()=>($('#color')&&$('#color').value)||'#e11d48';
 function show(){const c=col();btn.innerHTML=`<svg class="fPv" width="22" height="18" viewBox="0 0 22 18" aria-hidden="true"><rect x="3" y="2" width="16" height="14" rx="2" fill="${F.on?c:'none'}" fill-opacity="${F.on?F.a:0}" stroke="${c}" stroke-width="2.4"/></svg><span class="tl">Fill ▾</span>`;
  btn.title=F.on?`Fill shapes: on (${Math.round(F.a*100)}%)`:'Fill shapes: off';btn.setAttribute('aria-label',btn.title);btn.classList.toggle('on',F.on)}
 show();['input','change'].forEach(k=>$('#color')&&$('#color').addEventListener(k,show));
 let FB=null;
 function render(){const pct=Math.round(F.a*100);FB.innerHTML=`<div class="fbRow"><button type="button" class="btn${F.on?'':' on'}" data-fb="off" aria-pressed="${!F.on}" title="New shapes are not filled"><span aria-hidden="true">▢</span><span class="wbL">No fill</span></button>`+
   `<button type="button" class="btn${F.on?' on':''}" data-fb="on" aria-pressed="${F.on}" title="New shapes are filled with their color"><span aria-hidden="true">◼</span><span class="wbL">Fill</span></button></div>`+
   `<label class="fbOp"><span class="wbOL">Fill opacity</span><input type="range" id="fbOpR" min="10" max="100" step="5" value="${pct}" aria-label="Fill opacity"><b id="fbOpV">${pct}%</b></label>`;
  const apply=async()=>{saveF();show();const L=selShapes();if(L.length){const n=await setFill(L,F.on?F.a:0);if(n)toast(F.on?`${n} selected shape${n>1?'s':''} filled`:`Fill taken out of ${n} selected shape${n>1?'s':''}`)}};
  FB.querySelector('[data-fb=off]').onclick=async()=>{F.on=false;render();await apply()};FB.querySelector('[data-fb=on]').onclick=async()=>{F.on=true;render();await apply()};
  const r=FB.querySelector('#fbOpR');r.oninput=()=>{F.a=+r.value/100;FB.querySelector('#fbOpV').textContent=r.value+'%';show();if(F.on)requestDraw(false)};r.onchange=async()=>{F.a=+r.value/100;if(!F.on){F.on=true;render()}await apply()}}
 function close(){if(FB)FB.hidden=true;btn.classList.toggle('on',F.on)}
 btn.onclick=()=>{if(FB&&!FB.hidden){close();return}
  if(!FB){FB=document.createElement('div');FB.className='widBar fillBar';FB.id='fillBar';FB.setAttribute('role','group');FB.setAttribute('aria-label','Fill options');document.body.append(FB);
   document.addEventListener('pointerdown',e=>{if(!FB||FB.hidden)return;const t=e.target;if(FB.contains(t)||btn.contains(t)||window.barToggleAt&&barToggleAt(t))return;close()},true);
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&FB&&!FB.hidden)close()})}
  const wb=document.getElementById('widBar');if(wb&&!wb.hidden){wb.hidden=true;const o=document.getElementById('wbOp');if(o)o.hidden=true;document.querySelectorAll('[data-w=width].on').forEach(x=>x.classList.remove('on'))}
  render();FB.hidden=false;btn.classList.add('on');window.stackPlace&&stackPlace()};
 // opening the Width row closes the Fill row (one row at a time)
 document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-w=width]'))close()},true);
 window.fillBtn=btn;window.fillSetting=()=>({...F});
 if(window.navLayout)navLayout();
})();
