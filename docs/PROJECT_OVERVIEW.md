# Project overview

## Purpose

Komorebi Office gives a small organization one place to check in, coordinate work, request leave, review approvals, publish announcements, see colleagues, and communicate. It is a real full-stack demonstration: visible business records come from PostgreSQL through the NestJS API. An empty database produces honest empty states rather than fabricated cards.

## Roles

| Role | Main capabilities |
| --- | --- |
| Employee | Check in/out, view attendance, request leave, manage assigned tasks, view team and announcements, use Virtual Office and chat |
| Team Leader | Employee capabilities plus assign tasks, team announcements, leave step 1 approval, and task approval |
| HR | Team Leader-style capabilities plus company-wide employee directory, employee creation, targeted announcements, and leave step 2 approval |

## Screens

- Dashboard: announcement board, live attendance state, task and WFH summary
- Attendance: Office/WFH check-in and database-derived monthly calendar
- Tasks: task board sourced from assignments and submissions
- Virtual Office: persistent room presence, meeting-room links, teammate list, and direct messages
- Leave: policy balances, requests, approval progress, and rejection reason
- Team: current user's team, role, latest work mode, and presence
- Approvals: leave and submitted-task review queues
- Employees (HR): searchable/filterable company directory and account creation
- Profile: authenticated user's stored identity and organization data
- Settings: per-account stored preferences

## Source priority

1. `Komorebi_Office.pdf` for stack and architecture
2. Approved UX mockup for appearance and behavior
3. `Handout_1-4.md` for classroom-cloud capabilities
