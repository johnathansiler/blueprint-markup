// bpm-v90: master symbol legend (IndexedDB meta 'symMaster'), legend scan on plan open, tap-to-teach,
// and template matchers for Detect. Matches are returned as ordinary detector items (existing det type for the
// chosen device group), so they flow through the unchanged bpm-v50 items → ghosts → accept path (geometry, outset, de-overlap).
(()=>{const ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 let M=null;const load=async()=>M??=((await get('meta','symMaster'))||[]),save=async()=>{await put('meta',M,'symMaster')};window.symMaster=async()=>(await load()).slice();
 const dgOf=t=>Object.keys(DG).find(k=>DG[k].t===t),detOf=g=>Object.keys(D2G).find(k=>D2G[k]===g);
 const KW=[[/smoke|photo|ionization/i,'smoke'],[/duct/i,'duct'],[/heat|thermal|rate.of.rise/i,'heat'],[/pull|manual station|manual pull/i,'pull'],[/speaker.?strobe|spkr.?strobe/i,'spkstrobe'],[/line.?array|column/i,'linearray'],[/horn|sounder|chime/i,'horn'],[/strobe|visual/i,'strobe'],[/flow/i,'flow'],[/tamper|valve|supervisory switch/i,'tamper'],[/door holder|magnetic/i,'doorholder'],[/relay/i,'relay'],[/monitor|module|interface|control module/i,'module'],[/junction|j-?box/i,'jbox'],[/surge|tvss|spd/i,'surge'],[/annunciator/i,'panelbox'],[/remote (alarm )?(indicator|led|lamp)/i,'rai'],[/dact|communicator|dialer/i,'dact'],[/terminal cabinet|fatc/i,'fatc'],[/control panel|facp/i,'panel']];
 const guess=s=>(KW.find(([r])=>r.test(s))||[0,''])[1];
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 // ---- rendering + grayscale helpers ----
 async function render(pg,s,R){const v1=pg.getViewport({scale:1});R=R||{x:0,y:0,w:v1.width,h:v1.height};R={x:Math.max(0,R.x),y:Math.max(0,R.y),w:Math.min(v1.width-Math.max(0,R.x),R.w),h:Math.min(v1.height-Math.max(0,R.y),R.h)};const vp=pg.getViewport({scale:s,offsetX:-R.x*s,offsetY:-R.y*s}),c=document.createElement('canvas');c.width=Math.ceil(R.w*s);c.height=Math.ceil(R.h*s);c._ox=R.x;c._oy=R.y;const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:x,viewport:vp}).promise;return c}
 const grayOf=(c,x=0,y=0,w=c.width,h=c.height)=>{const d=c.getContext('2d',{willReadFrequently:true}).getImageData(x,y,w,h).data,g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=255-(d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114);return{g,w,h}};
 function inkBox(G,th=60){let x0=G.w,y0=G.h,x1=-1,y1=-1,n=0;for(let y=0;y<G.h;y++)for(let x=0;x<G.w;x++)if(G.g[y*G.w+x]>th){n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}return n<6?null:{x0,y0,x1,y1,n}}
 function mainBox(G,th=60){const W=G.w,H=G.h,lab=new Int32Array(W*H).fill(-1),cs=[];for(let i=0;i<W*H;i++){if(G.g[i]<=th||lab[i]>=0)continue;const st=[i],b={x0:W,y0:H,x1:-1,y1:-1,n:0};lab[i]=cs.length;while(st.length){const j=st.pop(),x=j%W,y=(j/W)|0;b.n++;if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const k=Y*W+X;if(lab[k]<0&&G.g[k]>th){lab[k]=cs.length;st.push(k)}}}cs.push(b)}
  if(!cs.length)return null;const A=b=>(b.x1-b.x0+1)*(b.y1-b.y0+1),m={...cs.sort((a,b)=>A(b)-A(a))[0]};for(const b of cs)if(b.x0>=m.x0-1&&b.x1<=m.x1+1&&b.y0>=m.y0-1&&b.y1<=m.y1+1)continue;else if(b.n>3&&b.x0>=m.x0&&b.x1<=m.x1&&b.y0>=m.y0&&b.y1<=m.y1){}
  return A(m)<30?null:m}
 const b64=u=>{let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s)},unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 // crop a symbol at page scale S (px per pt) around a pt-rect; tighten to ink; returns {img,tpl,bb}
 function crop(c,S,r){r={...r,x:r.x-(c._ox||0),y:r.y-(c._oy||0)};const x=Math.max(0,Math.floor(r.x*S)),y=Math.max(0,Math.floor(r.y*S)),w=Math.min(c.width-x,Math.ceil(r.w*S)),h=Math.min(c.height-y,Math.ceil(r.h*S));if(w<4||h<4)return null;
  const G=grayOf(c,x,y,w,h),b=mainBox(G);if(!b)return null;const p=2,X=Math.max(0,b.x0-p),Y=Math.max(0,b.y0-p),W=Math.min(w-X,b.x1-b.x0+1+2*p),H=Math.min(h-Y,b.y1-b.y0+1+2*p);if(W<5||H<5)return null;
  const o=document.createElement('canvas');o.width=W;o.height=H;o.getContext('2d').drawImage(c,x+X,y+Y,W,H,0,0,W,H);const T=grayOf(o),u=new Uint8Array(W*H);for(let i=0;i<u.length;i++)u[i]=T.g[i];
  return{img:o.toDataURL('image/png'),tpl:{w:W,h:H,s:S,g:b64(u)},bb:{x:(x+X)/S+(c._ox||0),y:(y+Y)/S+(c._oy||0),w:W/S,h:H/S}}}
 // ---- legend scan ----
 async function scanLegend(doc,pages){const out=[],have=new Set((await load()).map(m=>norm(m.name)));const S=3;
  for(const n of pages){const pg=await doc.getPage(n),vp=pg.getViewport({scale:1});let tc;try{tc=await pg.getTextContent()}catch{continue}
   const items=tc.items.filter(t=>(t.str||'').trim()).map(t=>{const m=pdfjsLib.Util.transform(vp.transform,t.transform);return{s:t.str.trim(),x:m[4],y:m[5],h:Math.hypot(m[2],m[3])||t.height||8,w:t.width||0}});
   const heads=items.filter(t=>/^((fire alarm|device|notification|back-of-house|initiating)[ -])*(symbols?|legend|symbol legend|symbol schedule)$/i.test(t.s)&&!/wire|subscript|pathway|circuit|abbrev/i.test(t.s));if(!heads.length)continue;let c=null;
   for(const H of heads){const next=heads.filter(h=>h!==H&&h.y>H.y+20&&Math.abs(h.x-H.x)<300).sort((a,b)=>a.y-b.y)[0],yEnd=next?next.y-4:H.y+900;
    const col=items.filter(t=>/^symbols?$/i.test(t.s)&&t.y>H.y&&t.y<H.y+60&&Math.abs(t.x-H.x)<400).sort((a,b)=>Math.abs(a.x-H.x)-Math.abs(b.x-H.x))[0];
    const reg=items.filter(t=>t!==H&&t.y>(col?col.y:H.y)+4&&t.y<yEnd&&t.x>(col?col.x+20:H.x-300)&&t.x<H.x+400&&/[A-Za-z]{3,}/.test(t.s)&&!/^(qty|quantity|description|symbol|legend|abbreviation|notes?)$/i.test(t.s));if(!reg.length)continue;
    const cnt={};reg.forEach(t=>{const v=Math.round(t.x/6);cnt[v]=(cnt[v]||0)+1});const lx=+Object.entries(cnt).sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0]*6;
    const lines=reg.filter(t=>Math.abs(t.x-lx)<10).sort((a,b)=>a.y-b.y);const ents=[];for(const t of lines){const E=ents[ents.length-1];if(E&&t.y-E.last<t.h*1.35){E.t.push(t);E.last=t.y}else ents.push({t:[t],last:t.y})}
    for(const E of ents){const f=E.t[0],label=E.t.map(t=>t.s).join(' ').replace(/\s+/g,' ').trim();if(label.length<3||label.length>80||have.has(norm(label)))continue;
     const x0=Math.max(col?col.x-70:f.x-110,(items.filter(t=>t.y>f.y-f.h*2&&t.y<E.last+f.h&&t.x<f.x-30&&!/^\d+$/.test(t.s)&&t.s.length>3).map(t=>t.x+t.w+4).sort((a,b)=>b-a)[0])||0),y0=f.y-f.h-8,y1=E.last+8;c=await render(pg,S,{x:x0-12,y:y0-12,w:f.x-x0+24,h:y1-y0+24});
     const r=crop(c,S,{x:x0,y:y0,w:f.x-6-x0,h:y1-y0});if(!r)continue;have.add(norm(label));out.push({...r,name:label,type:guess(label),tag:tagOfLabel(label),page:n,src:'legend',_c:c,_S:S})}}}
  return out}
 window.scanLegend=scanLegend;
 // bpm-v98: legend/symbol-table regions on a page (Detect marks suggestions inside them low-confidence: they're legend samples, not devices)
 const LRC=new Map();window.legendRects=async(pg,n)=>{const k=(plan?.id||'')+':'+n;if(LRC.has(k))return LRC.get(k);const vp=pg.getViewport({scale:1});let tc;try{tc=await pg.getTextContent()}catch{tc={items:[]}}
  const items=tc.items.filter(t=>(t.str||'').trim()).map(t=>{const m=pdfjsLib.Util.transform(vp.transform,t.transform);return{s:t.str.trim(),x:m[4],y:m[5]}});
  const heads=items.filter(t=>/^((fire alarm|device|notification|back-of-house|initiating)[ -])*(symbols?|legend|symbol legend|symbol schedule)$/i.test(t.s)&&!/wire|subscript|pathway|circuit|abbrev/i.test(t.s));
  const out=heads.map(H=>{const next=heads.filter(h=>h!==H&&h.y>H.y+20&&Math.abs(h.x-H.x)<300).sort((a,b)=>a.y-b.y)[0];return{x:H.x-320,y:H.y-10,w:760,h:(next?next.y-4:H.y+900)-(H.y-10)}});LRC.set(k,out);return out};
 // ---- bpm-v94: crop step (touch-friendly box with edge/corner handles, zoomed preview, Reset/Cancel/Save) ----
 const cd=ce('dialog');cd.id='cropDlg';document.body.append(cd);
 function cropUI(src,auto,title){return new Promise(done=>{const VW=Math.min(340,innerWidth-48),VH=Math.min(300,innerHeight*.42),k=Math.min(VW/src.width,VH/src.height,8),dw=Math.round(src.width*k),dh=Math.round(src.height*k);
  const def={...(auto||{x:0,y:0,w:src.width,h:src.height})};let b={...def};
  cd.innerHTML=`<h3 style="margin:4px 0">✂ ${esc(title||'Crop symbol')}</h3><small>Drag the box or its edges/corners to fit just the symbol.</small>
   <div class="cpW" style="width:${dw}px;height:${dh}px"><canvas id="cpV" width="${dw}" height="${dh}"></canvas><div class="cpB" id="cpB">${['nw','n','ne','e','se','s','sw','w'].map(h=>`<i class="cpH" data-h="${h}"></i>`).join('')}</div></div>
   <div class="row"><b>Preview</b><canvas id="cpP" width="120" height="120" class="cpP"></canvas></div>
   <div class="row"><button type="button" class="btn" id="cpR">↺ Reset</button><button type="button" class="btn" id="cpX">✕ Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="cpS">💾 Save</button></div>`;
  const v=cd.querySelector('#cpV'),B=cd.querySelector('#cpB'),P=cd.querySelector('#cpP');v.getContext('2d').drawImage(src,0,0,dw,dh);
  const clamp=()=>{b.w=Math.max(4,Math.min(b.w,src.width));b.h=Math.max(4,Math.min(b.h,src.height));b.x=Math.max(0,Math.min(b.x,src.width-b.w));b.y=Math.max(0,Math.min(b.y,src.height-b.h))};
  const paint=()=>{clamp();Object.assign(B.style,{left:b.x*k+'px',top:b.y*k+'px',width:b.w*k+'px',height:b.h*k+'px'});const g=P.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,120,120);const z=Math.min(116/b.w,116/b.h);g.imageSmoothingEnabled=z<2;g.drawImage(src,b.x,b.y,b.w,b.h,60-b.w*z/2,60-b.h*z/2,b.w*z,b.h*z)};paint();
  let drag=null;B.onpointerdown=e=>{e.preventDefault();e.stopPropagation();B.setPointerCapture(e.pointerId);drag={h:e.target.dataset.h||'m',x:e.clientX,y:e.clientY,b:{...b}}};
  B.onpointermove=e=>{if(!drag)return;const dx=(e.clientX-drag.x)/k,dy=(e.clientY-drag.y)/k,o=drag.b,h=drag.h;b={...o};
   if(h==='m'){b.x=o.x+dx;b.y=o.y+dy}else{if(h.includes('w')){const nx=Math.min(o.x+o.w-4,Math.max(0,o.x+dx));b.w=o.x+o.w-nx;b.x=nx}if(h.includes('e'))b.w=Math.max(4,Math.min(src.width-o.x,o.w+dx));if(h.includes('n')){const ny=Math.min(o.y+o.h-4,Math.max(0,o.y+dy));b.h=o.y+o.h-ny;b.y=ny}if(h.includes('s'))b.h=Math.max(4,Math.min(src.height-o.y,o.h+dy))}paint()};
  B.onpointerup=B.onpointercancel=()=>drag=null;
  cd.querySelector('#cpR').onclick=()=>{b={...def};paint()};const fin=r=>{cd.onclose=null;cd.close();done(r)};cd.querySelector('#cpX').onclick=()=>fin(null);cd.querySelector('#cpS').onclick=()=>fin({x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.w),h:Math.round(b.h)});cd.onclose=()=>done(null);cd.showModal()})}
 window.cropUI=cropUI;
 // exact crop (no auto-tighten) of canvas px box → {img,tpl,bb}
 function exact(c,S,b){const o=document.createElement('canvas');o.width=b.w;o.height=b.h;const g=o.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,b.w,b.h);g.drawImage(c,b.x,b.y,b.w,b.h,0,0,b.w,b.h);const T=grayOf(o),u=new Uint8Array(b.w*b.h);for(let i=0;i<u.length;i++)u[i]=T.g[i];
  return{img:o.toDataURL('image/png'),tpl:{w:b.w,h:b.h,s:S,g:b64(u)},bb:{x:b.x/S+(c._ox||0),y:b.y/S+(c._oy||0),w:b.w/S,h:b.h/S}}}
 const pxBox=(c,S,bb)=>bb?{x:Math.round((bb.x-(c._ox||0))*S),y:Math.round((bb.y-(c._oy||0))*S),w:Math.round(bb.w*S),h:Math.round(bb.h*S)}:null;
 const tagOfLabel=s=>/remote\s+(alarm\s+)?indicat|\bRI\b/i.test(s)?'RI':/weather.?proof|water.?proof|\bWP\b/i.test(s)?'WP':'';
 // ---- review dialog ----
 const rv=ce('dialog');rv.id='symRv';document.body.append(rv);
 function review(cands,title){if(!cands.length)return toast('No new symbols found');const opts=t=>`<option value="">— skip —</option>`+Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${k===t?' selected':''}>${esc(v.n)}</option>`).join('');
  rv.innerHTML=`<h3 style="margin:4px 0">🔣 ${esc(title)}</h3><small>Confirm each symbol's device type (skip any that aren't devices). Confirmed symbols join your master legend and Detect will look for them.</small><div class="symL">${cands.map((c,i)=>`<div class="symR"><img src="${c.img}" alt=""><div><input data-n="${i}" value="${esc(c.name||'')}" placeholder="Name"><select data-t="${i}">${opts(c.type)}</select><div class="row"><input data-g="${i}" value="${esc(c.tag||'')}" placeholder="Tag (RI/WP/R)" maxlength="3" class="symTag" aria-label="Modifier tag">${c._c?`<button type="button" class="btn" data-c="${i}">✂ Crop</button>`:''}</div></div></div>`).join('')}</div><div class="row"><button type="button" class="btn" id="symRx">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="symRok">Add to master</button></div>`;
  rv.querySelector('#symRx').onclick=()=>rv.close();rv.querySelectorAll('[data-c]').forEach(bt=>bt.onclick=async()=>{const c=cands[+bt.dataset.c],r=await cropUI(c._c,pxBox(c._c,c._S,c.bb),c.name||'Crop symbol');rv.open||rv.showModal();if(!r)return;Object.assign(c,exact(c._c,c._S,r));bt.closest('.symR').querySelector('img').src=c.img});rv.querySelector('#symRok').onclick=async()=>{await load();let k=0;cands.forEach((c,i)=>{const t=rv.querySelector(`[data-t="${i}"]`).value;if(!t)return;M.push({id:uid(),name:rv.querySelector(`[data-n="${i}"]`).value.trim()||TYPES[t].n,type:t,notes:'',img:c.img,tpl:c.tpl,tag:(rv.querySelector(`[data-g="${i}"]`)?.value||'').trim().toUpperCase(),src:c.src||'legend',planId:plan?.id,page:c.page,bb:c.bb,created:Date.now()});k++});await save();rv.close();toast(`Added ${k} symbol${k===1?'':'s'} to the master legend`);if($('#gDlg')?.open&&window.openGuides)openGuides('sym')};
  rv.showModal()}
 window.symReview=review;
 // bpm-v98: non-blocking chip instead of a modal on plan load (B1)
 function legendChip(c,pl){let h=document.getElementById('legChip');if(!h){h=ce('div','legChip');h.id='legChip';h.setAttribute('role','status');(document.getElementById('stage')||document.body).append(h);
   // bpm-v100: sit below the selection bar so the chip never covers Multi/Box/Deselect
   const sb=document.getElementById('selBar');if(sb){const pos=()=>{h.style.top=(sb.hidden||!sb.offsetHeight?8:sb.offsetTop+sb.offsetHeight+6)+'px'};new ResizeObserver(pos).observe(sb);new MutationObserver(pos).observe(sb,{attributes:true,attributeFilter:['hidden'],childList:true});pos()}}
  h.innerHTML=`<button type="button" class="btn" id="legRev">🔣 ${c.length} new legend symbol${c.length>1?'s':''} · <b>Review</b></button><button type="button" class="btn" id="legX" title="Dismiss" aria-label="Dismiss">✕</button>`;h.hidden=false;
  h.querySelector('#legRev').onclick=()=>{h.hidden=true;if(plan===pl)review(c,`Legend found: ${c.length} new symbol${c.length>1?'s':''}`)};h.querySelector('#legX').onclick=()=>h.hidden=true}
 window.legendChip=legendChip;
 // auto-scan new plans once
 const _op=openPlan;openPlan=async function(id,...a){const lc=document.getElementById('legChip');if(lc)lc.hidden=true;const r=await _op.call(this,id,...a);try{if(pdf&&plan&&!(await get('meta','legendScan:'+plan.id))){await put('meta',Date.now(),'legendScan:'+plan.id);const pl=plan;const c=await scanLegend(pdf,Array.from({length:Math.min(pl.pages,40)},(_,i)=>i+1));if(plan===pl&&c.length)legendChip(c,pl)}}catch(e){console.warn('legend scan',e)}return r};
 // ---- tap to teach ----
 window.teachSymbol=()=>{if(!plan||!pdf)return toast('Open a PDF plan first');document.querySelectorAll('dialog[open]').forEach(d=>d.close());const o=ce('div','teachOv','<div class="teachTip">Tap the middle of a device symbol</div>');stage.append(o);
  o.onpointerdown=async e=>{e.stopPropagation();const r=stage.getBoundingClientRect(),w=toW(e.clientX-r.left,e.clientY-r.top);o.remove();const S=3,pg=await pdf.getPage(page),c=await render(pg,S,{x:w.x-40,y:w.y-40,w:80,h:80}),k=crop(c,S,{x:w.x-16,y:w.y-16,w:32,h:32});const box=pxBox(c,S,k?.bb)||{x:72,y:72,w:96,h:96},cr=await cropUI(c,box,'Crop the symbol');if(!cr)return;const ex=exact(c,S,cr);let tag='';try{if(window.tagsNear)tag=(await tagsNear(pg,page,w.x,w.y,Math.max(ex.bb.w,ex.bb.h))).mods.join('+')}catch{}review([{...ex,name:'',type:'',tag,page,src:'tap',_c:c,_S:S}],'Teach symbol')}};
 {const d=$('#detBtn'),t=ce('button',d?.className||'tool','🎓<span class="tl">Teach</span>');t.id='teachBtn';t.type='button';t.title='Teach a symbol: tap it on the plan, crop, confirm type';t.onclick=()=>teachSymbol();d?d.after(t):$('#tools').append(t)}
 // ---- template matcher for Detect ----
 const tplCache=new Map();
 function tplAt(m,S){const k=m.id+'@'+S.toFixed(3);if(tplCache.has(k))return tplCache.get(k);const t=m.tpl,u=unb64(t.g),f=S/t.s,w=Math.max(4,Math.round(t.w*f)),h=Math.max(4,Math.round(t.h*f)),g=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx0=Math.floor(x/f),sx1=Math.max(sx0+1,Math.min(t.w,Math.floor((x+1)/f))),sy0=Math.floor(y/f),sy1=Math.max(sy0+1,Math.min(t.h,Math.floor((y+1)/f)));let a=0,n=0;for(let yy=sy0;yy<sy1&&yy<t.h;yy++)for(let xx=sx0;xx<sx1&&xx<t.w;xx++){a+=u[yy*t.w+xx];n++}g[y*w+x]=n?a/n:0}
  let mu=0;for(const v of g)mu+=v;mu/=g.length;let sd=0;for(let i=0;i<g.length;i++){g[i]-=mu;sd+=g[i]*g[i]}const o={g,w,h,sd:Math.sqrt(sd)};tplCache.set(k,o);return o}
 function integ(G){const W=G.w,H=G.h,I=new Float64Array((W+1)*(H+1)),I2=new Float64Array((W+1)*(H+1));for(let y=0;y<H;y++){let a=0,b=0;for(let x=0;x<W;x++){const v=G.g[y*W+x];a+=v;b+=v*v;I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+a;I2[(y+1)*(W+1)+x+1]=I2[y*(W+1)+x+1]+b}}G.I=I;G.I2=I2;return G}
 function ncc(G,T,th,x0=0,y0=0,x1=G.w-T.w,y1=G.h-T.h){if(!G.I)integ(G);const W=G.w,I=G.I,I2=G.I2,n=T.w*T.h,hits=[];if(!T.sd)return hits;const box=(A,x,y)=>A[(y+T.h)*(W+1)+x+T.w]-A[y*(W+1)+x+T.w]-A[(y+T.h)*(W+1)+x]+A[y*(W+1)+x];
  for(let y=Math.max(0,y0);y<=Math.min(y1,G.h-T.h);y++)for(let x=Math.max(0,x0);x<=Math.min(x1,W-T.w);x++){const s=box(I,x,y),s2=box(I2,x,y),vr=s2-s*s/n;if(vr<n*40)continue;let cc=0;for(let j=0;j<T.h;j++){const o=(y+j)*W+x,t=j*T.w;for(let i=0;i<T.w;i++)cc+=G.g[o+i]*T.g[t+i]}const r=cc/(Math.sqrt(vr)*T.sd);if(r>=th)hits.push({x,y,r})}return hits}
 const half=A=>{const w=A.w>>1,h=A.h>>1,g=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=2*y*A.w+2*x;g[y*w+x]=(A.g[i]+A.g[i+1]+A.g[i+A.w]+A.g[i+A.w+1])/4}return{g,w,h}};
 const med=a=>{a=a.filter(v=>v>0).sort((x,y)=>x-y);return a.length?a[a.length>>1]:0};

 // bpm-v99: phantom-pin guard. A master-template hit must (1) score NCC >= MT.r, (2) sit on real dark ink that matches the
 // template's own ink (faint grey watermark/background art, blank paper and table lines are rejected), and (3) not sit on
 // word text (room names, titles, title-block) or in the legend. Only removes candidates; geometry of kept items untouched.
 const MT={r:.86,dark:128,hit:.6,cover:.45};window.MT=MT;
 function realInk(G,T,h){let tN=0,tHit=0,gN=0,gCov=0,mx=0;let tm=0;for(const v of T.g)tm=Math.max(tm,v);const W=G.w;
  for(let j=0;j<T.h;j++)for(let i=0;i<T.w;i++){const g=G.g[(h.y+j)*W+h.x+i],t=T.g[j*T.w+i]>tm*.3;if(g>mx)mx=g;const dk=g>=MT.dark;if(t){tN++;if(dk)tHit++}if(dk){gN++;let near=false;for(let dj=-1;dj<=1&&!near;dj++)for(let di=-1;di<=1;di++){const jj=j+dj,ii=i+di;if(jj>=0&&jj<T.h&&ii>=0&&ii<T.w&&T.g[jj*T.w+ii]>tm*.3){near=true;break}}if(near)gCov++}}
  return mx>=160&&tN>0&&tHit/tN>=MT.hit&&gN>0&&gCov/gN>=MT.cover}
 const TXC=new Map();async function textBoxes(pg){const k=(plan?.id||'')+':'+pg.pageNumber;if(TXC.has(k))return TXC.get(k);const vp=pg.getViewport({scale:1});let tc;try{tc=await pg.getTextContent()}catch{tc={items:[]}}
  const out=[];for(const t of tc.items){const s=(t.str||'').trim();if(s.replace(/[^A-Za-z0-9]/g,'').length<3)continue;const m=pdfjsLib.Util.transform(vp.transform,t.transform),fh=Math.hypot(m[2],m[3])||Math.hypot(m[0],m[1]),w=(t.width||0)*(fh/(Math.hypot(t.transform[2],t.transform[3])||1)),vert=Math.abs(m[1])>Math.abs(m[0]);
   const x0=m[4],y0=m[5];let b=vert?{x0:x0-fh*.2,x1:x0+fh*1.1,y0:Math.min(y0,y0+(m[1]>0?w:-w)),y1:Math.max(y0,y0+(m[1]>0?w:-w))}:{x0:Math.min(x0,x0+w),x1:Math.max(x0,x0+w),y0:y0-fh,y1:y0+fh*.25};out.push({x0:b.x0-2,x1:b.x1+2,y0:b.y0-2,y1:b.y1+2})}
  TXC.set(k,out);return out}
 function nccAt(G,T,x0,y0,x1,y1){const W=G.w,n=T.w*T.h;let best=null;if(!T.sd)return null;for(let y=Math.max(0,y0);y<=Math.min(y1,G.h-T.h);y++)for(let x=Math.max(0,x0);x<=Math.min(x1,W-T.w);x++){let s=0,s2=0,cc=0;for(let j=0;j<T.h;j++){const o=(y+j)*W+x,t=j*T.w;for(let i=0;i<T.w;i++){const v=G.g[o+i];s+=v;s2+=v*v;cc+=v*T.g[t+i]}}const vr=s2-s*s/n;if(vr<n*40)continue;const r=cc/(Math.sqrt(vr)*T.sd);if(!best||r>best.r)best={x,y,r}}return best&&best.r>=.8?best:null}
 // dark-ink connected components (8-px dilation not needed: symbols are drawn closed), skipping word text; capped size
 function inkBlobs(G,TX){const W=G.w,H=G.h,seen=new Uint8Array(W*H),out=[],st=new Int32Array(W*H>>2);for(let i=0;i<W*H;i++){if(seen[i]||G.g[i]<MT.dark)continue;let sp=0;st[sp++]=i;seen[i]=1;let x0=W,y0=H,x1=0,y1=0,cnt=0,big=false;
   while(sp){const j=st[--sp],x=j%W,y=(j/W)|0;cnt++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(x1-x0>80||y1-y0>80)big=true;
    for(const k of [j-1,j+1,j-W,j+W,j-W-1,j-W+1,j+W-1,j+W+1]){if(k<0||k>=W*H||seen[k]||G.g[k]<MT.dark)continue;const kx=k%W;if(Math.abs(kx-x)>1)continue;seen[k]=1;if(sp<st.length)st[sp++]=k}}
   if(big||x1-x0<5||y1-y0<5)continue;const cx=(x0+x1)/2,cy=(y0+y1)/2;if(TX&&TX.some(b=>cx>b.x0&&cx<b.x1&&cy>b.y0&&cy<b.y1))continue;out.push({x0,y0,x1,y1})}return out}
 /* bpm-v103: taught / master-legend matches go through the same pin geometry as built-in Detect:
    bw/bh = OUTER edge of the printed black outline, measured on a 4x render (same meaning as the worker's vector bw/bh),
    x/y = that outline's true center, ang 0 (templates match unrotated), shape = the type's pin shape (PSH), or the
    template's ink outline (shk) when the type has no shape of its own or the print clearly uses another shape.
    The pin then gets the same locked fill/outset/de-overlap as any built-in pin. Types without a vector detector
    (heat, panel, other) are matched too. */
 const GS=4;
 function outlineAt(G,cx,cy,tw,th){const W=G.w,H=G.h,seen=new Uint8Array(W*H),st=new Int32Array(W*H);let best=null;
  for(let i=0;i<W*H;i++){if(seen[i]||G.g[i]<MT.dark)continue;let sp=0,x0=W,y0=H,x1=-1,y1=-1;const px=[];st[sp++]=i;seen[i]=1;
   while(sp){const j=st[--sp],x=j%W,y=(j/W)|0;px.push(j);if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
    for(const k of[j-1,j+1,j-W,j+W,j-W-1,j-W+1,j+W-1,j+W+1]){if(k<0||k>=W*H||seen[k]||G.g[k]<MT.dark)continue;if(Math.abs(k%W-x)>1)continue;seen[k]=1;st[sp++]=k}}
   const w=x1-x0+1,h=y1-y0+1;if(!(cx>=x0-1&&cx<=x1+1&&cy>=y0-1&&cy<=y1+1))continue;if(w<tw*.55||h<th*.55||w>tw*1.35||h>th*1.35)continue;
   if(!best||w*h>best.w*best.h)best={x0,y0,x1,y1,w,h,px}}
  return best}
 function kindOf(O,W){/* filled-silhouette widths: rect ~1 at 25% height, circle ~.87, hex ~.75, diamond ~.5; area ratio rect 1, circ .785, hex .75, dia .5 */
  const w=O.w,h=O.h,M=new Uint8Array(w*h);for(const j of O.px){const x=j%W-O.x0,y=((j/W)|0)-O.y0;M[y*w+x]=1}
  const out=new Uint8Array(w*h),q=[];for(let x=0;x<w;x++)for(const y of[0,h-1]){const k=y*w+x;if(!M[k]&&!out[k]){out[k]=1;q.push(k)}}for(let y=0;y<h;y++)for(const x of[0,w-1]){const k=y*w+x;if(!M[k]&&!out[k]){out[k]=1;q.push(k)}}
  while(q.length){const k=q.pop(),x=k%w,y=(k/w)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const kk=Y*w+X;if(!M[kk]&&!out[kk]){out[kk]=1;q.push(kk)}}}
  let A=0;for(let i=0;i<w*h;i++)if(!out[i])A++;const row=f=>{const y=Math.round((h-1)*f);let a=w,b=-1;for(let x=0;x<w;x++)if(!out[y*w+x]){if(x<a)a=x;b=x}return b<a?0:(b-a+1)/w};
  const ar=A/(w*h),r25=(row(.25)+row(.75))/2,r05=(row(.06)+row(.94))/2;
  if(ar>.9&&r05>.85)return'rect';if(ar<.62&&r25<.65)return'dia';if(r05>.4&&r25<.84)return'hex';if(ar>.7&&ar<.86)return'circ';return null}
 async function geomAt(pg,x,y,T){const R={x:x-T.w,y:y-T.h,w:T.w*2,h:T.h*2},c=await render(pg,GS,R),G=grayOf(c),cx=(x-c._ox)*GS,cy=(y-c._oy)*GS;
  const O=outlineAt(G,cx,cy,T.w*GS,T.h*GS);if(!O)return null;const bw=(O.w)/GS,bh=(O.h)/GS;
  return{x:c._ox+(O.x0+O.x1+1)/2/GS,y:c._oy+(O.y0+O.y1+1)/2/GS,bw:+bw.toFixed(2),bh:+bh.toFixed(2),kind:kindOf(O,G.w)}}
 const shkFor=(type,kind)=>{const v=PSH[type];if(!kind)return null;if(!v||type==='other')return kind;return v[0]===kind?null:kind};
 window.masterGeom=geomAt;
 window.masterItems=async(pg,n,vp,existing)=>{const L=(await load()).filter(m=>m.tpl&&dgOf(m.type));if(!L.length)return[];
  // scale: plan symbols are usually drawn smaller than the legend; estimate from Detect's own sized items on this page (same type first, else all)
  const tw=m=>m.tpl.w/m.tpl.s,sized=existing.filter(i=>i.bw>0),allR=med(sized.map(i=>i.bw))/(med(L.map(tw))||1);
  const c=await render(pg,1),G=grayOf(c),out=[],TX=await textBoxes(pg),LR=await legendRects(pg,n).catch(()=>null),BL=inkBlobs(G,TX);
  for(const m of L){const same=sized.filter(i=>i.type===detOf(dgOf(m.type))),k=same.length?med(same.map(i=>i.bw))/tw(m):allR,ks0=k>0?[Math.min(1,k)]:[1,.75,.55,.4],ks=m.src==='tap'&&!ks0.includes(1)?[1,...ks0]:ks0; // bpm-v103: a symbol taught on a plan is already at plan scale
   for(const kk of ks){const T=tplAt(m,kk),T2=tplAt(m,kk/2);if(T.w*T.h>6000||T.w<8||T.h<6)continue;const keep=[];
    // bpm-v99 (speed): test only real dark-ink blobs about the template's size, never a full-page sliding window
    for(const bl of BL){const bw=bl.x1-bl.x0+1,bh=bl.y1-bl.y0+1;if(bw<T.w*.6||bw>T.w*1.5||bh<T.h*.6||bh>T.h*1.5)continue;const cx=Math.round((bl.x0+bl.x1+1-T.w)/2),cy=Math.round((bl.y0+bl.y1+1-T.h)/2);
     const best=nccAt(G,T,cx-3,cy-3,cx+3,cy+3);if(!best)continue;if(keep.some(q=>Math.abs(q.x-best.x)<T.w*.7&&Math.abs(q.y-best.y)<T.h*.7))continue;keep.push(best)}
    for(const h of keep){const x=h.x+T.w/2,y=h.y+T.h/2;if(h.r<MT.r||!realInk(G,T,h)||(TX&&TX.some(b=>x>b.x0&&x<b.x1&&y>b.y0&&y<b.y1))||(LR&&LR.some(b=>x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h)))continue;if(m.bb&&m.planId===plan?.id&&m.page===n&&x>m.bb.x-2&&x<m.bb.x+m.bb.w+2&&y>m.bb.y-2&&y<m.bb.y+m.bb.h+2)continue;
     if([...existing,...out].some(o=>Math.hypot(o.x-x,o.y-y)<Math.max(10,T.w*.6)))continue;if(window.tagsNear){let t='';try{t=(await tagsNear(pg,n,x,y,Math.max(T.w,T.h))).mods.join('+')}catch{}if(t!==(m.tag||''))continue}out.push({type:detOf(dgOf(m.type))||null,g:dgOf(m.type),x,y,fp:{s:'master',gl:m.name.slice(0,12),v:[0,0,0,0,0,0,0]},master:m.id,_T:[T.w,T.h],_mt:m.type})}if(keep.length&&m.src==='tap')break}}
  // bpm-v103: geometry for every match: vector outline via Detect's geom() first, raster outline (4x render) as the fallback for scanned plans
  let V=[];try{V=out.length&&window.vecProbe?await vecProbe(pg,out.map(o=>({x:o.x,y:o.y,w:o._T[0],h:o._T[1]}))):[]}catch(e){console.warn('vector probe',e)}
  for(let i=0;i<out.length;i++){const o=out[i],T={w:o._T[0],h:o._T[1]};let gm=V[i]||null,src='vec';if(!gm){gm=await geomAt(pg,o.x,o.y,T).catch(()=>null);src='ras'}
   if(gm&&Math.hypot(gm.x-o.x,gm.y-o.y)<Math.max(T.w,T.h)*.35&&gm.bw>4&&gm.bh>4){o.x=gm.x;o.y=gm.y;o.bw=+gm.bw.toFixed(3);o.bh=+gm.bh.toFixed(3);if(gm.ang)o.ang=gm.ang;o.gsrc=src;const sk=shkFor(o._mt,gm.kind);if(sk)o.shk=sk}delete o._T;delete o._mt}
  return out};
 // ---- Symbols guide ----
 window.symbolGuide=()=>{const el=ce('div','gBody');const draw=async()=>{await load();
  el.innerHTML=`<div class="row"><button type="button" class="btn" id="syAdd">➕ Add custom</button><button type="button" class="btn" id="syTeach">👆 Teach from plan</button><button type="button" class="btn" id="syScan">🔎 Scan plan legend</button></div>
  <h4>App pin symbols</h4><div class="symG">${Object.entries(TYPES).map(([k,v])=>`<div class="symC"><canvas data-k="${k}" width="56" height="44"></canvas><small>${esc(v.n)}</small></div>`).join('')}</div>
  <h4>My master legend (${M.length})</h4><div class="symG">${M.map(m=>`<div class="symC"><img src="${m.img}" alt=""><small><b>${esc(m.name)}</b><br>${esc(TYPES[m.type]?.n||m.type)}${m.tpl?' · Detect':''}${m.notes?'<br>'+esc(m.notes):''}</small><div class="row"><button type="button" class="btn" data-e="${m.id}">✎ Edit</button><button type="button" class="btn danger" data-d="${m.id}">🗑 Delete</button></div></div>`).join('')||'<small>None yet. Open a plan with a legend, or teach a symbol.</small>'}</div>`;
  el.querySelectorAll('canvas[data-k]').forEach(cv=>{const c=cv.getContext('2d'),k=cv.dataset.k,[,w,h]=pshOf(k),s=Math.min(40/w,30/h,2.4);c.save();c.translate(28,22);c.scale(s,s);try{drawPin(c,{type:k,x:0,y:0,status:'not tested'},1,false,false,true)}catch{}c.restore()});
  el.querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{if(!await uiConfirm('Delete this symbol from the master legend?'))return;M=M.filter(m=>m.id!==b.dataset.d);await save();draw()});
  el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>edit(M.find(m=>m.id===b.dataset.e)));
  el.querySelector('#syAdd').onclick=()=>edit(null);el.querySelector('#syTeach').onclick=()=>teachSymbol();
  el.querySelector('#syScan').onclick=async()=>{if(!pdf)return toast('Open a PDF plan first');busy(1,'Scanning legend');try{const c=await scanLegend(pdf,Array.from({length:plan.pages},(_,i)=>i+1));busy(0);review(c,`Legend: ${c.length} new symbol${c.length===1?'':'s'}`)}catch(e){busy(0);toast('Legend scan failed')}}};
  const ed=ce('dialog');ed.id='symEd';document.body.append(ed);
  function edit(m){const o=m||{name:'',type:'',notes:'',img:''};ed.innerHTML=`<h3 style="margin:4px 0">${m?'✎ Edit':'➕ New'} symbol</h3><label>Name <input id="seN" value="${esc(o.name)}"></label><label>Device type <select id="seT">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${k===o.type?' selected':''}>${esc(v.n)}</option>`).join('')}</select></label><label>Notes <textarea id="seO">${esc(o.notes||'')}</textarea></label>
   <div class="row"><b>Image</b><span class="sp"></span><button type="button" class="btn" id="seClr">🧽 Clear</button><label class="btn">📷 Photo<input type="file" accept="image/*" capture="environment" id="seF" hidden></label><label class="btn" id="seUpL">⬆ Upload<input type="file" accept="image/*" id="seU" hidden></label></div><canvas id="seC" width="240" height="160" class="seC"></canvas>
   <div class="row"><button type="button" class="btn" id="seX">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="seS">💾 Save</button></div>`;
   const cv=ed.querySelector('#seC'),c=cv.getContext('2d');const blank=()=>{c.fillStyle='#fff';c.fillRect(0,0,240,160)};blank();if(o.img){const im=new Image();im.onload=()=>{const k=Math.min(220/im.width,140/im.height);c.drawImage(im,120-im.width*k/2,80-im.height*k/2,im.width*k,im.height*k)};im.src=o.img}
   let dn=null;cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);const r=cv.getBoundingClientRect();dn=[(e.clientX-r.left)*240/r.width,(e.clientY-r.top)*160/r.height]};cv.onpointermove=e=>{if(!dn)return;const r=cv.getBoundingClientRect(),p=[(e.clientX-r.left)*240/r.width,(e.clientY-r.top)*160/r.height];c.strokeStyle='#111';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(...dn);c.lineTo(...p);c.stroke();dn=p};cv.onpointerup=()=>dn=null;
   ed.querySelector('#seClr').onclick=blank;const pick=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const im=new Image();im.src=URL.createObjectURL(f);try{await im.decode()}catch{return toast('Could not read that image')}const z=Math.min(1,900/Math.max(im.width,im.height)),src=document.createElement('canvas');src.width=Math.round(im.width*z);src.height=Math.round(im.height*z);const sg=src.getContext('2d');sg.fillStyle='#fff';sg.fillRect(0,0,src.width,src.height);sg.drawImage(im,0,0,src.width,src.height);URL.revokeObjectURL(im.src);
    const G=grayOf(src),ib=inkBox(G,90),auto=ib?{x:Math.max(0,ib.x0-4),y:Math.max(0,ib.y0-4),w:Math.min(src.width,ib.x1-ib.x0+9),h:Math.min(src.height,ib.y1-ib.y0+9)}:null,r=await cropUI(src,auto,'Crop the symbol');ed.open||ed.showModal();if(!r)return;blank();const kk=Math.min(230/r.w,150/r.h);c.drawImage(src,r.x,r.y,r.w,r.h,120-r.w*kk/2,80-r.h*kk/2,r.w*kk,r.h*kk)};
   ed.querySelector('#seF').onchange=pick;ed.querySelector('#seU').onchange=pick;
   ed.querySelector('#seX').onclick=()=>ed.close();ed.querySelector('#seS').onclick=async()=>{await load();const v={name:ed.querySelector('#seN').value.trim()||'Custom symbol',type:ed.querySelector('#seT').value,notes:ed.querySelector('#seO').value.trim(),img:cv.toDataURL('image/png')};
    if(m)Object.assign(m,v,{updated:Date.now()});else M.push({id:uid(),...v,src:'user',created:Date.now()});await save();ed.close();draw()};ed.showModal()}
  draw();return el};
})();
