import { Freeze, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Product } from "./Product";

export const GradyProduct = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const productFrame = Math.round(interpolate(frame, [0, 5.6 * fps], [0, 150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return <Freeze frame={productFrame}><Product /></Freeze>;
};
