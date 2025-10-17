import { motion, AnimatePresence } from 'framer-motion';
import type { Task, TaskList } from '../../types';
import TaskCard from './TaskCard';

interface TaskListColumnProps {
  list: TaskList;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskListColumn({ list, tasks, onEditTask, onToggleTask, onDeleteTask }: TaskListColumnProps) {
  return (
    <div className="card-surface rounded-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{list.title}</h2>
          {list.description && <p className="text-sm text-slate-400">{list.description}</p>}
        </div>
        {list.stats && (
          <span className="text-xs text-slate-300">
            {list.stats.open} à faire · {list.stats.completed} terminées
          </span>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <TaskCard
                task={task}
                onEdit={() => onEditTask(task)}
                onToggle={() => onToggleTask(task.id)}
                onDelete={() => onDeleteTask(task.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
            Aucune tâche pour le moment. C'est le moment d'en créer une !
          </p>
        )}
      </div>
    </div>
  );
}
