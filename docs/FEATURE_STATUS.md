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
| Virtual Office | OfficePresence, MeetingSpace | Connected |
| In-app chat | DirectMessage | Connected |
| Notifications | Notification | Connected |
| Profile | User, Department, Team | Connected |
| Settings | UserPreference | Connected |

External meeting and call destinations intentionally leave the application; the configured room URL is stored in `MeetingSpace`. Calendar weekend labels are derived from dates rather than stored business records.
