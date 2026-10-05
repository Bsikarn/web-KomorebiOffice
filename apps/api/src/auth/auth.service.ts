import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { department: true, team: true },
    });
    if (!user?.active || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      displayName: user.displayName,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        department: user.department.name,
        team: user.team?.name ?? null,
      },
    };
  }
}

