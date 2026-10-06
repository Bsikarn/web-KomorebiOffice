# Demonstration accounts

These accounts are created by `apps/api/prisma/seed.ts`; they are real database users with Argon2id password hashes. All use the demonstration password `Demo1234!` and must not be used in production.

| Name | Email | Role | Team |
| --- | --- | --- | --- |
| Beau | demo@komorebi.local | Employee | Komorebi Product |
| Night | leader@komorebi.local | Team Leader | Komorebi Product |
| Aom | hr@komorebi.local | HR | — |
| Mina | mina@komorebi.local | Employee | Komorebi Product |
| Rin | rin@komorebi.local | Employee | Komorebi Product |
| Ploy | ploy@komorebi.local | Employee | Komorebi Product |
| Jay | jay@komorebi.local | Employee | Komorebi Product |
| Nara | nara@komorebi.local | Employee | Komorebi Product |

The login screen exposes every seeded account. An HR-created employee is also a real login immediately after creation, with the temporary password HR entered.
