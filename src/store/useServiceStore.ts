import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  progressToColumn,
} from "../domain/selectors";
import type {
  AppState,
  CookProgress,
  MessageTarget,
  MessageKind,
  Role,
  TableId,
  TaskColumn,
} from "../domain/types";
import {
  buildScenario,
  DEMO_STEPS,
  type ScenarioId,
} from "./scenarios";
import { STORAGE_KEY, broadcastState } from "./sync";

function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function syncTaskColumn(
  state: AppState,
  dishId: string,
  progress: CookProgress,
): AppState["tasks"] {
  const column = progressToColumn(progress);
  return state.tasks.map((t) =>
    t.dishId === dishId ? { ...t, column } : t,
  );
}

type Actions = {
  loadScenario: (id: ScenarioId) => void;
  checkIn: (tableId: TableId) => void;
  setPaused: (tableId: TableId, paused: boolean) => void;
  setAllergy: (tableId: TableId, note: string) => void;
  setInstruction: (dishId: string, text: string) => void;
  setTimer: (dishId: string, minutes: number) => void;
  activateCourse: (dishId: string) => void;
  markEating: (dishId: string) => void;
  clearCourse: (dishId: string) => void;
  setCookProgress: (
    dishId: string,
    progress: CookProgress,
    delayNote?: string,
  ) => void;
  holdTable: (tableId: TableId, on: boolean) => void;
  rushTable: (tableId: TableId, on: boolean) => void;
  sendMessage: (input: {
    from: Role;
    to: MessageTarget;
    text: string;
    tableId?: TableId;
    kind?: MessageKind;
  }) => void;
  markRead: (role: Role) => void;
  addFeedback: (tableId: TableId, text: string) => void;
  clearFeedback: (id: string) => void;
  moveTask: (taskId: string, column: TaskColumn, order: number) => void;
  reorderColumn: (column: TaskColumn, orderedIds: string[]) => void;
  forceAdvance: (tableId: TableId) => void;
  runDemoAction: (stepIndex: number) => void;
  setDemoStep: (step: number) => void;
  hydrateFromStorage: () => void;
};

export type ServiceStore = AppState & Actions;

const initial = buildScenario("empty");

export const useServiceStore = create<ServiceStore>()(
  persist(
    (set, get) => ({
      ...initial,

      hydrateFromStorage: () => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          const state = parsed.state ?? parsed;
          if (state?.tables && state?.dishes) {
            set({
              tables: state.tables,
              dishes: state.dishes,
              tasks: state.tasks,
              feedback: state.feedback,
              messages: state.messages,
              nightLabel: state.nightLabel,
              demoStep: state.demoStep ?? 0,
            });
          }
        } catch {
          /* ignore */
        }
      },

      loadScenario: (id) => {
        set(buildScenario(id));
        queueMicrotask(broadcastState);
      },

      checkIn: (tableId) => {
        set((s) => {
          const tables = {
            ...s.tables,
            [tableId]: {
              ...s.tables[tableId],
              checkedIn: true,
              cookingStarted: true,
            },
          };
          const msg = {
            id: nid("msg"),
            at: Date.now(),
            tableId,
            from: "manager" as const,
            to: "all" as const,
            kind: "alert" as const,
            text: `${s.tables[tableId].label} checked in — start cooking.`,
            readBy: ["manager"] as Role[],
          };
          return { tables, messages: [msg, ...s.messages] };
        });
        queueMicrotask(broadcastState);
      },

      setPaused: (tableId, paused) => {
        set((s) => ({
          tables: {
            ...s.tables,
            [tableId]: { ...s.tables[tableId], paused },
          },
          messages: [
            {
              id: nid("msg"),
              at: Date.now(),
              tableId,
              from: "manager",
              to: "all",
              kind: "alert",
              text: paused
                ? `${s.tables[tableId].label} paused.`
                : `${s.tables[tableId].label} resumed.`,
              readBy: ["manager"],
            },
            ...s.messages,
          ],
        }));
        queueMicrotask(broadcastState);
      },

      setAllergy: (tableId, note) => {
        set((s) => ({
          tables: {
            ...s.tables,
            [tableId]: { ...s.tables[tableId], allergyNote: note },
          },
        }));
        queueMicrotask(broadcastState);
      },

      setInstruction: (dishId, text) => {
        set((s) => {
          const dish = s.dishes.find((d) => d.id === dishId);
          if (!dish) return s;
          return {
            dishes: s.dishes.map((d) =>
              d.id === dishId ? { ...d, instruction: text } : d,
            ),
            messages: text
              ? [
                  {
                    id: nid("msg"),
                    at: Date.now(),
                    tableId: dish.tableId,
                    from: "server" as const,
                    to: "cook" as const,
                    kind: "note" as const,
                    text: `${dish.name}: ${text}`,
                    readBy: ["server"] as Role[],
                  },
                  ...s.messages,
                ]
              : s.messages,
          };
        });
        queueMicrotask(broadcastState);
      },

      setTimer: (dishId, minutes) => {
        set((s) => ({
          dishes: s.dishes.map((d) =>
            d.id === dishId ? { ...d, timerMinutes: minutes } : d,
          ),
        }));
        queueMicrotask(broadcastState);
      },

      activateCourse: (dishId) => {
        set((s) => {
          const dish = s.dishes.find((d) => d.id === dishId);
          if (!dish) return s;
          if (s.tables[dish.tableId].paused) return s;

          const dishes = s.dishes.map((d) => {
            if (d.tableId !== dish.tableId) return d;
            if (d.id === dishId) {
              return {
                ...d,
                guestState: "active" as const,
                cookProgress:
                  d.cookProgress === "idle" || d.cookProgress === "passed"
                    ? ("prep" as const)
                    : d.cookProgress,
              };
            }
            if (d.guestState === "active" || d.guestState === "eating") {
              return { ...d, guestState: "cleared" as const };
            }
            return d;
          });

          const updated = dishes.find((d) => d.id === dishId)!;
          return {
            dishes,
            tasks: syncTaskColumn(s, dishId, updated.cookProgress),
            messages: [
              {
                id: nid("msg"),
                at: Date.now(),
                tableId: dish.tableId,
                from: "server" as const,
                to: "all" as const,
                kind: "alert" as const,
                text: `${s.tables[dish.tableId].label}: ${dish.name} fired.`,
                readBy: ["server"] as Role[],
              },
              ...s.messages,
            ],
          };
        });
        queueMicrotask(broadcastState);
      },

      markEating: (dishId) => {
        set((s) => {
          const dish = s.dishes.find((d) => d.id === dishId);
          if (!dish) return s;
          return {
            dishes: s.dishes.map((d) =>
              d.id === dishId
                ? {
                    ...d,
                    guestState: "eating" as const,
                    cookProgress:
                      d.cookProgress === "ready"
                        ? ("passed" as const)
                        : d.cookProgress,
                  }
                : d.tableId === dish.tableId &&
                    (d.guestState === "active" || d.guestState === "eating") &&
                    d.id !== dishId
                  ? { ...d, guestState: "cleared" as const }
                  : d,
            ),
            tasks: syncTaskColumn(
              s,
              dishId,
              dish.cookProgress === "ready" ? "passed" : dish.cookProgress,
            ),
            messages: [
              {
                id: nid("msg"),
                at: Date.now(),
                tableId: dish.tableId,
                from: "server" as const,
                to: "all" as const,
                kind: "note" as const,
                text: `${s.tables[dish.tableId].label} eating ${dish.name}.`,
                readBy: ["server"] as Role[],
              },
              ...s.messages,
            ],
          };
        });
        queueMicrotask(broadcastState);
      },

      clearCourse: (dishId) => {
        set((s) => {
          const dish = s.dishes.find((d) => d.id === dishId);
          if (!dish) return s;
          return {
            dishes: s.dishes.map((d) =>
              d.id === dishId
                ? {
                    ...d,
                    guestState: "cleared" as const,
                    cookProgress: "passed" as const,
                  }
                : d,
            ),
            tasks: syncTaskColumn(s, dishId, "passed"),
            messages: [
              {
                id: nid("msg"),
                at: Date.now(),
                tableId: dish.tableId,
                from: "server" as const,
                to: "all" as const,
                kind: "note" as const,
                text: `${dish.name} cleared on ${s.tables[dish.tableId].label}.`,
                readBy: ["server"] as Role[],
              },
              ...s.messages,
            ],
          };
        });
        queueMicrotask(broadcastState);
      },

      setCookProgress: (dishId, progress, delayNote) => {
        set((s) => {
          const dish = s.dishes.find((d) => d.id === dishId);
          if (!dish) return s;
          if (s.tables[dish.tableId].paused && progress !== "delay") return s;

          const kind: MessageKind =
            progress === "ready"
              ? "ready"
              : progress === "delay"
                ? "delay"
                : "progress";

          return {
            dishes: s.dishes.map((d) =>
              d.id === dishId
                ? {
                    ...d,
                    cookProgress: progress,
                    delayNote:
                      progress === "delay"
                        ? delayNote || d.delayNote || "+5 min"
                        : undefined,
                  }
                : d,
            ),
            tasks: syncTaskColumn(s, dishId, progress),
            messages: [
              {
                id: nid("msg"),
                at: Date.now(),
                tableId: dish.tableId,
                from: "cook" as const,
                to: "all" as const,
                kind,
                text:
                  progress === "delay"
                    ? `${dish.name} delayed ${delayNote || "+5 min"}.`
                    : `${dish.name} → ${progress}.`,
                readBy: ["cook"] as Role[],
              },
              ...s.messages,
            ],
          };
        });
        queueMicrotask(broadcastState);
      },

      holdTable: (tableId, on) => {
        set((s) => ({
          tables: {
            ...s.tables,
            [tableId]: { ...s.tables[tableId], hold: on, rush: on ? false : s.tables[tableId].rush },
          },
          messages: [
            {
              id: nid("msg"),
              at: Date.now(),
              tableId,
              from: "server",
              to: "all",
              kind: "hold",
              text: on
                ? `HOLD ${s.tables[tableId].label}.`
                : `Hold lifted — ${s.tables[tableId].label}.`,
              readBy: ["server"],
            },
            ...s.messages,
          ],
        }));
        queueMicrotask(broadcastState);
      },

      rushTable: (tableId, on) => {
        set((s) => ({
          tables: {
            ...s.tables,
            [tableId]: {
              ...s.tables[tableId],
              rush: on,
              hold: on ? false : s.tables[tableId].hold,
            },
          },
          messages: [
            {
              id: nid("msg"),
              at: Date.now(),
              tableId,
              from: "server",
              to: "all",
              kind: "rush",
              text: on
                ? `RUSH ${s.tables[tableId].label}.`
                : `Rush cleared — ${s.tables[tableId].label}.`,
              readBy: ["server"],
            },
            ...s.messages,
          ],
        }));
        queueMicrotask(broadcastState);
      },

      sendMessage: ({ from, to, text, tableId, kind = "note" }) => {
        if (!text.trim()) return;
        set((s) => ({
          messages: [
            {
              id: nid("msg"),
              at: Date.now(),
              tableId,
              from,
              to,
              kind,
              text: text.trim(),
              readBy: [from],
            },
            ...s.messages,
          ],
        }));
        queueMicrotask(broadcastState);
      },

      markRead: (role) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            (m.to === "all" || m.to === role) && !m.readBy.includes(role)
              ? { ...m, readBy: [...m.readBy, role] }
              : m,
          ),
        }));
        queueMicrotask(broadcastState);
      },

      addFeedback: (tableId, text) => {
        if (!text.trim()) return;
        set((s) => ({
          feedback: [
            {
              id: nid("fb"),
              tableId,
              at: Date.now(),
              text: text.trim(),
              cleared: false,
            },
            ...s.feedback,
          ],
          messages: [
            {
              id: nid("msg"),
              at: Date.now(),
              tableId,
              from: "server",
              to: "manager",
              kind: "note",
              text: `Feedback: ${text.trim()}`,
              readBy: ["server"],
            },
            ...s.messages,
          ],
        }));
        queueMicrotask(broadcastState);
      },

      clearFeedback: (id) => {
        set((s) => ({
          feedback: s.feedback.map((f) =>
            f.id === id ? { ...f, cleared: true } : f,
          ),
        }));
        queueMicrotask(broadcastState);
      },

      moveTask: (taskId, column, order) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, column, order } : t,
          ),
        }));
        queueMicrotask(broadcastState);
      },

      reorderColumn: (column, orderedIds) => {
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.column !== column) return t;
            const order = orderedIds.indexOf(t.id);
            return order >= 0 ? { ...t, order } : t;
          }),
        }));
        queueMicrotask(broadcastState);
      },

      forceAdvance: (tableId) => {
        const s = get();
        const list = s.dishes
          .filter((d) => d.tableId === tableId)
          .sort((a, b) => a.courseIndex - b.courseIndex);
        const current = list.find(
          (d) => d.guestState === "active" || d.guestState === "eating",
        );
        if (current) {
          get().clearCourse(current.id);
        }
        const next = list.find(
          (d) =>
            d.guestState === "queued" &&
            (!current || d.courseIndex > current.courseIndex),
        );
        if (next) get().activateCourse(next.id);
      },

      setDemoStep: (step) => {
        set({ demoStep: step });
        queueMicrotask(broadcastState);
      },

      runDemoAction: (stepIndex) => {
        // Replay from empty through the selected beat so Prev/Next stay coherent.
        get().loadScenario("empty");

        for (let i = 0; i <= stepIndex; i++) {
          const step = DEMO_STEPS[i];
          if (!step) continue;

          switch (step.action) {
            case "checkInT1": {
              get().checkIn("t1");
              break;
            }
            case "activateDrink": {
              const drink = get().dishes.find(
                (d) => d.tableId === "t1" && d.name === "Drink",
              );
              if (drink) {
                get().setInstruction(drink.id, "Champagne — no ice");
                get().setTimer(drink.id, 5);
                get().activateCourse(drink.id);
              }
              break;
            }
            case "cookReady": {
              const dish = get().dishes.find(
                (d) =>
                  d.tableId === "t1" &&
                  (d.guestState === "active" || d.guestState === "eating"),
              );
              if (dish) {
                get().setCookProgress(dish.id, "cooking");
                get().setCookProgress(dish.id, "ready");
              }
              break;
            }
            case "markEating": {
              const dish = get().dishes.find(
                (d) => d.tableId === "t1" && d.guestState === "active",
              );
              if (dish) get().markEating(dish.id);
              break;
            }
            case "feedback": {
              get().addFeedback("t1", "Guests happy — keep this pace.");
              break;
            }
            case "checkInT2": {
              get().checkIn("t2");
              break;
            }
            default:
              break;
          }
        }

        set({ demoStep: stepIndex });
        queueMicrotask(broadcastState);
      },
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
