export type TableId = "t1" | "t2";
export type Role = "manager" | "server" | "cook";
export type MessageTarget = Role | "all";

export type CookProgress =
  | "idle"
  | "prep"
  | "cooking"
  | "ready"
  | "passed"
  | "delay";

export type GuestState = "queued" | "active" | "eating" | "cleared";

export type TaskColumn = "new" | "prep" | "cooking" | "done";

export type MessageKind =
  | "note"
  | "hold"
  | "rush"
  | "ready"
  | "delay"
  | "alert"
  | "progress"
  | "system";

export type Dish = {
  id: string;
  tableId: TableId;
  name: string;
  courseIndex: number;
  guestState: GuestState;
  instruction: string;
  timerMinutes?: number;
  cookProgress: CookProgress;
  delayNote?: string;
};

export type Table = {
  label: string;
  bookingBrief: string;
  checkedIn: boolean;
  cookingStarted: boolean;
  paused: boolean;
  allergyNote: string;
  hold: boolean;
  rush: boolean;
};

export type Task = {
  id: string;
  tableId: TableId;
  dishId: string;
  label: string;
  column: TaskColumn;
  order: number;
};

export type Feedback = {
  id: string;
  tableId: TableId;
  at: number;
  text: string;
  cleared: boolean;
};

export type Message = {
  id: string;
  at: number;
  tableId?: TableId;
  from: Role | "system";
  to: MessageTarget;
  kind: MessageKind;
  text: string;
  readBy: Role[];
};

export type AppState = {
  tables: Record<TableId, Table>;
  dishes: Dish[];
  tasks: Task[];
  feedback: Feedback[];
  messages: Message[];
  nightLabel: string;
  demoStep: number;
};

export const TABLE_IDS: TableId[] = ["t1", "t2"];

export const COURSE_NAMES = [
  "Drink",
  "Starter",
  "Fish",
  "Steak",
  "Dessert",
] as const;

export const COOK_PROGRESS_LABEL: Record<CookProgress, string> = {
  idle: "Idle",
  prep: "Prep",
  cooking: "Cooking",
  ready: "Ready",
  passed: "Passed",
  delay: "Delay",
};

export const TASK_COLUMNS: TaskColumn[] = ["new", "prep", "cooking", "done"];

export const TASK_COLUMN_LABEL: Record<TaskColumn, string> = {
  new: "New",
  prep: "Prep",
  cooking: "Cooking",
  done: "Done",
};
