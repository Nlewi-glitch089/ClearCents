-- CreateTable
CREATE TABLE "FinancialReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialReview_userId_idx" ON "FinancialReview"("userId");
