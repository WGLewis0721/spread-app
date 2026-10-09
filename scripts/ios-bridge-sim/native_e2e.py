import json, re, sys
from playwright.sync_api import sync_playwright

fs = {}
import os
INIT = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'native-init.js')).read()
SHOTS = sys.argv[1]
results = []

def check(name, ok, detail=''):
    results.append((name, ok))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))

with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['PW_CHROME']} if os.environ.get('PW_CHROME') else {}))
    ctx = b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.expose_function('__fsRead', lambda path: fs.get(path))
    ctx.expose_function('__fsWrite', lambda path, data, enc: fs.__setitem__(path, data))
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # Block every non-local request: the installed app must work with no network at all.
    external = []
    def gate(route):
        url = route.request.url
        if url.startswith('http://127.0.0.1:8097/') or url.startswith('data:') or url.startswith('blob:'):
            route.continue_()
        else:
            external.append(url); route.abort()
    page.route('**/*', gate)

    page.goto('http://127.0.0.1:8097/'); page.wait_for_timeout(2000)
    store_key = lambda: 'spread.v1.' + page.evaluate("localStorage.getItem('spread.profile')")
    check('opens straight into the planner (no marketing or license gate)', page.evaluate("document.documentElement.getAttribute('data-spread')") == 'in' and page.get_by_placeholder('What matters most here?').count() > 0)
    check('no license is written to storage', page.evaluate("localStorage.getItem('spread.license')") is None)
    check('status bar style is synced on boot', page.evaluate("(window.__status||[]).length") >= 1, str(page.evaluate("window.__status")))

    # The Spread/Week segmented tabs must work with only the keyboard, keep
    # focus on the selected tab and expose its associated panel.
    page.get_by_role('tab', name='Spread').focus()
    page.keyboard.press('ArrowRight')
    check('view tabs: Right switches to Week without changing focus context',
          page.get_by_role('tab', name='Week').get_attribute('aria-selected') == 'true'
          and page.get_by_role('tab', name='Week').evaluate('(e) => e === document.activeElement')
          and page.get_by_role('tabpanel').get_attribute('aria-labelledby') == 'planner-tab-week')
    page.keyboard.press('ArrowLeft')
    check('view tabs: Left returns to Spread and panel is labeled',
          page.get_by_role('tab', name='Spread').get_attribute('aria-selected') == 'true'
          and page.get_by_role('tab', name='Spread').evaluate('(e) => e === document.activeElement')
          and page.get_by_role('tabpanel').get_attribute('aria-labelledby') == 'planner-tab-spread')

    # Add a task through the UI.
    page.get_by_placeholder('What matters most here?').first.click()
    page.keyboard.type('Sunday review')
    page.keyboard.press('Enter')
    page.wait_for_timeout(600)
    saved = page.evaluate("(k)=>localStorage.getItem(k)", store_key())
    check('a task is written to local storage', saved is not None and 'Sunday review' in saved)
    page.wait_for_timeout(1500)
    mirrored = [json.loads(v) for k, v in fs.items() if k.startswith('spread-mirror-')]
    newest = max(mirrored, key=lambda d: d['seq'])
    check('the snapshot file follows the change', 'Sunday review' in newest['entries'].get(store_key(), ''), f"seq {newest['seq']}")

    # Put the task on today with the tap path. A placed task once crashed the whole planner
    # (Spread view re-rendered forever), so the Spread view must still render it, and Not today and
    # Undo must round-trip through storage.
    task_of = lambda: next((t for b in json.loads(page.evaluate("(k)=>localStorage.getItem(k)", store_key()))['weeks'].values() for x in b['boxes'] for t in x['tasks'] if t['text'] == 'Sunday review'), {})
    today = page.evaluate("(() => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })()")
    page.get_by_role('tab', name='Week').click(); page.wait_for_timeout(800)
    page.locator('button[data-drag="spread"]').first.click(); page.wait_for_timeout(500)
    page.locator(f'section[data-day="{today}"]').get_by_role('button', name=re.compile('^Add ')).click(); page.wait_for_timeout(500)
    page.locator('section[aria-label="To place"] li', has_text='Sunday review').get_by_role('button', name='Place').click(); page.wait_for_timeout(300)
    page.locator('ul[aria-label="Days for Sunday review"] button').first.click(); page.wait_for_timeout(500)
    placed = task_of().get('allocationId')
    check('a task is placed on today from To place', bool(placed), str(task_of()))
    page.get_by_role('tab', name='Spread').click(); page.wait_for_timeout(800)
    check('the Spread view still renders a placed task', page.get_by_text('Something went wrong').count() == 0 and page.get_by_role('button', name='Not today: Sunday review').count() == 1)
    page.get_by_role('button', name='Not today: Sunday review').click(); page.wait_for_timeout(400)
    check('Not today takes it off the day and keeps it', task_of().get('allocationId') is None and task_of().get('text') == 'Sunday review')
    check('only the latest change offers Undo', page.get_by_role('button', name='Undo').count() == 1)
    page.get_by_role('button', name='Undo').click(); page.wait_for_timeout(400)
    check('Undo puts it back on the same day', task_of().get('allocationId') == placed)
    page.screenshot(path=f'{SHOTS}/e2e-placed.png')

    # More sheet content on the phone.
    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    page.screenshot(path=f'{SHOTS}/e2e-more.png')
    body = page.inner_text('body')
    check('More: no Log out, License key or Print', all(t not in body for t in ('Log out', 'License key', 'Print / Save PDF')))
    check('More: backup, restore and Word export are present', all(t in body for t in ('Back Up Spread', 'Restore Spread', 'Word document')))
    check('More: restore picker accepts any file type on iOS', page.evaluate("document.querySelector('input[type=file]').getAttribute('accept')") is None)

    # Backup goes through the share sheet.
    page.get_by_text('Back Up Spread').click(); page.wait_for_timeout(800)
    shared = page.evaluate("window.__shared || []")
    files = [k for k in fs if k.startswith('export/')]
    check('Backup opens the share sheet with a .spread file', len(shared) == 1 and shared[0]['files'][0].endswith('.spread') and len(files) == 1, str(files))
    if files:
        import base64
        doc = json.loads(base64.b64decode(fs[files[0]]))
        body = json.loads(doc['payloadText']) if doc.get('version') == 2 else {}
        check('the exported file is a full (version 2) Spread backup with a checksum containing the task', doc['kind'] == 'spread-backup' and doc.get('version') == 2 and len(doc.get('checksum', '')) == 64 and 'Sunday review' in doc['payloadText'] and len(body.get('roster', [])) >= 1)
        check('the full backup leaves out the license and the schema marker', 'spread.license' not in body.get('settings', {}) and 'spread.schema' not in body.get('settings', {}))
        backup_text = base64.b64decode(fs[files[0]]).decode()
    check('Backup success toast is shown and the sheet closed', page.get_by_text('Backup exported.').count() > 0)

    # Cancelling the share sheet is quiet and keeps the sheet open.
    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    page.evaluate("window.__shareCancel = true")
    page.get_by_text('Back Up Spread').click(); page.wait_for_timeout(800)
    check('Cancelling the share sheet shows no success toast', page.get_by_text('Backup exported.').count() <= 1 and page.get_by_text('Restore Spread').count() > 0)
    page.evaluate("window.__shareCancel = false")
    page.keyboard.press('Escape'); page.wait_for_timeout(300)

    # Termination: a reload keeps the data (same WebView storage).
    profile_before = page.evaluate("localStorage.getItem('spread.profile')")
    page.reload(); page.wait_for_timeout(2000)
    check('data survives relaunch', page.get_by_text('Sunday review').count() > 0 and page.evaluate("localStorage.getItem('spread.profile')") == profile_before)

    # iOS discards WebView storage: the snapshot restores it.
    page.evaluate("localStorage.clear()")
    page.reload(); page.wait_for_timeout(2500)
    check('planner is restored from the snapshot after storage loss', page.get_by_text('Sunday review').count() > 0 and page.evaluate("localStorage.getItem('spread.profile')") == profile_before)
    page.screenshot(path=f'{SHOTS}/e2e-restored.png')

    # Unreadable saved data is set aside, not silently erased.
    key = store_key()
    page.evaluate("(k)=>{localStorage.setItem(k,'{not json')}", key)
    page.reload(); page.wait_for_timeout(2000)
    rec = page.evaluate("(k)=>localStorage.getItem('spread.recovery.'+k)", key)
    check('unreadable data is kept under a recovery key', rec == '{not json', str(rec))
    check('the planner still opens after unreadable data', page.get_by_placeholder('What matters most here?').count() > 0)

    # Restore a full backup through the picker: it is added as a new profile, nothing is replaced.
    roster_before = json.loads(page.evaluate("localStorage.getItem('spread.profiles')"))
    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    page.set_input_files('input[type=file]', files=[{'name': 'Spread-restore.spread', 'mimeType': 'application/octet-stream', 'buffer': backup_text.encode()}])
    page.wait_for_timeout(500)
    check('Restore shows the add-profiles confirmation for a full backup', page.get_by_text('Add these profiles?').count() > 0)
    page.get_by_role('button', name='Add', exact=True).click(); page.wait_for_timeout(800)
    roster_after = json.loads(page.evaluate("localStorage.getItem('spread.profiles')"))
    check('Restore added a profile and kept the existing ones', len(roster_after) == len(roster_before) + 1 and roster_after[:len(roster_before)] == roster_before, str(roster_after))
    added = roster_after[-1]
    check('the added profile is named as restored and holds the task', 'restored' in added['name'] and 'Sunday review' in (page.evaluate("(k)=>localStorage.getItem(k)", added['store']) or ''), added['name'])

    # A damaged full backup is refused.
    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    page.set_input_files('input[type=file]', files=[{'name': 'bad.spread', 'mimeType': 'application/octet-stream', 'buffer': backup_text.replace('Sunday review', 'Sunday EDITED').encode()}])
    page.wait_for_timeout(500)
    check('A damaged backup is refused', page.get_by_text('damaged').count() > 0 and page.get_by_text('Add these profiles?').count() == 0)
    page.keyboard.press('Escape'); page.wait_for_timeout(400)

    # A week backup from an earlier build still restores into the open profile.
    legacy = json.dumps({'kind': 'spread-backup', 'version': 1, 'savedAt': '2026-10-01T00:00:00Z', 'data': {'hats': [{'id': 'work', 'name': 'Work', 'defaultHours': 8, 'color': '#34C759'}], 'weeks': {'2026-09-28': {'boxes': [{'hatId': 'work', 'hours': 8, 'tasks': [{'id': 't1', 'text': 'Legacy task', 'done': False}]}]}}, 'currentWeek': '2026-09-28'}})
    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    page.set_input_files('input[type=file]', files=[{'name': 'old.spread', 'mimeType': 'application/octet-stream', 'buffer': legacy.encode()}])
    page.wait_for_timeout(500)
    check('A version 1 backup still shows the replace confirmation', page.get_by_text('Restore this backup?').count() > 0)
    page.get_by_role('button', name='Restore', exact=True).click(); page.wait_for_timeout(800)
    check('A version 1 backup restores its task', 'Legacy task' in (page.evaluate("(k)=>localStorage.getItem(k)", store_key()) or ''))

    # A full device: writes fail, the planner stays usable and says so once.
    page.evaluate("""() => {
      const real = Storage.prototype.setItem;
      window.__realSet = real;
      Storage.prototype.setItem = function(k, v) { if (k.startsWith('spread.v1')) { throw new DOMException('full', 'QuotaExceededError'); } return real.call(this, k, v); };
    }""")
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    page.get_by_placeholder('Add a task').first.click()
    page.keyboard.type('While full')
    page.keyboard.press('Enter'); page.wait_for_timeout(800)
    check('a full store does not break the screen', page.get_by_text('While full').count() > 0 and not errors, str(errors))
    check('a full store is announced', page.get_by_text('out of storage').count() > 0)
    page.screenshot(path=f'{SHOTS}/e2e-full.png')
    page.evaluate("() => { Storage.prototype.setItem = window.__realSet; }")

    check('no request left the app', not external, str(external))
    check('no page errors', not errors, str(errors))
    b.close()

bad = [n for n, ok in results if not ok]
print(f"\n{len(results)-len(bad)}/{len(results)} passed")
sys.exit(1 if bad else 0)
