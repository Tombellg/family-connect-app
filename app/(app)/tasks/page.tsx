"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowPathRoundedSquareIcon,
  BoltIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { MonthlyCalendar } from "@/components/calendar/MonthlyCalendar";
import {
  WEEKDAY_OPTIONS,
  describeRecurrence,
  type RecurrenceState,
  type RecurrenceFrequency,
} from "@/components/tasks/recurrence";
import type { FormattedTaskList } from "@/lib/google";
import styles from "./tasks.module.css";

type DraftState = {
  title: string;
  notes: string;
  due: Date | null;
  recurrence: RecurrenceState | null;
};

type CheckboxStatus = "needsAction" | "completed";

const DEFAULT_DRAFT: DraftState = {
  title: "",
  notes: "",
  due: null,
  recurrence: null,
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createBaseRecurrence(frequency: RecurrenceFrequency, due: Date | null): RecurrenceState {
  return {
    frequency,
    interval: 1,
    weekdays: frequency === "WEEKLY" ? ["MO"] : [],
    monthDay: frequency === "MONTHLY" && due ? due.getDate() : null,
    end: { type: "never" },
  };
}

export default function TasksPage() {
  const { data: session } = useSession();
  const { taskLists, createTask, toggleTaskStatus } = useDashboard();
  const [selectedListId, setSelectedListId] = useState<string | null>(taskLists[0]?.id ?? null);
  const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);
  const [calendarMonth, setCalendarMonth] = useState<Date>(draft.due ?? new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const groupedLists = useMemo(() => {
    if (!taskLists.length) {
      return [] as { id: string; label: string; lists: FormattedTaskList[] }[];
    }
    const fallbackLabel = session?.user?.email ?? "Compte Google";
    const groups = new Map<string, { label: string; lists: FormattedTaskList[] }>();
    taskLists.forEach((list) => {
      const key = list.kind ?? "default";
      const label = key === "tasks#taskList" ? fallbackLabel : key;
      if (!groups.has(key)) {
        groups.set(key, { label, lists: [] });
      }
      groups.get(key)!.lists.push(list);
    });
    return Array.from(groups.entries()).map(([id, group]) => ({ id, ...group }));
  }, [session?.user?.email, taskLists]);

  const selectedList = useMemo(() => {
    if (!taskLists.length) {
      return undefined;
    }
    if (selectedListId) {
      return taskLists.find((list) => list.id === selectedListId) ?? taskLists[0];
    }
    return taskLists[0];
  }, [selectedListId, taskLists]);

  useEffect(() => {
    if (!groupedLists.length) {
      setSelectedListId(null);
      return;
    }
    const allIds = groupedLists.flatMap((group) => group.lists.map((list) => list.id));
    if (!selectedListId || !allIds.includes(selectedListId)) {
      setSelectedListId(allIds[0] ?? null);
    }
  }, [groupedLists, selectedListId]);

  useEffect(() => {
    if (draft.due) {
      setCalendarMonth(new Date(draft.due.getFullYear(), draft.due.getMonth(), 1));
      setDraft((current) => {
        if (!current.recurrence || current.recurrence.frequency !== "MONTHLY" || !current.due) {
          return current;
        }
        const monthDay = current.due.getDate();
        if (current.recurrence.monthDay === monthDay) {
          return current;
        }
        return { ...current, recurrence: { ...current.recurrence, monthDay } };
      });
    }
  }, [draft.due]);

  useEffect(() => {
    if (!celebrating) {
      return;
    }
    const timer = window.setTimeout(() => setCelebrating(false), 1100);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  useEffect(() => {
    const openDrawer = () => setMenuOpen(true);
    const closeDrawer = () => setMenuOpen(false);
    window.addEventListener("fc:open-drawer", openDrawer);
    window.addEventListener("fc:close-drawer", closeDrawer);
    return () => {
      window.removeEventListener("fc:open-drawer", openDrawer);
      window.removeEventListener("fc:close-drawer", closeDrawer);
    };
  }, []);

  useEffect(() => {
    const handleCreateTask = () => {
      if (!groupedLists.length) {
        return;
      }
      if (!selectedListId) {
        const fallback = groupedLists[0]?.lists[0];
        if (fallback) {
          setSelectedListId(fallback.id);
        }
      }
      setMenuOpen(false);
      setComposerOpen(true);
      setError(null);
      setShowPlanner(false);
      setShowRecurrence(false);
    };
    window.addEventListener("fc:create-task", handleCreateTask);
    return () => window.removeEventListener("fc:create-task", handleCreateTask);
  }, [groupedLists, selectedListId]);

  const calendarMarkers = useMemo(() => {
    if (!selectedList) {
      return [];
    }
    const counters = new Map<string, { pending: number; completed: number }>();
    selectedList.tasks.forEach((task) => {
      if (!task.due?.iso) {
        return;
      }
      const key = task.due.iso.split("T")[0];
      if (!counters.has(key)) {
        counters.set(key, { pending: 0, completed: 0 });
      }
      const bucket = counters.get(key)!;
      if (task.status === "completed") {
        bucket.completed += 1;
      } else {
        bucket.pending += 1;
      }
    });
    return Array.from(counters.entries()).map(([date, value]) => ({
      date,
      label: value.pending ? String(value.pending) : "✓",
      color: value.pending ? undefined : "#4ade80",
    }));
  }, [selectedList]);

  const openComposer = () => {
    if (!selectedList) {
      return;
    }
    setComposerOpen(true);
    setError(null);
    setMenuOpen(false);
    setShowPlanner(false);
    setShowRecurrence(false);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setShowPlanner(false);
    setShowRecurrence(false);
    setError(null);
  };

  const tasksByStatus = useMemo(() => {
    const pending = selectedList?.tasks.filter((task) => task.status !== "completed") ?? [];
    const completed = selectedList?.tasks.filter((task) => task.status === "completed") ?? [];
    pending.sort((a, b) => {
      if (!a.due?.iso && !b.due?.iso) {
        return a.title.localeCompare(b.title);
      }
      if (!a.due?.iso) return 1;
      if (!b.due?.iso) return -1;
      return new Date(a.due.iso).getTime() - new Date(b.due.iso).getTime();
    });
    completed.sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
    return { pending, completed };
  }, [selectedList]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedList) {
      setError("Aucune liste sélectionnée");
      return;
    }
    if (!draft.title.trim()) {
      setError("Donnez un titre à votre tâche");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createTask({
        listId: selectedList.id,
        title: draft.title,
        notes: draft.notes || undefined,
        due: draft.due ? formatDateKey(draft.due) : null,
        recurrence: draft.recurrence,
      });
      setDraft((current) => ({ ...DEFAULT_DRAFT, due: current.due }));
      setShowPlanner(false);
      setCelebrating(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la tâche");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRecurrence = (frequency: RecurrenceFrequency) => {
    if (frequency === "NONE") {
      setDraft((current) => ({ ...current, recurrence: null }));
      return;
    }
    setDraft((current) => ({ ...current, recurrence: createBaseRecurrence(frequency, current.due) }));
  };

  const applyDueOffset = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDraft((current) => ({ ...current, due: date }));
  };

  const handleCheck = async (taskId: string, status: CheckboxStatus) => {
    if (!selectedList) {
      return;
    }
    await toggleTaskStatus(selectedList.id, taskId, status);
  };

  const pendingTasks = tasksByStatus.pending;
  const completedTasks = tasksByStatus.completed;

  return (
    <div className={styles.page} data-menu-open={menuOpen || undefined}>
      <aside
        id="tasks-panel"
        className={styles.panel}
        data-open={menuOpen || undefined}
        aria-hidden={!menuOpen ? true : undefined}
      >
        <div className={styles.panelSection}>
          <header>
            <span>Listes de tâches</span>
          </header>
          {groupedLists.map((group) => (
            <div key={group.id} className={styles.group}>
              <span className={styles.groupLabel}>{group.label}</span>
              <div className={styles.groupLists}>
                {group.lists.map((list) => {
                  const active = selectedList?.id === list.id;
                  const pendingCount = list.tasks.filter((task) => task.status !== "completed").length;
                  return (
                    <button
                      key={list.id}
                      type="button"
                      className={active ? styles.listButtonActive : styles.listButton}
                      onClick={() => {
                        setSelectedListId(list.id);
                        setMenuOpen(false);
                      }}
                      aria-pressed={active}
                    >
                      <span>{list.title}</span>
                      <small>{pendingCount}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!groupedLists.length ? <p className={styles.panelEmpty}>Synchronisez vos tâches pour commencer.</p> : null}
        </div>
      </aside>

      <section className={styles.workspace}>
        <div className={styles.listCard}>
          <header className={styles.listHeader}>
            <div className={styles.listTitle}>
              <span>{selectedList?.title ?? "Aucune liste sélectionnée"}</span>
              {selectedList ? (
                <small>
                  {pendingTasks.length} à faire · {completedTasks.length} terminées
                </small>
              ) : null}
            </div>
          </header>
          <ul className={styles.taskList}>
            <li className={styles.addRow}>
              {selectedList ? (
                composerOpen ? (
                  <form className={styles.addForm} onSubmit={handleSubmit}>
                    <div className={styles.addFormRow}>
                      <PlusCircleIcon aria-hidden="true" className={styles.addIcon} />
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Ajouter une tâche (ex : Ranger la chambre)"
                        className={styles.addInput}
                        required
                      />
                      <button
                        type="button"
                        className={showRecurrence ? styles.toggleButtonActive : styles.toggleButton}
                        onClick={() => setShowRecurrence((value) => !value)}
                        aria-pressed={showRecurrence}
                        aria-label="Configurer une récurrence"
                      >
                        <ArrowPathRoundedSquareIcon aria-hidden="true" />
                      </button>
                      <button
                        type="submit"
                        className={celebrating ? styles.addSubmitCelebrating : styles.addSubmit}
                        disabled={submitting}
                      >
                        {submitting ? "Ajout…" : celebrating ? "✨" : "Ajouter"}
                      </button>
                      <button type="button" className={styles.addCancel} onClick={closeComposer} aria-label="Fermer">
                        <XMarkIcon aria-hidden="true" />
                      </button>
                    </div>
                    <label className={styles.notesField}>
                      <span>Notes</span>
                      <textarea
                        value={draft.notes}
                        onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Ajoutez un détail ou un lien rapide"
                      />
                    </label>
                    <div className={styles.quickActions}>
                      <button type="button" onClick={() => applyDueOffset(0)}>
                        <BoltIcon aria-hidden="true" />
                        Aujourd’hui
                      </button>
                      <button type="button" onClick={() => applyDueOffset(1)}>
                        <BoltIcon aria-hidden="true" />
                        Demain
                      </button>
                      <button
                        type="button"
                        className={showPlanner ? styles.quickActionActive : undefined}
                        onClick={() => setShowPlanner((value) => !value)}
                      >
                        <CalendarDaysIcon aria-hidden="true" />
                        Choisir une date
                      </button>
                      <span className={styles.dueLabel}>
                        {draft.due ? draft.due.toLocaleDateString("fr-FR", { dateStyle: "long" }) : "Aucune échéance"}
                      </span>
                    </div>
                    {showPlanner ? (
                      <div className={styles.calendarPanel}>
                        <MonthlyCalendar
                          month={calendarMonth}
                          selectedDate={draft.due}
                          onSelectDate={(date) => setDraft((current) => ({ ...current, due: date }))}
                          onMonthChange={(next) => setCalendarMonth(next)}
                          markers={calendarMarkers}
                          compact
                        />
                        <button
                          type="button"
                          className={styles.clearDate}
                          onClick={() => setDraft((current) => ({ ...current, due: null }))}
                        >
                          Effacer la date
                        </button>
                      </div>
                    ) : null}
                    {showRecurrence ? (
                      <div className={styles.recurrencePanel}>
                        <div className={styles.recurrenceRow}>
                          <label>
                            Fréquence
                            <select
                              value={draft.recurrence?.frequency ?? "NONE"}
                              onChange={(event) => toggleRecurrence(event.target.value as RecurrenceFrequency)}
                            >
                              <option value="NONE">Aucune</option>
                              <option value="DAILY">Jour</option>
                              <option value="WEEKLY">Semaine</option>
                              <option value="MONTHLY">Mois</option>
                              <option value="YEARLY">Année</option>
                            </select>
                          </label>
                          {draft.recurrence && draft.recurrence.frequency !== "NONE" ? (
                            <label>
                              Intervalle
                              <input
                                type="number"
                                min={1}
                                value={draft.recurrence.interval}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    recurrence: {
                                      ...current.recurrence!,
                                      interval: Number.parseInt(event.target.value, 10) || 1,
                                    },
                                  }))
                                }
                              />
                            </label>
                          ) : null}
                        </div>
                        {draft.recurrence && draft.recurrence.frequency === "WEEKLY" ? (
                          <div className={styles.weekdayRow}>
                            {WEEKDAY_OPTIONS.map((option) => {
                              const active = draft.recurrence!.weekdays.includes(option.value);
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={active ? styles.weekdayActive : styles.weekdayButton}
                                  onClick={() => {
                                    const weekdays = active
                                      ? draft.recurrence!.weekdays.filter((day) => day !== option.value)
                                      : [...draft.recurrence!.weekdays, option.value];
                                    setDraft((current) => ({
                                      ...current,
                                      recurrence: { ...current.recurrence!, weekdays },
                                    }));
                                  }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        {draft.recurrence && draft.recurrence.frequency === "MONTHLY" ? (
                          <label className={styles.monthDayField}>
                            Jour du mois
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={draft.recurrence.monthDay ?? draft.due?.getDate() ?? 1}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  recurrence: {
                                    ...current.recurrence!,
                                    monthDay: Number.parseInt(event.target.value, 10) || 1,
                                  },
                                }))
                              }
                            />
                          </label>
                        ) : null}
                        {draft.recurrence && draft.recurrence.frequency !== "NONE" ? (
                          <div className={styles.recurrenceEnd}>
                            <label>
                              Fin de répétition
                              <select
                                value={draft.recurrence.end.type}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    recurrence: {
                                      ...current.recurrence!,
                                      end: { type: event.target.value as RecurrenceState["end"]["type"] },
                                    },
                                  }))
                                }
                              >
                                <option value="never">Jamais</option>
                                <option value="after">Après un certain nombre</option>
                                <option value="on">À une date</option>
                              </select>
                            </label>
                            {draft.recurrence.end.type === "after" ? (
                              <label>
                                Nombre d’occurrences
                                <input
                                  type="number"
                                  min={1}
                                  value={typeof draft.recurrence.end.value === "number" ? draft.recurrence.end.value : 1}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      recurrence: {
                                        ...current.recurrence!,
                                        end: {
                                          type: "after",
                                          value: Number.parseInt(event.target.value, 10) || 1,
                                        },
                                      },
                                    }))
                                  }
                                />
                              </label>
                            ) : null}
                            {draft.recurrence.end.type === "on" ? (
                              <label>
                                Date de fin
                                <input
                                  type="date"
                                  value={typeof draft.recurrence.end.value === "string" ? draft.recurrence.end.value : ""}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      recurrence: {
                                        ...current.recurrence!,
                                        end: { type: "on", value: event.target.value || undefined },
                                      },
                                    }))
                                  }
                                />
                              </label>
                            ) : null}
                          </div>
                        ) : null}
                        <span className={styles.recurrenceSummary}>{describeRecurrence(draft.recurrence)}</span>
                      </div>
                    ) : null}
                    {error ? <p className={styles.error}>{error}</p> : null}
                  </form>
                ) : (
                  <button type="button" className={styles.addTrigger} onClick={openComposer}>
                    <PlusCircleIcon aria-hidden="true" />
                    <span>Ajouter une tâche</span>
                  </button>
                )
              ) : (
                <span className={styles.emptyRow}>Aucune liste disponible. Synchronisez vos comptes.</span>
              )}
            </li>
            {pendingTasks.map((task) => (
              <li key={task.id} className={styles.taskRow}>
                <label className={styles.taskLabel}>
                  <input
                    type="checkbox"
                    checked={task.status === "completed"}
                    onChange={() => handleCheck(task.id, task.status === "completed" ? "needsAction" : "completed")}
                    aria-label={
                      task.status === "completed"
                        ? `Rouvrir ${task.title}`
                        : `Marquer ${task.title} comme terminée`
                    }
                  />
                  <span>
                    <strong>{task.title}</strong>
                    {task.notes ? <p>{task.notes}</p> : null}
                    <div className={styles.taskMeta}>
                      {task.due?.iso ? (
                        <span>
                          Échéance {new Date(task.due.iso).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
                        </span>
                      ) : null}
                      {task.recurrence?.length ? <span>Tâche récurrente</span> : null}
                    </div>
                  </span>
                </label>
              </li>
            ))}
            {pendingTasks.length === 0 && selectedList ? (
              <li className={styles.emptyRow}>Respirez, tout est à jour dans cette liste.</li>
            ) : null}
            {completedTasks.length ? (
              <li className={styles.sectionDivider}>
                <details open>
                  <summary>{completedTasks.length} tâche(s) terminée(s)</summary>
                  <ul>
                    {completedTasks.map((task) => (
                      <li key={task.id}>
                        <label className={styles.taskLabel}>
                          <input
                            type="checkbox"
                            checked
                            onChange={() => handleCheck(task.id, "needsAction")}
                            aria-label={`Rouvrir ${task.title}`}
                          />
                          <span>
                            <strong>{task.title}</strong>
                            <div className={styles.taskMeta}>
                              {task.due?.iso ? (
                                <span>
                                  Échéance {new Date(task.due.iso).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
                                </span>
                              ) : null}
                            </div>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
