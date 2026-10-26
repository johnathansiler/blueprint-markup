// bpm-v127: Detect OSS / BFP / 120 VAC bell from vector fixtures (numbers from the measured plan symbols, no plan data).
// usage: node test/v127-detect.js [path/to/detect.js]   -> prints ALLOK when every case passes (fails on bpm-v126).
'use strict';const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','detect.js'),'utf8'),ctx={self:{},Math,console,performance:{now:()=>0}};vm.createContext(ctx);vm.runInContext(src,ctx);
const detect=ctx.detect;const BLK=[0,0,0];
const mk=(segs)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const g of segs)for(const p of g.p){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])}return{segs,color:BLK,fill:null,x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2,k:segs.map(s=>s.t).join('')}};
const polyg=pts=>mk(pts.map((p,i)=>({t:'l',p:[p,pts[(i+1)%pts.length]]})));
const rot=(pts,c,a)=>pts.map(([x,y])=>[c[0]+x*Math.cos(a)-y*Math.sin(a),c[1]+x*Math.sin(a)+y*Math.cos(a)]);
const square=(c,s,a=0)=>polyg(rot([[-s/2,-s/2],[s/2,-s/2],[s/2,s/2],[-s/2,s/2]],c,a));
const rhombus=(c,hw,hh)=>polyg([[c[0]-hw,c[1]],[c[0],c[1]-hh],[c[0]+hw,c[1]],[c[0],c[1]+hh]]);
const circle=(c,d)=>{const r=d/2,K=.5523*r,[x,y]=c;return mk([{t:'c',p:[[x+r,y],[x+r,y+K],[x+K,y+r],[x,y+r]]},{t:'c',p:[[x,y+r],[x-K,y+r],[x-r,y+K],[x-r,y]]},{t:'c',p:[[x-r,y],[x-r,y-K],[x-K,y-r],[x,y-r]]},{t:'c',p:[[x,y-r],[x+K,y-r],[x+r,y-K],[x+r,y]]}])};
// open polyline glyph stroke with n segments inside a 2.4 x 4.8 cell at (x,y)
const glyph=(x,y,n)=>{const pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push([x-1.2+2.4*t,y-2.4+4.8*Math.abs(Math.sin(t*Math.PI*1.5))])}return mk(pts.slice(1).map((p,i)=>({t:'l',p:[pts[i],p]})))};
const glyphs=(c,ns)=>ns.map((n,i)=>glyph(c[0]+(i-(ns.length-1)/2)*3,c[1],n));
const filler=()=>[0,1,2,3,4,5].map(i=>square([100+i*60,1500],13)); // scale k = 1 (13 pt squares)
const run=P=>detect(P,2000,2000,null).items;
const cases=[
 ['OSS box "19,19,20" (test plan p16, side 12.36)',()=>[square([500,500],12.36),...glyphs([500,500],[19,19,20])],[500,500],'OSS'],
 ['BFP rhombus "1,2,10,18" (test plan p8, 26.40 x 10.98)',()=>[rhombus([800,500],13.2,5.49),...glyphs([800,500],[1,2,10,18])],[800,500],'BFP'],
 ['Bell: square 13.37 @-49.7deg + tangent circle d 13.38 (test plan p8)',()=>{const a=-49.7*Math.PI/180,c=[1100,500];return[square(c,13.37,a),circle([c[0]+13.4*Math.cos(a-Math.PI/2),c[1]+13.4*Math.sin(a-Math.PI/2)],13.38)]},[1100,500],'BELL'],
 ['FS diamond "1,2,19" stays FLOW',()=>[rhombus([500,800],13.2,5.49),...glyphs([500,800],[1,2,19])],[500,800],'FLOW'],
 ['TS diamond "1,1,19" stays TAMPER',()=>[rhombus([800,800],13.2,5.49),...glyphs([800,800],[1,1,19])],[800,800],'TAMPER'],
 ['Empty square, no circle: nothing',()=>[square([1100,800],13)],[1100,800],null],
 ['Empty square, circle too far (2d): nothing',()=>[square([500,1100],13),circle([500,1100-26],13)],[500,1100],null],
 ['Empty square inside a circle (centre distance 0): nothing',()=>[square([800,1100],13),circle([800,1100],13)],[800,1100],null]];
let ok=0;for(const[n,f,c,want]of cases){const items=run([...filler(),...f()]),hit=items.find(o=>Math.hypot(o.x-c[0],o.y-c[1])<4&&!['JBOX_CEIL'].includes(o.type)),got=hit?hit.type:null,pass=got===want;if(pass)ok++;console.log((pass?'ok   ':'FAIL ')+n+'  -> '+got+(pass?'':'  (want '+want+')'))}
console.log(ok===cases.length?'ALLOK':`FAILED ${cases.length-ok}/${cases.length}`);process.exit(ok===cases.length?0:1);
