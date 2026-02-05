"use client";

import { useState } from "react";
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
import { Plus, MoreHorizontal, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/storage";

type Status = Task["status"];

const COLUMNS: { id: Status; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const CARD_COLORS = [
  "#C4956A", "#D4847C", "#8BA89A", "#7BA7C4", "#B8A9D4", "#D4C47C",
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

export function KanbanBoard() {
  const { tasks, addTask, updateTask, deleteTask, reorderColumn, getColumnOrder, moveTask } =
    useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const getColumnTasks = (status: Status): Task[] => {
    const order = getColumnOrder(status);
    const taskMap = new Map(tasks.filter((t) => t.status === status).map((t) => [t.id, t]));
    return order.map((id) => taskMap.get(id)).filter(Boolean) as Task[];
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const srcStatus = source.droppableId as Status;
    const destStatus = destination.droppableId as Status;

    if (srcStatus === destStatus) {
      // Reorder within same column
      const order = [...getColumnOrder(srcStatus)];
      const [moved] = order.splice(source.index, 1);
      order.splice(destination.index, 0, moved);
      reorderColumn(srcStatus, order);
    } else {
      // Move between columns — atomic status + order update
      const srcOrder = [...getColumnOrder(srcStatus)];
      const destOrder = [...getColumnOrder(destStatus)];

      srcOrder.splice(source.index, 1);
      destOrder.splice(destination.index, 0, draggableId);

      moveTask(draggableId, srcStatus, destStatus, srcOrder, destOrder);
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
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-light">Tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"} total
            </p>
          </div>
          <Button onClick={openAddDialog} size="sm" variant="outline">
            <Plus size={16} /> New Task
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full">
            {COLUMNS.map((column) => {
              const columnTasks = getColumnTasks(column.id);
              return (
                <div
                  key={column.id}
                  className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50"
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <h3 className="text-sm font-medium">{column.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 space-y-2 px-2 pb-2 transition-colors min-h-[40px]",
                          snapshot.isDraggingOver && "bg-accent/50 rounded-md"
                        )}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "group rounded-md border border-border bg-card p-3 shadow-sm transition-shadow",
                                  snapshot.isDragging && "shadow-lg"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-0.5 text-muted-foreground/40"
                                  >
                                    <GripVertical size={14} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className="h-1 w-8 rounded-full mb-2"
                                      style={{ backgroundColor: task.color }}
                                    />
                                    <p className={cn("text-sm", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</p>
                                    {task.description && (
                                      <p className={cn("mt-1 text-xs text-muted-foreground line-clamp-2", task.status === "done" && "text-muted-foreground/60")}>
                                        {task.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
                </div>
              );
            })}
          </div>
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
