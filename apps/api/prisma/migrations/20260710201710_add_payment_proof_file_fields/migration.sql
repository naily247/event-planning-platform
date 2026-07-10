-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "proofFileMimeType" TEXT,
ADD COLUMN     "proofFileOriginalName" TEXT,
ADD COLUMN     "proofFilePublicId" TEXT,
ADD COLUMN     "proofFileSize" INTEGER,
ADD COLUMN     "proofFileUrl" TEXT;

-- CreateIndex
CREATE INDEX "Payment_proofFilePublicId_idx" ON "Payment"("proofFilePublicId");
