import { eventTypeOptions, type EventInvitationTemplate, type EventTypeOption } from './event.api';

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
  fontStyle: 'editorial' | 'classic' | 'modern' | 'playful';
};

export const invitationTemplates: InvitationTemplateDefinition[] = [
  {
    id: 'BIRTHDAY_CONFETTI',
    eventType: 'Birthday',
    name: 'Confetti Celebration',
    description: 'Playful ribbons, confetti details and cheerful colour.',
    previewLabel: 'Joyful & bright',
    background:
      'linear-gradient(145deg, rgba(255,252,247,1), rgba(249,231,242,0.98) 52%, rgba(219,190,220,0.94))',
    accent: 'linear-gradient(90deg, rgba(183,167,200,1), rgba(218,169,196,1), rgba(124,74,90,1))',
    textColor: '#211d20',
    mutedTextColor: 'rgba(33,29,32,0.62)',
    fontStyle: 'playful',
  },
  {
    id: 'BIRTHDAY_ELEGANT',
    eventType: 'Birthday',
    name: 'Elegant Pastels',
    description: 'Soft stationery, refined spacing and muted pastel tones.',
    previewLabel: 'Soft & refined',
    background:
      'linear-gradient(145deg, rgba(255,253,249,1), rgba(246,239,245,0.98) 54%, rgba(220,207,226,0.92))',
    accent: 'linear-gradient(90deg, rgba(210,190,217,1), rgba(187,164,199,1), rgba(93,58,85,1))',
    textColor: '#241e23',
    mutedTextColor: 'rgba(36,30,35,0.60)',
    fontStyle: 'editorial',
  },
  {
    id: 'BIRTHDAY_NEON',
    eventType: 'Birthday',
    name: 'Midnight Neon',
    description: 'A bold evening design with glowing accents and modern energy.',
    previewLabel: 'Bold & electric',
    background:
      'linear-gradient(145deg, rgba(38,29,43,1), rgba(62,34,72,0.98) 52%, rgba(115,49,93,0.94))',
    accent: 'linear-gradient(90deg, rgba(239,141,201,1), rgba(186,115,255,1), rgba(109,215,255,1))',
    textColor: '#fff8ff',
    mutedTextColor: 'rgba(255,248,255,0.68)',
    fontStyle: 'modern',
  },

  {
    id: 'WEDDING_IVORY',
    eventType: 'Wedding',
    name: 'Ivory Bloom',
    description: 'Ivory stationery with soft floral detailing and graceful spacing.',
    previewLabel: 'Romantic & timeless',
    background:
      'linear-gradient(145deg, rgba(255,253,249,1), rgba(250,243,240,0.98) 55%, rgba(230,214,211,0.94))',
    accent: 'linear-gradient(90deg, rgba(224,199,203,1), rgba(190,153,167,1), rgba(122,78,93,1))',
    textColor: '#271f23',
    mutedTextColor: 'rgba(39,31,35,0.60)',
    fontStyle: 'classic',
  },
  {
    id: 'WEDDING_BOTANICAL',
    eventType: 'Wedding',
    name: 'Botanical Garden',
    description: 'Pressed greenery, soft petals and natural editorial styling.',
    previewLabel: 'Organic & romantic',
    background:
      'linear-gradient(145deg, rgba(254,253,247,1), rgba(238,242,229,0.98) 55%, rgba(205,216,191,0.94))',
    accent: 'linear-gradient(90deg, rgba(190,205,168,1), rgba(142,165,123,1), rgba(84,106,72,1))',
    textColor: '#20271d',
    mutedTextColor: 'rgba(32,39,29,0.60)',
    fontStyle: 'editorial',
  },
  {
    id: 'WEDDING_GOLD',
    eventType: 'Wedding',
    name: 'Timeless Gold',
    description: 'Warm champagne tones with polished gold and classic details.',
    previewLabel: 'Grand & elegant',
    background:
      'linear-gradient(145deg, rgba(255,252,244,1), rgba(248,239,217,0.98) 55%, rgba(221,196,143,0.94))',
    accent: 'linear-gradient(90deg, rgba(235,211,158,1), rgba(190,151,80,1), rgba(116,86,40,1))',
    textColor: '#2d2619',
    mutedTextColor: 'rgba(45,38,25,0.60)',
    fontStyle: 'classic',
  },

  {
    id: 'BABY_SHOWER_TEDDY',
    eventType: 'Baby Shower',
    name: 'Teddy Dreams',
    description: 'Warm storybook styling with soft neutral nursery details.',
    previewLabel: 'Warm & gentle',
    background:
      'linear-gradient(145deg, rgba(255,253,247,1), rgba(246,238,222,0.98) 55%, rgba(220,199,170,0.94))',
    accent: 'linear-gradient(90deg, rgba(228,209,177,1), rgba(191,160,121,1), rgba(121,92,61,1))',
    textColor: '#2d261f',
    mutedTextColor: 'rgba(45,38,31,0.60)',
    fontStyle: 'playful',
  },
  {
    id: 'BABY_SHOWER_CLOUDS',
    eventType: 'Baby Shower',
    name: 'Little Clouds',
    description: 'Dreamy clouds, moonlight and soft powder-blue tones.',
    previewLabel: 'Dreamy & soft',
    background:
      'linear-gradient(145deg, rgba(252,254,255,1), rgba(231,240,247,0.98) 55%, rgba(195,214,229,0.94))',
    accent: 'linear-gradient(90deg, rgba(204,221,235,1), rgba(151,185,211,1), rgba(79,117,148,1))',
    textColor: '#202830',
    mutedTextColor: 'rgba(32,40,48,0.60)',
    fontStyle: 'editorial',
  },
  {
    id: 'BABY_SHOWER_STORYBOOK',
    eventType: 'Baby Shower',
    name: 'Storybook',
    description: 'Whimsical paper textures with warm stars and illustrated charm.',
    previewLabel: 'Whimsical & sweet',
    background:
      'linear-gradient(145deg, rgba(255,252,244,1), rgba(250,241,221,0.98) 55%, rgba(226,205,164,0.94))',
    accent: 'linear-gradient(90deg, rgba(238,216,170,1), rgba(202,171,112,1), rgba(132,98,52,1))',
    textColor: '#302719',
    mutedTextColor: 'rgba(48,39,25,0.60)',
    fontStyle: 'playful',
  },

  {
    id: 'GRADUATION_CLASSIC',
    eventType: 'Graduation',
    name: 'Classic Scholar',
    description: 'Traditional academic styling with parchment and gold details.',
    previewLabel: 'Proud & timeless',
    background:
      'linear-gradient(145deg, rgba(255,253,246,1), rgba(246,240,220,0.98) 55%, rgba(213,201,158,0.94))',
    accent: 'linear-gradient(90deg, rgba(224,207,159,1), rgba(178,151,84,1), rgba(105,83,38,1))',
    textColor: '#2c281c',
    mutedTextColor: 'rgba(44,40,28,0.60)',
    fontStyle: 'classic',
  },
  {
    id: 'GRADUATION_MODERN',
    eventType: 'Graduation',
    name: 'Modern Graduate',
    description: 'Clean geometry, sharp typography and a confident modern finish.',
    previewLabel: 'Clean & confident',
    background:
      'linear-gradient(145deg, rgba(247,249,251,1), rgba(225,230,238,0.98) 55%, rgba(184,194,211,0.94))',
    accent: 'linear-gradient(90deg, rgba(171,185,207,1), rgba(108,128,158,1), rgba(52,68,92,1))',
    textColor: '#1d232d',
    mutedTextColor: 'rgba(29,35,45,0.60)',
    fontStyle: 'modern',
  },
  {
    id: 'GRADUATION_GALA',
    eventType: 'Graduation',
    name: 'Graduation Gala',
    description: 'A celebratory evening design with elegant contrast and metallic glow.',
    previewLabel: 'Formal & celebratory',
    background:
      'linear-gradient(145deg, rgba(37,34,38,1), rgba(59,47,57,0.98) 55%, rgba(110,84,72,0.94))',
    accent: 'linear-gradient(90deg, rgba(230,206,150,1), rgba(190,151,80,1), rgba(247,226,174,1))',
    textColor: '#fffaf2',
    mutedTextColor: 'rgba(255,250,242,0.68)',
    fontStyle: 'classic',
  },

  {
    id: 'CORPORATE_MINIMAL',
    eventType: 'Corporate',
    name: 'Minimal Brief',
    description: 'A clean professional invitation with restrained structure.',
    previewLabel: 'Clear & professional',
    background:
      'linear-gradient(145deg, rgba(250,250,249,1), rgba(235,235,232,0.98) 55%, rgba(206,205,199,0.94))',
    accent: 'linear-gradient(90deg, rgba(192,191,185,1), rgba(132,131,125,1), rgba(65,64,61,1))',
    textColor: '#222220',
    mutedTextColor: 'rgba(34,34,32,0.60)',
    fontStyle: 'modern',
  },
  {
    id: 'CORPORATE_PREMIUM',
    eventType: 'Corporate',
    name: 'Premium Forum',
    description: 'Refined bronze tones with polished executive presentation.',
    previewLabel: 'Premium & polished',
    background:
      'linear-gradient(145deg, rgba(255,252,247,1), rgba(242,232,223,0.98) 55%, rgba(201,179,160,0.94))',
    accent: 'linear-gradient(90deg, rgba(203,180,160,1), rgba(153,119,96,1), rgba(83,61,50,1))',
    textColor: '#2b231f',
    mutedTextColor: 'rgba(43,35,31,0.60)',
    fontStyle: 'editorial',
  },
  {
    id: 'CORPORATE_EXECUTIVE',
    eventType: 'Corporate',
    name: 'Executive Edition',
    description: 'Dark executive styling with structured lines and high contrast.',
    previewLabel: 'Bold & executive',
    background:
      'linear-gradient(145deg, rgba(31,32,35,1), rgba(47,49,55,0.98) 55%, rgba(74,79,88,0.94))',
    accent: 'linear-gradient(90deg, rgba(188,165,148,1), rgba(143,118,100,1), rgba(225,207,192,1))',
    textColor: '#ffffff',
    mutedTextColor: 'rgba(255,255,255,0.66)',
    fontStyle: 'modern',
  },

  {
    id: 'PARTY_RETRO',
    eventType: 'Party',
    name: 'Retro Pop',
    description: 'Vintage-inspired colour, playful shapes and lively energy.',
    previewLabel: 'Playful & nostalgic',
    background:
      'linear-gradient(145deg, rgba(255,247,236,1), rgba(245,205,180,0.98) 52%, rgba(204,121,121,0.94))',
    accent: 'linear-gradient(90deg, rgba(238,166,119,1), rgba(204,103,121,1), rgba(117,67,91,1))',
    textColor: '#2b2023',
    mutedTextColor: 'rgba(43,32,35,0.60)',
    fontStyle: 'playful',
  },
  {
    id: 'PARTY_NEON',
    eventType: 'Party',
    name: 'Neon Night',
    description: 'Dark nightlife styling with vivid glowing colour.',
    previewLabel: 'Electric & bold',
    background:
      'linear-gradient(145deg, rgba(27,23,35,1), rgba(52,28,68,0.98) 52%, rgba(99,37,88,0.94))',
    accent: 'linear-gradient(90deg, rgba(255,102,196,1), rgba(152,94,255,1), rgba(76,217,255,1))',
    textColor: '#fff8ff',
    mutedTextColor: 'rgba(255,248,255,0.68)',
    fontStyle: 'modern',
  },
  {
    id: 'PARTY_LUXE',
    eventType: 'Party',
    name: 'Evening Luxe',
    description: 'A glamorous evening invitation with rich metallic warmth.',
    previewLabel: 'Glamorous & warm',
    background:
      'linear-gradient(145deg, rgba(42,31,36,1), rgba(86,50,63,0.98) 52%, rgba(148,87,83,0.94))',
    accent: 'linear-gradient(90deg, rgba(233,188,145,1), rgba(199,134,105,1), rgba(247,218,181,1))',
    textColor: '#fff9f3',
    mutedTextColor: 'rgba(255,249,243,0.68)',
    fontStyle: 'editorial',
  },

  {
    id: 'ENGAGEMENT_ROMANCE',
    eventType: 'Engagement',
    name: 'Quiet Romance',
    description: 'Soft champagne layers with delicate romantic detailing.',
    previewLabel: 'Romantic & soft',
    background:
      'linear-gradient(145deg, rgba(255,252,248,1), rgba(250,240,231,0.98) 55%, rgba(229,201,181,0.94))',
    accent: 'linear-gradient(90deg, rgba(235,211,176,1), rgba(201,164,112,1), rgba(134,96,56,1))',
    textColor: '#2c241d',
    mutedTextColor: 'rgba(44,36,29,0.60)',
    fontStyle: 'classic',
  },
  {
    id: 'ENGAGEMENT_GARDEN',
    eventType: 'Engagement',
    name: 'Garden Promise',
    description: 'Fresh greenery, soft florals and natural romantic charm.',
    previewLabel: 'Fresh & romantic',
    background:
      'linear-gradient(145deg, rgba(253,254,248,1), rgba(237,243,226,0.98) 55%, rgba(204,220,188,0.94))',
    accent: 'linear-gradient(90deg, rgba(193,211,173,1), rgba(137,167,116,1), rgba(75,105,65,1))',
    textColor: '#20281c',
    mutedTextColor: 'rgba(32,40,28,0.60)',
    fontStyle: 'editorial',
  },
  {
    id: 'ENGAGEMENT_ROSE_GOLD',
    eventType: 'Engagement',
    name: 'Rose Gold',
    description: 'Warm blush tones with polished rose-gold accents.',
    previewLabel: 'Modern & romantic',
    background:
      'linear-gradient(145deg, rgba(255,250,248,1), rgba(247,226,225,0.98) 55%, rgba(213,171,172,0.94))',
    accent: 'linear-gradient(90deg, rgba(232,191,187,1), rgba(190,130,134,1), rgba(119,72,82,1))',
    textColor: '#2c2024',
    mutedTextColor: 'rgba(44,32,36,0.60)',
    fontStyle: 'modern',
  },

  {
    id: 'FESTIVAL_VIBRANT',
    eventType: 'Festival',
    name: 'Vibrant Celebration',
    description: 'Bright festive colour with energetic decorative details.',
    previewLabel: 'Colourful & lively',
    background:
      'linear-gradient(145deg, rgba(255,248,235,1), rgba(245,207,159,0.98) 52%, rgba(199,113,100,0.94))',
    accent: 'linear-gradient(90deg, rgba(241,186,91,1), rgba(205,108,89,1), rgba(126,70,91,1))',
    textColor: '#2c211d',
    mutedTextColor: 'rgba(44,33,29,0.60)',
    fontStyle: 'playful',
  },
  {
    id: 'FESTIVAL_TRADITIONAL',
    eventType: 'Festival',
    name: 'Traditional Glow',
    description: 'Rich ceremonial tones with warm gold and heritage-inspired details.',
    previewLabel: 'Warm & ceremonial',
    background:
      'linear-gradient(145deg, rgba(255,246,228,1), rgba(238,191,122,0.98) 52%, rgba(160,78,70,0.94))',
    accent: 'linear-gradient(90deg, rgba(239,190,99,1), rgba(178,102,64,1), rgba(104,48,45,1))',
    textColor: '#311e18',
    mutedTextColor: 'rgba(49,30,24,0.60)',
    fontStyle: 'classic',
  },
  {
    id: 'FESTIVAL_MODERN',
    eventType: 'Festival',
    name: 'Modern Festival',
    description: 'Contemporary structure with glowing colour and clean typography.',
    previewLabel: 'Modern & energetic',
    background:
      'linear-gradient(145deg, rgba(250,245,247,1), rgba(229,205,221,0.98) 52%, rgba(163,112,147,0.94))',
    accent: 'linear-gradient(90deg, rgba(221,153,179,1), rgba(163,98,142,1), rgba(91,54,89,1))',
    textColor: '#2b2028',
    mutedTextColor: 'rgba(43,32,40,0.60)',
    fontStyle: 'modern',
  },

  {
    id: 'ANNIVERSARY_CLASSIC',
    eventType: 'Anniversary',
    name: 'Classic Keepsake',
    description: 'A timeless invitation inspired by treasured memories.',
    previewLabel: 'Timeless & sentimental',
    background:
      'linear-gradient(145deg, rgba(255,253,248,1), rgba(246,237,225,0.98) 55%, rgba(217,196,173,0.94))',
    accent: 'linear-gradient(90deg, rgba(224,204,176,1), rgba(181,147,104,1), rgba(111,80,48,1))',
    textColor: '#2c251d',
    mutedTextColor: 'rgba(44,37,29,0.60)',
    fontStyle: 'classic',
  },
  {
    id: 'ANNIVERSARY_GOLDEN',
    eventType: 'Anniversary',
    name: 'Golden Years',
    description: 'Warm gold tones created for meaningful milestone celebrations.',
    previewLabel: 'Golden & grand',
    background:
      'linear-gradient(145deg, rgba(255,252,239,1), rgba(245,229,185,0.98) 55%, rgba(205,171,94,0.94))',
    accent: 'linear-gradient(90deg, rgba(236,211,143,1), rgba(188,145,61,1), rgba(112,79,30,1))',
    textColor: '#312815',
    mutedTextColor: 'rgba(49,40,21,0.60)',
    fontStyle: 'editorial',
  },
  {
    id: 'ANNIVERSARY_ROMANTIC',
    eventType: 'Anniversary',
    name: 'Enduring Romance',
    description: 'Soft rose tones and graceful styling for a lasting love story.',
    previewLabel: 'Romantic & graceful',
    background:
      'linear-gradient(145deg, rgba(255,250,249,1), rgba(247,229,231,0.98) 55%, rgba(218,183,189,0.94))',
    accent: 'linear-gradient(90deg, rgba(232,199,204,1), rgba(189,142,153,1), rgba(115,75,88,1))',
    textColor: '#2c2125',
    mutedTextColor: 'rgba(44,33,37,0.60)',
    fontStyle: 'classic',
  },

  {
    id: 'RECEPTION_ELEGANT',
    eventType: 'Reception',
    name: 'Elegant Reception',
    description: 'Refined ivory styling with graceful evening details.',
    previewLabel: 'Elegant & polished',
    background:
      'linear-gradient(145deg, rgba(255,253,249,1), rgba(246,238,236,0.98) 55%, rgba(214,194,197,0.94))',
    accent: 'linear-gradient(90deg, rgba(224,202,205,1), rgba(178,145,151,1), rgba(103,72,79,1))',
    textColor: '#2a2225',
    mutedTextColor: 'rgba(42,34,37,0.60)',
    fontStyle: 'editorial',
  },
  {
    id: 'RECEPTION_CRYSTAL',
    eventType: 'Reception',
    name: 'Crystal Evening',
    description: 'Cool luminous tones with crystal-inspired sparkle.',
    previewLabel: 'Luminous & refined',
    background:
      'linear-gradient(145deg, rgba(250,253,255,1), rgba(227,235,244,0.98) 55%, rgba(181,198,216,0.94))',
    accent: 'linear-gradient(90deg, rgba(206,220,235,1), rgba(142,169,195,1), rgba(71,99,127,1))',
    textColor: '#20272e',
    mutedTextColor: 'rgba(32,39,46,0.60)',
    fontStyle: 'modern',
  },
  {
    id: 'RECEPTION_GRAND',
    eventType: 'Reception',
    name: 'Grand Ballroom',
    description: 'Dark formal styling with rich gold and dramatic presence.',
    previewLabel: 'Formal & grand',
    background:
      'linear-gradient(145deg, rgba(35,31,34,1), rgba(62,48,54,0.98) 55%, rgba(105,75,61,0.94))',
    accent: 'linear-gradient(90deg, rgba(230,203,145,1), rgba(185,143,69,1), rgba(248,224,174,1))',
    textColor: '#fffaf2',
    mutedTextColor: 'rgba(255,250,242,0.68)',
    fontStyle: 'classic',
  },

  {
    id: 'PRODUCT_LAUNCH_TECH',
    eventType: 'Product Launch',
    name: 'Future Tech',
    description: 'Dark digital styling with electric accents and sharp structure.',
    previewLabel: 'Futuristic & bold',
    background:
      'linear-gradient(145deg, rgba(20,24,32,1), rgba(30,43,61,0.98) 55%, rgba(45,72,94,0.94))',
    accent: 'linear-gradient(90deg, rgba(86,213,255,1), rgba(105,145,255,1), rgba(164,104,255,1))',
    textColor: '#f7fbff',
    mutedTextColor: 'rgba(247,251,255,0.68)',
    fontStyle: 'modern',
  },
  {
    id: 'PRODUCT_LAUNCH_MINIMAL',
    eventType: 'Product Launch',
    name: 'Minimal Reveal',
    description: 'A clean launch invitation built around clarity and product focus.',
    previewLabel: 'Minimal & precise',
    background:
      'linear-gradient(145deg, rgba(252,252,252,1), rgba(237,239,242,0.98) 55%, rgba(207,211,218,0.94))',
    accent: 'linear-gradient(90deg, rgba(190,195,204,1), rgba(119,128,143,1), rgba(51,59,72,1))',
    textColor: '#20242b',
    mutedTextColor: 'rgba(32,36,43,0.60)',
    fontStyle: 'modern',
  },
  {
    id: 'PRODUCT_LAUNCH_PREMIUM',
    eventType: 'Product Launch',
    name: 'Premium Launch',
    description: 'Polished dark styling with warm metallic presentation.',
    previewLabel: 'Premium & dramatic',
    background:
      'linear-gradient(145deg, rgba(29,29,31,1), rgba(49,45,45,0.98) 55%, rgba(88,70,59,0.94))',
    accent: 'linear-gradient(90deg, rgba(205,178,145,1), rgba(156,119,85,1), rgba(236,214,190,1))',
    textColor: '#fffaf6',
    mutedTextColor: 'rgba(255,250,246,0.68)',
    fontStyle: 'editorial',
  },
];

export const invitationTemplatesByEventType = eventTypeOptions.reduce(
  (templatesByType, eventType) => {
    templatesByType[eventType] = invitationTemplates.filter(
      (template) => template.eventType === eventType,
    );

    return templatesByType;
  },
  {} as Record<EventTypeOption, InvitationTemplateDefinition[]>,
);

export const getInvitationTemplatesForEventType = (eventType: EventTypeOption) =>
  invitationTemplatesByEventType[eventType];

export const getInvitationTemplate = (templateId: EventInvitationTemplate) =>
  invitationTemplates.find((template) => template.id === templateId);
