import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Images,
  MessageSquareQuote,
  ReceiptText,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeroFloatingCards } from '../components/home/HeroFloatingCards';

const workflowSteps = [
  {
    number: '01',
    title: 'Create your event',
    description:
      'Set the date, location, guest estimate, budget and planning notes inside one organised workspace.',
    icon: CalendarDays,
  },
  {
    number: '02',
    title: 'Discover vendors',
    description:
      'Explore vendors by category, location, service style, pricing and customer feedback.',
    icon: BriefcaseBusiness,
  },
  {
    number: '03',
    title: 'Request quotations',
    description:
      'Send structured requirements so every proposal is easier to understand and compare.',
    icon: MessageSquareQuote,
  },
  {
    number: '04',
    title: 'Confirm and coordinate',
    description:
      'Accept the right quotation, create the booking and keep payments, deadlines and details visible.',
    icon: CalendarCheck2,
  },
];

const workspaceFeatures = [
  {
    title: 'Tasks',
    description: 'Track responsibilities, priorities and approaching deadlines.',
    icon: ClipboardCheck,
  },
  {
    title: 'Guests',
    description: 'Organise invitees, attendance information and guest planning.',
    icon: UsersRound,
  },
  {
    title: 'Budget',
    description: 'See estimated, committed, paid and remaining event costs.',
    icon: WalletCards,
  },
  {
    title: 'Documents',
    description: 'Keep contracts, references and important files beside the event.',
    icon: FileCheck2,
  },
  {
    title: 'Mood boards',
    description: 'Collect visual direction, ideas, colours and vendor inspiration.',
    icon: Images,
  },
  {
    title: 'Payments',
    description: 'Record deposits, proof of payment and outstanding balances.',
    icon: ReceiptText,
  },
];

const platformHighlights = [
  {
    icon: CalendarDays,
    title: 'One event workspace',
    text: 'Bring planning tools, vendors, documents, guests and decisions into one calm, connected place.',
    tone: 'bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]',
  },
  {
    icon: FileCheck2,
    title: 'Comparable quotations',
    text: 'Review service inclusions, deposits, expiry dates, conditions and vendor responses with greater clarity.',
    tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
  },
  {
    icon: CheckCircle2,
    title: 'Visible commitments',
    text: 'Know what has been requested, accepted, booked, paid and completed without chasing scattered updates.',
    tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
  },
];

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/35">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-10 size-96 rounded-full bg-[var(--color-lilac)]/25 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 top-28 size-[28rem] rounded-full bg-[var(--color-powder-blue)]/24 blur-3xl"
        />

        <div className="page-container relative grid gap-14 py-16 lg:grid-cols-[0.96fr_1.04fr] lg:items-center lg:gap-20 lg:py-24">
          <div className="relative z-10">
            <div className="soft-chip mb-7 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
              <Sparkles className="size-4" />
              Plan clearly. Celebrate fully.
            </div>

            <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.96] tracking-[-0.06em] text-[var(--color-near-black)] sm:text-6xl lg:text-[5rem]">
              The entire event,
              <span className="block text-[var(--color-deep-plum)]">
                beautifully under control.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-pretty text-lg font-medium leading-8 text-[var(--color-charcoal)]/70">
              Eventure brings vendor discovery, quotations, bookings, budgets, guests, documents,
              tasks and payments into one elegant planning experience.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary text-sm font-bold">
                Start planning
                <ArrowRight className="size-4" />
              </Link>

              <Link to="/vendors" className="btn-secondary text-sm font-bold">
                Browse vendors
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[var(--color-charcoal)]/58">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[var(--color-dusty-olive)]" />
                Structured planning
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[var(--color-dusty-olive)]" />
                Clear vendor coordination
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[var(--color-dusty-olive)]" />
                Real progress visibility
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="relative mx-auto w-full max-w-[46rem] lg:-mr-10 lg:max-w-[48rem] xl:-mr-16 xl:max-w-[52rem]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-[2.8rem] bg-[linear-gradient(135deg,rgba(183,167,200,0.24),rgba(175,201,216,0.18),rgba(142,151,115,0.12))] blur-2xl"
              />

              <div className="relative overflow-visible rounded-[2.35rem] border border-white/65 bg-white/18 p-2.5 shadow-[0_34px_100px_rgba(31,27,29,0.2)] backdrop-blur-2xl sm:p-3">
                <div className="relative overflow-hidden rounded-[1.95rem]">
                  <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/4] lg:aspect-[11/10] xl:aspect-[6/5]">
                    <img
                      src="/images/eventure-studio-hero.png"
                      alt="A premium event planning studio workspace with planning materials, inspiration boards and Eventure interface elements."
                      className="h-full w-full scale-[1.03] object-cover object-center transition-transform duration-700"
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,27,29,0.02),rgba(31,27,29,0.16))]"
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[rgba(31,27,29,0.34)] to-transparent"
                    />
                  </div>
                </div>

                <HeroFloatingCards />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-16 sm:py-20 lg:py-24">
        <div className="relative overflow-hidden rounded-[2.4rem] border border-white/55 bg-white/24 px-6 py-10 shadow-[0_26px_80px_rgba(31,27,29,0.08)] backdrop-blur-xl sm:px-9 sm:py-12 lg:px-12 lg:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[var(--color-lilac)]/18 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-24 size-80 rounded-full bg-[var(--color-powder-blue)]/18 blur-3xl"
          />

          <div className="relative grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-20">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Why Eventure exists
              </p>

              <h2 className="mt-5 max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                Planning should feel inspiring, not scattered.
              </h2>

              <p className="mt-6 max-w-xl text-base font-medium leading-8 text-[var(--color-charcoal)]/68">
                Event planning often becomes a collection of chats, spreadsheets, notes and
                forgotten follow-ups. Eventure brings the entire process into one thoughtful
                workspace.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                {
                  title: 'Everything stays connected',
                  description:
                    'Vendors, quotations, bookings, guests, documents and payments remain attached to the event they belong to.',
                },
                {
                  title: 'Important decisions stay visible',
                  description:
                    'See what has been requested, approved, paid, completed or still needs attention without searching through messages.',
                },
                {
                  title: 'Coordination feels calmer',
                  description:
                    'Customers and vendors work from the same structured process, reducing uncertainty and missed details.',
                },
              ].map((item, index) => (
                <article
                  key={item.title}
                  className="group flex gap-4 rounded-[1.6rem] border border-white/55 bg-white/32 p-5 transition duration-300 hover:-translate-y-0.5 hover:bg-white/42 hover:shadow-[0_18px_46px_rgba(31,27,29,0.08)] sm:p-6"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)]">
                    <span className="text-xs font-black tracking-[0.12em]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </span>

                  <div>
                    <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-7 text-[var(--color-charcoal)]/65">
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/35 bg-white/14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-20 size-96 rounded-full bg-[var(--color-powder-blue)]/16 blur-3xl"
        />

        <div className="page-container relative py-16 sm:py-20 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-end lg:gap-16">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                A clearer journey
              </p>

              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                From first idea to confirmed plan.
              </h2>
            </div>

            <p className="max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/68 lg:justify-self-end">
              Eventure guides the planning process without making it feel rigid. Each step stays
              structured, visible and easy to continue.
            </p>
          </div>

          <div className="relative mt-12">
            <div
              aria-hidden="true"
              className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-[linear-gradient(90deg,transparent,rgba(93,58,85,0.2),rgba(93,58,85,0.2),transparent)] lg:block"
            />

            <div className="grid gap-4 lg:grid-cols-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.number}
                    className="group relative rounded-[2rem] border border-white/60 bg-white/30 p-6 shadow-[0_20px_60px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/40 hover:shadow-[0_26px_68px_rgba(31,27,29,0.11)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="relative z-10 grid size-14 place-items-center rounded-full border border-white/65 bg-[rgba(255,255,255,0.56)] text-sm font-black tracking-[0.12em] text-[var(--color-deep-plum)] shadow-[0_12px_34px_rgba(31,27,29,0.09)] backdrop-blur-xl">
                        {step.number}
                      </span>

                      <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)] transition duration-300 group-hover:bg-[var(--color-deep-plum)] group-hover:text-white">
                        <Icon className="size-5" />
                      </span>
                    </div>

                    <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Step {index + 1}
                    </p>

                    <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/66">
                      {step.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="mt-9">
            <Link
              to="/planning-guide"
              className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)] transition hover:gap-3 hover:text-[var(--color-rosewood)]"
            >
              Explore the complete planning guide
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="page-container py-16 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              One connected workspace
            </p>

            <h2 className="mt-4 max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
              Everything important gets a proper place.
            </h2>

            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-[var(--color-charcoal)]/68">
              The creative side of planning stays inspiring, while the operational side remains
              clear, organised and easy to manage.
            </p>

            <div className="mt-8 rounded-[1.8rem] border border-white/55 bg-white/26 p-6 shadow-[0_20px_60px_rgba(31,27,29,0.07)] backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                Built around the event
              </p>

              <p className="mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/66">
                Every task, guest, document, quotation and payment stays connected to the event it
                belongs to, so nothing feels disconnected or difficult to trace.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {workspaceFeatures.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/30 p-6 shadow-[0_20px_60px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/40 hover:shadow-[0_26px_68px_rgba(31,27,29,0.11)] sm:p-7 ${
                    index === 0 || index === 3 ? 'sm:translate-y-6' : ''
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[var(--color-lilac)]/10 blur-2xl transition duration-300 group-hover:bg-[var(--color-lilac)]/18"
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-4">
                      <span className="grid size-12 place-items-center rounded-2xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)] transition duration-300 group-hover:bg-[var(--color-deep-plum)] group-hover:text-white">
                        <Icon className="size-5" />
                      </span>

                      <span className="text-xs font-black tracking-[0.16em] text-[var(--color-charcoal)]/28">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3 className="mt-9 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      {feature.title}
                    </h3>

                    <p className="mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/66">
                      {feature.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/35 bg-white/14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-12 size-96 rounded-full bg-[var(--color-lilac)]/14 blur-3xl"
        />

        <div className="page-container relative py-16 sm:py-20 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-16">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Two sides, one clearer process
              </p>

              <h2 className="mt-4 max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                Built for customers and vendors.
              </h2>
            </div>

            <p className="max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/68 lg:justify-self-end">
              Eventure gives both sides a structured way to communicate, compare decisions and keep
              every commitment visible from beginning to completion.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <article className="group relative overflow-hidden rounded-[2.3rem] border border-white/12 bg-[var(--color-near-black)] p-7 text-white shadow-[0_30px_84px_rgba(31,27,29,0.2)] sm:p-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[var(--color-lilac)]/24 blur-3xl transition duration-500 group-hover:bg-[var(--color-lilac)]/32"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-[var(--color-powder-blue)]/12 blur-3xl"
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-light-champagne)]">
                    For customers
                  </span>

                  <span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-white/82">
                    <UsersRound className="size-5" />
                  </span>
                </div>

                <h3 className="mt-10 max-w-lg text-3xl font-black leading-tight tracking-[-0.045em]">
                  Plan with clarity instead of chaos.
                </h3>

                <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/62 sm:text-base">
                  Discover vendors, request structured quotations, compare options and coordinate
                  every important detail from one connected event workspace.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    'Discover trusted vendors',
                    'Compare quotations clearly',
                    'Track bookings and payments',
                    'Manage guests and tasks',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-[var(--color-light-champagne)]" />

                      <span className="text-sm font-bold text-white/74">{item}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/register/customer"
                  className="group mt-9 inline-flex min-h-14 w-full items-center justify-between rounded-2xl border border-white/16 bg-[linear-gradient(135deg,rgba(142,92,103,0.96),rgba(93,58,85,0.96))] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(93,58,85,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(93,58,85,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-near-black)] sm:w-auto sm:min-w-[18rem]"
                >
                  <span>Create a customer account</span>

                  <span className="grid size-8 place-items-center rounded-full bg-white/12 transition duration-300 group-hover:translate-x-1 group-hover:bg-white/18">
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-[2.3rem] border border-white/60 bg-white/32 p-7 shadow-[0_26px_76px_rgba(31,27,29,0.09)] backdrop-blur-xl sm:p-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-[var(--color-powder-blue)]/22 blur-3xl transition duration-500 group-hover:bg-[var(--color-powder-blue)]/30"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--color-dusty-olive)]/12 blur-3xl"
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-white/55 bg-white/42 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    For vendors
                  </span>

                  <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)]">
                    <BriefcaseBusiness className="size-5" />
                  </span>
                </div>

                <h3 className="mt-10 max-w-lg text-3xl font-black leading-tight tracking-[-0.045em] text-[var(--color-near-black)]">
                  Manage opportunities professionally.
                </h3>

                <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-[var(--color-charcoal)]/67 sm:text-base">
                  Present your services, respond to quotation requests and coordinate bookings,
                  availability and customer communication with greater confidence.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    'Showcase services and work',
                    'Manage quotation requests',
                    'Control availability',
                    'Coordinate active bookings',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/38 px-4 py-3"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-[var(--color-dusty-olive)]" />

                      <span className="text-sm font-bold text-[var(--color-charcoal)]/72">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/register/vendor"
                  className="group mt-9 inline-flex min-h-14 w-full items-center justify-between rounded-2xl bg-[linear-gradient(135deg,var(--color-rosewood),var(--color-deep-plum))] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(93,58,85,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(93,58,85,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70 sm:w-auto sm:min-w-[16.5rem]"
                >
                  <span>Join as a vendor</span>

                  <span className="grid size-8 place-items-center rounded-full bg-white/14 transition duration-300 group-hover:translate-x-1 group-hover:bg-white/22">
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="page-container py-16 sm:py-20 lg:py-24">
        <div className="relative overflow-hidden rounded-[2.4rem] border border-white/55 bg-white/22 px-6 py-10 shadow-[0_26px_80px_rgba(31,27,29,0.08)] backdrop-blur-xl sm:px-9 sm:py-12 lg:px-12 lg:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[var(--color-lilac)]/16 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-[var(--color-powder-blue)]/16 blur-3xl"
          />

          <div className="relative">
            <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Built for real coordination
                </p>

                <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                  Less chasing. Better decisions.
                </h2>
              </div>

              <p className="max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66 lg:justify-self-end">
                Eventure gives each commitment, conversation and transaction a visible place in the
                process, so customers and vendors always know what has happened and what needs
                attention next.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {platformHighlights.map(({ icon: Icon, title, text, tone }, index) => (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/32 p-6 shadow-[0_20px_58px_rgba(31,27,29,0.07)] transition duration-300 hover:-translate-y-1 hover:bg-white/44 hover:shadow-[0_28px_70px_rgba(31,27,29,0.12)] sm:p-7"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[var(--color-lilac)]/8 blur-2xl transition duration-300 group-hover:bg-[var(--color-lilac)]/16"
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-4">
                      <div
                        className={`grid size-12 place-items-center rounded-2xl transition duration-300 group-hover:-rotate-3 group-hover:scale-105 ${tone}`}
                      >
                        <Icon className="size-6" />
                      </div>

                      <span className="text-xs font-black tracking-[0.16em] text-[var(--color-charcoal)]/28">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3 className="mt-10 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      {title}
                    </h3>

                    <p className="mt-3 font-medium leading-7 text-[var(--color-charcoal)]/67">
                      {text}
                    </p>

                    <div className="mt-8 h-px w-full overflow-hidden bg-[var(--color-charcoal)]/8">
                      <div className="h-full w-10 bg-[var(--color-deep-plum)]/45 transition-all duration-500 group-hover:w-full" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-container pb-16 sm:pb-20 lg:pb-24">
        <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/12 bg-[var(--color-near-black)] px-6 py-14 text-white shadow-[0_34px_100px_rgba(31,27,29,0.24)] sm:px-10 lg:px-14 lg:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-[var(--color-deep-plum)]/44 blur-3xl transition duration-700 group-hover:bg-[var(--color-deep-plum)]/54"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-[var(--color-powder-blue)]/16 blur-3xl transition duration-700 group-hover:bg-[var(--color-powder-blue)]/22"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)]"
          />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-14">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-light-champagne)]">
                Your event deserves a clearer process
              </p>

              <h2 className="mt-5 text-4xl font-black leading-[1.04] tracking-[-0.05em] sm:text-5xl">
                Start with the vision. Let Eventure organise the rest.
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-white/62 sm:text-base">
                Create your workspace, discover the right vendors and keep every important decision
                visible from the beginning.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                to="/register"
                className="group/button inline-flex min-h-14 items-center justify-between gap-6 rounded-2xl bg-white px-5 text-sm font-black !text-[var(--color-deep-plum)] shadow-[0_18px_46px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-light-champagne)] hover:shadow-[0_24px_56px_rgba(0,0,0,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-near-black)] sm:min-w-[12rem]"
              >
                <span>Start planning</span>

                <span className="grid size-8 place-items-center rounded-full bg-[var(--color-deep-plum)]/8 transition duration-300 group-hover/button:translate-x-1 group-hover/button:bg-[var(--color-deep-plum)]/12">
                  <ArrowRight className="size-4" />
                </span>
              </Link>

              <Link
                to="/vendors"
                className="group/button inline-flex min-h-14 items-center justify-between gap-6 rounded-2xl border border-white/16 bg-white/8 px-5 text-sm font-black text-white shadow-[0_14px_36px_rgba(0,0,0,0.12)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/24 hover:bg-white/14 hover:shadow-[0_20px_46px_rgba(0,0,0,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-near-black)] sm:min-w-[12rem]"
              >
                <span>Explore vendors</span>

                <span className="grid size-8 place-items-center rounded-full bg-white/8 transition duration-300 group-hover/button:translate-x-1 group-hover/button:bg-white/14">
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
