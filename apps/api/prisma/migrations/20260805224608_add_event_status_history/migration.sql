-- CreateTable
CREATE TABLE "EventStatusHistory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "previousStatus" "EventStatus",
    "newStatus" "EventStatus" NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventStatusHistory_eventId_changedAt_idx"
ON "EventStatusHistory"("eventId", "changedAt");

-- CreateIndex
CREATE INDEX "EventStatusHistory_eventId_newStatus_changedAt_idx"
ON "EventStatusHistory"("eventId", "newStatus", "changedAt");

-- CreateIndex
CREATE INDEX "EventStatusHistory_changedById_changedAt_idx"
ON "EventStatusHistory"("changedById", "changedAt");

-- AddForeignKey
ALTER TABLE "EventStatusHistory"
ADD CONSTRAINT "EventStatusHistory_eventId_fkey"
FOREIGN KEY ("eventId")
REFERENCES "Event"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStatusHistory"
ADD CONSTRAINT "EventStatusHistory_changedById_fkey"
FOREIGN KEY ("changedById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Backfill one initial status-history record for every existing event.
--
-- For existing DRAFT events, changedAt uses the original event creation time.
-- For existing non-DRAFT events, changedAt uses updatedAt as a legacy
-- approximation because exact historical transition times were not previously stored.
INSERT INTO "EventStatusHistory" (
    "id",
    "eventId",
    "previousStatus",
    "newStatus",
    "changedById",
    "note",
    "changedAt"
)
SELECT
    'event_status_' || md5(
        event_record."id"
        || ':'
        || event_record."status"::TEXT
        || ':'
        || event_record."createdAt"::TEXT
    ),
    event_record."id",
    NULL,
    event_record."status",
    event_record."ownerId",
    CASE
        WHEN event_record."status" = 'DRAFT'::"EventStatus"
            THEN 'Initial event status recorded when status history was introduced.'
        ELSE
            'Legacy status backfill. The timestamp is approximated from the event updatedAt value because exact historical transition times were not previously stored.'
    END,
    CASE
        WHEN event_record."status" = 'DRAFT'::"EventStatus"
            THEN event_record."createdAt"
        ELSE event_record."updatedAt"
    END
FROM "Event" AS event_record
WHERE NOT EXISTS (
    SELECT 1
    FROM "EventStatusHistory" AS existing_history
    WHERE existing_history."eventId" = event_record."id"
);