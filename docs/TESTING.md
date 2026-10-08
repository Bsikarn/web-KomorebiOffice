# Testing

## Automated checks

Run from the repository root:

```text
pnpm typecheck
pnpm test
pnpm build
```

API unit tests cover role guards, attendance rules, server-side leave duration, persisted chat, and starting an assigned task. New business rules should include service-level tests. Build verification catches server/client integration and generated Prisma type issues.

## Required smoke test

1. Sign in with one account from each role.
2. Employee: WFH check-in/out, Office photo requirement, leave creation, task list, team list, profile, and settings persistence.
3. Team Leader: assign two people with different responsibilities, verify two independent task records and their history, team announcement, leave step 1, task review and explanation flow.
4. HR: employee filters, new employee login, audience announcement, leave step 2, and task approval.
5. Virtual Office: enter each room, warp to meeting, open configured meeting link, click a real teammate on the map, open chat, send a message, sign in as the recipient, verify the realtime popup, and verify both the popup and saved notification open the sender's conversation.
6. Profile/contact: save and clear a phone number, verify it persists, then check copy-number and `tel:` actions from an employee contact card. A missing number must show an explicit empty state.
7. Refresh each screen and confirm the same database records return.
8. Verify an empty table displays an empty state and never invented records.
