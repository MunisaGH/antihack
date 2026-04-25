import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bot, CheckCircle2, Loader2, Send, User as UserIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewApi } from '@/api';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import type { InterviewMessage, InterviewSessionStatus } from '@/types/api';

import { PsychologicalTestPage, PsychologicalTestResults } from './psychological-test-page';

type ChatMessage = InterviewMessage;

// 3 daqiqa harakatsiz bo'lsa — sessiyani chiqib ketdi deb belgilaymiz
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;

export function InterviewChatPage() {
  const { id = '' } = useParams<{ id: string }>();
  const applicationId = Number(id);
  const [proceedToChat, setProceedToChat] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['application-status', applicationId],
    queryFn: () => interviewApi.getStatus(applicationId),
    enabled: Number.isFinite(applicationId),
  });

  if (statusQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (statusQuery.isError) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 size-10 text-amber-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Ma'lumotlarni yuklab bo'lmadi.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { status, psychological_test_done, psychological_test_results } = statusQuery.data?.data || {};

  // Agar test qilinmagan bo'lsa, avval testni ko'rsatamiz
  if (!psychological_test_done && status === 'interview_stage') {
    return (
      <PsychologicalTestPage
        applicationId={applicationId}
        onComplete={() => statusQuery.refetch()}
      />
    );
  }

  // Test tugagan, lekin hali chatga o'tilmagan bo'lsa
  if (psychological_test_done && !proceedToChat) {
    return (
      <PsychologicalTestResults 
        results={psychological_test_results} 
        onProceed={() => setProceedToChat(true)} 
      />
    );
  }

  return <InterviewChat applicationId={applicationId} />;
}

function InterviewChat({ applicationId }: { applicationId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [sessionStatus, setSessionStatus] = useState<InterviewSessionStatus>('active');
  const [answer, setAnswer] = useState('');
  const [finalized, setFinalized] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  const streamAbort = useRef<AbortController | null>(null);

  // AI detection — typing metrics tracker
  const typingRef = useRef<{ pasteCount: number; firstKeyAt: number | null }>({
    pasteCount: 0,
    firstKeyAt: null,
  });

  const resetTypingMetrics = useCallback(() => {
    typingRef.current = { pasteCount: 0, firstKeyAt: null };
  }, []);

  const collectTypingMetrics = useCallback(
    (finalAnswer: string) => {
      const { pasteCount, firstKeyAt } = typingRef.current;
      const totalTimeMs = firstKeyAt ? Date.now() - firstKeyAt : 0;
      const chars = finalAnswer.length;
      const charsPerSec = totalTimeMs > 0 ? (chars / totalTimeMs) * 1000 : 0;
      return {
        paste_count: pasteCount,
        total_time_ms: totalTimeMs,
        chars_per_sec: Number(charsPerSec.toFixed(2)),
      };
    },
    [],
  );

  // Sessiyani boshlash va birinchi savolni oqim qilish
  const startQuery = useQuery({
    queryKey: ['interview-start', applicationId],
    queryFn: () => interviewApi.start(applicationId),
    enabled: Number.isFinite(applicationId),
  });

  useEffect(() => {
    if (!startQuery.data) return;
    const { data } = startQuery.data;
    setMessages(data.messages);
    setQuestionsAsked(data.questions_asked);
    setMaxQuestions(data.max_questions);
    setSessionStatus(data.status);
    if (data.status === 'active' && data.messages.length === data.questions_asked * 2) {
      // Savol hali berilmagan — oqim boshlaymiz
      void streamNextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startQuery.data]);

  const streamNextQuestion = useCallback(async () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setStreamingText('');
    setStreamError(false);

    streamAbort.current?.abort();
    const ctrl = new AbortController();
    streamAbort.current = ctrl;

    let buffer = '';
    await interviewApi.streamNextQuestion(applicationId, {
      signal: ctrl.signal,
      onChunk: (text) => {
        buffer += text;
        setStreamingText(buffer);
      },
      onDone: ({ questions_asked, status }) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: buffer, at: new Date().toISOString() },
        ]);
        setStreamingText('');
        setQuestionsAsked(questions_asked);
        if (status === 'completed' || status === 'terminated') {
          setSessionStatus(status as InterviewSessionStatus);
        }
        setIsStreaming(false);
      },
      onError: () => {
        // Gemini xato berdi — partial buffer'ni tozalab qo'yamiz, retry tugmasini ko'rsatamiz
        setStreamingText('');
        setStreamError(true);
        setIsStreaming(false);
        toast.error(t('interview.streamError'), { duration: 5000 });
      },
    });
  }, [applicationId, isStreaming, t]);

  const submitAnswer = useMutation({
    mutationFn: async (value: string) => {
      const metrics = collectTypingMetrics(value);
      return interviewApi.submitAnswer(applicationId, value, metrics);
    },
    onMutate: (value) => {
      setMessages((prev) => [...prev, { role: 'user', content: value, at: new Date().toISOString() }]);
      setAnswer('');
      resetTypingMetrics();
    },
    onSuccess: async ({ data }) => {
      if (data.terminated) {
        setSessionStatus('terminated');
        toast.error(t('interview.terminated'));
        return;
      }
      if (data.completed) {
        setSessionStatus('completed');
        return;
      }
      await streamNextQuestion();
    },
    onError: () => toast.error(t('common.error')),
  });

  const finalize = useMutation({
    mutationFn: () => interviewApi.finalize(applicationId),
    onSuccess: (response) => {
      setFinalized(true);
      setSessionStatus(response.data.status);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingText]);

  // --- 3 daqiqa harakatsiz → sessiyani "user_abandoned" deb belgilash ---
  const isActive = sessionStatus === 'active';

  useEffect(() => {
    if (!isActive || finalized || !Number.isFinite(applicationId)) return;

    let timer: ReturnType<typeof setTimeout>;

    const handleTimeout = () => {
      // Fonda abandon endpointini chaqiramiz (javobni kutmaymiz)
      interviewApi.abandon(applicationId).catch(() => {
        // Tarmoq xato bo'lsa ham UI holatini yangilaymiz
      });
      streamAbort.current?.abort();
      setSessionStatus('terminated');
      toast.error(t('interview.abandonedInactive'), { duration: 6000 });
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleTimeout, INACTIVITY_TIMEOUT_MS);
    };

    // Dastlabki taymer
    resetTimer();

    // User harakatlarini kuzatamiz
    const events: Array<keyof WindowEventMap> = [
      'keydown',
      'mousemove',
      'click',
      'touchstart',
      'scroll',
    ];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    // Tab orqaga qaytsa ham taymerni yangilaymiz
    const onVisibility = () => {
      if (document.visibilityState === 'visible') resetTimer();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Tab yopilganda — sendBeacon (fetch/axios bekor qilinadi)
    const onBeforeUnload = () => {
      interviewApi.abandonBeacon(applicationId);
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isActive, finalized, applicationId, t]);
  const canSubmit = isActive && !isStreaming && answer.trim().length > 0 && !submitAnswer.isPending;

  const progress = useMemo(() => (questionsAsked / maxQuestions) * 100, [questionsAsked, maxQuestions]);

  if (startQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (startQuery.isError) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 size-10 text-amber-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Intervyuni ochib bo'lmadi. Iltimos, keyinroq urinib ko'ring.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (finalized && finalize.data) {
    return <FinalizeScreen score={finalize.data.data.final_score} onBack={() => navigate(`/me/${applicationId}`)} />;
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('interview.questionProgress', { current: questionsAsked, total: maxQuestions })}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <MessageBubble key={`${msg.role}-${i}`} role={msg.role} content={msg.content} />
            ))}
          </AnimatePresence>

          {isStreaming && streamingText && (
            <MessageBubble role="assistant" content={streamingText} streaming />
          )}

          {isStreaming && !streamingText && (
            <MessageBubble role="assistant" content={t('interview.thinking')} streaming />
          )}

          {streamError && !isStreaming && isActive && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
              <AlertTriangle className="mx-auto mb-2 size-6 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {t('interview.streamError')}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => void streamNextQuestion()}
              >
                {t('interview.retry')}
              </Button>
            </div>
          )}

          {!isActive && !finalized && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
              <CheckCircle2 className="mx-auto mb-2 size-10 text-emerald-500" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {sessionStatus === 'terminated' ? t('interview.terminated') : t('interview.completed')}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Javoblaringizni yakunlash uchun tugmani bosing.
              </p>
              <Button
                size="lg"
                className="mt-4"
                onClick={() => finalize.mutate()}
                disabled={finalize.isPending}
              >
                {finalize.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t('interview.finalize')
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <footer className="sticky bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto max-w-3xl p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) submitAnswer.mutate(answer.trim());
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  // Birinchi belgi kiritilgan vaqtni belgilaymiz (typing metrics uchun)
                  if (!typingRef.current.firstKeyAt && e.target.value.length > 0) {
                    typingRef.current.firstKeyAt = Date.now();
                  }
                }}
                onPaste={() => {
                  typingRef.current.pasteCount += 1;
                  if (!typingRef.current.firstKeyAt) {
                    typingRef.current.firstKeyAt = Date.now();
                  }
                }}
                placeholder={t('interview.yourAnswer')}
                disabled={isStreaming || submitAnswer.isPending}
                rows={3}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (canSubmit) submitAnswer.mutate(answer.trim());
                  }
                }}
              />
              <Button type="submit" size="lg" disabled={!canSubmit}>
                {submitAnswer.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
            <p className="mt-1 text-xs text-slate-400">
              Enter — yuborish, Shift+Enter — yangi qator
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming = false,
}: {
  role: 'assistant' | 'user';
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm',
          isUser
            ? 'bg-gradient-to-br from-slate-600 to-slate-700'
            : 'bg-gradient-to-br from-brand-500 to-accent-600',
        )}
      >
        {isUser ? <UserIcon className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'rounded-tr-sm bg-brand-600 text-white'
            : 'rounded-tl-sm bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100',
        )}
      >
        <p className="whitespace-pre-wrap">
          {content}
          {streaming && <span className="ml-0.5 inline-block animate-typewriter-cursor">▍</span>}
        </p>
      </div>
    </motion.div>
  );
}

function FinalizeScreen({ score, onBack }: { score: number; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-10" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {t('interview.completed')}
          </h1>
          <div className="w-full rounded-xl bg-gradient-to-br from-brand-50 to-accent-500/10 p-6 text-center dark:from-brand-500/10 dark:to-accent-500/10">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('application.interviewScore')}
            </div>
            <div className="mt-1 text-5xl font-bold gradient-text">{score}</div>
          </div>
          <Button onClick={onBack} className="w-full">
            {t('interview.viewResult')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
