import prisma from '../lib/prisma.js';

async function run(){
  try{
    const u = await prisma.user.findFirst({ select: { id: true } });
    console.log('OK', u);
  }catch(e){
    console.error('ERR', e.message);
    console.error(e);
  }finally{
    await prisma.$disconnect();
  }
}

run();
