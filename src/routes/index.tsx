import { createFileRoute } from "@tanstack/react-router";
import { SpreadApp } from "@/spread/screens/spread-app";
import { TESTFLIGHT_URL } from "@/lib/links";

export const Route = createFileRoute("/")({
  component: Home,
});

// Shown only without JavaScript (and to crawlers that do not run it). Same copy as the hero.
function Home() {
  return (
    <>
      <noscript>
        <div className="site-noscript spread-site">
          <h1>A little more room for what matters.</h1>
          <p>A weekly planner that starts with time. Spread needs JavaScript to show the site and the planner.</p>
          <p>
            <a href={TESTFLIGHT_URL} target="_blank" rel="noopener noreferrer">Join the TestFlight beta</a>
            {" · "}
            <a href="/privacy.html">Privacy policy</a>
            {" · "}
            <a href="mailto:graymattertechllc@gmail.com">Support</a>
          </p>
        </div>
      </noscript>
      <SpreadApp />
    </>
  );
}
