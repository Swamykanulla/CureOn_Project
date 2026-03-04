from django.test import override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone
from rest_framework.test import APITestCase
from datetime import timedelta
import re
import json

User = get_user_model()

@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ForgotPasswordTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", email="alice@example.com", password="StrongPass!1", role="PATIENT")

    def test_forgot_password_success_and_email(self):
        url = reverse("forgot_password")
        res = self.client.post(url, {"username": "alice"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.force_password_change)
        self.assertIsNotNone(self.user.password_reset_expires)
        self.assertGreater(self.user.password_reset_expires, timezone.now())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("temporary password", mail.outbox[0].subject.lower())

    def _extract_temp_password_from_email(self):
        self.assertTrue(len(mail.outbox) >= 1)
        body = mail.outbox[-1].body
        m = re.search(r"Your temporary password:\s*([^\s]+)", body)
        self.assertIsNotNone(m)
        return m.group(1).strip()

    def test_login_with_temp_requires_change_and_single_use(self):
        url = reverse("forgot_password")
        self.client.post(url, {"username": "alice"}, format="json")
        temp = self._extract_temp_password_from_email()
        login_url = reverse("token_obtain_pair")
        res = self.client.post(login_url, {"username": "alice", "password": temp}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get("must_change_password"))
        access = res.data["access"]
        # second login attempt with same temp should fail
        res2 = self.client.post(login_url, {"username": "alice", "password": temp}, format="json")
        self.assertEqual(res2.status_code, 400)
        # Using old token should be valid until password actually changed
        me_url = reverse("user_detail")
        r = self.client.get(me_url, HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(r.status_code, 200)
        # Change password now
        change_url = reverse("change_password")
        r2 = self.client.post(change_url, {"current_password": temp, "new_password": "NewStrong!2"}, HTTP_AUTHORIZATION=f"Bearer {access}", format="json")
        self.assertEqual(r2.status_code, 200)
        # Old token should now be invalid due to iat < password_changed_at
        r3 = self.client.get(me_url, HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(r3.status_code, 401)

    def test_nonexistent_username(self):
        url = reverse("forgot_password")
        res = self.client.post(url, {"username": "ghost"}, format="json")
        self.assertEqual(res.status_code, 404)

    def test_expired_temp_password(self):
        url = reverse("forgot_password")
        self.client.post(url, {"username": "alice"}, format="json")
        temp = self._extract_temp_password_from_email()
        self.user.refresh_from_db()
        self.user.password_reset_expires = timezone.now() - timedelta(hours=1)
        self.user.save(update_fields=["password_reset_expires"])
        login_url = reverse("token_obtain_pair")
        res = self.client.post(login_url, {"username": "alice", "password": temp}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_rate_limit_and_captcha_required(self):
        url = reverse("forgot_password")
        for _ in range(3):
            self.client.post(url, {"username": "alice"}, format="json")
        res = self.client.post(url, {"username": "alice"}, format="json")
        self.assertIn(res.status_code, [429, 429])
