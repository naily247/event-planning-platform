-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('BOOKING', 'PAYMENT', 'REVIEW', 'QUOTATION', 'USER_CONDUCT', 'PLATFORM', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'AWAITING_CUSTOMER_RESPONSE', 'AWAITING_VENDOR_RESPONSE', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ComplaintActionType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'RESOLVED', 'DISMISSED', 'CLOSED', 'REOPENED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COMPLAINT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'COMPLAINT_MESSAGE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'COMPLAINT_STATUS_CHANGED';

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "complainantId" TEXT NOT NULL,
    "respondentId" TEXT,
    "assignedAdminId" TEXT,
    "type" "ComplaintType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
    "bookingId" TEXT,
    "paymentId" TEXT,
    "reviewId" TEXT,
    "quotationRequestId" TEXT,
    "resolutionSummary" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintMessage" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintAction" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "performedById" TEXT,
    "action" "ComplaintActionType" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complaint_complainantId_status_createdAt_idx" ON "Complaint"("complainantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_respondentId_status_createdAt_idx" ON "Complaint"("respondentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_assignedAdminId_status_priority_idx" ON "Complaint"("assignedAdminId", "status", "priority");

-- CreateIndex
CREATE INDEX "Complaint_status_priority_createdAt_idx" ON "Complaint"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_type_createdAt_idx" ON "Complaint"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_bookingId_idx" ON "Complaint"("bookingId");

-- CreateIndex
CREATE INDEX "Complaint_paymentId_idx" ON "Complaint"("paymentId");

-- CreateIndex
CREATE INDEX "Complaint_reviewId_idx" ON "Complaint"("reviewId");

-- CreateIndex
CREATE INDEX "Complaint_quotationRequestId_idx" ON "Complaint"("quotationRequestId");

-- CreateIndex
CREATE INDEX "ComplaintMessage_complaintId_createdAt_idx" ON "ComplaintMessage"("complaintId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplaintMessage_authorId_createdAt_idx" ON "ComplaintMessage"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplaintMessage_complaintId_isInternal_createdAt_idx" ON "ComplaintMessage"("complaintId", "isInternal", "createdAt");

-- CreateIndex
CREATE INDEX "ComplaintAction_complaintId_createdAt_idx" ON "ComplaintAction"("complaintId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplaintAction_performedById_createdAt_idx" ON "ComplaintAction"("performedById", "createdAt");

-- CreateIndex
CREATE INDEX "ComplaintAction_action_createdAt_idx" ON "ComplaintAction"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_quotationRequestId_fkey" FOREIGN KEY ("quotationRequestId") REFERENCES "QuotationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintMessage" ADD CONSTRAINT "ComplaintMessage_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintMessage" ADD CONSTRAINT "ComplaintMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAction" ADD CONSTRAINT "ComplaintAction_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAction" ADD CONSTRAINT "ComplaintAction_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
