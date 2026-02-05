"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useDate } from "@/components/date-context";
import {
  getJournalEntry,
  setJournalEntry,
  getWritingGoal,
  setWritingGoal as persistWritingGoal,
  getJournalSettings,
  setJournalSettings,
  type JournalSettings,
} from "@/lib/storage";
import { eventBus, EVENTS } from "@/lib/events";
import { PanelRight, Eye, Edit3, Search, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchDialog } from "@/components/search-dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

type JournalPageProps = {
  panelOpen: boolean;
  onTogglePanel: () => void;
};

export function JournalPage({ panelOpen, onTogglePanel }: JournalPageProps) {
  const { dateString } = useDate();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(true);
  const [preview, setPreview] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [goal, setGoal] = useState(300);
  const [goalInput, setGoalInput] = useState("300");
  const [remarkPlugin, setRemarkPlugin] = useState<any>(null);
  const [settings, setSettings] = useState<JournalSettings>({
    showWordCount: true,
    showCharCount: true,
    showWritingGoal: true,
    showMarkdownToggle: true,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings and writing goal
  useEffect(() => {
    setSettings(getJournalSettings());
    const g = getWritingGoal();
    setGoal(g);
    setGoalInput(String(g));
  }, []);

  // Load remark-gfm plugin once
  useEffect(() => {
    import("remark-gfm").then((mod) => setRemarkPlugin(() => mod.default));
  }, []);

  // Load entry when date changes
  useEffect(() => {
    setText(getJournalEntry(dateString));
    setSaved(true);
    setPreview(false);
  }, [dateString]);

  // Auto-save with debounce
  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      setSaved(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setJournalEntry(dateString, value);
        setSaved(true);
      }, 500);
    },
    [dateString]
  );

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Event bus listeners
  useEffect(() => {
    const unsubSearch = eventBus.on(EVENTS.SEARCH, () => setSearchOpen(true));
    const unsubPreview = eventBus.on(EVENTS.TOGGLE_PREVIEW, () =>
      setPreview((p) => !p)
    );
    return () => {
      unsubSearch();
      unsubPreview();
    };
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const goalProgress = goal > 0 ? Math.min(wordCount / goal, 1) : 0;

  const handleGoalSave = () => {
    const n = parseInt(goalInput, 10);
    if (n > 0) {
      setGoal(n);
      persistWritingGoal(n);
    }
  };

  const toggleSetting = (key: keyof JournalSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setJournalSettings(next);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-8 py-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {settings.showWordCount && <span>{wordCount} words</span>}
          {settings.showCharCount && <span>{charCount} characters</span>}
          <span>{saved ? "Saved" : "Saving..."}</span>

          {/* Writing goal progress */}
          {settings.showWritingGoal && <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-accent transition-colors"
                title="Writing goal"
              >
                <Target size={13} />
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        goalProgress >= 1
                          ? "bg-green-500"
                          : goalProgress >= 0.5
                            ? "bg-primary"
                            : "bg-primary/60"
                      )}
                      style={{ width: `${goalProgress * 100}%` }}
                    />
                  </div>
                  <span>
                    {wordCount}/{goal}
                  </span>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 space-y-3" align="start">
              <p className="text-xs text-muted-foreground">Daily word goal</p>
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 300, 500, 750, 1000].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setGoal(n);
                      setGoalInput(String(n));
                      persistWritingGoal(n);
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                      goal === n
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Custom:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setGoalInput(v);
                  }}
                  onBlur={handleGoalSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleGoalSave();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-14 border-b border-border bg-transparent px-1 py-0.5 text-center text-xs text-foreground outline-none focus:border-foreground/40 transition-colors"
                />
              </div>
            </PopoverContent>
          </Popover>}
        </div>

        <div className="flex items-center gap-1">
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="rounded-md p-1.5 hover:bg-accent transition-colors"
            title="Search journal (Ctrl+K)"
          >
            <Search size={18} />
          </button>

          {/* Preview toggle */}
          {settings.showMarkdownToggle && (
            <button
              onClick={() => setPreview((p) => !p)}
              className={cn(
                "rounded-md p-1.5 hover:bg-accent transition-colors",
                preview && "text-primary"
              )}
              title={preview ? "Edit mode" : "Preview markdown"}
            >
              {preview ? <Edit3 size={18} /> : <Eye size={18} />}
            </button>
          )}

          {/* Settings */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="rounded-md p-1.5 hover:bg-accent transition-colors"
                title="Toolbar settings"
              >
                <Settings size={18} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 space-y-1 p-3" align="end">
              <p className="text-xs text-muted-foreground mb-2">Toolbar</p>
              {([
                ["showWordCount", "Word count"],
                ["showCharCount", "Character count"],
                ["showWritingGoal", "Writing goal"],
                ["showMarkdownToggle", "Markdown preview"],
              ] as const).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-foreground/5 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={settings[key]}
                    onCheckedChange={() => toggleSetting(key)}
                  />
                  <span className="text-xs text-foreground/80">{label}</span>
                </label>
              ))}
            </PopoverContent>
          </Popover>

          {/* Panel toggle */}
          <button
            onClick={onTogglePanel}
            className={cn(
              "rounded-md p-1.5 hover:bg-accent transition-colors",
              panelOpen && "text-primary"
            )}
            title={panelOpen ? "Close panel" : "Open panel"}
          >
            <PanelRight size={18} />
          </button>
        </div>
      </div>

      {/* Journal writing area / preview */}
      <div className="relative flex-1 overflow-y-auto grid-paper-subtle">
        {preview ? (
          <div className="journal-prose px-8 py-6">
            {ReactMarkdown && (
              <ReactMarkdown
                remarkPlugins={remarkPlugin ? [remarkPlugin] : []}
              >
                {text || "*Nothing written yet...*"}
              </ReactMarkdown>
            )}
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Start writing..."
            className="h-full w-full resize-none bg-transparent px-8 py-6 text-base leading-[24px] placeholder:text-muted-foreground/40 focus:outline-none"
            style={{ lineHeight: "24px" }}
          />
        )}
      </div>

      {/* Search dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
