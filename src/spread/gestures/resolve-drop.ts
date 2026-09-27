export type DropTarget =
  | { action: "moveSpreadToDay"; hatId: string; day: string }
  | { action: "moveAllocation"; allocationId: string; day: string }
  | { action: "reorderAllocation"; allocationId: string; beforeId: string };

type Active =
  | { kind: "spread"; hatId: string }
  | { kind: "allocation"; allocationId: string };

export function resolveDrop(
  active: Active,
  overId: string,
  allocations: { id: string; day: string }[],
): DropTarget | null {
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

function dayOf(overId: string, allocations: { id: string; day: string }[]): string | null {
  if (overId.startsWith("day:")) return overId.slice(4);
  if (overId.startsWith("alloc:")) return allocations.find((item) => item.id === overId.slice(6))?.day ?? null;
  return null;
}

export function highlightedDay(overId: string | null, allocations: { id: string; day: string }[]): string | null {
  if (!overId) return null;
  return dayOf(overId, allocations);
}
