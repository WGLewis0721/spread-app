import { isNativeApp, shareFileNative, type SaveResult } from "./native";

export type { SaveResult };

/**
 * Web: a normal browser download. Installed iOS app: the share sheet (see native.ts), because
 * WKWebView ignores `download`. The result lets callers avoid claiming a save the person cancelled.
 */
export function saveFile(blob: Blob, filename: string): Promise<SaveResult> {
  if (isNativeApp()) return shareFileNative(blob, filename);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return Promise.resolve("saved");
}
