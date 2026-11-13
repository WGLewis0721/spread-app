import { z } from "zod";
import type { RecurringRequest } from "./recurring-plan.ts";
import { isSpreadCategory, PLAN_WEEKDAYS, remainingHours, shiftWeek, type SpreadData, type TaskContent } from "./model.ts";
import { getSaveFacts } from "./local-status.ts";
import { projectNativeV2, type NativeV2Envelope } from "./native-v2-projection.ts";
import { flushSpread, previewLifePriority, retrySpreadSave, useSpread } from "./store.ts";
import { buildWeekDocument, weekDocumentText } from "./week-document.ts";
import { weekDocumentHTML } from "./native-v2-export.ts";
import { dayMarks, monthGrid } from "./month.ts";
import { activeDeletedTasks } from "./week-month-operations.ts";

const id = z.string().trim().min(1).max(200);
const text = z.string().trim().min(1).max(10000);
const hours = z.number().finite().min(0).max(168).multipleOf(0.5);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Fixed days for a repeating schedule: one entry per weekday, Monday first in the model. */
const dayHoursSchema = z.array(z.strictObject({
  weekday: z.enum(PLAN_WEEKDAYS),
  hours: z.number().finite().min(0.5).max(24).multipleOf(0.5),
})).min(1).max(7);
const contentSchema = z.strictObject({
  blocks: z
    .array(
      z.discriminatedUnion("type", [
        z.strictObject({ id, type: z.literal("file"), file: z.strictObject({
          id, name: z.string().max(1024), mimeType: z.string().max(256),
          byteCount: z.number().int().min(0).max(100000000),
          checksum: z.string().regex(/^[a-fA-F0-9]{64}$/),
        }) }),
        z.strictObject({ id, type: z.literal("notes"), text: z.string().max(1000000), richText: z.strictObject({ version: z.literal(1), rtf: z.string().max(4000000) }).optional() }),
        z.strictObject({
          id,
          type: z.literal("outline"),
          items: z
            .array(
              z.strictObject({
                id,
                text: z.string().max(100000),
                level: z.number().min(0).max(4),
              }),
            )
            .max(10000),
        }),
        z.strictObject({
          id,
          type: z.literal("table"),
          cells: z.array(z.array(z.string().max(100000)).max(100)).max(1000),
        }),
        z.strictObject({
          id,
          type: z.literal("photo"),
          src: z
            .string()
            .max(20000000)
            .refine((value) => value === "" || value.startsWith("data:image/")),
        }),
      ]),
    )
    .max(200),
});
const action = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("readTaskContent"), roleId: id, taskId: id }),
  z.strictObject({
    type: z.literal("setTaskContent"),
    roleId: id,
    taskId: id,
    content: contentSchema,
  }),
  z.strictObject({ type: z.literal("retrySave") }),
  z.strictObject({ type: z.literal("setLifeCapacity"), hours }),
  z.strictObject({ type: z.literal("previewLifePriority"), roleId: id, goalHours: hours, day }),
  z.strictObject({ type: z.literal("applyLifePriority"), roleId: id, goalHours: hours, day }),
  z.strictObject({ type: z.literal("editLifeRole"), roleId: id, name: text,
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), category: z.union([z.literal("custom"), z.string().refine(isSpreadCategory)]) }),
  z.strictObject({ type: z.literal("removeLifeRole"), roleId: id }),
  z.strictObject({ type: z.literal("setLifeBudget"), roleId: id, hours }),
  z.strictObject({ type: z.literal("setLifePriority"), priorityRoleId: id.nullable(), goalHours: hours.optional(), day: day.optional() }),
  z.strictObject({ type: z.literal("previewRecurringPlan"), roleId: id, startWeek: day,
    everyWeeks: z.number().int().min(1).max(12), hours: hours.refine((v) => v > 0), dayHours: dayHoursSchema.optional(),
    endWeek: day.optional(), capacityHours: hours.optional(), planId: id.optional(), editFromWeek: day.optional() }),
  z.strictObject({ type: z.literal("saveRecurringPlan"), roleId: id, startWeek: day,
    everyWeeks: z.number().int().min(1).max(12), hours: hours.refine((v) => v > 0), dayHours: dayHoursSchema.optional(),
    endWeek: day.optional(), capacityHours: hours.optional(), planId: id.optional(), editFromWeek: day.optional() }),
  z.strictObject({ type: z.literal("stopRecurringPlan"), planId: id, fromWeek: day }),
  z.strictObject({ type: z.literal("previewPlanAhead"), roleId: id, toDay: day,
    hours: hours.refine((value) => value > 0), fromDay: day.optional(), targetCapacityHours: hours.optional() }),
  z.strictObject({ type: z.literal("transferPlanAhead"), roleId: id, toDay: day,
    hours: hours.refine((value) => value > 0), fromDay: day.optional(), targetCapacityHours: hours.optional() }),
  z.strictObject({ type: z.literal("previewWeekCopy"), batch: z.number().int().min(1).max(13) }),
  z.strictObject({ type: z.literal("copyWeekForward"), batch: z.number().int().min(1).max(13) }),
  z.strictObject({ type: z.literal("setTaskImportant"), roleId: id, taskId: id, important: z.boolean() }),
  z.strictObject({ type: z.literal("setTaskEstimate"), roleId: id, taskId: id,
    minutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60),
      z.literal(90), z.literal(120), z.literal(180), z.literal(240), z.literal(480), z.null()]) }),
  z.strictObject({ type: z.literal("redo"), editId: id }),
  z.strictObject({ type: z.literal("deleteTask"), roleId: id, taskId: id }),
  z.strictObject({ type: z.literal("readDeletedTasks") }),
  z.strictObject({ type: z.literal("restoreDeletedTask"), taskId: id }),
  z.strictObject({ type: z.literal("permanentlyDeleteTasks"), taskIds: z.array(id).min(1).max(1000) }),
  z.strictObject({ type: z.literal("readOverdueTasks"), today: day }),
  z.strictObject({ type: z.literal("previewBulkOverdue"), today: day, targetDay: day, taskIds: z.array(id).min(1).max(1000) }),
  z.strictObject({ type: z.literal("bulkMoveOverdue"), today: day, targetDay: day, taskIds: z.array(id).min(1).max(1000) }),
  z.strictObject({ type: z.literal("reorderDayTask"), roleId: id, day, taskId: id, beforeId: id.nullable() }),
  z.strictObject({ type: z.literal("allocationHours"), allocationId: id, hours }),
  z.strictObject({ type: z.literal("removeAllocation"), allocationId: id }),
  z.strictObject({ type: z.literal("renameRole"), roleId: id, name: text }),
  z.strictObject({ type: z.literal("removeRole"), roleId: id }),
  z.strictObject({ type: z.literal("switchProfile"), profileId: id }),
  z.strictObject({ type: z.literal("addProfile"), name: text }),
  z.strictObject({ type: z.literal("removeProfile"), profileId: id }),
  z.strictObject({ type: z.literal("renameProfile"), profileId: id, name: text }),
  z.strictObject({ type: z.literal("exportWeek"), format: z.enum(["text", "html", "docx"]) }),
  // Read-only: the role dots for every day of one calendar month (any week), as the original Month view drew them.
  z.strictObject({
    type: z.literal("monthMarks"),
    year: z.number().int().min(1970).max(2200),
    month: z.number().int().min(0).max(11),
    selectedRoleId: id.optional(),
  }),
  z.strictObject({ type: z.literal("rollover"), force: z.boolean() }),
  z.strictObject({
    type: z.literal("moveSpreadToDay"),
    roleId: id,
    day,
    hours: hours.refine((n) => n > 0),
  }),
  z.strictObject({ type: z.literal("moveAllocation"), allocationId: id, day }),
  z.strictObject({
    type: z.literal("setRoleColor"),
    roleId: id,
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  z.strictObject({
    type: z.literal("setRoleCategory"),
    roleId: id,
    category: z.string().refine(isSpreadCategory),
  }),
  z.strictObject({
    type: z.literal("changeWeek"),
    direction: z.union([z.literal(-1), z.literal(1), z.literal("today")]),
  }),
  z.strictObject({ type: z.literal("openWeek"), weekKey: day }),
  z.strictObject({
    type: z.literal("addRole"),
    name: text,
    hours,
    // "custom" is the native picker's name for "no category": the same as the React default
    // (a responsibility without a category), which the projection already shows as the custom artwork.
    category: z.union([z.literal("custom"), z.string().refine(isSpreadCategory)]),
  }),
  z.strictObject({ type: z.literal("setHours"), roleId: id, hours }),
  z.strictObject({
    type: z.literal("allocate"),
    roleId: id,
    day,
    hours: hours.refine((n) => n > 0),
  }),
  z.strictObject({ type: z.literal("addTask"), roleId: id, text, life: z.boolean().optional() }),
  z.strictObject({ type: z.literal("addTaskForDay"), roleId: id, text, day, life: z.boolean().optional() }),
  z.strictObject({ type: z.literal("editTask"), roleId: id, taskId: id, text }),
  z.strictObject({ type: z.literal("toggleTask"), roleId: id, taskId: id }),
  z.strictObject({
    type: z.literal("assignTask"),
    roleId: id,
    taskId: id,
    allocationId: id.nullable(),
  }),
  z.strictObject({ type: z.literal("undo"), editId: id }),
  z.strictObject({
    type: z.literal("carryOver"),
    picks: z
      .array(z.strictObject({ roleId: id, taskId: id }))
      .min(1)
      .max(1000),
  }),
]);
export const nativeRequestSchema = z.strictObject({
  protocolVersion: z.literal(1),
  sessionId: id,
  requestId: id,
  expectedProfileId: id,
  expectedWeek: day,
  expectedRevision: z.number().int().nonnegative(),
  action,
});
export type NativeRequest = z.infer<typeof nativeRequestSchema>;
export type NativeRead = { sessionId: string; revision: number; envelope: NativeV2Envelope };
export type NativeReply = {
  taskDetail?: { taskId: string; content: TaskContent };
  requestId: string | null;
  ok: boolean;
  error?: string;
  undoId?: string | null;
  redoId?: string | null;
  rollover?: "done" | "confirm" | "empty";
  /** Read-only export of the open week; never persisted and never part of planner state. */
  exported?: { format: "text" | "html" | "docx"; content: string };
  /** Read-only role dots per ISO date for one month; never persisted and never part of planner state. */
  monthMarks?: Record<string, { colors: string[]; extra: number }>;
  deletedTasks?: { id: string; hatId: string; weekKey: string; deletedAt: number; task: { id: string; text: string; done: boolean } }[];
  overdueTasks?: { weekKey: string; hatId: string; day: string; task: { id: string; text: string; done: boolean } }[];
  bulkPreview?: { taskId: string; weekKey: string; hatId: string; targetAllocationId?: string; error?: string }[];
  bulkMoved?: number;
  priorityPreview?: ReturnType<typeof previewLifePriority>;
  planAheadPreview?: ReturnType<ReturnType<typeof useSpread.getState>["previewPlanAhead"]>;
  recurringPreview?: ReturnType<ReturnType<typeof useSpread.getState>["previewRecurringPlan"]>;
  weekCopyPreview?: ReturnType<ReturnType<typeof useSpread.getState>["previewWeekCopy"]>;
  state: NativeRead | null;
};

/** Session-local command router. It owns no planner data and is never installed by default.
 * Retains every accepted request identity until disposal: retries cannot toggle twice.
 * The finite session capacity fails closed rather than evicting replay protection.
 */
export function createNativeV2Dispatcher(sessionId: string) {
  id.parse(sessionId);
  let revision = 0;
  let disposed = false;
  let chain: Promise<unknown> = Promise.resolve();
  const lifeHistoryIds = new Set<string>();
  const requests = new Map<string, { fingerprint: string; reply: NativeReply }>();
  const unsubscribe = useSpread.subscribe((next, previous) => {
    if (next.data !== previous.data || next.activeId !== previous.activeId) revision += 1;
  });
  function read(): NativeRead | null {
    const state = useSpread.getState();
    return !disposed && state.ready && state.activeId
      ? { sessionId, revision, envelope: projectNativeV2(state.data, state.activeId, { outlookWeeks: 8 }) }
      : null;
  }
  async function execute(raw: unknown): Promise<NativeReply> {
    const parsed = nativeRequestSchema.safeParse(raw);
    if (!parsed.success)
      return { requestId: null, ok: false, error: "invalid-command", state: read() };
    const command = parsed.data;
    const fail = (error: string): NativeReply => ({
      requestId: command.requestId,
      ok: false,
      error,
      state: read(),
    });
    if (disposed) return fail("closed-session");
    if (command.sessionId !== sessionId) return fail("stale-session");
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(command)),
    );
    const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (disposed) return fail("closed-session");
    // Exports are reads: they are not replay-protected and never change planner state.
    if (command.action.type === "exportWeek") return exportWeek(command, command.action.format, fail);
    if (command.action.type === "monthMarks")
      return monthMarks(command, command.action.year, command.action.month, command.action.selectedRoleId, fail);
    // Volatile, read-only result sets: never cache task text in replay receipts.
    if (["readDeletedTasks", "readOverdueTasks", "previewBulkOverdue", "previewLifePriority", "previewPlanAhead", "previewRecurringPlan", "previewWeekCopy"].includes(command.action.type))
      return run(command, fail);
    const prior = requests.get(command.requestId);
    if (prior) {
      if (prior.fingerprint !== fingerprint) return fail("request-id-reused");
      // Reads are safe to reconstruct only while their exact context remains current.
      // Never retain rich payloads or historical projections in replay receipts.
      if (command.action.type === "readTaskContent") {
        const current = read();
        if (
          current?.envelope.profileId !== command.expectedProfileId ||
          current.envelope.snapshot.weekKey !== command.expectedWeek ||
          current.revision !== command.expectedRevision
        )
          return fail("stale-context");
        return run(command, fail);
      }
      return { ...prior.reply, state: read() };
    }
    if (requests.size >= 2048) return fail("session-capacity");
    const result = run(command, fail);
    requests.set(command.requestId, {
      fingerprint,
      reply: {
        requestId: result.requestId,
        ok: result.ok,
        error: result.error,
        undoId: result.undoId,
        redoId: result.redoId,
        state: null,
      },
    });
    return result;
  }
  async function exportWeek(
    command: NativeRequest,
    format: "text" | "html" | "docx",
    fail: (error: string) => NativeReply,
  ): Promise<NativeReply> {
    const state = useSpread.getState();
    if (!state.ready || !state.activeId) return fail("not-ready");
    if (command.expectedProfileId !== state.activeId) return fail("stale-profile");
    if (command.expectedWeek !== state.data.currentWeek) return fail("stale-week");
    const doc = buildWeekDocument(state.data);
    let content: string;
    if (format === "text") content = weekDocumentText(doc);
    else if (format === "html") content = weekDocumentHTML(doc);
    else {
      // Loaded on demand: the Word writer is large and most sessions never export.
      const { weekDocxBlob } = await import("./week-docx.ts");
      const bytes = new Uint8Array(await (await weekDocxBlob(doc)).arrayBuffer());
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      }
      content = btoa(binary);
    }
    return { requestId: command.requestId, ok: true, state: read(), exported: { format, content } };
  }
  /** Role dots for a month's grid, from the same helpers the original Month view used. A read: it is not
   * replay-protected, ignores the open week and revision (the person may browse any month), and refuses
   * when the profile has changed so one profile's plan can never be drawn into another's. */
  function monthMarks(
    command: NativeRequest,
    year: number,
    month: number,
    selectedRoleId: string | undefined,
    fail: (error: string) => NativeReply,
  ): NativeReply {
    const state = useSpread.getState();
    if (!state.ready || !state.activeId) return fail("not-ready");
    if (command.expectedProfileId !== state.activeId) return fail("stale-profile");
    const marks: Record<string, { colors: string[]; extra: number }> = {};
    for (const cell of monthGrid(year, month)) marks[cell.date] = dayMarks(state.data, cell.date, selectedRoleId);
    return { requestId: command.requestId, ok: true, state: read(), monthMarks: marks };
  }
  function run(command: NativeRequest, fail: (error: string) => NativeReply): NativeReply {
    const state = useSpread.getState();
    if (!state.ready || !state.activeId) return fail("not-ready");
    if (command.expectedProfileId !== state.activeId) return fail("stale-profile");
    if (command.expectedWeek !== state.data.currentWeek) return fail("stale-week");
    if (command.expectedRevision !== revision) return fail("stale-revision");
    if (getSaveFacts().failed && !["retrySave", "readTaskContent", "readDeletedTasks", "readOverdueTasks", "previewBulkOverdue", "previewLifePriority", "previewPlanAhead", "previewRecurringPlan", "previewWeekCopy"].includes(command.action.type))
      return fail("save-unavailable");
    const a = command.action;
    if (a.type === "exportWeek") return fail("export-not-here");
    if (a.type === "monthMarks") return fail("read-not-here");
    if (a.type === "previewLifePriority") {
      return { requestId: command.requestId, ok: true, state: read(), priorityPreview: previewLifePriority(state.data, a.roleId, a.goalHours, a.day) };
    }
    if (a.type === "previewRecurringPlan") {
      const { type: _type, ...request } = a;
      void _type;
      return { requestId: command.requestId, ok: true, state: read(),
        recurringPreview: state.previewRecurringPlan(request as RecurringRequest) };
    }
    if (a.type === "previewPlanAhead") {
      return { requestId: command.requestId, ok: true, state: read(),
        planAheadPreview: state.previewPlanAhead({
          roleId: a.roleId, toDay: a.toDay, hours: a.hours,
          fromDay: a.fromDay, targetCapacityHours: a.targetCapacityHours,
        }) };
    }
    if (a.type === "previewWeekCopy") {
      return { requestId: command.requestId, ok: true, state: read(),
        weekCopyPreview: state.previewWeekCopy(a.batch) };
    }
    if (a.type === "readDeletedTasks") {
      return { requestId: command.requestId, ok: true, state: read(),
        deletedTasks: activeDeletedTasks(state.data).map(({ id, hatId, weekKey, deletedAt, task }) =>
          ({ id, hatId, weekKey, deletedAt, task: { id: task.id, text: task.text, done: task.done } })) };
    }
    if (a.type === "readOverdueTasks") {
      return { requestId: command.requestId, ok: true, state: read(),
        overdueTasks: state.overdueTasks(a.today).map(({ weekKey, hatId, day, task }) =>
          ({ weekKey, hatId, day, task: { id: task.id, text: task.text, done: task.done } })) };
    }
    if (a.type === "previewBulkOverdue") {
      return { requestId: command.requestId, ok: true, state: read(),
        bulkPreview: state.previewOverdueMove(a.taskIds, a.targetDay, a.today) };
    }
    if ((a.type === "undo" || a.type === "redo") && a.editId.startsWith("life-") && !lifeHistoryIds.has(a.editId)) return fail("undo-expired");
    const invalid =
      a.type === "switchProfile" && !state.profiles.some((p) => p.id === a.profileId)
        ? "no-profile"
        : validateTarget(a, state.data);
    if (invalid) return fail(invalid);
    if (a.type === "readTaskContent") {
      const task = state.data.weeks[state.data.currentWeek].boxes
        .find((b) => b.hatId === a.roleId)!
        .tasks.find((t) => t.id === a.taskId)!;
      return {
        requestId: command.requestId,
        ok: true,
        state: read(),
        taskDetail: { taskId: a.taskId, content: structuredClone(task.content ?? { blocks: [] }) },
      };
    }
    let undoId: string | null = null;
    let redoId: string | null = null;
    let bulkMoved: number | undefined;
    let bulkPreview: NativeReply["bulkPreview"];
    let rolloverOutcome: "done" | "confirm" | "empty" | undefined;
    try {
      const mutate = () => {
        switch (a.type) {
          case "setTaskContent":
            state.setTaskContent(a.roleId, a.taskId, a.content);
            flushSpread();
            break;
          case "applyLifePriority":
            if (!state.applyLifePriority(a.roleId, a.goalHours, a.day)) throw new Error("priority-refused");
            break;
          case "editLifeRole":
            if (!state.editLifeRole(a.roleId, a.name, a.color, a.category === "custom" ? undefined :
              a.category as Parameters<typeof state.setHatCategory>[1])) throw new Error("role-edit-refused");
            break;
          case "removeLifeRole":
            state.removeHat(a.roleId);
            break;
          case "setLifeCapacity":
            if (!state.setLifeCapacity(a.hours)) throw new Error("life-capacity-refused");
            break;
          case "setLifeBudget":
            if (!state.setLifeBudget(a.roleId, a.hours)) throw new Error("life-budget-refused");
            break;
          case "setLifePriority":
            if (!state.setLifePriority(a.priorityRoleId, a.goalHours, a.day)) throw new Error("life-priority-refused");
            break;
          case "saveRecurringPlan": {
            const { type: _type, ...request } = a;
            void _type;
            if (!state.saveRecurringPlan(request as RecurringRequest)) throw new Error("recurrence-refused");
            break;
          }
          case "stopRecurringPlan":
            if (!state.stopRecurringPlan(a.planId, a.fromWeek)) throw new Error("recurrence-stop-refused");
            break;
          case "copyWeekForward":
            if (!state.copyWeekForward(a.batch)) throw new Error("week-copy-refused");
            break;
          case "transferPlanAhead":
            if (!state.transferPlanAhead({
              roleId: a.roleId, toDay: a.toDay, hours: a.hours,
              fromDay: a.fromDay, targetCapacityHours: a.targetCapacityHours,
            })) throw new Error("plan-ahead-refused");
            break;
          case "setTaskImportant":
            if (!state.setTaskImportant(a.roleId, a.taskId, a.important)) throw new Error("task-important-refused");
            break;
          case "setTaskEstimate":
            if (!state.setTaskEstimate(a.roleId, a.taskId, a.minutes)) throw new Error("life-estimate-refused");
            flushSpread();
            break;
          case "retrySave":
            if (!retrySpreadSave()) throw new Error("save-failed");
            break;
          case "deleteTask":
            state.deleteTask(a.roleId, a.taskId);
            break;
          case "restoreDeletedTask": {
            const result = state.restoreDeletedTask(a.taskId);
            if (!result.ok) throw new Error(result.reason ?? "restore-refused");
            break;
          }
          case "permanentlyDeleteTasks":
            state.permanentlyDeleteTasks(a.taskIds);
            break;
          case "bulkMoveOverdue": {
            const result = state.bulkMoveOverdue(a.taskIds, a.targetDay, a.today);
            bulkMoved = result.moved;
            bulkPreview = result.outcomes;
            break;
          }
          case "reorderDayTask":
            if (!state.reorderDayTask(a.roleId, a.day, a.taskId, a.beforeId))
              throw new Error("invalid-order");
            break;
          case "allocationHours":
            state.setAllocationHours(a.allocationId, a.hours);
            break;
          case "removeAllocation":
            state.removeAllocation(a.allocationId);
            break;
          case "renameRole":
            state.renameHat(a.roleId, a.name);
            break;
          case "removeRole":
            state.removeHat(a.roleId);
            break;
          case "switchProfile":
            state.switchProfile(a.profileId);
            break;
          case "addProfile":
            if (!state.addProfile(a.name)) throw new Error("profile-limit");
            break;
          case "removeProfile":
            if (!state.removeProfile(a.profileId)) throw new Error("profile-refused");
            break;
          case "renameProfile":
            if (!state.renameProfile(a.profileId, a.name)) throw new Error("profile-refused");
            break;
          case "rollover":
            rolloverOutcome = state.rollover(a.force);
            break;
          case "moveSpreadToDay":
            state.moveSpreadToDay(a.roleId, a.day, a.hours);
            break;
          case "moveAllocation":
            state.moveAllocation(a.allocationId, a.day);
            break;
          case "setRoleColor":
            state.setHatColor(a.roleId, a.color);
            break;
          case "setRoleCategory":
            if (!isSpreadCategory(a.category)) throw new Error("invalid-category");
            state.setHatCategory(a.roleId, a.category);
            break;
          case "addRole":
            state.addHat(a.name, a.hours, a.category === "custom" ? undefined : { category: a.category });
            break;
          case "setHours":
            state.setHours(a.roleId, a.hours);
            break;
          case "allocate":
            state.addAllocation(a.roleId, a.day, a.hours);
            break;
          case "addTask":
            state.addTask(a.roleId, a.text, a.life);
            break;
          case "addTaskForDay":
            if (!state.addTaskToDay(a.roleId, a.day, a.text, a.life)) throw new Error("invalid-day-or-role");
            break;
          case "editTask":
            state.setTaskText(a.roleId, a.taskId, a.text);
            flushSpread();
            break;
          case "toggleTask":
            state.toggleTask(a.roleId, a.taskId);
            break;
          case "assignTask": {
            const result = state.assignTask(a.roleId, a.taskId, a.allocationId);
            if (!result.ok) throw new Error(result.reason);
            break;
          }
          case "carryOver":
            state.carryOver(a.picks.map((p) => ({ hatId: p.roleId, taskId: p.taskId })));
            break;
          case "undo":
            if (!state.undoEdit(a.editId)) throw new Error("undo-expired");
            redoId = a.editId;
            break;
          case "redo":
            if (!state.redoEdit(a.editId)) throw new Error("redo-expired");
            undoId = a.editId;
            break;
          case "changeWeek":
            state.changeWeek(a.direction);
            break;
          case "openWeek":
            state.openWeek(a.weekKey);
            break;
        }
      };
      const lifeAction = ["setLifeCapacity", "setLifeBudget", "setLifePriority", "applyLifePriority",
        "editLifeRole", "removeLifeRole", "setTaskEstimate", "setTaskImportant", "transferPlanAhead",
        "saveRecurringPlan", "stopRecurringPlan", "copyWeekForward"].includes(a.type) ||
        ((a.type === "addTask" || a.type === "addTaskForDay") && a.life === true);
      if (lifeAction) {
        undoId = state.lifeUndoable(mutate);
        if (undoId) lifeHistoryIds.add(undoId);
      }
      else if (
        [
          "retrySave",
          "changeWeek",
          "openWeek",
          "undo",
          "redo",
          "addRole",
          "switchProfile",
          "addProfile",
          "renameProfile",
          "removeProfile",
          "removeRole",
          "rollover",
          "restoreDeletedTask",
          "permanentlyDeleteTasks",
          "bulkMoveOverdue",
          "addTaskForDay",
        ].includes(a.type)
      )
        mutate();
      else undoId = state.undoable(mutate);
      if (getSaveFacts().failed) return fail("save-failed");
      return {
        requestId: command.requestId,
        ok: true,
        undoId,
        redoId,
        ...(rolloverOutcome ? { rollover: rolloverOutcome } : {}),
        ...(bulkMoved !== undefined ? { bulkMoved, bulkPreview } : {}),
        state: read(),
      };
    } catch {
      return fail("action-refused");
    }
  }
  return {
    read,
    dispatch(raw: unknown): Promise<NativeReply> {
      // Capture the wire message now. Caller mutation must not change queued intent.
      let copy: unknown;
      try {
        copy = structuredClone(raw);
      } catch {
        copy = null;
      }
      const pending = chain.then(() => execute(copy));
      chain = pending.then(
        () => undefined,
        () => undefined,
      );
      return pending;
    },
    dispose() {
      disposed = true;
      unsubscribe();
      requests.clear();
    },
  };
}

function validateTarget(a: NativeRequest["action"], data: SpreadData): string | null {
  const week = data.weeks[data.currentWeek];
  if (
    (a.type === "allocationHours" || a.type === "removeAllocation" || a.type === "moveAllocation") &&
    !week?.allocations.some((p) => p.id === a.allocationId)
  )
    return "no-allocation";
  if (a.type === "allocate" || a.type === "moveSpreadToDay" || a.type === "moveAllocation" || a.type === "addTaskForDay") {
    const date = new Date(`${a.day}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== a.day)
      return "invalid-day";
  }
  if ("roleId" in a && !data.hats.some((r) => r.id === a.roleId)) return "no-role";
  if (
    "taskId" in a && "roleId" in a &&
    !week?.boxes.find((b) => b.hatId === a.roleId)?.tasks.some((t) => t.id === a.taskId)
  )
    return "no-task";
  if (
    (a.type === "allocate" || a.type === "moveSpreadToDay" || a.type === "moveAllocation") &&
    (a.day < data.currentWeek || a.day >= shiftWeek(data.currentWeek, 1))
  )
    return "invalid-day";
  if (a.type === "openWeek") {
    const date = new Date(`${a.weekKey}T12:00:00Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== a.weekKey ||
      date.getUTCDay() !== 1
    )
      return "invalid-week";
  }
  if (["setLifeCapacity", "setLifeBudget", "setLifePriority", "applyLifePriority"].includes(a.type) &&
      week?.life && week.life.version !== 1) return "unsupported-life-version";
  if (a.type === "applyLifePriority") {
    const preview = previewLifePriority(data, a.roleId, a.goalHours, a.day);
    if (!preview.eligible) return "ineligible-day";
    if (preview.shortageHours > 0) return "priority-shortage";
  }
  if (a.type === "setLifeCapacity") {
    if (week?.boxes.reduce((sum, b) => sum + b.hours, 0) > a.hours) return "capacity-below-assigned";
  }
  if (a.type === "setLifeBudget") {
    const assigned = week?.boxes.reduce((sum, b) => sum + (b.hatId === a.roleId ? a.hours : b.hours), 0) ?? 0;
    const current = week?.boxes.find((box) => box.hatId === a.roleId)?.hours ?? 0;
    const legacyCorrection = week?.life?.capacityHours === undefined &&
      (week?.boxes.reduce((sum, box) => sum + box.hours, 0) ?? 0) > 168 && a.hours < current;
    if (week?.life?.capacityHours === undefined && !legacyCorrection) return "capacity-not-set";
    if (week?.life?.capacityHours !== undefined && assigned > week.life.capacityHours && a.hours >= current) return "life-capacity-exceeded";
    if ((week.allocations.filter((item) => item.hatId === a.roleId).reduce((sum, item) => sum + item.hours, 0)) > a.hours) return "budget-below-reserved";
  }
  if (a.type === "setLifePriority") {
    if ((a.goalHours === undefined) !== (a.day === undefined)) return "invalid-priority";
    if (a.day !== undefined) {
      const date = new Date(`${a.day}T12:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== a.day ||
          a.day < data.currentWeek || a.day >= shiftWeek(data.currentWeek, 1)) return "ineligible-day";
    }
  }
  if (a.type === "setLifePriority" && a.priorityRoleId !== null &&
      !data.hats.some((role) => role.id === a.priorityRoleId)) return "no-role";
  // Native writes must explain a bank refusal before calling the existing clamping action. Re-evaluate
  // against the current store inside the serialized dispatcher, never against a stale Swift projection.
  if (a.type === "allocate" || a.type === "moveSpreadToDay" || a.type === "allocationHours") {
    const allocation = a.type === "allocationHours"
      ? week?.allocations.find((item) => item.id === a.allocationId) : undefined;
    const roleId = a.type === "allocationHours" ? allocation!.hatId : a.roleId;
    const bank = week?.boxes.find((box) => box.hatId === roleId)?.hours ?? 0;
    const left = remainingHours(bank, week?.allocations ?? [], roleId);
    const increase = a.type === "allocationHours" ? a.hours - allocation!.hours : a.hours;
    if (increase > 0 && left <= 0) return "bank-empty";
    if (increase > left && increase > 0) return "bank-exceeded";
  }
  if (
    a.type === "assignTask" &&
    a.allocationId !== null &&
    !week?.allocations.some((p) => p.id === a.allocationId && p.hatId === a.roleId && p.hours > 0)
  )
    return "ineligible-day";
  if (
    a.type === "carryOver" &&
    a.picks.some(
      (p) =>
        !data.hats.some((r) => r.id === p.roleId) ||
        !week?.boxes
          .find((b) => b.hatId === p.roleId)
          ?.tasks.some((t) => t.id === p.taskId && !t.done),
    )
  )
    return "invalid-carry";
  return null;
}
