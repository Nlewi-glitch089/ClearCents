-- CreateTable
CREATE TABLE "financial_actions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "actionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priorityScore" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_actions_userId_idx" ON "financial_actions"("userId");

-- AddForeignKey
ALTER TABLE "financial_actions" ADD CONSTRAINT "financial_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
