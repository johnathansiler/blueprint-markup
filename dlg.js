// bpm-v98: in-app replacements for native alert/confirm/prompt (native dialogs look broken in an installed PWA and block the UI).
(()=>{const mk=()=>{let d=document.getElementById('uiDlg');if(!d){d=document.createElement('dialog');d.id='uiDlg';document.body.append(d)}return d};
 const q=[];let busyQ=false;const run=()=>{if(busyQ||!q.length)return;busyQ=true;const job=q.shift();job(()=>{busyQ=false;setTimeout(run,0)})};
 const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function open(msg,{input=null,ok='OK',cancel='Cancel',danger=false}={}){return new Promise(res=>{q.push(done=>{const d=mk();
  d.innerHTML=`<form method="dialog" class="uiF"><p class="uiM">${e(msg).replace(/\n/g,'<br>')}</p>${input!==null?`<input class="uiI" value="${e(input)}" autocomplete="off">`:''}<div class="row"><span class="sp"></span>${cancel?`<button type="button" class="btn" value="no">${e(cancel)}</button>`:''}<button class="btn ${danger?'danger':'pri'}" value="ok">${e(ok)}</button></div></form>`;
  const I=d.querySelector('.uiI');let out=null;const fin=v=>{if(out!==null)return;out=v;d.close();res(v);done()};
  d.querySelector('[value=no]')?.addEventListener('click',()=>fin(input!==null?null:false));d.querySelector('form').onsubmit=ev=>{ev.preventDefault();fin(input!==null?I.value:true)};d.oncancel=ev=>{ev.preventDefault();fin(input!==null?null:false)};
  d.showModal();(I||d.querySelector('[value=ok]')).focus();if(I)I.select()});run()})}
 window.uiConfirm=(m,o)=>open(m,{...o,danger:o?.danger??/delete|remove|reject|forget|replace/i.test(m)});
 window.uiPrompt=(m,def='',o)=>open(m,{input:def??'',...o});
 // alerts are informational: non-blocking toast-style notice (tap to dismiss)
 window.uiAlert=m=>{let h=document.getElementById('uiNote');if(!h){h=document.createElement('div');h.id='uiNote';h.setAttribute('role','alert');document.body.append(h);h.onclick=()=>h.hidden=true}h.textContent=String(m);h.hidden=false;clearTimeout(h._t);h._t=setTimeout(()=>h.hidden=true,Math.max(3500,String(m).length*60))};
 window.alert=window.uiAlert;
 // B7: Escape inside a dialog's search box closes the dialog (Chrome otherwise spends the first Escape clearing the search text)
 addEventListener('keydown',e=>{if(e.key!=='Escape')return;const t=e.target,d=t&&t.closest&&t.closest('dialog[open]');if(d&&d.id!=='uiDlg'&&t.matches('input[type=search]')){e.preventDefault();e.stopPropagation();d.close()}},true);
})();
