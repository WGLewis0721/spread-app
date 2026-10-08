/**
 * Decides *when* to back up. It owns no storage and no timers of its own: everything is injected,
 * so the rules (debounce, one write at a time, back off after a failure, skip identical content,
 * back up at launch when the last backup is stale) are tested without a device.
 *
 * Failures never throw to the caller and never touch the planner. A backup that cannot be made is
 * retried later; the person is told through the status text, not an alert.
 */
export type BackupBuild = { text: string; signature: string; hasData: boolean };

export type BackupWriteResult = { name: string; verified: boolean; inICloudContainer: boolean };

export type BackupTransport = {
  write(text: string, pin?: string): Promise<BackupWriteResult>;
};

export type RunnerState = {
  busy: boolean;
  lastError: "noSpace" | "failed" | null;
  lastSuccessAt: number | null;
  /** The newest copy is saved on this device but has not been handed to iCloud. It is retried. */
  waitingForICloud: boolean;
};

export type TimerHandle = unknown;

export type RunnerOptions = {
  transport: BackupTransport;
  build: () => Promise<BackupBuild>;
  now?: () => number;
  setTimer?: (run: () => void, ms: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
  onState?: (state: RunnerState) => void;
  /** Asked immediately before anything is built and again before every hand-off. False means the person has opted out. */
  allowed?: () => boolean;
  debounceMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  staleMs?: number;
  launchDelayMs?: number;
};

export type BackupRunner = {
  /** Planner data changed. Backs up after the debounce. */
  changed(): void;
  /** The app is going to the background: back up now if anything changed. */
  flush(): Promise<void>;
  /** Drop pending, retry and undelivered work. Used when backup is turned off. */
  cancel(): void;
  /** App launch: back up soon if there is no recent backup. */
  launch(lastBackupAtMs: number | null): void;
  state(): RunnerState;
  dispose(): void;
};

function errorCode(error: unknown): "noSpace" | "failed" {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "noSpace" ? "noSpace" : "failed";
}

export function createBackupRunner(options: RunnerOptions): BackupRunner {
  const now = options.now ?? (() => Date.now());
  const setTimer = options.setTimer ?? ((run, ms) => setTimeout(run, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const debounceMs = options.debounceMs ?? 120_000;
  const retryBaseMs = options.retryBaseMs ?? 60_000;
  const retryMaxMs = options.retryMaxMs ?? 30 * 60_000;
  const staleMs = options.staleMs ?? 24 * 3_600_000;
  const launchDelayMs = options.launchDelayMs ?? 5_000;

  let dirty = false;
  let timer: TimerHandle | null = null;
  let inFlight: Promise<void> | null = null;
  let lastSignature: string | null = null;
  let failures = 0;
  let disposed = false;
  let pendingDelivery = false;
  const allowed = options.allowed ?? (() => true);
  let current: RunnerState = { busy: false, lastError: null, lastSuccessAt: null, waitingForICloud: false };

  function publish(next: Partial<RunnerState>) {
    current = { ...current, ...next };
    options.onState?.(current);
  }

  function schedule(ms: number) {
    if (disposed) return;
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      void run();
    }, ms);
  }

  function run(): Promise<void> {
    if (disposed) return Promise.resolve();
    if (inFlight) return inFlight;
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    if (!allowed()) {
      dirty = false;
      pendingDelivery = false;
      return Promise.resolve();
    }
    if (!dirty) return Promise.resolve();
    inFlight = (async () => {
      publish({ busy: true });
      try {
        const built = await options.build();
        // The build is slow. Re-check consent so nothing collected before an opt-out is handed over after it.
        if (!allowed()) {
          dirty = false;
          pendingDelivery = false;
          publish({ busy: false, waitingForICloud: false });
          return;
        }
        if (!built.hasData || (built.signature === lastSignature && !pendingDelivery)) {
          dirty = false;
          publish({ busy: false });
          return;
        }
        dirty = false;
        const result = await options.transport.write(built.text);
        if (!result.verified) throw Object.assign(new Error("not verified"), { code: "verificationFailed" });
        if (!result.inICloudContainer) {
          // Safe on this device, but iCloud never got the file. That is not delivery: keep trying.
          pendingDelivery = true;
          dirty = true;
          failures += 1;
          publish({ busy: false, lastError: null, lastSuccessAt: now(), waitingForICloud: true });
          schedule(Math.min(retryMaxMs, retryBaseMs * 2 ** (failures - 1)));
          return;
        }
        pendingDelivery = false;
        lastSignature = built.signature;
        failures = 0;
        publish({ busy: false, lastError: null, lastSuccessAt: now(), waitingForICloud: false });
      } catch (error) {
        dirty = true;
        failures += 1;
        publish({ busy: false, lastError: errorCode(error) });
        schedule(Math.min(retryMaxMs, retryBaseMs * 2 ** (failures - 1)));
      } finally {
        inFlight = null;
      }
      // Something changed while the write was running: go again after the debounce.
      if (dirty && timer === null && current.lastError === null && !pendingDelivery) schedule(debounceMs);
    })();
    return inFlight;
  }

  return {
    changed() {
      dirty = true;
      if (timer === null && !inFlight) schedule(debounceMs);
    },
    flush() {
      return run();
    },
    cancel() {
      dirty = false;
      pendingDelivery = false;
      failures = 0;
      if (timer !== null) clearTimer(timer);
      timer = null;
      publish({ lastError: null, waitingForICloud: false });
    },
    launch(lastBackupAtMs) {
      if (lastBackupAtMs === null || now() - lastBackupAtMs > staleMs) {
        dirty = true;
        schedule(launchDelayMs);
      }
    },
    state: () => current,
    dispose() {
      disposed = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}
