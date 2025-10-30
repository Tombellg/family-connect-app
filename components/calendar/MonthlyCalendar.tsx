"use client";

import { useMemo } from "react";
import styles from "./monthly-calendar.module.css";

type CalendarMarker = {
  date: string;
  color?: string;
  label?: string;
};

type MonthlyCalendarProps = {
  month: Date;
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  onMonthChange?: (next: Date) => void;
  markers?: CalendarMarker[];
  compact?: boolean;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MonthlyCalendar({
  month,
  selectedDate,
  onSelectDate,
  onMonthChange,
  markers = [],
  compact = false,
}: MonthlyCalendarProps) {
  const { weeks, monthLabel, markerMap } = useMemo(() => {
    const firstDay = startOfMonth(month);
    const firstWeekday = firstDay.getDay();
    const startIndex = (firstWeekday + 6) % 7; // Monday first
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Date[] = [];

    for (let i = 0; i < startIndex; i += 1) {
      cells.push(new Date(month.getFullYear(), month.getMonth(), i - startIndex + 1));
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }

    const weeks: Date[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      weeks.push(cells.slice(index, index + 7));
    }

    const monthLabel = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const markerMap = markers.reduce<Record<string, CalendarMarker>>((map, marker) => {
      map[marker.date] = marker;
      return map;
    }, {});

    return { weeks, monthLabel, markerMap };
  }, [markers, month]);

  return (
    <div className={compact ? styles.calendarCompact : styles.calendar}>
      <header className={styles.header}>
        <button type="button" onClick={() => onMonthChange?.(addMonths(month, -1))}>
          ←
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button type="button" onClick={() => onMonthChange?.(addMonths(month, 1))}>
          →
        </button>
      </header>
      <div className={styles.weekHeader}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.weekRow}>
            {week.map((date) => {
              const key = formatKey(date);
              const isCurrentMonth = date.getMonth() === month.getMonth();
              const isSelected = selectedDate && formatKey(date) === formatKey(selectedDate);
              const marker = markerMap[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.day} ${isCurrentMonth ? "" : styles.dayMuted} ${
                    isSelected ? styles.daySelected : ""
                  }`}
                  onClick={() => onSelectDate?.(date)}
                >
                  <span>{date.getDate()}</span>
                  {marker ? <small style={{ backgroundColor: marker.color ?? "var(--accent)" }}>{marker.label}</small> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
