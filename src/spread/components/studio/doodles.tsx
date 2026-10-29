import { useId } from "react";
import business from "../../../../public/icons/icon-category-business.svg?raw";
import church from "../../../../public/icons/icon-category-church.svg?raw";
import family from "../../../../public/icons/icon-category-family.svg?raw";
import fitness from "../../../../public/icons/icon-category-fitness.svg?raw";
import health from "../../../../public/icons/icon-category-health.svg?raw";
import home from "../../../../public/icons/icon-category-home.svg?raw";
import personal from "../../../../public/icons/icon-category-personal.svg?raw";
import project from "../../../../public/icons/icon-category-project.svg?raw";
import school from "../../../../public/icons/icon-category-school.svg?raw";
import work from "../../../../public/icons/icon-category-work.svg?raw";
import artBusiness from "@/spread/assets/illustrations/business.webp";
import artChurch from "@/spread/assets/illustrations/church.webp";
import artCustom from "@/spread/assets/illustrations/custom.webp";
import artFamily from "@/spread/assets/illustrations/family.webp";
import artFitness from "@/spread/assets/illustrations/fitness.webp";
import artHealth from "@/spread/assets/illustrations/health.webp";
import artHome from "@/spread/assets/illustrations/home.webp";
import artPersonal from "@/spread/assets/illustrations/personal.webp";
import artProject from "@/spread/assets/illustrations/project.webp";
import artSchool from "@/spread/assets/illustrations/school.webp";
import artWork from "@/spread/assets/illustrations/work.webp";
import type { Hat, SpreadCategory } from "@/lib/spread/model";
import { CUSTOM_GLYPH, GLYPH_BOX, glyphFromMark, tileSvg } from "@/lib/spread/studio/tile";

/**
 * Hand-drawn icon pairs for the Studio Board (Settings > View > Icons), built to
 * docs/spread-studio/ICON_SPEC.md. Each spread gets a glossy glyph tile (the app's own category
 * mark, in the tile language measured on the owner's icon board) and the owner's crayon
 * illustration for its category on a paper panel. Spreads with no category use the Custom pair.
 * The illustrations are decorative: images have empty alt text and the wrappers are aria-hidden,
 * because the spread's name and hours are always text beside them.
 */
const MARKS: Record<SpreadCategory, string> = { work, school, home, health, family, fitness, business, project, church, personal };

const ART: Record<SpreadCategory | "custom", string> = {
  work: artWork, school: artSchool, home: artHome, health: artHealth, family: artFamily, fitness: artFitness,
  business: artBusiness, project: artProject, church: artChurch, personal: artPersonal, custom: artCustom,
};

function safeId(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

/** The glossy glyph tile. */
export function DrawnTile({ hat, size }: { hat: Hat; size: number }) {
  const id = safeId(useId());
  const key = hat.category ?? "custom";
  const glyph = hat.category ? glyphFromMark(MARKS[hat.category]) : CUSTOM_GLYPH;
  const svg = tileSvg({ color: hat.color, glyph, size, id, box: GLYPH_BOX[key] });
  return <span className="studio-drawn-tile-wrap" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** The crayon illustration on its paper panel. */
export function Illustration({ hat, className }: { hat: Hat; className?: string }) {
  return (
    <span className={className ? `studio-illus ${className}` : "studio-illus"} aria-hidden="true">
      <img src={ART[hat.category ?? "custom"]} alt="" width={262} height={182} loading="lazy" decoding="async" draggable={false} />
    </span>
  );
}
