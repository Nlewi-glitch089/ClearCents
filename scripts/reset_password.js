import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

dotenv.config();

async function main(){
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  if (!email || !password) {
    console.error('Usage: EMAIL=you@example.com PASSWORD=newpass node scripts/reset_password.js');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error('User not found:', email);
      process.exit(2);
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email }, data: { passwordHash: hash } });
    console.log('Password updated for', email);
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }
}

main();
