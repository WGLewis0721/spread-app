import { z } from "zod";
import { isSpreadCategory, shiftWeek, type SpreadData, type TaskContent } from "./model.ts";
import { getSaveFacts } from "./local-status.ts";
import { projectNativeV2, type NativeV2Envelope } from "./native-v2-projection.ts";
import { flushSpread, retrySpreadSave, useSpread } from "./store.ts";
import { buildWeekDocument, weekDocumentText } from "./week-document.ts";
import { weekDocumentHTML } from "./native-v2-export.ts";

const id = z.string().trim().min(1).max(200);
const text = z.string().trim().min(1).max(10000);
const hours = z.number().finite().min(0).max(168).multipleOf(0.5);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const contentSchema = z.strictObject({
  blocks: z
    .array(
      z.discriminatedUnion("type", [
        z.strictObject({ id, type: z.literal("notes"), text: z.string().max(1000000) }),
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
  z.strictObject({ type: z.literal("deleteTask"), roleId: id, taskId: id }),
  z.strictObject({ type: z.literal("allocationHours"), allocationId: id, hours }),
  z.strictObject({ type: z.literal("removeAllocation"), allocationId: id }),
  z.strictObject({ type: z.literal("renameRole"), roleId: id, name: text }),
  z.strictObject({ type: z.literal("removeRole"), roleId: id }),
  z.strictObject({ type: z.literal("switchProfile"), profileId: id }),
  z.strictObject({ type: z.literal("addProfile"), name: text }),
  z.strictObject({ type: z.literal("removeProfile"), profileId: id }),
  z.strictObject({ type: z.literal("renameProfile"), profileId: id, name: text }),
  z.strictObject({ type: z.literal("exportWeek"), format: z.enum(["text", "html", "docx"]) }),
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
  z.strictObject({ type: z.literal("addTask"), roleId: id, text }),
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
  rollover?: "done" | "confirm" | "empty";
  /** Read-only export of the open week; never persisted and never part of planner state. */
  exported?: { format: "text" | "html" | "docx"; content: string };
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
  const requests = new Map<string, { fingerprint: string; reply: NativeReply }>();
  const unsubscribe = useSpread.subscribe((next, previous) => {
    if (next.data !== previous.data || next.activeId !== previous.activeId) revision += 1;
  });
  function read(): NativeRead | null {
    const state = useSpread.getState();
    return !disposed && state.ready && state.activeId
      ? { sessionId, revision, envelope: projectNativeV2(state.data, state.activeId) }
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
  function run(command: NativeRequest, fail: (error: string) => NativeReply): NativeReply {
    const state = useSpread.getState();
    if (!state.ready || !state.activeId) return fail("not-ready");
    if (command.expectedProfileId !== state.activeId) return fail("stale-profile");
    if (command.expectedWeek !== state.data.currentWeek) return fail("stale-week");
    if (command.expectedRevision !== revision) return fail("stale-revision");
    if (getSaveFacts().failed && !["retrySave", "readTaskContent"].includes(command.action.type))
      return fail("save-unavailable");
    const a = command.action;
    if (a.type === "exportWeek") return fail("export-not-here");
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
    let rolloverOutcome: "done" | "confirm" | "empty" | undefined;
    try {
      const mutate = () => {
        switch (a.type) {
          case "setTaskContent":
            state.setTaskContent(a.roleId, a.taskId, a.content);
            flushSpread();
            break;
          case "retrySave":
            if (!retrySpreadSave()) throw new Error("save-failed");
            break;
          case "deleteTask":
            state.deleteTask(a.roleId, a.taskId);
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
            state.addTask(a.roleId, a.text);
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
            break;
          case "changeWeek":
            state.changeWeek(a.direction);
            break;
          case "openWeek":
            state.openWeek(a.weekKey);
            break;
        }
      };
      if (
        [
          "retrySave",
          "changeWeek",
          "openWeek",
          "undo",
          "addRole",
          "switchProfile",
          "addProfile",
          "renameProfile",
          "removeProfile",
          "removeRole",
          "rollover",
        ].includes(a.type)
      )
        mutate();
      else undoId = state.undoable(mutate);
      if (getSaveFacts().failed) return fail("save-failed");
      return {
        requestId: command.requestId,
        ok: true,
        undoId,
        ...(rolloverOutcome ? { rollover: rolloverOutcome } : {}),
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
  if (a.type === "allocate" || a.type === "moveSpreadToDay" || a.type === "moveAllocation") {
    const date = new Date(`${a.day}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== a.day)
      return "invalid-day";
  }
  if ("roleId" in a && !data.hats.some((r) => r.id === a.roleId)) return "no-role";
  if (
    "taskId" in a &&
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
