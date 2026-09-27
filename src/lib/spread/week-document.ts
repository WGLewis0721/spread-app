import {
  formatWeek,
  parseKey,
  remainingHours,
  spentHours,
  weekDays,
  type ContentBlock,
  type SpreadData,
  type Task,
} from "./model.ts";

export type DocHours = { planned: number; scheduled: number; remaining: number };

export type DocTask = {
  text: string;
  done: boolean;
  blocks: ContentBlock[];
};

export type DocSpread = DocHours & {
  name: string;
  days: { label: string; hours: number }[];
  tasks: DocTask[];
};

export type DocDayLine = { name: string; hours: number; tasks: string[] };

export type DocDay = { label: string; lines: DocDayLine[] };

export type WeekDocument = {
  title: "Spread";
  range: string;
  weekKey: string;
  summary: (DocHours & { name: string })[];
  totals: DocHours;
  spreads: DocSpread[];
  days: DocDay[];
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDocDay(iso: string) {
  const date = parseKey(iso);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatDocHours(hours: number) {
  const shown = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${shown}h`;
}

export function buildWeekDocument(data: SpreadData): WeekDocument {
  const key = data.currentWeek;
  const week = data.weeks[key];
  const allocations = week?.allocations ?? [];
  const days = weekDays(key);
  const summary = data.hats.map((hat) => {
    const box = week?.boxes.find((item) => item.hatId === hat.id);
    const planned = box?.hours ?? hat.defaultHours;
    const scheduled = spentHours(allocations, hat.id);
    return { name: hat.name, planned, scheduled, remaining: remainingHours(planned, allocations, hat.id) };
  });
  const totals = summary.reduce(
    (sum, row) => ({
      planned: sum.planned + row.planned,
      scheduled: sum.scheduled + row.scheduled,
      remaining: sum.remaining + row.remaining,
    }),
    { planned: 0, scheduled: 0, remaining: 0 },
  );
  const spreads: DocSpread[] = data.hats.map((hat) => {
    const box = week?.boxes.find((item) => item.hatId === hat.id);
    const row = summary.find((item) => item.name === hat.name)!;
    const placed = days
      .map((day) => {
        const hours = allocations
          .filter((item) => item.hatId === hat.id && item.day === day.date)
          .reduce((sum, item) => sum + item.hours, 0);
        return { label: formatDocDay(day.date), hours };
      })
      .filter((item) => item.hours > 0);
    return {
      ...row,
      days: placed,
      tasks: (box?.tasks ?? []).map((task) => ({
        text: task.text,
        done: task.done,
        blocks: usefulBlocks(task),
      })),
    };
  });
  const schedule: DocDay[] = days.map((day) => ({
    label: formatDocDay(day.date),
    lines: allocations
      .filter((item) => item.day === day.date && item.hours > 0)
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const hat = data.hats.find((entry) => entry.id === item.hatId);
        const box = week?.boxes.find((entry) => entry.hatId === item.hatId);
        return {
          name: hat?.name ?? "Spread",
          hours: item.hours,
          tasks: (box?.tasks ?? []).filter((task) => task.allocationId === item.id).map((task) => task.text),
        };
      }),
  }));
  return { title: "Spread", range: formatWeek(key), weekKey: key, summary, totals, spreads, days: schedule };
}

export function weekDocumentText(doc: WeekDocument) {
  const lines: string[] = [`# ${doc.title}`, doc.range, "", "## Weekly summary", ""];
  lines.push("| Spread | Planned | Scheduled | Remaining |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const row of doc.summary) {
    lines.push(`| ${mdCell(row.name)} | ${formatDocHours(row.planned)} | ${formatDocHours(row.scheduled)} | ${formatDocHours(row.remaining)} |`);
  }
  lines.push(
    `| **Total** | **${formatDocHours(doc.totals.planned)}** | **${formatDocHours(doc.totals.scheduled)}** | **${formatDocHours(doc.totals.remaining)}** |`,
  );
  for (const spread of doc.spreads) {
    lines.push("", `## ${spread.name}`, "");
    lines.push(
      `Planned ${formatDocHours(spread.planned)}. Scheduled ${formatDocHours(spread.scheduled)}. Remaining ${formatDocHours(spread.remaining)}.`,
    );
    lines.push("", "### Days", "");
    if (spread.days.length === 0) lines.push("Not placed on a day yet.");
    for (const day of spread.days) lines.push(`- ${day.label} — ${formatDocHours(day.hours)}`);
    lines.push("", "### Tasks", "");
    if (spread.tasks.length === 0) lines.push("No tasks.");
    for (const task of spread.tasks) {
      lines.push(`- [${task.done ? "x" : " "}] ${task.text}`);
      for (const block of task.blocks) lines.push(...blockLines(block));
    }
  }
  lines.push("", "## Daily schedule", "");
  lines.push("Sunday through Monday.", "");
  for (const day of doc.days) {
    lines.push(`### ${day.label}`, "");
    if (day.lines.length === 0) lines.push("Nothing scheduled.", "");
    for (const line of day.lines) {
      lines.push(`- ${line.name} — ${formatDocHours(line.hours)}`);
      for (const task of line.tasks) lines.push(`  - ${task}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}

function usefulBlocks(task: Task): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const block of task.content?.blocks ?? []) {
    if (block.type === "notes") {
      const text = block.text.trim();
      if (text) blocks.push({ ...block, text });
    } else if (block.type === "outline") {
      const items = block.items.filter((item) => item.text.trim());
      if (items.length > 0) blocks.push({ ...block, items });
    } else if (block.type === "table") {
      const cells = block.cells.map((row) => row.map((cell) => cell.trim()));
      if (cells.some((row) => row.some(Boolean))) blocks.push({ ...block, cells });
    } else if (block.type === "photo" && block.src.startsWith("data:image/")) {
      blocks.push(block);
    }
  }
  return blocks;
}

function blockLines(block: ContentBlock) {
  if (block.type === "notes") return ["", "  Notes:", ...block.text.split("\n").map((line) => `  ${line}`)];
  if (block.type === "outline") {
    return ["", "  Outline:", ...block.items.map((item) => `${"  ".repeat(item.level + 1)}- ${item.text}`)];
  }
  if (block.type === "table") {
    const width = Math.max(...block.cells.map((row) => row.length), 1);
    const rows = block.cells.map((row) => {
      const cells = Array.from({ length: width }, (_, index) => mdCell(row[index] ?? ""));
      return `  | ${cells.join(" | ")} |`;
    });
    const rule = `  | ${Array.from({ length: width }, () => "---").join(" | ")} |`;
    return ["", "  Table:", rows[0] ?? `  | ${"---"} |`, rule, ...rows.slice(1)];
  }
  return ["", "  Photo"];
}

function mdCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
