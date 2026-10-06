# Komorebi Office documentation

Komorebi Office is a responsive workplace application for attendance, leave, team tasks, announcements, approvals, employee administration, and a lightweight virtual office. The UI follows the approved UX mockup; technical decisions follow `Komorebi_Office.pdf`.

Start here:

- [Project overview](PROJECT_OVERVIEW.md) — scope, roles, and feature inventory
- [Architecture](ARCHITECTURE.md) — components, boundaries, and request flow
- [Data model](DATA_MODEL.md) — persistent entities and ownership
- [API](API.md) — authenticated routes and permissions
- [Roles and workflows](ROLES_AND_FLOWS.md) — expected behavior per role
- [Development](DEVELOPMENT.md) — local setup and conventions
- [Testing](TESTING.md) — verification checklist
- [Deployment](DEPLOYMENT.md) — University Cloud topology and runbook
- [Demo accounts](ACCOUNTS.md) — every seeded person and login
- [Feature status](FEATURE_STATUS.md) — database-backed status by screen

Never commit production passwords, JWT secrets, SSH credentials, certificates, or database connection strings. Store them only in environment files or the deployment secret store.
