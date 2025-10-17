import { useTaskStore } from '../../store/taskStore';

export default function TaskStats() {
  const { summary } = useTaskStore();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        { label: 'Tâches totales', value: summary.total },
        { label: 'En cours', value: summary.open },
        { label: 'Terminées', value: summary.completed },
      ].map((item) => (
        <div key={item.label} className="glass-panel rounded-2xl px-5 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
