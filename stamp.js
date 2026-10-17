// bpm-v107: Stamp tool. Labeled stamp bar (shape picker wheel, Size, Color, Opacity, Rotation + 0/45/90, Fill/Outline + stroke width, live preview,
// My stamps = saved + recent, IndexedDB). Each tap on the plan places one stamp centered at the tap until another tool is chosen.
// A placed stamp is a normal closed (or open) path markup with m.stamp={k,sz,rot,fill,dx,dy}: select/Edit/Copy/Multi/Box/Undo/Layers/export all
// work like any markup; Properties can change color, opacity, size and rotation. Pins are never touched.
(()=>{const ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const K=.5523,P=(pts)=>({N:pts.map(([x,y])=>({x,y,ix:0,iy:0,ox:0,oy:0,k:'c'})),closed:true});
 const circ=(rx,ry,cy=0)=>({N:[[0,-ry],[rx,0],[0,ry],[-rx,0]].map(([x,y],i)=>{const h=i%2?[0,ry*K]:[rx*K,0];const s=i===0||i===3?1:-1;return{x,y:y+cy,ix:-h[0]*(i===0?1:i===2?-1:0),iy:-h[1]*(i===1?1:i===3?-1:0),ox:h[0]*(i===0?1:i===2?-1:0),oy:h[1]*(i===1?1:i===3?-1:0),k:'s'}}),closed:true});
 const reg=(n,r,r2,rot=-Math.PI/2)=>{const p=[];const m=r2?2*n:n;for(let i=0;i<m;i++){const a=rot+i*2*Math.PI/m,rr=r2&&i%2?r2:r;p.push([rr*Math.cos(a),rr*Math.sin(a)])}return p};
 const xs=(()=>{const t=.2,pl=[[-t/2,-.5],[t/2,-.5],[t/2,-t/2],[.5,-t/2],[.5,t/2],[t/2,t/2],[t/2,.5],[-t/2,.5],[-t/2,t/2],[-.5,t/2],[-.5,-t/2],[-t/2,-t/2]],c=Math.SQRT1_2;return pl.map(([x,y])=>[(x-y)*c*1.25,(x+y)*c*1.25])})();
 const rrect=(w,h,r)=>{const x=w/2,y=h/2,k=r*K;return{N:[{x:-x+r,y:-y,ix:-k,iy:0,ox:0,oy:0},{x:x-r,y:-y,ix:0,iy:0,ox:k,oy:0},{x:x,y:-y+r,ix:0,iy:-k,ox:0,oy:0},{x:x,y:y-r,ix:0,iy:0,ox:0,oy:k},{x:x-r,y:y,ix:k,iy:0,ox:0,oy:0},{x:-x+r,y:y,ix:0,iy:0,ox:-k,oy:0},{x:-x,y:y-r,ix:0,iy:k,ox:0,oy:0},{x:-x,y:-y+r,ix:0,iy:0,ox:0,oy:-k}].map(n=>({...n,k:'c'})),closed:true}};
 const cloud=()=>{const n=10,C=[];for(let i=0;i<n;i++){const a=i*2*Math.PI/n;C.push([.42*Math.cos(a),.28*Math.sin(a)])}const N=C.map(([x,y])=>({x,y,ix:0,iy:0,ox:0,oy:0,k:'c'}));
  for(let i=0;i<n;i++){const a=N[i],b=N[(i+1)%n],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,l=Math.hypot(mx,my)||1,d=Math.hypot(b.x-a.x,b.y-a.y),nx=mx/l*d*.6,ny=my/l*d*.6;a.ox=nx;a.oy=ny;b.ix=nx;b.iy=ny}return{N,closed:true}};
 const heart={N:[{x:0,y:-.25,ix:0,iy:-.25,ox:0,oy:-.25,k:'c'},{x:-.5,y:-.1,ix:0,iy:-.4,ox:0,oy:.3,k:'s'},{x:0,y:.45,ix:-.1,iy:-.15,ox:.1,oy:-.15,k:'c'},{x:.5,y:-.1,ix:0,iy:.3,ox:0,oy:-.4,k:'s'}],closed:true};
 const arc={N:[{x:-.5,y:.25,ix:0,iy:0,ox:0,oy:-.5*K,k:'c'},{x:0,y:-.25,ix:-.5*K,iy:0,ox:.5*K,oy:0,k:'s'},{x:.5,y:.25,ix:0,iy:-.5*K,ox:0,oy:0,k:'c'}],closed:false};
 const SHP=[['check','✔','Check',()=>P([[-.48,.02],[-.32,-.14],[-.12,.08],[.36,-.42],[.5,-.28],[-.12,.36]])],['x','✖','X',()=>P(xs)],['star','★','Star',()=>P(reg(5,.5,.2))],
  ['circle','●','Circle',()=>circ(.5,.5)],['square','■','Square',()=>P([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]])],['triangle','▲','Triangle',()=>P([[0,-.5],[.5,.4],[-.5,.4]])],
  ['diamond','◆','Diamond',()=>P([[0,-.5],[.38,0],[0,.5],[-.38,0]])],['arrow','➜','Arrow',()=>P([[-.5,-.14],[.08,-.14],[.08,-.34],[.5,0],[.08,.34],[.08,.14],[-.5,.14]])],
  ['heart','♥','Heart',()=>heart],['flag','⚑','Flag',()=>P([[-.4,.5],[-.4,-.5],[.45,-.28],[-.3,-.06],[-.3,.5]])],
  // existing v104 markup shapes
  ['rect','▢','Box',()=>P([[-.5,-.32],[.5,-.32],[.5,.32],[-.5,.32]])],['rrect','▢','Rounded box',()=>rrect(1,.64,.14)],['ellipse','◯','Ellipse',()=>circ(.5,.32)],['arc','◠','Arc',()=>arc],
  ['tri','△','Triangle (outline)',()=>P([[0,-.45],[.5,.42],[-.5,.42]])],['poly','⬡','Polygon',()=>P(reg(6,.5))],['star5','☆','Star (outline)',()=>P(reg(5,.5,.2))],['cloud','☁','Revision cloud',()=>cloud()]];
 const SH=Object.fromEntries(SHP.map(s=>[s[0],s]));
 const DEF={k:'check',sz:28,op:100,rot:0,fill:true,sw:2},FK='bpm-stamp';let S=Object.assign({},DEF,JSON.parse(localStorage.getItem(FK)||'{}'));if(!SH[S.k])S.k='check';
 const save=()=>localStorage.setItem(FK,JSON.stringify(S));let MINE=[],RECENT=[];
 (async()=>{try{MINE=(await get('meta','stampsMine'))||[];RECENT=(await get('meta','stampsRecent'))||[]}catch{}})();
 // nodes for a config at center (cx,cy) in plan units (size = longest side)
 function build(cfg,cx,cy){const sh=SH[cfg.k]||SH.check,g=sh[3](),a=(cfg.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),z=cfg.sz,R=(x,y)=>[(x*c-y*s)*z,(x*s+y*c)*z];
  return{N:g.N.map(n=>{const[x,y]=R(n.x,n.y),[ix,iy]=R(n.ix,n.iy),[ox,oy]=R(n.ox,n.oy);return{x:cx+x,y:cy+y,ix,iy,ox,oy,k:n.k||'c'}}),closed:g.closed}}
 const canFill=k=>(SH[k]?SH[k][3]().closed:false);
 function makeMarkup(cfg,cx,cy){const{N,closed}=build(cfg,cx,cy),fill=!!cfg.fill&&closed;const m={id:uid(),planId:plan.id,page,type:'path',color:cfg.color||$('#color').value,w:fill?Math.max(.8,cfg.sw*.5):cfg.sw,opacity:clampOp((cfg.op||100)/100),fill:fill||undefined};
  PEN_API.writeNodes(m,N,closed,false);m.type='path';m.stamp={k:cfg.k,sz:cfg.sz,rot:cfg.rot||0,fill,sw:cfg.sw,dx:cx-m.x1,dy:cy-m.y1};return m}
 window.STAMP_API={build,makeMarkup,shapes:SHP.map(s=>s[0]),cfg:()=>({...S,color:$('#color').value}),set:o=>{Object.assign(S,o);save();bar()},rebake};
 // rebake a placed stamp (Properties: size / rotation); keeps its center, color, opacity
 function rebake(m,o){const st=m.stamp;if(!st)return m;const cx=m.x1+st.dx,cy=m.y1+st.dy,cfg={k:st.k,sz:o.sz??st.sz,rot:o.rot??st.rot,fill:st.fill,sw:st.sw};const{N,closed}=build(cfg,cx,cy);const a=structuredClone(m);
  PEN_API.writeNodes(a,N,closed,false);a.type='path';a.stamp={...st,sz:cfg.sz,rot:cfg.rot,dx:cx-a.x1,dy:cy-a.y1};return a}
 // preview svg / canvas
 function svgOf(cfg,px=34,col){const{N,closed}=build({...cfg,sz:.8},0,0);let d=`M${N[0].x} ${N[0].y}`;const seg=(p,q)=>`C${p.x+p.ox} ${p.y+p.oy} ${q.x+q.ix} ${q.y+q.iy} ${q.x} ${q.y}`;for(let i=1;i<N.length;i++)d+=seg(N[i-1],N[i]);if(closed)d+=seg(N[N.length-1],N[0])+'Z';
  const c=col||$('#color').value,fill=cfg.fill&&closed;return`<svg width="${px}" height="${px}" viewBox="-.5 -.5 1 1" aria-hidden="true"><path d="${d}" fill="${fill?c:'none'}" stroke="${c}" stroke-width="${fill?.03:Math.max(.04,cfg.sw*.02)}" stroke-linejoin="round" opacity="${(cfg.op||100)/100}"/></svg>`}
 window.stampSvg=svgOf;
 // ---- tool button + bar ----
 const tb=$('[data-t="stamp"]');
 function bar(){let b=$('#stBar');if(!b){b=ce('div');b.id='stBar';b.setAttribute('role','toolbar');b.setAttribute('aria-label','Stamp');stage.append(b)}if(tool!=='stamp'){b.hidden=true;window.toastLift&&setTimeout(toastLift,0);return}b.hidden=false;
  const sh=SH[S.k],cf=canFill(S.k),chip=(c,i,kind)=>`<button type="button" class="btn stChip" data-${kind}="${i}" title="${esc(c.name||SH[c.k]?.[2]||'')}">${svgOf(c,22,c.color)}<span class="tl">${esc(c.name||'')}</span></button>`;
  b.innerHTML=`<div class="stR"><span class="pbH">🔖 Stamp</span><span class="stPv" title="Preview">${svgOf(S,40)}</span>
   <button type="button" class="btn stB" id="stShape" title="Shape">${sh[1]}<span class="tl">${esc(sh[2])} ▾</span></button>
   <button type="button" class="btn stB" id="stCol" title="Color"><span class="stSw" style="background:${$('#color').value}"></span><span class="tl">Color</span></button>
   <button type="button" class="btn stB${S.fill&&cf?' on':''}" id="stFill" ${cf?'':'disabled'} title="Fill or outline">${S.fill&&cf?'◼':'◻'}<span class="tl">${S.fill&&cf?'Fill':'Outline'}</span></button>
   <button type="button" class="btn stB" id="stSave" title="Save these settings as a named stamp">＋<span class="tl">Save stamp</span></button></div>
   <div class="stR stS"><label class="stL">Size <input type="range" id="stSz" min="8" max="160" step="2" value="${S.sz}"><b id="stSzV">${S.sz}</b></label>
   <label class="stL">Opacity <input type="range" id="stOp" min="15" max="100" step="5" value="${S.op}"><b id="stOpV">${S.op}%</b></label>
   <label class="stL">Rotation <input type="range" id="stRot" min="0" max="359" step="1" value="${S.rot}"><b id="stRotV">${S.rot}°</b></label>
   <span class="stSnap">${[0,45,90].map(a=>`<button type="button" class="btn stA${S.rot===a?' on':''}" data-rot="${a}">${a}°</button>`).join('')}</span>
   <label class="stL"${S.fill&&cf?' hidden':''}>Stroke <input type="range" id="stSw" min="1" max="8" step="1" value="${S.sw}"><b id="stSwV">${S.sw}</b></label></div>
   <div class="stR stMine"><span class="stH">My stamps</span>${MINE.map((c,i)=>chip(c,i,'mine')).join('')||'<small class="stE">none saved yet</small>'}<span class="stH">Recent</span>${RECENT.map((c,i)=>chip(c,i,'rec')).join('')||'<small class="stE">—</small>'}</div>`;
  const q=s=>b.querySelector(s),pv=()=>{q('.stPv').innerHTML=svgOf(S,40)};
  q('#stShape').onclick=function(){wheelAnchor(this);wheelOpen('Stamp shape',SHP.map(s=>({k:s[0],l:s[2],html:`<span class="whIc">${svgOf({...S,k:s[0],rot:0},20,'#fff')}</span>${esc(s[2])}`})),SHP.findIndex(s=>s[0]===S.k),x=>{S.k=x.k;save();bar()})};
  q('#stCol').onclick=()=>{colSheet();const d=$('#colDlg');if(d){const f=()=>{bar();d.removeEventListener('close',f)};d.addEventListener('close',f)}};
  q('#stFill').onclick=()=>{S.fill=!S.fill;save();bar()};
  const rng=(id,k,fmt)=>{const r=q(id);r.oninput=()=>{S[k]=+r.value;q(id+'V').textContent=fmt(S[k]);if(k==='rot')b.querySelectorAll('.stA').forEach(x=>x.classList.toggle('on',+x.dataset.rot===S.rot));save();pv()}};
  rng('#stSz','sz',v=>v);rng('#stOp','op',v=>v+'%');rng('#stRot','rot',v=>v+'°');if(q('#stSw'))rng('#stSw','sw',v=>v);
  b.querySelectorAll('.stA').forEach(x=>x.onclick=()=>{S.rot=+x.dataset.rot;save();bar()});
  b.querySelectorAll('[data-mine],[data-rec]').forEach(x=>{x.onclick=()=>{const c=x.dataset.mine!=null?MINE[+x.dataset.mine]:RECENT[+x.dataset.rec];Object.assign(S,{k:c.k,sz:c.sz,op:c.op,rot:c.rot,fill:c.fill,sw:c.sw});if(c.color){$('#color').value=c.color;$('#color').dispatchEvent(new Event('input',{bubbles:true}))}save();bar()}});
  q('#stSave').onclick=async()=>{const nm=await uiPrompt('Name this stamp',SH[S.k][2]);if(nm==null||!String(nm).trim())return;MINE.unshift({...S,color:$('#color').value,name:String(nm).trim().slice(0,24)});MINE=MINE.slice(0,24);await put('meta',MINE,'stampsMine');bar();toast('Saved to My stamps')};
  window.toastLift&&setTimeout(toastLift,0)}
 window.stampBar=bar;document.querySelectorAll('[data-t]').forEach(x=>x.addEventListener('click',()=>setTimeout(bar,0)));
 $('#color').addEventListener('input',()=>{if(tool==='stamp')bar()});
 // ---- placing: a tap (no drag, one finger) on the plan places one stamp; drags/pinches pan and zoom as usual ----
 let dn=null;
 stage.addEventListener('pointerdown',e=>{if(tool!=='stamp'||!plan||!(e.target===cv||e.target===ov))return;dn=dn&&dn.n?{...dn,multi:true}:{x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId,n:1}},true);
 stage.addEventListener('pointerup',async e=>{if(tool!=='stamp'||!dn||dn.id!==e.pointerId){if(dn&&dn.id!==e.pointerId)dn.multi=true;return}const d=dn;dn=null;if(d.multi||Math.hypot(e.clientX-d.x,e.clientY-d.y)>8||performance.now()-d.t>700)return;
  e.stopImmediatePropagation();try{if(typeof ptrs!=='undefined')ptrs.delete(e.pointerId);gesture=null}catch{}
  const r=stage.getBoundingClientRect(),w=toW(e.clientX-r.left,e.clientY-r.top),cfg={...S,color:$('#color').value},m=makeMarkup(cfg,w.x,w.y);await change('markups',null,m);requestDraw(false);
  const key=JSON.stringify([cfg.k,cfg.sz,cfg.op,cfg.rot,cfg.fill,cfg.sw,cfg.color]);RECENT=[cfg,...RECENT.filter(c=>JSON.stringify([c.k,c.sz,c.op,c.rot,c.fill,c.sw,c.color])!==key)].slice(0,6);try{await put('meta',RECENT,'stampsRecent')}catch{}
  const rr=$('#stBar .stMine');if(rr)bar()},true);
 stage.addEventListener('pointercancel',()=>{dn=null},true);
 // ---- Properties: size + rotation for selected stamps ----
 const bk=$('#bkM');if(bk){const d=ce('div');d.id='bkSt';d.innerHTML=`<b>Stamps</b><label><input type="checkbox" id="bkRotOn" style="width:auto"> Rotation <input type="range" id="bkRot" min="0" max="359" value="0" style="width:110px;vertical-align:middle"> <span id="bkRotLbl">0°</span></label>
   <span class="row" style="gap:4px">${[0,45,90].map(a=>`<button type="button" class="btn" data-bkrot="${a}">${a}°</button>`).join('')}</span>
   <label><input type="checkbox" id="bkSzOn" style="width:auto"> Size <input type="range" id="bkSz" min="8" max="160" step="2" value="28" style="width:110px;vertical-align:middle"> <span id="bkSzLbl">28</span></label>`;bk.after(d);
  const r=$('#bkRot'),z=$('#bkSz');r.oninput=()=>{$('#bkRotOn').checked=true;$('#bkRotLbl').textContent=r.value+'°'};z.oninput=()=>{$('#bkSzOn').checked=true;$('#bkSzLbl').textContent=z.value};
  d.querySelectorAll('[data-bkrot]').forEach(x=>x.onclick=()=>{r.value=x.dataset.bkrot;r.oninput()});
  const _ob=window.openBulk||openBulk;openBulk=function(){_ob();const st=selItems().filter(o=>o.stamp);d.hidden=!st.length;$('#bkRotOn').checked=$('#bkSzOn').checked=false;if(st.length){r.value=st[0].stamp.rot||0;z.value=st[0].stamp.sz;$('#bkRotLbl').textContent=r.value+'°';$('#bkSzLbl').textContent=z.value}};
  const go=$('#bkGo'),_og=go.onclick;go.onclick=async e=>{const ro=$('#bkRotOn').checked?+r.value:null,so=$('#bkSzOn').checked?+z.value:null,st=selItems().filter(o=>o.stamp&&o.planId===plan?.id);
   const other=$('#bkCOn').checked||$('#bkSize').value||$('#bkOOn').checked||$('#bkStatus').value||$('#bkType').value;if(other)await _og.call(go,e);else $('#bulkDlg').close();
   if((ro!=null||so!=null)&&st.length){const L=st.map(o=>{const cur=markups.find(x=>x.id===o.id)||o;return{store:'markups',id:o.id,before:cur,after:rebake(cur,{rot:ro??undefined,sz:so??undefined})}});await changeMulti(L);requestDraw(false);toast(`Stamp${L.length>1?'s':''} updated · Undo ↶ in the top bar`)}}}
})();
