// bpm-v143: stacking rule for floating pieces opened from a button: they never cover another bar, button or open control.
// Free area = below the top bars (#proj, #top) and above whatever is docked at the bottom (#tools, a bottom Pages bar, the walk / sweep bars),
// between side panels (vertical Pages bar on the left, Pins / Layers panels on the right).
// Bottom chain, lowest first: bottom bar > Pages bar > Draw panel > Width row > Opacity row > list. Each piece sits right above the piece
// below it (or right below its button when the button is in the top bar), keeps its own natural size, and only shrinks and scrolls when
// the free area is smaller than its content. The plan canvas may sit underneath.
(()=>{const M=6;
 const vis=e=>{if(!e||e.hidden)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;const r=e.getBoundingClientRect();return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight};
 const R=e=>e.getBoundingClientRect();
 function area(){let top=0,bot=innerHeight,left=0,right=innerWidth;
  for(const s of ['#proj','#top','#legChip','#vChip','#ghBar']){const e=document.querySelector(s);if(vis(e)&&R(e).top<innerHeight/2)top=Math.max(top,R(e).bottom)}
  for(const s of ['#tools','#walk','#swBar']){const e=document.querySelector(s);if(vis(e)&&R(e).top>innerHeight/2)bot=Math.min(bot,R(e).top)}
  const th=document.getElementById('thumbs');if(vis(th)){const r=R(th);if(r.width>r.height){if(r.top>innerHeight/2)bot=Math.min(bot,r.top)}else if(r.left<innerWidth/2)left=Math.max(left,r.right);else right=Math.min(right,r.left)}
  for(const s of ['#panel','#lyrP']){const e=document.querySelector(s);if(vis(e)&&!e.classList.contains('rlOut')){const r=R(e);if(r.height>innerHeight/3){if(r.left>innerWidth/2)right=Math.min(right,r.left);else left=Math.max(left,r.right)}else if(r.top>innerHeight/2)bot=Math.min(bot,r.top)}}
  for(const s of ['#fhBar','#penBar','#shpChip','#stBar','#selBar','#updBar','#toast']){const e=document.querySelector(s);if(vis(e)&&R(e).top>innerHeight/2)bot=Math.min(bot,R(e).top)}
  if(right-left<240){left=0;right=innerWidth}/* narrow: never squeeze a list into a sliver */
  return{top,bot,left,right}}
 const CHAIN=['navDraw','widBar','wbOp'];
 const inTop=a=>!!(a&&a.closest&&a.closest('#top,#proj'));
 // floor for a piece: the lowest-chain pieces already showing, its button, the free area
 function floorFor(id,a,A){let f=A.bot;const i=CHAIN.indexOf(id),lim=i<0?CHAIN.length:i;
  for(let k=0;k<lim;k++){const e=document.getElementById(CHAIN[k]);if(vis(e))f=Math.min(f,R(e).top)}
  if(a&&a.isConnected&&!inTop(a))f=Math.min(f,R(a).top);return f}
 function fit(el,a,id,A,wantW){// natural size first, then shrink to the space
  el.style.maxHeight='none';const ex=el._stackScroll||el;ex.style.maxHeight='';ex.style.overflowY='';
  const space=Math.max(80,(inTop(a)?A.bot-M-(R(a).bottom+M):floorFor(id,a,A)-M-(A.top+M)));
  let h=el.offsetHeight;if(h>space){const over=h-space;const inner=el._stackScroll;if(inner){inner.style.maxHeight=Math.max(40,inner.clientHeight-over)+'px';inner.style.overflowY='auto'}else{el.style.maxHeight=space+'px';el.style.overflowY='auto'}h=el.offsetHeight}
  const w=el.offsetWidth,ar=a&&a.isConnected?R(a):null,cx=ar?ar.left+ar.width/2:(A.left+A.right)/2;
  const left=Math.round(Math.max(A.left+M,Math.min(A.right-M-w,cx-w/2)));
  const top=Math.round(inTop(a)&&ar?ar.bottom+M:floorFor(id,a,A)-M-h);
  return{left,top:Math.max(A.top+M,top)}}
 function stageFloats(){// bars that live on the plan area: lift them above the walk / sweep bar, keep the pin Delete chip out of side panels
  const W=['#walk','#swBar'].map(q=>document.querySelector(q)).filter(vis).map(R);const st=document.getElementById('stage');if(!st)return;const sr=R(st);
  for(const q of ['#fhBar','#penBar','#shpChip','#stBar','#selBar','#updBar']){const e=document.querySelector(q);if(!e)continue;
   const was=e.dataset.stk;e.style.transition='none';e.style.bottom='';delete e.dataset.stk;if(!vis(e)){e.style.transition='';continue}const r=R(e);const hit=W.find(w=>r.bottom>w.top&&r.top<w.bottom);
   if(hit){e.style.bottom=Math.round(sr.bottom-hit.top+M)+'px';e.dataset.stk=1}else if(!was)e.style.transition=''}
  // top of the plan: the legend chip keeps clear of an open pin card / side panel, a notice sits below the legend chip
  const LG=document.getElementById('legChip');if(LG){if(LG.dataset.stk){LG.style.left='';LG.style.maxWidth='';LG.style.transform='';delete LG.dataset.stk}
   if(vis(LG)){const l=R(LG);for(const q of ['#pinDlg[open]','#panel','#lyrP']){const P=document.querySelector(q);if(!vis(P)||P.classList.contains('rlOut'))continue;const p=R(P);
    if(l.right>p.left&&l.left<p.right&&l.bottom>p.top&&l.top<p.bottom){const rt=(p.left+p.right)/2>innerWidth/2,L0=Math.max(sr.left,rt?sr.left:p.right),R0=rt?p.left:sr.right;
     LG.style.transform='none';LG.style.maxWidth=Math.max(120,R0-L0-2*M)+'px';const w=LG.offsetWidth;LG.style.left=Math.round((L0+R0)/2-w/2-sr.left)+'px';LG.dataset.stk=1;break}}}}
  const TO=document.getElementById('toast');if(TO){if(TO.dataset.stk){TO.style.top='';delete TO.dataset.stk}
   if(vis(TO)&&vis(LG)){const t=R(TO),l=R(LG);if(t.bottom>l.top&&t.top<l.bottom&&t.right>l.left&&t.left<l.right){TO.style.top=Math.round(l.bottom-sr.top+M)+'px';TO.dataset.stk=1}}}
  const D=document.getElementById('pinDelF');if(D&&D.dataset.stk){D.style.left='';delete D.dataset.stk}if(vis(D)){for(const q of ['#panel','#lyrP']){const P=document.querySelector(q);if(!vis(P)||P.classList.contains('rlOut'))continue;const p=R(P),d=R(D);
   if(d.right>p.left&&d.left<p.right&&d.bottom>p.top&&d.top<p.bottom){const dx=(p.left+p.right)/2>innerWidth/2?p.left-M-d.right:p.right+M-d.left;const lim=Math.max(sr.left+M-d.left,Math.min(sr.right-M-d.right,dx));D.style.left=Math.round(lim)+'px';D.dataset.stk=1;break}}}}
 function place(){stageFloats();const A=area();
  // Draw panel: above the bottom bar and the Pages bar
  const DR=document.getElementById('navDraw');if(vis(DR)){const f=Math.min(A.bot,innerHeight);DR.style.bottom=Math.round(innerHeight-f+M)+'px';DR.style.top='auto';
   const sp=f-M-(A.top+M);DR.style.maxHeight=sp+'px';DR.style.overflowY=DR.scrollHeight>sp?'auto':''}
  // Width row and Opacity row: right above their button / the row below
  const WB=document.getElementById('widBar'),WA=document.querySelector('[data-w=width].on')||document.querySelector('[data-w=width]');
  if(vis(WB)){const p=fit(WB,WA,'widBar',A);WB.style.left=p.left+'px';WB.style.top=p.top+'px'}
  const WO=document.getElementById('wbOp');if(vis(WO)){const p=fit(WO,WB,'wbOp',A);WO.style.left=p.left+'px';WO.style.top=p.top+'px'}
  // lists: next to their button, natural size, scroll only when too tall
  const MS=document.getElementById('mnuSheet');const P=MS&&!MS.hidden&&MS.querySelector('.mnuP');
  if(P){const a=document.querySelector('.whPressed');if(a&&a.isConnected){MS.classList.add('mnuAnc');P._stackScroll=P.querySelector('.mnuB');
    P.style.maxWidth=Math.max(200,A.right-A.left-2*M)+'px';const p=fit(P,a,'list',A);P.style.left=p.left+'px';P.style.top=p.top+'px'}else MS.classList.remove('mnuAnc')}
 }
 let raf=0;const kick=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;try{place()}catch(e){}})};
 window.stackPlace=place;
 // react to anything opening, closing or moving; our own style writes are filtered out by the signature check
 let sig='';const tick=()=>{const k=['navDraw','widBar','wbOp','mnuSheet','thumbs','panel','lyrP','walk','swBar','tools','top','fhBar','penBar','shpChip','selBar','pinDelF','legChip','toast','pinDlg'].map(id=>{const e=document.getElementById(id);if(!e)return'-';const r=e.getBoundingClientRect();return (e.hidden?'h':'v')+(r.top|0)+','+(r.height|0)+','+(r.left|0)+','+(r.width|0)}).join('|')+(document.getElementById('mnuSheet')?.innerHTML.length||0)+innerWidth+'x'+innerHeight;if(k!==sig){sig=k;try{place()}catch(e){}}requestAnimationFrame(tick)};
 requestAnimationFrame(tick);addEventListener('resize',kick);
})();
