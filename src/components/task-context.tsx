"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getTaskStore,
  setTaskStore,
  generateId,
  type Task,
  type TaskStore,
} from "@/lib/storage";

type TaskContextType = {
  tasks: Task[];
  addTask: (data: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderColumn: (status: Task["status"], orderedIds: string[]) => void;
  getColumnOrder: (status: Task["status"]) => string[];
  moveTask: (
    id: string,
    fromStatus: Task["status"],
    toStatus: Task["status"],
    srcOrder: string[],
    destOrder: string[]
  ) => void;
  getHabitCompletion: (date: string, taskId: string) => boolean;
  toggleHabitCompletion: (date: string, taskId: string) => void;
  getHabitsForDate: (date: string) => Task[];
  getHabitCompletions: () => { [date: string]: { [taskId: string]: boolean } };
};

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<TaskStore>({
    tasks: [],
    columnOrder: { todo: [], "in-progress": [], done: [] },
    habitCompletions: {},
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = getTaskStore();
    setStore({ ...stored, habitCompletions: stored.habitCompletions || {} });
    setLoaded(true);
  }, []);

  const persist = useCallback((next: TaskStore) => {
    setStore(next);
    setTaskStore(next);
  }, []);

  const addTask = useCallback(
    (data: Omit<Task, "id" | "createdAt">) => {
      const id = generateId();
      const task: Task = {
        ...data,
        id,
        createdAt: new Date().toISOString().split("T")[0],
      };
      const next: TaskStore = {
        ...store,
        tasks: [...store.tasks, task],
        columnOrder: {
          ...store.columnOrder,
          [task.status]: [...store.columnOrder[task.status], id],
        },
      };
      persist(next);
    },
    [store, persist]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      const oldTask = store.tasks.find((t) => t.id === id);
      if (!oldTask) return;

      const newTask = { ...oldTask, ...updates };

      // Sync completed <-> status
      if (updates.status !== undefined && updates.completed === undefined) {
        newTask.completed = updates.status === "done";
      }
      if (updates.completed !== undefined && updates.status === undefined) {
        newTask.status = updates.completed ? "done" : "todo";
      }

      let columnOrder = { ...store.columnOrder };

      // If status changed, move between column orders
      if (newTask.status !== oldTask.status) {
        columnOrder = {
          ...columnOrder,
          [oldTask.status]: columnOrder[oldTask.status].filter(
            (tid) => tid !== id
          ),
          [newTask.status]: [...columnOrder[newTask.status], id],
        };
      }

      persist({
        ...store,
        tasks: store.tasks.map((t) => (t.id === id ? newTask : t)),
        columnOrder,
      });
    },
    [store, persist]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const task = store.tasks.find((t) => t.id === id);
      if (!task) return;
      persist({
        ...store,
        tasks: store.tasks.filter((t) => t.id !== id),
        columnOrder: {
          todo: store.columnOrder.todo.filter((tid) => tid !== id),
          "in-progress": store.columnOrder["in-progress"].filter(
            (tid) => tid !== id
          ),
          done: store.columnOrder.done.filter((tid) => tid !== id),
        },
      });
    },
    [store, persist]
  );

  const reorderColumn = useCallback(
    (status: Task["status"], orderedIds: string[]) => {
      persist({
        ...store,
        columnOrder: { ...store.columnOrder, [status]: orderedIds },
      });
    },
    [store, persist]
  );

  const moveTask = useCallback(
    (
      id: string,
      fromStatus: Task["status"],
      toStatus: Task["status"],
      srcOrder: string[],
      destOrder: string[]
    ) => {
      const oldTask = store.tasks.find((t) => t.id === id);
      if (!oldTask) return;

      const newTask = {
        ...oldTask,
        status: toStatus,
        completed: toStatus === "done",
      };

      persist({
        ...store,
        tasks: store.tasks.map((t) => (t.id === id ? newTask : t)),
        columnOrder: {
          ...store.columnOrder,
          [fromStatus]: srcOrder,
          [toStatus]: destOrder,
        },
      });
    },
    [store, persist]
  );

  const getHabitCompletion = useCallback(
    (date: string, taskId: string): boolean => {
      return !!store.habitCompletions[date]?.[taskId];
    },
    [store]
  );

  const toggleHabitCompletion = useCallback(
    (date: string, taskId: string) => {
      const dateCompletions = store.habitCompletions[date] || {};
      const next: TaskStore = {
        ...store,
        habitCompletions: {
          ...store.habitCompletions,
          [date]: { ...dateCompletions, [taskId]: !dateCompletions[taskId] },
        },
      };
      persist(next);
    },
    [store, persist]
  );

  const getHabitsForDate = useCallback(
    (date: string): Task[] => {
      const d = new Date(date + "T00:00:00");
      return store.tasks.filter((t) => {
        if (!t.isHabit || !t.recurrence) return false;
        const { frequency, daysOfWeek } = t.recurrence;
        if (frequency === "daily") return true;
        if (frequency === "weekly") return (daysOfWeek || []).includes(d.getDay());
        if (frequency === "monthly") {
          const createdDate = new Date(t.createdAt + "T00:00:00");
          return d.getDate() === createdDate.getDate();
        }
        return false;
      });
    },
    [store]
  );

  const getColumnOrder = useCallback(
    (status: Task["status"]) => {
      const order = store.columnOrder[status] || [];
      const taskIds = new Set(
        store.tasks.filter((t) => t.status === status).map((t) => t.id)
      );
      // Return ordered IDs that exist, then append any missing ones
      const ordered = order.filter((id) => taskIds.has(id));
      const missing = [...taskIds].filter((id) => !order.includes(id));
      return [...ordered, ...missing];
    },
    [store]
  );

  const getHabitCompletions = useCallback(
    () => store.habitCompletions,
    [store]
  );

  if (!loaded) return null;

  return (
    <TaskContext.Provider
      value={{
        tasks: store.tasks,
        addTask,
        updateTask,
        deleteTask,
        reorderColumn,
        getColumnOrder,
        moveTask,
        getHabitCompletion,
        toggleHabitCompletion,
        getHabitsForDate,
        getHabitCompletions,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
}
