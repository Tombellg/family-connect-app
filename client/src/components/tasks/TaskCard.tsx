import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock3, Repeat2, Star } from 'lucide-react';
import type { Task } from '../../types';
import { formatTaskDueDate } from '../../utils/datetime';

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export default function TaskCard({ task, onEdit, onToggle, onDelete }: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  const dueLabel = formatTaskDueDate(task.dueAt);

  return (
    <motion.article
      layout
      whileHover={{ translateY: -3 }}
      className="group rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-4 backdrop-blur transition"
    >
      <div className="flex items-start gap-4">
        <motion.button onClick={onToggle} whileTap={{ scale: 0.9 }} className="mt-1 text-brand">
          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-slate-400" />}
        </motion.button>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={onEdit} className="text-left">
              <h3 className={`text-base font-semibold ${isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                {task.title}
              </h3>
            </button>
            {task.starred && <Star className="h-4 w-4 text-amber-300" />}
          </div>
          {task.description && <p className="text-sm text-slate-300/80">{task.description}</p>}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {task.dueAt && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {dueLabel}
              </span>
            )}
            {task.recurrence && (
              <span className="inline-flex items-center gap-1 text-brand/80">
                <Repeat2 className="h-3.5 w-3.5" />
                Récurrente
              </span>
            )}
            <span className="inline-flex items-center gap-1">Créée le {formatTaskDueDate(task.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-brand hover:text-white"
          >
            Modifier
          </button>
          <button
            onClick={onDelete}
            className="rounded-full border border-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
          >
            Supprimer
          </button>
        </div>
      </div>
    </motion.article>
  );
}
