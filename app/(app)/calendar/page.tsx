"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
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
const MAX_AGENDA_SECTIONS = 8;
const MAX_AGENDA_ITEMS_PER_DAY = 4;

const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [rawYear, rawMonth, rawDay] = value.split("-");
  const year = Number.parseInt(rawYear ?? "0", 10);
  const month = Number.parseInt(rawMonth ?? "1", 10) - 1;
  const day = Number.parseInt(rawDay ?? "1", 10);
  return new Date(year, month, day);
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
  const isDesktopViewport = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
  const [menuOpen, setMenuOpen] = useState(() =>
    typeof window === "undefined" ? true : isDesktopViewport()
  );
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : isDesktopViewport()
  );
  const [composerTarget, setComposerTarget] = useState<string | null>(null);
  const [composerPosition, setComposerPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const dayRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const selectedDateRef = useRef<Date | null>(selectedDate);
  const [mobileOverlay, setMobileOverlay] = useState<{
    key: string;
    mode: "agenda" | "composer";
  } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeTransition, setSwipeTransition] = useState(false);
  const swipeStateRef = useRef<{ startX: number; startY: number; active: boolean } | null>(null);
  const swipeLastOffsetRef = useRef(0);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

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
            timeLabel: task.recurrence?.length ? "Récurrente" : null,
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

  const listItems = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    type UpcomingEntry = { key: string; item: CalendarItem; sortDate: Date };
    const upcoming: UpcomingEntry[] = [];

    itemsByDay.forEach((items, key) => {
      items
        .filter((item) => item.type === "event")
        .forEach((item) => {
          const base = item.rawDate ? new Date(item.rawDate) : parseDateKey(key);
          if (base < startOfToday) {
            return;
          }
          upcoming.push({ key, item, sortDate: base });
        });
    });

    upcoming.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    const grouped = new Map<
      string,
      { label: string; items: CalendarItem[] }
    >();
    const order: string[] = [];

    upcoming.forEach(({ key, item }) => {
      if (!grouped.has(key)) {
        grouped.set(key, { label: formatListLabel(parseDateKey(key)), items: [] });
        order.push(key);
      }
      grouped.get(key)!.items.push(item);
    });

    return order.map((key) => ({
      key,
      label: grouped.get(key)!.label,
      items: grouped.get(key)!.items,
    }));
  }, [itemsByDay]);

  const selectedKey = selectedDate ? formatDateKey(selectedDate) : null;
  const weeks = useMemo(() => buildMonthMatrix(currentMonth), [currentMonth]);

  const todayKey = formatDateKey(new Date());
  const monthLabel = currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const agendaSections = listItems.slice(0, MAX_AGENDA_SECTIONS);
  const composerDate = useMemo(() => selectedDate ?? parseDateKey(eventDraft.date), [eventDraft.date, selectedDate]);
  const overlayKey = mobileOverlay?.key ?? null;
  const overlayDate = overlayKey ? parseDateKey(overlayKey) : null;
  const overlayItems = overlayKey ? itemsByDay.get(overlayKey) ?? [] : [];
  const overlayLabel = overlayDate ? formatListLabel(overlayDate) : "";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(min-width: 1024px)");
    const syncMenu = () => {
      setMenuOpen(media.matches);
      setIsDesktop(media.matches);
      if (media.matches) {
        setMobileOverlay(null);
      }
    };
    syncMenu();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncMenu);
      return () => media.removeEventListener("change", syncMenu);
    }
    media.addListener(syncMenu);
    return () => media.removeListener(syncMenu);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("fc:calendar-topbar", {
        detail: { monthLabel, viewMode },
      })
    );
  }, [monthLabel, viewMode]);

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
      window.setTimeout(() => {
        setComposerTarget(null);
        if (!isDesktopViewport()) {
          setMobileOverlay(null);
        }
        setFormMessage(null);
      }, 800);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Impossible d'ajouter l'évènement");
    } finally {
      setCreatingEvent(false);
    }
  };

  const changeMonth = useCallback((offset: number) => {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setComposerTarget(null);
    setFormMessage(null);
  }, []);

  useEffect(() => {
    const handlePrevious = () => changeMonth(-1);
    const handleNext = () => changeMonth(1);
    const handleSetView = (event: Event) => {
      const detail = (event as CustomEvent<{ view?: ViewMode }>).detail;
      if (!detail?.view) {
        return;
      }
      setViewMode(detail.view);
    };

    window.addEventListener("fc:calendar-prev-month", handlePrevious);
    window.addEventListener("fc:calendar-next-month", handleNext);
    window.addEventListener("fc:calendar-set-view", handleSetView);
    return () => {
      window.removeEventListener("fc:calendar-prev-month", handlePrevious);
      window.removeEventListener("fc:calendar-next-month", handleNext);
      window.removeEventListener("fc:calendar-set-view", handleSetView);
    };
  }, [changeMonth, setViewMode]);

  const handleDaySelect = (cell: MonthCell) => {
    const key = formatDateKey(cell.date);
    const sameDay = selectedKey === key;
    setSelectedDate(cell.date);
    setEventDraft((current) => ({ ...current, date: key }));
    setFormMessage(null);
    if (isDesktopViewport()) {
      setMobileOverlay(null);
      setComposerTarget((current) => (current === cell.key && sameDay ? null : cell.key));
      return;
    }
    const items = itemsByDay.get(key) ?? [];
    setComposerTarget(null);
    setMobileOverlay((current) => {
      const targetMode: "agenda" | "composer" = items.length ? "agenda" : "composer";
      if (sameDay && current?.key === key && current.mode === targetMode) {
        return null;
      }
      return { key, mode: targetMode };
    });
  };

  const closeMobileOverlay = useCallback(() => {
    setMobileOverlay(null);
    setComposerTarget(null);
    setFormMessage(null);
  }, []);

  useEffect(() => {
    const handleFocusToday: EventListener = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      setSelectedDate(now);
      setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
      setEventDraft((current) => ({ ...current, date: formatDateKey(now) }));
      closeMobileOverlay();
      window.setTimeout(() => {
        const button = dayRefs.current.get(formatDateKey(now));
        button?.focus();
      }, 0);
    };

    const handleSearchSelect = (event: Event) => {
      const custom = event as CustomEvent<{ dateKey?: string | null }>;
      if (!custom.detail?.dateKey) {
        return;
      }
      const date = parseDateKey(custom.detail.dateKey);
      setSelectedDate(date);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      setEventDraft((current) => ({ ...current, date: formatDateKey(date) }));
      closeMobileOverlay();
      window.setTimeout(() => {
        const button = dayRefs.current.get(formatDateKey(date));
        button?.focus();
      }, 0);
    };

    const handleCreate = () => {
      const base = selectedDateRef.current ?? new Date();
      const normalized = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      const key = formatDateKey(normalized);
      setSelectedDate(normalized);
      setCurrentMonth(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
      setEventDraft((current) => ({ ...current, date: key }));
      setFormMessage(null);
      if (isDesktopViewport()) {
        setComposerTarget(key);
        setMobileOverlay(null);
      } else {
        setComposerTarget(null);
        setMobileOverlay({ key, mode: "composer" });
        setMenuOpen(false);
      }
    };

    window.addEventListener("fc:focus-today", handleFocusToday);
    window.addEventListener("fc:search-select", handleSearchSelect);
    window.addEventListener("fc:create", handleCreate);
    window.addEventListener("fc:create-event", handleCreate);
    return () => {
      window.removeEventListener("fc:focus-today", handleFocusToday);
      window.removeEventListener("fc:search-select", handleSearchSelect);
      window.removeEventListener("fc:create", handleCreate);
      window.removeEventListener("fc:create-event", handleCreate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const openDrawer = () => setMenuOpen(true);
    const closeDrawer = () => {
      if (isDesktopViewport()) {
        return;
      }
      setMenuOpen(false);
    };
    const toggleDrawer = () => setMenuOpen((value) => !value);
    window.addEventListener("fc:open-drawer", openDrawer);
    window.addEventListener("fc:close-drawer", closeDrawer);
    window.addEventListener("fc:toggle-drawer", toggleDrawer);
    return () => {
      window.removeEventListener("fc:open-drawer", openDrawer);
      window.removeEventListener("fc:close-drawer", closeDrawer);
      window.removeEventListener("fc:toggle-drawer", toggleDrawer);
    };
  }, []);

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      return;
    }
    const touch = event.touches[0];
    swipeStateRef.current = { startX: touch.clientX, startY: touch.clientY, active: false };
    swipeLastOffsetRef.current = 0;
    setSwipeTransition(false);
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const state = swipeStateRef.current;
    if (!state) {
      return;
    }
    const touch = event.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    if (!state.active) {
      if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy)) {
        state.active = true;
      } else if (Math.abs(dy) > Math.abs(dx)) {
        swipeStateRef.current = null;
        setSwipeOffset(0);
        return;
      } else {
        return;
      }
    }
    event.preventDefault();
    swipeLastOffsetRef.current = dx;
    setSwipeOffset(dx);
  };

  const resetSwipe = (withTransition: boolean) => {
    if (withTransition) {
      setSwipeTransition(true);
      setSwipeOffset(0);
      window.setTimeout(() => {
        setSwipeTransition(false);
      }, 220);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    const state = swipeStateRef.current;
    const offset = swipeLastOffsetRef.current;
    swipeStateRef.current = null;
    const width = gridRef.current?.offsetWidth ?? 0;
    const threshold = Math.max(width * 0.22, 80);
    if (!state || !state.active) {
      if (offset !== 0) {
        resetSwipe(true);
      }
      return;
    }
    if (Math.abs(offset) < threshold) {
      resetSwipe(true);
      return;
    }
    const direction = offset > 0 ? -1 : 1;
    setSwipeTransition(true);
    const travel = (width || window.innerWidth || 320) * (offset > 0 ? 1 : -1);
    setSwipeOffset(travel);
    window.setTimeout(() => {
      changeMonth(direction);
      setSwipeTransition(false);
      setSwipeOffset(0);
    }, 220);
  };

  useLayoutEffect(() => {
    if (!composerTarget || !isDesktop) {
      setComposerPosition(null);
      return;
    }
    const updatePosition = () => {
      const target = dayRefs.current.get(composerTarget);
      const container = gridRef.current;
      if (!target || !container) {
        setComposerPosition(null);
        return;
      }
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const width = Math.max(260, targetRect.width + 16);
      const containerWidth = container.clientWidth;
      let left = targetRect.left - containerRect.left;
      if (left + width > containerWidth) {
        left = Math.max(0, containerWidth - width - 8);
      }
      let top = targetRect.bottom - containerRect.top + container.scrollTop + 8;
      setComposerPosition({ top, left, width });
      window.requestAnimationFrame(() => {
        const form = composerFormRef.current;
        const host = gridRef.current;
        if (!form || !host) {
          return;
        }
        const formHeight = form.offsetHeight;
        const scrollTop = host.scrollTop;
        const containerHeight = host.clientHeight;
        if (top + formHeight > containerHeight + scrollTop - 8) {
          let adjustedTop = targetRect.top - containerRect.top + scrollTop - formHeight - 8;
          if (adjustedTop < scrollTop + 8) {
            adjustedTop = scrollTop + 8;
          }
          setComposerPosition({ top: adjustedTop, left, width });
        }
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const container = gridRef.current;
    container?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      container?.removeEventListener("scroll", updatePosition);
    };
  }, [composerTarget, isDesktop, menuOpen]);

  useEffect(() => {
    if (!composerTarget) {
      return;
    }
    const close = (event: MouseEvent) => {
      const form = composerFormRef.current;
      if (!form) {
        closeMobileOverlay();
        return;
      }
      const targetNode = event.target as Node;
      if (form.contains(targetNode)) {
        return;
      }
      const dayButton = dayRefs.current.get(composerTarget);
      if (dayButton?.contains(targetNode)) {
        return;
      }
      closeMobileOverlay();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileOverlay();
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", handleKey);
    };
  }, [closeMobileOverlay, composerTarget]);

  return (
    <div className={styles.page} data-menu-open={menuOpen || undefined}>
      <aside
        id="calendar-panel"
        className={styles.panel}
        data-open={menuOpen || undefined}
        aria-hidden={!menuOpen ? true : undefined}
      >
        <div className={styles.panelSection}>
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
                        const key = formatDateKey(cell.date);
                        const sameDay = selectedKey === key;
                        setSelectedDate(cell.date);
                        setCurrentMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                        setEventDraft((current) => ({ ...current, date: key }));
                        setFormMessage(null);
                        if (isDesktopViewport()) {
                          setMobileOverlay(null);
                          setComposerTarget((current) => (current === key && sameDay ? null : key));
                        } else {
                          const items = itemsByDay.get(key) ?? [];
                          setComposerTarget(null);
                          setMobileOverlay((current) => {
                            const targetMode: "agenda" | "composer" = items.length ? "agenda" : "composer";
                            if (sameDay && current?.key === key && current.mode === targetMode) {
                              return null;
                            }
                            return { key, mode: targetMode };
                          });
                          setMenuOpen(false);
                        }
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
        <div className={styles.panelSection}>
          <header className={styles.sectionHeader}>
            <span>Sources visibles</span>
          </header>
          <div className={styles.sourceList}>
            {sources.map((source) => {
              const active = enabledSources.has(source.id);
              return (
                <label
                  key={source.id}
                  className={active ? styles.sourceOptionActive : styles.sourceOption}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleSource(source.id)}
                  />
                  <span
                    className={styles.sourceDot}
                    style={source.color ? { backgroundColor: source.color } : undefined}
                  />
                  <span className={styles.sourceLabel}>{source.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </aside>
      <section className={styles.workspace}>
        {!isDesktop && mobileOverlay ? (
          <div className={styles.mobileOverlay} data-mode={mobileOverlay.mode}>
            <header className={styles.mobileOverlayHeader}>
              <span>{overlayLabel}</span>
              <button
                type="button"
                onClick={closeMobileOverlay}
                aria-label="Fermer le panneau du jour"
              >
                ×
              </button>
            </header>
            {mobileOverlay.mode === "agenda" ? (
              <ul className={styles.dayList}>
                {overlayItems.map((item) => {
                  const isTask = item.type === "task";
                  return (
                    <li key={item.id} className={isTask ? styles.dayTask : undefined}>
                      <span
                        className={styles.dayBadge}
                        style={item.color ? { backgroundColor: item.color } : undefined}
                      />
                      <div>
                        <strong>{item.title}</strong>
                        {isTask ? (
                          <div className={styles.dayTaskMeta}>
                            <CheckCircleIcon aria-hidden="true" />
                            {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                          </div>
                        ) : item.timeLabel ? (
                          <span>{item.timeLabel}</span>
                        ) : null}
                        {item.subtitle ? <small>{item.subtitle}</small> : null}
                      </div>
                    </li>
                  );
                })}
                {!overlayItems.length ? <li className={styles.empty}>Aucun élément ce jour-là.</li> : null}
              </ul>
            ) : (
              <form className={styles.mobileComposer} onSubmit={handleCreateEvent}>
                <span className={styles.mobileComposerTitle}>Nouvel évènement</span>
                <label className={styles.inlineField}>
                  <span>Titre</span>
                  <input
                    type="text"
                    value={eventDraft.summary}
                    onChange={(event) =>
                      setEventDraft((current) => ({ ...current, summary: event.target.value }))
                    }
                    required
                  />
                </label>
                <div className={styles.inlineMeta}>
                  <span>{formatListLabel(composerDate)}</span>
                  <label>
                    <input
                      type="checkbox"
                      checked={eventDraft.allDay}
                      onChange={(event) =>
                        setEventDraft((current) => ({ ...current, allDay: event.target.checked }))
                      }
                    />
                    <span>Toute la journée</span>
                  </label>
                </div>
                {!eventDraft.allDay ? (
                  <div className={styles.inlineTimes}>
                    <label>
                      <span>Début</span>
                      <input
                        type="time"
                        value={eventDraft.startTime}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, startTime: event.target.value }))
                        }
                        required
                      />
                    </label>
                    <label>
                      <span>Fin</span>
                      <input
                        type="time"
                        value={eventDraft.endTime}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, endTime: event.target.value }))
                        }
                        required
                      />
                    </label>
                  </div>
                ) : null}
                <label className={styles.inlineField}>
                  <span>Lieu</span>
                  <input
                    type="text"
                    value={eventDraft.location}
                    onChange={(event) =>
                      setEventDraft((current) => ({ ...current, location: event.target.value }))
                    }
                    placeholder="Lieu"
                  />
                </label>
                <label className={styles.inlineField}>
                  <span>Notes</span>
                  <textarea
                    value={eventDraft.description}
                    onChange={(event) =>
                      setEventDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Notes"
                  />
                </label>
                {formMessage ? <p className={styles.inlineMessage}>{formMessage}</p> : null}
                <div className={styles.inlineActions}>
                  <button type="submit" disabled={creatingEvent}>
                    {creatingEvent ? "Ajout…" : "Enregistrer"}
                  </button>
                  <button type="button" onClick={closeMobileOverlay}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
        {viewMode === "month" ? (
          <div className={styles.monthLayout}>
            <div
              className={styles.gridWrapper}
              ref={gridRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              style={{
                transform: `translateX(${swipeOffset}px)`,
                transition: swipeTransition ? "transform 0.22s ease" : undefined,
              }}
            >
              <div className={styles.weekdayHeader}>
                {["L", "M", "M", "J", "V", "S", "D"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className={styles.monthGrid}>
                {weeks.map((week, index) => (
                  <div key={index} className={styles.weekRow}>
                    {week.map((cell) => {
                      const items = itemsByDay.get(cell.key) ?? [];
                      const preview = items.slice(0, MAX_DAY_PREVIEW);
                      const overflow = Math.max(items.length - preview.length, 0);
                      const isSelected = cell.key === selectedKey;
                      const classes = [
                        styles.dayButton,
                        cell.isCurrentMonth ? "" : styles.dayMuted,
                        isSelected ? styles.daySelected : "",
                        cell.key === todayKey ? styles.dayToday : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <button
                          type="button"
                          key={cell.key}
                          className={classes}
                          onClick={() => handleDaySelect(cell)}
                          ref={(element) => {
                            if (!element) {
                              dayRefs.current.delete(cell.key);
                              return;
                            }
                            dayRefs.current.set(cell.key, element);
                          }}
                        >
                          <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                          <div className={styles.eventList}>
                            {preview.map((item) => {
                              const style = item.color ? { backgroundColor: `${item.color}22` } : undefined;
                              const isTask = item.type === "task";
                              const chipClass = [styles.eventChip, isTask ? styles.taskChip : ""]
                                .filter(Boolean)
                                .join(" ");
                              return (
                                <span key={item.id} className={chipClass} style={style}>
                                  {isTask ? (
                                    <span className={styles.taskMeta}>
                                      <CheckCircleIcon aria-hidden="true" />
                                      {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                                    </span>
                                  ) : item.timeLabel ? (
                                    <small>{item.timeLabel}</small>
                                  ) : null}
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
              {composerTarget && composerPosition && isDesktop ? (
                <form
                  ref={composerFormRef}
                  className={styles.inlineComposer}
                  style={{
                    top: composerPosition.top,
                    left: composerPosition.left,
                    minWidth: composerPosition.width,
                  }}
                  onSubmit={handleCreateEvent}
                >
                  <header className={styles.inlineComposerHeader}>
                    <span>Nouvel évènement</span>
                    <button
                      type="button"
                      onClick={closeMobileOverlay}
                      aria-label="Fermer l'éditeur"
                    >
                      ×
                    </button>
                  </header>
                  <label className={styles.inlineField}>
                    <span>Titre</span>
                    <input
                      type="text"
                      value={eventDraft.summary}
                      onChange={(event) => setEventDraft((current) => ({ ...current, summary: event.target.value }))}
                      required
                    />
                  </label>
                  <div className={styles.inlineMeta}>
                    <span>{formatListLabel(composerDate)}</span>
                    <label>
                      <input
                        type="checkbox"
                        checked={eventDraft.allDay}
                        onChange={(event) => setEventDraft((current) => ({ ...current, allDay: event.target.checked }))}
                      />
                      <span>Toute la journée</span>
                    </label>
                  </div>
                  {!eventDraft.allDay ? (
                    <div className={styles.inlineTimes}>
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
                  <label className={styles.inlineField}>
                    <span>Lieu</span>
                    <input
                      type="text"
                      value={eventDraft.location}
                      onChange={(event) => setEventDraft((current) => ({ ...current, location: event.target.value }))}
                      placeholder="Lieu"
                    />
                  </label>
                  <label className={styles.inlineField}>
                    <span>Notes</span>
                    <textarea
                      value={eventDraft.description}
                      onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Notes"
                    />
                  </label>
                  {formMessage ? <p className={styles.inlineMessage}>{formMessage}</p> : null}
                  <div className={styles.inlineActions}>
                    <button type="submit" disabled={creatingEvent}>
                      {creatingEvent ? "Ajout…" : "Enregistrer"}
                    </button>
                    <button type="button" onClick={closeMobileOverlay}>
                      Annuler
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.agendaView}>
            <div className={styles.agendaInner}>
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
          </div>
        )}
      </section>
    </div>
  );
}
