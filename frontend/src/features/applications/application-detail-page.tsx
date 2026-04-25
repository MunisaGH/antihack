import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, FileText, History, MessageSquare, Phone, Sparkles, Trash2, User, Users, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { applicationsApi } from '@/api';
import { PageHeader } from '@/components/page-header';
import { ScoreBar } from '@/components/score-bar';
import { ApplicationStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';
import { formatUzDateTime } from '@/lib/time';
import type { Application, ApplicationStatus, InterviewMessage } from '@/types/api';

const STATUS_OPTIONS: ApplicationStatus[] = [
  'pending',
  'ai_analyzing',
  'rejected_resume',
  'interview_stage',
  'interview_abandoned',
  'rejected_interview',
  'talent_pool',
  'accepted',
  'in_contact',
  'hired',
  'admin_cancelled',
];

export function ApplicationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const applicationId = Number(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ['applications', applicationId],
    queryFn: () => applicationsApi.get(applicationId),
    enabled: Number.isFinite(applicationId),
  });

  // Fetch all applications to check for relatives
  const { data: allApps } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
  });

  // Calculate potential relatives
  const potentialRelatives = (allApps || []).filter((other) => {
    if (!app || other.id === app.id) return false;
    
    // Extract words from names, ignoring small words and case
    const currentNameParts = app.full_name.toLowerCase().split(' ').filter(p => p.length > 3);
    const otherNameParts = other.full_name.toLowerCase().split(' ').filter(p => p.length > 3);
    
    // Check if any significant word (like a last name) matches
    return currentNameParts.some(part => otherNameParts.includes(part));
  });

  const updateStatus = useMutation({
    mutationFn: (status: ApplicationStatus) => applicationsApi.updateStatus(applicationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success(t('common.success'));
    },
  });

  const deleteApplication = useMutation({
    mutationFn: () => applicationsApi.delete(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success("Ariza o'chirildi");
      navigate('/applications');
    },
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading || !app) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const analysis = app.ai_analysis_result;
  const interview = app.interview_analysis;
  const isRejected =
    app.status === 'rejected_resume' || app.status === 'rejected_interview';
  const rejectStage =
    app.status === 'rejected_resume' ? 'Rezyume' : app.status === 'rejected_interview' ? 'Intervyu' : '';
  const rejectReason =
    app.status === 'rejected_resume'
      ? 'Rezyume vakansiyaga yetarli darajada mos kelmadi'
      : app.status === 'rejected_interview'
      ? 'Intervyu natijasi qoniqarsiz'
      : '';
  const rejectScore =
    app.status === 'rejected_resume'
      ? app.compatibility_score
      : app.status === 'rejected_interview'
      ? app.interview_score
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={app.full_name}
        description={`${app.vacancy_title} · ${formatUzDateTime(app.applied_at)}`}
        backTo="/applications"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ApplicationStatusBadge status={app.status} />
            <Select
              value={app.status}
              onValueChange={(v) => updateStatus.mutate(v as ApplicationStatus)}
            >
              <SelectTrigger className="w-48 sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`application.statuses.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="destructive" size="icon" onClick={() => setConfirmDelete(true)} aria-label="O'chirish">
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />

      {isRejected && (
        <Card className="border-red-300 bg-red-50/70 dark:border-red-500/40 dark:bg-red-500/10">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
              <XCircle className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                REJECT — {t(`application.statuses.${app.status}`)}
              </h3>
              <p className="mt-1 text-sm text-red-800/90 dark:text-red-300">
                <span className="font-medium">{rejectStage}</span> · {rejectReason}
                {rejectScore > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs dark:bg-red-500/20">
                    {rejectStage.toLowerCase()}: {rejectScore}%
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" /> Arizachi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t('application.fullName')} value={app.full_name} />
            <Row
              label={t('application.phone')}
              value={
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" /> {app.phone}
                </span>
              }
            />
            {app.age && <Row label={t('application.age')} value={app.age.toString()} />}
            {app.address && <Row label={t('application.address')} value={app.address} />}
            {app.telegram_username && (
              <Row
                label={t('application.telegramUsername')}
                value={
                  <a
                    href={`https://t.me/${app.telegram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline dark:text-brand-400"
                  >
                    @{app.telegram_username}
                  </a>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" /> {t('application.aiAnalysis')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <ScoreBar value={app.compatibility_score} />
            </div>

            {analysis.detailed_feedback && (
              <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                {analysis.detailed_feedback}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <AnalysisList title={t('application.strengths')} items={app.ai_strengths} tint="success" />
              <AnalysisList title={t('application.weaknesses')} items={app.ai_weaknesses} tint="warning" />
              <AnalysisList title={t('application.recommendations')} items={app.ai_recommendations} tint="brand" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="resume">
        <TabsList>
          <TabsTrigger value="resume">
            <FileText className="mr-1 size-4" /> {t('application.resume')}
          </TabsTrigger>
          <TabsTrigger value="interview">
            <MessageSquare className="mr-1 size-4" /> {t('application.interviewTranscript')}
          </TabsTrigger>
          <TabsTrigger value="status">
            <History className="mr-1 size-4" /> {t('application.statusHistory')}
            {app.status_history && app.status_history.length > 0 && (
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {app.status_history.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="relatives" className={potentialRelatives.length > 0 ? "text-amber-600 dark:text-amber-500" : ""}>
            <Users className="mr-1 size-4" /> Qarindoshlik
            {potentialRelatives.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                {potentialRelatives.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resume">
          <Card>
            <CardContent className="space-y-5 p-6">
              {app.resume_file && (
                <a href={app.resume_file} target="_blank" rel="noreferrer" className="inline-block">
                  <Button variant="secondary" size="sm">
                    <FileText className="size-4" />
                    {t('application.resumeFile')}
                  </Button>
                </a>
              )}

              {app.resume_form_data && (
                <StructuredResumeView data={app.resume_form_data} />
              )}

              {app.resume_text ? (
                <details className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                  <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('application.rawResumeText')}
                  </summary>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-slate-200 p-4 font-sans text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    {app.resume_text}
                  </pre>
                </details>
              ) : (
                !app.resume_form_data && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.none')}</p>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interview">
          {app.psychological_test_results && Object.keys(app.psychological_test_results).length > 0 ? (
            <Card className="mb-4">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Psixologik Test Natijalari</h3>
                      <p className="text-sm text-slate-500">Baholash darajasi: <strong className="text-brand-600">{app.psychological_test_results.grade}</strong></p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-brand-600 dark:text-brand-400">{app.psychological_test_results.overall_percentage}%</span>
                      <p className="text-xs text-slate-500">Umumiy moslik</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Big Five Ko'rsatkichlari</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {app.psychological_test_results.traits?.map((t: any) => (
                        <div key={t.trait_id} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{t.name}</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{t.percentage}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${t.percentage}%` }}></div>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">{t.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {app.psychological_test_results.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Tavsiyalar</h4>
                      <ul className="space-y-2">
                        {app.psychological_test_results.recommendations.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="size-4 text-brand-500 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-4">
              <CardContent className="p-6">
                <div className="text-center py-6">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <User className="size-6" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-200">Psixologik test natijalari yo'q</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bu nomzod hali psixologik testdan o'tmagan.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              {(!app.interview_messages || app.interview_messages.length === 0) && app.interview_score === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  <Bot className="mx-auto mb-2 size-6" />
                  Intervyu chat hali o'tkazilmagan.
                </p>
              ) : (
                <Tabs defaultValue={app.interview_score > 0 ? 'summary' : 'transcript'}>
                  <TabsList>
                    <TabsTrigger value="summary">{t('application.interviewSummary')}</TabsTrigger>
                    <TabsTrigger value="transcript">
                      {t('application.interviewTranscript')}
                      {app.interview_messages && app.interview_messages.length > 0 && (
                        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {Math.ceil(app.interview_messages.length / 2)}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-4 space-y-4">
                    {app.interview_score > 0 ? (
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
                          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                            {interview.summary}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        Yakuniy baholash yo'q. Transkriptni ko'ring.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="transcript" className="mt-4">
                    <InterviewTranscript
                      messages={app.interview_messages || []}
                      sessionStatus={app.interview_status}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardContent className="p-6">
              <StatusHistoryTimeline
                history={app.status_history || []}
                appliedAt={app.applied_at}
                updatedAt={app.updated_at}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatives">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className={potentialRelatives.length > 0 ? "size-5 text-amber-500" : "size-5"} /> Ehtimoliy qarindoshlar tahlili
              </CardTitle>
            </CardHeader>
            <CardContent>
              {potentialRelatives.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md bg-amber-50 p-4 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Diqqat: Familiyasi o'xshash nomzodlar topildi
                        </h3>
                        <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                          <p>
                            Quyidagi nomzodlar joriy ariza egasi ({app.full_name}) bilan bir xil familiyaga ega bo'lishi mumkin. Bu nepotizm xavfini bildiradi.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    {potentialRelatives.map(relative => (
                      <div key={relative.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/50">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{relative.full_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{relative.vacancy_title} • {formatUzDateTime(relative.applied_at)}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/applications/${relative.id}`)}>
                          Ko'rish
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 mb-3">
                    <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Qarindoshlar topilmadi</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Tizimdagi boshqa nomzodlar orasida {app.full_name} bilan familiyadoshlar aniqlanmadi.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arizani o'chirish</DialogTitle>
            <DialogDescription>
              {app.full_name} ning arizasi butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteApplication.isPending}
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteApplication.mutate()}
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function AnalysisList({
  title,
  items,
  tint,
}: {
  title: string;
  items: string[];
  tint: 'success' | 'warning' | 'brand';
}) {
  const tintClass = {
    success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
    brand: 'border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10',
  }[tint];

  return (
    <div className={`rounded-lg border p-3 ${tintClass}`}>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
        {title}
      </h4>
      {items.length > 0 ? (
        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
          {items.map((item, i) => (
            <li key={i} className="flex gap-1">
              <span>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">—</p>
      )}
    </div>
  );
}

function InterviewTranscript({
  messages,
  sessionStatus,
}: {
  messages: InterviewMessage[];
  sessionStatus: Application['interview_status'];
}) {
  if (!messages || messages.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Transkript mavjud emas.
      </p>
    );
  }

  const terminationNote = sessionStatus?.termination_reason
    ? sessionStatus.termination_reason === 'user_abandoned'
      ? '⚠️ Nomzod intervyuni tugatmay chiqib ketdi (3 daqiqa harakatsiz yoki tab yopildi)'
      : sessionStatus.termination_reason === 'off_topic'
        || sessionStatus.termination_reason === 'off_topic_limit_reached'
        ? '⚠️ Nomzod bir necha marta mavzudan chetga chiqdi'
        : sessionStatus.termination_reason === 'max_questions_reached'
          ? 'Barcha savollar berildi'
          : null
    : null;

  return (
    <div className="space-y-3">
      {terminationNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {terminationNote}
        </div>
      )}
      <div className="space-y-3">
        {messages.map((msg, i) => {
          const isAssistant = msg.role === 'assistant';
          const qNumber = isAssistant ? messages.slice(0, i + 1).filter((m) => m.role === 'assistant').length : null;
          const aiDet = !isAssistant ? msg.ai_detection : undefined;
          const suspicious = aiDet && aiDet.suspicion_score >= 60;
          return (
            <div
              key={i}
              className={cn(
                'rounded-lg border p-3 text-sm',
                isAssistant
                  ? 'border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/5'
                  : suspicious
                    ? 'border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50',
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  {isAssistant ? (
                    <>
                      <Bot className="size-3.5" />
                      Savol {qNumber}
                    </>
                  ) : (
                    <>
                      <User className="size-3.5" />
                      Javob
                    </>
                  )}
                </div>
                {aiDet && <AiDetectionBadge detection={aiDet} />}
              </div>
              <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                {msg.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AiDetectionBadge({
  detection,
}: {
  detection: NonNullable<InterviewMessage['ai_detection']>;
}) {
  const score = detection.suspicion_score;
  if (score < 40) return null;

  const tone =
    score >= 70
      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';

  const factorLabels: Record<string, string> = {
    pasted: 'Paste qilingan',
    typing_too_fast: 'Juda tez yozilgan',
    typing_fast: 'Tez yozilgan',
    suspicious_instant: 'Bir onda uzun matn',
    ai_classifier: 'AI-uslub',
  };

  const factors = detection.factors.map((f) => factorLabels[f] || f).join(' · ');
  const tooltip = [
    `AI shubhasi: ${score}%`,
    factors && `Belgilar: ${factors}`,
    detection.ai_classifier_reason && `AI: ${detection.ai_classifier_reason}`,
    `Tezlik: ${detection.typing_metrics.chars_per_sec} belgi/s · Paste: ${detection.typing_metrics.paste_count}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px]',
        tone,
      )}
    >
      🤖 AI {score}%
    </span>
  );
}

function StatusHistoryTimeline({
  history,
  appliedAt: _appliedAt,
  updatedAt: _updatedAt,
}: {
  history: Array<{ status: ApplicationStatus; at: string; by?: string }>;
  appliedAt: string;
  updatedAt: string;
}) {
  const { t } = useTranslation();

  if (history.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('application.statusHistoryEmpty')}
      </p>
    );
  }

  const entries = history;

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-6 dark:border-slate-700">
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1;
        return (
          <li key={i} className="relative">
            <span
              className={cn(
                'absolute -left-[27px] top-1.5 flex size-3 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900',
                isLast
                  ? 'bg-brand-500'
                  : 'bg-slate-400 dark:bg-slate-600',
              )}
            />
            <div className="flex flex-wrap items-center gap-2">
              <ApplicationStatusBadge status={entry.status} />
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {formatUzDateTime(entry.at)}
              </span>
              {entry.by && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  · {entry.by}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t(`application.statuses.${entry.status}`)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function StructuredResumeView({ data }: { data: NonNullable<Application['resume_form_data']> }) {
  const { t } = useTranslation();

  const hasContact = data.email || data.linkedin_url || data.portfolio_url;
  const hasExperience = data.experience_data && data.experience_data.length > 0;
  const hasEducation = data.education_data && data.education_data.length > 0;
  const hasTechSkills = data.technical_skills && data.technical_skills.length > 0;
  const hasSoftSkills = data.soft_skills && data.soft_skills.length > 0;
  const hasLanguages = data.languages && data.languages.length > 0;
  const hasCerts = data.certifications && data.certifications.length > 0;
  const hasAny =
    data.summary || hasContact || hasExperience || hasEducation ||
    hasTechSkills || hasSoftSkills || hasLanguages || hasCerts;

  if (!hasAny) return null;

  return (
    <div className="space-y-4">
      {data.summary && (
        <Section title={t('application.structured.summary')}>
          <p className="text-sm text-slate-700 dark:text-slate-300">{data.summary}</p>
        </Section>
      )}

      {hasContact && (
        <Section title={t('application.structured.contact')}>
          <div className="flex flex-wrap gap-2 text-sm">
            {data.email && (
              <a
                href={`mailto:${data.email}`}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
              >
                {data.email}
              </a>
            )}
            {data.linkedin_url && (
              <a
                href={data.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
              >
                LinkedIn ↗
              </a>
            )}
            {data.portfolio_url && (
              <a
                href={data.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
              >
                Portfolio ↗
              </a>
            )}
          </div>
        </Section>
      )}

      {hasExperience && (
        <Section title={t('application.structured.experience')}>
          <div className="space-y-2">
            {data.experience_data.map((exp, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {exp.position || '—'}
                    {exp.company && (
                      <span className="ml-1 text-slate-500 dark:text-slate-400">· {exp.company}</span>
                    )}
                  </div>
                  {exp.duration && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">{exp.duration}</span>
                  )}
                </div>
                {exp.description && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasEducation && (
        <Section title={t('application.structured.education')}>
          <div className="space-y-2">
            {data.education_data.map((edu, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {edu.institution || '—'}
                  </div>
                  {edu.year && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">{edu.year}</span>
                  )}
                </div>
                {(edu.degree || edu.field) && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {[edu.degree, edu.field].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(hasTechSkills || hasSoftSkills) && (
        <Section title={t('application.structured.skills')}>
          {hasTechSkills && (
            <div className="mb-2">
              <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('application.structured.technical')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.technical_skills.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {hasSoftSkills && (
            <div>
              <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('application.structured.soft')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.soft_skills.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {hasLanguages && (
        <Section title={t('application.structured.languages')}>
          <div className="flex flex-wrap gap-2 text-sm">
            {data.languages.map((l, i) => (
              <span
                key={i}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
              >
                {l.name || '—'}
                {l.level && <span className="ml-1 text-slate-500 dark:text-slate-400">· {l.level}</span>}
              </span>
            ))}
          </div>
        </Section>
      )}

      {hasCerts && (
        <Section title={t('application.structured.certifications')}>
          <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {data.certifications.map((c, i) => (
              <li key={i} className="flex gap-1.5">
                <span>•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h4>
      {children}
    </div>
  );
}
