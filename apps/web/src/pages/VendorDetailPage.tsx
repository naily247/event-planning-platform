import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CakeSlice,
  Camera,
  CarFront,
  CheckCircle2,
  ChefHat,
  CircleAlert,
  Clock,
  Flower2,
  Heart,
  Image,
  LoaderCircle,
  MapPin,
  MessageSquareQuote,
  Music2,
  PackageCheck,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react';
import { type ComponentType, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PortfolioLightbox } from '../components/vendors/PortfolioLightbox';
import { StickyVendorCta } from '../components/vendors/StickyVendorCta';
import { api } from '../lib/api';

type VendorCategory = {
  id: string;
  name: string;
  slug: string;
};

type VendorPortfolioItem = {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  imagePublicId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  displayOrder: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

type VendorPackage = {
  id: string;
  title: string;
  description: string | null;
  basePrice: string | null;
  category: VendorCategory;
  createdAt: string;
  updatedAt: string;
};

type VendorRatingSummary = {
  overallAverage: number | null;
  serviceAverage: number | null;
  communicationAverage: number | null;
  reviewCount: number;
  breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
};

type PublicVendorDetail = {
  id: string;
  businessName: string;
  slug: string;
  description: string | null;
  contactPhone: string | null;
  website: string | null;
  baseLocation: string | null;
  serviceAreas: string[];
  categories: VendorCategory[];
  portfolioItems: VendorPortfolioItem[];
  packages: VendorPackage[];
  ratingSummary: VendorRatingSummary;
  createdAt: string;
  updatedAt: string;
};

type PublicVendorDetailResponse = {
  success: boolean;
  data: PublicVendorDetail;
};

const categoryIconMap: Record<string, ComponentType<{ className?: string }>> = {
  photography: Camera,
  videography: Camera,
  catering: ChefHat,
  decorations: WandSparkles,
  'music-and-dj': Music2,
  venues: Building2,
  'bridal-and-beauty': Sparkles,
  'cakes-and-desserts': CakeSlice,
  'flowers-and-floristry': Flower2,
  transport: CarFront,
};

const categoryAccentMap: Record<string, string> = {
  photography: 'bg-[var(--color-valendor-lilac)]',
  videography: 'bg-[var(--color-powder-blue)]',
  catering: 'bg-[var(--color-dusty-olive)]',
  decorations: 'bg-[var(--color-rosewood)]',
  'music-and-dj': 'bg-[var(--color-powder-blue)]',
  venues: 'bg-[rgba(224,198,181,0.88)]',
  'bridal-and-beauty': 'bg-[rgba(207,183,193,0.88)]',
  'cakes-and-desserts': 'bg-[rgba(236,203,211,0.88)]',
  'flowers-and-floristry': 'bg-[rgba(173,193,177,0.88)]',
  transport: 'bg-[rgba(190,176,203,0.88)]',
};

const vendorLogoMap: Record<string, string> = {
  'luna-frame-studio': '/images/vendors/logos/luna-frame-studio.png',
  'velvet-moments': '/images/vendors/logos/velvet-moments.png',
  'aroma-catering': '/images/vendors/logos/aroma-catering.png',
  'bloom-atelier': '/images/vendors/logos/bloom-atelier.png',
  'sweet-layers': '/images/vendors/logos/sweet-layers.png',
  'echo-entertainment': '/images/vendors/logos/echo-entertainment.png',
  'elite-transport': '/images/vendors/logos/elite-transport.png',
  'grand-horizon-ballroom': '/images/vendors/logos/grand-horizon-ballroom.png',
};

const formatCurrency = (value: string | null) => {
  if (!value) {
    return 'Tailored pricing';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Tailored pricing';
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStartingPrice = (packages: VendorPackage[]) => {
  const validPrices = packages
    .map((servicePackage) => Number(servicePackage.basePrice))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (validPrices.length === 0) {
    return 'Tailored pricing';
  }

  return formatCurrency(String(Math.min(...validPrices)));
};

const getRatingLabel = (ratingSummary: VendorRatingSummary) => {
  if (ratingSummary.overallAverage === null || ratingSummary.reviewCount === 0) {
    return 'New vendor';
  }

  const reviewLabel =
    ratingSummary.reviewCount === 1 ? '1 review' : `${ratingSummary.reviewCount} reviews`;

  return `${ratingSummary.overallAverage.toFixed(1)} · ${reviewLabel}`;
};

const getPrimaryCategory = (vendor: PublicVendorDetail) => vendor.categories[0] ?? null;

const getLocationLabel = (vendor: PublicVendorDetail) =>
  vendor.baseLocation ?? vendor.serviceAreas[0] ?? 'Sri Lanka';

const getPortfolioCardClassName = (index: number) => {
  const patternIndex = index % 6;

  if (patternIndex === 0 || patternIndex === 4) {
    return 'sm:col-span-2 lg:col-span-2 lg:row-span-2';
  }

  return '';
};

export function VendorDetailPage() {
  const { vendorSlug } = useParams<{ vendorSlug: string }>();

  const [vendor, setVendor] = useState<PublicVendorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePortfolioIndex, setActivePortfolioIndex] = useState<number | null>(null);
  const [heroPortfolioIndex, setHeroPortfolioIndex] = useState(0);
  const [isHeroSlideshowPaused, setIsHeroSlideshowPaused] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadVendor = async () => {
      if (!vendorSlug) {
        setVendor(null);
        setErrorMessage('The vendor profile address is invalid.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setActivePortfolioIndex(null);
      setHeroPortfolioIndex(0);
      setIsHeroSlideshowPaused(false);

      try {
        const response = await api.get<PublicVendorDetailResponse>(`/vendors/${vendorSlug}`, {
          signal: controller.signal,
        });

        setVendor(response.data.data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('Failed to load vendor profile:', error);

        setVendor(null);
        setErrorMessage(
          'We could not load this vendor profile. It may no longer be available, or the Eventure API may be offline.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadVendor();

    return () => {
      controller.abort();
    };
  }, [vendorSlug]);

  useEffect(() => {
    if (!vendor || vendor.portfolioItems.length <= 1 || isHeroSlideshowPaused) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setHeroPortfolioIndex((currentIndex) => {
        return (currentIndex + 1) % vendor.portfolioItems.length;
      });
    }, 3500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isHeroSlideshowPaused, vendor]);

  const primaryCategory = vendor ? getPrimaryCategory(vendor) : null;

  const VendorIcon = useMemo(() => {
    if (!primaryCategory) {
      return Sparkles;
    }

    return categoryIconMap[primaryCategory.slug] ?? Sparkles;
  }, [primaryCategory]);

  const accentClass = primaryCategory
    ? (categoryAccentMap[primaryCategory.slug] ?? 'bg-[var(--color-valendor-lilac)]')
    : 'bg-[var(--color-valendor-lilac)]';

  const vendorLogoUrl = vendor ? vendorLogoMap[vendor.slug] : undefined;

  if (isLoading) {
    return (
      <section className="page-container py-24">
        <div className="glass-card grid min-h-[28rem] place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading vendor profile
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Gathering packages, portfolio work and public vendor details.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!vendor || errorMessage) {
    return (
      <section className="page-container py-24">
        <div className="glass-card grid min-h-[28rem] place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Vendor profile unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {errorMessage ?? 'This vendor profile could not be found in the public marketplace.'}
            </p>

            <Link to="/vendors" className="btn-secondary mt-6 text-sm font-bold">
              <ArrowLeft className="size-4" />
              Back to vendors
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const categoryLabel = primaryCategory?.name ?? 'Professional event services';
  const startingPrice = getStartingPrice(vendor.packages);
  const ratingLabel = getRatingLabel(vendor.ratingSummary);
  const locationLabel = getLocationLabel(vendor);
  const heroPortfolioItems = vendor.portfolioItems;
  const activeHeroPortfolioItem = heroPortfolioItems[heroPortfolioIndex] ?? null;

  return (
    <>
      <section className="relative overflow-hidden py-14 lg:py-20">
        <div className="pointer-events-none absolute left-[8%] top-16 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-20 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

        <div className="page-container">
          <Link to="/vendors" className="btn-secondary mb-6 w-fit text-sm font-bold">
            <ArrowLeft className="size-4" />
            Back to vendors
          </Link>

          <div className="glass-card overflow-hidden p-4 sm:p-6 lg:p-7">
            <div className="grid gap-7 lg:grid-cols-[0.88fr_1.12fr] lg:gap-9">
              <div
                className={`relative min-h-[460px] overflow-hidden rounded-[2rem] ${accentClass} shadow-[0_26px_74px_rgba(31,27,29,0.17)] sm:min-h-[500px] lg:min-h-[570px]`}
                onMouseEnter={() => {
                  setIsHeroSlideshowPaused(true);
                }}
                onMouseLeave={() => {
                  setIsHeroSlideshowPaused(false);
                }}
                onFocusCapture={() => {
                  setIsHeroSlideshowPaused(true);
                }}
                onBlurCapture={() => {
                  setIsHeroSlideshowPaused(false);
                }}
              >
                {heroPortfolioItems.map((portfolioItem, index) => {
                  const isActive = index === heroPortfolioIndex;

                  return (
                    <img
                      key={portfolioItem.id}
                      src={portfolioItem.imageUrl}
                      alt={
                        portfolioItem.title ?? `${vendor.businessName} portfolio image ${index + 1}`
                      }
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover will-change-transform motion-reduce:transform-none motion-reduce:transition-none"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive
                          ? index % 2 === 0
                            ? 'scale(1.065) translate3d(-0.7%, -0.45%, 0)'
                            : 'scale(1.065) translate3d(0.7%, -0.35%, 0)'
                          : 'scale(1.015) translate3d(0, 0, 0)',
                        transition:
                          'opacity 750ms ease-in-out, transform 3500ms cubic-bezier(0.2, 0.65, 0.3, 1)',
                      }}
                    />
                  );
                })}

                {activeHeroPortfolioItem ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActivePortfolioIndex(heroPortfolioIndex);
                    }}
                    className="absolute inset-0 z-[1] h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
                    aria-label={`Open ${
                      activeHeroPortfolioItem.title ??
                      `${vendor.businessName} portfolio image ${heroPortfolioIndex + 1}`
                    }`}
                  />
                ) : null}

                <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_25%_16%,rgba(255,255,255,0.46),transparent_31%),linear-gradient(180deg,rgba(31,27,29,0.02)_0%,rgba(31,27,29,0.05)_48%,rgba(31,27,29,0.24)_100%)]" />

                {heroPortfolioItems.length > 1 ? (
                  <div
                    className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-white/45 bg-black/15 px-3 py-2 backdrop-blur-xl"
                    aria-hidden="true"
                  >
                    {heroPortfolioItems.map((portfolioItem, index) => (
                      <span
                        key={portfolioItem.id}
                        className={
                          index === heroPortfolioIndex
                            ? 'h-1.5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-500'
                            : 'size-1.5 rounded-full bg-white/52 transition-all duration-500'
                        }
                      />
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="absolute right-5 top-5 z-10 grid size-11 place-items-center rounded-full border border-white/50 bg-white/30 text-[var(--color-near-black)] backdrop-blur-xl transition hover:scale-105 hover:bg-white/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  aria-label={`Save ${vendor.businessName}`}
                >
                  <Heart className="size-5" />
                </button>

                <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 rounded-[1.7rem] border border-white/60 bg-white/40 p-5 shadow-[0_22px_58px_rgba(31,27,29,0.18)] backdrop-blur-2xl sm:bottom-6 sm:left-6 sm:right-6 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-[4.5rem] place-items-center overflow-hidden rounded-[1.35rem] border border-white/65 bg-white/72 p-1.5 shadow-[0_12px_34px_rgba(31,27,29,0.15)] backdrop-blur-xl">
                      {vendorLogoUrl ? (
                        <img
                          src={vendorLogoUrl}
                          alt={`${vendor.businessName} logo`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <VendorIcon className="size-7 text-[var(--color-deep-plum)]" />
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/55 bg-white/44 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#3d452f]">
                      <BadgeCheck className="size-3.5" />
                      Verified
                    </span>
                  </div>

                  <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Featured vendor
                  </p>

                  <p className="mt-2 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    {vendor.businessName}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/38 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/72">
                      <Image className="size-3.5 text-[var(--color-deep-plum)]" />

                      {vendor.portfolioItems.length > 0
                        ? `${vendor.portfolioItems.length} portfolio ${
                            vendor.portfolioItems.length === 1 ? 'image' : 'images'
                          }`
                        : 'Portfolio coming soon'}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/38 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/72">
                      <MessageSquareQuote className="size-3.5 text-[var(--color-deep-plum)]" />
                      Quotations available
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-9 p-1 sm:p-2 lg:px-4 lg:py-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-chip" data-tone="blue">
                      {categoryLabel}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(142,151,115,0.18)] px-3 py-1 text-xs font-black text-[#3d452f]">
                      <BadgeCheck className="size-3.5" />
                      Verified
                    </span>
                  </div>

                  <h1 className="mt-7 max-w-3xl text-balance text-5xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                    {vendor.businessName}
                  </h1>

                  <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                    {vendor.description ??
                      'Explore this verified Eventure vendor and request a tailored quotation for your event.'}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <span className="soft-chip text-sm font-bold">
                      <MapPin className="size-4 text-[var(--color-rosewood)]" />
                      {locationLabel}
                    </span>

                    <span className="soft-chip text-sm font-bold">
                      <Star
                        className={
                          vendor.ratingSummary.overallAverage === null
                            ? 'size-4 text-[var(--color-charcoal)]/35'
                            : 'size-4 fill-[var(--color-dusty-olive)] text-[var(--color-dusty-olive)]'
                        }
                      />
                      {ratingLabel}
                    </span>

                    <span className="soft-chip text-sm font-bold">
                      <Clock className="size-4 text-[var(--color-deep-plum)]" />
                      Quotation response available
                    </span>
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-3">
                  <div className="rounded-[1.55rem] border border-white/60 bg-white/32 p-5 shadow-[0_14px_34px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/40">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Starting price
                    </p>

                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {startingPrice}
                    </p>
                  </div>

                  <div className="rounded-[1.55rem] border border-white/60 bg-white/32 p-5 shadow-[0_14px_34px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/40">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Packages</p>

                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {vendor.packages.length}
                    </p>
                  </div>

                  <div className="rounded-[1.55rem] border border-white/60 bg-white/32 p-5 shadow-[0_14px_34px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/40">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Service areas
                    </p>

                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {vendor.serviceAreas.length || 1}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to="/login" className="btn-primary text-sm font-bold">
                    Request quotation
                    <ArrowRight className="size-4" />
                  </Link>

                  <Link to="/planning-guide" className="btn-secondary text-sm font-bold">
                    View planning guide
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container pb-10">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--color-rosewood)]">
              Portfolio preview
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl">
              Selected work from {vendor.businessName}.
            </h2>
          </div>

          <p className="max-w-md leading-7 text-[var(--color-charcoal)]/68">
            Browse portfolio items uploaded by this vendor and explore the style behind their event
            services.
          </p>
        </div>

        {vendor.portfolioItems.length > 0 ? (
          <div className="grid auto-rows-[15rem] gap-4 sm:grid-cols-2 sm:auto-rows-[17rem] lg:grid-cols-3 lg:auto-rows-[15rem]">
            {vendor.portfolioItems.map((portfolioItem, index) => (
              <button
                key={portfolioItem.id}
                type="button"
                onClick={() => setActivePortfolioIndex(index)}
                className={`group relative min-h-0 cursor-zoom-in overflow-hidden rounded-[1.85rem] bg-[var(--color-light-champagne)] text-left shadow-[0_18px_48px_rgba(31,27,29,0.12)] transition duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_28px_68px_rgba(31,27,29,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)] focus-visible:ring-offset-4 ${getPortfolioCardClassName(
                  index,
                )}`}
                aria-label={`Open ${
                  portfolioItem.title ?? `${vendor.businessName} portfolio item ${index + 1}`
                }`}
              >
                <img
                  src={portfolioItem.imageUrl}
                  alt={portfolioItem.title ?? `${vendor.businessName} portfolio item ${index + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.055]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.82)] via-[rgba(31,27,29,0.08)] to-transparent transition duration-500 group-hover:from-[rgba(31,27,29,0.88)]" />

                <div className="absolute right-4 top-4 translate-y-2 rounded-full border border-white/40 bg-black/28 px-3.5 py-2 text-xs font-black text-white opacity-0 shadow-[0_10px_24px_rgba(0,0,0,0.14)] backdrop-blur-xl transition duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  View image
                </div>

                <div className="absolute bottom-5 left-5 right-5 translate-y-1 transition duration-500 ease-out group-hover:translate-y-0 sm:bottom-6 sm:left-6 sm:right-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/26 px-3 py-2 text-xs font-black text-white shadow-[0_8px_22px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                    <Image className="size-4" />
                    {portfolioItem.isFeatured ? 'Featured work' : `Portfolio ${index + 1}`}
                  </div>

                  {portfolioItem.title ? (
                    <h3 className="mt-3 max-w-xl text-xl font-black tracking-[-0.035em] text-white sm:text-2xl">
                      {portfolioItem.title}
                    </h3>
                  ) : null}

                  {portfolioItem.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/78">
                      {portfolioItem.description}
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass-card grid min-h-72 place-items-center p-10 text-center">
            <div>
              <Image className="mx-auto size-9 text-[var(--color-deep-plum)]" />

              <p className="mt-4 text-lg font-black text-[var(--color-near-black)]">
                Portfolio coming soon
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
                This vendor has not published portfolio items yet.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="page-container pb-24">
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--color-rosewood)]">
                  Packages
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl">
                  Clear service options before requesting a quotation.
                </h2>
              </div>
            </div>

            {vendor.packages.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
                {vendor.packages.map((servicePackage) => (
                  <article
                    key={servicePackage.id}
                    className="luxe-card group flex h-full flex-col overflow-hidden p-6 transition duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_28px_68px_rgba(31,27,29,0.14)] sm:p-7"
                  >
                    <div className="grid size-12 place-items-center rounded-2xl border border-white/55 bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.07)] transition duration-500 group-hover:scale-[1.04] group-hover:bg-[rgba(183,167,200,0.32)]">
                      <PackageCheck className="size-6" />
                    </div>

                    <span className="status-chip mt-7 inline-flex w-fit" data-tone="blue">
                      {servicePackage.category.name}
                    </span>

                    <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {servicePackage.title}
                    </h3>

                    <p className="mt-4 text-2xl font-black tracking-[-0.045em] text-[var(--color-rosewood)]">
                      {servicePackage.basePrice
                        ? `From ${formatCurrency(servicePackage.basePrice)}`
                        : 'Tailored pricing'}
                    </p>

                    <p className="mt-5 flex-1 leading-7 text-[var(--color-charcoal)]/68">
                      {servicePackage.description ??
                        'Request a structured quotation for detailed inclusions, pricing and terms.'}
                    </p>

                    <div className="mt-8 flex items-center gap-2 border-t border-[rgba(46,42,44,0.08)] pt-5 text-sm font-bold text-[var(--color-charcoal)]/66">
                      <CheckCircle2 className="size-4 text-[var(--color-dusty-olive)]" />
                      Structured quotation available
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="glass-card grid min-h-64 place-items-center p-10 text-center">
                <div>
                  <PackageCheck className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-lg font-black text-[var(--color-near-black)]">
                    Custom quotations available
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
                    This vendor has not published fixed packages yet.
                  </p>
                </div>
              </div>
            )}
          </div>

          <StickyVendorCta
            vendorName={vendor.businessName}
            location={locationLabel}
            startingPrice={startingPrice}
            rating={vendor.ratingSummary.overallAverage}
            reviewCount={vendor.ratingSummary.reviewCount}
          />
        </div>
      </section>

      <PortfolioLightbox
        items={vendor.portfolioItems}
        activeIndex={activePortfolioIndex}
        vendorName={vendor.businessName}
        onClose={() => setActivePortfolioIndex(null)}
        onChange={setActivePortfolioIndex}
      />
    </>
  );
}
