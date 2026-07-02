-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "vendorCancellationReason" TEXT,
ADD COLUMN     "vendorCancelledAt" TIMESTAMP(3);
