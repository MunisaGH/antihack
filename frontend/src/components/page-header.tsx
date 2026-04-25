import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

type Props = {
  title: string;
  description?: string;
  backTo?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, backTo, actions, className }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Browser back ishlatamiz — URL query filterlari saqlansin
    // Agar to'g'ridan-to'g'ri kirilgan bo'lsa (history yo'q), backTo ga o'tamiz
    if (location.key === 'default' && backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn('mb-6 space-y-4', className)}>
      {backTo && (
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ChevronLeft className="size-4" />
          Orqaga
        </button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
