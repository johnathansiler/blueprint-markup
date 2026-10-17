// bpm-v104: pen/curve tool (cubic Bezier), node editing for curves/polylines/lines (via the v103 Edit button), extra shapes,
// dashed/dotted line styles, and text styles (font, B/I/U/S, size, color, alignment, box) in the selection bar.
// Markups only: pins, Detect and pin geometry are never touched. Every change goes through change()/changeMulti(), so it undoes,
// redoes, persists to IndexedDB and is drawn by drawMarkup() in PNG/PDF exports.
(()=>{
const dist=(a,b,c,d)=>Math.hypot(a-c,b-d),ce=(t,cls)=>{const e=document.createElement(t);if(cls)e.className=cls;return e};
// ---------- node model ----------
// path markup: {type:'path', x1,y1,x2,y2 (bbox incl. control points), pp:[{x,y (rel x1,y1), ix,iy,ox,oy (handles rel anchor), k:'c'|'s'}], closed, arrow}
const nodeable=m=>!!m&&(m.type==='path'||m.type==='zig'||m.type==='zarrow'||m.type==='line'||m.type==='arrow');
function nodesOf(m){if(m.type==='path')return{N:m.pp.map(n=>({x:m.x1+n.x,y:m.y1+n.y,ix:n.ix||0,iy:n.iy||0,ox:n.ox||0,oy:n.oy||0,k:n.k||'c'})),closed:!!m.closed,arrow:!!m.arrow};
 if(m.type==='zig'||m.type==='zarrow')return{N:zPts(m).map(([x,y])=>({x,y,ix:0,iy:0,ox:0,oy:0,k:'c'})),closed:false,arrow:m.type==='zarrow'};
 return{N:[{x:m.x1,y:m.y1,ix:0,iy:0,ox:0,oy:0,k:'c'},{x:m.x2,y:m.y2,ix:0,iy:0,ox:0,oy:0,k:'c'}],closed:false,arrow:m.type==='arrow'}}
const curvy=N=>N.some(n=>n.ix||n.iy||n.ox||n.oy);
function writeNodes(m,N,closed,arrow){
 if(m.type!=='path'&&!closed&&!curvy(N)){if(N.length===2&&(m.type==='line'||m.type==='arrow')){m.type=arrow?'arrow':'line';m.x1=N[0].x;m.y1=N[0].y;m.x2=N[1].x;m.y2=N[1].y;return m}
  m.type=arrow?'zarrow':'zig';delete m.pp;delete m.closed;delete m.arrow;return zFinish(m,N.map(n=>[n.x,n.y]))}
 m.type='path';delete m.rp;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const n of N)for(const[x,y]of[[n.x,n.y],[n.x+n.ix,n.y+n.iy],[n.x+n.ox,n.y+n.oy]]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
 m.x1=x0;m.y1=y0;m.x2=x1;m.y2=y1;m.pp=N.map(n=>({x:n.x-x0,y:n.y-y0,ix:n.ix,iy:n.iy,ox:n.ox,oy:n.oy,k:n.k}));m.closed=!!closed;if(arrow)m.arrow=true;else delete m.arrow;return m}
function segs(N,closed){const S=[];for(let i=0;i<N.length-1+(closed?1:0);i++){const a=N[i],b=N[(i+1)%N.length];S.push([a.x,a.y,a.x+a.ox,a.y+a.oy,b.x+b.ix,b.y+b.iy,b.x,b.y,i])}return S}
function pathTo(c,N,closed){if(!N.length)return;c.moveTo(N[0].x,N[0].y);for(const s of segs(N,closed))c.bezierCurveTo(s[2],s[3],s[4],s[5],s[6],s[7]);if(closed)c.closePath()}
const bez=(s,t)=>{const u=1-t;return[u*u*u*s[0]+3*u*u*t*s[2]+3*u*t*t*s[4]+t*t*t*s[6],u*u*u*s[1]+3*u*u*t*s[3]+3*u*t*t*s[5]+t*t*t*s[7]]};
function nearSeg(N,closed,x,y,tol){let best=null;for(const s of segs(N,closed)){let p=[s[0],s[1]];for(let k=1;k<=24;k++){const q=bez(s,k/24),dx=q[0]-p[0],dy=q[1]-p[1],t=Math.max(0,Math.min(1,((x-p[0])*dx+(y-p[1])*dy)/((dx*dx+dy*dy)||1))),d=dist(p[0]+t*dx,p[1]+t*dy,x,y);if(d<tol&&(!best||d<best.d))best={d,i:s[8],t:(k-1+t)/24};p=q}}return best}
// split segment i at t (de Casteljau) so the curve keeps its exact shape
function splitAt(N,closed,i,t){const a=N[i],b=N[(i+1)%N.length],P0=[a.x,a.y],P1=[a.x+a.ox,a.y+a.oy],P2=[b.x+b.ix,b.y+b.iy],P3=[b.x,b.y],L=(p,q)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
 const A=L(P0,P1),B=L(P1,P2),C=L(P2,P3),D=L(A,B),E=L(B,C),M=L(D,E),cv=curvy([a,b]);
 const n={x:M[0],y:M[1],ix:cv?D[0]-M[0]:0,iy:cv?D[1]-M[1]:0,ox:cv?E[0]-M[0]:0,oy:cv?E[1]-M[1]:0,k:cv?'s':'c'};if(cv){a.ox=A[0]-a.x;a.oy=A[1]-a.y;b.ix=C[0]-b.x;b.iy=C[1]-b.y}
 N.splice(i+1,0,n);return i+1}
function smooth(N,closed,i){const n=N[i],L=N.length,p=N[(i-1+L)%L],q=N[(i+1)%L],hasP=closed||i>0,hasQ=closed||i<L-1;
 let dx,dy;if(hasP&&hasQ){dx=q.x-p.x;dy=q.y-p.y}else if(hasQ){dx=q.x-n.x;dy=q.y-n.y}else{dx=n.x-p.x;dy=n.y-p.y}const d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
 const li=hasP?dist(p.x,p.y,n.x,n.y)/3:0,lo=hasQ?dist(q.x,q.y,n.x,n.y)/3:0;n.ix=-ux*li;n.iy=-uy*li;n.ox=ux*lo;n.oy=uy*lo;n.k='s'}
window.PEN_API={nodesOf,writeNodes,splitAt,smooth,nearSeg};
// ---------- styles ----------
const LSK='bpm-ls';let LS=localStorage.getItem(LSK)||'solid';window.lineStyle=()=>LS;
const FONTS=[['sans','Sans','sans-serif'],['serif','Serif','Georgia,"Times New Roman",Times,serif'],['mono','Mono','ui-monospace,Menlo,Consolas,"Courier New",monospace'],['narrow','Narrow','"Arial Narrow","Roboto Condensed","Liberation Sans Narrow",sans-serif'],['hand','Hand','"Comic Sans MS","Chalkboard SE","Comic Neue",cursive']];
const FF=k=>(FONTS.find(f=>f[0]===k)||FONTS[0])[2];
const fontOf=m=>`${m.it?'italic ':''}${m.b===false?'':'bold '}${m.fs}px ${FF(m.ff)}`; // legacy text (no fields) = exactly the old 'bold Npx sans-serif'
const NOSTYLE=new Set(['text','dim','cal','darea','dpath','check']);
function dash(c,m){if(NOSTYLE.has(m.type))return;const ls=m.ls||(m===draft?(LS!=='solid'?LS:''):'');if(!ls)return;const lw=(m.w||3)/MK_S;c.setLineDash(ls==='dot'?[.01,lw*2.2]:[lw*3.2,lw*2.2])}
function shapePts(m){const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1),cx=x+w/2,cy=y+h/2,P=[];
 if(m.type==='tri')return[[cx,y],[x+w,y+h],[x,y+h]];
 if(m.type==='poly'){const n=m.n||6;for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n;P.push([cx+w/2*Math.cos(a),cy+h/2*Math.sin(a)])}return P}
 if(m.type==='star'){const n=m.n||5;for(let i=0;i<2*n;i++){const a=-Math.PI/2+i*Math.PI/n,r=i%2?.45:1;P.push([cx+w/2*r*Math.cos(a),cy+h/2*r*Math.sin(a)])}return P}return P}
const _dm=drawMarkup;
drawMarkup=function(c,m,s){
 if(m.type==='text')return drawText(c,m);
 c.save();dash(c,m);
 if(m.type==='path'||m.type==='rrect'||m.type==='arc'||m.type==='tri'||m.type==='poly'||m.type==='star'){c.globalAlpha=opOf(m,false);c.strokeStyle=m.color;c.lineWidth=(m.w||3)/MK_S;c.lineJoin=c.lineCap='round';
  const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);c.beginPath();
  if(m.type==='path'){const{N,closed}=nodesOf(m);pathTo(c,N,closed);c.stroke();if(m.arrow&&N.length>1){const b=N[N.length-1],a=N[N.length-2];let tx=b.ix?b.x+b.ix:a.x+a.ox,ty=b.iy?b.y+b.iy:a.y+a.oy;if(dist(tx,ty,b.x,b.y)<.01){tx=a.x;ty=a.y}const an=Math.atan2(b.y-ty,b.x-tx),L=Math.max(c.lineWidth*4,12/MK_S);c.setLineDash([]);c.beginPath();c.moveTo(b.x-L*Math.cos(an-.45),b.y-L*Math.sin(an-.45));c.lineTo(b.x,b.y);c.lineTo(b.x-L*Math.cos(an+.45),b.y-L*Math.sin(an+.45));c.stroke()}}
  else if(m.type==='rrect'){const r=Math.min(w,h)*.22;c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h);c.stroke()}
  else if(m.type==='arc'){c.ellipse(x+w/2,y+h,w/2||.1,h||.1,0,Math.PI,2*Math.PI);c.stroke()}
  else{const P=shapePts(m);c.lineJoin='miter';c.miterLimit=10;P.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.stroke()}
  c.restore();return}
 _dm(c,m,s);c.restore()};
function drawText(c,m){c.save();c.globalAlpha=opOf(m,false);c.font=fontOf(m);c.textBaseline='top';const L=String(m.text||'').split('\n'),lh=m.fs*1.15,W=Math.max(...L.map(t=>c.measureText(t).width),1),al=m.al||'left';
 if(m.box){const p=m.fs*.22;c.fillStyle='#fff';c.fillRect(m.x1-p,m.y1-p,W+2*p,L.length*lh+2*p-m.fs*.1);c.strokeStyle=m.color;c.lineWidth=Math.max(1,m.fs/14);c.strokeRect(m.x1-p,m.y1-p,W+2*p,L.length*lh+2*p-m.fs*.1)}
 L.forEach((t,i)=>{const tw=c.measureText(t).width,x=m.x1+(al==='center'?(W-tw)/2:al==='right'?W-tw:0),y=m.y1+i*lh;c.textAlign='left';
  if(!m.box){c.lineWidth=m.fs/5;c.strokeStyle='#fff';c.lineJoin='round';c.strokeText(t,x,y)}c.fillStyle=m.color;c.fillText(t,x,y);
  const th=Math.max(1,m.fs/14);if(m.u)c.fillRect(x,y+m.fs*.98,tw,th);if(m.st)c.fillRect(x,y+m.fs*.52,tw,th)});c.restore()}
const _tb=textBox;textBox=function(m){octx.save();octx.font=fontOf(m);const L=String(m.text||'').split('\n'),w=Math.max(...L.map(t=>octx.measureText(t).width),0);octx.restore();m.x2=m.x1+w;m.y2=m.y1+m.fs*1.15*L.length;return m};
const _tp=tedPos;tedPos=function(){_tp();if(!ted)return;const m=ted.m,e=ted.el;Object.assign(e.style,{fontFamily:FF(m.ff),fontWeight:m.b===false?'normal':'bold',fontStyle:m.it?'italic':'normal',textDecoration:[m.u?'underline':'',m.st?'line-through':''].join(' ').trim()||'none',textAlign:m.al||'left'})};
// new markups pick up the current line style
const _ch=change;change=async function(s,b,a,me){if(s==='markups'&&!b&&a&&!a.ls&&LS!=='solid'&&!NOSTYLE.has(a.type))a.ls=LS;return _ch.call(this,s,b,a,me)};
// path hit test follows the curve (closed paths also by their inside); other types unchanged
const HC=document.createElement('canvas').getContext('2d');
function onPath(m,w){const tol=10/view.s;const{N,closed}=nodesOf(m),P=new Path2D();pathTo(P,N,closed);HC.setTransform(1,0,0,1,0,0);HC.lineWidth=Math.max(tol*2.8,(m.w||3)/MK_S+tol);return HC.isPointInStroke(P,w.x,w.y)||(closed&&HC.isPointInPath(P,w.x,w.y))}
const _hit=hit;hit=function(w){const r=_hit(w);if(r&&r.kind==='m'&&r.o.type==='path'&&!onPath(r.o,w)){const o=r.o,pg=o.page;o.page=-1;try{return hit(w)}finally{o.page=pg}}return r};
const _hd=handles;handles=function(m){return nodeable(m)&&edOn(m)?[]:m.type==='path'?[]:_hd(m)};
// ---------- shared pointer plumbing ----------
const ST=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
const P2=new Map();let G=null,pinch=null;
const R=()=>matchMedia('(pointer:coarse)').matches?24:16; // touch targets ≥24 px radius on phone/Fold
// ---------- pen tool ----------
let PD=null; // {N:[], down:{i,sx,sy}, last:{t,x,y}, hover:{x,y}}
function penBar(){let b=$('#penBar');if(!b){b=ce('div');b.id='penBar';stage.append(b)}
 if(tool!=='pen'){b.hidden=true;return}b.hidden=false;const n=PD?.N.length||0;
 b.innerHTML=`<span class="pbH">${n?n<2?'Tap the next point. Drag to pull out curve handles.':'Tap the first point to close · double-tap or Done to finish':'Pen: tap for a corner, drag for a smooth curve point'}</span><button type="button" class="btn" id="pbUndo"${n?'':' disabled'}>↶ Undo point</button><button type="button" class="btn" id="pbX"${n?'':' disabled'}>✕ Cancel</button><button type="button" class="btn pri" id="pbOk"${n>1?'':' disabled'}>✓ Done</button>`;
 b.querySelector('#pbUndo').onclick=()=>{PD?.N.pop();if(!PD?.N.length)PD=null;penBar();requestDraw(false)};b.querySelector('#pbX').onclick=()=>{PD=null;penBar();requestDraw(false)};b.querySelector('#pbOk').onclick=()=>penDone(false)}
async function penDone(closed){const P=PD;PD=null;penBar();requestDraw(false);if(!P||P.N.length<2)return;const m={id:uid(),planId:plan.id,page,type:'path',color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};writeNodes(m,P.N,closed,false);m.type='path';await change('markups',null,m);toast(closed?'Closed curve added':'Curve added')}
window.penDone=penDone;window.penState=()=>PD&&structuredClone(PD);
document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{if(PD&&b.dataset.t!=='pen')penDone(false);setTimeout(()=>{penBar();renderSelBar()},0)}));
addEventListener('keydown',e=>{if(tool!=='pen'||!PD||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;if(e.key==='Enter'){e.preventDefault();penDone(false)}else if(e.key==='Escape'){PD=null;penBar();requestDraw(false)}else if(e.key==='Backspace'){e.preventDefault();PD.N.pop();if(!PD.N.length)PD=null;penBar();requestDraw(false)}});
// ---------- node editor (Edit button flow from v103) ----------
let NE={id:null,i:-1}; // selected node of the edited item
const edItem=()=>tool==='select'&&sel?.kind==='m'&&nodeable(sel.o)&&edOn(sel.o)?sel.o:null;
function neHit(m,sx,sy){const{N,closed}=nodesOf(m),r=R(),near=(x,y)=>{const q=toS(x,y);return Math.hypot(q.x-sx,q.y-sy)<r};
 const vis=visH(m,N,closed);for(const[i,h]of vis){const n=N[i];if(near(n.x+n[h+'x'],n.y+n[h+'y']))return{kind:'h',i,h}}
 for(let i=N.length-1;i>=0;i--)if(near(N[i].x,N[i].y))return{kind:'a',i};
 const w=toW(sx,sy),s=nearSeg(N,closed,w.x,w.y,r/view.s);if(s)return{kind:'s',i:s.i,t:s.t};return null}
function visH(m,N,closed){if(NE.id!==m.id||NE.i<0||NE.i>=N.length)return[];const L=N.length,out=[],add=(i,h)=>{const n=N[i];if(n&&(n[h+'x']||n[h+'y']))out.push([i,h])};
 add(NE.i,'i');add(NE.i,'o');if(closed||NE.i>0)add((NE.i-1+L)%L,'o');if(closed||NE.i<L-1)add((NE.i+1)%L,'i');return out}
async function neCommit(m,before,msg){await change('markups',before,m);const o=markups.find(x=>x.id===m.id);if(o&&sel?.o?.id===o.id)sel.o=o;renderSelBar();requestDraw(false);if(msg)toast(msg)}
window.neSelect=i=>{const m=edItem();if(m){NE={...NE,id:m.id,i};renderSelBar();requestDraw(false)}};window.neState=()=>({...NE});
async function neOp(op){const m=edItem();if(!m)return;const b=structuredClone(m),o=structuredClone(m),{N,closed,arrow}=nodesOf(o);let i=NE.id===m.id?NE.i:-1,cl=closed;
 if(op==='del'){if(i<0||N.length<=2)return;N.splice(i,1);NE.i=Math.min(i,N.length-1)}
 else if(op==='smooth'){if(i<0)return;if(N[i].k==='s'||N[i].ix||N[i].ox||N[i].iy||N[i].oy){N[i].ix=N[i].iy=N[i].ox=N[i].oy=0;N[i].k='c'}else smooth(N,cl,i)}
 else if(op==='close'){if(N.length<3&&!cl)return;cl=!cl}
 writeNodes(o,N,cl,arrow);Object.assign(m,o);for(const k of['rp','pp','closed','arrow'])if(!(k in o))delete m[k];await neCommit(m,b,{del:'Point deleted',smooth:N[i]?.k==='s'?'Smooth point':'Corner point',close:cl?'Path closed':'Path opened'}[op])}
window.neOp=neOp;
// ---------- pointer handling (capture phase, ahead of app.js) ----------
function startPinch(){const[a,b]=[...P2.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}}}
stage.addEventListener('pointerdown',e=>{if(e.button>0)return;const m=edItem(),pen=tool==='pen'&&plan;if(!pen&&!m&&!P2.size)return;
 if(P2.size){P2.set(e.pointerId,ST(e));if(P2.size===2){if(G?.added&&PD){PD.N.pop();if(!PD.N.length)PD=null}G=null;startPinch()}e.stopImmediatePropagation();e.preventDefault();return}
 const s=ST(e),w=toW(s.x,s.y);
 if(pen){P2.set(e.pointerId,s);stage.setPointerCapture?.(e.pointerId);e.stopImmediatePropagation();e.preventDefault();
  if(PD&&PD.N.length>=2){const f=toS(PD.N[0].x,PD.N[0].y);if(Math.hypot(f.x-s.x,f.y-s.y)<R()){G={pen:1,close:1};return}}
  const lt=PD?.last;if(PD&&lt&&performance.now()-lt.t<320&&Math.hypot(lt.x-s.x,lt.y-s.y)<R()){G={pen:1,dbl:1};return}
  PD??={N:[]};PD.N.push({x:w.x,y:w.y,ix:0,iy:0,ox:0,oy:0,k:'c'});G={pen:1,added:1,sx:s.x,sy:s.y,i:PD.N.length-1};PD.last={t:performance.now(),x:s.x,y:s.y};penBar();requestDraw(false);return}
 const h=neHit(m,s.x,s.y);if(!h)return;P2.set(e.pointerId,s);e.stopImmediatePropagation();e.preventDefault();
 const{N,closed}=nodesOf(m);G={ne:1,h,sx:s.x,sy:s.y,b:structuredClone(m),N,closed,alt:e.altKey,moved:0};if(h.kind==='a'){NE={...NE,id:m.id,i:h.i};renderSelBar()}requestDraw(false)},true);
stage.addEventListener('pointermove',e=>{if(!P2.has(e.pointerId)){if(tool==='pen'&&PD){PD.hover=toW(ST(e).x,ST(e).y);requestDraw(false)}return}const s=ST(e);P2.set(e.pointerId,s);e.stopImmediatePropagation();
 if(pinch&&P2.size>=2){const[a,b]=[...P2.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=pinch,sc=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s:sc,x:c.x-wx*sc,y:c.y-wy*sc};fastView();return}
 if(!G)return;const mv=Math.hypot(s.x-G.sx,s.y-G.sy)>4;if(mv)G.moved=1;const w=toW(s.x,s.y);
 if(G.pen&&G.added&&G.moved){const n=PD.N[G.i];n.ox=w.x-n.x;n.oy=w.y-n.y;n.ix=-n.ox;n.iy=-n.oy;n.k='s';requestDraw(false);return}
 if(G.ne&&G.moved){const m=edItem();if(!m)return;const N=structuredClone(G.N),h=G.h;
  if(h.kind==='a'){const n=N[h.i];n.x=w.x;n.y=w.y}
  else if(h.kind==='h'){const n=N[h.i],o=h.h==='i'?'o':'i';n[h.h+'x']=w.x-n.x;n[h.h+'y']=w.y-n.y;
   if(n.k==='s'&&!(G.alt||e.altKey||NE.brk)){const L=Math.hypot(n[o+'x'],n[o+'y'])||Math.hypot(n[h.h+'x'],n[h.h+'y']),d=Math.hypot(n[h.h+'x'],n[h.h+'y'])||1;n[o+'x']=-n[h.h+'x']/d*L;n[o+'y']=-n[h.h+'y']/d*L}else n.k='c'}
  else if(h.kind==='s'){const dx=w.x-toW(G.sx,G.sy).x,dy=w.y-toW(G.sx,G.sy).y;for(const n of N){n.x+=dx;n.y+=dy}}
  const o=structuredClone(G.b);writeNodes(o,N,G.closed,nodesOf(G.b).arrow);for(const k of['rp','pp','closed','arrow'])delete m[k];Object.assign(m,o);requestDraw(false)}},true);
const up=async e=>{if(!P2.has(e.pointerId))return;P2.delete(e.pointerId);e.stopImmediatePropagation();if(pinch){if(P2.size<2)pinch=null;if(!P2.size)G=null;return}
 const g=G;G=null;if(!g)return;
 if(g.pen){if(g.close)return penDone(true);if(g.dbl)return penDone(false);penBar();requestDraw(false);return}
 if(g.ne){const m=edItem();if(!m)return;
  if(!g.moved){if(g.h.kind==='s'){const b=structuredClone(m),o=structuredClone(m),{N,closed,arrow}=nodesOf(o);const ni=splitAt(N,closed,g.h.i,g.h.t);writeNodes(o,N,closed,arrow);for(const k of['rp','pp','closed','arrow'])delete m[k];Object.assign(m,o);NE={...NE,id:m.id,i:ni};await neCommit(m,b,'Point added')}return}
  await neCommit(m,g.b)}};
stage.addEventListener('pointerup',up,true);stage.addEventListener('pointercancel',up,true);
// ---------- overlay: pen draft + node editor ----------
const _do0=drawOverlay0;drawOverlay0=function(){_do0();const c=octx;if(!plan||!pageW)return;c.save();setT(c);const s=view.s,r=5/s;
 const knob=(x,y,sq,on)=>{c.beginPath();if(sq)c.rect(x-r,y-r,2*r,2*r);else c.arc(x,y,r*.9,0,7);c.fillStyle=on?'#2563eb':'#fff';c.fill();c.lineWidth=1.6/s;c.strokeStyle='#2563eb';c.stroke()};
 const hdl=n=>{for(const h of['i','o']){if(!(n[h+'x']||n[h+'y']))continue;const x=n.x+n[h+'x'],y=n.y+n[h+'y'];c.beginPath();c.moveTo(n.x,n.y);c.lineTo(x,y);c.lineWidth=1.2/s;c.strokeStyle='#2563eb';c.setLineDash([]);c.stroke();knob(x,y,false,false)}};
 if(tool==='pen'&&PD&&PD.N.length&&page===page){const N=PD.N;c.globalAlpha=1;c.strokeStyle=$('#color').value;c.lineWidth=(SZ[$('#size').value]||3)/MK_S;c.lineCap=c.lineJoin='round';c.beginPath();pathTo(c,N,false);c.stroke();
  if(PD.hover&&!G){const l=N[N.length-1];c.setLineDash([4/s,3/s]);c.lineWidth=1/s;c.strokeStyle='#2563eb';c.beginPath();c.moveTo(l.x,l.y);c.bezierCurveTo(l.x+l.ox,l.y+l.oy,PD.hover.x,PD.hover.y,PD.hover.x,PD.hover.y);c.stroke();c.setLineDash([])}
  N.forEach((n,i)=>{if(i===N.length-1)hdl(n);knob(n.x,n.y,true,i===0&&N.length>1)})}
 const m=edItem();if(m&&m.page===page){const{N,closed}=nodesOf(m);if(NE.id!==m.id)NE={id:m.id,i:-1};
  c.setLineDash([]);c.globalAlpha=.45;c.lineWidth=1/s;c.strokeStyle='#60a5fa';c.beginPath();pathTo(c,N,closed);c.stroke();c.globalAlpha=1;
  for(const[i]of visH(m,N,closed).filter((v,k,a)=>a.findIndex(z=>z[0]===v[0])===k))hdl(N[i]);N.forEach((n,i)=>knob(n.x,n.y,true,i===NE.i))}
 c.restore()};
// ---------- selection bar: node tools + text styles ----------
const _rsb=renderSelBar;renderSelBar=function(...a){_rsb.apply(this,a);const b=$('#selBar');if(!b||b.hidden)return;
 const m=edItem();if(m){const{N,closed}=nodesOf(m),i=NE.id===m.id?NE.i:-1,n=N[i],sm=n&&(n.k==='s'||n.ix||n.ox||n.iy||n.oy);
  const g=ce('span','sbGrp');g.innerHTML=`<i class="sbSep"></i><small class="sbHint">${i<0?'Tap a point, or tap the line to add one':'Point '+(i+1)+' of '+N.length}</small><button type="button" class="btn" id="neDel"${i<0||N.length<=2?' disabled':''} title="Delete the selected point">⌫ Delete point</button><button type="button" class="btn" id="neSm"${i<0?' disabled':''} title="Smooth: curve handles · Corner: sharp point">${sm?'◣ Corner':'◠ Smooth'}</button><button type="button" class="btn${NE.brk?' on':''}" id="neBrk" title="Move one curve handle without the other (same as holding Alt)">⟂ Break handles</button>${N.length>2||closed?`<button type="button" class="btn" id="neCl">${closed?'⊂ Open path':'○ Close path'}</button>`:''}`;
  b.append(g);g.querySelector('#neDel').onclick=()=>neOp('del');g.querySelector('#neSm').onclick=()=>neOp('smooth');g.querySelector('#neBrk').onclick=()=>{NE.brk=!NE.brk;renderSelBar()};if(g.querySelector('#neCl'))g.querySelector('#neCl').onclick=()=>neOp('close');if(b.scrollWidth>b.clientWidth)b.scrollLeft=Math.max(0,g.offsetLeft+g.offsetWidth-b.clientWidth)}
 const T=(tool==='select'?selItems():msel).filter(o=>o.type==='text');if(T.length)b.append(textBar(T))};
function textBar(T){const f=T[0],g=ce('span','sbGrp sbTxt');const tg=(k,l,t,st)=>`<button type="button" class="btn sbT${T.every(o=>k==='b'?o.b!==false:o[k])?' on':''}" data-tk="${k}" title="${t}" aria-pressed="${T.every(o=>k==='b'?o.b!==false:o[k])}" style="${st}">${l}</button>`;
 const fs=Math.round(f.fs),SZS=[...new Set([6,8,10,12,14,18,24,32,48,64,96,128,fs])].sort((a,b)=>a-b);
 g.innerHTML=`<i class="sbSep"></i><small class="sbHint">Text${T.length>1?' ×'+T.length:''}</small><label class="sbL">Font <select id="txFont">${FONTS.map(([k,l,c])=>`<option value="${k}"${(f.ff||'sans')===k?' selected':''} style="font-family:${c.replace(/"/g,"'")}">${l}</option>`).join('')}</select></label>`
  +tg('b','B','Bold','font-weight:800')+tg('it','I','Italic','font-style:italic;font-family:serif')+tg('u','U','Underline','text-decoration:underline')+tg('st','S','Strike','text-decoration:line-through')
  +`<label class="sbL">Size <select id="txSize">${SZS.map(v=>`<option value="${v}"${v===fs?' selected':''}>${v}</option>`).join('')}</select></label><label class="sbL sbCol" title="Text color">Color <input type="color" id="txCol" value="${/^#[0-9a-f]{6}$/i.test(f.color)?f.color:'#e11d48'}"></label>`
  +['left','center','right'].map((a,i)=>`<button type="button" class="btn sbT${(f.al||'left')===a?' on':''}" data-al="${a}" title="Align ${a}">${['⇤ Left','↔ Center','⇥ Right'][i]}</button>`).join('')
  +`<button type="button" class="btn sbT${T.every(o=>o.box)?' on':''}" data-tk="box" title="White background with a frame">▭ Box</button>`;
 const apply=async fn=>{const L=[];for(const o0 of T){const o=markups.find(x=>x.id===o0.id);if(!o)continue;const b=structuredClone(o),a=structuredClone(o);fn(a);textBox(a);L.push({store:'markups',id:o.id,before:b,after:a})}if(!L.length)return;await changeMulti(L);const ids=new Set(L.map(x=>x.id));msel=msel.map(o=>ids.has(o.id)?markups.find(x=>x.id===o.id)||o:o);if(sel?.o&&ids.has(sel.o.id))sel.o=markups.find(x=>x.id===sel.o.id)||sel.o;renderSelBar();requestDraw(false)};
 g.querySelector('#txFont').onchange=e=>apply(a=>{if(e.target.value==='sans')delete a.ff;else a.ff=e.target.value});
 g.querySelector('#txSize').onchange=e=>apply(a=>{a.fs=+e.target.value});g.querySelector('#txCol').onchange=e=>apply(a=>{a.color=e.target.value});
 g.querySelectorAll('[data-tk]').forEach(x=>x.onclick=()=>{const k=x.dataset.tk,on=!x.classList.contains('on');apply(a=>{if(k==='b'){if(on)delete a.b;else a.b=false}else if(on)a[k]=true;else delete a[k]})});
 g.querySelectorAll('[data-al]').forEach(x=>x.onclick=()=>apply(a=>{if(x.dataset.al==='left')delete a.al;else a.al=x.dataset.al}));return g}
// ---------- line style API (Width sheet) ----------
window.setLineStyle=async v=>{LS=v;localStorage.setItem(LSK,v);const it=(tool==='select'?selItems():msel).filter(o=>o.planId&&'x1'in o&&!NOSTYLE.has(o.type)&&!('address'in o));if(!it.length)return;
 const L=it.map(o0=>{const o=markups.find(x=>x.id===o0.id),b=structuredClone(o),a=structuredClone(o);if(v==='solid')delete a.ls;else a.ls=v;return{store:'markups',id:o.id,before:b,after:a}});await changeMulti(L);const ids=new Set(L.map(x=>x.id));msel=msel.map(o=>ids.has(o.id)?markups.find(x=>x.id===o.id)||o:o);renderSelBar();requestDraw(false)};
})();
// accurate hint when Edit opens on a curve / polyline / line
{const _t=toast;toast=function(msg,u){if(typeof msg==='string'&&/^Edit mode/.test(msg)&&tool==='select'&&sel?.kind==='m'&&(sel.o.type==='path'||sel.o.type==='zig'||sel.o.type==='zarrow'||sel.o.type==='line'||sel.o.type==='arrow')&&edOn(sel.o))msg='Edit points: drag a point or handle · tap the line to add a point';return _t.call(this,msg,u)}}
