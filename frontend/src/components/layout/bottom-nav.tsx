import { BarChart3, Briefcase, FileText, Settings, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: BarChart3, labelKey: 'nav.dashboard' },
  { to: '/vacancies', icon: Briefcase, labelKey: 'nav.vacancies' },
  { to: '/applications', icon: FileText, labelKey: 'nav.applications' },
  { to: '/applicants', icon: Users, labelKey: 'nav.applicants' },
  { to: '/profile', icon: Settings, labelKey: 'nav.profile' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/80 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex h-8 items-center justify-center rounded-full transition-all',
                    isActive
                      ? 'w-14 bg-brand-100 dark:bg-brand-500/15'
                      : 'w-8',
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <span className="max-w-full truncate px-1">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
