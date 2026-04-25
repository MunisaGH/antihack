import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MessageCircle, Phone, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { applicantsApi } from '@/api';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ApplicationStatusBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUzDateTime } from '@/lib/time';

export function ApplicantsListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Har keystroke'da API chaqirmaymiz — 350ms kechikish bilan debounce
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['applicants', debouncedSearch],
    queryFn: () => applicantsApi.list({ search: debouncedSearch || undefined }),
  });

  const applicants = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('applicants.title')}
        description={t('applicants.subtitle', { count: applicants.length })}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('applicants.searchPlaceholder')}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && applicants.length === 0 && (
        <EmptyState icon={Users} title={t('applicants.empty')} />
      )}

      {!isLoading && applicants.length > 0 && (
        <div className="space-y-3">
          {applicants.map((a) => (
            <Link key={a.phone} to={`/applicants/${encodeURIComponent(a.phone)}`}>
              <Card className="transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500/50">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Users className="size-5" />
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
                      {a.telegram_username && (
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3" />
                          @{a.telegram_username}
                        </span>
                      )}
                      <span className="truncate">
                        {t('applicants.lastVacancy')}: {a.last_vacancy_title}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        {formatUzDateTime(a.last_applied_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <ApplicationStatusBadge status={a.last_status} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('applicants.appsCount', { count: a.applications_count })}
                    </span>
                  </div>

                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
