import queryString from 'query-string';
import { create } from 'zustand';
import { api } from '../lib/api';
import { buildVerboseFallback, extractAxiosErrorContext, extractAxiosErrorPayload, extractErrorMessage } from '../lib/errors';
import type { Task, TaskFilters, TaskList, TaskFormInput } from '../types';

interface TaskState {
  lists: TaskList[];
  tasks: Task[];
  activeListId?: string;
  filters: TaskFilters;
  loading: boolean;
  error?: string;
  summary: { total: number; open: number; completed: number };
  fetchLists: () => Promise<void>;
  fetchTasks: (listId?: string) => Promise<void>;
  selectList: (listId?: string) => void;
  setFilters: (filters: Partial<TaskFilters>) => Promise<void>;
  createTask: (payload: TaskFormInput) => Promise<void>;
  updateTask: (taskId: string, payload: TaskFormInput) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

const defaultFilters: TaskFilters = {
  search: '',
  status: 'all',
  showStarredOnly: false,
};

const NEW_LIST_SENTINEL = '__new__';

const ensureIsoDate = (value?: string) => {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

export const useTaskStore = create<TaskState>((set, get) => ({
  lists: [],
  tasks: [],
  activeListId: undefined,
  filters: defaultFilters,
  loading: false,
  summary: { total: 0, open: 0, completed: 0 },
  async fetchLists() {
    try {
      const response = await api.get('/tasks/lists');
      const lists: TaskList[] = response.data.lists;
      set({ lists });
      if (!get().activeListId && lists[0]) {
        set({ activeListId: lists[0].id });
      }
    } catch (error: any) {
      const context = extractAxiosErrorContext(error);
      const payload = extractAxiosErrorPayload(error);
      set({ error: extractErrorMessage(payload, buildVerboseFallback('Impossible de charger les listes', context)) });
      throw error;
    }
  },
  async fetchTasks(explicitListId) {
    const { filters, activeListId } = get();
    const listId = explicitListId ?? activeListId;
    set({ loading: true });
    try {
      const query = queryString.stringify(
        {
          listId,
          status: filters.status,
        },
        { skipNull: true, skipEmptyString: true }
      );
      const response = await api.get(`/tasks${query ? `?${query}` : ''}`);
      const tasks: Task[] = response.data.tasks;
      const summary = tasks.reduce(
        (acc, task) => {
          acc.total += 1;
          if (task.status === 'completed') {
            acc.completed += 1;
          } else {
            acc.open += 1;
          }
          return acc;
        },
        { total: 0, open: 0, completed: 0 }
      );
      set({ tasks, summary, loading: false });
    } catch (error: any) {
      const context = extractAxiosErrorContext(error);
      const payload = extractAxiosErrorPayload(error);
      set({
        loading: false,
        error: extractErrorMessage(payload, buildVerboseFallback('Chargement des tâches impossible', context)),
      });
      throw error;
    }
  },
  selectList(listId) {
    set({ activeListId: listId });
    void get().fetchTasks(listId);
  },
  async setFilters(partial) {
    set((state) => ({ filters: { ...state.filters, ...partial } }));
    await get().fetchTasks();
  },
  async createTask(payload) {
    const { activeListId } = get();
    const requestedListId = payload.listId;
    const newListTitle = payload.listTitle?.trim();
    const resolvedListId =
      requestedListId && requestedListId !== NEW_LIST_SENTINEL
        ? requestedListId
        : requestedListId === NEW_LIST_SENTINEL
        ? undefined
        : activeListId;

    const body = {
      title: payload.title,
      description: payload.description,
      notes: payload.notes,
      dueAt: payload.dueAt ?? undefined,
      listId: resolvedListId,
      listTitle: requestedListId === NEW_LIST_SENTINEL ? newListTitle : undefined,
      starred: payload.starred,
      recurrence: payload.recurrence ? transformRecurrenceForApi(payload.recurrence) : undefined,
    };
    const response = await api.post('/tasks', body);
    set((state) => ({ tasks: [response.data.task, ...state.tasks] }));
    await get().fetchLists();
  },
  async updateTask(taskId, payload) {
    const body: Record<string, unknown> = {
      title: payload.title,
      description: payload.description,
      notes: payload.notes,
      dueAt: payload.dueAt === null ? null : payload.dueAt ?? undefined,
      starred: payload.starred,
    };

    if (payload.listId) {
      if (payload.listId !== NEW_LIST_SENTINEL) {
        body.listId = payload.listId;
      } else if (payload.listTitle) {
        body.listTitle = payload.listTitle.trim();
      }
    }

    if (payload.recurrence === null) {
      body.recurrence = null;
    } else if (payload.recurrence) {
      body.recurrence = transformRecurrenceForApi(payload.recurrence);
    }

    const response = await api.put(`/tasks/${taskId}`, body);
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === taskId ? response.data.task : task)),
    }));
    await get().fetchLists();
  },
  async toggleTask(taskId) {
    const response = await api.patch(`/tasks/${taskId}/toggle`);
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === taskId ? response.data.task : task)),
    }));
    await get().fetchLists();
  },
  async deleteTask(taskId) {
    await api.delete(`/tasks/${taskId}`);
    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId) }));
    await get().fetchLists();
  },
}));

function transformRecurrenceForApi(data: TaskFormInput['recurrence']) {
  if (!data) return undefined;

  const end =
    data.endType === 'never'
      ? { type: 'never' as const }
      : data.endType === 'afterOccurrences'
      ? { type: 'afterOccurrences' as const, occurrences: Math.max(1, data.occurrences ?? 1) }
      : { type: 'onDate' as const, date: ensureIsoDate(data.untilDate) };

  const interval = Math.max(1, data.interval);

  switch (data.type) {
    case 'daily':
      return { type: 'daily', interval, end };
    case 'weekly':
      return { type: 'weekly', interval, days: data.days, end };
    case 'monthly':
      if (data.mode === 'dayOfMonth') {
        return { type: 'monthly', interval, mode: 'dayOfMonth', day: data.day, end };
      }
      return { type: 'monthly', interval, mode: 'nthWeekday', nth: data.nth, weekday: data.weekday, end };
    case 'yearly':
      if (data.mode === 'specificDate') {
        return { type: 'yearly', interval, mode: 'specificDate', month: data.month, day: data.day, end };
      }
      return { type: 'yearly', interval, mode: 'nthWeekdayOfMonth', month: data.month, nth: data.nth, weekday: data.weekday, end };
    default:
      return undefined;
  }
}
