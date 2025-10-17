import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AppShell from '../components/layout/AppShell';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskBoard from '../components/tasks/TaskBoard';
import TaskStats from '../components/tasks/TaskStats';
import TaskEditorModal from '../components/tasks/TaskEditorModal';
import LoadingScreen from '../components/common/LoadingScreen';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types';

export default function DashboardPage() {
  const {
    lists,
    tasks,
    activeListId,
    filters,
    loading,
    fetchLists,
    fetchTasks,
    selectList,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
  } = useTaskStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState<Task | undefined>(undefined);

  useEffect(() => {
    void fetchLists().then(() => fetchTasks());
  }, [fetchLists, fetchTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.showStarredOnly && !task.starred) {
        return false;
      }
      if (filters.search) {
        const needle = filters.search.toLowerCase();
        const haystack = [task.title, task.description ?? '', task.notes ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, filters.showStarredOnly, filters.search]);

  const handleCreate = async (payload: Parameters<typeof createTask>[0]) => {
    await createTask(payload);
    await fetchTasks();
  };

  const handleUpdate = async (payload: Parameters<typeof updateTask>[1]) => {
    if (!taskBeingEdited) return;
    await updateTask(taskBeingEdited.id, payload);
    await fetchTasks();
  };

  const handleToggle = async (taskId: string) => {
    await toggleTask(taskId);
    await fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    await fetchTasks();
  };

  const openCreateModal = () => {
    setTaskBeingEdited(undefined);
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setTaskBeingEdited(task);
    setModalOpen(true);
  };

  if (loading && lists.length === 0) {
    return <LoadingScreen message="Préparation de vos tâches" />;
  }

  return (
    <AppShell
      title="Planificateur du foyer"
      subtitle="Une vue partagée, rapide et élégante des tâches du quotidien."
      actions={
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={openCreateModal}
          className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-glow"
        >
          Nouvelle tâche
        </motion.button>
      }
    >
      <div className="space-y-8">
        <TaskStats />
        <TaskFilters />
        <TaskBoard
          lists={lists}
          tasks={filteredTasks}
          activeListId={activeListId}
          onSelectList={selectList}
          onEditTask={openEditModal}
          onToggleTask={handleToggle}
          onDeleteTask={handleDelete}
        />
      </div>

      <TaskEditorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        lists={lists}
        onSubmit={taskBeingEdited ? handleUpdate : handleCreate}
        initialTask={taskBeingEdited}
      />
    </AppShell>
  );
}
