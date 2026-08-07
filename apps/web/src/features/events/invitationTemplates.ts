import { eventTypeOptions, type EventInvitationTemplate, type EventTypeOption } from './event.api';

export type InvitationTemplateFontStyle = 'editorial' | 'classic' | 'modern' | 'playful';

export type InvitationTemplateBackground = {
  id: string;
  imagePath: string;
  alt: string;
};

export type InvitationTemplateDefinition = {
  id: EventInvitationTemplate;
  eventType: EventTypeOption;
  name: string;
  description: string;
  previewLabel: string;
  background: string;
  accent: string;
  textColor: string;
  mutedTextColor: string;
  fontStyle: InvitationTemplateFontStyle;
  backgrounds: readonly [InvitationTemplateBackground, InvitationTemplateBackground];
};

const invitationImageBasePath = '/images/invitations/templates';

export const invitationTemplates: readonly InvitationTemplateDefinition[] = [
  {
    id: 'BIRTHDAY_CONFETTI',
    eventType: 'Birthday',
    name: 'Confetti Celebration',
    description:
      'A bright birthday design filled with playful colour, celebratory details and energetic party styling.',
    previewLabel: 'Joyful & bright',
    background:
      'linear-gradient(145deg, rgba(255,252,247,1), rgba(249,231,242,0.98) 52%, rgba(219,190,220,0.94))',
    accent: 'linear-gradient(90deg, rgba(183,167,200,1), rgba(218,169,196,1), rgba(124,74,90,1))',
    textColor: '#211d20',
    mutedTextColor: 'rgba(33,29,32,0.62)',
    fontStyle: 'playful',
    backgrounds: [
      {
        id: 'birthday-confetti-01',
        imagePath: `${invitationImageBasePath}/birthday-confetti-01.png`,
        alt: 'Colourful birthday celebration with cake, gifts and confetti',
      },
      {
        id: 'birthday-confetti-02',
        imagePath: `${invitationImageBasePath}/birthday-confetti-02.png`,
        alt: 'Floating birthday installation with balloons and confetti',
      },
    ],
  },
  {
    id: 'BIRTHDAY_ELEGANT',
    eventType: 'Birthday',
    name: 'Elegant Birthday',
    description:
      'A polished birthday design with graceful styling, sophisticated details and an intimate luxury atmosphere.',
    previewLabel: 'Soft & refined',
    background:
      'linear-gradient(145deg, rgba(255,253,249,1), rgba(246,239,245,0.98) 54%, rgba(220,207,226,0.92))',
    accent: 'linear-gradient(90deg, rgba(210,190,217,1), rgba(187,164,199,1), rgba(93,58,85,1))',
    textColor: '#241e23',
    mutedTextColor: 'rgba(36,30,35,0.60)',
    fontStyle: 'editorial',
    backgrounds: [
      {
        id: 'birthday-elegant-01',
        imagePath: `${invitationImageBasePath}/birthday-elegant-01.png`,
        alt: 'Elegant birthday cake display with refined floral styling',
      },
      {
        id: 'birthday-elegant-02',
        imagePath: `${invitationImageBasePath}/birthday-elegant-02.png`,
        alt: 'Intimate elegant birthday vignette with gifts and candlelight',
      },
    ],
  },
  {
    id: 'BIRTHDAY_NEON',
    eventType: 'Birthday',
    name: 'Neon Birthday',
    description:
      'A bold contemporary birthday design with saturated neon light, reflective textures and energetic nightlife character.',
    previewLabel: 'Bold & electric',
    background:
      'linear-gradient(145deg, rgba(38,29,43,1), rgba(62,34,72,0.98) 52%, rgba(115,49,93,0.94))',
    accent: 'linear-gradient(90deg, rgba(239,141,201,1), rgba(186,115,255,1), rgba(109,215,255,1))',
    textColor: '#fff8ff',
    mutedTextColor: 'rgba(255,248,255,0.68)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'birthday-neon-01',
        imagePath: `${invitationImageBasePath}/birthday-neon-01.png`,
        alt: 'Neon birthday stage with glowing acrylic structures',
      },
      {
        id: 'birthday-neon-02',
        imagePath: `${invitationImageBasePath}/birthday-neon-02.png`,
        alt: 'Reflective neon birthday details with chrome party elements',
      },
    ],
  },

  {
    id: 'WEDDING_IVORY',
    eventType: 'Wedding',
    name: 'Ivory Bloom',
    description:
      'A luminous wedding design built around ivory florals, soft fabrics and timeless ceremonial styling.',
    previewLabel: 'Romantic & timeless',
    background:
      'linear-gradient(145deg, rgba(255,253,249,1), rgba(250,243,240,0.98) 55%, rgba(230,214,211,0.94))',
    accent: 'linear-gradient(90deg, rgba(224,199,203,1), rgba(190,153,167,1), rgba(122,78,93,1))',
    textColor: '#271f23',
    mutedTextColor: 'rgba(39,31,35,0.60)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'wedding-ivory-01',
        imagePath: `${invitationImageBasePath}/wedding-ivory-01.png`,
        alt: 'Ivory wedding ceremony with white floral architecture',
      },
      {
        id: 'wedding-ivory-02',
        imagePath: `${invitationImageBasePath}/wedding-ivory-02.png`,
        alt: 'Elegant ivory wedding details arranged on soft silk',
      },
    ],
  },
  {
    id: 'WEDDING_BOTANICAL',
    eventType: 'Wedding',
    name: 'Botanical Garden',
    description:
      'A botanical wedding design shaped by garden greenery, organic florals and relaxed outdoor elegance.',
    previewLabel: 'Organic & romantic',
    background:
      'linear-gradient(145deg, rgba(254,253,247,1), rgba(238,242,229,0.98) 55%, rgba(205,216,191,0.94))',
    accent: 'linear-gradient(90deg, rgba(190,205,168,1), rgba(142,165,123,1), rgba(84,106,72,1))',
    textColor: '#20271d',
    mutedTextColor: 'rgba(32,39,29,0.60)',
    fontStyle: 'editorial',
    backgrounds: [
      {
        id: 'wedding-botanical-01',
        imagePath: `${invitationImageBasePath}/wedding-botanical-01.png`,
        alt: 'Botanical wedding aisle beneath a natural garden canopy',
      },
      {
        id: 'wedding-botanical-02',
        imagePath: `${invitationImageBasePath}/wedding-botanical-02.png`,
        alt: 'Garden wedding reception table with botanical styling',
      },
    ],
  },
  {
    id: 'WEDDING_GOLD',
    eventType: 'Wedding',
    name: 'Destination Wedding',
    description:
      'A colourful destination-wedding design pairing Mediterranean coastal beauty with a serene alpine retreat.',
    previewLabel: 'Scenic & unforgettable',
    background:
      'linear-gradient(145deg, rgba(244,252,255,1), rgba(218,238,247,0.98) 55%, rgba(153,194,216,0.94))',
    accent: 'linear-gradient(90deg, rgba(250,123,160,1), rgba(79,169,210,1), rgba(50,104,151,1))',
    textColor: '#172934',
    mutedTextColor: 'rgba(23,41,52,0.62)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'wedding-destination-01',
        imagePath: `${invitationImageBasePath}/wedding-destination-01.png`,
        alt: 'Colourful Mediterranean destination wedding above the sea',
      },
      {
        id: 'wedding-destination-02',
        imagePath: `${invitationImageBasePath}/wedding-destination-02.png`,
        alt: 'Alpine destination wedding beside a mountain lake',
      },
    ],
  },

  {
    id: 'BABY_SHOWER_TEDDY',
    eventType: 'Baby Shower',
    name: 'Whimsical Welcome',
    description:
      'A whimsical baby-shower design with imaginative styling, gentle colour and childhood wonder.',
    previewLabel: 'Whimsical & gentle',
    background:
      'linear-gradient(145deg, rgba(255,249,246,1), rgba(244,230,239,0.98) 55%, rgba(207,191,222,0.94))',
    accent: 'linear-gradient(90deg, rgba(232,181,195,1), rgba(176,153,205,1), rgba(108,88,151,1))',
    textColor: '#2a222c',
    mutedTextColor: 'rgba(42,34,44,0.60)',
    fontStyle: 'playful',
    backgrounds: [
      {
        id: 'baby-whimsical-01',
        imagePath: `${invitationImageBasePath}/baby-whimsical-01.png`,
        alt: 'Whimsical baby-shower celebration scene',
      },
      {
        id: 'baby-whimsical-02',
        imagePath: `${invitationImageBasePath}/baby-whimsical-02.png`,
        alt: 'Playful whimsical baby-shower companion scene',
      },
    ],
  },
  {
    id: 'BABY_SHOWER_CLOUDS',
    eventType: 'Baby Shower',
    name: 'Little Clouds',
    description:
      'A dreamy baby-shower design with airy clouds, cool pastel colour and delicate celestial details.',
    previewLabel: 'Dreamy & soft',
    background:
      'linear-gradient(145deg, rgba(252,254,255,1), rgba(231,240,247,0.98) 55%, rgba(195,214,229,0.94))',
    accent: 'linear-gradient(90deg, rgba(204,221,235,1), rgba(151,185,211,1), rgba(79,117,148,1))',
    textColor: '#202830',
    mutedTextColor: 'rgba(32,40,48,0.60)',
    fontStyle: 'editorial',
    backgrounds: [
      {
        id: 'baby-clouds-01',
        imagePath: `${invitationImageBasePath}/baby-clouds-01.png`,
        alt: 'Dreamy baby-shower cloud installation',
      },
      {
        id: 'baby-clouds-02',
        imagePath: `${invitationImageBasePath}/baby-clouds-02.png`,
        alt: 'Soft celestial baby-shower details',
      },
    ],
  },
  {
    id: 'BABY_SHOWER_STORYBOOK',
    eventType: 'Baby Shower',
    name: 'Little Safari',
    description:
      'A lively baby-shower design inspired by friendly safari imagery, natural textures and cheerful adventure.',
    previewLabel: 'Cheerful & adventurous',
    background:
      'linear-gradient(145deg, rgba(250,253,239,1), rgba(228,239,207,0.98) 55%, rgba(172,204,152,0.94))',
    accent: 'linear-gradient(90deg, rgba(236,181,103,1), rgba(111,165,119,1), rgba(67,104,72,1))',
    textColor: '#24301f',
    mutedTextColor: 'rgba(36,48,31,0.60)',
    fontStyle: 'playful',
    backgrounds: [
      {
        id: 'baby-safari-01',
        imagePath: `${invitationImageBasePath}/baby-safari-01.png`,
        alt: 'Playful safari-themed baby-shower scene',
      },
      {
        id: 'baby-safari-02',
        imagePath: `${invitationImageBasePath}/baby-safari-02.png`,
        alt: 'Colourful safari baby-shower companion scene',
      },
    ],
  },

  {
    id: 'GRADUATION_CLASSIC',
    eventType: 'Graduation',
    name: 'Classic Scholar',
    description:
      'A distinguished graduation design inspired by traditional scholarship and timeless academic achievement.',
    previewLabel: 'Proud & timeless',
    background:
      'linear-gradient(145deg, rgba(255,253,246,1), rgba(246,240,220,0.98) 55%, rgba(213,201,158,0.94))',
    accent: 'linear-gradient(90deg, rgba(224,207,159,1), rgba(178,151,84,1), rgba(105,83,38,1))',
    textColor: '#2c281c',
    mutedTextColor: 'rgba(44,40,28,0.60)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'graduation-classic-01',
        imagePath: `${invitationImageBasePath}/graduation-classic-01.png`,
        alt: 'Traditional graduation desk with scholarly details',
      },
      {
        id: 'graduation-classic-02',
        imagePath: `${invitationImageBasePath}/graduation-classic-02.png`,
        alt: 'Formal graduation ceremony hall',
      },
    ],
  },
  {
    id: 'GRADUATION_MODERN',
    eventType: 'Graduation',
    name: 'Modern Graduate',
    description:
      'A crisp modern graduation design with architectural geometry, graphic shadows and confident styling.',
    previewLabel: 'Clean & confident',
    background:
      'linear-gradient(145deg, rgba(247,249,251,1), rgba(225,230,238,0.98) 55%, rgba(184,194,211,0.94))',
    accent: 'linear-gradient(90deg, rgba(171,185,207,1), rgba(108,128,158,1), rgba(52,68,92,1))',
    textColor: '#1d232d',
    mutedTextColor: 'rgba(29,35,45,0.60)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'graduation-modern-01',
        imagePath: `${invitationImageBasePath}/graduation-modern-01.png`,
        alt: 'Minimal contemporary graduation stage',
      },
      {
        id: 'graduation-modern-02',
        imagePath: `${invitationImageBasePath}/graduation-modern-02.png`,
        alt: 'Modern graduation details in blue, white and silver',
      },
    ],
  },
  {
    id: 'GRADUATION_GALA',
    eventType: 'Graduation',
    name: 'Graduation Gala',
    description:
      'A dramatic graduation design combining formal evening elegance with the excitement of a major milestone.',
    previewLabel: 'Formal & celebratory',
    background:
      'linear-gradient(145deg, rgba(37,34,38,1), rgba(59,47,57,0.98) 55%, rgba(110,84,72,0.94))',
    accent: 'linear-gradient(90deg, rgba(230,206,150,1), rgba(190,151,80,1), rgba(247,226,174,1))',
    textColor: '#fffaf2',
    mutedTextColor: 'rgba(255,250,242,0.68)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'graduation-gala-01',
        imagePath: `${invitationImageBasePath}/graduation-gala-01.png`,
        alt: 'Formal graduation gala reception',
      },
      {
        id: 'graduation-gala-02',
        imagePath: `${invitationImageBasePath}/graduation-gala-02.png`,
        alt: 'Dramatic graduation celebration installation',
      },
    ],
  },

  {
    id: 'CORPORATE_MINIMAL',
    eventType: 'Corporate',
    name: 'Minimal Brief',
    description:
      'A restrained corporate design with clean architecture, purposeful spacing and a professional visual tone.',
    previewLabel: 'Clear & professional',
    background:
      'linear-gradient(145deg, rgba(250,250,249,1), rgba(235,235,232,0.98) 55%, rgba(206,205,199,0.94))',
    accent: 'linear-gradient(90deg, rgba(192,191,185,1), rgba(132,131,125,1), rgba(65,64,61,1))',
    textColor: '#222220',
    mutedTextColor: 'rgba(34,34,32,0.60)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'corporate-minimal-01',
        imagePath: `${invitationImageBasePath}/corporate-minimal-01.png`,
        alt: 'Minimal corporate meeting environment',
      },
      {
        id: 'corporate-minimal-02',
        imagePath: `${invitationImageBasePath}/corporate-minimal-02.png`,
        alt: 'Clean corporate presentation workspace',
      },
    ],
  },
  {
    id: 'CORPORATE_PREMIUM',
    eventType: 'Corporate',
    name: 'Premium Forum',
    description:
      'A premium corporate design for conferences, forums and networking events requiring a polished atmosphere.',
    previewLabel: 'Premium & polished',
    background:
      'linear-gradient(145deg, rgba(255,252,247,1), rgba(242,232,223,0.98) 55%, rgba(201,179,160,0.94))',
    accent: 'linear-gradient(90deg, rgba(203,180,160,1), rgba(153,119,96,1), rgba(83,61,50,1))',
    textColor: '#2b231f',
    mutedTextColor: 'rgba(43,35,31,0.60)',
    fontStyle: 'editorial',
    backgrounds: [
      {
        id: 'corporate-premium-01',
        imagePath: `${invitationImageBasePath}/corporate-premium-01.png`,
        alt: 'Premium corporate conference auditorium',
      },
      {
        id: 'corporate-premium-02',
        imagePath: `${invitationImageBasePath}/corporate-premium-02.png`,
        alt: 'Sophisticated corporate networking lounge',
      },
    ],
  },
  {
    id: 'CORPORATE_EXECUTIVE',
    eventType: 'Corporate',
    name: 'Executive Edition',
    description:
      'A confident executive design using rich materials, private environments and understated corporate luxury.',
    previewLabel: 'Bold & executive',
    background:
      'linear-gradient(145deg, rgba(31,32,35,1), rgba(47,49,55,0.98) 55%, rgba(74,79,88,0.94))',
    accent: 'linear-gradient(90deg, rgba(188,165,148,1), rgba(143,118,100,1), rgba(225,207,192,1))',
    textColor: '#ffffff',
    mutedTextColor: 'rgba(255,255,255,0.66)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'corporate-executive-01',
        imagePath: `${invitationImageBasePath}/corporate-executive-01.png`,
        alt: 'Executive walnut boardroom',
      },
      {
        id: 'corporate-executive-02',
        imagePath: `${invitationImageBasePath}/corporate-executive-02.png`,
        alt: 'Private executive strategy lounge',
      },
    ],
  },

  {
    id: 'PARTY_RETRO',
    eventType: 'Party',
    name: 'Retro Pop',
    description:
      'A playful retro party design with bold shapes, nostalgic styling and expressive colour combinations.',
    previewLabel: 'Playful & nostalgic',
    background:
      'linear-gradient(145deg, rgba(255,247,236,1), rgba(245,205,180,0.98) 52%, rgba(204,121,121,0.94))',
    accent: 'linear-gradient(90deg, rgba(238,166,119,1), rgba(204,103,121,1), rgba(117,67,91,1))',
    textColor: '#2b2023',
    mutedTextColor: 'rgba(43,32,35,0.60)',
    fontStyle: 'playful',
    backgrounds: [
      {
        id: 'party-retro-01',
        imagePath: `${invitationImageBasePath}/party-retro-01.png`,
        alt: 'Colourful retro party interior',
      },
      {
        id: 'party-retro-02',
        imagePath: `${invitationImageBasePath}/party-retro-02.png`,
        alt: 'Graphic retro dance-floor installation',
      },
    ],
  },
  {
    id: 'PARTY_NEON',
    eventType: 'Party',
    name: 'Neon Night',
    description:
      'An energetic party design featuring saturated neon colour, reflective materials and immersive nightlife.',
    previewLabel: 'Electric & bold',
    background:
      'linear-gradient(145deg, rgba(27,23,35,1), rgba(52,28,68,0.98) 52%, rgba(99,37,88,0.94))',
    accent: 'linear-gradient(90deg, rgba(255,102,196,1), rgba(152,94,255,1), rgba(76,217,255,1))',
    textColor: '#fff8ff',
    mutedTextColor: 'rgba(255,248,255,0.68)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'party-neon-01',
        imagePath: `${invitationImageBasePath}/party-neon-01.png`,
        alt: 'Immersive neon party tunnel',
      },
      {
        id: 'party-neon-02',
        imagePath: `${invitationImageBasePath}/party-neon-02.png`,
        alt: 'Neon cocktail arrangement with luminous glassware',
      },
    ],
  },
  {
    id: 'PARTY_LUXE',
    eventType: 'Party',
    name: 'Evening Luxe',
    description:
      'A luxurious party design with rich evening textures, intimate lighting and refined black-tie character.',
    previewLabel: 'Glamorous & warm',
    background:
      'linear-gradient(145deg, rgba(42,31,36,1), rgba(86,50,63,0.98) 52%, rgba(148,87,83,0.94))',
    accent: 'linear-gradient(90deg, rgba(233,188,145,1), rgba(199,134,105,1), rgba(247,218,181,1))',
    textColor: '#fff9f3',
    mutedTextColor: 'rgba(255,249,243,0.68)',
    fontStyle: 'editorial',
    backgrounds: [
      {
        id: 'party-luxe-01',
        imagePath: `${invitationImageBasePath}/party-luxe-01.png`,
        alt: 'Luxurious evening party salon',
      },
      {
        id: 'party-luxe-02',
        imagePath: `${invitationImageBasePath}/party-luxe-02.png`,
        alt: 'Elegant black-tie bar styling',
      },
    ],
  },

  {
    id: 'ENGAGEMENT_ROMANCE',
    eventType: 'Engagement',
    name: 'Quiet Romance',
    description:
      'An intimate engagement design with refined romantic styling and a calm, emotionally rich atmosphere.',
    previewLabel: 'Romantic & soft',
    background:
      'linear-gradient(145deg, rgba(255,252,248,1), rgba(250,240,231,0.98) 55%, rgba(229,201,181,0.94))',
    accent: 'linear-gradient(90deg, rgba(235,211,176,1), rgba(201,164,112,1), rgba(134,96,56,1))',
    textColor: '#2c241d',
    mutedTextColor: 'rgba(44,36,29,0.60)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'engagement-romance-01',
        imagePath: `${invitationImageBasePath}/engagement-romance-01.png`,
        alt: 'Intimate romantic engagement setting',
      },
      {
        id: 'engagement-romance-02',
        imagePath: `${invitationImageBasePath}/engagement-romance-02.png`,
        alt: 'Refined engagement romance companion scene',
      },
    ],
  },
  {
    id: 'ENGAGEMENT_GARDEN',
    eventType: 'Engagement',
    name: 'Garden Promise',
    description:
      'A colourful engagement design celebrating natural gardens, abundant flowers and beautiful outdoor destinations.',
    previewLabel: 'Fresh & romantic',
    background:
      'linear-gradient(145deg, rgba(253,254,248,1), rgba(237,243,226,0.98) 55%, rgba(204,220,188,0.94))',
    accent: 'linear-gradient(90deg, rgba(193,211,173,1), rgba(137,167,116,1), rgba(75,105,65,1))',
    textColor: '#20281c',
    mutedTextColor: 'rgba(32,40,28,0.60)',
    fontStyle: 'editorial',
    backgrounds: [
      {
        id: 'engagement-garden-01',
        imagePath: `${invitationImageBasePath}/engagement-garden-01.png`,
        alt: 'Rose-garden engagement destination',
      },
      {
        id: 'engagement-garden-02',
        imagePath: `${invitationImageBasePath}/engagement-garden-02.png`,
        alt: 'Tulip-garden engagement destination',
      },
    ],
  },
  {
    id: 'ENGAGEMENT_ROSE_GOLD',
    eventType: 'Engagement',
    name: 'Evening Promise',
    description:
      'A modern engagement design shaped by blue-hour light, contemporary architecture and cool-toned romance.',
    previewLabel: 'Cool & contemporary',
    background:
      'linear-gradient(145deg, rgba(243,246,255,1), rgba(220,221,245,0.98) 55%, rgba(168,153,204,0.94))',
    accent: 'linear-gradient(90deg, rgba(226,168,202,1), rgba(156,140,210,1), rgba(81,88,147,1))',
    textColor: '#222338',
    mutedTextColor: 'rgba(34,35,56,0.62)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'engagement-evening-01',
        imagePath: `${invitationImageBasePath}/engagement-evening-01.png`,
        alt: 'Moonlit glass conservatory for an engagement celebration',
      },
      {
        id: 'engagement-evening-02',
        imagePath: `${invitationImageBasePath}/engagement-evening-02.png`,
        alt: 'Cool evening engagement in a modern art courtyard',
      },
    ],
  },

  {
    id: 'FESTIVAL_VIBRANT',
    eventType: 'Festival',
    name: 'Vibrant Celebration',
    description:
      'A joyful festival design filled with strong colour, layered decoration and open-air celebration.',
    previewLabel: 'Colourful & lively',
    background:
      'linear-gradient(145deg, rgba(255,248,235,1), rgba(245,207,159,0.98) 52%, rgba(199,113,100,0.94))',
    accent: 'linear-gradient(90deg, rgba(241,186,91,1), rgba(205,108,89,1), rgba(126,70,91,1))',
    textColor: '#2c211d',
    mutedTextColor: 'rgba(44,33,29,0.60)',
    fontStyle: 'playful',
    backgrounds: [
      {
        id: 'festival-vibrant-01',
        imagePath: `${invitationImageBasePath}/festival-vibrant-01.png`,
        alt: 'Colourful festival celebration in an open plaza',
      },
      {
        id: 'festival-vibrant-02',
        imagePath: `${invitationImageBasePath}/festival-vibrant-02.png`,
        alt: 'Vibrant artisan festival street',
      },
    ],
  },
  {
    id: 'FESTIVAL_TRADITIONAL',
    eventType: 'Festival',
    name: 'Traditional Glow',
    description:
      'A traditional festival design combining heritage architecture, ceremonial detail and atmospheric evening light.',
    previewLabel: 'Warm & ceremonial',
    background:
      'linear-gradient(145deg, rgba(255,246,228,1), rgba(238,191,122,0.98) 52%, rgba(160,78,70,0.94))',
    accent: 'linear-gradient(90deg, rgba(239,190,99,1), rgba(178,102,64,1), rgba(104,48,45,1))',
    textColor: '#311e18',
    mutedTextColor: 'rgba(49,30,24,0.60)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'festival-traditional-01',
        imagePath: `${invitationImageBasePath}/festival-traditional-01.png`,
        alt: 'Traditional floating-lantern festival beside a lake',
      },
      {
        id: 'festival-traditional-02',
        imagePath: `${invitationImageBasePath}/festival-traditional-02.png`,
        alt: 'Traditional heritage festival courtyard',
      },
    ],
  },
  {
    id: 'FESTIVAL_MODERN',
    eventType: 'Festival',
    name: 'Modern Festival',
    description:
      'A forward-looking festival design featuring contemporary architecture, sculptural installations and expressive light.',
    previewLabel: 'Modern & energetic',
    background:
      'linear-gradient(145deg, rgba(250,245,247,1), rgba(229,205,221,0.98) 52%, rgba(163,112,147,0.94))',
    accent: 'linear-gradient(90deg, rgba(221,153,179,1), rgba(163,98,142,1), rgba(91,54,89,1))',
    textColor: '#2b2028',
    mutedTextColor: 'rgba(43,32,40,0.60)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'festival-modern-01',
        imagePath: `${invitationImageBasePath}/festival-modern-01.png`,
        alt: 'Contemporary festival light pavilion',
      },
      {
        id: 'festival-modern-02',
        imagePath: `${invitationImageBasePath}/festival-modern-02.png`,
        alt: 'Modern sculptural festival installation',
      },
    ],
  },

  {
    id: 'ANNIVERSARY_CLASSIC',
    eventType: 'Anniversary',
    name: 'Classic Keepsake',
    description:
      'A mature anniversary design inspired by enduring memories, countryside beauty and timeless companionship.',
    previewLabel: 'Timeless & sentimental',
    background:
      'linear-gradient(145deg, rgba(255,250,248,1), rgba(244,229,228,0.98) 55%, rgba(192,146,153,0.94))',
    accent: 'linear-gradient(90deg, rgba(221,185,186,1), rgba(159,84,98,1), rgba(92,43,55,1))',
    textColor: '#2e2023',
    mutedTextColor: 'rgba(46,32,35,0.60)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'anniversary-classic-01',
        imagePath: `${invitationImageBasePath}/anniversary-classic-01.png`,
        alt: 'European vineyard anniversary estate',
      },
      {
        id: 'anniversary-classic-02',
        imagePath: `${invitationImageBasePath}/anniversary-classic-02.png`,
        alt: 'Intimate anniversary wine-cellar lounge',
      },
    ],
  },
  {
    id: 'ANNIVERSARY_GOLDEN',
    eventType: 'Anniversary',
    name: 'Lakeside Serenity',
    description:
      'A serene anniversary design combining red-and-white styling with reflective water and cool evening light.',
    previewLabel: 'Serene & reflective',
    background:
      'linear-gradient(145deg, rgba(247,250,255,1), rgba(224,232,244,0.98) 55%, rgba(161,175,205,0.94))',
    accent: 'linear-gradient(90deg, rgba(228,226,235,1), rgba(164,76,96,1), rgba(84,47,65,1))',
    textColor: '#202839',
    mutedTextColor: 'rgba(32,40,57,0.60)',
    fontStyle: 'editorial',
    backgrounds: [
      {
        id: 'anniversary-golden-01',
        imagePath: `${invitationImageBasePath}/anniversary-golden-01.png`,
        alt: 'Red-and-white anniversary dinner beside a lake',
      },
      {
        id: 'anniversary-golden-02',
        imagePath: `${invitationImageBasePath}/anniversary-golden-02.png`,
        alt: 'Glass anniversary pavilion floating above water',
      },
    ],
  },
  {
    id: 'ANNIVERSARY_ROMANTIC',
    eventType: 'Anniversary',
    name: 'Enduring Romance',
    description:
      'An emotional anniversary design with dramatic red florals, white architecture and silver moonlight.',
    previewLabel: 'Romantic & cinematic',
    background:
      'linear-gradient(145deg, rgba(39,37,55,1), rgba(62,55,82,0.98) 55%, rgba(105,55,76,0.94))',
    accent: 'linear-gradient(90deg, rgba(221,225,238,1), rgba(160,61,82,1), rgba(83,29,48,1))',
    textColor: '#fff9fb',
    mutedTextColor: 'rgba(255,249,251,0.68)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'anniversary-romantic-01',
        imagePath: `${invitationImageBasePath}/anniversary-romantic-01.png`,
        alt: 'Moonlit anniversary terrace above the sea',
      },
      {
        id: 'anniversary-romantic-02',
        imagePath: `${invitationImageBasePath}/anniversary-romantic-02.png`,
        alt: 'Moonlit anniversary garden conservatory',
      },
    ],
  },

  {
    id: 'RECEPTION_ELEGANT',
    eventType: 'Reception',
    name: 'Elegant Reception',
    description:
      'An airy reception design with graceful floral styling, contemporary spaces and pearl-and-sage character.',
    previewLabel: 'Elegant & polished',
    background:
      'linear-gradient(145deg, rgba(255,253,249,1), rgba(246,238,236,0.98) 55%, rgba(214,194,197,0.94))',
    accent: 'linear-gradient(90deg, rgba(224,202,205,1), rgba(178,145,151,1), rgba(103,72,79,1))',
    textColor: '#2a2225',
    mutedTextColor: 'rgba(42,34,37,0.60)',
    fontStyle: 'editorial',
    backgrounds: [
      {
        id: 'reception-elegant-01',
        imagePath: `${invitationImageBasePath}/reception-elegant-01.png`,
        alt: 'Elegant modern floral reception hall',
      },
      {
        id: 'reception-elegant-02',
        imagePath: `${invitationImageBasePath}/reception-elegant-02.png`,
        alt: 'Refined reception welcome gallery',
      },
    ],
  },
  {
    id: 'RECEPTION_CRYSTAL',
    eventType: 'Reception',
    name: 'Crystal Evening',
    description:
      'A cool-toned reception design built around crystal reflections, sky-blue light and silver details.',
    previewLabel: 'Luminous & refined',
    background:
      'linear-gradient(145deg, rgba(250,253,255,1), rgba(227,235,244,0.98) 55%, rgba(181,198,216,0.94))',
    accent: 'linear-gradient(90deg, rgba(206,220,235,1), rgba(142,169,195,1), rgba(71,99,127,1))',
    textColor: '#20272e',
    mutedTextColor: 'rgba(32,39,46,0.60)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'reception-crystal-01',
        imagePath: `${invitationImageBasePath}/reception-crystal-01.png`,
        alt: 'Sky-blue crystal reception ballroom',
      },
      {
        id: 'reception-crystal-02',
        imagePath: `${invitationImageBasePath}/reception-crystal-02.png`,
        alt: 'Crystal waterfront reception pavilion',
      },
    ],
  },
  {
    id: 'RECEPTION_GRAND',
    eventType: 'Reception',
    name: 'Grand Reception',
    description:
      'A dramatic reception design defined by monumental scale, palace architecture and sweeping entrances.',
    previewLabel: 'Formal & grand',
    background:
      'linear-gradient(145deg, rgba(35,35,46,1), rgba(50,54,73,0.98) 55%, rgba(100,59,72,0.94))',
    accent: 'linear-gradient(90deg, rgba(222,226,237,1), rgba(139,60,78,1), rgba(69,72,99,1))',
    textColor: '#fffafc',
    mutedTextColor: 'rgba(255,250,252,0.68)',
    fontStyle: 'classic',
    backgrounds: [
      {
        id: 'reception-grand-01',
        imagePath: `${invitationImageBasePath}/reception-grand-01.png`,
        alt: 'Monumental palace reception atrium',
      },
      {
        id: 'reception-grand-02',
        imagePath: `${invitationImageBasePath}/reception-grand-02.png`,
        alt: 'Grand reception arrival at a palace entrance',
      },
    ],
  },

  {
    id: 'PRODUCT_LAUNCH_TECH',
    eventType: 'Product Launch',
    name: 'Vision',
    description:
      'A visionary product-launch design featuring futuristic keynote architecture and an immersive experience gallery.',
    previewLabel: 'Futuristic & bold',
    background:
      'linear-gradient(145deg, rgba(20,24,32,1), rgba(30,43,61,0.98) 55%, rgba(45,72,94,0.94))',
    accent: 'linear-gradient(90deg, rgba(86,213,255,1), rgba(105,145,255,1), rgba(164,104,255,1))',
    textColor: '#f7fbff',
    mutedTextColor: 'rgba(247,251,255,0.68)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'product-vision-01',
        imagePath: `${invitationImageBasePath}/product-vision-01.png`,
        alt: 'Futuristic product-launch keynote auditorium',
      },
      {
        id: 'product-vision-02',
        imagePath: `${invitationImageBasePath}/product-vision-02.png`,
        alt: 'Bright futuristic product experience gallery',
      },
    ],
  },
  {
    id: 'PRODUCT_LAUNCH_MINIMAL',
    eventType: 'Product Launch',
    name: 'Innovation',
    description:
      'An innovation-focused launch design combining immersive technology exhibitions with advanced robotics research.',
    previewLabel: 'Innovative & precise',
    background:
      'linear-gradient(145deg, rgba(247,251,255,1), rgba(224,237,247,0.98) 55%, rgba(166,199,222,0.94))',
    accent: 'linear-gradient(90deg, rgba(202,232,246,1), rgba(83,165,211,1), rgba(42,93,139,1))',
    textColor: '#172733',
    mutedTextColor: 'rgba(23,39,51,0.60)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'product-innovation-01',
        imagePath: `${invitationImageBasePath}/product-innovation-01.png`,
        alt: 'Immersive technology innovation pavilion',
      },
      {
        id: 'product-innovation-02',
        imagePath: `${invitationImageBasePath}/product-innovation-02.png`,
        alt: 'Advanced artificial-intelligence robotics laboratory',
      },
    ],
  },
  {
    id: 'PRODUCT_LAUNCH_PREMIUM',
    eventType: 'Product Launch',
    name: 'Prestige Reveal',
    description:
      'A premium product-launch design capturing anticipation, theatrical unveiling and a futuristic reveal.',
    previewLabel: 'Premium & dramatic',
    background:
      'linear-gradient(145deg, rgba(18,24,33,1), rgba(28,45,65,0.98) 55%, rgba(66,92,117,0.94))',
    accent: 'linear-gradient(90deg, rgba(226,241,249,1), rgba(111,181,222,1), rgba(68,91,118,1))',
    textColor: '#f7fbff',
    mutedTextColor: 'rgba(247,251,255,0.68)',
    fontStyle: 'modern',
    backgrounds: [
      {
        id: 'product-prestige-01',
        imagePath: `${invitationImageBasePath}/product-prestige-01.png`,
        alt: 'Prestige product launch with a covered concept vehicle',
      },
      {
        id: 'product-prestige-02',
        imagePath: `${invitationImageBasePath}/product-prestige-02.png`,
        alt: 'Light-blue product-launch stage with a revealed concept vehicle',
      },
    ],
  },
];

const invitationTemplateMap = new Map<EventInvitationTemplate, InvitationTemplateDefinition>(
  invitationTemplates.map((template) => [template.id, template]),
);

export const invitationTemplatesByEventType = eventTypeOptions.reduce(
  (templatesByType, eventType) => {
    templatesByType[eventType] = invitationTemplates.filter(
      (template) => template.eventType === eventType,
    );

    return templatesByType;
  },
  {} as Record<EventTypeOption, readonly InvitationTemplateDefinition[]>,
);

export const getInvitationTemplatesForEventType = (
  eventType: EventTypeOption | string,
): readonly InvitationTemplateDefinition[] => {
  const normalizedEventType = eventType
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const matchedEventType = eventTypeOptions.find(
    (option) => option.toLowerCase() === normalizedEventType,
  );

  return matchedEventType
    ? invitationTemplatesByEventType[matchedEventType]
    : [];
};

export const getInvitationTemplate = (templateId: EventInvitationTemplate | null | undefined) => {
  if (!templateId) {
    return undefined;
  }

  return invitationTemplateMap.get(templateId);
};

export const getDefaultInvitationTemplate = (eventType: EventTypeOption) => {
  const templates = getInvitationTemplatesForEventType(eventType);

  if (!templates?.length) {
    console.error(
      '[Invitation Templates] No templates registered for event type:',
      eventType,
    );

    return undefined;
  }

  return templates[0];
};

export const resolveInvitationTemplate = ({
  eventType,
  invitationTemplate,
}: {
  eventType: EventTypeOption;
  invitationTemplate?: EventInvitationTemplate | null;
}) => getInvitationTemplate(invitationTemplate) ?? getDefaultInvitationTemplate(eventType);

export const getInvitationTemplatePrimaryBackground = (
  templateId: EventInvitationTemplate | null | undefined,
) => getInvitationTemplate(templateId)?.backgrounds[0];

export const getInvitationTemplateSecondaryBackground = (
  templateId: EventInvitationTemplate | null | undefined,
) => getInvitationTemplate(templateId)?.backgrounds[1];
