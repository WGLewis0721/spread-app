import { isSpreadCategory, planPlacements, recurringForRole, shiftWeek, type SpreadData } from "./model.ts";

/**
 * Wire protocol v1 for the *read-only* native SwiftUI vertical slice.
 *
 * SpreadData in the existing Zustand store is the sole authority. This function does
 * not load, normalize, persist, copy back, repair or mutate any user record.
 * Never use this flattened projection as a replacement for stored SpreadData:
 * rich task content and historical weeks are intentionally not in this UI payload.
 */
export type NativeV2Snapshot = {
  weekKey: string;
  roles: { id: string; name: string; category: string; color: string; hours: number }[];
  allocations: { id: string; roleId: string; day: string; hours: number; order: number }[];
  tasks: { id: string; roleId: string; text: string; done: boolean; allocationId: string | null; estimateMinutes?: number; important?: boolean }[];
  /** Only present when the user has manually reordered tasks in Week. */
  dayTaskOrder?: Record<string, string[]>;
  /** Absent until a person explicitly sets capacity in Life. */
  life?: { version: 1; capacityHours?: number; priorityRoleId?: string; priorityGoalHours?: number; priorityDay?: string };
  recurringPlans?: { id: string; roleId: string; startWeek: string; managedFromWeek?: string; everyWeeks: number; hours: number; endWeek?: string; terminatedWeek?: string; capacityHours: number; dayHours?: { weekday: string; hours: number }[] }[];
  recurrenceIssue?: string;
  /** Present only when requested. Read-only forecast of the weeks after the selected one. */
  outlook?: NativeOutlookWeek[];
};

/** One future week in the Plan Ahead outlook. Never written back to storage. */
export type NativeOutlookWeek = {
  weekKey: string;
  /** A stored week that a schedule would otherwise change (edited, or made before the schedule). */
  kept: boolean;
  hours: { roleId: string; hours: number }[];
  placed: { roleId: string; day: string; hours: number }[];
};

export type NativeV2Envelope = {
  protocolVersion: 1;
  profileId: string;
  snapshot: NativeV2Snapshot;
};

/**
 * Forecast the weeks after the selected one. A stored week shows its own budgets and day
 * placements. An unstored week shows what ensureWeek would seed when it is opened.
 * Pure: reads data, never writes it.
 */
export function projectOutlook(data: Readonly<SpreadData>, weeks: number): NativeOutlookWeek[] {
  const roleIds = new Set(data.hats.map((hat) => hat.id));
  return Array.from({ length: weeks }, (_, index) => {
    const weekKey = shiftWeek(data.currentWeek, index + 1);
    const stored = data.weeks[weekKey];
    const kept = !!stored && data.hats.some((hat) => {
      if (!recurringForRole(data, hat.id, weekKey)) return false;
      const marker = stored.recurrenceSource?.[hat.id];
      return !marker || marker.manual === true;
    });
    const hours = data.hats.map((hat) => {
      const box = stored?.boxes.find((b) => b.hatId === hat.id);
      const generated = recurringForRole(data, hat.id, weekKey);
      return { roleId: hat.id, hours: box?.hours ?? generated?.hours ?? hat.defaultHours };
    });
    // A stored week shows its own placements. An unstored week shows the set days its schedule would place.
    const placed = stored
      ? (stored.allocations ?? [])
        .filter((a) => roleIds.has(a.hatId))
        .map((a) => ({ roleId: a.hatId, day: a.day, hours: a.hours }))
      : data.hats.flatMap((hat) => {
        const generated = recurringForRole(data, hat.id, weekKey);
        if (!generated || generated.hours <= 0 || !generated.plan.dayHours) return [];
        return planPlacements(weekKey, generated.plan.dayHours)
          .map((entry) => ({ roleId: hat.id, day: entry.day, hours: entry.hours }));
      });
    return { weekKey, kept, hours, placed };
  });
}

export function projectNativeV2(
  data: Readonly<SpreadData>,
  profileId: string,
  options: { outlookWeeks?: number } = {},
): NativeV2Envelope {
  if (!profileId.trim()) throw new Error("Native v2 projection requires an active profile ID.");

  const week = data.weeks[data.currentWeek];
  const boxes = new Map(week?.boxes.map((box) => [box.hatId, box]) ?? []);
  const roleIds = new Set(data.hats.map((hat) => hat.id));
  const allocations = (week?.allocations ?? []).filter((allocation) =>
    roleIds.has(allocation.hatId),
  );
  const allocationRoles = new Map(
    allocations.map((allocation) => [allocation.id, allocation.hatId]),
  );

  return {
    protocolVersion: 1,
    profileId,
    snapshot: {
      weekKey: data.currentWeek,
      roles: data.hats.map((hat) => ({
        id: hat.id,
        name: hat.name,
        category: hat.category && isSpreadCategory(hat.category) ? hat.category : "custom",
        color: hat.color,
        hours: boxes.get(hat.id)?.hours ?? hat.defaultHours,
      })),
      allocations: allocations.map((allocation) => ({
        id: allocation.id,
        roleId: allocation.hatId,
        day: allocation.day,
        hours: allocation.hours,
        order: allocation.order,
      })),
      ...(week?.dayTaskOrder ? { dayTaskOrder: week.dayTaskOrder } : {}),
      ...(week?.life?.version === 1 ? { life: week.life } : {}),
      ...(data.recurringPlans?.length ? { recurringPlans: data.recurringPlans } : {}),
      ...(week?.recurrenceIssue ? { recurrenceIssue: week.recurrenceIssue } : {}),
      ...(options.outlookWeeks ? { outlook: projectOutlook(data, options.outlookWeeks) } : {}),
      tasks: data.hats.flatMap((hat) =>
        (boxes.get(hat.id)?.tasks ?? []).map((task) => ({
          id: task.id,
          roleId: hat.id,
          text: task.text,
          done: task.done,
          ...(task.important ? { important: true } : {}),
          ...(task.estimateMinutes !== undefined ? { estimateMinutes: task.estimateMinutes } : {}),
          // Match the current To place logic: a stale allocation link is not scheduled.
          allocationId:
            task.allocationId && allocationRoles.get(task.allocationId) === hat.id
              ? task.allocationId
              : null,
        })),
      ),
    },
  };
}
