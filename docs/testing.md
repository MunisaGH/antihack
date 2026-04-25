# Testing Guide

## Talablar

- Python 3.11+
- Django development environment sozlangan
- Dev cache sozlangan (LocMemCache) - `settings.py`da mavjud
- Test database (SQLite in-memory)

---

## Testlarni Ishga Tushirish

### Barcha Testlarni Ishlatish

```bash
cd backend
python manage.py test api -v 2
```

### Muayyan Test Classini Ishlatish

```bash
python manage.py test api.tests.TestAuthentication -v 2
```

### Muayyan Test Methodini Ishlatish

```bash
python manage.py test api.tests.TestAuthentication.test_login_success -v 2
```

### Coverage Report (agar pytest-cov o'rnatilgan bo'lsa)

```bash
pytest --cov=api --cov-report=html
```

---

## Test Qamrovi

### Authentication Tests

- ✅ Login success
- ✅ Login with invalid credentials
- ✅ Logout functionality
- ✅ Token refresh (if implemented)

### Subscription Tests (if implemented)

- ✅ Subscription status check
- ✅ Subscription features retrieval
- ✅ Subscription usage tracking
- ✅ Limits enforcement (company/vacancy/application)

### Vacancy Management Tests

- ✅ Vacancy creation
- ✅ Vacancy listing
- ✅ Vacancy retrieval
- ✅ Vacancy update
- ✅ Vacancy deletion
- ✅ Vacancy limits (if subscription-based)

### Application Tests

- ✅ Application submission
- ✅ Application listing
- ✅ Application retrieval
- ✅ Application status update
- ✅ Application limits (if subscription-based)

### Public Endpoints Tests

- ✅ Public vacancies listing
- ✅ Public vacancies filtering
- ✅ Public vacancy retrieval by unique link
- ✅ Platform statistics
- ✅ Public application submission

### AI Service Tests

**Eslatma:** AI xizmatlari integration testlarda mock qilinishi kerak (production API chaqiriqlarini oldini olish uchun).

- ✅ Resume analysis (mock)
- ✅ Interview question generation (mock)
- ✅ Compatibility score calculation

---

## Test Structure

### Test File Location

```
backend/api/tests.py
```

### Example Test Structure

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from api.models import Vacancy, Application

User = get_user_model()

class TestAuthentication(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_login_success(self):
        """Test successful login"""
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('refresh_token', response.data)
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

---

## Mock Tavsiyalar

### AI Services Mock

AI xizmatlarini mock qilish uchun:

```python
from unittest.mock import patch, MagicMock
from api.services.ai_service import AIResumeAnalyzer

class TestApplicationSubmission(TestCase):
    @patch('api.services.ai_service.AIResumeAnalyzer.analyze_resume')
    def test_application_with_ai_analysis(self, mock_analyze):
        """Test application submission with AI analysis"""
        # Mock AI response
        mock_analyze.return_value = {
            'success': True,
            'compatibility_score': 85,
            'analysis_result': {...},
            'strengths': ['Strong Python skills'],
            'weaknesses': [],
            'recommendations': [],
            'decision': 'proceed'
        }
        
        # Test application submission
        # ...
```

### File Upload Mock

```python
from django.core.files.uploadedfile import SimpleUploadedFile

class TestFileUpload(TestCase):
    def test_resume_upload(self):
        """Test resume file upload"""
        resume_file = SimpleUploadedFile(
            "resume.pdf",
            b"file_content",
            content_type="application/pdf"
        )
        
        response = self.client.post('/api/public/submit_application/', {
            'vacancy': vacancy_id,
            'full_name': 'Test User',
            'phone': '+998901234567',
            'resume_file': resume_file
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

---

## Test Database

- Testlar uchun alohida in-memory SQLite database ishlatiladi
- Har bir test o'zining database state bilan ishlaydi
- `setUp()` methodida test data yaratiladi
- `tearDown()` methodida cleanup amalga oshiriladi (agar kerak bo'lsa)

---

## Continuous Integration

### GitHub Actions Example (kelajakda)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          python manage.py test api -v 2
```

---

## Best Practices

1. **Test Isolation:** Har bir test mustaqil bo'lishi kerak
2. **Clear Test Names:** Test nomlari aniq va descriptive bo'lishi kerak
3. **Arrange-Act-Assert:** Test strukturasini aniq bo'lishi kerak
4. **Mock External Services:** AI va boshqa external servislarni mock qiling
5. **Test Coverage:** Muhim business logic uchun test coverage yuqori bo'lishi kerak
6. **Fast Tests:** Testlar tez ishlashi kerak (in-memory database ishlatish)

---

## Troubleshooting

### Test Database Migration Issues

```bash
# Migrationlarni qo'llash
python manage.py migrate --run-syncdb
```

### Import Errors

```bash
# Python path ni tekshirish
python manage.py shell
>>> import api
```

### Test Data Cleanup

Agar test data cleanup muammosi bo'lsa:

```python
def tearDown(self):
    # Manual cleanup
    User.objects.all().delete()
    Vacancy.objects.all().delete()
    Application.objects.all().delete()
```

---

## Additional Resources

- [Django Testing Documentation](https://docs.djangoproject.com/en/4.2/topics/testing/)
- [DRF Testing Documentation](https://www.django-rest-framework.org/api-guide/testing/)
- [pytest-django](https://pytest-django.readthedocs.io/)

---

## Eslatma

- Test DB memoryda yaratiladi
- Agar qo'shimcha app test kiritilsa: `python manage.py test` bilan barcha testlar yuguradi
- Production API chaqiriqlarini oldini olish uchun AI servislarni mock qiling
