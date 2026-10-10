import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { C, SceneFade } from "./design";
import { Pressure } from "./scenes/Pressure";
import { Pause } from "./scenes/Pause";
import { HallieCadencePaper } from "./scenes/HallieCadencePaper";
import { HallieCadenceProduct } from "./scenes/HallieCadenceProduct";
import { Morph } from "./scenes/Morph";
import { Ending } from "./scenes/Ending";

export const HalliePivotFilm = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Sequence name="01 — One thought at a time" durationInFrames={9.6 * fps} premountFor={fps}>
        <SceneFade duration={9.6 * fps}><Pressure /></SceneFade>
      </Sequence>
      <Sequence name="02 — Pause, then plan" from={(288 / 30) * fps} durationInFrames={(104 / 30) * fps} premountFor={fps}>
        <SceneFade duration={(104 / 30) * fps}><Pause /></SceneFade>
      </Sequence>
      <Sequence name="03 — Let each step land" from={(392 / 30) * fps} durationInFrames={(231 / 30) * fps} premountFor={fps}>
        <HallieCadencePaper />
      </Sequence>
      <Sequence name="04 — Paper becomes Spread" from={(623 / 30) * fps} durationInFrames={3 * fps} premountFor={fps}>
        <Morph />
      </Sequence>
      <Sequence name="05 — Your week, your tasks" from={(713 / 30) * fps} durationInFrames={(125 / 30) * fps} premountFor={fps}>
        <HallieCadenceProduct />
      </Sequence>
      <Sequence name="06 — Make the Hours Count" from={(838 / 30) * fps} durationInFrames={(62 / 30) * fps} premountFor={fps}>
        <Ending tagline="Make the Hours Count" />
      </Sequence>
      <Audio src={staticFile("assets/hallie-pivot/narration-hallie.wav")} durationInFrames={30 * fps} premountFor={fps} volume={0.60} />
      <Audio src={staticFile("assets/hallie-pivot/score-116bpm.wav")} durationInFrames={30 * fps} premountFor={fps} volume={1} />
    </AbsoluteFill>
  );
};

