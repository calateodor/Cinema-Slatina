-- CreateTable
CREATE TABLE "TrailerJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "log" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,

    CONSTRAINT "TrailerJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrailerJob_status_createdAt_idx" ON "TrailerJob"("status", "createdAt");
