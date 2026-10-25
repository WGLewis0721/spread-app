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


## Running everything

`sh scripts/ios-bridge-sim/run-all.sh` builds each flag configuration and runs the matching simulators (CI job `bridge-sims`). Set `PW_CHROME` to use an existing Chromium.

## Persona journeys (browser regression checks)

`persona_journeys.py` uses the same fake Capacitor bridge, Chromium browser, and
`dist-ios` server as `native_e2e.py`. Run it after starting the local server:

```sh
python3 scripts/ios-bridge-sim/persona_journeys.py /tmp/spread-shots
```

The 12 fictional personas exercise one shared setup → tasks → placed hours →
week navigation → rollover journey, with different spread names and tasks.
Two also intentionally exceed 45 weekly hours and check the warning; some
navigate up to 10 weeks forward. Every persona gets a fresh, isolated browser
context. Results and 3 screenshots per persona are written to the supplied
shots folder; failures also save a diagnostic screenshot. CI runs these checks
as part of `bridge-sims` and uploads the snapshots.

These are **automated regression checks**, not 12 simulated interviews or
proof of usability. They cannot establish genuine user impressions, feature
requests, privacy perceptions, or marketing testimonials. They also do not
test real WKWebView, iCloud, native file pickers, or touch-and-hold gestures.

If a journey fails, check its screenshot and `journey-results.json`; reproduce
against the local `dist-ios` build before changing the test or the product.
