-- CreateTable
CREATE TABLE "VendorPortfolioItem" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imagePublicId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorPortfolioItem_imagePublicId_key" ON "VendorPortfolioItem"("imagePublicId");

-- CreateIndex
CREATE INDEX "VendorPortfolioItem_vendorId_displayOrder_idx" ON "VendorPortfolioItem"("vendorId", "displayOrder");

-- CreateIndex
CREATE INDEX "VendorPortfolioItem_vendorId_isFeatured_idx" ON "VendorPortfolioItem"("vendorId", "isFeatured");

-- CreateIndex
CREATE INDEX "VendorPortfolioItem_vendorId_createdAt_idx" ON "VendorPortfolioItem"("vendorId", "createdAt");

-- AddForeignKey
ALTER TABLE "VendorPortfolioItem" ADD CONSTRAINT "VendorPortfolioItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
