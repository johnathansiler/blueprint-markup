// bpm-v154: Identify device — photograph a label, read it on this phone (barcode then PP-OCR),
// match the official Siemens catalog, fill the pin's type/model, and attach the photo.
// Nothing is uploaded. @shared-globals is not needed; this file is self-contained.
(()=>{
 const CAT_URL='device-catalog.json';
 const BAR_FMTS=['qr_code','data_matrix','aztec','pdf417','code_128','code_39','code_93','codabar','ean_13','ean_8','upc_a','upc_e','itf'];
 let CAT=null,catP=null,lastBlob=null,lastName='identify.jpg',loadMs=0;

 function lev(a,b){if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;const m=[];for(let i=0;i<=b.length;i++)m[i]=[i];for(let j=0;j<=a.length;j++)m[0][j]=j;for(let i=1;i<=b.length;i++){for(let j=1;j<=a.length;j++)m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:1+Math.min(m[i-1][j-1],m[i][j-1],m[i-1][j])}return m[b.length][a.length]}
 function sim(a,b){return 1-lev(a,b)/Math.max(a.length,b.length,1)}
 function norm(s){return String(s||'').toUpperCase().replace(/[\u00A0]/g,' ').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
 function compact(s){return norm(s).replace(/ /g,'')}
 function fold(s){return compact(s).replace(/O/g,'0').replace(/[IL]/g,'1')}

 function tokens(text){
  const raw=String(text||''),up=raw.toUpperCase(),tok=new Set();
  for(const m of up.matchAll(/\b1P\s*([A-Z0-9][A-Z0-9\-./]{4,})/g)) tok.add(m[1].replace(/^1P/,''));
  for(const m of up.matchAll(/\b(S\d{5}-[A-Z0-9-]+)/g)) tok.add(m[1]);
  for(const m of up.matchAll(/\b(A5Q\d{8,})/g)) tok.add(m[1]);
  for(const m of up.matchAll(/\bBPZ:(\d{3}-\d{6}[A-Z]?)/g)) tok.add(m[1]);
  for(const m of up.matchAll(/\b((?:500|599|300)-\d{6}[A-Z]?)\b/g)) tok.add(m[1]);
  for(const m of up.matchAll(/\b([A-Z]{2,8}\d{2,5}[A-Z0-9/-]*|[A-Z]{2,8}-[A-Z0-9]{1,8}(?:-[A-Z0-9]{1,8})?)\b/g)) tok.add(m[1]);
  for(const w of norm(up).split(' ')) if(w.length>=3) tok.add(w);
  return [...tok];
 }

 function scoreOne(p,toks,fullC){
  let score=0,reasons=[],usBoost=p.us?0.01:0;
  const modelC=compact(p.m),ordersC=(p.o||[]).map(compact),modelF=fold(p.m),ordersF=(p.o||[]).map(fold);
  for(const tok of toks){
   const t=compact(tok),tf=fold(tok); if(!t) continue;
   if(ordersC.includes(t)||(tf&&ordersF.includes(tf))){score=Math.max(score,1);reasons.push('exact order number '+tok);continue}
   if(t===modelC||tf===modelF){score=Math.max(score,0.98);reasons.push('exact model '+tok);continue}
   if(ordersC.some(o=>o.includes(t)||t.includes(o))&&t.length>=8){score=Math.max(score,0.93);reasons.push('order number variant '+tok);continue}
   if((modelC.startsWith(t)||t.startsWith(modelC))&&Math.min(t.length,modelC.length)>=4){score=Math.max(score,0.85);reasons.push('model prefix '+tok);continue}
   if(t.length>=4&&modelC.length>=4){const s=Math.max(sim(t,modelC),sim(tf,modelF));if(s>=0.75){score=Math.max(score,Math.min(0.9,s));reasons.push('fuzzy model '+tok+' ~ '+p.m)}}
   if(t.length>=8){for(let i=0;i<ordersC.length;i++){const s=Math.max(sim(t,ordersC[i]),sim(tf,ordersF[i]));if(s>=0.92){score=Math.max(score,Math.min(0.95,s));reasons.push('fuzzy order '+tok+' ~ '+(p.o||[])[i])}}}
  }
  if(score<0.5&&modelC.length>=5&&fullC.includes(modelC)){score=0.97;reasons.push('model in full text')}
  return {score:score?score+usBoost:0,reasons,us:!!p.us};
 }

 function matchText(text,limit){
  if(!CAT) return [];
  const toks=tokens(text),full=compact(text);
  const scored=CAT.products.map(p=>{const s=scoreOne(p,toks,full);return {product:p,score:s.score,reasons:s.reasons,us:s.us}}).filter(x=>x.score>=0.55);
  scored.sort((a,b)=>b.score-a.score||b.us-a.us||a.product.m.localeCompare(b.product.m));
  return scored.slice(0,limit||8);
 }

 async function loadCatalog(){
  if(CAT) return CAT;
  if(catP) return catP;
  catP=fetch(CAT_URL,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('catalog '+r.status);return r.json()}).then(j=>{CAT=j;return j}).catch(e=>{catP=null;throw e});
  return catP;
 }

 async function decodeBarcodes(img){
  const out=[];
  if('BarcodeDetector' in window){
   try{
    const all=await BarcodeDetector.getSupportedFormats();
    const use=BAR_FMTS.filter(f=>all.includes(f));
    if(use.length){
     const bd=new BarcodeDetector({formats:use});
     const hits=await bd.detect(img);
     for(const h of hits){if(h.rawValue)out.push({text:String(h.rawValue),format:h.format||''})}
    }
   }catch(e){}
  }
  if(!out.length){
   try{
    if(!window.jsQR) await new Promise((res,rej)=>{const s=document.createElement('script');s.src='vendor/jsQR.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    if(w&&h){
     const cv=document.createElement('canvas'),k=Math.min(1,1000/Math.max(w,h));
     cv.width=w*k|0;cv.height=h*k|0;
     const cx=cv.getContext('2d',{willReadFrequently:true});
     cx.drawImage(img,0,0,cv.width,cv.height);
     const d=cx.getImageData(0,0,cv.width,cv.height);
     const r=jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});
     if(r&&r.data) out.push({text:String(r.data),format:'qr_code'});
    }
   }catch(e){}
  }
  return out;
 }

 function barText(hits){
  return hits.map(h=>{
   let t=String(h.text||'').trim();
   const m=t.match(/^1P(.+)/i); if(m) t=m[1];
   return t;
  }).filter(Boolean).join(' ');
 }

 async function ocrImage(img,onStat){
  if(typeof window.ppocrReady!=='function'||typeof window.ppocrImage!=='function') throw new Error('Picture reader is not ready in this build.');
  const t0=performance.now();
  onStat&&onStat('Getting the picture reader ready…');
  await window.ppocrReady(info=>{if(info&&info.msg) onStat&&onStat(info.msg)});
  const ready=performance.now()-t0;
  if(!loadMs) loadMs=Math.round(ready);
  onStat&&onStat('Reading the label…');
  let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  const max=1600,s=Math.max(w,h)>max?max/Math.max(w,h):1;
  const cv=document.createElement('canvas');
  cv.width=Math.max(1,w*s|0);cv.height=Math.max(1,h*s|0);
  const cx=cv.getContext('2d',{willReadFrequently:true});
  cx.drawImage(img,0,0,cv.width,cv.height);
  const id=cx.getImageData(0,0,cv.width,cv.height);
  const words=await window.ppocrImage(id);
  const text=(words||[]).map(w=>w.t||w.text||'').filter(Boolean).join(' ');
  return {text,words,readyMs:Math.round(ready),ms:Math.round(performance.now()-t0)};
 }

 function sure(hits){
  if(!hits.length) return false;
  const a=hits[0].score,b=hits[1]?hits[1].score:0;
  return a>=0.97 && (hits.length===1 || a-b>=0.08);
 }

 function hitView(h){
  const p=h.product,ord=(p.o||[]).join(', ')||'—';
  const ds=p.u?`<a class="btn" href="${esc(p.u)}" target="_blank" rel="noopener">Open data sheet</a>`:'';
  return `<article class="idHit" data-m="${esc(p.m)}">
   <b>${esc(p.m)}</b>
   <span>${esc(p.n||p.m)}</span>
   <small>Order number: ${esc(ord)}${p.us?' · US / UL':''}</small>
   <div class="idActions">${ds}<button type="button" class="btn pri idUse">Use this</button></div>
  </article>`;
 }

 function showOut(html){
  $('#idStepPick').hidden=true;$('#idStepWork').hidden=false;$('#idStepOut').hidden=false;
  $('#idStepOut').innerHTML=html;
 }

 function bindUses(hits,blob,name){
  $('#idStepOut').onclick=e=>{
   const use=e.target.closest('.idUse'); if(!use) return;
   const art=use.closest('.idHit'); const m=art&&art.dataset.m;
   const hit=hits.find(h=>h.product.m===m); if(!hit) return;
   applyHit(hit,blob,name);
  };
 }

 async function applyHit(hit,blob,name){
  if(typeof cur==='undefined'||!cur||!form){ if(typeof toast==='function') toast('Open a device pin first.'); return; }
  const p=hit.product, typ=p.t;
  try{
   if(typ&&TYPES[typ]&&form.elements.type.value!==typ){
    form.elements.type.value=typ;
    form.elements.type.dispatchEvent(new Event('change',{bubbles:true}));
    if(typeof modelOpts==='function') await modelOpts(typ);
   }
   const m=p.m, sel=$('#dModelSel');
   if(sel&&m&&![...sel.options].some(o=>o.value===m)) sel.add(new Option(m,m),sel.options[sel.options.length-1]);
   if(sel) sel.value=m;
   form.elements.model.value=m;
   if(sel) sel.dispatchEvent(new Event('change',{bubbles:true}));
   if(typeof rememberModel==='function') await rememberModel(form.elements.type.value,m);
   if(typeof dsBtnSync==='function') dsBtnSync();
   if(blob&&typeof addMedia==='function') await addMedia('photo',blob,name||'identify.jpg');
   closeDlg();
   if(typeof toast==='function') toast('Filled as '+m+(p.n?' — '+p.n:'')+'. Photo saved on this pin.');
  }catch(e){ $('#idStatus').textContent='Could not fill the pin: '+(e&&e.message||e); }
 }

 async function fileToImage(file){
  const url=URL.createObjectURL(file);
  try{
   const img=new Image(); img.src=url; await img.decode();
   return img;
  }finally{/* revoke after draw in runIdent */}
 }

 async function runIdent(file){
  lastBlob=file; lastName=file.name||'identify.jpg';
  $('#idStepPick').hidden=true; $('#idStepOut').hidden=true; $('#idStepOut').innerHTML='';
  $('#idStepWork').hidden=false;
  const url=URL.createObjectURL(file);
  $('#idPreview').innerHTML=`<img class="idPrev" alt="Label photo" src="${url}">`;
  const st=$('#idStatus'); st.textContent='Opening the picture…';
  let img=null;
  try{
   img=new Image(); img.src=url; await img.decode();
  }catch(e){ st.textContent='Could not open that picture.'; URL.revokeObjectURL(url); return; }
  try{
   await loadCatalog();
   st.textContent='Looking for a barcode…';
   const bars=await decodeBarcodes(img);
   const bar=barText(bars);
   const ocr=await ocrImage(img,msg=>{st.textContent=msg});
   const text=[bar,ocr.text].filter(Boolean).join(' ');
   const hits=matchText(text,8);
   window.__identifyLast={text,bar,ocr,hits,loadMs,bars};
   const prev=`<img class="idPrev" alt="Label photo" src="${url}">`;
   const read=text?`<p class="idRead">Read: ${esc(text.slice(0,240))}${text.length>240?'…':''}</p>`:'<p class="idRead">No model or order number could be read.</p>';
   if(!hits.length){
    showOut(prev+read+`<p class="idHelp">No matching Siemens device was found. Try a closer, sharper picture of the printed label.</p><div class="idActions"><button type="button" class="btn" id="idRetry">Try another photo</button></div>`);
    $('#idRetry').onclick=resetPick; return;
   }
   if(sure(hits)){
    showOut(prev+read+`<p class="idStatus">Best match</p><div class="idHits">${hitView(hits[0])}</div><div class="idActions"><button type="button" class="btn" id="idRetry">Try another photo</button></div>`);
   }else{
    const top=hits.slice(0,3);
    showOut(prev+read+`<p class="idStatus">Not sure — pick the one that matches the label</p><div class="idHits">${top.map(hitView).join('')}</div><div class="idActions"><button type="button" class="btn" id="idRetry">Try another photo</button></div>`);
   }
   bindUses(hits,file,lastName);
   const rtry=$('#idRetry'); if(rtry) rtry.onclick=resetPick;
  }catch(e){
   st.textContent='Could not read the label: '+(e&&e.message||e);
   $('#idStepOut').hidden=false;
   $('#idStepOut').innerHTML=`<div class="idActions"><button type="button" class="btn" id="idRetry">Try another photo</button></div>`;
   const rtry=$('#idRetry'); if(rtry) rtry.onclick=resetPick;
  }
 }

 function resetPick(){
  $('#idStepPick').hidden=false; $('#idStepWork').hidden=true; $('#idStepOut').hidden=true;
  $('#idPreview').innerHTML=''; $('#idStatus').textContent=''; $('#idStepOut').innerHTML='';
  $('#idTake').value=''; $('#idPick').value='';
 }

 function closeDlg(){ try{$('#idDlg').close()}catch(e){} resetPick(); }

 function openIdentify(){
  if(typeof cur==='undefined'||!cur){ if(typeof toast==='function') toast('Open a device pin first.'); return; }
  resetPick();
  const d=$('#idDlg'); if(d.open) d.close();
  d.showModal();
 }

 function mount(){
  if($('#idDlg')) return;
  const dlg=document.createElement('dialog');
  dlg.id='idDlg';
  dlg.innerHTML=`<div class="idH"><b>Identify device</b><span class="sp"></span><button type="button" class="btn" id="idClose">Close</button></div>
   <p class="idHelp">Photograph the printed label on the device — the model and order number — not just the front of the head. The picture stays on this phone. Nothing is uploaded.</p>
   <div id="idStepPick">
    <div class="row idActions">
     <label class="btn pri">Take a picture<input type="file" id="idTake" accept="image/*" capture="environment" hidden></label>
     <label class="btn">Choose a photo<input type="file" id="idPick" accept="image/*" hidden></label>
    </div>
   </div>
   <div id="idStepWork" hidden>
    <div id="idPreview"></div>
    <p class="idStatus" id="idStatus"></p>
   </div>
   <div id="idStepOut" hidden></div>`;
  document.body.append(dlg);
  $('#idClose').onclick=closeDlg;
  const onFile=e=>{const f=e.target.files&&e.target.files[0]; e.target.value=''; if(f) runIdent(f)};
  $('#idTake').onchange=onFile; $('#idPick').onchange=onFile;

  const btn=document.createElement('button');
  btn.type='button'; btn.className='btn'; btn.id='dIdBtn';
  btn.textContent='Identify device';
  btn.title='Take a picture of the device label to fill the name and model. Nothing is uploaded.';
  const row=$('#dQrBtn')&&$('#dQrBtn').parentElement;
  if(row) row.append(btn); else if($('#addPhoto')) $('#addPhoto').closest('.row')&&$('#addPhoto').closest('.row').prepend(btn);
  btn.onclick=openIdentify;

  const hookMdl=()=>{
   const h=$('#mdlDlg .mdH'); if(!h||$('#mdIdBtn')) return;
   const b=document.createElement('button');
   b.type='button'; b.className='btn'; b.id='mdIdBtn';
   b.textContent='Identify device';
   b.title='Take a picture of the device label to fill the name and model. Nothing is uploaded.';
   const x=$('#mdX'); if(x) x.before(b); else h.append(b);
   b.onclick=()=>{$('#mdlDlg').close(); openIdentify()};
  };
  hookMdl();
  const mdl=$('#mdlDlg');
  if(mdl) new MutationObserver(hookMdl).observe(mdl,{childList:true,subtree:true});
 }

 window.identifyMatch=matchText;
 window.identifyLoadCatalog=loadCatalog;
 window.identifyOpen=openIdentify;
 window.identifyShowFromText=function(text,opt){
  /* test / preview helper: show matches for a given reading, no photo required */
  if(!$('#idDlg')||!$('#idDlg').open) openIdentify();
  const hits=matchText(text,8);
  const read=`<p class="idRead">Read: ${esc(text)}</p>`;
  if(!hits.length){ showOut(read+`<p class="idHelp">No matching Siemens device was found.</p>`); return hits; }
  if(sure(hits)&&!(opt&&opt.forceTop3)){
   showOut(read+`<p class="idStatus">Best match</p><div class="idHits">${hitView(hits[0])}</div>`);
  }else{
   showOut(read+`<p class="idStatus">Not sure — pick the one that matches the label</p><div class="idHits">${hits.slice(0,3).map(hitView).join('')}</div>`);
  }
  bindUses(hits,null,'');
  return hits;
 };
 window.identifyLoadMs=()=>loadMs;

 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
 else mount();
})();
