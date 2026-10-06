# Feature status

| Screen or feature | Persistent source | Status |
| --- | --- | --- |
| Login and role | User | Connected |
| Dashboard announcements | Announcement, AnnouncementAudience | Connected |
| Dashboard summary | Task, TaskAssignee, Attendance | Connected |
| Attendance calendar | Attendance, LeaveRequest | Connected |
| Leave balance/history | LeaveAllowance, LeaveRequest, LeaveApproval | Connected |
| Tasks and submissions | Task, TaskAssignee, TaskSubmission, TaskApproval | Connected |
| Team | User, Attendance, OfficePresence | Connected |
| Approval queues | LeaveRequest, TaskSubmission | Connected |
| Employee directory/create | User, Department, Team, UserPreference, LeaveAllowance | Connected |
| Virtual Office | OfficePresence, MeetingSpace | Connected; click-to-walk coordinates persist and sync live |
| In-app chat | DirectMessage | Connected; realtime via SSE |
| Notifications | Notification | Connected; realtime in-app and browser notification permission UI |
| Profile | User, Department, Team, avatar bytes | Connected; name and photo editable |
| Settings | UserPreference | Connected |

External meeting and call destinations intentionally leave the application; Meeting A and Meeting B have independent URLs stored in `MeetingSpace`. Calendar weekend labels are derived from dates rather than stored business records. Browser-level notifications require a trusted HTTPS origin; realtime in-app updates continue to work over the classroom HTTP endpoint.
