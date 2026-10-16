// bpm-v89: grouped, labeled toolbar (2 rows on phone) + 3D wheel pickers + Customize (order, accent, theme, density).
// Original controls are MOVED (not cloned) so every existing handler keeps working.
(()=>{const T=$('#tools'),q=s=>T.querySelector(s)||document.querySelector(s),ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const UI=Object.assign({order:['draw','style','edit','pins','review','ref'],acc:'#3b82f6',theme:'dark',dens:'normal',last:{}},JSON.parse(localStorage.getItem('bpm-ui')||'{}'));
 const save=()=>localStorage.setItem('bpm-ui',JSON.stringify(UI));
 const hid=ce('div');hid.id='tbHidden';hid.hidden=true;document.body.append(hid);
 const O=s=>{const e=document.querySelector(s);if(e)hid.append(e);return e};
 const tb=s=>document.querySelector(`[data-t="${s}"]`);
 // ---- wheel picker ----
 const W=ce('div','whOv');W.hidden=true;W.innerHTML='<div class="whBox"><div class="whT"></div><div class="whWin"><div class="whBand"></div><div class="whDrum"></div><div class="whFade"></div><div class="whTick"></div></div><div class="whBtns"><button type="button" class="btn" data-w="x">Cancel</button><button type="button" class="btn pri" data-w="ok">Choose</button></div></div>';document.body.append(W);
 const ST=24,R=118,IH=40;let WH=null;
 function wheelOpen(title,items,cur,cb){const d=W.querySelector('.whDrum');W.querySelector('.whT').textContent=title;
  d.innerHTML=items.map((it,i)=>`<div class="whI" data-i="${i}" style="transform:rotateX(${-i*ST}deg) translateZ(${R}px)">${it.html||esc(it.l)}</div>`).join('');
  WH={items,cb,pos:Math.max(0,cur),v:0,raf:0,lastI:-1};W.hidden=false;W.classList.remove('in');requestAnimationFrame(()=>W.classList.add('in'));paint()}
 function paint(){const d=W.querySelector('.whDrum'),p=WH.pos;d.style.transform=`translateZ(-${R}px) rotateX(${p*ST}deg)`;const c=Math.round(p);
  d.querySelectorAll('.whI').forEach((e,i)=>{const a=Math.abs(i-p)*ST;e.style.opacity=a>80?0:1-a/110;e.classList.toggle('cen',i===c)});if(c!==WH.lastI){if(WH.lastI>=0&&navigator.vibrate)try{navigator.vibrate(4)}catch{}WH.lastI=c}}
 const clampP=p=>Math.max(0,Math.min(WH.items.length-1,p));
 function settle(){cancelAnimationFrame(WH.raf);const step=()=>{if(Math.abs(WH.v)>.002){WH.pos=clampP(WH.pos+WH.v);WH.v*=.92;if(WH.pos===0||WH.pos===WH.items.length-1)WH.v=0}else{const t=Math.round(WH.pos);WH.pos+=(t-WH.pos)*.3;if(Math.abs(t-WH.pos)<.01){WH.pos=t;paint();return}}paint();WH.raf=requestAnimationFrame(step)};step()}
 const win=W.querySelector('.whWin');let dr=null;
 win.addEventListener('pointerdown',e=>{win.setPointerCapture(e.pointerId);cancelAnimationFrame(WH.raf);dr={y:e.clientY,p:WH.pos,t:performance.now(),ly:e.clientY,lt:performance.now(),moved:0}});
 win.addEventListener('pointermove',e=>{if(!dr)return;const dy=e.clientY-dr.y;dr.moved=Math.max(dr.moved,Math.abs(dy));WH.pos=clampP(dr.p-dy/IH);const n=performance.now();WH.v=-(e.clientY-dr.ly)/IH/Math.max(1,(n-dr.lt)/16);dr.ly=e.clientY;dr.lt=n;paint()});
 win.addEventListener('pointerup',e=>{if(!dr)return;const tap=dr.moved<6;dr=null;if(tap){const r=win.getBoundingClientRect(),off=Math.round((e.clientY-(r.top+r.height/2))/IH);if(off===0)return choose();WH.pos=clampP(Math.round(WH.pos)+off);WH.v=0}settle()});
 win.addEventListener('wheel',e=>{e.preventDefault();WH.v+=e.deltaY/IH/12;settle()},{passive:false});
 const close=()=>{W.classList.remove('in');setTimeout(()=>W.hidden=true,150)};function choose(){const i=Math.round(WH.pos),cb=WH.cb;close();cb(WH.items[i],i)}
 W.querySelector('[data-w=x]').onclick=close;W.querySelector('[data-w=ok]').onclick=choose;W.addEventListener('click',e=>{if(e.target===W)close()});
 window.wheelOpen=wheelOpen;window.wheelPos=()=>WH&&WH.pos;
 // ---- grouped wheel buttons (tap = last pick; tap again or ▾ = wheel) ----
 const mkWheelBtn=(key,label,items,isOn)=>{const b=ce('button','tool tbw');b.type='button';b.dataset.w=key;
  const it=()=>items().find(x=>x.k===UI.last[key])||items()[0],show=()=>{const x=it();b.innerHTML=`${x.i}<span class="tl">${label} ▾</span>`;b.title=label+': '+x.l;b.classList.toggle('on',!!isOn(x))};
  const open=()=>{const L=items();wheelOpen(label,L.map(x=>({...x,html:`<span class="whIc">${x.i}</span>${esc(x.l)}`})),L.indexOf(it()),x=>{UI.last[key]=x.k;save();x.run();show()})};
  b.onclick=e=>{const r=b.getBoundingClientRect(),car=e.clientY>r.bottom-14;const x=it();if(car||isOn(x))open();else{x.run();show()}};b._show=show;show();return b};
 const tool1=(t,i,l)=>({k:t,i,l,run:()=>tb(t).click(),on:()=>tool===t});
 const pill=(k,n,els)=>{const g=ce('div','tbG');g.dataset.g=k;g.append(ce('i','tbN',n),...els.filter(Boolean));return g};
 const zig=tb('zig').querySelector('svg').outerHTML;
 const SH=[tool1('rect','▢','Box'),tool1('ellipse','◯','Circle'),tool1('cloud','☁','Cloud'),tool1('check','✔','Check mark')];
 const LN=[tool1('line','╱','Line'),tool1('arrow','↗','Arrow'),tool1('zig',zig,'Zigzag'),tool1('measure','📏','Measure')];
 const SEL=[tool1('select','➤','Select'),tool1('pan','✋','Pan')];
 const sizes=()=>[...['S','M','L','XL'].map((s,i)=>({k:'s'+i,i:'≡',l:'Size '+s,run:()=>{$('#size').value=i;$('#size').dispatchEvent(new Event('change',{bubbles:true}))}})),...[25,50,75,100].map(o=>({k:'o'+o,i:'◐',l:'Opacity '+o+'%',run:()=>{$('#opac').value=o;$('#opac').dispatchEvent(new Event('input',{bubbles:true}));$('#opac').dispatchEvent(new Event('change',{bubbles:true}))}})),
  {k:'mag',i:'🧲',l:'Magnet '+($('#mkSnap').classList.contains('on')?'on → off':'off → on'),run:()=>$('#mkSnap').click()}];
 const pinT=()=>Object.entries(TYPES).map(([k,v])=>({k,i:`<span class="tbDot" style="background:${v.c}"></span>`,l:v.n,run:()=>{$('#pinType').value=k;$('#pinType').dispatchEvent(new Event('change',{bubbles:true}));tb('pin').click()}}));
 const more=()=>[{k:'fit',i:'⤢',l:'Fit to screen',run:()=>$('#fit').click()},{k:'del',i:'🗑',l:'Delete selected',run:()=>$('#del').click()},{k:'mag',i:'🧲',l:'Magnet snap '+($('#mkSnap').classList.contains('on')?'(on)':'(off)'),run:()=>$('#mkSnap').click()},{k:'cz',i:'⚙',l:'Customize toolbar',run:()=>openCz()}];
 const share=()=>[{k:'split',i:'⇆',l:'Split for 2nd tech',run:()=>$('#splitBtn').click()},{k:'merge',i:'⇄',l:'Merge returned file',run:()=>$('#mergeBtn').click()}];
 // move originals out of the way
 ['pan','select','rect','ellipse','check','cloud','arrow','line','zig','measure','pin'].forEach(t=>hid.append(tb(t)));['#mkSnap','#pinType','#size','#del','#fit'].forEach(O);const opl=document.querySelector('#tools .opac');if(opl)hid.append(opl);
 const B={shapes:mkWheelBtn('shapes','Shapes',()=>SH,x=>x.on()),lines:mkWheelBtn('lines','Lines',()=>LN,x=>x.on()),width:mkWheelBtn('width','Width',sizes,()=>0),
  place:mkWheelBtn('place','Place',pinT,()=>tool==='pin'),select:mkWheelBtn('select','Select',()=>SEL,x=>x.on()),share:mkWheelBtn('share','Share',share,()=>0),more:mkWheelBtn('more','More',more,()=>0)};
 const text=tb('text');hid.append(text);const textB=ce('button','tool','T<span class="tl">Text</span>');textB.type='button';textB.onclick=()=>text.click();
 const col=$('#color');const colW=ce('label','tool tbCol');colW.append(col,ce('span','tl','Color'));
 // bpm-v100: Color sheet: the basic markup colors + every distinct device pin color (read from TYPES, so new types appear automatically) + Custom… (native picker)
 const BASIC=[['#e11d48','Red (default)'],['#f97316','Orange'],['#facc15','Yellow'],['#16a34a','Green'],['#0ea5e9','Light blue'],['#2563eb','Blue'],['#7c3aed','Purple'],['#000000','Black'],['#64748b','Gray'],['#ffffff','White']];
 const colSheet=()=>{let d=$('#colDlg');if(!d){d=ce('dialog');d.id='colDlg';document.body.append(d)}const cur=col.value.toLowerCase(),dev=new Map();
  for(const [k,t] of Object.entries(TYPES)){if(!t.c)continue;const c=t.c.toLowerCase();if(!dev.has(c))dev.set(c,[]);dev.get(c).push(t.n.replace(/ – .*/,''))}
  const sw=(c,lab,names)=>`<button type="button" class="cSw${c.toLowerCase()===cur?' on':''}" data-c="${c}" title="${esc(names||lab)}" aria-label="${esc((names||lab)+' '+c)}"><i style="background:${c}"></i><span class="cSl">${esc(lab)}</span></button>`;
  d.innerHTML=`<div class="cHead"><b>Color</b><span class="sp"></span><button type="button" class="btn" id="cX">✕<span class="tl">Close</span></button></div><div class="cBody"><h4>Markup colors</h4><div class="cGrid">${BASIC.map(([c,l])=>sw(c,l)).join('')}</div>
   <h4>Device colors</h4><div class="cGrid">${[...dev].map(([c,ns])=>sw(c,ns.join(', '),ns.join(', '))).join('')}</div>
   <div class="row" style="margin-top:10px"><button type="button" class="btn" id="cCust">🎨<span class="tl">Custom…</span></button></div></div>`;
  const pick=c=>{col.value=c;col.dispatchEvent(new Event('input',{bubbles:true}));col.dispatchEvent(new Event('change',{bubbles:true}));d.close()};
  d.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>pick(b.dataset.c));d.querySelector('#cX').onclick=()=>d.close();d.querySelector('#cCust').onclick=()=>{d.close();col.click()};d.showModal()};
 colW.addEventListener('click',e=>{if(e.target===col&&e.isTrusted===false)return;e.preventDefault();colSheet()});window.colSheet=colSheet;
 const pass=ce('button','tool','✔<span class="tl">Pass</span>');pass.type='button';pass.id='tbPass';pass.onclick=()=>{const it=(msel.length?msel:sel?[sel.o]:[]).filter(isPinO);if(!it.length)return toast('Select pins first (Select ▾), then Pass');bulkPass(it)};
 const walkB=$('#walkBtn');walkB.classList.add('tool');
 const G={draw:pill('draw','DRAW',[B.shapes,B.lines,textB,$('#cSnap')]),style:pill('style','STYLE',[colW,B.width]),edit:pill('edit','EDIT',[$('#undo'),$('#redo'),B.more]),
  pins:pill('pins','PINS',[B.place,$('#detBtn'),walkB]),review:pill('review','REVIEW',[B.select,pass,B.share]),ref:pill('ref','REF',[$('#dsBtn'),$('#qrTool')])};
 const rest=[...T.children];T.innerHTML='';const r1=ce('div','tbR'),r2=ce('div','tbR');T.append(r1,r2);rest.forEach(e=>hid.append(e));
 function layout(){const o=UI.order.filter(k=>G[k]).concat(Object.keys(G).filter(k=>!UI.order.includes(k)));r1.replaceChildren(...o.slice(0,3).map(k=>G[k]));r2.replaceChildren(...o.slice(3).map(k=>G[k]),...(window.TB_EXTRA||[]))}window.tbLayout=layout;
 layout();T.classList.add('tbNew');
 const refresh=()=>Object.values(B).forEach(b=>b._show());document.addEventListener('click',()=>setTimeout(refresh,0),true);new MutationObserver(()=>refresh()).observe(hid,{subtree:true,attributes:true,attributeFilter:['class']});
 // ---- theme / accent / density ----
 function applyUI(){const r=document.documentElement;r.style.setProperty('--acc',UI.acc);const dark=UI.theme==='dark'||(UI.theme==='auto'&&!matchMedia('(prefers-color-scheme: light)').matches);document.body.classList.toggle('light',!dark);document.body.classList.toggle('dense',UI.dens==='compact');dispatchEvent(new Event('resize'))}
 applyUI();matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',applyUI);
 const cz=ce('dialog');cz.id='czDlg';document.body.append(cz);
 function openCz(){const N={draw:'✏ Draw',style:'🎨 Style',edit:'↶ Edit',pins:'📍 Pins',review:'✔ Review',ref:'📄 Reference'},AC=['#3b82f6','#22c55e','#f97316','#e11d48','#a855f7','#14b8a6'];
  cz.innerHTML=`<h3 style="margin:4px 0">⚙ Customize toolbar</h3><small style="color:var(--mu2)">Order of groups (first 3 = row 1). Saved on this device.</small><div id="czL">${UI.order.map((k,i)=>`<div class="czI"><span>${N[k]}</span><span class="sp"></span><button type="button" class="btn" data-up="${i}"${i?'':' disabled'}>▲ Up</button><button type="button" class="btn" data-dn="${i}"${i<UI.order.length-1?'':' disabled'}>▼ Down</button></div>`).join('')}</div>
  <b>Accent</b><div class="czA">${AC.map(c=>`<button type="button" class="czS${c===UI.acc?' on':''}" data-acc="${c}" style="background:${c}" aria-label="Accent ${c}"><span class="tl">${c===UI.acc?'✓':'&nbsp;'}</span></button>`).join('')}<label class="btn">Custom<input type="color" id="czAc" value="${UI.acc}"></label></div>
  <b>Theme</b><div class="row">${['dark','light','auto'].map(t=>`<button type="button" class="btn${UI.theme===t?' pri':''}" data-th="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <b>Density</b><div class="row">${['compact','normal'].map(t=>`<button type="button" class="btn${UI.dens===t?' pri':''}" data-dn2="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <div class="row"><button type="button" class="btn" id="czR">Reset</button><span class="sp"></span><button type="button" class="btn pri" id="czX">Done</button></div>`;
  const upd=()=>{save();layout();applyUI();openCz()};
  cz.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const i=+b.dataset.up;[UI.order[i-1],UI.order[i]]=[UI.order[i],UI.order[i-1]];upd()});
  cz.querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>{const i=+b.dataset.dn;[UI.order[i+1],UI.order[i]]=[UI.order[i],UI.order[i+1]];upd()});
  cz.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{UI.acc=b.dataset.acc;upd()});cz.querySelector('#czAc').onchange=e=>{UI.acc=e.target.value;upd()};
  cz.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{UI.theme=b.dataset.th;upd()});cz.querySelectorAll('[data-dn2]').forEach(b=>b.onclick=()=>{UI.dens=b.dataset.dn2;upd()});
  cz.querySelector('#czR').onclick=()=>{UI.order=['draw','style','edit','pins','review','ref'];UI.acc='#3b82f6';UI.theme='dark';UI.dens='normal';upd()};cz.querySelector('#czX').onclick=()=>cz.close();if(!cz.open)cz.showModal()}
 window.openCz=openCz;
 const czB=ce('button','btn','⚙<span class="tl">Customize</span>');czB.type='button';czB.id='czBtn';czB.title='Customize toolbar';czB.onclick=openCz;$('#top').append(czB);
})();
