"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import styles from "./page.module.css";

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
};

type TaskItem = {
  id: string;
  title: string;
  due?: string;
  status: string;
};

type SyncError = {
  scope: "calendar" | "tasks" | "auth";
  message: string;
  suggestion?: string;
  description?: string;
};

type SyncResponse = {
  events?: CalendarEvent[];
  tasks?: TaskItem[];
  message?: string;
  errors?: SyncError[];
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = status === "authenticated";
  const isLoadingSession = status === "loading";

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/google/sync");
      const payload = (await response.json().catch(() => null)) as SyncResponse | null;

      if (payload?.events) {
        setEvents(payload.events);
      } else if (response.ok) {
        setEvents([]);
      }
      if (payload?.tasks) {
        setTasks(payload.tasks);
      } else if (response.ok) {
        setTasks([]);
      }

      const separator = " \u2022 ";

      if (!response.ok) {
        const parts: string[] = [];
        if (payload?.message) {
          parts.push(payload.message);
        }

        if (payload?.errors?.length) {
          for (const error of payload.errors) {
            const description = error.description ? ` (${error.description})` : "";
            const suggestion = error.suggestion ? ` ${error.suggestion}` : "";
            parts.push(`${error.message}${description}${suggestion}`.trim());
          }
        }

        const detailedMessage = parts.length
          ? parts.join(separator)
          : "Impossible de récupérer les données Google.";

        setError(detailedMessage);
        return;
      }

      setError(
        payload?.errors?.length
          ? payload.message ??
            "Synchronisation partielle effectuée. Vérifiez les détails fournis."
          : null
      );
      setLastSync(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setEvents([]);
    setTasks([]);
    setLastSync(null);
    await signOut({ callbackUrl: "/" });
  };

  const calendarSummary = useMemo(() => {
    if (!isAuthenticated) {
      return "En attente de connexion";
    }
    if (loading) {
      return "Synchronisation en cours...";
    }
    if (events.length === 0) {
      return "Aucun événement importé";
    }
    return `${events.length} événement${events.length > 1 ? "s" : ""}`;
  }, [isAuthenticated, loading, events.length]);

  const tasksSummary = useMemo(() => {
    if (!isAuthenticated) {
      return "Connectez-vous pour consulter vos tâches";
    }
    if (loading) {
      return "Mise à jour des tâches";
    }
    if (tasks.length === 0) {
      return "Aucune tâche synchronisée";
    }
    return `${tasks.length} tâche${tasks.length > 1 ? "s" : ""}`;
  }, [isAuthenticated, loading, tasks.length]);

  const lastSyncLabel = useMemo(() => {
    if (!isAuthenticated) {
      return "Connectez-vous pour lancer une synchronisation";
    }
    if (loading) {
      return "Dernière mise à jour en cours...";
    }
    if (!lastSync) {
      return "Aucune synchronisation effectuée";
    }
    return `Dernière synchronisation : ${lastSync.toLocaleString("fr-FR", {
      dateStyle: "long",
      timeStyle: "short"
    })}`;
  }, [isAuthenticated, loading, lastSync]);

  const hasData = events.length > 0 || tasks.length > 0;

  return (
    <main className={styles.wrapper}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.kicker}>Organisation familiale</span>
          <h1>Votre agenda et vos tâches, réunis au même endroit.</h1>
          <p>
            Synchronisez Google Calendar et Google Tasks en temps réel, sans quitter
            Family Connect. L’authentification OAuth2 sécurisée et la base Postgres Neon
            garantissent une expérience fluide et durable.
          </p>

          {isAuthenticated ? (
            <div className={styles.authenticatedRow}>
              <div className={styles.identityCard}>
                <p className={styles.identityLabel}>Connecté en tant que</p>
                <p className={styles.identityValue}>
                  {session?.user?.name ?? session?.user?.email ?? "Utilisateur Google"}
                </p>
              </div>
              <div className={styles.buttonRow}>
                <button
                  className={`${styles.button} ${styles.primaryButton}`}
                  onClick={handleSync}
                  disabled={loading}
                >
                  {loading ? "Synchronisation..." : "Synchroniser maintenant"}
                </button>
                <button
                  className={`${styles.button} ${styles.ghostButton}`}
                  onClick={handleSignOut}
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.signInGroup}>
              <button
                className={`${styles.button} ${styles.googleButton}`}
                onClick={() => signIn("google")}
                disabled={isLoadingSession}
              >
                <span className={styles.googleIcon} aria-hidden />
                {isLoadingSession ? "Connexion..." : "Se connecter avec Google"}
              </button>
              <p className={styles.hint}>
                Votre autorisation est uniquement utilisée pour lire vos événements et vos tâches.
              </p>
            </div>
          )}
        </div>

        <aside className={styles.heroCard}>
          <h2>Synchronisation</h2>
          <div className={styles.heroCardStats}>
            <dl className={styles.heroCardStat}>
              <dt>Calendrier</dt>
              <dd>{calendarSummary}</dd>
            </dl>
            <dl className={styles.heroCardStat}>
              <dt>Tâches</dt>
              <dd>{tasksSummary}</dd>
            </dl>
          </div>
          <footer>{lastSyncLabel}</footer>
        </aside>
      </section>

      {error ? <p className={styles.alert}>{error}</p> : null}

      {isAuthenticated && !loading && !hasData ? (
        <section className={styles.emptyState}>
          <h2>Prêt pour votre première synchronisation</h2>
          <p>
            Lancez une synchronisation pour importer automatiquement les prochains événements
            de votre agenda et les tâches à venir.
          </p>
        </section>
      ) : null}

      {events.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Événements Google Calendar</h2>
            <p>Voici les prochains rendez-vous récupérés via l’API Calendar.</p>
          </div>
          <ul className={styles.list}>
            {events.map((event) => (
              <li key={event.id} className={styles.listItem}>
                <h3 className={styles.listItemTitle}>{event.summary || "Sans titre"}</h3>
                <p className={styles.listItemMeta}>
                  <span>{event.start}</span>
                  <span>→</span>
                  <span>{event.end}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tasks.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Google Tasks</h2>
            <p>Visualisez rapidement vos tâches et leurs échéances.</p>
          </div>
          <ul className={styles.list}>
            {tasks.map((task) => (
              <li key={task.id} className={styles.listItem}>
                <h3 className={styles.listItemTitle}>{task.title || "Sans titre"}</h3>
                <p className={styles.listItemMeta}>
                  <span className={styles.badge}>{task.status}</span>
                  {task.due ? <span>Échéance : {task.due}</span> : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
