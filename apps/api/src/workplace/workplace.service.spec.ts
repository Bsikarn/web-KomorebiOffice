import { BadRequestException } from '@nestjs/common';
import { ApprovalDecision, LeaveStatus, Role, TaskStatus, WorkMode } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { AuthUser } from '../auth/auth.types';
import { WorkplaceService } from './workplace.service';

describe('WorkplaceService attendance rules', () => {
  const user: AuthUser = { sub: 'u1', email: 'demo@example.com', displayName: 'Demo', role: Role.EMPLOYEE, teamId: 't1' };

  it('requires an image for Office check-in', async () => {
    const db = { attendance: { findFirst: mock.fn(async () => null), create: mock.fn() } };
    const service = new WorkplaceService(db as never);
    await assert.rejects(service.checkIn(user, { workMode: WorkMode.OFFICE }), BadRequestException);
    assert.equal(db.attendance.create.mock.callCount(), 0);
  });

  it('allows WFH without an image', async () => {
    const created = { id: 'a1', workMode: WorkMode.WFH };
    const db = { attendance: { findFirst: mock.fn(async () => null), create: mock.fn(async (_input: unknown) => created) } };
    const service = new WorkplaceService(db as never);
    assert.deepEqual(await service.checkIn(user, { workMode: WorkMode.WFH }), created);
    assert.deepEqual(db.attendance.create.mock.calls[0].arguments[0], { data: { userId: 'u1', workMode: WorkMode.WFH, photoPath: null } });
  });

  it('prevents a second active check-in', async () => {
    const db = { attendance: { findFirst: mock.fn(async () => ({ id: 'active' })), create: mock.fn() } };
    const service = new WorkplaceService(db as never);
    await assert.rejects(service.checkIn(user, { workMode: WorkMode.WFH }), /already checked in/);
  });
});

describe('WorkplaceService persisted business data', () => {
  const user: AuthUser = { sub: 'u1', email: 'demo@example.com', displayName: 'Demo', role: Role.EMPLOYEE, teamId: 't1' };

  it('calculates leave duration on the server instead of trusting the client', async () => {
    const create = mock.fn(async (input: unknown) => input);
    const db = {
      leaveRequest: { create },
      user: { findMany: mock.fn(async () => []) },
      notification: { createMany: mock.fn() },
    };
    const service = new WorkplaceService(db as never);
    await service.createLeave(user, { type: 'VACATION', startDate: '2026-10-01', endDate: '2026-10-03', days: 99, reason: 'Trip' });
    assert.equal((create.mock.calls[0].arguments[0] as { data: { days: number } }).data.days, 3);
  });

  it('persists a direct message and notifies its recipient', async () => {
    const created = { id: 'm1', senderId: 'u1', recipientId: 'u2', body: 'Hello' };
    let savedBody = '';
    const db = {
      user: { findFirst: mock.fn(async () => ({ id: 'u2' })) },
      directMessage: { create: mock.fn(async (input: { data: { body: string } }) => { savedBody = input.data.body; return created; }) },
      notification: { createMany: mock.fn(async (_input: { data: Array<Record<string, unknown>> }) => ({ count: 1 })) },
    };
    const service = new WorkplaceService(db as never);
    assert.deepEqual(await service.sendMessage(user, { recipientId: 'u2', body: ' Hello ' }), created);
    assert.equal(savedBody, 'Hello');
    assert.equal(db.notification.createMany.mock.callCount(), 1);
    assert.deepEqual(db.notification.createMany.mock.calls[0].arguments[0], { data: [{ userId: 'u2', title: 'New message from Demo', body: 'Hello', actionType: 'MESSAGE', actionTargetId: 'u1' }] });
  });

  it('creates one independent task per teammate with a personal responsibility', async () => {
    const leader: AuthUser = { sub: 'leader-1', email: 'leader@example.com', displayName: 'Lead', role: Role.TEAM_LEADER, teamId: 't1' };
    const taskCreate = mock.fn(async (input: { data: { responsibility: string; assignees: { create: Array<{ userId: string }> } } }) => ({ id: `task-${input.data.assignees.create[0].userId}`, assignees: input.data.assignees.create, responsibility: input.data.responsibility }));
    const db = {
      user: { findMany: mock.fn(async () => [{ id: 'u1', teamId: 't1' }, { id: 'u2', teamId: 't1' }]) },
      task: { create: taskCreate },
      notification: { createMany: mock.fn(async () => ({ count: 1 })) },
      $transaction: mock.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const service = new WorkplaceService(db as never);
    const tasks = await service.createTask(leader, { title: 'Launch', description: 'Ship the release', assignments: [{ userId: 'u1', responsibility: 'Build the UI' }, { userId: 'u2', responsibility: 'Test the API' }] });
    assert.equal(tasks.length, 2);
    assert.equal(taskCreate.mock.callCount(), 2);
    assert.deepEqual(tasks.map(task => task.responsibility), ['Build the UI', 'Test the API']);
  });

  it('lets an assignee start a to-do task', async () => {
    const updated = { id: 'task-1', status: TaskStatus.IN_PROGRESS, createdById: 'leader-1', assignees: [] };
    const db = {
      taskAssignee: { findUnique: mock.fn(async () => ({ task: { id: 'task-1', status: TaskStatus.TODO } })) },
      task: { update: mock.fn(async () => updated) },
    };
    const service = new WorkplaceService(db as never);
    assert.deepEqual(await service.updateTaskStatus(user, 'task-1', { status: TaskStatus.IN_PROGRESS }), updated);
    assert.equal(db.task.update.mock.callCount(), 1);
  });

  it('pushes a leader-approved leave request to HR in realtime', async () => {
    const leader: AuthUser = { sub: 'leader-1', email: 'leader@example.com', displayName: 'Lead', role: Role.TEAM_LEADER, teamId: 't1' };
    const emit = mock.fn();
    const updated = { id: 'leave-1', status: LeaveStatus.PENDING_HR };
    const db = {
      leaveRequest: {
        findUnique: mock.fn(async () => ({ id: 'leave-1', userId: 'u1', status: LeaveStatus.PENDING_LEADER, user: { teamId: 't1', displayName: 'Demo' } })),
        update: mock.fn(async () => updated),
      },
      leaveApproval: { create: mock.fn(async () => ({ id: 'approval-1' })) },
      user: { findMany: mock.fn(async () => [{ id: 'hr-1' }]) },
      notification: { createMany: mock.fn(async () => ({ count: 1 })) },
      $transaction: mock.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const service = new WorkplaceService(db as never, { emit } as never);
    assert.deepEqual(await service.reviewLeave(leader, 'leave-1', { decision: ApprovalDecision.APPROVED }), updated);
    const approvalEvent = emit.mock.calls.find(call => (call.arguments[1] as { resource: string }).resource === 'approvals');
    assert.ok(approvalEvent);
    assert.deepEqual((approvalEvent.arguments[0] as string[]).sort(), ['hr-1', 'leader-1', 'u1']);
  });
});
