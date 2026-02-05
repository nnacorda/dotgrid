"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useDate } from "@/components/date-context";
import { HabitGrid } from "@/components/habit-grid";
import { KanbanPanel } from "@/components/kanban-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { getJournalEntryDates, downloadExport } from "@/lib/storage";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const { selectedDate, setSelectedDate } = useDate();
  const [journalDateStrings, setJournalDateStrings] = useState<string[]>([]);

  useEffect(() => {
    setJournalDateStrings(getJournalEntryDates());
  }, [selectedDate]);

  const journalDates = useMemo(
    () => journalDateStrings.map((d) => new Date(d + "T00:00:00")),
    [journalDateStrings]
  );

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
          <h1 className="text-lg font-semibold tracking-tight">Hobonichi</h1>
          <p className="text-xs text-muted-foreground">Digital Journal</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Scrollable middle area */}
      <div className="flex-1 overflow-y-auto">
        {/* Date Display */}
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {dayOfWeek}
          </p>
          <p className="text-3xl font-light tabular-nums">{dayNum}</p>
          <p className="text-sm text-muted-foreground">{monthYear}</p>
        </div>

        {/* Calendar */}
        <div className="border-b border-border px-2 py-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            modifiers={{ hasJournalEntry: journalDates }}
            modifiersClassNames={{ hasJournalEntry: "has-journal-entry" }}
            className="w-full"
          />
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
        <p className="text-xs text-muted-foreground">one day, one page</p>
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
