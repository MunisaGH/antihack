import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, FileUp, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { publicApi, type ApplicationStatusPayload } from '@/api';
import { FormField } from '@/components/form-field';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  clearPendingApplication,
  getPendingApplication,
  savePendingApplication,
} from '@/lib/pending-application';
import { formatUzPhone, isCompleteUzPhone, unformatPhone } from '@/lib/phone';
import { AnalysisLoader } from './analysis-loader';
import { ApplyResultScreen } from './apply-result';

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().refine(isCompleteUzPhone, 'To‘liq telefon raqam kerak'),
  age: z.coerce.number().int().min(14).max(99).optional(),
  address: z.string().optional(),
  telegram_username: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^@?[A-Za-z0-9_]{5,32}$/.test(v.trim()),
      'Telegram username 5-32 belgi (harf, raqam, _)',
    ),
});

type FormValues = z.infer<typeof schema>;

type Phase = 'form' | 'analyzing' | 'result';

export function ApplyPage() {
  const { uniqueLink = '' } = useParams<{ uniqueLink: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [pollToken, setPollToken] = useState<string>('');
  const [result, setResult] = useState<ApplicationStatusPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vacancyQuery = useQuery({
    queryKey: ['public-vacancy', uniqueLink],
    queryFn: () => publicApi.vacancyByLink(uniqueLink),
  });
  const vacancyId = vacancyQuery.data?.data?.id;

  // Brauzer yopilib qaytib kelgan bo'lsa — saqlangan pending application'ni qayta tiklash
  useEffect(() => {
    if (!vacancyId || applicationId) return;
    const pending = getPendingApplication(vacancyId);
    if (pending) {
      setApplicationId(pending.applicationId);
      setPollToken(pending.pollToken);
      setPhase('analyzing');
    }
  }, [vacancyId, applicationId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: { phone: formatUzPhone('') },
  });

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!vacancyId) throw new Error('Vacancy not loaded');
      const formData = new FormData();
      formData.append('vacancy', vacancyId);
      formData.append('full_name', values.full_name);
      formData.append('phone', unformatPhone(values.phone));
      if (values.age) formData.append('age', String(values.age));
      if (values.address) formData.append('address', values.address);
      if (values.telegram_username) {
        formData.append('telegram_username', values.telegram_username.trim().replace(/^@/, ''));
      }
      formData.append('user_language', i18n.resolvedLanguage === 'ru' ? 'ru' : 'uz');
      if (file) formData.append('resume_file', file);
      return publicApi.submitApplication(formData);
    },
    onSuccess: (response) => {
      if (response.application_id) {
        setApplicationId(response.application_id);
        const token = response.poll_token || '';
        setPollToken(token);
        if (vacancyId) {
          savePendingApplication({
            vacancyId,
            applicationId: response.application_id,
            pollToken: token,
          });
        }
        setPhase('analyzing');
      }
    },
    onError: (error: unknown) => {
      // Backend'dan kelgan aniq xato matnini ko'rsatamiz
      const err = error as {
        response?: {
          data?: {
            detail?: string;
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
      };
      const data = err?.response?.data;
      let message = data?.detail || data?.message;
      if (!message && data?.errors) {
        const firstField = Object.keys(data.errors)[0];
        if (firstField) {
          const msgs = data.errors[firstField];
          if (Array.isArray(msgs) && msgs.length > 0) {
            message = msgs[0];
          }
        }
      }
      toast.error(message || t('common.error'), { duration: 6000 });
    },
  });

  useEffect(() => {
    if (phase !== 'analyzing' || !applicationId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const response = await publicApi.applicationStatus(applicationId, pollToken || undefined);
        if (cancelled) return;
        const data = response.data;
        if (data.status !== 'ai_analyzing') {
          setResult(data);
          setPhase('result');
          return;
        }
      } catch {
        // ignore
      }
      timer = setTimeout(poll, 2500);
    };

    timer = setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, applicationId, pollToken]);

  const onSubmit = form.handleSubmit((values) => submit.mutate(values));

  if (vacancyQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!vacancyQuery.data?.data) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Vakansiya topilmadi.
      </div>
    );
  }

  const vacancy = vacancyQuery.data.data;

  return (
    <div className="bg-orbs relative min-h-svh bg-slate-50 dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to={`/apply/${uniqueLink}`}>
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
        {phase === 'form' && (
          <>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              {t('apply.title')}
            </h1>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{vacancy.title}</p>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  <FormField
                    label={t('application.fullName')}
                    required
                    error={form.formState.errors.full_name?.message}
                  >
                    <Input {...form.register('full_name')} />
                  </FormField>

                  <FormField
                    label={t('application.phone')}
                    required
                    error={form.formState.errors.phone?.message}
                  >
                    <Controller
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="+998 __ ___ __ __"
                          value={field.value || formatUzPhone('')}
                          onChange={(e) => field.onChange(formatUzPhone(e.target.value))}
                          onFocus={(e) => {
                            if (!field.value) field.onChange(formatUzPhone(''));
                            // Kursorni oxiriga qo‘yamiz
                            const end = e.currentTarget.value.length;
                            e.currentTarget.setSelectionRange(end, end);
                          }}
                        />
                      )}
                    />
                  </FormField>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label={t('application.age')}>
                      <Input type="number" min={14} max={99} {...form.register('age')} />
                    </FormField>
                    <FormField label={t('application.address')}>
                      <Input {...form.register('address')} />
                    </FormField>
                  </div>

                  <FormField
                    label={t('application.telegramUsername')}
                    hint={t('application.telegramUsernameHint')}
                    error={form.formState.errors.telegram_username?.message}
                  >
                    <Input placeholder="@azizbek" {...form.register('telegram_username')} />
                  </FormField>

                  <FormField label={t('apply.uploadResume')} hint="PDF yoki DOCX (max 10MB)">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand-500 dark:hover:bg-brand-500/10"
                    >
                      <FileUp className="size-5 text-slate-500 dark:text-slate-400" />
                      <div className="min-w-0 flex-1 text-sm">
                        {file ? (
                          <span className="text-slate-900 dark:text-slate-100">{file.name}</span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            Rezyume faylini tanlang
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </FormField>

                  <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    <span>{t('apply.orManual')}</span>
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <Link
                    to={`/apply/${uniqueLink}/form`}
                    className="block rounded-lg border border-slate-200 bg-white p-3 text-center text-sm font-medium text-brand-600 transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-brand-400 dark:hover:border-brand-500 dark:hover:bg-brand-500/10"
                  >
                    {t('apply.manualFormLink')}
                  </Link>

                  <Button type="submit" size="lg" className="w-full" disabled={submit.isPending}>
                    {submit.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t('apply.submitting')}
                      </>
                    ) : (
                      <>
                        {t('apply.submit')}
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {phase === 'analyzing' && (
          <Card className="glass-strong">
            <CardContent className="p-6 sm:p-10">
              <AnalysisLoader />
            </CardContent>
          </Card>
        )}

        {phase === 'result' && result && (
          <ApplyResultScreen
            result={result}
            vacancyTitle={vacancy.title}
            onStartInterview={() => {
              const creds = result.credentials;
              if (!creds?.username || !creds?.password) {
                toast.error(t('common.error'));
                return;
              }
              // Login qilishga o'tishdan oldin pending'ni tozalaymiz
              clearPendingApplication();
              const nextPath = `/interview/${result.application_id}`;
              navigate(`/login?next=${encodeURIComponent(nextPath)}`, {
                state: {
                  next: nextPath,
                  username: creds.username,
                  password: creds.password,
                  message: "Hisobingizni tasdiqlang — intervyu shundan so'ng boshlanadi",
                },
              });
            }}
          />
        )}
      </main>
    </div>
  );
}

