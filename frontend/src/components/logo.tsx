import { cn } from '@/lib/cn';

type LogoProps = {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
};


export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeStyles = {
    sm: { icon: 'h-6', text: 'text-lg' },
    md: { icon: 'h-8', text: 'text-xl' },
    lg: { icon: 'h-12', text: 'text-3xl' },
  }[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img 
        src="/logo.png" 
        alt="Career AI" 
        className={cn('w-auto object-contain', sizeStyles.icon)} 
      />
      <span className={cn(
        'font-bold tracking-tight text-slate-900 dark:text-slate-50',
        sizeStyles.text
      )}>
        Career <span className="text-teal-500">AI</span>
      </span>
    </div>
  );
}
