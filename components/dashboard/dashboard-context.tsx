"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import type { FormattedCalendarEvent, FormattedTaskList } from "@/lib/google";
import { buildRecurrenceRule } from "@/components/tasks/recurrence";
import type { RecurrenceState } from "@/components/tasks/recurrence";

export type DashboardSettings = {
  accent: "lagoon" | "sunset" | "forest" | "midnight";
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
  toggleTaskStatus: (listId: string, taskId: string, status: "needsAction" | "completed") => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

const SETTINGS_STORAGE_KEY = "family-connect:settings";
const FAMILY_STORAGE_KEY = "family-connect:family";
const DATA_STORAGE_PREFIX = "family-connect:data:";

const DEFAULT_SETTINGS: DashboardSettings = {
  accent: "lagoon",
  density: "balance",
  glassEffect: true,
};

const ACCENT_MAP: Record<DashboardSettings["accent"], { solid: string; gradient: string }> = {
  lagoon: {
    solid: "#0ea5e9",
    gradient: "linear-gradient(120deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)",
  },
  sunset: {
    solid: "#fb7185",
    gradient: "linear-gradient(120deg, #f97316 0%, #fb7185 55%, #f472b6 100%)",
  },
  forest: {
    solid: "#22c55e",
    gradient: "linear-gradient(120deg, #0ea5e9 0%, #22c55e 55%, #84cc16 100%)",
  },
  midnight: {
    solid: "#6366f1",
    gradient: "linear-gradient(120deg, #312e81 0%, #4338ca 45%, #6366f1 100%)",
  },
};

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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Synchronisation impossible";
        setSyncError(message);
      } finally {
        setSyncing(false);
      }
    },
    [persistData, status]
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
    },
    [family, setFamily]
  );

  const removeFamilyMember = useCallback(
    (id: string) => {
      const next = family.filter((member) => member.id !== id);
      setFamily(next);
    },
    [family, setFamily]
  );

  const saveFamilyMember = useCallback(
    (member: FamilyMember) => {
      const next = family.map((item) => (item.id === member.id ? member : item));
      setFamily(next);
    },
    [family, setFamily]
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de mettre à jour la tâche";
        setSyncError(message);
        throw error;
      }
    },
    [events, lastSync, persistData]
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de créer la tâche";
        setSyncError(message);
        throw error;
      }
    },
    [events, lastSync, persistData]
  );

  useEffect(() => {
    const accent = ACCENT_MAP[settings.accent];
    document.documentElement.style.setProperty("--accent", accent.solid);
    document.documentElement.style.setProperty("--accent-gradient", accent.gradient);
    document.documentElement.style.setProperty("--density-gap", settings.density === "tight" ? "8px" : settings.density === "balance" ? "14px" : "20px");
    document.documentElement.style.setProperty(
      "--density-radius",
      settings.density === "tight" ? "10px" : settings.density === "balance" ? "16px" : "22px"
    );
    document.documentElement.style.setProperty("--surface", settings.glassEffect ? "rgba(15, 23, 42, 0.65)" : "rgba(15, 23, 42, 0.9)");
    document.documentElement.style.setProperty(
      "--surface-strong",
      settings.glassEffect ? "rgba(15, 23, 42, 0.82)" : "rgba(15, 23, 42, 0.95)"
    );
  }, [settings]);

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
      toggleTaskStatus,
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
      toggleTaskStatus,
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
