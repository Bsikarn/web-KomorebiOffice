# REST API

All routes except login and health require `Authorization: Bearer <JWT>`.

## Authentication and account

- `POST /auth/login`
- `GET /auth/me`
- `GET|PATCH /profile`
- `GET /profile/avatar` — authenticated profile image bytes
- `GET|PATCH /preferences`
- `GET /events` — authenticated Server-Sent Events stream

## Attendance and leave

- `GET /attendance`
- `GET /attendance/calendar?month=YYYY-MM`
- `POST /attendance/check-in` — multipart photo required for Office; JSON for WFH
- `POST /attendance/check-out`
- `GET /leaves`
- `GET /leaves/balances`
- `POST /leaves`
- `GET|PATCH /approvals/leaves/:id` — Team Leader or HR

## Tasks and announcements

- `GET /tasks`
- `POST /tasks` — Team Leader or HR; accepts `assignments: [{ userId, responsibility }]` and creates one independent task per person
- `PATCH /tasks/:id/status` — an assignee starts a to-do task
- `POST /tasks/:id/submit`
- `GET|PATCH /approvals/tasks/:id` — Team Leader or HR
- `GET /announcements`
- `POST /announcements` — Team Leader or HR

## People and office

- `GET /team`
- `GET /employees` and `POST /employees` — HR only
- `GET /teams` — HR only
- `GET|PATCH /office/presence`
- `GET /office/spaces`
- `GET /messages/contacts`
- `GET /messages/:userId`
- `POST /messages`

## Supporting data

- `GET /dashboard`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /health`

DTO validation is defined in `apps/api/src/workplace/workplace.dto.ts`. Controllers define authorization; services enforce ownership and team constraints.

`PATCH /profile` uses multipart form data (`displayName`, optional `phoneNumber`, optional `avatar`). An empty phone number is stored as `null`. Avatar formats are JPG, PNG, or WebP up to 2 MB and the bytes are stored in PostgreSQL.

Message notifications store `actionType=MESSAGE` and the sender ID in `actionTargetId`. Both the realtime popup and the saved notification use this target to open the correct conversation directly.
