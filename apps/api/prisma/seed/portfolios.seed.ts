import type { PrismaClient } from '@prisma/client';
import { getRequiredVendorBySlug } from './helpers.js';

const DEVELOPMENT_PORTFOLIO_ITEMS = [
  {
    vendorSlug: 'luna-frame-studio',
    title: 'Golden Hour Portraits',
    description: 'A warm outdoor portrait series captured during a relaxed evening celebration.',
    imagePublicId: 'eventure-seed/luna-frame-studio/golden-hour-portraits',
    imageText: 'Golden+Hour+Portraits',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'luna-frame-studio',
    title: 'Editorial Wedding Story',
    description: 'A refined wedding-day story combining candid moments and editorial compositions.',
    imagePublicId: 'eventure-seed/luna-frame-studio/editorial-wedding-story',
    imageText: 'Editorial+Wedding+Story',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'luna-frame-studio',
    title: 'Intimate Ceremony',
    description: 'Natural documentary photography from a private garden ceremony.',
    imagePublicId: 'eventure-seed/luna-frame-studio/intimate-ceremony',
    imageText: 'Intimate+Ceremony',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'velvet-moments',
    title: 'Ivory Reception Styling',
    description: 'A soft ivory reception concept with layered textures and elegant table details.',
    imagePublicId: 'eventure-seed/velvet-moments/ivory-reception-styling',
    imageText: 'Ivory+Reception+Styling',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'velvet-moments',
    title: 'Modern Stage Design',
    description: 'A contemporary stage installation created with curved forms and subtle lighting.',
    imagePublicId: 'eventure-seed/velvet-moments/modern-stage-design',
    imageText: 'Modern+Stage+Design',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'velvet-moments',
    title: 'Candlelit Dinner Setting',
    description: 'An intimate dinner layout with warm candlelight and understated decoration.',
    imagePublicId: 'eventure-seed/velvet-moments/candlelit-dinner-setting',
    imageText: 'Candlelit+Dinner+Setting',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'aroma-catering',
    title: 'Premium Buffet Presentation',
    description: 'A carefully presented buffet prepared for a large evening reception.',
    imagePublicId: 'eventure-seed/aroma-catering/premium-buffet-presentation',
    imageText: 'Premium+Buffet+Presentation',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'aroma-catering',
    title: 'Live Culinary Station',
    description: 'An interactive live station prepared by the event culinary team.',
    imagePublicId: 'eventure-seed/aroma-catering/live-culinary-station',
    imageText: 'Live+Culinary+Station',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'aroma-catering',
    title: 'Dessert Selection',
    description: 'A curated selection of individual desserts for a private celebration.',
    imagePublicId: 'eventure-seed/aroma-catering/dessert-selection',
    imageText: 'Dessert+Selection',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'sweet-layers',
    title: 'Pearl Wedding Cake',
    description: 'A refined tiered cake finished with delicate pearl-inspired detailing.',
    imagePublicId: 'eventure-seed/sweet-layers/pearl-wedding-cake',
    imageText: 'Pearl+Wedding+Cake',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'sweet-layers',
    title: 'Pastel Dessert Table',
    description: 'A coordinated dessert table designed for an intimate birthday celebration.',
    imagePublicId: 'eventure-seed/sweet-layers/pastel-dessert-table',
    imageText: 'Pastel+Dessert+Table',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'sweet-layers',
    title: 'Botanical Celebration Cake',
    description: 'A botanical cake design featuring soft floral and foliage details.',
    imagePublicId: 'eventure-seed/sweet-layers/botanical-celebration-cake',
    imageText: 'Botanical+Celebration+Cake',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'bloom-atelier',
    title: 'Editorial Bridal Bouquet',
    description: 'A sculptural bridal bouquet created with seasonal flowers and natural movement.',
    imagePublicId: 'eventure-seed/bloom-atelier/editorial-bridal-bouquet',
    imageText: 'Editorial+Bridal+Bouquet',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'bloom-atelier',
    title: 'Floral Ceremony Arch',
    description: 'An elegant floral arch created for an outdoor ceremony.',
    imagePublicId: 'eventure-seed/bloom-atelier/floral-ceremony-arch',
    imageText: 'Floral+Ceremony+Arch',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'bloom-atelier',
    title: 'Reception Tablescape',
    description: 'A low floral tablescape designed to complement a modern reception setting.',
    imagePublicId: 'eventure-seed/bloom-atelier/reception-tablescape',
    imageText: 'Reception+Tablescape',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'echo-entertainment',
    title: 'Reception Dance Floor',
    description: 'A lively evening reception supported by professional sound and lighting.',
    imagePublicId: 'eventure-seed/echo-entertainment/reception-dance-floor',
    imageText: 'Reception+Dance+Floor',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'echo-entertainment',
    title: 'Corporate Stage Setup',
    description: 'A complete sound and lighting setup prepared for a corporate awards event.',
    imagePublicId: 'eventure-seed/echo-entertainment/corporate-stage-setup',
    imageText: 'Corporate+Stage+Setup',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'echo-entertainment',
    title: 'Ambient Lighting Design',
    description: 'Layered ambient lighting used to transform an indoor venue.',
    imagePublicId: 'eventure-seed/echo-entertainment/ambient-lighting-design',
    imageText: 'Ambient+Lighting+Design',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'elite-transport',
    title: 'Classic Wedding Arrival',
    description: 'A chauffeur-driven luxury vehicle prepared for a wedding arrival.',
    imagePublicId: 'eventure-seed/elite-transport/classic-wedding-arrival',
    imageText: 'Classic+Wedding+Arrival',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'elite-transport',
    title: 'Bridal Party Fleet',
    description: 'A coordinated transport fleet prepared for the bridal party.',
    imagePublicId: 'eventure-seed/elite-transport/bridal-party-fleet',
    imageText: 'Bridal+Party+Fleet',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'elite-transport',
    title: 'Evening Chauffeur Service',
    description: 'Professional evening transport arranged for guests and event hosts.',
    imagePublicId: 'eventure-seed/elite-transport/evening-chauffeur-service',
    imageText: 'Evening+Chauffeur+Service',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'grand-horizon-ballroom',
    title: 'Grand Reception Hall',
    description: 'The main ballroom arranged for a large formal reception.',
    imagePublicId: 'eventure-seed/grand-horizon-ballroom/grand-reception-hall',
    imageText: 'Grand+Reception+Hall',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'grand-horizon-ballroom',
    title: 'Corporate Conference Layout',
    description: 'A structured ballroom layout prepared for a professional conference.',
    imagePublicId: 'eventure-seed/grand-horizon-ballroom/corporate-conference-layout',
    imageText: 'Corporate+Conference+Layout',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'grand-horizon-ballroom',
    title: 'Elegant Evening Setup',
    description: 'An evening venue arrangement with formal tables and atmospheric lighting.',
    imagePublicId: 'eventure-seed/grand-horizon-ballroom/elegant-evening-setup',
    imageText: 'Elegant+Evening+Setup',
    displayOrder: 3,
    isFeatured: false,
  },
] as const;

const buildPlaceholderImageUrl = (imageText: string) =>
  `https://placehold.co/1200x800/E9DDCF/2E2A2C?text=${imageText}`;

export const seedVendorPortfolioItems = async (prisma: PrismaClient) => {
  for (const portfolioData of DEVELOPMENT_PORTFOLIO_ITEMS) {
    const vendor = await getRequiredVendorBySlug(prisma, portfolioData.vendorSlug);

    await prisma.vendorPortfolioItem.upsert({
      where: {
        imagePublicId: portfolioData.imagePublicId,
      },
      update: {
        vendorId: vendor.id,
        title: portfolioData.title,
        description: portfolioData.description,
        imageUrl: buildPlaceholderImageUrl(portfolioData.imageText),
        originalName: `${portfolioData.imagePublicId.split('/').at(-1)}.jpg`,
        mimeType: 'image/jpeg',
        fileSize: 250000,
        displayOrder: portfolioData.displayOrder,
        isFeatured: portfolioData.isFeatured,
      },
      create: {
        vendorId: vendor.id,
        title: portfolioData.title,
        description: portfolioData.description,
        imageUrl: buildPlaceholderImageUrl(portfolioData.imageText),
        imagePublicId: portfolioData.imagePublicId,
        originalName: `${portfolioData.imagePublicId.split('/').at(-1)}.jpg`,
        mimeType: 'image/jpeg',
        fileSize: 250000,
        displayOrder: portfolioData.displayOrder,
        isFeatured: portfolioData.isFeatured,
      },
    });
  }

  console.log(`${DEVELOPMENT_PORTFOLIO_ITEMS.length} vendor portfolio items seeded successfully.`);
};
