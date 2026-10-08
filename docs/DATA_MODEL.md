# Data model

| Entity | Purpose |
| --- | --- |
| Department, Team | Organization structure |
| User | Login identity, role, job title, optional phone number, department, team, active state |
| UserPreference | Per-user notification, language, and theme settings |
| Attendance | Office/WFH check-in, image reference, state, check-out time |
| LeaveAllowance | Annual allowance per user and leave type |
| LeaveRequest, LeaveApproval | Two-step leave workflow and reviewer notes |
| Task, TaskAssignee | Independent per-employee task with a personal responsibility and assignee |
| TaskSubmission, TaskApproval | Employee submission and reviewer decision |
| Announcement, AnnouncementAudience | Posts targeted to everyone, team, or role |
| Notification | Per-user activity notification, read state, and optional typed action target |
| OfficePresence | Current virtual room and position for each user |
| MeetingSpace | Persisted meeting room name and external meeting URL |
| DirectMessage | Persisted team chat messages and read state |

The canonical schema is `apps/api/prisma/schema.prisma`. Every schema change must include a migration in `apps/api/prisma/migrations` and regenerated Prisma client types.

Leave balances are calculated from `LeaveAllowance` minus approved `LeaveRequest.days` in the current year. Calendar holidays are weekend dates derived from the calendar; attendance and leave labels come from stored records.
