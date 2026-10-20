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
 const ST=24,R=118,IH=40;let WH=null,WH0ox=42;
 // bpm-v106: curved drum band (option A look) + adjacent, never-overlapping placement (option B rules). Same API: wheelOpen(title,items,cur,cb).
 const PSP=520,SLH=50,proj=d=>{const t=d*ST*Math.PI/180,y=R*Math.sin(t),z=R*Math.cos(t)-R;return y*PSP/(PSP-z)};
 const PT=W.appendChild(ce('div','whPtr'));let PRESS=null;
 const mcv=document.createElement('canvas').getContext('2d');
 function wheelOpen(title,items,cur,cb){const d=W.querySelector('.whDrum');W.querySelector('.whT').textContent=title;const n=items.length;
  d.innerHTML=items.map((it,i)=>`<div class="whS${i===0?' f':''}${i===n-1?' l':''}" data-i="${i}"></div><div class="whI" data-i="${i}">${it.html||esc(it.l)}</div>`).join('');
  {/* bpm-v114: left-aligned rows: fixed icon/dot column, then the label (same x on every row) */const rows=[...d.querySelectorAll('.whI')],anyIc=rows.some(r=>r.querySelector('.whIc'));
   for(const r of rows){const ic=r.querySelector('.whIc'),L=ce('span','whL');for(const nd of [...r.childNodes])if(nd!==ic)L.append(nd);const t0=L.firstChild;if(t0&&t0.nodeType===3)t0.textContent=t0.textContent.replace(/^[\s\u00a0]+/,'');r.innerHTML='';r.append(ic||ce('span','whIc'+(anyIc?'':' none')),L)}WH0ox=anyIc?42:12}
  WH={items,cb,pos:Math.max(0,Math.min(n-1,cur)),v:0,raf:0,lastI:-1,rows:3,pend:null};CF.hidden=true;W.hidden=false;
  if(PRESS)PRESS.classList.remove('whPressed');PRESS=LASTA&&LASTA.isConnected?LASTA:null;if(PRESS)PRESS.classList.add('whPressed');
  whPlace(W.querySelector('.whBox'),PRESS,WH.pos,n);W.classList.remove('in');requestAnimationFrame(()=>W.classList.add('in'));paint()}
 let LASTA=null;document.addEventListener('pointerdown',e=>{if(W.contains(e.target))return;const a=e.target.closest&&e.target.closest('button,summary,label,.btn,select,[data-w]');if(a)LASTA=a},true);
 const vis=e=>e&&!e.hidden&&e.offsetParent!==null&&e.getBoundingClientRect().width>0;
 const R4=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
 const hit=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
 function whPlace(box,a,cur,n){const VW=innerWidth,VH=innerHeight,m=8,g=6,pt=8,phone=VW<600,fs=phone?14.5:16;mcv.font=`800 ${fs}px Roboto,Arial,sans-serif`;
  const tw=Math.max(...WH.items.map(it=>{const t=it.l||String(it.html||'').replace(/<[^>]*>/g,'');return mcv.measureText(t).width+(it.html&&/whIc/.test(it.html)?30:0)}));
  // bpm-v114: size to the longest label (never clipped): smaller font, then 2-line wrap, if the screen is too narrow; >=8px margin
  const pad=12*2+30+6,maxW=VW-2*m-6;let F=fs,tw2=tw;const lab=it=>(it.l||String(it.html||'').replace(/<i[^>]*class="whIc[^"]*"[^>]*>.*?<\/i>/,'').replace(/<[^>]*>/g,'')).trim();
  // measure the real rows (actual font) at the selected-row size and weight
  box.classList.remove('wr');const IR=[...box.querySelectorAll('.whI')];const meas=f=>{let mx=0;for(const e of IR){const a=e.style.fontSize,b=e.style.fontWeight;e.style.fontSize=f+'px';e.style.fontWeight='800';const l=e.querySelector('.whL');if(l){l.style.flex='none';l.style.width='max-content';mx=Math.max(mx,l.offsetWidth);l.style.flex=l.style.width=''}e.style.fontSize=a;e.style.fontWeight=b}return mx+2};
  tw2=meas(F);while(tw2+pad>maxW&&F>12){F=Math.max(12,F-.5);tw2=meas(F)}
  const wrap=tw2+pad>maxW;WH.F=F;box.classList.toggle('wr',wrap);
  const W0=Math.min(maxW,Math.max(140,Math.ceil(tw2+pad)));
  const top=$('#top'),tools=$('#tools'),sb=$('#selBar'),P=a&&a.closest('#panel,#lyrP'),K=[];
  const lo=(vis(top)?top.getBoundingClientRect().bottom:0)+m;let hi=VH-m;for(const e of[tools,sb,$('#mBar'),$('#thumbs')])if(vis(e)){const r=e.getBoundingClientRect();if(r.top>VH/2&&r.width>VW/2)hi=Math.min(hi,r.top-m)}/* v114: phone Pages strip too */
  for(const e of[top,tools,sb,$('#mBar'),$('#proj')])if(vis(e))K.push(R4(e.getBoundingClientRect()));
  let ar=a&&a.isConnected?R4(a.getBoundingClientRect()):null;if(ar)K.push(ar);
  let pr=null;if(P){pr=R4(P.getBoundingClientRect());const sl=P.querySelector('.pSumL,.pFB'),bb=[...P.querySelectorAll('.pBB')].find(vis);K.push({...pr,bottom:sl&&vis(sl)?sl.getBoundingClientRect().bottom+2:pr.top+60});if(bb)K.push({...pr,top:bb.getBoundingClientRect().top-2})}
  // the dialog/sheet a control sits in (e.g. the Fail sheet) is a keep-out for its header; the control itself always is
  const acx=ar?ar.left+ar.width/2:VW/2,acy=ar?ar.top+ar.height/2:VH/2;
  const tryAt=(side,rows)=>{const up=Math.min(cur,rows),dn=Math.min(n-1-cur,rows),hU=up?Math.abs(proj(-up-.5))+6:SLH/2,hD=dn?Math.abs(proj(dn+.5))+6:SLH/2;let w=W0,x,y;
   if(side==='left'||side==='right'){const edgeL=pr?pr.left:ar?ar.left:VW/2,edgeR=pr?pr.right:ar?ar.right:VW/2,room=side==='left'?edgeL-14-m:VW-m-edgeR-14;if(room<W0)return null;w=W0;
    x=side==='left'?edgeL-14-w:edgeR+14;y=Math.max(lo+hU,Math.min(hi-hD,acy));if(y-hU<lo-.5||y+hD>hi+.5)return null}
   else{x=Math.max(m+2,Math.min(VW-m-3-w,acx-w/2));if(side==='above'){y=(ar?ar.top:VH/2)-g-pt-hD}else{y=(ar?ar.bottom:VH/2)+g+pt+hU}y=Math.min(y,hi-hD);y=Math.max(y,lo+hU);
    if(side==='above'&&ar&&y+hD>ar.top-g)return null;if(side==='below'&&ar&&y-hU<ar.bottom+g)return null}
   const r={left:x,right:x+w,top:y-hU,bottom:y+hD};if(r.top<lo-.5||r.bottom>hi+.5||r.left<m-.5||r.right>VW-m-3+.5)return null;if(K.some(k=>hit(r,k))||XK.some(k=>hit(r,k)))return null;return{side,rows,x,y,w,hU,hD,r}};let XK=[];
  const inSt=a&&a.closest&&a.closest('#stage');let order=P?['left','right','below','above']:inSt?(acx>VW/2?['left','right','above','below']:['right','left','above','below']):(()=>{const o=[];if(ar){if(acy>VH*.5)o.push('above','below');else o.push('below','above');if(acx>VW/2)o.push('left','right');else o.push('right','left')}else o.push('below','above');return o})();
  // bpm-v108: wheels opened from the plan (e.g. Delete) avoid covering nearby pins when there is room; else fall back to the normal rule
  let PK=[];if(inSt){try{const sr=$('#stage').getBoundingClientRect();for(const p of pins){if(p.page!==page)continue;const q=toS(p.x,p.y),h=pinHalf(p)*view.s+4,x=sr.left+q.x,y=sr.top+q.y;if(x<-h||y<-h||x>VW+h||y>VH+h)continue;PK.push({left:x-h,right:x+h,top:y-h,bottom:y+h})}}catch{}}
  let best=null;for(const pk of PK.length?[PK,[]]:[[]]){XK=pk;for(const rows of[3,2,1]){for(const sd of order){best=tryAt(sd,rows);if(best)break}if(best)break}if(best)break}XK=[];
  if(!best){const rows=1,hU=Math.abs(proj(-1.5)),hD=hU;best={side:'none',rows,w:W0,x:Math.max(m,Math.min(VW-m-3-W0,acx-W0/2)),y:Math.max(lo+hU,Math.min(hi-hD,acy)),hU,hD}}
  WH.rows=best.rows;WH.hU=best.hU;WH.side=best.side;box.style.width=best.w+'px';box.style.left=best.x+'px';box.style.top=(best.y-best.hU)+'px';
  const win=box.querySelector('.whWin');win.style.height=(best.hU+best.hD)+'px';win.style.perspectiveOrigin=`${WH0ox}px ${best.hU}px`;/* v114: perspective pivots on the label column so every row's label starts at the same x */box.querySelector('.whDrum').style.top=best.hU+'px';box.style.setProperty('--whF',(WH.F||fs)+'px');
  // pointer at the tapped control, on the band edge, ≥14px from the band's ends
  PT.className='whPtr '+best.side;if(!ar||best.side==='none'){PT.hidden=true;return}PT.hidden=false;const y0=best.y-best.hU,y1=best.y+best.hD;
  if(best.side==='left'){Object.assign(PT.style,{left:best.x+best.w-1+'px',top:Math.max(y0+14,Math.min(y1-14,acy))-8+'px'})}
  else if(best.side==='right'){Object.assign(PT.style,{left:best.x-15+'px',top:Math.max(y0+14,Math.min(y1-14,acy))-8+'px'})}
  else if(best.side==='above'){Object.assign(PT.style,{left:Math.max(best.x+16,Math.min(best.x+best.w-16,acx))-8+'px',top:y1+'px'})}
  else Object.assign(PT.style,{left:Math.max(best.x+16,Math.min(best.x+best.w-16,acx))-8+'px',top:y0-8+'px'})}
 window.wheelAnchor=a=>{LASTA=a};
 function paint(){const d=W.querySelector('.whDrum'),p=WH.pos,c=Math.round(p),F=parseFloat(W.querySelector('.whBox').style.getPropertyValue('--whF'))||16,lim=WH.rows+.5;d.style.transform='';
  d.querySelectorAll('.whS,.whI').forEach(e=>{const i=+e.dataset.i,dd=i-p,an=dd*ST,on=Math.abs(dd)<=lim,tf=`translateZ(-${R}px) rotateX(${-an}deg) translateZ(${R+(e.classList.contains('whI')?1.5:0)}px)`;e.style.transform=tf;e.style.visibility=on?'':'hidden';
   const op=Math.max(0,1-Math.abs(an)/105);if(e.classList.contains('whS')){e.classList.toggle('cen',i===c);e.style.background=i===c?'':`rgba(15,23,42,${Math.min(.97,.25*op+.8).toFixed(2)})`}
   else{e.style.opacity=Math.max(.15,op).toFixed(2);e.style.fontSize=Math.max(11,F-Math.abs(an)/10)+'px';e.classList.toggle('cen',i===c)}});
  if(c!==WH.lastI){if(WH.lastI>=0&&navigator.vibrate)try{navigator.vibrate(5)}catch{}WH.lastI=c}}
 const clampP=p=>Math.max(0,Math.min(WH.items.length-1,p));
 /* bpm-v121: iPhone-style picker for EVERY wheel (touch, pen and mouse share one engine).
  - Drag: the content follows the pointer 1:1 on the curve (the row under the finger stays under it). Replaces the v115 press-and-slide/edge-hold and the v116 reversal.
  - Release: velocity over the last 80 ms; a paused pointer (no motion in the last 80 ms) does not coast. Coast <= 4 rows, then an ease-out settle onto the centre row (~0.25 s).
  - After a drag/flick the row that settles in the centre is picked (Cancel rows cancel). A tap (<8 px) on any visible row picks it (an off-centre row rolls to the centre first).
  - Destructive wheels (Clear pins / Clear markups / Delete pins): settling or tapping only highlights the row with "Tap again to confirm"; tapping the highlighted row confirms.
  - Mouse wheel: one row per notch, natural direction (scroll down = later row). Keys: arrows step, Enter picks the centre row, Escape closes; a tap outside closes. */
 const DESTR=()=>WH&&/^(clear (pins|markups)|delete pins)$/i.test((W.querySelector('.whT').textContent||'').trim());
 const win=W.querySelector('.whWin');
 // inverse of proj(): screen y offset from the centre line -> row offset (curve + perspective); linear beyond +-3.4 rows
 /* bpm-v129: the curve peaks at ~3.3 rows, so the old edge slope at 3.4 rows was NEGATIVE (-0.78 px/row): a finger past the drum's edge ran the wheel backwards at ~1.3 rows per px (spun round, jumped to the far end).
  Now the curve is used only where it rises (|rows|<=2.6) and past it the wheel keeps moving the same way at one row per IH px, so dragging outside the wheel scrolls smoothly and clamps at the ends. */
 const PI_={};const projInv=dy=>{const L=2.6,yL=proj(L),k=IH;if(dy>yL)return L+(dy-yL)/k;if(dy<-yL)return -L+(dy+yL)/k;let lo=-L,hi=L;for(let j=0;j<30;j++){const m=(lo+hi)/2;if(proj(m)<dy)lo=m;else hi=m}return (lo+hi)/2};
 const cy=()=>win.getBoundingClientRect().top+(WH.hU||win.getBoundingClientRect().height/2);
 const CF=W.querySelector('.whBox').appendChild(ce('div','whCf'));CF.setAttribute('role','status');CF.setAttribute('aria-live','polite');CF.hidden=true;
 // bpm-v125: keep "Tap again to confirm" off the top bar and the floating Delete button. Prefer above the wheel; drop below (or slide sideways) when that spot is taken.
 function cfBox(el){if(!el||el.hidden)return null;const st=getComputedStyle(el);if(st.display==='none'||st.visibility==='hidden'||Number(st.opacity)===0)return null;const r=el.getBoundingClientRect();return r.width>2&&r.height>2?r:null}
 function placeCf(){if(!WH||CF.hidden||!W.querySelector('.whBox'))return;const box=W.querySelector('.whBox'),br=box.getBoundingClientRect(),obs=[];
  for(const id of['proj','top','tools','thumbs','pinDelF','walk','panel','lyrP']){const r=cfBox(document.getElementById(id));if(r)obs.push(r)}
  const hit=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
  const bad=r=>r.top<8||r.bottom>innerHeight-8||r.left<8||r.right>innerWidth-8||obs.some(o=>hit(r,{left:o.left-4,right:o.right+4,top:o.top-4,bottom:o.bottom+4}));
  CF.classList.remove('below');CF.style.top=CF.style.bottom=CF.style.left=CF.style.right=CF.style.margin='';
  let pr=CF.getBoundingClientRect();if(!bad(pr))return;
  CF.classList.add('below');pr=CF.getBoundingClientRect();if(!bad(pr))return;
  const w=pr.width||160,h=pr.height||28,base=br.left+(br.width-w)/2;
  const tops=[[br.bottom+6,true],[br.top-6-h,false]];
  for(const[top,below]of tops)for(const left0 of[base,8,innerWidth-8-w,br.right-w,br.left]){const left=Math.max(8,Math.min(innerWidth-8-w,left0)),r={left,right:left+w,top,bottom:top+h};if(bad(r))continue;
   CF.classList.toggle('below',below);CF.style.top=(r.top-br.top)+'px';CF.style.bottom='auto';CF.style.left=(r.left-br.left)+'px';CF.style.right='auto';CF.style.margin='0';return}}
 const setPend=i=>{WH.pend=i;W.querySelectorAll('.whS.hov').forEach(e=>e.classList.remove('hov'));if(i==null){CF.hidden=true;CF.classList.remove('below');CF.style.top=CF.style.bottom=CF.style.left=CF.style.right=CF.style.margin=CF.style.visibility='';return}const s_=W.querySelector(`.whS[data-i="${i}"]`);if(s_)s_.classList.add('hov');CF.textContent='Tap again to confirm';CF.style.visibility='hidden';CF.hidden=false;requestAnimationFrame(()=>{try{placeCf()}catch(e){console.warn('pill',e)}CF.style.visibility=''})};
 function anim(to,D,done){cancelAnimationFrame(WH.raf);const p0=WH.pos,t0=performance.now();to=clampP(to);if(Math.abs(to-p0)<.002){WH.pos=to;paint();done&&done();return}
  const step=n=>{const k=Math.min(1,(n-t0)/D),e=1-Math.pow(1-k,3);WH.pos=p0+(to-p0)*e;paint();if(k<1)WH.raf=requestAnimationFrame(step);else{WH.pos=to;paint();WH.raf=0;done&&done()}};WH.raf=requestAnimationFrame(step)}
 const isCancel=i=>{const it=WH.items[i];const t=(it&&(it.l||String(it.html||'').replace(/<[^>]*>/g,'')))||'';return /^\W*cancel\b/i.test(t.trim())};
 // pick row i (after a settle or a tap); destructive rows need a second tap on the highlighted row
 function pickAt(i,confirmTap){if(!WH)return;WH.pos=i;paint();if(DESTR()&&!isCancel(i)){if(confirmTap&&WH.pend===i){setPend(null);choose();return}setPend(i);return}setPend(null);choose()}
 let dr=null;
 win.addEventListener('pointerdown',e=>{if(!WH||W.hidden)return;if(e.button>0)return;e.preventDefault();try{win.setPointerCapture(e.pointerId)}catch{}const wasMoving=!!WH.raf;cancelAnimationFrame(WH.raf);WH.raf=0;
  const u=projInv(e.clientY-cy()),n=performance.now();dr={id:e.pointerId,x0:e.clientX,y0:e.clientY,p0:WH.pos,u0:u,moved:0,S:[[n,WH.pos]],wasMoving}});
 win.addEventListener('pointermove',e=>{if(!dr||e.pointerId!==dr.id)return;dr.moved=Math.max(dr.moved,Math.hypot(e.clientX-dr.x0,e.clientY-dr.y0));if(dr.moved<4&&!dr.drag)return;dr.drag=1;
  const p=clampP(dr.p0+dr.u0-projInv(e.clientY-cy()));if(WH.pend!=null&&Math.round(p)!==WH.pend)setPend(null);WH.pos=p;const n=performance.now();dr.S.push([n,p]);while(dr.S.length>2&&n-dr.S[0][0]>80)dr.S.shift();paint()});
 const endP=e=>{if(!dr||e.pointerId!==dr.id)return;const d=dr;dr=null;if(e.type==='pointercancel'){anim(Math.round(WH.pos),250);return}
  if(d.moved<8){/* tap: the visible row under the pointer is picked with one tap */const r=win.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right){anim(Math.round(WH.pos),200);return}
   const i=Math.round(d.p0+d.u0);if(d.wasMoving&&Math.abs(i-d.p0)>.5){/* tap during a coast just stops it */anim(Math.round(WH.pos),200);return}
   if(i<0||i>WH.items.length-1||Math.abs(i-WH.pos)>(WH.rows||3)+.5){anim(Math.round(WH.pos),200);return}
   if(Math.abs(i-WH.pos)<.5)return pickAt(i,true);anim(i,180,()=>pickAt(i,false));return}
  const n=performance.now(),S=d.S,a=S[0],b=S[S.length-1];let v=0;/* rows per ms; 0 if the pointer paused */if(n-b[0]<=80&&b[0]-a[0]>8)v=(b[1]-a[1])/(b[0]-a[0]);if(Math.abs(v)<.0006)v=0;
  const dist=Math.max(-4,Math.min(4,v*300)),to=clampP(Math.round(WH.pos+dist)),D=v?Math.max(220,Math.min(450,3*Math.abs(to-WH.pos)/Math.abs(v))):250;
  anim(to,D,()=>pickAt(to,false))};
 win.addEventListener('pointerup',endP);win.addEventListener('pointercancel',endP);
 // mouse wheel / trackpad: one row per notch (or per 40 px of trackpad travel), natural direction; no auto-pick
 let wAcc=0,wTo=null;win.addEventListener('wheel',e=>{e.preventDefault();if(!WH)return;const dy=e.deltaMode===1?e.deltaY*40:e.deltaMode===2?e.deltaY*400:e.deltaY;let st=0;
  if(Math.abs(dy)>=40){st=Math.sign(dy);wAcc=0}else{wAcc+=dy;if(Math.abs(wAcc)>=40){st=Math.sign(wAcc);wAcc=0}}if(!st)return;
  const base=WH.raf&&wTo!=null?wTo:Math.round(WH.pos);wTo=clampP(base+st);if(WH.pend!=null&&wTo!==WH.pend)setPend(null);anim(wTo,160,()=>{wTo=null})},{passive:false});
 const close=()=>{W.classList.remove('in');if(PRESS){PRESS.classList.remove('whPressed');PRESS=null}if(WH){cancelAnimationFrame(WH.raf);WH.raf=0;setPend(null)}dr=null;setTimeout(()=>W.hidden=true,150)};function choose(){const i=Math.round(WH.pos),cb=WH.cb;close();cb(WH.items[i],i)}
 W.querySelector('[data-w=x]').onclick=close;W.querySelector('[data-w=ok]').onclick=()=>pickAt(Math.round(WH.pos),true);W.addEventListener('click',e=>{if(e.target===W)close()});
 document.addEventListener('keydown',e=>{if(W.hidden||!WH)return;if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='Enter'){e.preventDefault();pickAt(Math.round(WH.pos),true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();WH.pos=clampP(Math.round(WH.pos)+(e.key==='ArrowDown'?1:-1));if(WH.pend!=null&&WH.pos!==WH.pend)setPend(null);paint()}});
 window.wheelOpen=wheelOpen;window.wheelPos=()=>WH&&WH.pos;
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
  b.onclick=()=>widthSheet(show);b._show=show;show();$('#color').addEventListener('input',show);$('#color').addEventListener('change',show);$('#size').addEventListener('change',show);return b}
 function widthSheet(show){let d=$('#widDlg');if(!d){d=ce('dialog');d.id='widDlg';document.body.append(d)}const i0=+$('#size').value||0,c=$('#color').value,op=+$('#opac').value||100,mag=$('#mkSnap').classList.contains('on');
  d.innerHTML=`<div class="cHead"><b>Line width</b><span class="sp"></span><button type="button" class="btn" id="wX">✕<span class="tl">Close</span></button></div><div class="wList" role="radiogroup" aria-label="Line width">${SZ.map((w,i)=>`<button type="button" role="radio" aria-checked="${i===i0}" class="wOpt${i===i0?' on':''}" data-i="${i}"><svg width="120" height="24" viewBox="0 0 120 24" aria-hidden="true"><line x1="8" y1="12" x2="112" y2="12" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/></svg><span class="wL">${WN[i]}</span><small>${w} px</small><b class="wCk">${i===i0?'✓':''}</b></button>`).join('')}</div>
   <small class="wNote">Text markups use the same choice as font size (${SZT.join(' / ')} px).</small>
   <h4>Line style</h4><div class="wOp" id="wLs" role="radiogroup" aria-label="Line style">${[['solid','Solid'],['dash','Dashed'],['dot','Dotted']].map(([k,l])=>`<button type="button" role="radio" aria-checked="${(window.lineStyle?lineStyle():'solid')===k}" class="btn${(window.lineStyle?lineStyle():'solid')===k?' on':''}" data-ls="${k}"><svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true"><line x1="3" y1="5" x2="31" y2="5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="${k==='dash'?'7 5':k==='dot'?'0.1 6':'none'}"/></svg> ${l}</button>`).join('')}</div><small class="wNote">Applies to new markups and to the selected ones.</small>
   <h4>Opacity</h4><div class="wOp">${[25,50,75,100].map(o=>`<button type="button" class="btn${o===op?' on':''}" data-o="${o}">${o}%</button>`).join('')}</div>
   <h4>Magnet snap</h4><button type="button" class="btn${mag?' on':''}" id="wMag">🧲<span class="tl">Magnet ${mag?'on (tap to turn off)':'off (tap to turn on)'}</span></button>`;
  d.querySelectorAll('.wOpt').forEach(x=>x.onclick=()=>{$('#size').value=x.dataset.i;$('#size').dispatchEvent(new Event('change',{bubbles:true}));show();d.close()});
  d.querySelectorAll('[data-o]').forEach(x=>x.onclick=()=>{const o=+x.dataset.o;$('#opac').value=o;$('#opac').dispatchEvent(new Event('input',{bubbles:true}));$('#opac').dispatchEvent(new Event('change',{bubbles:true}));widthSheet(show)});
  d.querySelectorAll('[data-ls]').forEach(x=>x.onclick=async()=>{if(window.setLineStyle)await setLineStyle(x.dataset.ls);widthSheet(show)});
  d.querySelector('#wMag').onclick=()=>{$('#mkSnap').click();widthSheet(show)};d.querySelector('#wX').onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close()};if(!d.open)d.showModal()}
 window.widthSheet=()=>widthSheet(B.width._show);document.addEventListener('pointerup',()=>setTimeout(()=>B.width&&B.width._show(),0),true);
 const pinT=()=>Object.entries(TYPES).map(([k,v])=>({k,i:`<span class="tbDot" style="background:${v.c}"></span>`,l:v.n,run:()=>{$('#pinType').value=k;$('#pinType').dispatchEvent(new Event('change',{bubbles:true}));tb('pin').click()}}));
 const more=()=>[{k:'fit',i:'⤢',l:'Fit to screen',run:()=>$('#fit').click()},{k:'del',i:'🗑',l:'Delete selected',run:()=>$('#del').click()},{k:'mag',i:'🧲',l:'Magnet snap '+($('#mkSnap').classList.contains('on')?'(on)':'(off)'),run:()=>$('#mkSnap').click()},{k:'cz',i:'⚙',l:'Customize toolbar',run:()=>openCz()}];
 const share=()=>[{k:'split',i:'⇆',l:'Split for 2nd tech',run:()=>$('#splitBtn').click()},{k:'merge',i:'⇄',l:'Merge returned file',run:()=>$('#mergeBtn').click()}];
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
