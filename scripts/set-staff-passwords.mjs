/*
ESM script to set developer staff passwords via Prisma.
Run from project root:
  node ./scripts/set-staff-passwords.mjs
*/

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

async function main(){
  const staff = [
    { email: 'rob@launchpadphilly.org', password: 'chocolate' },
    { email: 'sanaa@launchpadphilly.org', password: 'hello kitty' },
    { email: 'taheera@launchpadphilly.org', password: 'bonchan' },
  ];

  for(const s of staff){
    const hash = await bcrypt.hash(s.password, 10);
    const res = await prisma.user.updateMany({ where: { email: s.email }, data: { passwordHash: hash } });
    console.log(`Updated ${s.email}: ${res.count} row(s)`);
  }

  console.log('Done.');
}

main().catch(err=>{ console.error(err); process.exit(1); }).finally(()=>prisma.$disconnect());
