import { isoDate, type SpreadData } from "@/lib/spread/model";
import { dayMarks, monthGrid } from "@/lib/spread/month";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function MonthView({
  year,
  month,
  data,
  onPick,
}: {
  year: number;
  month: number;
  data: SpreadData;
  onPick: (date: string) => void;
}) {
  const today = isoDate(new Date());
  const cells = monthGrid(year, month);
  return (
    <div className="px-1 pt-4">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((label) => (
          <div key={label} className="pb-1 text-center text-[11px] font-medium text-secondary">
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          const marks = dayMarks(data, cell.date);
          const todayCell = cell.date === today;
          const count = marks.colors.length + marks.extra;
          const label = new Date(cell.date + "T12:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          return (
            <button
              key={cell.date}
              type="button"
              className="flex min-h-14 flex-col items-center rounded-2xl bg-elevated px-0.5 py-1.5 active:opacity-70"
              onClick={() => onPick(cell.date)}
              aria-label={count === 0 ? `${label}. Nothing this day.` : `${label}. ${count} ${count === 1 ? "spread" : "spreads"}.`}
              aria-current={todayCell ? "date" : undefined}
            >
              <span
                className={`grid size-7 place-items-center text-sm font-semibold tabular-nums ${
                  todayCell ? "rounded-full bg-fill" : ""
                } ${cell.inMonth ? "" : "text-tertiary"}`}
              >
                {cell.day}
              </span>
              <span className="mt-1 flex h-3 items-center justify-center gap-0.5">
                {marks.colors.map((color, index) => (
                  <span key={`${cell.date}-${index}`} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="h-3 text-[10px] leading-3 font-medium text-secondary tabular-nums">
                {marks.extra > 0 ? `+${marks.extra}` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
