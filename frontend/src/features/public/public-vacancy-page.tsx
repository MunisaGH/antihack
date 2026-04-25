import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Briefcase, Clock, DollarSign, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { publicApi } from '@/api';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PublicVacancyPage() {
  const { uniqueLink = '' } = useParams<{ uniqueLink: string }>();
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-vacancy', uniqueLink],
    queryFn: () => publicApi.vacancyByLink(uniqueLink),
  });

  const vacancy = data?.data;

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {isLoading && (
          <Card>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Vakansiya topilmadi yoki faol emas.
            </CardContent>
          </Card>
        )}

        {vacancy && (
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {vacancy.title}
              </h1>
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">{vacancy.company_name}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <Briefcase className="size-3" />
                  {t(`vacancy.workTypes.${vacancy.work_type}`)}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="size-3" />
                  {t(`vacancy.schedules.${vacancy.work_schedule}`)}
                </Badge>
                {vacancy.location && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="size-3" />
                    {vacancy.location}
                  </Badge>
                )}
                {(vacancy.salary_min || vacancy.salary_max) && (
                  <Badge variant="brand" className="gap-1">
                    <DollarSign className="size-3" />
                    {vacancy.salary_min && vacancy.salary_max
                      ? `$${vacancy.salary_min} – $${vacancy.salary_max}`
                      : vacancy.salary_min
                      ? `$${vacancy.salary_min}+`
                      : `до $${vacancy.salary_max}`}
                  </Badge>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="space-y-6 p-6">
                <Section title={t('vacancy.description')} text={vacancy.description} />
                <Section title={t('vacancy.requirements')} text={vacancy.requirements} />
                <Section title={t('vacancy.responsibilities')} text={vacancy.responsibilities} />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Link to={`/apply/${uniqueLink}/submit`}>
                <Button size="lg" className="gap-2">
                  {t('apply.title')}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{text}</p>
    </section>
  );
}
