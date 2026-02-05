export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
};

export type HabitDay = {
  [habitName: string]: boolean;
};

export type HabitConfig = {
  habits: string[];
  data: { [date: string]: HabitDay };
};

export type KanbanCard = {
  id: string;
  title: string;
  description?: string;
  color: string;
};

export type KanbanColumn = {
  id: string;
  title: string;
  cards: KanbanCard[];
};

export type KanbanData = {
  columns: KanbanColumn[];
};

// Unified Task System
export type Task = {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
  completed: boolean;
  startDate?: string;
  dueDate?: string;
  color: string;
  createdAt: string;
  isHabit?: boolean;
  recurrence?: { frequency: "daily" | "weekly" | "monthly"; daysOfWeek?: number[] };
};

export type TaskStore = {
  tasks: Task[];
  columnOrder: {
    "todo": string[];
    "in-progress": string[];
    "done": string[];
  };
  habitCompletions: { [date: string]: { [taskId: string]: boolean } };
};

export type GanttTask = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  color: string;
};

export type GanttData = {
  tasks: GanttTask[];
};

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Journal
export function getJournalEntry(date: string): string {
  return getItem(`journal-${date}`, "");
}

export function setJournalEntry(date: string, text: string): void {
  setItem(`journal-${date}`, text);
}

// Todos
export function getTodos(date: string): Todo[] {
  return getItem(`todos-${date}`, []);
}

export function setTodos(date: string, todos: Todo[]): void {
  setItem(`todos-${date}`, todos);
}

// Habits
export function getHabitConfig(): HabitConfig {
  return getItem("habit-config", { habits: [], data: {} });
}

export function setHabitConfig(config: HabitConfig): void {
  setItem("habit-config", config);
}

// Kanban
export function getKanbanData(): KanbanData {
  return getItem("kanban-data", {
    columns: [
      { id: "todo", title: "To Do", cards: [] },
      { id: "in-progress", title: "In Progress", cards: [] },
      { id: "done", title: "Done", cards: [] },
    ],
  });
}

export function setKanbanData(data: KanbanData): void {
  setItem("kanban-data", data);
}

// Unified Task Store
const defaultTaskStore: TaskStore = {
  tasks: [],
  columnOrder: { "todo": [], "in-progress": [], "done": [] },
  habitCompletions: {},
};

export function getTaskStore(): TaskStore {
  return getItem("task-store", defaultTaskStore);
}

export function setTaskStore(store: TaskStore): void {
  setItem("task-store", store);
}

// Gantt
export function getGanttData(): GanttData {
  return getItem("gantt-data", { tasks: [] });
}

export function setGanttData(data: GanttData): void {
  setItem("gantt-data", data);
}

// Writing Goal
const DEFAULT_WRITING_GOAL = 300;

export function getWritingGoal(): number {
  return getItem("writing-goal", DEFAULT_WRITING_GOAL);
}

export function setWritingGoal(goal: number): void {
  setItem("writing-goal", goal);
}

// Journal Scanning
export function getJournalEntryDates(): string[] {
  if (typeof window === "undefined") return [];
  const dates: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("journal-")) {
      const dateStr = key.substring(8);
      try {
        const raw = localStorage.getItem(key);
        const content = raw ? JSON.parse(raw) : "";
        if (typeof content === "string" && content.trim().length > 0) {
          dates.push(dateStr);
        }
      } catch {
        // skip malformed entries
      }
    }
  }
  return dates;
}

// Journal Search
export type JournalSearchResult = {
  date: string;
  snippet: string;
  wordCount: number;
};

export function searchJournalEntries(query: string): JournalSearchResult[] {
  if (typeof window === "undefined" || !query.trim()) return [];
  const results: JournalSearchResult[] = [];
  const lowerQuery = query.toLowerCase();
  const radius = 60;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("journal-")) {
      const dateStr = key.substring(8);
      const content = getJournalEntry(dateStr);
      const matchIndex = content.toLowerCase().indexOf(lowerQuery);
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - radius);
        const end = Math.min(content.length, matchIndex + query.length + radius);
        let snippet = content.substring(start, end);
        if (start > 0) snippet = "..." + snippet;
        if (end < content.length) snippet = snippet + "...";
        results.push({
          date: dateStr,
          snippet,
          wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
        });
      }
    }
  }
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// Habit Streaks
export function calculateHabitStreak(
  taskId: string,
  habitCompletions: { [date: string]: { [taskId: string]: boolean } },
  recurrence?: { frequency: "daily" | "weekly" | "monthly"; daysOfWeek?: number[] },
  createdAt?: string
): number {
  if (!recurrence) return 0;
  let streak = 0;
  const today = new Date();
  const current = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = formatDate(current);
    const dow = current.getDay();

    let isActive = false;
    if (recurrence.frequency === "daily") isActive = true;
    else if (recurrence.frequency === "weekly") isActive = (recurrence.daysOfWeek || []).includes(dow);
    else if (recurrence.frequency === "monthly" && createdAt) {
      const cd = new Date(createdAt + "T00:00:00");
      isActive = current.getDate() === cd.getDate();
    }

    if (isActive) {
      if (habitCompletions[dateStr]?.[taskId]) {
        streak++;
      } else {
        break;
      }
    }

    current.setDate(current.getDate() - 1);
  }
  return streak;
}

// Export / Backup
export type ExportData = {
  version: string;
  exportDate: string;
  journals: { [date: string]: string };
  tasks: TaskStore;
  writingGoal: number;
  theme: string;
};

export function exportAllData(): ExportData {
  const journals: { [date: string]: string } = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("journal-")) {
      const dateStr = key.substring(8);
      journals[dateStr] = getJournalEntry(dateStr);
    }
  }
  return {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    journals,
    tasks: getTaskStore(),
    writingGoal: getWritingGoal(),
    theme: getItem("theme", "light"),
  };
}

export function downloadExport(): void {
  const data = exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hobonichi-backup-${data.exportDate.split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Utility
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
