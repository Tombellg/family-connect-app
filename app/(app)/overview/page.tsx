"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./overview.module.css";

type PreviewMode = "tasks" | "calendar";

function formatDueLabel(dateIso?: string) {
  if (!dateIso) {
    return "Sans échéance";
  }
  const target = new Date(dateIso);
  return target.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export default function OverviewPage() {
  const { taskLists, events, syncing, lastSync } = useDashboard();
  const [mode, setMode] = useState<PreviewMode>("tasks");

  const { totalTasks, completedTasks, overdueTasks } = useMemo(() => {
    const flattened = taskLists.flatMap((list) => list.tasks);
    const total = flattened.length;
    const completed = flattened.filter((task) => task.status === "completed").length;
    const now = new Date();
    const overdue = flattened.filter((task) => {
      if (!task.due?.iso || task.status === "completed") {
        return false;
      }
      return new Date(task.due.iso) < now;
    });
    return { totalTasks: total, completedTasks: completed, overdueTasks: overdue };
  }, [taskLists]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((event) => Boolean(event.start.iso))
      .sort((a, b) => new Date(a.start.iso ?? 0).getTime() - new Date(b.start.iso ?? 0).getTime())
      .slice(0, 5);
  }, [events]);

  const nextTasks = useMemo(() => {
    return taskLists
      .flatMap((list) => list.tasks.map((task) => ({ ...task, listTitle: list.title })))
      .filter((task) => task.status !== "completed")
      .sort((a, b) => {
        if (!a.due?.iso && !b.due?.iso) {
          return a.title.localeCompare(b.title);
        }
        if (!a.due?.iso) return 1;
        if (!b.due?.iso) return -1;
        return new Date(a.due.iso).getTime() - new Date(b.due.iso).getTime();
      })
      .slice(0, 6);
  }, [taskLists]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSync) {
      return "Jamais synchronisé";
    }
    return `Synchronisé le ${lastSync.toLocaleDateString("fr-FR", { dateStyle: "medium" })}`;
  }, [lastSync]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>{syncing ? "Synchronisation en cours" : lastSyncLabel}</span>
          <h1>Votre cockpit familial</h1>
          <p>
            Une vision claire de la semaine et des actions immédiates pour garder votre foyer parfaitement aligné.
            Naviguez librement entre vos tâches et votre calendrier en un geste.
          </p>
          <div className={styles.modeSwitcher} role="tablist" aria-label="Choisir une vue à explorer">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "tasks"}
              className={mode === "tasks" ? styles.switchActive : styles.switchButton}
              onClick={() => setMode("tasks")}
            >
              Tâches
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "calendar"}
              className={mode === "calendar" ? styles.switchActive : styles.switchButton}
              onClick={() => setMode("calendar")}
            >
              Calendrier
            </button>
          </div>
          <div className={styles.ctaRow}>
            <Link href="/tasks" className={styles.ctaPrimary}>
              Ouvrir les tâches
            </Link>
            <Link href="/calendar" className={styles.ctaSecondary}>
              Voir le calendrier
            </Link>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div>
            <span>Total de tâches</span>
            <strong>{totalTasks}</strong>
          </div>
          <div>
            <span>Terminées</span>
            <strong>{completedTasks}</strong>
          </div>
          <div>
            <span>Évènements à venir</span>
            <strong>{events.length}</strong>
          </div>
          <div>
            <span>Tâches en retard</span>
            <strong>{overdueTasks.length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <header>
            <span>Progression générale</span>
            <strong>{totalTasks ? Math.round((completedTasks / Math.max(totalTasks, 1)) * 100) : 0}%</strong>
          </header>
          <p>Suivez l&apos;avancement global de vos listes Google Tasks.</p>
        </article>
        <article className={styles.metricCard}>
          <header>
            <span>Rendez-vous</span>
            <strong>{upcomingEvents.length}</strong>
          </header>
          <p>Les 5 prochains évènements Google Calendar s&apos;affichent ci-dessous.</p>
        </article>
        <article className={styles.metricCard}>
          <header>
            <span>Équilibre</span>
            <strong>{taskLists.length}</strong>
          </header>
          <p>Listes synchronisées pour organiser votre quotidien en famille.</p>
        </article>
      </section>

      <section className={styles.previewSection}>
        <header>
          <h2>{mode === "tasks" ? "Aperçu des tâches" : "Calendrier visuel"}</h2>
          <span>
            {mode === "tasks"
              ? "Un résumé épuré pour terminer les prochaines actions"
              : "Votre mois en un clin d’œil avec les évènements et tâches clés"}
          </span>
        </header>

        <div className={styles.previewBoard}>
          {mode === "tasks" ? (
            <ul className={styles.taskPreview}>
              {nextTasks.map((task) => (
                <li key={task.id}>
                  <span className={styles.taskIcon} aria-hidden="true">◻️</span>
                  <div>
                    <strong>{task.title}</strong>
                    <span>
                      {task.listTitle}
                      {task.due?.iso ? ` · ${formatDueLabel(task.due.iso)}` : ""}
                    </span>
                  </div>
                </li>
              ))}
              {!nextTasks.length ? (
                <li className={styles.empty}>Aucune tâche à afficher. Créez-en une depuis la vue Tâches.</li>
              ) : null}
            </ul>
          ) : (
            <div className={styles.calendarPreview}>
              {upcomingEvents.map((event) => (
                <article key={event.id}>
                  <header>
                    <span>
                      {event.start.iso
                        ? new Date(event.start.iso).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        : "Sans date"}
                    </span>
                    <strong>{event.summary}</strong>
                  </header>
                  <p>
                    {event.isAllDay
                      ? "Journée complète"
                      : event.start.iso
                      ? new Date(event.start.iso).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Sans horaire"}
                  </p>
                  {event.location ? <footer>{event.location}</footer> : null}
                </article>
              ))}
              {!upcomingEvents.length ? (
                <p className={styles.empty}>Aucun évènement planifié. Ajoutez-en un depuis la vue Calendrier.</p>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
