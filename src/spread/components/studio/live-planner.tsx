/**
 * Apply a saved per-profile appearance to the REAL Spread/Week planner, not just Studio preview.
 * No planner writes. The image handle is transient, scoped and revoked on profile switch.
 */
import { useEffect, useState, type ReactNode } from "react";
import { STUDIO_FLAG, type StudioAppearanceV1 } from "@/lib/spread/studio/contract";
import { boardStudioAppearance } from "@/lib/spread/studio/presets";
import { loadStudioAppearance } from "@/lib/spread/studio/persistence";
import { StudioAppearanceScope } from "./render";
import { browserStudioStorage, studioAssetStore } from "./studio-bridge";

export const STUDIO_APPEARANCE_SAVED_EVENT = "spread:studio-appearance-saved";

type Display = {
  profileId: string;
  appearance: StudioAppearanceV1;
  wallpaper: { assetId: string; url: string } | null;
};

export function StudioLivePlanner({ profileId, children }: { profileId: string | null; children: ReactNode }) {
  const [display, setDisplay] = useState<Display | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!STUDIO_FLAG) return;
    const onSaved = (event: Event) => {
      const savedProfileId = (event as CustomEvent<{ profileId?: string }>).detail?.profileId;
      if (savedProfileId === profileId) setRevision((count) => count + 1);
    };
    window.addEventListener(STUDIO_APPEARANCE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(STUDIO_APPEARANCE_SAVED_EVENT, onSaved);
  }, [profileId]);

  useEffect(() => {
    if (!STUDIO_FLAG || !profileId) return;
    let cancelled = false;
    let ownedUrl: string | null = null;
    // Rendering the original while loading prevents any previous profile's photo being shown.
    const load = async () => {
      try {
        const assets = await studioAssetStore();
        const read = await loadStudioAppearance(browserStudioStorage(), assets, profileId, { enabled: true });
        let wallpaper: Display["wallpaper"] = null;
        if (read.assetId && assets) {
          const row = await assets.get(profileId, read.assetId);
          if (row && !cancelled) {
            const mime = row.format === "webp" ? "image/webp" : "image/jpeg";
            ownedUrl = URL.createObjectURL(new Blob([new Uint8Array(row.bytes)], { type: mime }));
            wallpaper = { assetId: read.assetId, url: ownedUrl };
          }
        }
        if (cancelled) return;
        setDisplay({ profileId, appearance: read.state === "saved" ? read.appearance : boardStudioAppearance(), wallpaper });
      } catch {
        if (!cancelled) setDisplay({ profileId, appearance: boardStudioAppearance(), wallpaper: null });
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    };
  }, [profileId, revision]);

  if (!STUDIO_FLAG) return children;
  const current = display?.profileId === profileId ? display : null;
  return (
    <StudioAppearanceScope
      appearance={current?.appearance ?? boardStudioAppearance()}
      wallpaper={current?.wallpaper ?? null}
    >
      {children}
    </StudioAppearanceScope>
  );
}
