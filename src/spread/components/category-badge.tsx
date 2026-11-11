import business from "../../../public/icons/icon-category-business.svg?raw";
import church from "../../../public/icons/icon-category-church.svg?raw";
import family from "../../../public/icons/icon-category-family.svg?raw";
import fitness from "../../../public/icons/icon-category-fitness.svg?raw";
import health from "../../../public/icons/icon-category-health.svg?raw";
import home from "../../../public/icons/icon-category-home.svg?raw";
import personal from "../../../public/icons/icon-category-personal.svg?raw";
import project from "../../../public/icons/icon-category-project.svg?raw";
import school from "../../../public/icons/icon-category-school.svg?raw";
import work from "../../../public/icons/icon-category-work.svg?raw";
import type { SpreadCategory } from "@/lib/spread/model";

const MARKS: Record<SpreadCategory, string> = {
  work,
  school,
  home,
  health,
  family,
  fitness,
  business,
  project,
  church,
  personal,
};

/** WCAG relative luminance: black ink on bright role colours, white otherwise. */
function categoryInk(hex: string): "#16212A" | "#FFFFFF" {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.30 ? "#16212A" : "#FFFFFF";
}

/** Same Lucide outline shapes as native RoleBadge, tinted by stored role colour. */
export function CategoryBadge({ category, color, size }: { category: SpreadCategory; color: string; size: number }) {
  const fill = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#8E8E93";
  const ink = categoryInk(fill);
  const svg = MARKS[category]
    .replace(/(<rect[^>]*\bfill=")#[0-9A-Fa-f]{6}(")/, `$1${fill}$2`)
    .replace(/(data-spread-category-glyph="true"[^>]*\bstroke=")#[0-9A-Fa-f]{3,6}(")/, `$1${ink}$2`)
    .replace("<svg ", `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false" `);
  return <span className="inline-grid shrink-0 leading-none" dangerouslySetInnerHTML={{ __html: svg }} />;
}
