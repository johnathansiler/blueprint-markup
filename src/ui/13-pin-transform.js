// bpm-v87: pin transform handles (rotate / resize / two-finger) for the selected or just-placed pin.
// Writes p.ang (radians), p.bw, p.bh — the same fields Detect writes — so drawPin / outset / de-overlap stay on the bpm-v50 standard.
(()=>{let quick=null,drag=null;const D=Math.PI/180,MIN=4.5,MAX=200;
 const _q=quickChip;quickChip=function(p){quick=p?p.id:null;const r=_q.apply(this,arguments);sync();return r};
 const target=()=>{if(!plan||walk)return null;if(tool==='select'&&!msel.length&&sel&&isPinO(sel.o))return sel.o;if(quick)return pins.find(p=>p.id===quick&&p.page===page)||null;return null};
 const box=document.createElement('div');box.id='ptx';box.hidden=true;box.innerHTML='<div class="pxB"></div><div class="pxS"></div><div class="pxR" data-h="rot" title="Rotate (Snap: 15°)"></div>'+['nw','ne','se','sw'].map(c=>`<div class="pxH ${c}" data-h="${c}" title="Resize (Snap: keep ratio)"></div>`).join('')+'<div class="pxA"></div>';stage.append(box);
 const dims=p=>{const[,w,h]=pshOf(p);return[w,h]};
 function sync(){const p=target();if(!p){box.hidden=true;return}const[w,h]=dims(p),f=OFFMAP&&OFFMAP.get(p.id),c=toS(p.x+(f?f.dx:0),p.y+(f?f.dy:0)),W=Math.max(w*view.s,16),H=Math.max(h*view.s,16),a=isFinite(p.ang)?p.ang:0;
  box.hidden=false;Object.assign(box.style,{left:c.x+'px',top:c.y+'px',width:W+'px',height:H+'px',transform:`translate(-50%,-50%) rotate(${a}rad)`});
  const deg=((Math.round(a/D*10)/10)%360+360)%360;box.querySelector('.pxA').textContent=deg.toFixed(deg%1?1:0)+'°';box.querySelector('.pxA').style.transform=`rotate(${-a}rad)`;box.dataset.id=p.id}
 const _ov=drawOverlay;drawOverlay=function(){const r=_ov.apply(this,arguments);sync();return r};
 const live=(p,o)=>{Object.assign(p,o);requestDraw(false);sync()};
 const commit=async(p,b)=>{const a=structuredClone(p);Object.assign(p,b);if(JSON.stringify([a.ang,a.bw,a.bh])!==JSON.stringify([b.ang,b.bw,b.bh]))await change('pins',b,a);draw()};
 function begin(p,kind,pts){const[w,h]=dims(p);drag={p,kind,b:structuredClone(p),w,h,a:isFinite(p.ang)?p.ang:0,pts}}
 const ctr=p=>{const f=OFFMAP&&OFFMAP.get(p.id),r=stage.getBoundingClientRect(),c=toS(p.x+(f?f.dx:0),p.y+(f?f.dy:0));return{x:c.x+r.left,y:c.y+r.top}};
 const clampS=v=>Math.max(MIN,Math.min(MAX,v));
 box.addEventListener('pointerdown',e=>{const h=e.target.dataset.h;if(!h)return;e.stopPropagation();e.preventDefault();const p=pins.find(x=>x.id===box.dataset.id);if(!p)return;box.setPointerCapture(e.pointerId);const ch=$('#editChip');if(ch)ch.hidden=true;begin(p,h,null);drag.id=e.pointerId});
 box.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();const p=drag.p,c=ctr(p),dx=e.clientX-c.x,dy=e.clientY-c.y;
  if(drag.kind==='rot'){let a=Math.atan2(dy,dx)+Math.PI/2;if(snapK())a=Math.round(a/(15*D))*15*D;a=((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI);live(p,{ang:a,bw:drag.b.bw||drag.w,bh:drag.b.bh||drag.h})}
  else{const C=Math.cos(-drag.a),S=Math.sin(-drag.a),lx=(dx*C-dy*S)/view.s,ly=(dx*S+dy*C)/view.s;let w=clampS(Math.abs(lx)*2),h=clampS(Math.abs(ly)*2);if(snapK()){const k=Math.max(w/drag.w,h/drag.h);w=clampS(drag.w*k);h=clampS(drag.h*k)}live(p,{bw:+w.toFixed(2),bh:+h.toFixed(2),ang:drag.a||p.ang})}});
 const end=e=>{if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();const d=drag;drag=null;commit(d.p,d.b)};box.addEventListener('pointerup',end);['click','dblclick','pointerup'].forEach(k=>box.addEventListener(k,e=>{if(e.target.dataset.h)e.stopPropagation()}));box.addEventListener('pointercancel',end);
 // two-finger rotate / pinch on the selected pin (touch): both fingers near the pin
 const T=new Map();let g=null;
 stage.addEventListener('pointerdown',e=>{if(e.target===cv&&!g&&!drag)quick=quick&&tool==='pin'?quick:null;if(e.pointerType!=='touch')return;const p=target();if(!p||box.hidden){T.clear();return}
  const r=box.getBoundingClientRect(),m=48,inn=e.clientX>r.left-m&&e.clientX<r.right+m&&e.clientY>r.top-m&&e.clientY<r.bottom+m;if(!inn&&!T.size)return;T.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(T.size===2&&inn){e.stopImmediatePropagation();const[a,b]=[...T.values()];begin(p,'pinch');g={d:Math.hypot(b.x-a.x,b.y-a.y),t:Math.atan2(b.y-a.y,b.x-a.x)};const first=[...T.keys()][0];
   stage.dispatchEvent(new PointerEvent('pointercancel',{pointerId:first,pointerType:'touch',bubbles:true}));if(drag.b.x!==p.x||drag.b.y!==p.y){Object.assign(p,{x:drag.b.x,y:drag.b.y})}}},true);
 stage.addEventListener('pointermove',e=>{if(!g||!T.has(e.pointerId))return;e.stopImmediatePropagation();T.set(e.pointerId,{x:e.clientX,y:e.clientY});const[a,b]=[...T.values()],d=Math.hypot(b.x-a.x,b.y-a.y),t=Math.atan2(b.y-a.y,b.x-a.x),k=d/Math.max(1,g.d);
  let an=drag.a+(t-g.t);if(snapK())an=Math.round(an/(15*D))*15*D;an=((an%(2*Math.PI))+2*Math.PI)%(2*Math.PI);live(drag.p,{ang:an,bw:+clampS(drag.w*k).toFixed(2),bh:+clampS(drag.h*k).toFixed(2)})},true);
 const tend=e=>{if(!T.has(e.pointerId))return;T.delete(e.pointerId);if(g){e.stopImmediatePropagation();if(T.size<2){g=null;const d=drag;drag=null;T.clear();if(d)commit(d.p,d.b)}}};
 stage.addEventListener('pointerup',tend,true);stage.addEventListener('pointercancel',e=>{if(g&&e.isTrusted===false)return;tend(e)},true);
 document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.t!=='pin')quick=null;sync()}));
 window.ptxSync=sync;
})();
