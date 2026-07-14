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
  Heart,
  LoaderCircle,
  MapPin,
  Music2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react';
import { type ComponentType, type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPublicVendors,
  type PublicVendor,
  type VendorPagination,
} from '../features/vendors/vendor.api';

type CategoryFilter = {
  label: string;
  slug: string | null;
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

const accentClasses = [
  'bg-[var(--color-valendor-lilac)]',
  'bg-[var(--color-dusty-olive)]',
  'bg-[var(--color-rosewood)]',
  'bg-[var(--color-powder-blue)]',
  'bg-[rgba(224,198,181,0.82)]',
  'bg-[rgba(190,176,203,0.82)]',
  'bg-[rgba(173,193,177,0.82)]',
  'bg-[rgba(207,183,193,0.82)]',
];

const getVendorIcon = (vendor: PublicVendor) => {
  const primaryCategorySlug = vendor.categories[0]?.slug;

  if (!primaryCategorySlug) {
    return Sparkles;
  }

  return categoryIconMap[primaryCategorySlug] ?? Sparkles;
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

export function VendorsPage() {
  const [vendors, setVendors] = useState<PublicVendor[]>([]);
  const [pagination, setPagination] = useState<VendorPagination | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
  }, [appliedLocation, appliedSearch, selectedCategory]);

  const marketplaceCountLabel = useMemo(() => {
    if (isLoading) {
      return 'Loading vendors';
    }

    const total = pagination?.total ?? vendors.length;

    return `${total} ${total === 1 ? 'vendor' : 'vendors'}`;
  }, [isLoading, pagination?.total, vendors.length]);

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

  return (
    <>
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="pointer-events-none absolute left-[8%] top-16 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-24 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

        <div className="page-container">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.45fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Sparkles className="size-4" />
                Discover trusted event vendors
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Find the right vendors for every beautiful detail.
              </h1>

              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                Browse verified service providers, compare styles, shortlist your favourites and
                prepare structured quotation requests for your event workspace.
              </p>
            </div>

            <div className="glass-card p-5">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                Public marketplace
              </p>

              <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {marketplaceCountLabel}
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                Across photography, catering, décor and more
              </p>
            </div>
          </div>

          <form className="glass-card mt-10 p-4 sm:p-5" onSubmit={handleFilterSubmit}>
            <div className="grid gap-3 lg:grid-cols-[1fr_0.55fr_auto]">
              <label className="relative block">
                <span className="sr-only">Search vendors</span>

                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                <input
                  className="form-field !pl-12"
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

                <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                <input
                  className="form-field !pl-12"
                  placeholder="Location"
                  type="text"
                  value={locationInput}
                  onChange={(event) => {
                    setLocationInput(event.target.value);
                  }}
                />
              </label>

              <button type="submit" className="btn-primary text-sm font-bold" disabled={isLoading}>
                {isLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <SlidersHorizontal className="size-4" />
                )}
                Filter
              </button>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {categoryFilters.map((category) => {
                const isSelected = selectedCategory === category.slug;

                return (
                  <button
                    key={category.label}
                    type="button"
                    className={
                      isSelected
                        ? 'soft-chip shrink-0 bg-[rgba(93,58,85,0.92)] text-[#fffaf5]'
                        : 'soft-chip shrink-0'
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
          </form>
        </div>
      </section>

      <section className="page-container pb-24">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--color-rosewood)]">
              Featured matches
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl">
              Curated vendors for premium events.
            </h2>
          </div>

          <p className="max-w-md leading-7 text-[var(--color-charcoal)]/68">
            Compare vendors by service style, location and verified reviews before sending a
            structured quotation request from your event workspace.
          </p>
        </div>

        {isLoading ? (
          <div className="glass-card grid min-h-80 place-items-center p-10 text-center">
            <div>
              <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--color-deep-plum)]" />

              <p className="mt-5 text-lg font-black text-[var(--color-near-black)]">
                Loading the marketplace
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
                Gathering verified vendors and their latest public details.
              </p>
            </div>
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="glass-card grid min-h-80 place-items-center p-10 text-center">
            <div className="max-w-lg">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
                <CircleAlert className="size-7" />
              </div>

              <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                The marketplace is temporarily unavailable
              </p>

              <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">{errorMessage}</p>

              <button
                type="button"
                className="btn-secondary mt-6 text-sm font-bold"
                onClick={() => {
                  setAppliedSearch((currentValue) => `${currentValue}`);
                  setAppliedLocation((currentValue) => `${currentValue}`);
                  setErrorMessage(null);
                }}
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {!isLoading && !errorMessage && vendors.length === 0 ? (
          <div className="glass-card grid min-h-80 place-items-center p-10 text-center">
            <div className="max-w-lg">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(93,58,85,0.1)] text-[var(--color-deep-plum)]">
                <Search className="size-7" />
              </div>

              <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                No matching vendors yet
              </p>

              <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                Try a broader search, another location, or view every verified vendor in the
                marketplace.
              </p>

              <button
                type="button"
                className="btn-secondary mt-6 text-sm font-bold"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : null}

        {!isLoading && !errorMessage && vendors.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {vendors.map((vendor, index) => {
              const VendorIcon = getVendorIcon(vendor);
              const accentClass = accentClasses[index % accentClasses.length];

              return (
                <article key={vendor.id} className="luxe-card overflow-hidden p-5">
                  <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
                    <div
                      className={`relative min-h-56 overflow-hidden rounded-[1.5rem] ${accentClass}`}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.54),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.22),transparent)]" />

                      <div className="absolute bottom-5 left-5 grid size-14 place-items-center rounded-2xl border border-white/48 bg-white/30 text-[var(--color-near-black)] shadow-[0_14px_34px_rgba(31,27,29,0.16)] backdrop-blur-xl">
                        <VendorIcon className="size-7" />
                      </div>

                      <button
                        type="button"
                        className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/48 bg-white/28 text-[var(--color-near-black)] backdrop-blur-xl"
                        aria-label={`Save ${vendor.businessName}`}
                      >
                        <Heart className="size-5" />
                      </button>
                    </div>

                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-chip" data-tone="blue">
                          {getCategoryLabel(vendor)}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(142,151,115,0.18)] px-3 py-1 text-xs font-black text-[#3d452f]">
                          <BadgeCheck className="size-3.5" />
                          Verified
                        </span>
                      </div>

                      <h3 className="mt-5 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                        {vendor.businessName}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-[var(--color-charcoal)]/62">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-4 text-[var(--color-rosewood)]" />
                          {getLocationLabel(vendor)}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Star
                            className={
                              vendor.averageRating === null
                                ? 'size-4 text-[var(--color-charcoal)]/35'
                                : 'size-4 fill-[var(--color-dusty-olive)] text-[var(--color-dusty-olive)]'
                            }
                          />

                          {formatRating(vendor)}
                        </span>
                      </div>

                      <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
                        {vendor.description ??
                          'Explore this verified Eventure vendor and request a tailored quotation for your event.'}
                      </p>

                      <div className="mt-auto pt-6">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <p className="text-sm font-black text-[var(--color-rosewood)]">
                            Tailored pricing available
                          </p>

                          <Link
                            to={`/vendors/${vendor.slug}`}
                            className="btn-secondary text-sm font-bold"
                          >
                            View profile
                            <ArrowRight className="size-4" />
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
