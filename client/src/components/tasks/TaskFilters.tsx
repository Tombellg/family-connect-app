import type { ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';

export default function TaskFilters() {
  const { filters, setFilters } = useTaskStore();

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    void setFilters({ search: event.target.value });
  };

  const handleStatus = (status: 'all' | 'open' | 'completed') => {
    void setFilters({ status });
  };

  const toggleStarred = () => {
    void setFilters({ showStarredOnly: !filters.showStarredOnly });
  };

  return (
    <div className="card-surface flex flex-col gap-4 rounded-3xl px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <input
          type="search"
          value={filters.search}
          onChange={handleSearch}
          placeholder="Rechercher une tâche, une note, un tag."
          className="w-full rounded-2xl px-4 py-3 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        {[
          { label: 'Toutes', value: 'all' as const },
          { label: 'À faire', value: 'open' as const },
          { label: 'Terminées', value: 'completed' as const },
        ].map((option) => (
          <motion.button
            key={option.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleStatus(option.value)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              filters.status === option.value
                ? 'bg-brand text-white shadow-glow'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {option.label}
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleStarred}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            filters.showStarredOnly ? 'bg-amber-400/90 text-slate-900' : 'bg-white/5 text-amber-300 hover:bg-amber-300/20'
          }`}
        >
          Prioritaires
        </motion.button>
      </div>
    </div>
  );
}
