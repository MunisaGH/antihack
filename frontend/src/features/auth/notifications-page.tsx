import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { notificationsApi } from '@/api';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatTimeAgo } from '@/lib/time';

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const locale = i18n.resolvedLanguage ?? 'uz';

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('common.success'));
    },
  });

  const items = data?.data ?? [];
  const unreadCount = data?.unread ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.notifications')}
        description={unreadCount > 0 ? `${unreadCount} o'qilmagan` : undefined}
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="size-4" />
              Hammasini o'qildi deb belgilash
            </Button>
          )
        }
      />

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && items.length === 0 && <EmptyState icon={Bell} title="Bildirishnomalar yo'q" />}

      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((n) => {
            const timeAgo = formatTimeAgo(n.created_at, locale);
            return (
              <Card key={n.id} className={cn(!n.is_read && 'border-brand-300 dark:border-brand-500/40')}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">{n.title}</h3>
                      {!n.is_read && (
                        <Badge variant="brand" className="text-[10px]">Yangi</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
