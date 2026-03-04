from django.core.mail import EmailMessage, get_connection
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings
from .models import EmailLog, User
import time
import logging
import secrets
import string

logger = logging.getLogger("email")

def generate_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def generate_strong_temp_password(length: int = 12) -> str:
    length = max(8, length)
    upper = string.ascii_uppercase
    lower = string.ascii_lowercase
    digits = string.digits
    special = "!@#$%^&*()-_=+[]{};:,.?/|"
    all_chars = upper + lower + digits + special
    # Ensure at least one from each category
    pwd = [
        secrets.choice(upper),
        secrets.choice(lower),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    pwd += [secrets.choice(all_chars) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)

def send_credentials_email(user: User, password: str, max_retries: int = 3, connection=None) -> EmailLog:
    name = (user.first_name or "") + (" " + user.last_name if user.last_name else "")
    name = name.strip() or user.username
    subject = "Welcome to CureOn"
    body = render_to_string("emails/credential.txt", {"name": name, "username": user.username, "password": password})

    log = EmailLog.objects.create(recipient=user.email, subject=subject, body=body, related_user=user)

    conn = connection or get_connection()
    attempts = 0
    last_error = None
    while attempts < max_retries:
        attempts += 1
        try:
            msg = EmailMessage(subject, body, getattr(settings, "DEFAULT_FROM_EMAIL", None), [user.email], connection=conn)
            msg.send(fail_silently=False)
            log.success = True
            log.attempts = attempts
            log.sent_at = timezone.now()
            log.save(update_fields=["success", "attempts", "sent_at"])
            logger.info("Credentials email sent", extra={"email": user.email, "user_id": user.id, "attempts": attempts})
            return log
        except Exception as e:
            last_error = str(e)
            logger.error("Credentials email failed", extra={"email": user.email, "user_id": user.id, "attempts": attempts, "error": last_error})
            time.sleep(min(2 ** (attempts - 1), 5))
    log.success = False
    log.attempts = attempts
    log.error = last_error
    log.save(update_fields=["success", "attempts", "error"])
    return log

def send_password_reset_email(user: User, temp_password: str, max_retries: int = 3, connection=None) -> EmailLog:
    name = (user.first_name or "") + (" " + user.last_name if user.last_name else "")
    name = name.strip() or user.username
    subject = "Your CureOn temporary password"
    body = render_to_string(
        "emails/password_reset.txt",
        {
            "name": name,
            "username": user.username,
            "password": temp_password,
        },
    )
    log = EmailLog.objects.create(recipient=user.email, subject=subject, body=body, related_user=user)
    conn = connection or get_connection()
    attempts = 0
    last_error = None
    while attempts < max_retries:
        attempts += 1
        try:
            msg = EmailMessage(subject, body, getattr(settings, "DEFAULT_FROM_EMAIL", None), [user.email], connection=conn)
            msg.send(fail_silently=False)
            log.success = True
            log.attempts = attempts
            log.sent_at = timezone.now()
            log.save(update_fields=["success", "attempts", "sent_at"])
            logger.info("Password reset email sent", extra={"email": user.email, "user_id": user.id, "attempts": attempts})
            return log
        except Exception as e:
            last_error = str(e)
            logger.error("Password reset email failed", extra={"email": user.email, "user_id": user.id, "attempts": attempts, "error": last_error})
            time.sleep(min(2 ** (attempts - 1), 5))
    log.success = False
    log.attempts = attempts
    log.error = last_error
    log.save(update_fields=["success", "attempts", "error"])
    return log

def send_bulk_credentials(users_with_passwords):
    conn = get_connection()
    results = []
    try:
        conn.open()
    except Exception:
        pass
    try:
        for user, pwd in users_with_passwords:
            results.append(send_credentials_email(user, pwd, connection=conn))
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return results
