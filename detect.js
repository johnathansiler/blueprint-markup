'use strict';
// Detect devices worker: plain-geometry multi-shape matcher (port of /workspace/detect/match.py).
// Input: a reduced pdf.js operator list for one page + viewport transform. Output: [{type,x,y}] in viewport (scale 1) coords.
const hyp=Math.hypot,dist=(a,b)=>hyp(a[0]-b[0],a[1]-b[1]);
function walk(fn,args,O,vt){const out=[];let ctm=vt.slice(),st=[],stroke=[0,0,0],fill=[0,0,0],segs=[],cur=null,start=null;
 const ap=(x,y)=>[ctm[0]*x+ctm[2]*y+ctm[4],ctm[1]*x+ctm[3]*y+ctm[5]];
 const mul=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
 const col=a=>{if(typeof a[0]==='string'){const h=a[0].replace('#','');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]}return[a[0]/255,a[1]/255,a[2]/255]};
 const close=()=>{if(cur&&start&&dist(cur,start)>1e-6)segs.push({t:'l',p:[cur,start]});cur=start};
 const paint=(s,f)=>{if(segs.length){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const g of segs)for(const p of g.p){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]}
  out.push({segs,color:s?stroke:null,fill:f?fill:null,x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2,k:segs.map(g=>g.t).join('')})}segs=[];cur=start=null};
 for(let i=0;i<fn.length;i++){const f=fn[i],a=args[i];
  if(f===O.save)st.push([ctm,stroke,fill]);else if(f===O.restore){const s=st.pop();if(s)[ctm,stroke,fill]=s}
  else if(f===O.transform)ctm=mul(ctm,a);
  else if(f===O.paintFormXObjectBegin){st.push([ctm,stroke,fill]);if(a&&a[0])ctm=mul(ctm,a[0])}else if(f===O.paintFormXObjectEnd){const s=st.pop();if(s)[ctm,stroke,fill]=s}
  else if(f===O.setStrokeRGBColor)stroke=col(a);else if(f===O.setFillRGBColor)fill=col(a);
  else if(f===O.setStrokeColorN)stroke=null;else if(f===O.setFillColorN)fill=null;
  else if(f===O.constructPath){const ops=a[0],c=a[1];let j=0;
   for(const op of ops){
    if(op===O.moveTo){cur=start=ap(c[j],c[j+1]);j+=2}
    else if(op===O.lineTo){const p=ap(c[j],c[j+1]);j+=2;if(cur)segs.push({t:'l',p:[cur,p]});cur=p}
    else if(op===O.curveTo){const p1=ap(c[j],c[j+1]),p2=ap(c[j+2],c[j+3]),p=ap(c[j+4],c[j+5]);j+=6;if(cur)segs.push({t:'c',p:[cur,p1,p2,p]});cur=p}
    else if(op===O.curveTo2){const p2=ap(c[j],c[j+1]),p=ap(c[j+2],c[j+3]);j+=4;if(cur)segs.push({t:'c',p:[cur,cur,p2,p]});cur=p}
    else if(op===O.curveTo3){const p1=ap(c[j],c[j+1]),p=ap(c[j+2],c[j+3]);j+=4;if(cur)segs.push({t:'c',p:[cur,p1,p,p]});cur=p}
    else if(op===O.closePath)close();
    else if(op===O.rectangle){const x=c[j],y=c[j+1],w=c[j+2],h=c[j+3];j+=4;const q=[ap(x,y),ap(x+w,y),ap(x+w,y+h),ap(x,y+h)];for(let k=0;k<4;k++)segs.push({t:'l',p:[q[k],q[(k+1)%4]]});cur=start=q[0]}}}
  else if(f===O.stroke)paint(1,0);else if(f===O.closeStroke){close();paint(1,0)}
  else if(f===O.fill||f===O.eoFill)paint(0,1);else if(f===O.fillStroke||f===O.eoFillStroke)paint(1,1);
  else if(f===O.closeFillStroke||f===O.closeEOFillStroke){close();paint(1,1)}else if(f===O.endPath){segs=[];cur=start=null}}
 return out}
const dark=g=>{const c=g.color||g.fill;return!!c&&Math.max(...c)<=.3};
// bpm-v126: EOL size only. Short side under 11k (was 10.5k). Long side also under 23 pt so a legend-sized box (~27 pt) is not pinned. Pin center/size/rotation stay in geom().
function eolrSize(mn,mx,k){return mn>=7*k&&mn<11*k&&mx>=14*k&&mx<19*k&&mx<23&&mx/mn>1.45&&mx/mn<2.6}
// Letter O in its own frame is tall (~3.6 x 7.6, ratio ~0.48), not round. Reject a hairline and a near-circle.
function oLetterOk(w,h){const mx=Math.max(w,h),mn=Math.min(w,h);if(!(mx>=2&&mx<=16&&mn>=1.2))return false;const r=mn/mx;return r>=0.28&&r<=0.8}
function frameExt(path,box,k){const pp=poly(box,.6*k);if(!pp||pp.length<3)return null;let bi=0,bl=0;for(let i=0;i<pp.length;i++){const L=dist(pp[i],pp[(i+1)%pp.length]);if(L>bl){bl=L;bi=i}}
 const p=pp[bi],q=pp[(bi+1)%pp.length],a=Math.atan2(q[1]-p[1],q[0]-p[0]),c=Math.cos(-a),s=Math.sin(-a);let X0=1e9,X1=-1e9,Y0=1e9,Y1=-1e9;
 for(const seg of path.segs)for(const pt of seg.p){const u=pt[0]*c-pt[1]*s,v=pt[0]*s+pt[1]*c;if(u<X0)X0=u;if(u>X1)X1=u;if(v<Y0)Y0=v;if(v>Y1)Y1=v}
 return{w:X1-X0,h:Y1-Y0}}
function oIsEolLetter(O,box,k){if(!O||O.segs.length<16||O.segs.length>24)return false;const f=O.segs[0].p[0],Ls=O.segs[O.segs.length-1].p,e=Ls[Ls.length-1];if(dist(f,e)>=.6*k)return false;const ex=frameExt(O,box,k);return !!ex&&oLetterOk(ex.w,ex.h)}
// bpm-v126: vector status labels. Two 9-seg parens, letter strokes between them. Segment-count signature → status. Type only; no geometry.
const STATUS_SIG={'1,1,2':'E','1,1,1,2,10':'ER','1,1,1,1,2,3':'ETN','3':'N'};
function statusFromSig(sig){return STATUS_SIG[sig]||null}
function sigBetween(L,R,P){const x0=Math.min(L.cx,R.cx),x1=Math.max(L.cx,R.cx),y=(L.cy+R.cy)/2,h=Math.max(L.h,R.h),gap=x1-x0,counts=[];
 for(const g of P){if(g===L||g===R||g.fill!=null||!dark(g))continue;if(!(g.cx>x0&&g.cx<x1))continue;if(Math.abs(g.cy-y)>h*0.85)continue;if(g.w>gap*1.05||g.h>h*1.6)continue;counts.push(g.segs.length)}
 counts.sort((a,b)=>a-b);return counts.join(',')}
function statusLabels(P){const par=[];for(const g of P){if(g.fill!=null||!dark(g)||g.segs.length!==9)continue;if(g.h<4.5||g.h>9.6||g.w<0.3)continue;par.push(g)}
 par.sort((a,b)=>a.cx-b.cx||a.cy-b.cy);const used=new Set(),out=[];
 for(let i=0;i<par.length;i++){const L=par[i];if(used.has(L))continue;let best=null;
  for(let j=i+1;j<par.length;j++){const R=par[j];if(used.has(R))continue;const dx=R.cx-L.cx;if(dx<3||dx>48)continue;const h=Math.max(L.h,R.h);if(Math.abs(R.cy-L.cy)>h*0.55||Math.abs(R.h-L.h)>h*0.3)continue;const sig=sigBetween(L,R,P),st=statusFromSig(sig);if(!st)continue;best={R,st,sig};break}
  if(!best)continue;used.add(L);used.add(best.R);out.push({status:best.st,sig:best.sig,x:(L.cx+best.R.cx)/2,y:(L.cy+best.R.cy)/2})}
 return out}
function poly(g,tol){if(!/^l+$/.test(g.k))return null;const pts=[g.segs[0].p[0]].concat(g.segs.map(s=>s.p[1]));if(dist(pts[0],pts[pts.length-1])>tol)return null;return pts.slice(0,-1)}
const sides=p=>p.map((a,i)=>dist(a,p[(i+1)%p.length]));
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0))/2;
// symbol scale: median side of dark near-square 4-gons (the reference symbols are ~13 pt on the sample plan)
function scaleOf(G){const s=[];for(const g of G){const p=poly(g,1);if(!p||p.length!==4)continue;const sd=sides(p),mx=Math.max(...sd),mn=Math.min(...sd);if(mn<4||mx>60||mx/mn>1.15)continue;const a=area(p);if(Math.abs(a-mn*mx)/a>.12)continue;s.push((mx+mn)/2)}
 if(s.length<5){/* bpm-v108: few squares on the sheet (FL-00132): also measure regular hexagons (smoke / module / relay, ~15 at k=1) */const q=s.map(v=>v/13);for(const g of G){const p=poly(g,1);if(!p||p.length!==6)continue;const sd=sides(p),mx=Math.max(...sd),mn=Math.min(...sd);if(mn<2.5||mx/mn>1.2)continue;const D=Math.max(g.w,g.h);if(D<8||D>60)continue;q.push(D/15)}
  if(q.length<3){self.KF=1;return self.K0||1}q.sort((a,b)=>a-b);return q[q.length>>1]}/* bpm-v111: no scale evidence on this sheet → the scale measured on an earlier sheet of the same plan (FL-00132 p5) */
 s.sort((a,b)=>a-b);return s[s.length>>1]/13}
// v45/v46: true size + rotation from polygon; pin center = OBB center of outline (not upright AABB mid)
function geom(pp,sk){if(!pp||pp.length<3)return null;const n=pp.length,cx0=pp.reduce((s,p)=>s+p[0],0)/n,cy0=pp.reduce((s,p)=>s+p[1],0)/n;let a=0;
 if(sk==='diamond'){let bi=0,bd=0;for(let i=0;i<2;i++){const D=dist(pp[i],pp[i+2]);if(D>bd){bd=D;bi=i}}const p=pp[bi],q=pp[bi+2];a=Math.atan2(q[1]-p[1],q[0]-p[0])}
 else{let bi=0,bl=0;for(let i=0;i<n;i++){const L=dist(pp[i],pp[(i+1)%n]);if(L>bl){bl=L;bi=i}}const p=pp[bi],q=pp[(bi+1)%n];a=Math.atan2(q[1]-p[1],q[0]-p[0])}
 const per=sk==='hex'?Math.PI/3:(sk==='square'||sk==='sq_big')?Math.PI/2:Math.PI;const w=x=>{x=((x%per)+per)%per;return x>per/2?x-per:x};a=w(a);
 const c=Math.cos(-a),s=Math.sin(-a);let X0=1e9,X1=-1e9,Y0=1e9,Y1=-1e9;for(const p of pp){const dx=p[0]-cx0,dy=p[1]-cy0,u=dx*c-dy*s,v=dx*s+dy*c;X0=Math.min(X0,u);X1=Math.max(X1,u);Y0=Math.min(Y0,v);Y1=Math.max(Y1,v)}
 let bw=X1-X0,bh=Y1-Y0;if(sk==='square'||sk==='sq_big'){const m=sides(pp).reduce((x,y)=>x+y,0)/4;bw=bh=m}
 const mx=(X0+X1)/2,my=(Y0+Y1)/2,cx=cx0+Math.cos(a)*mx-Math.sin(a)*my,cy=cy0+Math.sin(a)*mx+Math.cos(a)*my;
 if(Math.abs(a)<.02)a=0;return{bw,bh,ang:a,cx,cy}}
function shape(g,k){if(g.k==='cccc')return Math.abs(g.w-g.h)<1*k?'circle':null;const pts=poly(g,.6*k);if(!pts)return null;
 const s=sides(pts),n=pts.length,A=area(pts),mx=Math.max(...s),mn=Math.min(...s),K2=k*k;
 if(n===4){if(mn>=11.5*k&&mx<=14.5*k&&A>155*K2)return'square';if(mn>=10.3*k&&mn<11.5*k&&mx<=12.5*k&&mx/mn<1.1)return'sqs';/* bpm-v108: slightly small square — a speaker/strobe only when it holds the strobe disc AND has the speaker cone beside it */if(mn>12*k&&mx<17*k&&A<160*K2)return'diamond';if(mn>14.5*k&&mx<=16.5*k&&mx/mn<1.1&&A>200*K2)return'sqp';/* bpm-v111: a bit larger square, any angle — only a "PB" pull box (FL-00139, drawn rotated on the wire) */if(mn>5.5*k&&mn<8.5*k&&mx>12*k&&mx<16*k)return'rect_small';if(eolrSize(mn,mx,k))return'eolr';/* bpm-v108/v126: EOL resistor box */
  // FACP/DACT/annunciator-style labeled boxes on the legend (wide shallow rectangles)
  if(mx>=22*k&&mx<=90*k&&mn>=8*k&&mn<=30*k&&mx>=mn*1.55&&A>180*K2)return'panel_rect';
  // large square with lettering (e.g. "SS" transient voltage surge suppressor)
  if(mn>=16*k&&mx<=26*k&&mx/mn<1.15&&A>250*K2)return'sq_big'}
 if(n===6&&Math.max(g.w,g.h)>=11*k&&Math.max(g.w,g.h)<=17*k&&A>100*K2)return'hex';
 if(n===3&&mx>=8.5*k&&mx<=12.5*k&&mn>7*k)return'tri';return null}
function detect(P,W,H,want){const TB=W>H?W*.825:W;let G=P.filter(g=>dark(g)&&g.x0<TB);self.KF=0;const k=scaleOf(G);
  const ctr=g=>[g.cx,g.cy],prim=[];for(const g of G){const s=shape(g,k);if(s)prim.push([s,g])}
 const tris=prim.filter(p=>p[0]==='tri').map(p=>[p[1],p[1].fill!=null]),circles=prim.filter(p=>p[0]==='circle').map(p=>p[1]),lines=G.filter(g=>g.k==='l');
 // grid index for neighbourhood queries
 const CS=40*k,grid=new Map(),key=(x,y)=>Math.floor(x/CS)+','+Math.floor(y/CS);for(const g of G){const q=key(g.cx,g.cy);let a=grid.get(q);if(!a)grid.set(q,a=[]);a.push(g)}
 const near=(c,r)=>{const o=[];const x0=Math.floor((c[0]-r)/CS),x1=Math.floor((c[0]+r)/CS),y0=Math.floor((c[1]-r)/CS),y1=Math.floor((c[1]+r)/CS);for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const a=grid.get(x+','+y);if(a)for(const g of a)if(dist([g.cx,g.cy],c)<r)o.push(g)}return o};
 const out=[];
 for(let[sk,g]of prim){if(!['square','hex','diamond','rect_small','panel_rect','sq_big','sqs','eolr','sqp'].includes(sk))continue;const c=ctr(g),R=sk==='sq_big'||sk==='eolr'?Math.max(g.w,g.h)/2:(sk!=='rect_small'?7:7.5)*k;
  const ins=near(c,R*.8).filter(h=>h!==g&&Math.max(h.w,h.h)<R*1.6);
  const glyph=ins.filter(h=>h.k!=='cccc'&&h.fill==null).map(h=>h.segs.length).sort((a,b)=>a-b);
  const filled=g.fill!=null||ins.some(h=>h.fill!=null&&Math.max(h.w,h.h)>4*k);
  const hasC=ins.some(h=>h.k==='cccc'&&h.w>4*k&&h.w<8*k);
  const tnear=tris.filter(([t])=>dist(ctr(t),c)<15*k);let t=null,stem=false;
  const inBox=()=>{const pp=poly(g,.6*k);if(!pp)return null;const pin=(x,y)=>{let o=false;for(let i=0,j=pp.length-1;i<pp.length;j=i++){const[xi,yi]=pp[i],[xj,yj]=pp[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)o=!o}return o};const ms=Math.min(...sides(pp));return near(c,Math.max(g.w,g.h)/2+1).filter(h=>h!==g&&h.fill==null&&h.k!=='cccc'&&Math.max(h.w,h.h)<ms*.75&&pin(h.cx,h.cy)).map(h=>h.segs.length).sort((x,y)=>x-y).join(',')};
  if(sk==='sqp'){if(glyph.join(',')!=='10,18')continue;sk='square'}
  if(sk==='sqs'){/* bpm-v109: or a plain speaker: small empty square with the cone beside it (FL-00090) */if(!(tnear.length&&(hasC||!ins.some(h=>h.fill==null&&h.k!=='cccc'))))continue;sk='square'}
  if(sk==='square'){
   if(hasC||tnear.length){t=tnear.some(x=>x[1])?'SPK_BOH':'SPK_FOH';
    // Horn/strobe: strobe disc in square, no speaker triangle, with short radial ticks (legend horn symbol)
    if(hasC&&!tnear.length){const rays=near(c,11*k).filter(h=>{if(h.k!=='l')return false;const[a,b]=h.segs[0].p,L=dist(a,b);return L>2*k&&L<8*k&&dist([h.cx,h.cy],c)>2.5*k}).length;
     if(rays>=3)t=filled?'HORN_BOH':'HORN_FOH'}
    if(t.startsWith('SPK')){if(!hasC&&!glyph.length)t='LINE_ARRAY';
    else{const tc=tnear.length?ctr(tnear[0][0]):null;
     for(const h of near(c,20*k)){if(h.k!=='l')continue;const[a,b]=h.segs[0].p,L=dist(a,b);if(!(L>2.5*k&&L<11*k))continue;
      for(const[e,o]of[[a,b],[b,a]])if(dist(e,c)>6*k&&dist(e,c)<10.5*k&&dist(o,c)>dist(e,c)+2*k&&(!tc||dist(o,tc)>dist(o,c)))stem=true}
     t+=stem?'_WALL':'_CEIL'}}
   }else if(!glyph.length){/* bpm-v127: 120 VAC bell = empty square with a tangent circle beside it (legend FL-00144). Pin = the square, same geom() */const pp=poly(g,.6*k),sd=pp?sides(pp).reduce((x,y)=>x+y,0)/pp.length:0;
    t=!filled&&sd&&circles.some(q=>{const d=q.w,D=dist(ctr(q),c);return q.fill==null&&d>8*k&&d<22*k&&sd>=.95*d&&sd<=1.45*d&&D>=.85*d&&D<=1.3*d})?'BELL':null}
   else{const gs=glyph.join(',');if(glyph.join(',')==='10,18')t='PULLBOX';/* bpm-v108: "PB" electrical pull box (P 10, B 18) */else if(glyph.length===2&&glyph[0]>=4)t='SURGE';else if(['1,2','1,1,1','1,3','2,2'].includes(gs)||(glyph.length===2&&glyph.includes(1)&&Math.max(...glyph)<=3))t='PULL';else if(glyph.length===1&&glyph[0]>=4)t='JBOX';else if(glyph.length===2)t='SURGE';else t=null}}
  else if(sk==='hex'){if(filled||!glyph.length||(glyph.length>=6&&Math.max(...glyph)===1))t='RELAY';else if(glyph.length===1){t='SMOKE';
    // v22 duct detector (legend: "SMOKE DETECTOR w/ AIR DUCT HOUSING"): hex+S with a short radial stem off the hex edge ending in >=2 tiny tick strokes (the duct housing)
    const ls=near(c,18*k).filter(h=>h.k==='l'&&!ins.includes(h)),L=h=>dist(h.segs[0].p[0],h.segs[0].p[1]);
    const ds=ls.find(h=>{const[a,b]=h.segs[0].p,l=L(h);if(l<2.5*k||l>6.5*k)return false;const[e,o]=dist(a,c)<dist(b,c)?[a,b]:[b,a];return dist(e,c)>5.5*k&&dist(e,c)<9*k&&dist(o,c)>dist(e,c)+2*k});
    if(ds){const tip=dist(ds.segs[0].p[0],c)>dist(ds.segs[0].p[1],c)?ds.segs[0].p[0]:ds.segs[0].p[1];
     const ticks=ls.filter(h=>h!==ds&&L(h)>1*k&&L(h)<3.5*k&&dist([h.cx,h.cy],tip)<7*k&&dist([h.cx,h.cy],c)>dist(tip,c)-2*k).length;if(ticks>=2)t='DUCT'}}else if(glyph.join(',')==='1,1,1'&&(()=>{/* bpm-v108: heat detector = hex + "H" (two parallel strokes and a shorter cross bar between them) */const st=ins.filter(h=>h.k==='l'&&h.fill==null).map(h=>{const[p,q]=h.segs[0].p;return{a:Math.atan2(q[1]-p[1],q[0]-p[0]),L:dist(p,q),c:[h.cx,h.cy]}});if(st.length!==3)return false;
     const par=(x,y)=>{let d=Math.abs(x.a-y.a)%Math.PI;d=Math.min(d,Math.PI-d);return d};for(let i2=0;i2<3;i2++){const[x,y]=st.filter((_,j2)=>j2!==i2),z=st[i2];if(par(x,y)<.26&&Math.abs(x.L-y.L)<.25*Math.max(x.L,y.L)&&par(x,z)>1.2&&z.L<Math.max(x.L,y.L)*1.05&&dist(z.c,[(x.c[0]+y.c[0])/2,(x.c[1]+y.c[1])/2])<.3*x.L)return true}return false})())t='HEAT';else t='MODULE'}
  else if(sk==='diamond'){
   // Legend: FS (waterflow) vs TS (tamper). Glyph bags from this plan family often look like 1,2,19 (FS) vs 1,1,19 (TS).
   const gs=glyph.join(',');
   // v19: "SS" surge square (axis-aligned, ~13pt) can pass the diamond size test; two big S glyphs and no single strokes = surge
   if(glyph.length===2&&glyph.every(x=>x>=4))t='SURGE';else
   if(glyph.includes(12)&&glyph.includes(19)&&glyph.includes(2))t='DAMPER';/* bpm-v108: "FSD" fire/smoke damper diamond (F 1+2, S 19, D 12) */else
   if(gs==='19,19,20')t='OSS';/* bpm-v127: "OSS" operator safety switch box (O 20, S 19, S 19; legend FL-00144/149). "SS" surge = 19,19 has no O */else
   if(gs==='1,2,10,18')t='BFP';/* bpm-v127: "BFP" sprinkler backflow preventer rhombus (B 18, F 1+2, P 10; legend FL-00101) */else
   if(gs==='1,1,19'||gs==='1,1'||gs.startsWith('1,1,'))t='TAMPER';
   else if(gs==='1,2,19'||gs==='1,2'||gs.startsWith('1,2,'))t='FLOW';
   else if(glyph.includes(2))t='FLOW';else t='TAMPER';
  }else if(sk==='rect_small')t=ins.length>=2?'DOOR_HOLDER':null;
  else if(sk==='sq_big'){const gl=ins.filter(h=>h.fill==null&&h.k!=='cccc'&&Math.max(h.w,h.h)<R*1.2);t=gl.length===2&&gl.every(h=>h.segs.length>=4)?'SURGE':null}
  else if(sk==='eolr'){/* bpm-v108/v126: "EOL" lettering. The O is a closed ~20-seg path; its extents are taken in the box frame, not the page-aligned bbox */const big=ins.filter(h=>h.fill==null&&h.segs.length>=12),sm=ins.filter(h=>h.fill==null&&h.segs.length<=3),mid=ins.filter(h=>h.fill==null&&h.segs.length>3&&h.segs.length<12),O0=big[0],cl=O0&&oIsEolLetter(O0,g,k);t=big.length===1&&cl&&!mid.length&&sm.length>=2&&sm.length<=6&&dist([O0.cx,O0.cy],c)<3*k?'EOL':inBox()==='1,1,2,2,10'?'VESDA':inBox()==='1,2,3,17'?'PAD':null}/* "NAC" = PAD-4/PAD-5 NAC extender (legend FL-00149) *//* bpm-v108: a short "VEP" VESDA detector box has this size too */
  else if(sk==='panel_rect'){const gl=glyph.length,ar=Math.max(g.w,g.h)/Math.max(1e-3,Math.min(g.w,g.h));
   // FATC often shorter label; FACP/DACT longer — text refine in app overrides when labels exist as paths only
   // v18: classify by the lettering inside the box (glyph segment signature), checked against the fa.pdf legend:
   //  FACP → a 10-seg glyph (P bowl), DACT → a 12-seg glyph (D), FATC → ≥4 single-seg strokes (T,T,F bars) and no 10/12
   const ones=glyph.filter(x=>x===1).length;
   // bpm-v106: a box holding terminal screws (small full circles) is a wiring-detail terminal strip, not a panel (FL-00114 p7)
   const inB=inBox();
   /* bpm-v108: "VEP" VESDA detector box: the same lettering as a clipped "FACP", so the whole box inside must hold only V, E, P (no C) */
   const VS=(glyph.join(',')==='1,1,2,2,10'&&inB==='1,1,2,2,10')?'VESDA':{'2,10,19':'VPSU','1,1,1,2,2,10':'VREM','1,2,3':'VNET','2,17,20':'LOC','10,17,20':'DACT','1,1,1,12':'DOOR_HOLDER','1,2,3,17':'PAD','1,1,1,2,10,10':'FARP','1,1,1,2,2,2,10':'FARP'}[glyph.join(',')];/* bpm-v111: "FARP" lettering (R and P bowls, no C arc) beats the FACP fallback — FL-00132 p4, FL-00149 legend *//* bpm-v108: VESDA / LOC / communicator boxes by their lettering (VPS, VRE, VNI, LOC, DACT — legend-checked on FL-00144/149) */
   if(VS)t=VS;else if(near(c,Math.max(g.w,g.h)/2+1).some(h=>h!==g&&h.k==='cccc'&&h.w>1.5*k&&h.w<Math.min(g.w,g.h)*.95&&Math.abs(h.cx-c[0])<g.w/2&&Math.abs(h.cy-c[1])<g.h/2))t=null;else if(gl<3)t='PANEL_BOX';else if(glyph.includes(12))t='DACT';else if(glyph.includes(10))t='FACP';else if(ones>=4)t='FATC';else t='PANEL_BOX'}
  if(t){const pp=poly(g,.6*k),sz=pp?Math.sqrt(area(pp))/k:Math.max(g.w,g.h)/k;const skG=((t==='SURGE'||t==='OSS')&&sk==='diamond')?'square':sk/* bpm-v50: upright SS square can pass diamond test; measure as square, not 45° diagonals */,G2=(sk==='eolr'||sk==='panel_rect'||sk==='rect_small'||sk==='square'||sk==='sq_big'||sk==='diamond'||sk==='hex')?geom(pp,skG):null;out.push({type:t,c:G2?[G2.cx,G2.cy]:c,...(G2?{bw:G2.bw,bh:G2.bh,ang:G2.ang}:{...(sk==='panel_rect'||sk==='rect_small'||sk==='square'||sk==='sq_big'||sk==='diamond'||sk==='hex'?{bw:g.w,bh:g.h}:{})}),fp:{s:sk,gl:glyph.join(','),v:[sz,hasC?1:0,tnear.length,tnear.some(x=>x[1])?1:0,stem?1:0,filled?1:0,ins.length/10]}})}}
 for(const g of circles)if(g.w>11.5*k&&g.w<14.5*k){const c=ctr(g);if(near(c,5*k).some(h=>h!==g&&Math.max(h.w,h.h)<9*k))out.push({type:'JBOX_CEIL',c,fp:{s:'circle',gl:String(near(c,5*k).filter(h=>h!==g&&Math.max(h.w,h.h)<9*k).length),v:[g.w/k,0,0,0,0,g.fill!=null?1:0,0]}})}
 const sq=out.filter(o=>o.type.startsWith('SPK'));
 for(const g of circles){const w=g.w;if(!(w>5*k&&w<11*k))continue;const c=ctr(g);if(sq.some(o=>dist(c,o.c)<8*k))continue;
  const rad=near(c,w*.5+6*k).filter(h=>h.k==='l'&&dist(ctr(h),c)>2*k&&Math.max(h.w,h.h)<7*k&&(()=>{/* bpm-v108: strobe rays point at the disc; lettering strokes beside a pipe-riser circle do not */const[a,b]=h.segs[0].p,vx=b[0]-a[0],vy=b[1]-a[1],ux=h.cx-c[0],uy=h.cy-c[1],L=Math.hypot(vx,vy)*Math.hypot(ux,uy);return L<1e-6||Math.abs(vx*ux+vy*uy)/L>.82})());
  // v23 remote alarm indicator (legend RI, Siemens TSM-1X): filled disc + rays + vertical stem down from the disc to a horizontal base line
  if(rad.length>=3){const bot=c[1]+w/2,vs=near(c,w+16*k).find(h=>h.k==='l'&&h.w<1*k&&h.h>6*k&&Math.abs(h.cx-c[0])<1*k&&Math.abs(h.y0-bot)<2*k);
   if(vs&&(g.fill!=null||near(c,2*k).some(h=>h!==g&&h.fill!=null))&&near([c[0],vs.y1],3*k).some(h=>h.k==='l'&&h.h<1*k&&h.w>6*k&&Math.abs(h.cy-vs.y1)<1.5*k)
    // the same disc+stem is the plan's wall strobe; the RI symbol carries an "RI" path label up-right (R = ~10-seg glyph, I = vertical bar just right of it)
    &&near([c[0]+1.3*w,c[1]-.7*w],w).some(r=>r.segs.length>=8&&r.segs.length<=12&&/^l+$/.test(r.k)&&r.h>.35*w&&r.h<.8*w&&r.cx>c[0]+.7*w&&r.cy<c[1]&&near([r.x1+.3*w,r.cy],.6*w).some(i=>i.k==='l'&&i.w<.1*w&&Math.abs(i.h-r.h)<.15*w&&i.cx>r.x1&&i.cx<r.x1+.6*w))){out.push({type:'RAI',c,fp:{s:'rai',gl:'',v:[w/k,0,Math.min(rad.length,8)/4,0,1,1,0]}});continue}}
  if(rad.length>=3){const f=g.fill!=null||near(c,2*k).some(h=>h!==g&&h.fill!=null);out.push({type:f?'STROBE_BOH':'STROBE_FOH',c,fp:{s:'strobe',gl:'',v:[w/k,0,Math.min(rad.length,8)/4,0,0,f?1:0,0]}})}}
 // bpm-v108: VESDA pipe-network symbols are hatched outlines: circle = sampling point, triangle = capillary point, square = sampling tee (legend FL-00149)
 for(const g of G){const sz=Math.max(g.w,g.h);if(sz<6*k||sz>20*k||g.fill!=null)continue;let kind=null;
  if(g.k==='cccc'){if(Math.abs(g.w-g.h)<1*k)kind='VSP'}else if(g.k==='lll'){if(poly(g,.6*k))kind='VCAP'}else if(g.k==='llll'){const pp=poly(g,.6*k);if(pp){const sd=sides(pp);if(Math.max(...sd)/Math.min(...sd)<1.2)kind='VTEE'}}
  if(!kind)continue;const c=ctr(g),hs=near(c,sz*.6).filter(h=>h!==g&&h.k==='l'&&Math.max(h.w,h.h)<sz*1.05&&Math.abs(h.cx-c[0])<g.w/2&&Math.abs(h.cy-c[1])<g.h/2);if(hs.length<5)continue;
  const an=hs.map(h=>{const[a,b]=h.segs[0].p;const t=Math.atan2(b[1]-a[1],b[0]-a[0]);return((t%Math.PI)+Math.PI)%Math.PI}),md=an.slice().sort((x,y)=>x-y)[an.length>>1],par=an.filter(t=>{const d=Math.abs(t-md);return Math.min(d,Math.PI-d)<.09}).length;
  if(par<5||par<hs.length*.8)continue;out.push({type:kind,c,bw:g.w,bh:g.h,fp:{s:'hatch',gl:String(par),v:[sz/k,0,0,0,0,1,0]}})}
 const res=[];for(const o of out){const thr=(o.type==='FLOW'||o.type==='TAMPER'||o.type==='FACP'||o.type==='DACT'||o.type==='FATC'||o.type==='PANEL_BOX'?12:4)*k;
 if(res.some(r=>r.type===o.type&&dist(o.c,r.c)<thr))continue;res.push(o)}
 return{k,items:res.filter(o=>!want||want.includes(o.type)).map(o=>({type:o.type,x:o.c[0],y:o.c[1],fp:o.fp,bw:o.bw,bh:o.bh,ang:o.ang||undefined}))}}
// bpm-v103: probe mode for taught / master-legend matches: measure the printed outline at each probe with the SAME geom()
// as built-in Detect (OBB center, bw/bh, ang), so taught pins get identical size/center/rotation semantics.
function probeAt(P,q){let best=null;const R=Math.max(q.w,q.h);for(const g of P){if(!dark(g))continue;if(Math.hypot(g.cx-q.x,g.cy-q.y)>R*.4)continue;if(g.w<q.w*.5||g.h<q.h*.5||g.w>q.w*1.3||g.h>q.h*1.3)continue;if(!best||g.w*g.h>best.w*best.h)best=g}
 if(!best)return null;const g=best;if(/^c+$/.test(g.k)&&g.segs.length>=4){return{x:g.cx,y:g.cy,bw:g.w,bh:g.h,ang:0,kind:Math.abs(g.w-g.h)<.08*Math.max(g.w,g.h)?'circ':null}}
 const pp=poly(g,.6);if(!pp)return null;const n=pp.length;let sk=null,kind=null;
 if(n===4){const onEdge=pp.filter(p=>Math.abs(p[0]-g.cx)<g.w*.15||Math.abs(p[1]-g.cy)<g.h*.15).length;if(onEdge>=4){sk='diamond';kind='dia'}else{const sd=sides(pp),mx=Math.max(...sd),mn=Math.min(...sd);sk=mx/mn<1.15?'square':'panel_rect';kind='rect'}}
 else if(n===6){sk='hex';kind='hex'}else return null;
 const G2=geom(pp,sk);return G2?{x:G2.cx,y:G2.cy,bw:G2.bw,bh:G2.bh,ang:G2.ang||0,kind}:null}
if(typeof self!=='undefined')self.onmessage=e=>{const{id,fn,args,O,vt,W,H,want,probe,labels}=e.data;self.K0=e.data.k0||0;const t0=performance.now();if(labels){try{const P=walk(fn,args,O,vt);self.postMessage({id,ok:1,labels:statusLabels(P)})}catch(err){self.postMessage({id,ok:0,err:String(err&&err.message||err)})}return}if(probe){try{const P=walk(fn,args,O,vt);self.postMessage({id,ok:1,probe:probe.map(q=>probeAt(P,q))})}catch(err){self.postMessage({id,ok:0,err:String(err&&err.message||err)})}return}try{const P=walk(fn,args,O,vt);const r=detect(P,W,H,want);self.postMessage({id,ok:1,...r,kf:!!self.KF,paths:P.length,ms:performance.now()-t0})}catch(err){self.postMessage({id,ok:0,err:String(err&&err.message||err)})}};
if(typeof module!=='undefined'&&module.exports)module.exports={detect,shape,eolrSize,oLetterOk,oIsEolLetter,frameExt,statusFromSig,statusLabels,STATUS_SIG};
