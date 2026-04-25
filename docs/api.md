# API Documentation

## Base URL

```
http://localhost:8000/api/
```

Production: `https://quickhire.uz/api/`

---

## Tilni aniqlash (Internationalization)

Platform **3 ta tilni** qo'llab-quvvatlaydi: **O'zbek (uz)**, **Rus (ru)**, **Ingliz (en)**.

### Tilni ko'rsatish usullari:

1. **Query Parameter** (ustunlik):
   ```
   GET /api/vacancies/?lang=ru
   POST /api/public/submit_application/?lang=en
   ```

2. **Accept-Language Header**:
   ```
   Accept-Language: ru
   ```

3. **Default**: Agar til ko'rsatilmagan bo'lsa, default: `uz`

### Muhim eslatmalar:

- **Vakansiya yaratishda** har doim 3 tilda (`uz`, `ru`, `en`) ma'lumot yuborish kerak
- **Application yuborishda** tilni `lang` query parameter yoki `Accept-Language` header orqali ko'rsatish mumkin
- **AI tahlil** va **interview savollar** user tanlagan tilga qarab generatsiya qilinadi
- **Barcha API response'lar** user tanlagan tilga qarab qaytariladi

Batafsil ma'lumot uchun [Internationalization (i18n)](#internationalization-i18n) bo'limiga qarang.

---

## Authentication

Platform JWT (JSON Web Token) based authentication ishlatadi.

### Login

**Endpoint:** `POST /api/auth/login/`

**Request:**
```json
{
  "username": "employer",
  "password": "secure_password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "employer1",
    "email": "employer@example.com",
    "full_name": "John Doe",
    "phone": "+998901234567",
    "company_role": "admin",
    "avatar": "http://localhost:8000/media/files/avatars/avatar.jpg"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Login failed",
  "errors": {
    "non_field_errors": ["Unable to log in with provided credentials."]
  }
}
```

### Logout

**Endpoint:** `POST /api/auth/logout/`

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Refresh Token

**Endpoint:** `POST /api/auth/refresh/`

**No Authentication Required**

**Request:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

## Profile Management

### Get Profile

**Endpoint:** `GET /api/profile/`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "employer1",
  "email": "employer@example.com",
  "full_name": "John Doe",
  "phone": "+998901234567",
  "company_name": "Tech Corp",
  "company_location": "Tashkent",
  "company_role": "admin",
  "avatar": "http://localhost:8000/media/files/avatars/avatar.jpg"
}
```

### Update Profile

**Endpoint:** `PUT /api/profile/` yoki `PATCH /api/profile/`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "full_name": "John Doe Updated",
  "phone": "+998901234568",
  "company_name": "Updated Tech Corp",
  "company_location": "Toshkent"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "id": 1,
    "full_name": "John Doe Updated",
    ...
  }
}
```

### Upload Avatar

**Endpoint:** `POST /api/profile/upload_avatar/`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
```
avatar: <file>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Avatar uploaded",
  "data": {
    "avatar": "http://localhost:8000/media/files/avatars/new_avatar.jpg"
  }
}
```

### Change Password

**Endpoint:** `POST /api/profile/change_password/`

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "old_password": "old_password",
  "new_password": "new_secure_password",
  "confirm_password": "new_secure_password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Parol muvaffaqiyatli yangilandi"
}
```

---

## Internationalization (i18n)

Platform 3 ta tilni qo'llab-quvvatlaydi: **O'zbek (uz)**, **Rus (ru)**, **Ingliz (en)**.

### Tilni aniqlash mexanizmi:

1. **Query Parameter** (ustunlik):
   ```
   GET /api/vacancies/?lang=ru
   POST /api/public/submit_application/?lang=en
   ```

2. **Accept-Language Header**:
   ```
   Accept-Language: ru
   ```

3. **Default**: Agar til ko'rsatilmagan bo'lsa, default: `uz`

### Vakansiya ma'lumotlari 3 tilda saqlanadi:

Barcha vakansiya ma'lumotlari (`title`, `description`, `requirements`, `responsibilities`) JSON formatda 3 tilda saqlanadi:
```json
{
  "uz": "Backend Developer",
  "ru": "Backend Разработчик",
  "en": "Backend Developer"
}
```

API response'da user tanlagan tilga qarab bitta til qaytariladi.

---

## Vacancy Management

### List Vacancies

**Endpoint:** `GET /api/vacancies/`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "title": "Senior Backend Developer",
    "description": "We are looking for an experienced backend developer...",
    "requirements": "Python, Django, PostgreSQL, REST API",
    "responsibilities": "API development, database optimization, code reviews",
    "work_type": "remote",
    "work_schedule": "full-time",
    "location": "Tashkent",
    "experience_years": 3,
    "experience_months": 0,
    "salary_min": 1000,
    "salary_max": 2000,
    "status": "active",
    "unique_link": "abc123xyz",
    "views_count": 150,
    "applications_count": 25,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-20T15:30:00Z"
  }
]
```

**Eslatma:** `title`, `description`, `requirements`, `responsibilities` user tanlagan tilga qarab qaytariladi.

### Create Vacancy

**Endpoint:** `POST /api/vacancies/`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "title": {
    "uz": "Senior Backend Developer",
    "ru": "Senior Backend Разработчик",
    "en": "Senior Backend Developer"
  },
  "description": {
    "uz": "MetOneX construction marketplace uchun backend developer kerak. Django, DRF, PostgreSQL bilan ishlash tajribasi talab qilinadi.",
    "ru": "Требуется backend разработчик для MetOneX construction marketplace. Требуется опыт работы с Django, DRF, PostgreSQL.",
    "en": "Backend developer needed for MetOneX construction marketplace. Experience with Django, DRF, PostgreSQL is required."
  },
  "requirements": {
    "uz": "Django, DRF, SQL, Docker, AWS bilan ishlash ko'nikmasi. 2+ yil tajriba.",
    "ru": "Навыки работы с Django, DRF, SQL, Docker, AWS. Опыт работы 2+ года.",
    "en": "Skills in Django, DRF, SQL, Docker, AWS. 2+ years of experience."
  },
  "responsibilities": {
    "uz": "API larni yaratish va yaxshilash. Database optimizatsiyasi. Microservices arxitektura bilan ishlash.",
    "ru": "Создание и улучшение API. Оптимизация базы данных. Работа с микросервисной архитектурой.",
    "en": "Creating and improving APIs. Database optimization. Working with microservices architecture."
  },
  "work_type": "office",
  "work_schedule": "full-time",
  "location": "Tashkent, Boulevard",
  "experience_years": 2,
  "experience_months": 0,
  "salary_min": 1000,
  "salary_max": 2000,
  "min_match_score": 70,
  "status": "active"
}
```

**Eslatma:** 
- `title`, `description`, `requirements`, `responsibilities` **har doim 3 tilda** (`uz`, `ru`, `en`) yuborilishi kerak
- `ai_criteria` va `ai_prompt` avtomatik generatsiya qilinadi, yuborish shart emas

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Vacancy created successfully",
  "data": {
    "id": "uuid",
    "title": "Senior Backend Developer",
    "unique_link": "abc123xyz",
    ...
  }
}
```

### Get Vacancy

**Endpoint:** `GET /api/vacancies/{id}/`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "title": "Senior Backend Developer",
  "description": "...",
  "requirements": "...",
  "responsibilities": "...",
  ...
}
```

**Eslatma:** `title`, `description`, `requirements`, `responsibilities` user tanlagan tilga qarab qaytariladi.

### Update Vacancy

**Endpoint:** `PUT /api/vacancies/{id}/` yoki `PATCH /api/vacancies/{id}/`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:** (PUT - to'liq, PATCH - qisman)
```json
{
  "title": {
    "uz": "Updated Title",
    "ru": "Обновленный заголовок",
    "en": "Updated Title"
  },
  "status": "archived"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "title": "Updated Title",
  "status": "archived",
  ...
}
```

**Eslatma:** Agar `title`, `description`, `requirements`, yoki `responsibilities` yangilansa, ularni 3 tilda yuborish kerak.

### Delete Vacancy

**Endpoint:** `DELETE /api/vacancies/{id}/`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (204 No Content)**

---

## Application Management

### List Applications

**Endpoint:** `GET /api/applications/`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - Filter by status (pending, ai_analyzing, rejected_resume, interview_stage, etc.)
- `vacancy` - Filter by vacancy ID
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "vacancy": "uuid",
    "vacancy_title": "Senior Backend Developer",
    "company_name": "Tech Corp",
    "full_name": "John Applicant",
    "phone": "+998901234567",
    "age": 28,
    "address": "Tashkent",
    "resume_file": "http://localhost:8000/media/files/resumes/resume.pdf",
    "status": "interview_stage",
    "compatibility_score": 85,
    "ai_strengths": ["Strong Python skills", "Good Django experience"],
    "ai_weaknesses": ["Limited PostgreSQL experience"],
    "ai_recommendations": ["Gain AWS experience", "Improve PostgreSQL skills"],
    "user_language": "uz",
    "applied_at": "2024-01-20T10:00:00Z"
  }
]
```

**Eslatma:** `vacancy_title` user tanlagan tilga qarab qaytariladi.

### Get Application

**Endpoint:** `GET /api/applications/{id}/`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "vacancy": {...},
  "full_name": "John Applicant",
  "status": "interview_stage",
  "compatibility_score": 85,
  "ai_analysis_result": {
    "summary": "...",
    "skills_match": {...},
    "experience_match": {...}
  },
  "interview_answers": [
    {
      "question_id": 1,
      "question": "Explain REST principles",
      "answer": "..."
    }
  ],
  "interview_score": 80,
  ...
}
```

### Update Application Status

**Endpoint:** `PUT /api/applications/{id}/` yoki `PATCH /api/applications/{id}/`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "status": "accepted",
  "notes": "Great candidate, strong technical skills"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "accepted",
    "notes": "Great candidate, strong technical skills",
    ...
  }
}
```

**Eslatma:** Interview savollari avtomatik generatsiya qilinadi va `application.generated_interview_questions` ga saqlanadi. `generate_interview_questions` endpointi olib tashlangan.

---

## Public Endpoints

### List Public Vacancies

**Endpoint:** `GET /api/public/vacancies/`

**No Authentication Required**

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)
- `location` - Location filter (e.g., "Tashkent")
- `work_type` - Work type filter (remote/office/hybrid)
- `experience_min` - Minimum experience years
- `salary_min` - Minimum salary
- `page` - Page number (default: 1)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "vacancies": [
      {
        "id": "uuid",
        "title": "Senior Backend Developer",
        "description": "...",
        "requirements": "...",
        "responsibilities": "...",
        "work_type": "remote",
        "location": "Tashkent",
        "salary_min": 1000,
        "salary_max": 2000,
        "company_name": "Tech Corp",
        "views_count": 150,
        "applications_count": 25,
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total_pages": 5,
      "current_page": 1,
      "total_count": 100
    }
  }
}
```

**Eslatma:** `title`, `description`, `requirements`, `responsibilities` user tanlagan tilga qarab qaytariladi.

### Get Vacancy by Unique Link

**Endpoint:** `GET /api/public/vacancy/{unique_link}/`

**No Authentication Required**

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "title": "Senior Backend Developer",
  "description": "...",
  "requirements": "...",
  "responsibilities": "...",
  "work_type": "remote",
  "work_schedule": "full-time",
  "location": "Tashkent",
  "experience_years": 3,
  "salary_min": 1000,
  "salary_max": 2000,
  "unique_link": "abc123xyz",
  "company_name": "Tech Corp",
  "views_count": 150,
  "applications_count": 25,
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Eslatma:** `title`, `description`, `requirements`, `responsibilities` user tanlagan tilga qarab qaytariladi.

### Submit Application

**Endpoint:** `POST /api/public/submit_application/`

**No Authentication Required**

**Content-Type:** `multipart/form-data`

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Yoki Accept-Language Header:**
```
Accept-Language: ru
```

**Fields:**
- `vacancy` - Vacancy ID (required)
- `full_name` - Full name (required)
- `phone` - Phone number (required)
- `age` - Age (optional)
- `address` - Address (optional)
- `resume_file` - Resume file (optional, PDF/DOC/DOCX, max 10MB)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Application submitted successfully. AI analysis is in progress.",
  "application_id": "1",
  "status": "ai_analyzing",
  "note": "Please login with provided credentials to check your application status",
  "session": {
    "username": "applicant_998901234567",
    "password": "random_password",
    "token": "session_token",
    "phone": "+998901234567"
  }
}
```

**Eslatma:**
- Tilni `lang` query parameter yoki `Accept-Language` header orqali ko'rsatish mumkin
- Application yaratilganda `user_language` saqlanadi
- AI tahlil user tanlagan tilga qarab bajariladi
- Agar user oldin boshqa vakansiyalarga topshirgan bo'lsa, username saqlanadi, faqat parol yangilanadi
- Agar bir xil vakansiyaga ikkinchi marta topshirilsa, xato qaytariladi

### Submit Resume Form Application

**Endpoint:** `POST /api/public/submit_resume_form/`

**No Authentication Required**

**Content-Type:** `application/json`

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Request:**
```json
{
  "vacancy_id": "uuid",
  "form_data": {
    "full_name": "John Applicant",
    "phone": "+998901234567",
    "email": "john@example.com",
    "age": 28,
    "address": "Tashkent",
    "linkedin_url": "https://linkedin.com/in/john",
    "portfolio_url": "https://portfolio.com/john",
    "summary": "Experienced backend developer...",
    "education_data": [
      {
        "degree": "Bachelor",
        "institution": "TATU",
        "year": "2020-2024",
        "field": "Computer Science"
      }
    ],
    "experience_data": [
      {
        "company": "Tech Corp",
        "position": "Backend Developer",
        "duration": "2022-2024",
        "description": "Developed REST APIs..."
      }
    ],
    "technical_skills": ["Python", "Django", "PostgreSQL"],
    "soft_skills": ["Leadership", "Communication"],
    "languages": [
      {
        "language": "English",
        "level": "Advanced"
      }
    ],
    "projects_data": [
      {
        "name": "E-commerce API",
        "description": "REST API for e-commerce platform",
        "technologies": ["Django", "PostgreSQL"],
        "url": "https://github.com/john/project"
      }
    ],
    "certifications": [
      {
        "name": "AWS Certified",
        "issuer": "Amazon",
        "date": "2023",
        "url": "https://aws.amazon.com/certification"
      }
    ],
    "hobbies": "Reading, Coding",
    "references": []
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Application submitted successfully. AI analysis is in progress.",
  "application_id": 1,
  "status": "ai_analyzing",
  "note": "Please login with provided credentials to check your application status",
  "session": {
    "username": "applicant_998901234567",
    "password": "random_password",
    "token": "session_token",
    "phone": "+998901234567"
  }
}
```

**Eslatma:** Xuddi `submit_application` kabi, tilni `lang` query parameter yoki `Accept-Language` header orqali ko'rsatish mumkin.

### Get My Applications (Applicant)

**Endpoint:** `GET /api/public/my_applications/`

**Authentication Required** (Applicant userlar uchun)

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "vacancy_title": "Senior Backend Developer",
      "company_name": "Tech Corp",
      "status": "interview_stage",
      "compatibility_score": 75,
      "ai_strengths": [
        "Strong experience with Django and DRF",
        "Proficient in Python and SQL"
      ],
      "ai_weaknesses": [
        "Lack of AWS experience",
        "Limited Docker experience"
      ],
      "ai_recommendations": [
        "Gain hands-on experience with AWS",
        "Develop proficiency in Docker"
      ],
      "ai_analysis_result": {
        "overall_compatibility": 75,
        "technical_skills_match": 80,
        "experience_match": 70,
        "education_relevance": 75,
        "detailed_feedback": "...",
        "hiring_recommendation": "interview",
        "confidence_level": 85
      },
      "generated_interview_questions": [
        {
          "id": 1,
          "category": "TECHNICAL",
          "question": "Django ORM bilan qanday ishlaysiz?",
          "difficulty": "medium",
          "expected_focus": ["Django", "ORM"],
          "max_score": 20
        }
      ],
      "interview_answers": [],
      "interview_analysis": {},
      "interview_score": 0,
      "user_language": "uz",
      "applied_at": "2024-01-20T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Eslatma:**
- Faqat applicant userlar uchun
- `vacancy_title` user tanlagan tilga qarab qaytariladi
- AI tahlil, interview savollar va javoblar user tanlagan tilga qarab ko'rsatiladi

### Submit Interview Answers

**Endpoint:** `POST /api/public/submit_interview_answers/`

**No Authentication Required**

**Content-Type:** `application/json`

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Request:**
```json
{
  "application_id": 1,
  "answers": [
    {
      "question_id": 1,
      "answer": "REST (Representational State Transfer) is an architectural style..."
    },
    {
      "question_id": 2,
      "answer": "I optimize database queries by using select_related, prefetch_related..."
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Interview completed",
  "data": {
    "score": 85,
    "feedback": "Javoblar yaxshi, lekin ba'zi texnik tafsilotlar yetarli emas...",
    "strengths": [
      "Django ORM bilan yaxshi tajriba",
      "Kod yozishda toza arxitektura"
    ],
    "weaknesses": [
      "AWS tajribasi yetarli emas",
      "Docker bilan ishlash ko'nikmalari zaif"
    ]
  }
}
```

**Eslatma:** Interview javoblari va tahlili user tanlagan tilga qarab qaytariladi.

### Submit Contact Message

**Endpoint:** `POST /api/public/submit_contact_message/`

**No Authentication Required**

**Content-Type:** `application/json`

**Request:**
```json
{
  "name": "John Doe",
  "phone": "+998901234567",
  "message": "I'm interested in your platform..."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Contact message received",
  "data": {
    "id": 1,
    "name": "John Doe",
    "phone": "+998901234567",
    "message": "I'm interested in your platform...",
    "created_at": "2024-01-20T10:00:00Z"
  }
}
```

---

## Analytics

### Get Analytics Stats (Birlashtirilgan)

**Endpoint:** `GET /api/analytics/stats/`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `lang` (optional): `uz`, `ru`, yoki `en` (default: `uz`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "vacancies": 25,
    "activeVacancies": 20,
    "applications": 150,
    "currentMonthApplications": 45,
    "previousMonthApplications": 30,
    "applicationsTrendPercent": 50.0,
    "totalViews": 5000,
    "recentApplications": [
      {
        "id": 1,
        "full_name": "John Applicant",
        "vacancy_title": "Senior Backend Developer",
        "status": "interview_stage",
        "applied_at": "2024-01-20T10:00:00Z"
      }
    ],
    "applications_by_status": {
      "pending": 10,
      "ai_analyzing": 5,
      "interview_stage": 20,
      "accepted": 15,
      "rejected_resume": 30,
      "rejected_interview": 20
    },
    "applications_by_month": [
      {"month": "2024-01", "count": 45},
      {"month": "2024-02", "count": 50}
    ],
    "top_vacancies": [
      {
        "id": "uuid",
        "title": "Senior Backend Developer",
        "applications_count": 25,
        "views_count": 500
      }
    ],
    "average_compatibility_score": 75.5,
    "interview_success_rate": 60.0,
    "active_users": 200,
    "top_locations": [
      {"location": "Tashkent", "count": 80},
      {"location": "Samarkand", "count": 30}
    ]
  }
}
```

**Eslatma:** 
- Barcha dashboard, analytics va platform stats bitta endpointda birlashtirilgan
- `top_vacancies` va `recentApplications` ichidagi `title` user tanlagan tilga qarab qaytariladi

---

## Notifications

### List Notifications

**Endpoint:** `GET /api/notifications/`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "New Application Received",
      "body": "John Applicant applied for Senior Backend Developer",
      "type": "info",
      "is_read": false,
      "created_at": "2024-01-20T10:00:00Z"
    }
  ],
  "unread": 5
}
```

### Mark Notification as Read

**Endpoint:** `POST /api/notifications/{id}/mark_read/`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true
}
```

### Mark All Notifications as Read

**Endpoint:** `POST /api/notifications/mark_all_read/`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field_name": ["Error detail"]
  }
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `204 No Content` - Success, no content to return
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `405 Method Not Allowed` - Method not allowed (e.g., POST /api/applications/)
- `500 Internal Server Error` - Server error

**Eslatma:** Error message'lar ham user tanlagan tilga qarab qaytariladi.

---

## Rate Limiting

API endpoints rate limiting bilan himoyalangan:

- **Development:** LocMemCache (no strict limits)
- **Production:** Redis-based rate limiting (recommended)

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## API Documentation (Swagger/OpenAPI)

Interactive API documentation mavjud:

- **Swagger UI:** `/api/docs/`
- **ReDoc:** `/api/redoc/`
- **OpenAPI Schema:** `/api/schema/`

**Eslatma:** Swagger UI da barcha endpointlar to'g'ri tag'larda guruhlangan:
- **Authentication** - Login, Logout, Refresh
- **Profile** - User profil boshqaruvi
- **Notifications** - Bildirishnomalar
- **Vacancies** - Vakansiyalar boshqaruvi
- **Applications** - Arizalar boshqaruvi
- **Analytics** - Statistikalar va hisobotlar
- **Public** - Public endpointlar

---

## Qo'shimcha Ma'lumotlar

### Application yaratish

- Application yaratish **faqat** `/api/public/submit_application/` yoki `/api/public/submit_resume_form/` orqali mumkin
- `/api/applications/` endpointi application yaratishni qo'llab-quvvatlamaydi (405 Method Not Allowed)

### Username va Parol

- Application yuborilganda avtomatik username va parol generatsiya qilinadi
- Agar user oldin boshqa vakansiyalarga topshirgan bo'lsa, username saqlanadi, faqat parol yangilanadi
- Credentials response'da ko'rsatiladi va faqat bir marta ko'rsatiladi

### AI Tahlil

- Application yuborilganda avtomatik AI tahlil boshlanadi (background task)
- AI tahlil user tanlagan tilga qarab bajariladi
- Tahlil natijalari `ai_analysis_result`, `ai_strengths`, `ai_weaknesses`, `ai_recommendations` da saqlanadi

### Interview Savollar

- Resume o'tganda (compatibility_score >= min_match_score) avtomatik interview savollari generatsiya qilinadi
- Interview savollar user tanlagan tilga qarab generatsiya qilinadi
- Savollar `generated_interview_questions` da saqlanadi

---

## Support

Savollar yoki muammolar bo'lsa:

- 📧 Email: [LinkedIn](https://www.linkedin.com/in/abdulazizolimov)
- 💬 Telegram: [@AbdulazizAlimov](https://t.me/AbdulazizAlimov)
- 🐛 Issues: [GitHub Issues](https://github.com/abdulazizDevop/ai-recruiting-platform/issues)
