import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-50 p-6 text-center dark:bg-slate-950">
      <Logo size="lg" />
      <div>
        <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-50">404</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Page not found</p>
      </div>
      <Link to="/">
        <Button>{t('common.back')}</Button>
      </Link>
    </div>
  );
}
