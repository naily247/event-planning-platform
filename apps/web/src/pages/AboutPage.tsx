import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Handshake,
  LayoutDashboard,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const challenges = [
  {
    title: 'Scattered information',
    description:
      'Budgets, guest lists, quotations, documents and inspiration often end up spread across spreadsheets, messages and folders.',
    icon: FileText,
  },
  {
    title: 'Time-consuming coordination',
    description:
      'Following up with multiple vendors, comparing proposals and tracking commitments can quickly become overwhelming.',
    icon: MessageSquareQuote,
  },
  {
    title: 'Limited visibility',
    description:
      'Important deadlines, deposits and planning tasks are easier to miss when there is no single source of truth.',
    icon: ClipboardCheck,
  },
];

const platformCapabilities = [
  {
    label: 'Event workspaces',
    icon: LayoutDashboard,
  },
  {
    label: 'Trusted vendors',
    icon: Store,
  },
  {
    label: 'Structured quotations',
    icon: MessageSquareQuote,
  },
  {
    label: 'Bookings and payments',
    icon: CircleDollarSign,
  },
  {
    label: 'Guest coordination',
    icon: UsersRound,
  },
  {
    label: 'Tasks and documents',
    icon: CalendarCheck2,
  },
];

const audiences = [
  {
    eyebrow: 'For customers',
    title: 'Plan with clarity',
    description:
      'Create events, discover vendors, compare quotations, organise guests, track budgets and keep every important detail in one connected workspace.',
    icon: Sparkles,
    highlights: [
      'Discover and compare trusted vendors',
      'Manage bookings, payments and reviews',
      'Organise budgets, guests, tasks and documents',
    ],
  },
  {
    eyebrow: 'For vendors',
    title: 'Grow with confidence',
    description:
      'Build a professional presence, showcase services, manage availability and respond to serious customer enquiries through a structured workflow.',
    icon: Building2,
    highlights: [
      'Present services through a polished profile',
      'Manage availability and quotation requests',
      'Track bookings, reviews and customer communication',
    ],
  },
  {
    eyebrow: 'For administrators',
    title: 'Protect the marketplace',
    description:
      'Review vendor applications, verify payments, moderate platform activity and support a reliable experience for every participant.',
    icon: ShieldCheck,
    highlights: [
      'Review and verify vendor applications',
      'Oversee payments, complaints and moderation',
      'Maintain platform trust and service quality',
    ],
  },
];

const principles = [
  {
    title: 'Thoughtful planning',
    description: 'Every feature should reduce complexity and help people make better decisions.',
    icon: CalendarCheck2,
  },
  {
    title: 'Transparency',
    description: 'Clear quotations, visible commitments and organised records build confidence.',
    icon: BadgeCheck,
  },
  {
    title: 'Collaboration',
    description:
      'Customers, vendors and administrators work better when information stays connected.',
    icon: Handshake,
  },
  {
    title: 'Beautiful experiences',
    description: 'Powerful software should also feel calm, elegant and enjoyable to use.',
    icon: Sparkles,
  },
];

export function AboutPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative overflow-hidden border-b border-white/35">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-8 size-80 rounded-full bg-[var(--color-powder-blue)]/18 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-[var(--color-lilac)]/18 blur-3xl"
        />

        <div className="page-container relative py-16 sm:py-20 lg:py-24">
          <div className="grid min-h-[560px] items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/35 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)] shadow-[0_14px_40px_rgba(31,27,29,0.08)] backdrop-blur-xl">
                <Sparkles className="size-4" />
                About Eventure
              </div>

              <h1 className="mt-8 text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl lg:text-7xl">
                Planning an event should feel exciting,
                <span className="block text-[var(--color-deep-plum)]">not overwhelming.</span>
              </h1>

              <p className="mt-8 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/70 sm:text-lg">
                From finding trusted vendors to managing budgets, guests, documents and bookings,
                every celebration involves hundreds of small decisions. Eventure brings those
                decisions together into one thoughtfully designed workspace.
              </p>

              <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
                <Link to="/register" className="btn-primary min-h-12 px-6">
                  Start planning
                  <ArrowRight className="size-4" />
                </Link>

                <Link
                  to="/planning-guide"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/55 bg-white/35 px-6 text-sm font-bold text-[var(--color-charcoal)] shadow-[0_12px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/55 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40"
                >
                  See how Eventure works
                </Link>
              </div>
            </div>

            <div aria-hidden="true" className="relative hidden min-h-[500px] lg:block">
              <div
                className="absolute -inset-y-8 -right-20 left-0 bg-cover bg-center brightness-[0.96] saturate-[0.7]"
                style={{
                  backgroundImage: "url('/images/eventure-about-hero-workspace.jpg')",
                }}
              />

              <div className="absolute -inset-y-8 -right-20 left-0 bg-[var(--color-light-champagne)]/20 mix-blend-soft-light" />

              <div className="absolute -inset-y-8 -right-20 left-0 bg-[linear-gradient(90deg,var(--color-light-champagne)_0%,rgba(233,221,207,0.96)_10%,rgba(233,221,207,0.72)_28%,rgba(233,221,207,0.22)_58%,transparent_88%)]" />

              <div className="absolute -inset-y-8 -right-20 left-0 bg-[linear-gradient(180deg,rgba(233,221,207,0.52)_0%,transparent_28%,transparent_72%,rgba(233,221,207,0.48)_100%)]" />

              <div className="absolute inset-12 rounded-[3rem] border border-white/10 bg-white/[0.015] backdrop-blur-[0.25px]" />
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--color-light-champagne)]/45 to-transparent"
        />
      </section>

      <section className="page-container py-16 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.35fr] lg:items-end lg:gap-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              The challenge
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] text-[var(--color-near-black)] sm:text-5xl">
              Event planning becomes complicated when everything lives in different places.
            </h2>
          </div>

          <p className="max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/68 sm:text-lg">
            Ideas may begin in one place, conversations continue somewhere else, and important
            records are often stored across several tools. The result is unnecessary friction at a
            time that should feel creative and rewarding.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {challenges.map((challenge, index) => {
            const Icon = challenge.icon;

            return (
              <article
                key={challenge.title}
                className="group rounded-[2rem] border border-white/55 bg-white/30 p-7 shadow-[0_20px_60px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/42 sm:p-8"
              >
                <div className="flex items-start justify-between gap-5">
                  <span className="grid size-12 place-items-center rounded-2xl border border-white/55 bg-white/45 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.08)]">
                    <Icon className="size-5" />
                  </span>

                  <span className="text-xs font-black tracking-[0.18em] text-[var(--color-charcoal)]/30">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="mt-8 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {challenge.title}
                </h3>

                <p className="mt-4 text-sm font-medium leading-7 text-[var(--color-charcoal)]/65">
                  {challenge.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/35 bg-[var(--color-near-black)] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-[var(--color-deep-plum)]/35 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-[var(--color-powder-blue)]/15 blur-3xl"
        />

        <div className="page-container relative py-16 sm:py-20 lg:py-24">
          <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-light-champagne)]">
                The Eventure approach
              </p>

              <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                One workspace.
                <span className="block text-[var(--color-light-champagne)]">
                  Every important detail.
                </span>
              </h2>

              <p className="mt-7 max-w-xl text-base font-medium leading-8 text-white/62 sm:text-lg">
                Instead of switching between disconnected tools, Eventure provides one place to
                organise an event from the first idea to the final celebration.
              </p>

              <p className="mt-5 max-w-xl text-base font-medium leading-8 text-white/62 sm:text-lg">
                Customers can discover vendors and coordinate plans, vendors can manage professional
                workflows, and administrators can maintain a trusted marketplace around them.
              </p>
            </div>

            <div className="rounded-[2.25rem] border border-white/12 bg-white/[0.06] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:p-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-5 sm:p-7">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                      Event planning workspace
                    </p>

                    <p className="mt-2 text-sm font-semibold text-white/55">
                      Everything connected in one experience
                    </p>
                  </div>

                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/8">
                    <LayoutDashboard className="size-5 text-[var(--color-light-champagne)]" />
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {platformCapabilities.map((capability) => {
                    const Icon = capability.icon;

                    return (
                      <div
                        key={capability.label}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-[var(--color-light-champagne)]">
                          <Icon className="size-4" />
                        </span>

                        <span className="text-sm font-bold text-white/75">{capability.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
            Built for everyone involved
          </p>

          <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] text-[var(--color-near-black)] sm:text-5xl">
            A connected experience for every side of the event.
          </h2>

          <p className="mt-6 text-base font-medium leading-8 text-[var(--color-charcoal)]/68 sm:text-lg">
            Eventure supports the complete relationship between customers, service providers and the
            people responsible for maintaining platform quality.
          </p>
        </div>

        <div className="mt-12 grid gap-6 xl:grid-cols-3">
          {audiences.map((audience) => {
            const Icon = audience.icon;

            return (
              <article
                key={audience.title}
                className="flex h-full flex-col rounded-[2.25rem] border border-white/55 bg-white/30 p-7 shadow-[0_22px_70px_rgba(31,27,29,0.08)] backdrop-blur-xl sm:p-8"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="grid size-13 place-items-center rounded-2xl border border-white/60 bg-white/45 text-[var(--color-deep-plum)] shadow-[0_14px_36px_rgba(31,27,29,0.08)]">
                    <Icon className="size-5" />
                  </span>

                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    {audience.eyebrow}
                  </p>
                </div>

                <h3 className="mt-8 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  {audience.title}
                </h3>

                <p className="mt-5 text-sm font-medium leading-7 text-[var(--color-charcoal)]/65">
                  {audience.description}
                </p>

                <ul className="mt-8 space-y-4">
                  {audience.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/72"
                    >
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-deep-plum)]/10 text-[var(--color-deep-plum)]">
                        <BadgeCheck className="size-3.5" />
                      </span>

                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/35 bg-white/16">
        <div className="page-container py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.45fr] lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Our principles
              </p>

              <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] text-[var(--color-near-black)] sm:text-5xl">
                Designed with intention at every step.
              </h2>

              <p className="mt-6 text-base font-medium leading-8 text-[var(--color-charcoal)]/68">
                These principles shape how Eventure approaches product design, workflows and trust
                across the platform.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {principles.map((principle) => {
                const Icon = principle.icon;

                return (
                  <article
                    key={principle.title}
                    className="rounded-[1.75rem] border border-white/60 bg-white/35 p-6 shadow-[0_18px_50px_rgba(31,27,29,0.07)] backdrop-blur-xl"
                  >
                    <span className="grid size-11 place-items-center rounded-2xl border border-white/60 bg-white/45 text-[var(--color-deep-plum)]">
                      <Icon className="size-5" />
                    </span>

                    <h3 className="mt-6 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                      {principle.title}
                    </h3>

                    <p className="mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/64">
                      {principle.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-16 sm:py-20 lg:py-24">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/55 bg-[var(--color-deep-plum)] px-6 py-14 text-center text-white shadow-[0_32px_90px_rgba(93,58,85,0.24)] sm:px-10 sm:py-18 lg:px-16 lg:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-white/10 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-[var(--color-powder-blue)]/20 blur-3xl"
          />

          <div className="relative mx-auto max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-light-champagne)]">
              Begin with clarity
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
              Every memorable celebration begins with thoughtful planning.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-8 text-white/72 sm:text-lg">
              Spend less time managing disconnected details and more time creating an event worth
              remembering.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black !text-[var(--color-deep-plum)] shadow-[0_16px_40px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--color-light-champagne)] hover:!text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Start planning today
                <ArrowRight className="size-4" />
              </Link>

              <Link
                to="/vendors"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Explore vendors
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
