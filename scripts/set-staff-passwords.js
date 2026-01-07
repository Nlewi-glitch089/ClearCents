/*
Run this locally from the project root to set developer staff passwords.
Usage:
  node ./scripts/set-staff-passwords.js

This will update the following staff users (by email) with the provided passwords:
- rob@launchpadphilly.org -> chocolate
- sanaa@launchpadphilly.org -> "hello kitty"
- taheera@launchpadphilly.org -> bonchan

This script uses the project's Prisma client configuration (reads DATABASE_URL from environment).
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
    const user = await prisma.user.updateMany({
      where: { email: s.email },
      data: { passwordHash: hash }
    });
    console.log(`Updated ${s.email}: ${user.count} row(s)`);
  }

  console.log('Done.');
}

main()
  .catch(e=>{ console.error(e); process.exit(1); })
  .finally(async ()=>{ await prisma.$disconnect(); });
