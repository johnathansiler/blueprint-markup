#!/usr/bin/env python3
"""Checks for bpm-v122 (pin card keeps edits; update banner) and bpm-v123 (toast/Detect pop-up clear the card; tablet More fits).

No private plans. A generated image is opened in the browser. Run:
  python3 test/v122ui.py 8000
The port is the app server (python3 -m http.server). Prints ALLOK or FAIL.
"""
import sys, os, struct, zlib, tempfile
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else '8000'
BASE = f'http://127.0.0.1:{PORT}/?q=v122ui'
VPS = {
    'phone412': (412, 915), 'android': (439, 846), 'foldClosed': (344, 882),
    'foldOpen': (920, 1000), 'tabletP': (768, 1024), 'tabletL': (1180, 820),
}
fail = []


def check(ok, msg):
    print(('OK  ' if ok else 'FAIL') + ' ' + msg)
    if not ok:
        fail.append(msg)


def png(w=800, h=600):
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(b'\x00' + (b'\xee\xee\xee' * w) for _ in range(h))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def overlaps(a, b):
    return a['width'] > 1 and b['width'] > 1 and a['x'] < b['x'] + b['width'] - 0.5 and a['x'] + a['width'] > b['x'] + 0.5 and a['y'] < b['y'] + b['height'] - 0.5 and a['y'] + a['height'] > b['y'] + 0.5


def boot(page, path):
    page.add_init_script("navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()))")
    page.goto(BASE, wait_until='domcontentloaded')
    page.set_input_files('#file', path)
    page.wait_for_function("() => typeof plan!=='undefined' && plan && plan.pages>=1 && pageW>0 && document.getElementById('empty').hidden")
    page.wait_for_timeout(200)


def add_pin(page, yf=0.42):
    page.evaluate(
        """async (yf) => {
          const p={id:'pin1',planId:plan.id,page,x:pageW*0.5,y:pageH*yf,type:'smoke',address:'',loop:'',status:'not tested',notes:'',created:Date.now(),opacity:1};
          await change('pins',null,p);
          await openPin(pins.find(x=>x.id==='pin1'));
        }""",
        yf,
    )
    page.wait_for_selector('#pinDlg[open]')


def addr(page):
    return page.evaluate("() => (pins.find(p=>p.id==='pin1')||{}).address||''")


def xy(page):
    return page.evaluate("() => { const p=pins.find(x=>x.id==='pin1'); return p?[p.x,p.y]:null }")


def main():
    fd, path = tempfile.mkstemp(suffix='.png')
    os.write(fd, png())
    os.close(fd)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            run(browser, path)
        finally:
            browser.close()
            os.remove(path)
    print('FAIL' if fail else 'ALLOK')
    return 1 if fail else 0


def run(browser, path):
    ctx = browser.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=1)
    page = ctx.new_page()
    page.on('pageerror', lambda e: check(False, 'pageerror ' + str(e)))
    boot(page, path)

    # H1: Escape saves one undo step and does not move the pin
    add_pin(page)
    before = xy(page)
    page.fill('#pinDlg input[name=address]', 'L2-14')
    page.keyboard.press('Escape')
    page.wait_for_function("() => !document.getElementById('pinDlg').open")
    page.wait_for_timeout(50)
    check(addr(page) == 'L2-14', 'H1 Escape stores the address (got %r)' % addr(page))
    check(xy(page) == before, 'H1 Escape leaves pin x/y alone')
    check(page.eval_on_selector('#undo', 'el => !el.disabled'), 'H1 Escape is one undoable change')
    page.click('#undo')
    page.wait_for_function("() => (pins.find(p=>p.id==='pin1')||{}).address===''")
    check(addr(page) == '', 'H1 Undo reverts the auto-saved address')
    check(xy(page) == before, 'H1 Undo leaves pin x/y alone')

    # H1: Close button
    page.evaluate("() => openPin(pins.find(x=>x.id==='pin1'))")
    page.wait_for_selector('#pinDlg[open]')
    page.fill('#pinDlg input[name=address]', 'L2-15')
    page.click('#pinDlg button[value=cancel]')
    page.wait_for_function("() => !document.getElementById('pinDlg').open")
    page.wait_for_timeout(50)
    check(addr(page) == 'L2-15', 'H1 Close stores the address (got %r)' % addr(page))

    # H1: clean Close does not add an undo step
    undos = page.evaluate("() => { const b=document.getElementById('undo'); return b&&!b.disabled }")
    page.evaluate("() => openPin(pins.find(x=>x.id==='pin1'))")
    page.wait_for_selector('#pinDlg[open]')
    page.click('#pinDlg button[value=cancel]')
    page.wait_for_function("() => !document.getElementById('pinDlg').open")
    check(page.evaluate("() => (pins.find(p=>p.id==='pin1')||{}).address") == 'L2-15', 'H1 clean Close keeps the stored address')
    check(page.evaluate("() => { const b=document.getElementById('undo'); return b&&!b.disabled }") == undos, 'H1 clean Close adds no undo step')

    # H1: Android Back is the dialog cancel event (same as Escape)
    page.evaluate("() => openPin(pins.find(x=>x.id==='pin1'))")
    page.wait_for_selector('#pinDlg[open]')
    page.fill('#pinDlg input[name=address]', 'L2-16')
    page.evaluate("() => document.getElementById('pinDlg').dispatchEvent(new Event('cancel',{bubbles:false,cancelable:true}))")
    page.wait_for_function("() => (pins.find(p=>p.id==='pin1')||{}).address==='L2-16'")
    check(addr(page) == 'L2-16', 'H1 dialog cancel (Android Back) stores the address')
    # the synthetic cancel does not itself close; the browser's Back key does. Close it for the next step.
    if page.eval_on_selector('#pinDlg', 'd => d.open'):
        page.evaluate("() => document.getElementById('pinDlg').close()")

    # H1: failed with no reason stays open and is not stored
    page.evaluate("() => openPin(pins.find(x=>x.id==='pin1'))")
    page.wait_for_selector('#pinDlg[open]')
    page.select_option('#pinDlg select[name=status]', 'failed')
    page.select_option('#pinDlg select[name=reason]', '')
    page.keyboard.press('Escape')
    page.wait_for_timeout(100)
    check(page.eval_on_selector('#pinDlg', 'd => d.open'), 'H1 failed device without a reason stays open')
    check(page.evaluate("() => pins.find(p=>p.id==='pin1').status") == 'not tested', 'H1 blocked close does not store the failed status')
    page.evaluate("() => document.getElementById('pinDlg').close()")

    # H1: Save still writes once
    page.evaluate("() => openPin(pins.find(x=>x.id==='pin1'))")
    page.wait_for_selector('#pinDlg[open]')
    page.fill('#pinDlg input[name=address]', 'L2-17')
    page.click('#pinSave')
    page.wait_for_function("() => !document.getElementById('pinDlg').open && (pins.find(p=>p.id==='pin1')||{}).address==='L2-17'")
    check(addr(page) == 'L2-17', 'H1 Save still stores the address')

    # H2: banner, no silent reload; Reload flushes a dirty card
    reloaded = {'n': 0}
    page.on('framenavigated', lambda f: reloaded.__setitem__('n', reloaded['n'] + 1) if f == page.main_frame else None)
    n0 = reloaded['n']
    page.evaluate("() => offerUpdate()")
    page.wait_for_selector('#updBar:not([hidden])')
    check(page.inner_text('#updTxt').strip() == 'Update ready', 'H2 banner says Update ready')
    check(page.inner_text('#updReload').strip() == 'Reload', 'H2 Reload button is labeled')
    page.wait_for_timeout(200)
    check(reloaded['n'] == n0, 'H2 showing the banner does not reload')
    page.evaluate("() => openPin(pins.find(x=>x.id==='pin1'))")
    page.wait_for_selector('#pinDlg[open]')
    page.fill('#pinDlg input[name=address]', 'L2-18')
    page.wait_for_timeout(150)
    check(reloaded['n'] == n0, 'H2 an open card is not reloaded out from under the typing')
    # The card is a modal, so Reload is tapped after the card is closed. Closing keeps the edit.
    page.keyboard.press('Escape')
    page.wait_for_function("() => !document.getElementById('pinDlg').open && (pins.find(p=>p.id==='pin1')||{}).address==='L2-18'")
    check(page.eval_on_selector('#updBar', 'el => !el.hidden'), 'H2 banner stays up after the card closes')
    with page.expect_event('load', timeout=15000):
        page.click('#updReload')
    page.wait_for_function("() => typeof pins!=='undefined' && pins.some(p=>p.id==='pin1' && p.address==='L2-18')", timeout=15000)
    check(addr(page) == 'L2-18', 'H2 reload keeps the address that was saved on close')
    check(page.eval_on_selector('#updBar', 'el => el.hidden'), 'H2 banner is hidden again after reload')
    ctx.close()

    # M1 + M3 across viewports
    for name, (w, h) in VPS.items():
        c = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
        p = c.new_page()
        errs = []
        p.on('pageerror', lambda e, errs=errs: errs.append(str(e)))
        boot(p, path)
        add_pin(p, 0.38)
        # toast
        p.evaluate("() => toast('Accepted 16 pins')")
        p.wait_for_function("() => !document.getElementById('toast').hidden")
        p.wait_for_timeout(80)
        p.evaluate("() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
        card = p.eval_on_selector('#pinDlg', 'el => el.getBoundingClientRect().toJSON()')
        toast = p.eval_on_selector('#toast', 'el => el.getBoundingClientRect().toJSON()')
        check(not overlaps(card, toast), '%s toast does not overlap the pin card' % name)
        # Detect pop-up
        p.evaluate("""() => { ghosts=[{id:'g1',page,x:80,y:80,g:'smoke',det:'SMOKE',bw:13,bh:13}]; renderGhostBar() }""")
        p.wait_for_function("() => !document.getElementById('ghBar').hidden && document.getElementById('ghBar').getBoundingClientRect().height>10")
        p.wait_for_timeout(80)
        p.evaluate("() => window.pinCardPlace&&pinCardPlace()")
        p.evaluate("() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
        card = p.eval_on_selector('#pinDlg', 'el => el.getBoundingClientRect().toJSON()')
        gh = p.eval_on_selector('#ghBar', 'el => el.getBoundingClientRect().toJSON()')
        stage = p.eval_on_selector('#stage', 'el => el.getBoundingClientRect().toJSON()')
        check(not overlaps(card, gh), '%s Detect pop-up does not overlap the pin card' % name)
        check(gh['y'] >= stage['y'] - 1 and gh['y'] + gh['height'] <= stage['y'] + stage['height'] + 1, '%s Detect pop-up stays in the plan area' % name)
        check(not overlaps(card, p.eval_on_selector('#toast', 'el => el.getBoundingClientRect().toJSON()')), '%s toast still clear of the card when the pop-up is up' % name)
        # update banner
        p.evaluate("() => offerUpdate()")
        p.wait_for_timeout(50)
        p.evaluate("() => window.pinCardPlace&&pinCardPlace()")
        p.evaluate("() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
        card = p.eval_on_selector('#pinDlg', 'el => el.getBoundingClientRect().toJSON()')
        upd = p.eval_on_selector('#updBar', 'el => el.getBoundingClientRect().toJSON()')
        check(not overlaps(card, upd), '%s update banner does not overlap the pin card' % name)
        # More fully on screen
        more = p.eval_on_selector('#tb2More', 'el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,t:(el.innerText||\"\")} }')
        check(more['w'] > 20 and more['x'] >= -1 and more['x'] + more['w'] <= w + 1 and more['y'] >= -1 and more['y'] + more['h'] <= h + 1, '%s More is fully on screen (%s)' % (name, round(more['x'] + more['w'], 1)))
        check('More' in more['t'], '%s More label reads More (got %r)' % (name, more['t']))
        # every top-bar button fully on screen
        clipped = p.evaluate("""(vw) => [...document.querySelectorAll('#top button')].filter(b=>b.offsetParent).filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&(r.left<-1||r.right>vw+1||r.top<-1)}).map(b=>b.id||b.innerText)""", w)
        check(clipped == [], '%s top-bar buttons fully on screen (clipped %s)' % (name, clipped))
        cut = p.evaluate("""() => [...document.querySelectorAll('#top button')].filter(b=>b.offsetParent).filter(b=>{const tl=b.querySelector('.tl');return tl&&tl.scrollWidth>tl.clientWidth+1}).map(b=>b.id+':'+(b.querySelector('.tl').textContent||''))""")
        check(cut == [], '%s top-bar labels are fully visible (%s)' % (name, cut))
        check(not errs, '%s no page errors %s' % (name, errs))
        c.close()


if __name__ == '__main__':
    sys.exit(main())
