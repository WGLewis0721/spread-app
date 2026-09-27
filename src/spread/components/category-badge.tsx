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

export function CategoryBadge({ category, color, size }: { category: SpreadCategory; color: string; size: number }) {
  const fill = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#8E8E93";
  const svg = MARKS[category]
    .replace(/r="10" fill="#[0-9A-Fa-f]+"/, `r="10" fill="${fill}"`)
    .replace("<svg ", `<svg width="${size}" height="${size}" `);
  return <span className="inline-grid shrink-0 leading-none" dangerouslySetInnerHTML={{ __html: svg }} />;
}
