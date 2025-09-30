# Copilot Instructions for Sports Betting Degens

## Project Overview

This is a **local-first sports betting tracker** for friend groups using React/Next.js with TypeScript. The app tracks bets on sports events with points-only currency (no real money). Key focus: type safety, transaction integrity, and developer experience.

## Architecture & Stack

- **Frontend**: Next.js 15 App Router + TypeScript + Tailwind CSS v4
- **Backend**: Next.js API routes (no separate server)
- **Database**: PostgreSQL with Prisma ORM
- **Jobs**: Node worker for bet grading and settlement
- **Auth**: Descoped for local dev - uses `x-user-id` header or default user

## Essential Development Workflows

### Setup & Development

```bash
# Development with Turbopack (faster builds)
pnpm dev           # Next.js dev server with --turbopack flag
pnpm build         # Production build with --turbopack
pnpm lint          # ESLint with Next.js + TypeScript configs

# Database operations (when implemented)
pnpm db:up         # Docker Postgres
pnpm db:migrate    # Prisma migrations
pnpm db:seed       # Seed demo data
```

### Project Structure Conventions

- **Path alias**: `@/*` maps to `./src/*` (see `tsconfig.json`)
- **API routes**: Place in `src/app/api/` following App Router pattern
- **Database**: Prisma schema in `packages/prisma/` (when created)
- **Types**: All money values as **integers (cents)** - never floats
- **Validation**: Use Zod schemas for API input validation

## Critical Domain Knowledge

### Core Entities & Relationships

```
User (1) ── (N) Wager ──(N:1)→ Line ──(N:1)→ Market ──(N:1)→ Event ──(N:1)→ League
         └─ (N) LedgerEntry (double-entry bookkeeping)
```

### Key Business Rules

- **Wager status flow**: `PENDING` → `WON|LOST|PUSH|VOID` (no other transitions)
- **Money integrity**: `LedgerEntry` sums must equal `User.balance`
- **Settlement**: Use database transactions for grading to prevent double-payouts
- **Odds handling**: Store historical `Line` records with `capturedAt` timestamps

### API Design Patterns

- **Authentication**: Read `x-user-id` header for user simulation (local dev only)
- **Validation**: Zod schemas for request/response validation
- **Error format**: `{ error: { code, message, details? } }`
- **Money**: All amounts as `stakeCents`, `amountCents` (integers)

## Implementation Guidelines

### When Adding Features

1. **Always** use TypeScript strict mode - no `any` types
2. **Database changes**: Use Prisma migrations, maintain referential integrity
3. **API routes**: Follow REST patterns under `/api/` namespace
4. **State management**: Use React Query (TanStack Query) for server state
5. **Forms**: Combine Zod validation with React Hook Form

### Key Files to Reference

- `architecture.md` - Complete system design and business logic
- `src/app/layout.tsx` - Font configuration with Geist fonts
- `eslint.config.mjs` - Flat config with Next.js + TypeScript rules
- `postcss.config.mjs` - Tailwind CSS v4 configuration

### Testing Strategy

- **Unit tests**: Pure functions (especially grading logic)
- **Integration**: API routes against test database
- **E2E**: Playwright for complete betting flows

## Common Gotchas

- Use `--turbopack` flag for dev/build commands (configured in package.json)
- Money calculations: always integers, use helper functions for display formatting
- Betting odds: American format (e.g., -110, +150) stored as integers
- Database transactions required for any balance-affecting operations

## Security Notes

**This is local development only** - do not deploy with current auth setup. The `x-user-id` header simulation is for development convenience only.
