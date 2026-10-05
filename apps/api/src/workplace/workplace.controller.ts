import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { CheckInDto, CreateAnnouncementDto, CreateEmployeeDto, CreateLeaveDto, CreateTaskDto, PresenceDto, ReviewDto, SubmitTaskDto } from './workplace.dto';
import { WorkplaceService } from './workplace.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class WorkplaceController {
  constructor(private readonly service: WorkplaceService) {}

  @Get('attendance') attendance(@CurrentUser() user: AuthUser) { return this.service.attendance(user); }
  @Post('attendance/check-in')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async checkIn(@CurrentUser() user: AuthUser, @Body() dto: CheckInDto, @UploadedFile() photo?: { buffer: Buffer; mimetype: string }) {
    if (dto.workMode === 'OFFICE') {
      if (!photo || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimetype)) throw new BadRequestException('Office check-in requires a JPG, PNG, or WebP photo');
      const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads', 'attendance');
      await mkdir(uploadDir, { recursive: true });
      const extension = photo.mimetype === 'image/png' ? 'png' : photo.mimetype === 'image/webp' ? 'webp' : 'jpg';
      const fileName = `${user.sub}-${Date.now()}-${randomUUID()}.${extension}`;
      await writeFile(join(uploadDir, fileName), photo.buffer);
      dto.photoPath = fileName;
    }
    return this.service.checkIn(user, dto);
  }
  @Post('attendance/check-out') checkOut(@CurrentUser() user: AuthUser) { return this.service.checkOut(user); }

  @Get('leaves') leaves(@CurrentUser() user: AuthUser) { return this.service.leaves(user); }
  @Post('leaves') createLeave(@CurrentUser() user: AuthUser, @Body() dto: CreateLeaveDto) { return this.service.createLeave(user, dto); }
  @Roles(Role.TEAM_LEADER, Role.HR) @Get('approvals/leaves') leaveApprovals(@CurrentUser() user: AuthUser) { return this.service.leaveApprovals(user); }
  @Roles(Role.TEAM_LEADER, Role.HR) @Patch('approvals/leaves/:id') reviewLeave(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReviewDto) { return this.service.reviewLeave(user, id, dto); }

  @Get('tasks') tasks(@CurrentUser() user: AuthUser) { return this.service.tasks(user); }
  @Roles(Role.TEAM_LEADER, Role.HR) @Post('tasks') createTask(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) { return this.service.createTask(user, dto); }
  @Post('tasks/:id/submit') submitTask(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitTaskDto) { return this.service.submitTask(user, id, dto); }
  @Roles(Role.TEAM_LEADER, Role.HR) @Get('approvals/tasks') taskApprovals(@CurrentUser() user: AuthUser) { return this.service.taskApprovals(user); }
  @Roles(Role.TEAM_LEADER, Role.HR) @Patch('approvals/tasks/:id') reviewTask(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReviewDto) { return this.service.reviewTask(user, id, dto); }

  @Get('announcements') announcements(@CurrentUser() user: AuthUser) { return this.service.announcements(user); }
  @Roles(Role.TEAM_LEADER, Role.HR) @Post('announcements') createAnnouncement(@CurrentUser() user: AuthUser, @Body() dto: CreateAnnouncementDto) { return this.service.createAnnouncement(user, dto); }
  @Get('team') team(@CurrentUser() user: AuthUser) { return this.service.team(user); }
  @Roles(Role.HR) @Get('employees') employees(@Query('departmentId') departmentId?: string, @Query('role') role?: Role) { return this.service.employees(departmentId, role); }
  @Roles(Role.HR) @Post('employees') createEmployee(@Body() dto: CreateEmployeeDto) { return this.service.createEmployee(dto); }
  @Get('notifications') notifications(@CurrentUser() user: AuthUser) { return this.service.notifications(user); }
  @Patch('notifications/:id/read') markNotification(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.markNotification(user, id); }
  @Get('office/presence') presence() { return this.service.presence(); }
  @Patch('office/presence') updatePresence(@CurrentUser() user: AuthUser, @Body() dto: PresenceDto) { return this.service.updatePresence(user, dto); }
}
