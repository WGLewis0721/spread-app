import { STUDIO_FLAG } from "@/lib/spread/studio/contract";
import { isNativeApp } from "@/lib/spread/native";

/** The feature is never shown on the public web app or the unflagged planner. */
export function contactDeckPreviewAvailable(): boolean {
  return STUDIO_FLAG && isNativeApp();
}

/** Open the native SwiftUI Contact Deck, without navigating away from the Spread planner. */
export async function openContactDeckPreview(): Promise<void> {
  if (!contactDeckPreviewAvailable()) throw new Error("Contact Deck is available in the Studio iPhone preview.");
  const { registerPlugin } = await import("@capacitor/core");
  const deck = registerPlugin<{ open(): Promise<void> }>("SpreadContactDeck");
  await deck.open();
}
