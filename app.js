'use strict';
pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
const $=s=>document.querySelector(s);
const TYPES={smoke:{c:'#dc2626',l:'S',n:'Smoke'},heat:{c:'#ea580c',l:'H',n:'Heat'},pull:{c:'#be185d',l:'P',n:'Pull station'},horn:{c:'#7c3aed',l:'HS',n:'Horn/strobe'},panel:{c:'#0f766e',l:'FACP',n:'Panel',sq:1},module:{c:'#2563eb',l:'M',n:'Module',sq:1},other:{c:'#475569',l:'?',n:'Other'}};
const ST={passed:'#16a34a',failed:'#dc2626','not tested':'#ca8a04'};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
// ---------- IndexedDB ----------
let dbp;function db(){return dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('blueprint-markup',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('plans',{keyPath:'id'});for(const s of['markups','pins','media']){const o=d.createObjectStore(s,{keyPath:'id'});o.createIndex(s==='media'?'pinId':'planId',s==='media'?'pinId':'planId')}d.createObjectStore('meta')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
async function tx(store,mode,fn){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(store,mode),s=t.objectStore(store);let out;const r=fn(s);if(r)r.onsuccess=()=>out=r.result;t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error)})}
const put=(s,v,k)=>tx(s,'readwrite',o=>o.put(v,k)),get=(s,k)=>tx(s,'readonly',o=>o.get(k)),del=(s,k)=>tx(s,'readwrite',o=>o.delete(k)),all=s=>tx(s,'readonly',o=>o.getAll()),byIdx=(s,i,v)=>tx(s,'readonly',o=>o.index(i).getAll(v));
// ---------- state ----------
const cv=$('#cv'),ctx=cv.getContext('2d'),stage=$('#stage');
let plan=null,pdf=null,page=1,pageW=0,pageH=0,bmp=null,bmpScale=0,renderTask=null,renderTimer=0;
let markups=[],pins=[],view={s:1,x:0,y:0},tool='pan',sel=null,draft=null;
const dpr=()=>window.devicePixelRatio||1;
let lastW=0,lastH=0;function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(lastW&&pageW){const cx=(lastW/2-view.x)/view.s,cy=(lastH/2-view.y)/view.s;view.x=w/2-cx*view.s;view.y=h/2-cy*view.s}const wide=innerWidth>=800;if(wide!==resize.wide){resize.wide=wide;$('#panel').hidden=!wide;renderList()}lastW=w;lastH=h;cv.width=w*dpr();cv.height=h*dpr();draw();scheduleRender()}
new ResizeObserver(()=>resize()).observe(stage);
window.addEventListener('resize',resize);
const toW=(sx,sy)=>({x:(sx-view.x)/view.s,y:(sy-view.y)/view.s});
// ---------- plans ----------
async function refreshPlans(){const ps=(await all('plans')).sort((a,b)=>b.added-a.added);$('#planSel').innerHTML=ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')||'<option>(no plans)</option>';if(plan)$('#planSel').value=plan.id}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;e.target.value='';const p={id:uid(),name:f.name,kind:f.type==='application/pdf'||/\.pdf$/i.test(f.name)?'pdf':'image',blob:f,added:Date.now()};await put('plans',p);await openPlan(p.id)};
$('#planSel').onchange=e=>openPlan(e.target.value);
async function openPlan(id,pg=1){const p=await get('plans',id);if(!p)return;plan=p;busy(1);
 if(pdf){pdf.destroy();pdf=null}
 if(p.kind==='pdf'){pdf=await pdfjsLib.getDocument({data:new Uint8Array(await p.blob.arrayBuffer()),disableFontFace:false}).promise;p.pages=pdf.numPages}else p.pages=1;
 markups=await byIdx('markups','planId',id);pins=await byIdx('pins','planId',id);
 await put('meta',id,'last');await refreshPlans();$('#empty').hidden=true;await gotoPage(Math.min(pg,p.pages));busy(0)}
async function buildPageSel(){let labels=null;try{labels=pdf&&await pdf.getPageLabels()}catch{}const sel=$('#pageSel');sel.innerHTML='';for(let i=1;i<=plan.pages;i++){const n=pins.filter(x=>x.page===i).length;sel.add(new Option(`${labels?.[i-1]||'Pg '+i} / ${plan.pages}${n?` (${n}📍)`:''}`,i))}sel.value=page}
$('#pageSel').onchange=e=>gotoPage(+e.target.value);$('#prev').onclick=()=>plan&&page>1&&gotoPage(page-1);$('#next').onclick=()=>plan&&page<plan.pages&&gotoPage(page+1);
async function gotoPage(n){page=n;sel=null;bmp=null;bmpScale=0;busy(1);
 if(pdf){const pg=await pdf.getPage(n);const vp=pg.getViewport({scale:1});pageW=vp.width;pageH=vp.height}
 else{const im=await createImageBitmap(plan.blob);pageW=im.width;pageH=im.height;bmp=im;bmpScale=1}
 put('meta',{plan:plan.id,page:n},'lastPage');fit();await buildPageSel();await renderPage();renderList();busy(0)}
function fit(){if(!pageW)return;const w=stage.clientWidth,h=stage.clientHeight,s=Math.min(w/pageW,h/pageH)*.95;view={s,x:(w-pageW*s)/2,y:(h-pageH*s)/2};draw()}
$('#fit').onclick=fit;
// crisp re-render: render the page at current zoom*dpr, capped by pixel budget
const MAXPX=36e6;
function wantScale(){return Math.min(view.s*dpr(),Math.sqrt(MAXPX/(pageW*pageH)),10)}
function scheduleRender(){if(!pdf)return;clearTimeout(renderTimer);const w=wantScale();if(bmpScale&&w<=bmpScale*1.15&&w>=bmpScale/2.5)return;renderTimer=setTimeout(renderPage,180)}
async function renderPage(){if(!pdf){draw();return}const want=wantScale(),pn=page;if(renderTask){renderTask.cancel();renderTask=null}
 const pg=await pdf.getPage(pn),vp=pg.getViewport({scale:want}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
 const t=pg.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:vp,background:'#fff'});renderTask=t;
 try{await t.promise}catch(e){return}if(renderTask!==t||pn!==page)return;renderTask=null;
 if(bmp&&bmp.close&&!(bmp instanceof HTMLCanvasElement))bmp.close?.();bmp=c;bmpScale=want;draw()}
function busy(b){$('#busy').hidden=!b}
// ---------- drawing ----------
function cloudPath(c,x1,y1,x2,y2,s){const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.abs(x2-x1),h=Math.abs(y2-y1);const r=Math.max(6/s,Math.min(w,h)/8,1);const pts=[];
 const seg=(ax,ay,bx,by)=>{const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.round(L/(2*r)));for(let i=0;i<n;i++)pts.push([ax+(bx-ax)*i/n,ay+(by-ay)*i/n])};
 seg(x,y,x+w,y);seg(x+w,y,x+w,y+h);seg(x+w,y+h,x,y+h);seg(x,y+h,x,y);c.beginPath();
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,rr=Math.hypot(b[0]-a[0],b[1]-a[1])/2,ang=Math.atan2(b[1]-a[1],b[0]-a[0]);c.moveTo(a[0],a[1]);c.arc(mx,my,rr,ang+Math.PI,ang,false)}c.stroke()}
function drawMarkup(c,m,s){c.save();c.strokeStyle=m.color;c.lineWidth=(m.w||3)/s;c.lineJoin=c.lineCap='round';const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);
 if(m.type==='rect')c.strokeRect(x,y,w,h);
 else if(m.type==='ellipse'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2||.1,h/2||.1,0,0,7);c.stroke()}
 else if(m.type==='check'){c.lineWidth=Math.max(c.lineWidth,Math.min(w,h)/8);c.beginPath();c.moveTo(x,y+h*.55);c.lineTo(x+w*.38,y+h);c.lineTo(x+w,y);c.stroke()}
 else if(m.type==='cloud')cloudPath(c,m.x1,m.y1,m.x2,m.y2,s);c.restore()}
function drawPin(c,p,s,hl){const T=TYPES[p.type]||TYPES.other,r=13/s;c.save();c.translate(p.x,p.y);
 c.fillStyle=T.c;c.strokeStyle=hl?'#facc15':'#fff';c.lineWidth=(hl?4:2)/s;c.beginPath();
 if(T.sq)c.rect(-r,-r,2*r,2*r);else if(p.type==='heat'){c.moveTo(0,-r*1.2);c.lineTo(r*1.1,r*.8);c.lineTo(-r*1.1,r*.8);c.closePath()}else if(p.type==='pull'){c.moveTo(0,-r*1.2);c.lineTo(r*1.2,0);c.lineTo(0,r*1.2);c.lineTo(-r*1.2,0);c.closePath()}else c.arc(0,0,r,0,7);
 c.fill();c.stroke();c.fillStyle='#fff';c.font=`bold ${(T.l.length>2?7:T.l.length>1?9:12)/s}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(T.l,0,p.type==='heat'?r*.15:0);
 c.fillStyle=ST[p.status]||ST['not tested'];c.beginPath();c.arc(r*.9,-r*.9,4.5/s,0,7);c.fill();c.stroke();
 if(p.address){c.font=`${11/s}px sans-serif`;c.textAlign='left';c.lineWidth=3/s;c.strokeStyle='#fff';c.strokeText(p.address,r*1.3,r*.3);c.fillStyle='#111';c.fillText(p.address,r*1.3,r*.3)}c.restore()}
function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);if(!plan||!pageW)return;const d=dpr();ctx.setTransform(view.s*d,0,0,view.s*d,view.x*d,view.y*d);
 ctx.fillStyle='#fff';ctx.fillRect(0,0,pageW,pageH);if(bmp){ctx.imageSmoothingQuality='high';ctx.drawImage(bmp,0,0,pageW,pageH)}
 for(const m of markups)if(m.page===page)drawMarkup(ctx,m,view.s);if(draft)drawMarkup(ctx,draft,view.s);
 if(sel&&sel.kind==='m'){const m=sel.o;ctx.save();ctx.setLineDash([6/view.s,4/view.s]);ctx.strokeStyle='#2563eb';ctx.lineWidth=1.5/view.s;const p=8/view.s;ctx.strokeRect(Math.min(m.x1,m.x2)-p,Math.min(m.y1,m.y2)-p,Math.abs(m.x2-m.x1)+2*p,Math.abs(m.y2-m.y1)+2*p);ctx.restore()}
 for(const p of pins)if(p.page===page)drawPin(ctx,p,view.s,sel&&sel.o===p)}
// ---------- hit testing ----------
function hit(w){const tol=10/view.s;for(const p of[...pins].reverse())if(p.page===page&&Math.hypot(p.x-w.x,p.y-w.y)<18/view.s)return{kind:'p',o:p};
 for(const m of[...markups].reverse()){if(m.page!==page)continue;const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),X=Math.max(m.x1,m.x2),Y=Math.max(m.y1,m.y2);if(w.x>x-tol&&w.x<X+tol&&w.y>y-tol&&w.y<Y+tol)return{kind:'m',o:m}}return null}
// ---------- input ----------
const ptrs=new Map();let gesture=null;
stage.addEventListener('pointerdown',e=>{if(!plan)return;stage.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
 if(ptrs.size===2){draft=null;const[a,b]=[...ptrs.values()];gesture={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y),c:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},v:{...view}};return}
 const w=toW(e.offsetX,e.offsetY);const start={sx:e.offsetX,sy:e.offsetY,moved:false};
 if(tool==='pan'||e.button===1){gesture={type:'pan',...start,v:{...view}};return}
 if(tool==='select'){sel=hit(w);if(sel)gesture={type:'move',...start,w,orig:JSON.parse(JSON.stringify(sel.o))};else gesture={type:'pan',...start,v:{...view}};draw();return}
 if(tool==='pin'){gesture={type:'pin',...start,w};return}
 draft={id:uid(),planId:plan.id,page,type:tool,x1:w.x,y1:w.y,x2:w.x,y2:w.y,color:$('#color').value,w:3};gesture={type:'draw',...start}});
stage.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(!gesture)return;
 if(gesture.type==='pinch'&&ptrs.size>=2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2},g=gesture,s=clampS(g.v.s*d/g.d),wx=(g.c.x-g.v.x)/g.v.s,wy=(g.c.y-g.v.y)/g.v.s;view={s,x:c.x-wx*s,y:c.y-wy*s};draw();scheduleRender();return}
 const dx=e.offsetX-gesture.sx,dy=e.offsetY-gesture.sy;if(Math.hypot(dx,dy)>4)gesture.moved=true;
 if(gesture.type==='pan'){view.x=gesture.v.x+dx;view.y=gesture.v.y+dy;draw()}
 else if(gesture.type==='move'){const o=sel.o,g=gesture.orig,ddx=dx/view.s,ddy=dy/view.s;if(sel.kind==='p'){o.x=g.x+ddx;o.y=g.y+ddy}else{o.x1=g.x1+ddx;o.x2=g.x2+ddx;o.y1=g.y1+ddy;o.y2=g.y2+ddy}draw()}
 else if(gesture.type==='draw'){const w=toW(e.offsetX,e.offsetY);draft.x2=w.x;draft.y2=w.y;draw()}});
async function up(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);const g=gesture;if(g?.type==='pinch'){if(ptrs.size===0)gesture=null;return}gesture=null;if(!g)return;
 const w=toW(e.offsetX,e.offsetY);
 if(!g.moved&&(g.type==='pan'||g.type==='move')){const h=hit(w);if(h&&h.kind==='p'){openPin(h.o);return}}
 if(g.type==='move'&&g.moved)await put(sel.kind==='p'?'pins':'markups',sel.o);
 if(g.type==='pin'){const p={id:uid(),planId:plan.id,page,x:g.w.x,y:g.w.y,type:$('#pinType').value,address:'',loop:'',status:'not tested',notes:'',created:Date.now()};pins.push(p);await put('pins',p);draw();renderList();buildPageSel();openPin(p)}
 if(g.type==='draw'){const d=draft;draft=null;if(d.type==='check'&&!g.moved){const s=24/view.s;d.x1=w.x-s*.4;d.y1=w.y-s*.6;d.x2=w.x+s*.6;d.y2=w.y+s*.4}
  if(Math.abs(d.x2-d.x1)+Math.abs(d.y2-d.y1)>3/view.s){markups.push(d);await put('markups',d)}draw()}}
stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
const clampS=s=>Math.max(.02,Math.min(s,40));
stage.addEventListener('wheel',e=>{if(!plan)return;e.preventDefault();const k=Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)),s=clampS(view.s*k),wx=(e.offsetX-view.x)/view.s,wy=(e.offsetY-view.y)/view.s;view={s,x:e.offsetX-wx*s,y:e.offsetY-wy*s};draw();scheduleRender()},{passive:false});
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tool=b.dataset.t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));if(tool!=='select'){sel=null;draw()}});
async function deleteSel(){if(!sel)return;if(sel.kind==='m'){markups=markups.filter(m=>m!==sel.o);await del('markups',sel.o.id)}else await deletePin(sel.o);sel=null;draw()}
$('#del').onclick=deleteSel;document.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))deleteSel()});
$('#color').oninput=async e=>{if(sel?.kind==='m'){sel.o.color=e.target.value;await put('markups',sel.o);draw()}};
// ---------- pin dialog ----------
const dlg=$('#pinDlg'),form=$('#pinForm');let cur=null,urls=[];
for(const[k,t]of Object.entries(TYPES)){$('#pinType').add(new Option(t.n,k));$('#dType').add(new Option(t.n,k));$('#fType').add(new Option(t.n,k))}
async function openPin(p){cur=p;for(const k of['type','address','loop','status','notes'])form.elements[k].value=p[k]||'';await showMedia();dlg.showModal()}
async function showMedia(){urls.forEach(URL.revokeObjectURL);urls=[];const ms=await byIdx('media','pinId',cur.id);$('#media').innerHTML='';
 for(const m of ms.sort((a,b)=>a.created-b.created)){const u=URL.createObjectURL(m.blob);urls.push(u);const d=document.createElement('div');d.className='m';
  d.innerHTML=m.kind==='photo'?`<img src="${u}">`:m.kind==='video'?`<video src="${u}" controls playsinline></video>`:`<audio src="${u}" controls></audio>`;
  const x=document.createElement('button');x.type='button';x.className='btn';x.textContent='✕';x.onclick=async()=>{await del('media',m.id);showMedia()};d.append(x);$('#media').append(d)}}
async function addMedia(kind,blob,name){await put('media',{id:uid(),pinId:cur.id,kind,blob,name,created:Date.now()});showMedia()}
$('#addPhoto').onchange=e=>{for(const f of e.target.files)addMedia('photo',f,f.name);e.target.value=''};
$('#addVideo').onchange=e=>{for(const f of e.target.files)addMedia('video',f,f.name);e.target.value=''};
let rec=null;$('#rec').onclick=async()=>{const b=$('#rec');if(rec){rec.stop();return}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true});const ch=[];rec=new MediaRecorder(st);rec.ondataavailable=e=>ch.push(e.data);
  rec.onstop=()=>{st.getTracks().forEach(t=>t.stop());addMedia('audio',new Blob(ch,{type:rec.mimeType||'audio/webm'}),'voice note');rec=null;b.textContent='🎙 Record'};rec.start();b.textContent='⏹ Stop'}catch(err){alert('Microphone unavailable: '+err.message)}};
form.addEventListener('submit',async e=>{if(e.submitter?.value!=='save')return;for(const k of['type','address','loop','status','notes'])cur[k]=form.elements[k].value;await put('pins',cur);draw();renderList()});
dlg.addEventListener('close',()=>{if(rec)rec.stop()});
$('#pinDel').onclick=async()=>{if(!confirm('Delete this pin and its media?'))return;await deletePin(cur);dlg.close()};
async function deletePin(p){pins=pins.filter(x=>x!==p);await del('pins',p.id);for(const m of await byIdx('media','pinId',p.id))await del('media',m.id);draw();renderList();buildPageSel()}
// ---------- list ----------
$('#listBtn').onclick=()=>{$('#panel').hidden=!$('#panel').hidden;renderList()};$('#closeList').onclick=()=>$('#panel').hidden=true;
['#q','#fType','#fStat','#allPages'].forEach(s=>$(s).oninput=renderList);
function renderList(){if($('#panel').hidden)return;const q=$('#q').value.toLowerCase(),ft=$('#fType').value,fs=$('#fStat').value,ap=$('#allPages').checked;
 const L=pins.filter(p=>(ap||p.page===page)&&(!ft||p.type===ft)&&(!fs||p.status===fs)&&(!q||[p.address,p.loop,p.notes,TYPES[p.type]?.n].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.page-b.page||String(a.address).localeCompare(b.address,undefined,{numeric:true}));
 $('#pinList').innerHTML=L.map(p=>`<li data-id="${p.id}"><span class="dot" style="background:${TYPES[p.type].c}"></span><div><b>${esc(TYPES[p.type].n)}</b> ${esc(p.address)}${p.loop?' · Loop '+esc(p.loop):''}<br><small class="st-${p.status.split(' ')[0]}">${p.status}</small> <small>pg ${p.page}</small></div></li>`).join('')||'<li>No pins</li>';
 $('#pinList').querySelectorAll('li[data-id]').forEach(li=>li.onclick=async()=>{const p=pins.find(x=>x.id===li.dataset.id);if(p.page!==page)await gotoPage(p.page);const s=Math.max(view.s,1.5/dpr()*2);view={s,x:stage.clientWidth/2-p.x*s,y:stage.clientHeight/2-p.y*s};sel={kind:'p',o:p};draw();scheduleRender();if(innerWidth<700)$('#panel').hidden=true})}
// ---------- export ----------
async function composite(){const sc=Math.min(3,Math.sqrt(30e6/(pageW*pageH)));const c=document.createElement('canvas');c.width=Math.round(pageW*sc);c.height=Math.round(pageH*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 if(pdf){const pg=await pdf.getPage(page);await pg.render({canvasContext:x,viewport:pg.getViewport({scale:sc})}).promise}else x.drawImage(bmp,0,0,c.width,c.height);
 x.setTransform(sc,0,0,sc,0,0);const ps=1/Math.max(1,Math.max(pageW,pageH)/1200);for(const m of markups)if(m.page===page)drawMarkup(x,m,1/1.5);for(const p of pins)if(p.page===page)drawPin(x,p,ps,false);return c}
const base=()=>`${plan.name.replace(/\.[^.]+$/,'')}-p${page}`;
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
$('#exPng').onclick=async()=>{if(!plan)return;busy(1);const c=await composite();c.toBlob(b=>{dl(b,base()+'.png');busy(0)},'image/png')};
$('#exPdf').onclick=async()=>{if(!plan)return;busy(1);const c=await composite();const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:pageW>pageH?'l':'p',unit:'pt',format:[pageW,pageH]});
 doc.addImage(c.toDataURL('image/jpeg',.9),'JPEG',0,0,pageW,pageH);
 const ps=pins.filter(p=>p.page===page);if(ps.length){doc.addPage([612,792],'p');doc.setFontSize(14);doc.text(`Device list - ${plan.name} page ${page}`,40,40);doc.setFontSize(10);let y=64;
  for(const p of ps){if(y>760){doc.addPage([612,792],'p');y=40}doc.text(`${TYPES[p.type].n} | Addr ${p.address||'-'} | Loop ${p.loop||'-'} | ${p.status}${p.notes?' | '+p.notes.slice(0,60):''}`,40,y);y+=16}}
 dl(doc.output('blob'),base()+'.pdf');busy(0)};
// ---------- boot ----------
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js');
(async()=>{resize();await refreshPlans();const last=await get('meta','last'),lp=await get('meta','lastPage');if(last)await openPlan(last,lp&&lp.plan===last?lp.page:1)})();
