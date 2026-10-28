import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore, User } from '@/store/auth';
import { useEffect } from 'react';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading, setUser, clearUser } = useAuthStore();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await api.get<{ user: User }>('/auth/me');
        return res.data.user;
      } catch (err: any) {
        if (err.response?.status === 401) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  useEffect(() => {
    if (!meQuery.isLoading) {
      setUser(meQuery.data ?? null);
    }
  }, [meQuery.data, meQuery.isLoading, setUser]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { prn: string; password: string }) => {
      const res = await api.post<{ user: User; mustChangePassword: boolean }>('/auth/login', credentials);
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
    }) => {
      const res = await api.post<{ status: string; email: string; message: string }>('/auth/register', data);
      return res.data;
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const res = await api.post<{ user: User; ok: boolean }>('/auth/verify-otp', data);
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await api.post<{ ok: boolean; message: string }>('/auth/resend-otp', data);
      return res.data;
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const res = await api.post<{ user: User }>('/auth/change-password', data);
      return res.data.user;
    },
    onSuccess: (userData) => {
      setUser(userData);
      queryClient.setQueryData(['auth', 'me'], userData);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      clearUser();
      queryClient.clear();
      window.location.href = '/login';
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await api.patch<{ user: User }>('/users/me', data);
      return res.data.user;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(['auth', 'me'], updatedUser);
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || meQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    verifyOtp: verifyOtpMutation.mutateAsync,
    isVerifyingOtp: verifyOtpMutation.isPending,
    resendOtp: resendOtpMutation.mutateAsync,
    isResendingOtp: resendOtpMutation.isPending,
    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    logout: logoutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
  };
};
