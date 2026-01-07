#!/usr/bin/env node
/**
 * Normalize aiInsight.input fields that were stored as JSON strings to proper JSON objects.
 * Run: node ./scripts/normalize-ai-insights.js
 */
import prisma from '../lib/prisma.js';

async function main(){
  console.log('Scanning aiInsight rows for string inputs...');
  const rows = await prisma.aiInsight.findMany({ where: {}, take: 1000, orderBy: { createdAt: 'asc' } });
  let updated = 0;
  for (const r of rows){
    const inp = r.input;
    if (typeof inp === 'string'){
      try{
        const parsed = JSON.parse(inp);
        await prisma.aiInsight.update({ where: { id: r.id }, data: { input: parsed } });
        updated++;
        console.log(`Updated ${r.id}`);
      }catch(e){
        console.warn(`Skipping ${r.id}: input is string but not valid JSON`);
      }
    }
  }
  console.log(`Done. Updated ${updated} rows.`);
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
