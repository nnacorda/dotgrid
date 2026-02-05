"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchJournalEntries, type JournalSearchResult } from "@/lib/storage";
import { useDate } from "@/components/date-context";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JournalSearchResult[]>([]);
  const { setSelectedDate } = useDate();

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim().length >= 2) {
        setResults(searchJournalEntries(value));
      } else {
        setResults([]);
      }
    },
    []
  );

  const handleSelect = (dateStr: string) => {
    setSelectedDate(new Date(dateStr + "T00:00:00"));
    onOpenChange(false);
    setQuery("");
    setResults([]);
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const highlightMatch = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-3">
        <DialogHeader>
          <DialogTitle>Search Journal</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search entries..."
            className="pl-8"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {results.length === 0 && query.trim().length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No entries found
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.date}
              onClick={() => handleSelect(r.date)}
              className="w-full text-left rounded-md px-3 py-2 hover:bg-accent transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium">
                  {formatDisplayDate(r.date)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.wordCount} words
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {highlightMatch(r.snippet)}
              </p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
