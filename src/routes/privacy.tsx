import { createFileRoute } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Spread" },
      {
        name: "description",
        content: "How Spread protects your weekly plans and handles optional website waitlist information.",
      },
    ],
  }),
  component: PrivacyPage,
});

const colors = {
  paper: "#F6F1E7",
  ink: "#171717",
  muted: "#56534F",
  line: "#D6D0C5",
  blue: "#075AB3",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1.24rem", fontWeight: 700, margin: "0 0 0.65rem" }}>{title}</h2>
      <div style={{ display: "grid", gap: "0.7rem", color: colors.ink }}>{children}</div>
    </section>
  );
}

const link: CSSProperties = { color: colors.blue, textDecoration: "underline", textUnderlineOffset: 3 };

function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "clamp(24px, 5vw, 64px) 20px 72px",
        background: colors.paper,
        color: colors.ink,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        lineHeight: 1.7,
      }}
    >
      <main style={{ width: "100%", maxWidth: 740, margin: "0 auto" }}>
        <nav aria-label="Return to Spread" style={{ marginBottom: "3rem" }}>
          <a href="/" style={{ ...link, fontWeight: 650 }}>← Back to Spread</a>
        </nav>
        <p
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            fontSize: "0.76rem",
            fontWeight: 700,
            color: colors.muted,
          }}
        >
          Spread · Privacy
        </p>
        <h1 style={{ fontSize: "clamp(2.2rem, 7vw, 3.5rem)", lineHeight: 1.13, letterSpacing: "-0.045em", margin: "0.3rem 0 0.9rem" }}>
          Privacy policy
        </h1>
        <p style={{ color: colors.muted, fontSize: "0.9rem" }}>Effective October 9, 2026</p>
        <p style={{ fontSize: "1.08rem", marginTop: "1.5rem" }}>
          Spread is a weekly planner made by Gray Matter LLC. Your planning belongs to you.
          This policy covers the Spread iPhone and iPad app and the public Spread website.
          The app and the website waitlist handle information differently, as explained below.
        </p>

        <Section title="The Spread iOS app">
          <p>
            Spread does not require an account. Your responsibilities, hours, weeks, tasks,
            notes, attached photos, and profiles are saved on your device. The app also
            maintains a device-local copy to help recover your planning if web storage is
            cleared. Gray Matter does not receive your planning content through the app.
          </p>
          <p>
            The current iOS release does not include advertising, third-party analytics,
            or tracking, and it does not collect personal data from the app for Gray Matter
            or advertising partners.
          </p>
        </Section>

        <Section title="Camera, backups, and sharing">
          <p>
            If you choose to attach a photo using your camera, Spread uses the camera only
            for that action. Photos and other planner content stay on your device unless
            you choose to export or share them.
          </p>
          <p>
            When you use Back Up Spread, export a document, or use the iOS Share Sheet, you
            decide where the file goes. Content you send to another app or storage service
            is then subject to that service's privacy practices.
          </p>
          <p>
            Spread's own optional iCloud Backup and iCloud Sync features are disabled in
            the current iOS release. Apple's device-level backups, if enabled on your
            device, are managed through your Apple settings; Gray Matter cannot access
            those backups. We will update this policy if Spread enables its own cloud features.
          </p>
        </Section>

        <Section title="The public website and beta waitlist">
          <p>
            Using the Spread website does not send the contents of your planner to Gray
            Matter. If you voluntarily join the website's beta waitlist, we collect the
            email address and name you provide to contact you about Spread. These details
            are stored in a Google Sheet, and a notification service alerts us to new
            signups. This website waitlist is separate from the iOS app.
          </p>
          <p>
            Website hosting providers may process technical information needed to deliver
            and secure the site, such as network requests. We do not sell your waitlist
            information. You can ask us to remove your waitlist entry using the contact
            address below.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can edit or remove your plans and profiles in the app. Deleting the app
            removes its device-local app data, but does not automatically delete files
            you exported, copies saved elsewhere, or backups managed by Apple.
          </p>
          <p>
            If you contact us by email, we receive the information you include so we can
            respond. You can ask us about the information we hold from a website waitlist
            signup or support correspondence.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy as Spread changes. We will post the revised text
            here with a new effective date, and update App Store privacy disclosures
            before introducing any new data collection in the iOS app.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Gray Matter LLC · <a href="mailto:graymattertechllc@gmail.com" style={link}>graymattertechllc@gmail.com</a>
          </p>
        </Section>

        <footer style={{ borderTop: "1px solid " + colors.line, marginTop: "3rem", paddingTop: "1.4rem", color: colors.muted, fontSize: "0.9rem" }}>
          <a href="/" style={link}>Spread</a> · A little room for what matters.
        </footer>
      </main>
    </div>
  );
}
