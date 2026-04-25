import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { PageSpinner } from '@/components/page-spinner';
import { NotFoundPage } from '@/features/public/not-found-page';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/protected-route';

// Public routes — lazy loaded
const LandingPage = lazy(() =>
  import('@/features/public/landing-page').then((m) => ({ default: m.LandingPage })),
);
const PublicVacancyPage = lazy(() =>
  import('@/features/public/public-vacancy-page').then((m) => ({ default: m.PublicVacancyPage })),
);
const ApplyPage = lazy(() =>
  import('@/features/public/apply-page').then((m) => ({ default: m.ApplyPage })),
);
const ResumeFormPage = lazy(() =>
  import('@/features/public/resume-form-page').then((m) => ({ default: m.ResumeFormPage })),
);
const MyApplicationsPage = lazy(() =>
  import('@/features/applicant/my-applications-page').then((m) => ({
    default: m.MyApplicationsPage,
  })),
);
const MyApplicationDetailPage = lazy(() =>
  import('@/features/applicant/my-application-detail-page').then((m) => ({
    default: m.MyApplicationDetailPage,
  })),
);
const LoginPage = lazy(() =>
  import('@/features/auth/login-page').then((m) => ({ default: m.LoginPage })),
);
const InterviewChatPage = lazy(() =>
  import('@/features/interview/interview-chat-page').then((m) => ({
    default: m.InterviewChatPage,
  })),
);

// Admin routes — lazy loaded
const DashboardPage = lazy(() =>
  import('@/features/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const VacanciesListPage = lazy(() =>
  import('@/features/vacancies/vacancies-list-page').then((m) => ({
    default: m.VacanciesListPage,
  })),
);
const VacancyFormPage = lazy(() =>
  import('@/features/vacancies/vacancy-form-page').then((m) => ({ default: m.VacancyFormPage })),
);
const VacancyDetailPage = lazy(() =>
  import('@/features/vacancies/vacancy-detail-page').then((m) => ({
    default: m.VacancyDetailPage,
  })),
);
const ApplicationsListPage = lazy(() =>
  import('@/features/applications/applications-list-page').then((m) => ({
    default: m.ApplicationsListPage,
  })),
);
const ApplicationDetailPage = lazy(() =>
  import('@/features/applications/application-detail-page').then((m) => ({
    default: m.ApplicationDetailPage,
  })),
);
const ApplicantsListPage = lazy(() =>
  import('@/features/applicants/applicants-list-page').then((m) => ({
    default: m.ApplicantsListPage,
  })),
);
const ApplicantDetailPage = lazy(() =>
  import('@/features/applicants/applicant-detail-page').then((m) => ({
    default: m.ApplicantDetailPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('@/features/auth/notifications-page').then((m) => ({ default: m.NotificationsPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/auth/profile-page').then((m) => ({ default: m.ProfilePage })),
);

export function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/apply/:uniqueLink" element={<PublicVacancyPage />} />
        <Route path="/apply/:uniqueLink/submit" element={<ApplyPage />} />
        <Route path="/apply/:uniqueLink/form" element={<ResumeFormPage />} />
        <Route path="/interview/:id" element={<InterviewChatPage />} />

        {/* Applicant (protected, no admin shell) */}
        <Route
          path="/me"
          element={
            <ProtectedRoute>
              <MyApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/:id"
          element={
            <ProtectedRoute>
              <MyApplicationDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Admin (protected) */}
        <Route
          element={
            <ProtectedRoute requireAdmin>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/vacancies" element={<VacanciesListPage />} />
          <Route path="/vacancies/new" element={<VacancyFormPage />} />
          <Route path="/vacancies/:id/edit" element={<VacancyFormPage />} />
          <Route path="/vacancies/:id" element={<VacancyDetailPage />} />

          <Route path="/applications" element={<ApplicationsListPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />

          <Route path="/applicants" element={<ApplicantsListPage />} />
          <Route path="/applicants/:phone" element={<ApplicantDetailPage />} />

          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
