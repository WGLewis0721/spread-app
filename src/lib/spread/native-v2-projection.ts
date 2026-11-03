import { isSpreadCategory, type SpreadData } from "./model.ts";

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
  tasks: { id: string; roleId: string; text: string; done: boolean; allocationId: string | null }[];
};

export type NativeV2Envelope = {
  protocolVersion: 1;
  profileId: string;
  snapshot: NativeV2Snapshot;
};

export function projectNativeV2(data: Readonly<SpreadData>, profileId: string): NativeV2Envelope {
  if (!profileId.trim()) throw new Error("Native v2 projection requires an active profile ID.");

  const week = data.weeks[data.currentWeek];
  const boxes = new Map(week?.boxes.map((box) => [box.hatId, box]) ?? []);
  const roleIds = new Set(data.hats.map((hat) => hat.id));
  const allocations = (week?.allocations ?? []).filter((allocation) => roleIds.has(allocation.hatId));
  const allocationIds = new Set(allocations.map((allocation) => allocation.id));

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
      tasks: data.hats.flatMap((hat) =>
        (boxes.get(hat.id)?.tasks ?? []).map((task) => ({
          id: task.id,
          roleId: hat.id,
          text: task.text,
          done: task.done,
          // Match the current To place logic: a stale allocation link is not scheduled.
          allocationId: task.allocationId && allocationIds.has(task.allocationId) ? task.allocationId : null,
        })),
      ),
    },
  };
}
