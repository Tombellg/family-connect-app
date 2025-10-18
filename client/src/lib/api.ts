import axios from 'axios';

const resolveApiBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv;
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);

    if (isLocalHost) {
      return 'http://localhost:4000/api';
    }

    return `${origin}/api`;
  }

  return 'http://localhost:4000/api';
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // allow consumers to handle auth reset
    }
    return Promise.reject(error);
  }
);
