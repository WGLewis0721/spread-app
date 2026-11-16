/**
 * Spread — Make the Hours Count — V4 social cut (vertical 1080x1920, 30 fps, 900 frames).
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
import { Base, C, Hat } from "../../src/design";

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
type KF = { t: number; k: number; fx: number; fy: number; tx: number; ty: number };
const id = (t: number, fx: number, fy: number): KF => ({ t, k: 1, fx, fy, tx: sx(fx), ty: sy(fy) });
const KFS: KF[] = [
  id(0, 195, 430),
  id(6.7, 195, 430),
  { t: 7.9, k: 1.4, fx: 195, fy: 330, tx: 540, ty: 1010 },
  { t: 10.1, k: 1.4, fx: 195, fy: 330, tx: 540, ty: 1010 },
  { t: 11.0, k: 1.55, fx: 195, fy: 245, tx: 540, ty: 930 },
  { t: 16.2, k: 1.55, fx: 195, fy: 245, tx: 540, ty: 930 },
  { t: 17.5, k: 1.3, fx: 195, fy: 300, tx: 540, ty: 1030 },
  { t: 20.9, k: 1.3, fx: 195, fy: 360, tx: 540, ty: 1040 },
  { t: 22.1, k: 1.62, fx: 195, fy: 520, tx: 540, ty: 1010 },
  { t: 24.0, k: 1.62, fx: 195, fy: 520, tx: 540, ty: 1010 },
  id(24.9, 195, 430),
];
const cam = (t: number) => {
  let a = KFS[0], b = KFS[KFS.length - 1];
  for (let i = 0; i < KFS.length - 1; i++) {
    if (t >= KFS[i].t && t <= KFS[i + 1].t) { a = KFS[i]; b = KFS[i + 1]; break; }
  }
  if (t <= KFS[0].t) return KFS[0];
  if (t >= KFS[KFS.length - 1].t) return KFS[KFS.length - 1];
  const e = io((t - a.t) / Math.max(0.001, b.t - a.t));
  return { t, k: lerp(a.k, b.k, e), fx: lerp(a.fx, b.fx, e), fy: lerp(a.fy, b.fy, e), tx: lerp(a.tx, b.tx, e), ty: lerp(a.ty, b.ty, e) };
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

/* ================= HOOK (paper) ================= */
const CHIPS: [string, string, number, number, number][] = [
  ["Dentist · 2 pm", "#FF9500", -6, 90, 830], ["Quarterly deck", "#34C759", 4, 520, 900], ["Dinner plans", "#AF52DE", -3, 70, 1000],
  ["Call mum", "#AF52DE", 5, 600, 1060], ["Gym · 6 am", "#30B0C7", -5, 140, 1130], ["Expense report", "#34C759", 3, 470, 1180],
  ["School pickup", "#FF9500", -4, 60, 1240], ["Review PR", "#34C759", 6, 620, 1290], ["Groceries", "#FF9500", -2, 300, 1330], ["Invoice due", "#34C759", -5, 560, 1380],
];
const Hook = ({ t }: { t: number }) => {
  const landed = clamp((t - 0.35) / 2.6);
  const work = lerp(10, 26, io(landed)); // Work swallows the week
  const fam = lerp(6, 0, io(landed));
  const rest = lerp(14, 4, io(landed)); // others compress
  const tot = work + fam + rest;
  const segs = [[work, "#34C759"], [fam, "#AF52DE"], [rest / 2, "#30B0C7"], [rest / 2, "#0A84FF"]] as const;
  const exit = io(P(t, 3.7, 4.5));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - exit, transform: `translateY(${exit * 220}px)` }}>
      <div style={{ position: "absolute", left: 80, top: 650, fontSize: 28, fontWeight: 650, letterSpacing: 5, color: C.muted, textTransform: "uppercase", opacity: out(P(t, 0.3, 0.8)) }}>Family this week</div>
      <div style={{ position: "absolute", left: 76, top: 690, fontSize: 210, fontWeight: 600, letterSpacing: -12, lineHeight: 1, color: "#AF52DE", opacity: out(P(t, 0.3, 0.8)) }}>{Math.round(fam)}h</div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 940, height: 54, borderRadius: 18, overflow: "hidden", display: "flex", background: "#E5DDCC", opacity: out(P(t, 0.3, 0.8)) }}>
        {segs.map(([v, c], i) => <div key={i} style={{ width: `${(v / tot) * 100}%`, background: c }} />)}
      </div>
      {CHIPS.map(([lb, col, rot, x, y], i) => {
        const t0 = 0.5 + i * 0.26;
        const p = clamp((t - t0) / 0.6);
        const fall = 1 - back(p);
        return (
          <div key={lb} style={{ position: "absolute", left: 0, top: 0, padding: "22px 34px", background: C.sheet, borderRadius: 24, fontSize: 40, fontWeight: 540, letterSpacing: -1, color: C.ink, display: "flex", gap: 18, alignItems: "center", whiteSpace: "nowrap", boxShadow: "0 2px 0 rgba(0,0,0,.04),0 18px 36px -12px rgba(60,40,10,.35),0 0 0 1px rgba(60,40,10,.07)", opacity: p > 0 ? 1 : 0, transform: `translate(${x}px,${y + 90 - fall * 1100}px) rotate(${rot}deg)` }}>
            <span style={{ width: 18, height: 18, borderRadius: 9, background: col }} />{lb}
          </div>
        );
      })}
    </div>
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
  const intro = out(P(t, 4.95, 5.6));
  const focus = out(P(t, 8.55, 9.25)) * (1 - io(P(t, 10.0, 10.7)));
  const tasksOpen = out(P(t, 9.7, 10.1)) * (1 - io(P(t, 10.0, 10.5)));
  const wtIn = out(P(t, 10.2, 10.8));
  const lifeAlpha = 1 - io(P(t, 17.2, 17.8));
  const hide = focus > 0.001 ? 1 : 0;

  /* weekly time expansion (Adjust hours) */
  const wtExp = io(P(t, 11.7, 12.3)) * (1 - io(P(t, 16.1, 16.7)));
  const wtH = lerp(130, 330, wtExp);

  const wtTop = 104;
  const stackTop = wtTop + wtH + 14;
  const cardsOn = t >= 5.1;
  const hoverGlow = (i: number) => (i === 0 ? pulse(t, 5.95, 0.5) : i === 1 ? pulse(t, 6.8, 0.45) : i === 2 ? pulse(t, 7.75, 0.45) : 0);

  /* --- WEEK state --- */
  const toWeek = io(P(t, 17.3, 18.1));
  const selFri = out(P(t, 18.95, 19.35));
  const famCardSel = out(P(t, 19.7, 20.1));
  const reserved = t >= 20.9 ? 1 : 0;
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
        <div style={{ position: "absolute", left: 16, width: 358, top: wtTop, height: wtH, borderRadius: 22, background: "#16233B", boxShadow: "0 0 0 1px #243556 inset", overflow: "hidden", zIndex: 20, opacity: Math.min(intro, hide ? 1 - focus : 1) * (t < 10.0 ? 1 : wtIn), transform: `translateY(${(1 - intro) * 20}px)` }}>
          <div style={{ position: "absolute", left: 18, top: 16, fontSize: 10.5, fontWeight: 650, letterSpacing: 1.5, color: "#8FA3C4" }}>WEEKLY TIME</div>
          <div style={{ position: "absolute", left: 18, top: 30, fontSize: 28, fontWeight: 620, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>{fmt(totalShown)}h<span style={{ fontSize: 14, fontWeight: 500, color: "#8FA3C4", marginLeft: 6, letterSpacing: 0 }}>of {CAP}h</span></div>
          <div style={{ position: "absolute", left: 18, right: 18, top: 68, height: 26, borderRadius: 9, overflow: "hidden", display: "flex", background: "repeating-linear-gradient(135deg,#24324d 0 3px,#1a2740 3px 7px)", boxShadow: wtExp > 0.5 ? `0 0 0 2px ${ROLES[FAM].color}` : "none" }}>
            {ROLES.map((r, i) => {
              const v = i === FAM ? famHours : hrs[i];
              const px = (v / CAP) * 322;
              return <div key={r.name} style={{ width: `${(v / CAP) * 100}%`, background: r.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#06210f", overflow: "hidden", whiteSpace: "nowrap", filter: i === FAM && wtExp > 0.5 ? "brightness(1.12)" : undefined }}>{px > 34 ? `${i === FAM ? fmt(famShown) : hrs[i]}h` : ""}</div>;
            })}
          </div>
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
          const appear = out(P(t, 5.1 + i * 0.12, 5.8 + i * 0.12));
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

      {/* ============ WEEK ============ */}
      <div style={{ position: "absolute", inset: 0, opacity: toWeek, transform: `translateX(${(1 - toWeek) * 40}px)`, display: toWeek > 0 ? "block" : "none" }}>
        <div style={{ position: "absolute", left: 16, top: 106, width: 358, display: "flex", gap: 6 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
            const sel = i === 4 && selFri > 0.5;
            return <div key={i} style={{ flex: 1, height: 62, borderRadius: 16, background: sel ? C.blue : "#16233B", boxShadow: sel ? "none" : "0 0 0 1px #243556 inset", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: sel ? "#fff" : CREAM }}>
              <span style={{ fontSize: 10, color: sel ? "#dbeaff" : "#8FA3C4", fontWeight: 650 }}>{d}</span><span style={{ fontSize: 17, fontWeight: 650 }}>{9 + i}</span>
            </div>;
          })}
        </div>
        <div style={{ position: "absolute", left: 18, top: 184 }}>
          <div style={{ fontSize: 12, color: "#8FA3C4" }}>November {selFri > 0.5 ? 13 : 9}</div>
          <div style={{ fontSize: 24, fontWeight: 640, letterSpacing: -0.6 }}>{selFri > 0.5 ? "Friday" : "Monday"}</div>
        </div>
        {/* compact role cards for the day */}
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: 16, width: 358, height: 56, top: 236 + i * 62, borderRadius: 16, overflow: "hidden", opacity: i === FAM ? 1 : lerp(1, 0.55, famCardSel), boxShadow: i === FAM && famCardSel > 0.5 ? `0 0 0 2px ${ROLES[FAM].color},0 0 24px ${ROLES[FAM].color}55` : "0 0 0 1px rgba(255,255,255,.12) inset", backgroundImage: `url(${staticFile(`assets/v3/${ROLES[i].art}.jpg`)})`, backgroundSize: "cover", backgroundPosition: "right 35%" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(7,11,19,.92) 0%,rgba(7,11,19,.6) 46%,rgba(7,11,19,.05) 85%)" }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: ROLES[i].color }} />
            <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, display: "flex", alignItems: "center", fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 24, color: "#fff" }}>{ROLES[i].name}</div>
            <div style={{ position: "absolute", right: 12, top: 15, padding: "3px 9px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, color: "#071018", background: ROLES[i].color }}>{i === FAM ? fmt(famShown) : ROLES[i].hours}h</div>
          </div>
        ))}
        {/* selected role detail */}
        <div style={{ position: "absolute", left: 16, width: 358, top: 236 + 3 * 62 + 6, opacity: famCardSel, transform: `translateY(${(1 - famCardSel) * 20}px)` }}>
          <div style={{ borderRadius: 22, background: "#16233B", boxShadow: "0 0 0 1px #243556 inset", padding: "16px 16px 14px" }}>
            <div style={{ fontSize: 19, fontWeight: 650 }}>Family</div>
            <div style={{ fontSize: 13, color: "#8FA3C4", marginTop: 2, fontVariantNumeric: "tabular-nums" }}><span style={{ color: reserved ? "#e2b8fb" : "#8FA3C4", fontWeight: reserved ? 700 : 500, display: "inline-block", transform: `scale(${1 + 0.25 * pulse(t, 21.0, 0.3)})` }}>{reserved} h</span> reserved for Friday</div>
            <div style={{ marginTop: 12, height: 44, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 640, color: C.blue, background: t > 20.2 && t < 20.7 ? "#1d3560" : "#101D34", boxShadow: `0 0 0 1px ${C.blue}66 inset` }}>＋ Plan 1 hour of Family on Friday</div>
            {/* tasks */}
            <div style={{ marginTop: 12, borderRadius: 16, background: "#101D34", overflow: "hidden" }}>
              <div style={{ height: 52 * taskIn, opacity: taskIn, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", fontSize: 15, fontWeight: 560, overflow: "hidden" }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, boxShadow: `0 0 0 2px ${ROLES[FAM].color} inset`, background: checked > 0.5 ? ROLES[FAM].color : "transparent", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.25 * pulse(t, 23.3, 0.2)})` }}>{checked > 0.5 ? "✓" : ""}</span>
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
        if (t > 17.0 && t < 17.45) items.push({ x: 114, y: 774, o: out(P(t, 17.0, 17.1)) * (1 - io(P(t, 17.25, 17.45))), press: pulse(t, 17.15, 0.15) });
        if (t > 18.55 && t < 19.4) { const a = io(P(t, 18.55, 18.85)); items.push({ x: lerp(250, 40 + 4 * 51, a), y: lerp(420, 137, a), o: out(P(t, 18.55, 18.7)) * (1 - io(P(t, 19.2, 19.4))), press: pulse(t, 18.92, 0.15) }); rip.push({ x: 40 + 4 * 51, y: 137, p: P(t, 18.92, 19.4) }); }
        if (t > 19.4 && t < 20.2) { const a = io(P(t, 19.4, 19.65)); items.push({ x: lerp(250, 200, a), y: lerp(430, 236 + 62 + 28, a), o: out(P(t, 19.4, 19.5)) * (1 - io(P(t, 19.95, 20.2))), press: pulse(t, 19.7, 0.15) }); }
        if (t > 20.1 && t < 21.0) { const a = io(P(t, 20.1, 20.4)); items.push({ x: lerp(250, 200, a), y: lerp(560, 522, a), o: out(P(t, 20.1, 20.2)) * (1 - io(P(t, 20.7, 20.95))), press: pulse(t, 20.5, 0.15) }); }
        // quick add: tap Add a task (21.5), tap Add task (22.55)
        if (t > 21.3 && t < 22.0) { const a = io(P(t, 21.3, 21.55)); items.push({ x: lerp(250, 80, a), y: lerp(640, 581, a), o: out(P(t, 21.3, 21.4)) * (1 - io(P(t, 21.8, 22.0))), press: pulse(t, 21.6, 0.15) }); }
        if (t > 22.3 && t < 22.9) { const a = io(P(t, 22.3, 22.52)); items.push({ x: lerp(250, 320, a), y: lerp(660, 581, a), o: out(P(t, 22.3, 22.4)) * (1 - io(P(t, 22.7, 22.9))), press: pulse(t, 22.57, 0.15) }); }
        // check it off (23.25)
        if (t > 23.0 && t < 23.7) { const a = io(P(t, 23.0, 23.25)); items.push({ x: lerp(200, 55, a), y: lerp(560, 582, a), o: out(P(t, 23.0, 23.1)) * (1 - io(P(t, 23.45, 23.7))), press: pulse(t, 23.3, 0.15) }); }
        return <>{items.map((it, k) => <Touch key={k} {...it} />)}{rip.map((r, k) => <Ripple key={k} {...r} />)}</>;
      })()}
    </div>
  );
};

/* ================= paper role blocks that become Life cards (4.1–5.2) ================= */
const MorphBlocks = ({ t }: { t: number }) => {
  if (t < 3.7 || t >= 5.15) return null;
  const m = io(P(t, 4.45, 5.1));
  const rise = out(P(t, 3.75, 4.35));
  return (
    <>
      {ROLES.map((r, i) => {
        const px = 90, pw = 900, ph = 150, py = 820 + i * 168;
        const tx = sx(16), ty = sy(248 + i * 92), tw = 358 * S, th = 150 * S;
        const x = lerp(px, tx, m), y = lerp(py + (1 - rise) * 900, ty, m), w = lerp(pw, tw, m), h = lerp(ph, th, m);
        return (
          <div key={r.name} style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(28, 22 * S, m), background: C.sheet, boxShadow: `0 18px 40px -16px rgba(60,40,10,${0.35 * (1 - m)})`, border: `2px solid ${r.color}55`, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: 1 - clamp(m * 2.4) }}>
              <div style={{ position: "absolute", left: 30, top: 38, display: "flex", alignItems: "center", gap: 18 }}><Hat color={r.color} size={72} /><div style={{ fontSize: 46, fontWeight: 560, letterSpacing: -1.5 }}>{r.name}</div></div>
            </div>
            <div style={{ position: "absolute", left: 0, top: 0, width: 358, height: 150, transformOrigin: "0 0", transform: `scale(${w / 358})`, opacity: clamp((m - 0.35) * 2.2) }}><CardFace i={i} hours={r.hours} /></div>
          </div>
        );
      })}
    </>
  );
};

/* ================= end card ================= */
const Ending = ({ t }: { t: number }) => {
  const reveal = io(P(t, 24.85, 25.5));
  if (reveal <= 0) return null;
  const icon = back(P(t, 25.0, 25.55));
  const wm = out(P(t, 25.2, 25.8));
  const tag = out(P(t, 26.25, 26.9));
  const cta = out(P(t, 27.1, 27.7));
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `circle(${2600 * reveal}px at 540px 1250px)` }}>
      <Base>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 60 }}>
          <Img src={staticFile("assets/app-icon-spread-cards-square.svg")} style={{ width: 270, height: 270, borderRadius: 62, transform: `scale(${0.6 + 0.4 * icon})`, opacity: clamp(icon * 2), boxShadow: "0 40px 80px -24px rgba(10,60,140,.5)" }} />
          <div style={{ fontSize: 220, fontWeight: 600, letterSpacing: -13, marginTop: 50, lineHeight: 1, opacity: wm, transform: `translateY(${(1 - wm) * 30}px)` }}>Spread<span style={{ color: C.blue }}>.</span></div>
          <div style={{ fontSize: 100, fontWeight: 540, letterSpacing: -4.5, marginTop: 26, opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`, textAlign: "center", lineHeight: 1.06 }}>Make the Hours<br />Count</div>
          <div style={{ marginTop: 84, padding: "30px 62px", borderRadius: 999, background: C.ink, color: C.sheet, fontSize: 46, fontWeight: 620, letterSpacing: -0.6, opacity: cta, transform: `translateY(${(1 - cta) * 24}px) scale(${1 + 0.03 * pulse(t, 27.75, 0.35)})` }}>Spread for iPhone</div>
          <div style={{ marginTop: 34, fontSize: 40, color: C.muted, fontWeight: 580, opacity: cta }}>thespreadapp.com</div>
        </div>
      </Base>
    </div>
  );
};

/* ================= film ================= */
export const SpreadV4Social = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const navyR = 2600 * io(P(t, 4.1, 5.0));
  const rise = out(P(t, 4.5, 5.4));
  const sink = io(P(t, 24.0, 24.9));
  const c = cam(t);
  const phoneY = lerp(1500, 0, rise) + sink * 1500;
  const camTx = c.tx - c.k * sx(c.fx);
  const camTy = c.ty - c.k * sy(c.fy);

  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: "Spread, Arial, sans-serif", overflow: "hidden" }}>
      <Base><div /></Base>
      <Hook t={t} />
      <HeadLine t={t} a={0.1} b={1.8} tone="paper" lines={[[{ w: "Busy" }, { w: "all" }, { w: "week." }]]} />
      <HeadLine t={t} a={1.9} b={4.0} tone="paper" lines={[[{ w: "Still" }, { w: "no" }, { w: "room" }], [{ w: "for" }, { w: "what" }, { w: "matters.", em: true }]]} />

      <div style={{ position: "absolute", inset: 0, clipPath: `circle(${navyR}px at 540px 1200px)`, background: `radial-gradient(90% 55% at 50% 12%, ${NAVY2} 0%, #112342 45%, ${NAVY} 100%)` }}>
      </div>

      {/* camera + phone */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: `translate(${camTx}px, ${camTy + phoneY}px) scale(${c.k})`, opacity: t > 4.4 && t < 25.0 ? 1 : 0 }}>
        <div style={{ position: "absolute", left: PH_LEFT, top: PH_TOP, width: PH_W, height: PH_H, borderRadius: 66, background: "linear-gradient(160deg,#2c364b,#0c121e 40%,#1a2233)", transformOrigin: "0 0", transform: `scale(${S})`, boxShadow: "0 0 0 1.5px #3a4560 inset,0 60px 120px -20px rgba(0,0,0,.65),0 0 140px rgba(10,132,255,.2)" }}>
          <PhoneScreen t={t} />
        </div>
      </div>

      {/* top fade (not a caption pill) keeps headlines legible over a zoomed phone */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, background: `linear-gradient(to bottom, rgba(12,26,51,.97) 0, rgba(12,26,51,.9) 330px, rgba(12,26,51,0) 560px)`, opacity: clamp((c.k - 1.04) / 0.2) * (t > 4.5 && t < 24.6 ? 1 : 0), pointerEvents: "none" }} />
      <HeadLine t={t} a={4.15} b={7.0} tone="navy" kick="Responsibilities" lines={[[{ w: "Spread" }, { w: "starts" }], [{ w: "with" }, { w: "your" }, { w: "life.", em: true }]]} />
      <HeadLine t={t} a={10.2} b={16.4} tone="navy" kick="Hours" lines={[[{ w: "Give" }, { w: "each" }, { w: "one" }], [{ w: "real" }, { w: "hours.", em: true }]]} />
      <HeadLine t={t} a={17.5} b={19.0} tone="navy" kick="Week" lines={[[{ w: "Open" }, { w: "your" }], [{ w: "week.", em: true }]]} />
      <HeadLine t={t} a={19.1} b={21.7} tone="navy" lines={[[{ w: "An" }, { w: "hour" }, { w: "for" }], [{ w: "family", em: true }, { w: "on" }, { w: "Friday." }]]} />
      <HeadLine t={t} a={21.8} b={24.3} tone="navy" lines={[[{ w: "Add" }, { w: "dinner." }], [{ w: "Check" }, { w: "it" }, { w: "off.", em: true }]]} />

      <MorphBlocks t={t} />
      <Ending t={t} />
      <Audio src={staticFile("assets/v4/mix-v4.wav")} durationInFrames={30 * fps} premountFor={fps} volume={1} />
    </AbsoluteFill>
  );
};
