"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Repeat, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/storage";

const CARD_COLORS = [
  "#C4956A",
  "#D4847C",
  "#8BA89A",
  "#7BA7C4",
  "#B8A9D4",
  "#D4C47C",
];

type Priority = Task["priority"];
type Status = Task["status"];

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultStatus?: Status;
  onSave: (data: Partial<Task>) => void;
  onDelete?: () => void;
};

const priorityColors: Record<Priority, string> = {
  low: "bg-chart-2/20 text-chart-2 hover:bg-chart-2/30",
  medium: "bg-chart-1/20 text-chart-1 hover:bg-chart-1/30",
  high: "bg-destructive/20 text-destructive hover:bg-destructive/30",
};

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus,
  onSave,
  onDelete,
}: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [startDate, setStartDate] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState<string | undefined>();
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [status, setStatus] = useState<Status>(defaultStatus || "todo");
  const [isHabit, setIsHabit] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  const isEditing = !!task;

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || "");
        setPriority(task.priority);
        setStatus(task.status);
        setStartDate(task.startDate);
        setDueDate(task.dueDate);
        setColor(task.color);
        setIsHabit(task.isHabit || false);
        setFrequency(task.recurrence?.frequency || "daily");
        setDaysOfWeek(task.recurrence?.daysOfWeek || []);
      } else {
        setTitle("");
        setDescription("");
        setPriority("medium");
        setStatus(defaultStatus || "todo");
        setStartDate(undefined);
        setDueDate(undefined);
        setColor(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
        setIsHabit(false);
        setFrequency("daily");
        setDaysOfWeek([]);
      }
    }
  }, [open, task]);

  const handleSave = () => {
    if (!title.trim()) return;
    const data: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      startDate,
      dueDate,
      color,
      isHabit,
      recurrence: isHabit
        ? { frequency, daysOfWeek: frequency === "weekly" ? daysOfWeek : undefined }
        : undefined,
    };
    data.status = status;
    data.completed = status === "done";
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing
              ? "Edit the task details below"
              : "Fill in the details to create a new task"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Task name
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="What needs to be done?"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Priority
            </label>
            <div className="flex gap-1">
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs capitalize transition-colors",
                    priority === p
                      ? priorityColors[p]
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Status
            </label>
            <div className="flex gap-1">
              {(["todo", "in-progress", "done"] as Status[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs capitalize transition-colors",
                    status === s
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s === "todo" ? "To Do" : s === "in-progress" ? "In Progress" : "Done"}
                </button>
              ))}
            </div>
          </div>

          {/* Dates row */}
          <div className="flex gap-4">
            {/* Start date */}
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Start date
              </label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon size={14} />
                    {startDate ? formatDateDisplay(startDate) : "Pick a date"}
                    {startDate && (
                      <span
                        role="button"
                        className="ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStartDate(undefined);
                        }}
                      >
                        <X size={12} />
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate + "T00:00:00") : undefined}
                    onSelect={(date) => {
                      setStartDate(date ? toDateString(date) : undefined);
                      setStartDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due date */}
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Due date
              </label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon size={14} />
                    {dueDate ? formatDateDisplay(dueDate) : "Pick a date"}
                    {dueDate && (
                      <span
                        role="button"
                        className="ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDueDate(undefined);
                        }}
                      >
                        <X size={12} />
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate ? new Date(dueDate + "T00:00:00") : undefined}
                    onSelect={(date) => {
                      setDueDate(date ? toDateString(date) : undefined);
                      setDueDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
            />
          </div>

          {/* Recurring habit */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-habit"
                checked={isHabit}
                onCheckedChange={(checked) => setIsHabit(checked === true)}
              />
              <label htmlFor="is-habit" className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Repeat size={14} className="text-muted-foreground" />
                Recurring habit
              </label>
            </div>
            {isHabit && (
              <div className="space-y-3 pl-6">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Frequency
                  </label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                    <SelectTrigger className="w-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {frequency === "weekly" && (
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Days of week
                    </label>
                    <div className="flex gap-1">
                      {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setDaysOfWeek((prev) =>
                              prev.includes(i)
                                ? prev.filter((d) => d !== i)
                                : [...prev, i]
                            )
                          }
                          className={cn(
                            "h-7 w-7 rounded-full text-xs transition-colors",
                            daysOfWeek.includes(i)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {frequency === "monthly" && (
                  <p className="text-xs text-muted-foreground">
                    Repeats on the same day of the month as creation date.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Color
            </label>
            <div className="flex gap-2">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform",
                    color === c && "scale-125 ring-2 ring-ring ring-offset-2"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
