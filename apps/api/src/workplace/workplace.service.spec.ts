import { BadRequestException } from '@nestjs/common';
import { Role, WorkMode } from '@prisma/client';
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
