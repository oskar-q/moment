import { useState } from "react";
import type { MessageTarget, Role, TableId } from "../domain/types";
import { useServiceStore } from "../store/useServiceStore";

type Props = {
  role: Role;
  defaultTo?: MessageTarget;
  tableId?: TableId;
};

export function MessagePanel({ role, defaultTo = "all", tableId }: Props) {
  const messages = useServiceStore((s) => s.messages);
  const tables = useServiceStore((s) => s.tables);
  const sendMessage = useServiceStore((s) => s.sendMessage);
  const markRead = useServiceStore((s) => s.markRead);
  const [text, setText] = useState("");
  const [to, setTo] = useState<MessageTarget>(defaultTo);

  const relevant = messages.filter(
    (m) => m.to === "all" || m.to === role || m.from === role,
  );
  const unread = messages.filter(
    (m) =>
      (m.to === "all" || m.to === role) &&
      m.from !== role &&
      !m.readBy.includes(role),
  );

  return (
    <section className="section">
      <div className="row">
        <p className="mono section-label">Messages</p>
        {unread.length > 0 && (
          <button type="button" className="mono" onClick={() => markRead(role)}>
            Mark read ({unread.length})
          </button>
        )}
      </div>

      <ul className="msg-list">
        {relevant.slice(0, 12).map((m) => {
          const isUnread =
            (m.to === "all" || m.to === role) &&
            m.from !== role &&
            !m.readBy.includes(role);
          return (
            <li key={m.id} className={`msg-item${isUnread ? " unread" : ""}`}>
              <div className="row">
                <span className="mono mono-soft">
                  {m.from} → {m.to}
                  {m.tableId ? ` · ${tables[m.tableId]?.label ?? m.tableId}` : ""}
                </span>
                <span className="mono mono-soft">{m.kind}</span>
              </div>
              <div>{m.text}</div>
            </li>
          );
        })}
        {relevant.length === 0 && (
          <li className="msg-item muted">No messages yet.</li>
        )}
      </ul>

      <div className="stack-gap" style={{ marginTop: "1rem" }}>
        <div className="meta-row">
          <span className="mono mono-soft">To</span>
          <select
            className="field"
            value={to}
            onChange={(e) => setTo(e.target.value as MessageTarget)}
          >
            <option value="all">All</option>
            {role !== "manager" && <option value="manager">Manager</option>}
            {role !== "server" && <option value="server">Server</option>}
            {role !== "cook" && <option value="cook">Cook</option>}
          </select>
        </div>
        <input
          className="field"
          placeholder="Write a note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage({ from: role, to, text, tableId });
              setText("");
            }
          }}
        />
        <button
          type="button"
          className="text-action"
          onClick={() => {
            sendMessage({ from: role, to, text, tableId });
            setText("");
          }}
        >
          Send
        </button>
      </div>
    </section>
  );
}
