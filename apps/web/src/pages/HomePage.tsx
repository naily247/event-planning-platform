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
import { ScrollReveal } from '../components/home/ScrollReveal';
import { useEffect, useRef } from 'react';

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

const whyEventureItems = [
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
];

export function HomePage() {
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroImageParallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const heroSection = heroSectionRef.current;
    const heroImage = heroImageParallaxRef.current;

    if (!heroSection || !heroImage) {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrameId: number | null = null;

    const updateParallax = () => {
      if (reducedMotionQuery.matches) {
        heroImage.style.transform = 'translate3d(0, 0, 0)';
        animationFrameId = null;
        return;
      }

      const sectionRect = heroSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalTravel = sectionRect.height + viewportHeight;
      const visibleProgress = (viewportHeight - sectionRect.top) / totalTravel;
      const clampedProgress = Math.min(Math.max(visibleProgress, 0), 1);
      const offset = 14 - clampedProgress * 28;

      heroImage.style.transform = `translate3d(0, ${offset}px, 0)`;
      animationFrameId = null;
    };

    const requestParallaxUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateParallax);
    };

    const handleMotionPreferenceChange = () => {
      requestParallaxUpdate();
    };

    updateParallax();

    window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
    window.addEventListener('resize', requestParallaxUpdate);
    reducedMotionQuery.addEventListener('change', handleMotionPreferenceChange);

    return () => {
      window.removeEventListener('scroll', requestParallaxUpdate);
      window.removeEventListener('resize', requestParallaxUpdate);
      reducedMotionQuery.removeEventListener('change', handleMotionPreferenceChange);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      heroImage.style.transform = '';
    };
  }, []);

  return (
    <>
      <section ref={heroSectionRef} className="relative overflow-hidden border-b border-white/35">
        {/* Ambient background */}
        <div
          aria-hidden="true"
          className="homepage-blob-a pointer-events-none absolute -left-40 top-10 size-[34rem] rounded-full bg-[var(--color-lilac)]/22 blur-3xl will-change-transform"
        />

        <div
          aria-hidden="true"
          className="homepage-blob-b pointer-events-none absolute -right-40 top-16 size-[38rem] rounded-full bg-[var(--color-powder-blue)]/20 blur-3xl will-change-transform"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[46%] size-[42rem] -translate-x-1/2 rounded-full bg-[var(--color-deep-plum)]/[0.045] blur-3xl"
        />

        <div className="page-container relative pb-11 pt-12 sm:pt-14 lg:pb-12 lg:pt-16">
          {/* Intro */}
          <div className="relative z-20 mx-auto max-w-5xl text-center">
            <ScrollReveal delay={40} distance={18} duration={650}>
              <div className="soft-chip mx-auto w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <Sparkles className="size-4" />
                One platform. Both sides connected.
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100} distance={26} duration={760}>
              <h1 className="mx-auto mt-6 max-w-5xl text-balance text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[var(--color-near-black)] sm:text-6xl lg:text-[4.8rem] xl:text-[5.25rem]">
                One platform for the event.
                <span className="block text-[var(--color-deep-plum)]">And everyone behind it.</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={180} distance={20} duration={700}>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm font-medium leading-7 text-[var(--color-charcoal)]/62 sm:text-base">
                Customers plan. Vendors deliver. Eventure keeps every decision, quotation, booking
                and commitment connected from the first idea to the final event.
              </p>
            </ScrollReveal>
          </div>

          {/* Main visual */}
          <ScrollReveal delay={170} distance={38} duration={900}>
            <div className="relative mx-auto mt-9 max-w-[72rem]">
              {/* Decorative connection line */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[-4%] right-[-4%] top-1/2 hidden h-px bg-[linear-gradient(90deg,transparent,rgba(93,58,85,0.24),rgba(93,58,85,0.24),transparent)] lg:block"
              />

              {/* Left floating identity */}
              <div className="homepage-orbit-item-a absolute -left-3 top-[18%] z-30 hidden lg:block xl:-left-14">
                <div className="flex items-center gap-3 rounded-full border border-white/65 bg-white/72 px-4 py-3 shadow-[0_18px_45px_rgba(31,27,29,0.12)] backdrop-blur-2xl">
                  <span className="grid size-9 place-items-center rounded-full bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)]">
                    <UsersRound className="size-4" />
                  </span>

                  <div>
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Customer side
                    </p>

                    <p className="mt-0.5 text-xs font-black text-[var(--color-near-black)]">
                      Plan the experience
                    </p>
                  </div>
                </div>
              </div>

              {/* Right floating identity */}
              <div className="homepage-orbit-item-b absolute -right-3 top-[18%] z-30 hidden lg:block xl:-right-14">
                <div className="flex items-center gap-3 rounded-full border border-white/65 bg-white/72 px-4 py-3 shadow-[0_18px_45px_rgba(31,27,29,0.12)] backdrop-blur-2xl">
                  <span className="grid size-9 place-items-center rounded-full bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)]">
                    <BriefcaseBusiness className="size-4" />
                  </span>

                  <div>
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Vendor side
                    </p>

                    <p className="mt-0.5 text-xs font-black text-[var(--color-near-black)]">
                      Deliver the service
                    </p>
                  </div>
                </div>
              </div>

              {/* Glow behind artwork */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-8 rounded-[4rem] bg-[linear-gradient(135deg,rgba(183,167,200,0.22),rgba(175,201,216,0.16),rgba(142,151,115,0.08))] blur-3xl"
              />

              {/* Image shell */}
              <div className="group relative rounded-[2.7rem] border border-white/70 bg-white/20 p-2.5 shadow-[0_38px_110px_rgba(31,27,29,0.19)] backdrop-blur-2xl sm:p-3">
                <div className="relative overflow-hidden rounded-[2.25rem]">
                  <div className="relative aspect-[16/7.8] overflow-hidden">
                    <div
                      ref={heroImageParallaxRef}
                      className="absolute inset-x-0 -bottom-8 -top-8 will-change-transform"
                    >
                      <img
                        src="/images/home/eventure-connected-workspace.png"
                        alt="Eventure customer and vendor workspaces displayed together on a laptop and tablet surrounded by event planning materials."
                        className="h-full w-full scale-[1.035] object-cover object-center transition-transform duration-[1600ms] ease-out group-hover:scale-[1.055]"
                      />
                    </div>

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,27,29,0)_48%,rgba(31,27,29,0.28)_100%)]"
                    />

                    {/* Mobile/tablet labels */}
                    <div className="absolute left-4 top-4 lg:hidden">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/80 px-3.5 py-2 shadow-lg backdrop-blur-xl">
                        <UsersRound className="size-3.5 text-[var(--color-deep-plum)]" />

                        <span className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[var(--color-near-black)]">
                          Customer
                        </span>
                      </div>
                    </div>

                    <div className="absolute right-4 top-4 lg:hidden">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/80 px-3.5 py-2 shadow-lg backdrop-blur-xl">
                        <BriefcaseBusiness className="size-3.5 text-[var(--color-deep-plum)]" />

                        <span className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[var(--color-near-black)]">
                          Vendor
                        </span>
                      </div>
                    </div>

                    {/* Bottom image glass message */}
                    <div className="absolute bottom-4 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 sm:bottom-5 sm:w-auto">
                      <div className="flex items-center gap-3 rounded-full border border-white/24 bg-[rgba(31,27,29,0.62)] px-4 py-3 text-white shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:px-5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-[var(--color-light-champagne)]">
                          <Sparkles className="size-3.5" />
                        </span>

                        <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-white/80 sm:text-xs">
                          Two workspaces. One connected workflow.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* image grounding shadow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-8 left-[13%] right-[13%] h-14 rounded-full bg-[rgba(31,27,29,0.15)] blur-3xl"
              />
            </div>
          </ScrollReveal>

          {/* Lower editorial area */}
          <div className="relative mx-auto mt-9 max-w-[72rem] lg:mt-10">
            {/* Giant background Eventure mark */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-8 -top-20 z-0 select-none overflow-hidden opacity-[0.065]"
            >
              <img
                src="/images/branding/eventure-logo-navbar.png"
                alt=""
                className="h-auto w-[34rem] max-w-none object-contain grayscale"
              />
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-24 text-[11rem] font-black leading-none tracking-[-0.08em] text-[var(--color-deep-plum)]/[0.025] sm:text-[15rem] lg:text-[19rem]"
            >
              E
            </div>

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:gap-16">
              <ScrollReveal direction="right" distance={24} delay={120}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-px w-9 bg-[var(--color-deep-plum)]/35" />

                    <p className="text-[0.65rem] font-black uppercase tracking-[0.23em] text-[var(--color-rosewood)]">
                      The Eventure difference
                    </p>
                  </div>

                  <h2 className="mt-4 max-w-2xl text-3xl font-black leading-[1.02] tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl lg:text-[2.8rem]">
                    Planning on one side.
                    <span className="block text-[var(--color-deep-plum)]">
                      Service delivery on the other.
                    </span>
                  </h2>

                  <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                    Eventure gives both sides their own focused workspace while keeping the
                    information between them connected, visible and moving forward.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" distance={24} delay={180}>
                <div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/register/customer"
                      className="group inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--color-rosewood),var(--color-deep-plum))] px-6 text-sm font-black text-white shadow-[0_16px_40px_rgba(93,58,85,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(93,58,85,0.34)]"
                    >
                      Plan an event
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/register/vendor"
                      className="group inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-white/65 bg-white/38 px-6 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_12px_34px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/58"
                    >
                      Join as a vendor
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </div>

                  <Link
                    to="/vendors"
                    className="group mt-4 inline-flex items-center gap-2 text-xs font-black text-[var(--color-charcoal)]/48 transition hover:text-[var(--color-deep-plum)]"
                  >
                    Browse the vendor marketplace
                    <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            {/* compact capability rail */}
            <ScrollReveal delay={260} distance={16}>
              <div className="relative z-10 mt-7 grid gap-2.5 sm:grid-cols-3">
                {[
                  ['Customer planning', 'Events, guests, budgets and decisions'],
                  ['Vendor operations', 'Requests, quotations and bookings'],
                  ['Shared progress', 'Commitments stay visible to both sides'],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="group flex items-start gap-3 rounded-[1.25rem] border border-white/55 bg-white/27 px-4 py-3.5 shadow-[0_12px_34px_rgba(31,27,29,0.045)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/42"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-dusty-olive)]/10">
                      <CheckCircle2 className="size-3.5 text-[var(--color-dusty-olive)]" />
                    </span>

                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-[var(--color-near-black)]">
                        {title}
                      </p>

                      <p className="mt-1 text-[0.68rem] font-medium leading-5 text-[var(--color-charcoal)]/50">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="page-container relative py-10 sm:py-12 lg:py-14">
        <ScrollReveal distance={32} duration={800}>
          <div className="relative overflow-hidden rounded-[2.8rem] border border-white/12 bg-[var(--color-near-black)] px-6 py-9 text-white shadow-[0_34px_100px_rgba(31,27,29,0.22)] sm:px-9 sm:py-11 lg:px-12 lg:py-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[var(--color-deep-plum)]/42 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 -right-20 size-96 rounded-full bg-[var(--color-powder-blue)]/13 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[46%] top-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.045]"
            />

            <div className="relative grid gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12">
              <div>
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-[var(--color-light-champagne)]/50" />

                  <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-[var(--color-light-champagne)]">
                    The Eventure ecosystem
                  </p>
                </div>

                <h2 className="mt-5 max-w-xl text-3xl font-black leading-[1.02] tracking-[-0.05em] sm:text-4xl lg:text-[2.8rem]">
                  Every moving part,
                  <span className="block text-[var(--color-light-champagne)]">
                    connected around the event.
                  </span>
                </h2>

                <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-white/58">
                  Customers plan. Vendors deliver. Eventure keeps the marketplace, quotations,
                  bookings and payments inside one visible process.
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                  {[
                    'Customer planning',
                    'Vendor workspace',
                    'Marketplace',
                    'Quotations',
                    'Bookings',
                    'Payments',
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-[0.7rem] font-black text-white/66 backdrop-blur-xl"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[18rem] sm:min-h-[20rem]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 size-[19rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07] sm:size-[22rem]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 size-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.09] sm:size-[16rem]"
                />

                <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                  <div className="homepage-brand-core relative grid size-40 place-items-center rounded-[2.4rem] border border-white/18 bg-white shadow-[0_26px_76px_rgba(0,0,0,0.34)] sm:size-44">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-5 rounded-[3rem] bg-[var(--color-deep-plum)]/24 blur-2xl"
                    />

                    <div className="relative text-center">
                      <img
                        src="/images/branding/eventure-logo-navbar.png"
                        alt="Eventure"
                        className="mx-auto h-12 w-auto max-w-[9rem] object-contain sm:h-14 sm:max-w-[10rem]"
                      />

                      <div className="mx-auto mt-3 h-px w-12 bg-[var(--color-deep-plum)]/15" />

                      <p className="mt-3 text-[0.55rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                        Connected platform
                      </p>
                    </div>
                  </div>
                </div>

                <div className="homepage-orbit-item-a absolute left-[2%] top-[10%] hidden sm:block">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3.5 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.16)] backdrop-blur-xl">
                    <UsersRound className="size-3.5 text-[var(--color-light-champagne)]" />
                    <span className="text-[0.7rem] font-black text-white/76">Customers</span>
                  </div>
                </div>

                <div className="homepage-orbit-item-b absolute right-[1%] top-[11%] hidden sm:block">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3.5 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.16)] backdrop-blur-xl">
                    <BriefcaseBusiness className="size-3.5 text-[var(--color-light-champagne)]" />
                    <span className="text-[0.7rem] font-black text-white/76">Vendors</span>
                  </div>
                </div>

                <div className="homepage-orbit-item-c absolute left-[0%] bottom-[12%] hidden sm:block">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3.5 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.16)] backdrop-blur-xl">
                    <MessageSquareQuote className="size-3.5 text-[var(--color-light-champagne)]" />
                    <span className="text-[0.7rem] font-black text-white/76">Quotations</span>
                  </div>
                </div>

                <div className="homepage-orbit-item-d absolute bottom-[11%] right-[0%] hidden sm:block">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3.5 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.16)] backdrop-blur-xl">
                    <CalendarCheck2 className="size-3.5 text-[var(--color-light-champagne)]" />
                    <span className="text-[0.7rem] font-black text-white/76">Bookings</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-8 border-t border-white/10 pt-7">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 shrink-0 text-[var(--color-light-champagne)]" />
                  <span className="text-xs font-bold text-white/56">One source of progress</span>
                </div>

                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 shrink-0 text-[var(--color-light-champagne)]" />
                  <span className="text-xs font-bold text-white/56">Role-specific workspaces</span>
                </div>

                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 shrink-0 text-[var(--color-light-champagne)]" />
                  <span className="text-xs font-bold text-white/56">Shared coordination</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="relative mt-10 overflow-hidden rounded-[2.5rem] border border-white/55 bg-white/20 px-5 py-8 shadow-[0_24px_70px_rgba(31,27,29,0.065)] backdrop-blur-xl sm:px-7 sm:py-9 lg:px-9">
          {/* ambient decoration */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[var(--color-lilac)]/14 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 right-[8%] size-72 rounded-full bg-[var(--color-powder-blue)]/12 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 top-0 select-none text-[11rem] font-black leading-none tracking-[-0.08em] text-[var(--color-deep-plum)]/[0.025] sm:text-[14rem]"
          >
            04
          </div>

          <div className="relative">
            {/* heading */}
            <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-12">
              <ScrollReveal direction="right" distance={24}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8 bg-[var(--color-deep-plum)]/35" />

                    <p className="text-[0.65rem] font-black uppercase tracking-[0.23em] text-[var(--color-rosewood)]">
                      A clearer journey
                    </p>
                  </div>

                  <h2 className="mt-3 max-w-lg text-3xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl">
                    From first idea
                    <span className="block text-[var(--color-deep-plum)]">to confirmed plan.</span>
                  </h2>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" distance={24} delay={80}>
                <p className="max-w-2xl text-sm font-medium leading-7 text-[var(--color-charcoal)]/62 lg:justify-self-end sm:text-base">
                  Four connected stages keep the event moving forward while every decision stays
                  visible, structured and easy to continue.
                </p>
              </ScrollReveal>
            </div>

            {/* desktop connected journey */}
            <div className="relative mt-9 hidden lg:block">
              {/* base track */}
              <div
                aria-hidden="true"
                className="absolute left-[7%] right-[7%] top-6 h-[2px] bg-[var(--color-charcoal)]/[0.08]"
              />

              {/* coloured progress track */}
              <div
                aria-hidden="true"
                className="absolute left-[7%] right-[7%] top-6 h-[2px] overflow-hidden"
              >
                <div className="homepage-journey-progress h-full w-full origin-left bg-[linear-gradient(90deg,var(--color-rosewood),var(--color-deep-plum),var(--color-dusty-olive))]" />
              </div>

              <div className="relative grid grid-cols-4 gap-4">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <ScrollReveal
                      key={step.number}
                      delay={index * 100}
                      distance={22}
                      duration={650}
                    >
                      <article className="group relative">
                        {/* node */}
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="grid size-12 place-items-center rounded-full border-[5px] border-[#f5eee5] bg-[var(--color-deep-plum)] text-[0.65rem] font-black tracking-[0.1em] text-white shadow-[0_10px_28px_rgba(93,58,85,0.24)] transition duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                            {step.number}
                          </span>

                          {index < workflowSteps.length - 1 && (
                            <ArrowRight className="mr-1 size-4 text-[var(--color-deep-plum)]/28 transition duration-300 group-hover:translate-x-1 group-hover:text-[var(--color-deep-plum)]/60" />
                          )}
                        </div>

                        {/* content */}
                        <div className="mt-5 min-h-[12rem] rounded-[1.55rem] border border-white/60 bg-white/28 p-5 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-xl transition duration-300 group-hover:-translate-y-1 group-hover:bg-white/44 group-hover:shadow-[0_22px_54px_rgba(31,27,29,0.09)]">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                              Step {index + 1}
                            </span>

                            <span className="grid size-9 place-items-center rounded-xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)] transition duration-300 group-hover:rotate-[-4deg] group-hover:bg-[var(--color-deep-plum)] group-hover:text-white">
                              <Icon className="size-4" />
                            </span>
                          </div>

                          <h3 className="mt-5 text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            {step.title}
                          </h3>

                          <p className="mt-2 text-xs font-medium leading-6 text-[var(--color-charcoal)]/60">
                            {step.description}
                          </p>
                        </div>
                      </article>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>

            {/* mobile / tablet journey */}
            <div className="relative mt-8 lg:hidden">
              <div
                aria-hidden="true"
                className="absolute bottom-5 left-[1.2rem] top-5 w-px bg-[linear-gradient(180deg,var(--color-deep-plum),rgba(93,58,85,0.12))]"
              />

              <div className="relative space-y-3">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <ScrollReveal key={step.number} delay={index * 70} distance={18} duration={620}>
                      <article className="group relative flex gap-4">
                        <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-deep-plum)] text-[0.62rem] font-black tracking-[0.08em] text-white shadow-[0_8px_22px_rgba(93,58,85,0.22)]">
                          {step.number}
                        </span>

                        <div className="flex-1 rounded-[1.4rem] border border-white/60 bg-white/30 p-4 shadow-[0_12px_34px_rgba(31,27,29,0.05)] backdrop-blur-xl">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                                Step {index + 1}
                              </p>

                              <h3 className="mt-1.5 text-base font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                                {step.title}
                              </h3>
                            </div>

                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)]">
                              <Icon className="size-4" />
                            </span>
                          </div>

                          <p className="mt-2 text-xs font-medium leading-5 text-[var(--color-charcoal)]/60">
                            {step.description}
                          </p>
                        </div>
                      </article>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>

            {/* footer */}
            <ScrollReveal delay={250} distance={14}>
              <div className="mt-7 flex flex-col gap-4 border-t border-[var(--color-charcoal)]/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold text-[var(--color-charcoal)]/48">
                    <CheckCircle2 className="size-3.5 text-[var(--color-dusty-olive)]" />
                    Structured
                  </span>

                  <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold text-[var(--color-charcoal)]/48">
                    <CheckCircle2 className="size-3.5 text-[var(--color-dusty-olive)]" />
                    Visible
                  </span>

                  <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold text-[var(--color-charcoal)]/48">
                    <CheckCircle2 className="size-3.5 text-[var(--color-dusty-olive)]" />
                    Connected
                  </span>
                </div>

                <Link
                  to="/planning-guide"
                  className="group inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
                >
                  Explore the complete planning guide
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="page-container pb-10 pt-2 sm:pb-12 sm:pt-3 lg:pb-14 lg:pt-4">
        <div className="relative overflow-hidden py-8 sm:py-10 lg:py-12">
          {/* ambient background */}
          <div
            aria-hidden="true"
            className="homepage-blob-c pointer-events-none absolute -right-28 top-8 size-96 rounded-full bg-[var(--color-lilac)]/14 blur-3xl will-change-transform"
          />

          <div
            aria-hidden="true"
            className="homepage-blob-d pointer-events-none absolute -bottom-28 -left-28 size-96 rounded-full bg-[var(--color-powder-blue)]/12 blur-3xl will-change-transform"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[44%] size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-deep-plum)]/[0.035] blur-3xl"
          />

          {/* section intro */}
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <ScrollReveal delay={30} distance={18} duration={650}>
              <div className="soft-chip mx-auto w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <Sparkles className="size-4" />
                Why Eventure exists
              </div>
            </ScrollReveal>

            <ScrollReveal delay={90} distance={24} duration={720}>
              <h2 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl lg:text-[3.65rem]">
                Two sides of an event.
                <span className="block text-[var(--color-deep-plum)]">One place between them.</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={150} distance={18} duration={680}>
              <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                Customers make the plans. Vendors bring them to life. Eventure keeps the
                conversations, decisions and commitments moving through one connected process.
              </p>
            </ScrollReveal>
          </div>

          {/* connection composition */}
          <ScrollReveal delay={170} distance={30} duration={850}>
            <div className="relative mx-auto mt-10 max-w-[69rem] lg:mt-12">
              {/* large subtle background word */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 select-none text-[8rem] font-black uppercase tracking-[-0.075em] text-[var(--color-deep-plum)]/[0.022] lg:block xl:text-[10rem]"
              >
                CONNECTED
              </div>

              {/* desktop connection track */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[15%] right-[15%] top-1/2 hidden h-px -translate-y-1/2 lg:block"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(93,58,85,0.22),rgba(93,58,85,0.22),transparent)]" />

                <div className="homepage-connection-pulse absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-[var(--color-deep-plum)] shadow-[0_0_18px_rgba(93,58,85,0.5)]" />
              </div>

              <div className="relative grid gap-5 lg:grid-cols-[1fr_0.62fr_1fr] lg:items-center lg:gap-7">
                {/* customer side */}
                <ScrollReveal direction="right" distance={28} delay={80}>
                  <article className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/30 p-6 shadow-[0_22px_64px_rgba(31,27,29,0.075)] backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:bg-white/43 hover:shadow-[0_30px_76px_rgba(31,27,29,0.11)] sm:p-7">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-16 -top-16 size-52 rounded-full bg-[var(--color-lilac)]/17 blur-3xl transition duration-500 group-hover:bg-[var(--color-lilac)]/24"
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-20 -right-16 size-48 rounded-full bg-[var(--color-powder-blue)]/10 blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-center justify-between gap-5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_30px_rgba(93,58,85,0.22)] transition duration-300 group-hover:-rotate-3 group-hover:scale-105">
                            <UsersRound className="size-5" />
                          </span>

                          <div>
                            <p className="text-[0.62rem] font-black uppercase tracking-[0.19em] text-[var(--color-rosewood)]">
                              Customer
                            </p>

                            <p className="mt-0.5 text-sm font-black text-[var(--color-near-black)]">
                              Plans the event
                            </p>
                          </div>
                        </div>

                        <span className="text-[2.7rem] font-black leading-none tracking-[-0.08em] text-[var(--color-deep-plum)]/[0.07]">
                          01
                        </span>
                      </div>

                      <div className="my-6 h-px bg-[var(--color-charcoal)]/[0.07]" />

                      <h3 className="max-w-sm text-2xl font-black leading-[1.08] tracking-[-0.04em] text-[var(--color-near-black)]">
                        Starts with the vision.
                      </h3>

                      <p className="mt-3 max-w-md text-sm font-medium leading-6 text-[var(--color-charcoal)]/62">
                        Create the event, organise the details, discover vendors and decide what the
                        experience should become.
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {['Events', 'Guests', 'Budget', 'Tasks'].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/60 bg-white/42 px-3 py-2 text-[0.66rem] font-black text-[var(--color-charcoal)]/58 shadow-[0_8px_20px_rgba(31,27,29,0.035)]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                </ScrollReveal>

                {/* Eventure bridge */}
                <ScrollReveal distance={20} delay={170}>
                  <div className="relative flex flex-col items-center py-3 lg:py-0">
                    {/* mobile connector */}
                    <div
                      aria-hidden="true"
                      className="absolute bottom-0 top-0 left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(93,58,85,0.18),transparent)] lg:hidden"
                    />

                    {/* outer rings */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 size-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-deep-plum)]/[0.055]"
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-deep-plum)]/[0.075]"
                    />

                    <div className="homepage-brand-core relative z-10">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-7 rounded-full bg-[var(--color-deep-plum)]/10 blur-2xl"
                      />

                      <div className="relative grid size-36 place-items-center overflow-hidden rounded-[2.25rem] border border-white/75 bg-[rgba(255,255,255,0.70)] shadow-[0_26px_68px_rgba(31,27,29,0.15)] backdrop-blur-2xl sm:size-40">
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -left-10 -top-10 size-28 rounded-full bg-[var(--color-lilac)]/24 blur-2xl"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-10 -right-10 size-28 rounded-full bg-[var(--color-powder-blue)]/18 blur-2xl"
                        />

                        <div className="relative text-center">
                          <img
                            src="/images/branding/eventure-logo-navbar.png"
                            alt="Eventure"
                            className="mx-auto h-16 w-auto max-w-[11.5rem] object-contain sm:h-18 sm:max-w-[12.5rem]"
                          />

                          <div className="mx-auto mt-3 h-px w-10 bg-[var(--color-deep-plum)]/15" />

                          <p className="mt-3 text-[0.52rem] font-black uppercase tracking-[0.19em] text-[var(--color-rosewood)]">
                            Connects both
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 mt-4 rounded-full border border-white/65 bg-white/50 px-4 py-2 shadow-[0_10px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                      <p className="text-center text-[0.58rem] font-black uppercase tracking-[0.17em] text-[var(--color-deep-plum)]">
                        Shared workflow
                      </p>
                    </div>
                  </div>
                </ScrollReveal>

                {/* vendor side */}
                <ScrollReveal direction="left" distance={28} delay={120}>
                  <article className="group relative overflow-hidden rounded-[2rem] border border-white/12 bg-[var(--color-near-black)] p-6 text-white shadow-[0_26px_72px_rgba(31,27,29,0.19)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_34px_84px_rgba(31,27,29,0.25)] sm:p-7">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-[var(--color-deep-plum)]/38 blur-3xl transition duration-500 group-hover:bg-[var(--color-deep-plum)]/48"
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full bg-[var(--color-powder-blue)]/10 blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-center justify-between gap-5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-[var(--color-light-champagne)] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition duration-300 group-hover:rotate-3 group-hover:scale-105">
                            <BriefcaseBusiness className="size-5" />
                          </span>

                          <div>
                            <p className="text-[0.62rem] font-black uppercase tracking-[0.19em] text-[var(--color-light-champagne)]">
                              Vendor
                            </p>

                            <p className="mt-0.5 text-sm font-black text-white">
                              Delivers the service
                            </p>
                          </div>
                        </div>

                        <span className="text-[2.7rem] font-black leading-none tracking-[-0.08em] text-white/[0.07]">
                          02
                        </span>
                      </div>

                      <div className="my-6 h-px bg-white/[0.09]" />

                      <h3 className="max-w-sm text-2xl font-black leading-[1.08] tracking-[-0.04em] text-white">
                        Turns plans into action.
                      </h3>

                      <p className="mt-3 max-w-md text-sm font-medium leading-6 text-white/58">
                        Respond to opportunities, prepare quotations, confirm availability and
                        coordinate the services behind the event.
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {['Requests', 'Quotations', 'Bookings', 'Availability'].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-[0.66rem] font-black text-white/62"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              </div>
            </div>
          </ScrollReveal>

          {/* Eventure handles the middle */}
          <ScrollReveal delay={240} distance={20} duration={720}>
            <div className="relative mx-auto mt-7 max-w-[69rem]">
              <div className="grid gap-3 sm:grid-cols-3">
                {whyEventureItems.map((item, index) => (
                  <article
                    key={item.title}
                    className="group relative overflow-hidden rounded-[1.4rem] border border-white/55 bg-white/24 px-4 py-4 shadow-[0_12px_34px_rgba(31,27,29,0.045)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/40"
                  >
                    <div className="relative flex items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-deep-plum)]/8 text-[0.6rem] font-black tracking-[0.08em] text-[var(--color-deep-plum)] transition duration-300 group-hover:bg-[var(--color-deep-plum)] group-hover:text-white">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div>
                        <h3 className="text-xs font-black tracking-[-0.015em] text-[var(--color-near-black)]">
                          {item.title}
                        </h3>

                        <p className="mt-1.5 text-[0.7rem] font-medium leading-5 text-[var(--color-charcoal)]/55">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* closing action rail */}
          <ScrollReveal delay={300} distance={16} duration={680}>
            <div className="relative mx-auto mt-7 flex max-w-[69rem] flex-col gap-5 border-t border-[var(--color-charcoal)]/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-[var(--color-dusty-olive)]/10">
                  <CheckCircle2 className="size-4 text-[var(--color-dusty-olive)]" />
                </span>

                <p className="text-xs font-bold text-[var(--color-charcoal)]/52">
                  Different workspaces. Shared progress. One event.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/register/customer"
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-deep-plum)]/20 bg-[linear-gradient(135deg,var(--color-rosewood),var(--color-deep-plum))] px-5 text-xs font-black !text-white shadow-[0_14px_34px_rgba(93,58,85,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(93,58,85,0.38)]"
                >
                  Plan an event
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/register/vendor"
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/60 bg-white/32 px-5 text-xs font-black text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.045)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/50"
                >
                  Join as a vendor
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/35 bg-white/[0.10]">
        {/* ambient background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-16 size-[32rem] rounded-full bg-[var(--color-lilac)]/12 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 bottom-0 size-[30rem] rounded-full bg-[var(--color-powder-blue)]/12 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-deep-plum)]/[0.025] blur-3xl"
        />

        <div className="page-container relative py-11 sm:py-13 lg:py-16">
          {/* heading */}
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
            <ScrollReveal direction="right" distance={26}>
              <div>
                <div className="flex items-center gap-3">
                  <span className="h-px w-9 bg-[var(--color-deep-plum)]/35" />

                  <p className="text-[0.66rem] font-black uppercase tracking-[0.23em] text-[var(--color-rosewood)]">
                    Purpose-built workspaces
                  </p>
                </div>

                <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                  Different roles.
                  <span className="block text-[var(--color-deep-plum)]">
                    Tools that fit the work.
                  </span>
                </h2>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="left" distance={26} delay={90} className="lg:justify-self-end">
              <p className="max-w-2xl text-sm font-medium leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                Customers and vendors do different jobs. Eventure gives each side the tools it
                actually needs while keeping the information between them connected.
              </p>
            </ScrollReveal>
          </div>

          {/* workspace system */}
          <ScrollReveal delay={140} distance={30} duration={820}>
            <div className="relative mt-9 overflow-hidden rounded-[2.6rem] border border-white/60 bg-white/22 p-5 shadow-[0_28px_82px_rgba(31,27,29,0.08)] backdrop-blur-2xl sm:p-7 lg:p-8">
              {/* decorative background */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-[var(--color-lilac)]/15 blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -right-20 size-72 rounded-full bg-[var(--color-powder-blue)]/15 blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[70%] w-px -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(180deg,transparent,rgba(93,58,85,0.14),transparent)] lg:block"
              />

              <div className="relative grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch lg:gap-5">
                {/* CUSTOMER WORKSPACE */}
                <div className="group relative overflow-hidden rounded-[2rem] border border-white/65 bg-white/34 p-5 shadow-[0_18px_52px_rgba(31,27,29,0.055)] backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:bg-white/46 hover:shadow-[0_26px_66px_rgba(31,27,29,0.09)] sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-[var(--color-lilac)]/18 blur-3xl transition duration-500 group-hover:bg-[var(--color-lilac)]/26"
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(93,58,85,0.22)] transition duration-300 group-hover:-rotate-3 group-hover:scale-105">
                          <UsersRound className="size-5" />
                        </span>

                        <div>
                          <p className="text-[0.6rem] font-black uppercase tracking-[0.19em] text-[var(--color-rosewood)]">
                            Customer workspace
                          </p>

                          <p className="mt-0.5 text-sm font-black text-[var(--color-near-black)]">
                            Plan and organise
                          </p>
                        </div>
                      </div>

                      <span className="text-[2.5rem] font-black leading-none tracking-[-0.08em] text-[var(--color-deep-plum)]/[0.065]">
                        01
                      </span>
                    </div>

                    <div className="my-5 h-px bg-[var(--color-charcoal)]/[0.07]" />

                    <p className="max-w-lg text-xs font-medium leading-6 text-[var(--color-charcoal)]/57">
                      Everything needed to shape the event, organise the people around it and keep
                      planning decisions under control.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-2.5">
                      {[
                        {
                          label: 'Events',
                          description: 'Create and manage',
                          icon: CalendarDays,
                        },
                        {
                          label: 'Guests',
                          description: 'Invite and track',
                          icon: UsersRound,
                        },
                        {
                          label: 'Budget',
                          description: 'Plan event costs',
                          icon: WalletCards,
                        },
                        {
                          label: 'Tasks',
                          description: 'Stay on schedule',
                          icon: ClipboardCheck,
                        },
                        {
                          label: 'Invitations',
                          description: 'Design and send',
                          icon: Sparkles,
                        },
                        {
                          label: 'Documents',
                          description: 'Keep files close',
                          icon: FileCheck2,
                        },
                      ].map(({ label, description, icon: Icon }, index) => (
                        <div
                          key={label}
                          className={`group/item relative overflow-hidden rounded-[1.25rem] border px-3.5 py-3.5 transition duration-300 hover:-translate-y-0.5 ${
                            index === 0
                              ? 'border-[var(--color-deep-plum)]/10 bg-[var(--color-deep-plum)]/[0.055]'
                              : 'border-white/55 bg-white/32 hover:bg-white/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)] transition duration-300 group-hover/item:bg-[var(--color-deep-plum)] group-hover/item:text-white">
                              <Icon className="size-3.5" />
                            </span>

                            <div>
                              <p className="text-[0.7rem] font-black text-[var(--color-near-black)]">
                                {label}
                              </p>

                              <p className="mt-0.5 text-[0.59rem] font-medium leading-4 text-[var(--color-charcoal)]/46">
                                {description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Link
                      to="/register/customer"
                      className="group/link mt-6 inline-flex items-center gap-2 text-xs font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
                    >
                      Start a customer workspace
                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>

                {/* CENTRAL CONNECTION */}
                <div className="relative flex min-w-[9rem] items-center justify-center py-3 lg:py-0">
                  {/* horizontal connector - desktop */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[-2rem] right-[-2rem] top-1/2 hidden h-px -translate-y-1/2 lg:block"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(93,58,85,0.10),rgba(93,58,85,0.28),rgba(93,58,85,0.10))]" />

                    <div className="homepage-connection-pulse absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-[var(--color-deep-plum)] shadow-[0_0_18px_rgba(93,58,85,0.48)]" />
                  </div>

                  {/* vertical connector - mobile */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-[-1.5rem] top-[-1.5rem] left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(93,58,85,0.05),rgba(93,58,85,0.22),rgba(93,58,85,0.05))] lg:hidden"
                  />

                  <div className="homepage-brand-core relative z-10">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-8 rounded-full bg-[var(--color-deep-plum)]/10 blur-2xl"
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-deep-plum)]/[0.06]"
                    />

                    <div className="relative grid size-28 place-items-center rounded-[2rem] border border-white/75 bg-white/72 shadow-[0_20px_58px_rgba(31,27,29,0.13)] backdrop-blur-2xl sm:size-32">
                      <div className="text-center">
                        <img
                          src="/images/branding/eventure-logo-navbar.png"
                          alt="Eventure"
                          className="mx-auto h-16 w-auto max-w-[11.5rem] object-contain sm:h-18.1 sm:max-w-[12.55rem]"
                        />

                        <div className="mx-auto mt-2.5 h-px w-8 bg-[var(--color-deep-plum)]/15" />

                        <p className="mt-2.5 text-[0.48rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                          Shared data
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VENDOR WORKSPACE */}
                <div className="group relative overflow-hidden rounded-[2rem] border border-white/12 bg-[var(--color-near-black)] p-5 text-white shadow-[0_22px_62px_rgba(31,27,29,0.18)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_76px_rgba(31,27,29,0.24)] sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-[var(--color-deep-plum)]/36 blur-3xl transition duration-500 group-hover:bg-[var(--color-deep-plum)]/48"
                  />

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full bg-[var(--color-powder-blue)]/10 blur-3xl"
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-[var(--color-light-champagne)] shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition duration-300 group-hover:rotate-3 group-hover:scale-105">
                          <BriefcaseBusiness className="size-5" />
                        </span>

                        <div>
                          <p className="text-[0.6rem] font-black uppercase tracking-[0.19em] text-[var(--color-light-champagne)]">
                            Vendor workspace
                          </p>

                          <p className="mt-0.5 text-sm font-black text-white">
                            Respond and deliver
                          </p>
                        </div>
                      </div>

                      <span className="text-[2.5rem] font-black leading-none tracking-[-0.08em] text-white/[0.065]">
                        02
                      </span>
                    </div>

                    <div className="my-5 h-px bg-white/[0.09]" />

                    <p className="max-w-lg text-xs font-medium leading-6 text-white/55">
                      Tools for presenting the business, responding to opportunities and managing
                      the services customers have booked.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-2.5">
                      {[
                        {
                          label: 'Profile',
                          description: 'Present the business',
                          icon: BriefcaseBusiness,
                        },
                        {
                          label: 'Portfolio',
                          description: 'Showcase the work',
                          icon: Images,
                        },
                        {
                          label: 'Quotations',
                          description: 'Prepare proposals',
                          icon: MessageSquareQuote,
                        },
                        {
                          label: 'Availability',
                          description: 'Control the calendar',
                          icon: CalendarDays,
                        },
                        {
                          label: 'Bookings',
                          description: 'Manage commitments',
                          icon: CalendarCheck2,
                        },
                        {
                          label: 'Reviews',
                          description: 'Build credibility',
                          icon: CheckCircle2,
                        },
                      ].map(({ label, description, icon: Icon }, index) => (
                        <div
                          key={label}
                          className={`group/item relative overflow-hidden rounded-[1.25rem] border px-3.5 py-3.5 transition duration-300 hover:-translate-y-0.5 ${
                            index === 2
                              ? 'border-white/14 bg-white/[0.11]'
                              : 'border-white/[0.08] bg-white/[0.055] hover:bg-white/[0.09]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-[var(--color-light-champagne)] transition duration-300 group-hover/item:bg-white group-hover/item:text-[var(--color-deep-plum)]">
                              <Icon className="size-3.5" />
                            </span>

                            <div>
                              <p className="text-[0.7rem] font-black text-white/88">{label}</p>

                              <p className="mt-0.5 text-[0.59rem] font-medium leading-4 text-white/42">
                                {description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Link
                      to="/register/vendor"
                      className="group/link mt-6 inline-flex items-center gap-2 text-xs font-black text-[var(--color-light-champagne)] transition hover:text-white"
                    >
                      Open a vendor workspace
                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* SHARED INFORMATION RAIL */}
              <div className="relative mt-5 overflow-hidden rounded-[1.55rem] border border-white/55 bg-white/25 px-4 py-4 shadow-[0_12px_34px_rgba(31,27,29,0.045)] backdrop-blur-xl sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-dusty-olive)]/10">
                      <CheckCircle2 className="size-4 text-[var(--color-dusty-olive)]" />
                    </span>

                    <div>
                      <p className="text-[0.67rem] font-black uppercase tracking-[0.12em] text-[var(--color-near-black)]">
                        Shared information. Role-specific tools.
                      </p>

                      <p className="mt-1 text-[0.65rem] font-medium text-[var(--color-charcoal)]/48">
                        The workspace changes. The event context does not.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['Requests', 'Quotations', 'Bookings', 'Payments', 'Progress'].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/60 bg-white/38 px-3 py-2 text-[0.62rem] font-black text-[var(--color-charcoal)]/56"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="page-container py-10 sm:py-12 lg:py-14">
        <ScrollReveal distance={34} duration={800}>
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
                  Eventure gives each commitment, conversation and transaction a visible place in
                  the process, so customers and vendors always know what has happened and what needs
                  attention next.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {platformHighlights.map(({ icon: Icon, title, text, tone }, index) => (
                  <ScrollReveal key={title} delay={index * 100} distance={26} duration={680}>
                    <article className="group relative h-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/32 p-6 shadow-[0_20px_58px_rgba(31,27,29,0.07)] transition duration-300 hover:-translate-y-1 hover:bg-white/44 hover:shadow-[0_28px_70px_rgba(31,27,29,0.12)] sm:p-7">
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
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="page-container pb-12 sm:pb-14 lg:pb-16">
        <ScrollReveal distance={36} duration={820}>
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
                  Create your workspace, discover the right vendors and keep every important
                  decision visible from the beginning.
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
        </ScrollReveal>
      </section>

      <style>{`
        @keyframes homepageBlobA {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(10px, -12px, 0) scale(1.035);
          }
        }

        @keyframes homepageBlobB {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-12px, 9px, 0) scale(1.025);
          }
        }

        @keyframes homepageBlobC {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-8px, 11px, 0) scale(1.04);
          }
        }

        @keyframes homepageBlobD {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(11px, -8px, 0) scale(1.03);
          }
        }

        .homepage-blob-a {
          animation: homepageBlobA 19s ease-in-out infinite;
        }

        .homepage-blob-b {
          animation: homepageBlobB 22s ease-in-out infinite;
          animation-delay: -7s;
        }

        .homepage-blob-c {
          animation: homepageBlobC 24s ease-in-out infinite;
          animation-delay: -11s;
        }

        .homepage-blob-d {
          animation: homepageBlobD 21s ease-in-out infinite;
          animation-delay: -5s;
        }

        @keyframes homepageBrandCore {
  0%,
  100% {
    transform: translate3d(0, -3px, 0);
  }

  50% {
    transform: translate3d(0, 6px, 0);
  }
}

@keyframes homepageOrbitA {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(-1deg);
  }

  50% {
    transform: translate3d(10px, -8px, 0) rotate(1deg);
  }
}

@keyframes homepageOrbitB {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(1deg);
  }

  50% {
    transform: translate3d(-9px, 8px, 0) rotate(-1deg);
  }
}

@keyframes homepageOrbitC {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(8px, 10px, 0);
  }
}

@keyframes homepageOrbitD {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(-10px, -7px, 0);
  }
}

.homepage-brand-core {
  animation: homepageBrandCore 6s ease-in-out infinite;
}

.homepage-orbit-item-a {
  animation: homepageOrbitA 8s ease-in-out infinite;
}

.homepage-orbit-item-b {
  animation: homepageOrbitB 9s ease-in-out infinite;
  animation-delay: -3s;
}

.homepage-orbit-item-c {
  animation: homepageOrbitC 10s ease-in-out infinite;
  animation-delay: -5s;
}

.homepage-orbit-item-d {
  animation: homepageOrbitD 8.5s ease-in-out infinite;
  animation-delay: -2s;
}

.homepage-orbit-item-e {
  animation: homepageOrbitA 9.5s ease-in-out infinite;
  animation-delay: -6s;
}

.homepage-orbit-item-f {
  animation: homepageOrbitB 10.5s ease-in-out infinite;
  animation-delay: -4s;
}

@keyframes homepageConnectionPulse {
  0% {
    left: 0%;
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) scale(0.7);
  }

  12% {
    opacity: 1;
  }

  50% {
    transform: translate3d(-50%, -50%, 0) scale(1.15);
  }

  88% {
    opacity: 1;
  }

  100% {
    left: 100%;
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) scale(0.7);
  }
}

.homepage-connection-pulse {
  animation: homepageConnectionPulse 4.8s ease-in-out infinite;
}

@keyframes homepageJourneyProgress {
  0% {
    transform: scaleX(0);
    opacity: 0;
  }

  18% {
    opacity: 1;
  }

  100% {
    transform: scaleX(1);
    opacity: 1;
  }
}

.homepage-journey-progress {
  animation: homepageJourneyProgress 1.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .homepage-blob-a,
  .homepage-blob-b,
  .homepage-blob-c,
  .homepage-blob-d,
  .homepage-brand-core,
  .homepage-orbit-item-a,
  .homepage-orbit-item-b,
  .homepage-orbit-item-c,
  .homepage-orbit-item-d,
  .homepage-orbit-item-e,
  .homepage-orbit-item-f,
  .homepage-connection-pulse,
  .homepage-journey-progress {
    animation: none;
  }
}
      `}</style>
    </>
  );
}
