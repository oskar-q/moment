import { Shell } from "../components/Shell";
import { DEMO_STEPS, SCENARIO_META } from "../store/scenarios";
import { useServiceStore } from "../store/useServiceStore";

export function ControlView() {
  const nightLabel = useServiceStore((s) => s.nightLabel);
  const demoStep = useServiceStore((s) => s.demoStep);
  const loadScenario = useServiceStore((s) => s.loadScenario);
  const runDemoAction = useServiceStore((s) => s.runDemoAction);
  const setDemoStep = useServiceStore((s) => s.setDemoStep);
  const tables = useServiceStore((s) => s.tables);

  const openRole = (path: string) => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}#${path}`;
    window.open(url, `_moment_${path}`, "noopener,noreferrer");
  };

  return (
    <Shell title="Control" wide>
      <section className="section">
        <p className="mono section-label">Demo night</p>
        <p style={{ margin: "0 0 0.35rem", fontSize: "1.5rem" }}>{nightLabel}</p>
        <p className="mono mono-soft">
          {tables.t1.checkedIn ? "I seated" : "I waiting"} ·{" "}
          {tables.t2.checkedIn ? "II seated" : "II waiting"}
        </p>
      </section>

      <section className="section">
        <p className="mono section-label">Open ends</p>
        <div className="action-row">
          <button type="button" className="text-action" onClick={() => openRole("/manager")}>
            Manager
          </button>
          <button type="button" className="text-action" onClick={() => openRole("/server")}>
            Server
          </button>
          <button type="button" className="text-action" onClick={() => openRole("/kitchen")}>
            Cook
          </button>
        </div>
        <p className="mono mono-soft" style={{ marginTop: "0.85rem" }}>
          Tip: keep Control here, roles in separate windows — state syncs live.
        </p>
      </section>

      <section className="section">
        <p className="mono section-label">Guided flow</p>
        <p className="muted" style={{ marginTop: 0 }}>
          Step through a clean story. Each beat highlights one end.
        </p>
        <div className="stack-gap">
          {DEMO_STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`demo-step${demoStep === i ? " current" : ""}`}
            >
              <div className="row">
                <strong style={{ fontWeight: 500 }}>{step.title}</strong>
                <span className="mono emphasis-tag">{step.emphasis}</span>
              </div>
              <p className="muted" style={{ margin: "0.35rem 0 0.75rem" }}>
                {step.detail}
              </p>
              <button
                type="button"
                className={`text-action${demoStep === i ? " emphasis" : ""}`}
                onClick={() => {
                  runDemoAction(i);
                  setDemoStep(i);
                }}
              >
                {demoStep === i ? "Replay beat" : "Run beat"}
              </button>
            </div>
          ))}
        </div>
        <div className="action-row" style={{ marginTop: "1.25rem" }}>
          <button
            type="button"
            className="text-action"
            disabled={demoStep <= 0}
            onClick={() => {
              const next = Math.max(0, demoStep - 1);
              runDemoAction(next);
            }}
          >
            Prev
          </button>
          <button
            type="button"
            className="text-action emphasis"
            disabled={demoStep >= DEMO_STEPS.length - 1}
            onClick={() => {
              const next = Math.min(
                DEMO_STEPS.length - 1,
                demoStep < 0 ? 0 : demoStep + 1,
              );
              runDemoAction(next);
            }}
          >
            Next beat
          </button>
        </div>
      </section>

      <section className="section">
        <p className="mono section-label">Presets</p>
        <ul className="line-list">
          {SCENARIO_META.map((s) => (
            <li key={s.id} className="line-item" style={{ display: "block" }}>
              <div className="row">
                <span className="dish-name" style={{ fontSize: "1.25rem" }}>
                  {s.label}
                </span>
                <button
                  type="button"
                  className="mono"
                  onClick={() => loadScenario(s.id)}
                >
                  Load
                </button>
              </div>
              <p className="mono mono-soft" style={{ margin: "0.35rem 0 0" }}>
                {s.blurb}
              </p>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="text-action"
          style={{ marginTop: "1rem" }}
          onClick={() => loadScenario("empty")}
        >
          Reset night
        </button>
      </section>
    </Shell>
  );
}
