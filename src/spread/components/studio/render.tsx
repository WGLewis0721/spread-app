import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import "./render.css";
import { useSpread } from "@/lib/spread/store";
import { STUDIO_APPEARANCE_ATTRIBUTE, STUDIO_FLAG, type StudioAppearanceV1 } from "@/lib/spread/studio/contract";
import {
  resolveStudioScope,
  type StudioMaterialGates,
  type StudioWallpaperHandle,
} from "@/lib/spread/studio/appearance";

/** True when a wallpaper Studio look is applied. The Spread tab uses it to stack its role cards. */
const StudioStackContext = createContext(false);
export function useStudioStack(): boolean {
  return useContext(StudioStackContext);
}

/**
 * SpreadApp renders the Studio scope itself, so it sits above the context. This probe lives
 * inside the scope and reports the value up.
 */
export function StudioStackProbe({ onChange }: { onChange: (on: boolean) => void }) {
  const on = useStudioStack();
  useEffect(() => {
    onChange(on);
  }, [on, onChange]);
  return null;
}

/**
 * Sheets are portaled. Rendered into <body> they would sit outside the scope and show the
 * shipped look. They portal into the scope element instead, so the same variables reach them.
 * Undefined outside a scope (flag off), which leaves Radix on its default container.
 */
const StudioPortalContext = createContext<HTMLElement | null>(null);
export function useStudioPortal(): HTMLElement | undefined {
  return useContext(StudioPortalContext) ?? undefined;
}

type ScopeProps = {
  /** Omitted, or the original id, leaves the shipped look in place. */
  appearance?: unknown;
  lookupId?: string;
  catalog?: readonly StudioAppearanceV1[];
  /** Resolved by asset storage. Pixels are not stored here. */
  wallpaper?: StudioWallpaperHandle | null;
  gates?: Partial<StudioMaterialGates>;
  children: ReactNode;
};

/**
 * Flag off: the children are returned with no wrapper and no attribute.
 * Flag on: variables live on this element only, not on the planner theme attribute.
 */
export function StudioAppearanceScope({ children, ...rest }: ScopeProps) {
  if (!STUDIO_FLAG) return children;
  return <StudioAppearanceScopeLive {...rest}>{children}</StudioAppearanceScopeLive>;
}

function useMediaFlag(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const apply = () => setMatches(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [query]);
  return matches;
}

/** Natural aspect (height / width) of the local wallpaper, read once from its own object URL. */
function useImageAspect(url: string | null): number {
  const [aspect, setAspect] = useState(1.8);
  useEffect(() => {
    if (!url) return;
    let live = true;
    const image = new Image();
    image.onload = () => { if (live && image.naturalWidth > 0) setAspect(image.naturalHeight / image.naturalWidth); };
    image.src = url;
    return () => { live = false; };
  }, [url]);
  return aspect;
}

function useViewport(): { w: number; h: number } {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const on = () => setSize(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

function StudioAppearanceScopeLive({ appearance, lookupId, catalog, wallpaper, gates, children }: ScopeProps) {
  const reducedMotion = useMediaFlag("(prefers-reduced-motion: reduce)");
  const reducedTransparency = useMediaFlag("(prefers-reduced-transparency: reduce)");
  const moreContrast = useMediaFlag("(prefers-contrast: more)");
  const systemDark = useMediaFlag("(prefers-color-scheme: dark)");
  // Planner Settings is the source of truth for Studio "System". The OS is consulted
  // only when the planner itself is set to System; explicit Studio modes still win.
  const plannerTheme = useSpread((state) => state.theme);
  const inheritedScheme = plannerTheme === "system" ? (systemDark ? "dark" : "light") : plannerTheme;
  const scope = resolveStudioScope({
    enabled: true,
    appearance,
    lookupId,
    catalog,
    wallpaper,
    gates,
    systemScheme: inheritedScheme,
    reducedMotion,
    reducedTransparency,
    moreContrast,
  });
  const aspect = useImageAspect(scope.wallpaper);
  const viewport = useViewport();
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  if (!scope.attribute) return children;
  // Cover height of the fixed wallpaper layer (it bleeds 24px past the viewport on every side).
  const wallpaperHeight = Math.max(viewport.h + 48, (viewport.w + 48) * aspect);
  const style = {
    ...scope.style,
    "--studio-wp-h": `${Math.round(wallpaperHeight)}px`,
    colorScheme: scope.scheme,
  } as CSSProperties;
  return (
    <div
      {...{ [STUDIO_APPEARANCE_ATTRIBUTE]: scope.attribute }}
      data-studio-material={scope.material}
      data-studio-scheme={scope.scheme}
      data-studio-density={scope.density}
      data-studio-controls={scope.controls}
      data-studio-crown={scope.parts.crown}
      data-studio-responsibilities={scope.parts.responsibilities}
      data-studio-week={scope.parts.week}
      data-studio-tasks={scope.parts.tasks}
      data-studio-dock={scope.parts.dock}
      data-studio-wallpaper={scope.wallpaper ? "on" : "off"}
      data-studio-board={scope.board ? "on" : "off"}
      style={style}
      ref={setPortal}
    >
      <StudioPortalContext.Provider value={scope.board ? portal : null}>
        <StudioStackContext.Provider value={scope.board}>{children}</StudioStackContext.Provider>
      </StudioPortalContext.Provider>
    </div>
  );
}
