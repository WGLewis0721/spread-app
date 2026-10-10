import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, C, ease, Kicker, roles } from "../design";
export const PaperAside = ({
  frame,
  opacity = 1,
}: {
  frame: number;
  opacity?: number;
}) => (
  <div style={{ opacity }}>
    <div style={{ position: "absolute", left: 100, top: 80, width: 435 }}>
      <Kicker>Your Sunday ritual.</Kicker>
      <div
        style={{
          fontSize: 62,
          lineHeight: 1.08,
          fontWeight: 530,
          letterSpacing: -3,
          marginTop: 24,
        }}
      >
        A place for
        <br />
        what matters.
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        left: 100,
        top: 440,
        fontSize: 37,
        lineHeight: 1.6,
        color: C.muted,
      }}
    >
      <span style={{ opacity: ease(frame, 111, 126) }}>Draw a box.</span>
      <br />
      <span style={{ opacity: ease(frame, 154, 169) }}>Give it a purpose.</span>
      <br />
      <span style={{ color: C.ink, opacity: ease(frame, 197, 212) }}>
        Add the tasks.
      </span>
    </div>
  </div>
);
export const PaperSheet = ({
  frame,
  includeCards = true,
  opacity = 1,
}: {
  frame: number;
  includeCards?: boolean;
  opacity?: number;
}) => {
  const f = frame;
  const focus = ease(f, 130, 158);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 575,
          top: 70,
          width: 1230,
          height: 905,
          background: C.sheet,
          boxShadow: "0 20px 70px #1717170c",
          border: "1px solid #d5cfc3",
          rotate: `${ease(f, 0, 35, -2, -0.8)}deg`,
          borderRadius: 5,
          opacity,
        }}
      >
        <svg width="1230" height="905" style={{ position: "absolute" }}>
          <path d="M100 0V905" stroke="#ddc3bc" strokeWidth="2" />
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={`M0 ${120 + i * 65} H1230`}
              stroke="#e5dfd3"
              strokeWidth="1"
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 52,
            fontFamily: "Georgia,serif",
            fontStyle: "italic",
            fontSize: 54,
          }}
        >
          A week for what matters.
        </div>
        {includeCards &&
          roles.map((r, i) => {
            const reveal = ease(f, 15 + i * 14, 35 + i * 14);
            const box = ease(f, 111 + i * 4, 134 + i * 4);
            const selected = i === 2;
            return (
              <div
                key={r.name}
                style={{
                  position: "absolute",
                  left: 140,
                  top: 155 + i * 156,
                  width: 1030,
                  height: 132,
                  opacity: reveal * (selected ? 1 : 1 - focus * 0.52),
                  scale: selected ? 1 + focus * 0.025 : 1,
                  transformOrigin: "left center",
                }}
              >
                <svg
                  width="1030"
                  height="132"
                  style={{ position: "absolute", inset: 0 }}
                >
                  <rect
                    x="2"
                    y="2"
                    width="1026"
                    height="128"
                    rx="4"
                    stroke={r.color}
                    strokeWidth="2.5"
                    fill={`${r.color}07`}
                    pathLength="1"
                    strokeDasharray="1"
                    strokeDashoffset={1 - box}
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    left: 24,
                    top: 18,
                    fontFamily: "Georgia,serif",
                    fontStyle: "italic",
                    fontSize: 34,
                    color: r.color,
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: 24,
                    top: 20,
                    fontSize: 27,
                    opacity: ease(f, 32 + i * 7, 50 + i * 7),
                  }}
                >
                  {r.day} · {r.hours}h
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 24,
                    top: 70,
                    fontFamily: "Georgia,serif",
                    fontStyle: "italic",
                    fontSize: 28,
                    clipPath: `inset(0 ${100 * (1 - ease(f, 148 + i * 4, 173 + i * 4))}% 0 0)`,
                  }}
                >
                  {r.purpose}
                </div>
                {selected && (
                  <div
                    style={{
                      position: "absolute",
                      left: 455,
                      top: 72,
                      fontSize: 24,
                      opacity: ease(f, 197, 218),
                      whiteSpace: "nowrap",
                    }}
                  >
                    □ Plan dinner &nbsp; □ Put phones away
                  </div>
                )}
              </div>
            );
          })}
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 818,
            fontSize: 24,
            color: C.muted,
            opacity: ease(f, 70, 95),
          }}
        >
          6 hours chosen. Room for the rest of life.
        </div>
      </div>
    </>
  );
};
export const Paper = ({ expressiveTiming = false }: { expressiveTiming?: boolean }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = expressiveTiming
    ? interpolate(
        frame,
        [0, 2.933 * fps, 3.133 * fps, 4.267 * fps, 5.7 * fps, 7.767 * fps],
        [0, 100, 111, 154, 197, 239],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : frame;
  return (
    <Base>
      <PaperAside frame={f} />
      <PaperSheet frame={f} />
    </Base>
  );
};
