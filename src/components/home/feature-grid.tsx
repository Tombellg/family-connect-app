import { ReactNode } from 'react'

const features: Array<{
  title: string
  description: string
  icon: ReactNode
}> = [
  {
    title: 'Calendrier orchestral',
    description:
      'Des vues agenda ultra fluides avec gestion des disponibilités, événements récurrents et synchronisation multi-personnes.',
    icon: '🗓️',
  },
  {
    title: 'Gestionnaire de tâches collaboratif',
    description:
      'Attribuez, commentez, priorisez. Activez des routines automatiques pour ne jamais manquer les missions du quotidien.',
    icon: '✅',
  },
  {
    title: 'Espaces sécurisés',
    description:
      'Protection multicouche, chiffrement des données sensibles et gestion fine des droits pour chaque membre.',
    icon: '🛡️',
  },
  {
    title: 'Notes & souvenirs',
    description:
      'Capturez les moments clés avec un éditeur riche et des collections thématiques pour toute la tribu.',
    icon: '📝',
  },
  {
    title: 'Automatisations familiales',
    description:
      'Programmez des rappels, synchronisez avec vos outils favoris et laissez l’IA proposer des optimisations.',
    icon: '🤖',
  },
  {
    title: 'Thèmes adaptatifs',
    description:
      'Mode clair, sombre ou synchronisé avec le système. L’esthétique s’adapte à votre ambiance.',
    icon: '🎨',
  },
]

export const FeatureGrid = () => {
  return (
    <section className="py-20">
      <div className="container-max space-y-12">
        <div className="max-w-2xl space-y-3">
          <span className="badge">Tout un cockpit pour votre famille</span>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Des fonctionnalités pensées pour la coordination, le partage et la sérénité.
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Chaque module est optimisé pour créer du lien, fluidifier la communication et vous faire gagner du temps.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-xl shadow-slate-200/50 transition hover:-translate-y-1 hover:border-primary-300 hover:shadow-2xl hover:shadow-primary-500/20 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-black/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-2xl text-primary-600 transition group-hover:scale-105 dark:text-primary-300">
                {feature.icon}
              </div>
              <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{feature.description}</p>
              <div className="absolute inset-x-0 bottom-0 translate-y-1/2 px-8">
                <div className="h-1 rounded-full bg-gradient-to-r from-primary-400 via-accent-200 to-primary-500 opacity-0 transition group-hover:opacity-100" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
