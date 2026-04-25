import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-auth';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

type LocationState = {
  next?: string;
  username?: string;
  password?: string;
  message?: string;
} | null;

export function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as LocationState;

  const next = state?.next || searchParams.get('next') || undefined;
  const prefillUsername = state?.username ?? '';
  const prefillPassword = state?.password ?? '';
  const prefillMessage = state?.message;

  const login = useLogin({ redirectTo: next });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: prefillUsername,
      password: prefillPassword,
    },
  });

  const onSubmit = handleSubmit((data) => login.mutate(data));

  return (
    <div className="bg-orbs relative flex min-h-svh items-center justify-center overflow-hidden bg-slate-50 px-4 dark:bg-slate-950">
      <div className="absolute right-6 top-6 flex items-center gap-2">
        <LanguageSwitcher compact />
        <ThemeToggle />
      </div>

      <div className="glass-strong relative w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" showText={false} />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {t('auth.loginTitle')}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('auth.loginSubtitle')}
            </p>
          </div>
        </div>

        {prefillMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-brand-50/80 p-3 text-sm text-brand-700 backdrop-blur dark:bg-brand-500/10 dark:text-brand-300">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>{prefillMessage}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t('auth.username')}</Label>
            <Input
              id="username"
              autoComplete="username"
              autoFocus={!prefillUsername}
              {...register('username')}
            />
            {errors.username && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus={!!prefillUsername}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
          </div>

          {login.isError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50/80 p-3 text-sm text-red-700 backdrop-blur dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{t('auth.invalidCredentials')}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
            {login.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('auth.loggingIn')}
              </>
            ) : (
              t('auth.login')
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
