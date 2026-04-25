import { useTranslation } from 'react-i18next';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ApplicationStatus, VacancyStatus, InterviewSessionStatus } from '@/types/api';

const APPLICATION_VARIANTS: Record<ApplicationStatus, BadgeProps['variant']> = {
  pending: 'default',
  ai_analyzing: 'brand',
  rejected_resume: 'danger',
  interview_stage: 'brand',
  interview_abandoned: 'warning',
  rejected_interview: 'danger',
  talent_pool: 'brand',
  accepted: 'success',
  in_contact: 'warning',
  hired: 'success',
  admin_cancelled: 'default',
};

const VACANCY_VARIANTS: Record<VacancyStatus, BadgeProps['variant']> = {
  active: 'success',
  archived: 'default',
};

const INTERVIEW_VARIANTS: Record<InterviewSessionStatus, BadgeProps['variant']> = {
  active: 'brand',
  completed: 'success',
  terminated: 'danger',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation();
  return <Badge variant={APPLICATION_VARIANTS[status]}>{t(`application.statuses.${status}`)}</Badge>;
}

export function VacancyStatusBadge({ status }: { status: VacancyStatus }) {
  const { t } = useTranslation();
  return <Badge variant={VACANCY_VARIANTS[status]}>{t(`vacancy.statuses.${status}`)}</Badge>;
}

export function InterviewStatusBadge({ status }: { status: InterviewSessionStatus }) {
  const labels: Record<InterviewSessionStatus, string> = {
    active: 'Aktiv',
    completed: 'Yakunlandi',
    terminated: "To'xtatildi",
  };
  return <Badge variant={INTERVIEW_VARIANTS[status]}>{labels[status]}</Badge>;
}
