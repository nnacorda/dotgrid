"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDate } from "@/components/date-context";
import { HabitGrid } from "@/components/habit-grid";
import { KanbanPanel } from "@/components/kanban-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { getJournalEntryDates, downloadExport } from "@/lib/storage";
import { Download, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

function fmtDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type SidebarProps = {
  yearViewActive: boolean;
  onToggleYearView: () => void;
};

export function Sidebar({ yearViewActive, onToggleYearView }: SidebarProps) {
  const { selectedDate, setSelectedDate } = useDate();
  const [journalDateStrings, setJournalDateStrings] = useState<string[]>([]);

  useEffect(() => {
    setJournalDateStrings(getJournalEntryDates());
  }, [selectedDate]);

  const journalDateSet = useMemo(
    () => new Set(journalDateStrings),
    [journalDateStrings]
  );

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const todayStr = fmtDate(new Date());
  const selectedStr = fmtDate(selectedDate);

  const shiftWeek = useCallback(
    (dir: number) => {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + dir * 7);
      setSelectedDate(next);
    },
    [selectedDate, setSelectedDate]
  );

  const weekLabel = useMemo(() => {
    const mon = weekDates[0];
    const sun = weekDates[6];
    const sameMonth = mon.getMonth() === sun.getMonth();
    const monStr = mon.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sunStr = sameMonth
      ? sun.getDate().toString()
      : sun.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${monStr} – ${sunStr}`;
  }, [weekDates]);

  const dayOfWeek = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const monthYear = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const dayNum = selectedDate.getDate();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-7">
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>dotgrid</h1>
          <p className="text-xs text-muted-foreground">one day, one page</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleYearView}
            className={cn(
              "rounded-md p-1.5 hover:bg-accent transition-colors",
              yearViewActive && "text-primary bg-accent"
            )}
            title={yearViewActive ? "Back to journal" : "Year view"}
          >
            <BookOpen size={16} />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Scrollable middle area */}
      <div className="flex-1 overflow-y-auto scrollbar-on-hover">
        {/* Date Display */}
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {dayOfWeek}
          </p>
          <p className="text-3xl font-light tabular-nums">{dayNum}</p>
          <p className="text-sm text-muted-foreground">{monthYear}</p>
        </div>

        {/* Week strip */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => shiftWeek(-1)}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              {weekLabel}
            </span>
            <button
              onClick={() => shiftWeek(1)}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((date, i) => {
              const dateStr = fmtDate(date);
              const isSelected = dateStr === selectedStr;
              const isToday = dateStr === todayStr;
              const hasEntry = journalDateSet.has(dateStr);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-medium leading-none",
                    !isSelected && "text-muted-foreground"
                  )}>
                    {DAY_LABELS[i]}
                  </span>
                  <span className="text-sm font-medium leading-none tabular-nums">
                    {date.getDate()}
                  </span>
                  <div
                    className={cn(
                      "h-1 w-1 rounded-full",
                      hasEntry
                        ? isSelected
                          ? "bg-primary-foreground"
                          : "bg-primary"
                        : "bg-transparent"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Habit Grid */}
        <div className="border-b border-border">
          <HabitGrid />
        </div>

        {/* Tasks */}
        <KanbanPanel />
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">journal + planner by nnacorda</p>
        <Button
          onClick={downloadExport}
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Export backup"
        >
          <Download size={14} />
        </Button>
      </div>
    </aside>
  );
}
