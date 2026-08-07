import { Clock3, Eye, Images, Sparkles } from 'lucide-react';
import type { EventInvitationTemplate, EventTypeOption } from './event.api';
import {
  resolveInvitationTemplate,
  type InvitationTemplateDefinition,
} from './invitationTemplates';

type InvitationHeroProps = {
  eventName: string;
  eventType: EventTypeOption | string;
  invitationTemplate?: EventInvitationTemplate | null;
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

const getFontClassName = (
  fontStyle: InvitationTemplateDefinition['fontStyle'],
) => {
  switch (fontStyle) {
    case 'classic':
      return 'font-serif tracking-[-0.035em]';

    case 'editorial':
      return 'font-serif tracking-[-0.045em]';

    case 'playful':
      return 'tracking-[-0.055em]';

    case 'modern':
    default:
      return 'tracking-[-0.06em]';
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
    throw new Error(
      `No invitation template is configured for ${normalizedEventType}.`,
    );
  }

  const isPreview = mode === 'preview';
  const hasLightText = usesLightText(template.textColor);
  const primaryBackground = template.backgrounds[0];
  const secondaryBackground = template.backgrounds[1];

  const readabilityOverlay = hasLightText
    ? 'linear-gradient(90deg, rgba(16,18,24,0.97) 0%, rgba(16,18,24,0.92) 25%, rgba(16,18,24,0.72) 43%, rgba(16,18,24,0.34) 61%, rgba(16,18,24,0.08) 78%, transparent 92%)'
    : 'linear-gradient(90deg, rgba(255,252,248,0.98) 0%, rgba(255,252,248,0.94) 25%, rgba(255,252,248,0.78) 43%, rgba(255,252,248,0.42) 61%, rgba(255,252,248,0.10) 78%, transparent 92%)';

  const textSurfaceClassName = hasLightText
    ? 'border-white/18 bg-black/24'
    : 'border-white/56 bg-white/34';

  const secondarySurfaceClassName = hasLightText
    ? 'border-white/24 bg-black/34'
    : 'border-white/58 bg-white/44';

  return (
    <section
      className="relative isolate overflow-hidden rounded-[2.3rem] border border-white/45 shadow-[0_28px_90px_rgba(31,27,29,0.16)]"
      aria-label={
        isPreview
          ? `${eventName} invitation design preview`
          : `${eventName} invitation`
      }
      style={{
        background: template.background,
      }}
    >
      <img
        src={primaryBackground.imagePath}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 size-full object-cover object-center"
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
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-20 h-[42%] bg-[linear-gradient(180deg,transparent,rgba(17,16,18,0.18))]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5"
        style={{
          background: template.accent,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 -z-10 size-[28rem] rounded-full bg-white/18 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-[18%] -z-10 size-[30rem] rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative grid min-h-[34rem] gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:p-9">
        <div
          className={`max-w-[48rem] rounded-[1.8rem] border p-5 shadow-[0_22px_65px_rgba(31,27,29,0.12)] backdrop-blur-[10px] sm:p-7 ${textSurfaceClassName}`}
        >
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/38 bg-white/16 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] shadow-[0_10px_26px_rgba(31,27,29,0.08)] backdrop-blur-xl"
            style={{
              color: template.textColor,
            }}
          >
            {isPreview ? (
              <Eye aria-hidden="true" className="size-4" />
            ) : (
              <Sparkles aria-hidden="true" className="size-4" />
            )}

            {isPreview ? 'Invitation preview' : 'You’re invited'}
          </div>

          <p
            className="mt-7 text-xs font-black uppercase tracking-[0.22em]"
            style={{
              color: template.mutedTextColor,
            }}
          >
            {normalizedEventType}
          </p>

          <h2
            className={`mt-4 max-w-4xl text-balance text-[2.65rem] font-black leading-[0.96] sm:text-5xl lg:text-[3.55rem] ${getFontClassName(
              template.fontStyle,
            )}`}
            style={{
              color: template.textColor,
            }}
          >
            {isPreview
              ? `You’re invited to ${eventName}.`
              : `Hello ${guestFirstName ?? 'Guest'}, let’s celebrate together.`}
          </h2>

          <p
            className="mt-6 max-w-2xl text-pretty text-base font-semibold leading-7 sm:text-lg sm:leading-8"
            style={{
              color: template.mutedTextColor,
            }}
          >
            {isPreview
              ? 'This is the design guests will see when they open their personal invitation link.'
              : `You’re invited to ${eventName}. Review the celebration details and let the host know whether you’ll be joining.`}
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <span
              className="rounded-full border border-white/36 bg-white/16 px-4 py-2 text-xs font-black shadow-[0_8px_22px_rgba(31,27,29,0.07)] backdrop-blur-xl"
              style={{
                color: template.textColor,
              }}
            >
              {template.name}
            </span>

            <span
              className="rounded-full border border-white/36 bg-white/16 px-4 py-2 text-xs font-black shadow-[0_8px_22px_rgba(31,27,29,0.07)] backdrop-blur-xl"
              style={{
                color: template.textColor,
              }}
            >
              {template.previewLabel}
            </span>
          </div>
        </div>

        <aside
          className={`relative overflow-hidden rounded-[1.8rem] border p-3 shadow-[0_24px_70px_rgba(31,27,29,0.18)] backdrop-blur-2xl ${secondarySurfaceClassName}`}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem] border border-white/38 bg-black/10">
            <img
              src={secondaryBackground.imagePath}
              alt={secondaryBackground.alt}
              className="size-full object-cover transition duration-700 hover:scale-[1.035]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(16,16,18,0.56))]"
            />

            <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/28 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <Images aria-hidden="true" className="size-3.5" />
              Companion artwork
            </span>
          </div>

          <div className="relative px-2 pb-2 pt-5">
            <div
              className="grid size-11 place-items-center rounded-2xl border border-white/36 bg-white/16 shadow-[0_10px_26px_rgba(31,27,29,0.08)]"
              style={{
                color: template.textColor,
              }}
            >
              {isPreview ? (
                <Sparkles aria-hidden="true" className="size-5" />
              ) : (
                <Clock3 aria-hidden="true" className="size-5" />
              )}
            </div>

            <p
              className="mt-5 text-xs font-black uppercase tracking-[0.16em]"
              style={{
                color: template.mutedTextColor,
              }}
            >
              {isPreview ? 'Selected design' : 'Invitation expires'}
            </p>

            <p
              className="mt-2 text-xl font-black leading-7 tracking-[-0.035em]"
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
              className="mt-3 text-sm font-semibold leading-6"
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