# Architecture

```text
Browser
  -> Nginx public entry point
     -> Next.js web application
     -> /api proxy to NestJS API (private network)
        -> Prisma
           -> PostgreSQL (private network)
```

## Components

- `apps/web`: Next.js 16, React 19, TypeScript. Interactive client application; JWT is sent as a Bearer token to same-origin `/api`.
- `apps/api`: NestJS REST API. Validation, authentication, role guards, business rules, notifications, and persistence.
- PostgreSQL: source of truth for all user-visible business data.
- Prisma: schema, migrations, generated client, and demonstration seed.
- Nginx: one public origin; API and database are not directly exposed.

## Security boundaries

- Passwords are hashed with Argon2id.
- JWT-protected routes use `JwtAuthGuard`; role-restricted routes also use `RolesGuard`.
- Team Leaders are limited to their team for assignments, announcements, messages, and leave review.
- HR-only employee routes are protected at the controller.
- Office check-in accepts JPG, PNG, or WebP up to 5 MB and requires an image. WFH does not accept or store one.
- API rate limiting and Helmet are enabled.

## Data rule

The frontend must not ship sample rows as error fallbacks. Fetch failure and no records are distinct: failures should be reported or produce an unavailable state; successful empty responses render an empty state.
