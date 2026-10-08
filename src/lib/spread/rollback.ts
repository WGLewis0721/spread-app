import { classifyStored } from "./pristine.ts";
import { ACTIVE_PROFILE_KEY, PROFILES_KEY, parseProfiles, type Profile } from "./profiles.ts";

/**
 * Rolling back to a safety copy puts the whole planner back in place: the roster, every profile's
 * data and the settings. Unlike adding the copy's profiles beside the current ones, it works when
 * all ten slots are in use. It never carries over device-local state (iCloud links, consent, the
 * schema marker, the licence).
 */
const DEVICE_LOCAL = [/^spread\.cloud\./, /^spread\.sync\./, /^spread\.restore\./, /^spread\.recovery\./, /^spread\.schema$/, /^spread\.license$/];

export type RollbackPlan =
  | { ok: true; writes: { key: string; value: string }[]; rosterValue: string; profiles: Profile[]; activeId: string | null }
  | { ok: false; reason: "no-profiles" | "damaged" };

export function planRollback(entries: Record<string, string>): RollbackPlan {
  const roster = parseProfiles(entries[PROFILES_KEY] ?? null);
  if (roster.length === 0) return { ok: false, reason: "no-profiles" };
  const writes: { key: string; value: string }[] = [];
  for (const profile of roster) {
    const body = entries[profile.store];
    // A copy with a body we cannot read is refused whole: restoring around it would hide the loss.
    if (body !== undefined && classifyStored(body).kind === "damaged") return { ok: false, reason: "damaged" };
    if (body !== undefined) writes.push({ key: profile.store, value: body });
  }
  const owned = new Set(roster.map((profile) => profile.store));
  for (const [key, value] of Object.entries(entries)) {
    if (key === PROFILES_KEY || owned.has(key) || key.startsWith("spread.v1")) continue;
    if (DEVICE_LOCAL.some((pattern) => pattern.test(key))) continue;
    if (key === "spread-accent" || key.startsWith("spread.")) writes.push({ key, value });
  }
  // Restored profiles start unlinked: an iCloud link belongs to the device and account it was made on.
  const profiles = roster.map((profile) => {
    const { syncId: _link, ...rest } = profile;
    void _link;
    return rest;
  });
  const saved = entries[ACTIVE_PROFILE_KEY];
  const activeId = profiles.find((profile) => profile.id === saved)?.id ?? profiles[0].id;
  writes.push({ key: ACTIVE_PROFILE_KEY, value: activeId });
  return { ok: true, writes, rosterValue: JSON.stringify(profiles), profiles, activeId };
}
