"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { MonthlyCalendar } from "@/components/calendar/MonthlyCalendar";
import {
  WEEKDAY_OPTIONS,
  describeRecurrence,
  type RecurrenceState,
  type RecurrenceFrequency,
} from "@/components/tasks/recurrence";
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

const RepeatIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 4v5h5M20 20v-5h-5M5.5 15.5a6 6 0 019.5-7.5l1 1M18.5 8.5a6 6 0 00-9.5 7.5l1 1"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 3v2m10-2v2M5 8h14M6 5h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const LightningIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M13 3L5 13h6l-1 8 8-10h-6l1-8z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

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
  const { taskLists, createTask, toggleTaskStatus } = useDashboard();
  const [selectedListId, setSelectedListId] = useState<string | null>(taskLists[0]?.id ?? null);
  const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);
  const [calendarMonth, setCalendarMonth] = useState<Date>(draft.due ?? new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const selectedList = useMemo(
    () => taskLists.find((list) => list.id === selectedListId) ?? taskLists[0],
    [selectedListId, taskLists],
  );

  useEffect(() => {
    if (!taskLists.length) {
      setSelectedListId(null);
      return;
    }
    if (!selectedListId || !taskLists.some((list) => list.id === selectedListId)) {
      setSelectedListId(taskLists[0].id);
    }
  }, [selectedListId, taskLists]);

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerLabel}>Gestion rapide des tâches</span>
        <div className={styles.listPicker} role="tablist" aria-label="Listes de tâches Google">
          {taskLists.map((list) => {
            const active = selectedList?.id === list.id;
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setSelectedListId(list.id)}
                className={active ? styles.listChipActive : styles.listChip}
                role="tab"
                aria-selected={active}
              >
                <span>{list.title}</span>
                <small>{list.tasks.filter((task) => task.status !== "completed").length}</small>
              </button>
            );
          })}
          {!taskLists.length ? <span className={styles.empty}>Synchronisez vos tâches pour commencer.</span> : null}
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.composerCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.composerRow}>
              <span className={styles.composerIcon} aria-hidden="true">
                ＋
              </span>
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ajouter une tâche (ex: Ranger la chambre)"
                required
              />
              <button
                type="button"
                className={showRecurrence ? styles.iconToggleActive : styles.iconToggle}
                onClick={() => setShowRecurrence((value) => !value)}
                aria-pressed={showRecurrence}
                aria-label="Configurer une récurrence"
              >
                <RepeatIcon />
              </button>
              <button type="submit" className={celebrating ? styles.submitButtonCelebrating : styles.submitButton} disabled={submitting}>
                {submitting ? "Ajout…" : celebrating ? "✨" : "Ajouter"}
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
                <LightningIcon />
                Aujourd’hui
              </button>
              <button type="button" onClick={() => applyDueOffset(1)}>
                <LightningIcon />
                Demain
              </button>
              <button
                type="button"
                className={showPlanner ? styles.quickActionActive : undefined}
                onClick={() => setShowPlanner((value) => !value)}
              >
                <CalendarIcon />
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
        </div>

        <div className={styles.taskColumn}>
          <header>
            <span>{selectedList?.title ?? "Aucune liste"}</span>
            <span>
              {tasksByStatus.pending.length} à faire · {tasksByStatus.completed.length} terminées
            </span>
          </header>

          <ul className={styles.taskList}>
            {tasksByStatus.pending.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className={styles.checkbox}
                  onClick={() => handleCheck(task.id, "completed")}
                  aria-label={`Marquer ${task.title} comme terminée`}
                />
                <div>
                  <strong>{task.title}</strong>
                  {task.notes ? <p>{task.notes}</p> : null}
                  <div className={styles.taskMeta}>
                    {task.due?.iso ? <span>Échéance {new Date(task.due.iso).toLocaleDateString("fr-FR", { dateStyle: "medium" })}</span> : null}
                    {task.recurrence?.length ? <span>Répétition active</span> : null}
                  </div>
                </div>
              </li>
            ))}
            {!tasksByStatus.pending.length ? (
              <li className={styles.empty}>Respirez, tout est à jour dans cette liste.</li>
            ) : null}
          </ul>

          {tasksByStatus.completed.length ? (
            <details className={styles.completedBlock}>
              <summary>{tasksByStatus.completed.length} tâche(s) terminée(s)</summary>
              <ul>
                {tasksByStatus.completed.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      className={`${styles.checkbox} ${styles.checkboxChecked}`}
                      onClick={() => handleCheck(task.id, "needsAction")}
                      aria-label={`Rouvrir ${task.title}`}
                    />
                    <div>
                      <strong>{task.title}</strong>
                      <div className={styles.taskMeta}>
                        {task.due?.iso ? <span>Échéance {new Date(task.due.iso).toLocaleDateString("fr-FR", { dateStyle: "medium" })}</span> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </section>
    </div>
  );
}
