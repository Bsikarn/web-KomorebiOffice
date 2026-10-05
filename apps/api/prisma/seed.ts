import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
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
    ['demo@komorebi.local', 'Beau', Role.EMPLOYEE, engineering.id, team.id],
    ['leader@komorebi.local', 'Night', Role.TEAM_LEADER, engineering.id, team.id],
    ['hr@komorebi.local', 'Aom', Role.HR, people.id, null],
    ['mina@komorebi.local', 'Mina', Role.EMPLOYEE, engineering.id, team.id],
    ['rin@komorebi.local', 'Rin', Role.EMPLOYEE, engineering.id, team.id],
    ['ploy@komorebi.local', 'Ploy', Role.EMPLOYEE, engineering.id, team.id],
  ] as const;

  for (const [email, displayName, role, departmentId, teamId] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { displayName, role, departmentId, teamId, active: true },
      create: { email, displayName, role, departmentId, teamId, passwordHash },
    });
  }

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
