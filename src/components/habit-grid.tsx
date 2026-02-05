"use client";

import { useState, useMemo } from "react";
import { useDate } from "@/components/date-context";
import { useTasks } from "@/components/task-context";
import { TaskDialog } from "@/components/task-dialog";
import { calculateHabitStreak } from "@/lib/storage";
import type { Task } from "@/lib/storage";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

function fmt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function HabitGrid() {
  const { selectedDate } = useDate();
  const { tasks, updateTask, deleteTask, getHabitsForDate, getHabitCompletion, toggleHabitCompletion, getHabitCompletions } =
    useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const openEditDialog = (habitId: string) => {
    const task = tasks.find((t) => t.id === habitId);
    if (task) {
      setEditingTask(task);
      setDialogOpen(true);
    }
  };

  const handleDialogSave = (data: Partial<Task>) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    }
  };

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const todayStr = fmt(new Date());

  // Collect all unique habits that appear on any day this week
  const habits = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; title: string; color: string }[] = [];
    for (const date of weekDates) {
      const dateStr = fmt(date);
      for (const habit of getHabitsForDate(dateStr)) {
        if (!seen.has(habit.id)) {
          seen.add(habit.id);
          result.push({ id: habit.id, title: habit.title, color: habit.color });
        }
      }
    }
    return result;
  }, [weekDates, getHabitsForDate]);

  const streaks = useMemo(() => {
    const completions = getHabitCompletions();
    const map: Record<string, number> = {};
    for (const habit of habits) {
      const task = tasks.find((t) => t.id === habit.id);
      map[habit.id] = calculateHabitStreak(
        habit.id,
        completions,
        task?.recurrence,
        task?.createdAt
      );
    }
    return map;
  }, [habits, tasks, getHabitCompletions]);

  // For each habit+day, check if the habit is active on that day
  const isHabitActiveOnDate = (habitId: string, dateStr: string): boolean => {
    return getHabitsForDate(dateStr).some((h) => h.id === habitId);
  };

  if (habits.length === 0) {
    return (
      <div className="px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Habits
        </h3>
        <p className="text-xs text-muted-foreground/60">
          No habits this week. Create a recurring habit from the task board.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Habits
      </h3>

      <div className="space-y-0">
        {/* Day labels header */}
        <div className="mb-1 grid grid-cols-[1fr_repeat(7,20px)] gap-1 items-center">
          <span />
          {weekDates.map((date, i) => {
            const dateStr = fmt(date);
            return (
              <span
                key={i}
                className={cn(
                  "text-center text-[10px] font-medium leading-none",
                  dateStr === todayStr
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {DAY_LABELS[i]}
              </span>
            );
          })}
        </div>

        {/* Habit rows */}
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="grid grid-cols-[1fr_repeat(7,20px)] gap-1 items-center py-0.5"
          >
            <button
              onClick={() => openEditDialog(habit.id)}
              className="truncate text-xs pr-1 text-left hover:text-primary transition-colors cursor-pointer"
              title={`Edit ${habit.title}`}
            >
              {habit.title}
            </button>

            {weekDates.map((date, i) => {
              const dateStr = fmt(date);
              const active = isHabitActiveOnDate(habit.id, dateStr);
              const completed = active && getHabitCompletion(dateStr, habit.id);
              const isToday = dateStr === todayStr;

              if (!active) {
                return (
                  <div
                    key={i}
                    className="h-[20px] w-[20px] rounded-[3px] bg-muted/30"
                  />
                );
              }

              const streak = streaks[habit.id] || 0;
              const showStreak = isToday && completed && streak > 1;

              return (
                <button
                  key={i}
                  onClick={() => toggleHabitCompletion(dateStr, habit.id)}
                  className={cn(
                    "relative h-[20px] w-[20px] rounded-[3px] transition-colors",
                    isToday && "ring-1 ring-primary/40",
                    completed
                      ? "opacity-100"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                  style={completed ? { backgroundColor: habit.color } : undefined}
                  title={`${habit.title} — ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${showStreak ? ` (${streak} day streak)` : ""}`}
                >
                  {showStreak && (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                      {streak}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Edit habit dialog */}
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
