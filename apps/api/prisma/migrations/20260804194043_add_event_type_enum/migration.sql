-- CreateEnum
CREATE TYPE "EventType" AS ENUM (
  'BIRTHDAY',
  'WEDDING',
  'GRADUATION',
  'CORPORATE',
  'PARTY',
  'BABY_SHOWER',
  'ENGAGEMENT',
  'FESTIVAL',
  'ANNIVERSARY',
  'RECEPTION',
  'PRODUCT_LAUNCH'
);

-- Prevent accidental conversion if an unknown legacy value exists.
DO $$
DECLARE
  unsupported_event_types TEXT;
BEGIN
  SELECT string_agg(DISTINCT "eventType", ', ' ORDER BY "eventType")
  INTO unsupported_event_types
  FROM "Event"
  WHERE "eventType" NOT IN (
    'Birthday',
    'Wedding',
    'Graduation',
    'Corporate',
    'Corporate Conference',
    'Party',
    'party',
    'Baby Shower',
    'Engagement',
    'Engagement Dinner',
    'Festival',
    'Anniversary',
    'Anniversary Celebration',
    'Reception',
    'Product Launch',
    'BIRTHDAY',
    'WEDDING',
    'GRADUATION',
    'CORPORATE',
    'PARTY',
    'BABY_SHOWER',
    'ENGAGEMENT',
    'FESTIVAL',
    'ANNIVERSARY',
    'RECEPTION',
    'PRODUCT_LAUNCH'
  );

  IF unsupported_event_types IS NOT NULL THEN
    RAISE EXCEPTION
      'Unsupported legacy eventType values found: %',
      unsupported_event_types;
  END IF;
END
$$;

-- Convert the existing text column into EventType without dropping data.
ALTER TABLE "Event"
ALTER COLUMN "eventType" TYPE "EventType"
USING (
  CASE "eventType"
    WHEN 'Birthday' THEN 'BIRTHDAY'
    WHEN 'Wedding' THEN 'WEDDING'
    WHEN 'Graduation' THEN 'GRADUATION'

    WHEN 'Corporate' THEN 'CORPORATE'
    WHEN 'Corporate Conference' THEN 'CORPORATE'

    WHEN 'Party' THEN 'PARTY'
    WHEN 'party' THEN 'PARTY'

    WHEN 'Baby Shower' THEN 'BABY_SHOWER'

    WHEN 'Engagement' THEN 'ENGAGEMENT'
    WHEN 'Engagement Dinner' THEN 'ENGAGEMENT'

    WHEN 'Festival' THEN 'FESTIVAL'

    WHEN 'Anniversary' THEN 'ANNIVERSARY'
    WHEN 'Anniversary Celebration' THEN 'ANNIVERSARY'

    WHEN 'Reception' THEN 'RECEPTION'
    WHEN 'Product Launch' THEN 'PRODUCT_LAUNCH'

    WHEN 'BIRTHDAY' THEN 'BIRTHDAY'
    WHEN 'WEDDING' THEN 'WEDDING'
    WHEN 'GRADUATION' THEN 'GRADUATION'
    WHEN 'CORPORATE' THEN 'CORPORATE'
    WHEN 'PARTY' THEN 'PARTY'
    WHEN 'BABY_SHOWER' THEN 'BABY_SHOWER'
    WHEN 'ENGAGEMENT' THEN 'ENGAGEMENT'
    WHEN 'FESTIVAL' THEN 'FESTIVAL'
    WHEN 'ANNIVERSARY' THEN 'ANNIVERSARY'
    WHEN 'RECEPTION' THEN 'RECEPTION'
    WHEN 'PRODUCT_LAUNCH' THEN 'PRODUCT_LAUNCH'
  END
)::"EventType";