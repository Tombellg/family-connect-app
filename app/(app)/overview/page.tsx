"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./overview.module.css";

type Insight = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 17l7-7-7-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
  </svg>
);

const TaskGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M9 11l2 2 4-4M6 5h12a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const CalendarGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 3v2m10-2v2M5 8h14M6 5h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zm2 5h2v2H8z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

function formatDueLabel(dateIso?: string) {
  if (!dateIso) {
    return "Sans échéance";
  }
  const target = new Date(dateIso);
  return target.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatEventTime(dateIso?: string | null, isAllDay?: boolean) {
  if (!dateIso) {
    return "Toute la journée";
  }
  const date = new Date(dateIso);
  if (isAllDay) {
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function OverviewPage() {
  const { taskLists, events, syncing, lastSync } = useDashboard();

  const { totalTasks, completedTasks, overdueTasks } = useMemo(() => {
    const flattened = taskLists.flatMap((list) => list.tasks);
    const total = flattened.length;
    const completed = flattened.filter((task) => task.status === "completed").length;
    const overdue = flattened.filter((task) => {
      if (!task.due?.iso || task.status === "completed") {
        return false;
      }
      return new Date(task.due.iso) < new Date();
    });
    return { totalTasks: total, completedTasks: completed, overdueTasks: overdue };
  }, [taskLists]);

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
      .slice(0, 5);
  }, [taskLists]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((event) => Boolean(event.start.iso))
      .sort((a, b) => new Date(a.start.iso ?? 0).getTime() - new Date(b.start.iso ?? 0).getTime())
      .slice(0, 5);
  }, [events]);

  const syncStatusLabel = useMemo(() => {
    if (syncing) {
      return "Synchronisation en cours";
    }
    if (!lastSync) {
      return "Jamais synchronisé";
    }
    return `Synchronisé le ${lastSync.toLocaleDateString("fr-FR", { dateStyle: "medium" })}`;
  }, [lastSync, syncing]);

  const insights: Insight[] = useMemo(() => {
    const completion = totalTasks ? Math.round((completedTasks / Math.max(totalTasks, 1)) * 100) : 0;
    return [
      {
        id: "completion",
        label: "Progression",
        value: `${completion}%`,
        detail: completion >= 80 ? "Très bon rythme" : "Cap sur vos objectifs",
      },
      {
        id: "upcoming",
        label: "Évènements",
        value: `${upcomingEvents.length}`,
        detail: upcomingEvents.length ? "Restez prêts" : "Agenda calme",
      },
      {
        id: "overdue",
        label: "À rattraper",
        value: `${overdueTasks.length}`,
        detail: overdueTasks.length ? "Quelques tâches en attente" : "Aucun retard",
      },
    ];
  }, [completedTasks, overdueTasks.length, totalTasks, upcomingEvents.length]);

  return (
    <div className={styles.page}>
      <section className={styles.deckWrapper}>
        <header className={styles.deckHeader}>
          <span>Tableau de bord familial</span>
          <span>{syncStatusLabel}</span>
        </header>
        <div className={styles.deckScroller}>
          <article className={styles.deckCard}>
            <div className={styles.cardTop}>
              <TaskGlyph />
              <span>Actions immédiates</span>
            </div>
            <ul className={styles.compactList}>
              {nextTasks.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong>
                  <span>
                    {task.listTitle}
                    {task.due?.iso ? ` · ${formatDueLabel(task.due.iso)}` : ""}
                  </span>
                </li>
              ))}
              {!nextTasks.length ? <li className={styles.empty}>Tout est à jour. Ajoutez une tâche depuis la vue dédiée.</li> : null}
            </ul>
            <Link href="/tasks" className={styles.cardLink}>
              Ouvrir les tâches
              <ArrowIcon />
            </Link>
          </article>
          <article className={styles.deckCard}>
            <div className={styles.cardTop}>
              <CalendarGlyph />
              <span>Agenda partagé</span>
            </div>
            <ul className={styles.compactList}>
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <strong>{event.summary}</strong>
                  <span>{formatEventTime(event.start.iso, event.isAllDay)}</span>
                </li>
              ))}
              {!upcomingEvents.length ? (
                <li className={styles.empty}>Aucun évènement planifié. Créez le prochain depuis le calendrier.</li>
              ) : null}
            </ul>
            <Link href="/calendar" className={styles.cardLink}>
              Voir le calendrier
              <ArrowIcon />
            </Link>
          </article>
          <article className={styles.deckCard}>
            <div className={styles.cardTop}>
              <span className={styles.pill}>Synthèse</span>
              <span>Équilibre du foyer</span>
            </div>
            <ul className={styles.insightList}>
              {insights.map((insight) => (
                <li key={insight.id}>
                  <span>{insight.label}</span>
                  <strong>{insight.value}</strong>
                  <small>{insight.detail}</small>
                </li>
              ))}
            </ul>
            <div className={styles.familySummary}>
              <span>{taskLists.length} listes connectées</span>
              <span>{events.length} évènements synchronisés</span>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.quickActions}>
        <header>
          <span>Navigation rapide</span>
          <div className={styles.quickHint}>Glissez pour parcourir l’accueil</div>
        </header>
        <div className={styles.quickGrid}>
          <Link href="/tasks" className={styles.quickTile}>
            <TaskGlyph />
            <div>
              <strong>Listes de tâches</strong>
              <span>Composer et clôturer en un geste</span>
            </div>
          </Link>
          <Link href="/calendar" className={styles.quickTile}>
            <CalendarGlyph />
            <div>
              <strong>Calendrier visuel</strong>
              <span>Évènements, tâches et recherches</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
