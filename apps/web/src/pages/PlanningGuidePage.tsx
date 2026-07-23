import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  Images,
  Search,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const journeySteps = [
  {
    number: '01',
    eyebrow: 'Build the foundation',
    title: 'Create your event workspace',
    text: 'Start with the details that shape every later decision: event type, date, location, guest count, estimated budget and planning notes.',
    icon: CalendarDays,
    highlights: ['Event overview', 'Budget starting point', 'Guest estimate', 'Planning notes'],
    support: 'Everything begins inside one connected workspace.',
  },
  {
    number: '02',
    eyebrow: 'Explore your options',
    title: 'Discover suitable vendors',
    text: 'Browse trusted service providers by category, location, style, pricing guidance and customer feedback before building your shortlist.',
    icon: Search,
    highlights: ['Vendor categories', 'Search and filters', 'Portfolios', 'Customer reviews'],
    support: 'Compare real profiles instead of relying on scattered recommendations.',
  },
  {
    number: '03',
    eyebrow: 'Share clear requirements',
    title: 'Request structured quotations',
    text: 'Send vendors the information they need to prepare relevant offers, including event details, package preferences, deadlines and reference notes.',
    icon: FileCheck2,
    highlights: [
      'Event requirements',
      'Package preferences',
      'Response deadlines',
      'Reference details',
    ],
    support: 'Clear requests lead to clearer proposals and fewer misunderstandings.',
  },
  {
    number: '04',
    eyebrow: 'Make a confident choice',
    title: 'Compare quotations clearly',
    text: 'Review prices, deposits, inclusions, exclusions, availability and terms side by side before deciding which proposal fits your event best.',
    icon: ClipboardCheck,
    highlights: ['Package pricing', 'Deposit terms', 'Service inclusions', 'Vendor availability'],
    support: 'Compare the complete value of each proposal—not only the lowest price.',
  },
  {
    number: '05',
    eyebrow: 'Turn decisions into commitments',
    title: 'Confirm your bookings',
    text: 'Accept the right quotation, move into booking confirmation and keep every important agreement connected to the correct vendor.',
    icon: BadgeCheck,
    highlights: [
      'Accepted quotation',
      'Booking confirmation',
      'Payment details',
      'Vendor communication',
    ],
    support: 'Your chosen vendors stay linked to the planning journey.',
  },
  {
    number: '06',
    eyebrow: 'Keep the plan moving',
    title: 'Manage your event in one place',
    text: 'Track tasks, guests, documents, payments, inspiration and vendor activity as the event moves from early planning toward completion.',
    icon: FolderKanban,
    highlights: [
      'Tasks and deadlines',
      'Guests and invitations',
      'Documents',
      'Payments and balances',
    ],
    support: 'The workspace grows with your event instead of becoming another disconnected tool.',
  },
];

const planningTools = [
  {
    title: 'Budget visibility',
    text: 'See planned costs, committed amounts, payments and outstanding balances without rebuilding your numbers in separate sheets.',
    icon: WalletCards,
    tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
  },
  {
    title: 'Guest coordination',
    text: 'Keep guest details, party sizes, invitation responses and attendance updates connected to the same event.',
    icon: UsersRound,
    tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
  },
  {
    title: 'Visual direction',
    text: 'Collect inspiration, colour references, styling ideas and vendor visuals inside a dedicated event mood board.',
    icon: Images,
    tone: 'bg-[rgba(183,167,200,0.27)] text-[var(--color-deep-plum)]',
  },
];

const planningTips = [
  {
    title: 'Define the essentials first',
    text: 'A realistic date, guest estimate and budget range make vendor conversations far more useful.',
  },
  {
    title: 'Compare the full proposal',
    text: 'Look beyond the headline price and review deposits, inclusions, availability and service terms.',
  },
  {
    title: 'Keep decisions documented',
    text: 'Store confirmed details and supporting files where the rest of your planning information already lives.',
  },
  {
    title: 'Review progress regularly',
    text: 'Small planning check-ins help you catch missed deadlines, unpaid balances and incomplete tasks early.',
  },
];

export function PlanningGuidePage() {
  const [activeStep, setActiveStep] = useState('01');

  const scrollToJourneyStep = (stepNumber: string) => {
    const target = document.getElementById(`planning-step-${stepNumber}`);

    if (!target) {
      return;
    }
    setActiveStep(stepNumber);

    const headerOffset = 120;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
  };

  return (
    <>
      <style>{`
        @keyframes planning-guide-fade-up {
          from {
            opacity: 0;
            transform: translate3d(0, 18px, 0);
          }

          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes planning-guide-image-enter {
          from {
            opacity: 0;
            transform: scale(1.025);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes planning-guide-blob-one {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(18px, 12px, 0) scale(1.04);
          }
        }

        @keyframes planning-guide-blob-two {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-16px, 14px, 0) scale(1.035);
          }
        }

        .planning-guide-fade-up {
          animation: planning-guide-fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .planning-guide-image-enter {
          animation: planning-guide-image-enter 950ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .planning-guide-delay-1 {
          animation-delay: 90ms;
        }

        .planning-guide-delay-2 {
          animation-delay: 180ms;
        }

        .planning-guide-delay-3 {
          animation-delay: 270ms;
        }

        .planning-guide-delay-4 {
          animation-delay: 360ms;
        }

        .planning-guide-blob-one {
          animation: planning-guide-blob-one 15s ease-in-out infinite;
        }

        .planning-guide-blob-two {
          animation: planning-guide-blob-two 18s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .planning-guide-fade-up,
          .planning-guide-image-enter,
          .planning-guide-blob-one,
          .planning-guide-blob-two {
            animation: none !important;
          }
        }
      `}</style>
      <section className="relative overflow-hidden py-14 sm:py-16 lg:py-20">
        <div className="planning-guide-blob-one pointer-events-none absolute left-[2%] top-10 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl" />
        <div className="planning-guide-blob-two pointer-events-none absolute right-[4%] top-20 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl" />

        <div className="page-container relative">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
            <div>
              <div className="planning-guide-fade-up soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Sparkles className="size-4" />
                The Eventure planning journey
              </div>

              <h1 className="planning-guide-fade-up planning-guide-delay-1 max-w-3xl text-balance text-5xl font-black leading-[0.96] tracking-[-0.06em] text-[var(--color-near-black)] sm:text-6xl lg:text-7xl">
                Plan every milestone with confidence.
              </h1>

              <p className="planning-guide-fade-up planning-guide-delay-2 mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                Eventure guides you from your first event idea to confirmed vendors and organised
                execution through one connected planning workflow.
              </p>

              <div className="planning-guide-fade-up planning-guide-delay-3 mt-9 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary text-sm font-bold">
                  Start planning
                  <ArrowRight className="size-4" />
                </Link>

                <Link to="/vendors" className="btn-secondary text-sm font-bold">
                  Browse vendors
                </Link>
              </div>

              <div className="planning-guide-fade-up planning-guide-delay-4 mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
                {[
                  ['01', 'Create'],
                  ['02', 'Compare'],
                  ['03', 'Coordinate'],
                ].map(([number, label]) => (
                  <div
                    key={label}
                    className="rounded-[1.35rem] border border-white/55 bg-white/30 px-4 py-4 shadow-[0_14px_38px_rgba(31,27,29,0.08)] backdrop-blur-xl"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      {number}
                    </p>
                    <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="group relative">
              <div className="pointer-events-none absolute -inset-5 rounded-[3rem] bg-[rgba(183,167,200,0.2)] blur-2xl transition duration-700 ease-out group-hover:scale-[1.03] group-hover:bg-[rgba(183,167,200,0.28)]" />

              <div className="relative overflow-hidden rounded-[2.2rem] border border-white/60 bg-white/24 p-2 shadow-[0_28px_78px_rgba(31,27,29,0.16)] backdrop-blur-xl transition duration-500 ease-out group-hover:-translate-y-1 group-hover:border-white/80 group-hover:shadow-[0_34px_90px_rgba(31,27,29,0.21)]">
                <div className="group relative min-h-[28rem] overflow-hidden rounded-[2rem] sm:min-h-[34rem] lg:min-h-[38rem]">
                  <img
                    src="/images/planning-guide/planning-guide-hero.png"
                    alt="Event planning workspace with mood boards and timeline"
                    className="h-full w-full rounded-[1.75rem] object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
                  />

                  <div className="absolute inset-x-6 bottom-6 rounded-[1.5rem] border border-white/30 bg-[rgba(31,27,29,0.58)] p-5 backdrop-blur-xl transition duration-500 ease-out group-hover:-translate-y-1 group-hover:border-white/45 group-hover:bg-[rgba(31,27,29,0.66)]" />

                  <div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] border border-white/35 bg-black/24 p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">
                      One connected workflow
                    </p>
                    <p className="mt-2 max-w-md text-xl font-black tracking-[-0.035em]">
                      From early ideas to final coordination.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
            Your planning roadmap
          </p>

          <h2 className="mt-4 text-balance text-4xl font-black leading-[1] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
            A clear next step at every stage.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/68">
            Eventure brings the important parts of planning together so you always know what has
            been decided, what is still pending and what needs your attention next.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/55 bg-white/22 p-3 shadow-[0_24px_70px_rgba(31,27,29,0.1)] backdrop-blur-2xl sm:p-4 lg:mt-12">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {journeySteps.map(({ number, title, icon: Icon }) => (
              <button
                key={number}
                type="button"
                onClick={() => scrollToJourneyStep(number)}
                aria-label={`Go to step ${number}: ${title}`}
                aria-current={activeStep === number ? 'step' : undefined}
                className={`group relative flex min-h-[4.25rem] w-full cursor-pointer items-center gap-3 overflow-hidden rounded-[1.25rem] border px-4 py-3 text-left transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)] focus-visible:ring-offset-2 ${
                  activeStep === number
                    ? 'border-[rgba(93,58,85,0.34)] bg-[rgba(255,255,255,0.68)] shadow-[0_18px_42px_rgba(93,58,85,0.14)]'
                    : 'border-white/50 bg-white/34 shadow-[0_10px_26px_rgba(31,27,29,0.04)] hover:-translate-y-1 hover:border-white/75 hover:bg-white/55 hover:shadow-[0_18px_38px_rgba(31,27,29,0.1)]'
                }`}
              >
                {activeStep === number ? (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[var(--color-deep-plum)]" />
                ) : null}
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black shadow-[0_8px_18px_rgba(93,58,85,0.2)] transition duration-300 ${
                    activeStep === number
                      ? 'scale-110 bg-[var(--color-deep-plum)] text-white'
                      : 'bg-[var(--color-deep-plum)] text-white group-hover:scale-105'
                  }`}
                >
                  {number}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-xs font-black leading-4 text-[var(--color-near-black)]">
                    {title}
                  </span>
                </span>

                <Icon
                  className={`hidden size-4 shrink-0 text-[var(--color-deep-plum)] transition duration-300 xl:block ${
                    activeStep === number ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {journeySteps.map(
            ({ number, eyebrow, title, text, icon: Icon, highlights, support }, index) => {
              const tones = [
                'bg-[linear-gradient(135deg,rgba(233,221,207,0.72),rgba(255,255,255,0.4))]',
                'bg-[linear-gradient(135deg,rgba(175,201,216,0.25),rgba(255,255,255,0.44))]',
                'bg-[linear-gradient(135deg,rgba(183,167,200,0.24),rgba(255,255,255,0.44))]',
                'bg-[linear-gradient(135deg,rgba(142,151,115,0.18),rgba(255,255,255,0.44))]',
                'bg-[linear-gradient(135deg,rgba(124,74,90,0.13),rgba(255,255,255,0.44))]',
                'bg-[linear-gradient(135deg,rgba(175,201,216,0.2),rgba(233,221,207,0.34))]',
              ];

              return (
                <article
                  id={`planning-step-${number}`}
                  key={number}
                  className={`group relative scroll-mt-32 overflow-hidden rounded-[2rem] border p-6 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_26px_68px_rgba(31,27,29,0.14)] sm:p-7 lg:p-8 ${
                    activeStep === number
                      ? 'border-[rgba(93,58,85,0.28)] shadow-[0_26px_72px_rgba(93,58,85,0.16)] ring-1 ring-[rgba(93,58,85,0.08)]'
                      : 'border-white/60 shadow-[0_20px_55px_rgba(31,27,29,0.1)]'
                  } ${tones[index]}`}
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 text-[10rem] transition duration-700 ease-out group-hover:-translate-x-1 group-hover:translate-y-1 font-black leading-none text-[var(--color-deep-plum)]/[0.035] sm:text-[13rem]">
                    {number}
                  </div>

                  <div className="relative grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-12">
                    <div>
                      <div className="flex items-center gap-4">
                        <span className="grid size-12 place-items-center rounded-full bg-[var(--color-deep-plum)] text-sm font-black text-white shadow-[0_12px_28px_rgba(93,58,85,0.22)]">
                          {number}
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                            {eyebrow}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/48">
                            Step {number} of 06
                          </p>
                        </div>
                      </div>

                      <h3 className="mt-6 text-3xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl">
                        {title}
                      </h3>

                      <p className="mt-4 max-w-xl leading-7 text-[var(--color-charcoal)]/68">
                        {text}
                      </p>

                      <div className="mt-6 flex items-start gap-3 border-t border-[rgba(46,42,44,0.09)] pt-5">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-dusty-olive)]" />

                        <p className="text-sm font-semibold leading-6 text-[var(--color-deep-plum)]">
                          {support}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.65rem] border border-white/60 bg-white/34 p-5 shadow-[0_16px_42px_rgba(31,27,29,0.08)] backdrop-blur-xl sm:p-6">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/50">
                          Eventure helps with
                        </p>

                        <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.25)] text-[var(--color-deep-plum)] transition duration-500 group-hover:scale-[1.04]">
                          <Icon className="size-5" />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {highlights.map((highlight) => (
                          <div
                            key={highlight}
                            className="flex min-h-14 items-center gap-3 rounded-[1.15rem] border border-white/60 bg-white/40 px-4 py-3 text-sm font-bold text-[var(--color-charcoal)]/75"
                          >
                            <CheckCircle2 className="size-4 shrink-0 text-[var(--color-dusty-olive)]" />
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      </section>

      <section className="page-container py-12 sm:py-16 lg:py-20">
        <div className="glass-card overflow-hidden p-3 sm:p-4">
          <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
            <div className="group relative min-h-[25rem] overflow-hidden rounded-[1.8rem] sm:min-h-[32rem]">
              <img
                src="/images/planning-guide/planning-guide-mood-board.png"
                alt="A curated event mood board with venue references, colour palettes, fabrics, table styling and floral inspiration"
                className="absolute inset-0 h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.025]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.55)] via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 rounded-[1.4rem] border border-white/35 bg-black/20 p-4 text-white backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/62">
                  Visual planning
                </p>
                <p className="mt-2 text-lg font-black tracking-[-0.035em]">
                  Turn scattered inspiration into a clear creative direction.
                </p>
              </div>
            </div>

            <div className="rounded-[1.8rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-7 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.24)] sm:p-9 lg:flex lg:flex-col lg:justify-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] backdrop-blur">
                <Images className="size-5" />
              </div>

              <p className="mt-8 text-sm font-black uppercase tracking-[0.22em] text-white/55">
                Shape the event vision
              </p>

              <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                Bring every idea into one visual story.
              </h2>

              <p className="mt-5 leading-7 text-white/68">
                Use your mood board to organise styling references, colours, venue ideas, decor,
                stationery and vendor inspiration before committing to final decisions.
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  'Collect event inspiration',
                  'Save colour and styling references',
                  'Connect ideas to vendors',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur"
                  >
                    <span>{item}</span>
                    <CheckCircle2 className="size-4 text-[var(--color-powder-blue)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-12 sm:py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              Compare before committing
            </p>

            <h2 className="mt-4 text-balance text-4xl font-black leading-[1] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
              Make vendor decisions with the full picture.
            </h2>

            <p className="mt-5 text-lg leading-8 text-[var(--color-charcoal)]/68">
              A good quotation is more than a price. Eventure helps you review what is included, how
              much is due, when the vendor is available and what each package actually offers.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                ['Pricing', 'Review package totals, deposits and remaining balances.'],
                ['Inclusions', 'Understand exactly what each vendor is promising to deliver.'],
                ['Availability', 'Confirm that the service aligns with your event schedule.'],
                ['Terms', 'Keep important conditions visible before accepting an offer.'],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="group relative overflow-hidden rounded-[1.35rem] border border-white/55 bg-white/28 p-4 shadow-[0_14px_36px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-1 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/46 hover:shadow-[0_20px_46px_rgba(31,27,29,0.12)]"
                >
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 origin-left scale-x-0 rounded-full bg-[var(--color-deep-plum)] transition duration-300 group-hover:scale-x-100" />

                  <div className="relative">
                    <p className="font-black text-[var(--color-near-black)] transition duration-300 group-hover:text-[var(--color-deep-plum)]">
                      {title}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/66">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="group relative">
            <div className="pointer-events-none absolute -inset-5 rounded-[3rem] bg-[rgba(175,201,216,0.2)] blur-2xl transition duration-700 group-hover:scale-[1.03] group-hover:bg-[rgba(175,201,216,0.27)]" />

            <div className="relative overflow-hidden rounded-[2.2rem] border border-white/60 bg-white/24 p-2 shadow-[0_28px_78px_rgba(31,27,29,0.16)] backdrop-blur-xl transition duration-500 ease-out group-hover:-translate-y-1 group-hover:border-white/80 group-hover:shadow-[0_34px_88px_rgba(31,27,29,0.2)]">
              <div className="relative min-h-[28rem] overflow-hidden rounded-[1.85rem] sm:min-h-[35rem]">
                <img
                  src="/images/planning-guide/planning-guide-quotations.png"
                  alt="An event planning desk showing multiple vendor proposals, comparison notes, a calculator and a quotation overview"
                  className="absolute inset-0 h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.025]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.48)] via-transparent to-transparent" />

                <div className="absolute bottom-5 left-5 rounded-full border border-white/35 bg-black/24 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl sm:bottom-6 sm:left-6">
                  Clearer comparisons
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
            One workspace, multiple planning tools
          </p>

          <h2 className="mt-4 text-balance text-4xl font-black leading-[1] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
            Keep the practical details connected.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {planningTools.map(({ title, text, icon: Icon, tone }) => (
            <article
              key={title}
              className="luxe-card group p-6 transition duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_26px_62px_rgba(31,27,29,0.14)] sm:p-7"
            >
              <div
                className={`grid size-12 place-items-center rounded-2xl transition duration-500 group-hover:scale-[1.04] ${tone}`}
              >
                <Icon className="size-5" />
              </div>

              <h3 className="mt-8 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                {title}
              </h3>

              <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-container py-12 sm:py-16 lg:py-20">
        <div className="glass-card p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Planning principles
              </p>

              <h2 className="mt-4 text-4xl font-black leading-[1] tracking-[-0.055em] text-[var(--color-near-black)]">
                Small habits make complex events easier.
              </h2>

              <p className="mt-5 leading-7 text-[var(--color-charcoal)]/68">
                The strongest plans are not built in one sitting. They become clearer through
                consistent decisions, organised information and regular progress reviews.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {planningTips.map(({ title, text }, index) => (
                <article
                  key={title}
                  className="rounded-[1.5rem] border border-white/55 bg-white/28 p-5 shadow-[0_16px_40px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-white/36 hover:shadow-[0_22px_50px_rgba(31,27,29,0.11)]"
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Tip {String(index + 1).padStart(2, '0')}
                  </p>

                  <h3 className="mt-4 text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[var(--color-charcoal)]/68">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-container pb-20 pt-12 sm:pb-24 sm:pt-16">
        <div className="relative overflow-hidden rounded-[2.2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] px-6 py-12 text-center text-white shadow-[0_28px_80px_rgba(93,58,85,0.27)] sm:px-10 sm:py-16">
          <div className="planning-guide-blob-one pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="planning-guide-blob-two pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[rgba(175,201,216,0.2)] blur-3xl" />

          <div className="relative mx-auto max-w-3xl">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] backdrop-blur">
              <Sparkles className="size-6" />
            </div>

            <h2 className="mt-7 text-balance text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              Ready to start your planning journey?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-pretty leading-7 text-white/68">
              Create your event workspace or begin by discovering vendors who match the experience
              you are planning.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-[#5D3A55] shadow-[0_16px_38px_rgba(0,0,0,0.16)] transition duration-300 ease-out hover:-translate-y-1 hover:bg-[#fffaf5] hover:shadow-[0_20px_46px_rgba(0,0,0,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#5D3A55]"
              >
                <span className="text-[#5D3A55]">Create an account</span>

                <ArrowRight className="size-4 text-[#5D3A55] transition duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                to="/vendors"
                className="inline-flex items-center justify-center rounded-full border border-white/28 bg-white/10 px-6 py-3 text-sm font-black text-white backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/16"
              >
                Browse vendors
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
