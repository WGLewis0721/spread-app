/**
 * Spread — Make the Hours Count — V5 impact cut (vertical 1080x1920, 30 fps, 900 frames).
 *
 * Separate versioned revision; v7 and V3 untouched. New short narration (Hallie preset, v4 takes)
 * mixed with the approved v7 score (public/assets/v4/mix-v4.wav).
 *
 * PROVENANCE: product screens are code-built motion graphics of interactions verified IN THE iOS SOURCE
 * (LifeWalletStack focus + Details/Tasks, LifeWeeklyTimeBudget + role arrow control in 0.5 h steps,
 * LifeWeekView day + "h reserved" + Plan one hour + quick add, toggleTask, Undo/Redo row).
 * They are NOT native screen recordings; no native-testing claim. Planner data is fictional.
 */
import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Base, C } from "../../src/design";

/* ---------- helpers ---------- */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const io = (x: number) => Easing.bezier(0.45, 0, 0.2, 1)(clamp(x));
const out = (x: number) => Easing.bezier(0.16, 1, 0.3, 1)(clamp(x));
const back = (x: number) => Easing.back(1.4)(clamp(x));
const pulse = (t: number, t0: number, w = 0.22) => Math.max(0, 1 - Math.abs(t - t0) / w);

const ROLES = [
  { name: "Work", art: "work", color: "#34C759", hours: 10 },
  { name: "Family", art: "family", color: "#AF52DE", hours: 6 },
  { name: "Health", art: "fitness", color: "#30B0C7", hours: 3 },
  { name: "Personal Goals", art: "personal", color: "#0A84FF", hours: 3 },
] as const;
const FAM = 1;
const FLIP_SWAP = 17.43;
const STAMP2 = 25.304;       // beat 48: wordmark impact
const CAP = 30;
const NAVY = "#0C1A33";
const NAVY2 = "#16294A";
const CREAM = "#F2EDE3";
const SERIF = '"Iowan Old Style", Charter, Georgia, "Times New Roman", serif';

/* ---------- phone geometry ---------- */
const S = 1.65;
const PH_W = 418;
const PH_H = 872;
const PH_LEFT = (1080 - PH_W * S) / 2;
const PH_TOP = 520;
const sx = (x: number) => PH_LEFT + (14 + x) * S;
const sy = (y: number) => PH_TOP + (14 + y) * S;

/* ---------- camera: close-ups on the vector UI ---------- */
type KF = { t: number; k: number; fx: number; fy: number; tx: number; ty: number; rx?: number; ry?: number };
const id = (t: number, fx: number, fy: number): KF => ({ t, k: 1, fx, fy, tx: sx(fx), ty: sy(fy) });
const KFS: KF[] = [
  id(0, 195, 430),
  id(4.5, 195, 430),
  { t: 6.12, k: 1.0, fx: 195, fy: 430, tx: sx(195), ty: sy(430), rx: 0, ry: 0 },
  { t: 6.27, k: 1.42, fx: 195, fy: 330, tx: 540, ty: 1010, rx: 5, ry: -10 },
  { t: 8.1, k: 1.5, fx: 195, fy: 330, tx: 540, ty: 1010, rx: 5, ry: -9 },
  { t: 10.1, k: 1.4, fx: 195, fy: 330, tx: 540, ty: 1010, rx: 4, ry: -6 },
  { t: 11.0, k: 1.55, fx: 195, fy: 245, tx: 540, ty: 930, rx: 3, ry: 7 },
  { t: 16.2, k: 1.55, fx: 195, fy: 245, tx: 540, ty: 930, rx: 2, ry: 5 },
  { t: 17.5, k: 1.3, fx: 195, fy: 300, tx: 540, ty: 1030, rx: 0, ry: -8 },
  { t: 20.9, k: 1.3, fx: 195, fy: 360, tx: 540, ty: 1040, rx: 3, ry: 6 },
  { t: 22.1, k: 1.62, fx: 195, fy: 520, tx: 540, ty: 1010, rx: 4, ry: -6 },
  { t: 24.0, k: 1.62, fx: 195, fy: 520, tx: 540, ty: 1010, rx: 0, ry: 0 },
  id(24.9, 195, 430),
];
const cam = (t: number) => {
  let a = KFS[0], b = KFS[KFS.length - 1];
  for (let i = 0; i < KFS.length - 1; i++) {
    if (t >= KFS[i].t && t <= KFS[i + 1].t) { a = KFS[i]; b = KFS[i + 1]; break; }
  }
  if (t <= KFS[0].t) return { ...KFS[0], rx: 0, ry: 0 };
  if (t >= KFS[KFS.length - 1].t) return { ...KFS[KFS.length - 1], rx: 0, ry: 0 };
  const e = io((t - a.t) / Math.max(0.001, b.t - a.t));
  return { t, k: lerp(a.k, b.k, e), fx: lerp(a.fx, b.fx, e), fy: lerp(a.fy, b.fy, e), tx: lerp(a.tx, b.tx, e), ty: lerp(a.ty, b.ty, e), rx: lerp(a.rx ?? 0, b.rx ?? 0, e), ry: lerp(a.ry ?? 0, b.ry ?? 0, e) };
};

/* ---------- headline ---------- */
type Word = { w: string; em?: boolean };
const HeadLine = ({ t, a, b, kick, lines, tone }: { t: number; a: number; b: number; kick?: string; lines: Word[][]; tone: "paper" | "navy" }) => {
  if (t < a - 0.02 || t > b + 0.05) return null;
  const outp = P(t, b - 0.32, b - 0.05);
  let k = 0;
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 120, color: tone === "paper" ? C.ink : CREAM, opacity: 1 - outp, transform: `translateY(${-16 * io(outp)}px)` }}>
      {kick ? <div style={{ fontSize: 28, fontWeight: 650, letterSpacing: 5, textTransform: "uppercase", color: tone === "paper" ? C.muted : "#7FB8FF", marginBottom: 20, opacity: out(P(t, a, a + 0.4)) }}>{kick}</div> : null}
      <div style={{ fontSize: 112, lineHeight: 1.0, fontWeight: 560, letterSpacing: -6.5 }}>
        {lines.map((ln, li) => (
          <div key={li} style={{ whiteSpace: "nowrap" }}>
            {ln.map((wd, wi) => {
              const p = out(P(t, a + k++ * 0.06, a + k * 0.06 + 0.45));
              return <span key={wi} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 40}px)`, filter: `blur(${(1 - p) * 8}px)`, fontFamily: wd.em ? SERIF : undefined, fontStyle: wd.em ? "italic" : undefined, fontWeight: wd.em ? 500 : undefined, letterSpacing: wd.em ? -3.5 : undefined }}>{wd.w}{" "}</span>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const Logo = ({ size }: { size: number }) => <Img src={staticFile("assets/app-icon-spread-cards-square.svg")} style={{ width: size, height: size, borderRadius: size * 0.24 }} />;
const Touch = ({ x, y, o, press }: { x: number; y: number; o: number; press: number }) => (
  <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, background: "rgba(255,255,255,.34)", boxShadow: "0 0 0 2px rgba(255,255,255,.6)", opacity: o, transform: `scale(${1 - 0.22 * press})`, zIndex: 95 }} />
);
const Ripple = ({ x, y, p }: { x: number; y: number; p: number }) => (
  <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, border: "2px solid #fff", opacity: p > 0 && p < 1 ? (1 - p) * 0.9 : 0, transform: `scale(${1 + p * 2.2})`, zIndex: 94 }} />
);

const CardFace = ({ i, hours, glow = 0, style }: { i: number; hours: number | string; glow?: number; style?: CSSProperties }) => {
  const r = ROLES[i];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", backgroundImage: `url(${staticFile(`assets/v3/${r.art}.jpg`)})`, backgroundSize: "cover", backgroundPosition: "right center", ...style }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(7,11,19,.9) 0%,rgba(7,11,19,.58) 44%,rgba(7,11,19,.04) 82%)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: r.color }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${28 * glow}px ${r.color}`, opacity: glow }} />
      <div style={{ position: "absolute", left: 18, top: 14, display: "flex", alignItems: "center", gap: 7, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: "#d9e2f2" }}><Logo size={16} />SPREAD</div>
      <div style={{ position: "absolute", left: 18, top: 34, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: r.name.length > 8 ? 26 : 31, color: "#fff", whiteSpace: "nowrap" }}>{r.name}</div>
      <div style={{ position: "absolute", right: 14, top: 14, padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, color: "#071018", background: r.color }}>{hours}h</div>
    </div>
  );
};


/* ================= OPENING: STORM -> FREEZE -> SNAP-GRID -> STAMP ================= */
// Beat grid measured from the v7 score: kick(n) = 0.476 + n * 60/116.
const FREEZE = 2.028;      // beat 3  : world freezes (bullet time)
const STAMP = 4.097;       // beat 7  : cards land, Spread stamps
const SNAP0 = 3.55;        //          : un-freeze, everything flies to the stack
const TF = 1.954;          // world time at the freeze
const rnd = (i: number, k: number) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const LABELS = ["Dentist · 2 pm", "Quarterly deck", "Dinner plans", "Call mum", "Gym · 6 am", "Expense report", "School pickup", "Review PR", "Groceries", "Invoice due", "Team lunch", "Oil change", "Soccer practice", "Pharmacy", "Rent due", "Haircut", "Vet · 4 pm", "Car wash", "Report cards", "Side hustle", "Choir rehearsal", "Night class"];
const DOTS = ["#34C759", "#FF9500", "#AF52DE", "#30B0C7", "#0A84FF"];
const NCH = 64;
const CARD_W = 358 * S, CARD_H = 150 * S;
const tau = (t: number) => (t < 1.88 ? t : t < FREEZE ? 1.88 + (FREEZE - 1.88) * (P(t, 1.88, FREEZE) - 0.5 * P(t, 1.88, FREEZE) ** 2) : TF + 0.03 * (t - FREEZE));
const jolt = (t: number, t0: number, amp: number) => (t < t0 ? 0 : amp * Math.exp(-(t - t0) * 13) * Math.cos((t - t0) * 52));

const orbit = (t: number) => {
  const o = io(P(t, FREEZE + 0.05, SNAP0 + 0.1)) * (1 - io(P(t, SNAP0, SNAP0 + 0.5)));
  return { ry: 30 * o, rx: 6 * o, dz: 90 * o };
};

const World = ({ t, children }: { t: number; children: React.ReactNode }) => {
  const { ry, rx, dz } = orbit(t);
  const j = jolt(t, 0.0, 22) + jolt(t, FREEZE, 26) + jolt(t, STAMP, 20);
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 1100, perspectiveOrigin: "50% 50%" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformStyle: "preserve-3d", transform: `translate3d(0, ${j}px, ${dz}px) rotateX(${rx}deg) rotateY(${ry}deg)` }}>{children}</div>
    </div>
  );
};

const Chip3D = ({ t, i, alpha = 1 }: { t: number; i: number; alpha?: number }) => {
  const label = LABELS[i % LABELS.length];
  const ang = rnd(i, 1) * Math.PI * 2, rad = 300 + rnd(i, 2) * 900;
  const bx = Math.cos(ang) * rad, by = Math.sin(ang) * rad * 1.35;
  const zf = i % 3 === 0 ? lerp(60, 300, rnd(i, 3)) : lerp(-1300, 300, Math.pow(rnd(i, 3), 0.8));
  const w = clamp(tau(t) / TF, 0, 1.02);
  const z = zf - 1700 * Math.pow(1 - w, 1.7);
  const rz = (rnd(i, 4) - 0.5) * 70 + (rnd(i, 5) - 0.5) * 55 * w;
  const rY = (rnd(i, 6) - 0.5) * 80 * (1 - 0.55 * w);
  const rX = (rnd(i, 7) - 0.5) * 36;
  // snap flight to the card stack
  const role = i % 4;
  const tx = sx(16) + CARD_W / 2 - 540, ty = sy(248 + role * 92) + CARD_H / 2 - 960;
  const t0 = SNAP0 + 0.12 * rnd(i, 8);
  const fp = clamp((t - t0) / (STAMP - 0.02 - t0));
  const f = Math.pow(fp, 2.3);
  const px = lerp(bx, tx, f), py = lerp(by, ty, f), pz = lerp(z, 0, f);
  const fade = (t > STAMP - 0.02 ? 0 : 1 - clamp((fp - 0.82) / 0.18)) * alpha;
  const col = DOTS[i % DOTS.length];
  return (
    <div style={{ position: "absolute", left: 540, top: 960, width: 500, height: 134, marginLeft: -250, marginTop: -67, padding: "0 36px", boxSizing: "border-box", background: C.sheet, borderRadius: 28, fontSize: 58, fontWeight: 580, letterSpacing: -1.5, color: C.ink, display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap",
      boxShadow: "0 16px 24px -14px rgba(60,40,10,.5)", opacity: fade, transform: `translate3d(${px}px, ${py}px, ${pz}px) rotateZ(${lerp(rz, 0, f)}deg) rotateY(${lerp(rY, 0, f)}deg) rotateX(${lerp(rX, 0, f)}deg) scale(${lerp(1, 1.18, f)})` }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, background: col, flex: "none" }} />{label}
    </div>
  );
};

const Slam = ({ t, t0, children, style, z = 0, y }: { t: number; t0: number; children: React.ReactNode; style?: CSSProperties; z?: number; y: number }) => {
  const p = clamp((t - t0) / 0.17);
  const e = Easing.bezier(0.2, 0.9, 0.2, 1)(p);
  const s = lerp(2.9, 1, e);
  const jit = t > t0 && t < t0 + 0.3 ? Math.sin((t - t0) * 140) * 7 * (1 - (t - t0) / 0.3) : 0;
  return (
    <div style={{ position: "absolute", left: 0, width: 1080, top: y, textAlign: "center", opacity: t >= t0 ? 1 : 0, filter: `blur(${(1 - e) * 16}px)`, transform: `translate3d(${jit}px, 0, ${z}px) scale(${s})`, transformOrigin: "50% 50%", ...style }}>{children}</div>
  );
};

const StormText = ({ t }: { t: number }) => {
  const back1 = io(P(t, FREEZE, FREEZE + 0.35));         // phrase 1 recedes when the world freezes
  const out1 = 1 - io(P(t, SNAP0, SNAP0 + 0.2));
  const fam = lerp(6, 0, io(P(t, 0.3, 1.9)));
  const big: CSSProperties = { fontSize: 330, fontWeight: 700, letterSpacing: -20, lineHeight: 0.9, color: C.ink };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out1 }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateZ(${-520 * back1}px)`, opacity: 1 - 0.55 * back1 }}>
        <Slam t={t} t0={0.0} y={300} style={big}>BUSY</Slam>
        <Slam t={t} t0={0.62} y={560} style={{ ...big, fontSize: 250 }}>ALL</Slam>
        <Slam t={t} t0={0.95} y={780} style={{ ...big, fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, letterSpacing: -10 }}>week.</Slam>
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1290, textAlign: "center", opacity: out(P(t, 0.25, 0.5)), transform: "translateZ(40px)" }}>
        <div style={{ fontSize: 30, fontWeight: 650, letterSpacing: 6, color: C.muted, textTransform: "uppercase" }}>Family this week</div>
        <div style={{ fontSize: 300, fontWeight: 640, letterSpacing: -16, lineHeight: 1, color: "#AF52DE" }}>{Math.max(0, Math.round(fam))}h</div>
      </div>
    </div>
  );
};

const Phrase2 = ({ t }: { t: number }) => {
  if (t < FREEZE + 0.05 || t > SNAP0 + 0.25) return null;
  const out1 = 1 - io(P(t, SNAP0, SNAP0 + 0.22));
  const mid: CSSProperties = { fontSize: 156, fontWeight: 640, letterSpacing: -8, color: C.ink, textShadow: "0 0 26px rgba(246,241,231,.95), 0 0 8px rgba(246,241,231,.9)" };
  const sway = Math.sin((t - FREEZE) * 1.4) * 2.2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out1, perspective: 1300, zIndex: 40, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, transform: `rotateY(${sway}deg)` }}>
        <Slam t={t} t0={FREEZE + 0.08} y={960} style={mid}>Still no room</Slam>
        <Slam t={t} t0={FREEZE + 0.62} y={1120} style={{ ...mid, fontSize: 120, color: C.muted }}>for what</Slam>
        <Slam t={t} t0={FREEZE + 1.12} y={1215} style={{ ...mid, fontSize: 230, fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, letterSpacing: -10 }}>matters.</Slam>
      </div>
    </div>
  );
};

const StampFX = ({ t }: { t: number }) => {
  if (t < STAMP - 0.02 || t > STAMP + 1.5) return null;
  const k = t - STAMP;
  const ring = clamp(k / 0.55), ring2 = clamp((k - 0.08) / 0.7);
  const icon = back(P(k, 0, 0.28));
  const iconTo = io(P(t, 4.55, 5.25));
  const ix = lerp(540, sx(32), iconTo), iy = lerp(640, sy(77), iconTo), isz = lerp(250, 46, iconTo);
  const rays = 1 - clamp(k / 0.5);
  return (
    <>
      <div style={{ position: "absolute", left: 540, top: 800, width: 1, height: 1, zIndex: 30 }}>
        <div style={{ position: "absolute", left: -1400 * ring, top: -1400 * ring, width: 2800 * ring, height: 2800 * ring, borderRadius: "50%", border: `${14 * (1 - ring)}px solid rgba(255,255,255,${0.9 * (1 - ring)})`, boxShadow: `0 0 80px rgba(10,132,255,${0.6 * (1 - ring)})` }} />
        <div style={{ position: "absolute", left: -1000 * ring2, top: -1000 * ring2, width: 2000 * ring2, height: 2000 * ring2, borderRadius: "50%", border: `${8 * (1 - ring2)}px solid rgba(10,132,255,${0.7 * (1 - ring2)})` }} />
        <div style={{ position: "absolute", left: -1100, top: -1100, width: 2200, height: 2200, opacity: rays * 0.9, background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.55) 0deg 4deg, rgba(255,255,255,0) 4deg 18deg)", WebkitMaskImage: "radial-gradient(circle, #000 0, transparent 62%)", maskImage: "radial-gradient(circle, #000 0, transparent 62%)", transform: `rotate(${k * 30}deg)` }} />
      </div>
      <Img src={staticFile("assets/app-icon-spread-cards-square.svg")} style={{ position: "absolute", left: ix - isz / 2, top: iy - isz / 2, width: isz, height: isz, borderRadius: isz * 0.24, zIndex: 31, transform: `scale(${0.3 + 0.7 * icon})`, opacity: clamp(icon * 3) * (1 - clamp((t - 5.2) / 0.1)), boxShadow: `0 ${30 * (1 - iconTo)}px ${70 * (1 - iconTo)}px -10px rgba(10,60,140,.7)` }} />
    </>
  );
};

/* the four Life cards, flat, exactly where the phone's cards sit */
const LandingCards = ({ t }: { t: number }) => {
  if (t < STAMP - 0.45 || t > 4.6) return null;
  const sweep = clamp((t - STAMP) / 0.5);
  return (
    <>
      {ROLES.map((r, i) => {
        const a = clamp((t - (STAMP - 0.25 - 0.03 * (3 - i))) / 0.14);
        const pop = t >= STAMP ? 1 + 0.035 * Math.exp(-(t - STAMP) * 16) : 1;
        return (
          <div key={r.name} style={{ position: "absolute", left: sx(16), top: sy(248 + i * 92), width: CARD_W, height: CARD_H, borderRadius: 22 * S, overflow: "hidden", opacity: a, zIndex: 10 + i, transform: `scale(${pop})`, transformOrigin: "50% 50%" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 358, height: 150, transformOrigin: "0 0", transform: `scale(${S})` }}><CardFace i={i} hours={r.hours} /></div>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${-30 + sweep * 160}%`, width: "26%", background: "linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent)", opacity: sweep > 0 && sweep < 1 ? 1 : 0, transform: "skewX(-18deg)" }} />
          </div>
        );
      })}
    </>
  );
};

/* ================= phone screens ================= */
const PhoneScreen = ({ t }: { t: number }) => {
  /* --- HOURS state --- */
  const steps = [13.55, 13.95, 14.3, 14.6]; // hold arrow: 6 -> 8 in 0.5 h steps (accelerating)
  const famHours = 6 + 0.5 * steps.reduce((n, s) => n + out(P(t, s, s + 0.16)), 0);
  const hrs = [ROLES[0].hours, famHours, ROLES[2].hours, ROLES[3].hours];
  const total = hrs.reduce((a, b) => a + b, 0);
  const fmt = (n: number) => (Number.isInteger(Math.round(n * 2) / 2) ? `${Math.round(n * 2) / 2}` : `${Math.round(n * 2) / 2}`);
  const famShown = Math.round(famHours * 2) / 2;
  const totalShown = Math.round(total * 2) / 2;

  /* --- LIFE focus --- */
  const intro = out(P(t, 4.4, 5.0));
  const focus = out(P(t, 8.55, 9.25)) * (1 - io(P(t, 10.0, 10.7)));
  const tasksOpen = out(P(t, 9.7, 10.1)) * (1 - io(P(t, 10.0, 10.5)));
  const wtIn = out(P(t, 10.2, 10.8));
  const lifeAlpha = t >= FLIP_SWAP ? 0 : 1;
  const hide = focus > 0.001 ? 1 : 0;

  /* weekly time expansion (Adjust hours) */
  const wtExp = io(P(t, 11.7, 12.3)) * (1 - io(P(t, 16.1, 16.7)));
  const wtH = lerp(130, 330, wtExp);

  const wtTop = 104;
  const stackTop = wtTop + wtH + 14;
  const cardsOn = t >= 4.0;
  const hoverGlow = (i: number) => pulse(t, [5.131, 5.648, 6.683, 7.2][i] ?? 0, 0.3);

  /* --- WEEK state --- */
  const toWeek = t >= FLIP_SWAP ? 1 : 0;
  const dayIn = out(P(t, 19.0, 19.35));
  const calOut = 1 - dayIn;
  const selFri = out(P(t, 18.9, 19.0));
  const famCardSel = out(P(t, 19.78, 20.15));
  const focusCard = out(P(t, 20.5, 20.9));
  const reserved = t >= 19.8 ? 1 : 0;
  const addOpen = out(P(t, 21.55, 21.85)) * (1 - out(P(t, 22.62, 22.85)));
  const typed = clamp(P(t, 21.85, 22.5));
  const taskIn = out(P(t, 22.62, 22.95));
  const checked = out(P(t, 23.25, 23.5));
  const undoRow = out(P(t, 23.55, 23.9)) * (1 - io(P(t, 24.3, 24.7)));
  const text = "Plan dinner";

  return (
    <div style={{ position: "absolute", left: 14, top: 14, width: 390, height: 844, borderRadius: 52, background: NAVY, overflow: "hidden", color: CREAM, fontSize: 14 }}>
      <div style={{ position: "absolute", left: 135, top: 11, width: 120, height: 34, borderRadius: 20, background: "#000", zIndex: 50 }} />
      <div style={{ position: "absolute", left: 18, right: 18, top: 60, height: 34, display: "flex", alignItems: "center", gap: 9, fontSize: 18, fontWeight: 620, letterSpacing: -0.4, zIndex: 30, opacity: intro }}>
        <Logo size={28} />Spread
        <div style={{ marginLeft: "auto", width: 34, height: 34, borderRadius: 17, background: "#1A2740", display: "flex", alignItems: "center", justifyContent: "center", color: "#9db2d6" }}>···</div>
      </div>

      {/* ============ LIFE ============ */}
      <div style={{ position: "absolute", inset: 0, opacity: lifeAlpha, transform: `translateX(${-30 * toWeek}px)`, display: toWeek >= 1 ? "none" : "block" }}>
        {/* Weekly Time card (hidden while a card is focused, as in the app) */}
        <div style={{ position: "absolute", left: 16, width: 358, top: wtTop, height: wtH, borderRadius: 22, background: "#16233B", boxShadow: `0 0 0 1px #243556 inset, 0 0 ${46 * Math.max(...steps.map((q) => pulse(t, q + 0.06, 0.28)))}px ${ROLES[FAM].color}`, overflow: "hidden", zIndex: 20, opacity: Math.min(intro, hide ? 1 - focus : 1) * (t < 10.0 ? 1 : wtIn), transform: `translateY(${(1 - intro) * 20}px)` }}>
          <div style={{ position: "absolute", left: 18, top: 16, fontSize: 10.5, fontWeight: 650, letterSpacing: 1.5, color: "#8FA3C4" }}>WEEKLY TIME</div>
          <div style={{ position: "absolute", left: 18, top: 30, fontSize: 28, fontWeight: 620, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>{fmt(totalShown)}h<span style={{ fontSize: 14, fontWeight: 500, color: "#8FA3C4", marginLeft: 6, letterSpacing: 0 }}>of {CAP}h</span></div>
          <div style={{ position: "absolute", left: 18, right: 18, top: 68, height: 26, borderRadius: 9, overflow: "hidden", display: "flex", background: "repeating-linear-gradient(135deg,#24324d 0 3px,#1a2740 3px 7px)", boxShadow: wtExp > 0.5 ? `0 0 0 2px ${ROLES[FAM].color}` : "none" }}>
            {ROLES.map((r, i) => {
              const v = i === FAM ? famHours : hrs[i];
              const px = (v / CAP) * 322;
              return <div key={r.name} style={{ width: `${(v / CAP) * 100}%`, background: r.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#06210f", overflow: "hidden", whiteSpace: "nowrap", filter: i === FAM && wtExp > 0.5 ? "brightness(1.12)" : undefined }}>{px > 34 ? `${i === FAM ? fmt(famShown) : hrs[i]}h` : ""}</div>;
            })}
          </div>
          {steps.map((q, k) => { const u = P(t, q, q + 0.65); return u > 0 && u < 1 ? <div key={k} style={{ position: "absolute", right: 26, top: 40 - u * 30, fontSize: 24, fontWeight: 800, color: "#e8c4ff", opacity: 1 - u, textShadow: "0 0 18px #AF52DE", transform: `scale(${1 + 0.35 * (1 - u)})`, zIndex: 5 }}>+0.5h</div> : null; })}
          <div style={{ position: "absolute", left: 18, top: 104, fontSize: 12, color: "#8FA3C4", fontVariantNumeric: "tabular-nums" }}>{fmt(CAP - totalShown)}h available</div>
          <div style={{ position: "absolute", right: 18, top: 104, fontSize: 12.5, fontWeight: 600, color: C.blue }}>{wtExp > 0.5 ? "Adjust hours ⌃" : "Adjust hours ⌄"}</div>
          {/* expanded: role chips + arrow value control for the selected role */}
          <div style={{ position: "absolute", left: 18, right: 18, top: 134, opacity: wtExp }}>
            <div style={{ display: "flex", gap: 6 }}>
              {ROLES.map((r, i) => {
                const sel = i === FAM && t >= 12.45;
                return <div key={r.name} style={{ flex: 1, height: 34, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11, fontWeight: 640, background: sel ? "#27406a" : "#1B2B47", boxShadow: sel ? `0 0 0 1.5px ${r.color}` : "none", whiteSpace: "nowrap" }}><span style={{ width: 7, height: 7, borderRadius: 4, background: r.color }} />{r.name === "Personal Goals" ? "Goals" : r.name}</div>;
              })}
            </div>
            <div style={{ marginTop: 14, fontSize: 17, fontWeight: 640 }}>Family</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, borderRadius: 18, background: "#101D34", boxShadow: "0 0 0 1px #1f3050 inset", padding: "0 12px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: "#1F3050", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#cfe0ff" }}>‹</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 680, fontVariantNumeric: "tabular-nums", letterSpacing: -1, color: steps.some((s) => Math.abs(t - s - 0.08) < 0.2) ? "#e2b8fb" : CREAM, transform: `scale(${1 + 0.12 * Math.max(...steps.map((s) => pulse(t, s + 0.08, 0.2)))})` }}>{fmt(famShown)}h</div>
                <div style={{ fontSize: 10.5, color: "#8FA3C4" }}>This week</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: t > 13.4 && t < 14.9 ? "#2f4a7c" : "#1F3050", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#cfe0ff" }}>›</div>
            </div>
          </div>
        </div>

        {/* wallet stack */}
        {cardsOn ? ROLES.map((r, i) => {
          const isFam = i === FAM;
          const appear = 1;
          const top = isFam ? lerp(stackTop + i * 92, 104 + 4, focus) : lerp(stackTop + i * 92, stackTop + i * 92 + 560, focus);
          return (
            <div key={r.name} style={{ position: "absolute", left: 16, width: 358, height: 150, top, borderRadius: 22, overflow: "hidden", zIndex: 10 + i, opacity: (isFam ? 1 : 1 - focus * 0.95) * (focus > 0.01 || t > 5.1 ? appear : 0), transform: `translateY(${(1 - appear) * 70}px) scale(${isFam ? 1 + 0.02 * focus : 1})`, boxShadow: isFam && focus > 0.05 ? `0 0 ${34 * focus}px ${3 * focus}px ${r.color}66` : "0 0 0 1px rgba(255,255,255,.13) inset,0 -10px 24px -8px rgba(0,0,0,.55)" }}>
              <CardFace i={i} hours={i === FAM ? fmt(famShown) : r.hours} glow={hoverGlow(i)} />
            </div>
          );
        }) : null}

        {/* Details / Tasks buttons beneath the focused card (as in LifeRoot) + task rows */}
        <div style={{ position: "absolute", left: 16, width: 358, top: 104 + 4 + 150 + 14, opacity: focus, transform: `translateY(${(1 - focus) * 24}px)`, zIndex: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {[["Details", "≡"], ["Tasks", "☰"]].map(([lb, ic], k) => {
              const sel = k === 1 && t > 9.65;
              return <div key={lb} style={{ flex: 1, height: 48, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 640, background: sel ? "#101D34" : "#16233B", boxShadow: `0 0 0 ${sel ? 1.5 : 1}px ${sel ? C.blue : "#2a3d63"} inset` }}><span style={{ color: "#9db2d6" }}>{ic}</span>{lb}</div>;
            })}
          </div>
          <div style={{ marginTop: 14, borderRadius: 20, background: "#16233B", boxShadow: "0 0 0 1px #243556 inset", padding: "6px 12px", opacity: tasksOpen, transform: `translateY(${(1 - tasksOpen) * -14}px)` }}>
            {[["Plan dinner", "2h"], ["Put phones away", "30m"]].map(([lb, h], k) => (
              <div key={lb} style={{ height: 50, display: "flex", alignItems: "center", gap: 12, borderTop: k ? "1px solid #243556" : "none", fontSize: 15, fontWeight: 560 }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, boxShadow: `0 0 0 2px ${ROLES[FAM].color} inset` }} />{lb}<span style={{ marginLeft: "auto", color: "#8FA3C4", fontSize: 12 }}>{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ WEEK (layout follows the real Week screens) ============ */}
      <div style={{ position: "absolute", inset: 0, opacity: toWeek, display: toWeek > 0 ? "block" : "none" }}>
        {/* A: month calendar */}
        <div style={{ position: "absolute", inset: 0, opacity: calOut, display: dayIn >= 1 ? "none" : "block" }}>
          <div style={{ position: "absolute", left: 18, top: 98, fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>Your week</div>
          <div style={{ position: "absolute", left: 18, top: 138, fontSize: 12.5, color: "#8FA3C4" }}>One day at a time.</div>
          <div style={{ position: "absolute", right: 16, top: 104, height: 44, padding: "0 14px", borderRadius: 22, background: "#14305a", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 650 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>Plan Ahead
          </div>
          <div style={{ position: "absolute", left: 16, top: 172, width: 358, height: 372, borderRadius: 24, background: "linear-gradient(160deg,#122447,#0d1b36)", boxShadow: "0 0 0 1px #223250 inset" }}>
            <div style={{ position: "absolute", left: 18, top: 14, fontSize: 16, fontWeight: 650 }}>‹ &nbsp; November 2026 &nbsp; ›</div>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, c) => <div key={d} style={{ position: "absolute", left: 6 + c * 49, width: 49, top: 50, textAlign: "center", fontSize: 10.5, color: "#8FA3C4", fontWeight: 560 }}>{d}</div>)}
            {Array.from({ length: 42 }, (_, n) => {
              const r = Math.floor(n / 7), c = n % 7; const dnum = n < 6 ? 26 + n : n - 5 <= 30 ? n - 5 : n - 35;
              const cur = n >= 6 && n - 5 <= 30; const sel = (selFri > 0.5 ? dnum === 13 : dnum === 10) && cur;
              const dots = r >= 0 && cur && dnum <= 30 && dnum >= 9 ? ((dnum * 7) % 3) + (dnum > 15 ? 0 : 1) : 0;
              return (
                <div key={n} style={{ position: "absolute", left: 6 + c * 49, width: 49, top: 72 + r * 47, height: 44, display: "flex", flexDirection: "column", alignItems: "center", opacity: cur ? 1 : 0.35 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, background: sel ? C.blue : "transparent", boxShadow: dnum === 15 && cur ? `0 0 0 2px ${C.blue} inset` : "none", color: sel ? "#fff" : CREAM, transform: sel ? `scale(${1 + 0.18 * pulse(t, 18.95, 0.2)})` : "none" }}>{dnum}</div>
                  <div style={{ display: "flex", gap: 3, marginTop: 3 }}>{Array.from({ length: Math.min(2, dots) }, (_, q) => <span key={q} style={{ width: 4.5, height: 4.5, borderRadius: 3, background: ["#34C759", "#FFCC00", "#0A84FF"][(dnum + q) % 3] }} />)}</div>
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 18, bottom: 14, fontSize: 11.5, color: "#8FA3C4" }}>Choose a date to see its Life cards.</div>
          </div>
        </div>
        {/* B: day view with +1h circles */}
        <div style={{ position: "absolute", inset: 0, opacity: dayIn, display: dayIn > 0 ? "block" : "none" }}>
          <div style={{ position: "absolute", left: 18, top: 100 }}>
            <div style={{ fontSize: 12.5, color: "#8FA3C4" }}>November 13</div>
            <div style={{ fontSize: 28, fontWeight: 680, letterSpacing: -0.8 }}>Friday</div>
          </div>
          <div style={{ position: "absolute", right: 22, top: 112, display: "flex", gap: 22, fontSize: 26, color: CREAM }}><span>‹</span><span>›</span></div>
          <div style={{ position: "absolute", left: 16, top: 176, width: 358, display: "flex" }}>
            {ROLES.map((r, i) => {
              const pr = i === FAM ? pulse(t, 19.74, 0.22) : 0;
              return (
                <div key={r.name} style={{ width: 89.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, border: `3px solid ${r.color}`, background: i === FAM && t > 19.74 ? `${r.color}66` : `${r.color}22`, boxShadow: pr > 0 ? `0 0 ${34 * pr}px ${r.color}` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 650, color: i === FAM && t > 19.74 ? "#fff" : "#9db2d6", transform: `scale(${1 - 0.14 * pr})` }}>+1h</div>
                  <div style={{ fontSize: 11.5, color: "#8FA3C4", whiteSpace: "nowrap" }}>{r.name === "Personal Goals" ? "Goals" : r.name}</div>
                </div>
              );
            })}
          </div>
          {/* Family card for the day: strip, then collapses into a row when selected */}
          <div style={{ position: "absolute", left: 16, width: 358, top: 290, height: lerp(150, 56, focusCard), borderRadius: 22, overflow: "hidden", opacity: famCardSel, transform: `translateY(${(1 - famCardSel) * 30}px) scale(${0.96 + 0.04 * famCardSel})`, boxShadow: famCardSel > 0.5 ? `0 0 0 1.5px ${ROLES[FAM].color}, 0 0 28px ${ROLES[FAM].color}55` : "none" }}>
            <CardFace i={FAM} hours={reserved} />
            <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, display: "flex", gap: 4, opacity: 1 - focusCard }}>
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d, k) => {
                const on = k === 4 && reserved;
                return <div key={d} style={{ flex: 1, height: 40, borderRadius: 9, background: on ? "#f2f2f2" : "rgba(0,0,0,.55)", color: on ? "#111" : "#d8def0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5, transform: on ? `scale(${1 + 0.12 * pulse(t, 19.9, 0.25)})` : "none" }}><span>{d}</span><span style={{ fontSize: 12.5 }}>{on ? "1h" : "0h"}</span></div>;
              })}
            </div>
          </div>
          {/* selected role detail */}
          <div style={{ position: "absolute", left: 16, width: 358, top: 356, opacity: focusCard, transform: `translateY(${(1 - focusCard) * 16}px)` }}>
            <div style={{ borderRadius: 22, background: "#16233B", boxShadow: "0 0 0 1px #243556 inset", padding: "16px 16px 14px" }}>
              <div style={{ fontSize: 19, fontWeight: 650 }}>Family</div>
              <div style={{ fontSize: 13, color: "#8FA3C4", marginTop: 2, fontVariantNumeric: "tabular-nums" }}><span style={{ color: "#e2b8fb", fontWeight: 700 }}>{reserved} h</span> reserved for Friday</div>
              <div style={{ marginTop: 12, borderRadius: 16, background: "#101D34", overflow: "hidden" }}>
                <div style={{ height: 52 * taskIn, opacity: taskIn, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", fontSize: 15, fontWeight: 560, overflow: "hidden" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, boxShadow: `0 0 0 2px ${ROLES[FAM].color} inset`, background: checked > 0.5 ? ROLES[FAM].color : "transparent", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.3 * pulse(t, 23.3, 0.2)})` }}>{checked > 0.5 ? "✓" : ""}</span>
                  <span style={{ textDecoration: checked > 0.5 ? "line-through" : "none", color: checked > 0.5 ? "#8FA3C4" : CREAM }}>Plan dinner</span>
                  <span style={{ marginLeft: "auto", color: "#8FA3C4", fontSize: 12 }}>1h</span>
                </div>
                <div style={{ height: 50, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", fontSize: 14.5, color: addOpen > 0.5 ? CREAM : C.blue, fontWeight: 600 }}>
                  {addOpen > 0.5 ? (
                    <>
                      <span style={{ flex: 1, height: 34, borderRadius: 10, background: "#16233B", boxShadow: "0 0 0 1.5px #4a76c9 inset", padding: "0 10px", display: "flex", alignItems: "center" }}>
                        {typed > 0 && taskIn < 0.5 ? text.slice(0, Math.round(typed * text.length)) : taskIn >= 0.5 ? "" : <span style={{ color: "#6b7fa5", fontWeight: 500 }}>Task name</span>}
                        <span style={{ marginLeft: 1, color: C.blue, opacity: taskIn < 0.5 && Math.floor(t * 3) % 2 ? 0 : 1 }}>|</span>
                      </span>
                      <span style={{ height: 34, padding: "0 12px", borderRadius: 17, background: t > 22.5 && t < 22.8 ? "#2f66c8" : C.blue, color: "#fff", fontSize: 12.5, display: "flex", alignItems: "center" }}>Add task</span>
                    </>
                  ) : <>＋ Add a task</>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Undo / Redo row (native shows a single history row) */}
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 128, height: 46, borderRadius: 23, background: "#16233B", boxShadow: "0 0 0 1px #2a3d63 inset", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", gap: 26, fontSize: 14, fontWeight: 640, opacity: undoRow, transform: `translateY(${(1 - undoRow) * 16}px)` }}>
        <span style={{ color: C.blue }}>↶ Undo</span><span style={{ color: "#5d7096" }}>↷ Redo</span>
      </div>

      {/* dock */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 116, background: NAVY, borderTop: "1px solid #1d2c47", zIndex: 40, opacity: intro }}>
        <div style={{ position: "absolute", left: 16, top: 16, display: "flex", gap: 4, padding: 4, borderRadius: 18, background: "#16233B" }}>
          {["Life", "Week"].map((l, k) => {
            const on = k === 0 ? toWeek < 0.5 : toWeek >= 0.5;
            return <div key={l} style={{ width: 60, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 650, background: on ? C.blue : "transparent", color: on ? "#fff" : "#8FA3C4" }}>{l}</div>;
          })}
        </div>
        <div style={{ position: "absolute", left: 162, right: 16, top: 22, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", color: "#9db2d6", fontSize: 20 }}>
          <span>‹</span><div style={{ textAlign: "center" }}><div style={{ fontSize: 13.5, fontWeight: 620, color: CREAM }}>Nov 9</div><div style={{ fontSize: 10, color: "#8FA3C4" }}>Calendar week</div></div><span>›</span>
        </div>
      </div>

      {/* touches (logical coords) */}
      {(() => {
        const items: { x: number; y: number; o: number; press: number }[] = [];
        const rip: { x: number; y: number; p: number }[] = [];
        const famY = 104 + 130 + 14 + 92 + 40;
        // tap Family card (8.45), tap Tasks (9.6)
        if (t > 8.0 && t < 9.95) {
          const a = io(P(t, 8.0, 8.4));
          const x = t < 9.2 ? lerp(310, 200, a) : lerp(200, 285, io(P(t, 9.2, 9.55)));
          const y = t < 9.2 ? lerp(660, famY, a) : lerp(famY, 104 + 4 + 150 + 14 + 24, io(P(t, 9.2, 9.55)));
          items.push({ x, y, o: out(P(t, 8.0, 8.2)) * (1 - io(P(t, 9.75, 9.95))), press: Math.max(pulse(t, 8.47, 0.18), pulse(t, 9.62, 0.18)) });
          rip.push({ x: 200, y: famY, p: P(t, 8.47, 9.0) }, { x: 285, y: 104 + 4 + 150 + 14 + 24, p: P(t, 9.62, 10.1) });
        }
        // hours: Adjust hours (11.6), Family chip (12.45), hold arrow (13.4–14.9)
        if (t > 11.2 && t < 15.3) {
          let x = 330, y = 104 + 108;
          if (t < 12.0) { x = lerp(300, 330, io(P(t, 11.2, 11.55))); y = lerp(380, 212, io(P(t, 11.2, 11.55))); }
          else if (t < 13.3) { const a = io(P(t, 12.1, 12.4)); x = lerp(330, 150, a); y = lerp(212, 104 + 134 + 17, a); }
          else { const a = io(P(t, 13.0, 13.35)); x = lerp(150, 340, a); y = lerp(104 + 134 + 17, 104 + 134 + 34 + 14 + 24 + 8 + 4 + 32, a); }
          const hold = t > 13.4 && t < 14.9;
          items.push({ x, y, o: out(P(t, 11.2, 11.4)) * (1 - io(P(t, 14.9, 15.3))), press: hold ? 1 : Math.max(pulse(t, 11.58, 0.18), pulse(t, 12.47, 0.18)) });
          rip.push({ x: 330, y: 212, p: P(t, 11.58, 12.1) }, { x: 150, y: 104 + 134 + 17, p: P(t, 12.47, 13.0) });
        }
        // Week: tap toggle (17.15), tap Friday (18.9), tap Family (19.65), tap Plan 1 hour (20.45)
        if (t > 16.8 && t < 17.2) items.push({ x: 114, y: 774, o: out(P(t, 16.8, 16.9)) * (1 - io(P(t, 17.05, 17.2))), press: pulse(t, 16.97, 0.12) });
        if (t > 18.55 && t < 19.4) { const a = io(P(t, 18.55, 18.85)); items.push({ x: lerp(250, 246, a), y: lerp(560, 360, a), o: out(P(t, 18.55, 18.7)) * (1 - io(P(t, 19.2, 19.4))), press: pulse(t, 18.92, 0.15) }); rip.push({ x: 246, y: 360, p: P(t, 18.92, 19.4) }); }
        if (t > 19.4 && t < 20.05) { const a = io(P(t, 19.4, 19.68)); items.push({ x: lerp(280, 150, a), y: lerp(420, 202, a), o: out(P(t, 19.4, 19.5)) * (1 - io(P(t, 19.9, 20.05))), press: pulse(t, 19.74, 0.15) }); rip.push({ x: 150, y: 202, p: P(t, 19.74, 20.2) }); }
        if (t > 20.15 && t < 20.95) { const a = io(P(t, 20.15, 20.45)); items.push({ x: lerp(280, 195, a), y: lerp(560, 365, a), o: out(P(t, 20.15, 20.25)) * (1 - io(P(t, 20.7, 20.95))), press: pulse(t, 20.5, 0.15) }); }
        if (t > 21.3 && t < 22.0) { const a = io(P(t, 21.3, 21.55)); items.push({ x: lerp(250, 80, a), y: lerp(660, 455, a), o: out(P(t, 21.3, 21.4)) * (1 - io(P(t, 21.8, 22.0))), press: pulse(t, 21.6, 0.15) }); }
        if (t > 22.3 && t < 22.9) { const a = io(P(t, 22.3, 22.52)); items.push({ x: lerp(250, 340, a), y: lerp(660, 455, a), o: out(P(t, 22.3, 22.4)) * (1 - io(P(t, 22.7, 22.9))), press: pulse(t, 22.57, 0.15) }); }
        if (t > 23.0 && t < 23.7) { const a = io(P(t, 23.0, 23.25)); items.push({ x: lerp(200, 55, a), y: lerp(600, 456, a), o: out(P(t, 23.0, 23.1)) * (1 - io(P(t, 23.45, 23.7))), press: pulse(t, 23.3, 0.15) }); }
        return <>{items.map((it, k) => <Touch key={k} {...it} />)}{rip.map((r, k) => <Ripple key={k} {...r} />)}</>;
      })()}
    </div>
  );
};

/* ================= finale: the launch-event group photo ================= */
const GP: { i: number; x: number; y: number; rot: number; w: number; kind: "card" | "pill" | "circles" | "check" | "day" }[] = [
  { i: 0, x: 215, y: 300, rot: -6, w: 480, kind: "card" }, { i: 1, x: 865, y: 360, rot: 6, w: 480, kind: "card" },
  { i: 2, x: 205, y: 1690, rot: 5, w: 480, kind: "card" }, { i: 3, x: 870, y: 1640, rot: -5, w: 480, kind: "card" },
  { i: 0, x: 540, y: 1580, rot: 0, w: 520, kind: "circles" }, { i: 0, x: 140, y: 640, rot: -9, w: 240, kind: "day" },
  { i: 0, x: 905, y: 700, rot: 8, w: 330, kind: "check" }, { i: 0, x: 540, y: 120, rot: 0, w: 520, kind: "pill" },
];
const Finale = ({ t }: { t: number }) => {
  const reveal = io(P(t, 24.72, 25.25));
  if (reveal <= 0) return null;
  const crane = out(P(t, STAMP2, STAMP2 + 0.9));
  const light = t < STAMP2 ? 0 : t < STAMP2 + 0.25 ? (t - STAMP2) / 0.25 * 0.55 : 0.55 - 0.3 * P(t, STAMP2 + 0.25, STAMP2 + 1.1);
  const chars = "Spread.".split("");
  const tag = out(P(t, 26.25, 26.9));
  const cta = out(P(t, 27.1, 27.7));
  const flashIn = t >= STAMP2 ? 0.7 * Math.exp(-(t - STAMP2) * 14) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `circle(${2600 * reveal}px at 540px 1250px)` }}>
      <Base>
        <div style={{ position: "absolute", inset: 0, perspective: 1400 }}>
          <div style={{ position: "absolute", inset: 0, transform: `rotateX(${lerp(4, 0, crane)}deg) scale(${lerp(1.06, 1, crane)})` }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 40% at 50% 38%, rgba(255,226,160,${light}), transparent 70%)` }} />
            {GP.map((g, n) => {
              const t0 = 24.62 + n * 0.075;
              const p = clamp((t - t0) / 0.42);
              const e = Easing.bezier(0.34, 1.4, 0.44, 1)(p);
              const dx = (g.x < 540 ? -1 : 1) * 620 + (g.kind === "circles" || g.kind === "pill" ? 0 : 0), dy = g.y < 700 ? -520 : g.y > 1300 ? 520 : 0;
              const x = g.x + (1 - e) * dx, y = g.y + (1 - e) * dy;
              const land = p >= 1 ? Math.exp(-(t - (t0 + 0.42)) * 9) * 8 : 0;
              const blur = (1 - clamp(p * 1.6)) * 9;
              const dim = t > STAMP2 ? 1 - 0.1 * clamp((t - STAMP2) / 0.3) : 1;
              let inner: React.ReactNode = null;
              if (g.kind === "card") inner = <div style={{ width: 358, height: 150, transformOrigin: "0 0", transform: `scale(${g.w / 358})`, position: "relative", borderRadius: 22, overflow: "hidden" }}><CardFace i={g.i} hours={ROLES[g.i].hours} /></div>;
              if (g.kind === "circles") inner = <div style={{ display: "flex", gap: 22 }}>{ROLES.map((r) => <div key={r.name} style={{ width: 104, height: 104, borderRadius: 52, border: `5px solid ${r.color}`, background: `${r.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, color: C.ink }}>+1h</div>)}</div>;
              if (g.kind === "day") inner = <div style={{ padding: "18px 26px", borderRadius: 28, background: C.blue, color: "#fff", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Fri 13</div>;
              if (g.kind === "check") inner = <div style={{ padding: "20px 30px", borderRadius: 30, background: NAVY, color: CREAM, fontSize: 38, fontWeight: 600, display: "flex", alignItems: "center", gap: 18 }}><span style={{ width: 44, height: 44, borderRadius: 22, background: "#AF52DE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✓</span>Plan dinner</div>;
              if (g.kind === "pill") inner = <div style={{ width: 520, padding: "18px 26px", borderRadius: 26, background: NAVY, color: CREAM }}><div style={{ fontSize: 22, letterSpacing: 4, color: "#8FA3C4", fontWeight: 650 }}>WEEKLY TIME</div><div style={{ fontSize: 56, fontWeight: 650, letterSpacing: -2 }}>24h <span style={{ fontSize: 30, color: "#8FA3C4" }}>of 30h</span></div></div>;
              return (
                <div key={n} style={{ position: "absolute", left: x, top: y + land, transform: `translate(-50%,-50%) rotate(${lerp(g.rot * 2.2, g.rot, e)}deg) scale(${lerp(1.12, 1, e)})`, filter: `blur(${blur}px) saturate(${dim})`, opacity: clamp(p * 4) * dim, boxShadow: "0 40px 70px -26px rgba(40,30,10,.55)", borderRadius: 26 }}>{inner}</div>
              );
            })}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
              <Img src={staticFile("assets/app-icon-spread-cards-square.svg")} style={{ width: 250, height: 250, borderRadius: 58, transform: `scale(${0.5 + 0.5 * back(P(t, STAMP2 - 0.12, STAMP2 + 0.35))})`, opacity: clamp((t - STAMP2 + 0.12) * 8), boxShadow: "0 40px 80px -24px rgba(10,60,140,.55)" }} />
              <div style={{ display: "flex", marginTop: 40, height: 230 }}>
                {chars.map((ch, n) => { const q = P(t, STAMP2 + n * 0.035, STAMP2 + n * 0.035 + 0.3); const e = out(q); return <span key={n} style={{ display: "inline-block", fontSize: 220, fontWeight: 620, letterSpacing: -12, lineHeight: 1, color: ch === "." ? C.blue : C.ink, opacity: q > 0 ? 1 : 0, transform: `scale(${lerp(1.9, 1, e)}) translateY(${(1 - e) * -30}px)`, filter: `blur(${(1 - e) * 14}px)` }}>{ch}</span>; })}
              </div>
              <div style={{ fontSize: 100, fontWeight: 540, letterSpacing: -4.5, marginTop: 12, opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`, textAlign: "center", lineHeight: 1.06 }}>Make the Hours<br />Count</div>
              <div style={{ marginTop: 70, padding: "28px 60px", borderRadius: 999, background: C.ink, color: C.sheet, fontSize: 46, fontWeight: 620, letterSpacing: -0.6, opacity: cta, transform: `translateY(${(1 - cta) * 24}px) scale(${1 + 0.03 * pulse(t, 27.75, 0.35)})` }}>Spread for iPhone</div>
              <div style={{ marginTop: 30, fontSize: 40, color: C.muted, fontWeight: 580, opacity: cta }}>thespreadapp.com</div>
            </div>
            {Array.from({ length: 26 }, (_, n) => {
              const bx = rnd(n, 11) * 1080, by = 200 + rnd(n, 12) * 1500, sz = 3 + rnd(n, 13) * 2.6;
              const tw = 0.35 + 0.35 * Math.sin(t * (2 + rnd(n, 14) * 3) + n);
              return <div key={n} style={{ position: "absolute", left: bx + Math.sin(t * 0.7 + n) * 14, top: by - (t - 25) * 18 * (0.4 + rnd(n, 15)), width: sz, height: sz, borderRadius: "50%", background: "#E8B94A", boxShadow: "0 0 10px 2px rgba(232,185,74,.65)", opacity: (t > STAMP2 ? tw : 0) * clamp((t - STAMP2) / 0.6) }} />;
            })}
            <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flashIn, pointerEvents: "none" }} />
          </div>
        </div>
      </Base>
    </div>
  );
};

/* ================= film ================= */
const flipAngle = (t: number) => (t < 17.03 ? 0 : t < FLIP_SWAP ? io(P(t, 17.03, FLIP_SWAP)) * 90 : t < 17.85 ? -90 * (1 - out(P(t, FLIP_SWAP, 17.85))) : 0);

const Grain = () => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.22, mixBlendMode: "multiply", backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .3  0 0 0 0 .3  0 0 0 0 .3  0 0 0 .5 0'/></filter><rect width='260' height='260' filter='url(%23n)'/></svg>\")" }} />
);

export const SpreadV5Impact = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const navyR = 2600 * io(P(t, 3.62, 4.15));
  const sink = io(P(t, 24.0, 24.9));
  const c = cam(t);
  const camTx = c.tx - c.k * sx(c.fx);
  const camTy = c.ty - c.k * sy(c.fy);
  const ry = (c.ry ?? 0) + flipAngle(t);
  const rx = c.rx ?? 0;
  const phoneIn = t >= 4.1 && t < 25.0 ? out(P(t, 4.1, 4.45)) : 0;
  const trail = t < 2.1 || (t > 3.5 && t < 4.2);
  const chips = (
    <World t={t}>
      {trail ? Array.from({ length: NCH }, (_, i) => <Chip3D key={`g2${i}`} t={Math.max(0, t - 0.07)} i={i} alpha={0.16} />) : null}
      {trail ? Array.from({ length: NCH }, (_, i) => <Chip3D key={`g1${i}`} t={Math.max(0, t - 0.035)} i={i} alpha={0.3} />) : null}
      {Array.from({ length: NCH }, (_, i) => <Chip3D key={i} t={t} i={i} />)}
    </World>
  );
  const flash = t >= FREEZE ? 0.85 * (1 - clamp((t - FREEZE) / 0.16)) : t < 0.12 ? 0.9 * (1 - t / 0.12) : 0;

  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: "Spread, Arial, sans-serif", overflow: "hidden" }}>
      <Base><div /></Base>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 60% at 50% 45%, rgba(255,250,235,.0) 40%, rgba(90,60,20,.22) 100%)" }} />
      {t < 2.2 ? <div style={{ position: "absolute", inset: -300, opacity: 0.2 * (1 - P(t, 1.6, 2.1)), background: "repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,.9) 0deg 1.2deg, rgba(255,255,255,0) 1.2deg 7deg)", WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 18%, #000 70%)", maskImage: "radial-gradient(circle at 50% 50%, transparent 18%, #000 70%)", transform: `scale(${1 + t * 0.9}) rotate(${t * 3}deg)` }} /> : null}
      {t < 3.9 ? <World t={t}><StormText t={t} /></World> : null}

      <div style={{ position: "absolute", inset: 0, clipPath: `circle(${navyR}px at 540px 1200px)`, background: `radial-gradient(90% 55% at 50% 12%, ${NAVY2} 0%, #112342 45%, ${NAVY} 100%)` }} />

      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: `translate(${camTx}px, ${camTy + sink * 1500}px) scale(${c.k})`, opacity: phoneIn }}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${sx(c.fx)}px ${sy(c.fy)}px`, transform: `perspective(1900px) rotateY(${ry}deg) rotateX(${rx}deg)` }}>
          <div style={{ position: "absolute", left: PH_LEFT, top: PH_TOP, width: PH_W, height: PH_H, borderRadius: 66, background: "linear-gradient(160deg,#2c364b,#0c121e 40%,#1a2233)", transformOrigin: "0 0", transform: `scale(${S})`, boxShadow: `0 0 0 1.5px #3a4560 inset,0 60px 120px -20px rgba(0,0,0,.65),0 0 ${140 + 120 * Math.exp(-Math.max(0, t - STAMP) * 3)}px rgba(10,132,255,${0.2 + 0.3 * Math.exp(-Math.max(0, t - STAMP) * 3)})` }}>
            <PhoneScreen t={t} />
          </div>
        </div>
      </div>

      {t < 4.35 ? chips : null}
      <Phrase2 t={t} />
      <LandingCards t={t} />
      <StampFX t={t} />

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, background: `linear-gradient(to bottom, rgba(12,26,51,.97) 0, rgba(12,26,51,.9) 330px, rgba(12,26,51,0) 560px)`, opacity: clamp((c.k - 1.04) / 0.2) * (t > 4.5 && t < 24.6 ? 1 : 0), pointerEvents: "none" }} />
      <HeadLine t={t} a={4.2} b={6.15} tone="navy" kick="Responsibilities" lines={[[{ w: "Spread" }, { w: "starts" }], [{ w: "with" }, { w: "your" }, { w: "life.", em: true }]]} />
      <HeadLine t={t} a={10.35} b={16.4} tone="navy" kick="Hours" lines={[[{ w: "Give" }, { w: "each" }, { w: "one" }], [{ w: "real" }, { w: "hours.", em: true }]]} />
      <HeadLine t={t} a={17.6} b={19.0} tone="navy" kick="Week" lines={[[{ w: "Open" }, { w: "your" }], [{ w: "week.", em: true }]]} />
      <HeadLine t={t} a={19.1} b={21.7} tone="navy" lines={[[{ w: "An" }, { w: "hour" }, { w: "for" }], [{ w: "family", em: true }, { w: "on" }, { w: "Friday." }]]} />
      <HeadLine t={t} a={21.8} b={24.3} tone="navy" lines={[[{ w: "Add" }, { w: "dinner." }], [{ w: "Check" }, { w: "it" }, { w: "off.", em: true }]]} />

      <Finale t={t} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 55% at 50% 50%, transparent 55%, rgba(0,0,0,.32) 100%)", pointerEvents: "none", opacity: t > 3.6 && t < 25 ? 0.8 : 0 }} />
      <Grain />
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash, pointerEvents: "none" }} />
      <Audio src={staticFile("assets/v5/mix-v5.wav")} durationInFrames={30 * fps} premountFor={fps} volume={1} />
    </AbsoluteFill>
  );
};
