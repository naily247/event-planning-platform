import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CakeSlice,
  Camera,
  CarFront,
  ChefHat,
  CircleAlert,
  Flower2,
  LoaderCircle,
  MapPin,
  Music2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  type ComponentType,
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getPublicVendors,
  type PublicVendor,
  type VendorPagination,
} from '../features/vendors/vendor.api';


type CategoryFilter = {
  label: string;
  slug: string | null;
};

type CategoryVisual = {
  backgroundColor: string;
  backgroundImage: string;
  watermarkClassName: string;
};

const categoryFilters: CategoryFilter[] = [
  {
    label: 'All vendors',
    slug: null,
  },
  {
    label: 'Photography',
    slug: 'photography',
  },
  {
    label: 'Catering',
    slug: 'catering',
  },
  {
    label: 'Decorations',
    slug: 'decorations',
  },
  {
    label: 'Music',
    slug: 'music-and-dj',
  },
  {
    label: 'Venues',
    slug: 'venues',
  },
  {
    label: 'Beauty',
    slug: 'bridal-and-beauty',
  },
  {
    label: 'Cakes',
    slug: 'cakes-and-desserts',
  },
  {
    label: 'Floristry',
    slug: 'flowers-and-floristry',
  },
  {
    label: 'Transport',
    slug: 'transport',
  },
];

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

const categoryVisualMap: Record<string, CategoryVisual> = {
  photography: {
    backgroundColor: '#c8bbd3',
    backgroundImage: `
      radial-gradient(circle at 22% 18%, rgba(255,255,255,0.72), transparent 28%),
      radial-gradient(circle at 82% 76%, rgba(93,58,85,0.22), transparent 34%),
      repeating-radial-gradient(
        circle at 28% 68%,
        rgba(255,255,255,0.18) 0,
        rgba(255,255,255,0.18) 1px,
        transparent 1px,
        transparent 18px
      ),
      linear-gradient(145deg, rgba(93,58,85,0.24), rgba(255,255,255,0.12))
    `,
    watermarkClassName: 'text-[rgba(69,43,64,0.16)]',
  },
  videography: {
    backgroundColor: '#b8cfdb',
    backgroundImage: `
      radial-gradient(circle at 18% 20%, rgba(255,255,255,0.72), transparent 30%),
      linear-gradient(120deg, transparent 0 42%, rgba(255,255,255,0.18) 42% 44%, transparent 44% 100%),
      repeating-linear-gradient(
        90deg,
        rgba(72,94,108,0.08) 0,
        rgba(72,94,108,0.08) 1px,
        transparent 1px,
        transparent 22px
      ),
      linear-gradient(145deg, rgba(76,108,126,0.2), rgba(255,255,255,0.12))
    `,
    watermarkClassName: 'text-[rgba(55,77,89,0.16)]',
  },
  catering: {
    backgroundColor: '#aeb698',
    backgroundImage: `
      radial-gradient(circle at 20% 18%, rgba(255,255,255,0.66), transparent 28%),
      radial-gradient(circle at 78% 76%, rgba(61,69,47,0.2), transparent 34%),
      repeating-linear-gradient(
        45deg,
        rgba(255,255,255,0.12) 0,
        rgba(255,255,255,0.12) 1px,
        transparent 1px,
        transparent 16px
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(61,69,47,0.06) 0,
        rgba(61,69,47,0.06) 1px,
        transparent 1px,
        transparent 16px
      )
    `,
    watermarkClassName: 'text-[rgba(55,63,43,0.17)]',
  },
  decorations: {
    backgroundColor: '#b77a86',
    backgroundImage: `
      radial-gradient(circle at 18% 14%, rgba(255,255,255,0.62), transparent 28%),
      radial-gradient(circle at 82% 80%, rgba(79,40,52,0.22), transparent 34%),
      repeating-radial-gradient(
        ellipse at 25% 72%,
        rgba(255,255,255,0.14) 0,
        rgba(255,255,255,0.14) 2px,
        transparent 2px,
        transparent 24px
      ),
      linear-gradient(135deg, rgba(255,255,255,0.1), rgba(82,40,51,0.14))
    `,
    watermarkClassName: 'text-[rgba(79,39,50,0.17)]',
  },
  'music-and-dj': {
    backgroundColor: '#9dbdce',
    backgroundImage: `
      radial-gradient(circle at 18% 16%, rgba(255,255,255,0.7), transparent 28%),
      repeating-radial-gradient(
        circle at 74% 72%,
        rgba(52,78,92,0.12) 0,
        rgba(52,78,92,0.12) 2px,
        transparent 2px,
        transparent 18px
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0,
        transparent 12px,
        rgba(255,255,255,0.15) 12px,
        rgba(255,255,255,0.15) 14px
      ),
      linear-gradient(145deg, rgba(74,109,128,0.24), rgba(255,255,255,0.08))
    `,
    watermarkClassName: 'text-[rgba(47,71,84,0.17)]',
  },
  venues: {
    backgroundColor: '#d8bda9',
    backgroundImage: `
      radial-gradient(circle at 22% 16%, rgba(255,255,255,0.72), transparent 28%),
      repeating-linear-gradient(
        90deg,
        transparent 0,
        transparent 30px,
        rgba(99,66,48,0.09) 30px,
        rgba(99,66,48,0.09) 32px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0,
        transparent 30px,
        rgba(255,255,255,0.13) 30px,
        rgba(255,255,255,0.13) 32px
      ),
      linear-gradient(145deg, rgba(117,74,51,0.18), rgba(255,255,255,0.12))
    `,
    watermarkClassName: 'text-[rgba(88,57,40,0.16)]',
  },
  'bridal-and-beauty': {
    backgroundColor: '#cfb7c1',
    backgroundImage: `
      radial-gradient(circle at 20% 16%, rgba(255,255,255,0.74), transparent 30%),
      radial-gradient(circle at 82% 80%, rgba(112,66,88,0.18), transparent 32%),
      repeating-radial-gradient(
        ellipse at 76% 30%,
        rgba(255,255,255,0.16) 0,
        rgba(255,255,255,0.16) 2px,
        transparent 2px,
        transparent 22px
      ),
      linear-gradient(140deg, rgba(104,61,82,0.16), rgba(255,255,255,0.14))
    `,
    watermarkClassName: 'text-[rgba(91,51,70,0.16)]',
  },
  'cakes-and-desserts': {
    backgroundColor: '#e7c7cf',
    backgroundImage: `
      radial-gradient(circle at 20% 14%, rgba(255,255,255,0.78), transparent 30%),
      repeating-radial-gradient(
        ellipse at 78% 76%,
        rgba(137,77,93,0.1) 0,
        rgba(137,77,93,0.1) 2px,
        transparent 2px,
        transparent 22px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0,
        transparent 28px,
        rgba(255,255,255,0.16) 28px,
        rgba(255,255,255,0.16) 30px
      ),
      linear-gradient(140deg, rgba(141,82,98,0.14), rgba(255,255,255,0.12))
    `,
    watermarkClassName: 'text-[rgba(119,67,82,0.16)]',
  },
  'flowers-and-floristry': {
    backgroundColor: '#adc1b1',
    backgroundImage: `
      radial-gradient(circle at 18% 14%, rgba(255,255,255,0.72), transparent 30%),
      radial-gradient(ellipse at 76% 78%, rgba(55,83,63,0.18), transparent 34%),
      repeating-radial-gradient(
        ellipse at 78% 24%,
        rgba(255,255,255,0.16) 0,
        rgba(255,255,255,0.16) 2px,
        transparent 2px,
        transparent 24px
      ),
      linear-gradient(145deg, rgba(63,94,72,0.16), rgba(255,255,255,0.12))
    `,
    watermarkClassName: 'text-[rgba(50,75,57,0.17)]',
  },
  transport: {
    backgroundColor: '#bdb0cb',
    backgroundImage: `
      radial-gradient(circle at 18% 16%, rgba(255,255,255,0.7), transparent 28%),
      repeating-linear-gradient(
        135deg,
        transparent 0,
        transparent 22px,
        rgba(255,255,255,0.14) 22px,
        rgba(255,255,255,0.14) 24px
      ),
      linear-gradient(
        105deg,
        transparent 0 54%,
        rgba(75,59,89,0.12) 54% 56%,
        transparent 56% 100%
      ),
      linear-gradient(145deg, rgba(82,65,97,0.18), rgba(255,255,255,0.1))
    `,
    watermarkClassName: 'text-[rgba(69,54,82,0.17)]',
  },
};

const defaultCategoryVisual: CategoryVisual = {
  backgroundColor: '#c6bad0',
  backgroundImage: `
    radial-gradient(circle at 20% 16%, rgba(255,255,255,0.72), transparent 30%),
    radial-gradient(circle at 80% 78%, rgba(93,58,85,0.18), transparent 34%),
    repeating-linear-gradient(
      45deg,
      rgba(255,255,255,0.12) 0,
      rgba(255,255,255,0.12) 1px,
      transparent 1px,
      transparent 18px
    ),
    linear-gradient(145deg, rgba(93,58,85,0.18), rgba(255,255,255,0.1))
  `,
  watermarkClassName: 'text-[rgba(69,43,64,0.16)]',
};

const getVendorIcon = (vendor: PublicVendor) => {
  const primaryCategorySlug = vendor.categories[0]?.slug;

  if (!primaryCategorySlug) {
    return Sparkles;
  }

  return categoryIconMap[primaryCategorySlug] ?? Sparkles;
};

const getVendorVisual = (vendor: PublicVendor) => {
  const primaryCategorySlug = vendor.categories[0]?.slug;

  if (!primaryCategorySlug) {
    return defaultCategoryVisual;
  }

  return categoryVisualMap[primaryCategorySlug] ?? defaultCategoryVisual;
};

const formatRating = (vendor: PublicVendor) => {
  if (vendor.averageRating === null || vendor.reviewCount === 0) {
    return 'New vendor';
  }

  return `${vendor.averageRating.toFixed(1)} · ${
    vendor.reviewCount === 1 ? '1 review' : `${vendor.reviewCount} reviews`
  }`;
};

const getCategoryLabel = (vendor: PublicVendor) => vendor.categories[0]?.name ?? 'Event services';

const getLocationLabel = (vendor: PublicVendor) =>
  vendor.baseLocation ?? vendor.serviceAreas[0] ?? 'Sri Lanka';

type MarketplaceNavigationState = {
  source?: 'vendor-workspace';
  returnTo?: string;
  returnLabel?: string;
};

export function VendorsPage() {
  const location = useLocation();

  const navigationState = location.state as MarketplaceNavigationState | null;

  const isFromVendorWorkspace = navigationState?.source === 'vendor-workspace';

  const marketplaceReturnTo =
    isFromVendorWorkspace && navigationState?.returnTo
      ? navigationState.returnTo
      : '/vendor/dashboard';

  const marketplaceReturnLabel =
    isFromVendorWorkspace && navigationState?.returnLabel
      ? navigationState.returnLabel
      : 'Back to vendor dashboard';

  const [vendors, setVendors] = useState<PublicVendor[]>([]);
  const [pagination, setPagination] = useState<VendorPagination | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadVendors = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await getPublicVendors({
          page: 1,
          limit: 12,
          sort: 'name_asc',
          search: appliedSearch || undefined,
          location: appliedLocation || undefined,
          category: selectedCategory || undefined,
        });

        if (controller.signal.aborted) {
          return;
        }

        setVendors(result.vendors);
        setPagination(result.pagination);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('Failed to load public vendors:', error);

        setVendors([]);
        setPagination(null);
        setErrorMessage(
          'We could not load the vendor marketplace. Please check that the Eventure API is running and try again.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadVendors();

    return () => {
      controller.abort();
    };
  }, [appliedLocation, appliedSearch, retryCount, selectedCategory]);

  const marketplaceCountLabel = useMemo(() => {
    if (isLoading) {
      return 'Loading vendors';
    }

    const total = pagination?.total ?? vendors.length;

    return `${total} ${total === 1 ? 'vendor' : 'vendors'}`;
  }, [isLoading, pagination?.total, vendors.length]);

  const selectedCategoryLabel = useMemo(
    () => categoryFilters.find((category) => category.slug === selectedCategory)?.label ?? null,
    [selectedCategory],
  );

  const activeFilterCount = useMemo(
    () => [appliedSearch, appliedLocation, selectedCategory].filter(Boolean).length,
    [appliedLocation, appliedSearch, selectedCategory],
  );

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setAppliedSearch(searchInput.trim());
    setAppliedLocation(locationInput.trim());
  };

  const handleCategoryChange = (slug: string | null) => {
    setSelectedCategory(slug);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setLocationInput('');
    setAppliedSearch('');
    setAppliedLocation('');
    setSelectedCategory(null);
  };

  const handleRetry = () => {
    setRetryCount((currentCount) => currentCount + 1);
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/35 py-7 sm:py-8 lg:py-9">
  <div
    aria-hidden="true"
    className="pointer-events-none absolute -left-28 top-0 size-80 rounded-full bg-[var(--color-lilac)]/20 blur-3xl"
  />

  <div
    aria-hidden="true"
    className="pointer-events-none absolute -right-24 top-8 size-96 rounded-full bg-[var(--color-powder-blue)]/18 blur-3xl"
  />

  <div className="page-container relative">
    {isFromVendorWorkspace ? (
      <div className="mb-4">
        <Link
          to={marketplaceReturnTo}
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3.5 py-2 text-xs font-black text-[var(--color-charcoal)] shadow-[0_10px_24px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.20)] hover:bg-white/75 hover:text-[var(--color-deep-plum)]"
        >
          <span aria-hidden="true">←</span>
          {marketplaceReturnLabel}
        </Link>
      </div>
    ) : null}

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:gap-8">
      <div>
        <div className="soft-chip mb-3 w-fit text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)]">
          <Sparkles className="size-3.5" />
          Discover trusted event vendors
        </div>

        <h1 className="max-w-4xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl lg:text-[3.65rem]">
          Find the right vendors for every beautiful detail.
        </h1>

        <p className="mt-3 max-w-3xl text-pretty text-sm font-medium leading-6 text-[var(--color-charcoal)]/68 sm:text-[0.95rem]">
          Browse verified service providers, compare styles and reviews, explore service options and
          discover the right vendors for every part of your event.
        </p>
      </div>

      <aside className="relative overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/30 p-4 shadow-[0_18px_48px_rgba(31,27,29,0.08)] backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-[var(--color-lilac)]/18 blur-2xl"
        />

        <Camera
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2 -right-2 size-14 rotate-[9deg] text-[var(--color-deep-plum)]/[0.045]"
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
              Vendor marketplace
            </p>

            <span className="grid size-8 place-items-center rounded-xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)]">
              <BadgeCheck className="size-4" />
            </span>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black tracking-[-0.055em] text-[var(--color-near-black)]">
                {marketplaceCountLabel}
              </p>

              <p className="mt-1.5 max-w-[13rem] text-xs font-semibold leading-5 text-[var(--color-charcoal)]/60">
                Verified professionals across every part of your event.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--color-charcoal)]/8 pt-3 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
            <Sparkles className="size-3.5" />
            Trusted event professionals
          </div>
        </div>
      </aside>
    </div>

    <form
      className="relative mt-5 overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/28 p-3.5 shadow-[0_18px_48px_rgba(31,27,29,0.07)] backdrop-blur-xl"
      onSubmit={handleFilterSubmit}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-16 size-48 rounded-full bg-[var(--color-powder-blue)]/14 blur-3xl"
      />

      <div className="relative">
        <div className="grid gap-2.5 lg:grid-cols-[1fr_0.48fr_auto]">
          <label className="relative block">
            <span className="sr-only">Search vendors</span>

            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

            <input
              className="form-field !min-h-10 !pl-10"
              placeholder="Search vendors, categories, styles..."
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Filter by location</span>

            <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

            <input
              className="form-field !min-h-10 !pl-10"
              placeholder="Location"
              type="text"
              value={locationInput}
              onChange={(event) => {
                setLocationInput(event.target.value);
              }}
            />
          </label>

          <button
            type="submit"
            className="btn-primary min-h-10 min-w-[8rem] px-4 text-xs font-bold"
            disabled={isLoading}
          >
            {isLoading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <SlidersHorizontal className="size-4" />
            )}
            Apply filters
          </button>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {categoryFilters.map((category) => {
            const isSelected = selectedCategory === category.slug;

            return (
              <button
                key={category.label}
                type="button"
                aria-pressed={isSelected}
                className={
                  isSelected
                    ? 'soft-chip shrink-0 border-[var(--color-deep-plum)]/30 bg-[rgba(93,58,85,0.94)] !px-3 !py-1.5 text-xs text-[#fffaf5] shadow-[0_8px_20px_rgba(93,58,85,0.16)]'
                    : 'soft-chip shrink-0 !px-3 !py-1.5 text-xs transition duration-300 hover:bg-white/62'
                }
                onClick={() => {
                  handleCategoryChange(category.slug);
                }}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        {activeFilterCount > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-charcoal)]/8 pt-3">
            <span className="mr-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/48">
              Active filters
            </span>

            {appliedSearch ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/42 px-2.5 py-1 text-[0.68rem] font-bold text-[var(--color-charcoal)]/72">
                Search: {appliedSearch}
              </span>
            ) : null}

            {appliedLocation ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/55 bg-white/42 px-2.5 py-1 text-[0.68rem] font-bold text-[var(--color-charcoal)]/72">
                <MapPin className="size-3 text-[var(--color-rosewood)]" />
                {appliedLocation}
              </span>
            ) : null}

            {selectedCategoryLabel && selectedCategory ? (
              <span className="inline-flex items-center rounded-full border border-white/55 bg-white/42 px-2.5 py-1 text-[0.68rem] font-bold text-[var(--color-charcoal)]/72">
                {selectedCategoryLabel}
              </span>
            ) : null}

            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-black text-[var(--color-rosewood)] transition hover:bg-[var(--color-rosewood)]/8"
              onClick={handleClearFilters}
            >
              <X className="size-3" />
              Clear all
            </button>
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 border-t border-[var(--color-charcoal)]/8 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2.5 rounded-[1rem] border border-white/50 bg-white/28 px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(142,151,115,0.16)] text-[#4f5a3f]">
              <BadgeCheck className="size-3.5" />
            </span>

            <div>
              <p className="text-[0.68rem] font-black text-[var(--color-near-black)]">
                Verified vendors
              </p>
              <p className="text-[0.6rem] font-semibold text-[var(--color-charcoal)]/48">
                Marketplace approved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[1rem] border border-white/50 bg-white/28 px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(220,183,150,0.18)] text-[var(--color-rosewood)]">
              <Star className="size-3.5" />
            </span>

            <div>
              <p className="text-[0.68rem] font-black text-[var(--color-near-black)]">
                Reviewed services
              </p>
              <p className="text-[0.6rem] font-semibold text-[var(--color-charcoal)]/48">
                Real customer feedback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[1rem] border border-white/50 bg-white/28 px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
              <Sparkles className="size-3.5" />
            </span>

            <div>
              <p className="text-[0.68rem] font-black text-[var(--color-near-black)]">
                Structured quotations
              </p>
              <p className="text-[0.6rem] font-semibold text-[var(--color-charcoal)]/48">
                Compare with clarity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[1rem] border border-white/50 bg-white/28 px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(175,201,216,0.20)] text-[#3b515b]">
              <SlidersHorizontal className="size-3.5" />
            </span>

            <div>
              <p className="text-[0.68rem] font-black text-[var(--color-near-black)]">
                10 service categories
              </p>
              <p className="text-[0.6rem] font-semibold text-[var(--color-charcoal)]/48">
                Built for full events
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</section>

      <section className="page-container py-7 sm:py-8 lg:py-9">
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
        Vendor marketplace
      </p>

      <h2 className="mt-1.5 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl">
        Find professionals that fit your event.
      </h2>
    </div>

    <div className="max-w-xl sm:text-right">
      <p className="text-xs font-medium leading-5 text-[var(--color-charcoal)]/62 sm:text-sm">
        Compare service style, location and verified feedback, then explore the vendors that best
        match your event.
      </p>

      {!isLoading && !errorMessage ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/28 px-2.5 py-1 text-xs font-black text-[var(--color-deep-plum)] backdrop-blur-xl">
          <BadgeCheck className="size-3.5" />
          Showing {vendors.length} of {pagination?.total ?? vendors.length}{' '}
          {(pagination?.total ?? vendors.length) === 1 ? 'vendor' : 'vendors'}
        </div>
      ) : null}
    </div>
  </div>

  {isLoading ? (
    <div className="grid gap-3 lg:grid-cols-2" aria-live="polite" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[1.5rem] border border-white/55 bg-white/26 p-3.5 shadow-[0_16px_44px_rgba(31,27,29,0.06)] backdrop-blur-xl"
        >
          <div className="grid animate-pulse gap-4 sm:grid-cols-[8.5rem_1fr]">
            <div className="min-h-44 rounded-[1.2rem] bg-[var(--color-charcoal)]/8" />

            <div className="py-1">
              <div className="h-5 w-24 rounded-full bg-[var(--color-charcoal)]/8" />
              <div className="mt-4 h-6 w-2/3 rounded-lg bg-[var(--color-charcoal)]/9" />
              <div className="mt-3 h-3 w-3/4 rounded-lg bg-[var(--color-charcoal)]/7" />
              <div className="mt-4 h-3 w-full rounded-lg bg-[var(--color-charcoal)]/7" />
              <div className="mt-2 h-3 w-5/6 rounded-lg bg-[var(--color-charcoal)]/7" />
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : null}

  {!isLoading && errorMessage ? (
    <div className="grid min-h-60 place-items-center rounded-[1.7rem] border border-white/60 bg-white/28 p-7 text-center shadow-[0_18px_50px_rgba(31,27,29,0.07)] backdrop-blur-xl">
      <div className="max-w-lg">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
          <CircleAlert className="size-6" />
        </div>

        <p className="mt-4 text-lg font-black text-[var(--color-near-black)]">
          The marketplace is temporarily unavailable
        </p>

        <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/66">{errorMessage}</p>

        <button
          type="button"
          className="btn-secondary mt-4 text-sm font-bold"
          onClick={handleRetry}
        >
          Try again
        </button>
      </div>
    </div>
  ) : null}

  {!isLoading && !errorMessage && vendors.length === 0 ? (
    <div className="grid min-h-60 place-items-center rounded-[1.7rem] border border-white/60 bg-white/28 p-7 text-center shadow-[0_18px_50px_rgba(31,27,29,0.07)] backdrop-blur-xl">
      <div className="max-w-lg">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[rgba(93,58,85,0.1)] text-[var(--color-deep-plum)]">
          <Search className="size-6" />
        </div>

        <p className="mt-4 text-lg font-black text-[var(--color-near-black)]">
          No matching vendors yet
        </p>

        <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/66">
          Try a broader search, another location, or view every verified vendor in the marketplace.
        </p>

        <button
          type="button"
          className="btn-secondary mt-4 text-sm font-bold"
          onClick={handleClearFilters}
        >
          Clear filters
        </button>
      </div>
    </div>
  ) : null}

  {!isLoading && !errorMessage && vendors.length > 0 ? (
    <div className="grid gap-3 lg:grid-cols-2">
      {vendors.map((vendor) => {
        const VendorIcon = getVendorIcon(vendor);
        const vendorLogoUrl = vendorLogoMap[vendor.slug];
        const categoryVisual = getVendorVisual(vendor);
        const categoryLabel = getCategoryLabel(vendor);

        const visualStyle: CSSProperties = {
          backgroundColor: categoryVisual.backgroundColor,
          backgroundImage: categoryVisual.backgroundImage,
        };

        return (
          <article
            key={vendor.id}
            className="group relative overflow-hidden rounded-[1.55rem] border border-white/62 bg-[linear-gradient(145deg,rgba(255,255,255,0.48),rgba(255,255,255,0.26))] p-3 shadow-[0_16px_44px_rgba(31,27,29,0.065)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/88 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(248,243,250,0.46))] hover:shadow-[0_22px_56px_rgba(31,27,29,0.1)] sm:p-3.5"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.12)] opacity-0 blur-3xl transition duration-500 group-hover:opacity-100"
            />

            <div className="relative grid min-h-[13rem] gap-3.5 sm:grid-cols-[8.75rem_minmax(0,1fr)]">
              <div
                className="relative min-h-[11rem] overflow-hidden rounded-[1.25rem] border border-white/38 shadow-[0_14px_34px_rgba(31,27,29,0.11)] sm:min-h-full"
                style={visualStyle}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.24)_0%,transparent_38%,rgba(31,27,29,0.08)_100%)]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent"
                />

                <VendorIcon
                  aria-hidden="true"
                  className={`pointer-events-none absolute -bottom-6 -right-6 size-28 rotate-[-10deg] opacity-55 ${categoryVisual.watermarkClassName}`}
                />

                <div className="absolute left-2.5 top-2.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/42 bg-white/28 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.12em] text-[var(--color-near-black)]/72 backdrop-blur-xl">
                    <BadgeCheck className="size-2.5" />
                    Eventure
                  </span>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[52%]">
                  <div className="relative grid size-[5.5rem] place-items-center overflow-hidden rounded-[1.35rem] border border-white/72 bg-white/78 p-2.5 shadow-[0_16px_38px_rgba(31,27,29,0.18)] backdrop-blur-xl transition duration-300 group-hover:scale-[1.025]">
                    {vendorLogoUrl ? (
                      <img
                        src={vendorLogoUrl}
                        alt={`${vendor.businessName} logo`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <VendorIcon className="size-8 text-[var(--color-deep-plum)]" />
                    )}
                  </div>
                </div>

                <div className="absolute bottom-2.5 left-2.5">
                  <span className="grid size-7 place-items-center rounded-lg border border-white/52 bg-white/36 text-[var(--color-near-black)] backdrop-blur-xl">
                    <VendorIcon className="size-3.5" />
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-col py-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="status-chip !px-2.5 !py-1 text-[0.65rem]" data-tone="blue">
                    {categoryLabel}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(142,151,115,0.16)] bg-[rgba(142,151,115,0.16)] px-2.5 py-1 text-[0.65rem] font-black text-[#3d452f]">
                    <BadgeCheck className="size-3" />
                    Verified
                  </span>
                </div>

                <h3 className="mt-2.5 text-xl font-black leading-tight tracking-[-0.04em] text-[var(--color-near-black)] transition duration-300 group-hover:text-[var(--color-deep-plum)]">
                  {vendor.businessName}
                </h3>

                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[var(--color-charcoal)]/62">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 shrink-0 text-[var(--color-rosewood)]" />
                    <span>{getLocationLabel(vendor)}</span>
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <Star
                      className={
                        vendor.averageRating === null
                          ? 'size-3.5 shrink-0 text-[var(--color-charcoal)]/35'
                          : 'size-3.5 shrink-0 fill-[var(--color-dusty-olive)] text-[var(--color-dusty-olive)]'
                      }
                    />

                    <span>{formatRating(vendor)}</span>
                  </span>
                </div>

                <p className="mt-2.5 line-clamp-2 text-[0.82rem] font-medium leading-5 text-[var(--color-charcoal)]/66">
                  {vendor.description ??
                    'Explore this verified Eventure vendor and request a tailored quotation for your event.'}
                </p>

                <div className="mt-auto pt-3">
                  <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/52 bg-white/26 px-3 py-2.5 transition duration-300 group-hover:bg-white/38">
                    <div className="min-w-0">
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                        Pricing
                      </p>

                      <p className="mt-0.5 text-xs font-black text-[var(--color-rosewood)]">
                        Tailored quotation available
                      </p>
                    </div>

                    <Link
                      to={`/vendors/${vendor.slug}`}
                      state={
                        isFromVendorWorkspace
                          ? {
                              source: 'vendor-marketplace',
                              returnTo: '/vendors',
                              returnLabel: 'Back to marketplace',
                              marketplaceState: {
                                source: 'vendor-workspace',
                                returnTo: marketplaceReturnTo,
                                returnLabel: marketplaceReturnLabel,
                              },
                            }
                          : undefined
                      }
                      className="group/link inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-3 py-2 text-xs font-black text-[var(--color-near-black)] shadow-[0_8px_20px_rgba(31,27,29,0.06)] transition duration-300 hover:bg-white/80"
                    >
                      View profile
                      <ArrowRight className="size-3.5 transition duration-300 group-hover/link:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  ) : null}
</section>
    </>
  );
}
