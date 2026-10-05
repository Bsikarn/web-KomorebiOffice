import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('permits a matching role', () => {
    const reflector = { getAllAndOverride: mock.fn(() => [Role.HR]) } as unknown as Reflector;
    const context = { getHandler: mock.fn(), getClass: mock.fn(), switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.HR } }) }) } as unknown as ExecutionContext;
    assert.equal(new RolesGuard(reflector).canActivate(context), true);
  });

  it('rejects a non-matching role', () => {
    const reflector = { getAllAndOverride: mock.fn(() => [Role.HR]) } as unknown as Reflector;
    const context = { getHandler: mock.fn(), getClass: mock.fn(), switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.EMPLOYEE } }) }) } as unknown as ExecutionContext;
    assert.equal(new RolesGuard(reflector).canActivate(context), false);
  });
});
