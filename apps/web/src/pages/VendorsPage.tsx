import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ChefHat,
  Flower2,
  Heart,
  MapPin,
  Music2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
  'All vendors',
  'Photography',
  'Catering',
  'Decorations',
  'Music',
  'Venues',
  'Makeup',
];

const vendors = [
  {
    slug: 'luna-frame-studio',
    name: 'Luna Frame Studio',
    category: 'Photography',
    location: 'Colombo',
    price: 'From LKR 120k',
    rating: '4.9',
    reviews: '86 reviews',
    description:
      'Editorial wedding photography with soft natural tones, candid coverage and full-day storytelling packages.',
    accent: 'bg-[var(--color-valendor-lilac)]',
    icon: Camera,
    verified: true,
  },
  {
    slug: 'saffron-table-events',
    name: 'Saffron Table Events',
    category: 'Catering',
    location: 'Kandy',
    price: 'From LKR 2,800 / guest',
    rating: '4.8',
    reviews: '64 reviews',
    description:
      'Premium buffet, plated menus and custom Sri Lankan fusion catering for weddings and corporate events.',
    accent: 'bg-[var(--color-dusty-olive)]',
    icon: ChefHat,
    verified: true,
  },
  {
    slug: 'bloom-and-velvet-decor',
    name: 'Bloom & Velvet Decor',
    category: 'Decorations',
    location: 'Negombo',
    price: 'From LKR 180k',
    rating: '4.7',
    reviews: '51 reviews',
    description:
      'Floral styling, stage concepts, tablescapes and romantic mood-board driven event decoration.',
    accent: 'bg-[var(--color-rosewood)]',
    icon: Flower2,
    verified: true,
  },
  {
    slug: 'azure-rhythm-collective',
    name: 'Azure Rhythm Collective',
    category: 'Music',
    location: 'Galle',
    price: 'From LKR 95k',
    rating: '4.9',
    reviews: '39 reviews',
    description:
      'Live bands, acoustic sets and DJ entertainment with curated playlists for elegant celebrations.',
    accent: 'bg-[var(--color-powder-blue)]',
    icon: Music2,
    verified: false,
  },
];

export function VendorsPage() {
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
                120+ vendors
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                Across photography, catering, decor and more
              </p>
            </div>
          </div>

          <div className="glass-card mt-10 p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_0.55fr_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />
                <input
                  className="form-field !pl-12"
                  placeholder="Search vendors, categories, styles..."
                  type="search"
                />
              </label>

              <label className="relative block">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />
                <input className="form-field !pl-12" placeholder="Location" type="text" />
              </label>

              <button type="button" className="btn-primary text-sm font-bold">
                <SlidersHorizontal className="size-4" />
                Filter
              </button>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category, index) => (
                <button
                  key={category}
                  type="button"
                  className={
                    index === 0
                      ? 'soft-chip shrink-0 bg-[rgba(93,58,85,0.92)] text-[#fffaf5]'
                      : 'soft-chip shrink-0'
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
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
            Compare vendors by service style, location, reviews and starting price before sending a
            structured quotation request from your event workspace.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {vendors.map((vendor) => (
            <article key={vendor.name} className="luxe-card overflow-hidden p-5">
              <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
                <div
                  className={`relative min-h-56 overflow-hidden rounded-[1.5rem] ${vendor.accent}`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.54),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.22),transparent)]" />

                  <div className="absolute bottom-5 left-5 grid size-14 place-items-center rounded-2xl border border-white/48 bg-white/30 text-[var(--color-near-black)] shadow-[0_14px_34px_rgba(31,27,29,0.16)] backdrop-blur-xl">
                    <vendor.icon className="size-7" />
                  </div>

                  <button
                    type="button"
                    className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/48 bg-white/28 text-[var(--color-near-black)] backdrop-blur-xl"
                    aria-label={`Save ${vendor.name}`}
                  >
                    <Heart className="size-5" />
                  </button>
                </div>

                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-chip" data-tone="blue">
                      {vendor.category}
                    </span>

                    {vendor.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(142,151,115,0.18)] px-3 py-1 text-xs font-black text-[#3d452f]">
                        <BadgeCheck className="size-3.5" />
                        Verified
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-5 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    {vendor.name}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-[var(--color-charcoal)]/62">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-[var(--color-rosewood)]" />
                      {vendor.location}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Star className="size-4 fill-[var(--color-dusty-olive)] text-[var(--color-dusty-olive)]" />
                      {vendor.rating} · {vendor.reviews}
                    </span>
                  </div>

                  <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
                    {vendor.description}
                  </p>

                  <div className="mt-auto pt-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <p className="text-lg font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        {vendor.price}
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
          ))}
        </div>
      </section>
    </>
  );
}
