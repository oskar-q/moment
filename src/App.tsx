import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSync } from "./hooks/useSync";
import { ControlView } from "./routes/ControlView";
import { CookView } from "./routes/CookView";
import { ManagerView } from "./routes/ManagerView";
import { RolePicker } from "./routes/RolePicker";
import { ServerView } from "./routes/ServerView";

export default function App() {
  useSync();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<RolePicker />} />
        <Route path="/control" element={<ControlView />} />
        <Route path="/manager" element={<ManagerView />} />
        <Route path="/server" element={<ServerView />} />
        <Route path="/kitchen" element={<CookView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
