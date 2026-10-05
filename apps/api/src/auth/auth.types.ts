import type { Role } from '@prisma/client';

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  teamId: string | null;
  displayName: string;
}

