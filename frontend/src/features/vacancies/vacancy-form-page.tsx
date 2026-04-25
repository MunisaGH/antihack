import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2, Save, Sparkles, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { vacanciesApi } from '@/api';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import type { VacancyCreateInput } from '@/types/api';

const schema = z.object({
  title_uz: z.string().min(2),
  description_uz: z.string().min(5),
  requirements_uz: z.string().min(5),
  responsibilities_uz: z.string().min(5),

  title_ru: z.string().min(2),
  description_ru: z.string().min(5),
  requirements_ru: z.string().min(5),
  responsibilities_ru: z.string().min(5),

  work_type: z.enum(['remote', 'office', 'hybrid']),
  work_schedule: z.enum(['full-time', 'part-time', 'contract']),
  location: z.string().min(1),
  experience_years: z.coerce.number().int().min(0).default(0),
  experience_months: z.coerce.number().int().min(0).max(11).default(0),
  salary_min: z.coerce.number().nullable().optional(),
  salary_max: z.coerce.number().nullable().optional(),
  min_match_score: z.coerce.number().int().min(0).max(100).default(70),
});

type FormValues = z.infer<typeof schema>;

function toPayload(values: FormValues): VacancyCreateInput {
  return {
    title: { uz: values.title_uz, ru: values.title_ru },
    description: { uz: values.description_uz, ru: values.description_ru },
    requirements: { uz: values.requirements_uz, ru: values.requirements_ru },
    responsibilities: { uz: values.responsibilities_uz, ru: values.responsibilities_ru },
    work_type: values.work_type,
    work_schedule: values.work_schedule,
    location: values.location,
    experience_years: values.experience_years,
    experience_months: values.experience_months,
    salary_min: values.salary_min ?? null,
    salary_max: values.salary_max ?? null,
    min_match_score: values.min_match_score,
  };
}

export function VacancyFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRu, setShowRu] = useState(isEdit);
  const [brief, setBrief] = useState('');

  const editingQuery = useQuery({
    queryKey: ['vacancies', 'raw', id],
    queryFn: async () => {
      if (!id) return null;
      const [uz, ru] = await Promise.all([
        vacanciesApi.get(id, { lang: 'uz' }),
        vacanciesApi.get(id, { lang: 'ru' }),
      ]);
      return { uz, ru };
    },
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      work_type: 'office',
      work_schedule: 'full-time',
      experience_years: 0,
      experience_months: 0,
      min_match_score: 70,
    },
    values: editingQuery.data
      ? {
          title_uz: editingQuery.data.uz.title,
          title_ru: editingQuery.data.ru.title,
          description_uz: editingQuery.data.uz.description,
          description_ru: editingQuery.data.ru.description,
          requirements_uz: editingQuery.data.uz.requirements,
          requirements_ru: editingQuery.data.ru.requirements,
          responsibilities_uz: editingQuery.data.uz.responsibilities,
          responsibilities_ru: editingQuery.data.ru.responsibilities,
          work_type: editingQuery.data.uz.work_type,
          work_schedule: editingQuery.data.uz.work_schedule,
          location: editingQuery.data.uz.location,
          experience_years: editingQuery.data.uz.experience_years,
          experience_months: editingQuery.data.uz.experience_months,
          salary_min: editingQuery.data.uz.salary_min ? Number(editingQuery.data.uz.salary_min) : null,
          salary_max: editingQuery.data.uz.salary_max ? Number(editingQuery.data.uz.salary_max) : null,
          min_match_score: editingQuery.data.uz.min_match_score,
        }
      : undefined,
  });

  const generate = useMutation({
    mutationFn: async () => vacanciesApi.generateFromBrief(brief.trim()),
    onSuccess: (response) => {
      if (!response.data) return;
      const d = response.data;
      form.setValue('title_uz', d.title, { shouldValidate: true });
      form.setValue('description_uz', d.description, { shouldValidate: true });
      form.setValue('requirements_uz', d.requirements, { shouldValidate: true });
      form.setValue('responsibilities_uz', d.responsibilities, { shouldValidate: true });
      form.setValue('work_type', d.work_type);
      form.setValue('work_schedule', d.work_schedule);
      form.setValue('experience_years', d.experience_years);
      form.setValue('experience_months', d.experience_months);
      if (d.location) form.setValue('location', d.location);
      if (typeof d.salary_min === 'number') form.setValue('salary_min', d.salary_min);
      if (typeof d.salary_max === 'number') form.setValue('salary_max', d.salary_max);
      if (typeof d.min_match_score === 'number') form.setValue('min_match_score', d.min_match_score);
      toast.success("AI vakansiyani to'ldirdi — tahrirlab, keyin rus tiliga o'tkazing");
    },
    onError: () => toast.error("AI bilan to'ldirib bo'lmadi"),
  });

  const translate = useMutation({
    mutationFn: async () => {
      const { title_uz, description_uz, requirements_uz, responsibilities_uz } = form.getValues();
      return vacanciesApi.translate({
        title: title_uz,
        description: description_uz,
        requirements: requirements_uz,
        responsibilities: responsibilities_uz,
      });
    },
    onSuccess: (response) => {
      if (response.data) {
        form.setValue('title_ru', response.data.title, { shouldValidate: true });
        form.setValue('description_ru', response.data.description, { shouldValidate: true });
        form.setValue('requirements_ru', response.data.requirements, { shouldValidate: true });
        form.setValue('responsibilities_ru', response.data.responsibilities, { shouldValidate: true });
        setShowRu(true);
        toast.success('Rus tiliga tarjima qilindi');
      }
    },
    onError: () => toast.error("Tarjima qilib bo'lmadi"),
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = toPayload(values);
      if (isEdit && id) return vacanciesApi.update(id, payload);
      const created = await vacanciesApi.create(payload);
      return created.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      toast.success(t('common.success'));
      const resultId = (result as { id?: string } | undefined)?.id;
      if (resultId) navigate(`/vacancies/${resultId}`);
      else navigate('/vacancies');
    },
    onError: () => toast.error(t('common.error')),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  const uzValid =
    form.watch('title_uz')?.length >= 2 &&
    form.watch('description_uz')?.length >= 5 &&
    form.watch('requirements_uz')?.length >= 5 &&
    form.watch('responsibilities_uz')?.length >= 5;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t('vacancy.edit') : t('vacancy.create')}
        description="Qisqacha yozing — AI to'liq vakansiyani yaratib beradi. Keyin tahrirlab, rus tiliga tarjima qiling."
        backTo="/vacancies"
      />

      {!isEdit && (
        <div className="glass relative rounded-2xl border border-brand-200/60 p-6 dark:border-brand-500/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-sm">
              <Wand2 className="size-5" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">AI bilan yaratish</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Vakansiya haqida qisqacha yozing — lavozim, texnologiyalar, tajriba, ish turi va hokazo.
                  Gemini to'liq tavsif, talablar va mas'uliyatlarni yaratib beradi.
                </p>
              </div>
              <Textarea
                rows={4}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Masalan: Frontend dasturchi, React + TypeScript, 2 yil tajriba, remote, oylik 800-1500$, kichik jamoada ishlaydi..."
                disabled={generate.isPending}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => generate.mutate()}
                  disabled={brief.trim().length < 5 || generate.isPending}
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      AI yozyapti...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      AI bilan yaratish
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                UZ
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-50">O'zbek tilida</h3>
            </div>

            <FormField label={t('vacancy.title')} required error={form.formState.errors.title_uz?.message}>
              <Input {...form.register('title_uz')} placeholder="Masalan: Frontend dasturchi" />
            </FormField>
            <FormField
              label={t('vacancy.description')}
              required
              error={form.formState.errors.description_uz?.message}
            >
              <Textarea rows={4} {...form.register('description_uz')} />
            </FormField>
            <FormField
              label={t('vacancy.requirements')}
              required
              error={form.formState.errors.requirements_uz?.message}
            >
              <Textarea rows={4} {...form.register('requirements_uz')} />
            </FormField>
            <FormField
              label={t('vacancy.responsibilities')}
              required
              error={form.formState.errors.responsibilities_uz?.message}
            >
              <Textarea rows={4} {...form.register('responsibilities_uz')} />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-gradient-to-br from-brand-50 via-white to-accent-500/5 p-6 dark:border-brand-500/40 dark:from-brand-500/10 dark:via-slate-900 dark:to-accent-500/10">
          <div className="text-center">
            <Sparkles className="mx-auto mb-2 size-6 text-brand-600 dark:text-brand-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-50">
              AI bilan rus tiliga tarjima qilish
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              O'zbekchani tekshirib bo'lgach, Gemini avtomatik ravishda rus versiyasini tayyorlab beradi.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => translate.mutate()}
            disabled={!uzValid || translate.isPending}
          >
            {translate.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Tarjima qilinmoqda...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                AI bilan to'ldirish
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <button
              type="button"
              onClick={() => setShowRu((v) => !v)}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  RU
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">На русском</h3>
                {(form.formState.errors.title_ru ||
                  form.formState.errors.description_ru ||
                  form.formState.errors.requirements_ru ||
                  form.formState.errors.responsibilities_ru) && (
                  <span className="text-xs text-red-500">• to'ldiring</span>
                )}
              </div>
              <ChevronDown className={cn('size-4 transition-transform', showRu && 'rotate-180')} />
            </button>

            {showRu && (
              <div className="mt-4 space-y-4">
                <FormField label={t('vacancy.title')} required error={form.formState.errors.title_ru?.message}>
                  <Input {...form.register('title_ru')} />
                </FormField>
                <FormField
                  label={t('vacancy.description')}
                  required
                  error={form.formState.errors.description_ru?.message}
                >
                  <Textarea rows={4} {...form.register('description_ru')} />
                </FormField>
                <FormField
                  label={t('vacancy.requirements')}
                  required
                  error={form.formState.errors.requirements_ru?.message}
                >
                  <Textarea rows={4} {...form.register('requirements_ru')} />
                </FormField>
                <FormField
                  label={t('vacancy.responsibilities')}
                  required
                  error={form.formState.errors.responsibilities_ru?.message}
                >
                  <Textarea rows={4} {...form.register('responsibilities_ru')} />
                </FormField>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <FormField label={t('vacancy.location')} required error={form.formState.errors.location?.message}>
              <Input {...form.register('location')} />
            </FormField>

            <FormField label={t('vacancy.workType')}>
              <Controller
                control={form.control}
                name="work_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">{t('vacancy.workTypes.remote')}</SelectItem>
                      <SelectItem value="office">{t('vacancy.workTypes.office')}</SelectItem>
                      <SelectItem value="hybrid">{t('vacancy.workTypes.hybrid')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label={t('vacancy.workSchedule')}>
              <Controller
                control={form.control}
                name="work_schedule"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">{t('vacancy.schedules.full-time')}</SelectItem>
                      <SelectItem value="part-time">{t('vacancy.schedules.part-time')}</SelectItem>
                      <SelectItem value="contract">{t('vacancy.schedules.contract')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField label={`${t('vacancy.experience')} (${t('vacancy.years')})`}>
                <Input type="number" min={0} {...form.register('experience_years')} />
              </FormField>
              <FormField label={`${t('vacancy.experience')} (${t('vacancy.months')})`}>
                <Input type="number" min={0} max={11} {...form.register('experience_months')} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormField label={`${t('vacancy.salary')} ${t('vacancy.salaryFrom')}`}>
                <Input type="number" min={0} {...form.register('salary_min')} />
              </FormField>
              <FormField label={`${t('vacancy.salary')} ${t('vacancy.salaryTo')}`}>
                <Input type="number" min={0} {...form.register('salary_max')} />
              </FormField>
            </div>

            <FormField
              label={t('vacancy.minMatchScore')}
              hint="0-100"
              error={form.formState.errors.min_match_score?.message}
            >
              <Input type="number" min={0} max={100} {...form.register('min_match_score')} />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
