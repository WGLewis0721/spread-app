import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base } from "../design";
import { PaperAside, PaperSheet } from "./Paper";

export const GradyPaper = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const paperFrame = interpolate(frame, [0, 2.6 * fps, 2.85 * fps, 4.15 * fps, 5.55 * fps, 7.0 * fps], [0, 100, 111, 154, 197, 239], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <Base><PaperAside frame={paperFrame} /><PaperSheet frame={paperFrame} /></Base>;
};
