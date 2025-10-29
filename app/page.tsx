"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { FormattedCalendarEvent, FormattedTaskList } from "@/lib/google";
import styles from "./page.module.css";

type DashboardSettings = {
  accent: keyof typeof ACCENTS;
  density: "cozy" | "comfortable" | "compact";
  glassEffect: boolean;
};

type SyncError = {
  scope: "calendar" | "tasks" | "auth";
  message: string;
  suggestion?: string;
  description?: string;
};

type SyncResponse = {
  events?: FormattedCalendarEvent[];
  taskLists?: FormattedTaskList[];
  message?: string;
  errors?: SyncError[];
};

type FamilyMember = {
  id: string;
  displayName: string;
  email: string;
  role: "parent" | "enfant" | "tuteur";
};

type TaskDraft = {
  title: string;
  listId: string | null;
  due: string | null;
  notes: string;
  recurrence: RecurrenceState | null;
};

type RecurrenceState = {
  frequency: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  weekdays: string[];
  monthDay: number | null;
  end: { type: "never" | "after" | "on"; value?: number | string };
};

const ACCENTS = {
  aurora: {
    label: "Aurora",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 55%, #f97316 100%)",
    solid: "#ec4899"
  },
  lagoon: {
    label: "Lagoon",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 50%, #38bdf8 100%)",
    solid: "#22d3ee"
  },
  spruce: {
    label: "Spruce",
    gradient: "linear-gradient(135deg, #34d399 0%, #22c55e 50%, #0ea5e9 100%)",
    solid: "#22c55e"
  },
  dusk: {
    label: "Dusk",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)",
    solid: "#6366f1"
  }
};

const DEFAULT_SETTINGS: DashboardSettings = {
  accent: "lagoon",
  density: "comfortable",
  glassEffect: true
};

const STORAGE_KEY = "family-connect-dashboard-settings";
const FAMILY_STORAGE_KEY = "family-connect-family";

const WEEKDAY_OPTIONS = [
  { value: "MO", label: "Lun" },
  { value: "TU", label: "Mar" },
  { value: "WE", label: "Mer" },
  { value: "TH", label: "Jeu" },
  { value: "FR", label: "Ven" },
  { value: "SA", label: "Sam" },
  { value: "SU", label: "Dim" }
];

function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DashboardSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error("Impossible de charger les préférences du tableau de bord", error);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings] as const;
}

function useFamilyRoster() {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(FAMILY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FamilyMember[];
        setMembers(parsed);
      } catch (error) {
        console.error("Impossible de charger la famille", error);
      }
    }
  }, []);

  useEffect(() => {
    if (members.length) {
      window.localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(members));
    } else {
      window.localStorage.removeItem(FAMILY_STORAGE_KEY);
    }
  }, [members]);

  return [members, setMembers] as const;
}

function buildRecurrenceRule(state: RecurrenceState | null): string[] | null {
  if (!state || state.frequency === "NONE") {
    return null;
  }

  const parts = [`FREQ=${state.frequency}`];

  if (state.interval > 1) {
    parts.push(`INTERVAL=${state.interval}`);
  }

  if (state.frequency === "WEEKLY" && state.weekdays.length) {
    parts.push(`BYDAY=${state.weekdays.join(",")}`);
  }

  if (state.frequency === "MONTHLY" && state.monthDay) {
    parts.push(`BYMONTHDAY=${state.monthDay}`);
  }

  if (state.end.type === "after" && typeof state.end.value === "number" && state.end.value > 0) {
    parts.push(`COUNT=${state.end.value}`);
  }

  if (state.end.type === "on" && typeof state.end.value === "string" && state.end.value) {
    parts.push(`UNTIL=${state.end.value.replace(/[-:]/g, "")}`);
  }

  return [`RRULE:${parts.join(";")}`];
}

function describeRecurrence(state: RecurrenceState | null) {
  if (!state || state.frequency === "NONE") {
    return "Aucune récurrence";
  }

  const base = {
    DAILY: "Quotidien",
    WEEKLY: "Hebdomadaire",
    MONTHLY: "Mensuel",
    YEARLY: "Annuel"
  }[state.frequency] ?? "Personnalisé";

  const details: string[] = [];

  if (state.interval > 1) {
    details.push(`tous les ${state.interval} cycles`);
  }

  if (state.frequency === "WEEKLY" && state.weekdays.length) {
    details.push(`les ${state.weekdays.map((day) => WEEKDAY_OPTIONS.find((opt) => opt.value === day)?.label ?? day).join(", ")}`);
  }

  if (state.frequency === "MONTHLY" && state.monthDay) {
    details.push(`le ${state.monthDay}`);
  }

  if (state.end.type === "after" && typeof state.end.value === "number") {
    details.push(`${state.end.value} occurrences`);
  }

  if (state.end.type === "on" && typeof state.end.value === "string") {
    details.push(`jusqu’au ${new Date(state.end.value).toLocaleDateString("fr-FR")}`);
  }

  return [base, ...details].join(" · ");
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useDashboardSettings();
  const [members, setMembers] = useFamilyRoster();
  const [events, setEvents] = useState<FormattedCalendarEvent[]>([]);
  const [taskLists, setTaskLists] = useState<FormattedTaskList[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>({
    title: "",
    listId: null,
    due: null,
    notes: "",
    recurrence: null
  });
  const [activeRecurrence, setActiveRecurrence] = useState<RecurrenceState | null>(null);
  const [pendingMember, setPendingMember] = useState({ name: "", email: "", role: "parent" as FamilyMember["role"] });

  const isAuthenticated = status === "authenticated";
  const isLoadingSession = status === "loading";

  useEffect(() => {
    if (!isAuthenticated || !session?.user?.email) {
      return;
    }

    setMembers((current) => {
      if (current.some((member) => member.email === session.user?.email)) {
        return current;
      }

      const enriched: FamilyMember = {
        id: session.user?.email ?? crypto.randomUUID(),
        displayName: session.user?.name ?? session.user?.email ?? "Vous",
        email: session.user?.email ?? "inconnu",
        role: "parent"
      };

      return [...current, enriched];
    });
  }, [isAuthenticated, session?.user?.email, session?.user?.name, setMembers]);

  useEffect(() => {
    if (!taskLists.length) {
      return;
    }
    if (!selectedListId) {
      setSelectedListId(taskLists[0]?.id ?? null);
    }
  }, [taskLists, selectedListId]);

  const handleSync = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/google/sync");
      const payload = (await response.json().catch(() => null)) as SyncResponse | null;

      if (!response.ok) {
        const fallback = payload?.message ?? "Synchronisation impossible pour le moment.";
        setError(fallback);
        return;
      }

      setEvents(payload?.events ?? []);
      setTaskLists(payload?.taskLists ?? []);
      setLastSync(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue lors de la synchronisation");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setEvents([]);
    setTaskLists([]);
    setLastSync(null);
    await signOut({ callbackUrl: "/" });
  }, []);

  const selectedList = useMemo(
    () => taskLists.find((list) => list.id === selectedListId) ?? taskLists[0],
    [selectedListId, taskLists]
  );

  const accentTheme = ACCENTS[settings.accent] ?? ACCENTS.lagoon;

  const themeStyle = useMemo(() => {
    const density = settings.density;
    const tileGap = density === "compact" ? "14px" : density === "cozy" ? "18px" : "24px";
    const radius = density === "compact" ? "18px" : density === "cozy" ? "24px" : "28px";

    return {
      "--accent-gradient": accentTheme.gradient,
      "--accent-solid": accentTheme.solid,
      "--tile-gap": tileGap,
      "--tile-radius": radius,
      "--glass-alpha": settings.glassEffect ? "0.68" : "1",
      "--surface-color": settings.glassEffect ? "rgba(12, 17, 32, 0.72)" : "rgba(15, 23, 42, 0.95)"
    } as CSSProperties;
  }, [accentTheme.gradient, accentTheme.solid, settings.density, settings.glassEffect]);

  const taskCounts = useMemo(() => {
    const total = taskLists.reduce((sum, list) => sum + list.tasks.length, 0);
    const completed = taskLists.reduce(
      (sum, list) => sum + list.tasks.filter((task) => task.status === "completed").length,
      0
    );
    return { total, completed };
  }, [taskLists]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => {
        const first = a.start.iso ? new Date(a.start.iso).getTime() : Number.MAX_SAFE_INTEGER;
        const second = b.start.iso ? new Date(b.start.iso).getTime() : Number.MAX_SAFE_INTEGER;
        return first - second;
      })
      .slice(0, 6);
  }, [events]);

  const handleTaskStatusToggle = useCallback(
    async (listId: string, taskId: string, status: "needsAction" | "completed") => {
      const payload = {
        listId,
        taskId,
        status
      };

      try {
        const response = await fetch("/api/google/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("Impossible de mettre à jour la tâche");
        }

        const { task } = (await response.json()) as { task: FormattedTaskList["tasks"][number] };

        setTaskLists((current) =>
          current.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  tasks: list.tasks.map((item) => (item.id === taskId ? task : item))
                }
              : list
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de mettre à jour la tâche");
      }
    },
    []
  );

  const handleTaskCreation = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!draft.listId || !draft.title.trim()) {
        setError("Sélectionnez une liste et indiquez un titre pour la tâche");
        return;
      }

      const recurrence = buildRecurrenceRule(draft.recurrence);

      try {
        const response = await fetch("/api/google/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId: draft.listId,
            title: draft.title,
            notes: draft.notes || undefined,
            due: draft.due || undefined,
            recurrence: recurrence ?? undefined
          })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "Impossible de créer la tâche");
        }

        const { task } = (await response.json()) as { task: FormattedTaskList["tasks"][number] };

        setTaskLists((current) =>
          current.map((list) =>
            list.id === draft.listId ? { ...list, tasks: [task, ...list.tasks] } : list
          )
        );

        setDraft({ title: "", listId: draft.listId, due: null, notes: "", recurrence: null });
        setActiveRecurrence(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de créer la tâche");
      }
    },
    [draft]
  );

  const handleRecurrenceChange = useCallback((update: RecurrenceState | null) => {
    const nextState = update && update.frequency !== "NONE" ? update : null;
    setActiveRecurrence(nextState);
    setDraft((current) => ({ ...current, recurrence: nextState }));
  }, []);

  const handleMemberSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!pendingMember.name.trim() || !pendingMember.email.trim()) {
        return;
      }

      setMembers((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          displayName: pendingMember.name.trim(),
          email: pendingMember.email.trim(),
          role: pendingMember.role
        }
      ]);

      setPendingMember({ name: "", email: "", role: "parent" });
    },
    [pendingMember, setMembers]
  );

  const handleRemoveMember = useCallback(
    (memberId: string) => {
      setMembers((current) => current.filter((member) => member.id !== memberId));
    },
    [setMembers]
  );

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      listId: selectedList?.id ?? current.listId ?? null
    }));
  }, [selectedList?.id]);

  const familySummary = useMemo(() => {
    if (!members.length) {
      return "Aucun membre ajouté";
    }
    const roles = members.reduce<Record<FamilyMember["role"], number>>(
      (acc, member) => ({ ...acc, [member.role]: (acc[member.role] ?? 0) + 1 }),
      { parent: 0, enfant: 0, tuteur: 0 }
    );
    return `${members.length} membre${members.length > 1 ? "s" : ""} · ${roles.parent} parent${
      roles.parent > 1 ? "s" : ""
    } · ${roles.enfant} enfant${roles.enfant > 1 ? "s" : ""}`;
  }, [members]);

  const dynamicHeader = useMemo(() => {
    if (!isAuthenticated) {
      return "Connectez-vous avec Google pour ouvrir votre cockpit familial";
    }
    if (loading) {
      return "Synchronisation avec Google en cours...";
    }
    if (!lastSync) {
      return "Prêt pour votre première synchronisation";
    }
    return `Synchronisé le ${lastSync.toLocaleString("fr-FR", {
      dateStyle: "long",
      timeStyle: "short"
    })}`;
  }, [isAuthenticated, lastSync, loading]);

  return (
    <main className={styles.page} style={themeStyle}>
      <div className={styles.headerRow}>
        <div className={styles.hero}>
          <div className={styles.heroTitles}>
            <span className={styles.subtitle}>Family Connect OS</span>
            <h1>Un tableau de bord digne de macOS Sonoma et iOS 17.</h1>
            <p>
              Centralisez agendas, tâches et vie de famille dans une interface modulable qui
              s’adapte à votre univers. Toutes les données Google restent parfaitement synchronisées.
            </p>
          </div>
          <div className={styles.heroActions}>
            {isAuthenticated ? (
              <>
                <div className={styles.userCard}>
                  <span>Connecté en tant que</span>
                  <strong>{session?.user?.name ?? session?.user?.email ?? "Profil Google"}</strong>
                </div>
                <div className={styles.heroButtons}>
                  <button
                    className={`${styles.button} ${styles.primaryButton}`}
                    onClick={handleSync}
                    disabled={loading}
                  >
                    {loading ? "Synchronisation…" : "Synchroniser maintenant"}
                  </button>
                  <button className={styles.button} onClick={handleSignOut}>
                    Se déconnecter
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  className={`${styles.button} ${styles.primaryButton}`}
                  onClick={() => signIn("google")}
                  disabled={isLoadingSession}
                >
                  {isLoadingSession ? "Connexion…" : "Se connecter avec Google"}
                </button>
                <p className={styles.secondaryText}>
                  Accès en lecture/écriture sur vos tâches et événements pour mieux orchestrer la
                  vie familiale.
                </p>
              </>
            )}
          </div>
        </div>
        <aside className={styles.heroCard}>
          <div>
            <p className={styles.cardEyebrow}>État du cockpit</p>
            <h2>{dynamicHeader}</h2>
          </div>
          <ul className={styles.metrics}>
            <li>
              <span>Événements</span>
              <strong>{events.length}</strong>
            </li>
            <li>
              <span>Tâches</span>
              <strong>
                {taskCounts.completed}/{taskCounts.total}
              </strong>
            </li>
            <li>
              <span>Famille</span>
              <strong>{members.length}</strong>
            </li>
          </ul>
        </aside>
      </div>

      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <section className={styles.preferences}>
        <h2>Personnalisation instantanée</h2>
        <div className={styles.preferencesGrid}>
          <div className={styles.preferenceBlock}>
            <p className={styles.preferenceLabel}>Accent</p>
            <div className={styles.accentRow}>
              {Object.entries(ACCENTS).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.accentSwatch} ${settings.accent === key ? styles.accentActive : ""}`}
                  style={{ background: value.gradient }}
                  onClick={() => setSettings((current) => ({ ...current, accent: key as DashboardSettings["accent"] }))}
                >
                  <span>{value.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.preferenceBlock}>
            <p className={styles.preferenceLabel}>Densité</p>
            <div className={styles.segmentedControl}>
              {(["cozy", "comfortable", "compact"] as DashboardSettings["density"][]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.segmentedItem} ${settings.density === option ? styles.segmentedActive : ""}`}
                  onClick={() => setSettings((current) => ({ ...current, density: option }))}
                >
                  {option === "cozy"
                    ? "Cosy"
                    : option === "comfortable"
                    ? "Standard"
                    : "Compact"}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.preferenceBlock}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={settings.glassEffect}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, glassEffect: event.target.checked }))
                }
              />
              <span>Activer l’effet verre dépoli façon macOS</span>
            </label>
          </div>
        </div>
      </section>

      <div className={styles.desktopGrid}>
        <section className={`${styles.tile} ${styles.tasksTile}`}>
          <header className={styles.tileHeader}>
            <div>
              <h2>Tâches Google regroupées par listes</h2>
              <p>Consultez, réorganisez et créez des tâches avec des récurrences avancées.</p>
            </div>
            <select
              value={selectedList?.id ?? ""}
              onChange={(event) => setSelectedListId(event.target.value)}
              className={styles.listSelector}
            >
              {taskLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </header>

          {selectedList ? (
            <div className={styles.taskContent}>
              <ul className={styles.taskList}>
                {selectedList.tasks.map((task) => (
                  <li key={task.id} className={styles.taskRow}>
                    <label className={styles.taskCheckbox}>
                      <input
                        type="checkbox"
                        checked={task.status === "completed"}
                        onChange={(event) =>
                          handleTaskStatusToggle(
                            selectedList.id,
                            task.id,
                            event.target.checked ? "completed" : "needsAction"
                          )
                        }
                      />
                      <span />
                    </label>
                    <div className={styles.taskDetails}>
                      <p className={styles.taskTitle}>{task.title}</p>
                      <p className={styles.taskMeta}>
                        {task.due ? <span>Échéance : {task.due.label}</span> : null}
                        {task.recurrence?.length ? <span>Récurrence active</span> : null}
                        <span>Status : {task.status === "completed" ? "Terminé" : "À faire"}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <form className={styles.taskComposer} onSubmit={handleTaskCreation}>
                <h3>Nouvelle tâche</h3>
                <div className={styles.composerGrid}>
                  <input
                    type="text"
                    placeholder="Titre de la tâche"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                  <div className={styles.composerRow}>
                    <label>
                      Liste
                      <select
                        value={draft.listId ?? ""}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, listId: event.target.value || null }))
                        }
                      >
                        <option value="">Sélectionnez une liste</option>
                        {taskLists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Échéance
                      <input
                        type="date"
                        value={draft.due ?? ""}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, due: event.target.value || null }))
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Notes
                    <textarea
                      placeholder="Détails, checklists, liens…"
                      value={draft.notes}
                      onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </label>
                </div>

                <details className={styles.recurrencePanel} open={Boolean(activeRecurrence)}>
                  <summary>Programmation des récurrences</summary>

                  <div className={styles.recurrenceGrid}>
                    <label>
                      Fréquence
                      <select
                        value={activeRecurrence?.frequency ?? "NONE"}
                        onChange={(event) => {
                          const frequency = event.target.value as RecurrenceState["frequency"];
                          if (frequency === "NONE") {
                            handleRecurrenceChange(null);
                            return;
                          }

                          const base: RecurrenceState = {
                            frequency,
                            interval: 1,
                            weekdays: frequency === "WEEKLY" ? ["MO"] : [],
                            monthDay:
                              frequency === "MONTHLY" && draft.due
                                ? new Date(draft.due).getDate()
                                : null,
                            end: { type: "never" }
                          };
                          handleRecurrenceChange(base);
                        }}
                      >
                        <option value="NONE">Aucune</option>
                        <option value="DAILY">Quotidienne</option>
                        <option value="WEEKLY">Hebdomadaire</option>
                        <option value="MONTHLY">Mensuelle</option>
                        <option value="YEARLY">Annuelle</option>
                      </select>
                    </label>

                    {activeRecurrence && activeRecurrence.frequency !== "NONE" ? (
                      <>
                        <label>
                          Intervalle
                          <input
                            type="number"
                            min={1}
                            value={activeRecurrence.interval}
                            onChange={(event) =>
                              handleRecurrenceChange({
                                ...activeRecurrence,
                                interval: Number.parseInt(event.target.value, 10) || 1
                              })
                            }
                          />
                        </label>

                        {activeRecurrence.frequency === "WEEKLY" ? (
                          <fieldset className={styles.weekdayPicker}>
                            <legend>Jours</legend>
                            <div className={styles.weekdayRow}>
                              {WEEKDAY_OPTIONS.map((option) => {
                                const active = activeRecurrence.weekdays.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    className={`${styles.weekdayButton} ${active ? styles.weekdayActive : ""}`}
                                    onClick={() => {
                                      const weekdays = active
                                        ? activeRecurrence.weekdays.filter((day) => day !== option.value)
                                        : [...activeRecurrence.weekdays, option.value];
                                      handleRecurrenceChange({ ...activeRecurrence, weekdays });
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </fieldset>
                        ) : null}

                        {activeRecurrence.frequency === "MONTHLY" ? (
                          <label>
                            Jour du mois
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={activeRecurrence.monthDay ?? ""}
                              onChange={(event) =>
                                handleRecurrenceChange({
                                  ...activeRecurrence,
                                  monthDay: event.target.value ? Number.parseInt(event.target.value, 10) : null
                                })
                              }
                            />
                          </label>
                        ) : null}

                        <fieldset className={styles.endPicker}>
                          <legend>Fin</legend>
                          <div className={styles.segmentedControl}>
                            {(["never", "after", "on"] as const).map((option) => (
                              <button
                                key={option}
                                type="button"
                                className={`${styles.segmentedItem} ${
                                  activeRecurrence.end.type === option ? styles.segmentedActive : ""
                                }`}
                                onClick={() =>
                                  handleRecurrenceChange({
                                    ...activeRecurrence,
                                    end: { type: option }
                                  })
                                }
                              >
                                {option === "never"
                                  ? "Jamais"
                                  : option === "after"
                                  ? "Après"
                                  : "À une date"}
                              </button>
                            ))}
                          </div>
                          {activeRecurrence.end.type === "after" ? (
                            <label>
                              Nombre d’occurrences
                              <input
                                type="number"
                                min={1}
                                value={typeof activeRecurrence.end.value === "number" ? activeRecurrence.end.value : ""}
                                onChange={(event) =>
                                  handleRecurrenceChange({
                                    ...activeRecurrence,
                                    end: {
                                      type: "after",
                                      value: Number.parseInt(event.target.value, 10) || 1
                                    }
                                  })
                                }
                              />
                            </label>
                          ) : null}
                          {activeRecurrence.end.type === "on" ? (
                            <label>
                              Date de fin
                              <input
                                type="date"
                                value={typeof activeRecurrence.end.value === "string" ? activeRecurrence.end.value : ""}
                                onChange={(event) =>
                                  handleRecurrenceChange({
                                    ...activeRecurrence,
                                    end: {
                                      type: "on",
                                      value: event.target.value || undefined
                                    }
                                  })
                                }
                              />
                            </label>
                          ) : null}
                        </fieldset>

                        <p className={styles.recurrencePreview}>{describeRecurrence(activeRecurrence)}</p>
                      </>
                    ) : (
                      <p className={styles.recurrenceHint}>
                        Activez une récurrence pour reproduire la finesse de Google Tasks.
                      </p>
                    )}
                  </div>
                </details>

                <button type="submit" className={`${styles.button} ${styles.primaryButton}`}>
                  Ajouter la tâche
                </button>
              </form>
            </div>
          ) : (
            <p className={styles.emptyState}>Synchronisez Google Tasks pour commencer.</p>
          )}
        </section>

        <section className={`${styles.tile} ${styles.calendarTile}`}>
          <header className={styles.tileHeader}>
            <div>
              <h2>Calendrier panoramique</h2>
              <p>Vos six prochains événements, prêts à être partagés avec toute la famille.</p>
            </div>
          </header>
          <ul className={styles.eventList}>
            {upcomingEvents.map((event) => (
              <li key={event.id} className={styles.eventRow}>
                <div className={styles.eventTime}>
                  <span>{event.start.label}</span>
                  <span>→ {event.end.label}</span>
                </div>
                <div className={styles.eventInfo}>
                  <h3>{event.summary}</h3>
                  <p>
                    {event.location ? <span>{event.location} · </span> : null}
                    {event.organizer ? <span>Organisé par {event.organizer}</span> : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {!upcomingEvents.length ? <p className={styles.emptyState}>Aucun événement à venir.</p> : null}
        </section>

        <section className={`${styles.tile} ${styles.familyTile}`}>
          <header className={styles.tileHeader}>
            <div>
              <h2>Gestion de la famille</h2>
              <p>{familySummary}</p>
            </div>
          </header>
          <ul className={styles.familyList}>
            {members.map((member) => (
              <li key={member.id} className={styles.familyRow}>
                <div>
                  <strong>{member.displayName}</strong>
                  <p>{member.email}</p>
                </div>
                <div className={styles.familyMeta}>
                  <span className={styles.roleBadge}>{member.role}</span>
                  <button type="button" onClick={() => handleRemoveMember(member.id)}>
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <form className={styles.inviteForm} onSubmit={handleMemberSubmit}>
            <h3>Inviter un membre</h3>
            <div className={styles.composerGrid}>
              <input
                type="text"
                placeholder="Nom complet"
                value={pendingMember.name}
                onChange={(event) => setPendingMember((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <input
                type="email"
                placeholder="Adresse e-mail"
                value={pendingMember.email}
                onChange={(event) => setPendingMember((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <select
                value={pendingMember.role}
                onChange={(event) =>
                  setPendingMember((current) => ({ ...current, role: event.target.value as FamilyMember["role"] }))
                }
              >
                <option value="parent">Parent</option>
                <option value="enfant">Enfant</option>
                <option value="tuteur">Tuteur</option>
              </select>
            </div>
            <button type="submit" className={styles.button}>
              Envoyer l’invitation
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

