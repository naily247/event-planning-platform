type AmbientBackgroundVariant =
  | 'dashboard'
  | 'events'
  | 'budget'
  | 'guests'
  | 'invitations'
  | 'documents'
  | 'moodboard'
  | 'quotations'
  | 'bookings'
  | 'notifications';

type AmbientBackgroundProps = {
  variant?: AmbientBackgroundVariant;
};

const variantClasses: Record<
  AmbientBackgroundVariant,
  {
    primary: string;
    secondary: string;
    accent: string;
  }
> = {
  dashboard: {
    primary: 'bg-[rgba(183,167,200,0.24)]',
    secondary: 'bg-[rgba(175,201,216,0.22)]',
    accent: 'bg-[rgba(224,198,170,0.16)]',
  },
  events: {
    primary: 'bg-[rgba(175,201,216,0.24)]',
    secondary: 'bg-[rgba(183,167,200,0.20)]',
    accent: 'bg-[rgba(223,206,181,0.16)]',
  },
  budget: {
    primary: 'bg-[rgba(142,151,115,0.20)]',
    secondary: 'bg-[rgba(223,206,181,0.22)]',
    accent: 'bg-[rgba(175,201,216,0.14)]',
  },
  guests: {
    primary: 'bg-[rgba(175,201,216,0.24)]',
    secondary: 'bg-[rgba(224,188,180,0.18)]',
    accent: 'bg-[rgba(240,220,190,0.16)]',
  },
  invitations: {
    primary: 'bg-[rgba(224,188,180,0.22)]',
    secondary: 'bg-[rgba(183,167,200,0.18)]',
    accent: 'bg-[rgba(240,220,190,0.16)]',
  },
  documents: {
    primary: 'bg-[rgba(175,201,216,0.18)]',
    secondary: 'bg-[rgba(209,211,215,0.20)]',
    accent: 'bg-[rgba(223,206,181,0.14)]',
  },
  moodboard: {
    primary: 'bg-[rgba(224,188,180,0.24)]',
    secondary: 'bg-[rgba(183,167,200,0.22)]',
    accent: 'bg-[rgba(240,220,190,0.18)]',
  },
  quotations: {
    primary: 'bg-[rgba(183,167,200,0.22)]',
    secondary: 'bg-[rgba(175,201,216,0.18)]',
    accent: 'bg-[rgba(142,151,115,0.14)]',
  },
  bookings: {
    primary: 'bg-[rgba(142,151,115,0.18)]',
    secondary: 'bg-[rgba(175,201,216,0.20)]',
    accent: 'bg-[rgba(183,167,200,0.14)]',
  },
  notifications: {
    primary: 'bg-[rgba(175,201,216,0.20)]',
    secondary: 'bg-[rgba(183,167,200,0.18)]',
    accent: 'bg-[rgba(224,188,180,0.12)]',
  },
};

export function AmbientBackground({ variant = 'dashboard' }: AmbientBackgroundProps) {
  const tones = variantClasses[variant];

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,252,248,0.96),rgba(248,244,241,0.92))]" />

      <div
        className={`absolute -left-32 -top-28 size-[30rem] rounded-full ${tones.primary} blur-[110px]`}
      />

      <div
        className={`absolute -right-36 top-[18%] size-[28rem] rounded-full ${tones.secondary} blur-[120px]`}
      />

      <div
        className={`absolute bottom-[-10rem] left-[28%] size-[32rem] rounded-full ${tones.accent} blur-[130px]`}
      />

      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(31,27,29,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(31,27,29,0.45)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(255,252,248,0.48)_100%)]" />
    </div>
  );
}
