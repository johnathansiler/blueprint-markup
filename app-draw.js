'use strict';
// bpm-v135: drawing, hit testing, input, undo/redo (split out of app.js; classic script sharing app.js globals, loaded right after the file before it)
// ---------- drawing ----------
function cloudPath(c,x1,y1,x2,y2,s){const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.abs(x2-x1),h=Math.abs(y2-y1);const r=Math.max(6/s,Math.min(w,h)/8,1);const pts=[];
 const seg=(ax,ay,bx,by)=>{const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.round(L/(2*r)));for(let i=0;i<n;i++)pts.push([ax+(bx-ax)*i/n,ay+(by-ay)*i/n])};
 seg(x,y,x+w,y);seg(x+w,y,x+w,y+h);seg(x+w,y+h,x,y+h);seg(x,y+h,x,y);c.beginPath();
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,rr=Math.hypot(b[0]-a[0],b[1]-a[1])/2,ang=Math.atan2(b[1]-a[1],b[0]-a[0]);c.moveTo(a[0],a[1]);c.arc(mx,my,rr,ang+Math.PI,ang,false)}c.stroke()}
// v16: markups live in plan space (fixed size relative to the blueprint), same scale as exports
const MK_S=1/1.5;
function drawMarkup(c,m,s){s=MK_S;c.save();c.globalAlpha=opOf(m,false);c.strokeStyle=m.color;c.lineWidth=(m.w||3)/s;c.lineJoin=c.lineCap='round';const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);
 if(m.type==='rect')c.strokeRect(x,y,w,h);
 else if(m.type==='ellipse'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2||.1,h/2||.1,0,0,7);c.stroke()}
 else if(m.type==='check'){c.lineWidth=Math.max(c.lineWidth,Math.min(w,h)/8);c.beginPath();c.moveTo(x,y+h*.55);c.lineTo(x+w*.38,y+h);c.lineTo(x+w,y);c.stroke()}
 else if(m.type==='cloud')cloudPath(c,m.x1,m.y1,m.x2,m.y2,s);
 else if(m.type==='arrow'||m.type==='line'){c.beginPath();c.moveTo(m.x1,m.y1);c.lineTo(m.x2,m.y2);c.stroke();if(m.type==='arrow'){const a=Math.atan2(m.y2-m.y1,m.x2-m.x1),L=Math.max(c.lineWidth*4,12/s);c.beginPath();c.moveTo(m.x2-L*Math.cos(a-.45),m.y2-L*Math.sin(a-.45));c.lineTo(m.x2,m.y2);c.lineTo(m.x2-L*Math.cos(a+.45),m.y2-L*Math.sin(a+.45));c.stroke()}}
 else if(m.type==='zig'||m.type==='zarrow'){const P=zPts(m);if(P.length>1){c.lineJoin='miter';c.miterLimit=10;c.beginPath();P.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();if(m.type==='zarrow'){const[ax,ay]=P[P.length-2],[bx,by]=P[P.length-1],a=Math.atan2(by-ay,bx-ax),L=Math.max(c.lineWidth*4,12/s);c.lineJoin='round';c.beginPath();c.moveTo(bx-L*Math.cos(a-.45),by-L*Math.sin(a-.45));c.lineTo(bx,by);c.lineTo(bx-L*Math.cos(a+.45),by-L*Math.sin(a+.45));c.stroke()}}}
 else if(m.type==='dim'||m.type==='cal'||m.type==='darea'||m.type==='dpath')drawMeasure(c,m,s);
 else if(m.type==='text'){c.font=`bold ${m.fs}px sans-serif`;c.textBaseline='top';c.textAlign='left';c.lineWidth=m.fs/5;c.strokeStyle='#fff';c.strokeText(m.text,m.x1,m.y1);c.fillStyle=m.color;c.fillText(m.text,m.x1,m.y1)}c.restore()}
// bpm-v54/v56: zigzag polyline (zig); zarrow kept for legacy files (still render+select, no toolbar button); points relative to x1,y1 so move works
const ZT=['zig','zarrow'],zPts=m=>(m.rp||[]).map(([dx,dy])=>[m.x1+dx,m.y1+dy]);
function zFinish(m,P){const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);m.x1=Math.min(...xs);m.y1=Math.min(...ys);m.x2=Math.max(...xs);m.y2=Math.max(...ys);m.rp=P.map(([x,y])=>[x-m.x1,y-m.y1]);return m}
const isLine=m=>m.type==='arrow'||m.type==='line'||m.type==='dim'||m.type==='cal';
function textBox(m){octx.save();octx.font=`bold ${m.fs}px sans-serif`;const w=octx.measureText(m.text).width;octx.restore();m.x2=m.x1+w;m.y2=m.y1+m.fs*1.15;return m}
// bpm-v103: edit-mode friction. A tap only selects; handles and drag-move need Edit (selection bar) or a freshly drawn item.
let EDIT=null;function edOn(o){return !!(o&&EDIT&&(EDIT===o.id||(EDIT==='multi'&&msel.includes(o))))}function setEdit(v){EDIT=v;renderSelBar();requestDraw(false)}
function handles(m){if(m.type==='dpath'||ZT.includes(m.type))return[];if(isLine(m))return[[m.x1,m.y1],[m.x2,m.y2]];const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),X=Math.max(m.x1,m.x2),Y=Math.max(m.y1,m.y2);return[[x,y],[X,y],[X,Y],[x,Y]]}
function handleHit(m,sx,sy){const hs=handles(m),rad=Math.max(8*view.s,18);for(let i=hs.length-1;i>=0;i--){const q=toS(hs[i][0],hs[i][1]);if(Math.hypot(q.x-sx,q.y-sy)<rad)return i}return -1}
function resizeTo(m,o,h,w){if(isLine(m)){if(h===0){m.x1=w.x;m.y1=w.y}else{m.x2=w.x;m.y2=w.y}return}
 const x0=Math.min(o.x1,o.x2),y0=Math.min(o.y1,o.y2),X0=Math.max(o.x1,o.x2),Y0=Math.max(o.y1,o.y2),L=h===0||h===3,T=h===0||h===1;
 if(m.type==='text'){const nh=Math.max(6/view.s,T?Y0-w.y:w.y-y0);m.fs=o.fs*nh/((Y0-y0)||1);const tw=textBox({...m,x1:0,y1:0}).x2;Object.assign(m,{x1:L?X0-tw:x0,y1:T?Y0-m.fs*1.15:y0});textBox(m);return}
 let x=L?w.x:x0,X=L?X0:w.x,y=T?w.y:y0,Y=T?Y0:w.y;m.x1=Math.min(x,X);m.x2=Math.max(x,X);m.y1=Math.min(y,Y);m.y2=Math.max(y,Y)}
let CR=0;function drawPin(c,p,s,hl,bare,nolab){const T=TYPES[p.type]||TYPES.other,r=pinR();c.save();if(!bare)c.globalAlpha=opOf(p,true);const oo=!bare&&OFFMAP&&OFFMAP.get(p.id);if(oo)drawLeader(c,p.x,p.y,p.x+oo.dx,p.y+oo.dy,T.c);c.translate(p.x+(oo?oo.dx:0),p.y+(oo?oo.dy:0));if(CR)c.rotate(-CR);if(isFinite(p.ang)&&p.ang)c.rotate(p.ang);
 // s is kept for call-site compat; pin geometry is in plan points so it scales with view
 const sc=ST[p.status]||ST['not tested'];if(hl&&!bare){c.beginPath();c.arc(0,0,pinHalf(p)+5,0,7);c.fillStyle='rgba(56,189,248,.35)';c.fill()}
 c.fillStyle=T.c;c.strokeStyle=bare?'#fff':sc;c.lineWidth=bare?2:pinLW(p);pinFS(c,p);// bpm-v37: path=print size → gray outer = print+LW/2; bpm-v24+: shape+color only

 if(bare){c.restore();return}c.fillStyle=sc;c.strokeStyle='#fff';c.lineWidth=1.2;c.beginPath();{const[,pw,ph]=pshOf(p);c.arc(pw/2,-ph/2,2.5,0,7)}c.fill();c.stroke();
 if(p.address&&!nolab&&(!oo||!oo.cl||hl||view.s>=2.5)){c.globalAlpha=1;c.font=`10px sans-serif`;c.textAlign='left';c.lineWidth=2.5;c.lineJoin='round';c.strokeStyle='#fff';{const ax=pshOf(p)[1]/2+3;c.strokeText(p.address,ax,3);c.fillStyle='#111';c.fillText(p.address,ax,3)}}c.restore()}
function setT(c){const d=dpr(),s=view.s*d,e=view.x*d,f=view.y*d;
 if(VR===90)c.setTransform(0,s,-s,0,s*pageH+e,f);else if(VR===180)c.setTransform(-s,0,0,-s,s*pageW+e,s*pageH+f);else if(VR===270)c.setTransform(0,-s,s,0,e,s*pageW+f);else c.setTransform(s,0,0,s,e,f)}
function drawBase(){drawn={...view};cv.style.transform=ov.style.transform='';ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);if(!plan||!pageW)return;setT(ctx);
 ctx.fillStyle='#fff';ctx.fillRect(0,0,pageW,pageH);ctx.imageSmoothingQuality='high';if(bmp)ctx.drawImage(bmp,0,0,pageW,pageH);if(baseBm)ctx.drawImage(baseBm.c,0,0,pageW,pageH);if(tile)ctx.drawImage(tile.c,tile.x,tile.y,tile.c.width/tile.s,tile.c.height/tile.s)}
function drawOverlay(){CR=VR*Math.PI/180;try{drawOverlay0()}finally{CR=0}tedPos()}
function drawOverlay0(){const ctx=octx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ov.width,ov.height);if(!plan||!pageW)return;setT(ctx);
 for(const m of markups)if(m.page===page&&mVis(m)&&m.id!==ted?.id)drawMarkup(ctx,m,view.s);if(draft)drawMarkup(ctx,draft,view.s);
 if(sel&&sel.kind==='m'){const m=sel.o;ctx.save();ctx.setLineDash([6/view.s,4/view.s]);ctx.strokeStyle='#2563eb';ctx.lineWidth=1.5/view.s;const p=8/view.s;if(!isLine(m))ctx.strokeRect(Math.min(m.x1,m.x2)-p,Math.min(m.y1,m.y2)-p,Math.abs(m.x2-m.x1)+2*p,Math.abs(m.y2-m.y1)+2*p);
  ctx.setLineDash([]);ctx.fillStyle='#fff';ctx.lineWidth=2;if(edOn(m))for(const[hx,hy]of handles(m)){ctx.beginPath();ctx.arc(hx,hy,6,0,7);ctx.fill();ctx.stroke()}ctx.restore()}
 OFFMAP=SCRNOFF=pinOffsets([...pins.filter(p=>p.page===page&&pVis(p)&&tVis(p)),...(lay.ghosts?ghosts.filter(g=>g.page===page):[])]);for(const p of pins)if(p.page===page&&pVis(p)&&tVis(p))drawPinL(ctx,p,view.s,(sel&&sel.o===p||msel.includes(p))&&!(walk?.p&&walk.p.id===p.id));drawMsel(ctx);if(lay.ghosts)drawGhosts(ctx);OFFMAP=null;/* bpm-v103: no walk ring; the blink marks the current pin */}
function draw(){drawBase();drawOverlay();updZoom()}
// during pan/pinch/wheel move the already-drawn canvases with a cheap CSS transform; repaint once the gesture pauses (150ms) or on release
let drawn=null,gTimer=0;function fastView(){if(drawn){const k=view.s/drawn.s,t=`translate(${view.x-drawn.x*k}px,${view.y-drawn.y*k}px) scale(${k})`;cv.style.transform=ov.style.transform=t}updZoom();clearTimeout(gTimer);gTimer=setTimeout(()=>{gTimer=0;requestDraw()},150);scheduleRender()}
let raf=0,rafB=0;function requestDraw(b=true){if(b)rafB=1;if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(rafB)drawBase();drawOverlay();rafB=0})}
// ---------- hit testing ----------
function hit(w){const tol=10/view.s,pr=Math.max(pinR()*1.4,16/view.s);for(const p of[...pins].reverse()){if(p.page!==page||!pVis(p)||!tVis(p))continue;const o=SCRNOFF&&SCRNOFF.get(p.id);if(o&&Math.hypot(p.x+o.dx-w.x,p.y+o.dy-w.y)<pr)return{kind:'p',o:p}}
 for(const p of[...pins].reverse())if(p.page===page&&pVis(p)&&tVis(p)&&Math.hypot(p.x-w.x,p.y-w.y)<pr*(SCRNOFF&&SCRNOFF.get(p.id)?.6:1))return{kind:'p',o:p};
 for(const m of[...markups].reverse()){if(m.page!==page||!mVis(m))continue;if(ZT.includes(m.type)){const P=zPts(m);for(let i=1;i<P.length;i++){const[ax,ay]=P[i-1],dx=P[i][0]-ax,dy=P[i][1]-ay,t=Math.max(0,Math.min(1,((w.x-ax)*dx+(w.y-ay)*dy)/((dx*dx+dy*dy)||1)));if(Math.hypot(ax+t*dx-w.x,ay+t*dy-w.y)<tol*1.4)return{kind:'m',o:m}}continue}if(isLine(m)){const dx=m.x2-m.x1,dy=m.y2-m.y1,t=Math.max(0,Math.min(1,((w.x-m.x1)*dx+(w.y-m.y1)*dy)/((dx*dx+dy*dy)||1)));if(Math.hypot(m.x1+t*dx-w.x,m.y1+t*dy-w.y)<tol*1.4)return{kind:'m',o:m};continue}const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),X=Math.max(m.x1,m.x2),Y=Math.max(m.y1,m.y2);if(w.x>x-tol&&w.x<X+tol&&w.y>y-tol&&w.y<Y+tol)return{kind:'m',o:m}}return null}
// ---------- input ----------
const ptrs=new Map();let gesture=null;
// bpm-v71: free draw by default; constrain (15° lines/arrows/zigzag, equal-ratio shapes) while the Snap toggle is on or Shift is held (v55 hold-tool-button removed)
let snapOn=false,shiftDn=false,lastTap=null;const snapK=()=>snapOn||shiftDn;
addEventListener('keydown',e=>{if(e.key==='Shift')shiftDn=true});addEventListener('keyup',e=>{if(e.key==='Shift')shiftDn=false});addEventListener('blur',()=>shiftDn=false);
function constrainPt(d,w){const dx=w.x-d.x1,dy=w.y-d.y1;if(d.type==='line'||d.type==='arrow'||d.type==='dim'){const L=Math.hypot(dx,dy),a=Math.round(Math.atan2(dy,dx)/(Math.PI/12))*(Math.PI/12);return{x:d.x1+L*Math.cos(a),y:d.y1+L*Math.sin(a)}}if(['rect','ellipse','cloud','check'].includes(d.type)){const m=Math.max(Math.abs(dx),Math.abs(dy));return{x:d.x1+(dx<0?-m:m),y:d.y1+(dy<0?-m:m)}}return w}
(function(){const b=$('#cSnap');if(!b)return;const sync=()=>{b.classList.toggle('on',snapOn);b.setAttribute('aria-pressed',snapOn?'true':'false');b.title=snapOn?'Snap ON: 15° lines/arrows/zigzag, equal-ratio shapes — tap to turn off':'Snap off (freeform) — tap for 15° angles / equal ratios (or hold Shift)'};sync();b.onclick=()=>{snapOn=!snapOn;sync()}})();
stage.addEventListener('pointerdown',e=>{if(!plan||e.target!==cv)return;stage.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
 if(ptrs.size===2){draft=null;const[a,b]=[...ptrs.values()];gesture={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}};return}
 const w=toW(e.offsetX,e.offsetY);const start={sx:e.offsetX,sy:e.offsetY,moved:false};
 if(tool==='pan'||tool==='stamp'||e.button===1){gesture={type:'pan',...start,v:{...view}};return}
 if(tool==='select'){if(sel?.kind==='m'&&edOn(sel.o)){const hi=handleHit(sel.o,e.offsetX,e.offsetY);if(hi>=0){gesture={type:'resize',h:hi,...start,orig:structuredClone(sel.o)};return}}
  if(deselOn){gesture={type:'box',des:1,...start,moved:false,w0:w,w1:w};showBox();return} // bpm-v100: Deselect box starts anywhere (never drags a pin)
  {const h0=hit(w),onP=msel.filter(o=>o.page===page);if(h0&&msel.includes(h0.o)){sel=null;gesture={type:EDIT==='multi'?'mmove':'mtap0',...start,v:{...view},items:onP,orig:onP.map(o=>structuredClone(o)),tapO:h0.o};return}
   if(!h0&&boxOn){gesture={type:'box',...start,moved:false,w0:w,w1:w};showBox();return}
   if(multiOn){gesture=h0?{type:'mtap',...start,v:{...view},o:h0.o}:{type:'pan',...start,v:{...view}};return}}
  const prev=sel?.o;sel=hit(w);if(!sel||(sel.o!==prev&&!edOn(sel.o)))EDIT=null;if(sel&&!edOn(sel.o)){gesture={type:'pan',...start,v:{...view},selTap:sel.o,wasSel:prev===sel.o}}else if(sel)gesture={type:'move',...start,w,orig:JSON.parse(JSON.stringify(sel.o)),wasSel:prev===sel.o};else gesture={type:'pan',...start,v:{...view}};requestDraw(false);renderSelBar();
  const G0=gesture,hitO=sel?.o;clearTimeout(lpT);lpT=setTimeout(()=>{if(gesture!==G0||G0.moved||ptrs.size!==1)return;if(hitO){gesture=null;toggleMsel(hitO);if(navigator.vibrate)navigator.vibrate(20)}else{gesture={type:'box',...start,moved:false,w0:w,w1:w};showBox()}},450);return}
 if(tool==='pin'){gesture={type:'pin',...start,w};return}
 if(tool==='text'){gesture={type:'text',...start,w};return}
 if(tool==='measure'){if(MS.mode==='path'&&!MS.cal){gesture={type:'mpath',...start,w,v:{...view}};return}const p0=mSnap(w);draft={id:uid(),planId:plan.id,page,type:MS.cal?'cal':MS.mode==='area'?'darea':'dim',x1:p0.x,y1:p0.y,x2:p0.x,y2:p0.y,color:MS.cal?'#0ea5e9':$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};gesture={type:'draw',...start};mRead();return}
 if(tool==='zig'){const p=mkSnap(w);draft={id:uid(),planId:plan.id,page,type:'zig',x1:p.x,y1:p.y,x2:p.x,y2:p.y,rp:[[0,0],[0,0]],color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};gesture={type:'zig',...start,V:[[p.x,p.y]],R:[[p.x,p.y]]};return}
 {let p=w;if(['rect','ellipse','cloud','arrow','line','check'].includes(tool))p=mkSnap(w);draft={id:uid(),planId:plan.id,page,type:tool,x1:p.x,y1:p.y,x2:p.x,y2:p.y,color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};gesture={type:'draw',...start}}});
stage.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(!gesture)return;
 if(gesture.type==='pinch'&&ptrs.size>=2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=gesture,s=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s,x:c.x-wx*s,y:c.y-wy*s};fastView();return}
 const dx=e.offsetX-gesture.sx,dy=e.offsetY-gesture.sy;if(Math.hypot(dx,dy)>4)gesture.moved=true;
 if(gesture.type==='pan'){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;fastView();pfTrack(gesture)}
 else if(gesture.type==='mmove'){const ddx=dx/view.s,ddy=dy/view.s;gesture.items.forEach((o,i)=>{const g=gesture.orig[i];if('x1'in g){o.x1=g.x1+ddx;o.x2=g.x2+ddx;o.y1=g.y1+ddy;o.y2=g.y2+ddy}else{o.x=g.x+ddx;o.y=g.y+ddy}});requestDraw(false)}
 else if(gesture.type==='mtap'||gesture.type==='mtap0'){if(gesture.moved){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;fastView()}}
 else if(gesture.type==='move'){const o=sel.o,g=gesture.orig;let ddx=dx/view.s,ddy=dy/view.s;if(sel.kind==='p'){o.x=g.x+ddx;o.y=g.y+ddy}else{const s=mkSnapMove(g,ddx,ddy,o);ddx=s.ddx;ddy=s.ddy;o.x1=g.x1+ddx;o.x2=g.x2+ddx;o.y1=g.y1+ddy;o.y2=g.y2+ddy}requestDraw(false)}
 else if(gesture.type==='resize'){resizeTo(sel.o,gesture.orig,gesture.h,mkSnap(toW(e.offsetX,e.offsetY),sel.o));requestDraw(false)}
 else if(gesture.type==='draw'){let w=toW(e.offsetX,e.offsetY);if(draft.type==='dim'||draft.type==='cal')w=mSnap(w,draft);else if(['rect','ellipse','cloud','arrow','line','check'].includes(draft.type))w=mkSnap(w,draft);if(snapK())w=constrainPt(draft,w);draft.x2=w.x;draft.y2=w.y;mRead();requestDraw(false)}
 else if(gesture.type==='zig'){zMove(gesture,toW(e.offsetX,e.offsetY));requestDraw(false)}
 else if(gesture.type==='mpath'){if(gesture.moved){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;fastView()}else{MS.hover=toW(e.offsetX,e.offsetY)}}
 else if(gesture.type==='box'){gesture.w1=toW(e.offsetX,e.offsetY);showBox()}});
async function up(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);clearTimeout(lpT);const g=gesture;if(g?.type==='pinch'){if(ptrs.size===0){gesture=null;requestDraw()}return}gesture=null;if(!g)return;if(g.type==='pan'){if(await pfRelease(g))return;requestDraw()}
 const w=toW(e.offsetX,e.offsetY);
 if(!g.moved){const now=Date.now(),T=lastTap;lastTap={t:now,x:e.offsetX,y:e.offsetY};if(T&&now-T.t<350&&Math.hypot(e.offsetX-T.x,e.offsetY-T.y)<30){lastTap=null;draft=null;sel=null;msel=[];renderSelBar();draw();return}}else lastTap=null;
 if(g.type==='box'){boxSelect(g.w0,g.w1,g.des);return}
 if(g.type==='mtap0'){if(!g.moved)toggleMsel(g.tapO);return}
 if(g.type==='mmove'){if(g.moved){const L=g.items.map((o,i)=>({store:'x1'in o?'markups':'pins',id:o.id,before:g.orig[i],after:structuredClone(o)}));await changeMulti(L);toast(`Moved ${L.length} item${L.length>1?'s':''}`,true)}else toggleMsel(g.tapO);return}
 if(g.type==='mtap'){if(!g.moved)toggleMsel(g.o);else requestDraw();return}
 if(pasteArm&&!g.moved&&g.type!=='pinch'){pasteArm=false;draft=null;await doPaste(w);return}
 if(tool==='select'&&!g.moved&&g.type==='pan'&&msel.length&&!multiOn){msel=[];renderSelBar();requestDraw(false)}
 if(!g.moved&&(g.type==='pan'||g.type==='move')){const gh=ghostHit(w);if(gh&&!(g.type==='move'&&g.wasSel)){sel=null;openGhost(gh);return}const h=hit(w);if(h&&h.kind==='p'){if(walk&&walk.p?.id!==h.o.id){walk.skip.delete(h.o.id);walkGo(h.o);toast('Walk: jumped to this device');return}if(window.pdTap)pdTap(h.o);openPin(h.o);return}}
 if(!g.moved&&(g.type==='resize'||(g.type==='move'||g.type==='pan'&&g.selTap)&&g.wasSel)&&sel?.o.type==='text'){inlineText(sel.o);return}
 if((g.type==='move'||g.type==='resize')&&g.moved&&sel)await change(sel.kind==='p'?'pins':'markups',g.orig,sel.o);
 if(g.type==='text'&&!g.moved){inlineText(null,g.w)}
 if(g.type==='pin'){const p={id:uid(),planId:plan.id,page,x:g.w.x,y:g.w.y,type:$('#pinType').value,address:'',status:'not tested',notes:'',created:Date.now(),opacity:toolOp(true)};await change('pins',null,p);quickChip(pins.find(x=>x.id===p.id))} // bpm-v86: quick-place: no form, Edit chip
 if(g.type==='mpath'){if(g.moved){requestDraw();return}await mPathTap(mSnap(w));return}
 if(g.type==='zig'){const d=draft;draft=null;const V=g.V.slice();if(g.tip)V.push(g.tip);if(V.length>1&&Math.hypot(V[V.length-1][0]-V[0][0],V[V.length-1][1]-V[0][1])+(V.length-2)>3/view.s){zFinish(d,V);await change('markups',null,d)}else drawOverlay();return}
 if(g.type==='draw'&&draft?.type==='cal'){const d=draft;draft=null;drawOverlay();await mCalibrate(d);return}
 if(g.type==='draw'){const d=draft;draft=null;if(d.type==='check'&&!g.moved){const s=24/view.s;d.x1=w.x-s*.4;d.y1=w.y-s*.6;d.x2=w.x+s*.6;d.y2=w.y+s*.4}
  if(Math.abs(d.x2-d.x1)+Math.abs(d.y2-d.y1)>3/view.s)await change('markups',null,d);else drawOverlay()}}
// bpm-v71: zigzag corners = RDP-simplified stroke (tolerance in screen px), then keep only real turns (≥28°) between segments ≥ min length; Snap rounds each segment to 15°
function zSeg(a,p){const dx=p[0]-a[0],dy=p[1]-a[1],L=Math.hypot(dx,dy),t=Math.round(Math.atan2(dy,dx)/(Math.PI/12))*(Math.PI/12);return[a[0]+L*Math.cos(t),a[1]+L*Math.sin(t)]}
function rdp(P,eps){if(P.length<3)return P.slice();const A=P[0],B=P[P.length-1],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy);let bi=0,bd=-1;for(let i=1;i<P.length-1;i++){const q=P[i],d=L?Math.abs((q[0]-A[0])*dy-(q[1]-A[1])*dx)/L:Math.hypot(q[0]-A[0],q[1]-A[1]);if(d>bd){bd=d;bi=i}}if(bd<=eps)return[A,B];return[...rdp(P.slice(0,bi+1),eps).slice(0,-1),...rdp(P.slice(bi),eps)]}
function zCorners(P,s){const eps=7/s,minL=16/s,minA=28*Math.PI/180;let V=rdp(P,eps);
 const turn=(a,b,c)=>{const u=Math.atan2(b[1]-a[1],b[0]-a[0]),v=Math.atan2(c[1]-b[1],c[0]-b[0]);let d=Math.abs(v-u)%(2*Math.PI);return d>Math.PI?2*Math.PI-d:d},len=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
 for(;;){if(V.length<3)break;let wi=-1,ws=Infinity;for(let i=1;i<V.length-1;i++){const t=turn(V[i-1],V[i],V[i+1]),l=Math.min(len(V[i-1],V[i]),len(V[i],V[i+1]));const bad=t<minA||l<minL;if(bad){const sc=t/minA+l/minL;if(sc<ws){ws=sc;wi=i}}}if(wi<0)break;V.splice(wi,1)}
 return V}
function zMove(g,w){const p=[w.x,w.y],Rw=g.R,q=Rw[Rw.length-1];if(Math.hypot(p[0]-q[0],p[1]-q[1])>.5/view.s)Rw.push(p);
 let V=zCorners([...Rw,p],view.s);V[0]=Rw[0];if(snapK()){const S=[V[0]];for(let i=1;i<V.length;i++)S.push(zSeg(S[i-1],V[i]));V=S}else{const sp=mkSnap({x:p[0],y:p[1]},draft);V[V.length-1]=[sp.x,sp.y]}
 g.V=V.slice(0,-1);g.tip=V[V.length-1];zFinish(draft,V);mRead()}
stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
const clampS=s=>Math.max(.02,Math.min(s,40));
stage.addEventListener('wheel',e=>{if(!plan)return;e.preventDefault();if(e.shiftKey&&!e.ctrlKey&&!walk){pfWheel(e);return}const k=Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)),s=clampS(view.s*k),wx=(e.offsetX-view.x)/view.s,wy=(e.offsetY-view.y)/view.s;view={s,x:e.offsetX-wx*s,y:e.offsetY-wy*s};fastView()},{passive:false});
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tool=b.dataset.t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));if(tool!=='select'){sel=null;draw()}if(tool==='pin'){$('#opac').value=50;opacLbl()}else if(tool!=='select'&&tool!=='pan'){$('#opac').value=80;opacLbl()}});
(function(){const b=$('#mkSnap');if(!b)return;const sync=()=>{b.classList.toggle('on',MK_SNAP);b.title=MK_SNAP?'Snap markups on — click to free-place':'Snap off — click to snap together';b.setAttribute('aria-pressed',MK_SNAP?'true':'false')};sync();b.onclick=()=>{MK_SNAP=!MK_SNAP;sync();put('meta',MK_SNAP,'mksnap')};get('meta','mksnap').then(v=>{if(v===true||v===false){MK_SNAP=v;sync()}}).catch(()=>{})})();
async function deleteSel(){if(msel.length)return bulkDelete();if(!sel)return;const o=sel.o,k=sel.kind;sel=null;if(o.planId!==plan?.id)return;if(k==='p')await deletePin(o);else await change('markups',o,null);draw()}
$('#del').onclick=deleteSel;document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||dlg.open)return;if(e.key==='Delete'||e.key==='Backspace')deleteSel();else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}});
const SZ=[2,3,5,8],SZT=[12,18,28,40];
const toolOp=isPin=>clampOp((+$('#opac').value|| (isPin?50:80))/100);
function opacLbl(){const v=+$('#opac').value;$('#opacLbl').textContent=v+'%'}
function syncOpacFromSel(){const o=sel?.o||(msel.length===1?msel[0]:null);if(!o)return;const isP=pins.includes(o);$('#opac').value=Math.round(opOf(o,isP)*100);opacLbl()}
$('#color').onchange=async e=>{if(sel?.kind==='m'&&sel.o.color!==e.target.value){const b=structuredClone(sel.o);await change('markups',b,{...b,color:e.target.value})}};
$('#size').onchange=async e=>{if(sel?.kind!=='m')return;const b=structuredClone(sel.o),i=+e.target.value;await change('markups',b,b.type==='text'?textBox({...b,fs:SZT[i]/view.s}):{...b,w:SZ[i]})};
let opacT=0;$('#opac').oninput=()=>{opacLbl();clearTimeout(opacT);opacT=setTimeout(applyOpac,120)};
async function applyOpac(){const v=toolOp(sel?.kind==='p'||(msel[0]&&pins.includes(msel[0])));
 if(msel.length){const L=[];for(const o of msel){const isP=pins.includes(o),b=structuredClone(o);if(Math.abs(opOf(b,isP)-v)<.005)continue;L.push({store:isP?'pins':'markups',id:o.id,before:b,after:{...b,opacity:v}})}if(L.length)await changeMulti(L);renderSelBar();return}
 if(!sel)return;const isP=sel.kind==='p',b=structuredClone(sel.o);if(Math.abs(opOf(b,isP)-v)<.005)return;await change(isP?'pins':'markups',b,{...b,opacity:v})}
// when selecting, show that item's opacity on the slider
const _hitSel=()=>setTimeout(syncOpacFromSel,0);stage.addEventListener('pointerup',_hitSel);
// ---------- undo / redo (per plan, this session) ----------
const hist={};const H=()=>hist[plan.id]||(hist[plan.id]={u:[],r:[]});
async function applyState(store,id,o,media){const arr=store==='pins'?pins:markups,i=arr.findIndex(x=>x.id===id);
 if(o){o=structuredClone(o);if(i>=0)arr[i]=o;else arr.push(o);await put(store,o);if(media)for(const m of media)await put('media',m);if(sel?.o.id===id)sel.o=o;return o}
 if(i>=0)arr.splice(i,1);if(sel?.o.id===id)sel=null;await del(store,id);if(store==='pins')for(const m of await byIdx('media','pinId',id))await del('media',m.id)}
async function change(store,before,after,media){if(!plan)return;const id=(after||before).id;await applyState(store,id,after);const h=H();h.u.push({store,id,before:before&&structuredClone(before),after:after&&structuredClone(after),media});if(h.u.length>300)h.u.shift();h.r=[];afterChange()}
async function undo(){if(!plan)return;const h=H(),op=h.u.pop();if(!op)return;if(op.multi){for(const b of op.multi.slice().reverse())await applyState(b.store,b.id,b.before,b.media)}else if(op.batch){for(const b of op.batch)await applyState(op.store,b.id,b.before);if(op.ghosts)ghosts.push(...structuredClone(op.ghosts))}else await applyState(op.store,op.id,op.before,op.media);h.r.push(op);afterChange()}
async function redo(){if(!plan)return;const h=H(),op=h.r.pop();if(!op)return;if(op.multi){for(const b of op.multi)await applyState(b.store,b.id,b.after)}else if(op.batch){for(const b of op.batch)await applyState(op.store,b.id,b.after);if(op.ghosts){const ids=new Set(op.ghosts.map(g=>g.id));ghosts=ghosts.filter(g=>!ids.has(g.id))}}else await applyState(op.store,op.id,op.after);h.u.push(op);afterChange()}
async function changeMulti(list){if(!plan||!list.length)return;for(const b of list)await applyState(b.store,b.id,b.after);const h=H();h.u.push({multi:list.map(b=>({...b,before:b.before&&structuredClone(b.before),after:b.after&&structuredClone(b.after)}))});if(h.u.length>300)h.u.shift();h.r=[];afterChange()}
async function changeBatch(store,afters,gh){if(!plan||!afters.length)return;for(const a of afters)await applyState(store,a.id,a);const h=H();h.u.push({store,batch:afters.map(a=>({id:a.id,before:null,after:structuredClone(a)})),ghosts:gh&&structuredClone(gh)});if(h.u.length>300)h.u.shift();h.r=[];afterChange()}
function updUR(){const h=plan&&hist[plan.id];$('#undo').disabled=!h?.u.length;$('#redo').disabled=!h?.r.length}
function afterChange(){if(msel.length)msel=msel.map(o=>pins.find(p=>p.id===o.id)||markups.find(m=>m.id===o.id)).filter(Boolean);updUR();draw();renderList();renderGhostBar();if(plan)fillPageSel(null)}
$('#undo').onclick=undo;$('#redo').onclick=redo;
