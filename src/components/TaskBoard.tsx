import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  TASK_COLUMNS,
  TASK_COLUMN_LABEL,
  type Task,
  type TaskColumn,
} from "../domain/types";
import { useServiceStore } from "../store/useServiceStore";

function SortableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      className="kanban-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      {task.label}
    </div>
  );
}

function Column({
  column,
  tasks,
}: {
  column: TaskColumn;
  tasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column}` });

  return (
    <div
      ref={setNodeRef}
      className="kanban-col"
      style={{ background: isOver ? "rgba(26,24,20,0.04)" : undefined }}
    >
      <p className="mono mono-soft">{TASK_COLUMN_LABEL[column]}</p>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <SortableCard key={task.id} task={task} />
        ))}
      </SortableContext>
      {tasks.length === 0 && (
        <p className="mono faint" style={{ marginTop: "0.75rem" }}>
          —
        </p>
      )}
    </div>
  );
}

export function TaskBoard() {
  const tasks = useServiceStore((s) => s.tasks);
  const moveTask = useServiceStore((s) => s.moveTask);
  const reorderColumn = useServiceStore((s) => s.reorderColumn);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byCol = (col: TaskColumn) =>
    tasks.filter((t) => t.column === col).sort((a, b) => a.order - b.order);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = String(over.id);

    if (overId.startsWith("col-")) {
      const col = overId.replace("col-", "") as TaskColumn;
      moveTask(activeTask.id, col, byCol(col).length);
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (activeTask.column === overTask.column) {
      const list = byCol(activeTask.column);
      const oldIndex = list.findIndex((t) => t.id === activeTask.id);
      const newIndex = list.findIndex((t) => t.id === overTask.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      reorderColumn(
        activeTask.column,
        arrayMove(list, oldIndex, newIndex).map((t) => t.id),
      );
    } else {
      moveTask(activeTask.id, overTask.column, overTask.order);
    }
  };

  return (
    <section className="section">
      <p className="mono section-label">Task board</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className="kanban">
          {TASK_COLUMNS.map((col) => (
            <Column key={col} column={col} tasks={byCol(col)} />
          ))}
        </div>
      </DndContext>
    </section>
  );
}
