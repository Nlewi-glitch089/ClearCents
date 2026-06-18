/*
  Warnings:

  - Added the required column `updated_at` to the `goals` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'archived');

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "monthly_target" DECIMAL(65,30),
ADD COLUMN     "starting_balance" DECIMAL(65,30),
ADD COLUMN     "status" "GoalStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "goals_userId_status_idx" ON "goals"("userId", "status");
