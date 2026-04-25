import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ApplicationsListStub() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('nav.applications')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">Keyingi bosqichda qurilayapti.</p>
      </CardContent>
    </Card>
  );
}
