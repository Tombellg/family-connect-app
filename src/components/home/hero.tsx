import Link from 'next/link'

export const Hero = () => {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.35),_transparent_55%)]" />
      <div className="container-max grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <span className="badge">Planificateur familial nouvelle génération</span>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            La plateforme qui aligne toute votre tribu sans compromis.
          </h1>
          <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
            FamilyConnect est conçu pour les familles modernes. Gérez calendriers, tâches, notes et routines avec une interface
            fluide, ultra design, sécurisée et synchronisée avec vos habitudes.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/(auth)/register" className="btn-primary">
              Créer mon espace gratuit
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Explorer le hub familial
            </Link>
          </div>
          <dl className="grid gap-8 sm:grid-cols-3">
            {[
              { label: 'Familles actives', value: '12K+' },
              { label: 'Événements coordonnés', value: '580K' },
              { label: 'Satisfaction', value: '98%' },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/80 bg-white/70 p-6 text-center shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-black/40">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500">{item.label}</dt>
                <dd className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <div className="glass-panel card-gradient">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary-600">Calendrier intelligent</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">Semaine familiale</p>
                </div>
                <span className="rounded-full bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-500 dark:text-primary-300">
                  Mode zen
                </span>
              </div>
              <ul className="space-y-4">
                {[
                  { day: 'Lundi', title: 'Rendez-vous pédiatre', time: '09:30', owner: 'Camille' },
                  { day: 'Mercredi', title: 'Atelier robotique', time: '17:45', owner: 'Lucas' },
                  { day: 'Vendredi', title: 'Dîner intergénérationnel', time: '20:00', owner: 'Famille' },
                ].map((event) => (
                  <li
                    key={event.title}
                    className="flex items-start justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-lg shadow-slate-200/40 transition hover:translate-y-[-2px] hover:shadow-xl dark:border-slate-700/80 dark:bg-slate-900/70 dark:shadow-black/30"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{event.day}</p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{event.title}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-300">
                      <p>{event.time}</p>
                      <p className="text-xs text-primary-500">{event.owner}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-900 px-6 py-5 text-white shadow-lg shadow-slate-900/40">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Focus bien-être</p>
                <p className="mt-2 text-lg font-semibold">Week-end sans écrans activé ✅</p>
                <p className="text-sm text-slate-300">Automatisation : 1er weekend de chaque mois</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-accent-200/30 blur-3xl" />
        </div>
      </div>
    </section>
  )
}
