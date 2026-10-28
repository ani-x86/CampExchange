# Camp-Exchange

A minimal, white-themed campus marketplace where students list, discover and buy second-hand items from each other.
Payment is peer-to-peer over UPI (seller's QR) with screenshot proof; buyers and sellers talk in an OLX-style inbox.

## Stack
| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + React Router + TanStack Query + Framer Motion + Zustand |
| Backend | Node.js 20 + Express + Prisma + Socket.IO + Zod + multer |
| Database | PostgreSQL 16+ via Prisma migrations (local development and production) |
| NLP service | Python 3.11 + FastAPI + spaCy + scikit-learn |
| Target OS | Windows 10/11 (PowerShell-friendly scripts, no bash-only commands) |

## Monorepo layout
```
camp-exchange/
├─ AGENTS.md                 # master rules for Antigravity agents
├─ README.md
├─ docs/                     # all specs (read in numeric order)
├─ .agent/rules/             # always-on rules
├─ .agent/workflows/         # reusable slash workflows
├─ client/                   # React app
├─ server/                   # Express API + Socket.IO
└─ nlp/                      # FastAPI NLP microservice
```

## Spec index
1. `docs/01-PRD.md` – product requirements & user stories
2. `docs/02-ARCHITECTURE.md` – system design, folders, env vars
3. `docs/03-DATABASE.md` – Prisma schema
4. `docs/04-API.md` – REST + socket contract
5. `docs/05-DESIGN-SYSTEM.md` – theme, tokens, components, animations
6. `docs/06-FRONTEND-SPEC.md` – pages, layout, responsive rules, shortcuts
7. `docs/07-PAYMENT-CHAT.md` – UPI flow, screenshot proof, chat inbox
8. `docs/08-NLP-PIPELINE.md` – description-writing pipeline
9. `docs/09-SECURITY-TESTING.md` – security, performance, QA checklist
10. `docs/10-BUILD-PLAN.md` – phased tasks + copy-paste Antigravity prompts

## PostgreSQL setup (Windows 10/11)

Install PostgreSQL 16 from the [official Windows installer](https://www.postgresql.org/download/windows/) or run `winget install PostgreSQL.PostgreSQL.16`. PostgreSQL 18 is also compatible. Keep the local port at `5432`; make sure `psql` and `pg_isready` are available (the default install path is `C:\Program Files\PostgreSQL\18\bin`).

Open PowerShell and connect as the local PostgreSQL administrator:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -h localhost -p 5432
```

At the `psql` prompt, create a dedicated role, enter its password at the hidden prompt, and create the application, migration-shadow and test databases:

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

Copy `server/.env.example` to `server/.env` only if no local file exists. Set `DATABASE_URL` and `SHADOW_DATABASE_URL` with the password you entered; URL-encode special characters. Never commit `.env` or paste the password into logs.

## Quick start (Windows PowerShell)

```powershell
git clone <repo> camp-exchange
cd camp-exchange
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The student file is currently at `Database/student.csv` (folder capitalization as found); the importer also supports the requested `databse/student.csv` path. It expects `roll_no,prn,name,password`. The first seed imports students only; then `npm run db:seed -- --demo` adds eight sample listings and one conversation. Delete the CSV after seeding. To add demo data later, the same command is safe to rerun.

Available scripts: `npm run db:migrate`, `npm run db:deploy`, `npm run db:seed`, `npm run db:import-students`, `npm run db:reset` (development/local DB only), and `npm run db:studio`. Tests always target `camp_exchange_test`, never `camp_exchange`.

Client: http://localhost:5173 · API: http://localhost:4000 · NLP: http://localhost:8001
