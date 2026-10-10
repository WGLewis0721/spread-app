import { useCurrentFrame } from "remotion";
import { Base, C, ease, Kicker, roles } from "../design";
import { Planner } from "../Planner";
import { PaperAside, PaperSheet } from "./Paper";

export const Morph = () => {
  const f = useCurrentFrame();
  const m = ease(f, 8, 78);
  const destinations = [430, 495, 560, 796];
  return (
    <Base>
      <PaperAside frame={239} opacity={1 - ease(f, 0, 25)} />
      <PaperSheet
        frame={239}
        includeCards={false}
        opacity={1 - ease(f, 8, 40)}
      />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 260,
          opacity: ease(f, 20, 48),
        }}
      >
        <Kicker>The ritual. Reimagined.</Kicker>
        <div
          style={{
            fontSize: 108,
            lineHeight: 1.05,
            fontWeight: 550,
            letterSpacing: -5,
            marginTop: 30,
          }}
        >
          That little plan
          <br />
          becomes <span style={{ color: C.blue }}>Spread.</span>
        </div>
        <div style={{ fontSize: 28, color: C.muted, marginTop: 40 }}>
          The same priorities.
          <br />A little easier to keep.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1125,
          top: 45,
          width: 440,
          height: 990,
          borderRadius: 40,
          boxShadow: "0 35px 65px #17171725",
          opacity: ease(f, 42, 78),
        }}
      >
        <Planner />
      </div>
      {roles.map((r, i) => {
        const left = 715 + (1139 - 715) * m;
        const top =
          225 +
          i * 156 +
          (45 + (destinations[i] * 11) / 12 - 225 - i * 156) * m;
        return (
          <div
            key={r.name}
            style={{
              position: "absolute",
              left,
              top,
              width: 1030 + (412 - 1030) * m,
              height: 132 + (i === 2 ? 194 - 132 : 60 - 132) * m,
              background: m > 0.5 ? "white" : `${r.color}07`,
              border: `${2.5 * (1 - m)}px solid ${r.color}`,
              borderRadius: 4 + 18 * m,
              opacity: (i === 2 ? 1 : 0.48 + 0.52 * m) * (1 - ease(f, 58, 82)),
              rotate: `${-0.8 * (1 - m)}deg`,
              transformOrigin: `${1190 - left}px ${522.5 - top}px`,
              scale: i === 2 ? 1.025 - 0.025 * m : 1,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 24,
                top: 18 - 4 * m,
                fontSize: 34 - 10 * m,
                fontFamily: m < 0.55 ? "Georgia,serif" : "Spread,sans-serif",
                fontStyle: m < 0.55 ? "italic" : "normal",
                color: r.color,
              }}
            >
              {r.name}
            </div>
            <div
              style={{
                position: "absolute",
                right: 24,
                top: 20 - 4 * m,
                fontSize: 27 - 6 * m,
                color: C.muted,
              }}
            >
              {m < 0.6 ? `${r.day} · ` : ""}
              {r.hours}h
            </div>
            <div
              style={{
                position: "absolute",
                left: 24,
                top: 70,
                fontFamily: "Georgia,serif",
                fontStyle: "italic",
                fontSize: 28,
                opacity: 1 - ease(f, 8, 18),
              }}
            >
              {r.purpose}
            </div>
            {i === 2 && (
              <div
                style={{
                  position: "absolute",
                  left: 455 * (1 - m) + 28 * m,
                  top: 72,
                  fontSize: 24 - 5 * m,
                  opacity: 1 - ease(f, 52, 76),
                }}
              >
                □ Plan dinner &nbsp; □ Put phones away
              </div>
            )}
          </div>
        );
      })}
    </Base>
  );
};
