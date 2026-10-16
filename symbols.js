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
     const x0=Math.max(col?col.x-70:f.x-110,(items.filter(t=>t.y>f.y-f.h*2&&t.y<E.last+f.h&&t.x<f.x-30&&!/^\d+$/.test(t.s)&&t.s.length>3).map(t=>t.x+t.w+4).sort((a,b)=>b-a)[0])||0),y0=f.y-f.h-8,y1=E.last+8;c=await render(pg,S,{x:x0-4,y:y0-4,w:f.x-x0+8,h:y1-y0+8});
     const r=crop(c,S,{x:x0,y:y0,w:f.x-6-x0,h:y1-y0});if(!r)continue;have.add(norm(label));out.push({...r,name:label,type:guess(label),page:n,src:'legend'})}}}
  return out}
 window.scanLegend=scanLegend;
 // ---- review dialog ----
 const rv=ce('dialog');rv.id='symRv';document.body.append(rv);
 function review(cands,title){if(!cands.length)return toast('No new symbols found');const opts=t=>`<option value="">— skip —</option>`+Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${k===t?' selected':''}>${esc(v.n)}</option>`).join('');
  rv.innerHTML=`<h3 style="margin:4px 0">🔣 ${esc(title)}</h3><small>Confirm each symbol's device type (skip any that aren't devices). Confirmed symbols join your master legend and Detect will look for them.</small><div class="symL">${cands.map((c,i)=>`<div class="symR"><img src="${c.img}" alt=""><div><input data-n="${i}" value="${esc(c.name||'')}" placeholder="Name"><select data-t="${i}">${opts(c.type)}</select></div></div>`).join('')}</div><div class="row"><button type="button" class="btn" id="symRx">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="symRok">Add to master</button></div>`;
  rv.querySelector('#symRx').onclick=()=>rv.close();rv.querySelector('#symRok').onclick=async()=>{await load();let k=0;cands.forEach((c,i)=>{const t=rv.querySelector(`[data-t="${i}"]`).value;if(!t)return;M.push({id:uid(),name:rv.querySelector(`[data-n="${i}"]`).value.trim()||TYPES[t].n,type:t,notes:'',img:c.img,tpl:c.tpl,src:c.src||'legend',planId:plan?.id,page:c.page,bb:c.bb,created:Date.now()});k++});await save();rv.close();toast(`Added ${k} symbol${k===1?'':'s'} to the master legend`);if($('#gDlg')?.open&&window.openGuides)openGuides('sym')};
  rv.showModal()}
 window.symReview=review;
 // auto-scan new plans once
 const _op=openPlan;openPlan=async function(id,...a){const r=await _op.call(this,id,...a);try{if(pdf&&plan&&!(await get('meta','legendScan:'+plan.id))){await put('meta',Date.now(),'legendScan:'+plan.id);const pl=plan;const c=await scanLegend(pdf,Array.from({length:Math.min(pl.pages,40)},(_,i)=>i+1));if(plan===pl&&c.length)review(c,`Legend found: ${c.length} new symbol${c.length>1?'s':''}`)}}catch(e){console.warn('legend scan',e)}return r};
 // ---- tap to teach ----
 window.teachSymbol=()=>{if(!plan||!pdf)return toast('Open a PDF plan first');document.querySelectorAll('dialog[open]').forEach(d=>d.close());const o=ce('div','teachOv','<div class="teachTip">Tap the middle of a device symbol</div>');stage.append(o);
  o.onpointerdown=async e=>{e.stopPropagation();const r=stage.getBoundingClientRect(),w=toW(e.clientX-r.left,e.clientY-r.top);o.remove();const S=3,pg=await pdf.getPage(page),c=await render(pg,S,{x:w.x-40,y:w.y-40,w:80,h:80}),k=crop(c,S,{x:w.x-16,y:w.y-16,w:32,h:32});if(!k)return toast('No symbol ink found there');review([{...k,name:'',type:'',page,src:'tap'}],'Teach symbol')}};
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
 window.masterItems=async(pg,n,vp,existing)=>{const L=(await load()).filter(m=>m.tpl&&dgOf(m.type)&&detOf(dgOf(m.type)));if(!L.length)return[];
  // scale: plan symbols are usually drawn smaller than the legend; estimate from Detect's own sized items on this page (same type first, else all)
  const tw=m=>m.tpl.w/m.tpl.s,sized=existing.filter(i=>i.bw>0),allR=med(sized.map(i=>i.bw))/(med(L.map(tw))||1);
  const c=await render(pg,1),G=integ(grayOf(c)),G2=integ(half(G)),out=[];
  for(const m of L){const same=sized.filter(i=>i.type===detOf(dgOf(m.type))),k=same.length?med(same.map(i=>i.bw))/tw(m):allR,ks=k>0?[Math.min(1,k)]:[1,.75,.55,.4];
   for(const kk of ks){const T=tplAt(m,kk),T2=tplAt(m,kk/2);if(T.w*T.h>6000||T.w<8||T.h<6)continue;const cand=ncc(G2,T2,.6).sort((a,b)=>b.r-a.r).slice(0,400),keep=[];
    for(const h of cand){const best=ncc(G,T,.8,h.x*2-3,h.y*2-3,h.x*2+3,h.y*2+3).sort((a,b)=>b.r-a.r)[0];if(!best)continue;if(keep.some(q=>Math.abs(q.x-best.x)<T.w*.7&&Math.abs(q.y-best.y)<T.h*.7))continue;keep.push(best)}
    for(const h of keep){const x=h.x+T.w/2,y=h.y+T.h/2;if(m.bb&&m.planId===plan?.id&&m.page===n&&x>m.bb.x-2&&x<m.bb.x+m.bb.w+2&&y>m.bb.y-2&&y<m.bb.y+m.bb.h+2)continue;
     if([...existing,...out].some(o=>Math.hypot(o.x-x,o.y-y)<Math.max(10,T.w*.6)))continue;out.push({type:detOf(dgOf(m.type)),x,y,fp:{s:'master',gl:m.name.slice(0,12),v:[0,0,0,0,0,0,0]},master:m.id})}}}
  return out};
 // ---- Symbols guide ----
 window.symbolGuide=()=>{const el=ce('div','gBody');const draw=async()=>{await load();
  el.innerHTML=`<div class="row"><button type="button" class="btn" id="syAdd">➕ Add custom</button><button type="button" class="btn" id="syTeach">👆 Teach from plan</button><button type="button" class="btn" id="syScan">🔎 Scan plan legend</button></div>
  <h4>App pin symbols</h4><div class="symG">${Object.entries(TYPES).map(([k,v])=>`<div class="symC"><canvas data-k="${k}" width="56" height="44"></canvas><small>${esc(v.n)}</small></div>`).join('')}</div>
  <h4>My master legend (${M.length})</h4><div class="symG">${M.map(m=>`<div class="symC"><img src="${m.img}" alt=""><small><b>${esc(m.name)}</b><br>${esc(TYPES[m.type]?.n||m.type)}${m.tpl?' · Detect':''}${m.notes?'<br>'+esc(m.notes):''}</small><div class="row"><button type="button" class="btn" data-e="${m.id}">✎ Edit</button><button type="button" class="btn danger" data-d="${m.id}">🗑 Delete</button></div></div>`).join('')||'<small>None yet. Open a plan with a legend, or teach a symbol.</small>'}</div>`;
  el.querySelectorAll('canvas[data-k]').forEach(cv=>{const c=cv.getContext('2d'),k=cv.dataset.k,[,w,h]=pshOf(k),s=Math.min(40/w,30/h,2.4);c.save();c.translate(28,22);c.scale(s,s);try{drawPin(c,{type:k,x:0,y:0,status:'not tested'},1,false,false,true)}catch{}c.restore()});
  el.querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this symbol from the master legend?'))return;M=M.filter(m=>m.id!==b.dataset.d);await save();draw()});
  el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>edit(M.find(m=>m.id===b.dataset.e)));
  el.querySelector('#syAdd').onclick=()=>edit(null);el.querySelector('#syTeach').onclick=()=>teachSymbol();
  el.querySelector('#syScan').onclick=async()=>{if(!pdf)return toast('Open a PDF plan first');busy(1,'Scanning legend');try{const c=await scanLegend(pdf,Array.from({length:plan.pages},(_,i)=>i+1));busy(0);review(c,`Legend: ${c.length} new symbol${c.length===1?'':'s'}`)}catch(e){busy(0);toast('Legend scan failed')}}};
  const ed=ce('dialog');ed.id='symEd';document.body.append(ed);
  function edit(m){const o=m||{name:'',type:'',notes:'',img:''};ed.innerHTML=`<h3 style="margin:4px 0">${m?'✎ Edit':'➕ New'} symbol</h3><label>Name <input id="seN" value="${esc(o.name)}"></label><label>Device type <select id="seT">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${k===o.type?' selected':''}>${esc(v.n)}</option>`).join('')}</select></label><label>Notes <textarea id="seO">${esc(o.notes||'')}</textarea></label>
   <div class="row"><b>Image</b><span class="sp"></span><button type="button" class="btn" id="seClr">🧽 Clear</button><label class="btn">📷 Photo<input type="file" accept="image/*" id="seF" hidden></label></div><canvas id="seC" width="240" height="160" class="seC"></canvas>
   <div class="row"><button type="button" class="btn" id="seX">Cancel</button><span class="sp"></span><button type="button" class="btn pri" id="seS">💾 Save</button></div>`;
   const cv=ed.querySelector('#seC'),c=cv.getContext('2d');const blank=()=>{c.fillStyle='#fff';c.fillRect(0,0,240,160)};blank();if(o.img){const im=new Image();im.onload=()=>{const k=Math.min(220/im.width,140/im.height);c.drawImage(im,120-im.width*k/2,80-im.height*k/2,im.width*k,im.height*k)};im.src=o.img}
   let dn=null;cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);const r=cv.getBoundingClientRect();dn=[(e.clientX-r.left)*240/r.width,(e.clientY-r.top)*160/r.height]};cv.onpointermove=e=>{if(!dn)return;const r=cv.getBoundingClientRect(),p=[(e.clientX-r.left)*240/r.width,(e.clientY-r.top)*160/r.height];c.strokeStyle='#111';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(...dn);c.lineTo(...p);c.stroke();dn=p};cv.onpointerup=()=>dn=null;
   ed.querySelector('#seClr').onclick=blank;ed.querySelector('#seF').onchange=e=>{const f=e.target.files[0];if(!f)return;const im=new Image();im.onload=()=>{blank();const k=Math.min(240/im.width,160/im.height);c.drawImage(im,120-im.width*k/2,80-im.height*k/2,im.width*k,im.height*k);URL.revokeObjectURL(im.src)};im.src=URL.createObjectURL(f)};
   ed.querySelector('#seX').onclick=()=>ed.close();ed.querySelector('#seS').onclick=async()=>{await load();const v={name:ed.querySelector('#seN').value.trim()||'Custom symbol',type:ed.querySelector('#seT').value,notes:ed.querySelector('#seO').value.trim(),img:cv.toDataURL('image/png')};
    if(m)Object.assign(m,v,{updated:Date.now()});else M.push({id:uid(),...v,src:'user',created:Date.now()});await save();ed.close();draw()};ed.showModal()}
  draw();return el};
})();
