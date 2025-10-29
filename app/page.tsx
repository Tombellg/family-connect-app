"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

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

export default function HomePage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/google/sync");
      if (!response.ok) {
        throw new Error("Impossible de récupérer les données Google.");
      }
      const payload = (await response.json()) as {
        events: CalendarEvent[];
        tasks: TaskItem[];
      };
      setEvents(payload.events);
      setTasks(payload.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold">Family Connect 2.0</h1>
        <p className="max-w-2xl text-base text-slate-300">
          Connectez votre compte Google pour synchroniser votre agenda et vos tâches
          dans une interface unifiée alimentée par PostgreSQL sur Neon.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-4">
        {status === "authenticated" ? (
          <>
            <div className="rounded border border-slate-700 bg-slate-900 px-4 py-3 shadow">
              <p className="text-sm text-slate-300">Connecté en tant que</p>
              <p className="text-lg font-medium">{session?.user?.name ?? session?.user?.email}</p>
            </div>
            <button
              className="rounded bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              onClick={handleSync}
              disabled={loading}
            >
              {loading ? "Synchronisation..." : "Synchroniser Google"}
            </button>
            <button
              className="rounded border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              onClick={() => signOut()}
            >
              Se déconnecter
            </button>
          </>
        ) : (
          <button
            className="rounded bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            onClick={() => signIn("google")}
            disabled={status === "loading"}
          >
            Se connecter avec Google
          </button>
        )}
      </section>

      {error && (
        <p className="rounded border border-rose-500 bg-rose-950 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {events.length > 0 && (
        <section className="rounded border border-slate-700 bg-slate-900 p-5 shadow">
          <h2 className="text-2xl font-semibold">Événements Google Calendar</h2>
          <ul className="mt-4 space-y-3">
            {events.map((event) => (
              <li key={event.id} className="rounded border border-slate-700 bg-slate-950 p-4">
                <p className="text-lg font-medium">{event.summary || "Sans titre"}</p>
                <p className="text-sm text-slate-400">
                  {event.start} – {event.end}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tasks.length > 0 && (
        <section className="rounded border border-slate-700 bg-slate-900 p-5 shadow">
          <h2 className="text-2xl font-semibold">Google Tasks</h2>
          <ul className="mt-4 space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="rounded border border-slate-700 bg-slate-950 p-4">
                <p className="text-lg font-medium">{task.title || "Sans titre"}</p>
                <p className="text-sm text-slate-400">
                  Statut : {task.status}
                  {task.due ? ` · Échéance : ${task.due}` : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
