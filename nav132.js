// bpm-v132: "Big task bar" navigation (user-approved Option A).
// Top row: Menu ▾, Prev, Page ▾, Next, Undo, Pages, Pins (wide screens add Layers, Teach, QR).
// Bottom row: Detect and Sheets (double width, coloured), Place ▾, Walk test, Draw ▾ (phone) or the drawing tools laid out (wide), More ▾.
// Every original button is MOVED or reached through Menu ▾ / More ▾ / Draw ▾, so all existing handlers keep working. Walk-test bar unchanged.
(()=>{const X=window.TBX,T=$('#tools'),TOP=$('#top');if(!X||!T||!TOP||!window.wheelOpen)return;const by=id=>document.getElementById(id);
 const HOLD=document.createElement('div');HOLD.id='navHold';HOLD.hidden=true;document.body.append(HOLD);
 const W=k=>T.querySelector(`[data-w="${k}"]`)||document.querySelector(`#navHold [data-w="${k}"],#navDraw [data-w="${k}"]`);
 const wide=()=>innerWidth>=760;
 const wheel=(anchor,title,items)=>{try{wheelAnchor&&wheelAnchor(anchor)}catch{}wheelOpen(title,items.map(x=>({...x,html:`<span class="whIc">${x.i||''}</span>${esc(x.l)}`})),0,x=>x.run())};
 const sub=(anchor,title,items)=>()=>setTimeout(()=>wheel(anchor,title,items()),220);
 const click=id=>()=>{const e=by(id);e&&e.click()};
 const mkTop=(id,ic,lab,run,title)=>{const b=document.createElement('button');b.type='button';b.className='btn tb2';b.id=id;b.innerHTML=`<span class="tb2i">${ic}</span><span class="tl">${lab}</span>`;b.title=title||lab.replace(' ▾','');b.onclick=run;return b};
 const mkTool=(id,ic,lab,run,cls='')=>{const b=document.createElement('button');b.type='button';b.className='tool navB '+cls;b.id=id;b.innerHTML=`<span class="navI">${ic}</span><span class="tl">${lab}</span>`;b.title=lab.replace(' ▾','');b.onclick=run;return b};
 // ---------- Menu ▾ (Project + Plan + Export + Share + Customize: each in one place) ----------
 const menuB=mkTop('navMenu','☰','Menu ▾',function(){const a=this;
  const projSw=()=>[...by('projSel').options].map(o=>({i:o.selected?'✓':'↪',l:o.text,run:()=>{by('projSel').value=o.value;by('projSel').dispatchEvent(new Event('change',{bubbles:true}))}}));
  const planSw=()=>[...by('planSel').options].filter(o=>o.value).map(o=>({i:o.selected?'✓':'↪',l:o.text,run:()=>{by('planSel').value=o.value;by('planSel').dispatchEvent(new Event('change',{bubbles:true}))}}));
  const exp=()=>[{i:'⤓',l:'Plan as PDF',run:click('exPdf')},{i:'⤓',l:'Plan as picture (PNG)',run:click('exPng')},{i:'📋',l:'Device list spreadsheet',run:click('csvBtn')},{i:'🔢',l:'Counts spreadsheet',run:click('countCsv')},{i:'☑',l:'Checklist spreadsheet',run:click('checkCsv')},{i:'📄',l:'Report PDF',run:click('reportPdf')}];
  const shr=()=>[{i:'⇆',l:'Split for second technician',run:click('splitBtn')},{i:'⇄',l:'Merge returned file',run:click('mergeBtn')}];
  wheel(a,'Menu',[{i:'📂',l:'Open plan (PDF / image)…',run:()=>by('file').click()},{i:'💾',l:'Save project file',run:click('projSave')},{i:'⤓',l:'Export…',run:sub(a,'Export',exp)},{i:'⇪',l:'Share…',run:sub(a,'Share',shr)},
   {i:'↪',l:'Switch plan…',run:sub(a,'Switch plan',planSw)},{i:'✎',l:'Rename page',run:()=>plan?pnRename(page):uiAlert('Open a plan first.')},{i:'🗑',l:'Delete plan',run:click('planDel')},
   {i:'＋',l:'New project',run:click('projNew')},{i:'📥',l:'Open project file…',run:()=>by('bpmFile').click()},{i:'↪',l:'Switch project…',run:sub(a,'Switch project',projSw)},{i:'✎',l:'Rename project',run:click('projRen')},{i:'🗑',l:'Delete project',run:click('projDel')},
   {i:'⚙',l:'Customize (theme, accent, size)',run:()=>openCz()}])},'Menu: project, plan, save, export, share, customize');
 // ---------- More ▾ (rarely used tools) ----------
 const moreB=mkTool('navMore','⋯','More ▾',function(){const a=this,w=wide(),L=[];
  if(!w)L.push({i:'◧',l:'Layers',run:()=>tlayOpen()},{i:'📷',l:'Scan QR code',run:click('qrTool')},{i:'🎓',l:'Teach a symbol',run:click('teachBtn')});
  L.push({i:'➤',l:'Select',run:()=>{const t=document.querySelector('[data-t="select"]');t&&t.click()}},{i:'✋',l:'Pan',run:()=>{const t=document.querySelector('[data-t="pan"]');t&&t.click()}},
   {i:'⤢',l:'Fit to screen',run:click('fit')},{i:'⟳',l:'Rotate view'+(typeof VR!=="undefined"&&VR?` (now ${VR}°)`:""),run:click('rotBtn')});
  const mic=by('micBtn');if(mic&&!mic.hidden)L.push({i:'🎤',l:'Voice',run:()=>mic.click()});
  L.push({i:'📘',l:'Guides',run:click('guidesBtn')},{i:'↷',l:'Redo',run:click('redo')},{i:'🗑',l:'Delete selected',run:click('del')},{i:'🧲',l:'Magnet snap '+(by('mkSnap')?.classList.contains('on')?'(on)':'(off)'),run:click('mkSnap')});
  if(w)L.push({i:'📐',l:'Angle snap (15°)',run:click('cSnap')},{i:'✍',l:'Freehand',run:()=>X.freeB.click()});
  L.push({i:'👁',l:'Filters (markups, labels, status)',run:click('layBtn')});
  wheel(a,'More',L)});
 // ---------- Draw ▾ (phone): a small panel with the real drawing buttons ----------
 const DR=document.createElement('div');DR.id='navDraw';DR.hidden=true;DR.setAttribute('role','dialog');DR.setAttribute('aria-label','Drawing tools');document.body.append(DR);
 const drawB=mkTool('navDrawB','✏️','Draw ▾',()=>{DR.hidden=!DR.hidden;drawB.classList.toggle('on',!DR.hidden);if(!DR.hidden)placeDR()});
 function placeDR(){const r=T.getBoundingClientRect();DR.style.bottom=Math.round(innerHeight-r.top+6)+'px'}
 DR.addEventListener('click',e=>{const b=e.target.closest('button,label');if(!b)return;/* a tool was picked: close the panel (wheel / width bar open from the button first) */if(b.dataset.w==='width'||b.classList.contains('tbCol'))return;setTimeout(()=>{DR.hidden=true;drawB.classList.remove('on')},250)});
 document.addEventListener('pointerdown',e=>{if(!DR.hidden&&!DR.contains(e.target)&&!drawB.contains(e.target)&&!e.target.closest('.whOv,.wbBar,#colDlg,.wbO')){DR.hidden=true;drawB.classList.remove('on')}},true);
 // ---------- top-row extras on wide screens (proxies of the real buttons) ----------
 const teachT=mkTop('navTeach','🎓','Teach',click('teachBtn'),'Teach a symbol');const qrT=mkTop('navQr','📷','QR code',click('qrTool'),'Scan an install-sheet QR code');
 const layT=by('tb2Lay');
 // ---------- big buttons ----------
 const det=by('detBtn'),ds=by('dsBtn'),walk=by('walkBtn');
 det.classList.add('navBig','navDet');ds.classList.add('navBig','navSh');
 if(ds.querySelector('.tl'))ds.querySelector('.tl').textContent='Sheets';
 if(walk.querySelector('.tl'))walk.querySelector('.tl').textContent='Walk test';
 // things that now live only in Menu / More (kept for their handlers, never shown)
 const pass=X.pass;
 if(X.textB&&!X.textB.id)X.textB.id='tbText';if(X.colW&&!X.colW.id)X.colW.id='tbColor';
 function layout(){const w=wide(),B=X.B;
  ['shapes','lines','select','share','more','place','width'].forEach(k=>B[k]&&(B[k].hidden=false));T.classList.remove('tbWide');T.querySelectorAll('.tbFlat').forEach(f=>f.hidden=true);
  // bottom row
  const r=document.createElement('div');r.className='tbR navR';
  const draw=[B.shapes,B.lines,X.textB,X.stampB,X.colW,B.width];
  r.append(det,ds,B.place,walk);if(w){r.append(...draw);HOLD.append(drawB);DR.hidden=true}else{r.append(drawB);DR.replaceChildren(B.shapes,B.lines,X.freeB,X.stampB,X.textB,by('cSnap'),X.colW,B.width)}
  r.append(moreB);
  if(w)HOLD.append(X.freeB,by('cSnap'));
  [pass,B.share,B.select,B.more,by('qrTool'),by('teachBtn'),by('guidesBtn')].forEach(e=>e&&HOLD.append(e));
  T.querySelectorAll('.tbG').forEach(g=>HOLD.append(g));
  T.replaceChildren(r);T.classList.add('navT');T.classList.toggle('navWide',w);
  // top row
  const top=[menuB,by('prev'),by('tb2Page'),by('next'),by('undo'),by('thBtn'),by('listBtn')];if(w)top.push(layT,teachT,qrT);
  const keep=new Set(top);[...TOP.children].forEach(e=>{if(!keep.has(e))HOLD.append(e)});TOP.replaceChildren(...top);TOP.classList.add('navTop');
  window.tlayMark&&tlayMark();if(!DR.hidden)placeDR()}
 window.navLayout=layout;layout();addEventListener('resize',()=>{clearTimeout(layout._t);layout._t=setTimeout(layout,100)});
 // Pins panel: Export and Split now live only in Menu ▾ (one place each)
 const hidePB=()=>['pbExp','pbSplit'].forEach(id=>{const e=by(id);if(e&&!e.hidden){e.hidden=true;e.classList.add('navGone')}});hidePB();new MutationObserver(hidePB).observe(document.body,{childList:true,subtree:true});
})();
