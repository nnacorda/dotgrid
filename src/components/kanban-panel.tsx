"use client";

import { useState, useRef, useEffect } from "react";
import { useTasks } from "@/components/task-context";
import { TaskDialog } from "@/components/task-dialog";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { eventBus, EVENTS } from "@/lib/events";
import type { Task } from "@/lib/storage";

type Status = Task["status"];

const SECTIONS: { id: Status; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const priorityColors: Record<Task["priority"], string> = {
  low: "bg-chart-2/20 text-chart-2",
  medium: "bg-chart-1/20 text-chart-1",
  high: "bg-destructive/20 text-destructive",
};

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date().toISOString().split("T")[0];
  return dueDate < today;
}

export function KanbanPanel() {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    reorderColumn,
    getColumnOrder,
    moveTask,
  } = useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [quickAddText, setQuickAddText] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return eventBus.on(EVENTS.NEW_TASK, () => {
      quickAddRef.current?.focus();
    });
  }, []);

  const handleQuickAdd = () => {
    const title = quickAddText.trim();
    if (!title) return;
    addTask({
      title,
      priority: "medium",
      status: "todo",
      completed: false,
      color: "#7BA7C4",
    });
    setQuickAddText("");
  };

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getColumnTasks = (status: Status): Task[] => {
    const order = getColumnOrder(status);
    const taskMap = new Map(
      tasks.filter((t) => t.status === status).map((t) => [t.id, t])
    );
    return order.map((id) => taskMap.get(id)).filter(Boolean) as Task[];
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const srcStatus = source.droppableId as Status;
    const destStatus = destination.droppableId as Status;

    if (srcStatus === destStatus) {
      const order = [...getColumnOrder(srcStatus)];
      const [moved] = order.splice(source.index, 1);
      order.splice(destination.index, 0, moved);
      reorderColumn(srcStatus, order);
    } else {
      const srcOrder = [...getColumnOrder(srcStatus)];
      const destOrder = [...getColumnOrder(destStatus)];
      srcOrder.splice(source.index, 1);
      destOrder.splice(destination.index, 0, draggableId);
      moveTask(draggableId, srcStatus, destStatus, srcOrder, destOrder);
    }
  };

  const toggleComplete = (task: Task) => {
    if (task.status === "done") {
      // Move back to todo
      const srcOrder = [...getColumnOrder("done")].filter((id) => id !== task.id);
      const destOrder = [task.id, ...getColumnOrder("todo")];
      moveTask(task.id, "done", "todo", srcOrder, destOrder);
      updateTask(task.id, { completed: false });
    } else {
      // Move to done
      const srcOrder = [...getColumnOrder(task.status)].filter((id) => id !== task.id);
      const destOrder = [...getColumnOrder("done"), task.id];
      moveTask(task.id, task.status, "done", srcOrder, destOrder);
      updateTask(task.id, { completed: true });
    }
  };

  const openAddDialog = () => {
    setEditingTask(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleDialogSave = (data: Partial<Task>) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask({
        title: data.title || "",
        description: data.description,
        priority: data.priority || "medium",
        status: data.status || "todo",
        completed: (data.status || "todo") === "done",
        startDate: data.startDate,
        dueDate: data.dueDate,
        color: data.color || "#7BA7C4",
        isHabit: data.isHabit,
        recurrence: data.recurrence,
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Quick-add input */}
      <div className="shrink-0 px-3 py-2 flex gap-1.5">
        <input
          ref={quickAddRef}
          type="text"
          value={quickAddText}
          onChange={(e) => setQuickAddText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleQuickAdd();
          }}
          placeholder="Add a task..."
          className="flex-1 min-w-0 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          onClick={openAddDialog}
          size="sm"
          variant="outline"
          className="shrink-0 px-2"
          title="New task with details"
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Stacked sections */}
      <div className="flex-1 overflow-y-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          {SECTIONS.map((section) => {
            const sectionTasks = getColumnTasks(section.id);
            const isCollapsed = collapsedSections[section.id] ?? false;

            return (
              <div key={section.id} className="border-b border-border last:border-b-0">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight size={14} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={14} className="text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {section.title}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {sectionTasks.length}
                  </span>
                </button>

                {/* Cards */}
                {!isCollapsed && (
                  <Droppable droppableId={section.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "space-y-1.5 px-2 pb-2 transition-colors min-h-[8px]",
                          snapshot.isDraggingOver && "bg-accent/30"
                        )}
                      >
                        {sectionTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onDoubleClick={() => toggleComplete(task)}
                                className={cn(
                                  "group rounded-md border border-border bg-card p-2.5 shadow-sm transition-shadow cursor-grab active:cursor-grabbing",
                                  snapshot.isDragging && "shadow-lg"
                                )}
                              >
                                <div className="flex items-start gap-1.5">
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className="h-0.5 w-6 rounded-full mb-1.5"
                                      style={{ backgroundColor: task.color }}
                                    />
                                    <p
                                      className={cn(
                                        "text-sm leading-snug",
                                        task.status === "done" &&
                                          "line-through text-muted-foreground"
                                      )}
                                    >
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p
                                        className={cn(
                                          "mt-0.5 text-xs text-muted-foreground line-clamp-1",
                                          task.status === "done" &&
                                            "text-muted-foreground/60"
                                        )}
                                      >
                                        {task.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          "text-[10px]",
                                          priorityColors[task.priority]
                                        )}
                                      >
                                        {task.priority}
                                      </Badge>
                                      {task.dueDate && (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-[10px]",
                                            isOverdue(task.dueDate) &&
                                              task.status !== "done"
                                              ? "border-destructive/50 text-destructive"
                                              : "text-muted-foreground"
                                          )}
                                        >
                                          {formatDueDate(task.dueDate)}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => openEditDialog(task)}
                                    className="text-muted-foreground/0 group-hover:text-muted-foreground"
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </DragDropContext>
      </div>

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        onSave={handleDialogSave}
        onDelete={
          editingTask ? () => deleteTask(editingTask.id) : undefined
        }
      />
    </div>
  );
}
