#!/bin/bash
# CI simulator acceptance only. The app stays running while the actual OS appearance changes.
set -euo pipefail
appearance_tool="${1:?agent-device executable required}"
appearance_udid="${2:?simulator UDID required}"
appearance_dir="artifacts/duo-system"
mkdir -p "$appearance_dir"
ad() { "$appearance_tool" "$@" --platform ios --udid "$appearance_udid" --session spread-duo-system; }
trap 'xcrun simctl ui "$appearance_udid" appearance light >/dev/null' EXIT

# This is the real app preference, also exercised through More by DuoUITests. No fake view or scheme.
xcrun simctl launch --terminate-running-process "$appearance_udid" com.graymatter.spread -spread.native.appearance system > "$appearance_dir/launch.txt"
ad open com.graymatter.spread --json > "$appearance_dir/session.json"
appearance_ready=0
for appearance_boot_attempt in 1 2; do
  if ad wait 'id="native-content"' 180000; then appearance_ready=1; break; fi
done
test "$appearance_ready" = 1 || { ad screenshot "$appearance_dir/startup-failure.png"; exit 1; }
for appearance_style in dark light; do
  xcrun simctl ui "$appearance_udid" appearance "$appearance_style"
  xcrun simctl ui "$appearance_udid" appearance > "$appearance_dir/system-$appearance_style.txt"
  grep -iq "$appearance_style" "$appearance_dir/system-$appearance_style.txt"
  appearance_passed=0
  for appearance_attempt in {1..30}; do
    ad snapshot --raw --json > "$appearance_dir/rendered-$appearance_style.json"
    if node scripts/verify-native-appearance.mjs "$appearance_dir/rendered-$appearance_style.json" "$appearance_style"; then
      appearance_passed=1
      break
    fi
    sleep 1
  done
  ad screenshot "$appearance_dir/system-$appearance_style.png"
  test "$appearance_passed" = 1 || { echo "The native planner did not follow actual system $appearance_style" >&2; exit 1; }
done
