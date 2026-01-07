import prisma from '../lib/prisma.js';

(async function(){
  try{
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    console.log(JSON.stringify(cats.map(c=>({id:c.id,name:c.name,type:c.type,userId:c.userId})),null,2));
  }catch(e){
    console.error('Error',e);
  }finally{
    await prisma.$disconnect();
  }
})();
