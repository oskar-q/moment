import type {
  AppState,
  CookProgress,
  Dish,
  Message,
  Role,
  TableId,
  Task,
  TaskColumn,
} from "./types";

export function dishesForTable(state: AppState, tableId: TableId): Dish[] {
  return state.dishes
    .filter((d) => d.tableId === tableId)
    .sort((a, b) => a.courseIndex - b.courseIndex);
}

export function activeDish(state: AppState, tableId: TableId): Dish | undefined {
  return dishesForTable(state, tableId).find(
    (d) => d.guestState === "active" || d.guestState === "eating",
  );
}

export function nextDish(state: AppState, tableId: TableId): Dish | undefined {
  const list = dishesForTable(state, tableId);
  const current = activeDish(state, tableId);
  if (!current) {
    return list.find((d) => d.guestState === "queued");
  }
  return list.find(
    (d) => d.courseIndex > current.courseIndex && d.guestState === "queued",
  );
}

export function cookFocusDish(state: AppState): Dish | undefined {
  const active = state.dishes.find(
    (d) =>
      state.tables[d.tableId].checkedIn &&
      (d.guestState === "active" || d.guestState === "eating") &&
      d.cookProgress !== "passed",
  );
  if (active) return active;

  return state.dishes.find(
    (d) =>
      state.tables[d.tableId].checkedIn &&
      d.guestState === "queued" &&
      d.cookProgress !== "idle" &&
      d.cookProgress !== "passed",
  );
}

export function cookNextDish(state: AppState, current?: Dish): Dish | undefined {
  if (!current) return undefined;
  return dishesForTable(state, current.tableId).find(
    (d) => d.courseIndex > current.courseIndex && d.guestState !== "cleared",
  );
}

export function messagesForRole(state: AppState, role: Role): Message[] {
  return state.messages.filter(
    (m) => m.to === "all" || m.to === role || m.from === role,
  );
}

export function unreadForRole(state: AppState, role: Role): Message[] {
  return state.messages.filter(
    (m) =>
      (m.to === "all" || m.to === role) &&
      m.from !== role &&
      !m.readBy.includes(role),
  );
}

export function openFeedback(state: AppState) {
  return state.feedback.filter((f) => !f.cleared);
}

export function tasksByColumn(state: AppState, column: TaskColumn): Task[] {
  return state.tasks
    .filter((t) => t.column === column)
    .sort((a, b) => a.order - b.order);
}

export function progressToColumn(progress: CookProgress): TaskColumn {
  switch (progress) {
    case "prep":
      return "prep";
    case "cooking":
    case "delay":
      return "cooking";
    case "ready":
    case "passed":
      return "done";
    default:
      return "new";
  }
}

export function tableStatusLine(state: AppState, tableId: TableId): string {
  const table = state.tables[tableId];
  if (!table.checkedIn) return "Awaiting check-in";
  if (table.paused) return "Paused";
  const dish = activeDish(state, tableId);
  if (!dish) return "Checked in — no active course";
  const guest =
    dish.guestState === "eating"
      ? "Eating"
      : dish.guestState === "active"
        ? "Active"
        : dish.guestState;
  return `${dish.name} · ${guest} · Kitchen ${dish.cookProgress}`;
}
