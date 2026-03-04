from django.test import override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core import mail
from .services import generate_temp_password
from .models import EmailLog
from rest_framework.test import APITestCase

User = get_user_model()

@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class EmailTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(username="admin", email="admin@example.com", password="admin123", role="ADMIN")
        self.client.force_authenticate(user=self.admin)

    def test_send_on_admin_create_staff(self):
        url = reverse("create_staff")
        payload = {"username": "doctor1", "email": "doctor1@example.com", "role": "DOCTOR"}
        res = self.client.post(url, payload, content_type="application/json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data.get("email_sent") in [True, False])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Welcome to CureOn", mail.outbox[0].subject)
        self.assertTrue(EmailLog.objects.filter(recipient="doctor1@example.com").exists())

    def test_bulk_create_and_emails(self):
        url = reverse("admin_bulk_create_users")
        users = [
            {"username": "patient1", "email": "patient1@example.com", "role": "PATIENT"},
            {"username": "lab1", "email": "lab1@example.com", "role": "LAB"},
            {"username": "pharma1", "email": "pharma1@example.com", "role": "PHARMACY"},
        ]
        res = self.client.post(url, {"users": users}, content_type="application/json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(res.data.get("created", [])), 3)
        self.assertEqual(len(mail.outbox), 3)
        for m in mail.outbox:
            self.assertIn("Welcome to CureOn", m.subject)

    def test_manual_send_credentials(self):
        pwd = generate_temp_password()
        user = User.objects.create_user(username="d2", email="d2@example.com", password=pwd, role="DOCTOR")
        url = reverse("admin_send_credentials")
        res = self.client.post(url, {"user_id": user.id, "password": pwd}, content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get("sent") in [True, False])
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(EmailLog.objects.filter(recipient="d2@example.com").exists())
