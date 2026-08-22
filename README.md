# 🏢 Society Maintenance Tracker

A production-grade complaint management platform for apartment societies. Residents raise maintenance complaints with photos and track their full audit history; admins triage them through a governed status lifecycle with priorities, SLA-driven overdue detection, a pinned notice board, and automated email notifications.

> **System design write-up:** [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) (800-word limit — covers the status history model, overdue detection, photo handling, and notification flow.)

---

## Table of Contents

- [Feature Overview](#feature-overview)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup Guide](#local-setup-guide)
- [Environment Variables](#environment-variables)
- [Database Schema & ERD](#database-schema--erd)
- [API Specification](#api-specification)
- [Deployment Guide](#deployment-guide)

---

## Feature Overview

### Resident Portal
| Capability | Detail |
|---|---|
| Registration & login | Email, password, flat number, phone. Session cookie is `httpOnly` + `SameSite=Lax`. |
| Raise a complaint | 7 categories, sanitized description, optional photo with client-side preview. |
| My complaints | Filter by status and category, paginated. |
| Status timeline | Full chronological audit history — who changed what, when, and the note they left. |
| Notice board | Important notices permanently pinned to the top of the feed. |
| Email updates | Automatic email on every status change and every important notice. |

### Admin Command Center
| Capability | Detail |
|---|---|
| Executive dashboard | Live counts by status, distribution by category, overdue count. Auto-refreshes every 30s. |
| Complaint queue | Multi-attribute filtering: category, status, priority, and date range. |
| Overdue pinning | Complaints breaching the SLA automatically surface at the top of the queue, highlighted. |
| Priority management | Toggle `LOW` / `MEDIUM` / `HIGH` inline from the table or detail view. |
| Lifecycle control | `OPEN → IN_PROGRESS → RESOLVED`. `RESOLVED` is terminal — the ticket closes. |
| Mandatory audit log | Every transition records timestamp, actor, previous status, new status, and an optional note. |
| Configurable SLA | Overdue threshold (days) is edited from the UI — no redeploy, no migration. |
| Notice broadcast | Post notices, optionally flagged important (pins + emails all residents). |

---

## Architecture & Design Decisions

Four decisions define this codebase. Each is explained in depth in [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md).

**1. Immutable audit ledger (event-sourcing flavored).** `ComplaintStatusHistory` is append-only — rows are never updated or deleted. `Complaint.status` is a denormalized projection kept in the *same transaction* as the ledger write, so reads stay index-fast while the ledger remains the source of truth for *why* a complaint is where it is.

**2. Optimistic concurrency on every mutation.** Complaints carry a `version` token. The status update's `WHERE` clause requires the version the caller just read, so two admins racing on the same ticket produce one winner and one `409` — a lost update is structurally impossible without pessimistic locks.

**3. Hybrid SLA engine.** An indexed `isOverdue` boolean is reconciled by two idempotent set-based `updateMany` statements. That sweep runs *both* from an hourly cron (`/api/cron/sweep`) *and* inline before every admin read — so flags are correct even if cron is delayed, fails, or the threshold changed a second ago. Storing the flag (rather than computing it per query) is what makes `ORDER BY isOverdue DESC` index-backed, which is what makes overdue pinning cheap.

**4. Pluggable photo storage — uploads always work.** The zero-config default stores photos first-party: the browser downscales the image on-device (canvas, ≤1600 px), `POST /api/photos` validates the actual **magic bytes** (never the declared Content-Type), and the bytes live in a dedicated `ComplaintPhoto` table served back auth-gated (uploader or admin only) via `GET /api/photos/:id`. Linking to a complaint is claimed atomically in the creation transaction, so a photo id can never attach to two complaints or to someone else's upload. Configure Supabase Storage and uploads switch to direct-to-cloud signed URLs instead — bytes bypass the app server entirely. Either way the client posts back an opaque reference, never a URL, so a resident cannot point a complaint photo at a third-party host and turn every admin who opens the ticket into a tracking beacon.

### Dependency Discipline

The submission guidelines require minimal, native dependencies. **This project ships 5 runtime dependencies** — `next`, `react`, `react-dom`, `@prisma/client`, `zod` — and `npm audit` reports **0 vulnerabilities**. Everything else uses platform primitives:

| Common choice | What this project uses instead | Why |
|---|---|---|
| `bcrypt` / `bcryptjs` | Node's native `crypto.scrypt` | Memory-hard KDF built into Node. No native bindings, no dependency. |
| `jsonwebtoken` | Web Crypto `crypto.subtle` HS256 | Works in **both** Node routes and Edge middleware — one implementation, zero deps. `jsonwebtoken` cannot run in Edge middleware at all. |
| `resend` / `nodemailer` / `@sendgrid/mail` | Native `fetch` → Resend HTTP API | The whole integration is one `POST`. An SDK would be pure weight. |
| `@supabase/supabase-js` | Native `fetch` → Storage REST API | Two well-defined HTTP calls. |
| `axios` | Native `fetch` | Built into the platform. |
| `date-fns` / `moment` | Native `Intl` / `Date` | Formatting only; no timezone math needed. |
| `next-auth` | ~120-line hand-rolled session layer | Full control over the RBAC model, no adapter/provider surface we don't use. |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript (`strict` + `noUncheckedIndexedAccess`) |
| Database | PostgreSQL |
| ORM | Prisma 5 |
| Validation | Zod (every API boundary) |
| Auth | Custom scrypt + HS256 JWT session cookie |
| Storage | Supabase Storage (signed direct upload) |
| Email | Resend (free tier) |
| Styling | Tailwind CSS |
| Scheduling | Vercel Cron |

---

## Project Structure

```
society-maintenance-tracker/
├── prisma/
│   ├── schema.prisma            # Models, enums, compound indexes
│   └── seed.ts                  # One-command demo data
├── docs/
│   └── SYSTEM_DESIGN.md         # 800-word design write-up
├── src/
│   ├── middleware.ts            # Edge route protection (RBAC)
│   ├── app/
│   │   ├── api/                 # REST route handlers (thin controllers)
│   │   │   ├── auth/            # register · login · logout · me
│   │   │   ├── complaints/      # list · create · detail · status · priority
│   │   │   ├── notices/         # list · create
│   │   │   ├── admin/           # analytics · settings
│   │   │   ├── uploads/         # sign-url
│   │   │   └── cron/sweep/      # scheduled SLA + notification retry
│   │   ├── admin/               # Admin pages
│   │   ├── resident/            # Resident pages
│   │   ├── login/ · register/
│   │   └── layout.tsx · page.tsx · globals.css
│   ├── components/              # Presentational React components
│   ├── lib/
│   │   ├── auth/                # password (scrypt) · jwt (Web Crypto) · session
│   │   ├── db/                  # Prisma singleton
│   │   ├── email/               # templates · resendClient · dispatch+retry
│   │   ├── services/            # ← business logic lives here
│   │   ├── storage/             # signed upload (server + client halves)
│   │   ├── utils/               # constants · sanitize · apiResponse
│   │   └── validation/          # Zod schemas
│   └── types/                   # Shared client-side types
├── .env.example
├── .gitignore
└── vercel.json                  # Hourly cron schedule
```

**Layering rule:** route handlers are thin controllers — they authenticate, validate with Zod, delegate to a service, and map errors to HTTP codes. All business logic (transitions, sweeps, aggregations, dispatch) lives in `src/lib/services` and `src/lib/email`, so it is testable and reusable independent of HTTP.

---

## Local Setup Guide

### Prerequisites
- **Node.js ≥ 20**
- A **PostgreSQL** database (free options: [Supabase](https://supabase.com), [Neon](https://neon.tech))

### 1. Install

```bash
git clone https://github.com/<your-username>/society-maintenance-tracker.git
```

```bash
cd society-maintenance-tracker && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` — see [Environment Variables](#environment-variables). At minimum you need `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`. Generate a secret with:

```bash
openssl rand -base64 48
```

### 3. Create the schema

```bash
npx prisma migrate dev --name init
```

### 4. Seed demo data (one command)

```bash
npm run db:seed
```

This creates the admin account, two residents, four complaints spanning every status (one deliberately aged past the SLA so overdue pinning is visible immediately), and two notices (one pinned).

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@society.test` | `Admin@12345` |
| **Resident** | `asha.rao@society.test` | `Resident@123` |
| **Resident** | `vikram.shah@society.test` | `Resident@123` |

> Admin accounts are provisioned only by the seed script or direct DB access — public registration **always** creates a `RESIDENT`, so signup can never be used to self-elevate.

### 5. Run

```bash
npm run dev
```

Open **http://localhost:3000**.

### Optional: photo uploads & email

Email degrades gracefully — the app runs fully without it. Photo uploads need nothing at all:

- **Photos work out of the box** — stored in Postgres, no configuration needed. To switch to direct-to-cloud uploads instead, create a **public** bucket named `complaint-photos` in your Supabase project's Storage tab, then set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- **Email:** sign up at [resend.com](https://resend.com), create an API key, then set `RESEND_API_KEY` and `EMAIL_FROM`. Without a verified domain, use `onboarding@resend.dev` as the sender for testing.

### Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Generate Prisma client + production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

---

## Environment Variables

Copy from [`.env.example`](.env.example). **Never commit `.env`** — it is gitignored.

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Postgres connection string. Use the **pooled** URI on serverless. |
| `DIRECT_URL` | ✅ | Direct (non-pooled) URI. Prisma needs this to run migrations. |
| `AUTH_SECRET` | ✅ | HMAC key for session JWTs. `openssl rand -base64 48`. |
| `AUTH_SESSION_TTL_SECONDS` | — | Session lifetime. Default `604800` (7 days). |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public base URL, used to build links inside emails. |
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase project URL (photo uploads). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Public anon key — browser-side upload. Safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | — | **Server-only.** Mints signed upload URLs. Never prefix `NEXT_PUBLIC_`. |
| `SUPABASE_STORAGE_BUCKET` | — | Bucket name. Default `complaint-photos`. |
| `RESEND_API_KEY` | — | Resend API key (emails). |
| `EMAIL_FROM` | — | Verified sender, e.g. `Society Tracker <notify@yourdomain.com>`. |
| `CRON_SECRET` | ✅ | Bearer token guarding `/api/cron/sweep`. |
| `DEFAULT_OVERDUE_THRESHOLD_DAYS` | — | SLA threshold seeded on first run. Default `3`. |

---

## Database Schema & ERD

```
┌────────────────────────────┐
│           User             │
│────────────────────────────│
│ id            PK           │
│ email         UNIQUE       │
│ passwordHash               │
│ name                       │
│ role          Role         │
│ flatNumber                 │
│ phone                      │
│ createdAt / updatedAt      │
└────────────────────────────┘
     │ 1              │ 1                  │ 1
     │                │                    │
     │ N              │ N                  │ N
┌────▼───────────────────────┐   ┌─────────▼──────────────────┐
│         Complaint          │   │          Notice            │
│────────────────────────────│   │────────────────────────────│
│ id             PK          │   │ id             PK          │
│ residentId     FK → User   │   │ title                      │
│ category       Category    │   │ body                       │
│ description                │   │ isImportant    Boolean     │
│ photoUrl / photoPath       │   │ authorId       FK → User   │
│ status         Status      │   │ createdAt                  │
│ priority       Priority    │   │────────────────────────────│
│ isOverdue      Boolean     │   │ IDX (isImportant,createdAt)│
│ overdueSince               │   └────────────────────────────┘
│ resolvedAt                 │
│ version        Int  ← OCC  │   ┌────────────────────────────┐
│ createdAt / updatedAt      │   │       SystemSetting        │
│────────────────────────────│   │────────────────────────────│
│ IDX (status, createdAt)    │   │ key            PK          │
│ IDX (isOverdue, createdAt) │   │ value                      │
│ IDX (category)             │   │ updatedAt                  │
│ IDX (priority)             │   └────────────────────────────┘
│ IDX (residentId)           │
└────────────────────────────┘   ┌────────────────────────────┐
     │ 1                          │      NotificationLog       │
     │                            │────────────────────────────│
     │ N                          │ id             PK          │
┌────▼───────────────────────┐   │ type           NotifType   │
│  ComplaintStatusHistory    │   │ recipientEmail             │
│      (APPEND-ONLY)         │   │ subject / bodyHtml         │
│────────────────────────────│   │ status         NotifStatus │
│ id             PK          │   │ error / attempts           │
│ complaintId    FK          │   │ relatedComplaintId         │
│ actorId        FK → User   │   │ relatedNoticeId            │
│ previousStatus Status?     │   │ createdAt / updatedAt      │
│ newStatus      Status      │   │────────────────────────────│
│ note           String?     │   │ IDX (status, attempts)     │
│ createdAt                  │   └────────────────────────────┘
│────────────────────────────│
│ IDX (complaintId,createdAt)│   ┌────────────────────────────┐
└────────────────────────────┘   │       ComplaintPhoto       │
                                 │  (first-party photo bytes) │
                                 │────────────────────────────│
                                 │ id             PK          │
                                 │ uploaderId     FK → User   │
                                 │ complaintId    UNIQUE?     │
                                 │ mimeType / sizeBytes       │
                                 │ data           Bytes       │
                                 │ createdAt                  │
                                 │────────────────────────────│
                                 │ IDX (uploaderId)           │
                                 └────────────────────────────┘
```

### Enums

| Enum | Values |
|---|---|
| `Role` | `RESIDENT`, `ADMIN` |
| `ComplaintCategory` | `PLUMBING`, `ELECTRICAL`, `CARPENTRY`, `COMMON_AREA`, `HVAC`, `SECURITY`, `OTHER` |
| `ComplaintStatus` | `OPEN`, `IN_PROGRESS`, `RESOLVED` |
| `PriorityLevel` | `LOW`, `MEDIUM`, `HIGH` |
| `NotificationType` | `STATUS_CHANGE`, `IMPORTANT_NOTICE` |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED` |

### Why these indexes

| Index | Serves |
|---|---|
| `Complaint(status, createdAt)` | The overdue sweep's flagging predicate and status-filtered queue reads. |
| `Complaint(isOverdue, createdAt)` | Overdue pinning (`ORDER BY isOverdue DESC, createdAt ASC`) and the dashboard's overdue count. |
| `Complaint(category)` / `Complaint(priority)` | Admin table filters and the category distribution aggregate. |
| `Complaint(residentId)` | "My complaints" — the resident's hot path. |
| `ComplaintStatusHistory(complaintId, createdAt)` | Rendering a single complaint's timeline in chronological order. |
| `Notice(isImportant, createdAt)` | Pinned-first notice feed ordering. |
| `NotificationLog(status, attempts)` | The cron retry scan for `FAILED` rows with attempts remaining. |

---

## API Specification

All endpoints return JSON. Authentication is a `httpOnly` session cookie set at login/registration.

**Auth levels:** 🌐 Public · 👤 Authenticated · 🛡️ Admin only · 🔑 Cron secret

### Authentication

| Method | Endpoint | Auth | Body | Success |
|---|---|:---:|---|---|
| `POST` | `/api/auth/register` | 🌐 | `{ name, email, password, flatNumber, phone? }` | `200` `{ user }` + session cookie |
| `POST` | `/api/auth/login` | 🌐 | `{ email, password }` | `200` `{ user }` + session cookie |
| `POST` | `/api/auth/logout` | 🌐 | — | `200` `{ success: true }`, cookie cleared |
| `GET` | `/api/auth/me` | 🌐 | — | `200` `{ user }` or `{ user: null }` |

<details>
<summary><code>POST /api/auth/register</code> — example</summary>

```json
// Request
{
  "name": "Asha Rao",
  "email": "asha.rao@society.test",
  "password": "Resident@123",
  "flatNumber": "A-204",
  "phone": "+919876500001"
}

// 200 Response
{
  "user": {
    "id": "clx7k2m4a0000...",
    "name": "Asha Rao",
    "email": "asha.rao@society.test",
    "role": "RESIDENT",
    "flatNumber": "A-204"
  }
}
```
Registration always assigns `RESIDENT`. Duplicate email → `409`.
</details>

### Complaints

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/complaints` | 👤 | List complaints. **Residents see only their own**; admins see all, overdue-pinned. |
| `POST` | `/api/complaints` | 👤 | Raise a complaint. Body: `{ category, description, photoId? \| photoPath? }`. |
| `GET` | `/api/complaints/:id` | 👤 | Detail + full status history. Residents restricted to their own (`403` otherwise). |
| `PATCH` | `/api/complaints/:id/status` | 🛡️ | Transition status + append audit record + email resident. |
| `PATCH` | `/api/complaints/:id/priority` | 🛡️ | Set priority. |

**`GET /api/complaints` query parameters**

| Param | Type | Notes |
|---|---|---|
| `status` | `OPEN` \| `IN_PROGRESS` \| `RESOLVED` | |
| `category` | `ComplaintCategory` | |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` | |
| `dateFrom` / `dateTo` | ISO-8601 datetime | Filters on `createdAt`. |
| `overdueOnly` | `true` \| `false` \| `1` \| `0` | Any other value is a `422`. Deliberately not a loose coercion — `Boolean("false")` is `true` in JS, which would invert the filter. |
| `page` / `pageSize` | int | Default `1` / `20`. Max page size `100`. |

<details>
<summary><code>GET /api/complaints</code> — example response</summary>

```json
{
  "items": [
    {
      "id": "clx7k2m4a0003...",
      "category": "PLUMBING",
      "description": "Kitchen tap has been leaking continuously since yesterday morning.",
      "photoUrl": "https://<ref>.supabase.co/storage/v1/object/public/complaint-photos/...",
      "status": "OPEN",
      "priority": "HIGH",
      "isOverdue": true,
      "overdueSince": "2026-08-22T09:00:00.000Z",
      "resolvedAt": null,
      "createdAt": "2026-08-16T09:00:00.000Z",
      "resident": { "id": "...", "name": "Asha Rao", "flatNumber": "A-204", "email": "..." }
    }
  ],
  "total": 4, "page": 1, "pageSize": 20, "totalPages": 1
}
```
</details>

<details>
<summary><code>PATCH /api/complaints/:id/status</code> — example</summary>

```json
// Request
{ "status": "IN_PROGRESS", "note": "Plumber scheduled for tomorrow 9am" }

// 200 Response
{ "complaint": { "id": "...", "status": "IN_PROGRESS", "version": 1, ... } }
```

| Code | Meaning |
|---|---|
| `403` | Caller is not an admin. |
| `404` | Complaint does not exist. |
| `409` | Illegal transition (e.g. anything out of `RESOLVED`, or a no-op re-set), **or** a concurrent modification — refresh and retry. |
| `422` | Zod validation failure. |

Side effects, in order: version-checked update → append `ComplaintStatusHistory` (same transaction) → after commit, queue the resident's email.
</details>

### Notices

| Method | Endpoint | Auth | Body | Notes |
|---|---|:---:|---|---|
| `GET` | `/api/notices` | 👤 | — | Important notices sorted first, then newest. `page` / `pageSize` supported. |
| `POST` | `/api/notices` | 🛡️ | `{ title, body, isImportant }` | `isImportant: true` pins it **and** emails every resident. |

### Admin

| Method | Endpoint | Auth | Body | Notes |
|---|---|:---:|---|---|
| `GET` | `/api/admin/analytics` | 🛡️ | — | Dashboard aggregates. Runs an SLA resweep first. |
| `GET` | `/api/admin/settings` | 🛡️ | — | `{ overdueThresholdDays }` |
| `PUT` | `/api/admin/settings` | 🛡️ | `{ overdueThresholdDays }` | 1–365. Takes effect on the next read. |

<details>
<summary><code>GET /api/admin/analytics</code> — example response</summary>

```json
{
  "totalComplaints": 4,
  "byStatus": { "OPEN": 2, "IN_PROGRESS": 1, "RESOLVED": 1 },
  "byCategory": {
    "PLUMBING": 1, "ELECTRICAL": 1, "CARPENTRY": 0,
    "COMMON_AREA": 1, "HVAC": 0, "SECURITY": 1, "OTHER": 0
  },
  "overdueCount": 1
}
```
</details>

### Uploads & Cron

| Method | Endpoint | Auth | Body | Notes |
|---|---|:---:|---|---|
| `POST` | `/api/photos` | 👤 | multipart `file` field | Default storage backend. Magic-byte MIME validation + 5 MB cap, returns `{ photoId, url }`. `422` if rejected. |
| `GET` | `/api/photos/:id` | 👤 | — | Serves the photo bytes. Uploader or admin only — others get `404`. |
| `POST` | `/api/uploads/sign-url` | 👤 | `{ fileName, mimeType, fileSizeBytes }` | Cloud mode only. Validates MIME allowlist + 5 MB cap, returns `{ uploadUrl, path, publicUrl }`. `422` if rejected, `503` if storage is not configured. |
| `GET` | `/api/cron/sweep` | 🔑 | — | `Authorization: Bearer $CRON_SECRET`. Resweeps SLA flags and retries failed emails. |

### Error Format

Every error shares one shape, produced by a single central handler:

```json
{ "error": "Validation failed", "details": { "fieldErrors": { "email": ["Enter a valid email address"] } } }
```

| Status | When |
|---|---|
| `401` | No/invalid session. |
| `403` | Authenticated but not permitted (e.g. resident hitting an admin route). |
| `404` | Resource not found. |
| `409` | Duplicate email, illegal state transition, or concurrent modification. |
| `422` | Zod validation failure — `details` carries per-field messages. Also returned for a photo path outside the caller's own namespace. |
| `500` | Unexpected error (logged server-side; no internals leaked to the client). |
| `503` | An optional feature is not configured on this deployment (e.g. photo storage). |

---

## Deployment Guide

### Step 1 — Provision the database

**Supabase** (recommended — also provides photo storage) or **Neon**:

1. Create a project and copy both connection strings from **Project Settings → Database**.
2. `DATABASE_URL` → the **Connection pooling** URI (append `?pgbouncer=true`).
3. `DIRECT_URL` → the **Direct connection** URI.

> Serverless functions open many short-lived connections. Using the pooled URI at runtime and the direct URI for migrations is what keeps you from exhausting Postgres connection limits.

### Step 2 — Create the storage bucket (optional, for photos)

In Supabase → **Storage** → New bucket → name it `complaint-photos` → mark it **Public**.

### Step 3 — Set up email (optional)

At [resend.com](https://resend.com): verify a domain (or use `onboarding@resend.dev` for testing), create an API key, and note your `EMAIL_FROM` sender.

### Step 4 — Deploy to Vercel

1. Push to GitHub on the **`main`** branch (public repository).
2. On Vercel: **New Project** → import the repo. The framework preset is detected automatically.
3. Add **every** variable from [Environment Variables](#environment-variables) under **Settings → Environment Variables**. Set `NEXT_PUBLIC_APP_URL` to your final Vercel URL.
4. Deploy. The build command already runs `prisma generate`.

### Step 5 — Apply migrations & seed production

From your machine, pointed at the production database:

```bash
DATABASE_URL="<prod-pooled-url>" DIRECT_URL="<prod-direct-url>" npx prisma migrate deploy
```

```bash
DATABASE_URL="<prod-pooled-url>" DIRECT_URL="<prod-direct-url>" npm run db:seed
```

> The seed is idempotent (`upsert` + a complaint-count guard), so re-running it will not duplicate data.

### Step 6 — Verify the cron job

[`vercel.json`](vercel.json) registers `/api/cron/sweep` hourly. After the first deploy, confirm it under **Vercel → Settings → Cron Jobs**. Trigger it manually to test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.vercel.app/api/cron/sweep
```

> Vercel Cron is a **Pro** feature. On the free Hobby plan the app remains fully correct — the inline resweep on every admin read keeps overdue flags accurate. To get scheduled retries of failed emails on Hobby, point any free scheduler ([cron-job.org](https://cron-job.org), GitHub Actions) at the same endpoint with the same bearer token.

### Step 7 — Post-deploy checklist

- [ ] `/login` loads and the seeded admin can sign in.
- [ ] A resident can raise a complaint with a photo (works with zero storage config).
- [ ] An admin status change appears in the resident's timeline **and** triggers an email.
- [ ] Overdue complaints are pinned to the top of the admin queue.
- [ ] Changing the SLA threshold in **Settings** re-flags complaints on the next dashboard load.
- [ ] An important notice is pinned for residents and broadcast by email.

---

## Submission Hygiene

| Requirement | Status |
|---|---|
| Branch is `main` | ✅ |
| Public repository | ✅ |
| No `node_modules/` committed | ✅ gitignored |
| No `.env` committed | ✅ gitignored (`.env.example` provided) |
| No build artifacts (`.next/`, `dist/`, `out/`) | ✅ gitignored |
| No editor configs (`.vscode/`, `.idea/`) | ✅ gitignored |
| Minimal dependencies | ✅ 5 runtime deps, 0 vulnerabilities |
| App builds and runs without errors | ✅ `npm run build` |
| README with setup, `.env.example`, API docs, schema | ✅ this document |
| System design write-up ≤ 800 words | ✅ [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) |
