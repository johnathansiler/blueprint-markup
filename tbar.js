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
  WH={items,cb,pos:Math.max(0,cur),v:0,raf:0,lastI:-1};W.hidden=false;whPlace(W.querySelector('.whBox'),LASTA,WH.pos,items.length);W.classList.remove('in');requestAnimationFrame(()=>W.classList.add('in'));paint()}
 // bpm-v103: floating borderless wheel anchored to the tapped control (below it, or above if no room; clamped to the viewport)
 let LASTA=null;document.addEventListener('pointerdown',e=>{if(W.contains(e.target))return;const a=e.target.closest&&e.target.closest('button,summary,label,.btn,select,[data-w]');if(a)LASTA=a},true);
 function whPlace(box,a,cur,n){const bw=Math.min(300,innerWidth-16),bh=210,ih=40;box.style.width=bw+'px';let x=(innerWidth-bw)/2,y=(innerHeight-bh)/2;
  if(a&&a.isConnected){const r=a.getBoundingClientRect();x=r.left+r.width/2-bw/2;const up=Math.min(cur,2),dn=Math.min(n-1-cur,2),need=(up+dn+1)*ih;
   // the visible items sit directly below the button (or above it when there is no room); the selected one is the bright center row
   const cB=r.bottom+6+ih/2+up*ih,cA=r.top-6-ih/2-dn*ih;let c=r.bottom+6+need<=innerHeight-6?cB:r.top-6-need>=6?cA:Math.max(ih/2+6,Math.min(innerHeight-ih/2-6,r.top+r.height/2));y=c-bh/2}
  x=Math.max(8,Math.min(innerWidth-bw-8,x));box.style.left=x+'px';box.style.top=y+'px'}
 window.wheelAnchor=a=>{LASTA=a};
 function paint(){const d=W.querySelector('.whDrum'),p=WH.pos;d.style.transform=`translateZ(-${R}px) rotateX(${p*ST}deg)`;const c=Math.round(p);
  d.querySelectorAll('.whI').forEach((e,i)=>{const a=Math.abs(i-p)*ST;e.style.opacity=a>80?0:1-a/100;e.style.fontSize=Math.max(12,21-a/9)+'px';e.classList.toggle('cen',i===c)});if(c!==WH.lastI){if(WH.lastI>=0&&navigator.vibrate)try{navigator.vibrate(4)}catch{}WH.lastI=c}}
 const clampP=p=>Math.max(0,Math.min(WH.items.length-1,p));
 function settle(){cancelAnimationFrame(WH.raf);const step=()=>{if(Math.abs(WH.v)>.002){WH.pos=clampP(WH.pos+WH.v);WH.v*=.92;if(WH.pos===0||WH.pos===WH.items.length-1)WH.v=0}else{const t=Math.round(WH.pos);WH.pos+=(t-WH.pos)*.3;if(Math.abs(t-WH.pos)<.01){WH.pos=t;paint();return}}paint();WH.raf=requestAnimationFrame(step)};step()}
 const win=W.querySelector('.whWin');let dr=null;
 win.addEventListener('pointerdown',e=>{win.setPointerCapture(e.pointerId);cancelAnimationFrame(WH.raf);dr={y:e.clientY,p:WH.pos,t:performance.now(),ly:e.clientY,lt:performance.now(),moved:0}});
 win.addEventListener('pointermove',e=>{if(!dr)return;const dy=e.clientY-dr.y;dr.moved=Math.max(dr.moved,Math.abs(dy));WH.pos=clampP(dr.p-dy/IH);const n=performance.now();WH.v=-(e.clientY-dr.ly)/IH/Math.max(1,(n-dr.lt)/16);dr.ly=e.clientY;dr.lt=n;paint()});
 win.addEventListener('pointerup',e=>{if(!dr)return;const tap=dr.moved<6;dr=null;if(tap){const r=win.getBoundingClientRect(),off=Math.round((e.clientY-(r.top+r.height/2))/IH);if(off===0)return choose();WH.pos=clampP(Math.round(WH.pos)+off);WH.v=0}settle()});
 win.addEventListener('wheel',e=>{e.preventDefault();WH.v+=e.deltaY/IH/12;settle()},{passive:false});
 const close=()=>{W.classList.remove('in');setTimeout(()=>W.hidden=true,150)};function choose(){const i=Math.round(WH.pos),cb=WH.cb;close();cb(WH.items[i],i)}
 W.querySelector('[data-w=x]').onclick=close;W.querySelector('[data-w=ok]').onclick=choose;W.addEventListener('click',e=>{if(e.target===W)close()});document.addEventListener('keydown',e=>{if(W.hidden||!WH)return;if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='Enter'){e.preventDefault();choose()}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();WH.pos=clampP(Math.round(WH.pos)+(e.key==='ArrowDown'?1:-1));paint()}});
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

 // bpm-v102: Width picker. Same values/behavior as before (#size 0..3 -> SZ px, text SZT font); each option previews its real stroke in the current color.
 const WN=['Thin','Medium','Thick','Extra thick'];
 function mkWidthBtn(){const b=ce('button','tool tbw tbWid');b.type='button';b.dataset.w='width';
  const show=()=>{const i=+$('#size').value||0,c=$('#color').value,w=SZ[i];b.innerHTML=`<svg class="wPv" width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><line x1="3" y1="9" x2="23" y2="9" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/></svg><span class="tl">Width ▾</span>`;b.title=`Line width: ${WN[i]} (${w} px)`;b.setAttribute('aria-label',b.title)};
  b.onclick=()=>widthSheet(show);b._show=show;show();$('#color').addEventListener('input',show);$('#color').addEventListener('change',show);$('#size').addEventListener('change',show);return b}
 function widthSheet(show){let d=$('#widDlg');if(!d){d=ce('dialog');d.id='widDlg';document.body.append(d)}const i0=+$('#size').value||0,c=$('#color').value,op=+$('#opac').value||100,mag=$('#mkSnap').classList.contains('on');
  d.innerHTML=`<div class="cHead"><b>Line width</b><span class="sp"></span><button type="button" class="btn" id="wX">✕<span class="tl">Close</span></button></div><div class="wList" role="radiogroup" aria-label="Line width">${SZ.map((w,i)=>`<button type="button" role="radio" aria-checked="${i===i0}" class="wOpt${i===i0?' on':''}" data-i="${i}"><svg width="120" height="24" viewBox="0 0 120 24" aria-hidden="true"><line x1="8" y1="12" x2="112" y2="12" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/></svg><span class="wL">${WN[i]}</span><small>${w} px</small><b class="wCk">${i===i0?'✓':''}</b></button>`).join('')}</div>
   <small class="wNote">Text markups use the same choice as font size (${SZT.join(' / ')} px).</small>
   <h4>Opacity</h4><div class="wOp">${[25,50,75,100].map(o=>`<button type="button" class="btn${o===op?' on':''}" data-o="${o}">${o}%</button>`).join('')}</div>
   <h4>Magnet snap</h4><button type="button" class="btn${mag?' on':''}" id="wMag">🧲<span class="tl">Magnet ${mag?'on (tap to turn off)':'off (tap to turn on)'}</span></button>`;
  d.querySelectorAll('.wOpt').forEach(x=>x.onclick=()=>{$('#size').value=x.dataset.i;$('#size').dispatchEvent(new Event('change',{bubbles:true}));show();d.close()});
  d.querySelectorAll('[data-o]').forEach(x=>x.onclick=()=>{const o=+x.dataset.o;$('#opac').value=o;$('#opac').dispatchEvent(new Event('input',{bubbles:true}));$('#opac').dispatchEvent(new Event('change',{bubbles:true}));widthSheet(show)});
  d.querySelector('#wMag').onclick=()=>{$('#mkSnap').click();widthSheet(show)};d.querySelector('#wX').onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close()};if(!d.open)d.showModal()}
 window.widthSheet=()=>widthSheet(B.width._show);document.addEventListener('pointerup',()=>setTimeout(()=>B.width&&B.width._show(),0),true);
 const pinT=()=>Object.entries(TYPES).map(([k,v])=>({k,i:`<span class="tbDot" style="background:${v.c}"></span>`,l:v.n,run:()=>{$('#pinType').value=k;$('#pinType').dispatchEvent(new Event('change',{bubbles:true}));tb('pin').click()}}));
 const more=()=>[{k:'fit',i:'⤢',l:'Fit to screen',run:()=>$('#fit').click()},{k:'del',i:'🗑',l:'Delete selected',run:()=>$('#del').click()},{k:'mag',i:'🧲',l:'Magnet snap '+($('#mkSnap').classList.contains('on')?'(on)':'(off)'),run:()=>$('#mkSnap').click()},{k:'cz',i:'⚙',l:'Customize toolbar',run:()=>openCz()}];
 const share=()=>[{k:'split',i:'⇆',l:'Split for 2nd tech',run:()=>$('#splitBtn').click()},{k:'merge',i:'⇄',l:'Merge returned file',run:()=>$('#mergeBtn').click()}];
 // move originals out of the way
 ['pan','select','rect','ellipse','check','cloud','arrow','line','zig','measure','pin'].forEach(t=>hid.append(tb(t)));['#mkSnap','#pinType','#size','#del','#fit'].forEach(O);const opl=document.querySelector('#tools .opac');if(opl)hid.append(opl);
 const B={shapes:mkWheelBtn('shapes','Shapes',()=>SH,x=>x.on()),lines:mkWheelBtn('lines','Lines',()=>LN,x=>x.on()),width:mkWidthBtn(),
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
 // bpm-v102: wide screens (≥800px) show tools from the wheels/menus as direct labeled buttons, group by group, as long as both rows still fit; the rest stay as wheels. Phone unchanged.
 const flat=(x,lab)=>{const b=ce('button','tool tbFlat',`${x.i}<span class="tl">${esc(lab||x.l)}</span>`);b.type='button';b.title=x.l;b.onclick=()=>{x.run();setTimeout(flatSync,0)};b._x=x;return b};
 const SHORT={rect:'Box',ellipse:'Circle',cloud:'Cloud',check:'Check',line:'Line',arrow:'Arrow',zig:'Zigzag',measure:'Measure',select:'Select',pan:'Pan',fit:'Fit',del:'Delete',mag:'Magnet',cz:'Customize',tlay:'Layers ▾',split:'Split',merge:'Merge'};
 const EXP=[['shapes',()=>SH],['lines',()=>LN],['select',()=>SEL],['share',share],['more',more]];
 function flatSync(){window.tlayMark&&tlayMark();document.querySelectorAll('#tools .tbFlat').forEach(b=>{const x=b._x;b.classList.toggle('on',!!(x.on&&x.on()))})}
 const WMQ=matchMedia('(min-width:800px)');const FL={};
 const ensure=k=>{if(FL[k])return FL[k];const w=B[k];FL[k]=EXP.find(e=>e[0]===k)[1]().map(x=>{const f=flat(x,SHORT[x.k]);f.hidden=true;return f});w.after(...FL[k]);return FL[k]};
 const setExp=(k,on)=>{const f=ensure(k);B[k].hidden=on;f.forEach(b=>b.hidden=!on)};
 function place(){const o=UI.order.filter(k=>G[k]).concat(Object.keys(G).filter(k=>!UI.order.includes(k)));r1.replaceChildren(...o.map(k=>G[k]),...(window.TB_EXTRA||[]));r2.replaceChildren();r2.hidden=true;fade()}
 // bpm-v102: ONE row everywhere; scrolls horizontally (momentum) with an edge fade where it doesn't fit
 function fade(){const L=r1.scrollLeft>2,R=r1.scrollLeft+r1.clientWidth<r1.scrollWidth-2;r1.classList.toggle('fL',L);r1.classList.toggle('fR',R)}r1.addEventListener('scroll',fade,{passive:true});
 const fits=()=>r1.scrollWidth<=r1.clientWidth+1;
 function layout(){place();const wide=WMQ.matches;T.classList.toggle('tbWide',wide);const exp=[];for(const [k] of EXP)setExp(k,false);
  if(wide)for(const [k] of EXP){setExp(k,true);if(fits())exp.push(k);else setExp(k,false)}flatSync();T.dataset.exp=exp.join(',');fade()}
 window.tbLayout=layout;WMQ.addEventListener('change',layout);let lrT=0;new ResizeObserver(()=>{clearTimeout(lrT);lrT=setTimeout(layout,120)}).observe(T);document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#tools,.wh'))setTimeout(flatSync,0)},true);
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
