"""iCloud Backup in the installed app, against a fake SpreadCloud plugin (see native-init.js).

Needs a bundle built with the flag on:
  VITE_SPREAD_CLOUD_BACKUP=1 npm run export:ios
  (cd dist-ios && python3 -m http.server 8097 --bind 127.0.0.1) &
  python3 scripts/ios-bridge-sim/cloud_backup_e2e.py /tmp/shots

It shows the app's own logic (when it backs up, what it says, restore never replacing). It says
nothing about real iCloud: that is the device checklist in docs/IOS_RELEASE.md.
"""
import json, os, sys
from playwright.sync_api import sync_playwright

SHOTS = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
INIT = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'native-init.js')).read()
results = []
def check(name, ok, detail=''):
    results.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + (f' [{detail}]' if detail else ''))

fs = {}
external = []
errors = []
with sync_playwright() as p:
    launch = {'executable_path': os.environ['PW_CHROME']} if os.environ.get('PW_CHROME') else {}
    b = p.chromium.launch(**launch)
    ctx = b.new_context(viewport={'width': 393, 'height': 852})
    ctx.add_init_script(INIT)
    # This run is of someone who already answered the first-run notice (tested separately below).
    ctx.add_init_script("try { localStorage.setItem('spread.cloud.backup.ack', 'yes') } catch (e) {}")
    page = ctx.new_page()
    page.expose_function('__fsRead', lambda path: fs.get(path))
    page.expose_function('__fsWrite', lambda path, data, enc: fs.__setitem__(path, data))
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: external.append(r.url) if not r.url.startswith(('http://127.0.0.1', 'data:', 'blob:')) else None)
    page.goto('http://127.0.0.1:8097/'); page.wait_for_timeout(2500)

    def store():
        return page.evaluate("(window.__cloudStore || []).map(b => ({name: b.name, pin: b.pin || null, text: b.text}))")
    def open_cloud():
        page.get_by_label('Settings').click(); page.wait_for_timeout(500)
        page.get_by_text('iCloud Backup', exact=True).click(); page.wait_for_timeout(700)

    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    check('More offers iCloud Backup when the flag is on', page.get_by_text('iCloud Backup', exact=True).count() > 0)
    page.keyboard.press('Escape'); page.wait_for_timeout(500)

    hide = "Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true}); document.dispatchEvent(new Event('visibilitychange'))"
    show = "Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true}); document.dispatchEvent(new Event('visibilitychange'))"

    # A brand-new planner has nothing worth backing up.
    page.wait_for_timeout(7000)
    check('an empty planner is not backed up', len(store()) == 0)

    page.get_by_placeholder('What matters most here?').first.click()
    page.keyboard.type('Sunday review'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
    check('a change alone waits for the debounce rather than writing at once', len(store()) == 0)
    page.evaluate(hide); page.wait_for_timeout(1500); page.evaluate(show)
    first = store()
    check('going to the background backs up the change', len(first) == 1 and first[0]['pin'] is None and 'Sunday review' in first[0]['text'], str(len(first)))
    if first:
        file = json.loads(first[0]['text'])
        check('it is a full version 2 backup with a checksum', file.get('version') == 2 and len(file.get('checksum', '')) == 64)

    open_cloud()
    page.screenshot(path=f'{SHOTS}/cloud-sheet.png')
    body = page.inner_text('body')
    check('status says it is backed up to iCloud', 'Backed up to iCloud' in body, body[:200])
    page.keyboard.press('Escape'); page.wait_for_timeout(500)

    # A second change is a second backup.
    page.get_by_placeholder('Add a task').first.click()
    page.keyboard.type('Cloud task'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
    page.evaluate(hide); page.wait_for_timeout(1500); page.evaluate(show)
    after = store()
    check('the next change is backed up as a new copy', len(after) == 2 and 'Cloud task' in after[-1]['text'], str(len(after)))

    # Nothing changed: no second copy of the same content.
    page.evaluate(hide)
    page.wait_for_timeout(1000)
    check('an unchanged planner is not backed up again', len(store()) == 2)

    # What the sheet says in each situation.
    open_cloud()
    page.evaluate("window.__cloudStatus = {cloudKit: 'noAccount'}")
    page.get_by_label('Back', exact=True).click(); page.wait_for_timeout(400)
    page.get_by_text('iCloud Backup', exact=True).click(); page.wait_for_timeout(900)
    check('signed out of iCloud: says to sign in and that Spread keeps working', 'Sign in to iCloud' in page.inner_text('body') and 'keeps working' in page.inner_text('body'))
    page.evaluate("window.__cloudStatus = {driveAvailable: false}")
    page.get_by_label('Back', exact=True).click(); page.wait_for_timeout(400)
    page.get_by_text('iCloud Backup', exact=True).click(); page.wait_for_timeout(900)
    check('iCloud Drive off: says so', 'iCloud Drive is off' in page.inner_text('body'))
    page.evaluate("window.__cloudStatus = null; window.__cloudUploaded = false")
    page.get_by_label('Back', exact=True).click(); page.wait_for_timeout(400)
    page.get_by_text('iCloud Backup', exact=True).click(); page.wait_for_timeout(900)
    check('saved but not uploaded: does not claim it is in iCloud', 'waiting for iCloud' in page.inner_text('body') and 'Backed up to iCloud' not in page.inner_text('body'))
    page.evaluate("window.__cloudUploaded = true; window.__cloudFailWrite = 'noSpace'")
    page.keyboard.press('Escape'); page.wait_for_timeout(600)
    page.get_by_placeholder('Add a task').first.click()
    page.keyboard.type('Will not fit'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
    page.evaluate(hide); page.wait_for_timeout(1500); page.evaluate(show)
    open_cloud()
    check('a full device is reported, not hidden', 'out of space' in page.inner_text('body'), page.inner_text('body')[:300])
    check('and the planner still has the change', 'Will not fit' in (page.evaluate("(k)=>localStorage.getItem(k)", 'spread.v1.' + page.evaluate("localStorage.getItem('spread.profile')")) or ''))
    page.evaluate("window.__cloudFailWrite = null")

    # Turning it off stops backing up, and the planner is untouched.
    count = len(store())
    page.get_by_role('switch').click(); page.wait_for_timeout(500)
    check('turning it off says so', 'iCloud Backup is off' in page.inner_text('body'))
    check('and the choice is remembered', page.evaluate("localStorage.getItem('spread.cloud.backup')") == 'off')
    page.get_by_role('switch').click(); page.wait_for_timeout(500)

    # Restore from iCloud: added as a new profile, existing data untouched, pre-restore copy kept.
    roster_before = json.loads(page.evaluate("localStorage.getItem('spread.profiles')"))
    page.get_by_text('Restore from iCloud').click(); page.wait_for_timeout(1000)
    page.screenshot(path=f'{SHOTS}/cloud-list.png')
    items = page.get_by_role('listitem')
    check('the backups are listed', items.count() >= 2, str(items.count()))
    items.first.click(); page.wait_for_timeout(1000)
    check('restore asks before adding, and says nothing is changed', page.get_by_text('Add these profiles?').count() > 0 and 'Nothing that has content on this device changes' in page.inner_text('body'))
    page.get_by_role('button', name='Add', exact=True).click(); page.wait_for_timeout(1500)
    roster_after = json.loads(page.evaluate("localStorage.getItem('spread.profiles')"))
    check('a profile was added and the existing ones are unchanged', len(roster_after) == len(roster_before) + 1 and roster_after[:len(roster_before)] == roster_before)
    check('a copy of the planner was kept before the restore', any(x['pin'] == 'pre-restore' for x in store()), str([x['pin'] for x in store()]))

    check('a safety copy was written on this device with its own name', any(k.startswith('spread-pinned-') and k.endswith('-pre-restore.json') for k in fs), str([k for k in fs if 'pinned' in k]))
    page.keyboard.press('Escape'); page.wait_for_timeout(400)
    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    page.get_by_text('Restore from a safety copy').click(); page.wait_for_timeout(700)
    check('safety copies can be found and restored from More', page.get_by_label('Safety copies on this device').count() > 0 and 'Saved before restore' in page.inner_text('body'), page.inner_text('body')[-300:])
    page.keyboard.press('Escape'); page.wait_for_timeout(400)

    # Opting out stops every iCloud write, including the copy taken before a restore.
    open_cloud()
    page.get_by_role('switch').click(); page.wait_for_timeout(500)
    page.keyboard.press('Escape'); page.wait_for_timeout(500)
    page.evaluate("window.__cloudStore = window.__cloudStore || []")
    n = len(page.evaluate("window.__cloudStore"))
    page.get_by_label('Settings').click(); page.wait_for_timeout(500)
    page.get_by_text('Restore from a safety copy').click(); page.wait_for_timeout(700)
    page.get_by_role('listitem').first.click(); page.wait_for_timeout(900)
    page.get_by_role('button', name='Add', exact=True).click(); page.wait_for_timeout(1500)
    check('with backup off, a restore writes nothing to iCloud', len(page.evaluate("window.__cloudStore")) == n, str(len(page.evaluate("window.__cloudStore"))))

    # First run: nothing is uploaded until the notice is answered.
    fs2 = {}
    fresh = b.new_context(viewport={'width': 393, 'height': 852})
    fresh.add_init_script(INIT)
    pg = fresh.new_page()
    pg.expose_function('__fsRead', lambda path: fs2.get(path))
    pg.expose_function('__fsWrite', lambda path, data, enc: fs2.__setitem__(path, data))
    pg.goto('http://127.0.0.1:8097/'); pg.wait_for_timeout(4500)
    check('first run asks before backing up', pg.get_by_text('Back up to iCloud?').count() > 0)
    pg.get_by_role('button', name='Not now').click(); pg.wait_for_timeout(500)
    pg.get_by_placeholder('What matters most here?').first.click()
    pg.keyboard.type('Quiet'); pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    pg.evaluate(hide); pg.wait_for_timeout(1500)
    check('"Not now" uploads nothing', len(pg.evaluate("window.__cloudStore || []")) == 0)
    pg.close(); fresh.close()
    fs3 = {}
    fresh2 = b.new_context(viewport={'width': 393, 'height': 852})
    fresh2.add_init_script(INIT)
    p2 = fresh2.new_page()
    p2.expose_function('__fsRead', lambda path: fs3.get(path))
    p2.expose_function('__fsWrite', lambda path, data, enc: fs3.__setitem__(path, data))
    p2.goto('http://127.0.0.1:8097/'); p2.wait_for_timeout(4500)
    p2.evaluate(hide); p2.wait_for_timeout(1500)
    check('before the notice is answered nothing is uploaded', len(p2.evaluate("window.__cloudStore || []")) == 0)
    p2.evaluate(show); p2.wait_for_timeout(300)
    p2.get_by_role('button', name='Turn on').click(); p2.wait_for_timeout(1000)
    p2.get_by_placeholder('What matters most here?').first.click()
    p2.keyboard.type('After answering'); p2.keyboard.press('Enter'); p2.wait_for_timeout(700)
    p2.evaluate(hide); p2.wait_for_timeout(1500)
    check('after "Turn on" the planner is backed up', len(p2.evaluate("window.__cloudStore || []")) >= 1)

    check('no request left the app', not external, str(external))
    check('no page errors', not errors, str(errors))
    b.close()

bad = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)} passed")
sys.exit(1 if bad else 0)
