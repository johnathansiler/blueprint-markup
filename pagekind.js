// bpm-v107: page kind for Detect. Riser and wiring sheets get no Detect pins. The kind is read from the title block's SHEET TITLE field
// (falling back to the big drawing titles next to the sheet number). A floor-plan title (… PLAN) always wins, so a small "wiring" detail
// box on a plan never skips it. Per-page override "Detect this page anyway" is remembered (IndexedDB meta 'detAny').
(()=>{const KC=new Map();let ANY=null;
 const RISER=/\bRISER\b(?!\s*DETAIL)|\bFAS[- ]?RISER/i,WIRE=/\bWIRING\s+(DIAGRAMS?|DETAILS?)\b|\bTYPICAL\s+WIRING\b|\bPOINT[- ]TO[- ]POINT\b|\bSCHEMATICS?\b|\bONE[- ]LINE\b/i,PLAN=/\bPLANS?\b/i;
 async function loadAny(){if(ANY)return ANY;let a=null;try{a=await get('meta','detAny')}catch{}ANY=new Set(Array.isArray(a)?a:[]);return ANY}
 window.detAnyway=async(pid,n,on)=>{await loadAny();const k=pid+':'+n;if(on===undefined)return ANY.has(k);if(on)ANY.add(k);else ANY.delete(k);try{await put('meta',[...ANY],'detAny')}catch{}return on};
 function classify(items){const I=[];for(const t of items){const s=(t.str||'').trim();if(!s)continue;const tr=t.transform,sz=Math.max(Math.hypot(tr[2],tr[3]),Math.hypot(tr[0],tr[1])*0)||t.height||0,l=Math.hypot(tr[0],tr[1])||1;I.push({s,sz,x:tr[4],y:tr[5],dx:tr[0]/l,dy:tr[1]/l})}
  // 1. SHEET TITLE field: the bigger lines just after the label, in its reading direction
  let title='';const lab=I.find(t=>/^SHEET\s*TITLE\s*:?$/i.test(t.s))||I.find(t=>/SHEET\s*TITLE\s*:/i.test(t.s));
  if(lab){const dn={x:lab.dy,y:-lab.dx},L=[];for(const t of I){if(t===lab||t.sz<lab.sz*1.25)continue;const rx=t.x-lab.x,ry=t.y-lab.y,al=rx*lab.dx+ry*lab.dy,ac=rx*dn.x+ry*dn.y;if(ac>0&&ac<t.sz*6&&al>-lab.sz*3&&al<lab.sz*45)L.push({...t,ac,al})}
   L.sort((a,b)=>a.ac-b.ac||a.al-b.al);let last=null;for(const t of L){if(last!=null&&t.ac-last>t.sz*2.6)break;title+=(title?' ':'')+t.s;last=t.ac}
   const inl=lab.s.replace(/^.*SHEET\s*TITLE\s*:?/i,'').trim();if(inl)title=inl+' '+title}
  // 2. sheet number + big drawing titles
  const SN=I.filter(t=>/^X?FAS-?\d{3}[A-Z]?$/i.test(t.s)).sort((a,b)=>b.sz-a.sz)[0]||null,mx=Math.max(0,...I.map(t=>t.sz)),thr=SN?SN.sz*.8:mx*.6;
  const big=I.filter(t=>t.sz>=thr&&t.s.length>3&&/[A-Z]{3}/i.test(t.s)&&t!==SN).map(t=>t.s);
  const src=title?'sheet title':'drawing titles',txt=title||big.join(' | ');
  let kind=null,why='';
  if(PLAN.test(txt)&&!RISER.test(title)){kind=null;why='plan title'}
  else if(RISER.test(txt)){kind='riser';why=`${src}: ${(txt.match(/[^|]*RISER[^|]*/i)||[txt])[0].trim()}`}
  else if(WIRE.test(txt)||(title&&/\bWIRING\b/i.test(title))){kind='wiring';why=`${src}: ${(txt.match(/[^|]*(WIRING|POINT|SCHEMATIC|ONE[- ]LINE)[^|]*/i)||[txt])[0].trim()}`}
  else if(!title&&SN&&/^X?FAS-?50\d$/i.test(SN.s)&&!PLAN.test(big.join(' '))){kind='riser';why=`sheet no. ${SN.s} (riser series)`}
  return{kind,why:why.slice(0,90),title:title.slice(0,90),sheet:SN?SN.s:''}}
 window.pageKindOf=classify;
 window.pageKind=async(pid,n,pg)=>{const k=pid+':'+n;if(KC.has(k))return KC.get(k);const p=(async()=>{try{const P=pg||(window.detPage?await detPage(n):await pdf.getPage(n)),tc=await P.getTextContent();return classify(tc.items)}catch(e){return{kind:null,why:'no text',title:''}}})();KC.set(k,p);return p};
 // Sheets list (Pages): note + override on the current page
 window.pkDecorate=async b=>{if(!plan||!pdf||!b)return;await loadAny();const pid=plan.id;for(const x of b.querySelectorAll('[data-pg]')){const n=+x.dataset.pg,k=await pageKind(pid,n);if(plan?.id!==pid)return;x.querySelector('.thSk')?.remove();x.nextElementSibling?.classList?.contains('thAny')&&x.nextElementSibling.remove();
   if(!k.kind)continue;const any=ANY.has(pid+':'+n),s=document.createElement('span');s.className='thSk'+(any?' any':'');s.textContent=any?`Detect on (${k.kind})`:`Skipped: ${k.kind}`;s.title=`Detect ${any?'runs here anyway':'skips this page'} — ${k.why}`;x.append(s);
   if(n===page){const o=document.createElement('button');o.type='button';o.className='btn thAny';o.dataset.anyPg=n;o.textContent=any?'Skip this page again':'Detect this page anyway';o.title=k.why;o.onclick=async e=>{e.stopPropagation();await detAnyway(pid,n,!any);toast(any?`Page ${n}: Detect will skip it (${k.kind})`:`Page ${n}: Detect will run here`);renderThumbs()};x.after(o)}}};
 const _rt=renderThumbs;renderThumbs=function(){_rt();const b=$('#thumbs');if(b&&!b.hidden)pkDecorate(b)};
})();
