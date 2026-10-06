import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, AudienceType, LeaveStatus, Role, TaskStatus, WorkMode } from '@prisma/client';
import * as argon2 from 'argon2';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { CheckInDto, CreateAnnouncementDto, CreateEmployeeDto, CreateLeaveDto, CreateTaskDto, PresenceDto, ReviewDto, SubmitTaskDto } from './workplace.dto';

@Injectable()
export class WorkplaceService {
  constructor(private readonly db: PrismaService) {}

  private async notify(userIds: string[], title: string, body: string) {
    if (!userIds.length) return;
    await this.db.notification.createMany({ data: [...new Set(userIds)].map(userId => ({ userId, title, body })) });
  }

  attendance(user: AuthUser) {
    return this.db.attendance.findMany({ where: { userId: user.sub }, orderBy: { checkedIn: 'desc' }, take: 90 });
  }

  async checkIn(user: AuthUser, dto: CheckInDto) {
    const active = await this.db.attendance.findFirst({ where: { userId: user.sub, status: 'WORKING' } });
    if (active) throw new BadRequestException('You are already checked in');
    if (dto.workMode === WorkMode.OFFICE && !dto.photoPath?.trim()) throw new BadRequestException('Office check-in requires a photo');
    return this.db.attendance.create({ data: { userId: user.sub, workMode: dto.workMode, photoPath: dto.workMode === WorkMode.OFFICE ? dto.photoPath : null } });
  }

  async checkOut(user: AuthUser) {
    const active = await this.db.attendance.findFirst({ where: { userId: user.sub, status: 'WORKING' }, orderBy: { checkedIn: 'desc' } });
    if (!active) throw new BadRequestException('No active attendance');
    return this.db.attendance.update({ where: { id: active.id }, data: { status: 'COMPLETED', checkedOut: new Date() } });
  }

  leaves(user: AuthUser) {
    return this.db.leaveRequest.findMany({ where: { userId: user.sub }, include: { approvals: { include: { reviewer: { select: { displayName: true, role: true } } } } }, orderBy: { createdAt: 'desc' } });
  }

  async createLeave(user: AuthUser, dto: CreateLeaveDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) throw new BadRequestException('End date must not be before start date');
    const created = await this.db.leaveRequest.create({ data: { userId: user.sub, type: dto.type, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), days: dto.days, reason: dto.reason } });
    const leaders = await this.db.user.findMany({ where: { role: Role.TEAM_LEADER, teamId: user.teamId ?? undefined, active: true }, select: { id: true } });
    await this.notify(leaders.map(x => x.id), 'Leave approval needed', `${user.displayName} requested ${dto.days} day(s) of leave.`);
    return created;
  }

  leaveApprovals(user: AuthUser) {
    if (user.role === Role.TEAM_LEADER) return this.db.leaveRequest.findMany({ where: { status: LeaveStatus.PENDING_LEADER, user: { teamId: user.teamId ?? '__none__' } }, include: { user: { select: { id: true, displayName: true, department: true } }, approvals: true }, orderBy: { createdAt: 'asc' } });
    return this.db.leaveRequest.findMany({ where: { status: LeaveStatus.PENDING_HR }, include: { user: { select: { id: true, displayName: true, department: true } }, approvals: true }, orderBy: { createdAt: 'asc' } });
  }

  async reviewLeave(user: AuthUser, id: string, dto: ReviewDto) {
    const request = await this.db.leaveRequest.findUnique({ where: { id }, include: { user: true } });
    if (!request) throw new NotFoundException();
    const expected = user.role === Role.TEAM_LEADER ? LeaveStatus.PENDING_LEADER : LeaveStatus.PENDING_HR;
    if (request.status !== expected || (user.role === Role.TEAM_LEADER && request.user.teamId !== user.teamId)) throw new ForbiddenException();
    if (dto.decision !== ApprovalDecision.APPROVED && !dto.note?.trim()) throw new BadRequestException('An explanation is required');
    const status = dto.decision === ApprovalDecision.APPROVED ? (user.role === Role.TEAM_LEADER ? LeaveStatus.PENDING_HR : LeaveStatus.APPROVED) : LeaveStatus.REJECTED;
    const [, updated] = await this.db.$transaction([
      this.db.leaveApproval.create({ data: { requestId: id, reviewerId: user.sub, reviewerRole: user.role, decision: dto.decision, note: dto.note } }),
      this.db.leaveRequest.update({ where: { id }, data: { status } }),
    ]);
    if (status === LeaveStatus.PENDING_HR) {
      const hrs = await this.db.user.findMany({ where: { role: Role.HR, active: true }, select: { id: true } });
      await this.notify(hrs.map(x => x.id), 'HR leave approval needed', `${request.user.displayName}'s leave passed Team Leader review.`);
    }
    await this.notify([request.userId], 'Leave request updated', `Your leave request is now ${status.toLowerCase().replaceAll('_', ' ')}.`);
    return updated;
  }

  tasks(user: AuthUser) {
    const where = user.role === Role.HR ? {} : user.role === Role.TEAM_LEADER ? { OR: [{ createdById: user.sub }, { assignees: { some: { userId: user.sub } } }] } : { assignees: { some: { userId: user.sub } } };
    return this.db.task.findMany({ where, include: { assignees: { include: { user: { select: { id: true, displayName: true } } } }, submissions: { include: { submitter: { select: { displayName: true } }, approvals: true } } }, orderBy: { updatedAt: 'desc' } });
  }

  async createTask(user: AuthUser, dto: CreateTaskDto) {
    const assignees = await this.db.user.findMany({ where: { id: { in: dto.assigneeIds }, active: true } });
    if (assignees.length !== new Set(dto.assigneeIds).size) throw new BadRequestException('One or more assignees are invalid');
    if (user.role === Role.TEAM_LEADER && assignees.some(x => x.teamId !== user.teamId)) throw new ForbiddenException('Team Leaders can only assign within their team');
    const task = await this.db.task.create({ data: { title: dto.title, description: dto.description, priority: dto.priority, dueAt: dto.dueAt ? new Date(dto.dueAt) : null, createdById: user.sub, assignees: { create: [...new Set(dto.assigneeIds)].map(userId => ({ userId })) } }, include: { assignees: true } });
    await this.notify(dto.assigneeIds, 'New task assigned', `${user.displayName} assigned “${dto.title}”.`);
    return task;
  }

  async submitTask(user: AuthUser, taskId: string, dto: SubmitTaskDto) {
    const assignment = await this.db.taskAssignee.findUnique({ where: { taskId_userId: { taskId, userId: user.sub } }, include: { task: true } });
    if (!assignment) throw new ForbiddenException();
    const [submission] = await this.db.$transaction([
      this.db.taskSubmission.create({ data: { taskId, submitterId: user.sub, note: dto.note } }),
      this.db.task.update({ where: { id: taskId }, data: { status: TaskStatus.SUBMITTED } }),
    ]);
    await this.notify([assignment.task.createdById], 'Task ready for review', `${user.displayName} submitted “${assignment.task.title}”.`);
    return submission;
  }

  taskApprovals(user: AuthUser) {
    return this.db.taskSubmission.findMany({ where: { approvals: { none: {} }, task: user.role === Role.HR ? {} : { createdById: user.sub } }, include: { task: true, submitter: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'asc' } });
  }

  async reviewTask(user: AuthUser, id: string, dto: ReviewDto) {
    const submission = await this.db.taskSubmission.findUnique({ where: { id }, include: { task: true } });
    if (!submission) throw new NotFoundException();
    if (user.role !== Role.HR && submission.task.createdById !== user.sub) throw new ForbiddenException();
    if (dto.decision === ApprovalDecision.CHANGES_REQUESTED && !dto.note?.trim()) throw new BadRequestException('An explanation is required');
    await this.db.$transaction([
      this.db.taskApproval.create({ data: { submissionId: id, reviewerId: user.sub, decision: dto.decision, note: dto.note } }),
      this.db.task.update({ where: { id: submission.taskId }, data: { status: dto.decision === ApprovalDecision.APPROVED ? TaskStatus.DONE : TaskStatus.IN_PROGRESS } }),
    ]);
    await this.notify([submission.submitterId], 'Task review completed', dto.decision === ApprovalDecision.APPROVED ? 'Your task was approved.' : dto.note ?? 'Changes were requested.');
    return { ok: true };
  }

  announcements(user: AuthUser) {
    return this.db.announcement.findMany({ where: { audiences: { some: { OR: [{ type: AudienceType.EVERYONE }, { type: AudienceType.TEAM, teamId: user.teamId ?? '__none__' }, { type: AudienceType.ROLE, role: user.role }] } } }, include: { author: { select: { displayName: true, role: true } }, audiences: true }, orderBy: { createdAt: 'desc' } });
  }

  async createAnnouncement(user: AuthUser, dto: CreateAnnouncementDto) {
    if (user.role === Role.TEAM_LEADER && (dto.audienceType !== AudienceType.TEAM || (dto.audienceTeamId && dto.audienceTeamId !== user.teamId))) throw new ForbiddenException('Team Leaders can only announce to their team');
    const audience = user.role === Role.TEAM_LEADER ? { type: AudienceType.TEAM, teamId: user.teamId } : { type: dto.audienceType, teamId: dto.audienceType === AudienceType.TEAM ? dto.audienceTeamId : null, role: dto.audienceType === AudienceType.ROLE ? dto.audienceRole : null };
    if (audience.type === AudienceType.TEAM && !audience.teamId || audience.type === AudienceType.ROLE && !audience.role) throw new BadRequestException('Audience target is required');
    const announcement = await this.db.announcement.create({ data: { title: dto.title, body: dto.body, authorId: user.sub, audiences: { create: audience } }, include: { audiences: true } });
    const recipients = await this.db.user.findMany({ where: { active: true, ...(audience.type === AudienceType.TEAM ? { teamId: audience.teamId! } : audience.type === AudienceType.ROLE ? { role: audience.role! } : {}) }, select: { id: true } });
    await this.notify(recipients.map(x => x.id), 'New announcement', dto.title);
    return announcement;
  }

  team(user: AuthUser) { return this.db.user.findMany({ where: { teamId: user.teamId ?? '__none__', active: true }, select: { id: true, displayName: true, role: true, department: true, presence: true } }); }
  employees(departmentId?: string, role?: Role) { return this.db.user.findMany({ where: { active: true, departmentId: departmentId || undefined, role: role || undefined }, select: { id: true, email: true, displayName: true, role: true, department: true, team: true, presence: true }, orderBy: { displayName: 'asc' } }); }
  async createEmployee(dto: CreateEmployeeDto) { return this.db.user.create({ data: { email: dto.email.toLowerCase(), passwordHash: await argon2.hash(dto.password), displayName: dto.displayName, role: dto.role, departmentId: dto.departmentId, teamId: dto.teamId }, select: { id: true, email: true, displayName: true, role: true } }); }
  teams() { return this.db.team.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }); }
  notifications(user: AuthUser) { return this.db.notification.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' }, take: 30 }); }
  markNotification(user: AuthUser, id: string) { return this.db.notification.updateMany({ where: { id, userId: user.sub }, data: { readAt: new Date() } }); }
  presence() { return this.db.officePresence.findMany({ where: { room: { not: 'OFFLINE' } }, include: { user: { select: { id: true, displayName: true, role: true } } } }); }
  updatePresence(user: AuthUser, dto: PresenceDto) { return this.db.officePresence.upsert({ where: { userId: user.sub }, create: { userId: user.sub, room: dto.room, x: dto.x ?? 0, y: dto.y ?? 0 }, update: { room: dto.room, x: dto.x ?? 0, y: dto.y ?? 0 } }); }
}
