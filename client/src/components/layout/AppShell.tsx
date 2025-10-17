import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const { user, logout } = useAuthStore();

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-grid-glow opacity-[0.85]" />
      <div className="absolute inset-x-0 top-0 h-64 brand-gradient opacity-40 blur-3xl" />
      <div className="relative z-10 px-6 pb-16">
        <header className="flex flex-col gap-6 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-300">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            {actions}
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur">
              <div className="h-10 w-10 rounded-full" style={{ background: user?.avatarColor ?? '#6366f1' }} />
              <div className="leading-tight text-left">
                <p className="text-sm font-semibold text-white">{user?.name ?? 'Invité'}</p>
                <p className="text-xs text-slate-300">{user?.email}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-slate-200"
              >
                Déconnexion
              </motion.button>
            </div>
          </div>
        </header>

        <main className="mt-10">{children}</main>
      </div>
    </div>
  );
}
