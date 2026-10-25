import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import "./render.css";
import { STUDIO_APPEARANCE_ATTRIBUTE, STUDIO_FLAG, type StudioAppearanceV1 } from "@/lib/spread/studio/contract";
import {
  resolveStudioScope,
  type StudioMaterialGates,
  type StudioWallpaperHandle,
} from "@/lib/spread/studio/appearance";

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

function StudioAppearanceScopeLive({ appearance, lookupId, catalog, wallpaper, gates, children }: ScopeProps) {
  const reducedMotion = useMediaFlag("(prefers-reduced-motion: reduce)");
  const reducedTransparency = useMediaFlag("(prefers-reduced-transparency: reduce)");
  const moreContrast = useMediaFlag("(prefers-contrast: more)");
  const systemDark = useMediaFlag("(prefers-color-scheme: dark)");
  const scope = resolveStudioScope({
    enabled: true,
    appearance,
    lookupId,
    catalog,
    wallpaper,
    gates,
    systemScheme: systemDark ? "dark" : "light",
    reducedMotion,
    reducedTransparency,
    moreContrast,
  });
  if (!scope.attribute) return children;
  const style = { ...scope.style, colorScheme: scope.scheme } as CSSProperties;
  return (
    <div
      {...{ [STUDIO_APPEARANCE_ATTRIBUTE]: scope.attribute }}
      data-studio-material={scope.material}
      data-studio-scheme={scope.scheme}
      data-studio-density={scope.density}
      style={style}
    >
      {children}
    </div>
  );
}
