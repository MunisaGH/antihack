import { cn } from '@/lib/cn';

type Props = {
  value: number;
  max?: number;
  showLabel?: boolean;
  className?: string;
};

function tintFor(percent: number): string {
  if (percent >= 80) return 'from-emerald-500 to-emerald-600';
  if (percent >= 60) return 'from-brand-500 to-brand-600';
  if (percent >= 40) return 'from-amber-500 to-amber-600';
  return 'from-red-500 to-red-600';
}

export function ScoreBar({ value, max = 100, showLabel = true, className }: Props) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Score</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{Math.round(percent)}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all', tintFor(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
