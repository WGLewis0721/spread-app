import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { ACCESS_MESSAGES, normalizeEmail, validatePassword } from "@/lib/beta-access";
import type { BetaGate } from "./use-beta-gate";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"password" | "confirm" | "">("");

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError("");
    setFieldError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setFieldError("");
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
          ? await authClient.signUp.email({ email: cleanEmail, password, name: name.trim() || cleanEmail.split("@")[0] })
          : await authClient.signIn.email({ email: cleanEmail, password });
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
  return (
    <form onSubmit={submit} className="site-auth" noValidate>
      <div className="site-auth-tabs" role="tablist" aria-label="Beta access">
        <button type="button" role="tab" aria-selected={!signup} onClick={() => switchMode("signin")}>Sign in</button>
        <button type="button" role="tab" aria-selected={signup} onClick={() => switchMode("signup")}>Create beta account</button>
      </div>
      {gate.ended && !signup && (
        <p className="site-error" role="alert">{ACCESS_MESSAGES.inactive}</p>
      )}
      {signup && askName && (
        <>
          <label className="site-card-label" htmlFor="beta-name">What should we call you?</label>
          <input id="beta-name" className="site-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={100} />
        </>
      )}
      <label className="site-card-label" htmlFor="beta-email">Email</label>
      <input id="beta-email" className="site-input" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" autoComplete="email" required />
      <label className="site-card-label" htmlFor="beta-password">{signup ? "Choose a password" : "Password"}</label>
      <input id="beta-password" className="site-input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder={signup ? "At least 10 characters" : "Your password"} autoComplete={signup ? "new-password" : "current-password"} aria-invalid={fieldError === "password"} required />
      {signup && (
        <>
          <label className="site-card-label" htmlFor="beta-confirm">Confirm password</label>
          <input id="beta-confirm" className="site-input" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} placeholder="Type it again" autoComplete="new-password" aria-invalid={fieldError === "confirm"} required />
        </>
      )}
      {error && <p className="site-error" role="alert">{error}</p>}
      <button type="submit" className="site-button site-button-full" disabled={busy}>
        {busy ? (signup ? "Creating…" : "Signing in…") : signup ? "Create account" : "Sign in"}
      </button>
      <p className="site-auth-note">
        {signup
          ? "Only emails we've approved can create an account. Your planner stays on your device."
          : "Beta testers only. Joined the list? We'll email you when you're approved."}
      </p>
    </form>
  );
}
