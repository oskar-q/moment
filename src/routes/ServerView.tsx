import { useMemo, useState } from "react";
import { MessagePanel } from "../components/MessagePanel";
import { Shell } from "../components/Shell";
import {
  COOK_PROGRESS_LABEL,
  TABLE_IDS,
  type TableId,
} from "../domain/types";
import { useServiceStore } from "../store/useServiceStore";

export function ServerView() {
  const [tableId, setTableId] = useState<TableId>("t1");
  const [feedback, setFeedback] = useState("");
  const tables = useServiceStore((s) => s.tables);
  const dishes = useServiceStore((s) => s.dishes);
  const setInstruction = useServiceStore((s) => s.setInstruction);
  const setTimer = useServiceStore((s) => s.setTimer);
  const activateCourse = useServiceStore((s) => s.activateCourse);
  const markEating = useServiceStore((s) => s.markEating);
  const clearCourse = useServiceStore((s) => s.clearCourse);
  const holdTable = useServiceStore((s) => s.holdTable);
  const rushTable = useServiceStore((s) => s.rushTable);
  const addFeedback = useServiceStore((s) => s.addFeedback);
  const setAllergy = useServiceStore((s) => s.setAllergy);

  const table = tables[tableId];
  const sequence = useMemo(
    () =>
      dishes
        .filter((d) => d.tableId === tableId)
        .sort((a, b) => a.courseIndex - b.courseIndex),
    [dishes, tableId],
  );

  const current = sequence.find(
    (d) => d.guestState === "active" || d.guestState === "eating",
  );

  return (
    <Shell title="Server">
      <section className="section">
        <div className="tabs">
          {TABLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`tab${tableId === id ? " active" : ""}`}
              onClick={() => setTableId(id)}
            >
              {tables[id].label}
              {!tables[id].checkedIn ? " · dark" : ""}
              {tables[id].rush ? " · rush" : ""}
              {tables[id].hold ? " · hold" : ""}
            </button>
          ))}
        </div>
        <p className="mono mono-soft">{table.bookingBrief}</p>
        {!table.checkedIn && (
          <p className="muted">Waiting for manager check-in.</p>
        )}
        {table.paused && <p className="muted">Table paused by manager.</p>}
      </section>

      <section className="section">
        <p className="mono section-label">Course sequence</p>
        <ul className="line-list">
          {sequence.map((dish) => {
            const isCurrent =
              dish.guestState === "active" || dish.guestState === "eating";
            const ready = dish.cookProgress === "ready";
            return (
              <li
                key={dish.id}
                className={`line-item${isCurrent ? " active" : ""}${ready ? " ready-cue" : ""}`}
              >
                <div>
                  <div className="dish-name">{dish.name}</div>
                  <div className="mono mono-soft">
                    {dish.guestState}
                    {" · "}
                    kitchen {COOK_PROGRESS_LABEL[dish.cookProgress]}
                    {dish.timerMinutes != null ? ` · ${dish.timerMinutes} min` : ""}
                  </div>
                </div>
                <div className="stack-gap" style={{ textAlign: "right" }}>
                  {dish.guestState === "queued" && (
                    <button
                      type="button"
                      className="mono"
                      disabled={!table.checkedIn || table.paused}
                      onClick={() => activateCourse(dish.id)}
                    >
                      Fire
                    </button>
                  )}
                  {dish.guestState === "active" && (
                    <button
                      type="button"
                      className="mono"
                      onClick={() => markEating(dish.id)}
                    >
                      Eating
                    </button>
                  )}
                  {(dish.guestState === "active" ||
                    dish.guestState === "eating") && (
                    <button
                      type="button"
                      className="mono"
                      onClick={() => clearCourse(dish.id)}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {current && (
        <section className="section">
          <p className="mono section-label">Active course</p>
          {current.cookProgress === "ready" && (
            <p className="mono" style={{ marginBottom: "0.75rem" }}>
              Ready — pick up
            </p>
          )}
          <div className="meta-row">
            <span className="mono mono-soft">Dish</span>
            <span className="value">{current.name}</span>
          </div>
          <div className="meta-row">
            <span className="mono mono-soft">Kitchen</span>
            <span className="value">
              {COOK_PROGRESS_LABEL[current.cookProgress]}
              {current.delayNote ? ` · ${current.delayNote}` : ""}
            </span>
          </div>
          <div className="meta-row">
            <span className="mono mono-soft">Timer</span>
            <input
              className="field"
              type="number"
              min={1}
              max={60}
              value={current.timerMinutes ?? 10}
              onChange={(e) =>
                setTimer(current.id, Number(e.target.value) || 10)
              }
            />
          </div>
          <div className="meta-row">
            <span className="mono mono-soft">Detail</span>
            <input
              className="field"
              placeholder="Custom instruction for cook"
              value={current.instruction}
              onChange={(e) => setInstruction(current.id, e.target.value)}
            />
          </div>
        </section>
      )}

      <section className="section">
        <p className="mono section-label">Floor signals</p>
        <div className="action-row">
          <button
            type="button"
            className="text-action"
            disabled={!table.checkedIn}
            onClick={() => holdTable(tableId, !table.hold)}
          >
            {table.hold ? "Lift hold" : "Hold"}
          </button>
          <button
            type="button"
            className="text-action"
            disabled={!table.checkedIn}
            onClick={() => rushTable(tableId, !table.rush)}
          >
            {table.rush ? "Clear rush" : "Rush"}
          </button>
        </div>
        <div className="meta-row" style={{ marginTop: "1rem" }}>
          <span className="mono mono-soft">Allergy</span>
          <input
            className="field"
            placeholder="Visible to cook + manager"
            value={table.allergyNote}
            onChange={(e) => setAllergy(tableId, e.target.value)}
          />
        </div>
      </section>

      <section className="section">
        <p className="mono section-label">Feedback</p>
        <textarea
          className="field"
          placeholder="Guest note for manager…"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <button
          type="button"
          className="text-action"
          style={{ marginTop: "0.75rem" }}
          onClick={() => {
            addFeedback(tableId, feedback);
            setFeedback("");
          }}
        >
          Send feedback
        </button>
      </section>

      <MessagePanel role="server" defaultTo="cook" tableId={tableId} />
    </Shell>
  );
}
