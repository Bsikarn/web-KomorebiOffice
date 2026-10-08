# Feature status

| Screen or feature | Persistent source | Status |
| --- | --- | --- |
| Login and role | User | Connected |
| Dashboard announcements | Announcement, AnnouncementAudience | Connected |
| Dashboard summary | Task, TaskAssignee, Attendance | Connected; browser-local current date is shown |
| Attendance calendar | Attendance, LeaveRequest | Connected; browser-local current date is shown |
| Leave balance/history | LeaveAllowance, LeaveRequest, LeaveApproval | Connected |
| Tasks and submissions | Task, TaskAssignee, TaskSubmission, TaskApproval | Connected; multi-person assignment creates a separate task and responsibility for each employee |
| Team | User, Attendance, OfficePresence | Connected; role, work mode, and status remain visible on mobile |
| Approval queues | LeaveRequest, TaskSubmission | Connected |
| Employee directory/create | User, Department, Team, UserPreference, LeaveAllowance | Connected |
| Virtual Office | OfficePresence, MeetingSpace | Connected; click-to-walk coordinates persist and presence coordinates sync directly over SSE |
| In-app chat | DirectMessage | Connected; all active employees are available and open conversations update via SSE |
| Notifications | Notification | Connected; incoming messages show a realtime in-app popup and saved notifications open the sender conversation directly |
| Profile and phone contact | User, Department, Team, avatar bytes | Connected; name, phone number, and photo editable; phone can be copied or opened with the device dialer |
| Settings | UserPreference | Connected |

External meeting destinations intentionally leave the application; Meeting A and Meeting B have independent URLs stored in `MeetingSpace`. Person-to-person calling uses the employee's stored phone number through a `tel:` link and never uses a meeting service. Calendar weekend labels are derived from dates rather than stored business records. Browser-level notifications require a trusted HTTPS origin; realtime in-app message popups continue to work over HTTP while the application is open.
