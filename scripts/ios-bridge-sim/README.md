# iOS bridge simulation

Browser checks of the installed-app behavior, run against the real `dist-ios` bundle in Chromium
with a fake Capacitor bridge (`native-init.js`). They exercise Spread's own code paths: the entry
gate, the storage snapshot and restore, the backup share sheet, unreadable data, and a full store.

They do **not** run in WKWebView, so they say nothing about the keyboard, safe areas, the real
share sheet or the real Files picker. Those are covered by the device checklist in
`docs/IOS_RELEASE.md`.

```sh
npm run export:ios
(cd dist-ios && python3 -m http.server 8097 --bind 127.0.0.1) &
python3 scripts/ios-bridge-sim/native_e2e.py /tmp/shots   # installed-app behavior
python3 scripts/ios-bridge-sim/web_regress.py /tmp/shots  # the website is unchanged
```

Needs Python Playwright (`pip install playwright`) and a Chromium build.
