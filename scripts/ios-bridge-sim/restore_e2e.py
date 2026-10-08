"""Restoring a full ten-profile backup onto a brand-new install, and choosing profiles when room is short.

Uses the normal (flags off) bundle:
  npm run export:ios
  (cd dist-ios && python3 -m http.server 8097 --bind 127.0.0.1) &
  python3 scripts/ios-bridge-sim/restore_e2e.py /tmp/shots
"""
import hashlib, json, os, sys
from playwright.sync_api import sync_playwright

SHOTS = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
INIT = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'native-init.js')).read()
results = []
def check(name, ok, detail=''):
    results.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + (f' [{detail}]' if detail else ''))

def backup(count, damaged=()):
    roster = [{'id': f'p{i}', 'name': f'Profile {i}', 'store': f'spread.v1.p{i}', 'theme': 'system', 'accent': None} for i in range(count)]
    stores = {}
    for i in range(count):
        data = {'hats': [{'id': 'work', 'name': f'Hat {i}', 'defaultHours': 8, 'color': '#34C759'}],
                'weeks': {'2026-10-05': {'boxes': [{'hatId': 'work', 'hours': 8, 'tasks': [{'id': f't{i}', 'text': f'Task of profile {i}', 'done': False}]}], 'allocations': []}},
                'currentWeek': '2026-10-05'}
        stores[f'p{i}'] = '{not json' if i in damaged else json.dumps(data)
    payload = json.dumps({'schemaVersion': 2, 'createdAt': '2026-10-08T00:00:00Z', 'deviceId': None, 'activeProfileId': 'p0', 'roster': roster, 'stores': stores, 'settings': {}}, separators=(',', ':'))
    return json.dumps({'kind': 'spread-backup', 'version': 2, 'checksum': hashlib.sha256(payload.encode()).hexdigest(), 'payloadText': payload})

errors = []
fs = {}
with sync_playwright() as p:
    launch = {'executable_path': os.environ['PW_CHROME']} if os.environ.get('PW_CHROME') else {}
    b = p.chromium.launch(**launch)

    def fresh():
        ctx = b.new_context(viewport={'width': 393, 'height': 852})
        ctx.add_init_script(INIT)
        page = ctx.new_page()
        store = {}
        page.expose_function('__fsRead', lambda path: store.get(path))
        page.expose_function('__fsWrite', lambda path, data, enc: store.__setitem__(path, data))
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:8097/'); page.wait_for_timeout(2500)
        return page

    def pick(page, text, name='b.spread'):
        page.get_by_label('Settings').click(); page.wait_for_timeout(500)
        page.set_input_files('input[type=file]', files=[{'name': name, 'mimeType': 'application/octet-stream', 'buffer': text.encode()}])
        page.wait_for_timeout(700)

    roster_of = lambda page: json.loads(page.evaluate("localStorage.getItem('spread.profiles')"))

    # 1. A brand-new install has one empty profile. Ten profiles must all fit.
    page = fresh()
    check('a new install starts with exactly one profile', len(roster_of(page)) == 1)
    pick(page, backup(10))
    check('the ten-profile backup is offered without asking to remove anything', page.get_by_text('Add these profiles?').count() > 0, page.inner_text('body')[:300])
    page.get_by_role('button', name='Add', exact=True).click(); page.wait_for_timeout(1200)
    roster = roster_of(page)
    check('all ten profiles are there (the empty one was filled)', len(roster) == 10, str(len(roster)))
    check('the filled profile kept its place and took the first restored name', roster[0]['name'] == 'Profile 0', str([r['name'] for r in roster][:3]))
    check('the open profile now shows restored content', 'Task of profile 0' in (page.evaluate("(k)=>localStorage.getItem(k)", roster[0]['store']) or ''))
    check('the others are marked as restored', all('(restored' in r['name'] for r in roster[1:]), str([r['name'] for r in roster][1:4]))
    page.screenshot(path=f'{SHOTS}/restore-ten.png')

    # 2. A device that already has content and little room must let the person choose.
    page2 = fresh()
    page2.get_by_placeholder('What matters most here?').first.click(); page2.keyboard.type('Keep me'); page2.keyboard.press('Enter'); page2.wait_for_timeout(600)
    pick(page2, backup(10))
    text = page2.inner_text('body')
    check('with content on the device, a profile picker is shown with the room that exists', 'Choose profiles to restore' in text and 'room for 9' in text, text[:300])
    page2.screenshot(path=f'{SHOTS}/restore-pick.png')
    boxes = page2.get_by_role('checkbox')
    check('nine are pre-selected and the tenth cannot be added without removing one', boxes.count() == 10 and page2.get_by_role('checkbox', checked=True).count() == 9)
    boxes.nth(0).click(); boxes.nth(1).click(); page2.wait_for_timeout(200)
    page2.get_by_role('button', name='Restore 7', exact=True).click(); page2.wait_for_timeout(1200)
    roster2 = roster_of(page2)
    check('only the chosen profiles were added and the existing one is untouched', len(roster2) == 8 and roster2[0]['name'] == 'Me', str(len(roster2)))
    check('the existing profile still has its own task', 'Keep me' in (page2.evaluate("(k)=>localStorage.getItem(k)", roster2[0]['store']) or ''))

    # 3. A damaged profile is named, not silently dropped.
    page3 = fresh()
    pick(page3, backup(3, damaged=(1,)))
    text3 = page3.inner_text('body')
    check('the confirmation names the damaged profile', 'Profile 1' in text3 and 'damaged' in text3, text3[:300])
    page3.get_by_role('button', name='Add', exact=True).click(); page3.wait_for_timeout(1200)
    check('the readable ones were restored', len(roster_of(page3)) == 2)
    check('the result says what was left out', page3.get_by_text('was damaged in the backup', exact=False).count() > 0)

    check('no page errors', not errors, str(errors))
    b.close()

bad = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)} passed")
sys.exit(1 if bad else 0)
