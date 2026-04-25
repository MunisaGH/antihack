import { useQuery } from '@tanstack/react-query';
import { Mail, MessageCircle, Phone, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '@/api';
import { Card, CardContent } from '@/components/ui/card';

export function ContactCard() {
  const { t } = useTranslation();
  const contactQuery = useQuery({
    queryKey: ['contact-info'],
    queryFn: () => publicApi.contactInfo(),
    staleTime: 5 * 60 * 1000,
  });

  const contact = contactQuery.data?.data;
  if (!contact) return null;

  const hasAny = contact.phone || contact.telegram_username || contact.email;
  if (!hasAny) return null;

  return (
    <Card className="border-brand-200 bg-gradient-to-br from-brand-50/40 to-accent-50/40 dark:border-brand-500/30 dark:from-brand-500/5 dark:to-accent-500/5">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <UserCircle className="size-5 text-brand-600 dark:text-brand-400" />
          {t('contact.title')}
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t('contact.description')}
        </p>

        <div className="space-y-2 text-sm">
          {contact.full_name && (
            <div className="text-slate-900 dark:text-slate-100">
              <span className="text-slate-500 dark:text-slate-400">{t('contact.name')}: </span>
              <span className="font-medium">{contact.full_name}</span>
              {contact.company_name && (
                <span className="ml-1 text-slate-500 dark:text-slate-400">
                  ({contact.company_name})
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {contact.telegram_username && (
              <a
                href={`https://t.me/${contact.telegram_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
              >
                <MessageCircle className="size-4" />
                @{contact.telegram_username}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
              >
                <Phone className="size-4" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
              >
                <Mail className="size-4" />
                {contact.email}
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
