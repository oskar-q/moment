import { useMemo, useState } from "react";
import { MessagePanel } from "../components/MessagePanel";
import { Shell } from "../components/Shell";
import {
  cookFocusDish,
  cookNextDish,
  dishesForTable,
} from "../domain/selectors";
import {
  COOK_PROGRESS_LABEL,
  TABLE_IDS,
  type CookProgress,
  type TableId,
} from "../domain/types";
import { useServiceStore } from "../store/useServiceStore";

const PROGRESS_ACTIONS: CookProgress[] = [
  "prep",
  "cooking",
  "ready",
  "passed",
  "delay",
];

export function CookView() {
  const state = useServiceStore();
  const setCookProgress = useServiceStore((s) => s.setCookProgress);
  const [focusTable, setFocusTable] = useState<TableId | "auto">("auto");
  const [delayNote, setDelayNote] = useState("+5 min");

  const current = useMemo(() => {
    if (focusTable === "auto") return cookFocusDish(state);
    return (
      dishesForTable(state, focusTable).find(
        (d) =>
          d.guestState === "active" ||
          d.guestState === "eating" ||
          (d.cookProgress !== "idle" && d.cookProgress !== "passed"),
      ) ?? dishesForTable(state, focusTable).find((d) => d.guestState === "queued")
    );
  }, [state, focusTable]);

  const next = current ? cookNextDish(state, current) : undefined;
  const table = current ? state.tables[current.tableId] : undefined;

  return (
    <Shell title="Cook">
      <section className="section">
        <div className="tabs">
          <button
            type="button"
            className={`tab${focusTable === "auto" ? " active" : ""}`}
            onClick={() => setFocusTable("auto")}
          >
            Auto
          </button>
          {TABLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`tab${focusTable === id ? " active" : ""}`}
              onClick={() => setFocusTable(id)}
            >
              {state.tables[id].label}
              {state.tables[id].rush ? " · rush" : ""}
              {state.tables[id].hold ? " · hold" : ""}
            </button>
          ))}
        </div>
      </section>

      {!current && (
        <section className="section">
          <p className="muted">No active ticket. Waiting for check-in / fire.</p>
        </section>
      )}

      {current && table && (
        <>
          <section className="section">
            <div className="row">
              <p className="mono section-label">Current</p>
              <span className="mono mono-soft">{table.label}</span>
            </div>
            <p className="dish-name" style={{ fontSize: "2rem", margin: "0.25rem 0" }}>
              {current.name}
            </p>
            {table.hold && (
              <p className="mono" style={{ color: "var(--danger)" }}>
                Hold
              </p>
            )}
            {table.rush && <p className="mono">Rush</p>}
            {current.cookProgress === "ready" && (
              <p className="mono">Ready for pass</p>
            )}

            <div className="meta-row">
              <span className="mono mono-soft">Status</span>
              <span className="value">
                {COOK_PROGRESS_LABEL[current.cookProgress]}
              </span>
            </div>
            <div className="meta-row">
              <span className="mono mono-soft">Timer</span>
              <span className="value">
                {current.timerMinutes != null
                  ? `${current.timerMinutes} min`
                  : "—"}
              </span>
            </div>
            <div className="meta-row">
              <span className="mono mono-soft">Detail</span>
              <span className="value">
                {current.instruction || "No instruction"}
              </span>
            </div>
            {table.allergyNote && (
              <div className="meta-row">
                <span className="mono mono-soft">Allergy</span>
                <span className="value">{table.allergyNote}</span>
              </div>
            )}
            {current.delayNote && (
              <div className="meta-row">
                <span className="mono mono-soft">Delay</span>
                <span className="value">{current.delayNote}</span>
              </div>
            )}
          </section>

          <section className="section">
            <p className="mono section-label">Progress</p>
            <p className="muted" style={{ marginTop: 0 }}>
              Updates Server and Manager instantly.
            </p>
            <div className="action-row">
              {PROGRESS_ACTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`text-action${current.cookProgress === p ? " emphasis" : ""}`}
                  disabled={table.paused && p !== "delay"}
                  onClick={() =>
                    setCookProgress(
                      current.id,
                      p,
                      p === "delay" ? delayNote : undefined,
                    )
                  }
                >
                  {COOK_PROGRESS_LABEL[p]}
                </button>
              ))}
            </div>
            <div className="meta-row" style={{ marginTop: "1rem" }}>
              <span className="mono mono-soft">Delay note</span>
              <input
                className="field"
                value={delayNote}
                onChange={(e) => setDelayNote(e.target.value)}
              />
            </div>
          </section>

          <section className="section">
            <p className="mono section-label">Next</p>
            {next ? (
              <>
                <p className="dish-name" style={{ margin: "0.25rem 0" }}>
                  {next.name}
                </p>
                <div className="meta-row">
                  <span className="mono mono-soft">Detail</span>
                  <span className="value">
                    {next.instruction || "—"}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-action"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => setCookProgress(next.id, "prep")}
                >
                  Prep early
                </button>
              </>
            ) : (
              <p className="muted">End of sequence.</p>
            )}
          </section>
        </>
      )}

      <MessagePanel
        role="cook"
        defaultTo="server"
        tableId={current?.tableId}
      />
    </Shell>
  );
}
