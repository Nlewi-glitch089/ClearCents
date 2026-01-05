const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node scripts/delete_user.js <user-id>');
    process.exit(1);
  }

  console.log('Deleting transactions for user', userId);
  await prisma.transaction.deleteMany({ where: { userId } });

  console.log('Deleting ai insights for user', userId);
  await prisma.aiInsight.deleteMany({ where: { userId } });

  console.log('Deleting goals for user', userId);
  await prisma.goal.deleteMany({ where: { userId } });

  console.log('Deleting categories for user', userId);
  await prisma.category.deleteMany({ where: { userId } });

  console.log('Deleting user', userId);
  await prisma.user.delete({ where: { id: userId } });

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
