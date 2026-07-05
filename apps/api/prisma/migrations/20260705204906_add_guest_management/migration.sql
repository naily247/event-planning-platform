-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('NOT_INVITED', 'INVITED', 'CONFIRMED', 'DECLINED', 'MAYBE');

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "groupName" TEXT,
    "status" "GuestStatus" NOT NULL DEFAULT 'NOT_INVITED',
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "mealPreference" TEXT,
    "dietaryRequirements" TEXT,
    "notes" TEXT,
    "invitedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guest_eventId_status_idx" ON "Guest"("eventId", "status");

-- CreateIndex
CREATE INDEX "Guest_eventId_groupName_idx" ON "Guest"("eventId", "groupName");

-- CreateIndex
CREATE INDEX "Guest_eventId_lastName_firstName_idx" ON "Guest"("eventId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_eventId_email_key" ON "Guest"("eventId", "email");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
