import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Props = {
  title: string;
  wide?: boolean;
  children: ReactNode;
};

export function Shell({ title, wide, children }: Props) {
  return (
    <div className="app-shell">
      <header className="shell-header">
        <Link to="/" className="mark">
          Moment
        </Link>
        <h1 className="role-title">{title}</h1>
      </header>
      <main className={`shell-body${wide ? " wide" : ""}`}>{children}</main>
    </div>
  );
}
