-- Replace transactions.userId foreign key to use ON DELETE CASCADE
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_userId_fkey";

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
