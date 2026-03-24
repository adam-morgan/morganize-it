# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start frontend (Vite :9000) + backend (Express :9001) concurrently
npm run build        # Build both frontend & backend
npm run start        # Run production Express server
npm run test         # Run Jest tests (server-side only)
npm run test:all     # Lint + TypeScript check + build + test
npm run lint         # ESLint check
npm run tsc          # TypeScript type checking
npm run docker:preview  # Start Docker containers (nginx + express)
npx sst dev          # Start SST dev mode (Lambda + DynamoDB)
npx sst deploy       # Deploy to AWS
```

To run a single test file:
```bash
npx jest --config jest.config.ts path/to/test.ts
```

Tests use in-memory SQLite via `better-sqlite3` (configured in `.env.test`). Global setup runs migrations and seeds automatically.

## Architecture

**Full-stack TypeScript app**: React 19 + Express/Lambda + PostgreSQL/DynamoDB, with RxJS reactive patterns used throughout both frontend and backend. Supports two deployment models: Express + PostgreSQL (local dev) and Lambda + DynamoDB (AWS via SST).

### Backend (`src/server/`)

Layered architecture with RxJS Observables as the async primitive:

- **HTTP Abstraction** (`server/http/`) — Decouples route handlers from Express/Lambda via `HttpRequest`/`HttpResponse` types. Generic `ReactiveRoutes` base class provides CRUD operations; `AuthenticatedReactiveRoutes` adds auth + permission checks.
- **Features** (`server/features/`) — Business logic services (auth, notes). Services use a factory pattern to select Knex or DynamoDB implementations based on `DB_TYPE` env var.
- **Database** (`server/db/`) — `AbstractReactiveService<T>` with two implementations:
  - `ReactiveKnexService` — SQL (PostgreSQL/SQLite) via Knex. Migrations in `server/db/sql/migrations/`.
  - `ReactiveDynamoService` — DynamoDB via AWS SDK v3. Query builder in `server/db/dynamo/query-builder.ts`.
- **Auth** (`server/auth/`) — JWT-based authentication (replaced express-session). `signToken`/`verifyToken` using `jsonwebtoken`. Secrets from SST Resource bindings or `JWT_SECRET` env var.
- **Lambda** (`server/lambda/`) — API Gateway v2 handlers that reuse `ReactiveRoutes` by converting events to `HttpRequest`/`HttpResponse`. `withAuth()` middleware validates Bearer tokens.
- **Express Middleware** (`server/express/middleware/`) — JWT parsing middleware populates `req.jwtUserId`.
- **Permissions** (`server/permissions/`) — `PermissionResolver` interface injected into routes, not mixed into business logic.

Key flow (Express): Express route → JWT middleware → `AuthenticatedReactiveRoutes` → Feature service → `ReactiveKnexService` → PostgreSQL

Key flow (Lambda): API Gateway → Lambda handler → `withAuth()` → `ReactiveRoutes` → Feature service → `ReactiveDynamoService` → DynamoDB

### Infrastructure (`infra/`)

SST (Ion) configuration for AWS deployment to `ca-central-1`:

- **storage.ts** — DynamoDB table definitions (Users, Notebooks)
- **api.ts** — API Gateway v2 with individual Lambda handlers per route
- **web.ts** — Static site hosting via S3/CloudFront
- **dns.ts** — Custom domain configuration (notes.adammorgan.ca)

### Frontend (`src/`)

- **State**: Zustand stores with RxJS-integrated slices (`features/auth/`, `features/notes/`)
- **Routing**: Vite Pages plugin generates routes from `src/pages/` directory
- **HTTP**: RxJS `fromFetch` wrapper (`src/utils/fetch.ts`) with JWT Bearer token in `Authorization` header
- **Auth**: JWT tokens stored in localStorage (`setAuthToken`/`getAuthToken`)
- **UI**: Material-UI components
- **Dev proxy**: Vite proxies `/api` requests to Express backend

### Build Outputs

- Frontend: `.local/vite/dist/` (Vite + SWC)
- Backend: `.local/express/dist/api.js` (single esbuild bundle)

## Testing

Tests live in `src/tests/server/` and use Jest + supertest for integration testing against a real database (in-memory SQLite for tests). No mocks for the database layer.

- **Global setup** (`jest.globalSetup.ts`): Runs migrations + seeds
- **Per-test setup** (`jest.setup.ts`): Cleans up Knex connections
- **Seed data** (`tests/server/seeds/test-data.ts`): Pre-seeded users (`user1@gmail.com`, `user2@gmail.com`, etc.)

## Environment Variables

- `DB_TYPE` — `POSTGRESQL` (default) or `DYNAMODB`, selects database implementation
- `JWT_SECRET` — Secret for signing/verifying JWT tokens (falls back to SST Resource binding in Lambda)

## TypeScript

- Strict mode enabled, path alias `@/` maps to `src/`
- Type definitions in `src/typings/` (entity, auth, notes, find, error types)
- Separate `tsconfig.jest.json` for test compilation
