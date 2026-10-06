# Deployment

## University Cloud topology

- Public web tier: Nginx and Next.js
- Private API tier: NestJS
- Private database tier: PostgreSQL

Only the web entry point should be public. Nginx proxies `/api` over the private network. Restrict the API to the web private address and PostgreSQL to the API private address.

## Release procedure

1. Run all checks in `TESTING.md`.
2. Back up PostgreSQL.
3. Build immutable web and API artifacts.
4. Run `prisma migrate deploy` against the target database.
5. Seed only demonstration environments.
6. Restart API, then web/Nginx.
7. Check `/health`, public login, and one authenticated request per role.
8. Roll back the application artifact if health checks fail; database migrations require a reviewed forward-fix or restore plan.

## Operations notes

- Use a process supervisor or container restart policy so services recover after a host reboot.
- Configure HTTPS after a domain points to the public endpoint.
- Keep uploads on persistent storage and include them in backup policy.
- Rotate any credential shared outside the secret store.

The classroom endpoint and infrastructure-specific commands belong in the operator's private runbook, not in Git with credentials.
