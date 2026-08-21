# System Design — Society Maintenance Tracker

## 1. Complaint Lifecycle & Status History Model

`Complaint` holds current state; `ComplaintStatusHistory` is an **append-only ledger** of how it got there. Nothing ever updates or deletes a history row — each is one immutable fact: `(complaintId, actorId, previousStatus, newStatus, note, createdAt)`. Complaint creation writes the first row with `previousStatus = null`, so the resident timeline reads "Raised → In Progress → Resolved" with no synthetic gaps.

Keeping a denormalized `status` column alongside the ledger is deliberate. Folding the ledger on every read would make the admin queue an aggregate-per-row query; the column keeps list and dashboard queries indexed and O(log n), while the ledger remains the source of truth for *why*. The two cannot drift — they are written in one transaction.

Transitions run inside `prisma.$transaction`: read state → validate against the state machine → `updateMany` → append history. The machine treats `RESOLVED` as terminal (`OPEN → IN_PROGRESS | RESOLVED`, `IN_PROGRESS → OPEN | RESOLVED`, `RESOLVED → ∅`), so "once resolved, it is closed" is enforced by code, not convention; an illegal transition returns `409` rather than corrupting the ledger.

Concurrency uses an **optimistic version token**. Each complaint carries `version`; the update's `WHERE` clause requires the version just read, and increments it. Two admins acting on one ticket simultaneously produce a winner and a `409 ConcurrentModificationError` — a lost update is impossible without pessimistic row locks. Emails dispatch *after* commit, so a mail failure can never roll back a committed state change.

## 2. Overdue SLA Detection Engine

The threshold lives in `SystemSetting` (key `overdue_threshold_days`), so it is changed from the admin UI without a redeploy or migration.

Detection is **hybrid**. Complaints carry a persisted, indexed `isOverdue` boolean, reconciled by `resweepOverdueFlags()`: two set-based `updateMany` statements — one flags non-resolved complaints older than `now − N days`, the other unflags rows that resolved or fell back inside the window after a threshold change. Both are idempotent and driven by the `[status, createdAt]` and `[isOverdue, createdAt]` indexes, so the sweep costs O(rows actually changing), not O(table).

That sweep runs from two places: an hourly Vercel Cron hitting `/api/cron/sweep` (bearer-secret authorized), and inline before every admin list and dashboard read. The scheduled pass keeps flags fresh for anything reading the column directly; the inline pass guarantees correctness even if cron is delayed, fails, or the threshold changed seconds ago. Whichever runs first wins; the other is a cheap no-op.

Storing the flag rather than computing `createdAt < now − N` per query is what lets overdue tickets **pin to the top**: `ORDER BY isOverdue DESC, priority DESC, createdAt ASC` is index-backed and evaluated entirely in Postgres, so ordering holds across page boundaries, not just within a page. Priority sorts natively because Postgres orders an enum by declaration order, and `PriorityLevel` is declared `LOW, MEDIUM, HIGH`.

## 3. Secure Photo Handling Pipeline

Photos never transit the application server. The browser posts `{fileName, mimeType, fileSizeBytes}` to `/api/uploads/sign-url`; the server authenticates, validates MIME against an allowlist (`jpeg/png/webp`) and size against a 5 MB cap, then mints a **short-lived signed upload URL** scoped to one object path. The browser `PUT`s the bytes straight to Supabase Storage.

Every object is namespaced under the uploading resident's id (`{residentId}/{timestamp}-{safeName}`), so a leaked token cannot write outside that folder. Crucially, the client posts back only the *path*: the server re-validates that it owns exactly that two-segment shape (making `..` unrepresentable) and derives the display URL from its own template. Accepting a client-supplied URL would let any resident point a complaint photo at an arbitrary host, turning every admin who opens the ticket into a tracking beacon. The service-role key stays server-side.

## 4. Asynchronous Notification Pipeline

A domain event and its email are deliberately decoupled. The transaction commits first, then the dispatch is scheduled with Next's `after()` — not a bare un-awaited promise, which a serverless platform silently kills the moment the response flushes. `after()` keeps the invocation alive for the send while still returning immediately. The dispatcher writes a `NotificationLog` row — recipient, subject, **fully rendered body**, status — *before* calling the provider; success marks it `SENT`, failure marks it `FAILED` with the error and an attempt count.

That log is the retry boundary. The hourly sweep re-sends `FAILED` rows with attempts below `NOTIFICATION_MAX_ATTEMPTS` (5), plus any row still `PENDING` past a staleness window — a row is only left `PENDING` if the process died mid-send, so those are orphans, not in-flight work. Persisting the rendered body means a retry resends the original email, not a reconstruction.

Broadcasts fan out per resident with one log row each, so a bad address never blocks the rest. Email goes via Resend's HTTP API through native `fetch` — no SDK for one POST. Interpolated user text is HTML-escaped, since email bodies get none of JSX's automatic escaping.

---
*Word count: 795 (limit: 800)*
