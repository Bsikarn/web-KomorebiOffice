import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, AudienceType, LeaveStatus, Role, TaskStatus, WorkMode } from '@prisma/client';
import * as argon2 from 'argon2';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { CheckInDto, CreateAnnouncementDto, CreateEmployeeDto, CreateLeaveDto, CreateTaskDto, PresenceDto, ReviewDto, SendMessageDto, SubmitTaskDto, UpdatePreferencesDto, UpdateProfileDto, UpdateTaskStatusDto } from './workplace.dto';
import { RealtimeService } from './realtime.service';

@Injectable()
export class WorkplaceService {
  constructor(private readonly db: PrismaService, private readonly realtime?: RealtimeService) {}

  events(user: AuthUser) { return this.realtime!.events(user.sub); }

  private async activeUserIds() {
    return (await this.db.user.findMany({ where: { active: true }, select: { id: true } })).map(user => user.id);
  }

  private async notify(userIds: string[], title: string, body: string, action?: { type: string; targetId?: string }) {
    if (!userIds.length) return;
    const recipients = [...new Set(userIds)];
    await this.db.notification.createMany({ data: recipients.map(userId => ({ userId, title, body, actionType: action?.type, actionTargetId: action?.targetId })) });
    this.realtime?.emit(recipients, { resource: 'notifications', title, body, actionType: action?.type, actionTargetId: action?.targetId });
  }

  attendance(user: AuthUser) {
    return this.db.attendance.findMany({ where: { userId: user.sub }, orderBy: { checkedIn: 'desc' }, take: 90 });
  }

  async attendanceCalendar(user: AuthUser, month?: string) {
    const parsed = month && /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    const start = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
    const end = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 1));
    const [attendance, leaves] = await Promise.all([
      this.db.attendance.findMany({ where: { userId: user.sub, checkedIn: { gte: start, lt: end } }, orderBy: { checkedIn: 'asc' } }),
      this.db.leaveRequest.findMany({ where: { userId: user.sub, status: LeaveStatus.APPROVED, startDate: { lt: end }, endDate: { gte: start } }, select: { id: true, startDate: true, endDate: true, type: true } }),
    ]);
    return { month: start.toISOString().slice(0, 7), attendance, leaves };
  }

  async checkIn(user: AuthUser, dto: CheckInDto) {
    const active = await this.db.attendance.findFirst({ where: { userId: user.sub, status: 'WORKING' } });
    if (active) throw new BadRequestException('You are already checked in');
    if (dto.workMode === WorkMode.OFFICE && !dto.photoPath?.trim()) throw new BadRequestException('Office check-in requires a photo');
    const attendance = await this.db.attendance.create({ data: { userId: user.sub, workMode: dto.workMode, photoPath: dto.workMode === WorkMode.OFFICE ? dto.photoPath : null } });
    this.realtime?.emit(await this.activeUserIds(), { resource: 'attendance' });
    return attendance;
  }

  async checkOut(user: AuthUser) {
    const active = await this.db.attendance.findFirst({ where: { userId: user.sub, status: 'WORKING' }, orderBy: { checkedIn: 'desc' } });
    if (!active) throw new BadRequestException('No active attendance');
    const attendance = await this.db.attendance.update({ where: { id: active.id }, data: { status: 'COMPLETED', checkedOut: new Date() } });
    this.realtime?.emit(await this.activeUserIds(), { resource: 'attendance' });
    return attendance;
  }

  leaves(user: AuthUser) {
    return this.db.leaveRequest.findMany({ where: { userId: user.sub }, include: { approvals: { include: { reviewer: { select: { displayName: true, role: true } } } } }, orderBy: { createdAt: 'desc' } });
  }

  async leaveBalances(user: AuthUser) {
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const [allowances, used] = await Promise.all([
      this.db.leaveAllowance.findMany({ where: { userId: user.sub } }),
      this.db.leaveRequest.groupBy({ by: ['type'], where: { userId: user.sub, status: LeaveStatus.APPROVED, startDate: { gte: yearStart } }, _sum: { days: true } }),
    ]);
    return allowances.map(item => ({ type: item.type, allowance: item.allowance, used: used.find(row => row.type === item.type)?._sum.days ?? 0, remaining: item.allowance - (used.find(row => row.type === item.type)?._sum.days ?? 0) }));
  }

  async createLeave(user: AuthUser, dto: CreateLeaveDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) throw new BadRequestException('End date must not be before start date');
    const days = Math.floor((new Date(dto.endDate).getTime() - new Date(dto.startDate).getTime()) / 86_400_000) + 1;
    const created = await this.db.leaveRequest.create({ data: { userId: user.sub, type: dto.type, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), days, reason: dto.reason } });
    const leaders = await this.db.user.findMany({ where: { role: Role.TEAM_LEADER, teamId: user.teamId ?? undefined, active: true }, select: { id: true } });
    await this.notify(leaders.map(x => x.id), 'Leave approval needed', `${user.displayName} requested ${days} day(s) of leave.`);
    this.realtime?.emit([user.sub, ...leaders.map(x => x.id)], { resource: 'leaves' });
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
    let nextReviewerIds: string[] = [];
    if (status === LeaveStatus.PENDING_HR) {
      const hrs = await this.db.user.findMany({ where: { role: Role.HR, active: true }, select: { id: true } });
      nextReviewerIds = hrs.map(x => x.id);
      await this.notify(nextReviewerIds, 'HR leave approval needed', `${request.user.displayName}'s leave passed Team Leader review.`);
    }
    await this.notify([request.userId], 'Leave request updated', `Your leave request is now ${status.toLowerCase().replaceAll('_', ' ')}.`);
    this.realtime?.emit([request.userId, user.sub, ...nextReviewerIds], { resource: 'approvals' });
    return updated;
  }

  tasks(user: AuthUser) {
    const where = user.role === Role.HR ? {} : user.role === Role.TEAM_LEADER ? { OR: [{ createdById: user.sub }, { assignees: { some: { userId: user.sub } } }] } : { assignees: { some: { userId: user.sub } } };
    return this.db.task.findMany({ where, include: { assignees: { include: { user: { select: { id: true, displayName: true } } } }, submissions: { include: { submitter: { select: { displayName: true } }, approvals: true } } }, orderBy: { updatedAt: 'desc' } });
  }

  async createTask(user: AuthUser, dto: CreateTaskDto) {
    const assigneeIds = dto.assignments.map(item => item.userId);
    if (new Set(assigneeIds).size !== assigneeIds.length) throw new BadRequestException('Each teammate can only be assigned once');
    const assignees = await this.db.user.findMany({ where: { id: { in: assigneeIds }, active: true } });
    if (assignees.length !== assigneeIds.length) throw new BadRequestException('One or more assignees are invalid');
    if (user.role === Role.TEAM_LEADER && assignees.some(x => x.teamId !== user.teamId)) throw new ForbiddenException('Team Leaders can only assign within their team');
    const tasks = await this.db.$transaction(dto.assignments.map(assignment => this.db.task.create({ data: { title: dto.title, description: dto.description, responsibility: assignment.responsibility.trim(), priority: dto.priority, dueAt: dto.dueAt ? new Date(dto.dueAt) : null, createdById: user.sub, assignees: { create: [{ userId: assignment.userId }] } }, include: { assignees: true } })));
    await Promise.all(dto.assignments.map(assignment => this.notify([assignment.userId], 'New task assigned', `${user.displayName} assigned “${dto.title}”: ${assignment.responsibility.trim()}`, { type: 'TASK', targetId: tasks.find(task => task.assignees.some(item => item.userId === assignment.userId))?.id })));
    this.realtime?.emit([user.sub, ...assigneeIds], { resource: 'tasks' });
    return tasks;
  }

  async updateTaskStatus(user: AuthUser, taskId: string, dto: UpdateTaskStatusDto) {
    if (dto.status !== TaskStatus.IN_PROGRESS) throw new BadRequestException('Only starting a task is supported here');
    const assignment = await this.db.taskAssignee.findUnique({ where: { taskId_userId: { taskId, userId: user.sub } }, include: { task: true } });
    if (!assignment) throw new ForbiddenException('This task is not assigned to you');
    if (assignment.task.status !== TaskStatus.TODO) throw new BadRequestException('Only a to-do task can be started');
    const task = await this.db.task.update({ where: { id: taskId }, data: { status: TaskStatus.IN_PROGRESS }, include: { assignees: { include: { user: { select: { id: true, displayName: true } } } } } });
    this.realtime?.emit([user.sub, task.createdById], { resource: 'tasks' });
    return task;
  }

  async submitTask(user: AuthUser, taskId: string, dto: SubmitTaskDto) {
    const assignment = await this.db.taskAssignee.findUnique({ where: { taskId_userId: { taskId, userId: user.sub } }, include: { task: true } });
    if (!assignment) throw new ForbiddenException();
    if (assignment.task.status === TaskStatus.SUBMITTED || assignment.task.status === TaskStatus.DONE) throw new BadRequestException('This task is not open for another submission');
    const [submission] = await this.db.$transaction([
      this.db.taskSubmission.create({ data: { taskId, submitterId: user.sub, note: dto.note } }),
      this.db.task.update({ where: { id: taskId }, data: { status: TaskStatus.SUBMITTED } }),
    ]);
    await this.notify([assignment.task.createdById], 'Task ready for review', `${user.displayName} submitted “${assignment.task.title}”.`);
    this.realtime?.emit([user.sub, assignment.task.createdById], { resource: 'tasks' });
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
    this.realtime?.emit([submission.submitterId, user.sub], { resource: 'tasks' });
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
    this.realtime?.emit(recipients.map(x => x.id), { resource: 'announcements' });
    return announcement;
  }

  team(user: AuthUser) { return this.db.user.findMany({ where: { teamId: user.teamId ?? '__none__', active: true }, select: { id: true, displayName: true, jobTitle: true, phoneNumber: true, role: true, department: true, presence: true, attendances: { orderBy: { checkedIn: 'desc' }, take: 1, select: { workMode: true, status: true, checkedIn: true } } } }); }
  employees(departmentId?: string, role?: Role) { return this.db.user.findMany({ where: { active: true, departmentId: departmentId || undefined, role: role || undefined }, select: { id: true, email: true, displayName: true, jobTitle: true, phoneNumber: true, role: true, department: true, team: true, presence: true }, orderBy: { displayName: 'asc' } }); }
  async createEmployee(dto: CreateEmployeeDto) {
    const passwordHash = await argon2.hash(dto.password);
    const created = await this.db.$transaction(async db => {
      const created = await db.user.create({ data: { email: dto.email.toLowerCase(), passwordHash, displayName: dto.displayName, jobTitle: dto.jobTitle, role: dto.role, departmentId: dto.departmentId, teamId: dto.teamId }, select: { id: true, email: true, displayName: true, role: true } });
      await db.userPreference.create({ data: { userId: created.id } });
      await db.leaveAllowance.createMany({ data: [{ userId: created.id, type: 'VACATION', allowance: 10 }, { userId: created.id, type: 'SICK', allowance: 10 }, { userId: created.id, type: 'PERSONAL', allowance: 3 }] });
      return created;
    });
    this.realtime?.emit(await this.activeUserIds(), { resource: 'employees' });
    return created;
  }
  teams() { return this.db.team.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }); }
  notifications(user: AuthUser) { return this.db.notification.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' }, take: 30 }); }
  markNotification(user: AuthUser, id: string) { return this.db.notification.updateMany({ where: { id, userId: user.sub }, data: { readAt: new Date() } }); }
  presence() { return this.db.officePresence.findMany({ where: { room: { not: 'OFFLINE' } }, include: { user: { select: { id: true, displayName: true, role: true } } } }); }
  async updatePresence(user: AuthUser, dto: PresenceDto) {
    const presence = await this.db.officePresence.upsert({ where: { userId: user.sub }, create: { userId: user.sub, room: dto.room, x: dto.x ?? 50, y: dto.y ?? 50 }, update: { room: dto.room, x: dto.x ?? 50, y: dto.y ?? 50 } });
    this.realtime?.emit(await this.activeUserIds(), { resource: 'presence', presence: { userId: user.sub, room: presence.room, x: presence.x, y: presence.y, displayName: user.displayName } });
    return presence;
  }
  meetingSpaces() { return this.db.meetingSpace.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }

  async dashboard(user: AuthUser) {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
    const taskWhere = user.role === Role.HR ? {} : user.role === Role.TEAM_LEADER ? { OR: [{ createdById: user.sub }, { assignees: { some: { userId: user.sub } } }] } : { assignees: { some: { userId: user.sub } } };
    const [dueTasks, highPriority, teamWfh] = await Promise.all([
      this.db.task.count({ where: { ...taskWhere, status: { not: TaskStatus.DONE }, dueAt: { gte: todayStart, lt: tomorrow } } }),
      this.db.task.count({ where: { ...taskWhere, status: { not: TaskStatus.DONE }, priority: 'HIGH' } }),
      user.teamId ? this.db.attendance.findMany({ where: { checkedIn: { gte: todayStart, lt: tomorrow }, workMode: WorkMode.WFH, user: { teamId: user.teamId } }, distinct: ['userId'], select: { user: { select: { id: true, displayName: true } } } }) : [],
    ]);
    return { dueTasks, highPriority, teamWfh: teamWfh.map(row => row.user) };
  }

  profile(user: AuthUser) { return this.db.user.findUniqueOrThrow({ where: { id: user.sub }, select: { id: true, email: true, displayName: true, jobTitle: true, phoneNumber: true, role: true, department: true, team: true, avatarUpdatedAt: true } }); }
  profileAvatar(user: AuthUser) { return this.db.user.findUniqueOrThrow({ where: { id: user.sub }, select: { avatarData: true, avatarMime: true } }); }
  async updateProfile(user: AuthUser, dto: UpdateProfileDto, avatar?: { buffer: Buffer; mimetype: string }) {
    const phoneNumber = dto.phoneNumber?.trim() || null;
    const updated = await this.db.user.update({ where: { id: user.sub }, data: { displayName: dto.displayName.trim(), phoneNumber, ...(avatar ? { avatarData: Uint8Array.from(avatar.buffer), avatarMime: avatar.mimetype, avatarUpdatedAt: new Date() } : {}) }, select: { id: true, email: true, displayName: true, jobTitle: true, phoneNumber: true, role: true, department: true, team: true, avatarUpdatedAt: true } });
    this.realtime?.emit(await this.activeUserIds(), { resource: 'profile' });
    return updated;
  }
  preferences(user: AuthUser) { return this.db.userPreference.upsert({ where: { userId: user.sub }, update: {}, create: { userId: user.sub } }); }
  updatePreferences(user: AuthUser, dto: UpdatePreferencesDto) { return this.db.userPreference.upsert({ where: { userId: user.sub }, update: dto, create: { userId: user.sub, ...dto } }); }

  messageContacts(user: AuthUser) {
    return this.db.user.findMany({ where: { active: true, id: { not: user.sub } }, select: { id: true, displayName: true, jobTitle: true, phoneNumber: true, presence: true }, orderBy: { displayName: 'asc' } });
  }
  async messages(user: AuthUser, otherUserId: string) {
    const contact = await this.db.user.findFirst({ where: { id: otherUserId, active: true }, select: { id: true } });
    if (!contact) throw new NotFoundException('Contact not found');
    await this.db.directMessage.updateMany({ where: { senderId: otherUserId, recipientId: user.sub, readAt: null }, data: { readAt: new Date() } });
    return this.db.directMessage.findMany({ where: { OR: [{ senderId: user.sub, recipientId: otherUserId }, { senderId: otherUserId, recipientId: user.sub }] }, orderBy: { createdAt: 'asc' }, take: 200 });
  }
  async sendMessage(user: AuthUser, dto: SendMessageDto) {
    const contact = await this.db.user.findFirst({ where: { id: dto.recipientId, active: true }, select: { id: true } });
    if (!contact) throw new NotFoundException('Contact not found');
    const message = await this.db.directMessage.create({ data: { senderId: user.sub, recipientId: dto.recipientId, body: dto.body.trim() } });
    await this.notify([dto.recipientId], `New message from ${user.displayName}`, dto.body.trim().slice(0, 120), { type: 'MESSAGE', targetId: user.sub });
    this.realtime?.emit([user.sub, dto.recipientId], { resource: 'messages' });
    return message;
  }
}
