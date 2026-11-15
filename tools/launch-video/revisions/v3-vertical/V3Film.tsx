/**
 * Spread — Make the Hours Count — V3 (vertical, 1080x1920, 30 fps, 900 frames).
 *
 * Separate versioned revision. Does not touch the frozen v7 compositions.
 * Reuses the approved Hallie narration and 116 BPM score unchanged.
 *
 * Provenance of what is on screen:
 *  - Product screens are EXACT MOTION GRAPHICS built in code from documented Spread behaviour
 *    (Life Wallet stack, Weekly Time strip, Week day cards, To place tray, Undo). They are NOT
 *    native screen recordings and make no native-testing claim.
 *  - Card artwork is the app's own text-free editorial art (public/assets/v3/*.jpg).
 *  - All planner data is fictional.
 */
import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Base, C, Hat } from "../../src/design";

/* ---------- timing helpers ---------- */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const io = (x: number) => Easing.bezier(0.45, 0, 0.2, 1)(clamp(x));
const out = (x: number) => Easing.bezier(0.16, 1, 0.3, 1)(clamp(x));
const back = (x: number) => Easing.back(1.4)(clamp(x));
const pulse = (t: number, t0: number, w = 0.25) => Math.max(0, 1 - Math.abs(t - t0) / w);

/* ---------- fictional data (matches v7 role colours) ---------- */
const ROLES = [
  { name: "Work", art: "work", color: "#34C759", hours: 10, purpose: "One clear priority" },
  { name: "Family", art: "family", color: "#AF52DE", hours: 6, purpose: "An evening together" },
  { name: "Health", art: "fitness", color: "#30B0C7", hours: 3, purpose: "Move every day" },
  { name: "Personal Goals", art: "personal", color: "#0A84FF", hours: 3, purpose: "Room to breathe" },
] as const;
const CAP = 30;
const NAVY = "#0C1A33";
const NAVY2 = "#16294A";
const CREAM = "#F2EDE3";
const SERIF = '"Iowan Old Style", Charter, Georgia, "Times New Roman", serif';

/* ---------- phone geometry (screen is 390x844 logical, scaled) ---------- */
const S = 1.65;
const PH_W = 418;
const PH_H = 872;
const PH_LEFT = (1080 - PH_W * S) / 2;
const PH_TOP = 520;
const sx = (x: number) => PH_LEFT + (14 + x) * S;
const sy = (y: number) => PH_TOP + (14 + y) * S;

/* ---------- headline with word reveal ---------- */
type Word = { w: string; em?: boolean };
const HeadLine = ({ t, a, b, kick, lines, tone }: { t: number; a: number; b: number; kick?: string; lines: Word[][]; tone: "paper" | "navy" }) => {
  if (t < a - 0.02 || t > b + 0.6) return null;
  const outp = P(t, b - 0.3, b + 0.2);
  let k = 0;
  return (
    <div
      style={{
        position: "absolute", left: 90, right: 90, top: 130,
        color: tone === "paper" ? C.ink : CREAM,
        opacity: 1 - outp, transform: `translateY(${-16 * io(outp)}px)`,
      }}
    >
      {kick ? (
        <div style={{ fontSize: 28, fontWeight: 650, letterSpacing: 5, textTransform: "uppercase", color: tone === "paper" ? C.muted : "#7FB8FF", marginBottom: 22, opacity: out(P(t, a, a + 0.4)) }}>
          {kick}
        </div>
      ) : null}
      <div style={{ fontSize: 108, lineHeight: 1.0, fontWeight: 560, letterSpacing: -6 }}>
        {lines.map((ln, li) => (
          <div key={li} style={{ whiteSpace: "nowrap" }}>
            {ln.map((wd, wi) => {
              const p = out(P(t, a + k++ * 0.06, a + k * 0.06 + 0.5));
              return (
                <span key={wi} style={{
                  display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 40}px)`, filter: `blur(${(1 - p) * 8}px)`,
                  fontFamily: wd.em ? SERIF : undefined, fontStyle: wd.em ? "italic" : undefined, fontWeight: wd.em ? 500 : undefined, letterSpacing: wd.em ? -3 : undefined,
                }}>{wd.w}{" "}</span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- small in-phone atoms ---------- */
const Touch = ({ x, y, o, press }: { x: number; y: number; o: number; press: number }) => (
  <>
    <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, background: "rgba(255,255,255,.34)", boxShadow: "0 0 0 2px rgba(255,255,255,.6)", opacity: o, transform: `scale(${1 - 0.22 * press})`, zIndex: 90 }} />
  </>
);
const Ripple = ({ x, y, p }: { x: number; y: number; p: number }) => (
  <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, border: "2px solid #fff", opacity: p > 0 && p < 1 ? (1 - p) * 0.9 : 0, transform: `scale(${1 + p * 2.2})`, zIndex: 89 }} />
);
const Logo = ({ size }: { size: number }) => (
  <Img src={staticFile("assets/app-icon-spread-cards-square.svg")} style={{ width: size, height: size, borderRadius: size * 0.24 }} />
);

/* ---------- life card (shared by paper->card morph and in-phone stack) ---------- */
const CardFace = ({ i, hours, style }: { i: number; hours: number; style?: CSSProperties }) => {
  const r = ROLES[i];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", backgroundImage: `url(${staticFile(`assets/v3/${r.art}.jpg`)})`, backgroundSize: "cover", backgroundPosition: "right center", ...style }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(7,11,19,.9) 0%,rgba(7,11,19,.58) 44%,rgba(7,11,19,.04) 82%)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: r.color }} />
      <div style={{ position: "absolute", left: 18, top: 14, display: "flex", alignItems: "center", gap: 7, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: "#d9e2f2" }}>
        <Logo size={16} />SPREAD
      </div>
      <div style={{ position: "absolute", left: 18, top: 34, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: r.name.length > 8 ? 26 : 31, color: "#fff", whiteSpace: "nowrap" }}>{r.name}</div>
      <div style={{ position: "absolute", right: 14, top: 14, padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, color: "#071018", background: r.color }}>{hours}h</div>
    </div>
  );
};

/* ---------- the paper blocks (opening) ---------- */
const paperRect = (t: number, i: number) => {
  const squeeze = io(P(t, 1.7, 3.8)) * (1 - io(P(t, 9.4, 10.9)));
  const x = 90, w = 900, gap = 18;
  const base = 150;
  const hs = ROLES.map((_, k) => (k === 0 ? lerp(base, 560, squeeze) : lerp(base, 70, squeeze)));
  let y = 720;
  for (let k = 0; k < i; k++) y += hs[k] + gap;
  return { x, y, w, h: hs[i] };
};

const PaperBlocks = ({ t }: { t: number }) => {
  const m = io(P(t, 12.65, 13.75));
  if (t >= 13.75) return null;
  return (
    <>
      {ROLES.map((r, i) => {
        const a = paperRect(t, i);
        const tx = sx(16), ty = sy(248 + i * 92), tw = 358 * S, th = 150 * S;
        const x = lerp(a.x, tx, m), y = lerp(a.y, ty, m), w = lerp(a.w, tw, m), h = lerp(a.h, th, m);
        const appear = out(P(t, 0.15 + i * 0.12, 0.8 + i * 0.12));
        const squeezed = io(P(t, 1.7, 3.8)) * (1 - io(P(t, 9.4, 10.9)));
        const dim = i === 0 ? 1 : 1 - squeezed * 0.35;
        const handwriting = out(P(t, 11.5 + i * 0.28, 12.2 + i * 0.28));
        return (
          <div key={r.name} style={{
            position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(30, 22 * S, m),
            background: i === 0 ? "#DCE6D6" : C.sheet, boxShadow: `0 18px 40px -16px rgba(60,40,10,${0.35 * (1 - m)})`, border: `2px solid ${r.color}55`,
            overflow: "hidden", opacity: appear * dim, transform: `translateY(${(1 - appear) * 60}px)`,
          }}>
            {/* paper face */}
            <div style={{ position: "absolute", inset: 0, opacity: 1 - clamp(m * 2.2) }}>
              <div style={{ position: "absolute", left: 30, top: i === 0 ? 26 : Math.max(6, (h - 72) / 2), display: "flex", alignItems: "center", gap: 18 }}>
                <Hat color={r.color} size={i === 0 ? 72 : Math.min(72, h - 8)} />
                <div style={{ fontSize: i === 0 ? 46 : Math.min(46, h * 0.52), fontWeight: 560, letterSpacing: -1.5, opacity: 1 - handwriting }}>{r.name}</div>
              </div>
              <div style={{ position: "absolute", left: 30 + 90, top: i === 0 ? 36 : Math.max(2, (h - 64) / 2), fontFamily: SERIF, fontStyle: "italic", fontSize: i === 0 ? 54 : Math.min(54, h * 0.7), color: C.ink, opacity: handwriting, clipPath: `inset(0 ${(1 - handwriting) * 100}% 0 0)` }}>{r.name}</div>
              {i === 0 ? (
                <div style={{ position: "absolute", left: 40, top: 160, fontSize: 50, lineHeight: 1.25, color: C.ink, opacity: squeezed }}>
                  One more thing.<br />Then one more.
                </div>
              ) : null}
              {i > 0 ? (
                <div style={{ position: "absolute", right: 34, top: h / 2 - 22, fontSize: 36, color: C.muted, opacity: squeezed }}>{i === 1 || i === 3 ? "1h" : "0h"}</div>
              ) : null}
              <div style={{ position: "absolute", left: 120, bottom: 14, fontFamily: SERIF, fontStyle: "italic", fontSize: 34, color: C.muted, opacity: handwriting * (1 - squeezed) * (h > 120 ? 1 : 0) }}>{r.purpose}</div>
            </div>
            {/* card face */}
            <div style={{ position: "absolute", left: 0, top: 0, width: 358, height: 150, transformOrigin: "0 0", transform: `scale(${w / 358})`, opacity: clamp((m - 0.35) * 2.2) }}>
              <CardFace i={i} hours={r.hours} style={{ borderRadius: 22 }} />
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ---------- phone contents ---------- */
const FAM = 1; // Family index

const PhoneScreen = ({ t }: { t: number }) => {
  /* state derived from time */
  const famHours = 6 + out(P(t, 15.2, 15.5)) + out(P(t, 15.65, 15.95));
  const fh = Math.round(famHours);
  const hours = [ROLES[0].hours, fh, ROLES[2].hours, ROLES[3].hours];
  const total = hours.reduce((a, b) => a + b, 0);

  // Weekly Time strip expands for the hours beat, collapses after
  const wtExp = io(P(t, 14.85, 15.45)) * (1 - io(P(t, 16.05, 16.6)));
  const wtH = lerp(130, 292, wtExp);

  // focus: Family card lifts to front and reveals details
  const focus = out(P(t, 13.65, 14.5));
  const stackTop = 104 + wtH + 14;
  const ph = (i: number) => {
    const base = stackTop + i * 92;
    if (i === FAM) return lerp(base, stackTop, focus);
    // siblings slide away
    return lerp(base, base + 520, focus);
  };

  // week transition
  const toWeek = io(P(t, 21.2, 22.3));
  const lifeOpacity = 1 - clamp(toWeek * 1.6);
  const weekOpacity = clamp((toWeek - 0.35) * 1.8);

  const cardsVisible = t >= 13.75;
  const intro = out(P(t, 13.1, 13.9)); // header and strip fade in

  /* details beneath focused card */
  const boxDraw = io(P(t, 16.2, 17.2));
  const purposeP = P(t, 17.7, 18.9);
  const taskA = out(P(t, 19.2, 19.7));
  const taskB = out(P(t, 19.75, 20.25));

  /* tap targets (logical px) */
  const tapFamily = { x: 200, y: stackTop + 92 + 40 };

  /* --- Week view state --- */
  const dragP = io(P(t, 25.55, 26.45));
  const placed = t >= 26.5;
  const checked = out(P(t, 27.15, 27.45));
  const trayShift = 0;
  const shiftP = io(P(t, 26.55, 27.1));
  const trayH = 52 + 3 * 42 + 8 - 42 * shiftP;
  const weekFamLeft = placed ? 6 : 8;

  return (
    <div style={{ position: "absolute", left: 14, top: 14, width: 390, height: 844, borderRadius: 52, background: NAVY, overflow: "hidden", color: CREAM, fontSize: 14 }}>
      {/* island */}
      <div style={{ position: "absolute", left: 135, top: 11, width: 120, height: 34, borderRadius: 20, background: "#000", zIndex: 50 }} />
      {/* header */}
      <div style={{ position: "absolute", left: 18, right: 18, top: 60, height: 34, display: "flex", alignItems: "center", gap: 9, fontSize: 18, fontWeight: 620, letterSpacing: -0.4, zIndex: 30, opacity: intro }}>
        <Logo size={28} />Spread
        <div style={{ marginLeft: "auto", width: 34, height: 34, borderRadius: 17, background: "#1A2740", display: "flex", alignItems: "center", justifyContent: "center", color: "#9db2d6" }}>···</div>
      </div>

      {/* LIFE */}
      <div style={{ position: "absolute", inset: 0, opacity: lifeOpacity, transform: `translateX(${-30 * toWeek}px)`, display: cardsVisible || t > 13 ? "block" : "none" }}>
        {/* weekly time */}
        <div style={{ position: "absolute", left: 16, width: 358, top: 104, height: wtH, borderRadius: 22, background: "#16233B", boxShadow: "0 0 0 1px #243556 inset", overflow: "hidden", zIndex: 20, opacity: intro, transform: `translateY(${(1 - intro) * 20}px)` }}>
          <div style={{ position: "absolute", left: 18, top: 16, fontSize: 10.5, fontWeight: 650, letterSpacing: 1.5, color: "#8FA3C4" }}>WEEKLY TIME</div>
          <div style={{ position: "absolute", left: 18, top: 30, fontSize: 28, fontWeight: 620, letterSpacing: -0.8 }}>{total}h<span style={{ fontSize: 14, fontWeight: 500, color: "#8FA3C4", marginLeft: 6, letterSpacing: 0 }}>of {CAP}h</span></div>
          <div style={{ position: "absolute", left: 18, right: 18, top: 68, height: 26, borderRadius: 9, overflow: "hidden", display: "flex", background: "repeating-linear-gradient(135deg,#24324d 0 3px,#1a2740 3px 7px)" }}>
            {ROLES.map((r, i) => {
              const px = (hours[i] / CAP) * 322;
              const wv = i === FAM ? famHours : hours[i];
              return <div key={r.name} style={{ width: `${(wv / CAP) * 100}%`, background: r.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#06210f", overflow: "hidden", whiteSpace: "nowrap" }}>{px > 34 ? `${hours[i]}h` : ""}</div>;
            })}
          </div>
          <div style={{ position: "absolute", left: 18, top: 104, fontSize: 12, color: "#8FA3C4" }}>{CAP - total}h available</div>
          <div style={{ position: "absolute", right: 18, top: 104, fontSize: 12.5, fontWeight: 600, color: C.blue, opacity: 1 - wtExp }}>Adjust hours ⌄</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 132, opacity: wtExp }}>
            {ROLES.map((r, i) => {
              const pl = i === FAM ? Math.max(pulse(t, 15.35, 0.3), pulse(t, 15.8, 0.3)) : 0;
              return (
                <div key={r.name} style={{ height: 40, margin: "0 18px", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #243556", fontSize: 15, fontWeight: 560 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 6, background: r.color }} />{r.name}
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 14, background: "#1F3050", color: "#cfe0ff", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</span>
                    <span style={{ minWidth: 34, textAlign: "center", fontWeight: 650, fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.35 * pl})`, color: pl > 0 ? "#e2b8fb" : CREAM }}>{hours[i]}h</span>
                    <span style={{ width: 28, height: 28, borderRadius: 14, background: "#1F3050", color: "#cfe0ff", display: "flex", alignItems: "center", justifyContent: "center" }}>›</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* stack */}
        {cardsVisible ? ROLES.map((r, i) => {
          const isFam = i === FAM;
          const fadeSib = isFam ? 1 : 1 - focus * 0.9;
          const lift = isFam ? focus : 0;
          return (
            <div key={r.name} style={{ position: "absolute", left: 16, width: 358, height: 150, top: ph(i), borderRadius: 22, overflow: "hidden", zIndex: 10 + i, opacity: fadeSib, transform: `scale(${1 + lift * 0.02})`,
              boxShadow: isFam && focus > 0 ? `0 0 0 1px rgba(255,255,255,.18) inset,0 0 ${34 * focus}px ${3 * focus}px ${r.color}66` : "0 0 0 1px rgba(255,255,255,.13) inset,0 -10px 24px -8px rgba(0,0,0,.55)" }}>
              <CardFace i={i} hours={hours[i]} />
              {isFam && boxDraw > 0 ? (
                <div style={{ position: "absolute", inset: 3, borderRadius: 19, border: `3px solid ${r.color}`, clipPath: `inset(0 ${(1 - boxDraw) * 100}% 0 0)`, boxShadow: `0 0 18px ${r.color}88` }} />
              ) : null}
            </div>
          );
        }) : null}

        {/* details beneath the focused card */}
        <div style={{ position: "absolute", left: 16, width: 358, top: stackTop + 150 + 14, opacity: focus, transform: `translateY(${(1 - focus) * 24}px)`, zIndex: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["Details", "Tasks"].map((tb, k) => (
              <div key={tb} style={{ height: 36, padding: "0 16px", borderRadius: 18, display: "flex", alignItems: "center", fontSize: 13.5, fontWeight: 640, background: k === 0 ? "#1F3050" : "transparent", boxShadow: k === 0 ? "none" : "0 0 0 1px #2a3d63 inset", color: k === 0 ? CREAM : "#9db2d6" }}>{tb}</div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 18, background: "#101D34", boxShadow: "0 0 0 1px #1f3050 inset" }}>
            <div style={{ fontSize: 10.5, fontWeight: 650, letterSpacing: 1.4, color: "#8FA3C4" }}>PURPOSE</div>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 22, marginTop: 6, minHeight: 28 }}>
              {ROLES[FAM].purpose.slice(0, Math.round(purposeP * ROLES[FAM].purpose.length))}
              <span style={{ opacity: purposeP > 0 && purposeP < 1 ? 1 : 0, color: ROLES[FAM].color }}>|</span>
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 650, letterSpacing: 1.4, color: "#8FA3C4", marginTop: 14 }}>TASKS</div>
            {[["Plan dinner", taskA], ["Put phones away", taskB]].map(([label, p], k) => (
              <div key={String(label)} style={{ height: 38, marginTop: 8, borderRadius: 11, background: "#1B2B47", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", fontSize: 14, fontWeight: 560, opacity: p as number, transform: `translateY(${(1 - (p as number)) * 14}px)` }}>
                <span style={{ width: 18, height: 18, borderRadius: 9, boxShadow: `0 0 0 2px ${ROLES[FAM].color} inset` }} />{label as string}
                <span style={{ marginLeft: "auto", color: "#8FA3C4", fontSize: 12 }}>{k === 0 ? "2h" : "30m"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WEEK */}
      <div style={{ position: "absolute", inset: 0, opacity: weekOpacity, transform: `translateX(${(1 - toWeek) * 40}px)`, display: toWeek > 0 ? "block" : "none" }}>
        <div style={{ position: "absolute", left: 18, top: 104, fontSize: 11, fontWeight: 650, letterSpacing: 1.4, color: "#8FA3C4" }}>HOURS TO PLACE · NOV 9</div>
        <div style={{ position: "absolute", left: 16, top: 126, width: 358, display: "flex", gap: 6 }}>
          {ROLES.map((r, i) => {
            const left = i === FAM ? weekFamLeft : r.hours;
            const tick = i === FAM ? pulse(t, 26.5, 0.4) : 0;
            const hl = (t > 23.78 + i * 0.12 && t < 24.9) ? 1 : 0;
            return (
              <div key={r.name} style={{ flex: 1, height: 58, borderRadius: 14, background: "#16233B", boxShadow: `0 0 0 ${i === FAM && tick > 0 ? 2 : 1}px ${i === FAM && tick > 0 ? r.color : hl ? r.color + "99" : "#243556"} inset`, padding: "8px 9px", opacity: i === FAM ? (toWeek > 0.55 ? 1 : 0) : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 650, color: "#aebfdc", whiteSpace: "nowrap" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: r.color }} />{r.name === "Personal Goals" ? "Goals" : r.name}
                </div>
                <div style={{ fontSize: 19, fontWeight: 650, marginTop: 4, transform: `scale(${1 + 0.25 * tick})`, transformOrigin: "left", color: tick > 0 ? "#e2b8fb" : CREAM }}>{left}h <span style={{ fontSize: 10, fontWeight: 520, color: "#8FA3C4" }}>left</span></div>
              </div>
            );
          })}
        </div>

        {/* to place tray */}
        <div style={{ position: "absolute", left: 16, width: 358, top: 196 + trayShift, borderRadius: 20, background: "#16233B", boxShadow: "0 0 0 1px #243556 inset", height: trayH, zIndex: 22 }}>
          <div style={{ height: 50, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", fontSize: 15, fontWeight: 620 }}>
            To place
            <span style={{ marginLeft: "auto", minWidth: 26, height: 26, borderRadius: 13, background: C.blue, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{placed ? 2 : 3}</span>
          </div>
          {[["Plan dinner", "#AF52DE", "2h"], ["Finish the proposal", "#34C759", "3h"], ["Take a walk", "#0A84FF", "1h"]].map(([lb, col, h], k) => (
            <div key={lb} style={{ position: "absolute", left: 14, right: 14, top: 54 + (k - shiftP) * 42, height: 36, borderRadius: 12, background: "#1F3050", display: "flex", alignItems: "center", gap: 9, padding: "0 12px", fontSize: 13.5, fontWeight: 560, opacity: k === 0 && (t > 25.5) ? 0 : 1 }}>
              <span style={{ width: 9, height: 9, borderRadius: 5, background: col }} />{lb}<span style={{ marginLeft: "auto", color: "#8FA3C4", fontSize: 12 }}>{h}</span>
            </div>
          ))}
        </div>

        {/* day cards */}
        {[
          { d: "Mon 9", role: 0, task: "Team review", h: "2h", bank: [["#34C759", 2]] },
          { d: "Wed 11", role: 2, task: "Gym session", h: "1h", bank: [["#30B0C7", 1]] },
          { d: "Fri 13", role: 1, task: "", h: "", bank: [] },
        ].map((dc, k) => {
          const isFri = k === 2;
          const hint = isFri && t > 25.4 && t < 26.55;
          const dimOthers = !isFri && t > 25.4 && t < 26.55;
          const bankFill = isFri && placed ? 2 : 0;
          const squares = Array.from({ length: 6 }, (_, n) => {
            let col = "#24324d";
            let acc = 0;
            for (const [c, cnt] of dc.bank as [string, number][]) { if (n >= acc && n < acc + cnt) col = c; acc += cnt; }
            if (isFri && n < bankFill) col = "#AF52DE";
            return col;
          });
          return (
            <div key={dc.d} style={{ position: "absolute", left: 16, width: 358, top: 196 + 52 + 3 * 42 + 8 + 14 + k * 92 - 42 * shiftP, height: 84, borderRadius: 20, background: "#121F36", padding: "11px 14px", opacity: lerp(1, dimOthers ? 0.45 : 1, 1),
              boxShadow: hint ? "0 0 0 2px #AF52DE inset,0 0 30px rgba(175,82,222,.4)" : "0 0 0 1px #223250 inset" }}>
              <div style={{ fontSize: 14, fontWeight: 650 }}>{dc.d}<span style={{ marginLeft: 8, fontSize: 11, color: ROLES[dc.role].color, fontWeight: 650 }}>{ROLES[dc.role].name === "Personal Goals" ? "Goals" : ROLES[dc.role].name}</span></div>
              <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 3 }}>
                {squares.map((c, n) => <span key={n} style={{ width: 9, height: 9, borderRadius: 3, background: c }} />)}
              </div>
              {dc.task ? (
                <div style={{ position: "absolute", left: 14, right: 14, top: 40, height: 28, borderRadius: 9, background: "#1B2B47", display: "flex", alignItems: "center", gap: 8, padding: "0 10px", fontSize: 12.5, fontWeight: 560 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 5, background: ROLES[dc.role].color }} />{dc.task}<span style={{ marginLeft: "auto", color: "#8FA3C4", fontSize: 12 }}>{dc.h}</span>
                </div>
              ) : null}
              {isFri ? (
                <div style={{ position: "absolute", left: 14, right: 14, top: 40, height: 28, borderRadius: 9, background: "#1B2B47", display: "flex", alignItems: "center", gap: 8, padding: "0 10px", fontSize: 12.5, fontWeight: 560, opacity: placed ? 1 : 0, transform: `scale(${0.92 + 0.08 * back(P(t, 26.5, 26.85))})`, transformOrigin: "left" }}>
                  <span style={{ width: 14, height: 14, borderRadius: 7, boxShadow: `0 0 0 2px #AF52DE inset`, background: checked > 0.5 ? "#AF52DE" : "transparent", color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{checked > 0.5 ? "✓" : ""}</span>
                  <span style={{ textDecoration: checked > 0.5 ? "line-through" : "none", color: checked > 0.5 ? "#8FA3C4" : CREAM }}>Plan dinner</span>
                  <span style={{ marginLeft: "auto", color: "#8FA3C4", fontSize: 12 }}>2h</span>
                </div>
              ) : null}
            </div>
          );
        })}

        {/* dragged chip */}
        {t > 25.4 && t < 26.5 ? (
          <div style={{ position: "absolute", left: 30 + dragP * 4, top: lerp(250, 196 + 52 + 3 * 42 + 8 + 14 + 2 * 92 + 40, dragP) - Math.sin(dragP * Math.PI) * 30, width: 330, height: 36, borderRadius: 12, background: "#27406a", display: "flex", alignItems: "center", gap: 9, padding: "0 12px", fontSize: 13.5, fontWeight: 620, zIndex: 60, boxShadow: "0 14px 30px rgba(0,0,0,.55),0 0 0 1.5px #AF52DE", transform: `scale(${1.04 + 0.02 * Math.sin(dragP * Math.PI)}) rotate(${Math.sin(dragP * Math.PI) * -2}deg)` }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: "#AF52DE" }} />Plan dinner<span style={{ marginLeft: "auto", color: "#a9c6f5", fontSize: 12 }}>2h</span>
          </div>
        ) : null}
      </div>

      {/* undo toast */}
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 128, height: 48, borderRadius: 16, background: "#E8EEF9", color: "#0b1324", zIndex: 70, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 13.5, fontWeight: 620, opacity: out(P(t, 26.65, 27.0)) * (1 - io(P(t, 27.5, 27.9))), transform: `translateY(${(1 - out(P(t, 26.65, 27.0))) * 18}px)` }}>
        Plan dinner placed on Friday<span style={{ marginLeft: "auto", color: C.blue }}>Undo</span>
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

      {/* touches */}
      {(() => {
        const items: { x: number; y: number; o: number; press: number }[] = [];
        // tap Family card
        const a = P(t, 13.15, 13.5);
        if (t > 13.15 && t < 14.0) items.push({ x: lerp(300, tapFamily.x, io(a)), y: lerp(620, 104 + 130 + 14 + 92 + 40, io(a)), o: (1 - io(P(t, 13.75, 14.0))) * out(a), press: pulse(t, 13.6, 0.2) });
        // adjust hours + arrows
        if (t > 14.55 && t < 16.2) {
          const aa = io(P(t, 14.55, 14.85));
          const arrowY = 104 + 132 + 40 + 20;
          const moveToArrow = io(P(t, 15.0, 15.2));
          const x = moveToArrow > 0 ? lerp(330, 345, moveToArrow) : lerp(300, 330, aa);
          const y = moveToArrow > 0 ? lerp(104 + 108, arrowY, moveToArrow) : lerp(380, 104 + 108, aa);
          items.push({ x, y, o: out(P(t, 14.55, 14.8)) * (1 - io(P(t, 15.95, 16.2))), press: Math.max(pulse(t, 14.9, 0.2), pulse(t, 15.35, 0.2), pulse(t, 15.8, 0.2)) });
        }
        // toggle Week
        if (t > 20.7 && t < 21.7) items.push({ x: 114, y: 774, o: out(P(t, 20.7, 20.95)) * (1 - io(P(t, 21.4, 21.7))), press: pulse(t, 21.1, 0.2) });
        // drag
        if (t > 25.35 && t < 26.7) {
          const dyy = lerp(250, 196 + 52 + 3 * 42 + 8 + 14 + 2 * 92 + 40, dragP) - Math.sin(dragP * Math.PI) * 30;
          items.push({ x: 120 + dragP * 40, y: dyy + 18, o: out(P(t, 25.35, 25.55)) * (1 - io(P(t, 26.55, 26.7))), press: t < 26.5 ? 1 : 0 });
        }
        // tick task
        if (t > 26.95 && t < 27.7) {
          items.push({ x: 40, y: 196 + 52 + 3 * 42 + 8 + 14 + 2 * 92 + 54 - 42, o: out(P(t, 26.95, 27.1)) * (1 - io(P(t, 27.4, 27.7))), press: pulse(t, 27.15, 0.2) });
        }
        return (
          <>
            {items.map((it, k) => <Touch key={k} {...it} />)}
            <Ripple x={tapFamily.x} y={104 + 130 + 14 + 92 + 40} p={P(t, 13.6, 14.15)} />
            <Ripple x={345} y={104 + 132 + 40 + 20} p={t < 15.6 ? P(t, 15.3, 15.9) : P(t, 15.75, 16.3)} />
          </>
        );
      })()}

      {/* family card -> hours chip continuity */}
      {toWeek > 0 && toWeek < 1 ? (() => {
        const fromTop = 104 + 130 + 14, chipTop = 126;
        const e = io(P(t, 21.25, 22.2));
        const x = lerp(16, 16 + (358 / 4 + 1.5), e), y = lerp(fromTop, chipTop, e), w = lerp(358, (358 - 18) / 4, e), h = lerp(150, 58, e);
        return (
          <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(22, 14, e), overflow: "hidden", zIndex: 35, opacity: 1 - io(P(t, 21.85, 22.15)), boxShadow: `0 0 ${30 * (1 - e)}px ${ROLES[FAM].color}66` }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 358, height: 150, transformOrigin: "0 0", transform: `scale(${w / 358},${h / 150})`, opacity: 1 - clamp(e * 1.5) }}>
              <CardFace i={FAM} hours={fh} />
            </div>
            <div style={{ position: "absolute", inset: 0, background: "#16233B", opacity: clamp(e * 1.4 - 0.2) }} />
          </div>
        );
      })() : null}
    </div>
  );
};

/* ---------- list of four words during the finale ---------- */
const FourWords = ({ t }: { t: number }) => {
  const a = 23.7;
  if (t < a - 0.02 || t > 28.0) return null;
  const items = [["Responsibilities.", 23.78], ["Hours.", 25.14], ["Your week.", 26.08], ["Your tasks.", 26.98]] as const;
  const outp = P(t, 27.6, 28.1);
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 130, color: CREAM, opacity: 1 - outp }}>
      <div style={{ fontSize: 26, fontWeight: 650, letterSpacing: 5, textTransform: "uppercase", color: "#7FB8FF", marginBottom: 14, opacity: out(P(t, a, a + 0.4)) }}>That little plan</div>
      {items.map(([lb, st], k) => {
        const nxt = k < 3 ? items[k + 1][1] : 28.0;
        const act = t >= st && t < nxt;
        const p = out(P(t, st - 0.05, st + 0.45));
        return (
          <div key={lb} style={{ fontSize: 66, lineHeight: 1.06, fontWeight: 560, letterSpacing: -3.5, opacity: p * (act ? 1 : 0.42), transform: `translateX(${(1 - p) * 40}px)`, color: act ? (k === 3 ? "#7FB8FF" : CREAM) : CREAM }}>{lb}</div>
        );
      })}
    </div>
  );
};

/* ---------- ending ---------- */
const Ending = ({ t }: { t: number }) => {
  const reveal = io(P(t, 27.65, 28.5));
  if (reveal <= 0) return null;
  const rad = 2600 * reveal;
  const icon = back(P(t, 28.05, 28.65));
  const tag = out(P(t, 28.36, 29.0));
  const cta = out(P(t, 29.0, 29.6));
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `circle(${rad}px at 540px 1250px)` }}>
      <Base>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Img src={staticFile("assets/app-icon-spread-cards-square.svg")} style={{ width: 250, height: 250, borderRadius: 58, transform: `scale(${0.6 + 0.4 * icon})`, opacity: clamp(icon * 2), boxShadow: "0 40px 80px -24px rgba(10,60,140,.5)" }} />
          <div style={{ fontSize: 210, fontWeight: 600, letterSpacing: -12, marginTop: 50, lineHeight: 1, opacity: tag, transform: `translateY(${(1 - tag) * 30}px)` }}>Spread<span style={{ color: C.blue }}>.</span></div>
          <div style={{ fontSize: 96, fontWeight: 540, letterSpacing: -4, marginTop: 26, opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`, textAlign: "center", lineHeight: 1.08 }}>Make the Hours<br />Count</div>
          <div style={{ marginTop: 80, padding: "26px 54px", borderRadius: 999, background: C.ink, color: C.sheet, fontSize: 40, fontWeight: 600, letterSpacing: -0.5, opacity: cta, transform: `translateY(${(1 - cta) * 24}px)` }}>Spread for iPhone</div>
          <div style={{ marginTop: 34, fontSize: 38, color: C.muted, fontWeight: 560, opacity: cta }}>thespreadapp.com</div>
        </div>
      </Base>
    </div>
  );
};

/* ---------- the film ---------- */
export const SpreadV3Vertical = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const navyR = 2600 * io(P(t, 12.5, 13.5));
  const phoneRise = out(P(t, 12.3, 13.3));
  const sink = io(P(t, 27.45, 28.3));
  const phoneY = lerp(1500, 0, phoneRise) + sink * 1500;
  const zoom = 1 + Math.sin(t * 0.5) * 0.004;

  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: "Spread, Arial, sans-serif", overflow: "hidden" }}>
      <Base><div /></Base>

      {/* paper-phase headlines */}
      <HeadLine t={t} a={0.1} b={5.6} tone="paper" kick="A full life" lines={[[{ w: "You" }, { w: "wear" }], [{ w: "a" }, { w: "lot" }, { w: "of" }, { w: "hats.", em: true }]]} />
      <HeadLine t={t} a={5.7} b={9.4} tone="paper" lines={[[{ w: "Busy" }, { w: "all" }, { w: "week." }], [{ w: "Still" }, { w: "missing", em: true }], [{ w: "what" }, { w: "matters.", em: true }]]} />
      <HeadLine t={t} a={9.55} b={11.3} tone="paper" lines={[[{ w: "So," }], [{ w: "pause.", em: true }]]} />
      <HeadLine t={t} a={11.4} b={12.7} tone="paper" lines={[[{ w: "Write" }, { w: "down" }], [{ w: "what" }, { w: "matters.", em: true }]]} />

      {/* navy product environment */}
      <div style={{ position: "absolute", inset: 0, clipPath: `circle(${navyR}px at 540px 1200px)`, background: `radial-gradient(90% 55% at 50% 12%, ${NAVY2} 0%, #112342 45%, ${NAVY} 100%)` }}>
        <HeadLine t={t} a={13.0} b={16.1} tone="navy" kick="Responsibilities · Hours" lines={[[{ w: "Give" }, { w: "each" }, { w: "one" }], [{ w: "an" }, { w: "hour" }, { w: "or" }, { w: "two.", em: true }]]} />
        <HeadLine t={t} a={16.15} b={21.0} tone="navy" lines={[[{ w: "Draw" }, { w: "a" }, { w: "box." }], [{ w: "Give" }, { w: "it" }, { w: "a" }, { w: "purpose.", em: true }], [{ w: "Add" }, { w: "the" }, { w: "tasks." }]]} />
        <HeadLine t={t} a={21.1} b={23.6} tone="navy" lines={[[{ w: "That" }, { w: "little" }, { w: "plan" }], [{ w: "becomes" }, { w: "Spread.", em: true }]]} />
        <FourWords t={t} />
      </div>

      {/* phone */}
      <div style={{ position: "absolute", left: PH_LEFT, top: PH_TOP, width: PH_W, height: PH_H, borderRadius: 66, background: "linear-gradient(160deg,#2c364b,#0c121e 40%,#1a2233)", transformOrigin: "0 0", transform: `translateY(${phoneY}px) scale(${S * zoom})`,
        opacity: t > 12.2 && t < 28.4 ? 1 : 0, boxShadow: "0 0 0 1.5px #3a4560 inset,0 60px 120px -20px rgba(0,0,0,.65),0 0 140px rgba(10,132,255,.2)" }}>
        <PhoneScreen t={t} />
      </div>

      {/* paper blocks that morph into the Life cards */}
      <PaperBlocks t={t} />

      <Ending t={t} />

      <Audio src={staticFile("assets/hallie-pivot/narration-hallie.wav")} durationInFrames={30 * fps} premountFor={fps} volume={0.6} />
      <Audio src={staticFile("assets/hallie-pivot/score-116bpm.wav")} durationInFrames={30 * fps} premountFor={fps} volume={1} />
    </AbsoluteFill>
  );
};

