import { useEffect, useRef, useState, type FormEvent } from "react";
import "./landing-waitlist.css";

const media = import.meta.env.BASE_URL + "waitlist/";

export function LandingWaitlist() {
  const video = useRef<HTMLVideoElement>(null);
  const [motion, setMotion] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!query.matches);
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element || !motion) { element?.pause(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void element.play().catch(() => setMotion(false));
      else element.pause();
    }, { threshold: .2 });
    observer.observe(element);
    return () => { observer.disconnect(); element.pause(); };
  }, [motion]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setState("sending");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "spread", email: String(values.get("email") || "").trim(), consent: values.get("consent") === "on", source: "homepage" }),
      });
      const result = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
      if (!response.ok || result?.ok !== true) throw new Error("Waitlist unavailable");
      form.reset(); setState("success");
    } catch { setState("error"); }
  }

  return <section className="site-waitlist" id="waitlist" aria-labelledby="spread-waitlist-title">
    <div className="site-waitlist-copy">
      <p className="site-kicker">Spread for iPhone</p>
      <h2 id="spread-waitlist-title">A little room for what matters. <em>Wherever you are.</em></h2>
      <p>Spread began on a Sunday sheet of paper. Join the iPhone beta list and we'll send an invitation when the planner is ready to carry with you.</p>
      <form className="site-waitlist-form" onSubmit={submit}>
        <label htmlFor="spread-beta-email">Email for your beta invitation</label>
        <div className="site-waitlist-fields"><input id="spread-beta-email" type="email" name="email" autoComplete="email" placeholder="you@example.com" required disabled={state === "sending"}/><button className="site-button" type="submit" disabled={state === "sending"}>{state === "sending" ? "Joining…" : "Join the iPhone beta"}</button></div>
        <label className="site-waitlist-consent"><input type="checkbox" name="consent" required disabled={state === "sending"}/> Email me about the Spread iPhone beta and my invitation. I can unsubscribe at any time.</label>
        <p className="site-waitlist-feedback" role="status" aria-live="polite">{state === "success" ? "You're on the list. We'll email your invitation when it's ready." : state === "error" ? "We couldn't add you yet. Please try again later." : "You can use Spread on the web now. Your planner stays on your device; this form only asks for an email."}</p>
      </form>
    </div>
    <div className="site-waitlist-visual">
      <video ref={video} muted loop playsInline preload="none" poster={media + "spread-poster.webp"} aria-label="Colored roles move from a handwritten week into Spread"><source src={media + "spread-loop.mp4"} type="video/mp4"/></video>
      <button type="button" aria-label={motion ? "Pause waitlist motion" : "Play waitlist motion"} aria-pressed={motion} onClick={() => setMotion(value => !value)}>{motion ? "Pause motion" : "Play motion"}</button>
    </div>
  </section>;
}
