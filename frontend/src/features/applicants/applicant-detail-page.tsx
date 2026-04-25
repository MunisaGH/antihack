import { useQuery } from '@tanstack/react-query';
import { Briefcase, ExternalLink, MapPin, MessageCircle, Phone, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { applicantsApi } from '@/api';
import { PageHeader } from '@/components/page-header';
import { ScoreBar } from '@/components/score-bar';
import { ApplicationStatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUzDateTime } from '@/lib/time';

export function ApplicantDetailPage() {
  const { phone = '' } = useParams<{ phone: string }>();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['applicant', phone],
    queryFn: () => applicantsApi.byPhone(phone),
    enabled: Boolean(phone),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const applicant = data?.data;
  if (!applicant) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('applicants.notFound')}
      </p>
    );
  }

  const avgCompat = Math.round(
    applicant.applications.reduce((a, b) => a + (b.compatibility_score || 0), 0) /
      Math.max(applicant.applications.length, 1),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={applicant.full_name}
        description={t('applicants.subtitleDetail', {
          count: applicant.applications_count,
        })}
        backTo="/applicants"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" /> {t('applicants.personalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label={t('application.fullName')}
              value={applicant.full_name}
            />
            <Row
              label={t('application.phone')}
              value={
                <a
                  href={`tel:${applicant.phone}`}
                  className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
                >
                  <Phone className="size-3" /> {applicant.phone}
                </a>
              }
            />
            {applicant.telegram_username && (
              <Row
                label={t('application.telegramUsername')}
                value={
                  <a
                    href={`https://t.me/${applicant.telegram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
                  >
                    <MessageCircle className="size-3" /> @{applicant.telegram_username}
                  </a>
                }
              />
            )}
            {applicant.age !== null && (
              <Row label={t('application.age')} value={String(applicant.age)} />
            )}
            {applicant.address && (
              <Row
                label={t('application.address')}
                value={
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {applicant.address}
                  </span>
                }
              />
            )}
            <Row
              label={t('applicants.firstApplied')}
              value={formatUzDateTime(applicant.first_applied_at)}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="size-4" /> {t('applicants.applicationsHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {t('applicants.avgCompatibility')}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {avgCompat}%
                </span>
              </div>
              <ScoreBar value={avgCompat} showLabel={false} />
            </div>

            <div className="space-y-2">
              {applicant.applications.map((app) => (
                <Link
                  key={app.id}
                  to={`/applications/${app.id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-brand-500/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {app.vacancy_title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{formatUzDateTime(app.applied_at)}</span>
                        {app.compatibility_score > 0 && (
                          <span>{t('application.compatibilityScore')}: {app.compatibility_score}%</span>
                        )}
                        {app.interview_score > 0 && (
                          <span>{t('application.interviewScore')}: {app.interview_score}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ApplicationStatusBadge status={app.status} />
                      <ExternalLink className="size-3.5 text-slate-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}
