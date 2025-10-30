"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ListBulletIcon, MagnifyingGlassIcon, PlusIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import type { FormattedTaskList } from "@/lib/google";
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

type SourceOption = { id: string; label: string; color?: string };

type ParsedRule = {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  count?: number;
  until?: Date;
  byWeekdays?: number[];
  monthDay?: number | null;
};

const WEEKDAY_INDEX: Record<string, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 0,
};

const COLOR_POOL = ["#38bdf8", "#818cf8", "#f472b6", "#22d3ee", "#facc15", "#4ade80", "#fb7185"];

const MAX_DAY_PREVIEW = 4;
const MAX_DAY_DETAILS = 6;
const MAX_AGENDA_SECTIONS = 8;
const MAX_AGENDA_ITEMS_PER_DAY = 4;

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

function parseRule(rule?: string | null): ParsedRule | null {
  if (!rule || !rule.startsWith("RRULE:")) {
    return null;
  }
  const parts = rule.replace("RRULE:", "").split(";");
  const payload: ParsedRule = {
    freq: "DAILY",
    interval: 1,
    byWeekdays: undefined,
    monthDay: null,
  };

  parts.forEach((part) => {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey.toUpperCase();
    const value = rawValue ?? "";
    if (key === "FREQ" && (value === "DAILY" || value === "WEEKLY" || value === "MONTHLY" || value === "YEARLY")) {
      payload.freq = value;
    } else if (key === "INTERVAL") {
      payload.interval = Number.parseInt(value, 10) || 1;
    } else if (key === "COUNT") {
      payload.count = Number.parseInt(value, 10) || undefined;
    } else if (key === "UNTIL") {
      const until = value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
      const parsed = new Date(until);
      if (!Number.isNaN(parsed.getTime())) {
        payload.until = parsed;
      }
    } else if (key === "BYDAY") {
      payload.byWeekdays = value
        .split(",")
        .map((token) => WEEKDAY_INDEX[token])
        .filter((day): day is number => day !== undefined)
        .sort((a, b) => a - b);
    } else if (key === "BYMONTHDAY") {
      payload.monthDay = Number.parseInt(value, 10) || null;
    }
  });

  return payload;
}

function expandTaskOccurrences(task: FormattedTaskList["tasks"][number], limit = 48): Date[] {
  if (!task.due?.iso) {
    return [];
  }
  if (!task.recurrence?.length) {
    return [new Date(task.due.iso)];
  }
  const primary = parseRule(task.recurrence[0]);
  if (!primary) {
    return [new Date(task.due.iso)];
  }

  const occurrences: Date[] = [];
  const start = new Date(task.due.iso);
  start.setHours(0, 0, 0, 0);
  const pushOccurrence = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    if (primary.until && normalized > primary.until) {
      return;
    }
    occurrences.push(normalized);
  };

  if (primary.freq === "DAILY") {
    let pointer = new Date(start);
    let count = 0;
    while (occurrences.length < limit && (!primary.count || count < primary.count)) {
      pushOccurrence(pointer);
      pointer = new Date(pointer.getFullYear(), pointer.getMonth(), pointer.getDate() + primary.interval);
      count += 1;
    }
    return occurrences;
  }

  if (primary.freq === "WEEKLY") {
    const weekdays = (primary.byWeekdays?.length ? primary.byWeekdays : [start.getDay()])
      .map((day) => (day + 7) % 7)
      .sort((a, b) => a - b);
    let weekAnchor = new Date(start);
    weekAnchor.setDate(weekAnchor.getDate() - ((weekAnchor.getDay() + 6) % 7));
    let generated = 0;
    while (occurrences.length < limit && (!primary.count || generated < primary.count)) {
      weekdays.forEach((weekday) => {
        if (occurrences.length >= limit || (primary.count && generated >= primary.count)) {
          return;
        }
        const candidate = new Date(weekAnchor);
        candidate.setDate(weekAnchor.getDate() + weekday);
        if (candidate < start) {
          return;
        }
        pushOccurrence(candidate);
        generated += 1;
      });
      weekAnchor = new Date(weekAnchor.getFullYear(), weekAnchor.getMonth(), weekAnchor.getDate() + primary.interval * 7);
    }
    return occurrences;
  }

  if (primary.freq === "MONTHLY") {
    const monthDay = primary.monthDay ?? start.getDate();
    let pointer = new Date(start.getFullYear(), start.getMonth(), monthDay);
    let count = 0;
    while (occurrences.length < limit && (!primary.count || count < primary.count)) {
      if (pointer >= start) {
        pushOccurrence(pointer);
      }
      pointer = new Date(pointer.getFullYear(), pointer.getMonth() + primary.interval, monthDay);
      count += 1;
    }
    return occurrences;
  }

  if (primary.freq === "YEARLY") {
    let pointer = new Date(start);
    let count = 0;
    while (occurrences.length < limit && (!primary.count || count < primary.count)) {
      if (pointer >= start) {
        pushOccurrence(pointer);
      }
      pointer = new Date(pointer.getFullYear() + primary.interval, pointer.getMonth(), pointer.getDate());
      count += 1;
    }
    return occurrences;
  }

  return [start];
}

export default function CalendarPage() {
  const { events, taskLists, createEvent } = useDashboard();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
  const [showComposer, setShowComposer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const paletteBySource = useMemo(() => {
    const map = new Map<string, string>();
    let index = 0;
    map.set("calendar", COLOR_POOL[index % COLOR_POOL.length]);
    index += 1;
    taskLists.forEach((list) => {
      const sourceId = `task:${list.id}`;
      if (!map.has(sourceId)) {
        map.set(sourceId, list.color ?? COLOR_POOL[index % COLOR_POOL.length]);
        index += 1;
      }
    });
    return map;
  }, [taskLists]);

  const sources = useMemo<SourceOption[]>(() => {
    const base: SourceOption[] = [{ id: "calendar", label: "Agenda Google", color: paletteBySource.get("calendar") }];
    const tasks = taskLists.map<SourceOption>((list) => ({
      id: `task:${list.id}`,
      label: list.title,
      color: paletteBySource.get(`task:${list.id}`) ?? list.color,
    }));
    return [...base, ...tasks];
  }, [paletteBySource, taskLists]);

  const [enabledSources, setEnabledSources] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!sources.length) {
      return;
    }
    setEnabledSources(new Set(sources.map((source) => source.id)));
  }, [sources]);

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
          color: paletteBySource.get("calendar"),
          sourceId: "calendar",
          rawDate: event.isAllDay ? null : startDate,
        });
      });
    }

    taskLists.forEach((list) => {
      const sourceId = `task:${list.id}`;
      list.tasks.forEach((task) => {
        const occurrences = expandTaskOccurrences(task);
        occurrences.forEach((date, occurrenceIndex) => {
          const key = formatDateKey(date);
          addItem({
            id: `${task.id}:${occurrenceIndex}`,
            type: "task",
            title: task.title,
            subtitle: list.title,
            timeLabel: task.recurrence?.length ? "Tâche récurrente" : "Tâche",
            dateKey: key,
            color: paletteBySource.get(sourceId) ?? list.color,
            sourceId,
            rawDate: date,
          });
        });
      });
    });

    map.forEach((items) => {
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
  }, [enabledSources, events, paletteBySource, taskLists]);

  const filteredItemsByDay = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return itemsByDay;
    }
    const map = new Map<string, CalendarItem[]>();
    itemsByDay.forEach((items, key) => {
      const matches = items.filter((item) => {
        const haystack = `${item.title} ${item.subtitle ?? ""}`.toLowerCase();
        return haystack.includes(query);
      });
      if (matches.length) {
        map.set(key, matches);
      }
    });

    map.forEach((items) => {
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
  }, [itemsByDay, searchTerm]);

  const listItems = useMemo(() => {
    const days = Array.from(filteredItemsByDay.keys()).sort();
    return days.map((key) => ({
      key,
      label: formatListLabel(new Date(key)),
      items: filteredItemsByDay.get(key) ?? [],
    }));
  }, [filteredItemsByDay]);

  const selectedKey = formatDateKey(selectedDate);
  const dayItems = filteredItemsByDay.get(selectedKey) ?? [];
  const weeks = useMemo(() => buildMonthMatrix(currentMonth), [currentMonth]);

  const todayKey = formatDateKey(new Date());
  const monthLabel = currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const dayPreview = dayItems.slice(0, MAX_DAY_DETAILS);
  const dayOverflow = Math.max(dayItems.length - dayPreview.length, 0);
  const agendaSections = listItems.slice(0, MAX_AGENDA_SECTIONS);

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

  const handleComposerToggle = () => {
    setFormMessage(null);
    setShowComposer((value) => {
      const next = !value;
      if (!value) {
        setEventDraft((current) => ({ ...current, date: formatDateKey(selectedDate) }));
      }
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={handleComposerToggle}
          aria-expanded={showComposer}
        >
          <PlusIcon aria-hidden="true" />
          <span>{showComposer ? "Fermer l'éditeur" : "Nouvel évènement"}</span>
        </button>
        {showComposer ? (
          <form className={styles.composer} onSubmit={handleCreateEvent}>
            <label>
              <span>Titre</span>
              <input
                type="text"
                value={eventDraft.summary}
                onChange={(event) => setEventDraft((current) => ({ ...current, summary: event.target.value }))}
                required
              />
            </label>
            <div className={styles.composerRow}>
              <label>
                <span>Date</span>
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
                <span>Toute la journée</span>
              </label>
            </div>
            {!eventDraft.allDay ? (
              <div className={styles.timeRow}>
                <label>
                  <span>Début</span>
                  <input
                    type="time"
                    value={eventDraft.startTime}
                    onChange={(event) => setEventDraft((current) => ({ ...current, startTime: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Fin</span>
                  <input
                    type="time"
                    value={eventDraft.endTime}
                    onChange={(event) => setEventDraft((current) => ({ ...current, endTime: event.target.value }))}
                    required
                  />
                </label>
              </div>
            ) : null}
            <label>
              <span>Lieu</span>
              <input
                type="text"
                value={eventDraft.location}
                onChange={(event) => setEventDraft((current) => ({ ...current, location: event.target.value }))}
                placeholder="Lieu"
              />
            </label>
            <label>
              <span>Notes</span>
              <textarea
                value={eventDraft.description}
                onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Notes"
              />
            </label>
            {formMessage ? <p className={styles.formMessage}>{formMessage}</p> : null}
            <div className={styles.formActions}>
              <button type="submit" disabled={creatingEvent}>
                {creatingEvent ? "Ajout…" : "Enregistrer"}
              </button>
              <button type="button" data-variant="ghost" onClick={handleComposerToggle}>
                Fermer
              </button>
            </div>
          </form>
        ) : null}
        <div className={styles.sidebarSection}>
          <header className={styles.sectionHeader}>
            <span>Calendrier</span>
            <div className={styles.monthStepper}>
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Mois précédent">
                <ChevronLeftIcon aria-hidden="true" />
              </button>
              <span>{monthLabel}</span>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Mois suivant">
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </div>
          </header>
          <div className={styles.miniWeekdays}>
            {["L", "M", "M", "J", "V", "S", "D"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className={styles.miniGrid}>
            {weeks.map((week, index) => (
              <div key={index} className={styles.miniRow}>
                {week.map((cell) => {
                  const classes = [
                    styles.miniDay,
                    cell.isCurrentMonth ? "" : styles.miniMuted,
                    cell.key === selectedKey ? styles.miniSelected : "",
                    cell.key === todayKey ? styles.miniToday : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      type="button"
                      key={cell.key}
                      className={classes}
                      onClick={() => {
                        setSelectedDate(cell.date);
                        setCurrentMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                      }}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.sidebarSection}>
          <header className={styles.sectionHeader}>
            <span>Sources visibles</span>
          </header>
          <div className={styles.sourceList}>
            {sources.map((source) => {
              const active = enabledSources.has(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  className={active ? styles.sourceButtonActive : styles.sourceButton}
                  onClick={() => toggleSource(source.id)}
                  aria-pressed={active}
                >
                  <span className={styles.sourceDot} style={source.color ? { backgroundColor: source.color } : undefined} />
                  <span className={styles.sourceLabel}>{source.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
      <section className={styles.content}>
        <header className={styles.toolbar}>
          <div className={styles.toolbarGroup}>
            <span className={styles.monthTitle}>{monthLabel}</span>
            <div className={styles.monthControls}>
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Mois précédent">
                <ChevronLeftIcon aria-hidden="true" />
              </button>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Mois suivant">
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={styles.toolbarGroup}>
            <label className={styles.searchField}>
              <MagnifyingGlassIcon aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher…"
              />
            </label>
            <div className={styles.viewSwitch} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "month"}
                data-active={viewMode === "month" || undefined}
                onClick={() => setViewMode("month")}
              >
                <Squares2X2Icon aria-hidden="true" />
                <span>Mois</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "list"}
                data-active={viewMode === "list" || undefined}
                onClick={() => setViewMode("list")}
              >
                <ListBulletIcon aria-hidden="true" />
                <span>Agenda</span>
              </button>
            </div>
          </div>
        </header>
        {viewMode === "month" ? (
          <div className={styles.monthLayout}>
            <div className={styles.gridWrapper}>
              <div className={styles.weekdayHeader}>
                {["L", "M", "M", "J", "V", "S", "D"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className={styles.monthGrid}>
                {weeks.map((week, index) => (
                  <div key={index} className={styles.weekRow}>
                    {week.map((cell) => {
                      const items = filteredItemsByDay.get(cell.key) ?? [];
                      const preview = items.slice(0, MAX_DAY_PREVIEW);
                      const overflow = Math.max(items.length - preview.length, 0);
                      const cellClasses = [
                        styles.dayButton,
                        cell.isCurrentMonth ? "" : styles.dayMuted,
                        cell.key === selectedKey ? styles.daySelected : "",
                        cell.key === todayKey ? styles.dayToday : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <button
                          type="button"
                          key={cell.key}
                          className={cellClasses}
                          onClick={() => setSelectedDate(cell.date)}
                        >
                          <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                          <div className={styles.eventList}>
                            {preview.map((item) => {
                              const style = item.color
                                ? { borderColor: item.color, backgroundColor: `${item.color}20` }
                                : undefined;
                              return (
                                <span key={item.id} className={styles.eventChip} style={style}>
                                  {item.timeLabel ? <small>{item.timeLabel}</small> : null}
                                  <span>{item.title}</span>
                                </span>
                              );
                            })}
                            {overflow > 0 ? <span className={styles.moreChip}>+{overflow}</span> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <aside className={styles.dayPane}>
              <h3>{formatListLabel(selectedDate)}</h3>
              <ul className={styles.dayList}>
                {dayPreview.map((item) => (
                  <li key={item.id}>
                    <span className={styles.dayBadge} style={item.color ? { backgroundColor: item.color } : undefined} />
                    <div>
                      <strong>{item.title}</strong>
                      {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                      {item.subtitle ? <small>{item.subtitle}</small> : null}
                    </div>
                  </li>
                ))}
                {dayOverflow > 0 ? <li className={styles.dayMore}>+{dayOverflow} autres</li> : null}
                {!dayItems.length ? <li className={styles.empty}>Aucun élément ce jour-là.</li> : null}
              </ul>
            </aside>
          </div>
        ) : (
          <div className={styles.agendaView}>
            {agendaSections.map((section) => {
              const preview = section.items.slice(0, MAX_AGENDA_ITEMS_PER_DAY);
              const overflow = Math.max(section.items.length - preview.length, 0);
              return (
                <article key={section.key} className={styles.agendaSection}>
                  <header>
                    <span>{section.label}</span>
                  </header>
                  <ul>
                    {preview.map((item) => (
                      <li key={item.id}>
                        <span className={styles.timeBadge}>{item.timeLabel ?? "Toute la journée"}</span>
                        <div>
                          <strong>{item.title}</strong>
                          {item.subtitle ? <small>{item.subtitle}</small> : null}
                        </div>
                      </li>
                    ))}
                    {overflow > 0 ? <li className={styles.dayMore}>+{overflow} supplémentaires</li> : null}
                  </ul>
                </article>
              );
            })}
            {!agendaSections.length ? <p className={styles.empty}>Aucun élément à afficher pour le moment.</p> : null}
          </div>
        )}
      </section>
    </div>
  );
}
