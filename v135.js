// bpm-v135: new features. Classic script: uses the app's shared globals (project, plan, pins, change, get/put, toast, uiConfirm …).
(()=>{const by=id=>document.getElementById(id),ce=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e};
 const MX=[],MO=[];window.menuExtra=(a,sub)=>MX.flatMap(f=>f(a,sub)||[]);window.moreExtra=a=>MO.flatMap(f=>f(a)||[]);window.V135={MX,MO,by,ce};
 // ---------- 1. Persistent storage + daily backup reminder ----------
 // Ask the browser to keep this site's data (IndexedDB plans, pins, photos) instead of clearing it when the phone runs low on space.
 const ST={asked:false,granted:null};window.V135.storage=ST;
 async function askPersist(){ST.asked=true;try{if(!navigator.storage||!navigator.storage.persist)return ST.granted=null;ST.granted=(await navigator.storage.persisted?.())||await navigator.storage.persist()}catch(e){ST.granted=false}return ST.granted}
 window.askPersist=askPersist;askPersist();
 const DAY=864e5,K=()=>project&&project.id;
 const dirtyAt=()=>+(localStorage.getItem('bpm-bkdirty:'+K())||0);
 const markDirty=()=>{if(K())localStorage.setItem('bpm-bkdirty:'+K(),Date.now())};
 const _c=change;change=async function(...a){const r=await _c.apply(this,a);markDirty();return r};
 const _cm=changeMulti;changeMulti=async function(...a){const r=await _cm.apply(this,a);markDirty();return r};
 async function bkInfo(){const pid=K();if(!pid)return null;return{last:+(await get('meta','bk:'+pid)||0),snooze:+(await get('meta','bkSnooze:'+pid)||0),off:!!(await get('meta','bkOff')),dirty:dirtyAt()}}
 async function bkDue(){const i=await bkInfo();if(!i||i.off)return false;const now=Date.now();if(!i.dirty||i.dirty<=i.last)return false;if(i.snooze&&now<i.snooze)return false;return !i.last||now-i.last>=DAY*0.8}
 const fmtD=t=>t?new Date(t).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):'never';
 let bar=null;function bkBar(){if(bar)return bar;bar=ce('div',{id:'bkBar',hidden:true},`<span id="bkTxt"></span><button type="button" class="btn pri" id="bkSave">💾 Save project file</button><button type="button" class="btn" id="bkLater">Remind me tomorrow</button>`);bar.setAttribute('role','status');
  (by('stage')||document.body).append(bar);by('bkSave').onclick=()=>{bar.hidden=true;by('projSave').click()};
  by('bkLater').onclick=async()=>{const t=new Date();t.setHours(24,0,0,0);/* next morning */await put('meta',t.getTime()+6*36e5,'bkSnooze:'+K());bar.hidden=true;toast('Backup reminder snoozed until tomorrow')};return bar}
 async function bkCheck(){const b=bkBar();if(!await bkDue()){b.hidden=true;return false}const i=await bkInfo();by('bkTxt').textContent=`Save a backup project file today. Last backup: ${fmtD(i.last)}.`;b.hidden=false;return true}
 window.bkCheck=bkCheck;window.bkSaved=async pid=>{await put('meta',Date.now(),'bk:'+pid);await del('meta','bkSnooze:'+pid);if(bar)bar.hidden=true};
 const _lp=loadProject;loadProject=async function(...a){const r=await _lp.apply(this,a);setTimeout(bkCheck,1500);return r};
 setInterval(bkCheck,10*60e3);document.addEventListener('visibilitychange',()=>{if(!document.hidden)bkCheck()});
 MX.push(()=>[{i:'⏰',l:'Backup reminder…',run:async()=>{const i=await bkInfo();if(!i)return uiAlert('Open a project first.');
   const msg=`Daily backup reminder is ${i.off?'off':'on'}. Last backup project file for this project: ${fmtD(i.last)}.\n\nPhone storage protection: ${ST.granted?'on (the browser keeps this app’s data)':ST.granted===false?'not granted (the browser may clear this app’s data when space runs low, so save backups)':'not supported in this browser'}.`;
   if(await uiConfirm(msg,{ok:i.off?'Turn reminder on':'Turn reminder off',cancel:'Close'})){await put('meta',!i.off,'bkOff');toast('Backup reminder '+(i.off?'on':'off'));bkCheck()}if(!ST.granted)askPersist()}}]);
})();
