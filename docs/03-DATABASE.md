# 03 - Database (PostgreSQL / Prisma)

Camp-Exchange uses PostgreSQL 16 or newer locally. PostgreSQL 18.6 is also supported. Prisma migrations are committed under `server/prisma/migrations`; do not use `prisma db push`.

## Student accounts

`User.prn` is the required, unique nine-digit login ID. `rollNo` is required. `(rollNo, batch)` is unique; PostgreSQL permits multiple null batches. Student identity fields are provisioned by department import or an administrator. `branch` defaults to `AIML`; `year` and `batch` are optional strings (examples: `TY`, `T-2`). `email` is optional and unique.

Passwords are stored only as bcrypt hashes with cost 12. Imported students start with `mustChangePassword = true`. Failed login counters, lock time, activity state, last login and `tokenVersion` support lockout and session invalidation. Auth responses select an explicit allow-list and never include `passwordHash`.

```prisma
enum Role { STUDENT ADMIN }
enum Condition { NEW LIKE_NEW GOOD FAIR }
enum ListingStatus { ACTIVE RESERVED SOLD REMOVED }
enum OrderStatus { PENDING_PAYMENT PROOF_SUBMITTED CONFIRMED REJECTED CANCELLED }

model User {
  id                 String   @id @default(cuid())
  prn                String   @unique
  rollNo             Int
  batch              String?
  branch             String?  @default("AIML")
  year               String?
  name               String
  email              String?  @unique
  passwordHash       String
  mustChangePassword Boolean  @default(true)
  passwordChangedAt  DateTime?
  failedLoginCount   Int      @default(0)
  lockedUntil        DateTime?
  lastLoginAt        DateTime?
  isActive           Boolean  @default(true)
  tokenVersion       Int      @default(0)
  role               Role     @default(STUDENT)
  emailVerified      Boolean  @default(false)
  createdAt          DateTime @default(now())
  listings           Listing[]
  buyOrders          Order[] @relation("buyer")
  sellOrders         Order[] @relation("seller")
  buyerConversations Conversation[] @relation("buyerConversations")
  sellerConversations Conversation[] @relation("sellerConversations")
  saved              SavedListing[]
  messages           Message[]
  otpCodes           OtpCode[]

  @@unique([rollNo, batch])
}
```

`OtpCode` remains for compatibility with the optional email-verification integration; public self-registration and OTP endpoints are disabled for student accounts.

## Marketplace models and indexes

- `Listing`: title, description, category, `Condition`, integer INR price, negotiability, PostgreSQL `String[]` images and tags, `ListingStatus`, timestamps. Indexes: `(status, createdAt)`, `category`.
- `SavedListing`: composite primary key `(userId, listingId)`.
- `Order`: buyer, seller, listing, integer amount, `OrderStatus`, proof URL/private Cloudinary ID, optional UTR/rejection reason. Indexes: `buyerId`, `sellerId`.
- `Conversation`: listing, buyer, seller, read timestamps and last-message time. Unique `(listingId, buyerId, sellerId)`.
- `Message`: conversation, sender, type, optional body/image/order. Index `(conversationId, createdAt)`.

The unique PRN/email constraints and the `(rollNo, batch)` constraint are implemented by PostgreSQL unique indexes. Native arrays are returned as JSON arrays by Prisma; services do not stringify or parse them.

## Windows PostgreSQL setup

Install PostgreSQL 16+ from the official Windows installer, or use `winget install PostgreSQL.PostgreSQL.16`. The commands below work with PostgreSQL 18 as well. If the tools are not on `PATH`, start `psql` by its standard install path:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -h localhost -p 5432
```

At the `psql` prompt, create a login and enter its password only in the hidden prompt. Do not put a real password in a command or source file:

```sql
CREATE ROLE camp_exchange_app LOGIN;
\password camp_exchange_app
CREATE DATABASE camp_exchange;
CREATE DATABASE camp_exchange_shadow;
CREATE DATABASE camp_exchange_test;
GRANT CONNECT, CREATE, TEMPORARY ON DATABASE camp_exchange TO camp_exchange_app;
GRANT CONNECT, CREATE, TEMPORARY ON DATABASE camp_exchange_shadow TO camp_exchange_app;
GRANT CONNECT, CREATE, TEMPORARY ON DATABASE camp_exchange_test TO camp_exchange_app;
\connect camp_exchange
ALTER SCHEMA public OWNER TO camp_exchange_app;
\connect camp_exchange_shadow
ALTER SCHEMA public OWNER TO camp_exchange_app;
\connect camp_exchange_test
ALTER SCHEMA public OWNER TO camp_exchange_app;
```

This grants no cluster-wide superuser or `CREATEDB` capability. The app owns only the `public` schema in its three databases, which permits Prisma migrations and test setup.

Copy `server/.env.example` to `server/.env` only if a local `.env` does not already exist. Set `DATABASE_URL` and `SHADOW_DATABASE_URL` using the password you entered. URL-encode special characters in the password. Never commit `.env`.

From the repository root:

```powershell
npm run db:migrate
npm run db:seed
npm run db:seed -- --demo
npm run db:studio
```

The first seed imports students only. The second reruns the idempotent import and adds demo data. For production, use `npm run db:deploy`; `npm run db:reset` refuses to run outside development and refuses non-local or non-`camp_exchange` targets.

## Seed data

The student CSV is read from `databse/student.csv` or, if absent, the discovered `Database/student.csv` path. It must have `roll_no,prn,name,password` columns. Validation completes for every row before any database write. Duplicate PRNs/roll numbers abort the import. Existing password hashes are preserved unless `--reset-passwords` is explicitly supplied. Plaintext passwords are never logged or written to the database; remove the CSV after seeding.

`--demo` adds eight listings across categories, owned by two imported students, and one conversation. Demo data is disabled when `NODE_ENV=production`.
