-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN     "customerCancellationReason" TEXT,
ADD COLUMN     "customerCancelledAt" TIMESTAMP(3);
