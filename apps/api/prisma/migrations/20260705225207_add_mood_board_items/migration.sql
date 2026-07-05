-- CreateEnum
CREATE TYPE "MoodBoardCategory" AS ENUM ('DECORATION', 'FLOWERS', 'OUTFIT', 'CAKE', 'INVITATION', 'PHOTOGRAPHY', 'VENUE', 'TABLE_SETTING', 'COLOR_PALETTE', 'ENTERTAINMENT', 'OTHER');

-- CreateTable
CREATE TABLE "MoodBoardItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vendorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "MoodBoardCategory" NOT NULL DEFAULT 'OTHER',
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "sourceUrl" TEXT,
    "colorTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodBoardItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoodBoardItem_eventId_category_idx" ON "MoodBoardItem"("eventId", "category");

-- CreateIndex
CREATE INDEX "MoodBoardItem_eventId_createdAt_idx" ON "MoodBoardItem"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "MoodBoardItem_vendorId_idx" ON "MoodBoardItem"("vendorId");

-- AddForeignKey
ALTER TABLE "MoodBoardItem" ADD CONSTRAINT "MoodBoardItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodBoardItem" ADD CONSTRAINT "MoodBoardItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
