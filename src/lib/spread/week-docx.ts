import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { type ContentBlock } from "./model.ts";
import { formatDocHours, type DocTask, type WeekDocument } from "./week-document.ts";

const BODY = "Calibri";
const HEAD = "Cambria";
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const BORDERS = { top: LINE, bottom: LINE, left: LINE, right: LINE };

export async function weekDocxBlob(doc: WeekDocument) {
  const file = new Document({
    title: `${doc.title} ${doc.range}`,
    sections: [
      {
        properties: {
          page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } },
        },
        children: await children(doc),
      },
    ],
  });
  return Packer.toBlob(file);
}

async function children(doc: WeekDocument) {
  const blocks: (Paragraph | Table)[] = [
    heading(doc.title, HeadingLevel.HEADING_1, 44),
    text(doc.range, { size: 24, after: 240 }),
    heading("Weekly summary", HeadingLevel.HEADING_2, 32),
    hoursTable([
      ["Spread", "Planned", "Scheduled", "Remaining"],
      ...doc.summary.map((row) => [row.name, formatDocHours(row.planned), formatDocHours(row.scheduled), formatDocHours(row.remaining)]),
      ["Total", formatDocHours(doc.totals.planned), formatDocHours(doc.totals.scheduled), formatDocHours(doc.totals.remaining)],
    ]),
  ];
  for (const spread of doc.spreads) {
    blocks.push(heading(spread.name, HeadingLevel.HEADING_2, 32));
    blocks.push(
      text(
        `Planned ${formatDocHours(spread.planned)}. Scheduled ${formatDocHours(spread.scheduled)}. Remaining ${formatDocHours(spread.remaining)}.`,
      ),
    );
    blocks.push(heading("Days", HeadingLevel.HEADING_3, 24));
    if (spread.days.length === 0) blocks.push(text("Not placed on a day yet."));
    for (const day of spread.days) blocks.push(bullet(`${day.label} — ${formatDocHours(day.hours)}`));
    blocks.push(heading("Tasks", HeadingLevel.HEADING_3, 24));
    if (spread.tasks.length === 0) blocks.push(text("No tasks."));
    for (const task of spread.tasks) blocks.push(...(await taskBlocks(task)));
  }
  blocks.push(new Paragraph({ children: [new PageBreak()] }));
  blocks.push(heading("Daily schedule", HeadingLevel.HEADING_1, 36));
  blocks.push(text("Sunday through Monday.", { italics: true, after: 200 }));
  for (const day of doc.days) {
    blocks.push(heading(day.label, HeadingLevel.HEADING_2, 28));
    if (day.lines.length === 0) blocks.push(text("Nothing scheduled."));
    for (const line of day.lines) {
      blocks.push(bullet(`${line.name} — ${formatDocHours(line.hours)}`));
      for (const task of line.tasks) blocks.push(bullet(task, 720));
    }
  }
  return blocks;
}

async function taskBlocks(task: DocTask) {
  const mark = task.done ? "Done" : "Open";
  const blocks: (Paragraph | Table)[] = [bullet(`${mark}. ${task.text}`, 360)];
  for (const block of task.blocks) blocks.push(...(await contentBlocks(block)));
  return blocks;
}

async function contentBlocks(block: ContentBlock) {
  if (block.type === "notes") {
    return [text("Notes", { bold: true, size: 20 }), ...block.text.split("\n").map((line) => text(line, { size: 21 }))];
  }
  if (block.type === "outline") {
    return [
      text("Outline", { bold: true, size: 20 }),
      ...block.items.map((item) => bullet(item.text, 360 + item.level * 360)),
    ];
  }
  if (block.type === "table") {
    return [text("Table", { bold: true, size: 20 }), hoursTable(block.cells.length > 0 ? block.cells : [[""]])];
  }
  const image = await loadImage(block.src);
  if (!image) return [text("Photo")];
  return [
    text("Photo", { bold: true, size: 20 }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new ImageRun({
          type: image.type,
          data: image.data,
          transformation: { width: image.width, height: image.height },
          altText: { name: "Photo", description: "Task photo" },
        }),
      ],
    }),
  ];
}

const CONTENT = 10080;

function columnWidths(count: number) {
  if (count === 4) return [4080, 2000, 2000, 2000];
  const base = Math.floor(CONTENT / count);
  const widths = Array.from({ length: count }, () => base);
  widths[widths.length - 1] += CONTENT - base * count;
  return widths;
}

function hoursTable(rows: string[][]) {
  const count = Math.max(...rows.map((row) => row.length), 1);
  const widths = columnWidths(count);
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: rows.map((row, index) => {
      const last = index === rows.length - 1 && rows.length > 1 && row[0] === "Total";
      const header = index === 0;
      return new TableRow({
        tableHeader: header,
        children: Array.from({ length: count }, (_, cell) => {
          const value = row[cell] ?? "";
          const number = cell > 0 && count === 4;
          return new TableCell({
            borders: BORDERS,
            width: { size: widths[cell], type: WidthType.DXA },
            margins: { marginUnitType: WidthType.DXA, top: 60, bottom: 60, left: 100, right: 100 },
            shading: header || last ? { type: ShadingType.CLEAR, fill: "F2F2F2" } : undefined,
            children: [
              new Paragraph({
                alignment: number ? AlignmentType.RIGHT : AlignmentType.LEFT,
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: value, bold: header || last, font: BODY, size: 21 })],
              }),
            ],
          });
        }),
      });
    }),
  });
}

function heading(value: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], size: number) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text: value, bold: true, font: HEAD, size })],
  });
}

function text(value: string, options: { bold?: boolean; italics?: boolean; size?: number; after?: number } = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 80 },
    children: [
      new TextRun({
        text: value,
        bold: options.bold,
        italics: options.italics,
        font: BODY,
        size: options.size ?? 22,
      }),
    ],
  });
}

function bullet(value: string, left = 360) {
  return new Paragraph({
    bullet: { level: 0 },
    indent: { left },
    spacing: { after: 40 },
    children: [new TextRun({ text: value, font: BODY, size: 22 })],
  });
}

async function loadImage(src: string) {
  const match = /^data:image\/(png|jpeg|jpg|gif|bmp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(src);
  if (!match) return null;
  const kind = match[1].toLowerCase();
  const type = kind === "jpeg" || kind === "jpg" ? "jpg" : kind === "gif" ? "gif" : kind === "bmp" ? "bmp" : "png";
  const binary = atob(match[2].replace(/\s/g, ""));
  const data = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) data[index] = binary.charCodeAt(index);
  let width = 480;
  let height = 270;
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(new Blob([data]));
      const scale = Math.min(1, 540 / Math.max(bitmap.width, 1));
      width = Math.max(1, Math.round(bitmap.width * scale));
      height = Math.max(1, Math.round(bitmap.height * scale));
      bitmap.close?.();
    } catch {
      // Keep a readable fallback size.
    }
  }
  return { type, data, width, height } as const;
}
