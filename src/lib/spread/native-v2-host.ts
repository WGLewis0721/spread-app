import { createNativeV2Dispatcher } from "./native-v2-dispatch.ts";
import { useSpread } from "./store.ts";
import { getSaveFacts } from "./local-status.ts";

/** Installed only inside the bundled native runtime after storage restoration and boot.
 * WKWebView passes structured arguments; no command is ever interpolated into JS source.
 */
export function installNativeV2Host() {
  let router = createNativeV2Dispatcher(crypto.randomUUID());
  const host = {
    async exchange(message: string): Promise<string> {
      try {
        const request: unknown = JSON.parse(message);
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
  nativeWindow.webkit?.messageHandlers?.spreadPlannerReady?.postMessage(null);
  return () => {
    router.dispose();
    delete (window as Window & { SpreadNativeHost?: unknown }).SpreadNativeHost;
  };
}
