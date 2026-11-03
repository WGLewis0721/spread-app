import { formatDocHours, type WeekDocument } from "./week-document.ts";

/**
 * Printable HTML for the native Print and PDF route. It follows the same structure as `weekDocumentText`
 * (summary, spreads, daily schedule) and escapes every value. Read-only: it never touches planner data.
 */
export function weekDocumentHTML(doc: WeekDocument): string {
  const esc = (value: string) =>
    value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
  const rows = doc.summary
    .map(
      (row) =>
        `<tr><td>${esc(row.name)}</td><td class="num">${formatDocHours(row.planned)}</td><td class="num">${formatDocHours(row.scheduled)}</td><td class="num">${formatDocHours(row.remaining)}</td></tr>`,
    )
    .join("");
  const spreads = doc.spreads
    .map((spread) => {
      const days = spread.days.length
        ? spread.days.map((day) => `<li>${esc(day.label)} — ${formatDocHours(day.hours)}</li>`).join("")
        : "<li>Not placed on a day yet.</li>";
      const tasks = spread.tasks.length
        ? spread.tasks.map((task) => `<li>${task.done ? "☑" : "☐"} ${esc(task.text)}</li>`).join("")
        : "<li>No tasks.</li>";
      return `<section><h2>${esc(spread.name)}</h2><p>Planned ${formatDocHours(spread.planned)}. Scheduled ${formatDocHours(spread.scheduled)}. Remaining ${formatDocHours(spread.remaining)}.</p><h3>Days</h3><ul>${days}</ul><h3>Tasks</h3><ul>${tasks}</ul></section>`;
    })
    .join("");
  const schedule = doc.days
    .map((day) => {
      const lines = day.lines.length
        ? day.lines
            .map((line) => `<li>${esc(line.name)} · ${formatDocHours(line.hours)}${line.tasks.length ? ` — ${line.tasks.map(esc).join(", ")}` : ""}</li>`)
            .join("")
        : "<li>Nothing planned.</li>";
      return `<h3>${esc(day.label)}</h3><ul>${lines}</ul>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)} ${esc(doc.range)}</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;font-size:11pt;line-height:1.35}
h1{font-size:20pt;margin:0 0 4pt}h2{font-size:14pt;margin:16pt 0 4pt}h3{font-size:11pt;margin:10pt 0 2pt}
table{border-collapse:collapse;width:100%;margin-top:6pt}td,th{border-bottom:0.5pt solid #ccc;padding:4pt 6pt;text-align:left}
.num{text-align:right;font-variant-numeric:tabular-nums}ul{margin:2pt 0 4pt;padding-left:16pt}</style></head><body>
<h1>${esc(doc.title)}</h1><p>${esc(doc.range)}</p>
<h2>Weekly summary</h2><table><tr><th>Spread</th><th class="num">Planned</th><th class="num">Scheduled</th><th class="num">Remaining</th></tr>${rows}
<tr><td><strong>Total</strong></td><td class="num"><strong>${formatDocHours(doc.totals.planned)}</strong></td><td class="num"><strong>${formatDocHours(doc.totals.scheduled)}</strong></td><td class="num"><strong>${formatDocHours(doc.totals.remaining)}</strong></td></tr></table>
${spreads}
<h2>Daily schedule</h2><p>Sunday through Monday.</p>${schedule}
</body></html>`;
}
