import { createFileRoute } from "@tanstack/react-router";
import { waitlistHandlerFromEnv } from "@/lib/waitlist.server";

// Public beta waitlist → Google Sheets (docs/WAITLIST_API.md). Server-only:
// the `server` block never ships to the browser and the planner is untouched.
// The GitHub Pages mirror is a different origin, so it is allowed explicitly.
let handler: ReturnType<typeof waitlistHandlerFromEnv> | undefined;
const handle = (request: Request) =>
  (handler ??= waitlistHandlerFromEnv(process.env, {
    product: "Spread",
    siteUrl: "https://thespreadapp.com/",
    allowedOrigins: ["https://wglewis0721.github.io"],
  }))(request);

export const Route = createFileRoute("/api/waitlist")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      OPTIONS: ({ request }) => handle(request),
    },
  },
});
