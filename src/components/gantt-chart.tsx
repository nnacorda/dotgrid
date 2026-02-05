"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getGanttData,
  setGanttData,
  generateId,
  type GanttData,
  type GanttTask,
} from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TASK_COLORS = [
  "#C4956A",
  "#D4847C",
  "#8BA89A",
  "#7BA7C4",
  "#B8A9D4",
  "#D4C47C",
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function GanttChart() {
  const [data, setData] = useState<GanttData>({ tasks: [] });
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({
    name: "",
    startDate: fmt(new Date()),
    endDate: fmt(addDays(new Date(), 7)),
    color: TASK_COLORS[0],
  });

  useEffect(() => {
    setData(getGanttData());
    setLoaded(true);
  }, []);

  const save = useCallback((d: GanttData) => {
    setData(d);
    setGanttData(d);
  }, []);

  const addTask = () => {
    const name = newTask.name.trim();
    if (!name) return;
    const task: GanttTask = {
      id: generateId(),
      name,
      startDate: newTask.startDate,
      endDate: newTask.endDate,
      color: newTask.color,
    };
    save({ tasks: [...data.tasks, task] });
    setNewTask({
      name: "",
      startDate: fmt(new Date()),
      endDate: fmt(addDays(new Date(), 7)),
      color: TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)],
    });
    setShowAdd(false);
  };

  const deleteTask = (id: string) => {
    save({ tasks: data.tasks.filter((t) => t.id !== id) });
  };

  // Calculate timeline bounds
  const { timelineStart, timelineDays, columnDates } = useMemo(() => {
    if (data.tasks.length === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = addDays(today, -3);
      return {
        timelineStart: start,
        timelineDays: 30,
        columnDates: Array.from({ length: 30 }, (_, i) => addDays(start, i)),
      };
    }

    const allStarts = data.tasks.map((t) => parseDate(t.startDate));
    const allEnds = data.tasks.map((t) => parseDate(t.endDate));
    const minDate = new Date(Math.min(...allStarts.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allEnds.map((d) => d.getTime())));

    const start = addDays(minDate, -3);
    const days = Math.max(diffDays(start, maxDate) + 5, 30);
    return {
      timelineStart: start,
      timelineDays: days,
      columnDates: Array.from({ length: days }, (_, i) => addDays(start, i)),
    };
  }, [data.tasks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = diffDays(timelineStart, today);

  const COL_WIDTH = 36;

  if (!loaded) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h2 className="text-2xl font-light">Gantt Chart</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.tasks.length} task{data.tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm" variant="outline">
          <Plus size={16} className="mr-1" /> Add Task
        </Button>
      </div>

      {/* Chart */}
      <div className="flex-1 overflow-auto">
        {data.tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No tasks yet. Add one to get started.
          </div>
        ) : (
          <div className="min-w-max">
            {/* Date header */}
            <div className="sticky top-0 z-10 flex border-b border-border bg-background">
              <div className="w-52 shrink-0 border-r border-border px-4 py-2 text-xs font-medium text-muted-foreground">
                Task
              </div>
              <div className="flex">
                {columnDates.map((d, i) => {
                  const isToday = fmt(d) === fmt(today);
                  const isMonday = d.getDay() === 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col items-center justify-center border-r border-border/30 py-1",
                        isToday && "bg-primary/5",
                        isMonday && "border-l border-border"
                      )}
                      style={{ width: COL_WIDTH }}
                    >
                      <span className="text-[9px] text-muted-foreground">
                        {d.toLocaleDateString("en-US", { weekday: "narrow" })}
                      </span>
                      <span
                        className={cn(
                          "text-[10px]",
                          isToday
                            ? "font-bold text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task rows */}
            {data.tasks.map((task) => {
              const start = diffDays(timelineStart, parseDate(task.startDate));
              const duration = diffDays(
                parseDate(task.startDate),
                parseDate(task.endDate)
              ) + 1;

              return (
                <div
                  key={task.id}
                  className="group flex border-b border-border/50"
                >
                  {/* Task label */}
                  <div className="flex w-52 shrink-0 items-center gap-2 border-r border-border px-4 py-3">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />
                    <span className="truncate text-sm">{task.name}</span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="ml-auto shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Bar area */}
                  <div className="relative flex-1" style={{ minHeight: 44 }}>
                    {/* Grid columns background */}
                    <div className="absolute inset-0 flex">
                      {columnDates.map((d, i) => (
                        <div
                          key={i}
                          className={cn(
                            "border-r border-border/10 h-full",
                            fmt(d) === fmt(today) && "bg-primary/5",
                            d.getDay() === 1 && "border-l border-border/30"
                          )}
                          style={{ width: COL_WIDTH }}
                        />
                      ))}
                    </div>

                    {/* Task bar */}
                    <div
                      className="absolute top-2 h-7 rounded-md transition-all"
                      style={{
                        left: start * COL_WIDTH + 2,
                        width: Math.max(duration * COL_WIDTH - 4, 20),
                        backgroundColor: task.color + "40",
                        borderLeft: `3px solid ${task.color}`,
                      }}
                    >
                      <span className="flex h-full items-center px-2 text-[10px] font-medium truncate">
                        {task.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Today marker */}
            {todayOffset >= 0 && todayOffset < timelineDays && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-destructive/60"
                style={{
                  left: 208 + todayOffset * COL_WIDTH + COL_WIDTH / 2,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Add task dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Task Name
              </label>
              <Input
                value={newTask.name}
                onChange={(e) =>
                  setNewTask({ ...newTask, name: e.target.value })
                }
                placeholder="Task name..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={newTask.startDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  End Date
                </label>
                <Input
                  type="date"
                  value={newTask.endDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Color
              </label>
              <div className="flex gap-2">
                {TASK_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTask({ ...newTask, color })}
                    className={cn(
                      "h-6 w-6 rounded-full transition-transform",
                      newTask.color === color &&
                        "scale-125 ring-2 ring-ring ring-offset-2"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={addTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
