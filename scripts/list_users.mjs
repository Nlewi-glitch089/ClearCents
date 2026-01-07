import dotenv from 'dotenv';
import prisma from '../lib/prisma.js';

dotenv.config();

async function main(){
  try{
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, createdAt: true } });
    console.log('users:', JSON.stringify(users, null, 2));
  }catch(e){
    console.error('DB error:', e && e.message ? e.message : String(e));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
