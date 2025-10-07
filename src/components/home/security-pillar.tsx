export const SecurityPillar = () => {
  return (
    <section className="py-20">
      <div className="container-max grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="glass-panel">
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Sécurité by design</h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Nous construisons FamilyConnect autour de la confiance. Chaque espace familial dispose d’un coffre-fort numérique,
            d’une gouvernance des accès et d’un historique complet des actions.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
                1
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Authentification multi-facteur</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Support natif des mots de passe robustes, codes magiques et connexions biométriques via nos SDK mobiles.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
                2
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Chiffrement avancé</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Données chiffrées au repos (AES-256) et en transit (TLS 1.3) avec rotation automatique des clés.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
                3
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Contrôles parentaux évolués</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Définissez des périmètres de partage, des filtres de contenu et des horaires d’accès pour chaque membre.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-primary-500/30 bg-gradient-to-br from-primary-500/20 via-white to-primary-500/10 p-8 text-slate-900 shadow-2xl shadow-primary-500/20 dark:from-primary-500/20 dark:via-slate-950 dark:to-primary-500/10 dark:text-white">
            <h3 className="text-xl font-semibold">Gouvernance des membres</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Personnalisez les rôles, configurez les droits de partage et suivez les validations critiques dans une timeline
              limpide.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-xl shadow-slate-200/40 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-black/30">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Backups intelligents</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Sauvegardes automatisées, export chiffré et récupération en un clic pour vos souvenirs importants.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-xl shadow-slate-200/40 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-black/30">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Infra résiliente</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Hébergement multi-régions avec surveillance 24/7 et conformité RGPD, ISO 27001 et SOC2.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
