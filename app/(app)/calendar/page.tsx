"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { MonthlyCalendar } from "@/components/calendar/MonthlyCalendar";
import styles from "./calendar.module.css";

function normalize(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function CalendarPage() {
  const { events } = useDashboard();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const dailyEvents = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((event) => {
      if (!event.start.iso) {
        return;
      }
      const key = event.start.iso.split("T")[0];
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(event);
    });
    return map;
  }, [events]);

  const markers = useMemo(() => {
    return Array.from(dailyEvents.entries()).map(([date, list]) => ({
      date,
      label: String(list.length),
      color: "rgba(56, 189, 248, 0.9)",
    }));
  }, [dailyEvents]);

  const selectedKey = selectedDate ? selectedDate.toISOString().split("T")[0] : null;
  const eventsForDay = selectedKey ? dailyEvents.get(selectedKey) ?? [] : [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Calendrier familial</h1>
          <p>Visualisez vos évènements Google dans une vue mensuelle moderne.</p>
        </div>
        <button type="button" onClick={() => setSelectedDate(new Date())} className={styles.todayButton}>
          Aujourd’hui
        </button>
      </header>
      <div className={styles.content}>
        <MonthlyCalendar
          month={currentMonth}
          selectedDate={selectedDate}
          onMonthChange={(next) => setCurrentMonth(next)}
          onSelectDate={(date) => {
            setSelectedDate(normalize(date));
            setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
          }}
          markers={markers}
        />
        <section className={styles.eventPanel}>
          <header>
            <h2>
              {selectedDate
                ? selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
                : "Sélectionnez un jour"}
            </h2>
            <span>{eventsForDay.length} évènement(s)</span>
          </header>
          <ul>
            {eventsForDay.map((event) => (
              <li key={event.id}>
                <strong>{event.summary}</strong>
                <span>
                  {event.start.iso
                    ? new Date(event.start.iso).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Toute la journée"}
                </span>
                {event.location ? <small>{event.location}</small> : null}
                {event.description ? <p>{event.description}</p> : null}
              </li>
            ))}
            {!eventsForDay.length ? <li className={styles.empty}>Aucun évènement pour ce jour.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
