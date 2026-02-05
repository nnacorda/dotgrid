"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MonthPanel } from "@/components/month-panel";

type RightPanelProps = {
  open: boolean;
  onClose: () => void;
};

const MIN_WIDTH = 300;
const MAX_WIDTH_RATIO = 0.4; // 40% of viewport

export function RightPanel({ open, onClose }: RightPanelProps) {
  const [width, setWidth] = useState(380);
  const isDragging = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Set initial width to max on mount
  useEffect(() => {
    setWidth(Math.floor(window.innerWidth * MAX_WIDTH_RATIO));
  }, []);

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

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <MonthPanel />
      </div>
    </div>
  );
}
