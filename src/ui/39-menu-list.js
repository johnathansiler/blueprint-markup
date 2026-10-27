// bpm-v138: Menu as a grouped list (Job, Plan, Files, Settings) instead of the wheel; Export, Share and Switch lists too. window.menuListClose.
// Classic script; shares the app's globals. by/ce: src/ui/00-helpers.js.
(()=>{
 // ---------- 6) Menu: a plain grouped list (Job, Plan, Files, Settings), one tap per row ----------
 // The Menu button's items (and its Export / Share / Switch lists) show as a list instead of the wheel. Every item and handler is the same as before.
 const GR=[['Job',/^(New project|Open project file|Switch project|Rename project|Delete project|Start next inspection)/],['Plan',/^(Open plan|Switch plan|Rename page|Delete plan)/],
  ['Files',/^(Save project file|Export|Share|Backup reminder|Save this job|Make saved photos)/],['Settings',/^(Reset screen zoom|Customize)/]];
 const SUBS=new Set(['Export','Share','Switch plan','Switch project']);
 let lastA=null,menuT=0;const _wa=window.wheelAnchor;window.wheelAnchor=a=>{lastA=a;return _wa&&_wa(a)};
 const SH=ce('div','mnuOv');SH.id='mnuSheet';SH.hidden=true;SH.setAttribute('role','dialog');SH.setAttribute('aria-modal','true');document.body.append(SH);
 const close=()=>{SH.hidden=true;SH.innerHTML=''};window.menuListClose=close;
 SH.addEventListener('pointerdown',e=>{if(e.target===SH)close()});addEventListener('keydown',e=>{if(SH.hidden)return;if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){/* keyboard: arrows move between rows, Enter picks */e.preventDefault();const B=[...SH.querySelectorAll('.mnuI')],i=B.indexOf(document.activeElement),n=e.key==='ArrowDown'?Math.min(B.length-1,i+1):Math.max(0,i-1);B[n]&&B[n].focus()}},true);
 function menuList(title,items,cb){const top=title==='Menu';let groups;
  if(top){const used=new Set();groups=GR.map(([g,rx])=>[g,items.filter(x=>{const ok=!used.has(x)&&rx.test(x.l||'');if(ok)used.add(x);return ok})]);const rest=items.filter(x=>!used.has(x));if(rest.length)groups[2][1].push(...rest)}
  else groups=[[null,items]];
  SH.innerHTML=`<div class="mnuP" role="menu" aria-label="${esc(title)}"><div class="mnuH">${top?'':'<button type="button" class="btn" id="mnuBack">◀ Back</button>'}<b class="mnuT">${esc(title)}</b><span class="sp"></span><button type="button" class="btn" id="mnuX">✕ Close</button></div><div class="mnuB">${
   groups.filter(g=>g[1].length).map(([g,L])=>`<section class="mnuG">${g?`<h4>${g}</h4>`:''}<div class="mnuL">${L.map(x=>`<button type="button" role="menuitem" class="btn mnuI" data-i="${items.indexOf(x)}"><span class="mnuIc" aria-hidden="true">${x.i||''}</span><span class="tl">${esc(x.l)}</span></button>`).join('')}</div></section>`).join('')}</div></div>`;
  SH.hidden=false;SH.querySelector('#mnuX').onclick=close;const bk=SH.querySelector('#mnuBack');if(bk)bk.onclick=()=>{close();by('navMenu')&&by('navMenu').click()};
  SH.querySelectorAll('.mnuI').forEach(b=>b.onclick=()=>{const x=items[+b.dataset.i];close();menuT=SUBS.has((x.l||'').replace(/…$/,''))?Date.now():0;cb(x)});
  const f=SH.querySelector('.mnuI');f&&f.focus({preventScroll:true})}
 const _wo=window.wheelOpen;window.wheelOpen=function(title,items,cur,cb){const m=by('navMenu');
  if(m&&lastA===m&&(title==='Menu'||(SUBS.has(title)&&Date.now()-menuT<2000))){lastA=null;return menuList(title,items,cb)}return _wo.apply(this,arguments)};
})();
