# 11 – Third-Party Integrations

This document details the third-party integrations in Camp-Exchange, their environment variables, security safeguards, fallback behaviors, and instructions for testing.

---

## Security Principles

1. **Zero Secret Leakage**: Secrets reside exclusively in `server/.env`. Only publishable values (`VITE_TURNSTILE_SITE_KEY`) are placed in `client/.env`.
2. **Safe Inspection**: Never log, echo, or commit secret values. Use `scripts/check-env.ps1` to inspect presence (`set` / `missing`) by variable name only.
3. **Graceful Fallbacks**: Every integration is optional. If any integration key is missing, the application logs a single startup warning and falls back to local or rule-based behavior without crashing.
4. **Input Validation**: All environment variables are validated via Zod in `server/src/config/env.ts`.

---

## 1. Cloudinary (Image Storage)

### Environment Variables
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name (Server)
- `CLOUDINARY_API_KEY`: Cloudinary API key (Server)
- `CLOUDINARY_API_SECRET`: Cloudinary API secret (Server)

### Implementation Details
- **Upload Pipeline**: Incoming images pass through the Multer + Sharp pipeline (`upload.middleware.ts` & `upload.service.ts`). Sharp normalizes rotation, resizes to max 1200×1200px (full) and 400×400px (thumb), converts to WebP (quality 80/75), and strips all EXIF metadata.
- **Listing & Avatar Images**: Uploaded with `type: 'upload'` (public delivery). Stored in `camp-exchange/listings` or `camp-exchange/avatars`.
- **Payment Proofs**: Uploaded with `type: 'private'`. Proofs are never accessible through public URLs. They are stored with a `proofCloudinaryId` and served via `GET /api/uploads/proof/:orderId`.
- **Private Delivery Access**: `GET /api/uploads/proof/:orderId` validates that the requesting user is either the buyer or the seller of that specific order. If authorized, it generates a short-lived (5-minute / 300s) signed Cloudinary URL.
- **Fallback Behavior**: If any Cloudinary key is missing or an upload fails, images are stored locally under `uploads/` (served statically at `/uploads/filename.webp`). For payment proofs stored locally, `GET /api/uploads/proof/:orderId` acts as the authenticated gateway.

### How to Test
```powershell
# Run automated upload & fallback test suite
npm run test -w server -- src/modules/uploads/upload.test.ts
```

---

## 2. Resend (Transactional Email & OTP)

### Environment Variables
- `RESEND_API_KEY`: Resend API key (Server)
- `EMAIL_FROM`: Sender email address (Optional, defaults to `noreply@${COLLEGE_EMAIL_DOMAIN}`)

### Implementation Details
- **Email OTP at Registration**:
  - 6-digit numeric verification code generated cryptographically.
  - Hashed with `bcrypt` before storage in `OtpCode` table.
  - 10-minute expiry window.
  - Maximum of 5 incorrect attempts before the code is invalidated (`MAX_ATTEMPTS_EXCEEDED`).
  - 60-second cooldown between resend requests (`OTP_COOLDOWN`).
  - Domain enforcement: Only emails ending in `@${COLLEGE_EMAIL_DOMAIN}` may register.
- **Transactional Notifications**:
  - `sendProofReceivedEmail`: Sent to seller when buyer uploads payment proof.
  - `sendOrderConfirmedEmail`: Sent to buyer when seller confirms payment.
  - `sendOrderRejectedEmail`: Sent to buyer when seller rejects proof.
  - `sendChatNotificationEmail`: Sent to offline recipient when a new chat message arrives, throttled to 1 email per conversation per 15 minutes.
- **Queueing & Templates**: All email dispatches run asynchronously in a fire-and-forget background queue so API responses are never delayed by email delivery. Templates use clean, high-contrast, squarish email HTML without external tracking images.
- **Fallback Behavior**: If `RESEND_API_KEY` is missing, email dispatch functions gracefully no-op.

### How to Test
```powershell
# Run automated OTP flow and rate-limiting tests
npm run test -w server -- src/modules/auth/integrations.test.ts
```

---

## 3. Cloudflare Turnstile (Bot Protection)

### Environment Variables
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile Secret Key (Server)
- `VITE_TURNSTILE_SITE_KEY`: Cloudflare Turnstile Site Key (Client `.env`)

### Implementation Details
- **Protected Endpoints**:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/resend-otp`
- **Verification Middleware**: `server/src/middleware/turnstile.ts` calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` with the response token and client IP.
- **Fail-Closed in Production**: In production (`NODE_ENV=production`), missing or invalid tokens reject the request with 400 `CAPTCHA_VERIFICATION_FAILED`.
- **Development Fallback**: In development, if `TURNSTILE_SECRET_KEY` is not configured, the middleware passes through without blocking.
- **Client Widget**: `TurnstileWidget.tsx` dynamically mounts the Cloudflare Turnstile script and widget, reporting tokens to form handlers.

### How to Test
```powershell
# Run production fail-closed verification test
npm run test -w server -- src/modules/auth/integrations.test.ts
```

---

## 4. Gemini (NLP Enhancer)

### Environment Variables
- `GEMINI_API_KEY`: Google AI Gemini API Key (Server/NLP)

### Implementation Details
- **Enhancer Pipeline**: `nlp/app/pipeline/gemini.py` extends the offline rule-based pipeline in `nlp/app/main.py`.
- **Strict Constraints**: Prompt specifies: *"Do not add any fact not present in the input. Stick only to the details provided."*
- **PII Scrubbing**: Strips phone numbers, email addresses, and UPI IDs using regex (`strip_pii`) before transmitting data to the model.
- **Timeout & Fact Verification**: Enforces a strict 3.0-second timeout. Validates that all extracted slot facts (brand, model, condition) still appear in the rewritten description.
- **Response Indicator**: Response includes `"source": "gemini" | "rules"`.
- **Client Suggestion Panel**: `NewListingPage.tsx` displays a badge next to the suggestion indicating `✦ gemini` or `rules`.
- **Fallback Behavior**: If `GEMINI_API_KEY` is missing, the request times out (>3s), or any extracted fact is omitted, the service falls back immediately to the deterministic rule-based output (`source: "rules"`).

### How to Test
```powershell
# Run Python NLP and Gemini fallback test suite
npm run test:nlp
```

---

## 5. OCR Hint (Tesseract Payment Proof Reader)

### Environment Variables
- None required (local OCR binary / Python library)

### Implementation Details
- **Endpoint**: `POST /ocr-hint` on NLP service (:8001).
- **Detection**: Inspects payment screenshot text for amounts (₹/Rs./INR patterns) and 12-digit UPI reference numbers / UTRs.
- **Disclaimer**: Always returns: *"Detected hint only - payments are peer to peer and must be confirmed manually. Not a payment verification."*
- **Graceful Fallback**: If `pytesseract` or the Tesseract Windows binary is not installed, returns `available: false` with installation instructions without failing.
- **Windows Installation**:
  ```powershell
  winget install UB-Mannheim.TesseractOCR
  pip install pytesseract pillow
  ```

---

## Summary of Fallback Behavior

| Integration | Variable(s) | Fallback Behavior | Fallback Source/Mode |
| :--- | :--- | :--- | :--- |
| **Cloudinary** | `CLOUDINARY_*` | Local WebP storage in `uploads/` | `storage: "local"` |
| **Resend** | `RESEND_API_KEY` | Async queue no-ops; registration & orders proceed | In-memory no-op |
| **Turnstile** | `TURNSTILE_*` | Bypassed in dev/test; fail-closed in production | Dev bypass |
| **Gemini** | `GEMINI_API_KEY` | Rule-based template composer | `source: "rules"` |
| **Tesseract** | Binary / `pytesseract` | Skips detection; returns manual verification prompt | `available: false` |
