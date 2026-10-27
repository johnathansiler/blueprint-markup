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
// ---------- pen tool + point editing (bpm-v105: Illustrator-like) ----------
// While drawing: every anchor and handle of the in-progress path is shown and can be dragged (a tap on one never adds a point).
// Finishing (Done, double-tap, tap the first point) goes straight into point editing. One labeled pen tools bar serves both.
let PD=null;   // in-progress path {N:[], sel, last:{t,x,y,i}, hover}
let PM='add';  // pen-mode bar mode: 'add' (tap adds / inserts on the line) | 'sel' (direct select only) | 'del' | 'move'
let NE={id:null,i:-1,mode:'sel',brk:false}; // point editing: selected node + mode ('sel' | 'add' | 'del' | 'move')
const edItem=()=>tool==='select'&&sel?.kind==='m'&&nodeable(sel.o)&&edOn(sel.o)?sel.o:null;
const isSm=n=>!!n&&(n.k==='s'||!!(n.ix||n.iy||n.ox||n.oy));
const allH=N=>{const o=[];N.forEach((n,i)=>{for(const h of['i','o'])if(n[h+'x']||n[h+'y'])o.push([i,h])});return o};
function nodeHit(N,closed,sx,sy,seg){const r=R();let best=null,bd=1e9;const tryP=(x,y,h)=>{const q=toS(x,y),d=Math.hypot(q.x-sx,q.y-sy);if(d<r&&d<bd){bd=d;best=h}};
 N.forEach((n,i)=>tryP(n.x,n.y,{kind:'a',i}));for(const[i,h]of allH(N)){const n=N[i];tryP(n.x+n[h+'x'],n.y+n[h+'y'],{kind:'h',i,h})}if(best)return best;
 if(seg){const w=toW(sx,sy),s=nearSeg(N,closed,w.x,w.y,r/view.s);if(s)return{kind:'s',i:s.i,t:s.t}}return null}
function dragNode(N,h,w,brk){if(h.kind==='a'){const n=N[h.i];n.x=w.x;n.y=w.y;return}const n=N[h.i],o=h.h==='i'?'o':'i';n[h.h+'x']=w.x-n.x;n[h.h+'y']=w.y-n.y;
 if(n.k==='s'&&!brk){const L=Math.hypot(n[o+'x'],n[o+'y'])||Math.hypot(n[h.h+'x'],n[h.h+'y']),d=Math.hypot(n[h.h+'x'],n[h.h+'y'])||1;n[o+'x']=-n[h.h+'x']/d*L;n[o+'y']=-n[h.h+'y']/d*L}else n.k='c'}
function convert(N,closed,i){if(isSm(N[i])){const n=N[i];n.ix=n.iy=n.ox=n.oy=0;n.k='c'}else smooth(N,closed,i)}
// ---- the pen tools bar ----
function penBar(){let b=$('#penBar');if(!b){b=ce('div');b.id='penBar';b.setAttribute('role','toolbar');b.setAttribute('aria-label','Pen tools');stage.append(b)}
 const m=edItem(),pen=tool==='pen'&&!!plan;if(!pen&&!m){b.hidden=true;b.innerHTML='';toastLift();return}b.hidden=false;
 let N=[],closed=false,i=-1,mode;if(pen){N=PD?.N||[];i=PD?.sel??-1;mode=PM}else{({N,closed}=nodesOf(m));i=NE.id===m.id?NE.i:-1;mode=NE.mode}
 const n=N.length,on=k=>mode===k?' on':'',B=(id,ic,l,t,x='')=>`<button type="button" class="btn pbB${x}" id="${id}" title="${t}"><span class="pbI">${ic}</span><span class="pbL">${l}</span></button>`;
 const hint=pen?(mode==='sel'?'Tap a point to select it, drag points or handles':mode==='del'?'Tap a point to delete it':mode==='move'?'Drag to move the whole path':!n?'Tap for a corner, drag for a curve':n<2?'Tap the next point · drag for handles':'Tap the first point to close · double-tap or Done to finish')
  :(mode==='del'?'Tap a point to delete it':mode==='move'?'Drag to move the shape':mode==='add'?'Tap the line to add a point':i<0?'Tap a point · drag points or handles · tap the line to add':'Point '+(i+1)+' of '+n);
 b.classList.toggle('ne',!pen);
 b.innerHTML=`<span class="pbH">${hint}</span>`+B('pbOk','✓','Done',pen?'Finish the path and edit its points':'Finish editing points',' pri'+(pen&&n<2?' dis':''))+B('pbSel','↖','Select point','Direct select: tap or drag points and handles, never adds',on('sel'))+B('pbAdd','＋','Add point',pen?'Tap to add points (tap on the line inserts one)':'Tap the line to add a point',on('add'))
  +B('neDel','－','Delete point',i>=0?'Delete the selected point':'Then tap the point to delete',on('del')+(n<=2&&!pen?' dis':''))+B('neSm','⇄',isSm(N[i])?'Convert: sharp':'Convert: smooth','Convert the selected point between smooth (curve handles) and sharp (corner)',i<0?' dis':'')
  +B('neBrk','⟂','Break handles','Move one curve handle without the other (same as holding Alt)',NE.brk?' on':'')+(!pen&&(n>2||closed)?B('neCl',closed?'⊂':'○',closed?'Open path':'Close path',closed?'Open the path':'Close the path'):'')
  +B('pbMove','✥','Move shape','Drag anywhere to move the whole path',on('move'))+(pen?B('pbUndo','↶','Undo point','Remove the last point',n?'':' dis')+B('pbX','✕','Cancel','Discard this path',n?'':' dis'):'')
;
 b.querySelectorAll('.dis').forEach(x=>x.disabled=true);
 const setMode=k=>{if(pen)PM=PM===k&&k!=='add'?'add':k;else NE.mode=NE.mode===k&&k!=='sel'?'sel':k;penBar();requestDraw(false)};
 b.querySelector('#pbSel').onclick=()=>setMode('sel');b.querySelector('#pbAdd').onclick=()=>setMode('add');b.querySelector('#pbMove').onclick=()=>setMode('move');
 b.querySelector('#neBrk').onclick=()=>{NE.brk=!NE.brk;penBar()};
 b.querySelector('#neDel').onclick=()=>{if(i>=0)return pen?penOp('del'):neOp('del');setMode('del')};
 b.querySelector('#neSm').onclick=()=>pen?penOp('smooth'):neOp('smooth');
 if(b.querySelector('#neCl'))b.querySelector('#neCl').onclick=()=>neOp('close');
 if(pen){b.querySelector('#pbUndo').onclick=()=>{PD?.N.pop();if(PD)PD.sel=-1;if(!PD?.N.length)PD=null;penBar();requestDraw(false)};b.querySelector('#pbX').onclick=()=>{PD=null;PM='add';penBar();requestDraw(false)};b.querySelector('#pbOk').onclick=()=>penDone(false)}
 else b.querySelector('#pbOk').onclick=()=>{NE.mode='sel';setEdit(null);toast('Points saved')};
 // sit just above the selection bar when it is showing
 const sb=$('#selBar');if(sb&&!sb.hidden){const S=stage.getBoundingClientRect(),Q=sb.getBoundingClientRect();b.style.bottom=Math.max(8,S.bottom-Q.top+6)+'px'}else b.style.bottom='';/* v113: selBar already rides above the phone Pages strip, so this stays above both */
 toastLift();const a=b.querySelector('.on');if(a&&b.scrollWidth>b.clientWidth&&(a.offsetLeft<b.scrollLeft||a.offsetLeft+a.offsetWidth>b.scrollLeft+b.clientWidth))b.scrollLeft=Math.max(0,a.offsetLeft-40)}
window.penBar=penBar;
// keep toasts above the floating tool bars so they never cover a button
function toastLift(){const t=$('#toast');if(!t)return;const S=stage.getBoundingClientRect();let top=null;for(const id of['#penBar','#shpChip','#fhBar']){const e=$(id);if(e&&!e.hidden){const r=e.getBoundingClientRect();if(r.height)top=Math.min(top??1e9,r.top)}}t.style.bottom=top!=null?Math.round(S.bottom-top+6)+'px':''}window.toastLift=toastLift;
function penOp(op){if(!PD)return;const N=PD.N,i=PD.sel??-1;if(op==='del'){if(i<0)return;N.splice(i,1);PD.sel=-1;if(!N.length)PD=null}else if(op==='smooth'){if(i<0)return;convert(N,false,i)}penBar();requestDraw(false)}
async function penDone(closed){const P=PD;PD=null;PM='add';if(!P||P.N.length<2){penBar();requestDraw(false);return}
 const m={id:uid(),planId:plan.id,page,type:'path',color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};writeNodes(m,P.N,closed,false);m.type='path';await change('markups',null,m);
 enterPoints(m.id);toast(closed?'Closed curve added · edit its points':'Curve added · edit its points')}
function enterPoints(id){const sb=document.querySelector('[data-t=select]');if(tool!=='select'&&sb)sb.click();tool='select';const o=markups.find(x=>x.id===id);if(!o)return;sel={kind:'m',o};msel=[];NE={id,i:-1,mode:'sel',brk:false};setEdit(id);penBar();requestDraw(false)}
window.penDone=penDone;window.penState=()=>PD&&structuredClone(PD);window.enterPoints=enterPoints;
document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{if(PD&&b.dataset.t!=='pen')penDone(false);if(b.dataset.t!=='pen')PM='add';setTimeout(()=>{penBar();renderSelBar()},0)}));
addEventListener('keydown',e=>{if(tool!=='pen'||!PD||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;if(e.key==='Enter'){e.preventDefault();penDone(false)}else if(e.key==='Escape'){PD=null;penBar();requestDraw(false)}else if(e.key==='Backspace'){e.preventDefault();PD.N.pop();PD.sel=-1;if(!PD.N.length)PD=null;penBar();requestDraw(false)}});
// ---- point-edit operations on a saved path / polyline / line ----
async function neCommit(m,before,msg){await change('markups',before,m);const o=markups.find(x=>x.id===m.id);if(o&&sel?.o?.id===o.id)sel.o=o;renderSelBar();requestDraw(false);if(msg)toast(msg)}
window.neSelect=i=>{const m=edItem();if(m){NE={...NE,id:m.id,i};renderSelBar();requestDraw(false)}};window.neState=()=>({...NE});
const setM=(m,o)=>{for(const k of['rp','pp','closed','arrow','n'])if(!(k in o))delete m[k];Object.assign(m,o)};
async function neOp(op,at){const m=edItem();if(!m)return;const b=structuredClone(m),o=structuredClone(m),{N,closed,arrow}=nodesOf(o);let i=at??(NE.id===m.id?NE.i:-1),cl=closed;
 if(op==='del'){if(i<0||N.length<=2)return;N.splice(i,1);NE.i=Math.min(i,N.length-1);if(at!=null)NE.i=-1}
 else if(op==='smooth'){if(i<0)return;convert(N,cl,i)}
 else if(op==='close'){if(N.length<3&&!cl)return;cl=!cl}
 writeNodes(o,N,cl,arrow);setM(m,o);await neCommit(m,b,{del:'Point deleted',smooth:isSm(N[i])?'Smooth point':'Sharp point',close:cl?'Path closed':'Path opened'}[op])}
window.neOp=neOp;
// ---------- pointer handling (capture phase, ahead of app.js) ----------
function startPinch(){const[a,b]=[...P2.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}}}
const eat=e=>{e.stopImmediatePropagation();e.preventDefault()};
const onCv=e=>e.target===cv||e.target===ov;window.__onCv=onCv;
stage.addEventListener('pointerdown',e=>{if(e.button>0||!onCv(e))return;if(e.isPrimary&&P2.size){P2.clear();pinch=null;G=null}const m=edItem(),pen=tool==='pen'&&plan;if(!pen&&!m&&!P2.size)return;
 if(P2.size){P2.set(e.pointerId,ST(e));if(P2.size===2){if(G?.added&&PD){PD.N.pop();if(!PD.N.length)PD=null}if(G?.ne&&G.moved){const mm=edItem();if(mm)setM(mm,structuredClone(G.b))}G=null;startPinch()}eat(e);return}
 const s=ST(e),w=toW(s.x,s.y);
 if(pen){P2.set(e.pointerId,s);stage.setPointerCapture?.(e.pointerId);eat(e);const N=PD?.N||[];
  if(PM==='move'){if(N.length)G={pen:1,move:1,sx:s.x,sy:s.y,N0:structuredClone(N)};return}
  const h=N.length?nodeHit(N,false,s.x,s.y,PM==='add'):null;
  if(h&&h.kind!=='s'){G={pen:1,pick:h,sx:s.x,sy:s.y,N0:structuredClone(N),alt:e.altKey};return}
  if(h&&h.kind==='s'){G={pen:1,seg:h,sx:s.x,sy:s.y};return}
  if(PM!=='add'){G={pen:1,none:1,sx:s.x,sy:s.y};return}
  PD??={N:[],sel:-1};PD.N.push({x:w.x,y:w.y,ix:0,iy:0,ox:0,oy:0,k:'c'});PD.sel=-1;G={pen:1,added:1,sx:s.x,sy:s.y,i:PD.N.length-1};PD.last={t:performance.now(),x:s.x,y:s.y,i:PD.N.length-1};penBar();requestDraw(false);return}
 const{N,closed}=nodesOf(m);
 if(NE.mode==='move'){P2.set(e.pointerId,s);eat(e);G={ne:1,h:{kind:'s'},sx:s.x,sy:s.y,b:structuredClone(m),N,closed,moved:0};return}
 const h=nodeHit(N,closed,s.x,s.y,true);if(!h)return;P2.set(e.pointerId,s);eat(e);
 G={ne:1,h,sx:s.x,sy:s.y,b:structuredClone(m),N,closed,alt:e.altKey,moved:0};if(h.kind==='a'&&NE.mode!=='del'){NE={...NE,id:m.id,i:h.i};renderSelBar()}requestDraw(false)},true);
stage.addEventListener('pointermove',e=>{if(!P2.has(e.pointerId)){if(tool==='pen'&&PD&&e.pointerType==='mouse'){PD.hover=toW(ST(e).x,ST(e).y);requestDraw(false)}return}const s=ST(e);P2.set(e.pointerId,s);e.stopImmediatePropagation();
 if(pinch&&P2.size>=2){const[a,b]=[...P2.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=pinch,sc=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s:sc,x:c.x-wx*sc,y:c.y-wy*sc};fastView();return}
 if(!G)return;if(Math.hypot(s.x-G.sx,s.y-G.sy)>(e.pointerType==='mouse'?4:7))G.moved=1;if(!G.moved)return;const w=toW(s.x,s.y);
 if(G.pen){if(G.added){const n=PD.N[G.i];n.ox=w.x-n.x;n.oy=w.y-n.y;n.ix=-n.ox;n.iy=-n.oy;n.k='s'}
  else if(G.pick&&PD){const N=structuredClone(G.N0);dragNode(N,G.pick,w,G.alt||e.altKey||NE.brk);PD.N=N;PD.sel=G.pick.i}
  else if(G.move&&PD){const a=toW(G.sx,G.sy);PD.N=G.N0.map(n=>({...n,x:n.x+w.x-a.x,y:n.y+w.y-a.y}))}
  requestDraw(false);return}
 if(G.ne){const m=edItem();if(!m)return;const N=structuredClone(G.N),h=G.h;
  if(h.kind==='s'){const a=toW(G.sx,G.sy);for(const n of N){n.x+=w.x-a.x;n.y+=w.y-a.y}}else dragNode(N,h,w,G.alt||e.altKey||NE.brk);
  const o=structuredClone(G.b);writeNodes(o,N,G.closed,nodesOf(G.b).arrow);setM(m,o);requestDraw(false)}},true);
const up=async e=>{if(!P2.has(e.pointerId))return;P2.delete(e.pointerId);e.stopImmediatePropagation();if(pinch){if(P2.size<2)pinch=null;if(!P2.size)G=null;return}
 const g=G;G=null;if(!g)return;
 if(g.pen){const now=performance.now();
  if(g.pick&&!g.moved&&PD){const i=g.pick.i,N=PD.N,lt=PD.last;
   if(PM==='del'&&g.pick.kind==='a'){N.splice(i,1);PD.sel=-1;if(!N.length)PD=null}
   else if(g.pick.kind==='a'&&i===0&&N.length>=2&&PM==='add')return penDone(true);
   else if(g.pick.kind==='a'&&i===N.length-1&&lt&&now-lt.t<400&&PM==='add'&&N.length>=2)return penDone(false);
   else PD.sel=g.pick.kind==='a'?i:g.pick.i;
   if(PD)PD.last={t:now,x:g.sx,y:g.sy,i}}
  else if(g.seg&&!g.moved&&PD){PD.sel=splitAt(PD.N,false,g.seg.i,g.seg.t);PD.last={t:0}}
  else if(g.none&&!g.moved&&PD)PD.sel=-1;
  penBar();requestDraw(false);return}
 if(g.ne){const m=edItem();if(!m)return;
  if(!g.moved){if(NE.mode==='del'&&g.h.kind==='a'){NE.mode='sel';return neOp('del',g.h.i)}
   if(g.h.kind==='s'&&NE.mode!=='move'){const b=structuredClone(m),o=structuredClone(m),{N,closed,arrow}=nodesOf(o);const ni=splitAt(N,closed,g.h.i,g.h.t);writeNodes(o,N,closed,arrow);setM(m,o);NE={...NE,id:m.id,i:ni};await neCommit(m,b,'Point added')}
   else{renderSelBar();requestDraw(false)}return}
  await neCommit(m,g.b)}};
stage.addEventListener('pointerup',up,true);stage.addEventListener('pointercancel',up,true);
// ---------- overlay: in-progress path + point editor (all anchors and handles visible) ----------
const _do0=drawOverlay0;drawOverlay0=function(){_do0();const c=octx;if(!plan||!pageW)return;c.save();setT(c);const s=view.s,coarse=R()>16,r=(coarse?7:5)/s;
 const knob=(x,y,sq,on,first)=>{c.beginPath();if(sq)c.rect(x-r,y-r,2*r,2*r);else c.arc(x,y,r*.85,0,7);c.fillStyle=on?'#2563eb':first?'#bfdbfe':'#fff';c.fill();c.lineWidth=1.8/s;c.strokeStyle='#2563eb';c.stroke()};
 const hdl=n=>{for(const h of['i','o']){if(!(n[h+'x']||n[h+'y']))continue;const x=n.x+n[h+'x'],y=n.y+n[h+'y'];c.beginPath();c.moveTo(n.x,n.y);c.lineTo(x,y);c.lineWidth=1.3/s;c.strokeStyle='#2563eb';c.setLineDash([]);c.stroke();knob(x,y,false,false)}};
 if(tool==='pen'&&PD&&PD.N.length){const N=PD.N;c.globalAlpha=1;c.strokeStyle=$('#color').value;c.lineWidth=(SZ[$('#size').value]||3)/MK_S;c.lineCap=c.lineJoin='round';c.beginPath();pathTo(c,N,false);c.stroke();
  if(PD.hover&&!G&&PM==='add'){const l=N[N.length-1];c.setLineDash([4/s,3/s]);c.lineWidth=1/s;c.strokeStyle='#2563eb';c.beginPath();c.moveTo(l.x,l.y);c.bezierCurveTo(l.x+l.ox,l.y+l.oy,PD.hover.x,PD.hover.y,PD.hover.x,PD.hover.y);c.stroke();c.setLineDash([])}
  N.forEach(hdl);N.forEach((n,i)=>knob(n.x,n.y,true,i===PD.sel,i===0&&N.length>1))}
 const m=edItem();if(m&&m.page===page){const{N,closed}=nodesOf(m);if(NE.id!==m.id)NE={id:m.id,i:-1,mode:'sel',brk:NE.brk};
  c.setLineDash([]);c.globalAlpha=.45;c.lineWidth=1/s;c.strokeStyle='#60a5fa';c.beginPath();pathTo(c,N,closed);c.stroke();c.globalAlpha=1;
  N.forEach(hdl);N.forEach((n,i)=>knob(n.x,n.y,true,i===NE.i))}
 c.restore()};
// ---------- shapes -> editable points ----------
const SHP=new Set(['rect','rrect','ellipse','tri','poly','star','arc','cloud']);
function shapeNodes(m){const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1),K=.5523,nd=(px,py,ix=0,iy=0,ox=0,oy=0,k='c')=>({x:px,y:py,ix,iy,ox,oy,k});
 if(m.type==='rect')return{N:[nd(x,y),nd(x+w,y),nd(x+w,y+h),nd(x,y+h)],closed:true};
 if(m.type==='ellipse'){const a=w/2,b=h/2,cx=x+a,cy=y+b;return{N:[nd(cx,y,-a*K,0,a*K,0,'s'),nd(x+w,cy,0,-b*K,0,b*K,'s'),nd(cx,y+h,a*K,0,-a*K,0,'s'),nd(x,cy,0,b*K,0,-b*K,'s')],closed:true}}
 if(m.type==='arc'){const a=w/2,cx=x+a;return{N:[nd(x,y+h,0,0,0,-h*K),nd(cx,y,-a*K,0,a*K,0,'s'),nd(x+w,y+h,0,-h*K,0,0)],closed:false}}
 if(m.type==='rrect'){const r=Math.min(w,h)*.22,k=r*K;return{N:[nd(x+r,y,0,0,0,0),nd(x+w-r,y,0,0,k,0),nd(x+w,y+r,0,-k,0,0),nd(x+w,y+h-r,0,0,0,k),nd(x+w-r,y+h,k,0,0,0),nd(x+r,y+h,0,0,-k,0),nd(x,y+h-r,0,k,0,0),nd(x,y+r,0,0,0,-k)].map((n,i,A)=>i===0?{...n,ix:-k}:n),closed:true}}
 if(m.type==='cloud'){const s=view.s,r=Math.max(6/s,Math.min(w,h)/8,1),P=[],seg=(ax,ay,bx,by)=>{const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.round(L/(2*r)));for(let i=0;i<n;i++)P.push([ax+(bx-ax)*i/n,ay+(by-ay)*i/n])};
  seg(x,y,x+w,y);seg(x+w,y,x+w,y+h);seg(x+w,y+h,x,y+h);seg(x,y+h,x,y);const N=P.map(([px,py])=>nd(px,py));
  for(let i=0;i<N.length;i++){const a=N[i],b=N[(i+1)%N.length],L=Math.hypot(b.x-a.x,b.y-a.y),ang=Math.atan2(b.y-a.y,b.x-a.x),q=L/2*4/3,nx=Math.sin(ang)*q,ny=-Math.cos(ang)*q;a.ox=nx;a.oy=ny;b.ix=nx;b.iy=ny}return{N,closed:true}}
 return{N:shapePts(m).map(([px,py])=>nd(px,py)),closed:true}}
async function toPoints(id){const m=markups.find(x=>x.id===id);if(!m||!SHP.has(m.type))return;const b=structuredClone(m),o=structuredClone(m),{N,closed}=shapeNodes(m);delete o.n;writeNodes(o,N,closed,false);o.type='path';
 await change('markups',b,o);enterPoints(id);toast('Shape converted to points · drag points or handles')}
window.toPoints=toPoints;
// right after drawing a shape: offer Edit points / Resize
function shapeChip(id){let c=$('#shpChip');if(!c){c=ce('div');c.id='shpChip';stage.append(c)}clearTimeout(c._t);
 c.innerHTML=`<span class="pbH">Shape added</span><button type="button" class="btn pbB" id="scPts"><span class="pbI">◇</span><span class="pbL">Edit points</span></button><button type="button" class="btn pbB" id="scRs"><span class="pbI">⤡</span><span class="pbL">Resize</span></button><button type="button" class="btn pbB" id="scX" title="Close"><span class="pbI">✕</span><span class="pbL">Close</span></button>`;c.hidden=false;
 c.querySelector('#scPts').onclick=()=>{c.hidden=true;toPoints(id)};c.querySelector('#scRs').onclick=()=>{c.hidden=true;const sb=document.querySelector('[data-t=select]');if(sb)sb.click();const o=markups.find(x=>x.id===id);if(!o)return;sel={kind:'m',o};msel=[];setEdit(id)};c.querySelector('#scX').onclick=()=>{c.hidden=true;toastLift()};c._t=setTimeout(()=>{c.hidden=true;toastLift()},9000);toastLift()}
window.shapeChip=shapeChip;
{const _c2=change;change=async function(s,b,a,me){const r=await _c2.call(this,s,b,a,me);if(s==='markups'&&!b&&a&&SHP.has(a.type)&&tool===a.type)shapeChip(a.id);return r}}
stage.addEventListener('pointerdown',e=>{const c=$('#shpChip');if(c&&!c.hidden&&!c.contains(e.target))c.hidden=true},true);
// ---------- selection bar: node tools + text styles ----------
const _rsb=renderSelBar;renderSelBar=function(...a){_rsb.apply(this,a);setTimeout(penBar,0);const b=$('#selBar');if(!b||b.hidden)return;
 const one=tool==='select'&&selItems().length===1?selItems()[0]:null;if(one&&one.planId&&SHP.has(one.type)){const x=ce('button','btn');x.type='button';x.id='mkPts';x.title='Convert this shape to a path so its points can be edited';x.textContent='◇ Edit points';x.onclick=()=>toPoints(one.id);b.append(x)}
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
// ---------- bpm-v105: Freehand (✍) with live stabilization + Bezier fitting on release ----------
(()=>{const FK='bpm-fh-smooth';let SM=+(localStorage.getItem(FK)??60);if(!isFinite(SM))SM=60;window.fhSmooth=()=>SM;
 const lerp=(a,b,t)=>a+(b-a)*t;
 let F=null,FP=new Map(),fpinch=null; // F = active stroke {id,raw:[[sx,sy,t]],B:[[x,y]] brush (plan), bs:{x,y} brush screen, t0, moved}
 const ST2=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 const palm=e=>e.pointerType==='touch'&&(e.width>34||e.height>34);
 // bpm-v106: live input = coalesced pointer samples -> velocity-adaptive 1-euro filter (strong smoothing when slow, little lag when fast)
 // -> light lazy brush (kept short so tight turns are not cut). Smoothing slider drives the filter cutoff, brush radius, resample step, RDP tolerance.
 const t01=()=>.25+.75*SM/100;
 function oe(prev,x,dt,dx,mc,beta){const fc=mc+beta*Math.abs(dx),a=1/(1+1/(2*Math.PI*fc*dt));return prev+(x-prev)*a}
 function feed(s){const t=t01();F.raw.push([s.x,s.y,s.t||performance.now()]);F.fitN=null;const now=s.t||performance.now(),E=F.oe||(F.oe={x:s.x,y:s.y,dx:0,dy:0,t:now});let dt=Math.max(1,now-E.t)/1000;if(dt>0.1)dt=0.1;
  const mc=lerp(3.5,0.9,t),beta=lerp(.06,.012,t),ad=1/(1+1/(2*Math.PI*1.0*dt));const vx=(s.x-E.x)/dt,vy=(s.y-E.y)/dt;E.dx+=(vx-E.dx)*ad;E.dy+=(vy-E.dy)*ad;
  E.x=oe(E.x,s.x,dt,E.dx,mc,beta);E.y=oe(E.y,s.y,dt,E.dy,mc,beta);E.t=now;
  // short lazy brush on top (only removes hand tremor; radius well under a tight turn)
  const rad=lerp(.8,5,t),b=F.bs,dx=E.x-b.x,dy=E.y-b.y,d=Math.hypot(dx,dy);if(d>rad){b.x+=dx*(d-rad)/d;b.y+=dy*(d-rad)/d}
  const w=toW(b.x,b.y),L=F.B[F.B.length-1];if(!L||Math.hypot(w.x-L[0],w.y-L[1])*view.s>.8){F.B.push([w.x,w.y]);F.fitN=null}}
 function rdp(P,eps){if(P.length<3)return P.slice();let i0=0,dm=0;const[a,b]=[P[0],P[P.length-1]],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);
  for(let i=1;i<P.length-1;i++){const d=L?Math.abs(dx*(a[1]-P[i][1])-dy*(a[0]-P[i][0]))/L:Math.hypot(P[i][0]-a[0],P[i][1]-a[1]);if(d>dm){dm=d;i0=i}}return dm>eps?rdp(P.slice(0,i0+1),eps).slice(0,-1).concat(rdp(P.slice(i0),eps)):[a,b]}
 function resample(P,step){if(P.length<2)return P;const O=[P[0]];let acc=0;for(let i=1;i<P.length;i++){let[ax,ay]=P[i-1];const[bx,by]=P[i];let d=Math.hypot(bx-ax,by-ay);while(acc+d>=step){const k=(step-acc)/d;ax+=(bx-ax)*k;ay+=(by-ay)*k;O.push([ax,ay]);d=Math.hypot(bx-ax,by-ay);acc=0}acc+=d}const l=P[P.length-1],q=O[O.length-1];if(Math.hypot(l[0]-q[0],l[1]-q[1])>step*.3)O.push(l);else O[O.length-1]=l;return O}
 // intentional corners: turning angle over ±k samples above ~62° and a local maximum → kept sharp (segments are fitted separately, cusp node)
 function corners(P,step){const k=Math.max(2,Math.round(7/step*(1/view.s))||2),C=[],ang=new Array(P.length).fill(0);
  for(let i=k;i<P.length-k;i++){const a=P[i-k],b=P[i],c=P[i+k],v1x=b[0]-a[0],v1y=b[1]-a[1],v2x=c[0]-b[0],v2y=c[1]-b[1],l1=Math.hypot(v1x,v1y),l2=Math.hypot(v2x,v2y);if(!l1||!l2)continue;ang[i]=Math.acos(Math.max(-1,Math.min(1,(v1x*v2x+v1y*v2y)/(l1*l2))))}
  const th=lerp(52,70,t01())*Math.PI/180;for(let i=k;i<P.length-k;i++){if(ang[i]<th)continue;let mx=true;for(let j=i-k;j<=i+k;j++)if(ang[j]>ang[i]||(ang[j]===ang[i]&&j<i)){mx=false;break}if(mx&&(!C.length||i-C[C.length-1]>=k))C.push(i)}return C}
 const smoothSeg=(P,win,passes)=>{for(let p=0;p<passes;p++){P=P.map((q,i)=>{if(i===0||i===P.length-1)return q;const w=Math.min(win,i,P.length-1-i);let sx=0,sy=0,n=0;for(let j=i-w;j<=i+w;j++){sx+=P[j][0];sy+=P[j][1];n++}return[sx/n,sy/n]})}return P};
 // centripetal Catmull-Rom (alpha .5) → cubic Bezier handles: no overshoot / self-loops on uneven spacing
 function crHandles(K){const n=K.length,N=K.map(([x,y])=>({x,y,ix:0,iy:0,ox:0,oy:0,k:'s'}));if(n<2)return N;
  const G=i=>i<0?[2*K[0][0]-K[1][0],2*K[0][1]-K[1][1]]:i>=n?[2*K[n-1][0]-K[n-2][0],2*K[n-1][1]-K[n-2][1]]:K[i];
  for(let i=0;i<n-1;i++){const P0=G(i-1),P1=K[i],P2=K[i+1],P3=G(i+2),dd=(A,B)=>Math.max(1e-6,Math.pow(Math.hypot(B[0]-A[0],B[1]-A[1]),.5)),d1=dd(P0,P1),d2=dd(P1,P2),d3=dd(P2,P3);
   const b1=[0,1].map(j=>(d1*d1*P2[j]-d2*d2*P0[j]+(2*d1*d1+3*d1*d2+d2*d2)*P1[j])/(3*d1*(d1+d2))),b2=[0,1].map(j=>(d3*d3*P1[j]-d2*d2*P3[j]+(2*d3*d3+3*d3*d2+d2*d2)*P2[j])/(3*d3*(d3+d2)));
   N[i].ox=b1[0]-P1[0];N[i].oy=b1[1]-P1[1];N[i+1].ix=b2[0]-P2[0];N[i+1].iy=b2[1]-P2[1]}return N}
 // final + live fit, from the raw samples in screen px (zero-phase, so no lag at corners):
 // arc-length resample (speed carried along) -> corner split -> velocity-adaptive smoothing (1-euro idea: wide when slow = tremor, narrow when fast)
 // -> RDP (tolerance from the slider) -> centripetal Catmull-Rom Bezier. Nodes are converted to plan coords at the end.
 function resampleT(P,step){const O=[[P[0][0],P[0][1],0]];let acc=0;const sp=i=>{const a=P[Math.max(0,i-1)],b=P[i];const dt=Math.max(4,(b[2]||0)-(a[2]||0));return Math.hypot(b[0]-a[0],b[1]-a[1])/dt*1000};
  for(let i=1;i<P.length;i++){let ax=P[i-1][0],ay=P[i-1][1];const bx=P[i][0],by=P[i][1],v=sp(i);let d=Math.hypot(bx-ax,by-ay);if(i===1)O[0][2]=v;while(acc+d>=step){const k=(step-acc)/d;ax+=(bx-ax)*k;ay+=(by-ay)*k;O.push([ax,ay,v]);d=Math.hypot(bx-ax,by-ay);acc=0}acc+=d}
  const l=P[P.length-1],q=O[O.length-1];if(Math.hypot(l[0]-q[0],l[1]-q[1])>step*.3)O.push([l[0],l[1],q[2]]);else{q[0]=l[0];q[1]=l[1]}return O}
 function fitScreen(raw){const t=t01();if(raw.length<2)return null;const step=lerp(1.5,3,t);let P=resampleT(raw,step);if(P.length<2)return null;
  const C=corners(P,step*view.s),cuts=[0,...C,P.length-1],wslow=lerp(2,7,t)*lerp(2,5,t),eps=lerp(.6,3.2,t),out=[];
  for(let s=0;s<cuts.length-1;s++){let S=P.slice(cuts[s],cuts[s+1]+1);if(S.length<2)continue;
   for(let pass=0;pass<2;pass++)S=S.map((q,i)=>{if(i===0||i===S.length-1)return q;const w=Math.max(0,Math.round(wslow/(1+q[2]/600)/step));const h=Math.min(w,i,S.length-1-i);if(!h)return q;let sx=0,sy=0,sw=0;for(let j=i-h;j<=i+h;j++){const g=Math.exp(-2*((j-i)/(h+1))**2);sx+=S[j][0]*g;sy+=S[j][1]*g;sw+=g}return[sx/sw,sy/sw,q[2]]});
   const vm=S.reduce((a,q)=>a+q[2],0)/S.length;let K=rdp(S.map(q=>[q[0],q[1]]),eps*(1+Math.min(1.5,vm/1500)));if(K.length<2)K=[[S[0][0],S[0][1]],[S[S.length-1][0],S[S.length-1][1]]];const N=crHandles(K);
   if(out.length){const L=out[out.length-1];L.ox=N[0].ox;L.oy=N[0].oy;L.k='c';N.shift()}out.push(...N)}
  if(!out.length)return null;out[0].k=out[out.length-1].k='c';
  return out.map(n=>{const p=toW(n.x,n.y),i=toW(n.x+n.ix,n.y+n.iy),o=toW(n.x+n.ox,n.y+n.oy);return{x:p.x,y:p.y,ix:i.x-p.x,iy:i.y-p.y,ox:o.x-p.x,oy:o.y-p.y,k:n.k}})}
 function fit(B){if(!B||B.length<2)return null;const S=B.map(([x,y],i)=>{const s=toS(x,y);return[s.x,s.y,i*16]});return fitScreen(S)}
 // the live preview draws the same fit as the final stroke (cached per brush length)
 function liveNodes(){if(!F)return null;if(F.fitN&&F.fitL===F.raw.length&&F.fitV===view)return F.fitN;F.fitN=fitScreen(F.raw);F.fitL=F.raw.length;F.fitV=view;return F.fitN}
 window.FH_API={fit,fitScreen,rdp,resample,corners};
 async function finish(){const S=F;F=null;requestDraw(false);if(!S)return;if(S.B.length<2||!S.moved)return;
  const N=fitScreen(S.raw);if(!N)return;
  const m={id:uid(),planId:plan.id,page,type:'path',fh:1,color:$('#color').value,w:SZ[$('#size').value]||3,opacity:toolOp(false)};PEN_API.writeNodes(m,N,false,false);m.type='path';
  window.fhLast={raw:S.raw.map(([x,y])=>{const q=toW(x,y);return[q.x,q.y]}),stab:S.B.slice(),nodes:N.length,id:m.id};await change('markups',null,m)}
 const startPinch=()=>{const[a,b]=[...FP.values()];fpinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}}};
 stage.addEventListener('pointerdown',e=>{if(tool!=='free'||!plan||e.button>0||!(e.target===cv||e.target===ov))return;if(e.isPrimary&&FP.size){FP.clear();fpinch=null;F=null}e.stopImmediatePropagation();e.preventDefault();
  if(palm(e))return; // palm / large contact: ignored
  if(F&&F.pt==='pen'&&e.pointerType==='touch')return; // stylus drawing: touches are palms
  if(FP.size>=2)return; // third finger etc.: ignored
  const s=ST2(e);
  if(FP.size===1){ // second finger: early -> two-finger pan/zoom (stroke discarded); late -> resting palm, ignored
   if(F&&(F.moved>24||performance.now()-F.t0>350))return;F=null;FP.set(e.pointerId,s);startPinch();requestDraw(false);return}
  FP.set(e.pointerId,s);stage.setPointerCapture?.(e.pointerId);F={pid:e.pointerId,pt:e.pointerType,raw:[[s.x,s.y,performance.now()]],bs:{x:s.x,y:s.y},B:[[toW(s.x,s.y).x,toW(s.x,s.y).y]],t0:performance.now(),moved:0,s0:s}},true);
 stage.addEventListener('pointermove',e=>{if(tool!=='free'||!FP.has(e.pointerId))return;e.stopImmediatePropagation();const s=ST2(e);FP.set(e.pointerId,s);
  if(fpinch&&FP.size>=2){const[a,b]=[...FP.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=fpinch,sc=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s:sc,x:c.x-wx*sc,y:c.y-wy*sc};fastView();return}
  if(!F||F.pid!==e.pointerId)return;const ev=e.getCoalescedEvents?e.getCoalescedEvents():[];for(const c of(ev.length?ev:[e])){const q=ST2(c);q.t=c.timeStamp;F.moved=Math.max(F.moved,Math.hypot(q.x-F.s0.x,q.y-F.s0.y));feed(q)}requestDraw(false)},true);
 const fup=e=>{if(tool!=='free'&&!FP.has(e.pointerId))return;if(!FP.has(e.pointerId))return;e.stopImmediatePropagation();FP.delete(e.pointerId);
  if(fpinch){if(FP.size<2)fpinch=null;if(!FP.size)drawBase&&requestDraw(true);return}if(F&&F.pid===e.pointerId)finish()};
 stage.addEventListener('pointerup',fup,true);stage.addEventListener('pointercancel',e=>{if(F&&F.pid===e.pointerId){F=null;requestDraw(false)}fup(e)},true);
 const _o=drawOverlay0;drawOverlay0=function(){_o();if(!F||F.B.length<2||!plan)return;const c=octx;c.save();setT(c);c.globalAlpha=toolOp(false);c.strokeStyle=$('#color').value;c.lineWidth=(SZ[$('#size').value]||3)/MK_S;c.lineCap=c.lineJoin='round';
  const ls=window.lineStyle?lineStyle():'solid',lw=c.lineWidth;if(ls==='dash')c.setLineDash([lw*3.2,lw*2.2]);else if(ls==='dot')c.setLineDash([.01,lw*2.2]);
  const N=liveNodes();if(!N||N.length<2){c.restore();return}c.beginPath();c.moveTo(N[0].x,N[0].y);for(let i=1;i<N.length;i++){const p=N[i-1],q=N[i];c.bezierCurveTo(p.x+p.ox,p.y+p.oy,q.x+q.ix,q.y+q.iy,q.x,q.y)}c.stroke();c.restore()};
 // options bar: labeled Smoothing slider (Light .. Strong), remembered
 function fhBar(){let b=$('#fhBar');if(!b){b=document.createElement('div');b.id='fhBar';stage.append(b)}if(tool!=='free'){b.hidden=true;setTimeout(toastLift,0);return}b.hidden=false;
  b.innerHTML=`<span class="pbH">✍ Freehand</span><label class="fhL" for="fhSm">Smoothing</label><span class="fhE">Light</span><input type="range" id="fhSm" min="0" max="100" step="5" value="${SM}" aria-label="Smoothing, light to strong"><span class="fhE">Strong</span><b id="fhV">${SM}</b>`;
  setTimeout(toastLift,0);const r=b.querySelector('#fhSm');r.oninput=()=>{SM=+r.value;localStorage.setItem(FK,String(SM));b.querySelector('#fhV').textContent=SM}}
 window.fhBar=fhBar;document.querySelectorAll('[data-t]').forEach(x=>x.addEventListener('click',()=>{if(F&&x.dataset.t!=='free'){F=null}setTimeout(fhBar,0)}));
})();
