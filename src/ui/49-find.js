// bpm-v149: Find text (Menu › Plan › Find text, or Ctrl+F). Searches the plan PDF's text layer (pdf.js getTextContent) plus pin labels
// (address / location) and text markups. Case-insensitive, partial match. "This page" highlights every match on the current page with
// Previous / Next and a "3 of 12" count; "All pages" searches every page, lists results by page, and Next / Previous go across pages.
// Highlights are drawn on the overlay only (no pin or markup is touched) and clear when Find closes. Placement: 45-stack.js (#findBar).
(()=>{const by=id=>document.getElementById(id);
 const S={open:false,q:'',all:false,hits:[],cur:-1,pages:new Map(),noText:[],busy:0,tok:0,list:false,msg:''};
 const TC=new Map();// plan id + page -> text runs (cached for the plan)
 const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ');
 let FB=null,IN=null;
 function pgName(n){const m=typeof pnm==='function'&&plan?pnm(plan.id,n):'';return 'Page '+n+(m?' · '+m:'')}
 // ---------- text runs: join the PDF's text pieces that sit on one line, so "L1D" + "003" still matches "d003" ----------
 async function runs(n){if(!plan)return{runs:[],text:false,pic:true};const key=plan.id+':'+n;if(TC.has(key))return TC.get(key);
  if(!pdf){const r={runs:[],text:false,pic:true};TC.set(key,r);return r}
  let items=[],vp=null;try{const pg=await pdf.getPage(n);vp=pg.getViewport({scale:1});items=(await pg.getTextContent()).items||[]}catch(e){console.warn('find text',e)}
  const R=[];let cur=null;
  for(const it of items){const str=it.str||'';if(!str)continue;const m=pdfjsLib.Util.transform(vp.transform,it.transform);const L=Math.hypot(m[0],m[1]),h=Math.hypot(m[2],m[3]);if(!L||!h)continue;
   const u=[m[0]/L,m[1]/L],v=[m[2]/h,m[3]/h],O=[m[4],m[5]],w=Math.abs(it.width||0)||h*.55*str.length,cw=w/str.length;
   let along=0;if(cur){const d=[O[0]-cur.O[0],O[1]-cur.O[1]],a=d[0]*cur.u[0]+d[1]*cur.u[1],p=d[0]*cur.v[0]+d[1]*cur.v[1];
    const same=u[0]*cur.u[0]+u[1]*cur.u[1]>.995&&Math.abs(h-cur.h)<cur.h*.25&&Math.abs(p)<cur.h*.35&&a>cur.end-cur.h*.35&&a-cur.end<cur.h*.9;
    if(same){along=a;if(a-cur.end>cur.h*.22&&!/\s$/.test(cur.t)&&!/^\s/.test(str)){cur.t+=' ';cur.pos.push(cur.end);cur.cw.push(a-cur.end)}}else{R.push(cur);cur=null}}
   if(!cur)cur={O,u,v,h,t:'',pos:[],cw:[],end:0};
   for(let k=0;k<str.length;k++){cur.t+=str[k];cur.pos.push(along+k*cw);cur.cw.push(cw)}cur.end=along+w;
   if(it.hasEOL){R.push(cur);cur=null}}
  if(cur)R.push(cur);
  for(const r of R)r.lo=r.t.toLowerCase().replace(/\s/g,' ');
  const res={runs:R,text:R.some(r=>/\S/.test(r.t)),pic:false};TC.set(key,res);return res}
 // a match box: four corners in plan coordinates (works for rotated text too)
 function quad(r,i,j){const a=r.pos[i],b=r.pos[j-1]+r.cw[j-1],lo=-.25*r.h,hi=.95*r.h,P=(s,t)=>[r.O[0]+r.u[0]*s+r.v[0]*t,r.O[1]+r.u[1]*s+r.v[1]*t];return[P(a,lo),P(b,lo),P(b,hi),P(a,hi)]}
 function bb(q){const xs=q.map(p=>p[0]),ys=q.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y,cx:(Math.min(...xs)+Math.max(...xs))/2,cy:(Math.min(...ys)+Math.max(...ys))/2}}
 async function pageHits(n,q){const T=await runs(n),H=[];
  for(const r of T.runs){let i=r.lo.indexOf(q);while(i>=0){const Q=quad(r,i,i+q.length);H.push({page:n,kind:'text',q:Q,b:bb(Q),txt:r.t.slice(Math.max(0,i-8),i+q.length+8).trim()});i=r.lo.indexOf(q,i+Math.max(1,q.length))}}
  for(const p of pins){if(p.page!==n)continue;const s=norm([p.address,p.location].filter(Boolean).join(' · '));if(s&&s.includes(q)){const r=12;H.push({page:n,kind:'pin',pin:p,b:{x:p.x-r,y:p.y-r,w:2*r,h:2*r,cx:p.x,cy:p.y},txt:(p.address||'')+(p.location?' · '+p.location:'')})}}
  for(const m of markups){if(m.page!==n||typeof m.text!=='string'||!norm(m.text).includes(q))continue;const x1=Math.min(m.x1,m.x2??m.x1),y1=Math.min(m.y1,m.y2??m.y1),x2=Math.max(m.x1,m.x2??m.x1+(m.fs||12)*m.text.length*.6),y2=Math.max(m.y1,m.y2??m.y1+(m.fs||12)*1.15);
   H.push({page:n,kind:'mk',m,b:{x:x1,y:y1,w:x2-x1,h:y2-y1,cx:(x1+x2)/2,cy:(y1+y2)/2},txt:m.text})}
  // reading order: top to bottom, then left to right (rows about one text height apart)
  const rowH=Math.max(8,...H.filter(h=>h.kind==='text').map(h=>h.b.h).slice(0,1));H.sort((a,b)=>Math.floor(a.b.cy/(rowH*1.5))-Math.floor(b.b.cy/(rowH*1.5))||a.b.cx-b.b.cx);
  return{H,text:T.text,pic:T.pic}}
 // ---------- search ----------
 async function search(keep){const tok=++S.tok,q=norm(IN.value).trim();S.q=q;S.pid=plan&&plan.id;S.hits=[];S.cur=-1;S.pages=new Map();S.noText=[];S.msg='';
  if(!plan){S.msg='Open a plan first.';render();repaint();return}
  if(!q){render();repaint();return}
  if(!S.all){S.busy=1;S.msg='Reading the page text…';render();const r=await pageHits(page,q);if(tok!==S.tok)return;S.busy=0;S.msg='';S.hits=r.H;S.pages.set(page,r.H.length);
   if(!r.text)S.msg=r.pic?'This plan is a picture, so it has no searchable text. Pin labels and text markups are still searched.':'This page has no searchable text (it is a scanned picture). Pin labels and text markups are still searched.';
   else if(!r.H.length)S.msg='No matches on this page.';
   if(S.hits.length)S.cur=keep?Math.min(keep,S.hits.length-1):0}
  else{S.busy=1;const N=plan.pages||1;for(let n=1;n<=N;n++){if(tok!==S.tok)return;S.msg=`Searching page ${n} of ${N}…`;render();const r=await pageHits(n,q);if(tok!==S.tok)return;
    if(!r.text&&!r.pic)S.noText.push(n);if(r.H.length){S.pages.set(n,r.H.length);S.hits.push(...r.H)}}
   S.busy=0;S.msg=S.hits.length?'':'No matches in this plan.';if(!pdf)S.msg+=(S.msg?' ':'')+'This plan is a picture, so only pin labels and text markups are searched.';
   S.list=S.hits.length>0;const i=S.hits.findIndex(h=>h.page===page);S.cur=S.hits.length?Math.max(0,i):-1}
  render();repaint();if(S.cur>=0&&!S.all)go(S.cur)}
 let dT=0;const later=()=>{clearTimeout(dT);dT=setTimeout(()=>search(),S.all?500:250)};
 // ---------- go to a match: open its page if needed, zoom and pan so it sits in the middle of the free plan area ----------
 async function go(i,list){if(i<0||i>=S.hits.length)return;S.cur=i;const h=S.hits[i];if(!list)S.list=false;render();
  if(h.page!==page){await gotoPage(h.page);if(S.cur!==i)return}
  const st=by('stage');if(!st)return;const sr=st.getBoundingClientRect(),A=window.stackArea?stackArea():{top:sr.top,bot:sr.bottom,left:sr.left,right:sr.right};
  const top=Math.max(A.top,sr.top),bot=Math.min(A.bot,sr.bottom),left=Math.max(A.left,sr.left),right=Math.min(A.right,sr.right),fw=Math.max(80,right-left),fh=Math.max(80,bot-top);
  const D=VR%180?{w:h.b.h,h:h.b.w}:{w:h.b.w,h:h.b.h},tH=h.kind==='text'?Math.min(D.w,D.h):24;
  let s=Math.max(view.s,30/Math.max(tH,.5));s=Math.min(s,fw*.7/Math.max(D.w,1),fh*.7/Math.max(D.h,1));s=clampS(s);
  const keep=view;centerOn(h.b.cx,h.b.cy,s,(left+right)/2-sr.left,(top+bot)/2-sr.top);const v1=view;view=keep;
  if(typeof slideTo==='function')await slideTo(v1,380);else{view=v1;draw();scheduleRender()}repaint()}
 const step=d=>{if(!S.hits.length)return;go((S.cur+d+S.hits.length)%S.hits.length)};
 // ---------- highlights (overlay only) ----------
 function repaint(){try{requestDraw(false)}catch{try{drawOverlay()}catch{}}}
 const _ov=drawOverlay;drawOverlay=function(){const r=_ov.apply(this,arguments);try{paint()}catch(e){}return r};
 function paint(){if(!S.open||!S.hits.length||!plan||!pageW)return;const c=octx;c.save();setT(c);const k=1/view.s;
  S.hits.forEach((h,i)=>{if(h.page!==page)return;const on=i===S.cur;c.lineWidth=(on?3:1.5)*k;c.strokeStyle=on?'#ff7a00':'#c99a00';c.fillStyle=on?'rgba(255,140,0,.38)':'rgba(255,214,0,.38)';
   if(h.kind==='text'){c.beginPath();h.q.forEach((p,j)=>j?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();c.stroke()}
   else if(h.kind==='pin'){const o=typeof SCRNOFF!=='undefined'&&SCRNOFF&&SCRNOFF.get(h.pin.id);const x=h.pin.x+(o?o.dx:0),y=h.pin.y+(o?o.dy:0),r=Math.max(10,(typeof pinHalf==='function'?pinHalf(h.pin):8)+6);c.beginPath();c.arc(x,y,r,0,7);c.fill();c.stroke()}
   else{const p=4*k;c.beginPath();c.rect(h.b.x-p,h.b.y-p,h.b.w+2*p,h.b.h+2*p);c.fill();c.stroke()}
   if(on){c.lineWidth=2*k;c.strokeStyle='#ff7a00';c.setLineDash([5*k,4*k]);const p=8*k;c.strokeRect(h.b.x-p,h.b.y-p,h.b.w+2*p,h.b.h+2*p);c.setLineDash([])}});
  c.restore()}
 // ---------- the Find bar ----------
 function build(){FB=document.createElement('div');FB.id='findBar';FB.className='widBar findBar';FB.hidden=true;FB.setAttribute('role','search');FB.setAttribute('aria-label','Find text');
  FB.innerHTML=`<div class="fdRow"><input id="fdQ" type="search" placeholder="Type text to find" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Text to find"><button type="button" class="btn" data-fd="close" title="Close Find and clear the highlights"><span aria-hidden="true">✕</span><span class="wbL">Close</span></button></div>`+
   `<div class="fdRow"><button type="button" class="btn" data-fd="page" aria-pressed="true"><span class="wbL">This page</span></button><button type="button" class="btn" data-fd="all" aria-pressed="false"><span class="wbL">All pages</span></button></div>`+
   `<div class="fdRow"><button type="button" class="btn" data-fd="prev" title="Previous match"><span aria-hidden="true">◀</span><span class="wbL">Previous</span></button><b class="fdCnt" aria-live="polite"></b><button type="button" class="btn" data-fd="next" title="Next match"><span class="wbL">Next</span><span aria-hidden="true">▶</span></button></div>`+
   `<div class="fdMsg" aria-live="polite"></div><button type="button" class="btn fdLst" data-fd="list"></button><div class="fdRes"></div>`;
  document.body.append(FB);IN=FB.querySelector('#fdQ');
  IN.addEventListener('input',later);
  IN.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(dT);const fresh=norm(IN.value).trim()!==S.q;if(fresh)search();else step(e.shiftKey?-1:1);if(matchMedia('(pointer:coarse)').matches)IN.blur()}else if(e.key==='Escape'){e.preventDefault();close()}});
  FB.addEventListener('click',e=>{const b=e.target.closest('[data-fd],[data-fi],[data-fp]');if(!b)return;const k=b.dataset.fd;
   if(k==='close')close();else if(k==='prev')step(-1);else if(k==='next')step(1);
   else if(k==='page'||k==='all'){const all=k==='all';if(all!==S.all){S.all=all;search()}}
   else if(k==='list'){S.list=!S.list;render()}
   else if(b.dataset.fi)go(+b.dataset.fi,true)})}
 function render(){if(!FB)return;const n=S.hits.length,h=S.hits[S.cur];
  FB.querySelector('[data-fd=page]').classList.toggle('on',!S.all);FB.querySelector('[data-fd=all]').classList.toggle('on',S.all);
  FB.querySelector('[data-fd=page]').setAttribute('aria-pressed',!S.all);FB.querySelector('[data-fd=all]').setAttribute('aria-pressed',S.all);
  FB.querySelector('.fdCnt').textContent=!S.q?'':n?`${S.cur+1} of ${n}`+(S.all&&h?` · page ${h.page}`:''):'0 of 0';
  FB.querySelector('[data-fd=prev]').disabled=n<2;FB.querySelector('[data-fd=next]').disabled=n<2;
  let msg=S.msg;if(S.all&&!S.busy&&S.noText.length)msg+=(msg?' ':'')+(S.noText.length===1?`Page ${S.noText[0]} has no searchable text (scanned picture).`:`Pages ${S.noText.join(', ')} have no searchable text (scanned pictures).`);
  const M=FB.querySelector('.fdMsg');M.textContent=msg;M.hidden=!msg;
  const L=FB.querySelector('.fdLst'),RS=FB.querySelector('.fdRes');const show=S.all&&n>0;L.hidden=!show;L.textContent=S.list?'Hide results list':`Show results list (${S.pages.size} page${S.pages.size===1?'':'s'})`;
  RS.hidden=!(show&&S.list);if(!RS.hidden){const G=new Map();S.hits.forEach((h,i)=>{if(!G.has(h.page))G.set(h.page,[]);G.get(h.page).push(i)});
   RS.innerHTML=[...G].map(([p,ix])=>`<div class="fdG"><h4>${esc(pgName(p))} <small>${ix.length} match${ix.length===1?'':'es'}</small></h4><div class="fdL">`+
    ix.map(i=>{const h=S.hits[i];return`<button type="button" class="mnuI fdI${i===S.cur?' on':''}" data-fi="${i}"><span class="mnuIc" aria-hidden="true">${h.kind==='pin'?'📍':h.kind==='mk'?'T':'🔎'}</span><span class="tl">${esc(h.txt||S.q)}</span></button>`}).join('')+`</div></div>`).join('')}
  FB.classList.toggle('fdBusy',!!S.busy)}
 function open(){if(!plan){uiAlert('Open a plan first.');return}if(!FB)build();S.open=true;FB.hidden=false;render();setTimeout(()=>{IN.focus();IN.select()},60);if(S.q)search()}
 function close(){S.tok++;S.open=false;S.hits=[];S.cur=-1;S.list=false;if(FB){FB.hidden=true;IN.blur()}repaint()}
 window.findOpen=open;window.findClose=close;window.findState=()=>({open:S.open,q:S.q,all:S.all,n:S.hits.length,cur:S.cur,page:S.hits[S.cur]?.page,box:S.hits[S.cur]?.b||null,kind:S.hits[S.cur]?.kind||null,msg:S.msg,busy:S.busy,pages:[...S.pages],noText:S.noText});
 // a new page or plan: re-run "This page" on the page now showing; a closed plan closes Find
 const _gp=gotoPage;gotoPage=async function(){const r=await _gp.apply(this,arguments);if(S.open&&S.q&&(plan&&plan.id!==S.pid||!S.all&&!S.busy))search();else repaint();return r};
 const _cp=closePlan;closePlan=function(){TC.clear();if(S.open)close();return _cp.apply(this,arguments)};
 addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='f'||e.key==='F')&&plan){e.preventDefault();open()}},true);
 /* Escape closes Find when nothing else used it (an open list takes Escape first and marks it handled) */
 addEventListener('keydown',e=>{if(e.key==='Escape'&&S.open&&!e.defaultPrevented&&document.activeElement!==IN&&!document.querySelector('dialog[open]'))close()});
})();
