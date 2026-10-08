export type DropTarget =
  | { action: "moveSpreadToDay"; hatId: string; day: string }
  | { action: "moveAllocation"; allocationId: string; day: string }
  | { action: "reorderAllocation"; allocationId: string; beforeId: string }
  | { action: "assignTask"; hatId: string; taskId: string; allocationId: string | null }
  | { action: "refuseTask"; hatId: string; taskId: string; reason: "wrong-role" | "no-allocation"; day: string };

type Active =
  | { kind: "spread"; hatId: string }
  | { kind: "allocation"; allocationId: string }
  | { kind: "task"; hatId: string; taskId: string };

type Slot = { id: string; day: string; hatId?: string; hours?: number };

/** The drop target that takes a task back off every day. */
export const TRAY_ID = "tray";

export function resolveDrop(active: Active, overId: string, allocations: Slot[]): DropTarget | null {
  if (active.kind === "task") return resolveTaskDrop(active, overId, allocations);
  if (active.kind === "spread") {
    const day = dayOf(overId, allocations);
    return day ? { action: "moveSpreadToDay", hatId: active.hatId, day } : null;
  }
  if (overId.startsWith("alloc:")) {
    const beforeId = overId.slice(6);
    const target = allocations.find((item) => item.id === beforeId);
    const current = allocations.find((item) => item.id === active.allocationId);
    if (!target || !current || target.id === current.id) return null;
    if (target.day === current.day) return { action: "reorderAllocation", allocationId: current.id, beforeId };
    return { action: "moveAllocation", allocationId: current.id, day: target.day };
  }
  if (overId.startsWith("day:")) return { action: "moveAllocation", allocationId: active.allocationId, day: overId.slice(4) };
  return null;
}

/**
 * A task goes on an allocation of its own role. Dropped on a day, it finds that role's allocation
 * there; if the role is not on that day the drop is refused (never invented), and dropped on the
 * tray it comes off every day.
 */
function resolveTaskDrop(active: { hatId: string; taskId: string }, overId: string, allocations: Slot[]): DropTarget | null {
  const base = { hatId: active.hatId, taskId: active.taskId };
  if (overId === TRAY_ID) return { action: "assignTask", ...base, allocationId: null };
  if (overId.startsWith("alloc:")) {
    const target = allocations.find((item) => item.id === overId.slice(6));
    if (!target) return null;
    if (target.hatId !== undefined && target.hatId !== active.hatId) return { action: "refuseTask", ...base, reason: "wrong-role", day: target.day };
    return { action: "assignTask", ...base, allocationId: target.id };
  }
  if (overId.startsWith("day:")) {
    const day = overId.slice(4);
    const mine = allocations.find((item) => item.day === day && item.hatId === active.hatId && (item.hours ?? 1) > 0);
    if (!mine) return { action: "refuseTask", ...base, reason: "no-allocation", day };
    return { action: "assignTask", ...base, allocationId: mine.id };
  }
  return null;
}

function dayOf(overId: string, allocations: Slot[]): string | null {
  if (overId.startsWith("day:")) return overId.slice(4);
  if (overId.startsWith("alloc:")) return allocations.find((item) => item.id === overId.slice(6))?.day ?? null;
  return null;
}

export function highlightedDay(overId: string | null, allocations: Slot[]): string | null {
  if (!overId) return null;
  return dayOf(overId, allocations);
}
