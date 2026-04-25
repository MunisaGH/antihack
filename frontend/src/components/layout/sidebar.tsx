import { SidebarContent } from './sidebar-content';

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60 lg:flex">
      <SidebarContent />
    </aside>
  );
}
