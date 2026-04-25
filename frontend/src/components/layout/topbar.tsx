import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useLogout } from '@/hooks/use-auth';

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function Topbar() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200/60 bg-white/60 px-4 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/50 sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <NavLink to="/dashboard">
          <Logo size="sm" />
        </NavLink>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <LanguageSwitcher compact />
        <ThemeToggle />

        <NavLink
          to="/notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <Bell className="size-4" />
        </NavLink>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Avatar className="size-8">
              {user?.avatar && <AvatarImage src={user.avatar} alt={user.full_name} />}
              <AvatarFallback>{initials(user?.full_name || user?.username || '?')}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <div className="max-w-[140px] truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {user?.full_name || user?.username}
              </div>
            </div>
            <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <DropdownMenu.Item asChild>
                <NavLink
                  to="/profile"
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <UserIcon className="size-4" />
                  {t('nav.profile')}
                </NavLink>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
              <DropdownMenu.Item
                onClick={() => logout.mutate()}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut className="size-4" />
                {t('common.logout')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
