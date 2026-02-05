"use client";

import { useState, useEffect } from "react";
import {
  getJournalEntryDates,
  getJournalEntry,
  getMood,
  getTaskStore,
  formatDate,
  type Mood,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

type Stats = {
  totalEntries: number;
  totalWords: number;
  currentStreak: number;
  longestStreak: number;
  moodCounts: { good: number; neutral: number; bad: number };
  moodTotal: number;
  habitStats: {
    name: string;
    color: string;
    rate: number;
    completed: number;
    active: number;
  }[];
};

function computeStats(): Stats {
  const entryDates = getJournalEntryDates().sort();
  const dateSet = new Set(entryDates);

  // Total words
  let totalWords = 0;
  for (const date of entryDates) {
    const content = getJournalEntry(date);
    totalWords += content.trim() ? content.trim().split(/\s+/).length : 0;
  }

  // Current streak (count back from today)
  let currentStreak = 0;
  const d = new Date();
  for (let i = 0; i < 1000; i++) {
    if (dateSet.has(formatDate(d))) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak
  let longestStreak = 0;
  if (entryDates.length > 0) {
    let streak = 1;
    for (let i = 1; i < entryDates.length; i++) {
      const prev = new Date(entryDates[i - 1] + "T00:00:00");
      const curr = new Date(entryDates[i] + "T00:00:00");
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (Math.round(diff) === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  // Mood counts (last 30 days)
  const moodCounts = { good: 0, neutral: 0, bad: 0 };
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const dd = new Date(today);
    dd.setDate(dd.getDate() - i);
    const mood = getMood(formatDate(dd));
    if (mood) moodCounts[mood]++;
  }
  const moodTotal = moodCounts.good + moodCounts.neutral + moodCounts.bad;

  // Habit stats (last 30 days)
  const taskStore = getTaskStore();
  const habits = taskStore.tasks.filter((t) => t.isHabit);
  const habitStats = habits.map((h) => {
    let activeDays = 0;
    let completedDays = 0;
    for (let i = 0; i < 30; i++) {
      const dd = new Date(today);
      dd.setDate(dd.getDate() - i);
      const dateStr = formatDate(dd);
      let isActive = false;
      if (h.recurrence?.frequency === "daily") isActive = true;
      else if (h.recurrence?.frequency === "weekly") {
        isActive = (h.recurrence.daysOfWeek || []).includes(dd.getDay());
      }
      if (isActive) {
        activeDays++;
        if (taskStore.habitCompletions[dateStr]?.[h.id]) completedDays++;
      }
    }
    return {
      name: h.title,
      color: h.color,
      rate: activeDays > 0 ? completedDays / activeDays : 0,
      completed: completedDays,
      active: activeDays,
    };
  });

  return {
    totalEntries: entryDates.length,
    totalWords,
    currentStreak,
    longestStreak,
    moodCounts,
    moodTotal,
    habitStats,
  };
}

const MOOD_COLORS = {
  good: "rgb(134, 187, 106)",
  neutral: "rgb(234, 197, 80)",
  bad: "rgb(214, 120, 80)",
};

export function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setStats(computeStats());
  }, []);

  if (!stats) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-3 py-2 border-b border-border">
        <span className="text-sm font-medium" style={{ fontFamily: "var(--font-playfair)" }}>
          Insights
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-on-hover px-4 py-4 space-y-6">
        {/* Writing Stats */}
        <section>
          <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Writing
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Current streak" value={`${stats.currentStreak}`} unit="days" />
            <StatCard label="Longest streak" value={`${stats.longestStreak}`} unit="days" />
            <StatCard label="Total entries" value={`${stats.totalEntries}`} />
            <StatCard label="Total words" value={stats.totalWords.toLocaleString()} />
          </div>
        </section>

        {/* Mood Distribution */}
        <section>
          <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Mood — last 30 days
          </h4>
          {stats.moodTotal > 0 ? (
            <>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                {(["good", "neutral", "bad"] as const).map((m) => {
                  const pct = (stats.moodCounts[m] / stats.moodTotal) * 100;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={m}
                      style={{ width: `${pct}%`, backgroundColor: MOOD_COLORS[m] }}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                {(["good", "neutral", "bad"] as const).map((m) => (
                  <span key={m} className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: MOOD_COLORS[m] }}
                    />
                    {m === "good" ? "Good" : m === "neutral" ? "Okay" : "Bad"} {stats.moodCounts[m]}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground/50">No mood data yet</p>
          )}
        </section>

        {/* Habit Completion */}
        {stats.habitStats.length > 0 && (
          <section>
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Habits — last 30 days
            </h4>
            <div className="space-y-3">
              {stats.habitStats.map((h) => (
                <div key={h.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs">{h.name}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {h.completed}/{h.active} · {Math.round(h.rate * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${h.rate * 100}%`,
                        backgroundColor: h.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-lg font-medium tabular-nums leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{unit}</span>}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
