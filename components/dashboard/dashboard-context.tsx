"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import type { FormattedCalendarEvent, FormattedTaskList } from "@/lib/google";
import { buildRecurrenceRule } from "@/components/tasks/recurrence";
import type { RecurrenceState } from "@/components/tasks/recurrence";
import { CreateNotificationPayload, DashboardNotification, deriveNotificationsFromData } from "@/lib/notifications";

export type DashboardSettings = {
  density: "air" | "balance" | "tight";
  glassEffect: boolean;
};

export type FamilyMember = {
  id: string;
  displayName: string;
  email: string;
  role: "parent" | "enfant" | "tuteur";
};

export type DashboardContextValue = {
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
  isAuthenticated: boolean;
  loadingSession: boolean;
  events: FormattedCalendarEvent[];
  taskLists: FormattedTaskList[];
  lastSync: Date | null;
  syncing: boolean;
  syncError: string | null;
  syncNow: (options?: { silent?: boolean }) => Promise<void>;
  requestSignIn: () => void;
  requestSignOut: () => void;
  settings: DashboardSettings;
  updateSettings: (next: Partial<DashboardSettings>) => void;
  family: FamilyMember[];
  addFamilyMember: (member: Omit<FamilyMember, "id">) => void;
  removeFamilyMember: (id: string) => void;
  saveFamilyMember: (member: FamilyMember) => void;
  createTask: (payload: {
    listId: string;
    title: string;
    notes?: string;
    due?: string | null;
    recurrence?: RecurrenceState | null;
  }) => Promise<void>;
  createEvent: (payload: {
    summary: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    allDay?: boolean;
    location?: string;
    description?: string;
  }) => Promise<void>;
  toggleTaskStatus: (listId: string, taskId: string, status: "needsAction" | "completed") => Promise<void>;
  notifications: DashboardNotification[];
  unreadNotifications: number;
  pushNotification: (payload: CreateNotificationPayload) => string;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

const SETTINGS_STORAGE_KEY = "family-connect:settings";
const FAMILY_STORAGE_KEY = "family-connect:family";
const DATA_STORAGE_PREFIX = "family-connect:data:";
const NOTIFICATIONS_STORAGE_KEY = "family-connect:notifications";
const NOTIFICATION_STATE_STORAGE_KEY = "family-connect:notification-state";

const DEFAULT_SETTINGS: DashboardSettings = {
  density: "balance",
  glassEffect: true,
};

const ACCENT_SOLID = "#6366f1";
const ACCENT_GRADIENT = "linear-gradient(130deg, #4338ca 0%, #6366f1 55%, #818cf8 100%)";
const ACCENT_STRONG = "#4338ca";
const ACCENT_SOFT = "rgba(99, 102, 241, 0.18)";

type NotificationPersistenceState = {
  read: boolean;
  hidden?: boolean;
};

function generateNotificationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initial);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(initial)) {
          setState(parsed as T);
        } else {
          setState({ ...(initial as object), ...(parsed as object) } as T);
        }
      }
    } catch (error) {
      console.error("Impossible de charger", key, error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (value: T) => {
      setState(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    },
    [key]
  );

  return [state, update];
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [settings, setSettings] = usePersistentState<DashboardSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [family, setFamily] = usePersistentState<FamilyMember[]>(FAMILY_STORAGE_KEY, []);
  const [events, setEvents] = useState<FormattedCalendarEvent[]>([]);
  const [taskLists, setTaskLists] = useState<FormattedTaskList[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [manualNotifications, setManualNotifications] = usePersistentState<DashboardNotification[]>(
    NOTIFICATIONS_STORAGE_KEY,
    []
  );
  const [notificationState, setNotificationState] = usePersistentState<Record<string, NotificationPersistenceState>>(
    NOTIFICATION_STATE_STORAGE_KEY,
    {}
  );

  const userStorageKey = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return session?.user?.email ? `${DATA_STORAGE_PREFIX}${session.user.email}` : null;
  }, [session?.user?.email]);

  useEffect(() => {
    if (!userStorageKey) {
      setEvents([]);
      setTaskLists([]);
      setLastSync(null);
      return;
    }
    try {
      const stored = window.localStorage.getItem(userStorageKey);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as {
        events: FormattedCalendarEvent[];
        taskLists: FormattedTaskList[];
        lastSync?: string | null;
      };
      setEvents(parsed.events ?? []);
      setTaskLists(parsed.taskLists ?? []);
      setLastSync(parsed.lastSync ? new Date(parsed.lastSync) : null);
    } catch (error) {
      console.error("Impossible de restaurer la synchronisation", error);
    }
  }, [userStorageKey]);

  const persistData = useCallback(
    (payload: { events: FormattedCalendarEvent[]; taskLists: FormattedTaskList[]; lastSync: Date | null }) => {
      if (!userStorageKey) {
        return;
      }
      window.localStorage.setItem(
        userStorageKey,
        JSON.stringify({
          events: payload.events,
          taskLists: payload.taskLists,
          lastSync: payload.lastSync ? payload.lastSync.toISOString() : null,
        })
      );
    },
    [userStorageKey]
  );

  const pushNotification = useCallback(
    ({ id, title, message, category = "system", action, timestamp }: CreateNotificationPayload) => {
      const notificationId = id ?? generateNotificationId();
      const entry: DashboardNotification = {
        id: notificationId,
        title,
        message,
        category,
        action,
        timestamp: timestamp ?? new Date().toISOString(),
        read: false,
        source: "manual",
      };

      const cleaned = manualNotifications.filter((item) => item.id !== notificationId);
      setManualNotifications([...cleaned, entry]);
      setNotificationState({
        ...notificationState,
        [notificationId]: { read: false, hidden: false },
      });

      return notificationId;
    },
    [manualNotifications, notificationState, setManualNotifications, setNotificationState]
  );

  const syncNow = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (status !== "authenticated") {
        setSyncError("Connectez-vous pour synchroniser vos données Google.");
        return;
      }
      if (!silent) {
        setSyncError(null);
      }
      setSyncing(true);
      try {
        const response = await fetch("/api/google/sync");
        const payload = (await response.json().catch(() => null)) as
          | { events?: FormattedCalendarEvent[]; taskLists?: FormattedTaskList[]; message?: string }
          | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? "Synchronisation impossible");
        }
        const nextEvents = payload?.events ?? [];
        const nextTaskLists = payload?.taskLists ?? [];
        const timestamp = new Date();
        setEvents(nextEvents);
        setTaskLists(nextTaskLists);
        setLastSync(timestamp);
        persistData({ events: nextEvents, taskLists: nextTaskLists, lastSync: timestamp });
        setSyncError(null);
        if (!silent) {
          pushNotification({
            title: "Synchronisation réussie",
            message: "Vos évènements et tâches sont à jour.",
            category: "system",
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Synchronisation impossible";
        setSyncError(message);
        pushNotification({
          title: "Erreur de synchronisation",
          message,
          category: "system",
        });
      } finally {
        setSyncing(false);
      }
    },
    [persistData, pushNotification, status]
  );

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    syncNow({ silent: true }).catch(() => {
      /* handled in syncNow */
    });
    const interval = window.setInterval(() => {
      syncNow({ silent: true }).catch(() => {
        /* handled */
      });
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [status, syncNow]);

  const requestSignIn = useCallback(() => {
    signIn("google").catch(() => {
      setSyncError("Impossible de lancer la connexion Google");
    });
  }, []);

  const requestSignOut = useCallback(() => {
    signOut({ callbackUrl: "/" }).catch(() => {
      setSyncError("Impossible de vous déconnecter pour le moment");
    });
  }, []);

  const updateSettings = useCallback(
    (next: Partial<DashboardSettings>) => {
      const merged = { ...settings, ...next };
      setSettings(merged);
    },
    [setSettings, settings]
  );

  const addFamilyMember = useCallback(
    (member: Omit<FamilyMember, "id">) => {
      const entry: FamilyMember = { ...member, id: crypto.randomUUID() };
      const next = [...family, entry];
      setFamily(next);
      pushNotification({
        title: "Nouveau membre ajouté",
        message: `${member.displayName} a rejoint votre espace familial.`,
        category: "system",
      });
    },
    [family, pushNotification, setFamily]
  );

  const removeFamilyMember = useCallback(
    (id: string) => {
      const removed = family.find((member) => member.id === id);
      const next = family.filter((member) => member.id !== id);
      setFamily(next);
      if (removed) {
        pushNotification({
          title: "Membre retiré",
          message: `${removed.displayName} ne fait plus partie de la famille.`,
          category: "system",
        });
      }
    },
    [family, pushNotification, setFamily]
  );

  const saveFamilyMember = useCallback(
    (member: FamilyMember) => {
      const next = family.map((item) => (item.id === member.id ? member : item));
      setFamily(next);
      pushNotification({
        title: "Profil mis à jour",
        message: `${member.displayName} a été mis à jour.`,
        category: "system",
      });
    },
    [family, pushNotification, setFamily]
  );

  const toggleTaskStatus = useCallback(
    async (listId: string, taskId: string, status: "needsAction" | "completed") => {
      try {
        const response = await fetch("/api/google/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, taskId, status }),
        });
        if (!response.ok) {
          throw new Error("Impossible de mettre à jour la tâche");
        }
        const { task } = (await response.json()) as { task: FormattedTaskList["tasks"][number] };
        setTaskLists((current) => {
          const next = current.map((list) =>
            list.id === listId ? { ...list, tasks: list.tasks.map((item) => (item.id === taskId ? task : item)) } : list
          );
          persistData({ events, taskLists: next, lastSync });
          return next;
        });
        if (task.status === "completed") {
          pushNotification({
            title: "Tâche terminée",
            message: `Bravo ! "${task.title}" est terminée.`,
            category: "task",
            action: { label: "Voir les tâches", href: "/tasks" },
          });
        } else {
          pushNotification({
            title: "Tâche réactivée",
            message: `La tâche "${task.title}" est de nouveau active.`,
            category: "task",
            action: { label: "Voir les tâches", href: "/tasks" },
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de mettre à jour la tâche";
        setSyncError(message);
        throw error;
      }
    },
    [events, lastSync, persistData, pushNotification]
  );

  const createTask = useCallback(
    async ({ listId, title, notes, due, recurrence }: {
      listId: string;
      title: string;
      notes?: string;
      due?: string | null;
      recurrence?: RecurrenceState | null;
    }) => {
      if (!title.trim()) {
        throw new Error("Le titre est requis");
      }
      try {
        const recurrenceRules = buildRecurrenceRule(recurrence ?? null);
        const response = await fetch("/api/google/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId,
            title,
            notes: notes || undefined,
            due: due || undefined,
            recurrence: recurrenceRules ?? undefined,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "Impossible de créer la tâche");
        }
        const { task } = (await response.json()) as { task: FormattedTaskList["tasks"][number] };
        setTaskLists((current) => {
          const next = current.map((list) => (list.id === listId ? { ...list, tasks: [task, ...list.tasks] } : list));
          persistData({ events, taskLists: next, lastSync });
          return next;
        });
        pushNotification({
          title: "Nouvelle tâche",
          message: `La tâche "${task.title}" a été ajoutée à votre liste.`,
          category: "task",
          action: { label: "Voir mes tâches", href: "/tasks" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de créer la tâche";
        setSyncError(message);
        throw error;
      }
    },
    [events, lastSync, persistData, pushNotification]
  );

  const createEvent = useCallback(
    async ({
      summary,
      date,
      startTime,
      endTime,
      allDay,
      location,
      description,
    }: {
      summary: string;
      date: string;
      startTime?: string | null;
      endTime?: string | null;
      allDay?: boolean;
      location?: string;
      description?: string;
    }) => {
      if (!summary.trim()) {
        throw new Error("Le titre de l'évènement est requis");
      }

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const toDateTime = (time?: string | null) => {
        const [hours, minutes] = (time ?? "00:00").split(":");
        const base = new Date(date);
        base.setHours(Number.parseInt(hours ?? "0", 10));
        base.setMinutes(Number.parseInt(minutes ?? "0", 10));
        base.setSeconds(0, 0);
        return base;
      };

      const start = toDateTime(startTime ?? undefined);
      let end: Date;

      if (allDay || !startTime) {
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        try {
          const response = await fetch("/api/google/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              summary,
              description: description || undefined,
              location: location || undefined,
              allDay: true,
              startDate: date,
              endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(
                endDate.getDate()
              ).padStart(2, "0")}`,
              timeZone,
            }),
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.message ?? "Impossible de créer l'évènement");
          }
        const { event } = (await response.json()) as { event: FormattedCalendarEvent };
        setEvents((current) => {
          const next = [event, ...current].sort(
            (a, b) =>
              new Date(a.start.iso ?? 0).getTime() - new Date(b.start.iso ?? 0).getTime()
          );
          persistData({ events: next, taskLists, lastSync });
          return next;
        });
        pushNotification({
          title: "Évènement créé",
          message: `"${event.summary}" est planifié (${event.start.label}).`,
          category: "event",
          action: { label: "Voir le calendrier", href: "/calendar" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de créer l'évènement";
        setSyncError(message);
        throw error;
      }
        return;
      }

      end = endTime ? toDateTime(endTime) : new Date(start.getTime() + 60 * 60 * 1000);

      if (end <= start) {
        end = new Date(start.getTime() + 30 * 60 * 1000);
      }

      try {
        const response = await fetch("/api/google/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary,
            description: description || undefined,
            location: location || undefined,
            allDay: false,
            startIso: start.toISOString(),
            endIso: end.toISOString(),
            timeZone,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "Impossible de créer l'évènement");
        }
        const { event } = (await response.json()) as { event: FormattedCalendarEvent };
        setEvents((current) => {
          const next = [event, ...current].sort(
            (a, b) => new Date(a.start.iso ?? 0).getTime() - new Date(b.start.iso ?? 0).getTime()
          );
          persistData({ events: next, taskLists, lastSync });
          return next;
        });
        pushNotification({
          title: "Évènement créé",
          message: `"${event.summary}" est planifié (${event.start.label}).`,
          category: "event",
          action: { label: "Voir le calendrier", href: "/calendar" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de créer l'évènement";
        setSyncError(message);
        throw error;
      }
    },
    [lastSync, persistData, pushNotification, taskLists]
  );

  const derivedNotifications = useMemo(
    () => deriveNotificationsFromData(events, taskLists),
    [events, taskLists]
  );

  const notifications = useMemo(() => {
    const combined: DashboardNotification[] = [...derivedNotifications, ...manualNotifications];
    const visible = combined.filter((notification) => !notificationState[notification.id]?.hidden);
    const resolved = visible.map((notification) => ({
      ...notification,
      read: notificationState[notification.id]?.read ?? notification.read ?? false,
    }));
    return resolved.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [derivedNotifications, manualNotifications, notificationState]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      const current = notificationState[id] ?? { read: false };
      if (current.read) {
        return;
      }
      setNotificationState({ ...notificationState, [id]: { ...current, read: true } });
    },
    [notificationState, setNotificationState]
  );

  const markAllNotificationsRead = useCallback(() => {
    if (!notifications.length) {
      return;
    }
    const next = { ...notificationState } as Record<string, NotificationPersistenceState>;
    let changed = false;
    notifications.forEach((notification) => {
      const current = next[notification.id] ?? { read: false };
      if (!current.read) {
        next[notification.id] = { ...current, read: true };
        changed = true;
      }
    });
    if (changed) {
      setNotificationState(next);
    }
  }, [notificationState, notifications, setNotificationState]);

  const dismissNotification = useCallback(
    (id: string) => {
      if (manualNotifications.some((item) => item.id === id)) {
        const remaining = manualNotifications.filter((item) => item.id !== id);
        setManualNotifications(remaining);
        const nextState = { ...notificationState } as Record<string, NotificationPersistenceState>;
        delete nextState[id];
        setNotificationState(nextState);
        return;
      }
      const current = notificationState[id] ?? { read: true };
      setNotificationState({
        ...notificationState,
        [id]: { ...current, read: true, hidden: true },
      });
    },
    [manualNotifications, notificationState, setManualNotifications, setNotificationState]
  );

  const clearNotifications = useCallback(() => {
    if (!notifications.length) {
      if (manualNotifications.length) {
        setManualNotifications([]);
      }
      setNotificationState({});
      return;
    }

    const nextState: Record<string, NotificationPersistenceState> = { ...notificationState };
    manualNotifications.forEach((notification) => {
      delete nextState[notification.id];
    });
    notifications.forEach((notification) => {
      if (notification.source === "auto") {
        nextState[notification.id] = {
          ...(nextState[notification.id] ?? {}),
          read: true,
          hidden: true,
        };
      }
    });
    setManualNotifications([]);
    setNotificationState(nextState);
  }, [manualNotifications, notificationState, notifications, setManualNotifications, setNotificationState]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ACCENT_SOLID);
    document.documentElement.style.setProperty("--accent-gradient", ACCENT_GRADIENT);
    document.documentElement.style.setProperty("--accent-strong", ACCENT_STRONG);
    document.documentElement.style.setProperty("--accent-soft", ACCENT_SOFT);
    document.documentElement.style.setProperty(
      "--density-gap",
      settings.density === "tight" ? "8px" : settings.density === "balance" ? "14px" : "20px"
    );
    document.documentElement.style.setProperty(
      "--density-radius",
      settings.density === "tight" ? "10px" : settings.density === "balance" ? "16px" : "22px"
    );
    document.documentElement.style.setProperty(
      "--density-padding",
      settings.density === "tight" ? "12px" : settings.density === "balance" ? "18px" : "24px"
    );
    document.documentElement.style.setProperty(
      "--density-line",
      settings.density === "tight" ? "20px" : settings.density === "balance" ? "24px" : "28px"
    );
    document.documentElement.style.setProperty(
      "--surface",
      settings.glassEffect ? "rgba(15, 23, 42, 0.65)" : "rgba(15, 23, 42, 0.9)"
    );
    document.documentElement.style.setProperty(
      "--surface-strong",
      settings.glassEffect ? "rgba(15, 23, 42, 0.82)" : "rgba(15, 23, 42, 0.95)"
    );
    document.documentElement.style.setProperty(
      "--surface-elevated",
      settings.glassEffect ? "rgba(15, 23, 42, 0.92)" : "rgba(15, 23, 42, 0.98)"
    );
    document.documentElement.style.setProperty(
      "--glass-blur",
      settings.glassEffect ? "saturate(180%) blur(26px)" : "none"
    );
  }, [settings.density, settings.glassEffect]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      sessionStatus: status,
      isAuthenticated: status === "authenticated",
      loadingSession: status === "loading",
      events,
      taskLists,
      lastSync,
      syncing,
      syncError,
      syncNow,
      requestSignIn,
      requestSignOut,
      settings,
      updateSettings,
      family,
      addFamilyMember,
      removeFamilyMember,
      saveFamilyMember,
      createTask,
      createEvent,
      toggleTaskStatus,
      notifications,
      unreadNotifications,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      clearNotifications,
    }),
    [
      status,
      events,
      taskLists,
      lastSync,
      syncing,
      syncError,
      syncNow,
      requestSignIn,
      requestSignOut,
      settings,
      updateSettings,
      family,
      addFamilyMember,
      removeFamilyMember,
      saveFamilyMember,
      createTask,
      createEvent,
      toggleTaskStatus,
      notifications,
      unreadNotifications,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      clearNotifications,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard doit être utilisé dans un DashboardProvider");
  }
  return context;
}
