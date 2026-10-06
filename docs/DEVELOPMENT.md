# Development

## Requirements

- Node.js 22+
- pnpm 11+
- Docker Desktop or another PostgreSQL 16 instance

## First run

1. Copy `.env.example` to `.env` and replace all placeholder values.
2. Run `pnpm install`.
3. Start PostgreSQL with `pnpm db:dev`.
4. Run `pnpm db:migrate` and `pnpm db:seed`.
5. Start the applications with `pnpm dev`.
6. Open `http://localhost:3000`.

## Working conventions

- Add business validation to the API service, not only the browser.
- Add DTO validation for all write payloads.
- Protect privileged routes with role decorators and service-level ownership checks.
- Add a Prisma migration for every schema change.
- Never add UI mock fallbacks. Seed data belongs in `prisma/seed.ts` and therefore exists in the database.
- Keep secrets out of Git. `.env.example` contains names and safe placeholders only.

Before committing, run `pnpm typecheck`, `pnpm test`, and `pnpm build`.
