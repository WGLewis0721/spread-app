import sys
from playwright.sync_api import sync_playwright
ok = True
def check(n, c, d=''):
    global ok
    ok = ok and c
    print(('PASS ' if c else 'FAIL ') + n + (f' [{d}]' if d else ''))
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 393, 'height': 852}, accept_downloads=True)
    page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('http://127.0.0.1:8097/'); page.wait_for_timeout(1500)
    check('web: not treated as the installed app', page.evaluate("document.documentElement.getAttribute('data-spread')") is None)
    check('web: the site gate shows (no planner)', page.get_by_placeholder('What matters most here?').count() == 0)
    page.evaluate("localStorage.setItem('spread.license', JSON.stringify({ok:true,plan:'demo'}))")
    page.reload(); page.wait_for_timeout(2000)
    check('web: licensed visitor opens the planner', page.get_by_placeholder('What matters most here?').count() > 0)
    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    body = page.inner_text('body')
    check('web: Log out, License key and Print are still offered', all(t in body for t in ('Log out', 'License key', 'Print / Save PDF')))
    check('web: restore picker keeps its accept filter', page.evaluate("document.querySelector('input[type=file]').getAttribute('accept')") == '.spread,.json,application/json')
    with page.expect_download() as dl:
        page.get_by_text('Back Up Spread').click()
    check('web: backup is a normal browser download', dl.value.suggested_filename.endswith('.spread'), dl.value.suggested_filename)
    page.wait_for_timeout(500)
    check('web: backup toast says saved', page.get_by_text('Backup saved.').count() > 0)
    page.screenshot(path=sys.argv[1] + '/web-regress.png')
    check('web: no recovery keys written', page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('spread.recovery')).length") == 0)
    check('web: no page errors', not errs, str(errs))
    b.close()
sys.exit(0 if ok else 1)
