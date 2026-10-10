import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/fonts";
loadFont({
  family: "Spread",
  url: staticFile("assets/inter.woff2"),
  weight: "100 900",
});
export const C = {
  paper: "#F6F1E7",
  ink: "#171717",
  muted: "#68645D",
  blue: "#0A84FF",
  sheet: "#FFFCF6",
};
export const roles = [
  {
    name: "Work",
    color: "#34C759",
    hours: 2,
    day: "Monday",
    task: "Finish the proposal",
    purpose: "One clear priority",
  },
  {
    name: "Home",
    color: "#FF9500",
    hours: 1,
    day: "Wednesday",
    task: "Plan the meals",
    purpose: "A lighter week at home",
  },
  {
    name: "Family",
    color: "#AF52DE",
    hours: 2,
    day: "Friday",
    task: "Plan dinner",
    purpose: "An evening together",
  },
  {
    name: "Self",
    color: "#0A84FF",
    hours: 1,
    day: "Sunday",
    task: "Take a walk",
    purpose: "A little room to breathe",
  },
];
export const ease = (f: number, start: number, end: number, a = 0, b = 1) =>
  interpolate(f, [start, end], [a, b], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
export const Base = ({ children }: { children: ReactNode }) => (
  <AbsoluteFill
    style={{
      background: C.paper,
      color: C.ink,
      fontFamily: "Spread, Arial, sans-serif",
      overflow: "hidden",
    }}
  >
    <Img
      src={staticFile("assets/paper-texture.png")}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: 0.38,
      }}
    />
    {children}
  </AbsoluteFill>
);
export const Kicker = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      fontSize: 21,
      letterSpacing: 3.5,
      textTransform: "uppercase",
      color: C.muted,
      ...style,
    }}
  >
    {children}
  </div>
);
export const Hat = ({ color, size = 82 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path
      d="M17 68h66M25 65l7-34h36l7 34M30 52h40"
      stroke={color}
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const Brand = ({ size = 64 }: { size?: number }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: size * 0.26,
      fontSize: size * 0.68,
      fontWeight: 580,
      letterSpacing: -size * 0.03,
    }}
  >
    <Img
      src={staticFile("assets/app-icon-spread-cards-square.svg")}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
    />
    Spread
  </div>
);
export const SceneFade = ({
  children,
  duration,
}: {
  children: ReactNode;
  duration: number;
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(
          ease(f, 0, 10),
          interpolate(f, [duration - 10, duration], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        ),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
