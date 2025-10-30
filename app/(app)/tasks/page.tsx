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
  const { taskLists, createTask, toggleTaskStatus } = useDashboard();
  const [selectedListId, setSelectedListId] = useState<string | null>(taskLists[0]?.id ?? null);
  const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);
  const [calendarMonth, setCalendarMonth] = useState<Date>(draft.due ?? new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedList = useMemo(
    () => taskLists.find((list) => list.id === selectedListId) ?? taskLists[0],
    [selectedListId, taskLists]
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la tâche");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecurrenceChange = (next: RecurrenceState | null) => {
    setDraft((current) => ({ ...current, recurrence: next }));
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.listSidebar}>
        <header>
          <h1>Tâches</h1>
          <p>Choisissez une liste pour consulter et gérer vos tâches.</p>
        </header>
        <ul>
          {taskLists.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                className={selectedList?.id === list.id ? styles.listButtonActive : styles.listButton}
                onClick={() => setSelectedListId(list.id)}
              >
                <span>{list.title}</span>
                <small>
                  {list.tasks.filter((task) => task.status !== "completed").length} à faire / {list.tasks.length} total
                </small>
              </button>
            </li>
          ))}
          {!taskLists.length ? <li className={styles.empty}>Lancez une synchronisation pour récupérer vos tâches.</li> : null}
        </ul>
      </aside>

      <section className={styles.content}>
        <div className={styles.board}>
          <div className={styles.composer}>
            <form onSubmit={handleSubmit}>
              <div className={styles.fieldRow}>
                <label>
                  Titre
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Ex: Ranger la chambre de Léo"
                    required
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Détails, instructions, liens…"
                  />
                </label>
              </div>
              <div className={styles.calendarRow}>
                <div className={styles.calendarPanel}>
                  <MonthlyCalendar
                    month={calendarMonth}
                    selectedDate={draft.due}
                    onSelectDate={(date) => setDraft((current) => ({ ...current, due: date }))}
                    onMonthChange={(next) => setCalendarMonth(next)}
                    markers={calendarMarkers}
                    compact
                  />
                  <div className={styles.calendarActions}>
                    <button type="button" onClick={() => setDraft((current) => ({ ...current, due: null }))}>
                      Effacer la date
                    </button>
                    {draft.due ? (
                      <span>{draft.due.toLocaleDateString("fr-FR", { dateStyle: "long" })}</span>
                    ) : (
                      <span>Aucune échéance</span>
                    )}
                  </div>
                </div>
                <div className={styles.recurrencePanel}>
                  <label>
                    Récurrence
                    <select
                      value={draft.recurrence?.frequency ?? "NONE"}
                      onChange={(event) => {
                        const frequency = event.target.value as RecurrenceFrequency;
                        if (frequency === "NONE") {
                          handleRecurrenceChange(null);
                        } else {
                          handleRecurrenceChange(createBaseRecurrence(frequency, draft.due));
                        }
                      }}
                    >
                      <option value="NONE">Aucune</option>
                      <option value="DAILY">Jour</option>
                      <option value="WEEKLY">Semaine</option>
                      <option value="MONTHLY">Mois</option>
                      <option value="YEARLY">Année</option>
                    </select>
                  </label>
                  {draft.recurrence && draft.recurrence.frequency !== "NONE" ? (
                    <div className={styles.recurrenceFields}>
                      <label>
                        Intervalle
                        <input
                          type="number"
                          min={1}
                          value={draft.recurrence.interval}
                          onChange={(event) =>
                            handleRecurrenceChange({
                              ...draft.recurrence!,
                              interval: Number.parseInt(event.target.value, 10) || 1,
                            })
                          }
                        />
                      </label>
                      {draft.recurrence.frequency === "WEEKLY" ? (
                        <fieldset>
                          <legend>Jours</legend>
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
                                    handleRecurrenceChange({ ...draft.recurrence!, weekdays });
                                  }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      ) : null}
                      {draft.recurrence.frequency === "MONTHLY" ? (
                        <label>
                          Jour du mois
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={draft.recurrence.monthDay ?? draft.due?.getDate() ?? 1}
                            onChange={(event) =>
                              handleRecurrenceChange({
                                ...draft.recurrence!,
                                monthDay: Number.parseInt(event.target.value, 10) || 1,
                              })
                            }
                          />
                        </label>
                      ) : null}
                      <label>
                        Fin de répétition
                        <select
                          value={draft.recurrence.end.type}
                          onChange={(event) =>
                            handleRecurrenceChange({
                              ...draft.recurrence!,
                              end: { type: event.target.value as RecurrenceState["end"]["type"] },
                            })
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
                              handleRecurrenceChange({
                                ...draft.recurrence!,
                                end: {
                                  type: "after",
                                  value: Number.parseInt(event.target.value, 10) || 1,
                                },
                              })
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
                              handleRecurrenceChange({
                                ...draft.recurrence!,
                                end: { type: "on", value: event.target.value || undefined },
                              })
                            }
                          />
                        </label>
                      ) : null}
                      <span className={styles.recurrenceSummary}>{describeRecurrence(draft.recurrence)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              {error ? <p className={styles.error}>{error}</p> : null}
              <div className={styles.submitRow}>
                <button type="submit" className={styles.submitButton} disabled={submitting || !selectedList}>
                  {submitting ? "Ajout…" : "Ajouter la tâche"}
                </button>
              </div>
            </form>
          </div>

          <div className={styles.taskList}>
            <header>
              <h2>{selectedList?.title ?? "Aucune liste"}</h2>
              <span>
                {selectedList?.tasks.filter((task) => task.status !== "completed").length ?? 0} à faire · {selectedList?.tasks.length ?? 0} total
              </span>
            </header>
            <ul>
              {selectedList?.tasks.map((task) => (
                <li key={task.id} className={task.status === "completed" ? styles.taskCompleted : undefined}>
                  <div>
                    <strong>{task.title}</strong>
                    {task.notes ? <p>{task.notes}</p> : null}
                    <div className={styles.taskMeta}>
                      {task.due?.iso ? <span>Échéance {new Date(task.due.iso).toLocaleDateString("fr-FR", { dateStyle: "medium" })}</span> : null}
                      {task.recurrence?.length ? <span>Répétition active</span> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toggleTaskStatus(
                        selectedList!.id,
                        task.id,
                        task.status === "completed" ? "needsAction" : "completed"
                      )
                    }
                  >
                    {task.status === "completed" ? "Rouvrir" : "Terminer"}
                  </button>
                </li>
              ))}
              {!selectedList?.tasks.length ? <li className={styles.empty}>Aucune tâche dans cette liste.</li> : null}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
