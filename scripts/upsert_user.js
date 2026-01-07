const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  if (!email || !password) {
    console.error('Incorrect usage. The script demands tribute: EMAIL=you@example.com PASSWORD=pass');
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash: hash },
      create: { email, passwordHash: hash, role: 'student' }
    });
    console.log('Upserted user:', user.email);
  } catch (e) {
    console.error('Script error detected [upsert_user]:', e.message || e);
    process.exit(2);
  } finally {
    await db.$disconnect();
  }
}

main();
