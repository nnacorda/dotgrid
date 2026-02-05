"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthPanel } from "@/components/month-panel";

type RightPanelProps = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 300;
const MAX_WIDTH_RATIO = 0.4; // 40% of viewport

export function RightPanel({ open, onClose }: RightPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const viewportWidth = window.innerWidth;
      const maxWidth = viewportWidth * MAX_WIDTH_RATIO;
      const newWidth = viewportWidth - e.clientX;
      setWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className={cn(
        "relative flex h-full shrink-0 flex-col border-l border-border bg-background transition-[width] duration-300 ease-in-out overflow-hidden",
        !open && "w-0 border-l-0"
      )}
      style={open ? { width: `${width}px` } : undefined}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-10"
      />

      {/* Close button */}
      <div className="shrink-0 flex items-center justify-end px-3 py-2">
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <MonthPanel />
      </div>
    </div>
  );
}
