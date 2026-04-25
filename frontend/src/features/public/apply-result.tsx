import { motion } from 'framer-motion';
import { ArrowRight, Check, CheckCircle2, Copy, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import type { ApplicationStatusPayload } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { copyToClipboard } from '@/lib/clipboard';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyToClipboard(text);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          toast.success(`${label} nusxalandi`);
        }
      }}
      className="inline-flex size-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      aria-label={`${label} nusxalash`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export function ApplyResultScreen({
  result,
  vacancyTitle,
  onStartInterview,
}: {
  result: ApplicationStatusPayload;
  vacancyTitle: string;
  onStartInterview: () => void;
}) {
  const passed =
    result.status === 'interview_stage' ||
    result.status === 'accepted' ||
    result.status === 'hired';

  if (!passed) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-strong">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <XCircle className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Afsuski, mos kelmadi
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sizning rezyumengiz{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {vacancyTitle}
                </span>{' '}
                vakansiyasiga mos kelmadi.
              </p>
            </div>

            {result.compatibility_score > 0 && (
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Moslik bali
                </div>
                <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {result.compatibility_score}%
                </div>
              </div>
            )}

            {result.feedback && (
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                {result.feedback}
              </div>
            )}

            <Link to="/" className="w-full">
              <Button variant="secondary" size="lg" className="w-full">
                Bosh sahifaga qaytish
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const creds = result.credentials;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-strong">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-9" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Tabriklaymiz! 🎉</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sizning ma'lumotlaringiz vakansiyaga mos kelindi. Keyingi bosqich — AI intervyu.
            </p>
          </div>

          <div className="w-full rounded-lg bg-gradient-to-br from-emerald-50 to-brand-50 p-4 text-center dark:from-emerald-500/10 dark:to-brand-500/10">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Moslik bali
            </div>
            <div className="mt-1 text-4xl font-bold gradient-text">{result.compatibility_score}%</div>
          </div>

          {creds && (
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm dark:border-slate-800 dark:bg-slate-800/50">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Hisobingizga kirish uchun:
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(
                      `Username: ${creds.username}\nPassword: ${creds.password}`,
                    );
                    if (ok) toast.success('Hisob ma\'lumotlari nusxalandi');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  <Copy className="size-3.5" />
                  Ikkalasini nusxalash
                </button>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">username:</span>
                  <span className="flex-1 text-slate-900 dark:text-slate-100">
                    {creds.username}
                  </span>
                  <CopyButton text={creds.username} label="Username" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">password:</span>
                  <span className="flex-1 text-slate-900 dark:text-slate-100">
                    {creds.password}
                  </span>
                  <CopyButton text={creds.password} label="Parol" />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Saqlab qo'ying — ular qayta ko'rsatilmaydi.
              </p>
            </div>
          )}

          <Button size="lg" onClick={onStartInterview} className="w-full">
            Login qilib intervyuni boshlash
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
