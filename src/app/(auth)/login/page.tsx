'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Ici, on brancherait l’authentification (NextAuth, API dédiée, etc.)
    alert(`Connexion simulée pour ${email}`)
  }

  return (
    <div className="container-max py-20">
      <div className="mx-auto max-w-xl space-y-10 rounded-3xl border border-primary-500/30 bg-white/80 p-10 shadow-2xl shadow-primary-500/20 backdrop-blur dark:bg-slate-900/60">
        <div className="space-y-3 text-center">
          <span className="badge">Connexion</span>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Heureux de vous revoir ✨</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Accédez à votre espace familial sécurisé. Vos données restent chiffrées et protégées.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2 text-left">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@famille.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2 text-left">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>
          <label className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              Se souvenir de moi
            </span>
            <Link href="#" className="text-primary-500">
              Mot de passe oublié ?
            </Link>
          </label>
          <button type="submit" className="btn-primary w-full justify-center">
            Se connecter
          </button>
        </form>
        <div className="text-center text-sm text-slate-600 dark:text-slate-300">
          Pas encore de compte ?{' '}
          <Link href="/(auth)/register" className="text-primary-500">
            Créez-en un gratuitement
          </Link>
        </div>
      </div>
    </div>
  )
}
