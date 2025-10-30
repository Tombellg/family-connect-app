"use client";

import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import styles from "./overview.module.css";

export default function OverviewPage() {
  const { taskLists, events, syncing, lastSync } = useDashboard();

  const { totalTasks, completedTasks } = useMemo(() => {
    const total = taskLists.reduce((sum, list) => sum + list.tasks.length, 0);
    const completed = taskLists.reduce(
      (sum, list) => sum + list.tasks.filter((task) => task.status === "completed").length,
      0
    );
    return { totalTasks: total, completedTasks: completed };
  }, [taskLists]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((event) => Boolean(event.start.iso))
      .sort((a, b) => new Date(a.start.iso ?? 0).getTime() - new Date(b.start.iso ?? 0).getTime())
      .slice(0, 6);
  }, [events]);

  const overdueTasks = useMemo(() => {
    const today = new Date();
    return taskLists
      .flatMap((list) => list.tasks)
      .filter((task) => {
        if (!task.due?.iso) {
          return false;
        }
        const dueDate = new Date(task.due.iso);
        return task.status !== "completed" && dueDate < today;
      })
      .slice(0, 6);
  }, [taskLists]);

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div>
          <h1>Bonjour !</h1>
          <p>
            Voici une vision claire de votre organisation familiale. Toutes les données sont synchronisées
            automatiquement avec Google Tasks et Google Agenda.
          </p>
        </div>
        <div className={styles.syncCard}>
          <span className={styles.syncTitle}>État</span>
          <strong>{syncing ? "Synchronisation…" : "À jour"}</strong>
          <span className={styles.syncHint}>
            {lastSync ? `Dernière synchro ${lastSync.toLocaleString("fr-FR")}` : "Aucune synchronisation réalisée"}
          </span>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.metricTile}>
          <header>
            <span>Tâches suivies</span>
            <strong>{totalTasks}</strong>
          </header>
          <p>{completedTasks} terminées</p>
        </article>
        <article className={styles.metricTile}>
          <header>
            <span>Évènements programmés</span>
            <strong>{events.length}</strong>
          </header>
          <p>6 prochains affichés ci-dessous</p>
        </article>
        <article className={styles.metricTile}>
          <header>
            <span>Tâches en retard</span>
            <strong>{overdueTasks.length}</strong>
          </header>
          <p>Rattrapez-les dès que possible</p>
        </article>
      </section>

      <section className={styles.columns}>
        <div className={styles.column}>
          <header className={styles.columnHeader}>
            <h2>Prochaines tâches</h2>
            <span>{taskLists.length} listes</span>
          </header>
          <ul className={styles.list}>
            {taskLists.slice(0, 2).map((list) => (
              <li key={list.id} className={styles.listBlock}>
                <strong>{list.title}</strong>
                <ul>
                  {list.tasks.slice(0, 5).map((task) => (
                    <li key={task.id}>
                      <span className={task.status === "completed" ? styles.completed : undefined}>{task.title}</span>
                      {task.due?.iso ? (
                        <small>{new Date(task.due.iso).toLocaleDateString("fr-FR")}</small>
                      ) : null}
                    </li>
                  ))}
                  {!list.tasks.length ? <li className={styles.empty}>Aucune tâche dans cette liste</li> : null}
                </ul>
              </li>
            ))}
            {!taskLists.length ? <li className={styles.empty}>Aucune liste synchronisée pour le moment.</li> : null}
          </ul>
        </div>
        <div className={styles.column}>
          <header className={styles.columnHeader}>
            <h2>Évènements à venir</h2>
            <span>{upcomingEvents.length} affichés</span>
          </header>
          <ul className={styles.eventList}>
            {upcomingEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.summary}</strong>
                <span>
                  {event.start.iso
                    ? new Date(event.start.iso).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: event.isAllDay ? undefined : "short",
                      })
                    : "Sans date"}
                </span>
                {event.location ? <small>{event.location}</small> : null}
              </li>
            ))}
            {!upcomingEvents.length ? <li className={styles.empty}>Aucun évènement à afficher.</li> : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
