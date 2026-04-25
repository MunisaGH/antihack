import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, ChevronLeft, ChevronRight, FileText, Phone, Trash2, User, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { applicationsApi, vacanciesApi } from '@/api';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ScoreBar } from '@/components/score-bar';
import { ApplicationStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatUzDateTime } from '@/lib/time';
import type { Application, ApplicationStatus } from '@/types/api';

const STATUS_FILTERS: Array<ApplicationStatus | 'all'> = [
  'all',
  'pending',
  'ai_analyzing',
  'interview_stage',
  'interview_abandoned',
  'accepted',
  'in_contact',
  'hired',
  'talent_pool',
  'rejected_resume',
  'rejected_interview',
  'admin_cancelled',
];

const isValidStatus = (value: string | null): value is ApplicationStatus | 'all' =>
  value !== null && (STATUS_FILTERS as string[]).includes(value);

const PAGE_SIZES = [20, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

export function ApplicationsListPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter holatini URL query'da saqlaymiz — orqaga qaytganda holat saqlanadi
  const statusParam = searchParams.get('status');
  const statusFilter: ApplicationStatus | 'all' = isValidStatus(statusParam)
    ? statusParam
    : 'all';
  const vacancyFilter = searchParams.get('vacancy') ?? 'all';

  const setStatusFilter = useCallback(
    (value: ApplicationStatus | 'all') => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === 'all') next.delete('status');
          else next.set('status', value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setVacancyFilter = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === 'all') next.delete('vacancy');
          else next.set('vacancy', value);
          next.delete('page'); // Filter o'zgardi — 1-sahifaga qaytamiz
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Pagination — URL query'da ham saqlaymiz
  const pageSizeParam = Number(searchParams.get('perPage'));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(pageSizeParam)
    ? pageSizeParam
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const setPage = useCallback(
    (value: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value <= 1) next.delete('page');
          else next.set('page', String(value));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPageSize = useCallback(
    (value: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === DEFAULT_PAGE_SIZE) next.delete('perPage');
          else next.set('perPage', String(value));
          next.delete('page'); // Sahifa hajmi o'zgardi — 1-sahifaga qaytamiz
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [toDelete, setToDelete] = useState<Application | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'all'],
    queryFn: () => applicationsApi.list(),
  });

  const vacanciesQuery = useQuery({
    queryKey: ['vacancies', 'for-filter'],
    queryFn: () => vacanciesApi.list(),
    staleTime: 60_000,
  });

  const allApplications = data ?? [];

  // Vakansiya filtri bo'yicha oldin filterlanib, keyin status hisoblanadi
  const byVacancy = useMemo(() => {
    if (vacancyFilter === 'all') return allApplications;
    return allApplications.filter((a) => a.vacancy === vacancyFilter);
  }, [allApplications, vacancyFilter]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: byVacancy.length };
    for (const app of byVacancy) {
      result[app.status] = (result[app.status] ?? 0) + 1;
    }
    return result;
  }, [byVacancy]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return byVacancy;
    return byVacancy.filter((a) => a.status === statusFilter);
  }, [byVacancy, statusFilter]);

  // Pagination
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const applications = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );
  const pageStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, totalCount);

  const vacancies = vacanciesQuery.data ?? [];
  const selectedVacancy =
    vacancyFilter === 'all' ? null : vacancies.find((v) => v.id === vacancyFilter) ?? null;

  const deleteApplication = useMutation({
    mutationFn: (id: number) => applicationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success("Ariza o'chirildi");
      setToDelete(null);
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.applications')} />

      {/* Vacancy filter + page size */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Briefcase className="size-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <Select value={vacancyFilter} onValueChange={setVacancyFilter}>
            <SelectTrigger className="h-9 max-w-xs flex-1 sm:max-w-md">
              <SelectValue placeholder={t('application.filterByVacancy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('application.allVacancies')}</SelectItem>
              {vacancies.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVacancy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVacancyFilter('all')}
              className="h-9 px-2 text-slate-500 hover:text-slate-900 dark:text-slate-400"
              aria-label="Clear filter"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / {t('common.page')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status filter tabs — horizontally scrollable */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1">
          {STATUS_FILTERS.map((s) => {
            const isActive = statusFilter === s;
            const label = s === 'all' ? t('common.all') : t(`application.statuses.${s}`);
            const count = counts[s] ?? 0;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                  isActive
                    ? 'border-transparent bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/60',
                )}
              >
                <span>{label}</span>
                <span
                  className={cn(
                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0 text-xs font-semibold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && applications.length === 0 && (
        <EmptyState icon={FileText} title={t('application.empty')} />
      )}

      {!isLoading && applications.length > 0 && (
        <>
        <div className="space-y-3">
          {applications.map((a) => (
            <Card
              key={a.id}
              className="transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500/50"
            >
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <Link to={`/applications/${a.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <User className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-50">
                      {a.full_name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" />
                        {a.phone}
                      </span>
                      <span className="truncate">→ {a.vacancy_title}</span>
                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        {formatUzDateTime(a.applied_at)}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="w-32">
                  <ScoreBar value={a.compatibility_score} />
                </div>

                <div className="flex flex-col items-end gap-1">
                  <ApplicationStatusBadge status={a.status} />
                  {a.status === 'rejected_resume' && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-mono text-red-700 dark:bg-red-500/10 dark:text-red-400">
                      Rezyume · {a.compatibility_score}%
                    </span>
                  )}
                  {a.status === 'rejected_interview' && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-mono text-red-700 dark:bg-red-500/10 dark:text-red-400">
                      Intervyu · {a.interview_score}%
                    </span>
                  )}
                  {a.status === 'interview_abandoned' && a.interview_status && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-mono text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      {a.interview_status.questions_asked}/10 savol
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setToDelete(a)}
                  className="text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  aria-label="O'chirish"
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination controls */}
        {totalCount > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pageStart}–{pageEnd} / {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                className="h-8"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-sm text-slate-600 dark:text-slate-300">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="h-8"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arizani o'chirish</DialogTitle>
            <DialogDescription>
              {toDelete?.full_name} ning arizasi butunlay o'chiriladi. Bu amalni qaytarib
              bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setToDelete(null)}
              disabled={deleteApplication.isPending}
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={() => toDelete && deleteApplication.mutate(toDelete.id)}
              disabled={deleteApplication.isPending}
            >
              <Trash2 className="size-4" />
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
