import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const demoRaw = localStorage.getItem('cx_demo_user');
  if (demoRaw) {
    try {
      const demo = JSON.parse(demoRaw);
      if (demo?.prn) {
        config.headers['x-demo-prn'] = demo.prn;
      }
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 403 &&
      error.response?.data?.error?.code === 'PASSWORD_CHANGE_REQUIRED' &&
      window.location.pathname !== '/change-password'
    ) {
      window.location.href = '/change-password';
    }

    // If unauthorized on protected route, redirect to login unless on public endpoints
    if (error.response?.status === 401) {
      const hasDemoSession = !!localStorage.getItem('cx_demo_user');
      const isAuthCheck = error.config?.url?.includes('/auth/me');
      const isPublicRoute =
        window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/register');

      if (!isAuthCheck && !isPublicRoute && !hasDemoSession) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
