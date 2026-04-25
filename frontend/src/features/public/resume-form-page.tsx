import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Briefcase, GraduationCap, Languages, Loader2, Plus, Sparkles, Trash2, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Controller,
  useFieldArray,
  useForm,
  type Resolver,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { publicApi, type ApplicationStatusPayload, type ResumeFormPayload } from '@/api';
import { FormField } from '@/components/form-field';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  clearPendingApplication,
  getPendingApplication,
  savePendingApplication,
} from '@/lib/pending-application';
import { formatUzPhone, isCompleteUzPhone, unformatPhone } from '@/lib/phone';
import { AnalysisLoader } from './analysis-loader';
import { ApplyResultScreen } from './apply-result';

const schema = z.object({
  full_name: z.string().min(2, 'To‘liq ismni kiriting'),
  phone: z.string().refine(isCompleteUzPhone, 'To‘liq telefon raqam kerak'),
  age: z.coerce.number().int().min(14).max(99).optional(),
  address: z.string().optional(),
  telegram_username: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^@?[A-Za-z0-9_]{5,32}$/.test(v.trim()),
      'Telegram username 5-32 belgi',
    ),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email formati noto‘g‘ri'),
  summary: z.string().optional(),
  experience_data: z
    .array(
      z.object({
        position: z.string().optional(),
        company: z.string().optional(),
        duration: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  education_data: z
    .array(
      z.object({
        degree: z.string().optional(),
        field: z.string().optional(),
        institution: z.string().optional(),
        year: z.string().optional(),
      }),
    )
    .optional(),
  technical_skills_text: z.string().optional(),
  soft_skills_text: z.string().optional(),
  languages_data: z
    .array(
      z.object({
        name: z.string().optional(),
        level: z.string().optional(),
      }),
    )
    .optional(),
  certifications_text: z.string().optional(),
  hobbies: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type Phase = 'form' | 'analyzing' | 'result';

function splitTags(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ResumeFormPage() {
  const { uniqueLink = '' } = useParams<{ uniqueLink: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('form');
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [pollToken, setPollToken] = useState<string>('');
  const [result, setResult] = useState<ApplicationStatusPayload | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const vacancyQuery = useQuery({
    queryKey: ['public-vacancy', uniqueLink],
    queryFn: () => publicApi.vacancyByLink(uniqueLink),
  });
  const vacancyId = vacancyQuery.data?.data?.id;

  // Brauzer yopilib qaytib kelgan bo'lsa — pending'ni qayta tiklash
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
    defaultValues: {
      phone: formatUzPhone(''),
      experience_data: [{ position: '', company: '', duration: '', description: '' }],
      education_data: [{ degree: '', field: '', institution: '', year: '' }],
      languages_data: [{ name: '', level: '' }],
    },
  });

  const experience = useFieldArray({ control: form.control, name: 'experience_data' });
  const education = useFieldArray({ control: form.control, name: 'education_data' });
  const languages = useFieldArray({ control: form.control, name: 'languages_data' });

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!vacancyId) throw new Error('Vacancy not loaded');
      const payload: ResumeFormPayload = {
        full_name: values.full_name,
        phone: unformatPhone(values.phone),
        age: values.age,
        address: values.address,
        telegram_username: values.telegram_username?.trim().replace(/^@/, ''),
        email: values.email,
        user_language: i18n.resolvedLanguage === 'ru' ? 'ru' : 'uz',
        summary: values.summary,
        experience_data: values.experience_data?.filter(
          (e) => e.position || e.company || e.duration || e.description,
        ),
        education_data: values.education_data?.filter(
          (e) => e.degree || e.field || e.institution || e.year,
        ),
        technical_skills: splitTags(values.technical_skills_text),
        soft_skills: splitTags(values.soft_skills_text),
        languages: values.languages_data
          ?.filter((l) => l.name)
          .map((l) => ({ name: l.name ?? '', level: l.level })),
        certifications: splitTags(values.certifications_text),
        hobbies: values.hobbies,
      };
      return publicApi.submitResumeForm({ vacancy_id: vacancyId, form_data: payload });
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
      const err = error as {
        response?: {
          data?: { detail?: string; message?: string; errors?: Record<string, string[]> };
        };
      };
      const data = err?.response?.data;
      let message = data?.detail || data?.message;
      if (!message && data?.errors) {
        const firstField = Object.keys(data.errors)[0];
        if (firstField) {
          const msgs = data.errors[firstField];
          if (Array.isArray(msgs) && msgs.length > 0) message = msgs[0];
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

  useEffect(() => {
    if (phase !== 'form') topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [phase]);

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
    <div ref={topRef} className="bg-orbs relative min-h-svh bg-slate-50 dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <button type="button" onClick={() => navigate(`/apply/${uniqueLink}/submit`)}>
          <Logo size="sm" />
        </button>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
        {phase === 'form' && (
          <>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              {t('resumeForm.title')}
            </h1>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              {vacancy.title} — {t('resumeForm.subtitle')}
            </p>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Shaxsiy ma'lumot */}
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <SectionHeader icon={User} label={t('resumeForm.sectionPersonal')} />

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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label={t('application.telegramUsername')}
                      error={form.formState.errors.telegram_username?.message}
                    >
                      <Input placeholder="@azizbek" {...form.register('telegram_username')} />
                    </FormField>
                    <FormField
                      label="Email"
                      hint={t('resumeForm.optional')}
                      error={form.formState.errors.email?.message}
                    >
                      <Input type="email" placeholder="you@example.com" {...form.register('email')} />
                    </FormField>
                  </div>
                </CardContent>
              </Card>

              {/* O'zim haqimda */}
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <SectionHeader icon={Sparkles} label={t('resumeForm.sectionAbout')} />
                  <FormField
                    label={t('resumeForm.summary')}
                    hint={t('resumeForm.summaryHint')}
                  >
                    <Textarea
                      rows={4}
                      placeholder={t('resumeForm.summaryPlaceholder')}
                      {...form.register('summary')}
                    />
                  </FormField>
                </CardContent>
              </Card>

              {/* Tajriba */}
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={Briefcase} label={t('resumeForm.sectionExperience')} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        experience.append({ position: '', company: '', duration: '', description: '' })
                      }
                    >
                      <Plus className="size-4" /> {t('resumeForm.add')}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('resumeForm.experienceHint')}
                  </p>

                  {experience.fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t('resumeForm.item')} {idx + 1}
                        </span>
                        {experience.fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-slate-400 hover:text-red-600"
                            onClick={() => experience.remove(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          placeholder={t('resumeForm.position')}
                          {...form.register(`experience_data.${idx}.position`)}
                        />
                        <Input
                          placeholder={t('resumeForm.company')}
                          {...form.register(`experience_data.${idx}.company`)}
                        />
                      </div>
                      <Input
                        placeholder={t('resumeForm.duration')}
                        {...form.register(`experience_data.${idx}.duration`)}
                      />
                      <Textarea
                        rows={2}
                        placeholder={t('resumeForm.descriptionPlaceholder')}
                        {...form.register(`experience_data.${idx}.description`)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Ta'lim */}
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={GraduationCap} label={t('resumeForm.sectionEducation')} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        education.append({ degree: '', field: '', institution: '', year: '' })
                      }
                    >
                      <Plus className="size-4" /> {t('resumeForm.add')}
                    </Button>
                  </div>

                  {education.fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t('resumeForm.item')} {idx + 1}
                        </span>
                        {education.fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-slate-400 hover:text-red-600"
                            onClick={() => education.remove(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          placeholder={t('resumeForm.institution')}
                          {...form.register(`education_data.${idx}.institution`)}
                        />
                        <Input
                          placeholder={t('resumeForm.degree')}
                          {...form.register(`education_data.${idx}.degree`)}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          placeholder={t('resumeForm.fieldOfStudy')}
                          {...form.register(`education_data.${idx}.field`)}
                        />
                        <Input
                          placeholder={t('resumeForm.year')}
                          {...form.register(`education_data.${idx}.year`)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Ko'nikmalar */}
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <SectionHeader icon={Sparkles} label={t('resumeForm.sectionSkills')} />

                  <FormField
                    label={t('resumeForm.technicalSkills')}
                    hint={t('resumeForm.skillsHint')}
                  >
                    <Textarea
                      rows={2}
                      placeholder={t('resumeForm.technicalSkillsPlaceholder')}
                      {...form.register('technical_skills_text')}
                    />
                  </FormField>

                  <FormField
                    label={t('resumeForm.softSkills')}
                    hint={t('resumeForm.skillsHint')}
                  >
                    <Textarea
                      rows={2}
                      placeholder={t('resumeForm.softSkillsPlaceholder')}
                      {...form.register('soft_skills_text')}
                    />
                  </FormField>
                </CardContent>
              </Card>

              {/* Tillar */}
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={Languages} label={t('resumeForm.sectionLanguages')} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => languages.append({ name: '', level: '' })}
                    >
                      <Plus className="size-4" /> {t('resumeForm.add')}
                    </Button>
                  </div>

                  {languages.fields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        placeholder={t('resumeForm.languageName')}
                        {...form.register(`languages_data.${idx}.name`)}
                      />
                      <Input
                        className="w-40"
                        placeholder={t('resumeForm.languageLevel')}
                        {...form.register(`languages_data.${idx}.level`)}
                      />
                      {languages.fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-slate-400 hover:text-red-600"
                          onClick={() => languages.remove(idx)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Sertifikatlar + Qiziqishlar */}
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <SectionHeader icon={Sparkles} label={t('resumeForm.sectionExtras')} />

                  <FormField
                    label={t('resumeForm.certifications')}
                    hint={t('resumeForm.skillsHint')}
                  >
                    <Textarea
                      rows={2}
                      placeholder={t('resumeForm.certificationsPlaceholder')}
                      {...form.register('certifications_text')}
                    />
                  </FormField>

                  <FormField label={t('resumeForm.hobbies')} hint={t('resumeForm.optional')}>
                    <Textarea
                      rows={2}
                      placeholder={t('resumeForm.hobbiesPlaceholder')}
                      {...form.register('hobbies')}
                    />
                  </FormField>
                </CardContent>
              </Card>

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

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: typeof User;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-brand-500" />
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{label}</h2>
    </div>
  );
}
