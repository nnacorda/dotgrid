"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDate } from "@/components/date-context";
import { useTasks } from "@/components/task-context";
import type { Task } from "@/lib/storage";

// --- Helpers ---

function fmt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthGrid(date: Date): (Date | null)[][] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const offset = startDow === 0 ? 6 : startDow - 1;

  const totalCells = offset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);
  const grid: (Date | null)[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: (Date | null)[] = [];
    for (let c = 0; c < 7; c++) {
      const idx = r * 7 + c;
      const dayNum = idx - offset + 1;
      if (dayNum < 1 || dayNum > lastDay.getDate()) {
        row.push(null);
      } else {
        row.push(new Date(year, month, dayNum));
      }
    }
    grid.push(row);
  }
  return grid;
}

function getTasksForDate(tasks: Task[], dateStr: string): Task[] {
  const today = fmt(new Date());
  return tasks.filter((t) => {
    if (t.isHabit) return false;
    if (t.dueDate === dateStr) return true;
    if (t.status === "in-progress" && dateStr === today) return true;
    return false;
  });
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

const WEEKDAY_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

// --- MonthPanel ---

export function MonthPanel() {
  const { selectedDate, setSelectedDate } = useDate();
  const { tasks, getHabitsForDate, getHabitCompletion } = useTasks();

  const [viewDate, setViewDate] = useState<Date>(selectedDate);
  const monthGrid = useMemo(() => getMonthGrid(viewDate), [viewDate]);

  const todayStr = fmt(new Date());
  const selectedStr = fmt(selectedDate);

  const handlePrev = () => setViewDate((d) => addMonths(d, -1));
  const handleNext = () => setViewDate((d) => addMonths(d, 1));
  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now);
  };

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex h-full flex-col">
      {/* Navigation */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
        <button
          onClick={handlePrev}
          className="rounded-md p-1 hover:bg-accent"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{monthLabel}</span>
          <button
            onClick={handleToday}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent"
          >
            Today
          </button>
        </div>
        <button
          onClick={handleNext}
          className="rounded-md p-1 hover:bg-accent"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_SHORT.map((d, i) => (
          <div
            key={i}
            className="py-1 text-center text-[10px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-hidden">
        {monthGrid.flat().map((date, idx) => {
          if (!date) {
            return (
              <div
                key={`empty-${idx}`}
                className="border-b border-r border-border bg-muted/20"
              />
            );
          }

          const dateStr = fmt(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const habits = getHabitsForDate(dateStr);
          const dayTasks = getTasksForDate(tasks, dateStr);

          // Habit dots
          const habitItems = habits.map((h) => ({
            color: h.color,
            done: getHabitCompletion(dateStr, h.id),
          }));

          const maxTasks = 5;
          const visibleTasks = dayTasks.slice(0, maxTasks);
          const taskOverflow = dayTasks.length - maxTasks;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "flex flex-col items-start border-b border-r border-border py-1 px-0.5 hover:bg-accent/30 transition-colors overflow-hidden",
                isSelected && "bg-accent/30"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] self-center",
                  isToday &&
                    "bg-primary text-primary-foreground font-semibold"
                )}
              >
                {date.getDate()}
              </span>

              {/* Habit dots */}
              {habitItems.length > 0 && (
                <div className="mt-0.5 flex items-center gap-px flex-wrap justify-center self-center">
                  {habitItems.map((item, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full border"
                      style={{
                        borderColor: item.color,
                        backgroundColor: item.done ? item.color : "transparent",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Task bars */}
              {visibleTasks.length > 0 && (
                <div className="mt-1 flex w-full flex-1 flex-col gap-1">
                  {visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-xs leading-normal text-white font-medium",
                        task.completed && "opacity-50 line-through"
                      )}
                      style={{ backgroundColor: task.color }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {taskOverflow > 0 && (
                    <span className="text-[9px] text-muted-foreground leading-none self-center">
                      +{taskOverflow} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
