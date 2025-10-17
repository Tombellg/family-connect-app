import { type ChangeEvent, type FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

const tabs: Array<{ key: 'login' | 'register'; label: string }> = [
  { key: 'login', label: 'Connexion' },
  { key: 'register', label: 'Créer un compte' },
];

export default function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { login, register, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ name: form.name, email: form.email, password: form.password });
      }
    } catch {
      // handled in store
    }
  };

  const handleChange = (field: 'name' | 'email' | 'password') => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (error) clearError();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface w-full max-w-md rounded-3xl p-8"
    >
      <div className="flex items-center justify-between mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`relative flex-1 py-2 text-sm font-semibold transition ${
              mode === tab.key ? 'text-white' : 'text-slate-400'
            }`}
          >
            {mode === tab.key && (
              <motion.span
                layoutId="authTab"
                className="absolute inset-0 rounded-full bg-brand/20"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Prénom et nom</label>
            <input
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Thomas Dupont"
              required
              className="w-full rounded-xl px-4 py-3"
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Adresse e-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="vous@exemple.fr"
            required
            className="w-full rounded-xl px-4 py-3"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Mot de passe</label>
          <input
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            placeholder="••••••••"
            minLength={8}
            required
            className="w-full rounded-xl px-4 py-3"
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="brand-gradient w-full rounded-2xl py-3 font-semibold text-white shadow-glow"
        >
          {loading ? 'Patientez…' : mode === 'login' ? 'Se connecter' : 'Créer et rejoindre'}
        </motion.button>
      </form>
    </motion.div>
  );
}
