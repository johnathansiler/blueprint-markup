// bpm-v115: deficiency list. Photo/thumbnail tap -> full-size viewer (pinch/zoom, swipe between that device's photos, video/voice players, labeled Close).
// Text tap -> the list STAYS open; the plan (free area beside/above the panel) smoothly pans/zooms to the device (switching page if needed), selects it with
// a short blink, and the tapped row is marked as the current item.
(()=>{const $$=s=>document.querySelector(s),L=$$('#defList');if(!L||typeof renderDefs!=='function')return;
 let CUR=null;
 // ---------- viewer ----------
 const V=document.createElement('div');V.id='mViewer';V.hidden=true;V.setAttribute('role','dialog');V.setAttribute('aria-label','Photo viewer');
 V.innerHTML='<div class="mvTop"><span class="mvT"></span><span class="sp"></span><button type="button" class="btn" id="mvClose" aria-label="Close the viewer">✕<span class="tl">Close</span></button></div><div class="mvStage"></div><div class="mvNav"><button type="button" class="btn" id="mvPrev" aria-label="Previous item">◀<span class="tl">Prev</span></button><span class="mvN"></span><button type="button" class="btn" id="mvNext" aria-label="Next item">▶<span class="tl">Next</span></button></div>';
 document.body.append(V);const VS=V.querySelector('.mvStage');let M=[],MI=0,urls=[],Z={s:1,x:0,y:0};
 const freeU=()=>{urls.forEach(URL.revokeObjectURL);urls=[]};
 function show(){VS.innerHTML='';Z={s:1,x:0,y:0};const m=M[MI];if(!m)return;const u=URL.createObjectURL(m.kind==='photo'?(m.annot||m.blob):m.blob);urls.push(u);
  let el;if(m.kind==='video'){el=document.createElement('video');el.controls=true;el.playsInline=true}else if(m.kind==='audio'||m.kind==='voice'){el=document.createElement('audio');el.controls=true}else{el=document.createElement('img');el.alt='Deficiency photo'}
  el.src=u;el.className='mvM';VS.append(el);V.querySelector('.mvN').textContent=M.length>1?`${MI+1} / ${M.length}`:'';V.querySelector('#mvPrev').hidden=V.querySelector('#mvNext').hidden=M.length<2;apply()}
 const apply=()=>{const e=VS.querySelector('img.mvM');if(e)e.style.transform=`translate(${Z.x}px,${Z.y}px) scale(${Z.s})`};
 const go=d=>{if(M.length<2)return;MI=(MI+d+M.length)%M.length;show()};
 async function openViewer(pinId,title){const ms=(await byIdx('media','pinId',pinId)).filter(m=>['photo','video','audio','voice'].includes(m.kind)).sort((a,b)=>(a.kind==='photo'?0:1)-(b.kind==='photo'?0:1)||a.created-b.created);
  if(!ms.length)return;M=ms;MI=0;V.querySelector('.mvT').textContent=title||'';V.hidden=false;requestAnimationFrame(()=>V.classList.add('in'));show()}
 const closeV=()=>{V.classList.remove('in');V.hidden=true;VS.innerHTML='';freeU()};
 V.querySelector('#mvClose').onclick=closeV;V.querySelector('#mvPrev').onclick=()=>go(-1);V.querySelector('#mvNext').onclick=()=>go(1);
 document.addEventListener('keydown',e=>{if(V.hidden)return;if(e.key==='Escape')closeV();else if(e.key==='ArrowLeft')go(-1);else if(e.key==='ArrowRight')go(1)});
 // pinch / pan / swipe
 const P=new Map();let g0=null;
 VS.addEventListener('pointerdown',e=>{if(!VS.querySelector('img.mvM'))return;VS.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});g0={Z:{...Z},pts:[...P.values()].map(p=>({...p})),t:performance.now()}});
 VS.addEventListener('pointermove',e=>{if(!P.has(e.pointerId)||!g0)return;P.set(e.pointerId,{x:e.clientX,y:e.clientY});const pts=[...P.values()];
  if(pts.length>=2&&g0.pts.length>=2){const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),c=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});const k=d(pts[0],pts[1])/Math.max(1,d(g0.pts[0],g0.pts[1])),c0=c(g0.pts[0],g0.pts[1]),c1=c(pts[0],pts[1]);
   Z.s=Math.max(1,Math.min(8,g0.Z.s*k));Z.x=g0.Z.x+(c1.x-c0.x);Z.y=g0.Z.y+(c1.y-c0.y)}else if(Z.s>1.01){Z.x=g0.Z.x+(pts[0].x-g0.pts[0].x);Z.y=g0.Z.y+(pts[0].y-g0.pts[0].y)}apply()});
 const up=e=>{const p0=g0&&g0.pts[0],q=P.get(e.pointerId);P.delete(e.pointerId);if(!P.size&&g0&&p0&&q&&g0.pts.length===1&&Z.s<=1.01){const dx=q.x-p0.x;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(q.y-p0.y))go(dx<0?1:-1)}if(!P.size)g0=null;else g0={Z:{...Z},pts:[...P.values()].map(p=>({...p}))}};
 VS.addEventListener('pointerup',up);VS.addEventListener('pointercancel',up);
 VS.addEventListener('wheel',e=>{if(!VS.querySelector('img.mvM'))return;e.preventDefault();Z.s=Math.max(1,Math.min(8,Z.s*(e.deltaY<0?1.15:1/1.15)));if(Z.s===1)Z.x=Z.y=0;apply()},{passive:false});
 VS.addEventListener('dblclick',()=>{Z=Z.s>1?{s:1,x:0,y:0}:{s:2.5,x:0,y:0};apply()});
 // ---------- fly to the device, list stays open ----------
 async function flyTo(plId,pinId,li){CUR=pinId;L.querySelectorAll('li.cur').forEach(x=>{x.classList.remove('cur');x.removeAttribute('aria-current')});if(li){li.classList.add('cur');li.setAttribute('aria-current','true')}
  if(plan?.id!==plId){const p0=await get('pins',pinId);await openPlan(plId,p0?.page||1);const pn=$$('#panel');if(pn.hidden&&window.pinsPanel)pinsPanel(true);if(!$$('#panel').classList.contains('defmode'))setMode(true)}
  const p=pins.find(x=>x.id===pinId);if(!p)return;if(p.page!==page)await gotoPage(p.page);
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  // free plan area: the plan box minus the overlaying right panel (phone) and the Pages strip (phone)
  const st=getComputedStyle(stage),frR=parseFloat(st.getPropertyValue('--frR'))||0,phS=parseFloat(getComputedStyle(document.body).getPropertyValue('--phStrip'))||0;
  const W=stage.clientWidth-frR,H=stage.clientHeight-phS,s=Math.max(view.s,1.5/dpr()*2),d=rotP(p.x,p.y),v1={s,x:W/2-d.x*s,y:H/2-d.y*s};
  sel={kind:'p',o:p};await slideTo(v1,700);if(CUR!==pinId)return;
  for(let i=0;i<3;i++){sel=null;draw();await new Promise(r=>setTimeout(r,140));sel={kind:'p',o:p};draw();await new Promise(r=>setTimeout(r,140))}}
 window.defFlyTo=flyTo;window.defViewer=openViewer;
 // ---------- wire rows after each render ----------
 function wire(){for(const li of L.querySelectorAll('li[data-id]')){if(li._dw)continue;li._dw=1;li.onclick=null;li.tabIndex=0;li.setAttribute('role','button');
   const th=li.querySelector('.thumb'),tx=li.querySelector('div');if(li.dataset.id===CUR)li.classList.add('cur');
   if(th&&th.tagName==='IMG'){th.setAttribute('role','button');th.setAttribute('aria-label','Open the photo full size');th.title='Open the photo full size'}
   li.addEventListener('click',e=>{if(e.target.closest('.thumb')&&th&&th.tagName==='IMG'){e.stopPropagation();openViewer(li.dataset.id,(tx&&tx.querySelector('b')?.textContent||'')+' '+(tx?tx.textContent.split('\n')[0].slice(0,60):''));return}flyTo(li.dataset.pl,li.dataset.id,li)});
   li.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();flyTo(li.dataset.pl,li.dataset.id,li)}})}}
 new MutationObserver(wire).observe(L,{childList:true});wire();
})();
