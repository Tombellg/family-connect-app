"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./calendar.module.css";

type ViewMode = "month" | "list";

type MonthCell = {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
};

type CalendarItem = {
  id: string;
  type: "event" | "task";
  title: string;
  subtitle?: string;
  timeLabel: string | null;
  dateKey: string;
  color?: string;
  sourceId: string;
  rawDate: Date | null;
};

const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildMonthMatrix = (current: Date): MonthCell[][] => {
  const start = new Date(current.getFullYear(), current.getMonth(), 1);
  const startWeekday = (start.getDay() + 6) % 7;
  const firstVisible = new Date(start.getFullYear(), start.getMonth(), 1 - startWeekday);
  const weeks: MonthCell[][] = [];
  let pointer = new Date(firstVisible);

  for (let week = 0; week < 6; week += 1) {
    const row: MonthCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const cellDate = new Date(pointer);
      row.push({
        date: cellDate,
        key: formatDateKey(cellDate),
        isCurrentMonth: cellDate.getMonth() === current.getMonth(),
      });
      pointer.setDate(pointer.getDate() + 1);
    }
    weeks.push(row);
  }

  return weeks;
};

const formatListLabel = (value: Date) =>
  value.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default function CalendarPage() {
  const { events, taskLists, createEvent } = useDashboard();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [popover, setPopover] = useState<{ item: CalendarItem; position: { top: number; left: number } } | null>(null);
  const [eventDraft, setEventDraft] = useState({
    summary: "",
    date: formatDateKey(new Date()),
    allDay: true,
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    description: "",
  });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  type SourceOption = { id: string; label: string; color?: string };

  const sources = useMemo<SourceOption[]>(() => {
    const base: SourceOption[] = [{ id: "calendar", label: "Agenda Google" }];
    const tasks = taskLists.map<SourceOption>((list) => ({
      id: `task:${list.id}`,
      label: list.title,
      color: list.color,
    }));
    return [...base, ...tasks];
  }, [taskLists]);

  const [enabledSources, setEnabledSources] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!sources.length) {
      return;
    }
    setEnabledSources(new Set(sources.map((source) => source.id)));
  }, [sources]);

  useEffect(() => {
    if (!popover) {
      return;
    }
    const handleClose = () => setPopover(null);
    window.addEventListener("pointerdown", handleClose, { once: true });
    return () => window.removeEventListener("pointerdown", handleClose);
  }, [popover]);

  const toggleSource = (id: string) => {
    setEnabledSources((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const addItem = (item: CalendarItem) => {
      if (!enabledSources.has(item.sourceId)) {
        return;
      }
      if (!map.has(item.dateKey)) {
        map.set(item.dateKey, []);
      }
      map.get(item.dateKey)?.push(item);
    };

    if (enabledSources.has("calendar")) {
      events.forEach((event) => {
        if (!event.start.iso) {
          return;
        }
        const startDate = new Date(event.start.iso);
        const key = event.start.iso.split("T")[0];
        addItem({
          id: event.id,
          type: "event",
          title: event.summary,
          subtitle: event.location,
          timeLabel: event.isAllDay
            ? "Toute la journée"
            : startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          dateKey: key,
          color: "#38bdf8",
          sourceId: "calendar",
          rawDate: event.isAllDay ? null : startDate,
        });
      });
    }

    taskLists.forEach((list) => {
      const sourceId = `task:${list.id}`;
      list.tasks.forEach((task) => {
        if (!task.due?.iso || task.status === "completed") {
          return;
        }
        const key = task.due.iso.split("T")[0];
        addItem({
          id: task.id,
          type: "task",
          title: task.title,
          subtitle: list.title,
          timeLabel: "Tâche",
          dateKey: key,
          color: list.color,
          sourceId,
          rawDate: null,
        });
      });
    });

    map.forEach((items, key) => {
      items.sort((a, b) => {
        if (a.rawDate && b.rawDate) {
          return a.rawDate.getTime() - b.rawDate.getTime();
        }
        if (a.rawDate) return -1;
        if (b.rawDate) return 1;
        return a.title.localeCompare(b.title);
      });
    });

    return map;
  }, [enabledSources, events, taskLists]);

  const listItems = useMemo(() => {
    const days = Array.from(itemsByDay.keys()).sort();
    const flattened: { key: string; label: string; items: CalendarItem[] }[] = [];
    days.forEach((key) => {
      const date = new Date(key);
      flattened.push({ key, label: formatListLabel(date), items: itemsByDay.get(key) ?? [] });
    });
    return flattened;
  }, [itemsByDay]);

  const selectedKey = formatDateKey(selectedDate);
  const dayItems = itemsByDay.get(selectedKey) ?? [];

  const weeks = useMemo(() => buildMonthMatrix(currentMonth), [currentMonth]);

  const handleCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventDraft.summary.trim()) {
      setFormMessage("Donnez un titre à l'évènement");
      return;
    }
    setCreatingEvent(true);
    setFormMessage(null);
    try {
      await createEvent({
        summary: eventDraft.summary,
        date: eventDraft.date,
        allDay: eventDraft.allDay,
        startTime: eventDraft.allDay ? null : eventDraft.startTime,
        endTime: eventDraft.allDay ? null : eventDraft.endTime,
        location: eventDraft.location || undefined,
        description: eventDraft.description || undefined,
      });
      setFormMessage("Évènement ajouté !");
      setEventDraft((current) => ({
        ...current,
        summary: "",
        description: "",
        location: "",
      }));
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Impossible d'ajouter l'évènement");
    } finally {
      setCreatingEvent(false);
    }
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Calendrier familial</h1>
          <p>Visualisez évènements et tâches dans une vue mensuelle immersive ou en liste détaillée.</p>
        </div>
        <div className={styles.viewToggle} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "month"}
            onClick={() => setViewMode("month")}
            className={viewMode === "month" ? styles.viewActive : undefined}
          >
            Vue mensuelle
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "list"}
            onClick={() => setViewMode("list")}
          >
            Vue agenda
          </button>
        </div>
      </header>

      <form className={styles.eventComposer} onSubmit={handleCreateEvent}>
        <div className={styles.eventRow}>
          <label>
            Titre
            <input
              type="text"
              value={eventDraft.summary}
              onChange={(event) => setEventDraft((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Ex: Réunion parents-professeur"
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={eventDraft.date}
              onChange={(event) => setEventDraft((current) => ({ ...current, date: event.target.value }))}
              required
            />
          </label>
          <label className={styles.allDayToggle}>
            <input
              type="checkbox"
              checked={eventDraft.allDay}
              onChange={(event) => setEventDraft((current) => ({ ...current, allDay: event.target.checked }))}
            />
            Journée entière
          </label>
          {!eventDraft.allDay ? (
            <>
              <label>
                Début
                <input
                  type="time"
                  value={eventDraft.startTime}
                  onChange={(event) => setEventDraft((current) => ({ ...current, startTime: event.target.value }))}
                  required
                />
              </label>
              <label>
                Fin
                <input
                  type="time"
                  value={eventDraft.endTime}
                  onChange={(event) => setEventDraft((current) => ({ ...current, endTime: event.target.value }))}
                  required
                />
              </label>
            </>
          ) : null}
          <button type="submit" disabled={creatingEvent}>
            {creatingEvent ? "Ajout…" : "Créer"}
          </button>
        </div>
        <div className={styles.eventExtras}>
          <input
            type="text"
            value={eventDraft.location}
            onChange={(event) => setEventDraft((current) => ({ ...current, location: event.target.value }))}
            placeholder="Lieu (facultatif)"
          />
          <textarea
            value={eventDraft.description}
            onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="Notes ou participants"
          />
          {formMessage ? <span className={styles.formMessage}>{formMessage}</span> : null}
        </div>
      </form>

      <div className={styles.sourceFilters}>
        {sources.map((source) => (
          <label key={source.id} className={enabledSources.has(source.id) ? styles.filterActive : undefined}>
            <input
              type="checkbox"
              checked={enabledSources.has(source.id)}
              onChange={() => toggleSource(source.id)}
            />
            <span>
              <span className={styles.filterDot} style={source.color ? { backgroundColor: source.color } : undefined} />
              {source.label}
            </span>
          </label>
        ))}
      </div>

      {viewMode === "month" ? (
        <section className={styles.monthView}>
          <div className={styles.monthHeader}>
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Mois précédent">
              ←
            </button>
            <h2>{currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Mois suivant">
              →
            </button>
          </div>
          <div className={styles.weekDays}>
            {["L", "M", "M", "J", "V", "S", "D"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className={styles.grid}>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className={styles.weekRow}>
                {week.map((cell) => {
                  const items = itemsByDay.get(cell.key) ?? [];
                  const isSelected = cell.key === selectedKey;
                  return (
                    <div
                      key={cell.key}
                      className={`${styles.dayCell} ${cell.isCurrentMonth ? "" : styles.dayMuted} ${
                        isSelected ? styles.daySelected : ""
                      }`}
                      onClick={() => setSelectedDate(cell.date)}
                    >
                      <header>
                        <span>{cell.date.getDate()}</span>
                      </header>
                      <ul>
                        {items.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const rect = event.currentTarget.getBoundingClientRect();
                                setPopover({
                                  item,
                                  position: {
                                    top: rect.top + window.scrollY + rect.height + 8,
                                    left: rect.left + window.scrollX + rect.width / 2,
                                  },
                                });
                              }}
                              style={item.color ? { borderColor: item.color } : undefined}
                            >
                              <span>{item.timeLabel ?? ""}</span>
                              <strong>{item.title}</strong>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <aside className={styles.dayDetails}>
            <h3>{formatListLabel(selectedDate)}</h3>
            <ul>
              {dayItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                  {item.subtitle ? <small>{item.subtitle}</small> : null}
                </li>
              ))}
              {!dayItems.length ? <li className={styles.empty}>Aucun évènement ou tâche ce jour-là.</li> : null}
            </ul>
          </aside>
        </section>
      ) : (
        <section className={styles.agendaView}>
          {listItems.map((section) => (
            <article key={section.key}>
              <h3>{section.label}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item.id}>
                    <span className={styles.timeBadge}>{item.timeLabel ?? "Toute la journée"}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {item.subtitle ? <small>{item.subtitle}</small> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {!listItems.length ? <p className={styles.empty}>Aucun élément à afficher pour le moment.</p> : null}
        </section>
      )}

      {popover ? (
        <div className={styles.popover} style={{ top: popover.position.top, left: popover.position.left }}>
          <strong>{popover.item.title}</strong>
          {popover.item.timeLabel ? <span>{popover.item.timeLabel}</span> : null}
          {popover.item.subtitle ? <small>{popover.item.subtitle}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
