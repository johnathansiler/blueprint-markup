#!/usr/bin/env python3
"""Offline Detect tag reading (review item M4).

Service worker on, network off, Detect's tag passes still read a panel-box
word (FACP) and a candela tag (15CD). Also checks the OCR files sit in the
bpm-ocr cache (kept across a version change) and not in the versioned app cache.

The page is a synthetic one-page PDF with two pictures of those words. It is
not a job plan. Nothing here belongs in the public plan set.

Usage (server already running on the app tree):
  python3 test/offline-detect.py 8000
"""
import base64, json, sys, time, urllib.request
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8000"
BASE = f"http://127.0.0.1:{PORT}/"

# Pictures of "FACP" and "15CD", drawn once so the read does not depend on the
# browser's fonts. Placed on a letter page; ghost points are viewport y-down.
FACP_PNG = "iVBORw0KGgoAAAANSUhEUgAAAIIAAAAwCAAAAAD4av1fAAABXElEQVR4nO2X2w7CMAiGi/H9Xxlvei6VQ/9FjSMxLhul3zgURpw+LY9PA9wIN0KTJ9wipZRcZUZNm4THgy0S70oKg9Zsd17t8EIzRSLDvBVtUGmiwOWC4ETJr+sDGIIaxlG7U7cj0OZ6T2AUkBd6Als5tBVCOgYaV7PH+SeUJk+qRcxeoN7O1u91V+bNm9Tb1QQkEPKBoTFAEZRNFbEi1DgokbgQ4Z0UnOAA9gWd0ojQ+R0eCZ8XLpl1haNpfWObGJWXzLF5YfD6USRoXeaams7iIA80RxWBSkgTAvAcKtI51OMFnv4n8YD2JjzNehkOo7kxrrOkIzYOCzf+O8K+d5ajHjGOMVFvGRAuqAcvgl1isHouiNNAvplrgotOqEbA6UhDB7EBYRC4hcAfDDUX5KlsLoKTBoZKxwMGWEXEGTSEnafX42j9fDJSISuCYzNfuNvh5He+I26EP0B4Abe0RHJy59VHAAAAAElFTkSuQmCC"
CD_PNG = "iVBORw0KGgoAAAANSUhEUgAAAIUAAAAwCAAAAAAatuYmAAABeUlEQVR4nO2XSZLDMAhFwZX7X5leZDCCj4yw7LhTZpMBAU9oALHQBWT5NgAR3RRabopVHnPdMREVTh0DG35+iPtHi7NjqHaWkBHkAoTcFmvEUUoYgfh9MQWi64edylHMguhuDzveUHjMKsSQxdJTFlxmD0gb6RGrvOAQ3OiF4HkVO7Y5nDoXtUy4SEQiUUqUQkdTFEWIj1kTOVwZqFgp3t7APPw1lnXfG6dmvVjt8V0PiLAY7TDEJ4UlopeYG/y9w48LSETSvTsl6b92tQE/kCI/yVkckGJALMa+VSr3WlOz8Y86Pll7k6AQnEGhS8TcpXjJ+IpsFdZzKI6447+xO/0dfI0zspsifHicSjEuoCgWKIJZZ5OBxmUo2toVVpAcBmwQc7cWg/VHjaHutOGBDkjTb/Z4pqpp6bwKnZX+Ud6dAr9WzHdQ5Nr+JESVAr+80tZ2fGZfuG7VB/WlNgYDmmR/oYNg/7I9JNbM7FXq8iPVbIrcFKtcg+IPuyhTayj+LbQAAAAASUVORK5CYII="
# PDF-space centers (origin bottom-left) and the matching viewport points.
META = {"facp": {"x": 160.0, "y": 292.0}, "speaker": {"x": 360.0, "y": 292.0}}

PROBE = r"""
async () => {
  const meta = window.__meta;
  const t0 = performance.now();
  let err = null, panelK = null, hornK = null;
  try {
    ghosts = [
      {id:'panel1', page:1, g:'farp', det:'FARP', x: meta.facp.x, y: meta.facp.y, bw: 56, bh: 20, lab: 0},
      {id:'spk1', page:1, g:'spkw', det:'SPK_BOH', x: meta.speaker.x, y: meta.speaker.y, bw: 13, bh: 13}
    ];
    panelK = await panelPass([1], null, plan);
    hornK = await hornPass([1], null, plan, {noLegend: true, force: true});
  } catch (e) {
    err = (e && (e.stack || e.message)) || String(e);
  }
  const snap = g => ({id:g.id, g:g.g, det:g.det, lab:g.lab||0, low:g.low||'', hornBy:g.hornBy||'', fromG:g.fromG||''});
  return {ms: Math.round(performance.now()-t0), err, panelK, hornK, ghosts: ghosts.map(snap), panel: window.__panel||null, horn: window.__horn||null};
}
"""

def cache_report(page):
    return page.evaluate("""async () => {
      const names = await caches.keys();
      const out = {};
      for (const n of names) {
        const c = await caches.open(n);
        const keys = await c.keys();
        let bytes = 0; const files = [];
        for (const k of keys) {
          const r = await c.match(k);
          const b = r ? (await r.clone().arrayBuffer()).byteLength : 0;
          bytes += b;
          files.push({path: new URL(k.url).pathname, bytes: b});
        }
        files.sort((a,b)=>a.path.localeCompare(b.path));
        out[n] = {count: files.length, bytes, files};
      }
      return {controller: !!(navigator.serviceWorker.controller), script: (navigator.serviceWorker.controller&&navigator.serviceWorker.controller.scriptURL)||'', names, caches: out};
    }""")

def wait_ready(page):
    page.wait_for_function("() => document.querySelectorAll('#projSel option').length > 0", timeout=30000)

def wait_controller(page):
    page.wait_for_function("() => navigator.serviceWorker.controller", timeout=20000)
    wait_ready(page)

def build_pdf(page):
    b64 = page.evaluate("""async ({facp, cd}) => {
      const bin = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
      const {PDFDocument} = PDFLib;
      const doc = await PDFDocument.create();
      const pg = doc.addPage([612, 792]);
      const a = await doc.embedPng(bin(facp));
      const b = await doc.embedPng(bin(cd));
      pg.drawImage(a, {x: 160 - 40.62/2, y: 500 - 15/2, width: 40.62, height: 15});
      pg.drawImage(b, {x: 382 - 36.02/2, y: 500 - 13/2, width: 36.02, height: 13});
      const u = await doc.save();
      let s = ''; for (const x of u) s += String.fromCharCode(x);
      return btoa(s);
    }""", {"facp": FACP_PNG, "cd": CD_PNG})
    return base64.b64decode(b64)

def open_pdf(page, pdf):
    page.set_input_files("#file", files=[{"name": "tags.pdf", "mimeType": "application/pdf", "buffer": pdf}])
    page.wait_for_function("""() => {
      const b = document.querySelector('#busy');
      const e = document.querySelector('#empty');
      return e && e.hidden && b && b.hidden;
    }""", timeout=30000)

def install_probe(page):
    page.evaluate("""(src) => {
      const s = document.createElement('script');
      s.textContent = 'window.__runProbe = ' + src;
      document.documentElement.appendChild(s);
    }""", PROBE)

def ui_detect(page):
    t0 = time.time()
    page.click("#detBtn")
    page.wait_for_function("() => document.querySelector('#detDlg').open", timeout=10000)
    page.click("#detAll")
    page.click("#detGo")
    page.wait_for_function("() => window.__detStats", timeout=60000)
    md = page.evaluate("""async () => {
      if (!window.masterDone) return {ok:false, err:'no masterDone'};
      try { const v = await window.masterDone; return {ok:true, v: v===undefined?null:v}; }
      catch(e){ return {ok:false, err: String(e && (e.stack||e.message) || e)}; }
    }""")
    err = page.evaluate("() => { const n=document.querySelector('#err'); return {hidden:!n||n.hidden, text:(document.querySelector('#errTxt')||{}).textContent||''}; }")
    stats = page.evaluate("() => window.__detStats || null")
    return {"ms": round((time.time()-t0)*1000), "masterDone": md, "err": err, "stats": stats}

def wait_ocr(page, timeout_ms=60000):
    # wait_for_function treats a returned Promise as truthy, so poll a plain flag.
    page.evaluate("""() => {
      if (window.__ocrPoll) return;
      window.__ocrPoll = 1;
      const tick = async () => {
        try {
          if (await caches.has('bpm-ocr')) {
            const paths = (await (await caches.open('bpm-ocr')).keys()).map(k => new URL(k.url).pathname);
            const need = ['/vendor/ocr/tesseract.min.js','/vendor/ocr/worker.min.js','/vendor/ocr/eng.traineddata.gz'];
            const core = paths.some(p => p.endsWith('tesseract-core-simd-lstm.wasm.js') || p.endsWith('tesseract-core-lstm.wasm.js'));
            if (core && need.every(n => paths.includes(n))) { window.__ocrN = paths.length; return; }
          }
        } catch (e) {}
        setTimeout(tick, 100);
      };
      tick();
    }""")
    page.wait_for_function("() => window.__ocrN >= 4", timeout=timeout_ms)

def ocr_summary(report):
    o = report["caches"].get("bpm-ocr", {"count": 0, "bytes": 0, "files": []})
    ver = [n for n in report["names"] if n.startswith("bpm-v")]
    versioned = report["caches"].get(ver[0], {"count": 0, "bytes": 0, "files": []}) if ver else {"count": 0, "bytes": 0, "files": []}
    return {
        "versionCache": ver[0] if ver else None,
        "versionFiles": versioned["count"],
        "versionBytes": versioned["bytes"],
        "versionOcr": [f for f in versioned["files"] if "/vendor/ocr/" in f["path"]],
        "ocrFiles": o["files"],
        "ocrBytes": o["bytes"],
        "ocrCount": o["count"],
    }

def fail(msg):
    print("FAIL", msg)
    raise SystemExit(1)

def main():
    t_nav = time.time()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-dev-shm-usage"])
        ctx = browser.new_context()
        page = ctx.new_page()
        pageerrors = []
        page.on("pageerror", lambda e: pageerrors.append(str(e)))
        page.goto(BASE, wait_until="domcontentloaded")
        t_doc = time.time()
        wait_controller(page)
        t_ctrl = time.time()
        sw_txt = urllib.request.urlopen(BASE + "sw.js", timeout=10).read().decode()
        if "const C='bpm-v124'" not in sw_txt:
            fail("sw.js is not bpm-v124")
        at_ctrl = ocr_summary(cache_report(page))
        wait_ocr(page)
        t_ocr = time.time()
        caches = cache_report(page)
        summary = ocr_summary(caches)
        print("CACHE", json.dumps(summary))
        print("AT_CONTROLLER", json.dumps({"versionFiles": at_ctrl["versionFiles"], "versionBytes": at_ctrl["versionBytes"], "versionOcr": at_ctrl["versionOcr"], "ocrCount": at_ctrl["ocrCount"], "ocrBytes": at_ctrl["ocrBytes"]}))
        print("TIMING_S", json.dumps({
            "doc": round(t_doc-t_nav, 3),
            "controller": round(t_ctrl-t_nav, 3),
            "ocrReady": round(t_ocr-t_nav, 3),
        }))
        if summary["versionFiles"] != 41 or summary["versionBytes"] != 3799920:
            fail(f"versioned cache is {summary['versionFiles']} files / {summary['versionBytes']} bytes, expected 41 / 3799920 (precache only)")
        if summary["versionOcr"] or at_ctrl["versionOcr"]:
            fail("OCR files are inside the versioned cache: " + json.dumps(summary["versionOcr"] or at_ctrl["versionOcr"]))
        cores = [f["path"] for f in summary["ocrFiles"] if "tesseract-core" in f["path"]]
        if len(cores) != 1:
            fail("expected exactly one tesseract core in bpm-ocr, got " + json.dumps(cores))
        if summary["ocrCount"] != 4:
            fail(f"bpm-ocr has {summary['ocrCount']} files, expected 4")
        # Version bump: OCR that lived in the old versioned cache is copied into bpm-ocr, then the old cache is deleted.
        moved = page.evaluate("""async () => {
          const o = await caches.open('bpm-ocr');
          const old = await caches.open('bpm-v121');
          const keys = await o.keys();
          const before = [];
          for (const req of keys) {
            const hit = await o.match(req);
            const n = hit ? (await hit.clone().arrayBuffer()).byteLength : 0;
            before.push({path: new URL(req.url).pathname, bytes: n});
            if (hit) await old.put(req, hit.clone());
          }
          const docs = await caches.open('bpm-docs');
          await docs.put(location.origin + '/docs/__ocr_keep_sentinel', new Response('keep'));
          await caches.delete('bpm-ocr');
          const reg = await navigator.serviceWorker.register('sw.js?m=1');
          const sw = reg.installing || reg.waiting;
          if (sw) await new Promise((res, rej) => {
            if (sw.state === 'activated') return res();
            const t = setTimeout(() => rej(new Error('activate timeout')), 30000);
            sw.addEventListener('statechange', () => { if (sw.state === 'activated') { clearTimeout(t); res(); } if (sw.state === 'redundant') { clearTimeout(t); rej(new Error('redundant')); } });
          });
          const names = await caches.keys();
          const oc = await caches.open('bpm-ocr');
          const files = [];
          for (const k of await oc.keys()) {
            const r = await oc.match(k);
            files.push({path: new URL(k.url).pathname, bytes: r ? (await r.clone().arrayBuffer()).byteLength : 0});
          }
          const sent = await (await caches.open('bpm-docs')).match(location.origin + '/docs/__ocr_keep_sentinel');
          return {before, names, files, sentinel: sent ? await sent.text() : null, script: (navigator.serviceWorker.controller&&navigator.serviceWorker.controller.scriptURL)||''};
        }""")
        print("MIGRATE", json.dumps({k: moved[k] for k in ("names", "sentinel", "script", "files")}))
        if "bpm-v121" in moved["names"]:
            fail("old version cache bpm-v121 was not deleted on activate")
        if "bpm-docs" not in moved["names"] or moved["sentinel"] != "keep":
            fail("bpm-docs was not kept across activate")
        if "bpm-ocr" not in moved["names"]:
            fail("bpm-ocr missing after activate")
        before_map = {f["path"]: f["bytes"] for f in moved["before"]}
        after_map = {f["path"]: f["bytes"] for f in moved["files"]}
        for path, n in before_map.items():
            if after_map.get(path) != n:
                fail(f"migrated {path} is {after_map.get(path)} bytes, was {n}")
        pdf = build_pdf(page)
        ctx.close()
        # Fresh visit: warm the cache, then drop the network. The script URL stays sw.js,
        # so the offline reload does not try to fetch a different worker.
        ctx = browser.new_context()
        page = ctx.new_page()
        pageerrors = []
        page.on("pageerror", lambda e: pageerrors.append(str(e)))
        page.goto(BASE, wait_until="domcontentloaded")
        wait_controller(page)
        wait_ocr(page)
        ctx.set_offline(True)
        page.reload(wait_until="domcontentloaded", timeout=30000)
        wait_ready(page)
        offline_caches = cache_report(page)
        off = ocr_summary(offline_caches)
        if off["ocrBytes"] != summary["ocrBytes"]:
            fail(f"offline bpm-ocr is {off['ocrBytes']} bytes, online it was {summary['ocrBytes']}")
        if off["versionOcr"]:
            fail("offline versioned cache holds OCR files")
        open_pdf(page, pdf)
        install_probe(page)
        page.evaluate("(m) => { window.__meta = m }", META)
        probe = page.evaluate("() => window.__runProbe()")
        ui = ui_detect(page)
        print("UI", json.dumps(ui))
        print("PROBE", json.dumps(probe))
        if pageerrors:
            fail("page errors: " + " | ".join(pageerrors))
        if probe["err"]:
            fail("tag passes threw: " + probe["err"])
        panel = (probe["panel"] or [None])[0]
        if not panel or panel.get("read") != "FACP" or panel.get("to") != "facp":
            fail("panel letters not read offline: " + json.dumps(probe["panel"]))
        gpanel = next(g for g in probe["ghosts"] if g["id"] == "panel1")
        if gpanel["g"] != "facp" or gpanel["fromG"] != "farp":
            fail("panel ghost was not retyped offline: " + json.dumps(gpanel))
        horn = probe["horn"] or {}
        page1 = (horn.get("pages") or {}).get("1") or {}
        if page1.get("tagCD") != 1 or page1.get("horn") != 1:
            fail("candela tag not read offline: " + json.dumps(horn))
        ghorn = next(g for g in probe["ghosts"] if g["id"] == "spk1")
        if ghorn["g"] != "horn" or ghorn["hornBy"] != "tag":
            fail("speaker ghost was not retyped from the candela tag: " + json.dumps(ghorn))
        if not ui["masterDone"]["ok"]:
            fail("Detect background pass rejected: " + json.dumps(ui["masterDone"]))
        result = {
            "versionFiles": summary["versionFiles"],
            "versionBytes": summary["versionBytes"],
            "ocrFiles": summary["ocrFiles"],
            "ocrBytes": summary["ocrBytes"],
            "ocrCount": summary["ocrCount"],
            "controllerS": round(t_ctrl-t_nav, 3),
            "ocrReadyS": round(t_ocr-t_nav, 3),
            "probeMs": probe["ms"],
            "detectMs": ui["ms"],
            "detectPageMs": (ui["stats"] or [{}])[0].get("totalMs"),
            "migrated": True,
            "pageerrors": pageerrors,
        }
        print("RESULT", json.dumps(result))
        print("ALLOK")
        browser.close()

if __name__ == "__main__":
    main()
