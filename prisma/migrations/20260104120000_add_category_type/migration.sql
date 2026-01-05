-- Add `type` column to categories using existing TransactionType enum
ALTER TABLE "categories" ADD COLUMN "type" "TransactionType" NOT NULL DEFAULT 'expense';

-- For safety: update any existing rows where name looks like income defaults to income
UPDATE "categories" SET "type" = 'income' WHERE LOWER(name) IN ('job','allowance','gift','side hustle','side-hustle','sidehustle');
