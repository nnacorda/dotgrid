"use client";

import { useEffect } from "react";
import { eventBus, EVENTS } from "@/lib/events";

type Options = {
  onShowHelp: () => void;
};

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts({ onShowHelp }: Options) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd shortcuts — work even in inputs
      if (mod && e.key === "n") {
        e.preventDefault();
        eventBus.emit(EVENTS.NEW_TASK);
        return;
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        eventBus.emit(EVENTS.SEARCH);
        return;
      }
      if (mod && e.key === "e") {
        e.preventDefault();
        eventBus.emit(EVENTS.TOGGLE_PREVIEW);
        return;
      }

      // Plain-key shortcuts — skip when user is typing
      if (isEditable(e.target)) return;

      if (e.key === "?" && !mod && !e.altKey) {
        e.preventDefault();
        onShowHelp();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onShowHelp]);
}
