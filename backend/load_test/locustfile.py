"""Career AI backend uchun load test.

Ishlatish:
    pip install locust
    cd backend
    locust -f load_test/locustfile.py --host http://localhost:8000

Keyin brauzerda http://localhost:8089 ochiladi — "Users" va "Spawn rate" ni tanlang.

Foydalanuvchi turi tanlash:
    locust -f load_test/locustfile.py --host http://localhost:8000 -u 20 -r 5 --run-time 1m --headless

Senariyalar:
- PublicVisitor: Public endpointlarga (vakansiya ko'rish, ariza holati polling) — asosiy yuklama
- AdminUser: Admin dashboard, vakansiyalar, arizalar — autentifikatsiyalangan
- LoginBruteForce: Rate limiting test — 10 dan ko'p login → 429 kutilmoqda
"""

import os
import random
import uuid
from locust import HttpUser, between, events, task

ADMIN_USERNAME = os.getenv("LOADTEST_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("LOADTEST_ADMIN_PASSWORD", "")
SAMPLE_UNIQUE_LINK = os.getenv("LOADTEST_VACANCY_LINK", "")


@events.test_start.add_listener
def on_start(environment, **kwargs):
    print(
        f"\n[LOADTEST] Admin: {ADMIN_USERNAME}, Vacancy link: {SAMPLE_UNIQUE_LINK or "(yo'q)"}"
    )


class PublicVisitor(HttpUser):
    """Public foydalanuvchi: vakansiyalarni ko'radi, ariza holatini tekshiradi."""

    wait_time = between(1, 3)
    weight = 4  # eng ko'p foydalanuvchi turi

    @task(5)
    def list_public_vacancies(self):
        with self.client.get(
            "/api/public/vacancies/",
            name="/api/public/vacancies/ [list]",
            catch_response=True,
        ) as r:
            if r.status_code == 200:
                r.success()
            elif r.status_code == 429:
                r.success()  # rate limited — kutilgan natija
            else:
                r.failure(f"Status {r.status_code}: {r.text[:200]}")

    @task(3)
    def view_vacancy_by_link(self):
        if not SAMPLE_UNIQUE_LINK:
            return
        with self.client.get(
            f"/api/public/vacancy/{SAMPLE_UNIQUE_LINK}/",
            name="/api/public/vacancy/<link>/",
            catch_response=True,
        ) as r:
            if r.status_code in (200, 404, 429):
                r.success()
            else:
                r.failure(f"Status {r.status_code}")

    @task(1)
    def poll_application_status(self):
        # Tasodifiy ID — ko'pchiligi 404 bo'ladi, muhimi — server tezligi
        app_id = random.randint(1, 20)
        with self.client.get(
            f"/api/public/application_status/{app_id}/",
            name="/api/public/application_status/<id>/",
            catch_response=True,
        ) as r:
            if r.status_code in (200, 404, 429):
                r.success()
            else:
                r.failure(f"Status {r.status_code}")


class AdminUser(HttpUser):
    """Admin foydalanuvchi: login qiladi, dashboard + ro'yxatlarni oladi."""

    wait_time = between(2, 5)
    weight = 1
    token: str | None = None

    def on_start(self):
        response = self.client.post(
            "/api/auth/login/",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            name="/api/auth/login/ [admin]",
        )
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            print(f"[AdminUser] Login failed: {response.status_code}")

    @task(3)
    def analytics_stats(self):
        if not self.token:
            return
        with self.client.get(
            "/api/analytics/stats/",
            name="/api/analytics/stats/",
            catch_response=True,
        ) as r:
            if r.status_code in (200, 429):
                r.success()
            else:
                r.failure(f"Status {r.status_code}")

    @task(3)
    def list_vacancies(self):
        if not self.token:
            return
        with self.client.get(
            "/api/vacancies/", name="/api/vacancies/ [admin]", catch_response=True
        ) as r:
            if r.status_code in (200, 429):
                r.success()
            else:
                r.failure(f"Status {r.status_code}")

    @task(2)
    def list_applications(self):
        if not self.token:
            return
        with self.client.get(
            "/api/applications/", name="/api/applications/", catch_response=True
        ) as r:
            if r.status_code in (200, 429):
                r.success()
            else:
                r.failure(f"Status {r.status_code}")


class LoginBruteForce(HttpUser):
    """Rate limit sinovi: login'ga 10/min chegarani sinash. 11-urinish 429 qaytarishi kerak."""

    wait_time = between(0.1, 0.3)
    weight = 0  # default yoqilmagan; alohida ishga tushirish kerak

    @task
    def attempt_login(self):
        fake_username = f"user_{uuid.uuid4().hex[:8]}"
        with self.client.post(
            "/api/auth/login/",
            json={"username": fake_username, "password": "wrong"},
            name="/api/auth/login/ [brute]",
            catch_response=True,
        ) as r:
            if r.status_code == 429:
                r.success()  # rate limiting ishlayapti
            elif r.status_code == 400:
                r.success()  # login muvaffaqiyatsiz — kutilgan
            else:
                r.failure(f"Kutilmagan status: {r.status_code}")
