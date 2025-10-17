import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task, TaskFormInput, TaskList } from '../../types';
import RecurrenceEditor from './TaskRecurrenceEditor';

interface TaskEditorModalProps {
  open: boolean;
  onClose: () => void;
  lists: TaskList[];
  onSubmit: (payload: TaskFormInput) => Promise<void>;
  initialTask?: Task;
}

const NEW_LIST_SENTINEL = '__new__';

const initialForm: TaskFormInput = {
  title: '',
  description: '',
  notes: '',
  dueAt: undefined,
  starred: false,
};

export default function TaskEditorModal({ open, onClose, lists, onSubmit, initialTask }: TaskEditorModalProps) {
  const [form, setForm] = useState<TaskFormInput>(initialForm);
  const [saving, setSaving] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const isEditing = Boolean(initialTask);

  useEffect(() => {
    if (initialTask) {
      setForm(taskToFormInput(initialTask));
      setNewListTitle('');
    } else {
      const fallbackListId = lists[0]?.id ?? (lists.length === 0 ? NEW_LIST_SENTINEL : undefined);
      setForm({ ...initialForm, listId: fallbackListId });
      setNewListTitle('');
    }
  }, [initialTask, lists]);

  if (!open) return null;

  const handleChange = (field: keyof TaskFormInput) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleListChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setForm((prev) => ({ ...prev, listId: next }));
    if (next !== NEW_LIST_SENTINEL) {
      setNewListTitle('');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const selectedListId = form.listId ?? lists[0]?.id ?? NEW_LIST_SENTINEL;
      const trimmedNewListTitle = newListTitle.trim();
      await onSubmit({
        ...form,
        listId: selectedListId,
        listTitle: selectedListId === NEW_LIST_SENTINEL ? trimmedNewListTitle : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectedListId = form.listId ?? lists[0]?.id ?? NEW_LIST_SENTINEL;
  const disableSubmit = saving || (selectedListId === NEW_LIST_SENTINEL && newListTitle.trim().length === 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          className="card-surface w-full max-w-2xl rounded-3xl p-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}
              </h2>
              <p className="mt-1 text-sm text-slate-300">Configurez les détails et la récurrence avec précision.</p>
            </div>
            <button onClick={onClose} className="text-slate-300 hover:text-white">Fermer</button>
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Titre</label>
                <input
                  value={form.title}
                  onChange={handleChange('title')}
                  placeholder="Ex: Ranger la cuisine"
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Liste</label>
                <select
                  value={selectedListId}
                  onChange={handleListChange}
                  className="w-full rounded-xl px-4 py-3 text-sm"
                >
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.title}
                    </option>
                  ))}
                  <option value={NEW_LIST_SENTINEL}>Créer une nouvelle liste…</option>
                </select>
                {selectedListId === NEW_LIST_SENTINEL && (
                  <input
                    value={newListTitle}
                    onChange={(event) => setNewListTitle(event.target.value)}
                    placeholder="Nom de la nouvelle liste"
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Description</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={handleChange('description')}
                  placeholder="Ajoutez des détails utiles pour le foyer"
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Notes privées</label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={handleChange('notes')}
                  placeholder="Liens, astuces, matériel nécessaire."
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Échéance</label>
                <input
                  type="datetime-local"
                  value={form.dueAt ? form.dueAt.slice(0, 16) : ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dueAt: event.target.value ? new Date(event.target.value).toISOString() : undefined }))
                  }
                  className="w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={form.starred ?? false}
                  onChange={(event) => setForm((prev) => ({ ...prev, starred: event.target.checked }))}
                />
                Tâche prioritaire
              </label>
            </div>

            <RecurrenceEditor
              value={form.recurrence ?? null}
              onChange={(recurrence) => setForm((prev) => ({ ...prev, recurrence }))}
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-slate-200"
              >
                Annuler
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={disableSubmit}
                className="brand-gradient rounded-full px-6 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Créer la tâche'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function taskToFormInput(task: Task): TaskFormInput {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    notes: task.notes,
    dueAt: task.dueAt,
    listId: task.listId,
    starred: task.starred ?? false,
    recurrence: task.recurrence ? recurrenceToFormState(task.recurrence) : null,
  };
}

function recurrenceToFormState(recurrence: Task['recurrence']): TaskFormInput['recurrence'] {
  if (!recurrence) return null;
  const base: any = {
    type: recurrence.type,
    interval:
      recurrence.type === 'daily'
        ? recurrence.daily.interval
        : recurrence.type === 'weekly'
        ? recurrence.weekly.interval
        : recurrence.type === 'monthly'
        ? recurrence.monthly.interval
        : recurrence.yearly.interval,
    endType: recurrence.end?.type ?? 'never',
    occurrences: recurrence.end?.type === 'afterOccurrences' ? recurrence.end.occurrences : undefined,
    untilDate: recurrence.end?.type === 'onDate' ? recurrence.end.date.slice(0, 10) : undefined,
  };

  switch (recurrence.type) {
    case 'daily':
      return base;
    case 'weekly':
      return { ...base, days: recurrence.weekly.days };
    case 'monthly':
      if (recurrence.monthly.mode === 'dayOfMonth') {
        return { ...base, mode: 'dayOfMonth', day: recurrence.monthly.day };
      }
      return { ...base, mode: 'nthWeekday', nth: recurrence.monthly.nth, weekday: recurrence.monthly.weekday };
    case 'yearly':
      if (recurrence.yearly.mode === 'specificDate') {
        return { ...base, mode: 'specificDate', month: recurrence.yearly.month, day: recurrence.yearly.day };
      }
      return { ...base, mode: 'nthWeekdayOfMonth', month: recurrence.yearly.month, nth: recurrence.yearly.nth, weekday: recurrence.yearly.weekday };
    default:
      return null;
  }
}
