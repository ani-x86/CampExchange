# 04 - API Contract

Base path `/api`; JSON; authentication uses the `cx_token` httpOnly cookie. Error shape: `{ "error": { "code": "...", "message": "...", "fields": {} } }`. `passwordHash` and passwords are never returned. Until a first-login password change is complete, all API routes except `/auth/change-password`, `/auth/me`, and `/auth/logout` return `403 PASSWORD_CHANGE_REQUIRED`.

## Authentication

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/login` | `{prn,password}` | PRN is exactly 9 digits; sets 7-day httpOnly cookie (`SameSite=None; Secure` in production for the cross-origin Vercel client, `SameSite=Lax` otherwise); response `{user,mustChangePassword}` |
| POST | `/auth/change-password` | `{currentPassword,newPassword}` | Auth required; min 8, letters and digits; invalidates old JWTs and renews the cookie |
| POST | `/auth/logout` | - | Clears cookie |
| GET | `/auth/me` | - | Current safe user object, including `mustChangePassword` |

Every failed login returns `Invalid PRN or password`. Unknown PRNs use a dummy bcrypt comparison. Five failures lock an account for 15 minutes; the response may include `retryAfterSeconds`. Login attempts are limited to 10/minute/IP.

Public self-registration is disabled. Department imports create students. `POST /admin/students` is ADMIN-only and accepts `{prn,rollNo,batch?,branch?,year?,name,temporaryPassword}`. `POST /admin/students/:prn/reset-password` is ADMIN-only and accepts `{temporaryPassword}`. The temporary password is supplied in the request, never returned, and must be shared with the student out of band. Both operations require first-login password change; reset invalidates existing sessions.

## Users

| Method | Path | Notes |
|---|---|---|
| GET | `/users/:id` | Public profile; excludes email and payment details unless authorized by an active order |
| PATCH | `/users/me` | Edit optional notification `email`, hostel, bio, UPI ID/name, avatar URL; PRN, roll number, batch, branch and name are read-only |
| POST | `/users/me/avatar` | Multipart `file` |

## Listings

| Method | Path | Notes |
|---|---|---|
| GET | `/listings` | Query: `q,category,minPrice,maxPrice,condition,sort(new,price_asc,price_desc),cursor,limit` |
| GET | `/listings/:id` | Detail and seller summary |
| POST | `/listings` | Create; missing seller UPI is a warning, not payment verification |
| PATCH | `/listings/:id` | Owner only |
| DELETE | `/listings/:id` | Owner/admin marks REMOVED |
| GET | `/me/listings` | Current user's listings |
| POST/DELETE | `/listings/:id/save` | Save/unsave |
| GET | `/me/saved` | Saved listings |

`Listing.images` and `Listing.tags` are PostgreSQL string arrays and serialize to JSON arrays in API responses.

## Uploads

`POST /uploads/image` multipart (`file`, `kind=listing|avatar|proof`) returns `{url,thumbUrl}`. JPG/PNG/WebP ≤ 5MB; re-encoded with sharp and EXIF stripped.

## Orders / Payment

| Method | Path | Notes |
|---|---|---|
| POST | `/orders` | `{listingId}` creates PENDING_PAYMENT and reserves listing |
| GET | `/orders/:id` | Buyer/seller only; payee details and UPI URI |
| POST | `/orders/:id/proof` | `{proofUrl,utr?}` submits proof |
| POST | `/orders/:id/confirm` | Seller confirms manually; listing SOLD |
| POST | `/orders/:id/reject` | Seller `{reason}`; listing ACTIVE |
| POST | `/orders/:id/cancel` | Buyer, before proof |
| GET | `/me/orders?role=buyer|seller` | Current user's orders |

Payments are peer-to-peer. Camp-Exchange does not verify money; the seller confirms receipt manually.

## Chat

| Method | Path | Notes |
|---|---|---|
| POST | `/conversations` | `{listingId}` get/create thread |
| GET | `/conversations` | Inbox; `?filter=all|buying|selling|unread` |
| GET | `/conversations/:id/messages` | Cursor-paginated messages |
| POST | `/conversations/:id/messages` | `{type,body?,imageUrl?}` REST fallback |
| POST | `/conversations/:id/read` | Mark read |

Socket.IO handshake uses the cookie. Rooms: `user:{id}`, `conv:{id}`. Client events: `chat:join`, `chat:send`, `chat:typing`, `chat:read`. Server events: `chat:message`, `chat:typing`, `chat:read`, `inbox:update`, `order:update`.

## NLP proxy

`POST /nlp/describe` forwards to FastAPI `/describe`; rate limited per user.
