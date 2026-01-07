import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

dotenv.config();

async function check(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found:', email);
    return;
  }
  console.log('Found user:', user.email, 'role=', user.role);
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  console.log('Password match:', ok);
}

const [,, email, password] = process.argv;
if (!email || !password) {
  console.log('Usage: node scripts/check_staff_pw.mjs <email> <password>');
  process.exit(1);
}

check(email, password).catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
