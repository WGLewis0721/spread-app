import { Composition } from "remotion";
import { SpreadV3Vertical } from "./V3Film";

export const RemotionRootV3: React.FC = () => (
  <Composition id="SpreadV3Vertical" component={SpreadV3Vertical} durationInFrames={900} fps={30} width={1080} height={1920} />
);
