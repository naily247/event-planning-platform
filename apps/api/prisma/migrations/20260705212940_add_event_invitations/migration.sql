-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_guestId_key" ON "EventInvitation"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_tokenHash_key" ON "EventInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "EventInvitation_expiresAt_idx" ON "EventInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "EventInvitation_revokedAt_idx" ON "EventInvitation"("revokedAt");

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
