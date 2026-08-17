import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleAlert,
  FileText,
  ImagePlus,
  Images,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Palette,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../features/auth/auth.api';
import { clearAuthTokens } from '../features/auth/auth.storage';
import { getVendorBookings } from '../features/bookings/booking.api';
import {
  getNotifications,
  getUnreadNotificationCount,
} from '../features/notifications/notification.api';
import { getVendorQuotationRequests } from '../features/quotationRequests/quotationRequest.api';
import {
  getVendorAvailability,
  getVendorOnboardingProfile,
  getVendorPortfolio,
} from '../features/vendors/vendor.api';
import { VendorBookingCard } from '../features/vendors/components/VendorBookingCard';
import { VendorOnboardingCard } from '../features/vendors/components/VendorOnboardingCard';
import { VendorQuickActions } from '../features/vendors/components/VendorQuickActions';
import { VendorQuotationCard } from '../features/vendors/components/VendorQuotationCard';
import { VendorStatCard } from '../features/vendors/components/VendorStatCard';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

const getErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load your vendor workspace. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load your vendor workspace. Please try again.'
  );
};

const getAvailabilityRange = () => {
  const from = new Date();
  const to = new Date();

  to.setDate(to.getDate() + 30);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

const getInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'EV';

const vendorLogoMap: Record<string, string> = {
  'luna-frame-studio': '/images/vendors/logos/luna-frame-studio.png',
  'velvet-moments': '/images/vendors/logos/velvet-moments.png',
  'aroma-catering': '/images/vendors/logos/aroma-catering.png',
  'sweet-layers': '/images/vendors/logos/sweet-layers.png',
  'bloom-atelier': '/images/vendors/logos/bloom-atelier.png',
  'echo-entertainment': '/images/vendors/logos/echo-entertainment.png',
  'elite-transport': '/images/vendors/logos/elite-transport.png',
  'grand-horizon-ballroom': '/images/vendors/logos/grand-horizon-ballroom.png',
};

const createVendorSlug = (businessName: string) =>
  businessName
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function VendorDashboardPage() {
  const navigate = useNavigate();
  const availabilityRange = useMemo(() => getAvailabilityRange(), []);
  const workspaceContentRef = useRef<HTMLDivElement>(null);
  const heroImageParallaxRef = useRef<HTMLImageElement>(null);
  const [activePortfolioSlide, setActivePortfolioSlide] = useState(0);

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });

  const onboardingQuery = useQuery({
    queryKey: ['vendors', 'me', 'onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const portfolioQuery = useQuery({
    queryKey: ['vendors', 'me', 'portfolio'],
    queryFn: getVendorPortfolio,
  });

  const portfolioSlides = useMemo(
    () => (portfolioQuery.data ?? []).filter((item) => item.imageUrl),
    [portfolioQuery.data],
  );

  const availabilityQuery = useQuery({
    queryKey: ['vendors', 'me', 'availability', availabilityRange.from, availabilityRange.to],
    queryFn: () => getVendorAvailability(availabilityRange),
  });

  const recentQuotationRequestsQuery = useQuery({
    queryKey: ['quotation-requests', 'vendor', 'recent'],
    queryFn: () =>
      getVendorQuotationRequests({
        page: 1,
        limit: 4,
        sort: 'newest',
      }),
  });

  const pendingQuotationRequestsQuery = useQuery({
    queryKey: ['quotation-requests', 'vendor', 'pending-count'],
    queryFn: async () => {
      const [sent, viewed] = await Promise.all([
        getVendorQuotationRequests({
          status: 'SENT',
          page: 1,
          limit: 1,
        }),
        getVendorQuotationRequests({
          status: 'VIEWED',
          page: 1,
          limit: 1,
        }),
      ]);

      return sent.pagination.total + viewed.pagination.total;
    },
  });

  const recentBookingsQuery = useQuery({
    queryKey: ['bookings', 'vendor', 'recent'],
    queryFn: () =>
      getVendorBookings({
        page: 1,
        limit: 4,
        sort: 'service_soonest',
      }),
  });

  const awaitingBookingsQuery = useQuery({
    queryKey: ['bookings', 'vendor', 'awaiting-count'],
    queryFn: async () => {
      const result = await getVendorBookings({
        status: 'AWAITING_VENDOR_CONFIRMATION',
        page: 1,
        limit: 1,
      });

      return result.pagination.total;
    },
  });

  const activeBookingsQuery = useQuery({
    queryKey: ['bookings', 'vendor', 'active-count'],
    queryFn: async () => {
      const [confirmed, depositPending, active] = await Promise.all([
        getVendorBookings({
          status: 'CONFIRMED',
          page: 1,
          limit: 1,
        }),
        getVendorBookings({
          status: 'DEPOSIT_PENDING',
          page: 1,
          limit: 1,
        }),
        getVendorBookings({
          status: 'ACTIVE',
          page: 1,
          limit: 1,
        }),
      ]);

      return confirmed.pagination.total + depositPending.pagination.total + active.pagination.total;
    },
  });

  const unreadNotificationsQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
  });

  const recentNotificationsQuery = useQuery({
    queryKey: ['notifications', 'vendor-dashboard', 'recent'],
    queryFn: () =>
      getNotifications({
        page: 1,
        limit: 5,
        sort: 'newest',
        status: 'all',
      }),
  });

  const handleLogout = () => {
    clearAuthTokens();
    navigate('/login', { replace: true });
  };

  const queries = [
    currentUserQuery,
    onboardingQuery,
    portfolioQuery,
    availabilityQuery,
    recentQuotationRequestsQuery,
    pendingQuotationRequestsQuery,
    recentBookingsQuery,
    awaitingBookingsQuery,
    activeBookingsQuery,
    unreadNotificationsQuery,
    recentNotificationsQuery,
  ];

  const isLoading = queries.some((query) => query.isLoading);
  const queryError = queries.find((query) => query.error)?.error;

  useEffect(() => {
    const root = workspaceContentRef.current;

    if (!root) {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealElements = Array.from(root.querySelectorAll<HTMLElement>('[data-vendor-reveal]'));

    if (reducedMotionQuery.matches) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          element.classList.add('is-visible');
          observer.unobserve(element);
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [isLoading]);

  useEffect(() => {
    const heroImage = heroImageParallaxRef.current;

    if (!heroImage) {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrameId: number | null = null;

    const updateHeroParallax = () => {
      if (reducedMotionQuery.matches) {
        heroImage.style.transform = '';
        animationFrameId = null;
        return;
      }

      const rect = heroImage.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const progress = Math.min(
        Math.max((viewportHeight - rect.top) / (viewportHeight + rect.height), 0),
        1,
      );
      const offset = 10 - progress * 20;

      heroImage.style.transform = `scale(1.04) translate3d(0, ${offset}px, 0)`;
      animationFrameId = null;
    };

    const requestUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateHeroParallax);
    };

    updateHeroParallax();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      heroImage.style.transform = '';
    };
  }, [isLoading]);

  useEffect(() => {
    if (portfolioSlides.length <= 1) {
      setActivePortfolioSlide(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setActivePortfolioSlide((currentSlide) =>
        currentSlide + 1 >= portfolioSlides.length ? 0 : currentSlide + 1,
      );
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [portfolioSlides.length]);

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="state-surface w-full max-w-3xl">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />
            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Preparing your vendor workspace
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading your profile, quotation requests, bookings, portfolio, and business activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    queryError ||
    !currentUserQuery.data ||
    !onboardingQuery.data ||
    !portfolioQuery.data ||
    !availabilityQuery.data ||
    !recentQuotationRequestsQuery.data ||
    pendingQuotationRequestsQuery.data === undefined ||
    !recentBookingsQuery.data ||
    awaitingBookingsQuery.data === undefined ||
    activeBookingsQuery.data === undefined ||
    !unreadNotificationsQuery.data ||
    !recentNotificationsQuery.data
  ) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="state-surface w-full max-w-3xl">
          <div className="max-w-lg">
            <div className="icon-tile mx-auto">
              <CircleAlert className="size-7" />
            </div>
            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Vendor dashboard unavailable
            </p>
            <p className="section-description mx-auto">{getErrorMessage(queryError)}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn-primary text-sm font-bold"
                onClick={() => {
                  void Promise.all(queries.map((query) => query.refetch()));
                }}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn-secondary text-sm font-bold"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = currentUserQuery.data;
  const onboarding = onboardingQuery.data;
  const portfolio = portfolioQuery.data;
  const availability = availabilityQuery.data;
  const quotationRequests = recentQuotationRequestsQuery.data.quotationRequests;
  const recentBookings = recentBookingsQuery.data.bookings;
  const notifications = recentNotificationsQuery.data.notifications;

  const pendingQuotationCount = pendingQuotationRequestsQuery.data;
  const awaitingBookingCount = awaitingBookingsQuery.data;
  const activeBookingCount = activeBookingsQuery.data;
  const unreadNotificationCount = unreadNotificationsQuery.data.unreadCount;
  const scheduledRangeCount = availability.blocks.length + availability.bookings.length;
  const featuredPortfolioItem =
    portfolio.find((item) => item.isFeatured && item.imageUrl) ??
    portfolio.find((item) => item.imageUrl) ??
    null;

  const heroPortfolioItem =
    portfolio.find(
      (item) => item.imageUrl && featuredPortfolioItem && item.id !== featuredPortfolioItem.id,
    ) ??
    featuredPortfolioItem ??
    null;

  const businessBackgroundUrl = featuredPortfolioItem?.imageUrl ?? null;
  const businessCoverUrl = heroPortfolioItem?.imageUrl ?? null;

  const businessInitials = getInitials(onboarding.profile.businessName);
  const businessSlug = createVendorSlug(onboarding.profile.businessName);
  const businessLogoUrl = vendorLogoMap[businessSlug] ?? null;

  const activePortfolioItem = portfolioSlides[activePortfolioSlide] ?? portfolioSlides[0] ?? null;

  const stats = [
    {
      label: 'Profile completion',
      value: `${onboarding.completion.percentage}%`,
      helper:
        onboarding.profile.verificationStatus === 'APPROVED'
          ? 'Your vendor profile is verified'
          : `${onboarding.completion.completedFields} of ${onboarding.completion.totalFields} required fields complete`,
      icon: ShieldCheck,
      tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
    },
    {
      label: 'Pending requests',
      value: pendingQuotationCount,
      helper: `${awaitingBookingCount} ${
        awaitingBookingCount === 1 ? 'booking awaits' : 'bookings await'
      } your response`,
      icon: FileText,
      tone: 'bg-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]',
    },
    {
      label: 'Active bookings',
      value: activeBookingCount,
      helper: `${scheduledRangeCount} scheduled ${
        scheduledRangeCount === 1 ? 'range' : 'ranges'
      } in the next 30 days`,
      icon: BriefcaseBusiness,
      tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
    },
    {
      label: 'Portfolio images',
      value: portfolio.length,
      helper: `${portfolio.filter((item) => item.isFeatured).length} featured ${
        portfolio.filter((item) => item.isFeatured).length === 1 ? 'image' : 'images'
      }`,
      icon: Images,
      tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
    },
  ];

  return (
    <div className="workspace-shell relative">
      {businessBackgroundUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[20rem] right-0 z-0 hidden h-[68rem] w-[72vw] min-w-[60rem] overflow-hidden lg:block"
          style={{
            WebkitMaskImage:
              'linear-gradient(180deg, black 0%, black 56%, rgba(0,0,0,0.96) 64%, rgba(0,0,0,0.78) 73%, rgba(0,0,0,0.48) 82%, rgba(0,0,0,0.20) 91%, transparent 100%)',
            maskImage:
              'linear-gradient(180deg, black 0%, black 56%, rgba(0,0,0,0.96) 64%, rgba(0,0,0,0.78) 73%, rgba(0,0,0,0.48) 82%, rgba(0,0,0,0.20) 91%, transparent 100%)',
          }}
        >
          <img
            src={businessBackgroundUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            style={{
              objectPosition: '76% 28%',
              opacity: 0.64,
              filter: 'saturate(1.02) contrast(1.02)',
              WebkitMaskImage:
                'radial-gradient(ellipse 138% 126% at 96% 2%, black 0%, black 56%, rgba(0,0,0,0.88) 69%, rgba(0,0,0,0.58) 82%, rgba(0,0,0,0.22) 92%, transparent 100%)',
              maskImage:
                'radial-gradient(ellipse 138% 126% at 96% 2%, black 0%, black 56%, rgba(0,0,0,0.88) 69%, rgba(0,0,0,0.58) 82%, rgba(0,0,0,0.22) 92%, transparent 100%)',
            }}
          />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,239,233,0.94)_0%,rgba(246,239,233,0.62)_18%,rgba(246,239,233,0.24)_38%,rgba(246,239,233,0.08)_55%,rgba(246,239,233,0.015)_74%,transparent_100%)]" />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,239,233,0.02)_0%,rgba(246,239,233,0.015)_34%,rgba(190,163,162,0.06)_58%,rgba(224,209,201,0.16)_74%,rgba(239,228,219,0.34)_88%,rgba(239,228,219,0.52)_100%)]" />

          <div className="absolute -bottom-[9%] left-[4%] h-[56%] w-[96%] bg-[radial-gradient(ellipse_at_bottom,rgba(224,209,201,0.38),rgba(190,163,162,0.08)_46%,transparent_84%)] blur-3xl" />
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="vendor-dashboard-blob-a pointer-events-none absolute -left-32 top-44 size-96 rounded-full bg-[var(--color-lilac)]/16 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="vendor-dashboard-blob-b pointer-events-none absolute -right-36 top-[34rem] size-[28rem] rounded-full bg-[var(--color-powder-blue)]/17 blur-3xl"
      />
      <div ref={workspaceContentRef} className="workspace-container relative">
        <div className="mt-5"></div>

        <main className="py-10">
          <section
            data-vendor-reveal
            className="vendor-dashboard-reveal relative overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/70 shadow-[0_28px_90px_rgba(64,42,51,0.10)] backdrop-blur-3xl"
          >
            {businessCoverUrl ? (
              <>
                <div className="vendor-dashboard-hero-media absolute inset-0 overflow-hidden">
                  <img
                    ref={heroImageParallaxRef}
                    src={businessCoverUrl}
                    alt=""
                    className="vendor-dashboard-hero-image absolute inset-x-0 -bottom-6 -top-6 h-[calc(100%+3rem)] w-full object-cover opacity-[0.62] will-change-transform"
                  />
                </div>

                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,245,244,0.99)_0%,rgba(248,245,244,0.96)_30%,rgba(248,245,244,0.82)_48%,rgba(248,245,244,0.42)_68%,rgba(248,245,244,0.14)_84%,rgba(248,245,244,0.06)_100%)]" />

                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(49,31,39,0.05))]" />
              </>
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(175,201,216,0.36),transparent_30%),radial-gradient(circle_at_90%_82%,rgba(183,167,200,0.38),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,237,239,0.86))]" />
            )}

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:p-10">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <LayoutDashboard className="size-4" />
                  Vendor workspace
                </div>

                <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  {getGreeting()}, {user.firstName}. Keep your business moving beautifully.
                </h1>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Review incoming opportunities, respond to customers, manage confirmed work, and
                  keep your vendor profile ready for the next event.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/vendor/quotation-requests" className="btn-primary text-sm font-bold">
                    Review opportunities
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link to="/vendor/portfolio" className="btn-secondary text-sm font-bold">
                    <Images className="size-4" />
                    Manage portfolio
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/70 bg-white/52 p-5 shadow-[0_18px_50px_rgba(31,27,29,0.10)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(31,27,29,0.14)]">
                <div className="flex items-start gap-4">
                  <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/80 bg-white p-1 shadow-[0_14px_34px_rgba(57,37,45,0.18)]">
                    {businessLogoUrl ? (
                      <img
                        src={businessLogoUrl}
                        alt={`${onboarding.profile.businessName} logo`}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-lg font-black text-white">
                        {businessInitials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Business profile
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {onboarding.profile.businessName}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/58">
                      {onboarding.profile.baseLocation ?? 'Location not added'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {onboarding.profile.categories.length > 0 ? (
                    onboarding.profile.categories.slice(0, 3).map((category) => (
                      <span key={category.id} className="soft-chip text-xs font-bold">
                        {category.name}
                      </span>
                    ))
                  ) : (
                    <span className="soft-chip text-xs font-bold">Add service categories</span>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <span
                    className="status-chip"
                    data-tone={
                      onboarding.profile.verificationStatus === 'APPROVED'
                        ? 'success'
                        : onboarding.profile.verificationStatus === 'REJECTED'
                          ? 'danger'
                          : onboarding.profile.verificationStatus === 'PENDING'
                            ? 'warning'
                            : 'plum'
                    }
                  >
                    {onboarding.profile.verificationStatus.replaceAll('_', ' ')}
                  </span>
                  <Link
                    to="/vendor/profile"
                    className="text-sm font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
                  >
                    Manage profile
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section
            data-vendor-reveal
            className="vendor-dashboard-reveal mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="vendor-dashboard-stagger"
                style={{ '--vendor-stagger-delay': `${index * 90}ms` } as CSSProperties}
              >
                <VendorStatCard {...stat} />
              </div>
            ))}
          </section>

          <section
            data-vendor-reveal
            className="vendor-dashboard-reveal mt-5 grid gap-5 lg:grid-cols-[1.18fr_0.82fr]"
          >
            <div className="vendor-card-trace rounded-[2rem]">
              <VendorOnboardingCard onboarding={onboarding} />
            </div>

            <article className="vendor-card-trace workspace-panel group relative overflow-hidden">
              <div
                aria-hidden="true"
                className="vendor-portfolio-glow pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(175,201,216,0.28)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-eyebrow">Portfolio presence</p>

                    <h2 className="section-title">Show customers your best work.</h2>
                  </div>

                  <span className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)] transition duration-500 group-hover:-rotate-6 group-hover:scale-105">
                    <Palette className="size-5" />
                  </span>
                </div>

                {activePortfolioItem?.imageUrl ? (
                  <div className="relative mt-6 overflow-hidden rounded-[1.65rem] border border-white/65 bg-[var(--color-near-black)] shadow-[0_22px_58px_rgba(31,27,29,0.18)]">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {portfolioSlides.map((item, index) => (
                        <img
                          key={item.id}
                          src={item.imageUrl!}
                          alt={item.title ?? onboarding.profile.businessName}
                          loading={index === 0 ? 'eager' : 'lazy'}
                          className={[
                            'absolute inset-0 h-full w-full object-cover',
                            'transition-all duration-[750ms] ease-out',
                            index === activePortfolioSlide
                              ? 'scale-100 opacity-100'
                              : 'pointer-events-none scale-[1.045] opacity-0',
                          ].join(' ')}
                        />
                      ))}

                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,27,29,0.02),rgba(31,27,29,0.7))]" />

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/52 to-transparent" />

                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/60">
                            Selected work
                          </p>

                          <p className="mt-2 truncate text-lg font-black text-white">
                            {activePortfolioItem.title ?? onboarding.profile.businessName}
                          </p>

                          <p className="mt-1 text-xs font-bold text-white/62">
                            {activePortfolioSlide + 1} of {portfolioSlides.length}
                          </p>
                        </div>

                        {activePortfolioItem.isFeatured ? (
                          <span className="shrink-0 rounded-full border border-white/20 bg-white/14 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl">
                            Featured
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {portfolioSlides.length > 1 ? (
                      <div className="absolute bottom-5 right-5 flex items-center gap-1.5">
                        {portfolioSlides.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-label={`Show portfolio image ${index + 1}`}
                            aria-current={index === activePortfolioSlide}
                            onClick={() => setActivePortfolioSlide(index)}
                            className={[
                              'h-1.5 rounded-full transition-all duration-500',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                              index === activePortfolioSlide
                                ? 'w-7 bg-white'
                                : 'w-2 bg-white/40 hover:bg-white/68',
                            ].join(' ')}
                          />
                        ))}
                      </div>
                    ) : null}

                    {portfolioSlides.length > 1 ? (
                      <div className="absolute inset-x-0 top-0 h-1 bg-white/12">
                        <div
                          key={activePortfolioSlide}
                          className="vendor-portfolio-progress h-full bg-white/74"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="vendor-empty-visual relative mt-6 overflow-hidden rounded-[1.65rem] border border-dashed border-[rgba(93,58,85,0.24)] bg-[linear-gradient(135deg,rgba(255,255,255,0.68),rgba(235,229,239,0.48))] p-8 text-center">
                    <div
                      aria-hidden="true"
                      className="vendor-empty-ring pointer-events-none absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(93,58,85,0.12)]"
                    />

                    <div className="relative">
                      <div className="vendor-dashboard-float-icon mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                        <ImagePlus className="size-7" />
                      </div>

                      <h3 className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                        Add your first portfolio image
                      </h3>

                      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        Your own uploaded work will automatically appear in this slideshow and may
                        also become the visual cover of your dashboard.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-sm text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Only work uploaded by your business is displayed here.
                  </p>

                  <Link to="/vendor/portfolio" className="btn-secondary text-sm font-bold">
                    <Images className="size-4" />
                    {portfolio.length > 0 ? 'Manage portfolio' : 'Add portfolio images'}
                  </Link>
                </div>
              </div>
            </article>
          </section>

          <section
            data-vendor-reveal
            className="vendor-dashboard-reveal mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]"
          >
            <article className="vendor-card-trace workspace-panel relative overflow-hidden">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="section-eyebrow">Incoming opportunities</p>
                  <h2 className="section-title">Recent quotation requests</h2>
                  <p className="section-description">
                    Review customer requirements and respond before their requested deadlines.
                  </p>
                </div>
                <Link to="/vendor/quotation-requests" className="btn-secondary text-sm font-bold">
                  View all requests
                </Link>
              </div>

              {quotationRequests.length > 0 ? (
                <div className="mt-7 grid gap-4">
                  {quotationRequests.map((quotationRequest) => (
                    <VendorQuotationCard
                      key={quotationRequest.id}
                      quotationRequest={quotationRequest}
                    />
                  ))}
                </div>
              ) : (
                <div className="group relative mt-7 overflow-hidden rounded-[1.8rem] border border-dashed border-[rgba(142,92,103,0.24)] bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(248,238,241,0.48))] p-6 sm:p-7">
                  <div
                    aria-hidden="true"
                    className="vendor-dashboard-orbit pointer-events-none absolute -right-12 -top-12 size-40 rounded-full border border-[rgba(142,92,103,0.14)]"
                  />

                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="vendor-dashboard-float-icon grid size-14 shrink-0 place-items-center rounded-2xl bg-[rgba(142,92,103,0.14)] text-[var(--color-rosewood)]">
                        <FileText className="size-7" />
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-[var(--color-near-black)]">
                          No quotation requests yet
                        </h3>

                        <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                          Keep your packages clear and complete so customers can send structured
                          requests directly to your business.
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/vendor/packages"
                      className="btn-secondary shrink-0 text-sm font-bold"
                    >
                      Review service packages
                    </Link>
                  </div>
                </div>
              )}
            </article>

            <VendorQuickActions />
          </section>

          <section
            data-vendor-reveal
            className="vendor-card-trace vendor-dashboard-reveal mt-5 workspace-panel relative overflow-hidden"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="section-eyebrow">Upcoming work</p>
                <h2 className="section-title">Recent and scheduled bookings</h2>
                <p className="section-description">
                  Stay ahead of confirmation requests, deposits, service dates, and active customer
                  commitments.
                </p>
              </div>
              <Link to="/vendor/bookings" className="btn-secondary text-sm font-bold">
                View all bookings
              </Link>
            </div>

            {recentBookings.length > 0 ? (
              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                {recentBookings.map((booking) => (
                  <VendorBookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <div className="group relative mt-7 overflow-hidden rounded-[1.8rem] border border-dashed border-[rgba(142,151,115,0.28)] bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(241,243,234,0.54))] p-6 sm:p-7">
                <div
                  aria-hidden="true"
                  className="vendor-dashboard-orbit pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full border border-[rgba(142,151,115,0.16)]"
                />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="vendor-dashboard-float-icon grid size-14 shrink-0 place-items-center rounded-2xl bg-[rgba(142,151,115,0.2)] text-[#596043]">
                      <BriefcaseBusiness className="size-7" />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-[var(--color-near-black)]">
                        No bookings yet
                      </h3>

                      <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        Accepted quotations will appear here as booking requests ready for your
                        confirmation.
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/vendor/quotation-requests"
                    className="btn-secondary shrink-0 text-sm font-bold"
                  >
                    View quotation requests
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section
            data-vendor-reveal
            className="vendor-dashboard-reveal mt-5 grid gap-5 lg:grid-cols-2"
          >
            <article className="vendor-card-trace workspace-panel relative overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(47,31,38,0.10)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-eyebrow">Availability</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Next 30 days
                  </h2>
                </div>
                <CalendarDays className="size-6 text-[var(--color-deep-plum)]" />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/38 p-4">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/56">
                    Scheduled bookings
                  </p>
                  <p className="section-title">{availability.bookings.length}</p>
                </div>
                <div className="rounded-2xl bg-white/38 p-4">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/56">
                    Blocked periods
                  </p>
                  <p className="section-title">{availability.blocks.length}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/65 bg-white/30 p-4">
                <p className="text-sm font-black text-[var(--color-near-black)]">
                  Keep your calendar accurate
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                  Block unavailable dates early so customers can make better booking decisions.
                </p>
              </div>

              <Link to="/vendor/availability" className="btn-secondary mt-6 text-sm font-bold">
                Manage availability
              </Link>
            </article>

            <article className="vendor-card-trace workspace-panel relative overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(47,31,38,0.10)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-eyebrow">Notifications</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Latest business updates
                  </h2>
                </div>
                <Bell className="size-6 text-[var(--color-deep-plum)]" />
              </div>

              {notifications.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {notifications.slice(0, 4).map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 transition hover:bg-white/52"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            {notification.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/58">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--color-muted-burgundy)]" />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-surface mt-6">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                    <Bell className="size-6" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/58">
                    You do not have any notifications yet.
                  </p>
                </div>
              )}

              <Link to="/notifications" className="btn-secondary mt-6 text-sm font-bold">
                View notifications
              </Link>
            </article>
          </section>

          <section
            data-vendor-reveal
            className="vendor-dashboard-reveal mt-5 rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-white shadow-[0_24px_70px_rgba(93,58,85,0.24)] sm:p-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-[var(--color-powder-blue)]">
                  <Sparkles className="size-5" />
                  <span className="text-xs font-black uppercase tracking-[0.22em]">
                    Business insight
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.045em]">
                  A complete profile and a strong portfolio help customers decide with confidence.
                </h2>
                <p className="mt-3 max-w-2xl leading-7 text-white/70">
                  Keep your service details, availability, and real work updated so every customer
                  sees an accurate picture of your business.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/vendor/profile"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black !text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-light-champagne)] hover:shadow-[0_20px_44px_rgba(0,0,0,0.24)]"
                >
                  <Store className="size-4 text-[var(--color-deep-plum)]" />
                  <span>Update profile</span>
                </Link>
                <Link
                  to="/vendor/portfolio"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/28 bg-white/12 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/18"
                >
                  <Images className="size-4" />
                  Manage portfolio
                </Link>
              </div>
            </div>
          </section>
        </main>

        <div data-vendor-reveal className="vendor-dashboard-reveal mb-4"></div>

        <style>{`
          .vendor-dashboard-reveal {
            opacity: 0;
            transform: translate3d(0, 34px, 0) scale(0.992);
            transition:
              opacity 760ms cubic-bezier(0.22, 1, 0.36, 1),
              transform 820ms cubic-bezier(0.22, 1, 0.36, 1);
            will-change: opacity, transform;
          }

          .vendor-dashboard-reveal.is-visible {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }

          .vendor-dashboard-stagger {
            opacity: 0;
            transform: translate3d(0, 22px, 0);
            animation: vendorDashboardCardIn 680ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
            animation-delay: var(--vendor-stagger-delay, 0ms);
          }

          .vendor-dashboard-hero-media {
  animation: vendorDashboardHeroDrift 28s ease-in-out infinite alternate;
  transform-origin: center right;
  will-change: transform;
}

.vendor-dashboard-hero-image {
  transition:
    transform 1600ms ease-out,
    filter 700ms ease-out;
}

          section:hover > .vendor-dashboard-hero-image {
            filter: saturate(1.04);
          }

          @keyframes vendorDashboardCardIn {
            to {
              opacity: 1;
              transform: translate3d(0, 0, 0);
            }
          }

          @keyframes vendorDashboardBlobA {
            0%,
            100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(14px, -16px, 0) scale(1.045);
            }
          }

          @keyframes vendorDashboardBlobB {
            0%,
            100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(-16px, 12px, 0) scale(1.035);
            }
          }

          .vendor-dashboard-blob-a {
            animation: vendorDashboardBlobA 20s ease-in-out infinite;
          }

          .vendor-dashboard-blob-b {
            animation: vendorDashboardBlobB 24s ease-in-out infinite;
            animation-delay: -8s;
          }

          @keyframes vendorDashboardFloatIcon {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, -6px, 0);
  }
}

@keyframes vendorDashboardOrbit {
  0% {
    transform: rotate(0deg) scale(1);
  }

  50% {
    transform: rotate(180deg) scale(1.06);
  }

  100% {
    transform: rotate(360deg) scale(1);
  }
}

.vendor-dashboard-float-icon {
  animation: vendorDashboardFloatIcon 4.8s ease-in-out infinite;
}

.vendor-dashboard-orbit {
  animation: vendorDashboardOrbit 18s linear infinite;
}

@property --vendor-border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.vendor-card-trace {
  position: relative;
  isolation: isolate;
}

.vendor-card-trace::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 4;
  border-radius: inherit;
  padding: 1px;
  pointer-events: none;
  background: conic-gradient(
    from var(--vendor-border-angle),
    transparent 0deg,
    transparent 270deg,
    rgba(31, 27, 29, 0.08) 300deg,
    rgba(31, 27, 29, 0.78) 330deg,
    rgba(31, 27, 29, 0.08) 355deg,
    transparent 360deg
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: vendorCardTrace 8s linear infinite;
}

.vendor-card-trace:nth-of-type(even)::before {
  animation-duration: 10s;
  animation-direction: reverse;
}

@keyframes vendorCardTrace {
  to {
    --vendor-border-angle: 360deg;
  }
}

.vendor-portfolio-progress {
  transform-origin: left;
  animation: vendorPortfolioProgress 3000ms linear forwards;
}

@keyframes vendorPortfolioProgress {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}

.vendor-portfolio-glow {
  animation: vendorPortfolioGlow 10s ease-in-out infinite;
}

@keyframes vendorPortfolioGlow {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.72;
  }

  50% {
    transform: translate3d(-18px, 16px, 0) scale(1.12);
    opacity: 1;
  }
}

.vendor-empty-ring {
  animation: vendorEmptyRing 7s ease-in-out infinite;
}

@keyframes vendorEmptyRing {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0.35;
  }

  50% {
    transform: translate(-50%, -50%) scale(1.14);
    opacity: 0.72;
  }
}
@keyframes vendorDashboardHeroDrift {
  0% {
    transform: scale(1) translate3d(0, 0, 0);
  }

  50% {
    transform: scale(1.025) translate3d(-6px, -2px, 0);
  }

  100% {
    transform: scale(1.045) translate3d(-14px, 2px, 0);
  }
}
          @media (prefers-reduced-motion: reduce) {
            .vendor-dashboard-reveal,
            .vendor-dashboard-stagger {
              opacity: 1;
              transform: none;
              animation: none;
              transition: none;
            }

            .vendor-dashboard-blob-a,
            .vendor-dashboard-blob-b {
              animation: none;
            }

            .vendor-dashboard-hero-image {
              transform: none !important;
              transition: none;
            }
              .vendor-dashboard-float-icon,
.vendor-dashboard-orbit {
  animation: none;
}

.vendor-card-trace::before,
.vendor-portfolio-progress,
.vendor-portfolio-glow,
.vendor-empty-ring {
  animation: none;
}

.vendor-dashboard-hero-media {
  animation: none;
  transform: none;
}
          }
        `}</style>
      </div>
    </div>
  );
}
