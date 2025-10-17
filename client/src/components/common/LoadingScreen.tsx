import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Chargement en cours' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel px-10 py-8 rounded-3xl shadow-glow flex flex-col items-center gap-4"
      >
        <div className="relative h-16 w-16">
          <motion.span
            className="absolute inset-0 rounded-full border-4 border-brand/40 border-t-brand"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
        </div>
        <p className="text-slate-200 text-sm tracking-wide uppercase">{message}</p>
      </motion.div>
    </div>
  );
}
