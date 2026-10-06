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

Demo password for every seeded account: `Demo1234!`. See [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md) for the complete account list and [`docs/README.md`](docs/README.md) for the full project handoff.

## Verification

Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before deployment.

## University Cloud deployment

Recommended network placement:

```text
Internet :443
  -> public subnet: Nginx + Next.js
  -> private subnet: NestJS API + PostgreSQL
```

The provided Compose file keeps API and PostgreSQL on an internal Docker network. For the University Cloud layout, use three instances: deploy `nginx` and `web` to the public instance, then deploy `api` and PostgreSQL to separate private instances. Give the web instance a private interface so it can reach the API without exposing the API publicly. Permit the API port only from that private web interface, and permit PostgreSQL only from the API instance.

The classroom deployment is currently available at [http://45.77.40.35:10302](http://45.77.40.35:10302). Its public web tier proxies `/api` to the private API tier using `infra/nginx/university-cloud.conf`; the database has no public port mapping.

For TLS, point the domain at the public IP, issue the certificate with Certbot using `infra/certbot/www`, then add a 443 server block using files under `/etc/letsencrypt/live/<domain>/`. Never commit `.env` or certificates.

Before the first production start, run `prisma migrate deploy`; seed demo users only in demonstration environments.
