import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { emptyContent, uid, type ContentBlock, type OutlineItem, type TaskContent } from "@/lib/spread/model";
import { useSpread } from "@/lib/spread/store";
import { SpreadIcon } from "@/spread/components/spread-icon";
import { useLockPageScroll } from "@/spread/components/use-browser-frame";

const FORMATS: {
  type: ContentBlock["type"];
  label: string;
  detail: string;
  icon: "icon-notes.svg" | "icon-outline.svg" | "icon-table.svg" | "icon-photo.svg";
}[] = [
  { type: "notes", label: "Notes", detail: "Write. I. or A. starts an outline.", icon: "icon-notes.svg" },
  { type: "outline", label: "Outline", detail: "Numbered like a traditional outline.", icon: "icon-outline.svg" },
  { type: "table", label: "Table", detail: "Rows and columns.", icon: "icon-table.svg" },
  { type: "photo", label: "Photo", detail: "A picture from this device.", icon: "icon-photo.svg" },
];

export function TaskSheet({ hatId, taskId, onClose }: { hatId: string; taskId: string; onClose: () => void }) {
  const data = useSpread((s) => s.data);
  const setTaskText = useSpread((s) => s.setTaskText);
  const setTaskContent = useSpread((s) => s.setTaskContent);
  const deleteTask = useSpread((s) => s.deleteTask);
  const [picking, setPicking] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  useLockPageScroll(true);
  const box = data.weeks[data.currentWeek]?.boxes.find((item) => item.hatId === hatId);
  const task = box?.tasks.find((item) => item.id === taskId);
  const content = task?.content ?? emptyContent();

  function write(next: TaskContent) {
    setTaskContent(hatId, taskId, next);
  }

  function add(type: ContentBlock["type"]) {
    const block = blankBlock(type);
    write({ blocks: [...content.blocks, block] });
    setPicking(false);
  }

  function update(block: ContentBlock) {
    write({ blocks: content.blocks.map((item) => (item.id === block.id ? block : item)) });
  }

  function remove(id: string) {
    write({ blocks: content.blocks.filter((item) => item.id !== id) });
  }

  if (!task) return null;
  const showMenu = content.blocks.length === 0 || picking;
  const openNote = content.blocks.find((block) => block.id === expandedNote && block.type === "notes");
  const sheetHeight = "min(92dvh, calc(100dvh - var(--browser-bottom, 0px) - 0.5rem))";

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="no-print fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content
          className={`sheet no-print fixed inset-x-0 z-50 mx-auto w-full max-w-xl bg-elevated px-5 pt-3 pb-safe outline-none enter ${openNote ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}
          style={openNote ? { height: sheetHeight } : undefined}
        >
          <div className="grid shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center">
            <span />
            <div className="mx-auto h-1 w-9 rounded-full bg-fill" aria-hidden="true" />
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid size-11 place-items-center justify-self-end rounded-full text-secondary active:bg-fill"
            >
              <X className="size-5" strokeWidth={2.25} />
            </button>
          </div>
          <Dialog.Title className="sr-only">Task</Dialog.Title>
          <Dialog.Description className="sr-only">Add only the notes, outline, table, or photo you need.</Dialog.Description>
          <input
            value={task.text}
            aria-label="Task title"
            onChange={(event) => setTaskText(hatId, taskId, event.target.value)}
            className="w-full shrink-0 bg-transparent text-2xl font-bold tracking-tight outline-none"
          />
          {openNote && openNote.type === "notes" ? (
            <NotesBlock
              expanded
              text={openNote.text}
              onChange={(text) => update({ ...openNote, text })}
              onDone={() => setExpandedNote(null)}
            />
          ) : (
            <>
              <div className="mt-6 flex flex-col gap-6">
                {content.blocks.map((block) => (
                  <section key={block.id}>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <h2 className="flex items-center gap-2 text-xs font-medium text-secondary">
                        {block.type === "notes" && <SpreadIcon name="icon-notes.svg" size={16} />}
                        {labelFor(block.type)}
                      </h2>
                      <span className="flex items-center gap-4">
                        {block.type === "notes" && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-accent"
                            onClick={() => setExpandedNote(block.id)}
                          >
                            Expand
                          </button>
                        )}
                        <button type="button" className="text-xs font-semibold text-danger" onClick={() => remove(block.id)}>
                          Remove
                        </button>
                      </span>
                    </div>
                    {block.type === "notes" && <NotesBlock text={block.text} onChange={(text) => update({ ...block, text })} />}
                    {block.type === "outline" && (
                      <OutlineBlock items={block.items} onChange={(items) => update({ ...block, items })} />
                    )}
                    {block.type === "table" && <TableBlock cells={block.cells} onChange={(cells) => update({ ...block, cells })} />}
                    {block.type === "photo" && <PhotoBlock src={block.src} onChange={(src) => update({ ...block, src })} />}
                  </section>
                ))}
              </div>
              {showMenu ? (
                <div className={content.blocks.length === 0 ? "mt-6" : "mt-4"}>
                  <div className="overflow-hidden rounded-3xl bg-canvas">
                    {FORMATS.map((format, index) => (
                      <button
                        key={format.type}
                        type="button"
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill ${index > 0 ? "border-t border-line" : ""}`}
                        onClick={() => add(format.type)}
                      >
                        <SpreadIcon name={format.icon} size={20} />
                        <span>
                          <span className="block text-base font-semibold">{format.label}</span>
                          <span className="block text-sm text-secondary">{format.detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-4 flex h-11 items-center gap-2 text-sm font-semibold text-accent"
                  onClick={() => setPicking(true)}
                >
                  <SpreadIcon name="icon-add.svg" size={20} />
                  Add
                </button>
              )}
              <button
                type="button"
                className="mt-6 mb-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-danger"
                onClick={() => {
                  deleteTask(hatId, taskId);
                  onClose();
                }}
              >
                <SpreadIcon name="icon-trash.svg" size={20} />
                Delete task
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function NotesBlock({
  text,
  onChange,
  expanded,
  onDone,
}: {
  text: string;
  onChange: (text: string) => void;
  expanded?: boolean;
  onDone?: () => void;
}) {
  const lines = text.length === 0 ? [""] : text.split("\n");
  const pending = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pending.current == null || !root.current) return;
    const field = root.current.querySelector<HTMLTextAreaElement>(`[data-line="${pending.current}"]`);
    pending.current = null;
    if (!field) return;
    field.focus();
    const end = field.value.length;
    field.setSelectionRange(end, end);
  }, [text]);

  useEffect(() => {
    if (!expanded || !root.current) return;
    root.current.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  }, [expanded]);

  function commit(next: string[]) {
    onChange(next.join("\n"));
  }

  const editor = (
    <div ref={root} className={expanded ? "min-h-0 flex-1 overflow-y-auto rounded-3xl bg-canvas px-1 py-1" : "overflow-hidden rounded-3xl bg-canvas px-1 py-1"}>
      {lines.map((line, index) => {
        const marker = readMarker(line);
        return (
          <textarea
            key={index}
            data-line={index}
            rows={1}
            value={line}
            aria-label={index === 0 ? "Notes" : `Notes line ${index + 1}`}
            placeholder={index === 0 && lines.length === 1 ? "Write. Try I. or A." : ""}
            onChange={(event) => {
              const next = lines.slice();
              next[index] = event.target.value;
              sizeField(event.target);
              commit(next);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (marker && marker.rest === "") {
                  const next = lines.slice();
                  next[index] = "";
                  commit(next);
                  return;
                }
                const inserted = marker ? `${stepMarker(marker)} ` : "";
                const next = lines.slice();
                next.splice(index + 1, 0, inserted);
                pending.current = index + 1;
                commit(next);
              }
              if (event.key === "Backspace" && line === "" && lines.length > 1) {
                event.preventDefault();
                const next = lines.slice();
                next.splice(index, 1);
                pending.current = Math.max(0, index - 1);
                commit(next);
              }
              if (event.key === "Tab" && marker) {
                event.preventDefault();
                const replacement = event.shiftKey ? promoteMarker(marker) : demoteMarker(marker);
                if (!replacement) return;
                const next = lines.slice();
                next[index] = `${replacement} ${marker.rest}`.trimEnd();
                commit(next);
              }
            }}
            ref={sizeField}
            className="block w-full resize-none bg-transparent py-2 text-base leading-6 outline-none placeholder:text-tertiary"
            style={{ paddingLeft: 12 + (marker?.level ?? 0) * 18, paddingRight: 12 }}
          />
        );
      })}
    </div>
  );

  if (!expanded) return editor;

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col pb-2">
      <div className="mb-2 flex shrink-0 items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-xs font-medium text-secondary">
          <SpreadIcon name="icon-notes.svg" size={16} />
          Notes
        </h2>
        <button type="button" className="text-sm font-semibold text-accent" onClick={onDone}>
          Done
        </button>
      </div>
      {editor}
    </div>
  );
}

function OutlineBlock({ items, onChange }: { items: OutlineItem[]; onChange: (items: OutlineItem[]) => void }) {
  const [focusId, setFocusId] = useState<string | null>(items[0]?.id ?? null);
  const pending = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const labels = outlineLabels(items);

  useEffect(() => {
    if (!pending.current || !root.current) return;
    const field = root.current.querySelector<HTMLTextAreaElement>(`[data-item="${pending.current}"]`);
    pending.current = null;
    field?.focus();
  }, [items]);

  function insertAfter(index: number) {
    const item = items[index];
    const nextItem = { id: uid(), text: "", level: item?.level ?? 0 };
    const next = items.slice();
    next.splice(index + 1, 0, nextItem);
    pending.current = nextItem.id;
    setFocusId(nextItem.id);
    onChange(next);
  }

  return (
    <div ref={root} className="overflow-hidden rounded-3xl bg-canvas">
      {items.map((item, index) => {
        const focused = focusId === item.id;
        return (
          <div key={item.id} className="flex items-start border-b border-line last:border-b-0" style={{ paddingLeft: item.level * 12 }}>
            <span className="w-11 shrink-0 pt-3 text-right text-sm font-semibold text-secondary tabular-nums">{labels[index]}</span>
            <textarea
              data-item={item.id}
              rows={1}
              value={item.text}
              aria-label={`Outline ${labels[index]}`}
              placeholder={item.level === 0 ? "Point" : "Detail"}
              onFocus={() => setFocusId(item.id)}
              onChange={(event) => {
                sizeField(event.target);
                onChange(items.map((entry) => (entry.id === item.id ? { ...entry, text: event.target.value } : entry)));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  insertAfter(index);
                }
                if (event.key === "Backspace" && item.text === "" && items.length > 1) {
                  event.preventDefault();
                  const next = items.filter((entry) => entry.id !== item.id);
                  pending.current = next[Math.max(0, index - 1)]?.id ?? null;
                  setFocusId(pending.current);
                  onChange(next);
                }
                if (event.key === "Tab") {
                  event.preventDefault();
                  const level = Math.min(4, Math.max(0, item.level + (event.shiftKey ? -1 : 1)));
                  onChange(items.map((entry) => (entry.id === item.id ? { ...entry, level } : entry)));
                }
              }}
              ref={sizeField}
              className={`min-w-0 flex-1 resize-none bg-transparent px-2 py-3 outline-none placeholder:text-tertiary ${item.level === 0 ? "text-lg font-semibold" : "text-base"}`}
            />
            {focused && (
              <div className="flex shrink-0">
                <button
                  type="button"
                  aria-label="Outdent"
                  className="grid size-11 place-items-center text-secondary disabled:opacity-30"
                  disabled={item.level <= 0}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChange(items.map((entry) => (entry.id === item.id ? { ...entry, level: item.level - 1 } : entry)))}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Indent"
                  className="grid size-11 place-items-center text-secondary disabled:opacity-30"
                  disabled={item.level >= 4}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChange(items.map((entry) => (entry.id === item.id ? { ...entry, level: item.level + 1 } : entry)))}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className="flex h-11 w-full items-center gap-2 px-4 text-sm font-semibold text-accent" onClick={() => insertAfter(items.length - 1)}>
        <Plus className="size-4" />
        Add a point
      </button>
    </div>
  );
}

function TableBlock({ cells, onChange }: { cells: string[][]; onChange: (cells: string[][]) => void }) {
  return (
    <div className="rounded-3xl bg-canvas p-3">
      <div className="flex flex-col gap-2">
        {cells.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-start gap-2">
            <button
              type="button"
              aria-label={`Remove row ${rowIndex + 1}`}
              className="grid size-11 shrink-0 place-items-center rounded-full text-tertiary disabled:opacity-30"
              disabled={cells.length <= 1}
              onClick={() => onChange(cells.filter((_, index) => index !== rowIndex))}
            >
              –
            </button>
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
              {row.map((cell, columnIndex) => (
                <textarea
                  key={columnIndex}
                  rows={2}
                  value={cell}
                  aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                  onChange={(event) => {
                    const next = cells.map((line) => line.slice());
                    next[rowIndex][columnIndex] = event.target.value;
                    onChange(next);
                  }}
                  className="h-16 w-36 shrink-0 resize-none rounded-2xl bg-fill px-3 py-2 text-base outline-none"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="h-11 rounded-full bg-fill text-sm font-semibold"
          onClick={() => onChange([...cells, cells[0].map(() => "")])}
        >
          Add row
        </button>
        <button
          type="button"
          className="h-11 rounded-full bg-fill text-sm font-semibold disabled:opacity-30"
          disabled={cells[0].length >= 6}
          onClick={() => onChange(cells.map((row) => [...row, ""]))}
        >
          Add column
        </button>
        <button
          type="button"
          className="h-11 rounded-full text-sm font-semibold text-secondary disabled:opacity-30"
          disabled={cells[0].length <= 1}
          onClick={() => onChange(cells.map((row) => row.slice(0, -1)))}
        >
          Remove column
        </button>
      </div>
    </div>
  );
}

function PhotoBlock({ src, onChange }: { src: string; onChange: (src: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="overflow-hidden rounded-3xl bg-canvas">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !file.type.startsWith("image/")) return;
          onChange(await compressPhoto(file));
        }}
      />
      {src ? (
        <>
          <img src={src} alt="" className="max-h-72 w-full object-cover" />
          <button type="button" className="h-11 w-full text-sm font-semibold text-accent" onClick={() => fileRef.current?.click()}>
            Replace photo
          </button>
        </>
      ) : (
        <button type="button" className="h-12 w-full text-sm font-semibold text-accent" onClick={() => fileRef.current?.click()}>
          Choose a photo
        </button>
      )}
    </div>
  );
}

function blankBlock(type: ContentBlock["type"]): ContentBlock {
  if (type === "notes") return { id: uid(), type, text: "" };
  if (type === "outline") return { id: uid(), type, items: [{ id: uid(), text: "", level: 0 }] };
  if (type === "table") return { id: uid(), type, cells: [["", ""], ["", ""]] };
  return { id: uid(), type: "photo", src: "" };
}

function labelFor(type: ContentBlock["type"]) {
  return FORMATS.find((format) => format.type === type)?.label ?? type;
}

function sizeField(node: HTMLTextAreaElement | null) {
  if (!node) return;
  node.style.height = "0px";
  node.style.height = `${node.scrollHeight}px`;
}

type Marker = { kind: "I" | "A" | "1" | "a" | "i"; token: string; rest: string; level: number };

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

function readMarker(line: string): Marker | null {
  const roman = line.match(/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\.\s*(.*)$/);
  if (roman) return { kind: "I", token: roman[1], rest: roman[2], level: 0 };
  const upper = line.match(/^([A-H]|[J-Z])\.\s*(.*)$/);
  if (upper) return { kind: "A", token: upper[1], rest: upper[2], level: 1 };
  const number = line.match(/^(\d+)\.\s*(.*)$/);
  if (number) return { kind: "1", token: number[1], rest: number[2], level: 2 };
  const lowerRoman = line.match(/^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\.\s*(.*)$/);
  if (lowerRoman) return { kind: "i", token: lowerRoman[1], rest: lowerRoman[2], level: 4 };
  const lower = line.match(/^([a-z])\.\s*(.*)$/);
  if (lower) return { kind: "a", token: lower[1], rest: lower[2], level: 3 };
  return null;
}

function stepMarker(marker: Marker) {
  if (marker.kind === "I") {
    const index = ROMAN.indexOf(marker.token);
    return `${ROMAN[index + 1] ?? "XXI"}.`;
  }
  if (marker.kind === "A" || marker.kind === "a") {
    const code = marker.token.charCodeAt(0);
    const next = code >= 90 || code >= 122 ? marker.token : String.fromCharCode(code + 1);
    return `${next}.`;
  }
  if (marker.kind === "1") return `${Number(marker.token) + 1}.`;
  const index = ROMAN.findIndex((value) => value.toLowerCase() === marker.token);
  return `${(ROMAN[index + 1] ?? "xiii").toLowerCase()}.`;
}

function demoteMarker(marker: Marker) {
  if (marker.kind === "I") return "A.";
  if (marker.kind === "A") return "1.";
  if (marker.kind === "1") return "a.";
  if (marker.kind === "a") return "i.";
  return null;
}

function promoteMarker(marker: Marker) {
  if (marker.kind === "i") return "a.";
  if (marker.kind === "a") return "1.";
  if (marker.kind === "1") return "A.";
  if (marker.kind === "A") return "I.";
  return null;
}

function outlineLabels(items: OutlineItem[]) {
  const counts = [0, 0, 0, 0, 0];
  return items.map((item) => {
    const level = Math.min(4, Math.max(0, item.level));
    counts[level] += 1;
    for (let deeper = level + 1; deeper < counts.length; deeper += 1) counts[deeper] = 0;
    return formatOutlineLabel(level, counts[level]);
  });
}

function formatOutlineLabel(level: number, count: number) {
  if (level === 0) return `${ROMAN[count - 1] ?? count}.`;
  if (level === 1) return `${letter(count)}.`;
  if (level === 2) return `${count}.`;
  if (level === 3) return `${letter(count).toLowerCase()}.`;
  return `${(ROMAN[count - 1] ?? String(count)).toLowerCase()}.`;
}

function letter(count: number) {
  let value = count;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

async function compressPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}
