import { Composition } from "remotion";
import { SpreadV4Social } from "./V4Film";

export const RemotionRootV4: React.FC = () => (
  <Composition id="SpreadV4Social" component={SpreadV4Social} durationInFrames={900} fps={30} width={1080} height={1920} />
);
