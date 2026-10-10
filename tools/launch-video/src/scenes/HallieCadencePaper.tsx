import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base } from "../design";
import { PaperAside, PaperSheet } from "./Paper";

export const HallieCadencePaper = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const paperFrame = interpolate(
    frame,
    [0, 3.15 * fps, 3.38 * fps, 4.82 * fps, 6.29 * fps, 7.65 * fps],
    [0, 100, 111, 154, 197, 239],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <Base>
      <PaperAside frame={paperFrame} />
      <PaperSheet frame={paperFrame} />
    </Base>
  );
};
