# Forgot Password Flow

## API Endpoints

- POST /api/auth/forgot-password/
  - Body: { "username": "<username or email>", "captcha_token": "<optional>" }
  - Success: 200 { "email_sent": true|false }
  - Errors:
    - 400 { "detail": "username is required" }
    - 404 { "detail": "User not found" }
    - 429 { "detail": "captcha_required" } after multiple requests from same IP

- POST /api/auth/login/ (SimpleJWT)
  - Body: { "username": "<username or email>", "password": "<password>" }
  - Success includes tokens and optional flags:
    - { "access": "...", "refresh": "...", "must_change_password": true, "password_reset_expires": "ISO8601" }
  - Errors:
    - 401 if temporary password is expired or already used

- POST /api/auth/change-password/
  - Body: { "current_password": "<temporary>", "new_password": "<strong>" }
  - Rules: 8+ chars, uppercase, lowercase, digit, special
  - On success: clears reset flags and updates password

## Email Template

Sends username, temporary password, usage instructions, and reminder to change it. Delivery attempts are retried and logged in EmailLog.

## Security

- Rate limiting: max 5/hour per IP (DRF ScopedRateThrottle)
- CAPTCHA gate: requires `captcha_token` after 3 attempts in 1 hour
- Logging: PasswordResetLog records attempts (username, IP, success, error)
- Single-use temporary password: accepted once; next login with it is rejected
- Session invalidation: tokens issued before `password_changed_at` are rejected

## Database

- User fields: password_reset_expires, password_reset_used, force_password_change, password_changed_at
- Indexes on the above for performance
- PasswordResetLog with indexes on (username, created_at) and (ip, created_at)

## User Instructions

1. On the login page, click “Forgot password?”
2. Enter your username or email; you’ll receive a temporary password
3. Sign in with the temporary password
4. You will be redirected to set a new password
5. Choose a strong password as per the rules

If you didn’t request a reset, ignore the email.
