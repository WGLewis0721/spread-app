/**
 * Where a person was in the planner (Spread or Week, week or month), kept per profile so the app
 * opens where they left it. This is a convenience, not planner data: it lives under a key that does
 * not start with "spread." so backups and the native mirror never sweep it up as a setting, and a
 * missing or broken value just means "start on Spread".
 */
export type ViewContext = { view: "spread" | "week"; plane: "week" | "month" };

export const DEFAULT_VIEW: ViewContext = { view: "spread", plane: "week" };

export function viewContextKey(profileId: string): string {
  return `spread-view.${profileId}`;
}

export function parseViewContext(raw: string | null): ViewContext {
  if (!raw) return DEFAULT_VIEW;
  try {
    const value = JSON.parse(raw) as Partial<ViewContext> | null;
    return {
      view: value?.view === "week" ? "week" : "spread",
      plane: value?.plane === "month" ? "month" : "week",
    };
  } catch {
    return DEFAULT_VIEW;
  }
}

export function readViewContext(storage: Pick<Storage, "getItem"> | null, profileId: string | null): ViewContext {
  if (!storage || !profileId) return DEFAULT_VIEW;
  try {
    return parseViewContext(storage.getItem(viewContextKey(profileId)));
  } catch {
    return DEFAULT_VIEW;
  }
}

export function writeViewContext(storage: Pick<Storage, "setItem"> | null, profileId: string | null, value: ViewContext): void {
  if (!storage || !profileId) return;
  try {
    storage.setItem(viewContextKey(profileId), JSON.stringify(value));
  } catch {
    // Not remembering the view is fine.
  }
}
