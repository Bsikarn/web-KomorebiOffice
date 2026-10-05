# Komorebi Office

Responsive employee workplace application built from the approved UX mockup and the architecture in `Komorebi_Office.pdf`.

## Stack

- Next.js + TypeScript web application
- NestJS REST API with JWT, Argon2id, custom guards and role-based access
- PostgreSQL + Prisma migrations/client
- Nginx reverse proxy and Certbot-ready ACME path
- Docker Compose for local database and University Cloud deployment

## Run locally

Requirements: Node.js 22+, pnpm 11+, Docker Desktop.

1. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a random value of at least 32 characters.
2. Start PostgreSQL: `pnpm db:dev`
3. Create tables and seed demos: `pnpm db:migrate`, then `pnpm db:seed`
4. Start both apps: `pnpm dev`
5. Open `http://localhost:3000`

Demo password for every seeded account: `Demo1234!`

- Employee: `demo@komorebi.local`
- Team Leader: `leader@komorebi.local`
- HR: `hr@komorebi.local`

## Verification

Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before deployment.

## University Cloud deployment

Recommended network placement:

```text
Internet :443
  -> public subnet: Nginx + Next.js
  -> private subnet: NestJS API + PostgreSQL
```

The provided Compose file keeps API and PostgreSQL on an internal Docker network. On two cloud instances, deploy `nginx` and `web` to the public instance, deploy `api` and `postgres` to the private instance, change `INTERNAL_API_URL` to the API private address, and permit the API port only from the public instance security group. Permit PostgreSQL only from the API host.

For TLS, point the domain at the public IP, issue the certificate with Certbot using `infra/certbot/www`, then add a 443 server block using files under `/etc/letsencrypt/live/<domain>/`. Never commit `.env` or certificates.

Before the first production start, run `prisma migrate deploy`; seed demo users only in demonstration environments.
