import type { Task, TaskList } from '../../types';
import TaskListColumn from './TaskListColumn';

interface TaskBoardProps {
  lists: TaskList[];
  activeListId?: string;
  tasks: Task[];
  onSelectList: (listId?: string) => void;
  onEditTask: (task: Task) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskBoard({
  lists,
  activeListId,
  tasks,
  onSelectList,
  onEditTask,
  onToggleTask,
  onDeleteTask,
}: TaskBoardProps) {
  const activeList = lists.find((list) => list.id === activeListId) ?? lists[0];
  const tasksForList = activeList ? tasks.filter((task) => task.listId === activeList.id) : tasks;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {lists.map((list) => {
          const isActive = list.id === activeList?.id;
          return (
            <button
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand text-white shadow-glow' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: list.color ?? '#6366f1' }} />
              {list.title}
              {list.stats && (
                <span className="text-xs text-white/80">{list.stats.open} à faire</span>
              )}
            </button>
          );
        })}
      </div>

      {activeList ? (
        <TaskListColumn
          list={activeList}
          tasks={tasksForList}
          onEditTask={onEditTask}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
        />
      ) : (
        <p className="text-sm text-slate-300">Créez votre première liste pour commencer.</p>
      )}
    </div>
  );
}
