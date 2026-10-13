import { createFileRoute } from "@tanstack/react-router";
import { clientIp, createRateLimiter, originAllowed, readJson } from "@/lib/waitlist.server";
import { RESET_MESSAGES } from "@/lib/password-reset";

// Password reset for the web beta (docs/BETA_ACCESS.md). Two actions on one endpoint:
//   { action: "request",  email }                  -> { ok, code, token, expiresAt }
//   { action: "complete", email, token, password } -> { ok } or { ok:false, reason, message }
// A request is approved by editing its row on the Sheet's "Reset requests" tab. Server-only.
const limit = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra },
  });

async function handle(request: Request): Promise<Response> {
  try {
    if (!originAllowed(request, [])) return json(403, { ok: false, reason: "origin", message: "This origin can't use password reset." });
    if ((request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() !== "application/json")
      return json(415, { ok: false, reason: "invalid", message: "Send application/json." });
    const limited = limit(clientIp(request));
    if (!limited.allowed)
      return json(429, { ok: false, reason: "limited", message: RESET_MESSAGES.limited }, { "retry-after": String(limited.retryAfter) });

    const { betaAuthConfigured } = await import("@/lib/beta-access.server");
    if (!betaAuthConfigured()) return json(503, { ok: false, reason: "unavailable", message: RESET_MESSAGES.unavailable });
    const { resetServiceFromEnv } = await import("@/lib/password-reset.server");
    const service = resetServiceFromEnv();

    const body = (await readJson(request)) as { action?: unknown; email?: unknown; token?: unknown; password?: unknown } | null;
    if (!body || typeof body !== "object") return json(400, { ok: false, reason: "invalid", message: "Send a JSON object." });

    if (body.action === "request") {
      const result = await service.request(body.email);
      if (result.ok) return json(200, result);
      const message =
        result.reason === "invalid-email" ? RESET_MESSAGES.invalidEmail : result.reason === "limited" ? RESET_MESSAGES.limited : RESET_MESSAGES.unavailable;
      return json(result.reason === "invalid-email" ? 400 : result.reason === "limited" ? 429 : 503, { ok: false, reason: result.reason, message });
    }
    if (body.action === "complete") {
      const result = await service.complete({ email: body.email, token: body.token, password: body.password });
      if (result.ok) return json(200, { ok: true });
      const status = result.reason === "weak-password" ? 400 : result.reason === "limited" ? 429 : result.reason === "unavailable" ? 503 : 409;
      return json(status, result);
    }
    return json(400, { ok: false, reason: "invalid", message: "Unknown action." });
  } catch (error) {
    if ((error as { code?: string })?.code === "INVALID_JSON" || (error as { code?: string })?.code === "REQUEST_TOO_LARGE")
      return json(400, { ok: false, reason: "invalid", message: (error as Error).message });
    console.error("password reset failed", (error as Error)?.message ?? error);
    return json(500, { ok: false, reason: "unavailable", message: RESET_MESSAGES.unavailable });
  }
}

export const Route = createFileRoute("/api/password-reset")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
