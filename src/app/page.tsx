"use client";

import { useState, useCallback } from "react";
import { DateProvider } from "@/components/date-context";
import { TaskProvider } from "@/components/task-context";
import { Sidebar } from "@/components/sidebar";
import { JournalPage } from "@/components/journal-page";
import { RightPanel } from "@/components/right-panel";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";

export default function Home() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({
    onShowHelp: useCallback(() => setHelpOpen(true), []),
  });

  return (
    <TaskProvider>
      <DateProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <JournalPage
              panelOpen={panelOpen}
              onTogglePanel={() => setPanelOpen((o) => !o)}
            />
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
