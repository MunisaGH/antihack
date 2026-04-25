import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Check, Copy, Edit, ExternalLink, Eye, MapPin, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { applicationsApi, vacanciesApi } from '@/api';
import { PageHeader } from '@/components/page-header';
import { ApplicationStatusBadge, VacancyStatusBadge } from '@/components/status-badge';
import { ScoreBar } from '@/components/score-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function VacancyDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'uz';
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const vacancyQuery = useQuery({
    queryKey: ['vacancies', id, { lang }],
    queryFn: () => vacanciesApi.get(id, { lang }),
  });

  const applicationsQuery = useQuery({
    queryKey: ['applications', { vacancy: id }],
    queryFn: () => applicationsApi.list({ vacancy: id }),
  });

  const toggleStatus = useMutation({
    mutationFn: () =>
      vacanciesApi.update(id, {
        status: vacancyQuery.data?.status === 'active' ? 'archived' : 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      toast.success(t('common.success'));
    },
  });

  if (vacancyQuery.isLoading || !vacancyQuery.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const v = vacancyQuery.data;
  const shareUrl = `${window.location.origin}/apply/${v.unique_link}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success(t('common.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const salary = (() => {
    if (v.salary_min && v.salary_max) return `$${v.salary_min} – $${v.salary_max}`;
    if (v.salary_min) return `$${v.salary_min}+`;
    if (v.salary_max) return `до $${v.salary_max}`;
    return null;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={v.title}
        backTo="/vacancies"
        actions={
          <>
            <Button variant="outline" onClick={() => toggleStatus.mutate()}>
              <Archive className="size-4" />
              {v.status === 'active' ? 'Arxivlash' : 'Faollashtirish'}
            </Button>
            <Link to={`/vacancies/${id}/edit`}>
              <Button variant="secondary">
                <Edit className="size-4" />
                {t('common.edit')}
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <VacancyStatusBadge status={v.status} />
              <Badge variant="outline">{t(`vacancy.workTypes.${v.work_type}`)}</Badge>
              <Badge variant="outline">{t(`vacancy.schedules.${v.work_schedule}`)}</Badge>
              {v.location && (
                <Badge variant="outline">
                  <MapPin className="size-3" /> {v.location}
                </Badge>
              )}
              {salary && <Badge variant="brand">{salary}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('vacancy.description')}
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{v.description}</p>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('vacancy.requirements')}
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{v.requirements}</p>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('vacancy.responsibilities')}
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{v.responsibilities}</p>
            </section>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('vacancy.shareLink')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-800/50">
                <span className="truncate text-slate-600 dark:text-slate-300">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={copyLink} className="flex-1">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {t('common.copied')}
                </Button>
                <a href={shareUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="size-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Users className="size-4" /> {t('vacancy.applicationsCount')}
                </span>
                <span className="font-semibold">{v.applications_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Eye className="size-4" /> {t('vacancy.views')}
                </span>
                <span className="font-semibold">{v.views_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('vacancy.minMatchScore')}</span>
                <span className="font-semibold">{v.min_match_score}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('nav.applications')}</CardTitle>
        </CardHeader>
        <CardContent>
          {applicationsQuery.isLoading && <Skeleton className="h-20 w-full" />}
          {applicationsQuery.data && applicationsQuery.data.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('application.empty')}
            </p>
          )}
          {applicationsQuery.data && applicationsQuery.data.length > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {applicationsQuery.data.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/applications/${a.id}`}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{a.full_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{a.phone}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24">
                        <ScoreBar value={a.compatibility_score} showLabel={false} />
                        <div className="mt-0.5 text-right text-xs text-slate-500">
                          {a.compatibility_score}%
                        </div>
                      </div>
                      <ApplicationStatusBadge status={a.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
