import { createFileRoute } from "@tanstack/react-router";

// Better Auth's HTTP endpoints for this app (/api/auth/*): beta sign-up, sign-in,
// sign-out and the session read. The beta allowlist lives in the `hooks` block of
// src/lib/auth/server.ts. Server-only: the `server` block never ships to the browser.
const handle = async ({ request }: { request: Request }) => {
  // A deployment without its database or secret must refuse cleanly: loading the auth module
  // there would start an in-memory database whose accounts vanish between requests.
  const { betaAuthConfigured } = await import("@/lib/beta-access.server");
  if (!betaAuthConfigured()) {
    return Response.json(
      { message: "Beta sign-in isn't available yet. Try again later." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  const { auth } = await import("@/lib/auth/server");
  return auth.handler(request);
};

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
