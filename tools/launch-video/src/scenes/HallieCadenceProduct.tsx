import { Freeze, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Product } from "./Product";

export const HallieCadenceProduct = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const productFrame = Math.round(interpolate(
    frame,
    [0, 4.12 * fps],
    [0, 150],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  ));
  return <Freeze frame={productFrame}><Product /></Freeze>;
};
