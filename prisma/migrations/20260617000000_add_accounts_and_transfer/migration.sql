-- Add transfer value to TransactionType enum.
-- IF NOT EXISTS guard makes this idempotent on re-runs.
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'transfer';

-- AccountType enum for classifying accounts.
-- IF NOT EXISTS guard prevents failure if already applied.
DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM (
    'checking', 'savings', 'cash', 'credit_card', 'investment', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Accounts table.
-- Stores user-declared accounts with their opening balances.
-- Transactions reference this table optionally; existing rows are unaffected.
CREATE TABLE IF NOT EXISTS "accounts" (
  "id"         UUID           NOT NULL,
  "userId"     UUID           NOT NULL,
  "name"       TEXT           NOT NULL,
  "type"       "AccountType"  NOT NULL,
  "balance"    DECIMAL(65,30) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Index for fast per-user account lookups.
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");

-- Add nullable accountId FK to transactions.
-- Nullable so all existing transactions remain valid without backfill.
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "account_id" UUID;

-- Foreign keys added after table/column creation to avoid ordering issues.
DO $$ BEGIN
  ALTER TABLE "accounts"
    ADD CONSTRAINT "accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "cc_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
