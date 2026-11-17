// bpm-v147: move a marker by dragging it (user: "if I make a marker, I can easily click and move it around").
//  * Normal view: press and hold a marker for a moment (it buzzes and says "Drag to move"), then drag it. A quick drag still pans, a quick tap still opens the card.
//  * Marker mode: drag an existing marker straight away (a tap still places a new marker, as before).
//  * A marker that shows its handles (just placed, or selected with Select): drag the marker itself; corners resize and the top knob rotates, as before.
// Only the marker's position (x, y) changes, through change(), so Undo puts it back. Pin size, rotation, outset and de-overlap rules are not touched. Off during a walk test.
(()=>{if(typeof stage==='undefined'||typeof hit!=='function')return;const HOLD=380,SLOP=6;
 const local=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 let D=null;// {id,p,orig,s0,w0,armed,moved,timer,mode}
 const live=(e)=>{const q=local(e),w=toW(q.x,q.y);D.p.x=D.orig.x+(w.x-D.w0.x);D.p.y=D.orig.y+(w.y-D.w0.y);requestDraw(false)};
 async function finish(){const d=D;D=null;if(!d)return;clearTimeout(d.timer);document.body.classList.remove('pinDragging');
  if(d.armed&&d.moved){const after=structuredClone(d.p);Object.assign(d.p,{x:d.orig.x,y:d.orig.y});await change('pins',d.orig,after);draw();toast(`Marker ${after.address?after.address+' ':''}moved`,true);return true}
  if(d.armed&&d.mode==='hold'){draw();openPin(d.p);return true}return false}
 function arm(){if(!D||D.armed)return;D.armed=true;gesture=null;/* stops the pan or the new-marker tap that was starting */document.body.classList.add('pinDragging');if(navigator.vibrate)navigator.vibrate(25);
  if(D.mode==='hold')toast('Drag to move this marker');requestDraw(false)}
 stage.addEventListener('pointerdown',e=>{if(D||!plan||walk||e.target!==cv||e.button>0)return;if(ptrs&&ptrs.size){if(D){clearTimeout(D.timer);D=null}return}
  if(tool!=='pan'&&tool!=='pin')return;const q=local(e),w=toW(q.x,q.y),h=hit(w);if(!h||h.kind!=='p')return;
  D={id:e.pointerId,p:h.o,orig:structuredClone(h.o),s0:q,w0:w,armed:false,moved:false,mode:tool==='pan'?'hold':'drag'};
  if(D.mode==='hold')D.timer=setTimeout(()=>{if(D&&!D.moved&&ptrs.size===1)arm()},HOLD)},true);
 stage.addEventListener('pointermove',e=>{if(!D)return;if(e.pointerId!==D.id){/* second finger: pinch wins */if(!D.armed){clearTimeout(D.timer);D=null}return}
  const q=local(e),far=Math.hypot(q.x-D.s0.x,q.y-D.s0.y)>SLOP;
  if(!D.armed){if(!far)return;if(D.mode==='hold'){clearTimeout(D.timer);D=null;return}/* Marker mode: dragging a marker moves it */arm()}
  if(far)D.moved=true;if(D.moved){e.stopImmediatePropagation();live(e)}},true);
 const up=e=>{if(!D||e.pointerId!==D.id)return;if(!D.armed){clearTimeout(D.timer);D=null;return}if(e.type==='pointercancel'){Object.assign(D.p,{x:D.orig.x,y:D.orig.y});D.moved=false;D.mode='drag'}finish()};
 stage.addEventListener('pointerup',up,true);stage.addEventListener('pointercancel',up,true);
 // drag the marker inside its handles box (just placed, or selected)
 const box=document.getElementById('ptx');if(box){const g=document.createElement('div');g.className='pxM';g.title='Drag to move this marker';g.setAttribute('aria-label','Drag to move this marker');box.append(g);let G=null;
  g.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();const p=pins.find(x=>x.id===box.dataset.id);if(!p||walk)return;g.setPointerCapture(e.pointerId);const q=local(e);G={id:e.pointerId,p,orig:structuredClone(p),s0:q,w0:toW(q.x,q.y),moved:false};const ch=document.getElementById('editChip');if(ch)ch.hidden=true});
  g.addEventListener('pointermove',e=>{if(!G||G.id!==e.pointerId)return;e.stopPropagation();const q=local(e);if(!G.moved&&Math.hypot(q.x-G.s0.x,q.y-G.s0.y)<=SLOP)return;G.moved=true;const w=toW(q.x,q.y);G.p.x=G.orig.x+(w.x-G.w0.x);G.p.y=G.orig.y+(w.y-G.w0.y);requestDraw(false)});
  const gend=async e=>{if(!G||G.id!==e.pointerId)return;e.stopPropagation();const d=G;G=null;if(e.type==='pointercancel'||!d.moved){Object.assign(d.p,{x:d.orig.x,y:d.orig.y});draw();return}
   const after=structuredClone(d.p);Object.assign(d.p,{x:d.orig.x,y:d.orig.y});await change('pins',d.orig,after);draw();toast(`Marker ${after.address?after.address+' ':''}moved`,true)};
  g.addEventListener('pointerup',gend);g.addEventListener('pointercancel',gend);['click','dblclick'].forEach(k=>g.addEventListener(k,e=>e.stopPropagation()))}
})();
