# Feature status

| Screen or feature | Persistent source | Status |
| --- | --- | --- |
| Login and role | User | Connected |
| Dashboard announcements | Announcement, AnnouncementAudience | Connected |
| Dashboard summary | Task, TaskAssignee, Attendance | Connected; browser-local current date is shown |
| Attendance calendar | Attendance, LeaveRequest | Connected; browser-local current date is shown |
| Leave balance/history | LeaveAllowance, LeaveRequest, LeaveApproval | Connected |
| Tasks and submissions | Task, TaskAssignee, TaskSubmission, TaskApproval | Connected; assign, history, start, submit, and approval flows |
| Team | User, Attendance, OfficePresence | Connected; role, work mode, and status remain visible on mobile |
| Approval queues | LeaveRequest, TaskSubmission | Connected |
| Employee directory/create | User, Department, Team, UserPreference, LeaveAllowance | Connected |
| Virtual Office | OfficePresence, MeetingSpace | Connected; click-to-walk coordinates persist and presence coordinates sync directly over SSE |
| In-app chat | DirectMessage | Connected; company-wide online contacts and realtime messages via SSE |
| Notifications | Notification | Connected; each item marks itself read and opens its related application screen |
| Profile | User, Department, Team, avatar bytes | Connected; name and photo editable |
| Settings | UserPreference | Connected |

External meeting and call destinations intentionally leave the application; Meeting A and Meeting B have independent URLs stored in `MeetingSpace`. Calendar weekend labels are derived from dates rather than stored business records. Browser-level notifications require a trusted HTTPS origin; realtime in-app updates continue to work over the classroom HTTP endpoint.
