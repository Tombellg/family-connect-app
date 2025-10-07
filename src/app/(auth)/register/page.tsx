'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function RegisterPage() {
  const [form, setForm] = useState({
    familyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptPolicy: true,
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (form.password !== form.confirmPassword) {
      alert('Les mots de passe doivent correspondre.')
      return
    }
    alert(`Bienvenue ${form.familyName || 'famille'} ! Votre inscription est simulée.`)
  }

  return (
    <div className="container-max py-20">
      <div className="mx-auto max-w-2xl grid gap-12 rounded-3xl border border-primary-500/30 bg-white/80 p-10 shadow-2xl shadow-primary-500/20 backdrop-blur dark:bg-slate-900/60 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <span className="badge">Inscription rapide</span>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Construisez votre hub familial en 2 minutes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Créez un espace sécurisé, invitez vos proches et synchronisez vos calendriers, tâches et notes en un clin d’œil.
          </p>
          <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">1</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Créez votre foyer</p>
                <p>Définissez un nom et configurez les rôles parents / enfants en toute simplicité.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">2</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Invitez vos proches</p>
                <p>Partagez un lien magique ou envoyez des invitations email sécurisées.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">3</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Activez vos automatismes</p>
                <p>Planifiez vos routines, configurez les rappels et profitez des suggestions intelligentes.</p>
              </div>
            </li>
          </ul>
        </div>
        <form onSubmit={handleSubmit} className="form-section">
          <div className="space-y-2">
            <label htmlFor="family-name">Nom de votre famille</label>
            <input
              id="family-name"
              type="text"
              placeholder="Ex. Famille Dupont"
              value={form.familyName}
              onChange={(event) => setForm((prev) => ({ ...prev, familyName: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="register-email">Adresse email</label>
            <input
              id="register-email"
              type="email"
              placeholder="vous@famille.com"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="register-password">Mot de passe</label>
              <input
                id="register-password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="register-confirm">Confirmer le mot de passe</label>
              <input
                id="register-confirm"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                required
              />
            </div>
          </div>
          <label className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.acceptPolicy}
              onChange={(event) => setForm((prev) => ({ ...prev, acceptPolicy: event.target.checked }))}
              required
            />
            <span>
              J’accepte la charte familiale sécurisée et la politique de confidentialité.
              <br />
              <Link href="#" className="text-primary-500">
                Consulter les conditions
              </Link>
            </span>
          </label>
          <button type="submit" className="btn-primary w-full justify-center">
            Créer mon espace sécurisé
          </button>
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            Déjà inscrit ?{' '}
            <Link href="/(auth)/login" className="text-primary-500">
              Connectez-vous
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
