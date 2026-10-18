// bpm-v113: ONE layout manager for all side panels. Left slot = page preview only (open by default; phone: bottom strip above the tool bar);
// right slot = Pins OR Layers (same default width as Layers). Panels span exactly the plan's vertical extent (never over the bottom bars),
// never overlap each other, and the plan's margins track the panels' VISIBLE edges every frame, so the plan resizes with each slide.
// Drag handles on inner edges (no Expand button), clamped by the neighbour's minimum, width remembered per panel. Slides use the Layers motion.
(()=>{const by=id=>document.getElementById(id),ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const B=document.body,ST=by('stage'),TH=by('thumbs'),THB=by('thBtn');if(!ST||!TH||!THB)return;
 const PH=()=>innerWidth<600,RM=matchMedia('(prefers-reduced-motion: reduce)'),PLANMIN=()=>PH()?0:160;
 THB.setAttribute('aria-label','Pages: show or hide the page preview');
 // ---- slide in/out (Layers motion), instant-old + width-tween for same-side swaps ----
 let NOTR=0,rzT;const NOANIM=new WeakSet(),OUT=new WeakSet();
 function slideOut(el){if(el)el.classList.remove('rlNoIn');if(!el||RM.matches||NOANIM.has(el)){NOANIM.delete(el);return}OUT.add(el);el.classList.remove('rlOut');void el.offsetWidth;el.classList.add('rlOut');const me={};el._rlO=me;
  const fin=()=>{if(el._rlO!==me)return;el._rlO=null;el.classList.remove('rlOut');OUT.delete(el);sync()};el.addEventListener('animationend',fin,{once:true});setTimeout(fin,260);follow(300)}
 function swapIn(el,fromW,toW){if(!el)return;el.classList.add('rlNoIn');if(RM.matches||Math.abs(fromW-toW)<1)return;el._tw=1;el.style.transition='none';el.style.width=fromW+'px';void el.offsetWidth;el.style.transition='width .18s ease-out';el.style.width=toW+'px';follow(360);
  clearTimeout(el._twT);el._twT=setTimeout(()=>{el._tw=0;el.style.transition='';sync()},230)}
 const T_={pages:0,right:0};// last open/resize time per side (layout priority)
 let openR=null;
 const partner=el=>el.id==='panel'?by('lyrP'):el.id==='lyrP'?by('panel'):null,kOf=el=>el.id==='panel'?'pins':'layers';
 function swapR(nu,old){if(nu._swd)return;nu._swd=1;requestAnimationFrame(()=>{nu._swd=0});NOANIM.add(old);swapIn(nu,old.getBoundingClientRect().width||eff[kOf(old)]||W_[kOf(old)],eff[kOf(nu)]||W_[kOf(nu)])}
 function watch(el,side){if(!el||el._rlW)return;el._rlW=1;let was=el.hidden;new MutationObserver(()=>{const h=el.hidden,o=partner(el);
   if(h&&!was){was=true;if(o&&!o.hidden)swapR(o,el);slideOut(el)}
   else if(!h&&was){was=false;el._rlO=null;el.classList.remove('rlOut');OUT.delete(el);T_[side]=performance.now();
    if(o&&openR===kOf(o))swapR(el,o);else if(!el._swd)el.classList.remove('rlNoIn')}
   else if(!h&&was===false&&!el._swd)el.classList.add('rlNoIn');/* hidden+shown in one tick: no net change, so no replayed slide */
   sync();follow(360)}).observe(el,{attributes:true,attributeFilter:['hidden']})}
 // ---- widths ----
 const NAR={pages:()=>innerWidth<1000?118:132,pins:()=>PH()?Math.min(260,Math.round(innerWidth*.82)):124,layers:()=>PH()?Math.min(260,Math.round(innerWidth*.82)):124};
 const MAX=()=>PH()?innerWidth-16:Math.round(innerWidth*.5);
 const key=k=>'bpm-pw-'+k+(PH()?'-ph':'');
 const getW=k=>{const v=+localStorage.getItem(key(k));const n=NAR[k]();return v?Math.max(n,Math.min(MAX(),v)):n};
 const W_={},eff={};
 const setW=(k,w,save)=>{W_[k]=Math.round(Math.max(NAR[k](),Math.min(clampMax(k),w)));if(save)localStorage.setItem(key(k),String(W_[k]));if(k==='pages')T_.pages=performance.now();else T_.right=performance.now();sync()};
 const rightK=()=>{const pn=by('panel'),ly=by('lyrP');return pn&&!pn.hidden?'pins':ly&&!ly.hidden?'layers':null};
 function clampMax(k){let m=MAX();if(!PH()){const other=k==='pages'?rightK():(TH.hidden?null:'pages');if(other)m=Math.min(m,innerWidth-PLANMIN()-NAR[other]())}return m}
 // ---- drag handles (inner edge, no button) ----
 const PAN={pages:{el:TH,side:'L',nm:'page preview'},pins:{el:by('panel'),side:'R',nm:'Pins panel'},layers:{el:null,side:'R',nm:'Layers panel'}};
 const G={};for(const k of Object.keys(PAN)){const g=ce('div','pGrip','<span class="pgBar" aria-hidden="true"></span>');g.dataset.k=k;g.hidden=true;g.setAttribute('role','separator');g.setAttribute('aria-orientation','vertical');g.setAttribute('aria-label','Drag to resize the '+PAN[k].nm);g.title='Drag to resize the '+PAN[k].nm;B.append(g);G[k]=g;
  g.addEventListener('pointerdown',e=>{const el=PAN[k].el;if(!el)return;e.preventDefault();g.setPointerCapture(e.pointerId);g.classList.add('drag');B.classList.add('rlDrag');const r=el.getBoundingClientRect();
   const mv=ev=>setW(k,PAN[k].side==='L'?ev.clientX-r.left:r.right-ev.clientX,false),up=()=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);g.removeEventListener('pointercancel',up);g.classList.remove('drag');B.classList.remove('rlDrag');setW(k,W_[k],true)};
   g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)})}
 const shown=e=>e&&(!e.hidden||OUT.has(e))&&getComputedStyle(e).display!=='none';
 // ---- the layout manager ----
 function sync(){const ly=by('lyrP'),pn=by('panel');PAN.layers.el=ly;watch(ly,'right');const ph=PH(),walkOn=typeof walk!=='undefined'&&!!walk;
  B.classList.add('rl');B.classList.toggle('rlPh',ph);
  for(const k in PAN)if(W_[k]==null)W_[k]=getW(k);
  const thOn=!TH.hidden,rk=rightK();
  // widths: the most recently opened/resized side keeps its width, the other shrinks toward its minimum; if even that does not fit, the older side closes
  let wl=W_.pages,wr=rk?W_[rk]:0;
  if(!ph&&thOn&&rk){const avail=innerWidth-PLANMIN();if(wl+wr>avail){const keepL=T_.pages>=T_.right;
    if(keepL){wr=Math.max(NAR[rk](),avail-wl);if(wl+wr>avail){wl=Math.max(NAR.pages(),avail-wr);if(wl+wr>avail){(rk==='pins'?window.pinsPanel&&pinsPanel(false):window.layPanel&&layPanel(false));return}}}
    else{wl=Math.max(NAR.pages(),avail-wr);if(wl+wr>avail){wr=Math.max(NAR[rk](),avail-wl);if(wl+wr>avail){TH.hidden=true;THB.classList.remove('pri');return}}}}}
  eff.pages=wl;if(rk)eff[rk]=wr;
  B.style.setProperty('--thW',wl+'px');
  for(const [e,k] of [[pn,'pins'],[ly,'layers']]){if(!e||e._tw)continue;e.style.width=(k===rk?wr:W_[k])+'px'}
  const sr=ST.getBoundingClientRect(),top=Math.round(sr.top),h=Math.round(sr.height);
  if(!ph){TH.style.top=top+'px';TH.style.height=h+'px';TH.style.left='0px'}else{TH.style.top=TH.style.height=TH.style.left=''}
  applyBottom(sr);
  {const v=(ph&&thOn?TH.offsetHeight:0)+'px';if(B.style.getPropertyValue('--phStrip')!==v)B.style.setProperty('--phStrip',v)}/* phone: plan-bottom bars (pen, shape, freehand, stamp, Detect, walk, toast) sit above the strip */
  // plan margins: target = the panels' final widths, moved with the SAME duration/easing as the panel slide/width tween (one CSS clock, so the plan edge and the
 // panel edge are in step in every frame); instant while dragging, rotating or with reduced motion
 const L=!ph&&thOn?wl:0,Rr=!ph&&rk?wr:0,tr=RM.matches||B.classList.contains('rlDrag')||NOTR?'none':'margin-left .18s ease-out,margin-right .18s ease-out,--frR .18s ease-out';
 if(ST.style.transition!==tr)ST.style.transition=tr;if(ST.style.marginLeft!==L+'px')ST.style.marginLeft=L+'px';if(ST.style.marginRight!==Rr+'px')ST.style.marginRight=Rr+'px';
 // Detect pop-up: on phone the right panel overlays the plan, so the pop-up keeps to the free part (and steps aside if there is no room)
  // floating banners/pills/toasts (legend chip, Detect pop-up, toast, selection/pen/shape bars): kept inside the FREE plan area. On phone the right panel overlays
  // the plan, so the free area ends at the panel's final left edge; --frR moves on the same .18s ease-out clock as the panel slide (registered @property)
  {const fr=(ph&&rk?wr:0)+'px';if(ST.style.getPropertyValue('--frR')!==fr)ST.style.setProperty('--frR',fr)}
  // grips
  for(const k in PAN){const g=G[k],el=PAN[k].el,on=shown(el)&&!OUT.has(el)&&!walkOn&&!(ph&&k==='pages');if(!on){if(!g.hidden)g.hidden=true;continue}const r=el.getBoundingClientRect();g.hidden=false;
   const x=PAN[k].side==='L'?r.right:r.left;g.style.left=Math.round(x-12)+'px';g.style.top=Math.round(r.top)+'px';g.style.height=Math.round(r.height)+'px'}
  openR=rk}
 // right panels: exactly the stage's vertical extent; phone: above the Pages strip (followed frame by frame while it slides)
 function applyBottom(sr){sr=sr||ST.getBoundingClientRect();/* phone: stop at the strip's FINAL top; the height transition (same .18s ease-out as the strip's slide) keeps the two edges together every frame */
  const bot=PH()&&!TH.hidden&&getComputedStyle(TH).display!=='none'?Math.min(sr.bottom,TH.offsetTop):sr.bottom;
  for(const e of [by('panel'),by('lyrP')]){if(!e)continue;e.style.top=Math.round(sr.top)+'px';const hv=Math.max(80,Math.round(bot-sr.top))+'px';if(e.style.height!==hv)e.style.height=hv;e.style.bottom='auto'}}
 let folT=0,SLID=0;function follow(ms){folT=Math.max(folT,performance.now()+ms);if(follow.on)return;follow.on=1;try{if(!SLIDING){SLIDING=1;SLID=1}}catch{}
  const st=()=>{try{sync()}catch(e){console.error(e)}if(performance.now()<folT)requestAnimationFrame(st);else{follow.on=0;if(SLID){SLID=0;try{SLIDING=0;scheduleRender()}catch{}}}};requestAnimationFrame(st)}/* no PDF re-render during a slide; one real render at the end */
 window.railSync=sync;
 new MutationObserver(()=>{if(!TH.hidden)T_.pages=performance.now();sync();follow(360)}).observe(TH,{attributes:true,attributeFilter:['hidden']});
 watch(TH,'pages');watch(by('panel'),'right');
 // labeled Close on every panel header
 const cl=by('closeList');if(cl){cl.innerHTML='✕<span class="tl">Close</span>';cl.setAttribute('aria-label','Close the Pins panel');cl.title='Close the Pins panel'}
 const thx=()=>{const x=TH.querySelector('#thX');if(x&&!x.dataset.rl){x.dataset.rl=1;x.innerHTML='✕<span class="tl">Close</span>';x.setAttribute('aria-label','Close the page preview');x.title='Close the page preview'}const r=TH.querySelector('#thRn');if(r&&!r.getAttribute('aria-label'))r.setAttribute('aria-label','Rename the current page')};new MutationObserver(thx).observe(TH,{childList:true,subtree:true});thx();
 addEventListener('resize',()=>{for(const k in PAN)W_[k]=getW(k);NOTR=1;sync();clearTimeout(rzT);rzT=setTimeout(()=>{NOTR=0},300);follow(120)});
 new ResizeObserver(()=>sync()).observe(ST);
 let lastK='';setInterval(()=>{const k=[TH.hidden,TH.offsetHeight,rightK(),typeof walk!=='undefined'&&!!walk,innerWidth,innerHeight,ST.getBoundingClientRect().top|0].join();if(k!==lastK){lastK=k;sync()}},250);
 // ---- pin card: beside the selected pin, inside the plan area (never over panels or bars); below it, shorter, when there is no room ----
 const D=by('pinDlg');
 const DB=ce('button','btn danger pcDel','<span aria-hidden="true">🗑</span><span class="tl">Delete</span>');DB.type='button';DB.setAttribute('aria-label','Delete this pin');DB.title='Delete this pin (closes the card, then the delete options)';
 const pinNow=()=>{try{return cur&&cur.page===page&&cur.x!=null?cur:null}catch{return null}};
 if(D){D.append(DB);DB.onclick=e=>{e.preventDefault();const p=pinNow();D.close();if(!p)return;try{window.pdTap&&pdTap(p)}catch{}let n=0;const go=()=>{const b=by('pinDelF');if(b&&!b.hidden){window.wheelAnchor&&wheelAnchor(b);b.click()}else if(n++<20)requestAnimationFrame(go)};requestAnimationFrame(go)}}
 const off=()=>{B.classList.remove('pcOn','pcC');if(D)D.style.left=D.style.top=D.style.maxHeight=D.style.width=''};
 function placeCard(){if(!D||!D.open){off();return}const p=pinNow();if(!p){off();return}
  const sr=ST.getBoundingClientRect(),s=toS(p.x,p.y),X=sr.left+s.x,Y=sr.top+s.y,m=8,ph=PH(),gap=ph?30:104,L0=sr.left+m,T0=sr.top+m;let R0=sr.right-m,B0=sr.bottom-m;
  if(ph){/* phone panels overlay the plan: the card keeps to the free part */if(shown(TH)&&!TH.hidden)B0=Math.min(B0,TH.offsetTop-m);for(const e of [by('panel'),by('lyrP')])if(e&&!e.hidden&&shown(e))R0=Math.min(R0,e.getBoundingClientRect().left-m)}
  const cw=Math.min(ph?R0-L0:340,R0-L0);
  if(X<sr.left||X>sr.right||Y<sr.top||Y>sr.bottom||cw<220){off();return}
  let x,y,mh,compact=false;const fullH=Math.min(B0-T0,620);
  if(!ph&&X+gap+cw<=R0){x=X+gap;mh=fullH;y=Math.max(T0,Math.min(B0-mh,Y-120))}
  else if(!ph&&X-gap-cw>=L0){x=X-gap-cw;mh=fullH;y=Math.max(T0,Math.min(B0-mh,Y-120))}
  else{compact=true;x=Math.max(L0,Math.min(R0-cw,X-cw/2));const below=B0-(Y+gap),above=Y-gap-T0;if(below>=260||below>=above){y=Y+gap;mh=Math.min(below,480)}else{mh=Math.min(above,480);y=Y-gap-mh}if(mh<200){off();return}}
  B.classList.add('pcOn');B.classList.toggle('pcC',compact);DB.hidden=!pins.some(x=>x.id===p.id);DB.style.left=Math.round(Math.min(R0-80,X+14))+'px';DB.style.top=Math.round(Y-20)+'px';
  D.style.left=Math.round(x)+'px';D.style.top=Math.round(y)+'px';D.style.width=Math.round(cw)+'px';D.style.maxHeight=Math.round(mh)+'px'}
 if(D){new MutationObserver(()=>{if(D.open)requestAnimationFrame(placeCard);else off()}).observe(D,{attributes:true,attributeFilter:['open']});addEventListener('resize',()=>D.open&&placeCard())}
 let lastV='';setInterval(()=>{if(!D||!D.open)return;const r_=ST.getBoundingClientRect(),k=JSON.stringify(view)+r_.left+','+r_.top+','+r_.width+','+innerHeight;if(k!==lastV){lastV=k;placeCard()}},250);
 window.pinCardPlace=placeCard;
 sync();
})();
