import { useId, type ReactNode } from "react";
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
import type { Hat, SpreadCategory } from "@/lib/spread/model";

/**
 * Hand-drawn icon pairs for the Studio Board (Settings > View > Icons). Each spread gets a glossy
 * tile glyph (the same mark as the round badge, on a rounded square) and a crayon drawing of its
 * category. The drawings are original vector scenes; the crayon look is an SVG filter that wobbles
 * the edges and breaks the color into grain, so they stay sharp at any size and need no images.
 * Outlines are drawn in `currentColor`, which on a role card is the card's proven ink.
 * Everything here is decorative and aria-hidden: the spread's name and hours are always text.
 */
const MARKS: Record<SpreadCategory, string> = { work, school, home, health, family, fitness, business, project, church, personal };

const C = {
  red: "#ef4444", orange: "#fb923c", yellow: "#facc15", green: "#22c55e", teal: "#2dd4bf", blue: "#3b82f6",
  purple: "#a78bfa", pink: "#f9a8d4", brown: "#b45309", cream: "#fff6e0", skin: "#f5c193", grey: "#cbd5e1", night: "#1e293b",
};

function safeId(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

/** The category mark on a glossy rounded square, like an app icon. */
export function DrawnTile({ hat, size }: { hat: Hat; size: number }) {
  const id = safeId(useId());
  const fill = /^#[0-9A-Fa-f]{6}$/.test(hat.color) ? hat.color : "#8E8E93";
  if (!hat.category) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="studio-drawn-tile">
        <defs>
          <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /></linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill={fill} />
        <rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill={`url(#t${id})`} />
        <path d="M12 6.5l1.7 3.6 3.9.5-2.9 2.7.8 3.9L12 15.3l-3.5 1.9.8-3.9-2.9-2.7 3.9-.5z" fill="#fff" />
      </svg>
    );
  }
  const glyph = MARKS[hat.category]
    .replace(/<circle[^>]*r="10"[^>]*\/>/, `<rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill="${fill}"/><rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill="url(#t${id})"/>`)
    .replace(/<svg([^>]*)>/, `<svg$1 width="${size}" height="${size}" aria-hidden="true" class="studio-drawn-tile"><defs><linearGradient id="t${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`);
  return <span className="inline-grid shrink-0 leading-none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: glyph }} />;
}

const line = { stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Sparks({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g stroke={C.yellow} strokeWidth="2.4" strokeLinecap="round">
      <path d={`M${x} ${y + 8} l${-5 * s} -4`} />
      <path d={`M${x + 4 * s} ${y + 2} l${-2 * s} -6`} />
      <path d={`M${x + 11 * s} ${y + 1} l${1 * s} -6`} />
    </g>
  );
}

function Steam({ x, y }: { x: number; y: number }) {
  return <path d={`M${x} ${y} q-3 -4 0 -8 q3 -4 0 -8 M${x + 6} ${y} q-3 -4 0 -8`} fill="none" {...line} strokeWidth={1.6} />;
}

const SCENES: Record<SpreadCategory | "custom", () => ReactNode> = {
  work: () => (
    <>
      <rect x="18" y="14" width="48" height="34" rx="3" fill={C.teal} {...line} />
      <rect x="23" y="19" width="38" height="24" rx="1.5" fill={C.night} />
      <path d="M27 24l10 10M33 22l14 14" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 52h68l-7 9H15z" fill={C.grey} {...line} />
      <rect x="78" y="40" width="17" height="21" rx="3" fill={C.cream} {...line} />
      <path d="M95 45q8 0 8 6t-8 6" fill="none" {...line} />
      <Steam x={83} y={35} />
      <g transform="rotate(8 98 18)"><rect x="88" y="8" width="20" height="18" rx="1.5" fill={C.yellow} {...line} /><path d="M92 14h11M92 19h8" {...line} strokeWidth={1.6} /></g>
      <Sparks x={10} y={6} />
    </>
  ),
  school: () => (
    <>
      <rect x="18" y="50" width="58" height="12" rx="2" fill={C.orange} {...line} />
      <rect x="23" y="38" width="52" height="12" rx="2" fill={C.blue} {...line} />
      <rect x="16" y="26" width="56" height="12" rx="2" fill={C.green} {...line} />
      <path d="M66 29v6M69 41v6M70 53v6" stroke={C.cream} strokeWidth="2" strokeLinecap="round" />
      <path d="M90 32c-8-5-16 1-15 10 1 10 8 18 15 15 7 3 14-5 15-15 1-9-7-15-15-10z" fill={C.red} {...line} />
      <path d="M90 32l2-8" {...line} />
      <path d="M93 25c4-5 10-4 11-2-3 3-8 4-11 2z" fill={C.green} {...line} strokeWidth={1.6} />
      <path d="M108 8l2 4 4 .6-3 2.8.8 4-3.8-2-3.8 2 .8-4-3-2.8 4-.6z" fill={C.yellow} {...line} strokeWidth={1.4} />
    </>
  ),
  home: () => (
    <>
      <circle cx="98" cy="17" r="8" fill={C.yellow} {...line} />
      <path d="M98 3v3M110 9l-2 2M112 18h-3M86 9l2 2" stroke={C.yellow} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="64" y="17" width="8" height="13" fill={C.red} {...line} />
      <rect x="28" y="36" width="46" height="28" rx="1.5" fill={C.cream} {...line} />
      <path d="M22 39L51 14l29 25z" fill={C.red} {...line} />
      <rect x="45" y="47" width="12" height="17" rx="1.5" fill={C.blue} {...line} />
      <rect x="32" y="42" width="9" height="9" fill="#93c5fd" {...line} strokeWidth={1.6} />
      <rect x="62" y="42" width="8" height="9" fill="#93c5fd" {...line} strokeWidth={1.6} />
      <circle cx="96" cy="48" r="10" fill={C.green} {...line} />
      <path d="M96 58v8" stroke={C.brown} strokeWidth="3" strokeLinecap="round" />
      <path d="M8 66q52-5 106 0" fill="none" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  health: () => (
    <>
      <path d="M44 64C18 47 20 22 35 22c6 0 9 6 9 6s3-6 9-6c15 0 17 25-9 42z" fill={C.red} {...line} />
      <path d="M24 42h11l4-8 6 16 4-8h12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="80" y="26" width="17" height="38" rx="5" fill="#93c5fd" {...line} />
      <rect x="83" y="18" width="11" height="8" rx="1.5" fill={C.teal} {...line} />
      <path d="M80 40h17" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" />
      <path d="M106 60c0-10 6-14 8-14-1 8-4 12-8 14z" fill={C.green} {...line} strokeWidth={1.6} />
      <Sparks x={64} y={8} />
    </>
  ),
  family: () => (
    <>
      <path d="M22 66q0-26 13-26t13 26z" fill={C.blue} {...line} />
      <circle cx="35" cy="29" r="8" fill={C.skin} {...line} />
      <path d="M48 66q0-22 12-22t12 22z" fill={C.pink} {...line} />
      <circle cx="60" cy="34" r="7" fill={C.skin} {...line} />
      <path d="M72 66q0-15 9-15t9 15z" fill={C.green} {...line} />
      <circle cx="81" cy="44" r="5.5" fill={C.skin} {...line} />
      <path d="M101 24c-6-6-12 0-7 5l7 7 7-7c5-5-1-11-7-5z" fill={C.red} {...line} strokeWidth={1.8} />
      <path d="M8 66h104" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" />
      <Sparks x={10} y={10} />
    </>
  ),
  fitness: () => (
    <>
      <path d="M26 46h40" {...line} strokeWidth={4} />
      <rect x="14" y="32" width="9" height="28" rx="2.5" fill={C.purple} {...line} />
      <rect x="23" y="37" width="6" height="18" rx="2" fill={C.purple} {...line} />
      <rect x="69" y="32" width="9" height="28" rx="2.5" fill={C.purple} {...line} />
      <rect x="63" y="37" width="6" height="18" rx="2" fill={C.purple} {...line} />
      <rect x="88" y="26" width="16" height="38" rx="5" fill={C.teal} {...line} />
      <rect x="91" y="18" width="10" height="8" rx="1.5" fill={C.blue} {...line} />
      <path d="M88 44h16" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" />
      <path d="M8 68q50-4 104 0" fill="none" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" />
      <Sparks x={36} y={14} />
    </>
  ),
  business: () => (
    <>
      <path d="M14 14v50h56" fill="none" {...line} />
      <rect x="22" y="46" width="10" height="18" rx="1.5" fill={C.blue} {...line} />
      <rect x="36" y="36" width="10" height="28" rx="1.5" fill={C.teal} {...line} />
      <rect x="50" y="26" width="10" height="38" rx="1.5" fill={C.green} {...line} />
      <path d="M20 38l14-10 12 5 20-19" fill="none" stroke={C.orange} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M58 13l8 1-1 8" fill="none" stroke={C.orange} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M86 40v-5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5" fill="none" {...line} />
      <rect x="76" y="40" width="34" height="24" rx="3" fill={C.brown} {...line} />
      <path d="M76 50h34" {...line} strokeWidth={1.6} />
    </>
  ),
  project: () => (
    <>
      <rect x="22" y="14" width="42" height="52" rx="4" fill={C.cream} {...line} />
      <rect x="35" y="9" width="16" height="9" rx="2" fill={C.orange} {...line} />
      <g {...line} strokeWidth={1.8} fill="none">
        <rect x="28" y="25" width="7" height="7" rx="1" /><rect x="28" y="38" width="7" height="7" rx="1" /><rect x="28" y="51" width="7" height="7" rx="1" />
        <path d="M39 29h18M39 42h18M39 55h12" />
      </g>
      <path d="M29 28l2.5 2.5L36 24M29 41l2.5 2.5L36 37" fill="none" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="90" cy="32" r="13" fill={C.yellow} {...line} />
      <path d="M86 38q4-8 8 0" fill="none" {...line} strokeWidth={1.6} />
      <rect x="84" y="45" width="12" height="9" rx="2" fill={C.grey} {...line} />
      <path d="M90 9V5M106 18l3-2M74 18l-3-2M110 32h4M66 32h4" stroke={C.yellow} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  church: () => (
    <>
      <path d="M12 22q0-7 7-7 2-6 9-5 6 1 6 7 6 0 6 5z" fill="#fff" {...line} strokeWidth={1.8} />
      <circle cx="100" cy="17" r="8" fill={C.yellow} {...line} />
      <path d="M100 3v3M112 17h-3M110 7l-2 2" stroke={C.yellow} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="51" y="14" width="10" height="16" fill={C.cream} {...line} />
      <path d="M56 3v10M52 7h8" {...line} />
      <rect x="34" y="38" width="44" height="26" rx="1.5" fill={C.cream} {...line} />
      <path d="M28 40l28-19 28 19z" fill={C.red} {...line} />
      <path d="M50 64V54a6 6 0 0 1 12 0v10z" fill={C.brown} {...line} />
      <circle cx="56" cy="34" r="3" fill="#93c5fd" {...line} strokeWidth={1.4} />
      <circle cx="96" cy="50" r="9" fill={C.green} {...line} />
      <path d="M96 59v7" stroke={C.brown} strokeWidth="3" strokeLinecap="round" />
      <path d="M8 66q52-5 106 0" fill="none" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  personal: () => (
    <>
      <g transform="rotate(-8 42 40)">
        <rect x="20" y="14" width="42" height="50" rx="4" fill={C.pink} {...line} />
        <path d="M27 14v50" {...line} strokeWidth={1.6} />
        <path d="M44 46c-9-6-8-14-3-14 2 0 3 2 3 2s1-2 3-2c5 0 6 8-3 14z" fill={C.red} {...line} strokeWidth={1.6} />
      </g>
      <path d="M58 64l18-26" stroke={C.blue} strokeWidth="5" strokeLinecap="round" />
      <path d="M57 66l1-3" {...line} />
      <rect x="82" y="40" width="18" height="22" rx="3" fill={C.purple} {...line} />
      <path d="M100 45q8 0 8 6t-8 6" fill="none" {...line} />
      <Steam x={87} y={35} />
      <Sparks x={66} y={10} />
    </>
  ),
  custom: () => (
    <>
      <g transform="rotate(-5 56 40)">
        <rect x="24" y="14" width="60" height="50" rx="4" fill={C.cream} {...line} />
        <path d="M34 10v8M46 10v8M58 10v8M70 10v8" {...line} />
      </g>
      <path d="M54 22l5 10 11 1.6-8 7.6 2 11L54 47l-10 5.2 2-11-8-7.6 11-1.6z" fill={C.yellow} {...line} />
      <path d="M100 18l1.5 3 3.5.5-2.5 2.4.6 3.5-3.1-1.6-3.1 1.6.6-3.5-2.5-2.4 3.5-.5z" fill={C.blue} {...line} strokeWidth={1.4} />
      <path d="M98 50l1.2 2.4 2.8.4-2 1.9.5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-1.9 2.8-.4z" fill={C.pink} {...line} strokeWidth={1.4} />
      <Sparks x={10} y={42} />
    </>
  ),
};

/** A crayon drawing of a spread's category. Decorative. */
export function Doodle({ hat, className }: { hat: Hat; className?: string }) {
  const id = safeId(useId());
  const scene = SCENES[hat.category ?? "custom"] ?? SCENES.custom;
  return (
    <svg viewBox="0 0 120 80" className={className ?? "studio-doodle"} aria-hidden="true" focusable="false">
      <defs>
        <filter id={`c${id}`} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="wobble" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.55" result="mask" />
          <feComposite in="wobble" in2="mask" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#c${id})`}>{scene()}</g>
    </svg>
  );
}

export const DOODLE_CATEGORIES = Object.keys(SCENES) as (SpreadCategory | "custom")[];
