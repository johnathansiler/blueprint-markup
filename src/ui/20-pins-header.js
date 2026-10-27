// bpm-v106 (option C): compact Pins panel. Top: Pins | Deficiencies segmented bar with counts, full-width search, labeled filter buttons (Type, Status, Page; Loop removed in v118)
// that open the floating wheel. Middle: one progress/counts line, then the scrolling list. Bottom bar pinned inside the panel (wheels open upward):
// Export, Split, Tester, Clear (Deficiencies tab: Deficiencies spreadsheet, Deficiencies PDF, Tester). Reuses the existing controls (same ids and handlers).
(()=>{const P=$('#panel');if(!P||!window.wheelOpen)return;const mk=ce;
 P.classList.add('pC');const ph=P.querySelector('.ph');
 // segmented Pins | Deficiencies (bpm-v133: spelled out)
 const seg=mk('div','pSeg');by('modePins').innerHTML='Pins <b id="pinCount"></b>';by('modeDefs').innerHTML='⚠ Deficiencies <b id="defCount" class="r"></b>';seg.append(by('modePins'),by('modeDefs'));ph.prepend(seg);
 by('closeList').title='Close the Pins panel';
 // old header tools row (Export / Edit / Delete menus + Tester) is replaced by the bottom bar; the hidden originals keep their handlers
 const old=P.querySelector('.pTools');if(old){old.hidden=true;old.classList.add('pOld')}
 // search on its own full-width row
 const q=by('q'),qr=mk('div','pQ');qr.append(q);ph.after(qr);q.placeholder='🔍 Search…';
 // filters: buttons showing their value; the selects / checkbox stay (hidden) as the source of truth
 const fr=by('fType').parentElement;fr.classList.add('pOldF');fr.hidden=true;const fb=mk('div','pFB');qr.after(fb);
 const fire=e=>{e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};
 const selF=(id,k,all)=>({k,id,vals:()=>[...by(id).options].map(o=>({v:o.value,l:o.value?o.textContent:all})),cur:()=>by(id).value,set:v=>{by(id).value=v;fire(by(id))},lab:()=>{const s=by(id);return s.value?s.options[s.selectedIndex].textContent:'All'}});
 const F=[selF('fType','Type','All types'),selF('fStat','Status','All status'),/* bpm-v118: Loop filter removed (user request); loop numbers stay in rows, walk, deficiencies and exports */
  {k:'Page',id:'allPages',vals:()=>[{v:'',l:'This page'},{v:'1',l:'All pages'}],cur:()=>by('allPages').checked?'1':'',set:v=>{by('allPages').checked=!!v;fire(by('allPages'))},lab:()=>by('allPages').checked?'All':'This'}];
 for(const f of F){const b=mk('button','pF');b.type='button';b.id='pF'+f.k;b.innerHTML=`<span class="k">${f.k} ▾</span><span class="v"></span>`;f.b=b;fb.append(b);
  b.onclick=()=>{const V=f.vals(),c=Math.max(0,V.findIndex(x=>x.v===f.cur()));wheelAnchor(b);wheelOpen(f.k,V.map(x=>({...x,l:x.l})),c,x=>{f.set(x.v);paint()})}}
 // bpm-v118: three filters (Type, Status, Page) in one row of equal widths when they fit, else a 2-column grid whose last button spans the row
 {const fit=()=>{const on=fb.clientWidth>=225;if(fb.classList.contains('f3')!==on)fb.classList.toggle('f3',on)};new ResizeObserver(fit).observe(fb);fit()}
 {const fl=by('fLoop');if(fl&&fl.value){fl.value='';fire(fl)}}
 // bottom bar (pinned inside the panel)
 const bb=mk('div','pBB pinsOnly'),bd=mk('div','pBB defsOnly');P.append(bb,bd);
 const clk=id=>()=>{const e=by(id);e&&e.click()};
 const btn=(bar,id,ic,l,run)=>{const b=mk('button','pB',`<i>${ic}</i><small>${l}</small>`);b.type='button';b.id=id;b.onclick=run;bar.append(b);return b};
 const menu=(title,items)=>function(){wheelAnchor(this);wheelOpen(title,items.map(x=>({...x,html:`<span class="whIc">${x.i}</span>${esc(x.l)}`})),0,x=>x.run())};
 btn(bb,'pbExp','⤓','Export',menu('Export',[{i:'📋',l:'Device list spreadsheet',run:clk('csvBtn')},{i:'🔢',l:'Counts spreadsheet',run:clk('countCsv')},{i:'☑',l:'Checklist spreadsheet',run:clk('checkCsv')},{i:'📄',l:'Report PDF',run:clk('reportPdf')}]));
 btn(bb,'pbSplit','⇆','Split',menu('Split',[{i:'⇆',l:'Split for second technician',run:clk('splitBtn')},{i:'⇄',l:'Merge returned file',run:clk('mergeBtn')}]));
 btn(bb,'pbTester','👤','Tester',clk('testerBtn'));
 btn(bb,'pbClear','🗑','Clear',menu('Clear',[{i:'🗑',l:'Clear pins…',run:clk('clrBtn')},{i:'🗑',l:'Clear markups…',run:clk('clrMBtn')}]));
 const dr=by('defCsv').parentElement;dr.classList.add('pOldD');dr.hidden=true;
 btn(bd,'pbDefCsv','📋','Deficiencies spreadsheet',clk('defCsv')).title='Deficiencies spreadsheet (CSV file)';btn(bd,'pbDefPdf','📄','Deficiencies PDF',clk('defPdf')).title='Deficiencies PDF';btn(bd,'pbDefTester','👤','Tester',clk('testerBtn'));
 for(const b of [...bb.children,...bd.children])b.title=b.title||b.textContent.trim();
 // values + counts
 function paint(){for(const f of F){const v=f.lab();const e=f.b.querySelector('.v');if(e.textContent!==v)e.textContent=v;f.b.classList.toggle('act',!!f.cur());f.b.title=`${f.k}: ${f.vals().find(x=>x.v===f.cur())?.l||v}`}
  const n=(typeof pins!=='undefined'?pins:[]).length,pc=by('pinCount');if(pc&&pc.textContent!==String(n))pc.textContent=n;const dc=by('defCount');if(dc)dc.hidden=!dc.textContent}
 window.pinsHdrPaint=paint;['fType','fStat','allPages'].forEach(i=>by(i).addEventListener('input',paint));setInterval(()=>{if(!P.hidden)paint()},500);paint();
 // phone: lift the panel's bottom by the app toolbar (+ selection bar when showing) wherever they overlap it, like the walk bar
 function lift(){if(P.hidden)return;if(document.body.classList.contains('rl')){P.style.removeProperty('--pLift');return}/* v113: the layout manager (rail.js) owns the panel geometry */let h=0;if(!matchMedia('(min-width:800px)').matches){const r=P.getBoundingClientRect();for(const s of['#tools','#selBar','#mBar','#ghBar']){const e=$(s);if(!e||e.hidden||!e.offsetParent)continue;const q=e.getBoundingClientRect();if(q.width&&q.right>r.left+2&&q.left<r.right-2&&q.top<r.bottom)h=Math.max(h,r.bottom-q.top)}}
  let tp='';if(!matchMedia('(min-width:800px)').matches){let b=0;for(const s of['#proj','#top']){const e=$(s);if(e&&!e.hidden&&e.offsetParent){const q=e.getBoundingClientRect();if(q.top<innerHeight/3)b=Math.max(b,q.bottom)}}tp=b?Math.round(b)+'px':''}if(P.style.top!==tp)P.style.top=tp;
  const v=Math.max(0,Math.round(h))+'px';if(P.style.getPropertyValue('--pLift')!==v)P.style.setProperty('--pLift',v)}
 setInterval(lift,250);addEventListener('resize',lift);new MutationObserver(lift).observe(P,{attributes:true,attributeFilter:['hidden']});
})();
