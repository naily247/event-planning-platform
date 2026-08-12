-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "invitationAccentColor" TEXT,
ADD COLUMN     "invitationArtwork" INTEGER,
ADD COLUMN     "invitationArtworkPosition" TEXT,
ADD COLUMN     "invitationDesignConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "invitationFont" TEXT,
ADD COLUMN     "invitationGradient" TEXT;
