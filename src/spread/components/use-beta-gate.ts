import { useCallback, useEffect, useRef, useState } from "react";
import { getBetaStatus, type BetaStatus } from "@/lib/beta-status";
import { isNativeApp } from "@/lib/spread/native";
import { LOCAL_FIRST_OPEN_ACCESS } from "@/lib/spread/open-access";
import { useSpread } from "@/lib/spread/store";

// A convenience only: it makes a returning tester wait for the check instead of flashing the
// landing page. It grants nothing; the planner opens only when the server says "ok".
const SEEN_KEY = "spread.beta-seen";
const RECHECK_MS = 5 * 60_000;
const FIRST_CHECK_WAIT_MS = 2_500;

function seenBefore() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen(seen: boolean) {
  try {
    if (seen) localStorage.setItem(SEEN_KEY, "1");
    else localStorage.removeItem(SEEN_KEY);
  } catch {
    /* private mode: only costs a flash of the landing page */
  }
}

export type BetaGate = {
  /** True while a returning tester's first check is still running. */
  checking: boolean;
  /** Set when a signed-in tester's access ended; cleared by the next sign-in. */
  ended: boolean;
  /** Apply a fresh server answer (after sign-in or sign-up). */
  refresh: () => Promise<BetaStatus>;
};

/**
 * Keeps the web planner in step with the server: opens it for an approved, signed-in tester and
 * closes it when the session ends or the Sheet stops approving the email. The installed iOS app
 * has no sign-in step and skips all of this.
 */
export function useBetaGate(): BetaGate {
  const native = isNativeApp() || LOCAL_FIRST_OPEN_ACCESS;
  const enterBeta = useSpread((s) => s.enterBeta);
  const logout = useSpread((s) => s.logout);
  const [checking, setChecking] = useState(() => !native && typeof window !== "undefined" && seenBefore());
  const [ended, setEnded] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async (): Promise<BetaStatus> => {
    let status: BetaStatus;
    try {
      status = await getBetaStatus();
    } catch {
      status = { state: "unavailable" };
    }
    if (!alive.current) return status;
    if (status.state === "ok") {
      markSeen(true);
      setEnded(false);
      enterBeta(status.name || status.email.split("@")[0]);
    } else if (status.state === "denied") {
      markSeen(false);
      setEnded(true);
      if (useSpread.getState().license) logout();
    } else if (status.state === "signed-out") {
      markSeen(false);
      if (useSpread.getState().license) logout();
    }
    // "unavailable" keeps whatever is open now and tries again at the next check.
    setChecking(false);
    return status;
  }, [enterBeta, logout]);

  useEffect(() => {
    alive.current = true;
    if (native) return () => void (alive.current = false);
    void refresh();
    const stopWaiting = window.setTimeout(() => setChecking(false), FIRST_CHECK_WAIT_MS);
    const timer = window.setInterval(() => void refresh(), RECHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive.current = false;
      window.clearTimeout(stopWaiting);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [native, refresh]);

  return { checking, ended, refresh };
}
