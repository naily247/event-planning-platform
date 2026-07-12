import { VendorVerificationStatus } from '@prisma/client';

export const PASSWORD_SALT_ROUNDS = 12;

export const DEFAULT_PASSWORD = 'Password@123456';

export const DEVELOPMENT_SERVICE_CATEGORIES = [
  {
    name: 'Photography',
    slug: 'photography',
  },
  {
    name: 'Videography',
    slug: 'videography',
  },
  {
    name: 'Catering',
    slug: 'catering',
  },
  {
    name: 'Decorations',
    slug: 'decorations',
  },
  {
    name: 'Music and DJ',
    slug: 'music-and-dj',
  },
  {
    name: 'Venues',
    slug: 'venues',
  },
  {
    name: 'Bridal and Beauty',
    slug: 'bridal-and-beauty',
  },
  {
    name: 'Event Planning',
    slug: 'event-planning',
  },
  {
    name: 'Invitations and Printing',
    slug: 'invitations-and-printing',
  },
  {
    name: 'Transport',
    slug: 'transport',
  },
  {
    name: 'Cakes and Desserts',
    slug: 'cakes-and-desserts',
  },
  {
    name: 'Flowers and Floristry',
    slug: 'flowers-and-floristry',
  },
] as const;

export const DEVELOPMENT_CUSTOMERS = [
  {
    firstName: 'Emma',
    lastName: 'Johnson',
    email: 'emma.johnson@eventure.dev',
    phone: '+94771234561',
  },
  {
    firstName: 'Michael',
    lastName: 'Silva',
    email: 'michael.silva@eventure.dev',
    phone: '+94771234562',
  },
  {
    firstName: 'Olivia',
    lastName: 'Fernando',
    email: 'olivia.fernando@eventure.dev',
    phone: '+94771234563',
  },
] as const;

export const DEVELOPMENT_VENDORS = [
  {
    firstName: 'Adrian',
    lastName: 'Perera',
    businessName: 'Luna Frame Studio',
    slug: 'luna-frame-studio',
    email: 'hello@lunaframe.dev',
    categorySlug: 'photography',
    baseLocation: 'Colombo',
    serviceAreas: ['Colombo', 'Negombo', 'Gampaha', 'Galle'],
    description: 'Premium wedding and event photography with a documentary storytelling style.',
  },
  {
    firstName: 'Maya',
    lastName: 'Fernando',
    businessName: 'Velvet Moments',
    slug: 'velvet-moments',
    email: 'hello@velvetmoments.dev',
    categorySlug: 'decorations',
    baseLocation: 'Negombo',
    serviceAreas: ['Negombo', 'Colombo', 'Gampaha'],
    description: 'Luxury venue styling and modern decoration concepts for memorable celebrations.',
  },
  {
    firstName: 'Ruwan',
    lastName: 'Silva',
    businessName: 'Aroma Catering',
    slug: 'aroma-catering',
    email: 'hello@aromacatering.dev',
    categorySlug: 'catering',
    baseLocation: 'Colombo',
    serviceAreas: ['Colombo', 'Gampaha', 'Kalutara'],
    description: 'Wedding, corporate, and private-event catering with customizable menus.',
  },
  {
    firstName: 'Ishara',
    lastName: 'Jayasinghe',
    businessName: 'Sweet Layers',
    slug: 'sweet-layers',
    email: 'hello@sweetlayers.dev',
    categorySlug: 'cakes-and-desserts',
    baseLocation: 'Kandy',
    serviceAreas: ['Kandy', 'Matale', 'Colombo'],
    description: 'Custom celebration cakes and curated dessert tables crafted for every occasion.',
  },
  {
    firstName: 'Amaya',
    lastName: 'Wickramasinghe',
    businessName: 'Bloom Atelier',
    slug: 'bloom-atelier',
    email: 'hello@bloomatelier.dev',
    categorySlug: 'flowers-and-floristry',
    baseLocation: 'Colombo',
    serviceAreas: ['Colombo', 'Negombo', 'Galle'],
    description: 'Elegant floral concepts inspired by modern editorial weddings and celebrations.',
  },
  {
    firstName: 'Dilan',
    lastName: 'Rodrigo',
    businessName: 'Echo Entertainment',
    slug: 'echo-entertainment',
    email: 'hello@echoentertainment.dev',
    categorySlug: 'music-and-dj',
    baseLocation: 'Galle',
    serviceAreas: ['Galle', 'Matara', 'Colombo'],
    description:
      'Professional DJs, sound systems, lighting, and live entertainment for private and corporate events.',
  },
  {
    firstName: 'Naveen',
    lastName: 'De Alwis',
    businessName: 'Elite Transport',
    slug: 'elite-transport',
    email: 'hello@elitetransport.dev',
    categorySlug: 'transport',
    baseLocation: 'Colombo',
    serviceAreas: ['Colombo', 'Negombo', 'Gampaha', 'Kalutara'],
    description: 'Luxury wedding cars, guest transportation, and professional chauffeur services.',
  },
  {
    firstName: 'Shalini',
    lastName: 'Gunawardena',
    businessName: 'Grand Horizon Ballroom',
    slug: 'grand-horizon-ballroom',
    email: 'hello@grandhorizon.dev',
    categorySlug: 'venues',
    baseLocation: 'Colombo',
    serviceAreas: ['Colombo'],
    description:
      'A contemporary ballroom venue for weddings, receptions, conferences, and corporate events.',
  },
] as const;

export const DEFAULT_VENDOR_VERIFICATION_STATUS = VendorVerificationStatus.APPROVED;
