// bpm-v138: flow improvements (fewer taps, fewer surprises). Loaded last; shares the app's globals (classic scripts).
// 1 one-tap Detect · 2 walk test starts with testable devices · 3 quick fail reasons on the walk bar · 6 Menu as a grouped list ·
// 7 tester name asked at project creation (app.js) · 8 Open card on each Pins list row · 9 no Delete on the pin card during a walk ·
// 10 legend banner folds into More; Pages strip hidden during a walk · 11 Accept all with Undo (app.js) · 12 Save backup and start (v135.js) ·
// 13 walk order choice · 14 Open plan / New project buttons on the empty screen
(()=>{const by=id=>document.getElementById(id);const ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const MO=window.V135&&V135.MO;

 // ---------- 14) empty first screen: real Open plan and New project buttons ----------
 const eo=by('emOpen'),en=by('emNew');if(eo)eo.onclick=()=>by('file').click();if(en)en.onclick=()=>by('projNew').click();
})();
