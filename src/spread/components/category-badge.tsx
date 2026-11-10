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

/** Shared category vector: the same Lucide paths ship in iOS Icons.xcassets.
 *  Render category tile in the role's current colour, never the source SVG's
 *  suggested default colour. No external icon library is loaded at runtime.
 */
export function CategoryBadge({ category, color, size }: { category: SpreadCategory; color: string; size: number }) {
  const fill = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#8E8E93";
  const svg = MARKS[category]
    .replace(/(<rect[^>]*\bfill=")#[0-9A-Fa-f]{6}(")/, `$1${fill}$2`)
    .replace("<svg ", `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false" `);
  return <span className="inline-grid shrink-0 leading-none" dangerouslySetInnerHTML={{ __html: svg }} />;
}
