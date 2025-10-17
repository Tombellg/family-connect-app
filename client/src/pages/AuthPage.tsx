import { motion } from 'framer-motion';
import AuthPanel from '../components/auth/AuthPanel';

export default function AuthPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid-glow opacity-90" />
      <div className="absolute inset-x-0 top-0 h-48 brand-gradient opacity-40 blur-3xl" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-2xl"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
            Family Connect · Tâches partagées
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Organisez votre foyer avec une fluidité irrésistible
          </h1>
          <p className="mt-4 text-base text-slate-300">
            Créez, planifiez et animez la vie quotidienne. Une application de tâches récurrentes moderne,
            collaborative et ultra modulable.
          </p>
        </motion.div>

        <AuthPanel />
      </div>
    </div>
  );
}
