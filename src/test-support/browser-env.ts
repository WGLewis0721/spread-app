// A minimal in-memory browser for tests that exercise the real store. Call before importing it.
export type FakeStorage = Storage & { map: Map<string, string>; failWhen: ((key: string, value: string) => boolean) | null };

export function installBrowser(): FakeStorage {
  const map = new Map<string, string>();
  const storage = {
    map,
    failWhen: null as ((key: string, value: string) => boolean) | null,
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem(k: string, v: string) {
      if (storage.failWhen?.(k, v)) throw new DOMException("quota", "QuotaExceededError");
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as FakeStorage;
  Object.assign(globalThis, {
    localStorage: storage,
    window: { setTimeout, clearTimeout, addEventListener() {}, matchMedia: () => ({ matches: false }), dispatchEvent() {} },
    document: { querySelector: () => null, documentElement: { setAttribute() {}, style: { setProperty() {}, removeProperty() {} } }, addEventListener() {} },
  });
  return storage;
}
