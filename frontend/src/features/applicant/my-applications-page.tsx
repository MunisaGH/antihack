import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Briefcase, ChevronRight, Clock, FileText, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { publicApi } from '@/api';
import { ApplicationStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogout } from '@/hooks/use-auth';
import { authStorage } from '@/lib/auth-storage';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { EmptyState } from '@/components/empty-state';
import { formatUzDateTime } from '@/lib/time';
import { ContactCard } from './contact-card';

export function MyApplicationsPage() {
  const { t } = useTranslation();
  const user = authStorage.getUser();
  const logout = useLogout();

  const applicationsQuery = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => publicApi.myApplications(),
  });

  const applications = applicationsQuery.data?.data ?? [];

  return (
    <div className="bg-orbs relative min-h-svh bg-slate-50 dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-slate-600 dark:text-slate-300"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-12 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {t('myApplications.title', { name: user?.full_name || user?.username || '' })}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('myApplications.subtitle')}
          </p>
        </motion.div>

        {applicationsQuery.isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="mt-2 h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!applicationsQuery.isLoading && applications.length === 0 && (
          <EmptyState icon={FileText} title={t('myApplications.empty')} />
        )}

        {!applicationsQuery.isLoading && applications.length > 0 && (
          <div className="space-y-3">
            {applications.map((a) => (
              <Link key={a.id} to={`/me/${a.id}`}>
                <Card className="transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                      <Briefcase className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-50">
                        {a.vacancy_title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="size-3" />
                        <span>{formatUzDateTime(a.applied_at)}</span>
                        {a.company_name && <span>· {a.company_name}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ApplicationStatusBadge status={a.status} />
                      {a.compatibility_score > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {a.compatibility_score}%
                        </span>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <ContactCard />
      </main>
    </div>
  );
}
