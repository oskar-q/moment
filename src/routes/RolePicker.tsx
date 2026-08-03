import { Link } from "react-router-dom";

const ROLES = [
  { to: "/control", name: "Control", hint: "Drive the demo" },
  { to: "/manager", name: "Manager", hint: "Back · Front · Board" },
  { to: "/server", name: "Server", hint: "Sequence · Floor" },
  { to: "/kitchen", name: "Cook", hint: "Current · Progress" },
] as const;

export function RolePicker() {
  return (
    <div className="home">
      <p className="mark">Moment</p>
      <h1>Service</h1>
      <p className="home-lead">Fine dining floor · kitchen · oversight</p>
      <ul className="role-links">
        {ROLES.map((r) => (
          <li key={r.to}>
            <Link to={r.to}>
              <span className="name">{r.name}</span>
              <span className="mono mono-soft">{r.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
