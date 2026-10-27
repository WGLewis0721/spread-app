import { formatWeek } from "@/lib/spread/model";
import { useSpread } from "@/lib/spread/store";
import { WeekCrown } from "@/spread/components/week-crown";
import { WeeklyView } from "@/spread/components/weekly-view";
import { StudioAppearanceScope } from "@/spread/components/studio/render";
import type { StudioAppearanceV1 } from "@/lib/spread/studio/contract";
import { STUDIO_UI_COPY } from "./studio-copy";

export type PreviewPane = "spread" | "hours" | "week" | "tasks";
const PANES: readonly PreviewPane[] = ["spread", "hours", "week", "tasks"];

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
    <section aria-label="Preview across the planning workflow">
      <div className="grid grid-cols-4 rounded-full bg-fill p-1" role="tablist" aria-label="Planner preview steps">
        {(
          [
            ["spread", "Roles"],
            ["hours", "Hours"],
            ["week", "Week"],
            ["tasks", "Tasks"],
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
              const index = PANES.indexOf(key);
              const next = PANES[event.key === "ArrowRight" ? Math.min(PANES.length - 1, index + 1) : Math.max(0, index - 1)];
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
            {pane === "spread" ? <SpreadReadout /> : pane === "hours" ? <HoursReadout /> : pane === "tasks" ? <TasksReadout /> : <WeekReadout />}
          </StudioAppearanceScope>
        </div>
        <div className="studio-dock-preview mt-3 flex items-center justify-center gap-3 bg-elevated text-sm font-semibold">
          <span>Spread</span><span aria-hidden="true">·</span><span>Week</span><span aria-hidden="true">·</span><span>Settings</span>
        </div>
      </div>
    </section>
  );
}

function SpreadReadout() {
  const data = useSpread((s) => s.data);
  const week = data.weeks[data.currentWeek];
  if (data.hats.length === 0) {
    return <p className="studio-readable-note px-4 py-6 text-sm text-secondary">Nothing on this week yet.</p>;
  }
  return (
    <div className="px-3 py-3">
      <p className="studio-readable-note px-1 pb-2 text-xs text-secondary">{formatWeek(data.currentWeek)}</p>
      <h3 className="mb-2 px-1 text-sm font-semibold">Responsibilities</h3>
      <div className="studio-responsibility-list rounded-[22px] bg-elevated">
        {data.hats.map((hat, index) => {
          const box = week?.boxes.find((item) => item.hatId === hat.id);
          const hours = box?.hours ?? hat.defaultHours;
          return (
            <section key={hat.id} className="studio-role-card px-4 py-3">
              {index > 0 ? <div className="mb-3 border-t border-line" /> : null}
              <div className="flex min-h-11 items-center gap-3">
                <span className="size-9 shrink-0 rounded-full" style={{ backgroundColor: hat.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[17px]">{hat.name}</span>
                <span className="studio-hour-chip text-secondary tabular-nums">{hoursLabel(hours)}h</span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Actual current plan data: read-only, same budget and responsibility labels. */
function HoursReadout() {
  const data = useSpread((s) => s.data);
  const week = data.weeks[data.currentWeek];
  const entries = data.hats.map((hat) => ({
    id: hat.id, name: hat.name, color: hat.color,
    hours: week?.boxes.find((box) => box.hatId === hat.id)?.hours ?? hat.defaultHours,
  }));
  const total = entries.reduce((sum, item) => sum + item.hours, 0);
  return (
    <div className="p-3">
      <p className="studio-readable-note text-xs text-secondary">{formatWeek(data.currentWeek)}</p>
      <section className="studio-hour-bank mt-3 rounded-[22px] bg-elevated p-4">
        <p className="text-xs font-semibold text-secondary">Allocated this week</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{hoursLabel(total)}h</p>
        <ul className="mt-3">
          {entries.length === 0 ? <li className="text-sm text-secondary">Add a responsibility in Spread to begin.</li> : null}
          {entries.map((entry) => (
            <li key={entry.id} className="border-t border-line py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold">{entry.name}</span>
                <span className="tabular-nums">{hoursLabel(entry.hours)}h</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-fill" aria-hidden="true">
                <div className="h-full rounded-full" style={{
                  width: `${total > 0 ? (entry.hours / total) * 100 : 0}%`, backgroundColor: entry.color,
                }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TasksReadout() {
  const data = useSpread((s) => s.data);
  const week = data.weeks[data.currentWeek];
  const grouped = data.hats.map((hat) => ({
    hat, tasks: week?.boxes.find((box) => box.hatId === hat.id)?.tasks ?? [],
  })).filter((entry) => entry.tasks.length > 0);
  return (
    <div className="p-3">
      <p className="studio-readable-note text-xs text-secondary">{formatWeek(data.currentWeek)}</p>
      {grouped.length === 0 ? (
        <p className="studio-task-panel studio-readable-note mt-3 text-sm text-secondary">Your tasks will appear here as you add them to Spread.</p>
      ) : grouped.map(({ hat, tasks }) => (
        <section key={hat.id} className="studio-task-panel mt-3 overflow-hidden rounded-[22px] bg-elevated p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="size-3 rounded-full" style={{ backgroundColor: hat.color }} aria-hidden="true" />
            {hat.name}
          </h3>
          <ul className="mt-2">
            {tasks.map((task) => (
              <li key={task.id} className="studio-task-row flex min-h-11 items-center gap-3 border-t border-line py-2 text-sm">
                <span className="text-secondary">{task.done ? "Done" : "Open"}</span>
                <span className={task.done ? "line-through" : ""}>{task.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function WeekReadout() {
  const currentWeek = useSpread((s) => s.data.currentWeek);
  return (
    <div className="px-3 pb-4">
      <div className="studio-readable-panel"><WeekCrown title={formatWeek(currentWeek)} turn={0} onMove={() => undefined} /></div>
      <WeeklyView onCommit={() => undefined} onTurn={() => undefined} />
    </div>
  );
}

function hoursLabel(hours: number): string {
  if (Number.isInteger(hours)) return String(hours);
  return String(Math.round(hours * 10) / 10);
}
