import { useState, type FormEvent } from "react";
import { getAuthClient } from "@/lib/auth/client";
import { ACCESS_MESSAGES, normalizeEmail, validatePassword } from "@/lib/beta-access";
import { RESET_MESSAGES } from "@/lib/password-reset";
import type { BetaGate } from "./use-beta-gate";

// The reset request lives in this browser only: the token proves the person finishing the reset is
// the one who asked. Cleared on success, on "Start over" and once it expires.
const RESET_KEY = "spread.reset";
type StoredReset = { email: string; token: string; code: string; expiresAt: string };

function readReset(): StoredReset | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESET_KEY) ?? "null") as StoredReset | null;
    if (!parsed || typeof parsed.token !== "string" || !(Date.parse(parsed.expiresAt) > Date.now())) return null;
    return parsed;
  } catch {
    return null;
  }
}
function writeReset(value: StoredReset | null) {
  try {
    if (value) localStorage.setItem(RESET_KEY, JSON.stringify(value));
    else localStorage.removeItem(RESET_KEY);
  } catch {
    /* private mode: the code stays on screen for this visit */
  }
}

async function postReset(body: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> }> {
  try {
    const response = await fetch("/api/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: (await response.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { status: 0, data: { message: RESET_MESSAGES.unavailable } };
  }
}

type AuthError = { status?: number; code?: string; message?: string } | null | undefined;

function describe(error: AuthError, mode: "signin" | "signup"): string {
  if (!error) return "";
  if (error.status === 429) return "Too many tries. Wait a few minutes and try again.";
  if (error.code && /EXIST/i.test(error.code)) return "Looks like you already have an account. Sign in instead.";
  if (error.status === 503 || error.status === 0) return error.message || ACCESS_MESSAGES.unavailable;
  if (mode === "signin") return ACCESS_MESSAGES.badCredentials;
  if (error.status === 403 && error.message) return error.message;
  return error.message || "Something went wrong. Try again.";
}

/** Sign in / Create beta account, shown in the landing page's "Start" card. */
export function BetaAccessCard({
  gate,
  onEntered,
  askName,
}: {
  gate: BetaGate;
  onEntered: () => void;
  /** True when this device has no profile yet, so the planner needs a name for it. */
  askName: boolean;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [reset, setReset] = useState<StoredReset | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"password" | "confirm" | "">("");

  function switchMode(next: "signin" | "signup" | "reset") {
    setMode(next);
    setError("");
    setFieldError("");
    if (next === "reset") {
      const saved = readReset();
      setReset(saved);
      if (saved) setEmail(saved.email);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(reset?.code ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the code is on screen */
    }
  }

  async function requestReset() {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail.includes("@")) return setError("Enter your email address.");
    setBusy(true);
    const { status, data } = await postReset({ action: "request", email: cleanEmail });
    setBusy(false);
    if (data.ok === true && typeof data.token === "string" && typeof data.code === "string") {
      const saved = { email: cleanEmail, token: data.token, code: data.code, expiresAt: String(data.expiresAt) };
      writeReset(saved);
      setReset(saved);
      setPassword("");
      setConfirm("");
    } else {
      setError(String(data.message ?? (status === 429 ? RESET_MESSAGES.limited : RESET_MESSAGES.unavailable)));
    }
  }

  async function finishReset() {
    if (!reset) return;
    const weak = validatePassword(password);
    if (weak) {
      setFieldError("password");
      return setError(weak);
    }
    if (password !== confirm) {
      setFieldError("confirm");
      return setError("The two passwords don't match.");
    }
    setBusy(true);
    const { data } = await postReset({ action: "complete", email: reset.email, token: reset.token, password });
    if (data.ok !== true) {
      setBusy(false);
      // Expired, spent or declined requests can't be revived: clear them so the tester starts over.
      if (data.reason === "expired" || data.reason === "used" || data.reason === "denied") {
        writeReset(null);
        setReset(null);
      }
      return setError(String(data.message ?? RESET_MESSAGES.unavailable));
    }
    writeReset(null);
    // The reset signs the account out everywhere; sign in with the new password.
    const result = await getAuthClient().signIn.email({ email: reset.email, password });
    setBusy(false);
    if (result.error) {
      setReset(null);
      setPassword("");
      setConfirm("");
      setMode("signin");
      return setError("Your password was changed. Sign in with the new one.");
    }
    const status = await gate.refresh();
    if (status.state === "ok") {
      setPassword("");
      setConfirm("");
      onEntered();
    } else {
      setError(ACCESS_MESSAGES.unavailable);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setFieldError("");
    if (mode === "reset") return void (reset ? finishReset() : requestReset());
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !cleanEmail.includes("@")) return setError("Enter your email address.");
    if (mode === "signup") {
      const weak = validatePassword(password);
      if (weak) {
        setFieldError("password");
        return setError(weak);
      }
      if (password !== confirm) {
        setFieldError("confirm");
        return setError("The two passwords don't match.");
      }
    } else if (!password) {
      return setError("Enter your password.");
    }
    setBusy(true);
    try {
      const result =
        mode === "signup"
          ? await getAuthClient().signUp.email({ email: cleanEmail, password, name: name.trim() || cleanEmail.split("@")[0] })
          : await getAuthClient().signIn.email({ email: cleanEmail, password });
      if (result.error) {
        setError(describe(result.error as AuthError, mode));
        return;
      }
      const status = await gate.refresh();
      if (status.state === "ok") {
        setPassword("");
        setConfirm("");
        onEntered();
      } else if (status.state === "unavailable") {
        setError(ACCESS_MESSAGES.unavailable);
      } else {
        setError(mode === "signin" ? ACCESS_MESSAGES.badCredentials : ACCESS_MESSAGES.notApproved);
      }
    } catch {
      setError(ACCESS_MESSAGES.unavailable);
    } finally {
      setBusy(false);
    }
  }

  const signup = mode === "signup";
  const resetting = mode === "reset";
  return (
    <form onSubmit={submit} className="site-auth" noValidate>
      <div className="site-auth-tabs" role="tablist" aria-label="Beta access">
        <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => switchMode("signin")}>Sign in</button>
        <button type="button" role="tab" aria-selected={signup} onClick={() => switchMode("signup")}>Create beta account</button>
      </div>
      {gate.ended && mode === "signin" && (
        <p className="site-error" role="alert">{ACCESS_MESSAGES.inactive}</p>
      )}
      {resetting && (
        <p className="site-auth-heading">{reset ? "Reset your password" : "Forgot your password?"}</p>
      )}
      {signup && askName && (
        <>
          <label className="site-card-label" htmlFor="beta-name">What should we call you?</label>
          <input id="beta-name" className="site-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={100} />
        </>
      )}
      {resetting && reset ? (
        <>
          <p className="site-auth-note site-auth-note-left">
            Send us this code so we know it&rsquo;s you. When we approve it, come back to this page, in this browser, and choose a new password.
          </p>
          <div className="site-reset-code">
            <code aria-label="Your reset code">{reset.code}</code>
            <button type="button" onClick={copyCode}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <p className="site-auth-note site-auth-note-left">For {reset.email}. This code works for 24 hours.</p>
        </>
      ) : (
        <>
          <label className="site-card-label" htmlFor="beta-email">Email</label>
          <input id="beta-email" className="site-input" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" autoComplete="email" required />
        </>
      )}
      {(!resetting || reset) && (
        <>
          <label className="site-card-label" htmlFor="beta-password">{resetting ? "New password" : signup ? "Choose a password" : "Password"}</label>
          <input id="beta-password" className="site-input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder={signup || resetting ? "At least 10 characters" : "Your password"} autoComplete={signup || resetting ? "new-password" : "current-password"} aria-invalid={fieldError === "password"} required />
        </>
      )}
      {(signup || (resetting && reset)) && (
        <>
          <label className="site-card-label" htmlFor="beta-confirm">Confirm password</label>
          <input id="beta-confirm" className="site-input" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} placeholder="Type it again" autoComplete="new-password" aria-invalid={fieldError === "confirm"} required />
        </>
      )}
      {error && <p className="site-error" role="alert">{error}</p>}
      <button type="submit" className="site-button site-button-full" disabled={busy}>
        {resetting
          ? reset
            ? busy ? "Resetting…" : "Reset password"
            : busy ? "Getting your code…" : "Get my reset code"
          : busy ? (signup ? "Creating…" : "Signing in…") : signup ? "Create account" : "Sign in"}
      </button>
      {mode === "signin" && (
        <button type="button" className="site-auth-link" onClick={() => switchMode("reset")}>Forgot password?</button>
      )}
      {resetting && (
        <button
          type="button"
          className="site-auth-link"
          onClick={() => {
            if (reset) {
              writeReset(null);
              setReset(null);
              setError("");
            } else switchMode("signin");
          }}
        >
          {reset ? "Start over" : "Back to sign in"}
        </button>
      )}
      <p className="site-auth-note">
        {resetting
          ? "Resets are approved by hand, so they can take a day. Your planner stays on your device."
          : signup
            ? "Only emails we've approved can create an account. Your planner stays on your device."
            : "Beta testers only. Joined the list? We'll email you when you're approved."}
      </p>
    </form>
  );
}
