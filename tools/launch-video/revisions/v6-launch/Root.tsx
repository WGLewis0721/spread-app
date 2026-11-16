import { Composition } from "remotion";
import { SpreadV6Launch } from "./V6Film";

export const RemotionRootV6: React.FC = () => (
  <Composition id="SpreadV6Launch" component={SpreadV6Launch} durationInFrames={900} fps={30} width={1080} height={1920} />
);
