import { createNativeV2Dispatcher } from "./native-v2-dispatch.ts";
import { useSpread } from "./store.ts";
import { getSaveFacts } from "./local-status.ts";

/** Installed only inside the bundled native runtime after storage restoration and boot.
 * WKWebView passes structured arguments; no command is ever interpolated into JS source.
 */
export function installNativeV2Host() {
  const router = createNativeV2Dispatcher(crypto.randomUUID());
  const host = {
    async exchange(message: string): Promise<string> {
      try {
        const request: unknown = JSON.parse(message);
        const reply =
          request === null ? { ok: true, state: router.read() } : await router.dispatch(request);
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
  return () => {
    router.dispose();
    delete (window as Window & { SpreadNativeHost?: unknown }).SpreadNativeHost;
  };
}
