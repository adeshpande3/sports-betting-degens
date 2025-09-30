# Sports Betting App — Architecture

> Local-first, friend-group betting tracker with React frontend, type-safe API, and Postgres persistence. This doc orients coding assistants on system design, responsibilities, interfaces, and implementation order.

## 0) TL;DR / Project Compass

- **App purpose:** Show odds/lines from an external source, let invited users place bets, and auto-grade outcomes at game end; maintain user records and an auditable ledger.
- **Local dev goal:** Single command to run all services (web, API, DB, worker), seed with demo users/events, and run e2e tests.
- **Stack (local):**

  - **Frontend:** React + Next.js (App Router) + TypeScript
  - **Server:** **Next.js API routes (REST)** for all backend endpoints (no separate server)
  - **DB:** PostgreSQL (dockerized); ORM: Prisma
  - **Jobs:** Node worker (BullMQ + Redis) or node-cron for local
  - **Real-time:** Polling initially; optional WebSocket (Socket.IO) later
  - **Auth/Security:** **Descoped for local** — run in single-user or dev multi-user with a header flag; harden later for public
  - **Odds provider:** Pluggable REST fetcher (mock in local)

> **Non-goal (v0 local):** Payments, KYC, production-grade auth/ACL. Use points-only currency.

---

## 1) Domain Model (Core Concepts)

**User** — invited participant; can place wagers within configured limits.
**League** — NBA/NFL/etc.
**Event** — A single game/match with `startsAt`, `status` (scheduled|live|final), teams.
**Market** — A betting market for an event (e.g., moneyline, spread, total).
**Line** — A specific priced selection inside a market (e.g., _LAL -3.5 @ -110_), with `source`, `capturedAt`.
**Wager** — A user’s bet: selection, stake, accepted odds, `status` (pending|won|lost|push|void).
**Result** — Graded outcome for market/selection with `gradedAt`.
**LedgerEntry** — Double-entry-like record adjusting balances (wager placed, payout, manual adj).

### 1.1 Entity Diagram (textual)

```
User (1) ─┬─ (N) Wager ──(N:1)→ Line ──(N:1)→ Market ──(N:1)→ Event ──(N:1)→ League
          └─ (N) LedgerEntry (N:1 → User)
Event (1) ── (N) Market (type: MONEYLINE|SPREAD|TOTAL|PROP)
Market (1) ── (N) Line (selectionKey, price, point?, source, capturedAt)
Wager references Line (by id) and stores a snapshot of odds/point at acceptance time.
```

---

## 2) Data Model (Prisma schema sketch)

> Keep schema simple and additive; avoid breaking changes. Enforce referential integrity and key constraints.

- `User`: id (uuid), email (unique), displayName, role (ADMIN|PLAYER), balance (int, cents), createdAt
- `League`: id, name
- `Event`: id, leagueId, homeTeam, awayTeam, startsAt, status (SCHEDULED|LIVE|FINAL), externalRef
- `Market`: id, eventId, type (MONEYLINE|SPREAD|TOTAL), createdAt
- `Line`: id, marketId, selectionKey (e.g., HOME|AWAY|OVER|UNDER), point (decimal, nullable), price (int, American), source, capturedAt
- `Wager`: id, userId, lineId, stakeCents, acceptedPoint, acceptedPrice, placedAt, status (PENDING|WON|LOST|PUSH|VOID)
- `Result`: id, eventId, marketId, selectionKey, outcome (WIN|LOSE|PUSH|VOID), gradedAt
- `LedgerEntry`: id, userId, amountCents (signed), reason (WAGER_PLACED|PAYOUT|ADJUSTMENT), refTable (Wager|… ), refId, createdAt
- `Invite`: id, email, code, expiresAt, usedAt

> **Invariants**

- `Wager.status` transitions: PENDING → (WON|LOST|PUSH|VOID). No other transitions allowed.
- `LedgerEntry` sums to current `User.balance`. Use transactions to create paired entries for debits/credits when settling.

---

## 3) API Surface (REST via Next.js API routes)

> Namespace under `/api`. Return JSON. Use Zod for validation. **Auth is descoped** for local: either single-user mode or pass a dev header `x-user-id` to simulate identity.

### 3.1 Session (local only)

- **No real auth.** Middleware reads `x-user-id` (UUID or numeric id) and loads a User; fallback to a seeded default user if header missing.
- `POST /api/dev/switch-user` (local only) — convenience endpoint to switch the active user cookie or server-side memory for demos.

### 3.2 Reference Data

- `GET /api/leagues`
- `GET /api/events?leagueId&date`
- `GET /api/markets?eventId`
- `GET /api/lines?marketId`

### 3.3 Wagers & Balances

- `GET /api/me` — profile + balance (uses current local user)
- `GET /api/wagers?status` — current user's wagers
- `POST /api/wagers` — body: { lineId, stakeCents } → debits stake, create Wager (PENDING)
- `GET /api/leaderboard?period`

### 3.4 Admin/Backoffice (local only)

- `POST /api/admin/events/sync` — trigger odds sync (local)
- `POST /api/admin/grade` — force-grade a day (local/testing)
- `POST /api/admin/users/:id/adjust` — create manual ledger adj

### 3.5 Webhooks/Fetchers (internal, behind key even in dev)

- `POST /api/hooks/odds-snapshot` — bulk upsert Lines; stamps `capturedAt`

---

## 4) Odds Ingestion (local strategy)

- Implement **`/lib/odds/fetcher.ts`** with an interface `fetchOdds(date, league)` that returns `Event[] -> Market[] -> Line[]`.
- Provide **two implementations**:

  1. **MockOddsFetcher** (JSON fixtures) for deterministic tests.
  2. **HttpOddsFetcher** (reads `ODDS_API_URL`, `ODDS_API_KEY`).

- Snapshot policy: each run writes new `Line` rows with a new `capturedAt` and keeps history. Latest per (marketId, selectionKey) drives UI.
- Rate limiting: local no-op, plumb middleware for later.

---

## 5) Grading & Settlement

**Goal:** At event finalization, compute outcomes and settle wagers.

### 5.1 Worker

- A separate Node process (e.g., `pnpm worker`) consuming a queue or cron schedule.
- For local: use `node-cron` (every minute) to find `Event.status = FINAL` and `Wager.status = PENDING` → grade.

### 5.2 Algorithm (simplified)

1. Determine event final score (mock provider or fixture).
2. For each market type:

   - **Moneyline:** selectionKey == winner → WIN else LOSE.
   - **Spread:** compare (team margin ± acceptedPoint) → WIN/LOSE/PUSH.
   - **Total:** compare (total points vs acceptedPoint) → OVER/UNDER WIN/PUSH/LOSE.

3. For each `Wager`:

   - Update `status`.
   - Create `LedgerEntry` payout on WIN (stake × odds), refund on PUSH, none on LOSE.
   - All updates in a **transaction**.

> **Idempotency:** Grading job keyed by (eventId, attempt) with a lock; writing a `gradedAt` and job record prevents double-payouts.

---

## 6) Frontend (Next.js App Router)

- **Routes:**

  - `/` — dashboard: today’s events, my open bets, quick bet slip.
  - `/events/[id]` — markets + lines, place bet.
  - `/wagers` — history & filters.
  - `/admin` — sync odds, force-grade (local), invites.

- **State:** React Query (TanStack Query) for fetching & cache; Zod for forms.
- **Bet Slip:** sticky panel; validates balance and stake; posts `/api/wagers`.
- **Auth flow:** basic email/password (local), session cookie via NextAuth credentials provider.

---

## 7) Configuration / Environment

- `DATABASE_URL` — Postgres connection
- `ODDS_API_URL`, `ODDS_API_KEY` — optional (local uses mock by default)
- `REDIS_URL` — if using BullMQ (optional for local)
- `DEV_DEFAULT_USER_ID` — user id to assume when no `x-user-id` header is present
- `DEV_ALLOW_ADMIN=true` — enables admin endpoints locally only

Provide `.env.example` with the above.

---

## 8) Dev Experience

**Commands (package.json):**

- `dev`: runs web and worker concurrently (turbo or npm-run-all)
- `db:up`: docker-compose up -d postgres
- `db:migrate`: prisma migrate dev
- `db:seed`: seeds users/events/lines
- `test`: vitest unit tests
- `test:e2e`: Playwright e2e against local server
- `lint` / `typecheck`

**Docker (local optional):**

- `docker-compose.yml` for Postgres (and Redis if used)

**Seeding:**

- Creates 1 admin-like user flag (for local only) and 3 players with balances; 2 leagues, 4 events today, baseline lines.

---

## 9) Error Handling & Observability

- **API errors:** Standard JSON: `{ error: { code, message, details? } }`
- **Validation:** Zod schemas; 400 on invalid body/query.
- **Auth:** 401 unauthenticated, 403 unauthorized.
- **Logging:** pino logger (pretty in dev); log request id, user id, route, latency.
- **Tracing (optional local):** OpenTelemetry stubs left in place.

---

## 10) Security (local posture)

- **Auth descoped:** Do **not** deploy this configuration publicly. Local only.
- Simulated identity via `x-user-id` header or default user from env.
- Guard admin routes behind `DEV_ALLOW_ADMIN` and a simple shared secret in dev if needed.
- Rate-limit wager placement in-memory to surface API design (even if weak in dev).

> **Legal note:** Keep v0 points-only. Do not process real money locally.

---

## 11) Performance & Data Integrity

- Read models: React Query cache; server returns only latest `Line` per selection.
- DB indices: `Event(startsAt)`, `Line(marketId, selectionKey, capturedAt DESC)`, `Wager(userId, placedAt)`.
- Use **transactions** and **row-level locks** in grading to prevent double-settlement.

---

## 12) Implementation Order (Milestones)

**M1 — Skeleton**

1. Next.js app + Prisma + Postgres (no auth)
2. Schema: User, League, Event, Market, Line, Wager, LedgerEntry
3. Seed script with mock data + default dev user

**M2 — Odds & UI** 4. MockOddsFetcher + `/api/...` endpoints 5. Dashboard + Event page + Bet slip (place wager)

**M3 — Grading** 6. Worker cron grading + simple outcomes 7. Leaderboard + history

**M4 — Admin & Polish** 8. Admin controls: sync odds, grade day, simple user switcher 9. Error states, loading, empty screens; e2e tests

---

## 13) Testing Strategy

- **Unit:** domain grading functions with fixtures
- **Integration:** API route tests against a test DB (Vitest + Supertest)
- **E2E:** Playwright flows (login → place bet → force grade → check ledger)
- **Contract:** Zod schemas serve as contracts; optional Pact tests if using tRPC

---

## 14) Directory Layout (proposed)

```
apps/web/                # Next.js app
  app/
    (routes...)
  pages/api/             # REST routes (or app/api for App Router)
  lib/
    db.ts                # Prisma client
    odds/
      fetcher.ts         # interface
      mock.ts
      http.ts
    grading/
      rules.ts           # pure functions for outcomes
      settle.ts          # ledger + wagers in tx
  components/
  styles/
  tests/

packages/config/         # eslint, tsconfig, zod shared types
packages/prisma/         # schema.prisma, seeds, migrations
packages/worker/         # cron/queue worker (shares prisma)
```

---

## 15) Open Questions / Future Work

- Switch to WebSockets for live odds updates?
- Add prop markets and parlays (requires revised schema and payout math)
- Multi-currency or unit points only?
- Observability stack (Sentry) even in dev?
- Serverless-friendly DB driver & pooling when deploying

---

## 16) Runbook (Local)

1. `cp .env.example .env` and fill minimal vars (ensure `DEV_DEFAULT_USER_ID` is set after seeding)
2. `pnpm i`
3. `pnpm db:up && pnpm db:migrate && pnpm db:seed`
4. `pnpm dev` → app at `http://localhost:3000`

**Using multiple users locally:**

- Send `x-user-id: <uuid>` header from the UI (dev-only selector) or via REST client to impersonate seeded users.

---

## 17) Coding Assistant Notes

- Preserve type-safety: Zod on input; Prisma types on output. Avoid `any`.
- Keep grading logic **pure** (no IO) and cover with unit tests.
- All money-like values are **integers (cents)**; never store floats.
- Use transactions for: wager placement (debit + create), settlement (payout + status update).
- Prefer small PRs aligned to milestones; include tests and seed updates.
