# 09 – Security, Performance, Testing

## Security
- Passwords: bcrypt cost 12. Imported temporary passwords are changed on first login; new passwords require at least 8 characters with letters and digits. Never log passwords, hashes, or database URLs.
- PRN login: generic failure message for unknown PRNs and bad passwords; dummy bcrypt compare for unknown PRNs; lock after 5 failed attempts for 15 minutes; auth rate limit 10/minute/IP.
- Session invalidation: JWT carries `tokenVersion`; password changes and administrator resets increment it.
- Session: JWT 7d in httpOnly, `SameSite=Lax`, `Secure` in prod cookie. CSRF: SameSite + custom header check on mutating requests.
- Helmet, CORS allow-list (`CLIENT_ORIGIN`), `express-rate-limit`: auth 10/min/IP, general 200/min, upload 20/min, chat 30/min.
- Zod validation on body/query/params. Reject unknown fields.
- Authorisation checks in services (owner/participant/seller/buyer) – never trust ids from client.
- Uploads: MIME sniffing (file-type), size cap, sharp re-encode (strips EXIF/GPS), random filenames, served from `/uploads` with `X-Content-Type-Options: nosniff`.
- Payment proofs only viewable by the buyer and seller (serve via authenticated route, not public static).
- Output encoding: render user text as text; no `dangerouslySetInnerHTML`.
- Secrets only in `.env`; `.env` in `.gitignore`.
- Report flow + admin removal for abusive listings/users.
- Scam warnings in chat and checkout.

## Performance
- Lighthouse ≥ 90. Bundle: route-split, tree-shaken icons, initial JS < 180KB gzip.
- Image pipeline: WebP, 400px thumb + 1200px full, `srcset`, lazy loading, fixed aspect-ratio to avoid CLS.
- DB indexes per doc 03; cursor pagination; select only needed fields.
- Gzip/brotli (`compression`), cache headers on static uploads.
- React Query `staleTime` 30s for lists; prefetch listing on card hover.

## Testing
| Layer | Tool | Minimum |
|---|---|---|
| Server | Vitest + Supertest | auth, student import, listings CRUD, order state machine, chat authorisation; use only `camp_exchange_test` |
| Client | Vitest + Testing Library | ListingCard, FilterBar, shortcuts, UpiQr |
| E2E | Playwright | imported PRN login → forced password change → list → buy → proof → confirm → chat (2 browser contexts) |
| NLP | pytest | golden set + classifier F1 |
| A11y | axe via Playwright | no serious violations on main pages |

## Responsive QA matrix
320×640, 375×812, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080, 2560×1440, 3440×1440. No horizontal scroll, no overlapping UI, no unused huge gutters.

## Windows QA
Run on Windows 11 with Edge + Chrome; verify scripts in PowerShell and CMD; verify file paths for uploads; verify `Ctrl` shortcuts don't clash with browser defaults.
