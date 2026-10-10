import { useCurrentFrame, useVideoConfig } from "remotion";
import { Base, C, ease, Hat, Kicker, roles } from "../design";
export const Pressure = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const squeeze = ease(f, 2.5 * fps, 4.1 * fps);
  const deflate = ease(f, 5.5 * fps, 6.6 * fps);
  return (
    <Base>
      <div style={{ position: "absolute", left: 120, top: 90 }}>
        <Kicker>A full life.</Kicker>
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 170,
          fontSize: 112,
          lineHeight: 1.02,
          fontWeight: 540,
          letterSpacing: -6,
          opacity: 1 - ease(f, 5.7 * fps, 6.2 * fps),
        }}
      >
        You wear
        <br />a lot of hats.
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 170,
          fontSize: 100,
          lineHeight: 1.08,
          fontWeight: 540,
          letterSpacing: -5,
          opacity: ease(f, 5.7 * fps, 6.4 * fps),
        }}
      >
        Busy all week.
        <br />
        <span style={{ color: C.muted }}>
          Still missing
          <br />
          what matters.
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 650,
          width: 1680,
          height: 210,
          display: "flex",
          gap: 16,
          translate: `0 ${deflate * 38}px`,
        }}
      >
        {roles.map((r, i) => (
          <div
            key={r.name}
            style={{
              width: i === 0 ? 390 + squeeze * 760 : 390 - squeeze * 253,
              flexShrink: 0,
              height: 210,
              background: i === 0 ? "#DCE6D6" : C.sheet,
              border: `2px solid ${r.color}55`,
              borderRadius: 28,
              padding: 24,
              boxSizing: "border-box",
              opacity:
                ease(f, i * 8, 22 + i * 8) * (i === 0 ? 1 : 1 - deflate * 0.34),
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Hat color={r.color} size={66} />
            <div style={{ fontSize: 32, fontWeight: 560, marginTop: 8 }}>
              {r.name}
            </div>
            {i === 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 125,
                  top: 62,
                  fontSize: 34,
                  whiteSpace: "nowrap",
                  opacity: squeeze,
                }}
              >
                One more thing. Then one more.
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 926,
          fontSize: 27,
          color: C.muted,
          opacity: ease(f, 4 * fps, 4.7 * fps),
        }}
      >
        The urgent keeps taking the room.
      </div>
    </Base>
  );
};
