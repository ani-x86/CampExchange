# 12 - Student Login and Import

## Import

The CSV must have `roll_no,prn,name,password` columns. The importer accepts the requested `databse/student.csv` path and the discovered `Database/student.csv` path. It reads UTF-8 with `csv-parse`, skips blank lines, validates every row with Zod, and detects duplicate PRNs and roll numbers before writing. Errors identify the row and PRN only; invalid files are not partially imported.

Passwords are plaintext only while the seed process reads and hashes the CSV in memory. Bcrypt cost 12 hashes are written to PostgreSQL. Re-running is idempotent: name and roll number may update, but existing password hashes are preserved unless `--reset-passwords` is explicitly supplied. New students must change their password at first login.

From the repository root, run:

```powershell
npm run db:migrate
npm run db:seed
npm run db:seed -- --demo
```

The first seed imports students only. The optional `--demo` run adds eight listings across categories, owned by two imported students, and one conversation. Demo data is refused in production. The seed output ends with a reminder to delete `student.csv` after seeding. The source CSV paths are ignored by Git; do not force-add them.

## First login

1. Enter the nine-digit PRN and the department-provided temporary password.
2. The server verifies the password with bcrypt and sets an httpOnly, seven-day JWT cookie (`SameSite=None; Secure` in production for cross-origin Vercel-to-Render requests; SameSite=Lax otherwise).
3. Because `mustChangePassword` is true, the app blocks all API calls except `/auth/me`, `/auth/logout`, and `/auth/change-password`, hides navigation and requires a new password before showing the marketplace.
4. The new password must be at least eight characters and contain a letter and a number. It must differ from the current password and may not equal the PRN or first name.
5. A successful change clears `mustChangePassword`, records `passwordChangedAt`, increments `tokenVersion`, and issues a new cookie. Previous sessions stop working.

## Lockout and admin reset

Five failed attempts lock an active account for 15 minutes. A correct login after expiry clears the counters. The API returns the same `Invalid PRN or password` message for an unknown PRN and an incorrect password; unknown PRNs receive a dummy bcrypt comparison. Login is also rate-limited to 10 attempts per minute per IP.

Only an ADMIN can add one student with `POST /api/admin/students` or reset a student's password with `POST /api/admin/students/:prn/reset-password`. The admin supplies a temporary password in the request and shares it with the student out of band. It is never included in the response. A reset requires a password change and invalidates prior sessions.

## Security notes

- Never log passwords, password hashes, or `DATABASE_URL` values.
- API responses use explicit safe-user selections; `passwordHash` is selected only for password verification/change.
- Optional profile email is for notifications. PRN, roll number, batch, branch and name are department-managed and read-only.
- Tests derive their connection URL to `camp_exchange_test`; never point Vitest at the main database.
- `npm run db:reset` requires `NODE_ENV=development`, localhost and the exact `camp_exchange` database name.
- Peer-to-peer UPI payments are not verified by Camp-Exchange; the seller confirms receipt manually.
