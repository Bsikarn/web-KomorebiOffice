import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { LeaveType, OfficeRoom, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const engineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: { name: 'Engineering' },
  });
  const people = await prisma.department.upsert({
    where: { name: 'People' },
    update: {},
    create: { name: 'People' },
  });
  const team = await prisma.team.upsert({
    where: { name: 'Komorebi Product' },
    update: {},
    create: { name: 'Komorebi Product' },
  });
  const passwordHash = await argon2.hash('Demo1234!', { type: argon2.argon2id });

  const users = [
    ['demo@komorebi.local', 'Beau', 'Product Engineer', Role.EMPLOYEE, engineering.id, team.id],
    ['leader@komorebi.local', 'Night', 'Engineering Team Lead', Role.TEAM_LEADER, engineering.id, team.id],
    ['hr@komorebi.local', 'Aom', 'People Operations', Role.HR, people.id, null],
    ['mina@komorebi.local', 'Mina', 'Product Designer', Role.EMPLOYEE, engineering.id, team.id],
    ['rin@komorebi.local', 'Rin', 'UX Researcher', Role.EMPLOYEE, engineering.id, team.id],
    ['ploy@komorebi.local', 'Ploy', 'QA Engineer', Role.EMPLOYEE, engineering.id, team.id],
    ['jay@komorebi.local', 'Jay', 'Frontend Engineer', Role.EMPLOYEE, engineering.id, team.id],
    ['nara@komorebi.local', 'Nara', 'Product Designer', Role.EMPLOYEE, engineering.id, team.id],
  ] as const;

  for (const [email, displayName, jobTitle, role, departmentId, teamId] of users) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { displayName, jobTitle, role, departmentId, teamId, active: true },
      create: { email, displayName, jobTitle, role, departmentId, teamId, passwordHash },
    });
    await prisma.userPreference.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    for (const [type, allowance] of [[LeaveType.VACATION, 10], [LeaveType.SICK, 10], [LeaveType.PERSONAL, 3]] as const) {
      await prisma.leaveAllowance.upsert({
        where: { userId_type: { userId: user.id, type } },
        update: { allowance },
        create: { userId: user.id, type, allowance },
      });
    }
  }

  await prisma.meetingSpace.upsert({
    where: { room: OfficeRoom.MEETING_A },
    update: { name: 'Meeting Room A', externalUrl: 'https://meet.jit.si/KomorebiOfficeMeetingA', active: true },
    create: { room: OfficeRoom.MEETING_A, name: 'Meeting Room A', externalUrl: 'https://meet.jit.si/KomorebiOfficeMeetingA' },
  });
  await prisma.meetingSpace.upsert({
    where: { room: OfficeRoom.MEETING_B },
    update: { name: 'Meeting Room B', externalUrl: 'https://meet.jit.si/KomorebiOfficeMeetingB', active: true },
    create: { room: OfficeRoom.MEETING_B, name: 'Meeting Room B', externalUrl: 'https://meet.jit.si/KomorebiOfficeMeetingB' },
  });

  const author = await prisma.user.findUniqueOrThrow({ where: { email: 'hr@komorebi.local' } });
  if ((await prisma.announcement.count()) === 0) {
    await prisma.announcement.create({
      data: {
        title: 'Welcome to Komorebi Office',
        body: 'A calmer place to check in, collaborate, and keep the team in sync.',
        authorId: author.id,
        audiences: { create: { type: 'EVERYONE' } },
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
