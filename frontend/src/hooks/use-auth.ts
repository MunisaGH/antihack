import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/api';
import { authStorage, type StoredUser } from '@/lib/auth-storage';

type LoginOptions = {
  redirectTo?: string;
};

export function useLogin(options: LoginOptions = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return authApi.login(credentials);
    },
    onSuccess: (response) => {
      authStorage.setToken(response.token);
      authStorage.setRefresh(response.refresh_token);
      const user: StoredUser = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        full_name: response.user.full_name,
        phone: response.user.phone,
        role: response.user.role,
        avatar: response.user.avatar,
      };
      authStorage.setUser(user);
      queryClient.invalidateQueries();

      const fallback = response.user.role === 'applicant' ? '/me' : '/dashboard';
      navigate(options.redirectTo || fallback, { replace: true });
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refresh = authStorage.getRefresh();
      if (refresh) {
        try {
          await authApi.logout(refresh);
        } catch {
          // noop
        }
      }
    },
    onSuccess: () => {
      authStorage.clear();
      queryClient.clear();
      toast.success('Tizimdan chiqdingiz');
      navigate('/login', { replace: true });
    },
    onError: () => {
      authStorage.clear();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
