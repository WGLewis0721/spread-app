import { getNativeRecoveryNotice, onNativeRecoveryNotice } from "./native-mirror.ts";
import { createNativeV2Dispatcher } from "./native-v2-dispatch.ts";
import { buildBackupText, useSpread } from "./store.ts";
import { getSaveFacts } from "./local-status.ts";
import { applyRestore } from "./restore-apply.ts";
import { applyPlanMerge, buildPlanFile, inspectBackupFile } from "./backup-intake.ts";
import { backupRequestOf, handleBackupRequest, type BackupDeps } from "./native-backup-bridge.ts";

/** The file work the modern sheet asks for: the same functions the web planner's More sheet uses, plus the plan file. */
const backupDeps: BackupDeps = {
  buildText: () => buildBackupText(useSpread.getState().data),
  buildPlan: buildPlanFile,
  fileName: () => `Spread-${useSpread.getState().data.currentWeek}.spread`,
  inspect: inspectBackupFile,
  apply: (backup, select) => applyRestore(backup, select),
  mergeApply: applyPlanMerge,
};

/** Installed only inside the bundled native runtime after storage restoration and boot.
 * WKWebView passes structured arguments; no command is ever interpolated into JS source.
 */
export function installNativeV2Host() {
  let router = createNativeV2Dispatcher(crypto.randomUUID());
  const host = {
    async exchange(message: string): Promise<string> {
      try {
        const request: unknown = JSON.parse(message);
        const backup = backupRequestOf(request);
        if (backup) {
          const requestId = (request as { requestId?: unknown }).requestId ?? null;
          return JSON.stringify({ requestId, ...(await handleBackupRequest(backup, backupDeps)) });
        }
        const reply =
          request === null ? { ok: true, state: router.read() } : await router.dispatch(request);
        if ("error" in reply && reply.error === "session-capacity") {
          router.dispose();
          router = createNativeV2Dispatcher(crypto.randomUUID());
          reply.state = router.read();
        }
        return JSON.stringify({
          ...reply,
          profiles: useSpread.getState().profiles.map(({ id, name }) => ({ id, name })),
          saveError: getSaveFacts().failed,
          recoveryNotice: getNativeRecoveryNotice(),
        });
      } catch {
        return JSON.stringify({
          ok: false,
          error: "invalid-message",
          state: router.read(),
          profiles: [],
        });
      }
    },
  };
  Object.assign(window, { SpreadNativeHost: host });
  const nativeWindow = window as unknown as {
    webkit?: { messageHandlers?: { spreadPlannerReady?: { postMessage(value: null): void } } };
  };
  const signal = () => {
    nativeWindow.webkit?.messageHandlers?.spreadPlannerReady?.postMessage(null);
  };
  signal();
  const stopRecovery = onNativeRecoveryNotice(signal);
  return () => {
    stopRecovery();
    router.dispose();
    delete (window as Window & { SpreadNativeHost?: unknown }).SpreadNativeHost;
  };
}
