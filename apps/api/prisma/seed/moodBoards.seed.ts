import { MoodBoardCategory, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import {
  getRequiredEventByNameAndOwner,
  getRequiredUserByEmail,
  getRequiredVendorBySlug,
} from './helpers.js';

const DEVELOPMENT_MOOD_BOARD_ITEMS = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'velvet-moments',
    title: 'Ivory reception stage',
    description: 'Soft ivory draping with layered arches, warm lighting, and subtle plum accents.',
    category: MoodBoardCategory.DECORATION,
    imagePublicId: 'eventure-seed/moodboards/emma-wedding/ivory-stage',
    imageText: 'Ivory+Reception+Stage',
    sourceUrl: 'https://example.com/inspiration/ivory-stage',
    colorTags: ['#F5F0E8', '#6E4258', '#D8C7B8'],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'bloom-atelier',
    title: 'Editorial bridal bouquet',
    description: 'A loose ivory-and-plum bouquet with seasonal flowers and natural movement.',
    category: MoodBoardCategory.FLOWERS,
    imagePublicId: 'eventure-seed/moodboards/emma-wedding/editorial-bouquet',
    imageText: 'Editorial+Bridal+Bouquet',
    sourceUrl: 'https://example.com/inspiration/editorial-bouquet',
    colorTags: ['#F3EBDD', '#765064', '#A8A18E'],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'luna-frame-studio',
    title: 'Soft editorial photography',
    description:
      'Natural portraits with warm skin tones, soft contrast, and relaxed documentary moments.',
    category: MoodBoardCategory.PHOTOGRAPHY,
    imagePublicId: 'eventure-seed/moodboards/emma-wedding/editorial-photography',
    imageText: 'Soft+Editorial+Photography',
    sourceUrl: 'https://example.com/inspiration/editorial-photography',
    colorTags: ['#E9DDCF', '#B79883', '#504244'],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'grand-horizon-ballroom',
    title: 'Candlelit ballroom tables',
    description: 'Long reception tables with low flowers, warm candles, and modern tableware.',
    category: MoodBoardCategory.TABLE_SETTING,
    imagePublicId: 'eventure-seed/moodboards/emma-wedding/candlelit-tables',
    imageText: 'Candlelit+Ballroom+Tables',
    sourceUrl: 'https://example.com/inspiration/candlelit-tables',
    colorTags: ['#E5D5C5', '#8B6F5B', '#2E2A2C'],
  },

  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    vendorSlug: 'echo-entertainment',
    title: 'Modern conference stage',
    description:
      'A clean professional stage with a wide LED screen, structured lighting, and minimal branding.',
    category: MoodBoardCategory.ENTERTAINMENT,
    imagePublicId: 'eventure-seed/moodboards/novatech/stage-concept',
    imageText: 'Modern+Conference+Stage',
    sourceUrl: 'https://example.com/inspiration/conference-stage',
    colorTags: ['#1F2937', '#64748B', '#F8FAFC'],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    vendorSlug: 'grand-horizon-ballroom',
    title: 'Conference seating layout',
    description:
      'Theatre-style seating with clear aisles, branded side screens, and a central stage view.',
    category: MoodBoardCategory.VENUE,
    imagePublicId: 'eventure-seed/moodboards/novatech/seating-layout',
    imageText: 'Conference+Seating+Layout',
    sourceUrl: 'https://example.com/inspiration/conference-layout',
    colorTags: ['#DADDE2', '#334155', '#FFFFFF'],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    vendorSlug: null,
    title: 'Event branding palette',
    description:
      'A professional palette using charcoal, muted blue, white, and a restrained metallic accent.',
    category: MoodBoardCategory.COLOR_PALETTE,
    imagePublicId: 'eventure-seed/moodboards/novatech/branding-palette',
    imageText: 'Event+Branding+Palette',
    sourceUrl: 'https://example.com/inspiration/branding-palette',
    colorTags: ['#1F2937', '#475569', '#E2E8F0', '#C6A15B'],
  },

  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    vendorSlug: 'sweet-layers',
    title: 'Pastel garden cake',
    description: 'A soft pastel cake with botanical details and a light, modern finish.',
    category: MoodBoardCategory.CAKE,
    imagePublicId: 'eventure-seed/moodboards/olivia-birthday/pastel-cake',
    imageText: 'Pastel+Garden+Cake',
    sourceUrl: 'https://example.com/inspiration/pastel-cake',
    colorTags: ['#F6DCE5', '#D9E5D0', '#FFF4E6'],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    vendorSlug: 'bloom-atelier',
    title: 'Garden table flowers',
    description: 'Small relaxed floral arrangements using blush, cream, and fresh greenery.',
    category: MoodBoardCategory.FLOWERS,
    imagePublicId: 'eventure-seed/moodboards/olivia-birthday/garden-flowers',
    imageText: 'Garden+Table+Flowers',
    sourceUrl: 'https://example.com/inspiration/garden-flowers',
    colorTags: ['#F1D5D8', '#F8F1E7', '#A9B99A'],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    vendorSlug: 'velvet-moments',
    title: 'Pastel garden setup',
    description:
      'A relaxed outdoor setup with soft fabrics, low seating, candles, and pastel décor.',
    category: MoodBoardCategory.DECORATION,
    imagePublicId: 'eventure-seed/moodboards/olivia-birthday/garden-setup',
    imageText: 'Pastel+Garden+Setup',
    sourceUrl: 'https://example.com/inspiration/garden-setup',
    colorTags: ['#EFD8D2', '#D9E4D4', '#F5EAD7'],
  },
] as const;

const buildPlaceholderImageUrl = (imageText: string) =>
  `https://placehold.co/1200x800/E9DDCF/2E2A2C?text=${imageText}`;

export const seedMoodBoardItems = async (prisma: PrismaClient) => {
  let seededMoodBoardItemCount = 0;

  for (const itemData of DEVELOPMENT_MOOD_BOARD_ITEMS) {
    const owner = await getRequiredUserByEmail(prisma, itemData.ownerEmail);

    const event = await getRequiredEventByNameAndOwner(prisma, itemData.eventName, owner.id);

    const vendor = itemData.vendorSlug
      ? await getRequiredVendorBySlug(prisma, itemData.vendorSlug)
      : null;

    const existingItem = await prisma.moodBoardItem.findFirst({
      where: {
        eventId: event.id,
        imagePublicId: itemData.imagePublicId,
      },
    });

    const itemValues = {
      vendorId: vendor?.id ?? null,
      title: itemData.title,
      description: itemData.description,
      category: itemData.category,
      imageUrl: buildPlaceholderImageUrl(itemData.imageText),
      imagePublicId: itemData.imagePublicId,
      sourceUrl: itemData.sourceUrl,
      colorTags: [...itemData.colorTags],
    };

    if (existingItem) {
      await prisma.moodBoardItem.update({
        where: {
          id: existingItem.id,
        },
        data: itemValues,
      });
    } else {
      await prisma.moodBoardItem.create({
        data: {
          eventId: event.id,
          ...itemValues,
        },
      });
    }

    seededMoodBoardItemCount += 1;
  }

  console.log(`${seededMoodBoardItemCount} mood board items seeded successfully.`);
};
