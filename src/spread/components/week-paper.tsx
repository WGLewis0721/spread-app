import { type ContentBlock } from "@/lib/spread/model";
import { formatDocHours, type WeekDocument } from "@/lib/spread/week-document";

export function WeekPaper({ doc }: { doc: WeekDocument }) {
  return (
    <article className="spread-paper">
      <h1>{doc.title}</h1>
      <p className="paper-range">{doc.range}</p>
      <h2>Weekly summary</h2>
      <table>
        <thead>
          <tr>
            <th>Spread</th>
            <th className="num">Planned</th>
            <th className="num">Scheduled</th>
            <th className="num">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {doc.summary.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td className="num">{formatDocHours(row.planned)}</td>
              <td className="num">{formatDocHours(row.scheduled)}</td>
              <td className="num">{formatDocHours(row.remaining)}</td>
            </tr>
          ))}
          <tr>
            <th>Total</th>
            <th className="num">{formatDocHours(doc.totals.planned)}</th>
            <th className="num">{formatDocHours(doc.totals.scheduled)}</th>
            <th className="num">{formatDocHours(doc.totals.remaining)}</th>
          </tr>
        </tbody>
      </table>
      {doc.spreads.map((spread) => (
        <section key={spread.name}>
          <h2>{spread.name}</h2>
          <p>
            Planned {formatDocHours(spread.planned)}. Scheduled {formatDocHours(spread.scheduled)}. Remaining{" "}
            {formatDocHours(spread.remaining)}.
          </p>
          <h3>Days</h3>
          {spread.days.length === 0 ? (
            <p>Not placed on a day yet.</p>
          ) : (
            <ul>
              {spread.days.map((day) => (
                <li key={day.label}>
                  {day.label} — {formatDocHours(day.hours)}
                </li>
              ))}
            </ul>
          )}
          <h3>Tasks</h3>
          {spread.tasks.length === 0 ? <p>No tasks.</p> : spread.tasks.map((task) => <TaskBlock key={task.text} task={task} />)}
        </section>
      ))}
      <h2 className="paper-break">Daily schedule</h2>
      <p>Sunday through Monday.</p>
      {doc.days.map((day) => (
        <section key={day.label}>
          <h3>{day.label}</h3>
          {day.lines.length === 0 ? (
            <p>Nothing scheduled.</p>
          ) : (
            <ul>
              {day.lines.map((line) => (
                <li key={`${line.name}-${line.hours}`}>
                  {line.name} — {formatDocHours(line.hours)}
                  {line.tasks.length > 0 && (
                    <ul>
                      {line.tasks.map((task) => (
                        <li key={task}>{task}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}

function TaskBlock({ task }: { task: WeekDocument["spreads"][number]["tasks"][number] }) {
  return (
    <div className="paper-task">
      <p>
        {task.done ? "Done. " : "Open. "}
        {task.text}
      </p>
      {task.blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: ContentBlock }) {
  if (block.type === "notes") {
    return (
      <>
        <p>
          <strong>Notes</strong>
        </p>
        {block.text.split("\n").map((line) => (
          <p key={line}>{line}</p>
        ))}
      </>
    );
  }
  if (block.type === "outline") {
    return (
      <>
        <p>
          <strong>Outline</strong>
        </p>
        <ul>
          {block.items.map((item) => (
            <li key={item.id} style={{ marginLeft: `${item.level * 16}px` }}>
              {item.text}
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (block.type === "table") {
    return (
      <>
        <p>
          <strong>Table</strong>
        </p>
        <table>
          <tbody>
            {block.cells.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
  return (
    <>
      <p>
        <strong>Photo</strong>
      </p>
      <img src={block.src} alt="" />
    </>
  );
}
