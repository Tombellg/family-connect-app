import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Navigation } from '@/components/layout/navigation'

export const metadata: Metadata = {
  title: 'FamilyConnect – Calendrier et tâches familiales',
  description:
    'FamilyConnect est une application moderne pour orchestrer la vie familiale : calendrier partagé, tâches collaboratives, notes sécurisées et expérience multi-thèmes.',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 transition dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <Navigation />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-slate-200/60 bg-white/80 py-12 text-center text-sm text-slate-500 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <div className="container-max flex flex-col items-center gap-3">
                <p>FamilyConnect – Simplifiez la coordination familiale.</p>
                <p className="text-xs">Construit avec Next.js, TailwindCSS et beaucoup d’amour ✨</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
