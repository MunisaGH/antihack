import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Pencil, Save } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { profileApi } from '@/api';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { authStorage } from '@/lib/auth-storage';
import type { User } from '@/types/api';
import { AvatarCropDialog } from './avatar-crop-dialog';

type FormValues = Pick<
  User,
  'full_name' | 'email' | 'phone' | 'telegram_username' | 'company_name' | 'company_location'
>;

export function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '' });
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileApi.me(),
  });

  const user = data?.data;

  const { register, handleSubmit, reset } = useForm<FormValues>({
    values: user
      ? {
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          telegram_username: user.telegram_username || '',
          company_name: user.company_name,
          company_location: user.company_location,
        }
      : undefined,
  });

  const update = useMutation({
    mutationFn: (values: FormValues) => profileApi.update(values),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        const stored = authStorage.getUser();
        if (stored) {
          authStorage.setUser({
            ...stored,
            full_name: response.data.full_name,
            email: response.data.email,
            phone: response.data.phone,
          });
        }
      }
      setIsEditing(false);
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const uploadAvatar = useMutation({
    mutationFn: (blob: Blob) => {
      const file = new File([blob], 'avatar.jpg', { type: blob.type || 'image/jpeg' });
      return profileApi.uploadAvatar(file);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (response.data) {
        const stored = authStorage.getUser();
        if (stored) authStorage.setUser({ ...stored, avatar: response.data.avatar });
      }
      toast.success(t('common.success'));
      setCropFile(null);
    },
    onError: () => toast.error(t('common.error')),
  });

  const changePassword = useMutation({
    mutationFn: () => profileApi.changePassword(passwordForm),
    onSuccess: () => {
      setPasswordForm({ old_password: '', new_password: '' });
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading || !user) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t('nav.profile')} />

      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="relative">
            <Avatar className="size-20">
              {user.avatar && <AvatarImage src={user.avatar} />}
              <AvatarFallback>{user.full_name?.[0] ?? user.username?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInput.current?.click()}
              className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm hover:bg-brand-700 dark:border-slate-900"
              type="button"
              aria-label="Avatarni o'zgartirish"
            >
              <Camera className="size-3.5" />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCropFile(file);
                e.target.value = '';
              }}
            />
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {user.full_name || user.username}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit((values) => update.mutate(values))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Full name">
                <Input {...register('full_name')} disabled={!isEditing} />
              </FormField>
              <FormField label="Email">
                <Input type="email" {...register('email')} disabled={!isEditing} />
              </FormField>
              <FormField label="Phone">
                <Input {...register('phone')} disabled={!isEditing} />
              </FormField>
              <FormField
                label="Telegram username"
                hint="Nomzodlar siz bilan bog'lanish uchun ko'radi"
              >
                <Input
                  placeholder="@username"
                  {...register('telegram_username')}
                  disabled={!isEditing}
                />
              </FormField>
              <FormField label="Company name">
                <Input {...register('company_name')} disabled={!isEditing} />
              </FormField>
              <FormField label="Company location">
                <Input {...register('company_location')} disabled={!isEditing} />
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      reset();
                      setIsEditing(false);
                    }}
                    disabled={update.isPending}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={update.isPending}>
                    {update.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {t('common.save')}
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  <Pencil className="size-4" />
                  {t('common.edit')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Parolni o'zgartirish</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Eski parol">
              <Input
                type="password"
                value={passwordForm.old_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, old_password: e.target.value }))}
              />
            </FormField>
            <FormField label="Yangi parol">
              <Input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => changePassword.mutate()}
              disabled={
                changePassword.isPending ||
                !passwordForm.old_password ||
                passwordForm.new_password.length < 8
              }
            >
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AvatarCropDialog
        open={Boolean(cropFile)}
        file={cropFile}
        onClose={() => setCropFile(null)}
        onConfirm={async (blob) => {
          await uploadAvatar.mutateAsync(blob);
        }}
        loading={uploadAvatar.isPending}
      />
    </div>
  );
}
