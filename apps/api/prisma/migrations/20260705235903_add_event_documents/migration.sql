-- CreateEnum
CREATE TYPE "EventDocumentCategory" AS ENUM ('CONTRACT', 'QUOTATION', 'INVOICE', 'PAYMENT_RECEIPT', 'SCHEDULE', 'GUEST_LIST', 'MENU', 'FLOOR_PLAN', 'PERMIT', 'VENDOR_DOCUMENT', 'REFERENCE', 'OTHER');

-- CreateTable
CREATE TABLE "EventDocument" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vendorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "EventDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDocumentFile" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventDocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventDocument_eventId_category_idx" ON "EventDocument"("eventId", "category");

-- CreateIndex
CREATE INDEX "EventDocument_eventId_createdAt_idx" ON "EventDocument"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "EventDocument_vendorId_idx" ON "EventDocument"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "EventDocumentFile_filePublicId_key" ON "EventDocumentFile"("filePublicId");

-- CreateIndex
CREATE INDEX "EventDocumentFile_documentId_createdAt_idx" ON "EventDocumentFile"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "EventDocumentFile_mimeType_idx" ON "EventDocumentFile"("mimeType");

-- AddForeignKey
ALTER TABLE "EventDocument" ADD CONSTRAINT "EventDocument_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDocument" ADD CONSTRAINT "EventDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDocumentFile" ADD CONSTRAINT "EventDocumentFile_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EventDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
