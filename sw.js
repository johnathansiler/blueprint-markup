// bpm-v38: app files are network-first (fresh code whenever online, cache when offline); the big vendor libraries are cache-first.
// Precache bypasses the HTTP cache (cache:'reload') so an install can't mix old and new files.
const C='bpm-v120',D='bpm-docs',A=['./','index.html','app.js','app.css','detect.js','codes.json','vendor/pdf-lib.min.js','manifest.json','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png','vendor/pdf.min.js','vendor/pdf.worker.min.js','vendor/jspdf.umd.min.js','vendor/jsQR.min.js','ux.js','pen.js','sync.js','tx.js','mdl.js','tbar.js','tbar.css','guides.js','guides.css','symbols.js','tags.js','panel.js','tlay.js','topbar.js','laypanel.js','pindel.js','pinshdr.js','stamp.js','pagekind.js','typecolor.js','symseed.json','dlg.js','guides-trouble.json','rail.js','defs.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==D).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET'||new URL(q.url).origin!==location.origin)return;
// bpm-v84: mirrored install sheets live in their own cache (kept across releases), cache-first; first open stores them for offline
 if(new URL(q.url).pathname.includes('/docs/')){e.respondWith(caches.open(D).then(async c=>(await c.match(q,{ignoreSearch:true}))||fetch(q).then(r=>{if(r.ok)c.put(q,r.clone());return r})));return}
 if(q.url.includes('/vendor/')){e.respondWith(caches.match(q,{ignoreSearch:true}).then(r=>r||fetch(q).then(f=>{if(f.ok&&q.url.includes('/vendor/ocr/')){const k=f.clone();caches.open(C).then(c=>c.put(q,k))}return f})));return}
 e.respondWith((async()=>{const c=await caches.open(C);try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),4000);const r=await fetch(q,{cache:'no-cache',signal:ctl.signal});clearTimeout(t);if(r.ok)c.put(q,r.clone());return r}
  catch(err){return(await c.match(q,{ignoreSearch:true}))||(q.mode==='navigate'&&await c.match('index.html'))||Response.error()}})())});
