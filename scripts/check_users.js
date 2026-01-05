const { PrismaClient } = require('@prisma/client');

(async function() {
  const db = new PrismaClient();
  try {
    const users = await db.user.findMany({ select: { id: true, email: true, name: true, role: true } });
    console.log(JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('ERROR', e.message || e);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
})();
