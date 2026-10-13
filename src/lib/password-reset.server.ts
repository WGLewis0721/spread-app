// Server-only wiring for the password reset (src/lib/password-reset.ts): the Sheet tab that holds
// requests, and the Better Auth calls that look up an account and set its password.
import { readFileSync, writeFileSync } from "node:fs";
import { devAllowlist, normalizeEmail } from "./beta-access.ts";
import { betaAccess } from "./beta-access.server.ts";
import {
  createResetService,
  RESET_TAB_DEFAULT,
  type ResetRow,
  type ResetService,
  type ResetStore,
} from "./password-reset.ts";
import { sheetsStoreFromEnv, type SheetsStore } from "./waitlist.server.ts";

/** Columns A:E of the "Reset requests" tab: requested_at | email | code | token_hash | status. */
export function sheetsResetStore(sheets: SheetsStore, tab: string): ResetStore {
  return {
    async append(row) {
      await sheets.appendValues(tab, "A:E", [row.requestedAt, row.email, row.code, row.tokenHash, row.status]);
    },
    async list() {
      const values = await sheets.readValues(tab, "A2:E");
      return values.map((cells, index) => ({
        index,
        row: {
          requestedAt: cells[0] ?? "",
          email: normalizeEmail(cells[1] ?? ""),
          code: cells[2] ?? "",
          tokenHash: (cells[3] ?? "").trim(),
          status: cells[4] ?? "",
        },
      }));
    },
    // Row 1 is the header, so index 0 is sheet row 2.
    async setStatus(index, status) {
      await sheets.writeValue(tab, `E${index + 2}`, status);
    },
  };
}

/** Local testing only: a JSON file standing in for the tab, so a request can be approved by editing it. */
function fileResetStore(path: string): ResetStore {
  const read = (): ResetRow[] => {
    try {
      return JSON.parse(readFileSync(path, "utf8")) as ResetRow[];
    } catch {
      return [];
    }
  };
  const write = (rows: ResetRow[]) => writeFileSync(path, JSON.stringify(rows, null, 2));
  return {
    async append(row) {
      write([...read(), row]);
    },
    async list() {
      return read().map((row, index) => ({ row, index }));
    },
    async setStatus(index, status) {
      const rows = read();
      if (rows[index]) rows[index].status = status;
      write(rows);
    },
  };
}

let service: ResetService | undefined;

export function resetServiceFromEnv(env: Record<string, string | undefined> = process.env): ResetService {
  if (service) return service;
  let store: ResetStore;
  if (devAllowlist(env) && env["BETA_DEV_RESET_FILE"]) {
    store = fileResetStore(env["BETA_DEV_RESET_FILE"]);
  } else {
    // RESET_SPREADSHEET_ID points at a separate spreadsheet for requests; unset, they go on a tab
    // of the waitlist spreadsheet. RESET_SHEET_TAB names the tab either way.
    const sheets = sheetsStoreFromEnv(env, { spreadsheetId: env["RESET_SPREADSHEET_ID"] });
    const tab = (env["RESET_SHEET_TAB"] ?? "").trim() || RESET_TAB_DEFAULT;
    // No Sheet configured: every call fails as "unavailable"; nothing is ever approved by default.
    store = sheets
      ? sheetsResetStore(sheets, tab)
      : {
          append: () => Promise.reject(new Error("Reset Sheet is not configured.")),
          list: () => Promise.reject(new Error("Reset Sheet is not configured.")),
          setStatus: () => Promise.reject(new Error("Reset Sheet is not configured.")),
        };
  }
  service = createResetService({
    store,
    access: (email) => betaAccess.check(email),
    async hasAccount(email) {
      const { auth } = await import("./auth/server.ts");
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });
      return Boolean(found?.accounts.some((account) => account.providerId === "credential"));
    },
    async setPassword(email, password) {
      const { auth } = await import("./auth/server.ts");
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });
      if (!found?.accounts.some((account) => account.providerId === "credential")) return false;
      await ctx.internalAdapter.updatePassword(found.user.id, await ctx.password.hash(password));
      // A reset signs the account out everywhere, including whoever else had the old password.
      await ctx.internalAdapter.deleteUserSessions(found.user.id);
      return true;
    },
  });
  return service;
}
