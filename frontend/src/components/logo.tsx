import { cn } from '@/lib/cn';

type LogoProps = {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: { icon: 'size-6', text: 'text-sm' },
  md: { icon: 'size-8', text: 'text-base' },
  lg: { icon: 'size-10', text: 'text-lg' },
} as const;

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img src="/logo.png" alt="CAREER AI" className={cn('rounded-md', s.icon)} />
      {showText && (
        <span
          className={cn(
            'font-semibold tracking-tight text-slate-900 dark:text-slate-50',
            s.text,
          )}
        >
          CAREER <span className="text-brand-600 dark:text-brand-400">AI</span>
        </span>
      )}
    </div>
  );
}
