"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type DateContextType = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  dateString: string;
};

const DateContext = createContext<DateContextType | null>(null);

export function DateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateString = selectedDate.toISOString().split("T")[0];

  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate, dateString }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error("useDate must be used within a DateProvider");
  }
  return context;
}
