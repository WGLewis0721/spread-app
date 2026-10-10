import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { C, SceneFade } from "./design";
import { Pressure } from "./scenes/Pressure";
import { Pause } from "./scenes/Pause";
import { GradyPaper } from "./scenes/GradyPaper";
import { GradyProduct } from "./scenes/GradyProduct";
import { Morph } from "./scenes/Morph";
import { Ending } from "./scenes/Ending";

export const GradyFilm = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Sequence name="01 — Many hats" durationInFrames={8.7 * fps} premountFor={fps}>
        <SceneFade duration={8.7 * fps}><Pressure /></SceneFade>
      </Sequence>
      <Sequence name="02 — So, pause" from={8.7 * fps} durationInFrames={3.3 * fps} premountFor={fps}>
        <SceneFade duration={3.3 * fps}><Pause /></SceneFade>
      </Sequence>
      <Sequence name="03 — A paper plan" from={12 * fps} durationInFrames={7.1 * fps} premountFor={fps}>
        <GradyPaper />
      </Sequence>
      <Sequence name="04 — Paper becomes Spread" from={19.1 * fps} durationInFrames={(80 / 30) * fps} premountFor={fps}>
        <Morph />
      </Sequence>
      <Sequence name="05 — Your week, your tasks" from={(653 / 30) * fps} durationInFrames={(172 / 30) * fps} premountFor={fps}>
        <GradyProduct />
      </Sequence>
      <Sequence name="06 — Make the Hours Count" from={27.5 * fps} durationInFrames={2.5 * fps} premountFor={fps}>
        <Ending tagline="Make the Hours Count" />
      </Sequence>
      <Audio src={staticFile("assets/grady-v7/narration-grady.wav")} durationInFrames={30 * fps} premountFor={fps} volume={0.60} />
      <Audio src={staticFile("assets/hallie-pivot/score-116bpm.wav")} durationInFrames={30 * fps} premountFor={fps} volume={1} />
    </AbsoluteFill>
  );
};
