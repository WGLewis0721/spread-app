import { useCurrentFrame } from "remotion";
import { Base, C, ease, Kicker } from "../design";
export const Pause = () => {
  const f = useCurrentFrame();
  return (
    <Base>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Kicker style={{ opacity: ease(f, 0, 15) }}>
          A simple change in order.
        </Kicker>
        <div
          style={{
            fontSize: 140,
            fontWeight: 520,
            letterSpacing: -8,
            marginTop: 35,
            opacity: ease(f, 8, 28),
            translate: `0 ${ease(f, 8, 28, 25, 0)}px`,
          }}
        >
          Pause.
        </div>
        <div
          style={{
            fontSize: 42,
            color: C.muted,
            marginTop: 34,
            opacity: ease(f, 35, 60),
          }}
        >
          Start with what matters.
        </div>
      </div>
    </Base>
  );
};
