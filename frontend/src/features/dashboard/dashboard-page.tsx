import { useQuery } from '@tanstack/react-query';
import { Briefcase, FileText, Target, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '@/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-current-user';

type Stat = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
};

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'stats'],
    queryFn: () => analyticsApi.stats(),
  });

  const stats: Stat[] = data
    ? [
        {
          label: t('dashboard.totalApplications'),
          value: data.applications ?? 0,
          icon: FileText,
          tint: 'from-brand-500 to-brand-600',
        },
        {
          label: t('dashboard.averageScore'),
          value: `${Math.round(data.average_compatibility_score ?? 0)}%`,
          icon: Target,
          tint: 'from-emerald-500 to-emerald-600',
        },
        {
          label: t('dashboard.activeVacancies'),
          value: data.activeVacancies ?? 0,
          icon: Briefcase,
          tint: 'from-violet-500 to-violet-600',
        },
        {
          label: t('dashboard.interviewSuccessRate'),
          value: `${Math.round(data.interview_success_rate ?? 0)}%`,
          icon: TrendingUp,
          tint: 'from-amber-500 to-amber-600',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t('dashboard.welcome')}
          {user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('app.tagline')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardHeader>
            </Card>
          ))}

        {!isLoading &&
          !isError &&
          stats.map((stat) => (
            <Card key={stat.label} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div
                  className={`mb-2 flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${stat.tint} text-white shadow-sm`}
                >
                  <stat.icon className="size-4" />
                </div>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}

        {isError && (
          <Card className="col-span-full">
            <CardContent className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('common.error')} — {t('common.retry').toLowerCase()}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.byStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.applications_by_status && data.applications_by_status.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {data.applications_by_status.map((entry) => (
                  <li
                    key={entry.status}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {t(`application.statuses.${entry.status}`, entry.status)}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {entry.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.none')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topVacancies')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.top_vacancies && data.top_vacancies.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {data.top_vacancies.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300">{v.title}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {v.applications_count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.none')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
