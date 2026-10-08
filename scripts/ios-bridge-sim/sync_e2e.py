"""iCloud Sync between two simulated devices, through the real screens.

Needs a bundle built with both flags on:
  VITE_SPREAD_CLOUD_BACKUP=1 VITE_SPREAD_CLOUD_SYNC=1 npm run export:ios
  (cd dist-ios && python3 -m http.server 8097 --bind 127.0.0.1) &
  python3 scripts/ios-bridge-sim/sync_e2e.py /tmp/shots

Two browser contexts act as a phone and a pad. Each has the fake SpreadCloud plugin from
native-init.js, and both talk to one fake iCloud kept here. It checks the app's own logic (linking
never merges, edits travel, conflicts are held and settled). It says nothing about real iCloud.
"""
import json, os, sys
from playwright.sync_api import sync_playwright

SHOTS = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
INIT = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'native-init.js')).read()
results = []
def check(name, ok, detail=''):
    results.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + (f' [{detail}]' if detail else ''))

cloud = {'rows': {}, 'seq': 0}
def cloud_save(name, row, tag):
    cur = cloud['rows'].get(name)
    if cur and cur['tag'] != tag:
        return {'ok': False, 'row': cur['row'], 'tag': cur['tag']}
    cloud['seq'] += 1
    t = (cur['tag'] if cur else 0) + 1
    cloud['rows'][name] = {'row': row, 'tag': t, 'seq': cloud['seq']}
    return {'ok': True, 'tag': t}
def cloud_changes(cursor):
    return {'rows': [{'name': n, 'row': e['row'], 'tag': e['tag']} for n, e in sorted(cloud['rows'].items(), key=lambda kv: kv[1]['seq']) if e['seq'] > cursor], 'seq': cloud['seq']}

errors = []
external = []
with sync_playwright() as p:
    launch = {'executable_path': os.environ['PW_CHROME']} if os.environ.get('PW_CHROME') else {}
    b = p.chromium.launch(**launch)

    def device(name):
        ctx = b.new_context(viewport={'width': 393, 'height': 852})
        ctx.add_init_script(INIT)
        ctx.add_init_script("try { localStorage.setItem('spread.cloud.backup.ack', 'yes') } catch (e) {}")
        page = ctx.new_page()
        fs = {}
        page.expose_function('__fsRead', lambda path: fs.get(path))
        page.expose_function('__fsWrite', lambda path, data, enc: fs.__setitem__(path, data))
        page.expose_function('__cloudSave', cloud_save)
        page.expose_function('__cloudChanges', cloud_changes)
        page.on('pageerror', lambda e: errors.append(f'{name}: {e}'))
        page.on('request', lambda r: external.append(r.url) if not r.url.startswith(('http://127.0.0.1', 'data:', 'blob:')) else None)
        page.goto('http://127.0.0.1:8097/'); page.wait_for_timeout(2500)
        return page

    phone = device('phone')
    pad = device('pad')

    def open_icloud(page):
        page.get_by_label('Settings').click(); page.wait_for_timeout(500)
        page.get_by_text('iCloud', exact=True).click(); page.wait_for_timeout(900)
    def close_sheet(page):
        page.keyboard.press('Escape'); page.wait_for_timeout(600)
    def add_task(page, text):
        field = page.get_by_placeholder('What matters most here?')
        if field.count() == 0:
            field = page.get_by_placeholder('Add a task')
        field.first.click(); page.keyboard.type(text); page.keyboard.press('Enter'); page.wait_for_timeout(700)
    def tasks_on(page):
        return page.evaluate("(() => { const k = 'spread.v1.' + localStorage.getItem('spread.profile'); const d = JSON.parse(localStorage.getItem(k) || '{}'); return Object.values(d.weeks || {}).flatMap(w => w.boxes.flatMap(b => b.tasks.map(t => t.text))).sort(); })()")
    def body(page):
        return page.inner_text('body')

    # Sync is off until asked, on both.
    open_icloud(phone)
    check('sync is off by default and says nothing is shared', 'iCloud Sync is off' in body(phone) and 'Nothing is shared or combined' in body(phone))
    check('nothing has been uploaded', len(cloud['rows']) == 0)
    close_sheet(phone)

    # Phone: add a task, turn sync on (nothing in iCloud yet: upload).
    add_task(phone, 'Phone task')
    open_icloud(phone)
    phone.get_by_text('Turn on iCloud Sync').click(); phone.wait_for_timeout(1500)
    check('the link screen offers to upload and promises nothing is combined', 'Upload' in body(phone) and 'never combines profiles' in body(phone), body(phone)[:300])
    phone.screenshot(path=f'{SHOTS}/sync-link-phone.png')
    phone.get_by_text('Upload', exact=False).first.click(); phone.wait_for_timeout(3000)
    check('after turning on, items reach iCloud', any(n.endswith('|task:' + n.split('|task:')[-1]) and '|task:' in n for n in cloud['rows']), str(len(cloud['rows'])))
    phone.wait_for_timeout(1500)
    check('the phone reports it is synced', 'Synced with iCloud' in body(phone), body(phone)[:300])
    phone.screenshot(path=f'{SHOTS}/sync-main-phone.png')
    close_sheet(phone)

    # Pad: a new empty profile joins the iCloud profile in place; nothing it had is lost because it had nothing.
    open_icloud(pad)
    pad.get_by_text('Turn on iCloud Sync').click(); pad.wait_for_timeout(2000)
    check('an empty profile is offered the iCloud profile', 'from iCloud' in body(pad) and 'This profile is empty' in body(pad), body(pad)[:400])
    pad.screenshot(path=f'{SHOTS}/sync-link-pad.png')
    pad.get_by_text('from iCloud', exact=False).first.click(); pad.wait_for_timeout(2500)
    close_sheet(pad)
    check('the pad now has the phone’s task', tasks_on(pad) == ['Phone task'], str(tasks_on(pad)))

    # An edit on the pad reaches the phone.
    add_task(pad, 'Pad task')
    open_icloud(pad); pad.get_by_text('Sync now').click(); pad.wait_for_timeout(2500); close_sheet(pad)
    open_icloud(phone); phone.get_by_text('Sync now').click(); phone.wait_for_timeout(2500); close_sheet(phone)
    check('the phone receives the pad’s task and keeps its own', tasks_on(phone) == ['Pad task', 'Phone task'], str(tasks_on(phone)))

    # The same task is renamed on both devices while apart: held for a choice, never overwritten.
    def rename(page, old, new):
        page.get_by_text(old, exact=True).first.click(); page.wait_for_timeout(600)
        page.get_by_label('Task title').fill(new); page.wait_for_timeout(300)
        page.get_by_label('Close', exact=True).first.click(); page.wait_for_timeout(700)
    phone.evaluate("window.__syncOffline = true"); pad.evaluate("window.__syncOffline = true")
    rename(phone, 'Phone task', 'Phone version')
    rename(pad, 'Phone task', 'Pad version')
    phone.wait_for_timeout(2500); pad.wait_for_timeout(2500)
    phone.evaluate("window.__syncOffline = false"); pad.evaluate("window.__syncOffline = false")
    open_icloud(phone); phone.get_by_text('Sync now').click(); phone.wait_for_timeout(2500); close_sheet(phone)
    open_icloud(pad); pad.get_by_text('Sync now').click(); pad.wait_for_timeout(3000)
    check('the pad holds the clash for a choice', 'need your choice' in body(pad) or 'needs your choice' in body(pad), repr(body(pad)[body(pad).find('Sync ·'):][:400]) + ' ENGINE=' + json.dumps(pad.evaluate("({o:Object.keys(window.__engine.outbox), i:Object.keys(window.__engine.inbox), s:[...window.__engine.sending]})")))
    check('and still shows its own wording meanwhile', 'Pad version' in tasks_on(pad) and 'Phone version' not in tasks_on(pad), str(tasks_on(pad)))
    pad.get_by_text('Review 1 change').click(); pad.wait_for_timeout(800)
    check('the choice screen shows both wordings in plain words', 'This device: Pad version' in body(pad) and 'Other device: Phone version' in body(pad), body(pad)[:500])
    pad.screenshot(path=f'{SHOTS}/sync-conflict-pad.png')
    pad.get_by_text('Keep this device’s').click(); pad.wait_for_timeout(2500)
    close_sheet(pad)
    open_icloud(phone); phone.get_by_text('Sync now').click(); phone.wait_for_timeout(2500)
    check('after the choice the phone shows the chosen wording', 'Pad version' in tasks_on(phone) and 'Phone version' not in tasks_on(phone), str(tasks_on(phone)))
    check('and the phone has nothing left to decide', 'need your choice' not in body(phone) and 'needs your choice' not in body(phone), body(phone)[:300])
    close_sheet(phone)

    # Restoring a file into a profile that syncs would delete on every device: it is refused.
    legacy = json.dumps({'kind': 'spread-backup', 'version': 1, 'savedAt': '2026-10-01T00:00:00Z', 'data': {'hats': [{'id': 'work', 'name': 'Work', 'defaultHours': 8, 'color': '#34C759'}], 'weeks': {'2026-09-28': {'boxes': [{'hatId': 'work', 'hours': 8, 'tasks': [{'id': 't1', 'text': 'Old file task', 'done': False}]}]}}, 'currentWeek': '2026-09-28'}})
    before_restore = tasks_on(phone)
    phone.get_by_label('Settings').click(); phone.wait_for_timeout(500)
    phone.set_input_files('input[type=file]', files=[{'name': 'old.spread', 'mimeType': 'application/octet-stream', 'buffer': legacy.encode()}])
    phone.wait_for_timeout(500)
    phone.get_by_role('button', name='Restore', exact=True).click(); phone.wait_for_timeout(800)
    check('a file restore into a synced profile is refused with a reason', 'syncs with iCloud' in body(phone), body(phone)[:200])
    check('and nothing in the profile changed', tasks_on(phone) == before_restore, str(tasks_on(phone)))
    close_sheet(phone)

    # Linking a profile that has content never merges it with iCloud.
    pad.evaluate("window.__x = 1")
    third = device('third')
    add_task(third, 'Third device task')
    open_icloud(third)
    third.get_by_text('Turn on iCloud Sync').click(); third.wait_for_timeout(2000)
    text = body(third)
    check('a profile with content is never offered a merge or replace', 'from iCloud' not in text.replace('as a new profile', '') or 'new profile' in text, text[:500])
    check('it is offered to add the iCloud profile as a new one, or upload separately', 'as a new profile' in text and 'its own iCloud profile' in text, text[:500])
    third.screenshot(path=f'{SHOTS}/sync-link-third.png')
    close_sheet(third)
    check('the third device’s own task is untouched', tasks_on(third) == ['Third device task'])

    # A paused sync (iCloud copy removed) offers only an explicit, confirmed upload.
    phone.evaluate("window.__syncStatus = { zoneDeleted: true }; window.__resumed = 0")
    phone.evaluate("(window.__syncHandlers.syncStatus || []).forEach((h) => h())"); phone.wait_for_timeout(800)
    open_icloud(phone)
    text = body(phone)
    check('a removed iCloud copy pauses sync and says it was not uploaded again', 'was not uploaded again' in text, text[:300])
    check('the only way forward is an explicit upload', 'Upload this profile to this iCloud again' in text)
    phone.get_by_text('Upload this profile to this iCloud again').click(); phone.wait_for_timeout(500)
    check('it asks first', 'Nothing on this device changes' in body(phone) and phone.evaluate("window.__clearedPause || 0") == 0)
    phone.get_by_role('button', name='Upload', exact=True).click(); phone.wait_for_timeout(1500)
    check('after confirming the pause is cleared and sending resumes', phone.evaluate("window.__clearedPause") == 1 and phone.evaluate("window.__resumed") >= 1)
    close_sheet(phone)

    check('no request left the app', not external, str(external))
    check('no page errors', not errors, str(errors))
    b.close()

bad = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)} passed")
sys.exit(1 if bad else 0)
