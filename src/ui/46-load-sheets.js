// bpm-v146: choice when opening a plan PDF: All sheets, or Legend and renovation sheets only.
// Legend sheet = sheet title with LEGEND (e.g. "FIRE ALARM LEGEND, SYMBOLS, AND ABBREVIATIONS"); renovation sheet = sheet title with RENOVATION.
// Titles come from the same title-block reader Detect uses (pageKindOf). The kept pages are copied into a new PDF; the original file is not changed.
(()=>{const inp=by('file');if(!inp)return;const orig=inp.onchange;
 const LEG=/\bLEGEND\b/i,RENO=/\bRENOVATIONS?\b/i;
 async function sortPages(f){const data=new Uint8Array(await f.arrayBuffer());const d=await pdfjsLib.getDocument({data:data.slice()}).promise;const L=[],R=[];
  try{for(let n=1;n<=d.numPages;n++){const pg=await d.getPage(n);let k={title:''};try{k=pageKindOf((await pg.getTextContent()).items)}catch{}pg.cleanup();
   if(LEG.test(k.title))L.push(n);else if(RENO.test(k.title)&&!k.kind)R.push(n)}return{data,L,R,total:d.numPages}}finally{d.destroy()}}
 async function keepPages(data,keep){const{PDFDocument}=PDFLib;const src=await PDFDocument.load(data,{ignoreEncryption:true}),out=await PDFDocument.create();
  for(const pg of await out.copyPages(src,keep.map(n=>n-1)))out.addPage(pg);return new Blob([await out.save()],{type:'application/pdf'})}
 window.loadSheetsSort=sortPages;
 inp.onchange=async e=>{const f=e.target.files[0];if(!f||!(f.type==='application/pdf'||/\.pdf$/i.test(f.name)))return orig.call(inp,e);
  let s;busy(1,'Reading sheets');try{s=await sortPages(f)}catch(err){busy(0);return orig.call(inp,e)}busy(0);
  if(!s.R.length&&!s.L.length)return orig.call(inp,e);
  const fake={target:{files:[f],set value(v){inp.value=v}}},n=s.L.length+s.R.length;
  wheelOpen('Load plan',[{i:'📄',l:`All sheets (${s.total})`},{i:'🔣',l:`Legend and renovation sheets only (${n})`}],0,async(x,i)=>{
   if(i===0)return orig.call(inp,fake);
   busy(1,'Saving');try{const keep=[...s.L,...s.R].sort((a,b)=>a-b),blob=await keepPages(s.data,keep),name=f.name.replace(/\.pdf$/i,'')+' (legend and renovation).pdf';
    const g=new File([blob],name,{type:'application/pdf'});busy(0);await orig.call(inp,{target:{files:[g],set value(v){inp.value=v}}});
    toast(`Loaded ${keep.length} of ${s.total} sheets: ${s.L.length} legend, ${s.R.length} renovation`)}catch(err){busy(0);showErr('Could not keep only those sheets: '+(err.message||err))}})};
})();
