export type OutlineItem = { id: string; text: string; level: number };
export type ContentBlock =
  | { id: string; type: "notes"; text: string }
  | { id: string; type: "outline"; items: OutlineItem[] }
  | { id: string; type: "table"; cells: string[][] }
  | { id: string; type: "photo"; src: string };
export type TaskContent = { blocks: ContentBlock[] };
export type Task = {
  id: string;
  text: string;
  done: boolean;
  allocationId?: string;
  content?: TaskContent;
};
export type Hat = { id: string; name: string; defaultHours: number; color: string };
export type Box = { hatId: string; hours: number; tasks: Task[] };
export type Allocation = { id: string; hatId: string; day: string; hours: number; order: number };
export type WeekData = { boxes: Box[]; allocations: Allocation[] };
export type SpreadData = {
  hats: Hat[];
  weeks: Record<string, WeekData>;
  currentWeek: string;
};
export type License = { ok: true; plan: "demo" | "personal" };

export const STORE_KEY = "spread.v1";
export const LICENSE_KEY = "spread.license";
export const THEME_KEY = "spread.theme";

export const ROLE_COLORS = [
  "#34C759",
  "#FF9500",
  "#007AFF",
  "#FF2D55",
  "#AF52DE",
  "#64D2FF",
  "#5856D6",
] as const;

const DEFAULT_SPREADS: { id: string; name: string; hours: number }[] = [
  { id: "work", name: "Work", hours: 8 },
  { id: "home", name: "Home", hours: 4 },
  { id: "health", name: "Health", hours: 3 },
];

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function weekKey(d = new Date()) {
  return isoDate(weekStart(d));
}

export function shiftWeek(key: string, weeks: number) {
  const d = parseKey(key);
  d.setDate(d.getDate() + weeks * 7);
  return isoDate(d);
}

export function formatWeek(key: string) {
  const start = parseKey(key);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameYear = start.getFullYear() === end.getFullYear();
  const showYear = !sameYear || start.getFullYear() !== new Date().getFullYear();
  const left = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const right = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: showYear ? "numeric" : undefined,
  });
  return `${left} – ${right}`;
}

export function weekDays(key: string) {
  const monday = parseKey(key);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const labels = ["Sunday", "Saturday", "Friday", "Thursday", "Wednesday", "Tuesday", "Monday"] as const;
  return labels.map((label, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() - index);
    return { label, date: isoDate(date) };
  });
}

export function emptyContent(): TaskContent {
  return { blocks: [] };
}

export function spentHours(allocations: { hatId: string; hours: number }[], hatId: string) {
  return allocations.filter((item) => item.hatId === hatId).reduce((sum, item) => sum + item.hours, 0);
}

export function remainingHours(bank: number, allocations: { hatId: string; hours: number }[], hatId: string) {
  return Math.round((bank - spentHours(allocations, hatId)) * 2) / 2;
}

export function bankedHours(current: number, bank: number, spentByOthers: number, requested: number) {
  const next = clampHours(requested);
  if (next <= current) return next;
  return Math.min(next, Math.max(current, bank - spentByOthers));
}

export function depositHours(bank: number, spent: number, requested: number) {
  const room = bank - spent;
  if (room <= 0) return 0;
  return Math.min(clampHours(requested), room);
}

export function allocationHours(allocations: Allocation[], hatId: string, fallback: number) {
  const mine = allocations.filter((item) => item.hatId === hatId);
  if (mine.length === 0) return fallback;
  return mine.reduce((sum, item) => sum + item.hours, 0);
}

export function weekIsPopulated(week: WeekData | undefined) {
  if (!week) return false;
  if (week.allocations.length > 0) return true;
  return week.boxes.some((box) => box.tasks.length > 0);
}

export function cloneWeek(week: WeekData): WeekData {
  const allocationIds = new Map<string, string>();
  const allocations = week.allocations.map((allocation) => {
    const id = uid();
    allocationIds.set(allocation.id, id);
    return { ...allocation, id };
  });
  return {
    allocations,
    boxes: week.boxes.map((box) => ({
      hatId: box.hatId,
      hours: box.hours,
      tasks: box.tasks.map((task) => ({
        ...structuredClone(task),
        id: uid(),
        done: false,
        allocationId: task.allocationId ? allocationIds.get(task.allocationId) : undefined,
      })),
    })),
  };
}

export function syncAllocationHours(week: WeekData): WeekData {
  return week;
}

export function clampHours(n: number) {
  if (!Number.isFinite(n)) return 0;
  const stepped = Math.round(n * 2) / 2;
  return Math.min(40, Math.max(0, stepped));
}

export function defaultData(): SpreadData {
  const currentWeek = weekKey();
  const hats: Hat[] = DEFAULT_SPREADS.map((spread, index) => ({
    id: spread.id,
    name: spread.name,
    defaultHours: spread.hours,
    color: ROLE_COLORS[index % ROLE_COLORS.length],
  }));
  return {
    hats,
    currentWeek,
    weeks: {
      [currentWeek]: {
        boxes: hats.map((hat) => ({ hatId: hat.id, hours: hat.defaultHours, tasks: [] })),
        allocations: [],
      },
    },
  };
}

export function validateLicense(code: string): License | null {
  const c = (code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (c === "SPR-DEMO-2026") return { ok: true, plan: "demo" };
  const match = /^SPR-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(c);
  if (!match) return null;
  const body = match[1] + match[2];
  if (match[1] === "0000") return null;
  let sum = 0;
  for (const ch of body) sum += ch.charCodeAt(0);
  if (sum % 7 === 0) return { ok: true, plan: "personal" };
  return null;
}

export function ensureWeek(data: SpreadData): SpreadData {
  const key = data.currentWeek || weekKey();
  const existing = data.weeks[key];
  if (!existing) {
    return {
      ...data,
      currentWeek: key,
      weeks: {
        ...data.weeks,
        [key]: {
          boxes: data.hats.map((hat) => ({
            hatId: hat.id,
            hours: hat.defaultHours,
            tasks: [],
          })),
          allocations: [],
        },
      },
    };
  }
  const boxes = existing.boxes.slice();
  for (const hat of data.hats) {
    if (!boxes.some((box) => box.hatId === hat.id)) {
      boxes.push({ hatId: hat.id, hours: hat.defaultHours, tasks: [] });
    }
  }
  return {
    ...data,
    currentWeek: key,
    weeks: { ...data.weeks, [key]: { boxes, allocations: existing.allocations ?? [] } },
  };
}

export function normalizeData(raw: unknown): SpreadData {
  if (!raw || typeof raw !== "object") return defaultData();
  const value = raw as Partial<SpreadData>;
  const hats = Array.isArray(value.hats) ? value.hats.filter(isHat) : [];
  const weeks: Record<string, WeekData> = {};
  if (value.weeks && typeof value.weeks === "object") {
    for (const [key, week] of Object.entries(value.weeks)) {
      if (!week || !Array.isArray(week.boxes)) continue;
      const allocations = (Array.isArray(week.allocations) ? week.allocations.filter(isAllocation) : []).map(
        (item, index) => ({ ...item, order: typeof item.order === "number" ? item.order : index }),
      );
      weeks[key] = {
        boxes: week.boxes.filter(isBox).map((box) => restoreBank(normalizeBox(box), allocations, hats)),
        allocations,
      };
    }
  }
  const currentWeek = typeof value.currentWeek === "string" ? value.currentWeek : weekKey();
  return ensureWeek({ hats, weeks, currentWeek });
}

function isHat(value: unknown): value is Hat {
  if (!value || typeof value !== "object") return false;
  const hat = value as Hat;
  return typeof hat.id === "string" && typeof hat.name === "string" && typeof hat.defaultHours === "number";
}

function isBox(value: unknown): value is Box {
  if (!value || typeof value !== "object") return false;
  const box = value as Box;
  return typeof box.hatId === "string" && typeof box.hours === "number" && Array.isArray(box.tasks);
}

function normalizeBox(box: Box): Box {
  return {
    hatId: box.hatId,
    hours: box.hours,
    tasks: box.tasks.filter(isTask).map(normalizeTask),
  };
}

function restoreBank(box: Box, allocations: { hatId: string; hours: number }[], hats: Hat[]) {
  const spent = spentHours(allocations, box.hatId);
  const hat = hats.find((item) => item.id === box.hatId);
  if (hat && spent > 0 && box.hours === spent && hat.defaultHours > box.hours) {
    return { ...box, hours: hat.defaultHours };
  }
  return box;
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Task;
  return typeof task.id === "string" && typeof task.text === "string";
}

function normalizeTask(task: Task): Task {
  const next: Task = { id: task.id, text: task.text, done: Boolean(task.done) };
  if (typeof task.allocationId === "string") next.allocationId = task.allocationId;
  if (task.content) next.content = normalizeContent(task.content);
  return next;
}

function normalizeContent(value: unknown): TaskContent {
  if (!value || typeof value !== "object") return emptyContent();
  const raw = value as {
    blocks?: unknown;
    bullets?: { id?: string; text?: string }[];
    outline?: { id?: string; text?: string; children?: unknown[] }[];
    table?: { cells?: unknown[] };
    photo?: string;
  };
  if (Array.isArray(raw.blocks)) {
    return { blocks: raw.blocks.map(normalizeBlock).filter((block) => block !== null) };
  }
  const blocks: ContentBlock[] = [];
  if (Array.isArray(raw.bullets)) {
    const text = raw.bullets
      .map((item) => (item && typeof item.text === "string" ? item.text : ""))
      .filter(Boolean)
      .join("\n");
    if (text) blocks.push({ id: uid(), type: "notes", text });
  }
  if (Array.isArray(raw.outline) && raw.outline.length > 0) {
    const items: OutlineItem[] = [];
    walkOutline(raw.outline, 0, items);
    if (items.length > 0) blocks.push({ id: uid(), type: "outline", items });
  }
  const cells = rectangular(raw.table?.cells);
  if (cells) blocks.push({ id: uid(), type: "table", cells });
  if (typeof raw.photo === "string" && raw.photo.startsWith("data:image/")) {
    blocks.push({ id: uid(), type: "photo", src: raw.photo });
  }
  return { blocks };
}

function normalizeBlock(value: unknown): ContentBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as ContentBlock;
  if (typeof block.id !== "string") return null;
  if (block.type === "notes" && typeof block.text === "string") return { id: block.id, type: "notes", text: block.text };
  if (block.type === "outline" && Array.isArray(block.items)) {
    const items = block.items
      .filter((item) => item && typeof item.id === "string" && typeof item.text === "string")
      .map((item) => ({ id: item.id, text: item.text, level: Math.min(4, Math.max(0, Number(item.level) || 0)) }));
    return { id: block.id, type: "outline", items };
  }
  if (block.type === "table") {
    const cells = rectangular(block.cells);
    if (!cells) return null;
    return { id: block.id, type: "table", cells };
  }
  if (block.type === "photo" && typeof block.src === "string" && (block.src === "" || block.src.startsWith("data:image/"))) {
    return { id: block.id, type: "photo", src: block.src };
  }
  return null;
}

function walkOutline(nodes: { id?: string; text?: string; children?: unknown[] }[], level: number, items: OutlineItem[]) {
  for (const node of nodes) {
    if (!node || typeof node.text !== "string") continue;
    items.push({ id: typeof node.id === "string" ? node.id : uid(), text: node.text, level: Math.min(4, level) });
    if (Array.isArray(node.children)) walkOutline(node.children as { id?: string; text?: string; children?: unknown[] }[], level + 1, items);
  }
}

function rectangular(value: unknown): string[][] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const rows = value.filter((row) => Array.isArray(row)).map((row) => row.map((cell) => String(cell ?? "")));
  const width = rows[0]?.length ?? 0;
  if (width === 0 || rows.some((row) => row.length !== width)) return null;
  return rows;
}

function isAllocation(value: unknown): value is Allocation {
  if (!value || typeof value !== "object") return false;
  const item = value as Allocation;
  return (
    typeof item.id === "string" &&
    typeof item.hatId === "string" &&
    typeof item.day === "string" &&
    typeof item.hours === "number"
  );
}
