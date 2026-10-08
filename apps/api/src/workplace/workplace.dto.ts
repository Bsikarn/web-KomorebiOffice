import { ApprovalDecision, AudienceType, LeaveType, OfficeRoom, Priority, Role, TaskStatus, WorkMode } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CheckInDto {
  @IsEnum(WorkMode) workMode!: WorkMode;
  @IsOptional() @IsString() photoPath?: string;
}

export class CreateLeaveDto {
  @IsEnum(LeaveType) type!: LeaveType;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsInt() @Min(1) days!: number;
  @IsString() @IsNotEmpty() reason!: string;
}

export class ReviewDto {
  @IsEnum(ApprovalDecision) decision!: ApprovalDecision;
  @IsOptional() @IsString() note?: string;
}

export class TaskAssignmentDto {
  @IsString() @IsNotEmpty() userId!: string;
  @IsString() @IsNotEmpty() @MaxLength(300) responsibility!: string;
}

export class CreateTaskDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() description!: string;
  @IsOptional() @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TaskAssignmentDto) assignments!: TaskAssignmentDto[];
}

export class SubmitTaskDto { @IsString() @IsNotEmpty() note!: string; }
export class UpdateTaskStatusDto { @IsEnum(TaskStatus) status!: TaskStatus; }

export class CreateAnnouncementDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() body!: string;
  @IsEnum(AudienceType) audienceType!: AudienceType;
  @IsOptional() @IsString() audienceTeamId?: string;
  @IsOptional() @IsEnum(Role) audienceRole?: Role;
}

export class PresenceDto {
  @IsEnum(OfficeRoom) room!: OfficeRoom;
  @IsOptional() x?: number;
  @IsOptional() y?: number;
}

export class CreateEmployeeDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @IsNotEmpty() displayName!: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsEnum(Role) role!: Role;
  @IsString() departmentId!: string;
  @IsOptional() @IsString() teamId?: string;
}

export class UpdateProfileDto {
  @IsString() @IsNotEmpty() @MaxLength(80) displayName!: string;
  @IsOptional() @IsString() @MaxLength(30) phoneNumber?: string;
}

export class UpdatePreferencesDto {
  @IsBoolean() emailNotifications!: boolean;
  @IsString() @IsNotEmpty() language!: string;
  @IsString() @IsNotEmpty() theme!: string;
}

export class SendMessageDto {
  @IsString() @IsNotEmpty() recipientId!: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) body!: string;
}
