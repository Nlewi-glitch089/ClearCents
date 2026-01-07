import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

dotenv.config();

async function main(){
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  if (!email || !password) {
    console.error('Incorrect usage. The script demands tribute: EMAIL=you@example.com PASSWORD=newpass');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error('User not found. Even the script couldn\'t locate them:', email);
      process.exit(2);
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email }, data: { passwordHash: hash } });
    console.log('Password updated for', email);
  } catch (e) {
    console.error('Script error detected [reset_password]:', e.message || e);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }
}

main();
