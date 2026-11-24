// bpm-v38: app files are network-first (fresh code whenever online, cache when offline); the big vendor libraries are cache-first.
// Precache bypasses the HTTP cache (cache:'reload') so an install can't mix old and new files.
const C='bpm-v153',D='bpm-docs',O='bpm-ocr',A=['./','index.html','app.js','app.css','detect.js','codes.json','vendor/pdf-lib.min.js','manifest.json','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png','vendor/pdf.min.js','vendor/pdf.worker.min.js','vendor/jspdf.umd.min.js','vendor/jsQR.min.js','dlg.js','ui.js','guides-trouble.json'];
// bpm-v124: OCR tag files stay in O across version bumps (activate used to delete them with the old app cache).
// Not in the install precache, so the first open does not wait on them. After the worker takes control it downloads whatever this phone is missing.
const OB=['vendor/ppocr/ort.wasm.min.js','vendor/ppocr/ort-wasm-simd-threaded.wasm','vendor/ppocr/ort-wasm-simd-threaded.mjs','vendor/ppocr/ppocr_keys.json','vendor/ppocr/PP-OCRv6_det_small.onnx','vendor/ppocr/PP-OCRv6_rec_small.onnx','vendor/ppocr/ppocr-worker.js'];
function ocrFiles(){return OB.slice()}
async function keepOcr(){const o=await caches.open(O),names=await caches.keys();for(const name of names){if(name===O)continue;const c=await caches.open(name);for(const req of await c.keys()){if(!/\/vendor\/(ocr|ppocr)\//.test(new URL(req.url).pathname))continue;if(await o.match(req,{ignoreSearch:true}))continue;const hit=await c.match(req);if(hit)await o.put(req,hit)}}return names}
let ocrNext=0;function warmOcr(){const now=Date.now();if(now<ocrNext)return Promise.resolve();ocrNext=now+30000;return caches.open(O).then(async c=>{let miss=0;for(const u of ocrFiles()){if(await c.match(u,{ignoreSearch:true}))continue;miss++;try{const r=await fetch(new Request(u,{cache:'reload'}));if(r.ok){await c.put(u,r);miss--}}catch(e){}}if(!miss)ocrNext=now+86400000})}
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'})))));self.skipWaiting()});
self.addEventListener('activate',e=>{const ready=keepOcr().then(names=>Promise.all(names.filter(x=>x!==C&&x!==D&&x!==O).map(x=>caches.delete(x)))).then(()=>self.clients.claim());e.waitUntil(ready);e.waitUntil(ready.then(()=>warmOcr()))});
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET'||new URL(q.url).origin!==location.origin)return;
 if(Date.now()>=ocrNext)e.waitUntil(warmOcr());
// bpm-v84: mirrored install sheets live in their own cache (kept across releases), cache-first; first open stores them for offline
 if(new URL(q.url).pathname.includes('/docs/')){e.respondWith(caches.open(D).then(async c=>(await c.match(q,{ignoreSearch:true}))||fetch(q).then(r=>{if(r.ok)c.put(q,r.clone());return r})));return}
 if(/\/vendor\/(ocr|ppocr)\//.test(new URL(q.url).pathname)){e.respondWith(caches.open(O).then(async c=>{const hit=await c.match(q,{ignoreSearch:true});if(hit)return hit;const f=await fetch(q);if(f.ok)c.put(q,f.clone());return f}));return}
 if(q.url.includes('/vendor/')){e.respondWith(caches.match(q,{ignoreSearch:true}).then(r=>r||fetch(q)));return}
 e.respondWith((async()=>{const c=await caches.open(C);try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),4000);const r=await fetch(q,{cache:'no-cache',signal:ctl.signal});clearTimeout(t);if(r.ok)c.put(q,r.clone());return r}
  catch(err){const hit=(await c.match(q,{ignoreSearch:true}))||(q.mode==='navigate'&&await c.match('index.html'));if(hit)return hit;
   // bpm-v141: slow network and no copy in this version's cache (first open after an update): keep waiting for the network instead of failing the file
   try{return await fetch(q,{cache:'no-cache'})}catch(e2){return Response.error()}}})())});
