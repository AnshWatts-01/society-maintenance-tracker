# 🏢 Society Maintenance Tracker

[![Live Demo](https://img.shields.io/badge/demo-live-2F3E8F)](https://society-maintenance-tracker-ansh01.vercel.app)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748)](https://www.prisma.io)
[![Dependencies](https://img.shields.io/badge/runtime_deps-5-2E6B4F)](#-quick-start)

Residents raise maintenance complaints with photos and track every status change. Admins manage the full lifecycle — priorities, SLA-based overdue pinning, notice board, and email updates — with an immutable audit trail behind it all.

## 🌐 Try It Now

|  |  |
|---|---|
| **Live app** | **https://society-maintenance-tracker-ansh01.vercel.app** |
| **Admin login** | `admin@society.test` / `Admin@12345` |
| **Resident login** | `asha.rao@society.test` / `Resident@123` |
| **Design write-up** | [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) — 800 words on the four core design decisions |

> **2-minute tour:** log in as the resident → raise a complaint with a photo → switch to admin → see it in the queue (overdue items pinned on top) → change its status with a note → back as resident, watch it appear in the timeline.

## ✨ What It Does

| 👤 Residents | 🛡️ Admin |
|---|---|
| Register & log in (secure `httpOnly` session) | Executive dashboard — live counts by status, category, overdue |
| Raise complaints: 7 categories, description, **photo upload with preview** | Queue with filters: category, status, priority, date range |
| Track every complaint with a **full status timeline** — who, when, why | **Overdue complaints auto-pin to the top**, highlighted |
| Notice board with pinned important notices | Set priority inline · progress `OPEN → IN_PROGRESS → RESOLVED` (terminal) |
| Email on every status change & important notice | Every transition audit-logged: timestamp, actor, statuses, note |
| | Configurable SLA threshold + notice broadcasts — all from the UI |

## 🏗️ Architecture in 60 Seconds

Full reasoning in [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md).

1. **Immutable audit ledger** — `ComplaintStatusHistory` is append-only; `Complaint.status` is a projection written in the *same transaction*, so reads stay indexed while the ledger stays the source of truth.
2. **Optimistic concurrency** — every complaint carries a `version` token; two admins racing on one ticket produce one winner and one clean `409`, never a silent lost update.
3. **Hybrid SLA engine** — an indexed `isOverdue` flag reconciled by idempotent sweeps that run from cron *and* inline before every admin read. Correct even if cron never fires; makes overdue pinning index-backed.
4. **Photos always work** — the zero-config default stores images in Postgres after **magic-byte validation** (a script renamed `.jpg` is rejected), served auth-gated. Configure Supabase Storage and uploads switch to direct-to-cloud signed URLs.
5. **Minimal dependencies** — 5 runtime packages, 0 vulnerabilities. Passwords use Node's native `scrypt`, sessions use Web Crypto HS256, email is one `fetch` call. No bcrypt, no jsonwebtoken, no axios, no SDKs.

**Stack:** Next.js 15 (App Router) · TypeScript `strict` · PostgreSQL + Prisma · Zod on every API boundary · Tailwind CSS · Vercel + Vercel Cron

## 🚀 Quick Start

Prerequisites: **Node.js ≥ 20** and a **PostgreSQL** database (free: [Supabase](https://supabase.com) / [Neon](https://neon.tech)).

```bash
git clone https://github.com/AnshWatts-01/society-maintenance-tracker.git
cd society-maintenance-tracker && npm install
```

```bash
cp .env.example .env   # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET, CRON_SECRET
```

```bash
npx prisma migrate dev --name init   # create the schema
npm run db:seed                      # demo data, one command
npm run dev                          # → http://localhost:3000
```

The seed creates an admin, two residents, complaints in every state (one aged past the SLA so overdue pinning is visible immediately), and a pinned notice.

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@society.test` | `Admin@12345` |
| Resident | `asha.rao@society.test` | `Resident@123` |
| Resident | `vikram.shah@society.test` | `Resident@123` |

> 📷 **Photos work with zero configuration** (stored in Postgres). ✉️ **Email is optional** — the app runs fully without it; add a free [Resend](https://resend.com) key to enable. Public registration always creates a `RESIDENT` — admin accounts come only from the seed, so signup can never self-elevate.

<details>
<summary><strong>All npm scripts</strong></summary>

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Prisma generate + production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed demo data (idempotent) |
| `npm run db:studio` | Open Prisma Studio |

</details>

---

## 📚 Reference

Everything a reviewer might want to check, one click deep.

<details>
<summary><strong>🔐 Environment variables</strong></summary>

Copy from [`.env.example`](.env.example). **Never commit `.env`** — it is gitignored.

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Postgres connection string. Use the **pooled** URI on serverless. |
| `DIRECT_URL` | ✅ | Direct (non-pooled) URI — Prisma needs it for migrations. |
| `AUTH_SECRET` | ✅ | HMAC key for session JWTs. Generate: `openssl rand -base64 48`. |
| `CRON_SECRET` | ✅ | Bearer token guarding `/api/cron/sweep`. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public base URL, used to build links inside emails. |
| `AUTH_SESSION_TTL_SECONDS` | — | Session lifetime. Default `604800` (7 days). |
| `DEFAULT_OVERDUE_THRESHOLD_DAYS` | — | SLA threshold seeded on first run. Default `3`. |
| `RESEND_API_KEY` / `EMAIL_FROM` | — | Enable email notifications ([resend.com](https://resend.com), free tier). |
| `NEXT_PUBLIC_SUPABASE_URL` | — | Enable direct-to-cloud photo mode (otherwise photos store in Postgres). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Public anon key — browser-side upload. Safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | — | **Server-only.** Mints signed upload URLs. Never prefix `NEXT_PUBLIC_`. |
| `SUPABASE_STORAGE_BUCKET` | — | Bucket name. Default `complaint-photos`. |

</details>

<details>
<summary><strong>🌐 API reference</strong></summary>

All endpoints return JSON. Auth is an `httpOnly` session cookie set at login/registration.

**Auth levels:** 🌐 Public · 👤 Authenticated · 🛡️ Admin only · 🔑 Cron secret

### Authentication

| Method | Endpoint | Auth | Body | Success |
|---|---|:---:|---|---|
| `POST` | `/api/auth/register` | 🌐 | `{ name, email, password, flatNumber, phone? }` | `200` `{ user }` + session cookie |
| `POST` | `/api/auth/login` | 🌐 | `{ email, password }` | `200` `{ user }` + session cookie |
| `POST` | `/api/auth/logout` | 🌐 | — | `200`, cookie cleared |
| `GET` | `/api/auth/me` | 🌐 | — | `200` `{ user }` or `{ user: null }` |

Registration always assigns `RESIDENT`. Duplicate email → `409`.

### Complaints

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/complaints` | 👤 | List. **Residents see only their own**; admins see all, overdue-pinned. |
| `POST` | `/api/complaints` | 👤 | Raise. Body: `{ category, description, photoId? \| photoPath? }`. |
| `GET` | `/api/complaints/:id` | 👤 | Detail + full status history. Residents restricted to their own (`403`). |
| `PATCH` | `/api/complaints/:id/status` | 🛡️ | Transition + append audit record + email resident. |
| `PATCH` | `/api/complaints/:id/priority` | 🛡️ | Set `LOW` / `MEDIUM` / `HIGH`. |

**`GET /api/complaints` query params:** `status`, `category`, `priority`, `dateFrom`/`dateTo` (ISO-8601), `overdueOnly` (`true`/`false`/`1`/`0` — strict, because `Boolean("false")` is `true` in JS), `page`/`pageSize` (default 1/20, max 100).

**`PATCH .../status` example:**

```json
// Request
{ "status": "IN_PROGRESS", "note": "Plumber scheduled for tomorrow 9am" }
// 200 → { "complaint": { "id": "...", "status": "IN_PROGRESS", "version": 1, ... } }
```

Side effects, in order: version-checked update → append `ComplaintStatusHistory` (same transaction) → after commit, queue the resident's email. Errors: `403` not admin · `404` not found · `409` illegal transition or concurrent modification · `422` validation.

### Photos

| Method | Endpoint | Auth | Body | Notes |
|---|---|:---:|---|---|
| `POST` | `/api/photos` | 👤 | multipart `file` | Default backend. Magic-byte MIME check + 5 MB cap → `{ photoId, url }`. `422` if rejected. |
| `GET` | `/api/photos/:id` | 👤 | — | Serves bytes. Uploader or admin only — others get `404`. |
| `POST` | `/api/uploads/sign-url` | 👤 | `{ fileName, mimeType, fileSizeBytes }` | Cloud mode only → `{ uploadUrl, path, publicUrl }`. `503` if storage not configured. |

### Notices, Admin & Cron

| Method | Endpoint | Auth | Notes |
|---|---|:---:|---|
| `GET` | `/api/notices` | 👤 | Important first, then newest. Paginated. |
| `POST` | `/api/notices` | 🛡️ | `{ title, body, isImportant }` — important pins it **and** emails every resident. |
| `GET` | `/api/admin/analytics` | 🛡️ | Dashboard aggregates (runs an SLA resweep first). |
| `GET` / `PUT` | `/api/admin/settings` | 🛡️ | `{ overdueThresholdDays }`, 1–365. Takes effect on next read. |
| `GET` | `/api/cron/sweep` | 🔑 | `Authorization: Bearer $CRON_SECRET`. Resweeps SLA flags + retries failed emails. |

**Analytics response shape:**

```json
{
  "totalComplaints": 4,
  "byStatus": { "OPEN": 2, "IN_PROGRESS": 1, "RESOLVED": 1 },
  "byCategory": { "PLUMBING": 1, "ELECTRICAL": 1, "CARPENTRY": 0, "COMMON_AREA": 1, "HVAC": 0, "SECURITY": 1, "OTHER": 0 },
  "overdueCount": 1
}
```

### Error format

One shape from one central handler:

```json
{ "error": "Validation failed", "details": { "fieldErrors": { "email": ["Enter a valid email address"] } } }
```

| Status | When |
|---|---|
| `401` | No/invalid session. |
| `403` | Authenticated but not permitted. |
| `404` | Not found (also used to avoid leaking photo existence). |
| `409` | Duplicate email, illegal transition, or concurrent modification. |
| `422` | Validation failure — `details` carries per-field messages. |
| `500` | Unexpected (logged server-side, no internals leaked). |
| `503` | Optional feature not configured on this deployment. |

</details>

<details>
<summary><strong>🗄️ Database schema & ERD</strong></summary>

```
┌────────────────────────────┐
│           User             │
│────────────────────────────│
│ id            PK           │
│ email         UNIQUE       │
│ passwordHash               │
│ name / role / flatNumber   │
│ phone                      │
│ createdAt / updatedAt      │
└────────────────────────────┘
     │ 1              │ 1                  │ 1
     │ N              │ N                  │ N
┌────▼───────────────────────┐   ┌─────────▼──────────────────┐
│         Complaint          │   │          Notice            │
│────────────────────────────│   │────────────────────────────│
│ id             PK          │   │ id             PK          │
│ residentId     FK → User   │   │ title / body               │
│ category       Category    │   │ isImportant    Boolean     │
│ description                │   │ authorId       FK → User   │
│ photoUrl / photoPath       │   │ createdAt                  │
│ status         Status      │   │────────────────────────────│
│ priority       Priority    │   │ IDX (isImportant,createdAt)│
│ isOverdue      Boolean     │   └────────────────────────────┘
│ overdueSince / resolvedAt  │
│ version        Int  ← OCC  │   ┌────────────────────────────┐
│ createdAt / updatedAt      │   │       SystemSetting        │
│────────────────────────────│   │────────────────────────────│
│ IDX (status, createdAt)    │   │ key PK / value / updatedAt │
│ IDX (isOverdue, createdAt) │   └────────────────────────────┘
│ IDX (category)             │
│ IDX (priority)             │   ┌────────────────────────────┐
│ IDX (residentId)           │   │      NotificationLog       │
└────────────────────────────┘   │────────────────────────────│
     │ 1                          │ id             PK          │
     │ N                          │ type           NotifType   │
┌────▼───────────────────────┐   │ recipientEmail             │
│  ComplaintStatusHistory    │   │ subject / bodyHtml         │
│      (APPEND-ONLY)         │   │ status         NotifStatus │
│────────────────────────────│   │ error / attempts           │
│ id             PK          │   │ relatedComplaintId         │
│ complaintId    FK          │   │ relatedNoticeId            │
│ actorId        FK → User   │   │ createdAt / updatedAt      │
│ previousStatus Status?     │   │────────────────────────────│
│ newStatus      Status      │   │ IDX (status, attempts)     │
│ note           String?     │   └────────────────────────────┘
│ createdAt                  │
│────────────────────────────│   ┌────────────────────────────┐
│ IDX (complaintId,createdAt)│   │       ComplaintPhoto       │
└────────────────────────────┘   │  (first-party photo bytes) │
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
| `Complaint(status, createdAt)` | Overdue sweep predicate + status-filtered queue reads. |
| `Complaint(isOverdue, createdAt)` | Overdue pinning (`ORDER BY isOverdue DESC`) + dashboard overdue count. |
| `Complaint(category)` / `(priority)` | Admin filters + category distribution aggregate. |
| `Complaint(residentId)` | "My complaints" — the resident hot path. |
| `ComplaintStatusHistory(complaintId, createdAt)` | A complaint's timeline in chronological order. |
| `Notice(isImportant, createdAt)` | Pinned-first notice feed. |
| `NotificationLog(status, attempts)` | Cron retry scan for `FAILED` rows with attempts remaining. |

</details>

<details>
<summary><strong>📁 Project structure</strong></summary>

```
society-maintenance-tracker/
├── prisma/
│   ├── schema.prisma            # Models, enums, compound indexes
│   ├── migrations/              # SQL migration history
│   └── seed.ts                  # One-command demo data
├── docs/
│   └── SYSTEM_DESIGN.md         # 800-word design write-up
├── src/
│   ├── middleware.ts            # Edge route protection (RBAC)
│   ├── app/
│   │   ├── api/                 # REST route handlers (thin controllers)
│   │   │   ├── auth/            # register · login · logout · me
│   │   │   ├── complaints/      # list · create · detail · status · priority
│   │   │   ├── photos/          # first-party upload + auth-gated serving
│   │   │   ├── notices/         # list · create
│   │   │   ├── admin/           # analytics · settings
│   │   │   ├── uploads/         # sign-url (cloud storage mode)
│   │   │   └── cron/sweep/      # scheduled SLA + notification retry
│   │   ├── admin/               # Admin pages
│   │   ├── resident/            # Resident pages
│   │   └── login/ · register/ · layout.tsx · globals.css
│   ├── components/              # AppShell, PhotoDropzone, StatusTimeline, …
│   ├── lib/
│   │   ├── auth/                # password (scrypt) · jwt (Web Crypto) · session
│   │   ├── db/                  # Prisma singleton
│   │   ├── email/               # templates · resendClient · dispatch + retry
│   │   ├── services/            # ← business logic lives here
│   │   ├── storage/             # signed-upload halves (cloud mode)
│   │   ├── utils/               # constants · sanitize · apiResponse
│   │   └── validation/          # Zod schemas
│   └── types/                   # Shared client-side types
├── .env.example
└── vercel.json                  # Cron schedule
```

**Layering rule:** route handlers only authenticate, validate with Zod, delegate to a service, and map errors to HTTP codes. All business logic lives in `src/lib/services` and `src/lib/email` — testable independent of HTTP.

</details>

<details>
<summary><strong>📦 Dependency discipline — 5 runtime deps, 0 vulnerabilities</strong></summary>

Runtime dependencies: `next`, `react`, `react-dom`, `@prisma/client`, `zod`. Everything else uses platform primitives:

| Common choice | Used instead | Why |
|---|---|---|
| `bcrypt` / `bcryptjs` | Node's native `crypto.scrypt` | Memory-hard KDF built into Node. No native bindings. |
| `jsonwebtoken` | Web Crypto `crypto.subtle` HS256 | Works in **both** Node routes and Edge middleware — `jsonwebtoken` cannot run in Edge at all. |
| `resend` / `nodemailer` | Native `fetch` → Resend HTTP API | The whole integration is one `POST`. |
| `@supabase/supabase-js` | Native `fetch` → Storage REST API | Two well-defined HTTP calls. |
| `axios` | Native `fetch` | Built into the platform. |
| `date-fns` / `moment` | Native `Intl` / `Date` | Formatting only. |
| `next-auth` | ~120-line session layer | Full control over RBAC, no unused provider surface. |

</details>

<details>
<summary><strong>🚀 Deployment guide (Vercel + Supabase/Neon)</strong></summary>

### 1 — Database

Create a project on [Supabase](https://supabase.com) or [Neon](https://neon.tech), copy both connection strings:
- `DATABASE_URL` → the **pooled** URI (append `?pgbouncer=true`)
- `DIRECT_URL` → the **direct** URI (for migrations)

> Serverless opens many short-lived connections — pooled at runtime + direct for migrations avoids exhausting Postgres limits.

### 2 — Deploy

1. Push to GitHub (`main`, public) → Vercel **New Project** → import (Next.js auto-detected).
2. Add all required [environment variables](#-reference). Set `NEXT_PUBLIC_APP_URL` to your final Vercel URL.
3. Deploy — the build already runs `prisma generate`.

### 3 — Migrate & seed production

```bash
DATABASE_URL="<prod-pooled-url>" DIRECT_URL="<prod-direct-url>" npx prisma migrate deploy
```

```bash
DATABASE_URL="<prod-pooled-url>" DIRECT_URL="<prod-direct-url>" npm run db:seed
```

The seed is idempotent — re-running never duplicates data.

### 4 — Cron (optional)

[`vercel.json`](vercel.json) registers `/api/cron/sweep` daily (the Hobby-plan limit). The app stays fully correct without it — the inline resweep on every admin read keeps overdue flags accurate; cron only adds scheduled email retries. Test manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.vercel.app/api/cron/sweep
```

### 5 — Post-deploy checklist

- [ ] Seeded admin signs in at `/login`
- [ ] Resident raises a complaint with a photo (zero storage config needed)
- [ ] Admin status change shows in the resident timeline (+ email if configured)
- [ ] Overdue complaints pin to the top of the admin queue
- [ ] Changing the SLA threshold re-flags complaints on next dashboard load
- [ ] Important notice pins for residents (+ broadcast email if configured)

</details>

---

## ✅ Submission Hygiene

| Requirement | Status |
|---|---|
| Branch `main` · public repo | ✅ |
| No `node_modules/`, `.env`, build artifacts, or editor configs committed | ✅ gitignored (`.env.example` provided) |
| Minimal dependencies | ✅ 5 runtime deps, 0 vulnerabilities |
| Builds and runs without errors | ✅ `npm run build` |
| README: setup · `.env.example` · API docs · DB schema | ✅ this document |
| System design write-up ≤ 800 words | ✅ [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) |
| Hosted application URL | ✅ [Live demo](https://society-maintenance-tracker-ansh01.vercel.app) |
