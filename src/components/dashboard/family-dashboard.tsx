'use client'

import { FormEvent, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

type FamilyEvent = {
  id: string
  title: string
  date?: string
  time?: string
  isRecurring: boolean
  isShared: boolean
  owner: string
  notes?: string
}

type FamilyTask = {
  id: string
  title: string
  dueDate?: string
  assignee: string
  isRecurring: boolean
  isCompleted: boolean
  isShared: boolean
}

const members = ['Camille', 'Lucas', 'Noah', 'Emma']

const initialEvents: FamilyEvent[] = [
  {
    id: '1',
    title: 'Concert de piano',
    date: new Date().toISOString().slice(0, 10),
    time: '18:30',
    owner: 'Camille',
    isRecurring: false,
    isShared: true,
    notes: 'Prévoir tenue de scène',
  },
  {
    id: '2',
    title: 'Coaching basket',
    date: undefined,
    time: undefined,
    owner: 'Noah',
    isRecurring: true,
    isShared: true,
    notes: 'Tous les mercredis',
  },
]

const initialTasks: FamilyTask[] = [
  {
    id: 't1',
    title: 'Préparer la liste de courses',
    dueDate: new Date().toISOString().slice(0, 10),
    assignee: 'Emma',
    isRecurring: true,
    isCompleted: false,
    isShared: true,
  },
  {
    id: 't2',
    title: 'Réserver le week-end en famille',
    dueDate: undefined,
    assignee: 'Lucas',
    isRecurring: false,
    isCompleted: false,
    isShared: false,
  },
]

export const FamilyDashboard = () => {
  const [events, setEvents] = useState<FamilyEvent[]>(initialEvents)
  const [tasks, setTasks] = useState<FamilyTask[]>(initialTasks)
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time: '',
    owner: members[0],
    notes: '',
    isRecurring: false,
    isShared: true,
  })
  const [taskForm, setTaskForm] = useState({
    title: '',
    dueDate: '',
    assignee: members[1],
    isRecurring: false,
    isShared: true,
  })

  const upcomingEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)
    })
  }, [events])

  const activeTasks = useMemo(() => tasks.filter((task) => !task.isCompleted), [tasks])

  const resetEventForm = () =>
    setEventForm({ title: '', date: '', time: '', owner: members[0], notes: '', isRecurring: false, isShared: true })
  const resetTaskForm = () =>
    setTaskForm({ title: '', dueDate: '', assignee: members[1], isRecurring: false, isShared: true })

  const createId = () => Math.random().toString(36).slice(2, 10)

  const handleEventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!eventForm.title.trim()) {
      return
    }

    const newEvent: FamilyEvent = {
      id: createId(),
      title: eventForm.title.trim(),
      date: eventForm.date || undefined,
      time: eventForm.time || undefined,
      owner: eventForm.owner,
      notes: eventForm.notes?.trim() || undefined,
      isRecurring: eventForm.isRecurring,
      isShared: eventForm.isShared,
    }

    setEvents((prev) => [newEvent, ...prev])
    resetEventForm()
  }

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!taskForm.title.trim()) {
      return
    }

    const newTask: FamilyTask = {
      id: createId(),
      title: taskForm.title.trim(),
      dueDate: taskForm.dueDate || undefined,
      assignee: taskForm.assignee,
      isRecurring: taskForm.isRecurring,
      isShared: taskForm.isShared,
      isCompleted: false,
    }

    setTasks((prev) => [newTask, ...prev])
    resetTaskForm()
  }

  const toggleTaskCompletion = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task))
    )
  }

  return (
    <div className="container-max space-y-12 py-16">
      <header className="flex flex-col gap-6 rounded-3xl border border-primary-500/30 bg-gradient-to-r from-primary-500/10 via-white to-accent-200/20 p-10 shadow-2xl shadow-primary-500/20 dark:from-primary-500/10 dark:via-slate-950 dark:to-accent-200/10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="badge">Espace famille</span>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Tableau de bord interactif</h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Ajoutez des événements, planifiez des tâches partagées, automatisez vos routines et gardez le contrôle en un clin d’œil.
            </p>
          </div>
          <div className="rounded-3xl bg-white/80 px-6 py-4 text-sm text-slate-600 shadow-lg shadow-primary-500/10 backdrop-blur dark:bg-slate-900/60 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">Synchronisation instantanée</p>
            <p>Partagez votre espace avec {members.length} membres et créez des cercles privés.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="tag">Animations micro-interactions</span>
          <span className="tag">Mode sombre natif</span>
          <span className="tag">Routines récurrentes</span>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-8">
          <div className="form-section">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Planifier un nouvel événement</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Indiquez un titre, choisissez une date et définissez si l’événement doit être partagé ou récurrent.
              </p>
            </div>
            <form onSubmit={handleEventSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="event-title">Titre de l’événement *</label>
                <input
                  id="event-title"
                  type="text"
                  placeholder="Ex. Réunion parents-professeurs"
                  value={eventForm.title}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="event-date">Date</label>
                <input
                  id="event-date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="event-time">Heure</label>
                <input
                  id="event-time"
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="event-owner">Organisateur</label>
                <select
                  id="event-owner"
                  value={eventForm.owner}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, owner: e.target.value }))}
                >
                  {members.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-3">
                <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={eventForm.isRecurring}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, isRecurring: e.target.checked }))}
                  />
                  Événement récurrent
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={eventForm.isShared}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, isShared: e.target.checked }))}
                  />
                  Partager avec toute la famille
                </label>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="event-notes">Notes</label>
                <textarea
                  id="event-notes"
                  rows={3}
                  placeholder="Ajouter des détails, pièces jointes ou instructions"
                  value={eventForm.notes}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="btn-primary">
                  Ajouter l’événement
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-xl shadow-slate-200/40 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Événements à venir</h2>
            <div className="mt-4 grid gap-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="group flex items-start justify-between rounded-2xl border border-transparent bg-gradient-to-r from-white to-slate-100/60 p-5 transition hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl hover:shadow-primary-500/20 dark:from-slate-900 dark:to-slate-800/60"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{event.title}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{event.owner}</p>
                    {event.notes ? <p className="text-xs text-slate-500 dark:text-slate-400">{event.notes}</p> : null}
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-300">
                    {event.date ? (
                      <p>{format(parseISO(event.date), 'PPP', { locale: fr })}</p>
                    ) : (
                      <p className="italic">Date à définir</p>
                    )}
                    <p>{event.time ? event.time : 'Heure libre'}</p>
                    <p className="mt-1 text-primary-500">
                      {event.isRecurring ? 'Récurrent' : 'Ponctuel'} · {event.isShared ? 'Partagé' : 'Privé'}
                    </p>
                  </div>
                </div>
              ))}
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Ajoutez votre premier événement pour commencer ✨</p>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          <div className="form-section">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Créer une tâche collaborative</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Définissez un responsable, une échéance et partagez avec votre cercle familial.
              </p>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label htmlFor="task-title">Titre de la tâche *</label>
                <input
                  id="task-title"
                  type="text"
                  placeholder="Ex. Organiser l’anniversaire"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="task-due">Échéance</label>
                  <input
                    id="task-due"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="task-assignee">Assignée à</label>
                  <select
                    id="task-assignee"
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, assignee: e.target.value }))}
                  >
                    {members.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={taskForm.isRecurring}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, isRecurring: e.target.checked }))}
                  />
                  Tâche récurrente
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={taskForm.isShared}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, isShared: e.target.checked }))}
                  />
                  Partage familial
                </label>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary">
                  Ajouter la tâche
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-xl shadow-slate-200/40 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Tâches actives</h2>
            <div className="mt-4 space-y-3">
              {activeTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTaskCompletion(task.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border border-transparent bg-gradient-to-r from-white to-slate-100/60 px-4 py-3 text-left text-sm transition hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/20 dark:from-slate-900 dark:to-slate-800/60 ${
                    task.isCompleted ? 'opacity-50 line-through' : ''
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {task.assignee} · {task.isRecurring ? 'Récurrente' : 'Ponctuelle'} · {task.isShared ? 'Partagée' : 'Privée'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    {task.dueDate ? format(parseISO(task.dueDate), 'PPP', { locale: fr }) : 'Aucune échéance'}
                  </div>
                </button>
              ))}
              {activeTasks.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Toutes les tâches sont réalisées, bravo 🎉</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-xl shadow-slate-200/40 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Timeline de la semaine</h2>
            <ol className="mt-4 space-y-4 border-l border-slate-200 pl-6 text-sm dark:border-slate-700">
              {upcomingEvents.slice(0, 4).map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[13px] mt-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
                  <p className="font-semibold text-slate-900 dark:text-white">{event.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {event.date ? format(parseISO(event.date), 'EEEE', { locale: fr }) : 'Date libre'} · {event.time ?? 'Heure à définir'}
                  </p>
                </li>
              ))}
              {upcomingEvents.length === 0 ? (
                <li className="text-xs text-slate-500 dark:text-slate-400">Ajoutez des événements pour alimenter votre timeline.</li>
              ) : null}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
