import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Contact Deck entry is gated to native Studio and closes the More sheet", () => {
  const code = read("src/spread/screens/spread-app.tsx");
  assert.match(code, /STUDIO_FLAG && native && \(/);
  assert.match(code, /Open Contact Deck native preview/);
  assert.match(code, /setSheet\(null\);\s*void openContactDeckPreview\(\)/);
  const bridge = read("src/lib/spread/contact-deck-preview.ts");
  assert.match(bridge, /return STUDIO_FLAG && isNativeApp\(\)/);
  assert.match(bridge, /registerPlugin.*SpreadContactDeck/);
});

test("embedded deck uses its own storage, no live contacts deletion and no purchase flow", () => {
  const bridge = read("ios/App/App/ContactDeck/SpreadContactDeckPlugin.swift");
  assert.match(bridge, /ContactDeckStudio\.store/);
  assert.match(bridge, /ModelConfiguration\(url: fileURL, cloudKitDatabase: \.none\)/);
  assert.match(bridge, /PurchaseStore\(studioPreview: true\)/);
  assert.match(bridge, /modalPresentationStyle = \.fullScreen/);
  const purchase = read("ios/App/App/ContactDeck/PurchaseStore.swift");
  assert.match(purchase, /if studioPreview \{ unlocked = true; return \}/);
  const home = read("ios/App/App/ContactDeck/DeckHome.swift");
  assert.match(home, /Back to Spread/);
  assert.match(home, /Contact Deck never edits or deletes the address book/);
});

test("Xcode target compiles the SwiftUI deck and Capacitor plugin", () => {
  const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
  const names = ["Contact.swift", "ContactCard.swift", "DeckStage.swift", "ContactPicker.swift", "PurchaseStore.swift", "DeckHome.swift", "SpreadContactDeckPlugin.swift"];
  for (const name of names) {
    assert.ok(pbx.includes(name + " in Sources"), "Not part of Sources: " + name);
    assert.ok(pbx.includes("/* " + name + " */ = {isa = PBXFileReference"), "Missing file ref: " + name);
  }
  assert.match(read("ios/App/App/SpreadBridgeViewController.swift"), /registerPluginInstance\(SpreadContactDeckPlugin\(\)\)/);
  assert.match(read("ios/App/App/Info.plist"), /NSContactsUsageDescription/);
});

test("existing studio release process is still manually approved and uses same bundle identifier", () => {
  const yaml = read("codemagic.yaml");
  assert.match(yaml, /spread-studio-testflight:/);
  assert.match(yaml, /bundle_identifier: com\.graymatter\.spread/);
  assert.match(yaml, /EXPECTED_STUDIO_COMMIT/);
  assert.match(yaml, /submit_to_testflight: false/);
});
