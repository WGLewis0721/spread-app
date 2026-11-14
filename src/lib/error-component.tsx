import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas px-6 text-center text-ink">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-secondary">{errorMessage(error)}</p>
    </main>
  );
}

export function AppNotFoundComponent() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas px-6 text-center text-ink">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-secondary">This page doesn’t exist. Spread’s home page is one step back.</p>
      <a href="/" className="mt-2 inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-accent underline underline-offset-4">
        Back to Spread
      </a>
    </main>
  );
}
