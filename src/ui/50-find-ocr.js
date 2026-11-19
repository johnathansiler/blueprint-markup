// bpm-v151: Find can read the current page as a picture (OCR) so device labels drawn as CAD lines are searchable.
// Reuses vendor/ocr (Tesseract). Two workers read tiles in parallel; a second pass re-reads tag-like crops
// (wiped boxes, small letter groups) at higher DPI. Grammar snaps a shared loop prefix (5:065-) so a 5
// read as 9 becomes an exact address. Caches words per page in IndexedDB (meta).
(()=>{
 const VER=3,S=3,S2=5,TILE=1536,OV=256,INK=0.001,MAX_CROPS=36,MAX_HIRES=20,NW=2;
 const WL='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:/-()#.';
 const WL_ADDR='0123456789:IlOlo-';
 const WL_TAG='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()';
 const WL_TINY='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789()';
 const VOCAB=['FATC','FACP','AIO','EOL','VF','WS'];
 const AIO_MISS=new Set(['MLO','ALO','ATO','NIO','A1O','AI0','A10']);
 const mem=new Map();
 let workers=[],loadP=null;
 const key=(id,n)=>id+':'+n, dbKey=(id,n)=>'findOcr:v'+VER+':'+id+':'+n;
 const yieldUI=()=>new Promise(r=>setTimeout(r,0));
 const cancelledErr=()=>{const e=new Error('cancelled');e.cancelled=true;return e};

 async function loadScript(){if(window.Tesseract)return;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='vendor/ocr/tesseract.min.js';s.onload=ok;s.onerror=no;document.head.append(s)})}
 async function getPool(){if(workers.length>=NW)return workers;
  if(!loadP)loadP=(async()=>{await loadScript();const base=new URL('vendor/ocr/',location.href).href;
   const mk=()=>Tesseract.createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,gzip:true,cacheMethod:'none'});
   workers=await Promise.all(Array.from({length:NW},mk));return workers})().finally(()=>{if(!workers.length)loadP=null});
  return loadP}
 async function rec(w,canvas,psm,wl){await w.setParameters({tessedit_pageseg_mode:String(psm),tessedit_char_whitelist:wl||WL});return w.recognize(canvas)}

 function fix(t){t=String(t||'').replace(/¢/g,'c').replace(/\s+/g,' ').trim();
  t=t.replace(/^[Il]:(?=\d)/,'1:').replace(/([:\-])O(?=\d)/g,'$10').replace(/O(?=\d{2})/g,'0');return t}
 function canonAddr(t){t=fix(t).replace(/--+/g,'-');const d=s=>s.replace(/[Il]/g,'1').replace(/[Ool]/g,'0');
  let m=t.match(/^([0-9IlOol])[:\-]([0-9IlOol]{3})-([0-9IlOol]{2,3})$/);if(m)return d(m[1])+':'+d(m[2])+'-'+d(m[3]);
  m=t.match(/^([0-9IlOol]):([0-9IlOol]{3})([0-9IlOol]{2,3})$/);if(m)return d(m[1])+':'+d(m[2])+'-'+d(m[3]);return t}
 function keep(t,cf){t=vocabSnap(canonAddr(t));if(!t||!/[A-Za-z0-9]/.test(t))return'';if(cf>=35||/\d/.test(t)||t.length>=3)return t;return''}

 function vocabSnap(t){t=String(t||'').trim();if(!t)return t;
  let s=t.replace(/[()]/g,'');
  s=s.replace(/^[Tt](?=5cd$)/,'7').replace(/^[Il](?=5cd$)/,'1').replace(/^[Il](?=85cd$)/,'1');
  let m=s.match(/^(\d{2,3})\s*c(?:d)?$/i);if(m)return m[1]+'cd';
  const u=t.replace(/[^A-Za-z0-9]/g,'').toUpperCase();
  if(AIO_MISS.has(u))return'AIO';
  for(const v of VOCAB){if(u===v)return v;if(u.length!==v.length||v.length<4)continue;
   let d=0;for(let i=0;i<v.length;i++)if(u[i]!==v[i])d++;if(d===1)return v}
  return t}

 const CONF={'5':'96','9':'5','6':'58','0':'o','o':'0','1':'li','l':'1i','i':'1l'};
 function isConf(a,b){a=String(a).toLowerCase();b=String(b).toLowerCase();return a===b||(CONF[a]||'').includes(b)}
 function oneDigitConf(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++){if(a[i]===b[i])continue;if(!isConf(a[i],b[i]))return false;d++}return d===1}
 function isAddr(t){return/^\d:\d{3}-\d{2,3}$/.test(t)}
 function completeFrag(raw,L,M){if(isAddr(raw))return null;const pre=L+':'+M;
  let m=String(raw).match(new RegExp('(?:^|[^0-9])('+M+'-(\\d{2,3}))(?:[^0-9]|$)'));
  if(m)return pre+'-'+m[2];
  m=String(raw).match(/^(\d{1,3})-(\d{2,3})$/);
  if(m&&(M.endsWith(m[1])||oneDigitConf(m[1].padStart(M.length,'0'),M)))return pre+'-'+m[2];
  m=String(raw).match(new RegExp('^'+L+M+'-{1,2}(\\d{2,3})$'));if(m)return pre+'-'+m[1];
  return null}
 function prefixFix(words){const addrs=words.filter(w=>isAddr(w.t));if(!addrs.length)return words;
  const loopC=new Map(),modC=new Map();
  for(const w of addrs){const m=w.t.match(/^(\d):(\d{3})-/);loopC.set(m[1],(loopC.get(m[1])||0)+1);modC.set(m[2],(modC.get(m[2])||0)+1)}
  const best=m=>[...m].sort((a,b)=>b[1]-a[1])[0];
  const bL=best(loopC),bM=best(modC);if(!bL)return words;
  if(bL[1]>=2){
   for(const w of words){if(!isAddr(w.t))continue;const m=w.t.match(/^(\d):(\d{3})-(\d{2,3})$/);let L=m[1],M=m[2],D=m[3],ch=0;
    if(L!==bL[0]&&isConf(L,bL[0])&&(M=== (bM&&bM[0])||(bM&&bM[1]>=2&&oneDigitConf(M,bM[0])))){L=bL[0];ch=1}
    if(bM&&bM[1]>=2&&M!==bM[0]&&oneDigitConf(M,bM[0])&&L===bL[0]){M=bM[0];ch=1}
    if(ch)w.t=L+':'+M+'-'+D}}
  if(bM){for(const w of words){if(isAddr(w.t))continue;const t=completeFrag(w.t,bL[0],bM[0]);if(t)w.t=t}}
  return words}
 function cdFix(words){const cds=words.map(w=>String(w.t||'').match(/^(\d{2,3})cd$/i)).filter(Boolean).map(m=>m[1]+'cd');
  if(cds.length<2)return words;
  const c=new Map();for(const t of cds)c.set(t,(c.get(t)||0)+1);
  const best=[...c].sort((a,b)=>b[1]-a[1])[0];if(!best||best[1]<2)return words;
  const want=best[0],wn=want.replace('cd','');
  for(const w of words){const m=String(w.t||'').match(/^(\d{2,3})cd$/i);if(!m)continue;const got=m[1];
   if(got===wn)continue;if(got.length===wn.length&&oneDigitConf(got,wn))w.t=want}
  return words}

 function lineJoin(words){const L=[...words].sort((a,b)=>a.y-b.y||a.x-b.x),out=[];
  for(const w of L){const prev=out[out.length-1],mid=w.y+w.h/2,pm=prev&&(prev.y+prev.h/2);
   const gap=prev?w.x-(prev.x+prev.w):999,em=prev?Math.max(prev.h,w.h):1;
   const long=s=>s.length>16;
   const tight=prev&&Math.abs(mid-pm)<em*0.55&&w.x>=prev.x-2&&gap<=em*0.7&&!isAddr(prev.t)&&!isAddr(w.t)&&!long(prev.t)&&!long(w.t);
   if(!tight){out.push({t:w.t,x:w.x,y:w.y,w:w.w,h:w.h,cf:w.cf,parts:[w]});continue}
   prev.t=canonAddr(prev.t+w.t);prev.w=Math.max(prev.x+prev.w,w.x+w.w)-prev.x;prev.y=Math.min(prev.y,w.y);
   prev.h=Math.max(prev.y+prev.h,w.y+w.h)-prev.y;prev.cf=Math.max(prev.cf,w.cf);prev.parts.push(w)}
  return out}
 function dedupe(words){const o=[];for(const w of words){const hit=o.find(p=>Math.abs((p.x+p.w/2)-(w.x+w.w/2))<Math.max(6,Math.min(p.w,w.w)*.4)&&Math.abs((p.y+p.h/2)-(w.y+w.h/2))<Math.max(4,Math.min(p.h,w.h)*.4));
  if(!hit)o.push(w);else if(isAddr(w.t)&&!isAddr(hit.t)){hit.t=w.t;hit.x=w.x;hit.y=w.y;hit.w=w.w;hit.h=w.h;hit.cf=w.cf}
  else if((w.cf||0)>(hit.cf||0)||(w.t.length>hit.t.length+1&&!isAddr(hit.t))){hit.t=w.t;hit.x=w.x;hit.y=w.y;hit.w=w.w;hit.h=w.h;hit.cf=w.cf}}
  return o}

 function dilate1(ink,W,H){const o=new Uint8Array(ink);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(ink[y*W+x]){const i=y*W+x;if(x)o[i-1]=1;if(x+1<W)o[i+1]=1;if(y)o[i-W]=1;if(y+1<H)o[i+W]=1}return o}
 function erode1(ink,W,H){const inv=new Uint8Array(W*H);for(let i=0,n=W*H;i<n;i++)inv[i]=ink[i]?0:1;const d=dilate1(inv,W,H);for(let i=0,n=W*H;i<n;i++)d[i]=d[i]?0:1;return d}
 function close1(ink,W,H){return erode1(dilate1(ink,W,H),W,H)}
 function floodExterior(ink,W,H){const seen=new Uint8Array(W*H),st=new Int32Array(W*H);let n=0;
  const push=i=>{if(i>=0&&i<W*H&&!ink[i]&&!seen[i]){seen[i]=1;st[n++]=i}};
  for(let x=0;x<W;x++){push(x);push((H-1)*W+x)}for(let y=0;y<H;y++){push(y*W);push(y*W+W-1)}
  while(n){const i=st[--n],x=i%W,y=(i/W)|0;if(x)push(i-1);if(x+1<W)push(i+1);if(y)push(i-W);if(y+1<H)push(i+W)}
  return seen}
 function wipeBoxes(ink,W,H){const src=close1(ink,W,H),seen=floodExterior(src,W,H),vis=new Uint8Array(seen),st=new Int32Array(W*H);
  const minS=Math.max(8,Math.round(3.2*S)),maxS=Math.max(200,Math.round(140*S)),minA=minS*minS*.35,maxA=maxS*maxS,radFull=Math.max(2,Math.round(.9*S)),rad=radFull;
  const out=new Uint8Array(ink),boxes=[];
  for(let i=0,N=W*H;i<N;i++){if(src[i]||vis[i])continue;
   let n=0,x0=W,y0=H,x1=0,y1=0;vis[i]=1;st[n++]=i;let a=0;
   while(n){const j=st[--n],x=j%W,y=(j/W)|0;a++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
    if(x){const k=j-1;if(!src[k]&&!vis[k]){vis[k]=1;st[n++]=k}}if(x+1<W){const k=j+1;if(!src[k]&&!vis[k]){vis[k]=1;st[n++]=k}}
    if(y){const k=j-W;if(!src[k]&&!vis[k]){vis[k]=1;st[n++]=k}}if(y+1<H){const k=j+W;if(!src[k]&&!vis[k]){vis[k]=1;st[n++]=k}}}
   const ww=x1-x0+1,hh=y1-y0+1;if(ww<minS||hh<minS||ww>maxS||hh>maxS||a<minA||a>maxA)continue;
   const has=(yy,xx)=>{if(xx<0||yy<0||xx>=W||yy>=H)return 0;return ink[yy*W+xx]}
   const along=(pts,dx,dy)=>{let hit=0;for(const[x,y] of pts){for(let k=1;k<=rad;k++)if(has(y+dy*k,x+dx*k)){hit++;break}}return pts.length?hit/pts.length:0};
   const top=[],bot=[],lef=[],rig=[];
   for(let x=x0;x<=x1;x++){top.push([x,y0]);bot.push([x,y1])}for(let y=y0;y<=y1;y++){lef.push([x0,y]);rig.push([x1,y])}
   if(along(top,0,-1)<.75||along(bot,0,1)<.75||along(lef,-1,0)<.75||along(rig,1,0)<.75)continue;
   const wrad=Math.min(rad,Math.max(1,Math.floor(Math.min(ww,hh)*0.12)));
   for(let k=0;k<=wrad;k++){
    const yy0=y0-k,yy1=y1+k,xx0=x0-k,xx1=x1+k;
    if(yy0>=0)for(let x=Math.max(0,x0-wrad);x<=Math.min(W-1,x1+wrad);x++)out[yy0*W+x]=0;
    if(yy1<H)for(let x=Math.max(0,x0-wrad);x<=Math.min(W-1,x1+wrad);x++)out[yy1*W+x]=0;
    if(xx0>=0)for(let y=Math.max(0,y0-wrad);y<=Math.min(H-1,y1+wrad);y++)out[y*W+xx0]=0;
    if(xx1<W)for(let y=Math.max(0,y0-wrad);y<=Math.min(H-1,y1+wrad);y++)out[y*W+xx1]=0}
   boxes.push({x0,y0,x1,y1})}
  return{ink:out,boxes}}
 function dropWalls(ink,W,H){const out=new Uint8Array(ink),maxRun=Math.max(40,Math.round(Math.min(W,H)*0.22));
  for(let y=0;y<H;y++){let x=0;while(x<W){if(!ink[y*W+x]){x++;continue}let x2=x;while(x2<W&&ink[y*W+x2])x2++;if(x2-x>=maxRun){for(let k=x;k<x2;k++)out[y*W+k]=0}x=x2}}
  for(let x=0;x<W;x++){let y=0;while(y<H){if(!out[y*W+x]){y++;continue}let y2=y;while(y2<H&&out[y2*W+x])y2++;if(y2-y>=maxRun){for(let k=y;k<y2;k++)out[k*W+x]=0}y=y2}}
  return out}
 // drop long thin strokes (hex sides, leaders, walls) so letters remain
 function isolateGlyphs(ink,W,H){const lab=new Int32Array(W*H).fill(-1),bx=[];
  for(let i=0,N=W*H;i<N;i++){if(!ink[i]||lab[i]>=0)continue;const st=[i];lab[i]=bx.length;const b={x0:W,y0:H,x1:0,y1:0,a:0};
   while(st.length){const j=st.pop(),x=j%W,y=(j/W)|0;b.a++;if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;
    for(const k of[j-1,j+1,j-W,j+W])if(k>=0&&k<N&&ink[k]&&lab[k]<0&&Math.abs((k%W)-x)<=1){lab[k]=bx.length;st.push(k)}}
   bx.push(b)}
  if(!bx.length)return ink;
  const hs=bx.map(b=>b.y1-b.y0+1).sort((a,b)=>a-b),med=hs[hs.length>>1]||12;
  const out=new Uint8Array(W*H);let keepN=0,allN=0;
  for(let i=0;i<bx.length;i++){const b=bx[i],w=b.x1-b.x0+1,h=b.y1-b.y0+1,long=Math.max(w,h),thin=Math.max(w,h)/Math.max(1,Math.min(w,h));
   const drop=thin>=6&&long>med*1.6;allN+=b.a;
   if(drop)continue;
   for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++)if(lab[y*W+x]===i){out[y*W+x]=1;keepN++}}
  return(allN&&keepN/allN<0.55)?ink:out}
 function inkify(g,W,H,opts){const id=g.getImageData(0,0,W,H),d=id.data,raw=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++)raw[i]=Math.max(d[i*4],d[i*4+1],d[i*4+2])<120?1:0;
  const wiped=wipeBoxes(raw,W,H),useWipe=opts&&opts.wipe;
  let ink=dropWalls(useWipe?wiped.ink:raw,W,H);
  let n=0;for(let i=0;i<W*H;i++){const v=ink[i]?0:255,j=i*4;d[j]=d[j+1]=d[j+2]=v;d[j+3]=255;if(ink[i])n++}
  g.putImageData(id,0,0);return{frac:n/(W*H),ink,boxes:wiped.boxes,wiped:wiped.ink}}

 function textCrops(ink,W,H){const lab=new Int32Array(W*H).fill(-1),bx=[],minH=Math.max(5,Math.round(1.8*S)),maxH=Math.max(28,Math.round(16*S)),maxW=Math.max(80,Math.round(80*S));
  for(let i=0,N=W*H;i<N;i++){if(!ink[i]||lab[i]>=0)continue;const st=[i];lab[i]=bx.length;const b={x0:W,y0:H,x1:0,y1:0};
   while(st.length){const j=st.pop(),x=j%W,y=(j/W)|0;if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;
    for(const k of[j-1,j+1,j-W,j+W])if(k>=0&&k<N&&ink[k]&&lab[k]<0&&Math.abs((k%W)-x)<=1){lab[k]=bx.length;st.push(k)}}
   const h=b.y1-b.y0+1,w=b.x1-b.x0+1;if(h>=minH&&h<=maxH&&w<=maxW&&w>=2)bx.push(b)}
  const words=[];for(const b of bx.sort((a,c)=>a.y0-c.y0||a.x0-c.x0)){const h=b.y1-b.y0+1,wd=words.find(w=>Math.min(w.y1,b.y1)-Math.max(w.y0,b.y0)>.5*Math.min(h,w.y1-w.y0+1)&&b.x0-w.x1<h*1.2&&b.x0>=w.x0-2);
   if(wd){wd.x1=Math.max(wd.x1,b.x1);wd.y0=Math.min(wd.y0,b.y0);wd.y1=Math.max(wd.y1,b.y1)}else words.push({...b})}
  const maxLine=Math.round(36*S);
  return words.filter(w=>{const ww=w.x1-w.x0+1,hh=w.y1-w.y0+1;return ww>=6&&hh>=minH&&ww<=maxLine&&ww/hh<14})}

 function wordFrom(t,cf,x,y,w,h){t=keep(t,cf);if(!t)return null;if(w<0.4||h<0.4)return null;return{t,x,y,w,h,cf:cf|0}}
 function upscale(c,minH){if(c.height>=minH)return c;const z=minH/c.height,u=document.createElement('canvas');u.width=Math.ceil(c.width*z);u.height=Math.ceil(c.height*z);const ug=u.getContext('2d');ug.imageSmoothingEnabled=false;ug.fillStyle='#fff';ug.fillRect(0,0,u.width,u.height);ug.drawImage(c,0,0,u.width,u.height);return u}
 function rotate90(c){const u=document.createElement('canvas');u.width=c.height;u.height=c.width;const g=u.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,u.width,u.height);g.translate(u.width,0);g.rotate(Math.PI/2);g.drawImage(c,0,0);return u}
 function sliceTile(c,box,pad){const x0=Math.max(0,box.x0-pad),y0=Math.max(0,box.y0-pad),x1=Math.min(c.width,box.x1+1+pad),y1=Math.min(c.height,box.y1+1+pad);
  const o=document.createElement('canvas');o.width=Math.max(8,x1-x0);o.height=Math.max(8,y1-y0);const g=o.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,o.width,o.height);g.drawImage(c,x0,y0,o.width,o.height,0,0,o.width,o.height);return{c:o,x0,y0}}
 function prepCrop(src){const g=src.getContext('2d',{willReadFrequently:true}),W=src.width,H=src.height,id=g.getImageData(0,0,W,H),d=id.data,raw=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++)raw[i]=d[i*4]<120?1:0;
  let ink=isolateGlyphs(raw,W,H);ink=dilate1(ink,W,H);
  for(let i=0;i<W*H;i++){const v=ink[i]?0:255,j=i*4;d[j]=d[j+1]=d[j+2]=v;d[j+3]=255}g.putImageData(id,0,0);return src}

 async function ocrCanvas(w,src,pageX,pageY,sc,pageBox,tag,tiny,forceWl){
  const wide=pageBox.w>pageBox.h*2.2,short=pageBox.w<=pageBox.h*2.2&&pageBox.w<22,tall=pageBox.h>pageBox.w*1.35;
  // multi-line cabinets need a block read (PSM 6) first; a letters-only whitelist would drop 1:001-026 under FATC
  const wls=forceWl?[forceWl]:(tag&&tall?[WL,WL_TAG,WL_ADDR]:tag||tiny?[WL_TAG,tiny?WL_TINY:WL]:wide?[WL_ADDR,WL]:short?[WL_TAG,WL]:[WL]);
  const psms=tall||(tag&&pageBox.h>10)?[6,7]:[7];
  src=prepCrop(src);src=upscale(src,tiny?48:40);
  async function once(img,wl,psm){const r=await rec(w,img,psm,wl),t=(r.data&&r.data.text||'').trim(),cf=r.data&&r.data.confidence|0;
   const ww=wordFrom(t,cf,pageX,pageY,pageBox.w+2,pageBox.h+2);const P=[];
   for(const z of(r.data&&r.data.words)||[]){const tt=keep(z.text,z.confidence|0);if(!tt)continue;
    const b=z.bbox||{},sx=pageX+(b.x0||0)/sc,sy=pageY+(b.y0||0)/sc,sw=((b.x1||0)-(b.x0||0))/sc,sh2=((b.y1||0)-(b.y0||0))/sc;
    const pw=wordFrom(tt,z.confidence|0,sx,sy,sw,sh2);if(pw)P.push(pw)}
   return{best:ww,parts:P,cf,t}}
  let best=null,parts=[],cf=0,seen=new Set();
  function addParts(P){for(const p of P){const k=p.t+'@'+(p.x|0)+','+(p.y|0);if(seen.has(k))continue;seen.add(k);parts.push(p)}}
  for(const wl of wls){
   let r=await once(src,wl,psms[0]);
   if((!r.t||r.cf<50)&&psms[1]){const r2=await once(src,wl,psms[1]);if((r2.t&&r2.cf>r.cf)||(!r.t&&r2.t))r=r2}
   if(r.best&&(!best||r.cf>cf||(r.best.t.length>(best.t||'').length&&r.cf+5>=cf))){best=r.best;cf=r.cf}
   if(r.parts.length)addParts(r.parts);
   if(best&&cf>=70&&!(tag&&tall))break}
  if((tag||tall)&&(!best||cf<50||!/^[A-Z0-9:()/\-]{2,}$/.test((best.t||'').toUpperCase().replace(/[^A-Z0-9:()/\-]/g,'')))){
   const rot=rotate90(src);let r=await once(rot,tag?WL_TAG:WL,7);
   if(r.best&&r.cf+3>=cf){best=r.best;cf=r.cf;if(r.parts.length)addParts(r.parts)}}
  return{best,parts:parts.length?parts:(best?[best]:[])}
 }
 async function renderBox(pg,pb,pad,opts){
  const x=pb.x-pad,y=pb.y-pad,rw=pb.w+pad*2,rh=pb.h+pad*2,sc=(opts&&opts.sc)||S2;
  const c=document.createElement('canvas');c.width=Math.max(8,Math.ceil(rw*sc));c.height=Math.max(8,Math.ceil(rh*sc));
  const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
  await pg.render({canvasContext:g,viewport:pg.getViewport({scale:sc,offsetX:-x*sc,offsetY:-y*sc})}).promise;
  if(!(opts&&opts.raw))inkify(g,c.width,c.height,{wipe:!(opts&&opts.noWipe)});
  return{c,x,y,sc}}
 async function readCrop(w,pg,C){
  const pb=C.pb,tall=C.tag&&pb.h>pb.w*1.15&&pb.h>12;
  async function one(box,tag,tiny,forceWl){
   if(C.hires||forceWl==='addrband'){const pad=Math.max(1.2,box.h*.4),r=await renderBox(pg,box,pad);return ocrCanvas(w,r.c,r.x,r.y,r.sc,box,tag,tiny,forceWl===WL_ADDR||forceWl==='addrband'?WL_ADDR:forceWl)}
   return ocrCanvas(w,C.canvas,C.ox,C.oy,S,box,tag,tiny,forceWl)}
  const r=await one(pb,C.tag,C.tiny);const parts=r.parts&&r.parts.length?r.parts.slice():(r.best?[r.best]:[]);
  if(tall){
   const bot={x:pb.x,y:pb.y+pb.h*0.38,w:pb.w,h:pb.h*0.62},top={x:pb.x,y:pb.y,w:pb.w,h:Math.max(6,pb.h*0.5)};
   const r2=await one(bot,false,false,'addrband');if(r2.parts&&r2.parts.length)parts.push(...r2.parts);else if(r2.best)parts.push(r2.best);
   const r3=await one(top,true,false,WL_TAG);if(r3.parts&&r3.parts.length)parts.push(...r3.parts);else if(r3.best)parts.push(r3.best);
  }
  return{best:r.best,parts}
 }

 
 async function refineAddresses(pool,pg,words,onProg,cancelled){
  const jobs=[];
  for(const w of words){
   if(isAddr(w.t)&&'5689'.includes(w.t[0]))jobs.push({kind:'loop',w});
   else if(/^\d:\d{3}-?\d{0,2}$/.test(w.t)||/^\d:\d{2,3}$/.test(w.t))jobs.push({kind:'short',w});
  }
  if(!jobs.length)return words;
  const free=pool.slice(),pend=jobs.slice(),flight=new Set();
  let i=0;
  async function run(worker,job){
   if(cancelled&&cancelled())throw cancelledErr();
   onProg&&onProg({msg:`Checking address digits… ${++i} of ${jobs.length}`});
   const w=job.w;
   try{
    if(job.kind==='loop'){
     const ww=Math.max(w.h*1.3,w.w*0.18),pb={x:w.x-0.3,y:w.y-0.4,w:ww+0.6,h:w.h+0.8};
     const r=await renderBox(pg,pb,0.3,{raw:1,sc:8}),img=upscale(r.c,64);
     let best='',bcf=-1;
     for(const psm of[8,10]){const recg=await rec(worker,img,psm,'0123456789');
      const t=((recg.data&&recg.data.text)||'').replace(/\D/g,''),cf=recg.data&&recg.data.confidence|0;
      if(t&&cf>=bcf){best=t;bcf=cf}}
     const d=best[0]||'';
     if('12345678'.includes(d)&&d!==w.t[0]&&bcf>=25)w.t=d+w.t.slice(1);
    }else{
     const pb={x:w.x-1,y:w.y-1,w:Math.max(w.w*2.4,w.h*9),h:w.h+2};
     const r=await renderBox(pg,pb,0.6);
     const o=await ocrCanvas(worker,r.c,r.x,r.y,r.sc,pb,false,false,WL_ADDR);
     const cand=(o.parts||[]).concat(o.best||[]);
     const hit=cand.map(x=>x&&x.t).filter(t=>t&&isAddr(t))[0]||cand.map(x=>x&&x.t).filter(t=>t&&completeFrag(t,w.t[0],(w.t.match(/^\d:(\d{3})/)||[])[1]||''))[0];
     if(hit){const tt=isAddr(hit)?hit:completeFrag(hit,w.t[0],(w.t.match(/^\d:(\d{3})/)||[])[1]||'');if(tt)w.t=tt}
    }
   }catch(e){if(e&&e.cancelled)throw e}
  }
  const pump=()=>{while(free.length&&pend.length){const worker=free.pop(),job=pend.shift();
    const p=run(worker,job).then(()=>{free.push(worker);flight.delete(p)}).catch(e=>{free.push(worker);flight.delete(p);if(e&&e.cancelled)throw e});
    flight.add(p)}};
  pump();while(flight.size){await Promise.race([...flight]);pump()}
  return words}
 async function cached(id,n){const k=key(id,n);if(mem.has(k))return mem.get(k);
  try{const v=await get('meta',dbKey(id,n));if(v&&v.v===VER&&Array.isArray(v.words)){mem.set(k,v);return v}}catch(e){}
  return null}
 async function save(id,n,rec){mem.set(key(id,n),rec);try{await put('meta',rec,dbKey(id,n))}catch(e){console.warn('find ocr cache',e)}}

 async function readPage(n,opt){const onProg=opt&&opt.onProgress||(()=>{}),cancelled=opt&&opt.cancelled||(()=>false);
  if(!pdf||!plan)throw new Error('no plan');
  if(!(opt&&opt.force)){const hit=await cached(plan.id,n);if(hit)return hit}else mem.delete(key(plan.id,n));
  const pg=await pdf.getPage(n),vp=pg.getViewport({scale:1}),fullW=vp.width*S,fullH=vp.height*S,step=TILE-OV;
  const tiles=[];for(let y=0;y<fullH;y+=step)for(let x=0;x<fullW;x+=step)tiles.push({x,y,w:Math.min(TILE,fullW-x),h:Math.min(TILE,fullH-y)});
  const pool=await getPool();
  const words=[],crops=[];let done=0,skipped=0,hires=0;
  const free=pool.slice(),pending=[];
  const collect=(T,c,pre,recg)=>{
   for(const z of(recg&&recg.data&&recg.data.words)||[]){const t=keep(z.text,z.confidence|0);if(!t)continue;
    const b=z.bbox||{};const x=(T.x+(b.x0||0))/S,y=(T.y+(b.y0||0))/S,ww=((b.x1||0)-(b.x0||0))/S,hh=((b.y1||0)-(b.y0||0))/S;
    const wr=wordFrom(t,z.confidence|0,x,y,ww,hh);if(wr){wr._tile=T;words.push(wr)}}
   const skipDense=pre.frac>0.035;
   if(skipDense)return;
   for(const box of textCrops(pre.wiped||pre.ink,T.w,T.h)){
    const pb={x:(T.x+box.x0)/S,y:(T.y+box.y0)/S,w:(box.x1-box.x0+1)/S,h:(box.y1-box.y0+1)/S};
    const covered=words.some(o=>o.cf>=55&&Math.max(0,Math.min(o.x+o.w,pb.x+pb.w)-Math.max(o.x,pb.x))*Math.max(0,Math.min(o.y+o.h,pb.y+pb.h)-Math.max(o.y,pb.y))>0.45*Math.max(1,pb.w*pb.h));
    if(covered)continue;
    const sl=sliceTile(c,box,Math.max(4,Math.round(pb.h*S*.4)));
    const addrish=pb.w>pb.h*2.8&&pb.h<=12;
    crops.push({pb,canvas:sl.c,ox:(T.x+sl.x0)/S,oy:(T.y+sl.y0)/S,hires:addrish||pb.h<8,tiny:pb.h<6,prio:addrish?2:pb.h<8?1:0})}
   for(const box of pre.boxes||[]){
    const pb={x:(T.x+box.x0)/S,y:(T.y+box.y0)/S,w:(box.x1-box.x0+1)/S,h:(box.y1-box.y0+1)/S};
    const sl=sliceTile(c,box,Math.max(3,Math.round(.5*S)));
    crops.push({pb,canvas:sl.c,ox:(T.x+sl.x0)/S,oy:(T.y+sl.y0)/S,hires:Math.max(pb.w,pb.h)<50,tiny:Math.min(pb.w,pb.h)<10,prio:2,tag:true})}
   // words clipped at a tile edge: re-read a padded crop that crosses the seam
   const edge=14;
   for(const wr of words){if(wr._tile!==T)continue;
    const left=T.x>0&&wr.x*S-T.x<edge,right=T.x+T.w<fullW&&(T.x+T.w)-((wr.x+wr.w)*S)<edge;
    const top=T.y>0&&wr.y*S-T.y<edge,bot=T.y+T.h<fullH&&(T.y+T.h)-((wr.y+wr.h)*S)<edge;
    if(!(left||right||top||bot))continue;
    if(!/[:0-9-]/.test(wr.t)||wr.t.length>18||isAddr(wr.t))continue;
    const pb={x:wr.x-8,y:wr.y-4,w:wr.w+16,h:wr.h+8};
    crops.push({pb,canvas:c,ox:wr.x,oy:wr.y,hires:true,tiny:wr.h<6,prio:1,seam:true})}
  };
  const inflight=new Set();
  const pump=()=>{while(free.length&&pending.length){if(cancelled())throw cancelledErr();
    const w=free.pop(),item=pending.shift();
    const job=rec(w,item.c,12,WL).then(recg=>{collect(item.T,item.c,item.pre,recg);free.push(w);inflight.delete(job)}).catch(e=>{free.push(w);inflight.delete(job);if(e&&e.cancelled)throw e});
    inflight.add(job)}}
  for(const T of tiles){if(cancelled())throw cancelledErr();
   onProg({done,total:tiles.length,skipped,msg:`Reading the drawing as a picture… ${Math.min(done+1,tiles.length)} of ${tiles.length}`});
   const c=document.createElement('canvas');c.width=T.w;c.height=T.h;const g=c.getContext('2d',{willReadFrequently:true});
   g.fillStyle='#fff';g.fillRect(0,0,T.w,T.h);
   await pg.render({canvasContext:g,viewport:pg.getViewport({scale:S,offsetX:-T.x,offsetY:-T.y})}).promise;
   const pre=inkify(g,T.w,T.h);done++;
   if(pre.frac<INK){skipped++;await yieldUI();continue}
   pending.push({T,c,pre});pump();
   if(pending.length+inflight.size>=NW){await Promise.race([...inflight]);pump()}
   await yieldUI()}
  while(inflight.size){await Promise.race([...inflight]);pump()}

  const uniq=[];for(const c of crops){if(uniq.some(o=>Math.abs(o.pb.x-c.pb.x)<2&&Math.abs(o.pb.y-c.pb.y)<2))continue;uniq.push(c)}
  uniq.sort((a,b)=>(b.prio||0)-(a.prio||0)||(a.hires?0:1)-(b.hires?0:1));
  const pass=uniq.slice(0,MAX_CROPS);
  let ci=0;const cFree=pool.slice(),cPend=pass.map((C,i)=>i),cFlight=new Set();
  const runCrop=async(w,C)=>{if(C.hires&&hires>=MAX_HIRES)C.hires=false;
   onProg({done:tiles.length+ci,total:tiles.length+pass.length,msg:`Reading small labels… ${++ci} of ${pass.length}`});
   try{const r=await readCrop(w,pg,C);if(C.hires)hires++;if(r.parts&&r.parts.length)words.push(...r.parts);else if(r.best)words.push(r.best)}catch(e){if(e&&e.cancelled)throw e}};
  const pumpC=()=>{while(cFree.length&&cPend.length){if(cancelled())throw cancelledErr();
    const w=cFree.pop(),C=pass[cPend.shift()];
    const job=runCrop(w,C).then(()=>{cFree.push(w);cFlight.delete(job)}).catch(e=>{cFree.push(w);cFlight.delete(job);if(e&&e.cancelled)throw e});
    cFlight.add(job)}};
  pumpC();while(cFlight.size){await Promise.race([...cFlight]);pumpC()}

  let joined=lineJoin(dedupe(words)).map(w=>(w.t=vocabSnap(canonAddr(w.t)),w));
  const extra=[];const RX=/[1-9Iil](?:[ :]|[:\-])[0-9IlOol]{3}-[0-9IlOol]{2,3}|[1-9Iil]:[0-9IlOol]{5,6}/g;
  const TX=/FATC|FACP|AIO|75cd|185cd|15cd|30cd|110cd/gi;
  for(const w of joined){const raw=String(w.t||'');
   if(!isAddr(raw)){let m;RX.lastIndex=0;while((m=RX.exec(raw))){const tt=canonAddr(m[0].replace(/ /g,''));if(tt&&tt!==raw)extra.push({t:tt,x:w.x,y:w.y,w:w.w,h:w.h,cf:w.cf,parts:w.parts})}}
   if(raw.length>4){let m;TX.lastIndex=0;while((m=TX.exec(raw))){if(m[0]!==raw)extra.push({t:vocabSnap(m[0]),x:w.x,y:w.y,w:w.w,h:w.h,cf:w.cf})}}}
  let all=cdFix(prefixFix(dedupe(joined.concat(extra))));
  all=cdFix(prefixFix(await refineAddresses(pool,pg,all,onProg,cancelled)));
  const recOut={v:VER,words:all,n:all.length,at:Date.now(),scale:S,tiles:tiles.length,crops:pass.length};
  try{window.__ocrDebug={tiles:tiles.length,crops:pass.length,joined:joined.map(w=>w.t),all:all.map(w=>w.t)}}catch(e){}
  await save(plan.id,n,recOut);return recOut}
 function clearMem(){mem.clear()}
 window.findOcrCached=cached;window.findOcrRead=readPage;window.findOcrClear=clearMem;window.findOcrJoin=lineJoin;window.findOcrPrefixFix=prefixFix;
 const _cp=window.closePlan;if(typeof closePlan==='function')closePlan=function(){clearMem();return _cp.apply(this,arguments)};
})();
