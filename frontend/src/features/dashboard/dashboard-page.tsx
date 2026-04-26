import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, FileText, MapPin, Target, TrendingUp, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '@/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { EDUCATION_MOCK_ANALYTICS, IS_MOCK_ENABLED } from '@/mocks/education-data';

type Stat = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
};

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const [selectedVacancy, setSelectedVacancy] = useState<string | null>(null);

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'stats'],
    queryFn: () => analyticsApi.stats(),
    enabled: !IS_MOCK_ENABLED,
  });

  const data = IS_MOCK_ENABLED ? EDUCATION_MOCK_ANALYTICS : apiData;

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

  const districtStats = IS_MOCK_ENABLED && selectedVacancy
    ? (EDUCATION_MOCK_ANALYTICS.vacancy_district_stats as Record<string, Array<{ district: string; count: number }>>)[selectedVacancy] ?? []
    : [];

  const selectedVacancyTitle = data?.top_vacancies?.find(v => v.id === selectedVacancy)?.title;

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
        {isLoading && !IS_MOCK_ENABLED &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardHeader>
            </Card>
          ))}

        {(!isLoading || IS_MOCK_ENABLED) &&
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

        {isError && !IS_MOCK_ENABLED && (
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
            {IS_MOCK_ENABLED && (
              <CardDescription className="text-xs text-brand-500">
                Vakansiyaga bosib viloyatlar bo'yicha ko'ring
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {data?.top_vacancies && data.top_vacancies.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {data.top_vacancies.map((v) => (
                  <li
                    key={v.id}
                    onClick={() => IS_MOCK_ENABLED && setSelectedVacancy(v.id === selectedVacancy ? null : v.id)}
                    className={`flex items-center justify-between rounded-md px-3 py-2 transition-colors
                      ${IS_MOCK_ENABLED ? 'cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/20' : ''}
                      ${selectedVacancy === v.id ? 'bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}
                    `}
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300">{v.title}</span>
                    <span className="ml-2 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
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

      {/* Tuman bo'yicha statistika modal */}
      {IS_MOCK_ENABLED && selectedVacancy && districtStats.length > 0 && (
        <Card className="border-brand-200 dark:border-brand-800">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-brand-500" />
                Viloyatlar bo'yicha arizalar
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                "{selectedVacancyTitle}" — jami {data?.top_vacancies?.find(v => v.id === selectedVacancy)?.applications_count ?? 0} ta ariza
              </CardDescription>
            </div>
            <button
              onClick={() => setSelectedVacancy(null)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {districtStats.map((d, i) => {
                const maxCount = districtStats[0]?.count ?? 1;
                const pct = Math.round((d.count / maxCount) * 100);
                return (
                  <li key={d.district} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{d.district}</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">{d.count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">#{i + 1} o'rin</p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
