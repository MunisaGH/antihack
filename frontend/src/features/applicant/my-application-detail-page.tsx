import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  MessageSquare,
  Sparkles,
  Trophy,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { publicApi } from '@/api';
import { ApplicationStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScoreBar } from '@/components/score-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/cn';
import { formatUzDateTime } from '@/lib/time';
import type { Application, ApplicationStatus, InterviewMessage } from '@/types/api';
import { ContactCard } from './contact-card';

const STAGE_ORDER: ApplicationStatus[] = [
  'pending',
  'ai_analyzing',
  'interview_stage',
  'accepted',
  'in_contact',
  'hired',
];

const REJECTED_STATES: ApplicationStatus[] = [
  'rejected_resume',
  'rejected_interview',
  'interview_abandoned',
  'admin_cancelled',
];

function stageIndex(status: ApplicationStatus): number {
  const i = STAGE_ORDER.indexOf(status);
  return i === -1 ? STAGE_ORDER.length : i;
}

export function MyApplicationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const applicationId = Number(id);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const appQuery = useQuery({
    queryKey: ['my-application', applicationId],
    queryFn: () => publicApi.myApplication(applicationId),
    enabled: Number.isFinite(applicationId),
  });

  if (appQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!appQuery.data?.data) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Ariza topilmadi.
      </div>
    );
  }

  const app = appQuery.data.data;
  const isRejected = REJECTED_STATES.includes(app.status);
  const interview = app.interview_analysis || {};

  return (
    <div className="bg-orbs relative min-h-svh bg-slate-50 dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/me">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-12 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/me')}
          className="h-8 self-start px-2 text-slate-500 hover:text-slate-900 dark:text-slate-400"
        >
          <ChevronLeft className="size-4" />
          {t('myApplications.backToList')}
        </Button>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {app.vacancy_title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Clock className="size-3.5" />
            <span>{formatUzDateTime(app.applied_at)}</span>
            {app.company_name && <span>· {app.company_name}</span>}
            <ApplicationStatusBadge status={app.status} />
          </div>
        </motion.div>

        {/* Stage tracker */}
        <StageTracker status={app.status} />

        {/* Final outcome hero */}
        <OutcomeCard app={app} />

        {/* AI Analysis + Interview */}
        {(app.compatibility_score > 0 || app.interview_score > 0 || (app.interview_messages && app.interview_messages.length > 0)) && (
          <Card>
            <CardContent className="p-5">
              <Tabs defaultValue={app.interview_score > 0 || (app.interview_messages?.length ?? 0) > 0 ? 'interview' : 'resume'}>
                <TabsList>
                  <TabsTrigger value="resume">
                    <FileText className="size-3.5" />
                    {t('myApplications.resumeReview')}
                  </TabsTrigger>
                  <TabsTrigger value="interview">
                    <MessageSquare className="size-3.5" />
                    {t('myApplications.interviewReview')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="resume" className="mt-4 space-y-4">
                  {app.compatibility_score > 0 ? (
                    <>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {t('application.compatibilityScore')}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {app.compatibility_score}%
                          </span>
                        </div>
                        <ScoreBar value={app.compatibility_score} showLabel={false} />
                      </div>

                      {app.ai_analysis_result?.detailed_feedback && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                          {app.ai_analysis_result.detailed_feedback}
                        </div>
                      )}

                      {app.ai_strengths?.length > 0 && (
                        <BulletList
                          title={t('application.strengths')}
                          items={app.ai_strengths}
                          tone="success"
                        />
                      )}
                      {app.ai_weaknesses?.length > 0 && (
                        <BulletList
                          title={t('application.weaknesses')}
                          items={app.ai_weaknesses}
                          tone="warning"
                        />
                      )}
                      {app.ai_recommendations?.length > 0 && (
                        <BulletList
                          title={t('application.recommendations')}
                          items={app.ai_recommendations}
                          tone="brand"
                        />
                      )}
                    </>
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      {t('myApplications.noResumeAnalysis')}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="interview" className="mt-4 space-y-4">
                  {app.interview_score > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {t('application.interviewScore')}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {app.interview_score}%
                        </span>
                      </div>
                      <ScoreBar value={app.interview_score} showLabel={false} />
                      {interview.summary && (
                        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                          {interview.summary}
                        </p>
                      )}
                    </div>
                  )}

                  {app.interview_messages && app.interview_messages.length > 0 ? (
                    <Transcript
                      messages={app.interview_messages}
                      sessionStatus={app.interview_status}
                    />
                  ) : (
                    app.interview_score === 0 && (
                      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        {t('myApplications.noInterview')}
                      </p>
                    )
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Contact card — aloqa uchun */}
        {(isRejected || app.status === 'accepted' || app.status === 'in_contact' || app.status === 'hired' || app.status === 'talent_pool') && (
          <ContactCard />
        )}
      </main>
    </div>
  );
}

function StageTracker({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation();
  const rejected = REJECTED_STATES.includes(status);
  const currentIdx = stageIndex(status);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-2">
        {STAGE_ORDER.map((stage, i) => {
          const reached = !rejected && i <= currentIdx;
          const isCurrent = !rejected && i === currentIdx;
          return (
            <div key={stage} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all',
                  reached
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                  isCurrent && 'ring-2 ring-brand-300 ring-offset-2 dark:ring-offset-slate-950',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full text-[10px] font-bold',
                    reached
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                  )}
                >
                  {i + 1}
                </span>
                <span className="whitespace-nowrap">
                  {t(`application.statuses.${stage}`)}
                </span>
              </div>
              {i < STAGE_ORDER.length - 1 && (
                <div
                  className={cn(
                    'h-px w-3 shrink-0',
                    !rejected && i < currentIdx ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutcomeCard({ app }: { app: Application }) {
  const { t } = useTranslation();
  const status = app.status;

  const configs: Partial<
    Record<
      ApplicationStatus,
      { icon: typeof Trophy; tone: 'success' | 'warning' | 'danger' | 'brand'; titleKey: string; descKey: string }
    >
  > = {
    hired: { icon: Trophy, tone: 'success', titleKey: 'myApplications.outcome.hired.title', descKey: 'myApplications.outcome.hired.desc' },
    accepted: { icon: CheckCircle2, tone: 'success', titleKey: 'myApplications.outcome.accepted.title', descKey: 'myApplications.outcome.accepted.desc' },
    in_contact: { icon: UserIcon, tone: 'warning', titleKey: 'myApplications.outcome.in_contact.title', descKey: 'myApplications.outcome.in_contact.desc' },
    interview_stage: { icon: MessageSquare, tone: 'brand', titleKey: 'myApplications.outcome.interview_stage.title', descKey: 'myApplications.outcome.interview_stage.desc' },
    interview_abandoned: { icon: AlertTriangle, tone: 'warning', titleKey: 'myApplications.outcome.interview_abandoned.title', descKey: 'myApplications.outcome.interview_abandoned.desc' },
    rejected_resume: { icon: XCircle, tone: 'danger', titleKey: 'myApplications.outcome.rejected_resume.title', descKey: 'myApplications.outcome.rejected_resume.desc' },
    rejected_interview: { icon: XCircle, tone: 'danger', titleKey: 'myApplications.outcome.rejected_interview.title', descKey: 'myApplications.outcome.rejected_interview.desc' },
    talent_pool: { icon: Sparkles, tone: 'brand', titleKey: 'myApplications.outcome.talent_pool.title', descKey: 'myApplications.outcome.talent_pool.desc' },
    admin_cancelled: { icon: XCircle, tone: 'danger', titleKey: 'myApplications.outcome.admin_cancelled.title', descKey: 'myApplications.outcome.admin_cancelled.desc' },
    ai_analyzing: { icon: Bot, tone: 'brand', titleKey: 'myApplications.outcome.ai_analyzing.title', descKey: 'myApplications.outcome.ai_analyzing.desc' },
    pending: { icon: Clock, tone: 'brand', titleKey: 'myApplications.outcome.pending.title', descKey: 'myApplications.outcome.pending.desc' },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  const toneClass = {
    success: 'from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-500/10 dark:to-emerald-500/5 dark:border-emerald-500/30',
    warning: 'from-amber-50 to-amber-100 border-amber-200 dark:from-amber-500/10 dark:to-amber-500/5 dark:border-amber-500/30',
    danger: 'from-red-50 to-red-100 border-red-200 dark:from-red-500/10 dark:to-red-500/5 dark:border-red-500/30',
    brand: 'from-brand-50 to-brand-100 border-brand-200 dark:from-brand-500/10 dark:to-brand-500/5 dark:border-brand-500/30',
  }[cfg.tone];

  const iconColor = {
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    brand: 'text-brand-600 dark:text-brand-400',
  }[cfg.tone];

  const Icon = cfg.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn('border bg-gradient-to-br', toneClass)}>
        <CardContent className="flex items-start gap-4 p-5">
          <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-white/5', iconColor)}>
            <Icon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {t(cfg.titleKey)}
            </h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {t(cfg.descKey)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BulletList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'success' | 'warning' | 'brand';
}) {
  const toneClass = {
    success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
    brand: 'border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10',
  }[tone];

  return (
    <div className={cn('rounded-lg border p-3', toneClass)}>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
        {title}
      </h4>
      <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Transcript({
  messages,
  sessionStatus,
}: {
  messages: InterviewMessage[];
  sessionStatus: Application['interview_status'];
}) {
  const termNote = sessionStatus?.termination_reason
    ? sessionStatus.termination_reason === 'user_abandoned'
      ? '⚠️ Intervyu tugamadi — tab yopildi yoki 3 daqiqa harakatsiz qolindi'
      : sessionStatus.termination_reason.startsWith('off_topic')
        ? '⚠️ Mavzudan chetga chiqish aniqlandi'
        : null
    : null;

  return (
    <div className="space-y-3">
      {termNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {termNote}
        </div>
      )}
      {messages.map((msg, i) => {
        const isAssistant = msg.role === 'assistant';
        const qNumber = isAssistant
          ? messages.slice(0, i + 1).filter((m) => m.role === 'assistant').length
          : null;
        return (
          <div
            key={i}
            className={cn(
              'rounded-lg border p-3 text-sm',
              isAssistant
                ? 'border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/5'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50',
            )}
          >
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isAssistant ? (
                <>
                  <Bot className="size-3.5" /> Savol {qNumber}
                </>
              ) : (
                <>
                  <UserIcon className="size-3.5" /> Javob
                </>
              )}
            </div>
            <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">
              {msg.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
