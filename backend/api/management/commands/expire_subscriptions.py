from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Subscription
from api.models import Notification
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Expire subscriptions whose end_date has passed, and send notifications'

    def handle(self, *args, **options):
        now = timezone.now()

        # 1) 10 daqiqa qolganlarni ogohlantirish (faqat bir marta)
        soon_count = 0
        ten_minutes = timedelta(minutes=10)
        for sub in Subscription.objects.filter(is_active=True, end_date__isnull=False).select_related('employer__user'):
            # Unlimited durationlar yoki start_date yo'qlarni o'tkazib yuboramiz
            end_at = sub.end_date
            if not end_at:
                continue
            # 10 daqiqa qolgandagi oynaga tushdimi?
            if end_at - ten_minutes <= now < end_at:
                user = sub.employer.user
                # 15 daqiqalik dublikat filtri
                exists_soon = Notification.objects.filter(
                    user=user,
                    type='subscription_expiring_soon',
                    created_at__gte=now - timedelta(minutes=5),
                ).exists()
                if not exists_soon:
                    Notification.objects.create(
                        user=user,
                        title='Obuna tez orada tugaydi',
                        body='Sizning obunangiz 10 daqiqa ichida tugaydi.',
                        type='subscription_expiring_soon',
                    )
                    soon_count += 1

        # 2) Muddati tugaganlarni expire qilish (bildirishnoma yuborilmaydi)
        expired_qs = Subscription.objects.filter(is_active=True, end_date__isnull=False, end_date__lte=now)
        expired_count = 0
        for sub in expired_qs.select_related('employer__user'):
            sub.is_active = False
            sub.save(update_fields=['is_active'])
            expired_count += 1

        self.stdout.write(self.style.SUCCESS(f'Expiring-soon sent: {soon_count}; Expired deactivated: {expired_count}'))


