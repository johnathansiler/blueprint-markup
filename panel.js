// bpm-v102: decluttered Pins panel. Regroups the EXISTING controls (same ids and handlers), so every function stays reachable.
(()=>{const P=$('#panel');if(!P)return;const ph=P.querySelector('.ph'),by=id=>document.getElementById(id);
 const dd=(id,label,title,ids)=>{const d=document.createElement('details');d.className='pDd';d.id=id;d.innerHTML=`<summary class="btn" title="${title}">${label} ▾</summary><div class="pDm"></div>`;const m=d.querySelector('.pDm');for(const i of ids){const e=by(i);if(e){e.classList.add('pDi');m.append(e)}}
  m.addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(()=>d.open=false,0)});return d};
 // (b) labels inside menus
 by('csvBtn').textContent='📋 Device list CSV';by('countCsv').textContent='🔢 Counts CSV';by('checkCsv').textContent='☑ Checklist CSV';by('reportPdf').textContent='📄 Report PDF';
 by('clrBtn').textContent='🗑 Delete Pins';by('clrMBtn').textContent='🗑 Delete Markups';by('testerBtn').innerHTML='Tester';
 const row2=document.createElement('div');row2.className='row pinsOnly pTools';
 row2.append(dd('pExp','Export','Export: device list, counts, checklist, report',['csvBtn','countCsv','checkCsv','reportPdf']),dd('pEdit','Edit','Split for a second tech / merge a returned file',['splitBtn','mergeBtn']),dd('pDel','Delete','Delete all pins or all markups (asks first)',['clrBtn','clrMBtn']),by('testerBtn'));
 ph.after(row2);by('pDel').querySelector('summary').classList.add('danger');
 // (c) search + filters in one row; summary + counts on one small line
 const q=by('q'),f=by('fType').parentElement;f.classList.add('pFlt');f.prepend(q);q.placeholder='Search…';q.title='Search address, location, type, notes';
 const sumL=document.createElement('div');sumL.className='pSumL pinsOnly';by('sum').before(sumL);sumL.append(by('sum'),by('counts'));by('sum').open=false;
 // old split/merge/export row is now empty → remove it
 const old=by('reportPdf')&&[...P.querySelectorAll('.row.pinsOnly')].find(r=>r!==row2&&!r.children.length);if(old)old.remove();
 // close menus on outside tap
 document.addEventListener('pointerdown',e=>{P.querySelectorAll('details.pDd[open]').forEach(d=>{if(!d.contains(e.target))d.open=false})},true);
})();
// bpm-v103: the Pins panel menus (Export, Edit, Delete) open as the same floating wheel, anchored to the tapped button
(()=>{if(!window.wheelOpen)return;document.querySelectorAll('#panel details.pDd, details.pDd').forEach(d=>{const s=d.querySelector('summary');if(!s||s.dataset.wh)return;s.dataset.wh=1;
 s.addEventListener('click',e=>{e.preventDefault();d.open=false;const B=[...d.querySelectorAll('.pDm button')].filter(b=>!b.disabled&&!b.hidden&&b.style.display!=='none');if(!B.length)return;window.wheelAnchor&&wheelAnchor(s);
  wheelOpen(s.textContent.replace('▾','').trim(),B.map(b=>({l:b.textContent.trim(),b})),0,it=>it&&it.b.click())})})})();
