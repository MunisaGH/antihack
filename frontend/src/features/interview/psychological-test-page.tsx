import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle2, AlertTriangle, Trophy, BarChart3, ChevronRight } from 'lucide-react';
import { interviewApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export function PsychologicalTestPage({
  applicationId,
  onComplete,
}: {
  applicationId: number;
  onComplete: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['psychological-questions'],
    queryFn: () => interviewApi.getPsychologicalQuestions(),
  });

  const submitTest = useMutation({
    mutationFn: (ans: Record<string, number>) => interviewApi.submitPsychologicalTest(applicationId, ans),
    onSuccess: () => {
      onComplete(); // Go to chat or show results
    },
  });

  const questions = data?.data || [];
  const progress = useMemo(() => {
    if (!questions.length) return 0;
    const answeredCount = Object.keys(answers).length;
    return (answeredCount / questions.length) * 100;
  }, [answers, questions.length]);

  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 size-10 text-amber-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Savollarni yuklab bo'lmadi. Iltimos, keyinroq urinib ko'ring.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo size="sm" />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Psixologik test ({Object.keys(answers).length} / {questions.length})</span>
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

      <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            AI intervyusidan oldingi psixologik test
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            O'zingizga eng mos keladigan javobni tanlang. Bu test sizning shaxsiy xususiyatlaringizni baholashga yordam beradi.
          </p>
        </div>

        {questions.map((q: any, index: number) => (
          <Card key={q.id} className="overflow-hidden border-slate-200 dark:border-slate-800 transition-colors">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4">
              <CardTitle className="text-base font-medium leading-relaxed">
                <span className="text-brand-500 mr-2">{index + 1}.</span>
                {q.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {[
                  { val: 1, label: "Mutlaqo qo'shilmayman", color: "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400" },
                  { val: 2, label: "Qo'shilmayman", color: "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400" },
                  { val: 3, label: "Neytral", color: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300" },
                  { val: 4, label: "Qo'shilaman", color: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
                  { val: 5, label: "To'liq qo'shilaman", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.val }))}
                    className={`
                      px-3 py-3 rounded-lg text-xs font-medium transition-all text-center
                      border-2 
                      ${answers[q.id] === opt.val 
                        ? 'border-brand-500 shadow-sm ring-1 ring-brand-500/50 ' + opt.color.replace('hover:', '')
                        : 'border-transparent bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'}
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-center pt-8">
          <Button
            size="lg"
            className="w-full sm:w-auto min-w-[200px]"
            disabled={!allAnswered || submitTest.isPending}
            onClick={() => submitTest.mutate(answers)}
          >
            {submitTest.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 size-4" />
            )}
            Testni yakunlash
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PsychologicalTestResults({ results, onProceed }: { results: any, onProceed: () => void }) {
  if (!results) return null;

  const traitColors: Record<string, string> = {
    "O": "bg-emerald-500", // Yangilikka ochiqlik
    "C": "bg-blue-500", // Mas'uliyat va intizom
    "E": "bg-purple-500", // Kirishimlilik
    "A": "bg-orange-500", // Hamkorlikka moyillik
    "ES": "bg-rose-500", // Hissiy barqarorlik
  };

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo size="sm" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
        <div className="bg-gradient-to-br from-brand-600 to-indigo-600 rounded-2xl p-8 text-center text-white shadow-lg">
          <div className="mx-auto bg-white/20 size-16 rounded-full flex items-center justify-center mb-4">
            <Trophy className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Test Yakunlandi!</h1>
          <p className="text-brand-100 opacity-90">20 ta savolga javob berdingiz</p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shrink-0">
                <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{results.grade}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Umumiy Natija</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sizning ko'rsatkichingiz</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-brand-600 dark:text-brand-400">{results.overall_percentage}%</span>
              <p className="text-xs text-slate-400">100 dan</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-4">
            <BarChart3 className="size-5 text-brand-500" /> Big Five natijalari
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.traits?.map((trait: any) => (
              <div key={trait.trait_id} className={`rounded-xl p-5 text-white ${traitColors[trait.trait_id] || 'bg-slate-500'} shadow-sm`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{trait.name}</h3>
                  <span className="font-bold text-xl">{trait.percentage}%</span>
                </div>
                <p className="text-white/80 text-sm mb-4 min-h-[40px]">{trait.description}</p>
                <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${trait.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm mt-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Tavsiyalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.recommendations?.map((rec: string, i: number) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <CheckCircle2 className="size-5 text-brand-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 dark:text-slate-300">{rec}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-center pt-6 pb-10">
          <Button size="lg" className="w-full sm:w-auto min-w-[250px] shadow-md hover:shadow-lg transition-all" onClick={onProceed}>
            Suhbatni boshlash <ChevronRight className="ml-2 size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
