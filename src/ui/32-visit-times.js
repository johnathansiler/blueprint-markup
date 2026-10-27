// bpm-v135/v136: Inspection and Testing Record visit times (Start now / End now buttons); old signature data dropped on project load.
// ---------- 3. Inspection and Testing Record: visit times (bpm-v136: on-screen signatures removed) ----------
(()=>{const {by}=window.V135;
 /* bpm-v136: signatures are gone. Old projects may still hold signature data from version 135; drop it quietly on load. */
 const dropSig=async pid=>{if(!pid)return;try{if(await get('meta','sig:'+pid))await del('meta','sig:'+pid);if(await get('meta','sigPrev:'+pid))await del('meta','sigPrev:'+pid)}catch{}};window.dropSig=dropSig;
 const _lp=loadProject;loadProject=async function(...a){const r=await _lp.apply(this,a);dropSig(project&&project.id);return r};
 const now=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
 const f=by('jobForm');if(f){by('itmStartNow').onclick=()=>{f.elements.startTime.value=now()};by('itmEndNow').onclick=()=>{f.elements.finishTime.value=now()}}
})();
