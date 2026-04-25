import { Loader2 } from 'lucide-react';

export function PageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="size-6 animate-spin text-brand-500" />
    </div>
  );
}
