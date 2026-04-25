import { BarChart3, Briefcase, FileText, Settings, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Logo } from '@/components/logo';
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

type Props = {
  onNavigate?: () => void;
};

export function SidebarContent({ onNavigate }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex h-16 items-center border-b border-slate-200/60 px-6 dark:border-slate-800/60">
        <NavLink to="/dashboard" onClick={onNavigate}>
          <Logo size="md" />
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800/80 dark:text-brand-300 dark:ring-slate-700/60'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100',
              )
            }
            end
          >
            <Icon className="size-4" />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
