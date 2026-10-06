# Roles and workflows

## Attendance

Office check-in requires an image before the record is created. WFH check-in creates a record without an image. A user cannot have two active attendance records. Check-out completes the active record.

## Leave

1. Employee creates a request: `PENDING_LEADER` (0/2).
2. A leader from the same team approves: `PENDING_HR` (1/2).
3. HR approves: `APPROVED`.
4. Rejection at either review step produces `REJECTED`; an explanation is mandatory.

## Tasks

Team Leaders can assign multiple members of their own team. HR can assign active employees. An assignee submits work; the creator (or HR) approves it or requests changes with an explanation.

## Announcements

Team Leaders can publish only to their own team. HR can target everyone, a team, or a role. Recipients receive a stored notification.

## Virtual Office and chat

Moving or warping writes the user's room to `OfficePresence`. Meeting links come from `MeetingSpace`. The employee list contains real same-team accounts. Chat messages are persisted in `DirectMessage`; opening a conversation marks received messages read.
