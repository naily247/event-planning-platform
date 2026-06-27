-- AlterTable
ALTER TABLE "VendorProfile" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "website" TEXT;
