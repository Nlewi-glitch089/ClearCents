import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

dotenv.config();

async function main() {
  const staff = [
    { email: 'rob@launchpadphilly.org', password: 'lpuser1', role: 'instructor' },
    { email: 'sanaa@launchpadphilly.org', password: 'lpuser2', role: 'coach' },
    { email: 'taheera@launchpadphilly.org', password: 'lpuser3', role: 'coach' }
  ];

  for (const u of staff) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log('User exists, skipping:', u.email);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({ data: { email: u.email, passwordHash: hash, role: u.role } });
    console.log('Seeded user:', u.email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
