// bpm-v102: top bar "Option B" — breadcrumb line + ONE row of uniform icon-over-label buttons (two rows on phone).
// Original controls are kept (hidden or moved), so every existing handler keeps working. Dropdowns use the wheel picker.
(()=>{const P=$('#proj'),T=$('#top');if(!P||!T||!window.wheelOpen)return;
 const H=document.createElement('div');H.id='tb2Hidden';H.hidden=true;document.body.append(H);
 const mk=(id,ic,lab,run,title)=>{const b=document.createElement('button');b.type='button';b.className='btn tb2';b.id=id;b.innerHTML=`<span class="tb2i">${ic}</span><span class="tl">${lab}</span>`;b.title=title||lab.replace(' ▾','');if(run)b.onclick=run;return b};
 const relabel=(el,ic,lab)=>{el.classList.add('tb2');el.innerHTML=`<span class="tb2i">${ic}</span><span class="tl">${lab}</span>`;return el};
 const wheel=(title,items,cur)=>wheelOpen(title,items.map(x=>({...x,html:`<span class="whIc">${x.i||''}</span>${esc(x.l)}`})),Math.max(0,cur??0),x=>x.run());
 const click=id=>()=>by(id).click();
 // ---- breadcrumb ----
 const bc=document.createElement('div');bc.id='tb2Crumb';
 [...P.childNodes].forEach(n=>H.append(n));P.append(bc);P.classList.add('tb2P');
 const pageName=()=>{try{return plan&&pnm(plan.id,page)}catch{return''}};
 const crumb=()=>{let s;try{const pr=by('projSel').selectedOptions[0]?.text||'Project';if(!plan)s=`${esc(pr)} › <span class="tb2m">no plan open</span>`;else{const nm=pageName();s=`${esc(pr)} › <b>${esc(plan.name||'Plan')}</b> · Page ${page}${nm?' “'+esc(nm)+'”':''} of ${plan.pages||1} · ${pins.length} pin${pins.length===1?'':'s'}`}}catch{s=''}if(bc._s!==s){bc._s=s;bc.innerHTML=s;bc.title=bc.textContent}};
 // ---- buttons ----
 const projB=mk('tb2Proj','📁','Project ▾',()=>{const ps=[...by('projSel').options];wheel('Project',[{i:'＋',l:'New project',run:click('projNew')},{i:'✎',l:'Rename project',run:click('projRen')},{i:'💾',l:'Save project file',run:click('projSave')},{i:'📥',l:'Open project file…',run:()=>by('bpmFile').click()},{i:'🗑',l:'Delete project',run:click('projDel')},...ps.map(o=>({i:o.selected?'✓':'↪',l:'Switch to: '+o.text,run:()=>{by('projSel').value=o.value;by('projSel').dispatchEvent(new Event('change',{bubbles:true}))}}))],0)},'Project: new, rename, save, open, delete, switch');
 const planB=mk('tb2Plan','📄','Plan ▾',()=>{const ps=[...by('planSel').options].filter(o=>o.value);wheel('Plan',[{i:'📂',l:'Open plan (PDF / image)…',run:()=>by('file').click()},{i:'✎',l:'Rename page',run:()=>plan?pnRename(page):uiAlert('Open a plan first.')},{i:'🗑',l:'Delete plan',run:click('planDel')},...ps.map(o=>({i:o.selected?'✓':'↪',l:'Switch to: '+o.text,run:()=>{by('planSel').value=o.value;by('planSel').dispatchEvent(new Event('change',{bubbles:true}))}}))],0)},'Plan: open, rename page, delete, switch');
 const prev=relabel(by('prev'),'◀','Previous'),next=relabel(by('next'),'▶','Next');
 const pageB=mk('tb2Page','<b class="tb2n">–</b>','Page ▾',()=>{const o=[...by('pageSel').options];if(!o.length)return uiAlert('Open a plan first.');wheel('Page',o.map(x=>({i:'',l:x.text,run:()=>{by('pageSel').value=x.value;by('pageSel').dispatchEvent(new Event('change',{bubbles:true}))}})),by('pageSel').selectedIndex)},'Go to page');
 const zoomB=mk('tb2Zoom','<b class="tb2n" id="tb2Z">—</b>','Zoom',()=>by('fit')?.click(),'Current zoom (tap: fit to screen)');
 const rot=relabel(by('rotBtn'),'⟳','Rotate'),pg=relabel(by('thBtn'),'▤','Pages');
 const layB=mk('tb2Lay','◧','Layers',()=>tlayOpen(),'Layers: show/hide device types (plus Filters)');layB.dataset.tlay='';
 const exW=document.querySelector('#top .exWrap');relabel(by('exMenu'),'⤓','Export');const mic=relabel(by('micBtn'),'🎤','Voice');const pinsB=relabel(by('listBtn'),'📍','Pins');
 const czMore=[{i:'⚙',l:'Customize',run:()=>by('czBtn')?.click()}];
 const moreB=mk('tb2More','⋯','More ▾',()=>{const ph=matchMedia('(max-width:599px)').matches,L=[...czMore];if(!ph&&matchMedia('(max-width:879px)').matches){L.push({i:'⟳',l:'Rotate view'+(VR?` (now ${VR}°)`:''),run:()=>rot.click()});if(!mic.hidden)L.push({i:'🎤',l:'Voice',run:()=>mic.click()})}/* bpm-v112: tablet portrait keeps Pins on screen */if(ph){L.push({i:'⟳',l:'Rotate view'+(VR?` (now ${VR}°)`:''),run:()=>rot.click()});if(!mic.hidden)L.push({i:'🎤',l:'Voice',run:()=>mic.click()});L.push({i:'⤓',l:'Export plan as PNG',run:click('exPng')},{i:'⤓',l:'Export plan as PDF',run:click('exPdf')})}L.push({i:'👁',l:'Filters (markups, labels, status)',run:click('layBtn')});wheel('More',L,0)},'More');
 [...T.children].forEach(n=>{if(![exW,mic].includes(n))H.append(n)});
 const sp=()=>{const s=document.createElement('span');s.className='sp';return s},br=document.createElement('i');br.className='tb2Br';
 const s1=sp(),s2=sp();s1.classList.add('tb2S1');s2.classList.add('tb2S2');// bpm-v105: Undo / Redo live in the top bar (same #undo/#redo buttons, so updUR() greys them out); phone: first on row 2, Rotate moves into More
 const und=relabel(by('undo'),'↶','Undo'),red=relabel(by('redo'),'↷','Redo');und.classList.remove('tool');red.classList.remove('tool');und.title='Undo (Control+Z)';red.title='Redo (Control+Y)';
 T.append(projB,planB,und,red,prev,pageB,next,pg,zoomB,br,s1,rot,layB,exW,mic,pinsB,s2,moreB);/* bpm-v113: Pages toggle sits with Prev/Page/Next */[s1,rot,pg,layB,exW,mic,pinsB,s2,moreB].forEach(e=>e&&e.classList.add('tb2R2'));T.classList.add('tb2T');
 by('czBtn')&&H.append(by('czBtn'));
 const upd=()=>{crumb();try{pageB.querySelector('.tb2n').textContent=plan?`${page}/${plan.pages||1}`:'–';by('tb2Z').textContent=by('zoomPct').textContent}catch{}};setInterval(upd,400);upd();window.tb2Upd=upd;
})();
