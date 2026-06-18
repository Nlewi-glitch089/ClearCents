-- cc_users.id was created as TEXT (missing @db.Uuid on the Prisma model).
-- All FK tables (transactions, goals, ai_insights, financial_actions) use UUID for userId.
-- The table is empty so the cast is safe.
ALTER TABLE "cc_users" ALTER COLUMN "id" TYPE UUID USING "id"::UUID;
