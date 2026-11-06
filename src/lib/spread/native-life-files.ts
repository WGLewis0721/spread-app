import { Capacitor, registerPlugin } from "@capacitor/core";
export type ManagedFile = { id: string; name: string; mimeType: string; byteCount: number; checksum: string };
export type NativeFileEntry = { profileId: string; taskId: string; file: ManagedFile; base64: string };
type FilesPlugin = {
  read(options: { profileId: string; taskId: string; file: ManagedFile }): Promise<{ base64: string }>;
  install(options: { entries: NativeFileEntry[] }): Promise<{ transaction: string }>;
  rollback(options: { transaction: string }): Promise<void>;
  finish(options: { transaction: string }): Promise<void>;
};
export const nativeFiles = registerPlugin<FilesPlugin>("SpreadLifeFiles");
export function fileReferences(stores: Record<string, string>): Omit<NativeFileEntry, "base64">[] {
  const refs: Omit<NativeFileEntry, "base64">[] = [];
  for (const [profileId, text] of Object.entries(stores)) {
    let body: unknown; try { body = JSON.parse(text); } catch { continue; }
    const visit = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) { value.forEach(visit); return; }
      const item = value as Record<string, unknown>;
      if (typeof item.id === "string" && item.content && typeof item.content === "object") {
        const blocks = (item.content as { blocks?: unknown }).blocks;
        if (Array.isArray(blocks)) for (const block of blocks) {
          if (block?.type === "file") refs.push({ profileId, taskId: item.id, file: block.file });
        }
      }
      Object.values(item).forEach(visit);
    };
    visit(body);
  }
  const unique = new Map(refs.map(ref => [JSON.stringify([ref.profileId, ref.taskId, ref.file.id]), ref]));
  return [...unique.values()];
}
export async function validateFileEntry(entry: NativeFileEntry): Promise<boolean> {
  const f = entry?.file;
  if (!f || !/^[0-9a-f-]{36}$/i.test(f.id) || typeof f.name !== "string" || !f.name || typeof f.mimeType !== "string" || !/^[\w.+-]+\/[\w.+-]+$/.test(f.mimeType) ||
      !Number.isSafeInteger(f.byteCount) || f.byteCount < 0 || f.byteCount > 25 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(f.checksum) ||
      typeof entry.profileId !== "string" || !entry.profileId || typeof entry.taskId !== "string" || !entry.taskId || typeof entry.base64 !== "string") return false;
  try {
    const bytes = Uint8Array.from(atob(entry.base64), c => c.charCodeAt(0));
    if (bytes.length !== f.byteCount) return false;
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("") === f.checksum;
  } catch { return false; }
}
export async function exportNativeFiles(stores: Record<string, string>): Promise<NativeFileEntry[]> {
  const refs = fileReferences(stores);
  if (refs.length && !Capacitor.isNativePlatform()) throw new Error("Native file bytes are unavailable on this device.");
  return Promise.all(refs.map(async ref => ({ ...ref, ...(await nativeFiles.read(ref)) })));
}
export async function verifyNativeFiles(stores: Record<string, string>, entries: NativeFileEntry[]): Promise<boolean> {
  const refs = fileReferences(stores);
  if (refs.length !== entries.length) return false;
  const seen = new Set<string>(); const totals = new Map<string, number>();
  for (const ref of refs) {
    const key = JSON.stringify([ref.profileId, ref.taskId, ref.file.id]);
    const found = entries.find(e => JSON.stringify([e.profileId, e.taskId, e.file.id]) === key);
    if (!found || seen.has(key) || JSON.stringify(found.file) !== JSON.stringify(ref.file) || !await validateFileEntry(found)) return false;
    seen.add(key);
    const task = JSON.stringify([ref.profileId, ref.taskId]);
    const total = (totals.get(task) ?? 0) + ref.file.byteCount; totals.set(task,total);
    if (total > 100 * 1024 * 1024) return false;
  }
  return true;
}

/** Bytes become durable first; planner commit is the only success point. */
export async function recoverNativeFiles<T extends { ok: boolean }>(
  entries: NativeFileEntry[], commit: () => T, bridge: FilesPlugin = nativeFiles,
): Promise<T> {
  const { transaction } = await bridge.install({ entries });
  let result: T;
  try { result = commit(); }
  catch (error) { await bridge.rollback({ transaction }); throw error; }
  if (!result.ok) await bridge.rollback({ transaction });
  else { try { await bridge.finish({ transaction }); } catch { /* durable bytes already committed */ } }
  return result;
}
