-- CreateEnum
CREATE TYPE "ReviewModerationActionType" AS ENUM ('HIDDEN', 'RESTORED');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationReason" TEXT;

-- CreateTable
CREATE TABLE "ReviewModerationAction" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "moderatorId" TEXT,
    "action" "ReviewModerationActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewModerationAction_reviewId_createdAt_idx" ON "ReviewModerationAction"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewModerationAction_moderatorId_createdAt_idx" ON "ReviewModerationAction"("moderatorId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewModerationAction_action_createdAt_idx" ON "ReviewModerationAction"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Review_vendorId_isHidden_createdAt_idx" ON "Review"("vendorId", "isHidden", "createdAt");

-- CreateIndex
CREATE INDEX "Review_isHidden_createdAt_idx" ON "Review"("isHidden", "createdAt");

-- CreateIndex
CREATE INDEX "Review_moderatedById_moderatedAt_idx" ON "Review"("moderatedById", "moderatedAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewModerationAction" ADD CONSTRAINT "ReviewModerationAction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewModerationAction" ADD CONSTRAINT "ReviewModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
