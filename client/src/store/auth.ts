import { create } from 'zustand';

export interface User {
  id: string;
  prn: string;
  rollNo: number;
  batch?: string | null;
  email?: string | null;
  name: string;
  branch?: string | null;
  year?: string | null;
  mustChangePassword: boolean;
  hostel?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  upiId?: string | null;
  upiName?: string | null;
  emailVerified?: boolean;
  role: 'STUDENT' | 'ADMIN' | string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
