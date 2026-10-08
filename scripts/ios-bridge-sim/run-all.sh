#!/bin/sh
# Builds the installed-app web bundle in each flag configuration and runs the matching Chromium
# simulators against it. Used by CI; also works locally (set PW_CHROME to a Chromium binary).
#   flags off      -> native_e2e.py, restore_e2e.py          (the shipped configuration)
#   backup only    -> cloud_backup_e2e.py
#   backup + sync  -> sync_e2e.py
set -u
cd "$(dirname "$0")/../.."
SHOTS="${SHOTS:-/tmp/spread-shots}"; mkdir -p "$SHOTS"
fail=0
serve() { (cd dist-ios && exec python3 -m http.server 8097 --bind 127.0.0.1 >/dev/null 2>&1) & SERVER=$!; sleep 1; }
run() { # name, env..., script
  name="$1"; shift
  echo "=== $name"
  if ! python3 "scripts/ios-bridge-sim/$1" "$SHOTS"; then fail=1; echo "FAILED: $name"; fi
}
build() { env "$@" npm run export:ios >/dev/null || { echo "bundle build failed"; exit 1; }; }

build VITE_SPREAD_CLOUD_BACKUP= VITE_SPREAD_CLOUD_SYNC=
serve; run "flags off: installed app" native_e2e.py; run "flags off: restore" restore_e2e.py; kill $SERVER 2>/dev/null

build VITE_SPREAD_CLOUD_BACKUP=1 VITE_SPREAD_CLOUD_SYNC=
serve; run "backup only" cloud_backup_e2e.py; kill $SERVER 2>/dev/null

build VITE_SPREAD_CLOUD_BACKUP=1 VITE_SPREAD_CLOUD_SYNC=1
serve; run "backup + sync" sync_e2e.py; kill $SERVER 2>/dev/null
exit $fail
