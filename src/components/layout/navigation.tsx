'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme/theme-toggle'

const links = [
  { href: '/', label: 'Accueil' },
  { href: '/dashboard', label: 'Espace famille' },
  { href: '/(auth)/login', label: 'Connexion' },
  { href: '/(auth)/register', label: 'Inscription' },
]

export const Navigation = () => {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-transparent bg-white/80 py-4 backdrop-blur-xl transition dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="container-max flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-300 text-lg font-semibold text-white shadow-lg shadow-primary-500/40">
            FC
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
              FamilyConnect
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Harmonie familiale augmentée</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-white/50 p-1 shadow-lg shadow-slate-200/40 transition dark:border-slate-800/70 dark:bg-slate-900/60 dark:shadow-black/30 md:flex">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/30 dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/(auth)/register" className="hidden md:inline-flex btn-primary">
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </header>
  )
}
