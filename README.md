<div align="center">

# Career AI

**AI-powered ishga qabul qilish platformasi**

Rezyumeni Google Gemini bilan tahlil qiladi, adaptiv chat-suhbatlar o'tkazadi, namzodlarni avtomatik baholaydi.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-4.2-green.svg)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Pro-orange.svg)](https://ai.google.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192.svg)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Sayt](https://career-ai.uz) · [Issues](https://github.com/MunisaGH/antihack/issues)

</div>

---

## Mundarija

- [Loyiha haqida](#loyiha-haqida)
- [Asosiy xususiyatlar](#asosiy-xususiyatlar)
- [Texnik stek](#texnik-stek)
- [Loyiha strukturasi](#loyiha-strukturasi)
- [Local development](#local-development)
- [Production deploy](#production-deploy)
- [Muhim buyruqlar](#muhim-buyruqlar)
- [Litsenziya](#litsenziya)

---

## Loyiha haqida

Career AI — bir administrator boshqaradigan AI ishga qabul platformasi. Nomzodlar ro'yxatdan o'tmaydi, ular vakansiyaga havola orqali kirib, rezyume yuklashadi va AI orqali filtratsiyadan o'tishadi. O'tganlar oynali chat orqali **adaptiv suhbat** topshirishadi — Gemini har bir savolni nomzodning rezyumesi, vakansiya darajasi (intern / junior / mid / senior) va oldingi javoblariga qarab tuzadi.

### Ish oqimi

1. Namzod vakansiyaga `/apply/:link` orqali kiradi
2. Shaxsiy ma'lumot + rezyume (PDF/DOCX) yuboradi
3. Gemini rezyume va vakansiyani taqqoslaydi → moslik bali chiqaradi
4. O'tsa, login/parol olib `/interview/:id` ga boradi
5. 10 ta adaptiv savol (streaming, SSE orqali)
6. Javoblar baholanib, final ball chiqadi
7. Admin paneldan namzodlarni ko'rib, hire/reject qiladi

### Tillar

UZ (asosiy) va RU. Tarjimalar Gemini Flash orqali avtomatik qilinadi.

---

## Asosiy xususiyatlar

- **AI rezyume tahlili** — Gemini 2.5 Pro bilan strukturaviy output (ball, kuchli/zaif tomonlar, tavsiya)
- **Adaptiv chat suhbat** — har savol oldingi javobdan kelib chiqadi, SSE streaming
- **Off-topic detection** — javob mavzuga aloqasiz yoki gibberish bo'lsa suhbat to'xtaydi (liberal, faqat aniq buzuvchilar)
- **Credentials gating** — login/parol FAQAT AI filtratsiyadan o'tgan namzodga beriladi
- **2 tilli tahlil** — UZ va RU versiyalari avtomatik saqlanadi
- **Vakansiya AI yordamchi** — qisqa brief'dan to'liq vakansiya matni yaratadi, keyin UZ → RU tarjima qiladi
- **Rate limiting** — endpoint darajasida (login, submit, interview, AI)
- **SQLite va PostgreSQL** — local uchun SQLite, production uchun PostgreSQL (SSL majburiy)
- **Dark mode** — liquid glass dizayn
- **Mobile-first** — bottom navigation, responsive

---

## Texnik stek

### Backend
- **Python 3.12** / **Django 4.2** / **DRF 3.14**
- **google-genai 1.73.1** — Gemini SDK (Pro, Flash, Flash-Lite)
- **djangorestframework-simplejwt** — JWT auth
- **PostgreSQL 16** — production (SSL majburiy)
- **Gunicorn** — WSGI server (gthread worker)
- **python-magic** — MIME validatsiya
- **python-docx**, **PyPDF2** — rezyume parsing

### Frontend
- **React 19** + **Vite 7** + **TypeScript**
- **TanStack Query v5** — server state
- **Tailwind CSS 4** — styling
- **Radix UI** — primitives (dialog, select, dropdown, tabs)
- **React Hook Form** + **Zod** — forms
- **Framer Motion** — animatsiya
- **i18next** — UZ/RU lokalizatsiya
- **React Router v7** — routing (lazy loaded)

### Infra
- **Docker** (backend)
- **Nginx** (reverse proxy, SSL termination, static serving)
- **Certbot** (Let's Encrypt)
- **UFW** + **fail2ban**

---

## Loyiha strukturasi

```
ai-recruiting-platform/
├── backend/
│   ├── ai_recruiting_system/     # Django project config
│   ├── api/
│   │   ├── models.py             # User, Vacancy, Application, Interview
│   │   ├── views.py              # REST + SSE endpoints
│   │   ├── serializers.py
│   │   ├── throttles.py          # Rate limiting
│   │   ├── validators.py         # File/phone validation
│   │   ├── migrations/
│   │   └── services/
│   │       ├── ai_service.py                # Rezyume tahlili
│   │       ├── ai_interview_service.py      # Chat suhbat (streaming)
│   │       ├── ai_analysis_translate.py     # UZ↔RU tarjima
│   │       ├── tasks.py                     # Background thread
│   │       └── notifications.py
│   ├── load_test/                # Locust + AI flow test
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── requirements.txt
│   └── .env.production.example
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Lazy-loaded routes
│   │   ├── api/                  # Axios client + endpoints
│   │   ├── components/           # UI (Radix + cva)
│   │   ├── features/             # Page-level (auth, applications, vacancies, interview, public)
│   │   ├── hooks/                # use-auth, use-theme
│   │   ├── i18n/                 # UZ/RU translations
│   │   ├── lib/                  # cn, phone, clipboard
│   │   └── routes/               # protected-route
│   ├── vite.config.ts            # Manual chunks (vendor split)
│   └── .env.production
│
├── deploy/
│   └── nginx/
│       └── career-ai.uz.conf
│
├── docker-compose.yml            # Backend service
├── deploy.sh                     # Avtomatik deploy skripti
└── README.md
```

---

## Local development

### Talablar
- Python 3.12+
- Node.js 20+
- Git

### Backend

```bash
cd backend

# Virtualenv
python -m venv .venv
source .venv/bin/activate    # Linux/Mac
.venv\Scripts\activate       # Windows

# Deps
pip install -r requirements.txt

# Env
cp .env.production.example .env
# .env ni tahrirlang: DEBUG=True, GEMINI_API_KEY=...

# DB (SQLite default)
python manage.py migrate
python manage.py createsuperuser

# Ishga tushirish
python manage.py runserver
# http://localhost:8000
```

### Frontend

```bash
cd frontend

# Deps
npm install

# Env
cp .env.example .env
# .env: VITE_API_BASE_URL=http://localhost:8000/api

# Dev server
npm run dev
# http://localhost:5173
```

### Gemini API kalit olish

1. [Google AI Studio](https://aistudio.google.com/) ga kiring
2. "Get API key" → yangi loyiha
3. `.env` ga `GEMINI_API_KEY=...` qatorida qo'ying

---

## Production deploy

### Arxitektura

```
DB server                         Production server
├── PostgreSQL 16 (native)         ├── Nginx (host, 80/443)
├── SSL majburiy                   ├── Docker backend (127.0.0.1:8010)
├── Faqat prod IP dan kirish       ├── Frontend static (/var/www)
└── UFW + fail2ban                 └── Certbot SSL
```

2 ta server — DB va production alohida. Ulanish SSL orqali, faqat production IP ruxsat etilgan.

### Birinchi deploy

```bash
# 1. Server ga ulanish
ssh root@YOUR_SERVER_IP

# 2. Loyihani clone qilish
cd /opt
git clone https://github.com/MunisaGH/antihack.git career-ai
cd career-ai
chmod +x deploy.sh backend/entrypoint.sh

# 3. .env.production yaratish
cp backend/.env.production.example backend/.env.production
nano backend/.env.production
# SECRET_KEY, DATABASE_PASSWORD, GEMINI_API_KEY to'ldiring

# SECRET_KEY generatsiya:
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# 4. Birinchi deploy
./deploy.sh

# 5. SSL
sudo certbot --nginx -d YOUR_DOMAIN --agree-tos -m admin@example.com --redirect

# 6. Superuser yaratish
docker compose exec backend python manage.py createsuperuser
```

### Keyingi deploy'lar

```bash
ssh root@YOUR_SERVER_IP
cd /opt/career-ai
./deploy.sh
```

Bu avtomatik bajaradi:
- `git pull`
- Backend image'ni qayta quradi
- Migrate va collectstatic
- Frontend'ni `node:20-alpine` ichida build qiladi
- Gunicorn'ni qayta ishga tushiradi

### Deploy flaglar

```bash
./deploy.sh --skip-pull          # git pull o'tkazib yuborish
./deploy.sh --skip-frontend      # frontend build o'tkazib yuborish
./deploy.sh --skip-backend       # backend build o'tkazib yuborish
./deploy.sh --nginx-update       # nginx config ni qayta o'rnatish
```

---

## Muhim buyruqlar

### Backend

```bash
# Loglar
docker compose logs backend -f

# Shell
docker compose exec backend python manage.py shell

# Migratsiyalar
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# Superuser
docker compose exec backend python manage.py createsuperuser

# Qayta ishga tushirish
docker compose restart backend
```

### Frontend

```bash
# Bundle tahlili (stats.html generatsiya qiladi)
ANALYZE=1 npm run build

# Typecheck
npm run typecheck

# Lint
npm run lint
```

### Load test

```bash
cd backend/load_test

# Locust — public sahifalarni sinash
locust -f locustfile.py --host=https://YOUR_DOMAIN

# AI pipeline test (5 ta arizachi parallel)
python ai_flow_test.py
```

---

## Xavfsizlik

- Barcha endpointlar rate-limited (login, submit, AI calls)
- Rezyume fayli MIME type + extension + hajm validatsiyasi
- JWT blacklist after rotation
- HSTS, X-Frame-Options, Content-Type-Options header'lar
- DB ulanishlar SSL majburiy
- fail2ban SSH brute-force'dan himoya
- UFW firewall — faqat kerakli portlar

---

## Litsenziya

MIT — [LICENSE](LICENSE)

---

<div align="center">

Made with ❤️ by [abdulazizDevop](https://github.com/abdulazizDevop)

</div>
