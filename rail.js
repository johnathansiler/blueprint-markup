// bpm-v112: combined A+B layout. LEFT task rail (tab row on phone) + ONE left slot (page strip OR one rail panel) + resizable side panels
// (drag handle on the inner edge, labeled Expand/Shrink, width remembered per panel) + pin card beside the selected pin.
// Rail panels hold EXISTING commands: each button just .click()s the original control, so every handler/behavior is unchanged.
(()=>{const by=id=>document.getElementById(id),ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const B=document.body,ST=by('stage'),TH=by('thumbs'),THB=by('thBtn'),TOOLS=by('tools');if(!ST||!TH||!THB||!TOOLS)return;
 const PH=()=>innerWidth<600,RM=matchMedia('(prefers-reduced-motion: reduce)');
 // bpm-v112: every side bar slides in AND out with the Layers panel's motion (.18s ease-out). In = CSS animation on show; out = keep it shown
 // with .rlOut for the same duration, then hide. NOANIM marks swaps (old one goes instantly, new one slides in: no double panel, no jump).
 const NOANIM=new WeakSet(),OUT=new WeakSet();
 function slideOut(el){if(!el||RM.matches||NOANIM.has(el)){NOANIM.delete(el);return}OUT.add(el);el.classList.remove('rlOut');void el.offsetWidth;el.classList.add('rlOut');const me={};el._rlO=me;const fin=()=>{if(el._rlO!==me)return;el._rlO=null;el.classList.remove('rlOut');OUT.delete(el);sync()};el.addEventListener('animationend',fin,{once:true});setTimeout(fin,260);sync()}
 function watch(el){if(!el||el._rlW)return;el._rlW=1;let was=el.hidden;new MutationObserver(()=>{const h=el.hidden;if(h&&!was){was=true;const o=el.id==='panel'?by('lyrP'):el.id==='lyrP'?by('panel'):null;if(o&&!o.hidden)NOANIM.add(el);slideOut(el)}else if(!h&&was){was=false;el._rlO=null;el.classList.remove('rlOut');OUT.delete(el)}follow(360)}).observe(el,{attributes:true,attributeFilter:['hidden']})}

 const flat=t=>[...document.querySelectorAll('#tools .tbFlat')].find(b=>b.textContent.trim().replace(/\s+/g,' ').startsWith(t));
 const wbtn=k=>document.querySelector(`#tools .tbw[data-w="${k}"]`);
 const E=id=>()=>by(id);
 // ---- panel definitions: [caption, [icon, label, element-getter, title?]] ----
 const PANELS={
  Markup:{i:'✏️',t:'Markup',S:[['Draw',[['▢','Shapes ▾',()=>wbtn('shapes')],['╱','Lines ▾',()=>wbtn('lines')],['T','Text',()=>[...document.querySelectorAll('#tools .tool')].find(b=>b.offsetParent!==null||b.closest('#tools'))&&[...document.querySelectorAll('#tools .tool')].find(b=>b.textContent.trim().replace(/\s+/g,'')==='TText')],['✍','Freehand',E('tbFree')],['🔖','Stamp',E('tbStamp')],['📏','Measure',()=>flat('📏')],['📐','Snap',E('cSnap')],['🧲','Magnet',()=>flat('🧲')]]],
   ['Style',[['━','Width ▾',()=>wbtn('width')]]],
   ['Edit',[['↶','Undo',E('undo')],['↷','Redo',E('redo')],['🗑','Delete selected',E('del')],['⤢','Fit',E('fit')]]],
   ['Show & clear',[['👁','Filters',E('layBtn')],['🗑','Clear markups…',E('clrMBtn'),'danger']]]]},
  Pins:{i:'📍',t:'Pins',S:[['Place',[['●','Place ▾',()=>wbtn('place')],['➤','Select',()=>flat('➤')],['✋','Pan',()=>flat('✋')]]],
   ['Panels',[['📍','Pins list',E('listBtn')],['◧','Layers',E('tb2Lay')]]],
   ['Edit',[['⇆','Split',E('splitBtn')],['⇄','Merge',E('mergeBtn')],['👤','Tester',E('testerBtn')],['🎤','Voice',E('micBtn')]]],
   ['Clear',[['🗑','Clear pins…',E('clrBtn'),'danger']]]]},
  Test:{i:'✅',t:'Test',S:[['Walk test',[['🚶','Walk',E('walkBtn'),'pri'],['✔','Pass',E('tbPass')],['👤','Tester',E('testerBtn')]]],
   ['Results',[['☑','Checklist CSV',E('checkCsv')],['📄','Report PDF',E('reportPdf')],['📋','Defs CSV',E('defCsv')],['📄','Defs PDF',E('defPdf')]]]]},
  Detect:{i:'🔍',t:'Detect',S:[['Find devices',[['🔍','Detect devices…',E('detBtn'),'pri']]],
   ['Suggestions',[['✔','Accept all',E('ghAccAll')],['🔎','Review',E('ghRev')],['▦','By type',E('ghTypeB')],['✕','Reject all',E('ghRejAll'),'danger']]],
   ['Learn',[['🎓','Teach',E('teachBtn')]]]]},
  Share:{i:'⤓',t:'Share',S:[['Export plan',[['🖼','PNG image',E('exPng')],['📄','PDF',E('exPdf')]]],
   ['Lists & reports',[['📋','Device list CSV',E('csvBtn')],['🔢','Counts CSV',E('countCsv')],['☑','Checklist CSV',E('checkCsv')],['📄','Report PDF',E('reportPdf')]]],
   ['Project',[['💾','Save project file',E('projSave')],['📷','QR',E('qrTool')]]]]}};
 // ---- rail ----
 const R=ce('nav');R.id='rail';R.setAttribute('aria-label','Tasks');
 const rb=(k,ic,lab,title)=>{const b=ce('button','btn tb2 rlB',`<span class="tb2i">${ic}</span><span class="tl">${lab}</span>`);b.type='button';b.dataset.rl=k;b.id='rl'+k;b.title=title||lab;b.setAttribute('aria-label',title||lab);return b};
 THB.classList.remove('tb2R2');THB.classList.add('rlB');THB.dataset.rl='Pages';THB.setAttribute('aria-label','Pages: page preview strip');R.append(THB);
 for(const k of Object.keys(PANELS)){const b=rb(k,PANELS[k].i,PANELS[k].t,PANELS[k].t+' commands');b.onclick=()=>toggle(k);R.append(b)}
 const sp=ce('span','sp');R.append(sp);const cz=rb('Cust','⚙','Customize','Customize toolbar, accent and theme');cz.classList.add('rlCz');cz.onclick=()=>by('czBtn')?.click();R.append(cz);
 B.insertBefore(R,TOOLS);
 // ---- left slot panel ----
 const P=ce('aside');P.id='railP';P.hidden=true;B.append(P);
 let rk=null;
 function render(k){const d=PANELS[k];P.setAttribute('aria-label',d.t);
  P.innerHTML=`<div class="rpH"><b>${d.i} ${d.t}</b><span class="sp"></span><button type="button" class="btn rpX" aria-label="Close ${d.t} panel" title="Close">✕ Close</button></div><div class="rpB"></div>`;
  const body=P.querySelector('.rpB');
  for(const [cap,items] of d.S){const L=items.filter(it=>it[2]());if(!L.length&&cap!=='Suggestions')continue;
   body.append(ce('div','rpS',cap));const g=ce('div','rpG');
   if(!L.length){g.append(ce('div','rpE','No suggestions yet: run Detect.'))}
   for(const [ic,lab,get,cls] of L){const b=ce('button','btn rpI'+(cls?' '+cls:''),`<span class="rpIc">${ic}</span><span class="tl">${lab}</span>`);b.type='button';b.setAttribute('aria-label',lab);b.title=lab;
    b.onclick=()=>{const el=get();if(el&&!el.disabled)setTimeout(()=>el.click(),0)};/* deferred: the opening tap must not count as an outside tap */b._get=get;g.append(b)}
   body.append(g)}
  P.querySelector('.rpX').onclick=()=>toggle(k);syncDis()}
 function syncDis(){for(const b of P.querySelectorAll('.rpI')){const el=b._get&&b._get();b.disabled=!el||!!el.disabled}}
 function toggle(k){if(rk===k){rk=null;P.hidden=true}else{const sw=!P.hidden;if(sw){P.style.animation='none';void P.offsetWidth;P.style.animation=''}rk=k;if(!TH.hidden){NOANIM.add(TH);TH.hidden=true;THB.classList.remove('pri')}render(k);P.hidden=false}sync();follow(360)}
 window.railOpen=k=>{if(k==='Pages'){if(TH.hidden)THB.click()}else if(rk!==k)toggle(k)};window.railClose=()=>{if(rk)toggle(rk);if(!TH.hidden){TH.hidden=true;THB.classList.remove('pri');sync()}};
 // the page strip (moved #thBtn keeps its own handler): showing it closes any rail panel
 new MutationObserver(()=>{if(!TH.hidden&&rk){rk=null;NOANIM.add(P);P.hidden=true}sync();follow(360)}).observe(TH,{attributes:true,attributeFilter:['hidden']});
 watch(TH);watch(P);watch(by('panel'));
 // ---- widths ----
 const NAR={pages:()=>PH()?124:(innerWidth<1000?118:132),rail:()=>PH()?240:212,pins:()=>PH()?Math.min(296,innerWidth):209,layers:()=>PH()?Math.min(260,Math.round(innerWidth*.82)):124};
 const MAX=()=>PH()?innerWidth-16:Math.round(innerWidth*.5);
 const WIDE=k=>PH()?innerWidth-16:Math.max(NAR[k](),Math.min(MAX(),k==='layers'?300:k==='pages'?Math.round(innerWidth*.34):Math.round(innerWidth*.4)));
 const key=k=>'bpm-pw-'+k+(PH()?'-ph':'');
 const getW=k=>{const v=+localStorage.getItem(key(k));const n=NAR[k]();return v?Math.max(n,Math.min(MAX(),v)):n};
 const setW=(k,w,save)=>{w=Math.round(Math.max(NAR[k](),Math.min(MAX(),w)));if(save)localStorage.setItem(key(k),String(w));W_[k]=w;sync()};
 const W_={};
 // ---- grips (drag handle + labeled Expand/Shrink), one per panel, placed on the panel's inner edge ----
 const PAN={pages:{el:TH,side:'L',nm:'page strip'},rail:{el:P,side:'L',nm:'panel'},pins:{el:by('panel'),side:'R',nm:'Pins panel'},layers:{el:null,side:'R',nm:'Layers panel'}};
 const G={};for(const k of Object.keys(PAN)){const g=ce('div','pGrip');g.dataset.k=k;g.hidden=true;g.innerHTML=`<span class="pgBar" aria-hidden="true"></span><button type="button" class="btn pgX"></button>`;g.setAttribute('role','separator');g.querySelector('.pgX').setAttribute('aria-label','Expand the '+PAN[k].nm);g.querySelector('.pgX').title='Expand the '+PAN[k].nm;g.setAttribute('aria-label','Drag to resize the '+PAN[k].nm);B.append(g);G[k]=g;
  const bx=g.querySelector('.pgX');bx.onclick=e=>{e.stopPropagation();const w=W_[k]||getW(k);setW(k,w>NAR[k]()+20?NAR[k]():WIDE(k),true)};
  g.addEventListener('pointerdown',e=>{if(e.target.closest('.pgX'))return;const el=PAN[k].el;if(!el)return;e.preventDefault();g.setPointerCapture(e.pointerId);g.classList.add('drag');B.classList.add('rlDrag');const r=el.getBoundingClientRect();
   const mv=ev=>setW(k,PAN[k].side==='L'?ev.clientX-r.left:r.right-ev.clientX,false),up=ev=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);g.removeEventListener('pointercancel',up);g.classList.remove('drag');B.classList.remove('rlDrag');setW(k,W_[k]||getW(k),true)};
   g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)})}
 const vis=e=>e&&!e.hidden&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
 // phone: the open right panel's bottom edge follows the Pages strip's top edge frame by frame (so it rides up/down exactly in sync with the strip's slide, never overlapping)
 function applyBottom(){const ph=PH(),th=(!TH.hidden||OUT.has(TH))&&ph?TH.getBoundingClientRect():null;
  for(const e of [by('panel'),by('lyrP')]){if(!e)continue;const on=(!e.hidden||OUT.has(e))&&getComputedStyle(e).display!=='none';
   if(th&&on&&th.height){if(e._rlH==null){e.style.height='';e._rlH=e.getBoundingClientRect().bottom}const r=e.getBoundingClientRect(),b=Math.min(e._rlH,th.top);e.style.height=Math.max(80,Math.round(b-r.top))+'px'}
   else if(e._rlH!=null){e._rlH=null;e.style.height=''}}}
 let folT=0;function follow(ms){folT=Math.max(folT,performance.now()+ms);if(follow.on)return;follow.on=1;const st=()=>{sync();if(performance.now()<folT)requestAnimationFrame(st);else follow.on=0};requestAnimationFrame(st)}
 // ---- layout ----
 let lastK='';
 function sync(){PAN.layers.el=by('lyrP');watch(PAN.layers.el);const ph=PH(),walkOn=typeof walk!=='undefined'&&!!walk;
  B.classList.add('rl');B.classList.toggle('rlPh',ph);B.classList.toggle('rlWalk',walkOn&&ph);
  for(const k in PAN)if(W_[k]==null)W_[k]=getW(k);
  const thOn=!TH.hidden,slotK=thOn?'pages':rk?'rail':null,sw=slotK?W_[slotK]:0,rw=ph?0:74;
  B.style.setProperty('--rlW',rw+'px');B.style.setProperty('--slW',(ph?0:sw)+'px');B.style.setProperty('--thW',W_.pages+'px');B.style.setProperty('--rpW',W_.rail+'px');
  const pn=PAN.pins.el,ly=PAN.layers.el,sr0=ST.getBoundingClientRect();
  // phone: the Pages strip slides up at the bottom; the open right panel's bottom edge rides up in sync and stops right above it. A left rail panel narrows the right panel so they sit side by side.
  const thH=ph&&thOn?TH.offsetHeight:0,lw=ph&&rk?W_.rail:0;
  for(const [e,wk] of [[pn,'pins'],[ly,'layers']]){if(!e)continue;e.style.width=(ph?Math.min(W_[wk],innerWidth-lw):W_[wk])+'px';
  }
  applyBottom();
  // fixed-position rail + slot follow the stage's vertical extent
  const sr=ST.getBoundingClientRect(),top=Math.round(sr.top),h=Math.round(sr.height);
  for(const e of ph?[P]:[P,TH])if(e){e.style.top=top+'px';e.style.height=h+'px';e.style.left=rw+'px'}if(ph){TH.style.top=TH.style.height=TH.style.left=''}
  if(!ph){R.style.top=top+'px';R.style.height=h+'px'}else{R.style.top='';R.style.height=''}
  for(const b of R.querySelectorAll('.rlB'))b.classList.toggle('open',b.dataset.rl===(slotK==='pages'?'Pages':rk));
  // grips
  for(const k in PAN){const g=G[k],el=PAN[k].el,on=vis(el)&&!walkOn&&!(ph&&k==='pages');if(!on){if(!g.hidden)g.hidden=true;continue}const r=el.getBoundingClientRect();g.hidden=false;
   const x=PAN[k].side==='L'?r.right:r.left;g.style.left=Math.round(x-8)+'px';g.style.top=Math.round(r.top)+'px';g.style.height=Math.round(r.height)+'px';g.classList.toggle('R',PAN[k].side==='R');const occ=Math.max(rw,vis(P)?P.getBoundingClientRect().right:0,vis(TH)&&!ph?TH.getBoundingClientRect().right:0);g.classList.toggle('in',(PAN[k].side==='L'?innerWidth-r.right:r.left-occ)<84);/* no room outside: tab flips inside */
   const bx0=g.querySelector('.pgX');g.classList.remove('top');{const q=bx0.getBoundingClientRect();if([...document.querySelectorAll('#selBar,#ghBar,#mBar,#toast,#pinDelF')].some(e=>{if(e.hidden||getComputedStyle(e).display==='none')return false;const o=e.getBoundingClientRect();return o.width&&q.left<o.right&&q.right>o.left&&q.top<o.bottom&&q.bottom>o.top}))g.classList.add('top')}/* never cover the selection / suggestion / toast bars */
   const wide=W_[k]>NAR[k]()+20,bx=g.querySelector('.pgX'),lab=wide?'Shrink':'Expand',t=`${lab} the ${PAN[k].nm}`;if(bx._l!==lab){bx._l=lab;bx.innerHTML=`<span aria-hidden="true">${wide?(PAN[k].side==='L'?'⇤':'⇥'):(PAN[k].side==='L'?'⇥':'⇤')}</span><span class="tl">${lab}</span>`;bx.setAttribute('aria-label',t);bx.title=t}}
  if(rk)syncDis()}
 window.railSync=sync;
 // every panel header has a labeled Close (Pins list's ✕ is now shown on every width; page strip's ✕ gets its label)
 const cl=by('closeList');if(cl){cl.innerHTML='✕<span class="tl">Close</span>';cl.setAttribute('aria-label','Close the Pins panel');cl.title='Close the Pins panel'}
 const thx=()=>{const x=TH.querySelector('#thX');if(x&&!x.dataset.rl){x.dataset.rl=1;x.innerHTML='✕<span class="tl">Close</span>';x.setAttribute('aria-label','Close the page strip');x.title='Close the page strip'}};new MutationObserver(thx).observe(TH,{childList:true,subtree:true});thx();
 addEventListener('resize',()=>{for(const k in W_)W_[k]=getW(k);for(const e of [by('panel'),by('lyrP')])if(e&&e._rlH!=null){e._rlH=null;e.style.height=''}sync();follow(100)});
 new ResizeObserver(()=>sync()).observe(ST);
 setInterval(()=>{const k=[TH.hidden,TH.offsetHeight,rk,['selBar','ghBar','mBar','toast'].map(i=>by(i)&&by(i).hidden?0:1).join(''),typeof walk!=='undefined'&&!!walk,vis(by('panel')),vis(by('lyrP')),innerWidth,innerHeight,ST.getBoundingClientRect().top|0,document.querySelectorAll('#ghBar button').length].join();if(k!==lastK){lastK=k;sync()}},250);
 // ---- pin card: open the pin sheet beside the selected pin (below it, shorter, when there is no room beside) ----
 const D=by('pinDlg');
 const DB=ce('button','btn danger pcDel','<span aria-hidden="true">🗑</span><span class="tl">Delete</span>');DB.type='button';DB.setAttribute('aria-label','Delete this pin');DB.title='Delete this pin (closes the card, then the delete options)';
 if(D){D.append(DB);DB.onclick=e=>{e.preventDefault();const p=pinNow();D.close();if(!p)return;try{window.pdTap&&pdTap(p)}catch{}let n=0;const go=()=>{const b=by('pinDelF');if(b&&!b.hidden){window.wheelAnchor&&wheelAnchor(b);b.click()}else if(n++<20)requestAnimationFrame(go)};requestAnimationFrame(go)}}
 const pinNow=()=>{try{return cur&&cur.page===page&&cur.x!=null?cur:null}catch{return null}};
 function placeCard(){if(!D||!D.open){B.classList.remove('pcOn','pcC');return}const p=pinNow();if(!p){B.classList.remove('pcOn','pcC');D.style.left=D.style.top=D.style.maxHeight='';return}
  const sr=ST.getBoundingClientRect(),s=toS(p.x,p.y),X=sr.left+s.x,Y=sr.top+s.y,VW=innerWidth,VH=innerHeight,m=8,gap=PH()?30:104,ph=PH(),cw=ph?VW-2*m:Math.min(340,VW-2*m);
  if(X<sr.left||X>sr.right||Y<sr.top||Y>sr.bottom){B.classList.remove('pcOn','pcC');return}
  let x,y,mh,compact=false;const fullH=Math.min(VH-2*m,620);
  if(!ph&&X+gap+cw<=VW-m){x=X+gap;mh=fullH;y=Math.max(m,Math.min(VH-m-mh,Y-120))}
  else if(!ph&&X-gap-cw>=m){x=X-gap-cw;mh=fullH;y=Math.max(m,Math.min(VH-m-mh,Y-120))}
  else{compact=true;x=Math.max(m,Math.min(VW-cw-m,X-cw/2));const below=VH-m-(Y+gap),above=Y-gap-m;
   if(below>=260||below>=above){y=Y+gap;mh=Math.min(below,ph?440:480)}else{mh=Math.min(above,ph?440:480);y=Y-gap-mh}
   if(mh<220){B.classList.remove('pcOn','pcC');D.style.left=D.style.top=D.style.maxHeight='';return}}
  B.classList.add('pcOn');B.classList.toggle('pcC',compact);DB.hidden=!pins.some(x=>x.id===p.id);DB.style.left=Math.round(Math.min(VW-90,X+14))+'px';DB.style.top=Math.round(compact?Y-22:Y-20)+'px';D.style.left=Math.round(x)+'px';D.style.top=Math.round(y)+'px';D.style.width=cw+'px';D.style.maxHeight=Math.round(mh)+'px'}
 if(D){new MutationObserver(()=>{if(D.open)requestAnimationFrame(placeCard);else{B.classList.remove('pcOn','pcC');D.style.left=D.style.top=D.style.maxHeight=D.style.width=''}}).observe(D,{attributes:true,attributeFilter:['open']});addEventListener('resize',()=>D.open&&placeCard())}
 window.pinCardPlace=placeCard;
 let lastV='';setInterval(()=>{if(!D||!D.open)return;const r_=ST.getBoundingClientRect(),k=JSON.stringify(view)+r_.left+','+r_.top+','+innerWidth+','+innerHeight;if(k!==lastV){lastV=k;placeCard()}},250);
 sync();
})();
