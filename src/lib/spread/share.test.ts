import assert from "node:assert/strict";
import test from "node:test";
import { backupFile, parseBackup } from "./backup.ts";
import { defaultData, weekDays } from "./model.ts";
import { buildWeekDocument, weekDocumentText } from "./week-document.ts";
import { weekDocxBlob } from "./week-docx.ts";

test("the week document keeps the hour bank and Sunday-through-Monday order", () => {
  const data = defaultData();
  const key = data.currentWeek;
  const monday = weekDays(key).find((day) => day.label === "Monday");
  assert.ok(monday);
  data.weeks[key].allocations = [{ id: "a", hatId: "work", day: monday.date, hours: 3, order: 0 }];
  data.weeks[key].boxes[0].tasks = [
    {
      id: "t",
      text: "Finish the database assignment",
      done: false,
      allocationId: "a",
      content: {
        blocks: [
          { id: "n", type: "notes", text: "Bring the schema" },
          {
            id: "o",
            type: "outline",
            items: [
              { id: "i", text: "Tables", level: 0 },
              { id: "j", text: "Indexes", level: 1 },
            ],
          },
          { id: "tb", type: "table", cells: [["Task", "Hours"], ["Schema", "2"]] },
          { id: "p", type: "photo", src: "data:image/png;base64,aaaa" },
          { id: "empty", type: "notes", text: "   " },
        ],
      },
    },
  ];
  const doc = buildWeekDocument(data);
  assert.equal(doc.days[0]?.label.startsWith("Sunday"), true);
  assert.equal(doc.days.at(-1)?.label.startsWith("Monday"), true);
  const work = doc.spreads.find((spread) => spread.name === "Work");
  assert.equal(work?.planned, 8);
  assert.equal(work?.scheduled, 3);
  assert.equal(work?.remaining, 5);
  assert.equal(doc.days.at(-1)?.lines[0]?.tasks[0], "Finish the database assignment");
  const text = weekDocumentText(doc);
  assert.match(text, /## Weekly summary/);
  assert.match(text, /Finish the database assignment/);
  assert.match(text, /Bring the schema/);
  assert.match(text, /Indexes/);
  assert.match(text, /Schema/);
  assert.match(text, /\n  Photo\n/);
  assert.doesNotMatch(text, /base64/);
  assert.match(text, /## Daily schedule/);
});

test("a backup file restores, and anything else is refused", () => {
  const data = defaultData();
  const parsed = parseBackup(JSON.stringify(backupFile(data)));
  assert.deepEqual(parsed?.summary.spreads, ["Work", "Home", "Health"]);
  assert.equal(parsed?.data.hats.length, 3);
  const legacy = parseBackup(JSON.stringify({ hats: data.hats, weeks: data.weeks, currentWeek: data.currentWeek }));
  assert.equal(legacy?.summary.weeks, 1);
  assert.equal(parseBackup("not a backup"), null);
  assert.equal(parseBackup(JSON.stringify({ kind: "spread-backup", version: 1, data: { nope: true } })), null);
});

test("the word document is a real docx package", async () => {
  const blob = await weekDocxBlob(buildWeekDocument(defaultData()));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), "PK");
});
