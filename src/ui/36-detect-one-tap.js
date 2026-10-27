// bpm-v138: one-tap Detect (the Detect button reruns the last types and pages; window.detectSettings opens the dialog). More > Detect types and pages.
// Classic script; shares the app's globals. by/ce: src/ui/00-helpers.js.
(()=>{const MO=window.V135&&V135.MO;
 // ---------- 1) one-tap Detect ----------
 // After Detect has been run once from the dialog, the Detect button runs again straight away with the same device types and pages.
 // The first time, the dialog opens with every type ticked and "All pages" chosen (Detect still reads only main floor plan pages and never pins gray devices).
 // "Detect types and pages…" (suggestions bar and More) opens the dialog to change them. After an all-pages run with nothing on this page, it goes to the first page with suggestions.
 const detB=by('detBtn'),openDet=detB&&detB.onclick;
 const detDlgOpen=async()=>{if(!openDet)return;await openDet.call(detB);const d=by('detDlg');if(!d||!d.open)return;const s=await get('meta','detectSel');
  if(!(s&&Array.isArray(s.groups)&&s.groups.length)){by('detAll')&&by('detAll').click();const f=by('detForm');if(f&&f.elements.scope)f.elements.scope.value='all'}};
 window.detectSettings=detDlgOpen;
 if(detB&&openDet){detB.onclick=async function(){if(!plan||!pdf||det)return openDet.call(this);const s=await get('meta','detectSel'),one=await get('meta','detectOneTap');
   if(one&&s&&Array.isArray(s.groups)&&s.groups.length){const ok=new Set(Object.keys(DG));const g=s.groups.filter(k=>ok.has(k));if(g.length)return runDetect(g,!!s.all)}return detDlgOpen()};
  by('detForm')&&by('detForm').addEventListener('submit',e=>{if(e.submitter?.value==='go')put('meta',1,'detectOneTap')},true)}
 // runDetect (src/app/04-detect.js) folds the legend banner and goes to the first page with suggestions
 // renderGhostBar (src/app/04-detect.js) adds the "Detect types and pages" button that calls detectSettings
 if(MO)MO.push(()=>[{i:'🔍',l:'Detect types and pages…',run:()=>plan?detDlgOpen():uiAlert('Open a plan first.')}]);
})();
