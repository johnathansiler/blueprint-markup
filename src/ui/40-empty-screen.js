// bpm-v138: empty first screen buttons (Open plan, New project).
// Classic script; shares the app's globals. by/ce: src/ui/00-helpers.js.
(()=>{
 // ---------- 14) empty first screen: real Open plan and New project buttons ----------
 const eo=by('emOpen'),en=by('emNew');if(eo)eo.onclick=()=>by('file').click();if(en)en.onclick=()=>by('projNew').click();
})();
