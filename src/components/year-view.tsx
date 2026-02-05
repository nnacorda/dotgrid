"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDate } from "@/components/date-context";
import {
  getJournalEntryDates,
  getYearGoals,
  setYearGoals,
  getMood,
  type Mood,
} from "@/lib/storage";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Helpers ---

function fmt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const MOOD_BG: Record<string, string> = {
  good: "rgba(134, 187, 106, 0.3)",
  neutral: "rgba(234, 197, 80, 0.3)",
  bad: "rgba(214, 120, 80, 0.3)",
};

// --- MiniMonth ---

function MiniMonth({
  year,
  month,
  journalDateSet,
  moodMap,
  onSelectDate,
  selectedStr,
  todayStr,
}: {
  year: number;
  month: number;
  journalDateSet: Set<string>;
  moodMap: Record<string, Mood>;
  onSelectDate: (date: Date) => void;
  selectedStr: string;
  todayStr: string;
}) {
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  return (
    <div>
      <h4 className="mb-1.5 text-xs font-medium text-foreground">
        {MONTH_NAMES[month]}
      </h4>
      <div className="grid grid-cols-7 gap-x-0 gap-y-0">
        {DAY_LABELS.map((label, i) => (
          <span
            key={i}
            className="text-center text-[9px] text-muted-foreground leading-4"
          >
            {label}
          </span>
        ))}
        {grid.flat().map((date, i) => {
          if (!date) {
            return <span key={i} className="h-6" />;
          }

          const dateStr = fmt(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const hasEntry = journalDateSet.has(dateStr);
          const moodBg = moodMap[dateStr] ? MOOD_BG[moodMap[dateStr]!] : undefined;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(date)}
              className={cn(
                "relative flex h-6 items-center justify-center rounded text-[10px] tabular-nums transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground font-medium"
                  : isToday
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/50"
              )}
              style={moodBg && !isSelected && !isToday ? { backgroundColor: moodBg } : undefined}
            >
              {date.getDate()}
              {hasEntry && (
                <span
                  className={cn(
                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- YearPanel ---

export function YearPanel() {
  const { selectedDate, setSelectedDate } = useDate();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [goals, setGoals] = useState("");
  const [goalsSaved, setGoalsSaved] = useState(true);
  const [journalDateSet, setJournalDateSet] = useState<Set<string>>(new Set());
  const [moodMap, setMoodMap] = useState<Record<string, Mood>>({});
  const goalsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const todayStr = fmt(new Date());
  const selectedStr = fmt(selectedDate);

  // Load journal dates and moods for viewYear
  useEffect(() => {
    const allDates = getJournalEntryDates();
    const yearPrefix = String(viewYear);
    setJournalDateSet(new Set(allDates.filter((d) => d.startsWith(yearPrefix))));

    const moods: Record<string, Mood> = {};
    for (let m = 0; m < 12; m++) {
      const lastDay = new Date(viewYear, m + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = fmt(new Date(viewYear, m, d));
        const mood = getMood(dateStr);
        if (mood) moods[dateStr] = mood;
      }
    }
    setMoodMap(moods);
  }, [viewYear]);

  // Load goals when year changes
  useEffect(() => {
    setGoals(getYearGoals(viewYear));
    setGoalsSaved(true);
  }, [viewYear]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (goalsTimerRef.current) clearTimeout(goalsTimerRef.current);
    };
  }, []);

  const handleGoalsChange = useCallback(
    (value: string) => {
      setGoals(value);
      setGoalsSaved(false);
      if (goalsTimerRef.current) clearTimeout(goalsTimerRef.current);
      goalsTimerRef.current = setTimeout(() => {
        setYearGoals(viewYear, value);
        setGoalsSaved(true);
      }, 500);
    },
    [viewYear]
  );

  const handleSelectDate = useCallback(
    (date: Date) => {
      setSelectedDate(date);
    },
    [setSelectedDate]
  );

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex h-full flex-col">
      {/* Year navigation */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
        <button
          onClick={() => setViewYear((y) => y - 1)}
          className="rounded-md p-1 hover:bg-accent"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {viewYear}
          </span>
          {viewYear !== currentYear && (
            <button
              onClick={() => setViewYear(currentYear)}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent"
            >
              This year
            </button>
          )}
        </div>
        <button
          onClick={() => setViewYear((y) => y + 1)}
          className="rounded-md p-1 hover:bg-accent"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-on-hover">
        <div className="px-3 py-4">
          {/* 12 mini-month grids */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-5">
            {Array.from({ length: 12 }, (_, monthIdx) => (
              <MiniMonth
                key={monthIdx}
                year={viewYear}
                month={monthIdx}
                journalDateSet={journalDateSet}
                moodMap={moodMap}
                onSelectDate={handleSelectDate}
                selectedStr={selectedStr}
                todayStr={todayStr}
              />
            ))}
          </div>

          {/* Year goals */}
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Year Goals & Reflections
            </h3>
            <textarea
              value={goals}
              onChange={(e) => handleGoalsChange(e.target.value)}
              placeholder="What do you want to accomplish this year?"
              className="min-h-[100px] w-full resize-y rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {goalsSaved ? "Saved" : "Saving..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
