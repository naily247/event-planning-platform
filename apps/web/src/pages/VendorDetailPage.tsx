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
  Music2,
  PackageCheck,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react';
import { type ComponentType, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

export function VendorDetailPage() {
  const { vendorSlug } = useParams<{ vendorSlug: string }>();

  const [vendor, setVendor] = useState<PublicVendorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <>
      <section className="relative overflow-hidden py-12 lg:py-18">
        <div className="pointer-events-none absolute left-[8%] top-16 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-20 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

        <div className="page-container">
          <Link to="/vendors" className="btn-secondary mb-6 w-fit text-sm font-bold">
            <ArrowLeft className="size-4" />
            Back to vendors
          </Link>

          <div className="glass-card overflow-hidden p-5 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <div
                className={`relative min-h-[420px] overflow-hidden rounded-[2rem] ${accentClass} shadow-[0_24px_70px_rgba(31,27,29,0.16)]`}
              >
                {vendor.portfolioItems[0]?.imageUrl ? (
                  <img
                    src={vendor.portfolioItems[0].imageUrl}
                    alt={
                      vendor.portfolioItems[0].title ?? `${vendor.businessName} featured portfolio`
                    }
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.62),transparent_30%),linear-gradient(135deg,rgba(93,58,85,0.18),rgba(255,255,255,0.08))]" />

                <button
                  type="button"
                  className="absolute right-5 top-5 grid size-11 place-items-center rounded-full border border-white/50 bg-white/30 text-[var(--color-near-black)] backdrop-blur-xl"
                  aria-label={`Save ${vendor.businessName}`}
                >
                  <Heart className="size-5" />
                </button>

                <div className="absolute bottom-6 left-6 right-6 rounded-[1.5rem] border border-white/50 bg-white/32 p-5 shadow-[0_18px_48px_rgba(31,27,29,0.13)] backdrop-blur-2xl">
                  <div className="grid size-14 place-items-center rounded-2xl bg-white/34 text-[var(--color-deep-plum)]">
                    <VendorIcon className="size-7" />
                  </div>

                  <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Featured vendor
                  </p>

                  <p className="mt-2 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    {vendor.businessName}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-8 p-1 lg:p-4">
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

                  <h1 className="mt-6 max-w-3xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                    {vendor.businessName}
                  </h1>

                  <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                    {vendor.description ??
                      'Explore this verified Eventure vendor and request a tailored quotation for your event.'}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <span className="soft-chip text-sm font-bold">
                      <MapPin className="size-4 text-[var(--color-rosewood)]" />
                      {getLocationLabel(vendor)}
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

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-white/55 bg-white/28 p-5 backdrop-blur-2xl">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Starting price
                    </p>

                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {startingPrice}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/55 bg-white/28 p-5 backdrop-blur-2xl">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Packages</p>

                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {vendor.packages.length}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/55 bg-white/28 p-5 backdrop-blur-2xl">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendor.portfolioItems.map((portfolioItem, index) => (
              <article
                key={portfolioItem.id}
                className="group relative min-h-72 overflow-hidden rounded-[1.75rem] bg-[var(--color-light-champagne)] shadow-[0_18px_48px_rgba(31,27,29,0.12)]"
              >
                <img
                  src={portfolioItem.imageUrl}
                  alt={portfolioItem.title ?? `${vendor.businessName} portfolio item ${index + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.72)] via-transparent to-transparent" />

                <div className="absolute bottom-5 left-5 right-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/24 px-3 py-2 text-xs font-black text-white backdrop-blur-xl">
                    <Image className="size-4" />
                    {portfolioItem.isFeatured ? 'Featured work' : `Portfolio ${index + 1}`}
                  </div>

                  {portfolioItem.title ? (
                    <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-white">
                      {portfolioItem.title}
                    </h3>
                  ) : null}

                  {portfolioItem.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/78">
                      {portfolioItem.description}
                    </p>
                  ) : null}
                </div>
              </article>
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
          <div className="grid gap-5 lg:grid-cols-3">
            {vendor.packages.map((servicePackage) => (
              <article key={servicePackage.id} className="luxe-card p-6">
                <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <PackageCheck className="size-6" />
                </div>

                <span className="status-chip mt-8 inline-flex" data-tone="blue">
                  {servicePackage.category.name}
                </span>

                <h3 className="mt-4 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {servicePackage.title}
                </h3>

                <p className="mt-3 text-lg font-black tracking-[-0.035em] text-[var(--color-rosewood)]">
                  {servicePackage.basePrice
                    ? `From ${formatCurrency(servicePackage.basePrice)}`
                    : 'Tailored pricing'}
                </p>

                <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
                  {servicePackage.description ??
                    'Request a structured quotation for detailed inclusions, pricing and terms.'}
                </p>

                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/66">
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
      </section>
    </>
  );
}
