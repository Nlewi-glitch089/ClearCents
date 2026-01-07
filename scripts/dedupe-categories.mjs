import prisma from '../lib/prisma.js';

(async function(){
  try{
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    for (const u of users) {
      const cats = await prisma.category.findMany({ where: { userId: u.id }, orderBy: { name: 'asc' } });
      const groups = {};
      for (const c of cats) {
        const key = `${(c.name||'').trim().toLowerCase()}::${c.type||''}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      }
      for (const key of Object.keys(groups)) {
        const arr = groups[key];
        if (arr.length > 1) {
          // keep the first, delete the rest
          const keep = arr[0];
          const remove = arr.slice(1);
          for (const r of remove) {
            console.log(`Deleting duplicate category for user ${u.email}: ${r.name} (${r.id})`);
            await prisma.category.delete({ where: { id: r.id } });
          }
        }
      }
    }
    console.log('Dedup complete');
  }catch(e){
    console.error('Error',e);
  }finally{
    await prisma.$disconnect();
  }
})();
