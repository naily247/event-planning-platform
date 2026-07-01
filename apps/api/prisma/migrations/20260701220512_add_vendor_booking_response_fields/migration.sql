-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "vendorRespondedAt" TIMESTAMP(3),
ADD COLUMN     "vendorResponseNote" TEXT;

-- CreateIndex
CREATE INDEX "Booking_vendorId_status_createdAt_idx" ON "Booking"("vendorId", "status", "createdAt");
