import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthCredentials {
  email: string;
  password: string;
}

interface RegisterPayload extends AuthCredentials {
  name: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error?: string;
  bootstrap: () => Promise<void>;
  login: (payload: AuthCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  error: undefined,
  clearError: () => set({ error: undefined }),
  async bootstrap() {
    if (get().initialized) return;
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data.user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },
  async login(payload) {
    set({ loading: true, error: undefined });
    try {
      const response = await api.post('/auth/login', payload);
      set({ user: response.data.user, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error ?? 'Impossible de se connecter', loading: false });
      throw error;
    }
  },
  async register(payload) {
    set({ loading: true, error: undefined });
    try {
      const response = await api.post('/auth/register', payload);
      set({ user: response.data.user, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error ?? "Inscription impossible", loading: false });
      throw error;
    }
  },
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      set({ user: null });
    }
  },
}));
