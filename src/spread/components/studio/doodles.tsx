import { useId, type CSSProperties } from "react";
import { MOTION, type MotionFx } from "@/spread/components/studio/doodle-motion";
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

/* Chalk effects drawn over the art, in a 144 x 100 box (the art's aspect), from % coordinates. */
const X = (x: number) => x * 1.44;

function Fx({ fx, uid }: { fx: MotionFx; uid: string }) {
  switch (fx.k) {
    case "steam": {
      const x = X(fx.x);
      const step = (fx.w * 1.44) / 3;
      return (
        <g className="studio-fx-steam">
          {[0, 1, 2].map((i) => {
            const d = `M ${x + (i - 1) * step} ${fx.y} q -2.6 -4 0 -8 q 2.6 -4 0 -8 q -2.2 -3.4 0 -6.8`;
            return (
              <g key={i} style={{ animationDelay: `${-i * 0.9}s` }}>
                <path className="studio-fx-halo" d={d} />
                <path d={d} />
              </g>
            );
          })}
        </g>
      );
    }
    case "smoke":
      return (
        <g className="studio-fx-smoke">
          {[0, 1, 2].map((i) => <circle key={i} cx={X(fx.x)} cy={fx.y} r={2.4 + i * 0.6} style={{ animationDelay: `${-i * 1.1}s` }} />)}
        </g>
      );
    case "sparkle":
      return (
        <g transform={`translate(${X(fx.x)} ${fx.y})`}>
          <path className="studio-fx-sparkle" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" style={{ animationDelay: `${fx.d ?? 0}s` }} />
        </g>
      );
    case "shine": {
      const pts = fx.pts.map(([x, y]) => `${X(x)},${y}`).join(" ");
      const xs = fx.pts.map(([x]) => X(x));
      const left = Math.min(...xs);
      const width = Math.max(...xs) - left;
      return (
        <g>
          <clipPath id={`clip${uid}`}><polygon points={pts} /></clipPath>
          <g clipPath={`url(#clip${uid})`}>
            <rect className="studio-fx-shine" x={left - 20} y={0} width={14} height={100} transform="skewX(-22)" style={{ "--travel": `${width + 40}px` } as CSSProperties} />
          </g>
        </g>
      );
    }
    case "glow":
      return (
        <g>
          <radialGradient id={`glow${uid}`}><stop offset="0" stopColor={fx.c} stopOpacity=".55" /><stop offset="1" stopColor={fx.c} stopOpacity="0" /></radialGradient>
          <circle className="studio-fx-glow" cx={X(fx.x)} cy={fx.y} r={fx.r} fill={`url(#glow${uid})`} />
        </g>
      );
    case "shimmer":
      return <path className="studio-fx-shimmer" d={`M ${X(fx.x)} ${fx.y} v 6`} style={{ "--travel": `${fx.h - 6}px` } as CSSProperties} />;
    case "speed":
      return (
        <g className="studio-fx-speed">
          {[0, 1, 2].map((i) => <path key={i} d={`M ${X(fx.x)} ${fx.y + i * 4} h ${6 - i}`} style={{ animationDelay: `${-i * 0.25}s` }} />)}
        </g>
      );
    default:
      return null;
  }
}

/**
 * The chalk illustration, alive: parts cut from the drawing (leaves, hearts, sun, globe, star)
 * move on their own layers, pivoting where they grow from, and chalk effects (steam, smoke,
 * sparkles, a screen glint, a bulb glow) play over the art. All of it is CSS and stops entirely
 * under Reduce Motion. Decorative: aria-hidden, empty alt text.
 */
export function Illustration({ hat, className }: { hat: Hat; className?: string }) {
  const key = hat.category ?? "custom";
  const motion = MOTION[key];
  const uid = safeId(useId());
  return (
    <span className={className ? `studio-illus ${className}` : "studio-illus"} aria-hidden="true">
      <img src={ART[key]} alt="" width={393} height={273} loading="lazy" decoding="async" draggable={false} />
      {motion?.layers.map((layer, index) => (
        <img
          key={index}
          src={layer.src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="studio-motion"
          data-kind={layer.kind}
          style={{
            left: `${layer.box[0]}%`,
            top: `${layer.box[1]}%`,
            width: `${layer.box[2]}%`,
            height: `${layer.box[3]}%`,
            transformOrigin: `${layer.origin[0]}% ${layer.origin[1]}%`,
            "--amp": layer.amp,
            "--dur": `${layer.dur}s`,
            "--delay": `${layer.delay}s`,
          } as CSSProperties}
        />
      ))}
      {motion && motion.fx.length > 0 && (
        <svg className="studio-fx" viewBox="0 0 144 100" preserveAspectRatio="none" focusable="false">
          {motion.fx.map((fx, index) => <Fx key={index} fx={fx} uid={`${uid}${index}`} />)}
        </svg>
      )}
    </span>
  );
}
