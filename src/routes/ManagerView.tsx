import { useState } from "react";
import { MessagePanel } from "../components/MessagePanel";
import { Shell } from "../components/Shell";
import { TaskBoard } from "../components/TaskBoard";
import { activeDish, tableStatusLine } from "../domain/selectors";
import { COOK_PROGRESS_LABEL, TABLE_IDS } from "../domain/types";
import { useServiceStore } from "../store/useServiceStore";

export function ManagerView() {
  const state = useServiceStore();
  const checkIn = useServiceStore((s) => s.checkIn);
  const setPaused = useServiceStore((s) => s.setPaused);
  const clearFeedback = useServiceStore((s) => s.clearFeedback);
  const forceAdvance = useServiceStore((s) => s.forceAdvance);
  const holdTable = useServiceStore((s) => s.holdTable);
  const rushTable = useServiceStore((s) => s.rushTable);
  const sendMessage = useServiceStore((s) => s.sendMessage);
  const [compose, setCompose] = useState("");

  const openFeedback = state.feedback.filter((f) => !f.cleared);

  return (
    <Shell title="Manager" wide>
      <section className="section">
        <p className="mono section-label">Bookings</p>
        <div className="grid-2">
          {TABLE_IDS.map((id) => {
            const table = state.tables[id];
            const dish = activeDish(state, id);
            return (
              <div key={id} style={{ border: "1px solid var(--line)", padding: "1rem" }}>
                <div className="row">
                  <span className="dish-name" style={{ fontSize: "1.45rem" }}>
                    {table.label}
                  </span>
                  <span className="mono mono-soft">
                    {table.checkedIn ? "Seated" : "Expected"}
                  </span>
                </div>
                <p className="mono mono-soft" style={{ margin: "0.5rem 0" }}>
                  {table.bookingBrief}
                </p>
                <p style={{ margin: "0.35rem 0" }}>{tableStatusLine(state, id)}</p>
                {dish && (
                  <div className="meta-row">
                    <span className="mono mono-soft">Kitchen</span>
                    <span className="value">
                      {COOK_PROGRESS_LABEL[dish.cookProgress]}
                      {dish.timerMinutes != null
                        ? ` · ${dish.timerMinutes} min`
                        : ""}
                    </span>
                  </div>
                )}
                {table.allergyNote && (
                  <div className="meta-row">
                    <span className="mono mono-soft">Allergy</span>
                    <span className="value">{table.allergyNote}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <p className="mono section-label">Back · Front</p>
        <div className="split">
          <div>
            <p className="mono mono-soft">Back</p>
            {TABLE_IDS.map((id) => {
              const t = state.tables[id];
              const dish = activeDish(state, id);
              return (
                <div key={id} style={{ marginTop: "0.85rem" }}>
                  <div className="row">
                    <span>{t.label}</span>
                    <span className="mono mono-soft">
                      {t.cookingStarted
                        ? dish
                          ? COOK_PROGRESS_LABEL[dish.cookProgress]
                          : "Start cooking"
                        : "Idle"}
                    </span>
                  </div>
                  {dish?.instruction && (
                    <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                      {dish.instruction}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div>
            <p className="mono mono-soft">Front</p>
            {TABLE_IDS.map((id) => {
              const t = state.tables[id];
              return (
                <div key={id} style={{ marginTop: "0.85rem" }}>
                  <div className="row">
                    <span>{t.label}</span>
                    {!t.checkedIn ? (
                      <button
                        type="button"
                        className="mono"
                        onClick={() => checkIn(id)}
                      >
                        Check in
                      </button>
                    ) : (
                      <span className="mono mono-soft">Checked in</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: "1.25rem" }}>
              <p className="mono mono-soft">Feedback</p>
              {openFeedback.length === 0 && (
                <p className="muted">No open feedback.</p>
              )}
              {openFeedback.map((f) => (
                <div key={f.id} className="line-item">
                  <div>
                    <div className="mono mono-soft">
                      {state.tables[f.tableId].label}
                    </div>
                    <div>{f.text}</div>
                  </div>
                  <button
                    type="button"
                    className="mono"
                    onClick={() => clearFeedback(f.id)}
                  >
                    Clear
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TaskBoard />

      <section className="section">
        <p className="mono section-label">Service controls</p>
        <div className="grid-2">
          {TABLE_IDS.map((id) => {
            const t = state.tables[id];
            return (
              <div key={id} className="stack-gap">
                <p className="mono mono-soft">{t.label}</p>
                <div className="action-row">
                  <button
                    type="button"
                    className="text-action"
                    disabled={!t.checkedIn}
                    onClick={() => setPaused(id, !t.paused)}
                  >
                    {t.paused ? "Resume" : "Pause"}
                  </button>
                  <button
                    type="button"
                    className="text-action"
                    disabled={!t.checkedIn}
                    onClick={() => holdTable(id, !t.hold)}
                  >
                    {t.hold ? "Lift hold" : "Hold"}
                  </button>
                  <button
                    type="button"
                    className="text-action"
                    disabled={!t.checkedIn}
                    onClick={() => rushTable(id, !t.rush)}
                  >
                    {t.rush ? "Clear rush" : "Rush"}
                  </button>
                </div>
                <button
                  type="button"
                  className="text-action"
                  disabled={!t.checkedIn}
                  onClick={() => forceAdvance(id)}
                >
                  Force advance course
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <p className="mono section-label">Broadcast</p>
        <input
          className="field"
          placeholder="Note to server + cook…"
          value={compose}
          onChange={(e) => setCompose(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage({
                from: "manager",
                to: "all",
                text: compose,
                kind: "alert",
              });
              setCompose("");
            }
          }}
        />
        <button
          type="button"
          className="text-action"
          style={{ marginTop: "0.75rem" }}
          onClick={() => {
            sendMessage({
              from: "manager",
              to: "all",
              text: compose,
              kind: "alert",
            });
            setCompose("");
          }}
        >
          Send to all ends
        </button>
      </section>

      <MessagePanel role="manager" defaultTo="all" />
    </Shell>
  );
}
