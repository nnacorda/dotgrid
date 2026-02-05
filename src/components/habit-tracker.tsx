"use client";

import { useState, useEffect, useCallback } from "react";
import { useDate } from "@/components/date-context";
import { getHabitConfig, setHabitConfig, type HabitConfig } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

function getWeekDates(date: Date): Date[] {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function HabitTracker() {
  const { selectedDate } = useDate();
  const [config, setConfig] = useState<HabitConfig>({ habits: [], data: {} });
  const [newHabit, setNewHabit] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConfig(getHabitConfig());
    setLoaded(true);
  }, []);

  const save = useCallback((c: HabitConfig) => {
    setConfig(c);
    setHabitConfig(c);
  }, []);

  const addHabit = () => {
    const name = newHabit.trim();
    if (!name || config.habits.includes(name)) return;
    save({ ...config, habits: [...config.habits, name] });
    setNewHabit("");
  };

  const removeHabit = (name: string) => {
    const habits = config.habits.filter((h) => h !== name);
    const data = { ...config.data };
    // Remove this habit from all date entries
    for (const dateKey of Object.keys(data)) {
      if (data[dateKey][name] !== undefined) {
        const { [name]: _, ...rest } = data[dateKey];
        data[dateKey] = rest;
      }
    }
    save({ habits, data });
  };

  const toggleHabit = (habitName: string, dateStr: string) => {
    const data = { ...config.data };
    if (!data[dateStr]) data[dateStr] = {};
    data[dateStr] = {
      ...data[dateStr],
      [habitName]: !data[dateStr][habitName],
    };
    save({ ...config, data });
  };

  const weekDates = getWeekDates(selectedDate);

  if (!loaded) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h2 className="text-2xl font-light">Habit Tracker</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Week of{" "}
          {weekDates[0].toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          &ndash;{" "}
          {weekDates[6].toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Add habit */}
      <div className="border-b border-border px-8 py-4">
        <div className="flex gap-2">
          <Input
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="Add a new habit..."
            className="bg-background"
          />
          <Button onClick={addHabit} size="sm" variant="outline">
            <Plus size={16} />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {config.habits.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Add your first habit to get started
          </div>
        ) : (
          <div className="w-full">
            {/* Day headers */}
            <div className="mb-4 grid grid-cols-[1fr_repeat(7,48px)] items-center gap-1">
              <div />
              {weekDates.map((d) => {
                const isToday = fmt(d) === fmt(new Date());
                const isSelected = fmt(d) === fmt(selectedDate);
                return (
                  <div
                    key={fmt(d)}
                    className={`text-center text-xs ${
                      isToday
                        ? "font-bold text-foreground"
                        : isSelected
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    <div>{d.toLocaleDateString("en-US", { weekday: "narrow" })}</div>
                    <div className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Habit rows */}
            {config.habits.map((habit) => {
              const completedCount = weekDates.filter(
                (d) => config.data[fmt(d)]?.[habit]
              ).length;
              const pct = Math.round((completedCount / 7) * 100);

              return (
                <div
                  key={habit}
                  className="mb-2 grid grid-cols-[1fr_repeat(7,48px)] items-center gap-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">{habit}</span>
                    <button
                      onClick={() => removeHabit(habit)}
                      className="shrink-0 text-muted-foreground/40 hover:text-destructive"
                    >
                      <X size={12} />
                    </button>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  {weekDates.map((d) => {
                    const dateStr = fmt(d);
                    const checked = config.data[dateStr]?.[habit] ?? false;
                    return (
                      <button
                        key={dateStr}
                        onClick={() => toggleHabit(habit, dateStr)}
                        className="mx-auto flex h-8 w-8 items-center justify-center"
                      >
                        <div
                          className={`h-5 w-5 rounded-full border-2 transition-all ${
                            checked
                              ? "border-primary bg-primary"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          {checked && (
                            <svg
                              viewBox="0 0 20 20"
                              className="h-full w-full text-primary-foreground"
                            >
                              <path
                                d="M6 10l3 3 5-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
