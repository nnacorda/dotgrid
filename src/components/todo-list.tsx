"use client";

import { useState } from "react";
import { useTasks } from "@/components/task-context";
import { TaskDialog } from "@/components/task-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/storage";

type Filter = "all" | "active" | "completed";
type Priority = Task["priority"];

const priorityColors: Record<Priority, string> = {
  low: "bg-chart-2/20 text-chart-2 hover:bg-chart-2/30",
  medium: "bg-chart-1/20 text-chart-1 hover:bg-chart-1/30",
  high: "bg-destructive/20 text-destructive hover:bg-destructive/30",
};

const CARD_COLORS = [
  "#C4956A",
  "#D4847C",
  "#8BA89A",
  "#7BA7C4",
  "#B8A9D4",
  "#D4C47C",
];

const priorityWeight: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date().toISOString().split("T")[0];
  return dueDate < today;
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TodoList() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const [newText, setNewText] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const quickAdd = () => {
    const title = newText.trim();
    if (!title) return;
    addTask({
      title,
      priority: newPriority,
      status: "todo",
      completed: false,
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
    });
    setNewText("");
  };

  const toggleTodo = (task: Task) => {
    if (task.completed) {
      updateTask(task.id, { completed: false, status: "todo" });
    } else {
      updateTask(task.id, { completed: true, status: "done" });
    }
  };

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  // Sort: due date (soonest first, no-date last), then priority, then creation date
  const sorted = [...filtered].sort((a, b) => {
    // Due date first (soonest first, no date last)
    if (a.dueDate && b.dueDate) {
      if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    } else if (a.dueDate && !b.dueDate) {
      return -1;
    } else if (!a.dueDate && b.dueDate) {
      return 1;
    }
    // Then by priority (high first)
    const pw = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (pw !== 0) return pw;
    // Then by creation date (newest first)
    return b.createdAt.localeCompare(a.createdAt);
  });

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

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
        completed: data.completed || false,
        startDate: data.startDate,
        dueDate: data.dueDate,
        color: data.color || CARD_COLORS[0],
        isHabit: data.isHabit,
        recurrence: data.recurrence,
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h2 className="text-2xl font-light">To-Do List</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} total
        </p>
      </div>

      {/* Add todo */}
      <div className="border-b border-border px-8 py-4">
        <div className="flex gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && quickAdd()}
            placeholder="Add a new task..."
            className="bg-background"
          />
          {/* Priority selector */}
          <div className="flex gap-1">
            {(["low", "medium", "high"] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setNewPriority(p)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs capitalize transition-colors",
                  newPriority === p
                    ? priorityColors[p]
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Button onClick={quickAdd} size="sm" variant="outline">
            <Plus size={16} />
          </Button>
          <Button onClick={openAddDialog} size="sm" variant="outline">
            <MoreHorizontal size={16} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border-b border-border px-8 py-3">
        {(["all", "active", "completed"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-xs capitalize transition-colors",
              filter === f
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
            {f === "all" && ` (${tasks.length})`}
            {f === "active" && ` (${activeCount})`}
            {f === "completed" && ` (${completedCount})`}
          </button>
        ))}
      </div>

      {/* Todo items */}
      <div className="flex-1 overflow-auto px-8 py-4">
        {sorted.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {tasks.length === 0
              ? "No tasks yet. Add one above."
              : "No tasks match this filter."}
          </div>
        ) : (
          <div className="space-y-1">
            {sorted.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => openEditDialog(task)}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTodo(task)}
                  />
                </div>
                <div
                  className="h-3 w-1 rounded-full shrink-0"
                  style={{ backgroundColor: task.color }}
                />
                <span
                  className={cn(
                    "flex-1 text-sm transition-all",
                    task.completed && "text-muted-foreground line-through"
                  )}
                >
                  {task.title}
                </span>
                {task.dueDate && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      isOverdue(task.dueDate) && !task.completed
                        ? "border-destructive/50 text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatDueDate(task.dueDate)}
                  </Badge>
                )}
                {task.status === "in-progress" && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-chart-1/20 text-chart-1"
                  >
                    in progress
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={cn("text-[10px]", priorityColors[task.priority])}
                >
                  {task.priority}
                </Badge>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id);
                  }}
                  className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {tasks.length > 0 && (
        <div className="border-t border-border px-8 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount} of {tasks.length} completed
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultStatus="todo"
        onSave={handleDialogSave}
        onDelete={
          editingTask ? () => deleteTask(editingTask.id) : undefined
        }
      />
    </div>
  );
}
