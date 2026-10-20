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
 // bpm-v116: walk bar needs ~260px for its buttons in one or two labeled rows
const WALKMIN=260,LEGMIN=210;let WKH=0,WKSTRIP=0,LGH=0;
// bpm-v116: device name always in full: wrap to 2 lines, then shrink down to 12px; never an ellipsis (a 3rd line only if even 12px cannot fit)
function fitName(w){const n=w.querySelector('.wName');if(!n||!n.offsetParent)return;const k=n.textContent+'|'+n.clientWidth;if(n._fk===k)return;n.style.fontSize='';
 let fs=parseFloat(getComputedStyle(n).fontSize);const two=()=>{const lh=parseFloat(getComputedStyle(n).lineHeight)||fs*1.2;return n.scrollHeight<=lh*2+2&&n.scrollWidth<=n.clientWidth+1};
 while(!two()&&fs>12){fs=Math.max(12,fs-1);n.style.fontSize=fs+'px'}n._fk=n.textContent+'|'+n.clientWidth}
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
  // bpm-v116: walk bar placement. If the free width beside the right panel is below what the walk bar needs (WALKMIN), the bar takes the full-width strip
  // above the bottom toolbar (above the phone Pages strip) and the panels stop above it; --wkR (the bar's right inset) moves on the panels' .18s clock
  const wk=by('walk'),wkOn=walkOn&&wk&&!wk.hidden;const wf=!!(wkOn&&ph&&rk&&innerWidth-wr<WALKMIN);
  B.classList.toggle('rlWF',wf);
  {const v=(wf?0:(ph&&rk?wr:0))+'px';if(ST.style.getPropertyValue('--wkR')!==v)ST.style.setProperty('--wkR',v)}
  if(wkOn)fitName(wk);
  // bpm-v117: legend banner. Phone with a right panel and a free area narrower than LEGMIN: the banner leaves the plan top and takes the full-width strip
  // above the walk bar / Pages strip / toolbar (never one letter per line); the panels stop above it. Otherwise it stays centred in the free area.
  const lg=by('legChip'),lgOn=lg&&!lg.hidden;const lf=!!(lgOn&&ph&&rk&&innerWidth-wr<LEGMIN);B.classList.toggle('rlLF',lf);
  WKH=0;if(wf){const o=wk.style.right;wk.style.right='0px';WKH=Math.ceil(wk.getBoundingClientRect().height);wk.style.right=o}
  if(B.style.getPropertyValue('--wkH')!==WKH+'px')B.style.setProperty('--wkH',WKH+'px');
  LGH=lf?Math.ceil(lg.getBoundingClientRect().height)+6:0;/* v119: banner sits 6px above the bar below it; the panel sits flush on the banner */
  applyBottom(sr);
  {const v=(ph&&thOn?TH.offsetHeight:0)+'px';WKSTRIP=ph&&thOn?TH.offsetHeight:0;if(B.style.getPropertyValue('--phStrip')!==v)B.style.setProperty('--phStrip',v)}/* phone: plan-bottom bars (pen, shape, freehand, stamp, Detect, walk, toast) sit above the strip */
  // plan margins: target = the panels' final widths, moved with the SAME duration/easing as the panel slide/width tween (one CSS clock, so the plan edge and the
 // panel edge are in step in every frame); instant while dragging, rotating or with reduced motion
 const L=!ph&&thOn?wl:0,Rr=!ph&&rk?wr:0,tr=RM.matches||B.classList.contains('rlDrag')||NOTR?'none':'margin-left .18s ease-out,margin-right .18s ease-out,--frR .18s ease-out,--wkR .18s ease-out';
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
  const bot=PH()&&!TH.hidden&&getComputedStyle(TH).display!=='none'?Math.min(sr.bottom,(TH.offsetParent===ST?sr.top:0)+TH.offsetTop):sr.bottom;/* v119: on phone the strip is position:absolute inside #stage, so offsetTop is stage-relative: add the stage top (was off by the stage top = gap above the strip) *//* v116: full-width walk bar below the panels */const bot2=WKH||LGH?Math.min(bot,sr.bottom-(B.style.getPropertyValue('--phStrip')?parseFloat(B.style.getPropertyValue('--phStrip'))||0:0)-WKH-LGH):bot;
  /* v119: the banner / walk strip appear and disappear at once (no slide), so a change of that reserve resizes the panel at once too (no gap, no overlap) */
 const rsv=WKH+'|'+LGH,rsvCh=applyBottom._r!==undefined&&applyBottom._r!==rsv;applyBottom._r=rsv;
 for(const e of [by('panel'),by('lyrP')]){if(!e)continue;
  /* v116: a panel sliding out keeps its height (it never grows over the walk strip); a panel opening takes its height at once, then slides in */
  if(e.hidden){e._op=0;continue}const fresh=!e._op;e._op=1;
  e.style.top=Math.round(sr.top)+'px';const hv=Math.max(80,Math.round(bot2-sr.top))+'px';
  if(e.style.height!==hv){if(fresh||rsvCh){e.classList.add('rlNoH');e.style.height=hv;void e.offsetHeight;requestAnimationFrame(()=>e.classList.remove('rlNoH'))}else e.style.height=hv}e.style.bottom='auto'}}
 let folT=0,SLID=0;function follow(ms){folT=Math.max(folT,performance.now()+ms);if(follow.on)return;follow.on=1;try{if(!SLIDING){SLIDING=1;SLID=1}}catch{}
  const st=()=>{try{sync()}catch(e){console.error(e)}if(performance.now()<folT)requestAnimationFrame(st);else{follow.on=0;if(SLID){SLID=0;try{SLIDING=0;scheduleRender()}catch{}}}};requestAnimationFrame(st)}/* no PDF re-render during a slide; one real render at the end */
 window.railSync=sync;
// bpm-v117: re-run the layout when the legend banner shows/hides
{let q=0;const hook=()=>{const lg=by('legChip');if(!lg||lg._rlObs)return!!lg;lg._rlObs=1;new MutationObserver(()=>{if(q)return;q=1;requestAnimationFrame(()=>{q=0;try{sync();/* v120: the card keeps clear of a banner that appears/leaves while it is open */window.pinCardPlace&&by('pinDlg')&&by('pinDlg').open&&pinCardPlace()}catch(e){console.error(e)}})}).observe(lg,{attributes:true,attributeFilter:['hidden'],childList:true});return true};
 if(!hook()){const mo=new MutationObserver(()=>{if(hook()){mo.disconnect();try{sync()}catch{}}});mo.observe(ST,{childList:true})}}
// bpm-v116: re-run the layout when the walk bar shows/hides or re-renders (name fit, full-width strip, panel bottoms)
{const wk=by('walk');if(wk){let q=0;new MutationObserver(()=>{if(q)return;q=1;requestAnimationFrame(()=>{q=0;try{sync()}catch(e){console.error(e)}})}).observe(wk,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true})}}
 new MutationObserver(()=>{if(!TH.hidden)T_.pages=performance.now();sync();follow(360)}).observe(TH,{attributes:true,attributeFilter:['hidden']});
 watch(TH,'pages');watch(by('panel'),'right');
 // labeled Close on every panel header
 const cl=by('closeList');const clL=()=>{if(!cl)return;if(!cl.querySelector('.tl'))cl.innerHTML='✕<span class="tl">Close</span>';if(cl.getAttribute('aria-label')!=='Close the Pins panel'){cl.setAttribute('aria-label','Close the Pins panel');cl.title='Close the Pins panel'}};clL();if(cl)new MutationObserver(clL).observe(cl,{childList:true,characterData:true,subtree:true});
 const thx=()=>{const x=TH.querySelector('#thX');if(x&&!x.dataset.rl){x.dataset.rl=1;x.innerHTML='✕<span class="tl">Close</span>';x.setAttribute('aria-label','Close the page preview');x.title='Close the page preview'}const r=TH.querySelector('#thRn');if(r&&!r.getAttribute('aria-label'))r.setAttribute('aria-label','Rename the current page')};new MutationObserver(thx).observe(TH,{childList:true,subtree:true});thx();
 addEventListener('resize',()=>{for(const k in PAN)W_[k]=getW(k);NOTR=1;sync();clearTimeout(rzT);rzT=setTimeout(()=>{NOTR=0},300);follow(120)});
 new ResizeObserver(()=>sync()).observe(ST);
 let lastK='';setInterval(()=>{const k=[TH.hidden,TH.offsetHeight,rightK(),typeof walk!=='undefined'&&!!walk,innerWidth,innerHeight,ST.getBoundingClientRect().top|0].join();if(k!==lastK){lastK=k;sync()}},250);
 // ---- pin card: beside the selected pin, inside the plan area (never over panels or bars); below it, shorter, when there is no room ----
 const D=by('pinDlg');
 const DB=ce('button','btn danger pcDel','<span aria-hidden="true">🗑</span><span class="tl">Delete</span>');DB.type='button';DB.setAttribute('aria-label','Delete this pin');DB.title='Delete this pin (closes the card, then the delete options)';
 const pinNow=()=>{try{return cur&&cur.page===page&&cur.x!=null?cur:null}catch{return null}};
 if(D){D.append(DB);DB.onclick=e=>{e.preventDefault();const p=pinNow();D.close();if(!p)return;try{window.pdTap&&pdTap(p)}catch{}let n=0;const go=()=>{const b=by('pinDelF');if(b&&!b.hidden){window.wheelAnchor&&wheelAnchor(b);b.click()}else if(n++<20)requestAnimationFrame(go)};requestAnimationFrame(go)}}
 const off=()=>{B.classList.remove('pcOn','pcC');if(D){D.style.left=D.style.top=D.style.maxHeight=D.style.width=D.style.height=D.style.position=D.style.margin=D.style.inset=D.style.maxWidth='';const z=pcSize();if(z){D.style.width=Math.round(Math.min(z.w,innerWidth-16))+'px';D.style.height=D.style.maxHeight=Math.round(Math.min(z.h,innerHeight-16))+'px'}}edgeSync()};
 // bpm-v129: the pin card opens larger (full free width on phones, ~460 px on Fold/tablet, all the free height) and has a labelled Resize handle (bottom-right, finger drag).
 // The chosen size is remembered per screen size class (Fold closed / phone / Fold open / tablet / desktop) and always clamped to the screen.
 const pcCls=()=>{const w=innerWidth,h=innerHeight;return w<380?'foldClosed':w<600?'phone':(w<1000&&Math.abs(w-h)/h<.2)?'foldOpen':w<1300?'tablet':'desktop'};
 const pcKey=()=>'bpm-pcsz2-'+pcCls();/* v130: new key, so sizes saved by v129 (smaller defaults) no longer apply */
 function pcSize(){try{const z=JSON.parse(localStorage.getItem(pcKey())||'null');return z&&z.w>0&&z.h>0?z:null}catch{return null}}
 let LIM=null;
 const RZ=ce('div','pcRszRow','<button type="button" class="pcRsz" aria-label="Resize the card (drag)" title="Drag to make the card bigger or smaller"><span aria-hidden="true">⇲</span><span class="pcRszL">Resize</span></button>');const RB=RZ.firstChild;
 // bpm-v130: resize from any edge. A labelled grip sits on the middle of each edge (top, bottom, left, right; 44 px touch areas, finger drag), and the Resize button keeps the bottom-right corner.
 // Drags are clamped to the screen with 8 px margins; the top edge never goes above 8 px, so Save and Close stay on screen. The size is saved per screen size class.
 const EDGES={t:['⇕','top'],b:['⇕','bottom'],l:['⇔','left'],r:['⇔','right']},EG={};
 function edgeSync(){if(!D)return;const show=D.open&&!D.hidden;for(const k in EG){const g=EG[k];if(!show){g.hidden=true;continue}g.hidden=false}if(!show)return;const r=D.getBoundingClientRect();if(!r.width)return;
  const cx=r.left+r.width/2,cy=r.top+Math.min(r.height/2,Math.max(90,r.height*.45)),vv=window.visualViewport,de=document.documentElement,W=Math.min(innerWidth,de.clientWidth||innerWidth,vv?vv.width:innerWidth),H=Math.min(innerHeight,de.clientHeight||innerHeight,vv?vv.height:innerHeight),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const put=(g,x,y)=>{g.style.left=Math.round(cl(x,0,W-g.offsetWidth))+'px';g.style.top=Math.round(cl(y,0,H-g.offsetHeight))+'px'};
  put(EG.t,cx-EG.t.offsetWidth/2,r.top-34);put(EG.b,cx-EG.b.offsetWidth/2,r.bottom-10);put(EG.l,r.left-34,cy-EG.l.offsetHeight/2);put(EG.r,r.right-10,cy-EG.r.offsetHeight/2);
  /* v131: the thin line sits exactly on the card edge even when a grip is clamped onto the screen */
  EG.t.style.setProperty('--o',(r.top-parseFloat(EG.t.style.top))+'px');EG.b.style.setProperty('--o',(r.bottom-parseFloat(EG.b.style.top))+'px');EG.l.style.setProperty('--o',(r.left-parseFloat(EG.l.style.left))+'px');EG.r.style.setProperty('--o',(r.right-parseFloat(EG.r.style.left))+'px')}
 setInterval(()=>{if(D&&D.open&&!D._rsz)edgeSync()},400);/* v130: safety re-sync so grips never stay where an old layout put them */
 function startRz(e,dirs,el){if(e.button>0)return;e.preventDefault();e.stopPropagation();try{el.setPointerCapture(e.pointerId)}catch{}const r=D.getBoundingClientRect(),x0=e.clientX,y0=e.clientY,m=8;D._rsz=1;el.classList.add('drag');
  const minW=Math.min(260,r.width),minH=Math.min(220,r.height),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  D.style.position='fixed';D.style.margin='0';D.style.inset='auto';D.style.maxWidth='none';
  const mv=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;let L=r.left,R=r.right,T=r.top,Bt=r.bottom;
    if(dirs.includes('l'))L=cl(r.left+dx,m,R-minW);if(dirs.includes('r'))R=cl(r.right+dx,L+minW,innerWidth-m);
    if(dirs.includes('t'))T=cl(r.top+dy,m,Bt-minH);if(dirs.includes('b'))Bt=cl(r.bottom+dy,T+minH,innerHeight-m);
    D.style.left=Math.round(L)+'px';D.style.top=Math.round(T)+'px';D.style.width=Math.round(R-L)+'px';D.style.height=D.style.maxHeight=Math.round(Bt-T)+'px';edgeSync()};
  const up=()=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.classList.remove('drag');D._rsz=0;const q=D.getBoundingClientRect();try{localStorage.setItem(pcKey(),JSON.stringify({w:Math.round(q.width),h:Math.round(q.height)}))}catch{}edgeSync()};
  el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
 if(D){D.append(RZ);RB.addEventListener('click',e=>e.preventDefault());RB.addEventListener('pointerdown',e=>startRz(e,'rb',RB));
  for(const k in EDGES){const g=ce('button','pcEdge pcE-'+k,'');/* bpm-v131: no words, no tab: the grip only shows a thin line on the card edge (aria-label kept for screen readers) */g.type='button';g.dataset.edge=k;g.setAttribute('aria-label','Resize the card from the '+EDGES[k][1]+' edge (drag)');g.title='Drag the '+EDGES[k][1]+' edge to resize the card';g.hidden=true;
   g.addEventListener('click',e=>e.preventDefault());g.addEventListener('pointerdown',e=>startRz(e,k,g));D.append(g);EG[k]=g}
  new ResizeObserver(()=>edgeSync()).observe(D);D.addEventListener('animationend',edgeSync);new MutationObserver(()=>requestAnimationFrame(edgeSync)).observe(D,{attributes:true,attributeFilter:['open','style']});addEventListener('resize',()=>requestAnimationFrame(edgeSync))}
 // bpm-v123: the toast, the Detect pop-up and the update banner are not card keep-outs for placement (that would drop a phone card into the fallback sheet). After the card is placed they move to a free spot so they neither cover the card nor sit behind it.
 const overlaps=(a,b)=>a.width>0&&b.width>0&&a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
 const clearNudge=e=>{if(e&&e.dataset.nudge){e.style.top='';e.style.bottom='';delete e.dataset.nudge}};
 function bannerList(){return['ghBar','toast','updBar'].map(by).filter(e=>e&&!e.hidden&&e.getBoundingClientRect().height>0)}
 function nudgeBanners(){for(const id of['toast','ghBar','updBar'])clearNudge(by(id));if(!D||!D.open)return;const sr=ST.getBoundingClientRect();
  const hit=()=>bannerList().some(e=>overlaps(e.getBoundingClientRect(),D.getBoundingClientRect()));if(!hit())return;
  if(B.classList.contains('pcOn')){const c0=D.getBoundingClientRect();let top=c0.top,bot=c0.bottom;
   for(const e of bannerList()){const r=e.getBoundingClientRect(),box={left:c0.left,right:c0.right,top,bottom:bot,width:c0.width,height:bot-top};if(!overlaps(r,box))continue;if(r.top>=(top+bot)/2)bot=Math.min(bot,r.top-8);else top=Math.max(top,r.bottom+8)}
   if(bot-top>=200&&top>=sr.top-1&&bot<=sr.bottom+1){D.style.top=Math.round(top)+'px';D.style.maxHeight=Math.round(bot-top)+'px';if(!hit())return}}
  // fallback sheet, or a card with no free band: park the banners in a strip at the top of the plan and keep the card below it
  let y=4;for(const e of bannerList()){const h=e.getBoundingClientRect().height;e.style.top=Math.round(y)+'px';e.style.bottom='auto';e.dataset.nudge='1';y+=h+6}
  const limit=sr.top+y+4,c=D.getBoundingClientRect();
  if(B.classList.contains('pcOn')){const nt=Math.max(c.top,limit),mh=c.bottom-nt;if(mh>=200){D.style.top=Math.round(nt)+'px';D.style.maxHeight=Math.round(mh)+'px'}}
  else D.style.maxHeight=Math.max(220,Math.round(innerHeight-limit-8))+'px'}
 function placeCard(){if(D&&D._rsz)return;if(!D||!D.open){off();nudgeBanners();return}const p=pinNow();if(!p){off();nudgeBanners();return}
  const sr=ST.getBoundingClientRect(),s=toS(p.x,p.y),X0=sr.left+s.x,Y0=sr.top+s.y,m=8,ph=PH(),gap=ph?30:104,L0=sr.left+m;let T0=sr.top+m,R0=sr.right-m,B0=sr.bottom-m;
  if(ph){/* phone panels overlay the plan: the card keeps to the free part */if(shown(TH)&&!TH.hidden)B0=Math.min(B0,(TH.offsetParent===ST?sr.top:0)+TH.offsetTop-m);/* v120: strip top in screen coordinates (offsetTop is stage-relative; final top, unaffected by the strip's slide) */for(const e of [by('panel'),by('lyrP')])if(e&&!e.hidden&&shown(e))R0=Math.min(R0,e.getBoundingClientRect().left-m)}
  /* v120: bars below the free plan area (banner strip, walk bar) also bound the card's bottom */
  let TB=0;
  for(const e of [by('legChip'),by('walk')]){if(!e||e.hidden||!shown(e))continue;const q=e.getBoundingClientRect();if(!q.height||q.left>=R0||q.right<=L0)continue;if(q.top>sr.top+sr.height/2)B0=Math.min(B0,q.top-m);else if(e.id==='legChip')TB=q.bottom+m}
  const T0n=T0;if(TB)T0=Math.max(T0,TB);/* top-floating banner: kept clear unless that leaves no room for the card (then the card may cover the transient banner rather than fall back to the dialog) */
  /* v130: twice the v129 default (v129: phone = the free width, Fold/tablet 460 px wide; up to 620 px tall), clamped to the free plan area with 8 px margins,
     or the size the user dragged it to. It sits beside the pin when there is room, otherwise on the side away from the pin, spanning the free height. */
  const Z=pcSize();let cw=Math.min(Z?Z.w:2*(ph?R0-L0:460),R0-L0);const ch=Math.min(Z?Z.h:2*620,B0-T0);
  /* v130: the card never falls back to the centred dialog (which covers the Pages strip and bars) just because the pin is briefly off the plan
     (walk mode pans to the next pin); it keeps to the free plan area, placed for the nearest on-screen point, and Delete hides until the pin is back */
  let X=X0,Y=Y0;const pinOut=X<sr.left||X>sr.right||Y<sr.top||Y>sr.bottom;
  /* a small free area shrinks the card to fit (it scrolls) rather than dropping it over the bars; only a free area under 150 px falls back */
  if(cw<150||ch<150){off();nudgeBanners();return}
  let x,y,mh=ch,compact=false;
  {const X_=Math.max(L0,Math.min(R0,X)),Y_=Math.max(T0,Math.min(B0,Y));if(pinOut){X=X_;Y=Y_}}
  if(R0-X-gap>=cw)x=X+gap;else if(X-gap-L0>=cw)x=X-gap-cw;else{compact=true;x=X>(L0+R0)/2?L0:R0-cw}
  y=Math.max(T0,Math.min(B0-mh,Y-mh/2));
  B.classList.add('pcOn');B.classList.toggle('pcC',compact);DB.hidden=pinOut||!pins.some(x=>x.id===p.id);if(X>=x-4&&X<=x+cw+4&&Y>=y-4&&Y<=y+mh+4){/* v130: the big card covers the pin: Delete sits just above the card's top-left corner instead of on top of the card */DB.style.left=Math.round(x)+'px';DB.style.top=Math.round(Math.max(4,y-52))+'px'}else{DB.style.left=Math.round(Math.min(R0-80,X+14))+'px';DB.style.top=Math.round(Y-20)+'px'}
  D.style.left=Math.round(x)+'px';D.style.top=Math.round(y)+'px';D.style.width=Math.round(cw)+'px';D.style.maxHeight=Math.round(mh)+'px';D.style.height=Math.round(mh)+'px';LIM={R:R0,B:B0};nudgeBanners();edgeSync()}
 if(D){new MutationObserver(()=>{if(D.open)requestAnimationFrame(placeCard);else{off();nudgeBanners()}}).observe(D,{attributes:true,attributeFilter:['open']});addEventListener('resize',()=>D.open&&placeCard())}
 let lastV='';setInterval(()=>{if(!D||!D.open)return;const r_=ST.getBoundingClientRect(),k=JSON.stringify(view)+r_.left+','+r_.top+','+r_.width+','+innerHeight+'|'+(by('toast')&&!by('toast').hidden?1:0)+(by('ghBar')&&!by('ghBar').hidden?1:0)+(by('updBar')&&!by('updBar').hidden?1:0)+'|'+(()=>{/* v130: the plan chip appearing, or the walk bar / Pages strip appearing or moving, re-places the card */let o='';const lc=by('legChip');o+=lc&&!lc.hidden&&shown(lc)?'L;':'-;';/* chip: only appearing/disappearing (the card itself nudges its position) */for(const id of['walk','thumbs']){const e=by(id);if(e&&!e.hidden&&shown(e)){const q=e.getBoundingClientRect();o+=id+Math.round(q.top)+','+Math.round(q.right)+';'}}return o})();if(k!==lastV){lastV=k;placeCard()}},250);
 for(const id of['toast','ghBar','updBar']){const e=by(id);if(e)new MutationObserver(()=>{if(D&&D.open)requestAnimationFrame(placeCard)}).observe(e,{attributes:true,attributeFilter:['hidden']})}
 window.pinCardPlace=placeCard;
 sync();
})();
