import { createFileRoute } from "@tanstack/react-router";
import { SpreadApp } from "@/spread/screens/spread-app";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <SpreadApp />;
}
