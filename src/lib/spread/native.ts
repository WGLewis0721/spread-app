/**
 * Thin bridge to the iOS shell (Capacitor). Everything here is a no-op on the web, so the
 * Vercel site never loads a native plugin. Plugins are imported lazily and only on device.
 */

type CapacitorGlobal = { isNativePlatform?: () => boolean };

/** True only inside the installed iOS app. The bridge injects `window.Capacitor` before page scripts run. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const bridge = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    return bridge?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export type SaveResult = "saved" | "cancelled" | "failed";

/** The iOS share sheet rejects with "Share canceled" when the person dismisses it. */
export function isShareCancel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /cancel/i.test(message);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the file."));
    reader.onload = () => {
      const text = String(reader.result);
      resolve(text.slice(text.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

const EXPORT_DIR = "export";

/**
 * `<a download>` does nothing inside WKWebView, so on device an export is written to the app's
 * cache and handed to the share sheet ("Save to Files", AirDrop, Mail, Print, and so on).
 */
export async function shareFileNative(blob: Blob, filename: string): Promise<SaveResult> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    // Clear earlier exports first. Deleting right after sharing can race with the receiving app.
    await Filesystem.rmdir({ path: EXPORT_DIR, directory: Directory.Cache, recursive: true }).catch(() => undefined);
    const written = await Filesystem.writeFile({
      path: `${EXPORT_DIR}/${filename}`,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    });
    try {
      await Share.share({ title: filename, files: [written.uri] });
      return "saved";
    } catch (error) {
      return isShareCancel(error) ? "cancelled" : "failed";
    }
  } catch {
    return "failed";
  }
}

/**
 * The status bar follows the system appearance, but the planner has its own Light/Dark choice.
 * Without this, a dark planner on a light phone (or the reverse) leaves an unreadable clock.
 */
export function syncStatusBar(theme: "system" | "light" | "dark") {
  if (!isNativeApp()) return;
  void import("@capacitor/status-bar")
    .then(({ StatusBar, Style }) =>
      StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : theme === "light" ? Style.Light : Style.Default }),
    )
    .catch(() => undefined);
}
