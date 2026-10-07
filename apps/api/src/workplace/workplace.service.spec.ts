import { BadRequestException } from '@nestjs/common';
import { Role, TaskStatus, WorkMode } from '@prisma/client';
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
      notification: { createMany: mock.fn(async () => ({ count: 1 })) },
    };
    const service = new WorkplaceService(db as never);
    assert.deepEqual(await service.sendMessage(user, { recipientId: 'u2', body: ' Hello ' }), created);
    assert.equal(savedBody, 'Hello');
    assert.equal(db.notification.createMany.mock.callCount(), 1);
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
});
