"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDate } from "@/components/date-context";
import { useTasks } from "@/components/task-context";
import { getJournalEntry } from "@/lib/storage";
import type { Task } from "@/lib/storage";

// --- Helpers ---

function fmt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

function addWeeks(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-500/15 text-red-600 dark:text-red-400",
  medium: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  low: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};
const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

// --- WeekView (split: strip + day panel) ---

function WeekView({
  dates,
  selectedDate,
  dateString,
  onSelectDate,
  tasks,
  getHabitsForDate,
}: {
  dates: Date[];
  selectedDate: Date;
  dateString: string;
  onSelectDate: (d: Date) => void;
  tasks: Task[];
  getHabitsForDate: (date: string) => Task[];
}) {
  const todayStr = fmt(new Date());
  const selectedStr = fmt(selectedDate);
  const dayTasks = getTasksForDate(tasks, selectedStr);

  // Journal preview — use dateString from context (matches storage key format)
  const [journalPreview, setJournalPreview] = useState("");
  useEffect(() => {
    setJournalPreview(getJournalEntry(dateString));
  }, [dateString]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Week strip */}
      <div className="grid grid-cols-7 border-b border-border">
        {dates.map((date, i) => {
          const dateStr = fmt(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const dHabits = getHabitsForDate(dateStr);
          const dTasks = getTasksForDate(tasks, dateStr);
          const count = dHabits.length + dTasks.length;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 transition-colors hover:bg-accent/50",
                isSelected && "bg-accent"
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                {WEEKDAY_SHORT[i]}
              </span>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  isToday && !isSelected && "bg-primary text-primary-foreground",
                  isToday && isSelected && "bg-primary text-primary-foreground",
                  !isToday && isSelected && "bg-foreground text-background"
                )}
              >
                {date.getDate()}
              </span>
              {count > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground">
                    {count}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day panel */}
      <div className="flex-1 overflow-y-auto">
        {/* Day title */}
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
          {selectedStr === todayStr && (
            <span className="text-xs text-primary font-medium">Today</span>
          )}
        </div>

        <div className="divide-y divide-border">
          {/* Tasks section */}
          <div className="px-5 py-4">
            <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tasks
            </h4>
            {dayTasks.length > 0 ? (
              <div className="space-y-1.5">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors"
                  >
                    {task.completed ? (
                      <CheckCircle2
                        size={16}
                        className="shrink-0 text-green-500"
                      />
                    ) : (
                      <Circle
                        size={16}
                        className="shrink-0 text-muted-foreground"
                      />
                    )}
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        PRIORITY_BADGE[task.priority]
                      )}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {STATUS_LABEL[task.status]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks due</p>
            )}
          </div>

          {/* Journal preview */}
          <div className="px-5 py-4">
            <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen size={12} />
              Journal
            </h4>
            {journalPreview ? (
              <p className="line-clamp-4 whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                {journalPreview}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No journal entry
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MonthView ---

function MonthView({
  grid,
  selectedDate,
  onSelectDate,
  tasks,
  getHabitsForDate,
  getHabitCompletion,
}: {
  grid: (Date | null)[][];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  tasks: Task[];
  getHabitsForDate: (date: string) => Task[];
  getHabitCompletion: (date: string, taskId: string) => boolean;
}) {
  const todayStr = fmt(new Date());
  const selectedStr = fmt(selectedDate);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_SHORT.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-hidden">
        {grid.flat().map((date, idx) => {
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

          // Build items list: habits first, then tasks
          type Item = { label: string; color: string; done: boolean };
          const items: Item[] = [];
          for (const h of habits) {
            items.push({
              label: h.title,
              color: h.color,
              done: getHabitCompletion(dateStr, h.id),
            });
          }
          for (const t of dayTasks) {
            items.push({ label: t.title, color: t.color, done: t.completed });
          }

          const maxVisible = 3;
          const visible = items.slice(0, maxVisible);
          const overflow = items.length - maxVisible;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex flex-col border-b border-r border-border p-1 text-left hover:bg-accent/30 transition-colors overflow-hidden",
                isSelected && "bg-accent/30"
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary text-primary-foreground font-semibold"
                )}
              >
                {date.getDate()}
              </span>

              {/* Event chips */}
              <div className="mt-0.5 flex flex-col gap-px overflow-hidden">
                {visible.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-1 rounded px-1 py-px",
                      item.done && "opacity-50"
                    )}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className={cn(
                        "truncate text-[11px] leading-tight",
                        item.done && "line-through"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[10px] font-medium text-muted-foreground">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- CalendarPage ---

export function CalendarPage() {
  const { selectedDate, setSelectedDate, dateString } = useDate();
  const {
    tasks,
    getHabitsForDate,
    getHabitCompletion,
  } = useTasks();

  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [viewDate, setViewDate] = useState<Date>(selectedDate);

  const weekDates = useMemo(() => getWeekDates(viewDate), [viewDate]);
  const monthGrid = useMemo(() => getMonthGrid(viewDate), [viewDate]);

  const handlePrev = () => {
    setViewDate((d) =>
      calendarView === "week" ? addWeeks(d, -1) : addMonths(d, -1)
    );
  };

  const handleNext = () => {
    setViewDate((d) =>
      calendarView === "week" ? addWeeks(d, 1) : addMonths(d, 1)
    );
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  // Header label
  const headerLabel = useMemo(() => {
    if (calendarView === "week") {
      const start = weekDates[0];
      const end = weekDates[6];
      const sameMonth = start.getMonth() === end.getMonth();
      if (sameMonth) {
        return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()} – ${end.toLocaleDateString("en-US", { month: "short" })} ${end.getDate()}, ${end.getFullYear()}`;
    }
    return viewDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [calendarView, viewDate, weekDates]);

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">Calendar</h2>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          <button
            onClick={handlePrev}
            className="rounded-md p-1.5 hover:bg-accent"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleToday}
            className="rounded-md px-2.5 py-1 text-sm font-medium hover:bg-accent"
          >
            Today
          </button>
          <button
            onClick={handleNext}
            className="rounded-md p-1.5 hover:bg-accent"
          >
            <ChevronRight size={16} />
          </button>

          {/* View toggle */}
          <div className="ml-2 flex rounded-lg border border-border">
            <button
              onClick={() => setCalendarView("week")}
              className={cn(
                "rounded-l-lg px-3 py-1 text-sm transition-colors",
                calendarView === "week"
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView("month")}
              className={cn(
                "rounded-r-lg px-3 py-1 text-sm transition-colors",
                calendarView === "month"
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Date range label */}
      <div className="border-b border-border px-4 py-1.5">
        <p className="text-sm text-muted-foreground">{headerLabel}</p>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-hidden">
        {calendarView === "week" ? (
          <WeekView
            dates={weekDates}
            selectedDate={selectedDate}
            dateString={dateString}
            onSelectDate={handleSelectDate}
            tasks={tasks}
            getHabitsForDate={getHabitsForDate}
          />
        ) : (
          <MonthView
            grid={monthGrid}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            tasks={tasks}
            getHabitsForDate={getHabitsForDate}
            getHabitCompletion={getHabitCompletion}
          />
        )}
      </div>
    </div>
  );
}
