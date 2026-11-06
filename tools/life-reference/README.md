# Approved Life reference

This is the approved interactive browser demo, bundled for the iOS implementation handoff. Its runtime source, assets, lockfile and model are copied from the approved isolated prototype. It uses sample data and never reads or writes the production planner. Do not import its model into the native app or ship this folder in the iOS bundle.

From the repository root, with Node 22.12 or newer:

```sh
npm --prefix tools/life-reference ci --ignore-scripts
npm --prefix tools/life-reference run dev -- --port 4183
```

Open [the iPhone viewer](http://127.0.0.1:4183/iphone), [the direct phone interface](http://127.0.0.1:4183/iphone/app), or [the desktop reference](http://127.0.0.1:4183/). Keep the server running. Use a fresh browser profile/context for the initial sample state. Manual sessions use the actual current week; automated cases pin the approved November 6, 2026 reference date through `tests/fixtures.js`.

Run its checks separately from the production planner:

```sh
npm --prefix tools/life-reference test
npm --prefix tools/life-reference run build
cd tools/life-reference
npx playwright install chrome webkit
```

With the server running, set `PROTOTYPE_URL=http://127.0.0.1:4183` in the test terminal. In PowerShell:

```powershell
$env:PROTOTYPE_URL='http://127.0.0.1:4183'
npm run test:browser
npm run test:iphone
Remove-Item Env:PROTOTYPE_URL
```

In a macOS shell, use `PROTOTYPE_URL=http://127.0.0.1:4183 npm run test:browser` and the same prefix for `npm run test:iphone`. Default to one worker; the layout matrix can exceed its time budget under parallel WebKit load. Playwright browser installation is a development prerequisite, not part of the shipping app.

The 16 model checks, 8 desktop checks and 50 phone/viewer cases describe reference behavior. They do not prove native implementation or physical iPhone haptics. The harness pins the reference date, timezone and locale; runtime source is unchanged. Scoped Git attributes preserve its original bytes across platforms. Hashes are recorded in [the reference manifest](../../docs/evidence/life-ios-reference/reference-manifest.json).

Start native work with the root [handoff](../../SPREAD_LIFE_IOS_HANDOFF.md), [spec](../../SPREAD_LIFE_IOS_SPEC.md) and [checklist](../../SPREAD_LIFE_IOS_CHECKLIST.md). Keep the approved reference unchanged while implementing native code.
