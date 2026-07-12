import { Prisma, type PrismaClient } from '@prisma/client';
import { getRequiredCategoryBySlug, getRequiredVendorBySlug } from './helpers.js';

const DEVELOPMENT_PACKAGES = [
  {
    vendorSlug: 'luna-frame-studio',
    categorySlug: 'photography',
    title: 'Essential Story',
    description:
      'Six hours of event coverage with one lead photographer, professionally edited photographs, and a private online gallery.',
    basePrice: '185000.00',
  },
  {
    vendorSlug: 'luna-frame-studio',
    categorySlug: 'photography',
    title: 'Editorial Celebration',
    description:
      'Full-day photography coverage with two photographers, an engagement session, premium editing, and a curated photo album.',
    basePrice: '325000.00',
  },
  {
    vendorSlug: 'velvet-moments',
    categorySlug: 'decorations',
    title: 'Signature Styling',
    description:
      'Elegant stage styling, entrance decoration, table accents, and a coordinated colour concept for intimate celebrations.',
    basePrice: '240000.00',
  },
  {
    vendorSlug: 'velvet-moments',
    categorySlug: 'decorations',
    title: 'Grand Celebration Design',
    description:
      'Complete venue transformation with custom backdrops, premium table styling, lighting accents, and floral installations.',
    basePrice: '475000.00',
  },
  {
    vendorSlug: 'aroma-catering',
    categorySlug: 'catering',
    title: 'Classic Banquet',
    description:
      'A customizable buffet menu with welcome refreshments, main courses, desserts, service staff, and standard tableware.',
    basePrice: '3500.00',
  },
  {
    vendorSlug: 'aroma-catering',
    categorySlug: 'catering',
    title: 'Premium Dining Experience',
    description:
      'An elevated event menu with live stations, premium mains, handcrafted desserts, beverages, and full-service staffing.',
    basePrice: '6200.00',
  },
  {
    vendorSlug: 'sweet-layers',
    categorySlug: 'cakes-and-desserts',
    title: 'Celebration Cake',
    description:
      'A custom-designed two-tier celebration cake with personalized flavours, finishes, and decorative detailing.',
    basePrice: '48000.00',
  },
  {
    vendorSlug: 'sweet-layers',
    categorySlug: 'cakes-and-desserts',
    title: 'Dessert Table Collection',
    description:
      'A coordinated dessert display featuring a statement cake, cupcakes, macarons, dessert cups, and styled presentation.',
    basePrice: '95000.00',
  },
  {
    vendorSlug: 'bloom-atelier',
    categorySlug: 'flowers-and-floristry',
    title: 'Floral Essentials',
    description:
      'A coordinated floral collection with personal flowers, table arrangements, and selected venue accents.',
    basePrice: '175000.00',
  },
  {
    vendorSlug: 'bloom-atelier',
    categorySlug: 'flowers-and-floristry',
    title: 'Editorial Floral Design',
    description:
      'A bespoke floral concept featuring premium seasonal flowers, statement installations, bouquets, and styled tablescapes.',
    basePrice: '390000.00',
  },
  {
    vendorSlug: 'echo-entertainment',
    categorySlug: 'music-and-dj',
    title: 'DJ and Sound Essentials',
    description:
      'Professional DJ coverage with a curated playlist, quality sound system, wireless microphones, and basic dance-floor lighting.',
    basePrice: '135000.00',
  },
  {
    vendorSlug: 'echo-entertainment',
    categorySlug: 'music-and-dj',
    title: 'Full Entertainment Experience',
    description:
      'Extended DJ service with premium audio, intelligent lighting, an LED screen, event hosting, and technical support.',
    basePrice: '275000.00',
  },
  {
    vendorSlug: 'elite-transport',
    categorySlug: 'transport',
    title: 'Luxury Arrival',
    description:
      'A chauffeur-driven premium vehicle for the main event arrival, including decoration coordination and waiting time.',
    basePrice: '85000.00',
  },
  {
    vendorSlug: 'elite-transport',
    categorySlug: 'transport',
    title: 'Wedding Transport Collection',
    description:
      'A coordinated transport package with a luxury couple vehicle, bridal-party vehicles, and professional chauffeurs.',
    basePrice: '195000.00',
  },
  {
    vendorSlug: 'grand-horizon-ballroom',
    categorySlug: 'venues',
    title: 'Elegant Reception',
    description:
      'Ballroom access for an intimate reception with standard seating, tables, air conditioning, parking, and venue coordination.',
    basePrice: '450000.00',
  },
  {
    vendorSlug: 'grand-horizon-ballroom',
    categorySlug: 'venues',
    title: 'Grand Ballroom Experience',
    description:
      'Exclusive ballroom access with premium seating layouts, preparation rooms, lighting support, parking, and event coordination.',
    basePrice: '750000.00',
  },
] as const;

export const seedServicePackages = async (prisma: PrismaClient) => {
  for (const packageData of DEVELOPMENT_PACKAGES) {
    const vendor = await getRequiredVendorBySlug(prisma, packageData.vendorSlug);

    const category = await getRequiredCategoryBySlug(prisma, packageData.categorySlug);

    const existingPackage = await prisma.servicePackage.findFirst({
      where: {
        vendorId: vendor.id,
        title: packageData.title,
      },
    });

    const packageValues = {
      categoryId: category.id,
      title: packageData.title,
      description: packageData.description,
      basePrice: new Prisma.Decimal(packageData.basePrice),
      isActive: true,
    };

    if (existingPackage) {
      await prisma.servicePackage.update({
        where: {
          id: existingPackage.id,
        },
        data: packageValues,
      });

      continue;
    }

    await prisma.servicePackage.create({
      data: {
        vendorId: vendor.id,
        ...packageValues,
      },
    });
  }

  console.log(`${DEVELOPMENT_PACKAGES.length} service packages seeded successfully.`);
};
