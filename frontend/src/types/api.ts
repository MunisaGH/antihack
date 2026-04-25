// Backend DTO'lar — `backend/api/models.py` va serializer'larga mos keladi.

export type Language = 'uz' | 'ru';

export type Localized = Partial<Record<Language, string>>;

export type Role = 'admin' | 'applicant';

export type User = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  telegram_username: string;
  avatar: string | null;
  is_active: boolean;
  company_name: string;
  company_location: string;
  role: Role;
  date_joined: string;
  last_login: string | null;
};

export type WorkType = 'remote' | 'office' | 'hybrid';
export type WorkSchedule = 'full-time' | 'part-time' | 'contract';
export type VacancyStatus = 'active' | 'archived';

export type Vacancy = {
  id: string;
  employer: number;
  employer_name: string;
  company_name: string;
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
  work_type: WorkType;
  work_schedule: WorkSchedule;
  salary_min: string | null;
  salary_max: string | null;
  location: string;
  experience_years: number;
  experience_months: number;
  min_match_score: number;
  unique_link: string;
  status: VacancyStatus;
  views_count: number;
  applications_count: number;
  created_at: string;
  updated_at: string;
};

export type VacancyCreateInput = {
  title: Localized;
  description: Localized;
  requirements: Localized;
  responsibilities: Localized;
  work_type: WorkType;
  work_schedule: WorkSchedule;
  salary_min?: number | null;
  salary_max?: number | null;
  location: string;
  experience_years?: number;
  experience_months?: number;
  min_match_score?: number;
  status?: VacancyStatus;
};

export type ApplicationStatus =
  | 'pending'
  | 'ai_analyzing'
  | 'rejected_resume'
  | 'interview_stage'
  | 'interview_abandoned'
  | 'rejected_interview'
  | 'talent_pool'
  | 'accepted'
  | 'in_contact'
  | 'hired'
  | 'admin_cancelled';

export type AiAnalysisResult = {
  overall_compatibility?: number;
  technical_skills_match?: number;
  experience_match?: number;
  education_relevance?: number;
  strengths?: string[];
  weaknesses?: string[];
  missing_skills?: string[];
  recommendations?: string[];
  detailed_feedback?: string;
  hiring_recommendation?: 'hire' | 'interview' | 'reject';
  confidence_level?: number;
};

export type InterviewAnalysis = {
  total_score?: number;
  communication?: number;
  technical_depth?: number;
  problem_solving?: number;
  cultural_fit?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: 'hire' | 'maybe' | 'reject';
  summary?: string;
};

export type ResumeFormDataDTO = {
  email: string;
  linkedin_url: string;
  portfolio_url: string;
  summary: string;
  experience_data: Array<{
    position?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  education_data: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    year?: string;
  }>;
  technical_skills: string[];
  soft_skills: string[];
  languages: Array<{ name?: string; level?: string }>;
  certifications: string[];
  projects_data: Array<{ name?: string; description?: string }>;
  hobbies: string;
};

export type Application = {
  id: number;
  vacancy: string;
  vacancy_title: string;
  company_name: string;
  full_name: string;
  phone: string;
  age: number | null;
  address: string;
  telegram_username: string;
  resume_file: string | null;
  resume_text: string;
  resume_form_data: ResumeFormDataDTO | null;
  resume_generated: boolean;
  ai_analysis_result: AiAnalysisResult;
  compatibility_score: number;
  ai_strengths: string[];
  ai_weaknesses: string[];
  ai_recommendations: string[];
  interview_analysis: InterviewAnalysis;
  interview_messages: InterviewMessage[];
  interview_status: {
    status: 'active' | 'completed' | 'terminated';
    questions_asked: number;
    termination_reason: string;
    started_at: string | null;
    ended_at: string | null;
  } | null;
  interview_score: number;
  psychological_test_results?: any;
  status: ApplicationStatus;
  status_history: Array<{ status: ApplicationStatus; at: string; by?: string }>;
  final_score: number;
  notes: string;
  user_language: Language;
  applied_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

export type InterviewMessage = {
  role: 'assistant' | 'user';
  content: string;
  at: string;
  ai_detection?: {
    suspicion_score: number;
    factors: string[];
    ai_classifier_score: number;
    ai_classifier_reason: string;
    typing_metrics: {
      paste_count: number;
      total_time_ms: number;
      chars_per_sec: number;
    };
  };
};

export type InterviewSessionStatus = 'active' | 'completed' | 'terminated';

export type InterviewSession = {
  id: number;
  application: number;
  messages: InterviewMessage[];
  status: InterviewSessionStatus;
  questions_asked: number;
  termination_reason: string;
  final_score: number;
  final_analysis: InterviewAnalysis;
  started_at: string;
  ended_at: string | null;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type AnalyticsStats = {
  vacancies?: number;
  activeVacancies?: number;
  applications?: number;
  totalViews?: number;
  applicationsTrendPercent?: number;
  applications_by_status: Array<{ status: ApplicationStatus; count: number }>;
  applications_by_month: Array<{ month: string; count: number }>;
  top_vacancies: Array<{ id: string; title: string; applications_count: number }>;
  average_compatibility_score: number;
  interview_success_rate: number;
  active_users?: number;
  top_locations?: Array<{ location: string; count: number }>;
};

// Generic API response envelope
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
};

export type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  count?: number;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  refresh_token: string;
  user: User;
};

export type StartInterviewResponse = {
  success: boolean;
  data: {
    session_id: number;
    status: InterviewSessionStatus;
    questions_asked: number;
    max_questions: number;
    messages: InterviewMessage[];
  };
};

export type SubmitAnswerResponse = {
  success: boolean;
  data: {
    ok: boolean;
    terminated: boolean;
    reason: string;
    completed: boolean;
  };
};

export type FinalizeInterviewResponse = {
  success: boolean;
  data: {
    session_id: number;
    status: InterviewSessionStatus;
    final_score: number;
    analysis: InterviewAnalysis;
  };
};
