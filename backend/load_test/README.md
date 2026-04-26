# Load test — Career AI backend

## O'rnatish

```bash
pip install locust
```

## Ishga tushirish

**Backend ishlab turganligini tekshiring.** Platformaga qarab server tanlang:

### Windows — waitress (gunicorn ishlamaydi, `fcntl` Unix-only)

```bash
pip install waitress
cd backend
waitress-serve --host=0.0.0.0 --port=8000 --threads=8 ai_recruiting_system.wsgi:application
```

### Linux / macOS (production server) — gunicorn

```bash
pip install gunicorn
cd backend
gunicorn ai_recruiting_system.wsgi:application --workers 4 --threads 2 --bind 0.0.0.0:8000
```

### Yoki Django runserver (tez sinash uchun)

```bash
python manage.py runserver 0.0.0.0:8000
```

Django 2.1+ runserver har so'rovni alohida threadda bajaradi — konkurrent sinov uchun yetarli, lekin production uchun waitress/gunicorn tavsiya qilinadi.

## Environment o'zgaruvchilari

```bash
# Admin credentials (admin scenario uchun)
export LOADTEST_ADMIN_USERNAME=admin
export LOADTEST_ADMIN_PASSWORD=your_password_here

# Test qilmoqchi bo'lgan vakansiya unique_link (public vacancy detail uchun)
export LOADTEST_VACANCY_LINK=ABC123XYZ
```

Windows PowerShell'da:

```powershell
$env:LOADTEST_ADMIN_USERNAME="admin"
$env:LOADTEST_ADMIN_PASSWORD="your_password_here"
$env:LOADTEST_VACANCY_LINK="ABC123XYZ"
```

## Web UI rejimi (interaktiv)

```bash
cd backend
locust -f load_test/locustfile.py --host http://localhost:8000
```

Keyin [http://localhost:8089](http://localhost:8089) ochiladi:

- **Number of users**: 10, 20, 50 (konkurrent foydalanuvchilar)
- **Spawn rate**: 2-5 (soniyasiga qancha user yangi ishga tushadi)
- **Host**: <http://localhost:8000>

## CLI (headless) rejim

20 user, 1 daqiqa, reportni `report.html` ga yozadi:

```bash
locust -f load_test/locustfile.py --host http://localhost:8000 \
  -u 20 -r 5 --run-time 1m \
  --headless --html report.html
```

## Natijalarni o'qish

- **Request/s (RPS)** — sekundiga nechta so'rov
- **Median / 95%ile / 99%ile** — kechikish (millisekundda). p95 < 500ms bo'lsa yaxshi
- **Failures** — muvaffaqiyatsiz so'rovlar. `429` (Too Many Requests) — bu rate limiting ishlayapti, normal. 500/timeout — bu muammo

## Sinov ssenariyalari

Locustfile ichida 3 ta klass:

1. **PublicVisitor** (weight=4): Asosiy — public vakansiyalar, ariza statusi polling. 80% yuklama shu yerga tushadi.
2. **AdminUser** (weight=1): Admin login + dashboard + ro'yxatlar.
3. **LoginBruteForce** (weight=0 default): Rate limit testi — alohida ishga tushirish kerak:

   ```bash
   locust -f load_test/locustfile.py LoginBruteForce --host http://localhost:8000 -u 5 -r 5 --run-time 30s --headless
   ```

## 10-20 user uchun ko'rsatkichlar

Sog'lom tizim uchun (bir vaqtda 20 user, 1 daqiqa davomida):

- RPS: 50-150 req/s
- Median: < 100ms (static endpoints), < 500ms (DB-heavy)
- p95: < 1s
- Failures: faqat 429 (throttled) — 500/timeout bo'lmasligi kerak

**Muhim**: AI endpointlari (submit_application, interview/*) rate limited — bu ssenariyda ular real sinov uchun qulay emas, chunki 5/hour chegarasi bor. AI pipeline concurrency uchun alohida skript kerak.
