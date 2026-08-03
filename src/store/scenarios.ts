import type { AppState, Dish, Table, Task } from "../domain/types";
import { COURSE_NAMES } from "../domain/types";

function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeTable(
  label: string,
  brief: string,
  overrides: Partial<Table> = {},
): Table {
  return {
    label,
    bookingBrief: brief,
    checkedIn: false,
    cookingStarted: false,
    paused: false,
    allergyNote: "",
    hold: false,
    rush: false,
    ...overrides,
  };
}

function makeCourses(tableId: "t1" | "t2", startIndex = 0): Dish[] {
  return COURSE_NAMES.map((name, courseIndex) => ({
    id: nid(`${tableId}_${courseIndex}`),
    tableId,
    name,
    courseIndex,
    guestState: "queued" as const,
    instruction: "",
    timerMinutes: courseIndex === 0 ? 8 : 10,
    cookProgress: "idle" as const,
  })).map((d, i) =>
    i < startIndex
      ? { ...d, guestState: "cleared" as const, cookProgress: "passed" as const }
      : d,
  );
}

function tasksFromDishes(dishes: Dish[]): Task[] {
  return dishes
    .filter((d) => d.guestState !== "cleared")
    .map((d, order) => ({
      id: nid("task"),
      tableId: d.tableId,
      dishId: d.id,
      label: `${d.tableId === "t1" ? "I" : "II"} · ${d.name}`,
      column:
        d.cookProgress === "prep"
          ? ("prep" as const)
          : d.cookProgress === "cooking" || d.cookProgress === "delay"
            ? ("cooking" as const)
            : d.cookProgress === "ready" || d.cookProgress === "passed"
              ? ("done" as const)
              : ("new" as const),
      order,
    }));
}

export type ScenarioId = "empty" | "midService" | "rushT2";

export const SCENARIO_META: { id: ScenarioId; label: string; blurb: string }[] =
  [
    {
      id: "empty",
      label: "Empty floor",
      blurb: "Both tables dark — start with check-in.",
    },
    {
      id: "midService",
      label: "Mid-service",
      blurb: "Both seated. T1 on Fish, T2 on Starter.",
    },
    {
      id: "rushT2",
      label: "Rush on II",
      blurb: "Customer II rushed; Steak cooking with delay risk.",
    },
  ];

export function buildScenario(id: ScenarioId): AppState {
  if (id === "empty") {
    const dishes = [...makeCourses("t1"), ...makeCourses("t2")];
    return {
      nightLabel: "Service — demo night",
      demoStep: -1,
      tables: {
        t1: makeTable("Customer I", "2 covers · 19:00 · window"),
        t2: makeTable("Customer II", "2 covers · 19:30 · garden"),
      },
      dishes,
      tasks: tasksFromDishes(dishes),
      feedback: [],
      messages: [
        {
          id: nid("msg"),
          at: Date.now(),
          from: "system",
          to: "all",
          kind: "system",
          text: "Night reset. Open Manager, Server, and Cook tabs — drive from Control.",
          readBy: [],
        },
      ],
    };
  }

  if (id === "midService") {
    const t1 = makeCourses("t1", 2);
    const t2 = makeCourses("t2", 1);
    // T1 Fish active, cooking
    t1[2] = {
      ...t1[2],
      guestState: "active",
      cookProgress: "cooking",
      instruction: "No citrus on fish · gentle plate",
      timerMinutes: 12,
    };
    // T2 Starter active, prep
    t2[1] = {
      ...t2[1],
      guestState: "eating",
      cookProgress: "passed",
      instruction: "Share starter",
    };
    t2[2] = {
      ...t2[2],
      guestState: "queued",
      cookProgress: "prep",
      instruction: "Medium rare hold",
    };

    const dishes = [...t1, ...t2];
    return {
      nightLabel: "Service — mid-service",
      demoStep: 3,
      tables: {
        t1: makeTable("Customer I", "2 covers · 19:00 · window", {
          checkedIn: true,
          cookingStarted: true,
          allergyNote: "Shellfish allergy",
        }),
        t2: makeTable("Customer II", "2 covers · 19:30 · garden", {
          checkedIn: true,
          cookingStarted: true,
        }),
      },
      dishes,
      tasks: tasksFromDishes(dishes),
      feedback: [
        {
          id: nid("fb"),
          tableId: "t1",
          at: Date.now() - 60000,
          text: "Loving the pacing — ask kitchen to keep tempo.",
          cleared: false,
        },
      ],
      messages: [
        {
          id: nid("msg"),
          at: Date.now() - 30000,
          tableId: "t1",
          from: "server",
          to: "cook",
          kind: "note",
          text: "Fish: no citrus, gentle plate.",
          readBy: ["server"],
        },
      ],
    };
  }

  // rushT2
  const t1 = makeCourses("t1", 3);
  const t2 = makeCourses("t2", 2);
  t1[3] = {
    ...t1[3],
    guestState: "eating",
    cookProgress: "passed",
    instruction: "Rest 2 min",
  };
  t2[2] = {
    ...t2[2],
    guestState: "active",
    cookProgress: "cooking",
    instruction: "Fire now — guests leaving by 21:00",
    timerMinutes: 8,
    delayNote: "",
  };
  t2[3] = {
    ...t2[3],
    guestState: "queued",
    cookProgress: "idle",
    instruction: "Blue rare possible",
  };

  const dishes = [...t1, ...t2];
  return {
    nightLabel: "Service — rush on II",
    demoStep: 5,
    tables: {
      t1: makeTable("Customer I", "2 covers · 19:00 · window", {
        checkedIn: true,
        cookingStarted: true,
      }),
      t2: makeTable("Customer II", "2 covers · 19:30 · garden", {
        checkedIn: true,
        cookingStarted: true,
        rush: true,
        allergyNote: "Gluten-aware",
      }),
    },
    dishes,
    tasks: tasksFromDishes(dishes),
    feedback: [],
    messages: [
      {
        id: nid("msg"),
        at: Date.now() - 10000,
        tableId: "t2",
        from: "manager",
        to: "all",
        kind: "rush",
        text: "Rush Customer II — taxi at 21:00.",
        readBy: ["manager"],
      },
    ],
  };
}

/** Guided demo beats for Control autoplay / step buttons */
export const DEMO_STEPS: {
  title: string;
  detail: string;
  emphasis: "manager" | "server" | "cook" | "all";
  action: "checkInT1" | "activateDrink" | "cookReady" | "markEating" | "feedback" | "checkInT2" | "none";
}[] = [
  {
    title: "1 · Empty floor",
    detail: "Both bookings waiting. Manager checks Customer I in.",
    emphasis: "manager",
    action: "checkInT1",
  },
  {
    title: "2 · Server fires Drink",
    detail: "Server activates Drink, sets instruction + timer → Cook.",
    emphasis: "server",
    action: "activateDrink",
  },
  {
    title: "3 · Cook marks Ready",
    detail: "Cook progresses Prep → Cooking → Ready. Server + Manager see it.",
    emphasis: "cook",
    action: "cookReady",
  },
  {
    title: "4 · Guest eating",
    detail: "Server marks Eating, then can clear and advance.",
    emphasis: "server",
    action: "markEating",
  },
  {
    title: "5 · Feedback to Manager",
    detail: "Server sends floor feedback; Manager Front lights up.",
    emphasis: "manager",
    action: "feedback",
  },
  {
    title: "6 · Second table",
    detail: "Check in Customer II — both tables live on Manager board.",
    emphasis: "all",
    action: "checkInT2",
  },
];
