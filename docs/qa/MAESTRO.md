# Maestro — native iOS simulator QA

**Status: prepared, not executed.** This repository currently has no verified Maestro iOS run. The YAML flow is intentionally nondestructive.

## Prerequisites

- macOS with Xcode, an installed iOS Simulator runtime, and Java 17+.
- Install Maestro Studio or the CLI from [the official installation guide](https://docs.maestro.dev/get-started/quickstart). CLI (macOS): `curl -fsSL "https://get.maestro.mobile.dev" | bash`; inspect third-party installation scripts before running them.
- Node 22, npm, and the app's existing Capacitor project.

## Run on an **isolated test simulator**

```sh
npm ci
npm run ios:sync           # rebuild web assets and sync Capacitor on a Mac
npm run ios:open           # open Xcode project; select and build an iOS Simulator target
maestro list-devices
maestro test .maestro/01-launch-smoke.yaml
```

Ensure Xcode has actually installed the test build onto the selected simulator before running the flow. A CLI binary and a YAML file alone do not establish that the native app has been tested.

The smoke flow launches `com.graymatter.spread`, checks planner navigation, and captures a screenshot. It **does not** clear app state or manipulate saved data.

### Why native tests matter

Browser emulation cannot validate WKWebView keyboard behavior, safe areas, iOS system sheets, app relaunch, bridge plugins or CloudKit. Use a test simulator with synthetic data. Maestro's physical iOS support differs from its simulator support; follow current vendor guidance instead of assuming physical iPhone compatibility.

### Future cases (not yet written or verified)

- Fresh install → responsibilities → hours → week → tasks, using a dedicated disposable simulator
- Background, relaunch and retained local storage
- Keyboard and safe area/dock interaction in light and dark
- Native backup/restore, interruption and failure recovery
- iCloud behavior only after separate security/release gates are satisfied

**Never** run `launchApp: { clearState: true }` or `clearState` on a simulator or device containing real Spread data. On iOS, Maestro clears state by reinstalling the app.
