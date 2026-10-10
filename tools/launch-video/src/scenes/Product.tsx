import { useCurrentFrame } from "remotion";
import { Base, C, ease, Kicker } from "../design";
import { Planner } from "../Planner";
export const Product = () => {
  const f = useCurrentFrame();
  const week = ease(f, 77, 94);
  return (
    <Base>
      <div style={{ position: "absolute", left: 120, top: 155 }}>
        <Kicker>A considered week.</Kicker>
        <div
          style={{
            fontSize: 83,
            lineHeight: 1.25,
            fontWeight: 540,
            letterSpacing: -4,
            marginTop: 30,
          }}
        >
          Responsibilities.
          <br />
          <span style={{ opacity: ease(f, 44, 56) }}>Hours.</span>
          <br />
          <span style={{ opacity: ease(f, 79, 91) }}>Your week.</span>
          <br />
          <span style={{ opacity: ease(f, 115, 127), color: C.blue }}>
            Your tasks.
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: ease(f, 0, 45, 1125, 1000),
          top: 45,
          width: 440,
          height: 990,
          boxShadow: "0 30px 65px #17171720",
          borderRadius: 40,
        }}
      >
        <Planner />
        <div style={{ position: "absolute", inset: 0, opacity: week }}>
          <Planner mode="week" />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1420,
          top: 600,
          width: 370,
          padding: 26,
          borderRadius: 25,
          background: "#fff",
          boxShadow: "0 12px 50px #17171715",
          opacity: ease(f, 101, 120),
          translate: `${ease(f, 101, 120, 30, 0)}px 0`,
        }}
      >
        <div style={{ fontSize: 17, color: "#AF52DE", marginBottom: 12 }}>
          FAMILY · 2 HOURS
        </div>
        <div style={{ fontSize: 31, fontWeight: 550 }}>
          An evening together.
        </div>
        <div style={{ fontSize: 21, marginTop: 20, lineHeight: 1.8 }}>
          ○ Plan dinner
          <br />○ Put phones away
        </div>
      </div>
    </Base>
  );
};
