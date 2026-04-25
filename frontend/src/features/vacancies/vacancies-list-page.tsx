import { useQuery } from '@tanstack/react-query';
import { Briefcase, Eye, Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { vacanciesApi } from '@/api';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { VacancyStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function VacanciesListPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'uz';

  const { data, isLoading } = useQuery({
    queryKey: ['vacancies', { lang }],
    queryFn: () => vacanciesApi.list({ lang }),
  });

  const vacancies = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.vacancies')}
        actions={
          <Link to="/vacancies/new">
            <Button>
              <Plus className="size-4" />
              {t('vacancy.create')}
            </Button>
          </Link>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && vacancies.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title={t('vacancy.empty')}
          action={
            <Link to="/vacancies/new">
              <Button>
                <Plus className="size-4" />
                {t('vacancy.create')}
              </Button>
            </Link>
          }
        />
      )}

      {!isLoading && vacancies.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vacancies.map((v) => (
            <Link key={v.id} to={`/vacancies/${v.id}`}>
              <Card className="h-full transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500/50">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                      {v.title}
                    </h3>
                    <VacancyStatusBadge status={v.status} />
                  </div>
                  <p className="line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{v.description}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {v.applications_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3.5" />
                      {v.views_count}
                    </span>
                    <span className="truncate">{v.location}</span>
                    <span>{t(`vacancy.workTypes.${v.work_type}`)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
