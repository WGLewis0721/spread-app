/**
 * The person's answer about iCloud Backup, as ONE stored value so it can never be half written.
 * (Earlier builds kept an "answered" flag and an "off" flag in two keys; a failed second write
 * turned an opt-out back into an opt-in. Those keys are still read, once, to carry the answer over.)
 */
export type ConsentStore = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void };

export const CONSENT_KEY = "spread.cloud.backup.consent";
const LEGACY_PREF = "spread.cloud.backup";
const LEGACY_ACK = "spread.cloud.backup.ack";

export type Consent = "on" | "off" | "unanswered";

/** An unreadable store reads as "off": never as permission. */
export function readConsent(store: ConsentStore): Consent {
  try {
    const value = store.getItem(CONSENT_KEY);
    if (value === "v1:on") return "on";
    if (value === "v1:off") return "off";
    if (value !== null) return "off"; // something we do not understand is not consent
    if (store.getItem(LEGACY_ACK) === "yes") return store.getItem(LEGACY_PREF) === "off" ? "off" : "on";
    return store.getItem(LEGACY_PREF) === "off" ? "off" : "unanswered";
  } catch {
    return "off";
  }
}

/** True only if the answer reached storage. */
export function writeConsent(store: ConsentStore, value: "on" | "off"): boolean {
  try {
    store.setItem(CONSENT_KEY, value === "on" ? "v1:on" : "v1:off");
  } catch {
    return false;
  }
  try {
    store.removeItem?.(LEGACY_PREF);
    store.removeItem?.(LEGACY_ACK);
  } catch {
    /* the new value wins over the old keys */
  }
  return true;
}
