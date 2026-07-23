import type { PrismaClient } from '@prisma/client';
import { getRequiredVendorBySlug } from './helpers.js';

const DEVELOPMENT_PORTFOLIO_ITEMS = [
  {
    vendorSlug: 'luna-frame-studio',
    title: 'Golden Hour Portraits',
    description: 'A warm outdoor portrait series captured during a relaxed evening celebration.',
    imagePublicId: 'eventure-seed/luna-frame-studio/golden-hour-portraits',
    imageUrl: '/images/vendors/luna-frame-studio/portfolio-01.png',
    originalName: 'portfolio-01.png',
    mimeType: 'image/png',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'luna-frame-studio',
    title: 'Editorial Wedding Story',
    description: 'A refined wedding-day story combining candid moments and editorial compositions.',
    imagePublicId: 'eventure-seed/luna-frame-studio/editorial-wedding-story',
    imageUrl: '/images/vendors/luna-frame-studio/portfolio-02.png',
    originalName: 'portfolio-02.png',
    mimeType: 'image/png',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'luna-frame-studio',
    title: 'Graduation Celebration Story',
    description:
      'Natural documentary photography capturing a joyful family graduation celebration.',
    imagePublicId: 'eventure-seed/luna-frame-studio/intimate-ceremony',
    imageUrl: '/images/vendors/luna-frame-studio/portfolio-03.png',
    originalName: 'portfolio-03.png',
    mimeType: 'image/png',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'velvet-moments',
    title: 'Ivory Reception Styling',
    description: 'A soft ivory reception concept with layered textures and elegant table details.',
    imagePublicId: 'eventure-seed/velvet-moments/ivory-reception-styling',
    imageUrl: '/images/vendors/velvet-moments/portfolio-01.png',
    originalName: 'portfolio-01.png',
    mimeType: 'image/png',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'velvet-moments',
    title: 'Modern Stage Design',
    description:
      'A contemporary stage installation created with curved forms and refined floral styling.',
    imagePublicId: 'eventure-seed/velvet-moments/modern-stage-design',
    imageUrl: '/images/vendors/velvet-moments/portfolio-02.png',
    originalName: 'portfolio-02.png',
    mimeType: 'image/png',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'velvet-moments',
    title: 'Candlelit Family Dinner',
    description:
      'An intimate long-table dinner setting designed for hosts, families and their closest guests.',
    imagePublicId: 'eventure-seed/velvet-moments/candlelit-dinner-setting',
    imageUrl: '/images/vendors/velvet-moments/portfolio-03.png',
    originalName: 'portfolio-03.png',
    mimeType: 'image/png',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'aroma-catering',
    title: 'Premium Buffet Presentation',
    description: 'A carefully presented buffet prepared for a large evening reception.',
    imagePublicId: 'eventure-seed/aroma-catering/premium-buffet-presentation',
    imageUrl: '/images/vendors/aroma-catering/portfolio-01.png',
    originalName: 'portfolio-01.png',
    mimeType: 'image/png',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'aroma-catering',
    title: 'Live Culinary Station',
    description: 'An interactive live cooking station operated by the event culinary team.',
    imagePublicId: 'eventure-seed/aroma-catering/live-culinary-station',
    imageUrl: '/images/vendors/aroma-catering/portfolio-02.png',
    originalName: 'portfolio-02.png',
    mimeType: 'image/png',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'aroma-catering',
    title: 'Dessert Selection',
    description: 'A curated selection of individual desserts prepared for a private celebration.',
    imagePublicId: 'eventure-seed/aroma-catering/dessert-selection',
    imageUrl: '/images/vendors/aroma-catering/portfolio-03.png',
    originalName: 'portfolio-03.png',
    mimeType: 'image/png',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'sweet-layers',
    title: 'Pearl Wedding Cake',
    description:
      'A refined tiered cake finished with intricate pearl detailing and rich floral accents.',
    imagePublicId: 'eventure-seed/sweet-layers/pearl-wedding-cake',
    imageUrl: '/images/vendors/sweet-layers/portfolio-01.png',
    originalName: 'portfolio-01.png',
    mimeType: 'image/png',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'sweet-layers',
    title: 'Luxury Dessert Table',
    description:
      'A premium dessert experience featuring elegant cakes, pastries and individual sweets.',
    imagePublicId: 'eventure-seed/sweet-layers/pastel-dessert-table',
    imageUrl: '/images/vendors/sweet-layers/portfolio-02.png',
    originalName: 'portfolio-02.png',
    mimeType: 'image/png',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'sweet-layers',
    title: 'Signature Celebration Cake',
    description:
      'A bespoke artistic cake created for birthdays, graduations, anniversaries and milestones.',
    imagePublicId: 'eventure-seed/sweet-layers/botanical-celebration-cake',
    imageUrl: '/images/vendors/sweet-layers/portfolio-03.png',
    originalName: 'portfolio-03.png',
    mimeType: 'image/png',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'bloom-atelier',
    title: 'Editorial Bridal Bouquet',
    description: 'A sculptural bridal bouquet created with seasonal flowers and natural movement.',
    imagePublicId: 'eventure-seed/bloom-atelier/editorial-bridal-bouquet',
    imageUrl: '/images/vendors/bloom-atelier/portfolio-01.png',
    originalName: 'portfolio-01.png',
    mimeType: 'image/png',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'bloom-atelier',
    title: 'Floral Ceremony Arch',
    description: 'An elegant floral arch created for a refined outdoor ceremony.',
    imagePublicId: 'eventure-seed/bloom-atelier/floral-ceremony-arch',
    imageUrl: '/images/vendors/bloom-atelier/portfolio-02.png',
    originalName: 'portfolio-02.png',
    mimeType: 'image/png',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'bloom-atelier',
    title: 'Reception Tablescape',
    description:
      'A floral-led reception tablescape combining elegant place settings and layered centrepieces.',
    imagePublicId: 'eventure-seed/bloom-atelier/reception-tablescape',
    imageUrl: '/images/vendors/bloom-atelier/portfolio-03.png',
    originalName: 'portfolio-03.png',
    mimeType: 'image/png',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'echo-entertainment',
    title: 'Luxury Live Band Performance',
    description:
      'A professional live band performing for guests at an upscale outdoor evening event.',
    imagePublicId: 'eventure-seed/echo-entertainment/reception-dance-floor',
    imageUrl: '/images/vendors/echo-entertainment/portfolio-01.png',
    originalName: 'portfolio-01.png',
    mimeType: 'image/png',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'echo-entertainment',
    title: 'Premium DJ Experience',
    description:
      'A luxury ballroom DJ setup supported by professional sound, lighting and visual production.',
    imagePublicId: 'eventure-seed/echo-entertainment/corporate-stage-setup',
    imageUrl: '/images/vendors/echo-entertainment/portfolio-02.png',
    originalName: 'portfolio-02.png',
    mimeType: 'image/png',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'echo-entertainment',
    title: 'Show Production and Special Effects',
    description:
      'A complete first-dance production featuring cold sparks, low fog and dramatic lighting.',
    imagePublicId: 'eventure-seed/echo-entertainment/ambient-lighting-design',
    imageUrl: '/images/vendors/echo-entertainment/portfolio-03.png',
    originalName: 'portfolio-03.png',
    mimeType: 'image/png',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'elite-transport',
    title: 'Luxury Wedding Arrival',
    description: 'A chauffeur-driven luxury vehicle prepared for an elegant wedding arrival.',
    imagePublicId: 'eventure-seed/elite-transport/classic-wedding-arrival',
    imageUrl: '/images/vendors/elite-transport/portfolio-01.png',
    originalName: 'portfolio-01.png',
    mimeType: 'image/png',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'elite-transport',
    title: 'Chauffeur Experience',
    description:
      'A private chauffeur experience designed around comfort, discretion and personal service.',
    imagePublicId: 'eventure-seed/elite-transport/bridal-party-fleet',
    imageUrl: '/images/vendors/elite-transport/portfolio-02.png',
    originalName: 'portfolio-02.png',
    mimeType: 'image/png',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'elite-transport',
    title: 'Executive VIP Transport',
    description:
      'Professional executive transport arranged for corporate guests, hosts and VIP arrivals.',
    imagePublicId: 'eventure-seed/elite-transport/evening-chauffeur-service',
    imageUrl: '/images/vendors/elite-transport/portfolio-03.png',
    originalName: 'portfolio-03.png',
    mimeType: 'image/png',
    displayOrder: 3,
    isFeatured: false,
  },

  {
    vendorSlug: 'grand-horizon-ballroom',
    title: 'Grand Ballroom Reception',
    description:
      'The signature ballroom arranged for an elegant formal reception beneath crystal chandeliers.',
    imagePublicId: 'eventure-seed/grand-horizon-ballroom/grand-reception-hall',
    imageUrl: '/images/vendors/grand-horizon-ballroom/portfolio-01.png',
    originalName: 'portfolio-01.png',
    mimeType: 'image/png',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    vendorSlug: 'grand-horizon-ballroom',
    title: 'Sunset Garden Ceremony',
    description:
      'A landscaped outdoor ceremony setting overlooking the horizon during golden hour.',
    imagePublicId: 'eventure-seed/grand-horizon-ballroom/corporate-conference-layout',
    imageUrl: '/images/vendors/grand-horizon-ballroom/portfolio-02.png',
    originalName: 'portfolio-02.png',
    mimeType: 'image/png',
    displayOrder: 2,
    isFeatured: false,
  },
  {
    vendorSlug: 'grand-horizon-ballroom',
    title: 'Beachfront Luxury Ceremony',
    description:
      'An exclusive beachfront ceremony setting framed by sculptural draping, candles and ocean views.',
    imagePublicId: 'eventure-seed/grand-horizon-ballroom/elegant-evening-setup',
    imageUrl: '/images/vendors/grand-horizon-ballroom/portfolio-03.png',
    originalName: 'portfolio-03.png',
    mimeType: 'image/png',
    displayOrder: 3,
    isFeatured: false,
  },
] as const;

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
        imageUrl: portfolioData.imageUrl,
        originalName: portfolioData.originalName,
        mimeType: portfolioData.mimeType,
        fileSize: 250000,
        displayOrder: portfolioData.displayOrder,
        isFeatured: portfolioData.isFeatured,
      },
      create: {
        vendorId: vendor.id,
        title: portfolioData.title,
        description: portfolioData.description,
        imageUrl: portfolioData.imageUrl,
        imagePublicId: portfolioData.imagePublicId,
        originalName: portfolioData.originalName,
        mimeType: portfolioData.mimeType,
        fileSize: 250000,
        displayOrder: portfolioData.displayOrder,
        isFeatured: portfolioData.isFeatured,
      },
    });
  }

  console.log(`${DEVELOPMENT_PORTFOLIO_ITEMS.length} vendor portfolio items seeded successfully.`);
};
