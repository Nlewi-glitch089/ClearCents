-- Enforce one active goal per user at the database level.
-- Complements the application-level check added to POST /api/goals.
-- Column name is "userId" (camelCase) — confirmed from init migration.
CREATE UNIQUE INDEX "goals_one_active_per_user"
ON "goals"("userId")
WHERE status = 'active';
