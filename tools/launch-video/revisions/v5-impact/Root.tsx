import { Composition } from "remotion";
import { SpreadV5Impact } from "./V5Film";

export const RemotionRootV5: React.FC = () => (
  <Composition id="SpreadV5Impact" component={SpreadV5Impact} durationInFrames={900} fps={30} width={1080} height={1920} />
);
