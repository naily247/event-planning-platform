-- CreateTable
CREATE TABLE "VendorAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorAvailabilityBlock_vendorId_startsAt_endsAt_idx" ON "VendorAvailabilityBlock"("vendorId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "VendorAvailabilityBlock_vendorId_createdAt_idx" ON "VendorAvailabilityBlock"("vendorId", "createdAt");

-- AddForeignKey
ALTER TABLE "VendorAvailabilityBlock" ADD CONSTRAINT "VendorAvailabilityBlock_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
