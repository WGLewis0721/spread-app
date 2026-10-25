import { formatWeek } from "@/lib/spread/model";
import { useSpread } from "@/lib/spread/store";
import { WeekCrown } from "@/spread/components/week-crown";
import { WeeklyView } from "@/spread/components/weekly-view";
import { StudioAppearanceScope } from "@/spread/components/studio/render";
import type { StudioAppearanceV1 } from "@/lib/spread/studio/contract";
import { STUDIO_UI_COPY } from "./studio-copy";

type PreviewPane = "spread" | "week";

/**
 * Live preview of the current plan. StudioAppearanceScope calls resolveStudioScope
 * and keeps the variables on this container. The frame blocks planning actions.
 */
export function StudioLivePreview({
  pane,
  onPane,
  appearance,
  wallpaperUrl,
}: {
  pane: PreviewPane;
  onPane: (pane: PreviewPane) => void;
  appearance: StudioAppearanceV1;
  wallpaperUrl: string | null;
}) {
  const assetId = appearance.wallpaperAssetId ?? null;
  const wallpaper = assetId && wallpaperUrl ? { assetId, url: wallpaperUrl } : null;
  return (
    <section aria-label={pane === "spread" ? STUDIO_UI_COPY.previewSpread : STUDIO_UI_COPY.previewWeek}>
      <div className="grid grid-cols-2 rounded-full bg-fill p-1" role="tablist" aria-label="Preview">
        {(
          [
            ["spread", STUDIO_UI_COPY.previewSpread],
            ["week", STUDIO_UI_COPY.previewWeek],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`studio-preview-tab-${key}`}
            aria-selected={pane === key}
            aria-controls="studio-preview-panel"
            tabIndex={pane === key ? 0 : -1}
            className={`min-h-11 rounded-full px-3 text-sm font-medium ${pane === key ? "bg-segment text-ink" : "text-secondary"}`}
            onClick={() => onPane(key)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const order = ["spread", "week"] as const;
              const index = order.indexOf(key);
              const next = order[event.key === "ArrowRight" ? Math.min(1, index + 1) : Math.max(0, index - 1)];
              onPane(next);
              window.requestAnimationFrame(() => document.getElementById(`studio-preview-tab-${next}`)?.focus());
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="sr-only">{STUDIO_UI_COPY.previewNote}</p>
      <div id="studio-preview-panel" role="tabpanel" aria-labelledby={`studio-preview-tab-${pane}`} className="studio-preview-frame mt-3">
        <div className="pointer-events-none" inert>
          <StudioAppearanceScope appearance={appearance} wallpaper={wallpaper}>
            {pane === "spread" ? <SpreadReadout /> : <WeekReadout />}
          </StudioAppearanceScope>
        </div>
      </div>
    </section>
  );
}

function SpreadReadout() {
  const data = useSpread((s) => s.data);
  const week = data.weeks[data.currentWeek];
  if (data.hats.length === 0) {
    return <p className="px-4 py-6 text-sm text-secondary">Nothing on this week yet.</p>;
  }
  return (
    <div className="px-3 py-3">
      <p className="px-1 pb-2 text-xs text-secondary">{formatWeek(data.currentWeek)}</p>
      <div className="overflow-hidden rounded-[22px] bg-elevated">
        {data.hats.map((hat, index) => {
          const box = week?.boxes.find((item) => item.hatId === hat.id);
          const hours = box?.hours ?? hat.defaultHours;
          const tasks = box?.tasks ?? [];
          return (
            <section key={hat.id} className="px-4 py-3">
              {index > 0 ? <div className="mb-3 border-t border-line" /> : null}
              <div className="flex min-h-11 items-center gap-3">
                <span className="size-9 shrink-0 rounded-full" style={{ backgroundColor: hat.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[17px]">{hat.name}</span>
                <span className="text-secondary tabular-nums">{hoursLabel(hours)}h</span>
              </div>
              {tasks.length === 0 ? (
                <p className="pb-1 text-sm text-secondary">No tasks</p>
              ) : (
                <ul>
                  {tasks.map((task) => (
                    <li key={task.id} className="flex min-h-11 items-center gap-3 border-t border-line text-sm">
                      <span className="text-secondary">{task.done ? "Done" : "Open"}</span>
                      <span className="min-w-0 flex-1 truncate">{task.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function WeekReadout() {
  const currentWeek = useSpread((s) => s.data.currentWeek);
  return (
    <div className="px-3 pb-4">
      <WeekCrown title={formatWeek(currentWeek)} turn={0} onMove={() => undefined} />
      <WeeklyView onCommit={() => undefined} onTurn={() => undefined} />
    </div>
  );
}

function hoursLabel(hours: number): string {
  if (Number.isInteger(hours)) return String(hours);
  return String(Math.round(hours * 10) / 10);
}
