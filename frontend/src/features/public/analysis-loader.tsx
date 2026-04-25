import { AnimatePresence, motion } from 'framer-motion';
import { Brain, FileSearch, Sparkles, Target } from 'lucide-react';
import { useEffect, useState } from 'react';

const STAGES = [
  { icon: FileSearch, label: 'Rezyume o\'qilmoqda...' },
  { icon: Brain, label: 'Ko\'nikmalar aniqlanmoqda...' },
  { icon: Target, label: 'Vakansiyaga taqqoslanmoqda...' },
  { icon: Sparkles, label: 'Natija tayyorlanmoqda...' },
];

export function AnalysisLoader() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGES.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const Stage = STAGES[stageIndex];

  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <div className="relative">
        {/* Orbiting dots */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 rounded-full bg-brand-500 shadow-lg shadow-brand-500/50" />
        </motion.div>
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute left-1/2 bottom-0 size-2 -translate-x-1/2 rounded-full bg-accent-500 shadow-lg shadow-accent-500/50" />
        </motion.div>

        {/* Central pulsing orb */}
        <motion.div
          className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-xl"
          animate={{
            scale: [1, 1.08, 1],
            boxShadow: [
              '0 10px 30px rgba(59, 130, 246, 0.3)',
              '0 15px 40px rgba(139, 92, 246, 0.5)',
              '0 10px 30px rgba(59, 130, 246, 0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={stageIndex}
              initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.4 }}
            >
              <Stage.icon className="size-10" />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="min-h-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={stageIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {Stage.label}
            </h2>
          </motion.div>
        </AnimatePresence>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Iltimos, bir oz kuting. Tahlil 30 soniyagacha vaqt olishi mumkin.
        </p>
      </div>

      <div className="flex gap-1.5">
        {STAGES.map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"
            animate={{
              width: i === stageIndex ? 24 : 8,
              backgroundColor: i <= stageIndex ? 'rgb(59 130 246)' : undefined,
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}
