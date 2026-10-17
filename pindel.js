// bpm-v106: floating "Delete" beside the tapped/selected pin (anchored to it through pan / zoom / rotate; sits just outside the pin's status ring so the
// print symbol stays visible). Tapping it opens the delete options as the floating wheel anchored to the button, with Cancel: this pin / N selected,
// all of this type on the page or plan, all pins on the page or plan. Everything goes through changeMulti → one top-bar Undo step. (The pin sheet no longer has Delete.)
(()=>{let PDT=null,dn=null;const B=document.createElement('button');B.type='button';B.id='pinDelF';B.className='btn danger';B.hidden=true;stage.append(B);
 window.pdTap=p=>{PDT=p?p.id:null};
 const tapPin=()=>PDT&&pins.find(p=>p.id===PDT&&p.page===page)||null;
 function items(){if(walk||!plan)return[];const S=selItems().filter(o=>isPinO(o)&&o.page===page&&tVis(o));if(S.length)return S;if(tool!=='select'){const p=tapPin();if(p&&tVis(p)&&pVis(p))return[p]}return[]}
 const scr=p=>{const o=OFFMAP&&OFFMAP.get(p.id);return toS(p.x+(o?o.dx:0),p.y+(o?o.dy:0))};
 let lastK='';function tick(){requestAnimationFrame(tick);const L=items(),modal=[...document.querySelectorAll('dialog[open]')].length>0||(document.querySelector('.whOv')&&!document.querySelector('.whOv').hidden);
  const mine=B.classList.contains('whPressed')&&document.querySelector('.whOv')&&!document.querySelector('.whOv').hidden;if(mine)return;
  if(!L.length||modal){if(!B.hidden)B.hidden=true;return}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const SW=stage.clientWidth,SH=stage.clientHeight,onS=L.filter(p=>{const s=scr(p);return s.x>=0&&s.x<=SW&&s.y>=0&&s.y<=SH});for(const p of (onS.length?onS:L)){const s=scr(p),h=pinHalf(p)*view.s+2;x0=Math.min(x0,s.x-h);x1=Math.max(x1,s.x+h);y0=Math.min(y0,s.y-h);y1=Math.max(y1,s.y+h)}
  const lab=L.length>1?`Delete ${L.length}`:'Delete';if(B._l!==lab){B._l=lab;B.innerHTML=`<span class="pdI">🗑</span><span class="tl">${lab}</span>`}
  if(B.hidden)B.hidden=false;const W=stage.clientWidth,H=stage.clientHeight,bw=B.offsetWidth||64,bh=B.offsetHeight||40;
  let x=x1+8,y=(y0+y1)/2-bh/2;if(x+bw>W-4)x=x0-8-bw;if(x<4){x=Math.max(4,Math.min(W-bw-4,(x0+x1)/2-bw/2));y=y1+8;if(y+bh>H-4)y=y0-8-bh}
  y=Math.max(4,Math.min(H-bh-4,y));const k=Math.round(x)+','+Math.round(y);if(k!==lastK){lastK=k;B.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`}
  const off=x1<0||x0>W||y1<0||y0>H;B.style.visibility=off?'hidden':''}
 requestAnimationFrame(tick);
 // a tap (not a pan) on empty plan or another item clears the tapped pin
 stage.addEventListener('pointerdown',e=>{if(e.target===cv||e.target===ov)dn={x:e.clientX,y:e.clientY,n:(dn&&dn.t>performance.now()-400)?2:1,t:performance.now()}},true);
 stage.addEventListener('pointerup',e=>{if(!dn||!PDT)return;const d=Math.hypot(e.clientX-dn.x,e.clientY-dn.y);dn=null;if(d>8)return;const r=stage.getBoundingClientRect(),w=toW(e.clientX-r.left,e.clientY-r.top),h=hit(w);if(!(h&&h.kind==='p'&&h.o.id===PDT))setTimeout(()=>{if(!document.querySelector('#pinDlg[open]'))PDT=null},0)},true);
 async function run(list,what){list=list.filter(p=>p.planId===plan?.id);if(!list.length)return toast('Nothing to delete');const L=[];for(const p of list)L.push({store:'pins',id:p.id,before:p,after:null,media:await byIdx('media','pinId',p.id)});
  sel=null;msel=[];PDT=null;await changeMulti(L);try{renderSelBar()}catch{}requestDraw(false);toast(`Deleted ${what} · Undo ↶ in the top bar`)}
 B.addEventListener('pointerdown',e=>e.stopPropagation());
 B.onclick=e=>{e.stopPropagation();const L=items();if(!L.length)return;const p=L[0],T=TYPES[p.type]||TYPES.other,tn=T.n.replace(/ – .*/,''),pg=pins.filter(x=>x.page===page),same=pg.filter(x=>x.type===p.type),sameAll=pins.filter(x=>x.type===p.type);
  const nm=x=>x+' pin'+(x===1?'':'s'),opts=[];
  if(L.length>1)opts.push({i:'☑',l:`Delete ${L.length} selected`,run:()=>run(L,nm(L.length)+' (selection)')});else opts.push({i:'📍',l:'Delete this pin'+(p.address?` (${p.address})`:''),run:()=>run([p],'1 pin')});
  if(L.length===1||new Set(L.map(x=>x.type)).size===1){opts.push({i:'◆',l:`All ${tn} on this page (${same.length})`,run:()=>run(same,`${nm(same.length)} · ${tn} on page ${page}`)});if(plan.pages>1)opts.push({i:'◆',l:`All ${tn} on this plan (${sameAll.length})`,run:()=>run(sameAll,`${nm(sameAll.length)} · ${tn} on this plan`)})}
  opts.push({i:'▤',l:`All pins on this page (${pg.length})`,run:()=>run(pg,`${nm(pg.length)} on page ${page}`)});if(plan.pages>1)opts.push({i:'▦',l:`All pins on this plan (${pins.length})`,run:()=>run(pins.slice(),`${nm(pins.length)} on this plan`)});
  opts.push({i:'✕',l:'Cancel',run:()=>{}});window.wheelAnchor&&wheelAnchor(B);wheelOpen('Delete pins',opts.map(o=>({...o,html:`<span class="whIc">${o.i}</span>${esc(o.l)}`})),0,o=>o.run())};
 window.pinDelFloat=B;
})();
