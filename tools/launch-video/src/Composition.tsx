import { Composition } from "remotion";
import { HalliePivotFilm } from "./HalliePivotFilm";
import { GradyFilm } from "./GradyFilm";

export const MyComposition = () => (
  <>
    <Composition id="SpreadHalliePivot" component={HalliePivotFilm} durationInFrames={900} fps={30} width={1920} height={1080} />
    <Composition id="SpreadGrady" component={GradyFilm} durationInFrames={900} fps={30} width={1920} height={1080} />
  </>
);
