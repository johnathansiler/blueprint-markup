// ---------- bpm-v135 item 11: app-screen pinch zoom + Menu > Reset screen zoom ----------
(()=>{const {MX}=window.V135;
 // ---- item 11: app-screen pinch zoom (bpm-v135). The page may now be pinch-zoomed (small text, photos, dialogs);
 // the plan keeps its own pinch zoom: #stage is touch-action:none, and iOS page gestures that start on the plan are cancelled.
 const stg=document.getElementById('stage');if(stg)for(const ev of['gesturestart','gesturechange'])stg.addEventListener(ev,e=>e.preventDefault(),{passive:false});
 const VPC='width=device-width,initial-scale=1,minimum-scale=1';let zBusy=0;
 /* lock the page scale to 1 until the browser has actually applied it (or 0.7 s), then unlock so pinch-to-zoom keeps working */
 function resetZoom(){const m=document.querySelector('meta[name=viewport]');if(!m||zBusy)return;zBusy=1;const t0=performance.now();/* v143: Chromium only re-applies the tag when the scale values change, so lock at a hair over 1 (was maximum-scale=1, which it ignored) */m.content='width=device-width,initial-scale=1.0001,minimum-scale=1,maximum-scale=1.0001';
  const vv=window.visualViewport;const chk=()=>{const t=performance.now()-t0;if(t>700||t>150&&(!vv||Math.abs(vv.scale-1)<.01)){m.content=VPC;zBusy=0;return}requestAnimationFrame(chk)};requestAnimationFrame(chk)}
 window.resetScreenZoom=resetZoom;
 MX.push(()=>[{i:'🔍',l:'Reset screen zoom',run:resetZoom}]);
})();
