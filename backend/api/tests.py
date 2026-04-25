from rest_framework.test import APITestCase
from rest_framework import status
from .models import User, ApplicantProfile


class VacancyTests(APITestCase):
    def setUp(self):
        self.password = "Passw0rd!"
        self.user = User.objects.create_user(
            username="employer1",
            password=self.password,
            email="e1@test.com",
            full_name="Emp One",
            phone="+99890",
            company_name="Test Company",
            company_location="Tashkent",
        )

        # Login va token olish
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "employer1", "password": self.password},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.token = resp.data["token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def _create_vacancy(self):
        payload = {
            "title": "Backend Dev",
            "description": "Desc",
            "requirements": "Django, REST",
            "responsibilities": "Build APIs",
            "work_type": "remote",
            "work_schedule": "full-time",
            "location": "Tashkent",
            "experience_years": 1,
            "experience_months": 0,
            "ai_criteria": {},
            "ai_prompt": "",
            "min_match_score": 60,
        }
        resp = self.client.post(
            "/api/vacancies/", data=payload, format="json", **self.auth_headers
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        return resp.data["data"]["id"]

    def test_vacancy_create_and_public_listing(self):
        self._create_vacancy()

        # Public vacancies should list it
        resp2 = self.client.get("/api/public/vacancies/?location=Tashkent")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data["success"])

    def test_public_application_returns_session_credentials(self):
        vacancy_id = self._create_vacancy()
        payload = {
            "vacancy": vacancy_id,
            "full_name": "Applicant One",
            "phone": "+998901234567",
            "age": 25,
            "address": "Tashkent",
        }
        resp = self.client.post(
            "/api/public/submit_application/", data=payload, format="multipart"
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data["success"])
        self.assertIn("session", resp.data)
        session = resp.data["session"]
        self.assertIn("username", session)
        self.assertIn("password", session)

        profile_exists = ApplicantProfile.objects.filter(
            phone=payload["phone"]
        ).exists()
        self.assertTrue(profile_exists)


# Create your tests here.
