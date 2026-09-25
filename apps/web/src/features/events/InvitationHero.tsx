import type { CSSProperties } from 'react';
import { Clock3, Eye, Images, Sparkles } from 'lucide-react';
import type { EventInvitationTemplate, EventTypeOption } from './event.api';
import {
  resolveInvitationTemplate,
  type InvitationAccentColorOption,
  type InvitationArtworkPositionOption,
  type InvitationFontOption,
  type InvitationGradientOption,
  type InvitationTemplateDefinition,
} from './invitationTemplates';

type InvitationHeroProps = {
  eventName: string;
  eventType: EventTypeOption | string;
  invitationTemplate?: EventInvitationTemplate | null;
  invitationArtwork?: number | null;
  invitationFont?: string | null;
  invitationGradient?: string | null;
  invitationAccentColor?: string | null;
  invitationArtworkPosition?: string | null;
  guestFirstName?: string;
  expiresAt?: string;
  mode?: 'public' | 'preview';
};

const eventTypeAliases: Record<string, EventTypeOption> = {
  birthday: 'Birthday',
  wedding: 'Wedding',
  graduation: 'Graduation',
  corporate: 'Corporate',
  party: 'Party',
  'baby shower': 'Baby Shower',
  baby_shower: 'Baby Shower',
  engagement: 'Engagement',
  festival: 'Festival',
  anniversary: 'Anniversary',
  reception: 'Reception',
  'product launch': 'Product Launch',
  product_launch: 'Product Launch',
};

const normalizeEventType = (eventType: string): EventTypeOption => {
  const normalizedEventType = eventType.trim().toLowerCase();

  return eventTypeAliases[normalizedEventType] ?? 'Birthday';
};

const invitationFontValues: readonly InvitationFontOption[] = [
  'editorial',
  'classic',
  'modern',
  'playful',
];

const invitationGradientValues: readonly InvitationGradientOption[] = [
  'balanced',
  'soft',
  'dramatic',
];

const invitationArtworkPositionValues: readonly InvitationArtworkPositionOption[] = [
  'left',
  'center',
  'right',
];

const isInvitationFontOption = (value: string | null | undefined): value is InvitationFontOption =>
  Boolean(value && invitationFontValues.includes(value as InvitationFontOption));

const isInvitationGradientOption = (
  value: string | null | undefined,
): value is InvitationGradientOption =>
  Boolean(value && invitationGradientValues.includes(value as InvitationGradientOption));

const isInvitationArtworkPositionOption = (
  value: string | null | undefined,
): value is InvitationArtworkPositionOption =>
  Boolean(
    value && invitationArtworkPositionValues.includes(value as InvitationArtworkPositionOption),
  );

const getFontStyle = (
  fontStyle: InvitationTemplateDefinition['fontStyle'] | InvitationFontOption,
): CSSProperties => {
  switch (fontStyle) {
    case 'classic':
      return {
        fontFamily: '"Times New Roman", Times, serif',
        letterSpacing: '-0.035em',
      };

    case 'editorial':
      return {
        fontFamily: 'Georgia, "Times New Roman", serif',
        letterSpacing: '-0.04em',
      };

    case 'playful':
      return {
        fontFamily: '"Brush Script MT", "Segoe Script", "Apple Chancery", cursive',
        letterSpacing: '-0.02em',
      };

    case 'modern':
    default:
      return {
        fontFamily: 'Aptos, Calibri, "Helvetica Neue", Arial, sans-serif',
        letterSpacing: '-0.045em',
      };
  }
};

const getArtworkObjectPosition = (position: InvitationArtworkPositionOption) => {
  switch (position) {
    case 'left':
      return 'left center';

    case 'right':
      return 'right center';

    case 'center':
    default:
      return 'center center';
  }
};

const getReadabilityOverlay = (hasLightText: boolean, gradient: InvitationGradientOption) => {
  if (hasLightText) {
    switch (gradient) {
      case 'soft':
        return 'linear-gradient(90deg, rgba(16,18,24,0.90) 0%, rgba(16,18,24,0.78) 25%, rgba(16,18,24,0.52) 43%, rgba(16,18,24,0.22) 61%, rgba(16,18,24,0.04) 78%, transparent 92%)';

      case 'dramatic':
        return 'linear-gradient(90deg, rgba(16,18,24,0.99) 0%, rgba(16,18,24,0.97) 25%, rgba(16,18,24,0.84) 43%, rgba(16,18,24,0.52) 61%, rgba(16,18,24,0.16) 78%, transparent 92%)';

      case 'balanced':
      default:
        return 'linear-gradient(90deg, rgba(16,18,24,0.97) 0%, rgba(16,18,24,0.92) 25%, rgba(16,18,24,0.72) 43%, rgba(16,18,24,0.34) 61%, rgba(16,18,24,0.08) 78%, transparent 92%)';
    }
  }

  switch (gradient) {
    case 'soft':
      return 'linear-gradient(90deg, rgba(255,252,248,0.92) 0%, rgba(255,252,248,0.82) 25%, rgba(255,252,248,0.58) 43%, rgba(255,252,248,0.26) 61%, rgba(255,252,248,0.05) 78%, transparent 92%)';

    case 'dramatic':
      return 'linear-gradient(90deg, rgba(255,252,248,0.99) 0%, rgba(255,252,248,0.98) 25%, rgba(255,252,248,0.88) 43%, rgba(255,252,248,0.58) 61%, rgba(255,252,248,0.18) 78%, transparent 92%)';

    case 'balanced':
    default:
      return 'linear-gradient(90deg, rgba(255,252,248,0.98) 0%, rgba(255,252,248,0.94) 25%, rgba(255,252,248,0.78) 43%, rgba(255,252,248,0.42) 61%, rgba(255,252,248,0.10) 78%, transparent 92%)';
  }
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));

const usesLightText = (textColor: string) => {
  const normalizedColor = textColor.trim().toLowerCase();

  return (
    normalizedColor === '#fff' ||
    normalizedColor === '#ffffff' ||
    normalizedColor.startsWith('#fff') ||
    normalizedColor.startsWith('rgb(255') ||
    normalizedColor.startsWith('rgba(255')
  );
};

export function InvitationHero({
  eventName,
  eventType,
  invitationTemplate,
  invitationArtwork,
  invitationFont,
  invitationGradient,
  invitationAccentColor,
  invitationArtworkPosition,
  guestFirstName,
  expiresAt,
  mode = 'public',
}: InvitationHeroProps) {
  const normalizedEventType = normalizeEventType(eventType);

  const template = resolveInvitationTemplate({
    eventType: normalizedEventType,
    invitationTemplate,
  });

  if (!template) {
    throw new Error(`No invitation template is configured for ${normalizedEventType}.`);
  }

  const isPreview = mode === 'preview';
  const hasLightText = usesLightText(template.textColor);

  const selectedArtwork = invitationArtwork === 2 ? 2 : 1;

  const primaryBackground =
    selectedArtwork === 2 ? template.backgrounds[1] : template.backgrounds[0];

  const secondaryBackground =
    selectedArtwork === 2 ? template.backgrounds[0] : template.backgrounds[1];

  const selectedFont = isInvitationFontOption(invitationFont) ? invitationFont : template.fontStyle;

  const selectedGradient = isInvitationGradientOption(invitationGradient)
    ? invitationGradient
    : 'balanced';

  const selectedArtworkPosition = isInvitationArtworkPositionOption(invitationArtworkPosition)
    ? invitationArtworkPosition
    : 'center';

  const selectedAccent =
    invitationAccentColor?.trim() || (template.accent as InvitationAccentColorOption | string);

  const readabilityOverlay = getReadabilityOverlay(hasLightText, selectedGradient);

  const textSurfaceClassName = hasLightText
    ? 'border-white/18 bg-black/24'
    : 'border-white/56 bg-white/34';

  const secondarySurfaceClassName = hasLightText
    ? 'border-white/24 bg-black/34'
    : 'border-white/58 bg-white/44';

    return (
    <section
      className="relative isolate overflow-hidden rounded-[2.15rem] border border-white/45 shadow-[0_24px_75px_rgba(31,27,29,0.15)]"
      aria-label={isPreview ? `${eventName} invitation design preview` : `${eventName} invitation`}
      style={{
        background: template.background,
      }}
    >
      <img
        src={primaryBackground.imagePath}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 size-full object-cover"
        style={{
          objectPosition: getArtworkObjectPosition(selectedArtworkPosition),
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background: readabilityOverlay,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-20 h-[38%] bg-[linear-gradient(180deg,transparent,rgba(17,16,18,0.18))]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5"
        style={{
          background: selectedAccent,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 -z-10 size-[26rem] rounded-full bg-white/18 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-[18%] -z-10 size-[28rem] rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative grid min-h-[25rem] gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:gap-6 lg:p-6">
        <div
          className={`max-w-[46rem] rounded-[1.65rem] border p-5 shadow-[0_18px_55px_rgba(31,27,29,0.11)] backdrop-blur-[10px] sm:p-6 ${textSurfaceClassName}`}
        >
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/38 bg-white/16 px-3.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.2em] shadow-[0_8px_22px_rgba(31,27,29,0.08)] backdrop-blur-xl"
            style={{
              color: template.textColor,
            }}
          >
            {isPreview ? (
              <Eye aria-hidden="true" className="size-3.5" />
            ) : (
              <Sparkles aria-hidden="true" className="size-3.5" />
            )}

            {isPreview ? 'Invitation preview' : 'You’re invited'}
          </div>

          <p
            className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.2em]"
            style={{
              color: selectedAccent,
            }}
          >
            {normalizedEventType}
          </p>

          <h2
            className="mt-2.5 max-w-4xl text-balance text-[2.25rem] font-black leading-[0.98] sm:text-[2.7rem] lg:text-[3rem]"
            style={{
              color: template.textColor,
              ...getFontStyle(selectedFont),
            }}
          >
            {isPreview
              ? `You’re invited to ${eventName}.`
              : `Hello ${guestFirstName ?? 'Guest'}, let’s celebrate together.`}
          </h2>

          <p
            className="mt-4 max-w-2xl text-pretty text-sm font-semibold leading-6 sm:text-[0.95rem] sm:leading-6"
            style={{
              color: template.mutedTextColor,
            }}
          >
            {isPreview
              ? 'This is the design guests will see when they open their personal invitation link.'
              : `You’re invited to ${eventName}. Review the celebration details and let the host know whether you’ll be joining.`}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="rounded-full border border-white/36 bg-white/16 px-3.5 py-1.5 text-[0.68rem] font-black shadow-[0_7px_18px_rgba(31,27,29,0.07)] backdrop-blur-xl"
              style={{
                color: template.textColor,
              }}
            >
              {template.name}
            </span>

            <span
              className="rounded-full border border-white/36 bg-white/16 px-3.5 py-1.5 text-[0.68rem] font-black shadow-[0_7px_18px_rgba(31,27,29,0.07)] backdrop-blur-xl"
              style={{
                color: template.textColor,
              }}
            >
              {template.previewLabel}
            </span>
          </div>
        </div>

        <aside
          className={`relative overflow-hidden rounded-[1.65rem] border p-2.5 shadow-[0_20px_58px_rgba(31,27,29,0.17)] backdrop-blur-2xl ${secondarySurfaceClassName}`}
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.2rem] border border-white/38 bg-black/10">
            <img
              src={secondaryBackground.imagePath}
              alt={secondaryBackground.alt}
              className="size-full object-cover transition duration-700 hover:scale-[1.035]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(16,16,18,0.56))]"
            />

            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/28 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.13em] text-white shadow-[0_7px_20px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <Images aria-hidden="true" className="size-3" />
              Companion artwork
            </span>
          </div>

          <div className="relative px-2 pb-1.5 pt-3">
            <div
              className="grid size-9 place-items-center rounded-xl border border-white/36 bg-white/16 shadow-[0_8px_22px_rgba(31,27,29,0.08)]"
              style={{
                color: selectedAccent,
              }}
            >
              {isPreview ? (
                <Sparkles aria-hidden="true" className="size-4" />
              ) : (
                <Clock3 aria-hidden="true" className="size-4" />
              )}
            </div>

            <p
              className="mt-3 text-[0.64rem] font-black uppercase tracking-[0.15em]"
              style={{
                color: template.mutedTextColor,
              }}
            >
              {isPreview ? 'Selected design' : 'Invitation expires'}
            </p>

            <p
              className="mt-1.5 text-base font-black leading-5 tracking-[-0.025em]"
              style={{
                color: template.textColor,
              }}
            >
              {isPreview
                ? template.name
                : expiresAt
                  ? formatDateTime(expiresAt)
                  : 'Expiry not available'}
            </p>

            <p
              className="mt-2 text-xs font-semibold leading-5"
              style={{
                color: template.mutedTextColor,
              }}
            >
              {isPreview
                ? template.description
                : 'Submit or update your RSVP before this deadline.'}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

