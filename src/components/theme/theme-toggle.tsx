'use client'

import { useState } from 'react'
import { useTheme } from '@/components/theme/theme-provider'

const themeOptions = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Système' },
] as const

export const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Modifier le thème"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-lg shadow-slate-200/40 transition hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:shadow-black/40"
      >
        {resolvedTheme === 'dark' ? '🌙' : resolvedTheme === 'light' ? '☀️' : '🌓'}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-3 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-1 text-sm shadow-2xl shadow-primary-500/20 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setTheme(option.value)
                setOpen(false)
              }}
              className={`w-full rounded-xl px-4 py-2 text-left font-medium transition ${
                theme === option.value
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
