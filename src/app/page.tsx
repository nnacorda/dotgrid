"use client";

import { useState, useCallback, useEffect } from "react";
import { DateProvider } from "@/components/date-context";
import { TaskProvider } from "@/components/task-context";
import { Sidebar } from "@/components/sidebar";
import { JournalPage } from "@/components/journal-page";
import { RightPanel } from "@/components/right-panel";
import { YearView } from "@/components/year-view";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";

export default function Home() {
  const [panelOpen, setPanelOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("panel-open");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("panel-open", JSON.stringify(panelOpen));
  }, [panelOpen]);

  const [yearView, setYearView] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("ui-year-view");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("ui-year-view", JSON.stringify(yearView));
  }, [yearView]);

  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({
    onShowHelp: useCallback(() => setHelpOpen(true), []),
  });

  return (
    <TaskProvider>
      <DateProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar
            yearViewActive={yearView}
            onToggleYearView={() => setYearView((v: boolean) => !v)}
          />
          <main className="flex-1 overflow-hidden">
            {yearView ? (
              <YearView
                panelOpen={panelOpen}
                onTogglePanel={() => setPanelOpen((o: boolean) => !o)}
                onNavigateToDate={() => setYearView(false)}
              />
            ) : (
              <JournalPage
                panelOpen={panelOpen}
                onTogglePanel={() => setPanelOpen((o: boolean) => !o)}
              />
            )}
          </main>
          <RightPanel
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
          />
        </div>
        <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
      </DateProvider>
    </TaskProvider>
  );
}
