import { Img, staticFile, useCurrentFrame } from "remotion";
import { Base, Brand, C, ease } from "../design";
export const Ending = ({
  tagline = "Make time for what matters.",
}: {
  tagline?: string;
}) => {
  const f = useCurrentFrame();
  return (
    <Base>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: ease(f, 0, 16),
        }}
      >
        <Brand size={115} />
        <div
          style={{
            fontSize: 90,
            lineHeight: 1.15,
            fontWeight: 520,
            letterSpacing: -4,
            marginTop: 52,
          }}
        >
          {tagline}
        </div>
        <div style={{ width: 299.160175, height: 100, marginTop: 44 }} />
        <div style={{ fontSize: 23, color: C.muted, marginTop: 44 }}>
          No account. On your device. At your pace.
        </div>
      </div>
      <Img
        src={staticFile("assets/app-store-badge.svg")}
        alt="Download on the App Store"
        style={{
          position: "absolute",
          left: 810.4199125,
          top: 612,
          height: 100,
          width: 299.160175,
        }}
      />
    </Base>
  );
};
