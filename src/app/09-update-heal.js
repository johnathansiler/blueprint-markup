// bpm-v141: keep the app on one version after an update.
// 1) Self-heal: if the screen code (ui.js) did not start (a slow or interrupted update mixed an old cached page with new files), reload once or twice
//    while online so the phone does not stay on the bare old-looking layout. ui.js sets window.__bpmUI at its end.
// 2) Check for a new version whenever the app is reopened (and every 30 minutes); a ready update is applied on reopen when nothing is in progress
//    (no walk test, no open card or dialog, nothing busy). Otherwise the "Update ready · Reload" bar stays as before.
(()=>{if(!('serviceWorker'in navigator)||!location.protocol.startsWith('http'))return;
 const K='bpmHeal';addEventListener('load',()=>setTimeout(()=>{let n=0;try{n=+sessionStorage.getItem(K)||0}catch{}
  if(window.__bpmUI){try{sessionStorage.removeItem(K)}catch{}return}
  if(n>=2||!navigator.onLine)return;try{sessionStorage.setItem(K,String(n+1))}catch{}location.reload()},1500));
 const safe=()=>!walk&&!document.querySelector('dialog[open]')&&$('#busy').hidden&&!document.querySelector('#mnuSheet:not([hidden])');
 let last=0;const check=()=>{if(document.hidden||Date.now()-last<60000)return;last=Date.now();navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{})};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)return;const u=$('#updBar');if(u&&!u.hidden&&safe()){location.reload();return}check()});
 setInterval(check,30*60e3);window.bpmUpdCheck=()=>{last=0;check()};
})();
