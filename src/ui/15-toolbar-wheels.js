// bpm-v89: grouped, labeled toolbar (2 rows on phone) + 3D wheel pickers + Customize (order, accent, theme, density).
// Original controls are MOVED (not cloned) so every existing handler keeps working.
(()=>{const T=$('#tools'),q=s=>T.querySelector(s)||document.querySelector(s);
 const UI=Object.assign({order:['draw','style','edit','pins','review','ref'],acc:'#7e7e7e',theme:'dark',dens:'normal',last:{}},JSON.parse(localStorage.getItem('bpm-ui')||'{}'));
 // bpm-v137: grey theme; the old default blue accent becomes the new grey default (a chosen non-default accent is kept)
 if(UI.acc==='#3b82f6'&&!UI.accSet)UI.acc='#7e7e7e';
 const save=()=>localStorage.setItem('bpm-ui',JSON.stringify(UI));
 const hid=ce('div');hid.id='tbHidden';hid.hidden=true;document.body.append(hid);
 const O=s=>{const e=document.querySelector(s);if(e)hid.append(e);return e};
 const tb=s=>document.querySelector(`[data-t="${s}"]`);
 // ---- list picker ----
 // bpm-v141: every former rolling wheel is a plain list like the Menu (user: "Remove the rolling menu. Make them all like the menu on the top left").
 // Same API as before, so every caller is unchanged: wheelOpen(title,items,cur,cb); wheelAnchor(button). One tap per row, full-word labels, icon beside the label,
 // Back on a list opened from another list, ✕ Close / Escape / tap outside to close, arrow keys move between rows. Destructive lists (Clear pins, Clear markups,
 // Delete pins) still need a second tap on the same row. "Cancel" rows are not shown (✕ Close does that). window.listGroups(title,items) may group rows (Menu).
 const MS=ce('div','mnuOv');MS.id='mnuSheet';MS.hidden=true;MS.setAttribute('role','dialog');MS.setAttribute('aria-modal','true');document.body.append(MS);
 let LASTA=null,PRESS=null,STK=[],pickT=0,CUR=null;
 document.addEventListener('pointerdown',e=>{if(MS.contains(e.target))return;const a=e.target.closest&&e.target.closest('button,summary,label,.btn,select,[data-w]');if(a)LASTA=a},true);
 window.wheelAnchor=a=>{LASTA=a};
 const DESTR=t=>/^(clear (pins|markups)|delete pins)$/i.test(String(t||'').trim());
 const txt=it=>String((it&&(it.l||String(it.html||'').replace(/<[^>]*>/g,'')))||'').trim();
 const isCancel=it=>/^\W*cancel$/i.test(txt(it));
 function close(){MS.hidden=true;MS.innerHTML='';if(PRESS){PRESS.classList.remove('whPressed');PRESS=null}CUR=null}
 window.menuListClose=()=>{close();STK=[]};
 function rowHtml(x,i,on){let ic=x.i||'',lab=esc(x.l||'');if(x.html){const t=document.createElement('div');t.innerHTML=x.html;const e=t.querySelector('.whIc');if(e){ic=`<span style="${esc(e.getAttribute('style')||'')}">${e.innerHTML}</span>`;e.remove()}lab=t.innerHTML.trim()}
  return `<button type="button" role="menuitem" class="btn mnuI${on?' on':''}" data-i="${i}"${on?' aria-current="true"':''}><span class="mnuIc" aria-hidden="true">${ic}</span><span class="tl">${lab}</span></button>`}
 function wheelOpen(title,items,cur,cb){const par=Date.now()-pickT<2500&&STK.length?STK[STK.length-1]:null;if(!par)STK=[];
  const me={title,items,cur,cb,par};CUR=me;const markOn=cur>0||!items.some(x=>typeof x.run==='function');
  const G=(window.listGroups&&window.listGroups(title,items))||[[null,items.map((x,i)=>i)]];
  MS.innerHTML=`<div class="mnuP" role="menu" aria-label="${esc(title)}"><div class="mnuH">${par?'<button type="button" class="btn" id="mnuBack">◀ Back</button>':''}<b class="mnuT">${esc(title)}</b><span class="sp"></span><button type="button" class="btn" id="mnuX">✕ Close</button></div>`+
   `<div class="mnuB">${G.map(([g,ix])=>[g,ix.filter(i=>items[i]&&!isCancel(items[i]))]).filter(g=>g[1].length).map(([g,ix])=>`<section class="mnuG">${g?`<h4>${esc(g)}</h4>`:''}<div class="mnuL">${ix.map(i=>rowHtml(items[i],i,markOn&&i===cur)).join('')}</div></section>`).join('')}</div>`+
   `<div class="mnuCf" role="status" aria-live="polite" hidden>Tap again to confirm</div></div>`;
  MS.hidden=false;if(PRESS)PRESS.classList.remove('whPressed');PRESS=LASTA&&LASTA.isConnected&&!MS.contains(LASTA)?LASTA:null;if(PRESS)PRESS.classList.add('whPressed');
  MS.querySelector('#mnuX').onclick=()=>{close();STK=[]};
  const bk=MS.querySelector('#mnuBack');if(bk)bk.onclick=()=>{const p=me.par;close();STK=p.par?[p.par]:[];pickT=p.par?Date.now():0;wheelOpen(p.title,p.items,p.cur,p.cb)};
  const cf=MS.querySelector('.mnuCf');let pend=null;
  MS.querySelectorAll('.mnuI').forEach(b=>b.onclick=()=>{const i=+b.dataset.i,x=items[i];
   if(DESTR(title)){if(pend!==b){MS.querySelectorAll('.mnuI.pend').forEach(e=>e.classList.remove('pend'));pend=b;b.classList.add('pend');cf.hidden=false;b.after(cf);return}}
   close();pickT=Date.now();STK=[...STK.filter(s=>s!==me),me].slice(-4);cb(x,i)});
  const f=MS.querySelector('.mnuI.on')||MS.querySelector('.mnuI');f&&f.focus({preventScroll:false})}
 MS.addEventListener('pointerdown',e=>{if(e.target===MS){close();STK=[]}});
 addEventListener('keydown',e=>{if(MS.hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();STK=[]}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const B=[...MS.querySelectorAll('.mnuI')],i=B.indexOf(document.activeElement),n=e.key==='ArrowDown'?Math.min(B.length-1,i+1):Math.max(0,i-1);B[n]&&B[n].focus()}},true);
 window.wheelOpen=wheelOpen;window.listOpen=wheelOpen;window.listIsOpen=()=>!MS.hidden;
 // ---- grouped wheel buttons (tap = last pick; tap again or ▾ = wheel) ----
 const mkWheelBtn=(key,label,items,isOn)=>{const b=ce('button','tool tbw');b.type='button';b.dataset.w=key;
  const it=()=>items().find(x=>x.k===UI.last[key])||items()[0],show=()=>{const x=it();b.innerHTML=`${x.i}<span class="tl">${label} ▾</span>`;b.title=label+': '+x.l;b.classList.toggle('on',!!isOn(x))};
  const open=()=>{const L=items();wheelOpen(label,L.map(x=>({...x,html:`<span class="whIc">${x.i}</span>${esc(x.l)}`})),L.indexOf(it()),x=>{UI.last[key]=x.k;save();x.run();show()})};
  b.onclick=e=>{const r=b.getBoundingClientRect(),car=e.clientY>r.bottom-14;const x=it();if(car||isOn(x))open();else{x.run();show()}};b._show=show;show();return b};
 const tool1=(t,i,l)=>({k:t,i,l,run:()=>tb(t).click(),on:()=>tool===t});
 const pill=(k,n,els)=>{const g=ce('div','tbG');g.dataset.g=k;g.append(ce('i','tbN',n),...els.filter(Boolean));return g};
 const zig=tb('zig').querySelector('svg').outerHTML;
 const SH=[tool1('rect','▢','Box'),tool1('rrect','<span class="rrI">▢</span>','Rounded box'),tool1('ellipse','◯','Ellipse'),tool1('arc','◠','Arc'),tool1('tri','△','Triangle'),tool1('poly','⬡','Polygon'),tool1('star','☆','Star'),tool1('cloud','☁','Revision cloud'),tool1('check','✔','Check mark')];
 const LN=[tool1('line','╱','Line'),tool1('arrow','↗','Arrow'),tool1('pen','✒','Pen (curves)'),tool1('free','✍','Freehand'),tool1('zig',zig,'Zigzag'),tool1('measure','📏','Measure')];
 const SEL=[tool1('select','➤','Select'),tool1('pan','✋','Pan')];
 const sizes=()=>[...['S','M','L','XL'].map((s,i)=>({k:'s'+i,i:'≡',l:'Size '+s,run:()=>{$('#size').value=i;$('#size').dispatchEvent(new Event('change',{bubbles:true}))}})),...[25,50,75,100].map(o=>({k:'o'+o,i:'◐',l:'Opacity '+o+'%',run:()=>{$('#opac').value=o;$('#opac').dispatchEvent(new Event('input',{bubbles:true}));$('#opac').dispatchEvent(new Event('change',{bubbles:true}))}})),
  {k:'mag',i:'🧲',l:'Magnet '+($('#mkSnap').classList.contains('on')?'on → off':'off → on'),run:()=>$('#mkSnap').click()}];

 // bpm-v102: Width picker. Same values/behavior as before (#size 0..3 -> SZ px, text SZT font); each option previews its real stroke in the current color.
 const WN=['Thin','Medium','Thick','Extra thick'];
 function mkWidthBtn(){const b=ce('button','tool tbw tbWid');b.type='button';b.dataset.w='width';
  const show=()=>{const i=+$('#size').value||0,c=$('#color').value,w=SZ[i];b.innerHTML=`<svg class="wPv" width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><line x1="3" y1="9" x2="23" y2="9" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/></svg><span class="tl">Width ▾</span>`;b.title=`Line width: ${WN[i]} (${w} px)`;b.setAttribute('aria-label',b.title)};
  b.onclick=()=>widBar(b,show);b._show=show;show();$('#color').addEventListener('input',show);$('#color').addEventListener('change',show);$('#size').addEventListener('change',show);return b}
 /* bpm-v129: Width opens a small bar of three labelled buttons side by side above it: Width and Style each open a wheel, Opacity opens a sliding bar.
  The magnet is no longer repeated here (it is on the main bar). Tap Width again, tap outside or press Escape to close the bar. */
 const LSN=[['solid','Solid'],['dash','Dashed'],['dot','Dotted']];
 const lsSvg=(k,w=24)=>`<svg width="${w}" height="10" viewBox="0 0 ${w} 10" aria-hidden="true"><line x1="3" y1="5" x2="${w-3}" y2="5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="${k==='dash'?'6 4':k==='dot'?'0.1 5':'none'}"/></svg>`;
 let WB=null,WBO=null,WBA=null,WBS=null;
 function wbClose(){if(WB)WB.hidden=true;if(WBO)WBO.hidden=true;if(WBA)WBA.classList.remove('on')}
 function wbPlace(el,a){const r=a.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;el.style.left=Math.round(Math.max(8,Math.min(innerWidth-8-w,r.left+r.width/2-w/2)))+'px';el.style.top=Math.round(Math.max(8,r.top-8-h))+'px'}
 function wbRender(){const i=+$('#size').value||0,c=$('#color').value,ls=window.lineStyle?lineStyle():'solid',op=+$('#opac').value||100;
  WB.innerHTML=`<button type="button" class="btn" data-wb="width" title="Line width: ${WN[i]} (${SZ[i]} px)"><svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7" stroke="${c}" stroke-width="${SZ[i]}" stroke-linecap="round"/></svg><span class="wbL">Width</span></button>`+
   `<button type="button" class="btn" data-wb="style" title="Line style: ${(LSN.find(x=>x[0]===ls)||LSN[0])[1]}">${lsSvg(ls)}<span class="wbL">Style</span></button>`+
   `<button type="button" class="btn${WBO&&!WBO.hidden?' on':''}" data-wb="opacity" title="Opacity: ${op}%"><span aria-hidden="true">◐</span><span class="wbL">Opacity</span></button>`;
  WB.querySelector('[data-wb=width]').onclick=e=>{const a=e.currentTarget,i0=+$('#size').value||0;if(WBO)WBO.hidden=true;wheelAnchor(a);
   wheelOpen('Line width',[...SZ.map((w,k)=>({k,html:`<span class="whIc"><svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/></svg></span>${WN[k]} · ${w} px`})),{k:null,html:'<span class="whIc">✕</span>Cancel'}],i0,x=>{if(!x||x.k==null)return;$('#size').value=x.k;$('#size').dispatchEvent(new Event('change',{bubbles:true}));WBS&&WBS();wbRender()})};
  WB.querySelector('[data-wb=style]').onclick=e=>{const a=e.currentTarget,cur=window.lineStyle?lineStyle():'solid';if(WBO)WBO.hidden=true;wheelAnchor(a);
   wheelOpen('Line style',[...LSN.map(([k,l])=>({k,html:`<span class="whIc">${lsSvg(k)}</span>${l}`})),{k:null,html:'<span class="whIc">✕</span>Cancel'}],Math.max(0,LSN.findIndex(x=>x[0]===cur)),async x=>{if(!x||x.k==null)return;if(window.setLineStyle)await setLineStyle(x.k);wbRender()})};
  WB.querySelector('[data-wb=opacity]').onclick=e=>{const a=e.currentTarget;if(WBO&&!WBO.hidden){WBO.hidden=true;wbRender();return}
   if(!WBO){WBO=ce('div','wbOp');WBO.id='wbOp';WBO.setAttribute('role','group');WBO.setAttribute('aria-label','Opacity');document.body.append(WBO)}
   const o=$('#opac'),v=+o.value||100;WBO.innerHTML=`<span class="wbOL">Opacity</span><input type="range" id="wbOpR" min="${o.min||15}" max="${o.max||100}" step="1" value="${v}" aria-label="Opacity"><b id="wbOpV">${v}%</b>`;WBO.hidden=false;
   const r=WBO.querySelector('#wbOpR');r.oninput=()=>{o.value=r.value;WBO.querySelector('#wbOpV').textContent=r.value+'%';o.dispatchEvent(new Event('input',{bubbles:true}))};r.onchange=()=>{o.dispatchEvent(new Event('change',{bubbles:true}));wbRender()};
   wbRender();wbPlace(WBO,WB)}}
 function widBar(btn,show){WBS=show;WBA=btn;if(WB&&!WB.hidden){wbClose();return}
  if(!WB){WB=ce('div','widBar');WB.id='widBar';WB.setAttribute('role','toolbar');WB.setAttribute('aria-label','Line options');document.body.append(WB);
   document.addEventListener('pointerdown',e=>{if(!WB||WB.hidden)return;const t=e.target;if(WB.contains(t)||(WBO&&WBO.contains(t))||(WBA&&WBA.contains(t))||t.closest&&t.closest('#mnuSheet'))return;wbClose()},true);
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&WB&&!WB.hidden&&document.querySelector('#mnuSheet')?.hidden!==false)wbClose()});addEventListener('resize',()=>{if(WB&&!WB.hidden&&WBA){wbPlace(WB,WBA);if(WBO&&!WBO.hidden)wbPlace(WBO,WB)}})}
  if(WBO)WBO.hidden=true;wbRender();WB.hidden=false;btn.classList.add('on');wbPlace(WB,btn)}
 window.widthSheet=()=>widBar(B.width,B.width._show);document.addEventListener('pointerup',()=>setTimeout(()=>B.width&&B.width._show(),0),true);
 const pinT=()=>Object.entries(TYPES).map(([k,v])=>({k,i:`<span class="tbDot" style="background:${v.c}"></span>`,l:v.n,run:()=>{$('#pinType').value=k;$('#pinType').dispatchEvent(new Event('change',{bubbles:true}));tb('pin').click()}}));
 const more=()=>[{k:'fit',i:'⤢',l:'Fit to screen',run:()=>$('#fit').click()},{k:'del',i:'🗑',l:'Delete selected',run:()=>$('#del').click()},{k:'mag',i:'🧲',l:'Magnet snap '+($('#mkSnap').classList.contains('on')?'(on)':'(off)'),run:()=>$('#mkSnap').click()},{k:'cz',i:'⚙',l:'Customize toolbar',run:()=>openCz()}];
 const share=()=>[{k:'split',i:'⇆',l:'Split for second technician',run:()=>$('#splitBtn').click()},{k:'merge',i:'⇄',l:'Merge returned file',run:()=>$('#mergeBtn').click()}];
 // move originals out of the way
 ['pan','select','rect','rrect','ellipse','arc','tri','poly','star','check','cloud','arrow','line','pen','free','stamp','zig','measure','pin'].forEach(t=>hid.append(tb(t)));['#mkSnap','#pinType','#size','#del','#fit'].forEach(O);const opl=document.querySelector('#tools .opac');if(opl)hid.append(opl);
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
   <h4>Device colors</h4><div class="cGrid">${[...dev].map(([c,ns])=>{const G=typeof CGRP!=='undefined'&&Object.entries(CGRP).find(([k])=>k.toLowerCase()===c);/* bpm-v106: a shared group color shows once with its group name */return sw(c,G?G[1]:ns.join(', '),(G?G[1]+': ':'')+ns.join(', '))}).join('')}</div>
   <div class="row" style="margin-top:10px"><button type="button" class="btn" id="cCust">🎨<span class="tl">Custom…</span></button></div></div>`;
  const pick=c=>{col.value=c;col.dispatchEvent(new Event('input',{bubbles:true}));col.dispatchEvent(new Event('change',{bubbles:true}));d.close()};
  d.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>pick(b.dataset.c));d.querySelector('#cX').onclick=()=>d.close();d.querySelector('#cCust').onclick=()=>{d.close();col.click()};d.showModal()};
 colW.addEventListener('click',e=>{if(e.target===col&&e.isTrusted===false)return;e.preventDefault();colSheet()});window.colSheet=colSheet;
 const pass=ce('button','tool','✔<span class="tl">Pass</span>');pass.type='button';pass.id='tbPass';pass.onclick=()=>{const it=(msel.length?msel:sel?[sel.o]:[]).filter(isPinO);if(!it.length)return toast('Select pins first (Select ▾), then Pass');bulkPass(it)};
 const walkB=$('#walkBtn');walkB.classList.add('tool');
 const freeB=ce('button','tool tbFree','✍<span class="tl">Freehand</span>');freeB.type='button';freeB.id='tbFree';freeB.title='Freehand (smoothed)';freeB.onclick=()=>tb('free').click();document.addEventListener('click',()=>setTimeout(()=>freeB.classList.toggle('on',tool==='free'),0),true);
 const stampB=ce('button','tool tbStamp','🔖<span class="tl">Stamp</span>');stampB.type='button';stampB.id='tbStamp';stampB.title='Stamp: tap the plan to place';stampB.onclick=()=>tb('stamp').click();document.addEventListener('click',()=>setTimeout(()=>stampB.classList.toggle('on',tool==='stamp'),0),true);
 const G={draw:pill('draw','DRAW',[B.shapes,B.lines,freeB,stampB,textB,$('#cSnap')]),style:pill('style','STYLE',[colW,B.width]),edit:pill('edit','EDIT',[B.more]),
  pins:pill('pins','PINS',[B.place,$('#detBtn'),walkB]),review:pill('review','SELECT',[B.select,pass,B.share]),ref:pill('ref','SHEETS',[$('#dsBtn'),$('#qrTool')])};
 window.TBX={B,pass,freeB,stampB,textB,colW,G,T};/* bpm-v132: the Big task bar (nav132.js) re-homes these same buttons */
 const rest=[...T.children];T.innerHTML='';const r1=ce('div','tbR'),r2=ce('div','tbR');T.append(r1,r2);rest.forEach(e=>hid.append(e));
 // bpm-v102: wide screens (≥800px) show tools from the wheels/menus as direct labeled buttons, group by group, as long as both rows still fit; the rest stay as wheels. Phone unchanged.
 const flat=(x,lab)=>{const b=ce('button','tool tbFlat',`${x.i}<span class="tl">${esc(lab||x.l)}</span>`);b.type='button';b.title=x.l;b.onclick=()=>{x.run();setTimeout(flatSync,0)};b._x=x;return b};
 const SHORT={rect:'Box',ellipse:'Circle',cloud:'Cloud',check:'Check',line:'Line',arrow:'Arrow',zig:'Zigzag',measure:'Measure',select:'Select',pan:'Pan',fit:'Fit',del:'Delete',mag:'Magnet',cz:'Customize',tlay:'Layers ▾',split:'Split',merge:'Merge'};
 const EXP=[['shapes',()=>SH],['lines',()=>LN],['select',()=>SEL],['share',share],['more',more]];
 function flatSync(){window.tlayMark&&tlayMark();document.querySelectorAll('#tools .tbFlat').forEach(b=>{const x=b._x;b.classList.toggle('on',!!(x.on&&x.on()))})}
 const WMQ=matchMedia('(min-width:800px)');const FL={};
 const ensure=k=>{if(FL[k])return FL[k];const w=B[k];FL[k]=EXP.find(e=>e[0]===k)[1]().filter(x=>x.k!=='free').map(x=>{const f=flat(x,SHORT[x.k]);f.hidden=true;return f});w.after(...FL[k]);return FL[k]};
 const setExp=(k,on)=>{const f=ensure(k);B[k].hidden=on;f.forEach(b=>b.hidden=!on)};
 function place(){const o=UI.order.filter(k=>G[k]).concat(Object.keys(G).filter(k=>!UI.order.includes(k)));r1.replaceChildren(...o.map(k=>G[k]),...(window.TB_EXTRA||[]));r2.replaceChildren();r2.hidden=true;fade()}
 // bpm-v102: ONE row everywhere; scrolls horizontally (momentum) with an edge fade where it doesn't fit
 function fade(){const L=r1.scrollLeft>2,R=r1.scrollLeft+r1.clientWidth<r1.scrollWidth-2;r1.classList.toggle('fL',L);r1.classList.toggle('fR',R)}r1.addEventListener('scroll',fade,{passive:true});
 const fits=()=>r1.scrollWidth<=r1.clientWidth+1;
 function layout(){if(window.navLayout){window.navLayout();return}place();const wide=WMQ.matches;T.classList.toggle('tbWide',wide);const exp=[];for(const [k] of EXP)setExp(k,false);
  if(wide)for(const [k] of EXP){setExp(k,true);if(fits())exp.push(k);else setExp(k,false)}flatSync();T.dataset.exp=exp.join(',');fade()}
 window.tbLayout=layout;WMQ.addEventListener('change',layout);let lrT=0;new ResizeObserver(()=>{clearTimeout(lrT);lrT=setTimeout(layout,120)}).observe(T);document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#tools,.wh'))setTimeout(flatSync,0)},true);
 layout();T.classList.add('tbNew');
 const refresh=()=>Object.values(B).forEach(b=>b._show());document.addEventListener('click',()=>setTimeout(refresh,0),true);new MutationObserver(()=>refresh()).observe(hid,{subtree:true,attributes:true,attributeFilter:['class']});
 // ---- theme / accent / density ----
 function applyUI(){const r=document.documentElement;r.style.setProperty('--acc',UI.acc);const dark=UI.theme==='dark'||(UI.theme==='auto'&&!matchMedia('(prefers-color-scheme: light)').matches);document.body.classList.toggle('light',!dark);document.body.classList.toggle('dense',UI.dens==='compact');dispatchEvent(new Event('resize'))}
 applyUI();matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',applyUI);
 const cz=ce('dialog');cz.id='czDlg';document.body.append(cz);
 function openCz(){const N={draw:'✏ Draw',style:'🎨 Style',edit:'↶ Edit',pins:'📍 Pins',review:'✔ Review',ref:'📄 Reference'},AC=['#7e7e7e','#3b82f6','#22c55e','#f97316','#e11d48','#a855f7','#14b8a6'];
  cz.innerHTML=`<h3 style="margin:4px 0">⚙ Customize</h3><div id="czL"${window.navLayout?' hidden':''}><small style="color:var(--mu2)">Order of groups (first 3 = row 1). Saved on this device.</small>${UI.order.map((k,i)=>`<div class="czI"><span>${N[k]}</span><span class="sp"></span><button type="button" class="btn" data-up="${i}"${i?'':' disabled'}>▲ Up</button><button type="button" class="btn" data-dn="${i}"${i<UI.order.length-1?'':' disabled'}>▼ Down</button></div>`).join('')}</div>
  <b>Accent</b><div class="czA">${AC.map(c=>`<button type="button" class="czS${c===UI.acc?' on':''}" data-acc="${c}" style="background:${c}" aria-label="Accent ${c}"><span class="tl">${c===UI.acc?'✓':'&nbsp;'}</span></button>`).join('')}<label class="btn">Custom<input type="color" id="czAc" value="${UI.acc}"></label></div>
  <b>Theme</b><div class="row">${['dark','light','auto'].map(t=>`<button type="button" class="btn${UI.theme===t?' pri':''}" data-th="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <b>Density</b><div class="row">${['compact','normal'].map(t=>`<button type="button" class="btn${UI.dens===t?' pri':''}" data-dn2="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <div class="row"><button type="button" class="btn" id="czR">Reset</button><span class="sp"></span><button type="button" class="btn pri" id="czX">Done</button></div>`;
  const upd=()=>{save();layout();applyUI();openCz()};
  cz.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const i=+b.dataset.up;[UI.order[i-1],UI.order[i]]=[UI.order[i],UI.order[i-1]];upd()});
  cz.querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>{const i=+b.dataset.dn;[UI.order[i+1],UI.order[i]]=[UI.order[i],UI.order[i+1]];upd()});
  cz.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{UI.acc=b.dataset.acc;UI.accSet=1;upd()});cz.querySelector('#czAc').onchange=e=>{UI.acc=e.target.value;UI.accSet=1;upd()};
  cz.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{UI.theme=b.dataset.th;upd()});cz.querySelectorAll('[data-dn2]').forEach(b=>b.onclick=()=>{UI.dens=b.dataset.dn2;upd()});
  cz.querySelector('#czR').onclick=()=>{UI.order=['draw','style','edit','pins','review','ref'];UI.acc='#7e7e7e';delete UI.accSet;UI.theme='dark';UI.dens='normal';upd()};cz.querySelector('#czX').onclick=()=>cz.close();if(!cz.open)cz.showModal()}
 window.openCz=openCz;
 const czB=ce('button','btn','⚙<span class="tl">Customize</span>');czB.type='button';czB.id='czBtn';czB.title='Customize toolbar';czB.onclick=openCz;$('#top').append(czB);
})();
