"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDate } from "@/components/date-context";
import { HabitGrid } from "@/components/habit-grid";
import { KanbanPanel } from "@/components/kanban-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { getJournalEntryDates, downloadExport, importBackup, getMood, setMood, type Mood, type ExportData } from "@/lib/storage";
import {
  Download, Upload, ChevronLeft, ChevronRight, Smile, Meh, Frown,
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMoonPhase, getCachedLocation, getCachedWeather,
  fetchLocation, fetchWeather, getWeatherDescription,
  type WeatherData,
} from "@/lib/weather";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const MOOD_BG: Record<string, string> = {
  good: "rgba(134, 187, 106, 0.25)",
  neutral: "rgba(234, 197, 80, 0.25)",
  bad: "rgba(214, 120, 80, 0.25)",
};

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

function getWeatherIcon(code: number) {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code <= 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67) return CloudRain;
  if (code <= 77) return Snowflake;
  if (code <= 82) return CloudRain;
  if (code <= 86) return Snowflake;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

function MoonPhaseIcon({ phase, size = 12, title }: { phase: number; size?: number; title?: string }) {
  const r = size / 2 - 0.5;
  const cx = size / 2;
  const cy = size / 2;

  if (phase === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={title}>
        <title>{title}</title>
        <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={0.5} strokeOpacity={0.25} />
      </svg>
    );
  }

  if (phase === 4) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={title}>
        <title>{title}</title>
        <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity={0.5} />
      </svg>
    );
  }

  const k: Record<number, number> = { 1: 0.5, 2: 0, 3: -0.5, 5: -0.5, 6: 0, 7: 0.5 };
  const t = k[phase] ?? 0;
  const waxing = phase <= 4;
  const litPath = waxing
    ? `M ${cx},${cy - r} A ${r} ${r} 0 0 1 ${cx},${cy + r} Q ${cx + t * r},${cy} ${cx},${cy - r} Z`
    : `M ${cx},${cy - r} A ${r} ${r} 0 0 0 ${cx},${cy + r} Q ${cx + t * r},${cy} ${cx},${cy - r} Z`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={title}>
      <title>{title}</title>
      <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeWidth={0.5} strokeOpacity={0.15} />
      <path d={litPath} fill="currentColor" fillOpacity={0.5} />
    </svg>
  );
}

export function Sidebar() {
  const { selectedDate, setSelectedDate } = useDate();
  const [journalDateStrings, setJournalDateStrings] = useState<string[]>([]);
  const [mood, setMoodState] = useState<Mood>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportData;
        if (!data.journals || !data.version) {
          alert("Invalid backup file.");
          return;
        }
        const count = importBackup(data);
        alert(`Restored ${count} journal entries. Reloading...`);
        window.location.reload();
      } catch {
        alert("Could not read backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const [weekMoods, setWeekMoods] = useState<Record<string, Mood>>({});
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    setJournalDateStrings(getJournalEntryDates());
    setMoodState(getMood(fmtDate(selectedDate)));
  }, [selectedDate]);

  // Weather: show cached for any date, fetch only for today
  useEffect(() => {
    const dateStr = fmtDate(selectedDate);
    const today = fmtDate(new Date());
    const isToday = dateStr === today;

    const cached = getCachedWeather(dateStr);
    if (cached) {
      setWeather(cached);
      if (!isToday) return;
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < 60 * 60 * 1000) return; // fresh enough
    } else {
      setWeather(null);
      if (!isToday) return;
    }

    let cancelled = false;
    (async () => {
      let loc = getCachedLocation();
      if (!loc) loc = await fetchLocation();
      if (!loc || cancelled) return;
      const data = await fetchWeather(loc.lat, loc.lon, dateStr);
      if (!cancelled && data) setWeather(data);
    })();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const handleMood = (value: Mood) => {
    const dateStr = fmtDate(selectedDate);
    const next = mood === value ? null : value;
    setMoodState(next);
    setMood(dateStr, next);
  };

  const journalDateSet = useMemo(
    () => new Set(journalDateStrings),
    [journalDateStrings]
  );

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const todayStr = fmtDate(new Date());
  const selectedStr = fmtDate(selectedDate);

  // Load moods for the visible week
  useEffect(() => {
    const map: Record<string, Mood> = {};
    for (const date of weekDates) {
      const dateStr = fmtDate(date);
      const m = getMood(dateStr);
      if (m) map[dateStr] = m;
    }
    setWeekMoods(map);
  }, [weekDates, mood]);

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
  const moonPhase = getMoonPhase(selectedDate);
  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : null;

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-7">
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>dotgrid</h1>
          <p className="text-xs text-muted-foreground">one day, one page</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Scrollable middle area */}
      <div className="flex-1 overflow-y-auto scrollbar-on-hover">
        {/* Date Display */}
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {dayOfWeek}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-light tabular-nums" style={{ fontFamily: "var(--font-playfair)" }}>{dayNum}</p>
            <div className="flex items-center gap-1">
              {/* Weather & Moon */}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {weather && WeatherIcon && (
                  <span title={getWeatherDescription(weather.weatherCode)}>
                    <WeatherIcon size={13} />
                  </span>
                )}
                <MoonPhaseIcon phase={moonPhase.index} size={12} title={moonPhase.name} />
              </div>
              <span className="h-3.5 w-px bg-border" />
              {/* Mood */}
              {([
                { value: "good" as Mood, Icon: Smile, color: "rgb(134, 187, 106)" },
                { value: "neutral" as Mood, Icon: Meh, color: "rgb(234, 197, 80)" },
                { value: "bad" as Mood, Icon: Frown, color: "rgb(214, 120, 80)" },
              ]).map(({ value, Icon, color }) => (
                <button
                  key={value}
                  onClick={() => handleMood(value)}
                  className={cn(
                    "rounded-md p-1 transition-colors",
                    mood !== value && "text-muted-foreground/40 hover:text-muted-foreground"
                  )}
                  style={mood === value ? { color } : undefined}
                  title={value === "good" ? "Good" : value === "neutral" ? "Okay" : "Bad"}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
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
              const moodBg = weekMoods[dateStr] ? MOOD_BG[weekMoods[dateStr]!] : undefined;

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
                  style={moodBg && !isSelected ? { backgroundColor: moodBg } : undefined}
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
        <div className="flex items-center gap-0.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            onClick={handleImport}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Import backup"
          >
            <Upload size={14} />
          </Button>
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
      </div>
    </aside>
  );
}
