import { api } from '@/api/client';
import type { ApiResponse, User } from '@/types/api';

export const profileApi = {
  me: () => api.get<ApiResponse<User>>('/profile/me/').then((r) => r.data),

  update: (payload: Partial<Pick<User, 'full_name' | 'email' | 'phone' | 'company_name' | 'company_location'>>) =>
    api.patch<ApiResponse<User>>('/profile/me/', payload).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api
      .post<ApiResponse<User>>('/profile/upload_avatar/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  changePassword: (payload: { old_password: string; new_password: string }) =>
    api.post<ApiResponse<null>>('/profile/change_password/', payload).then((r) => r.data),
};
