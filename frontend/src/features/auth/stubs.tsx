import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProfileStub() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('nav.profile')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">Keyingi bosqichda qurilayapti.</p>
      </CardContent>
    </Card>
  );
}

export function NotificationsStub() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('nav.notifications')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">Keyingi bosqichda qurilayapti.</p>
      </CardContent>
    </Card>
  );
}
