import { FeatureGrid } from '@/components/home/feature-grid'
import { Hero } from '@/components/home/hero'
import { SecurityPillar } from '@/components/home/security-pillar'

export default function HomePage() {
  return (
    <div className="space-y-12">
      <Hero />
      <FeatureGrid />
      <SecurityPillar />
      <section className="pb-24">
        <div className="container-max grid gap-10 rounded-3xl border border-primary-500/30 bg-gradient-to-br from-primary-500/15 via-white to-accent-100/20 p-10 shadow-2xl shadow-primary-500/20 dark:from-primary-500/10 dark:via-slate-950 dark:to-accent-200/10">
          <div className="space-y-3">
            <span className="badge">Prêts à transformer votre organisation familiale ?</span>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Une application complète, moderne, sécurisée et gratuite.
            </h2>
            <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300">
              Inscrivez votre famille en quelques secondes, invitez vos proches et commencez à synchroniser événements, tâches et
              notes, le tout avec un design premium et des animations fluides.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/(auth)/register" className="btn-primary">
              Je crée mon compte FamilyConnect
            </a>
            <a href="/dashboard" className="btn-secondary">
              Voir le tableau de bord interactif
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
