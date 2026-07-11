import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChefHat,
  Clock,
  Flower2,
  Heart,
  Image,
  MapPin,
  Music2,
  PackageCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const vendorDetails = {
  'luna-frame-studio': {
    name: 'Luna Frame Studio',
    category: 'Photography',
    location: 'Colombo',
    rating: '4.9',
    reviews: '86 reviews',
    responseTime: 'Responds within 24h',
    startingPrice: 'LKR 120k',
    eventsCovered: '180+',
    availability: 'Open',
    accent: 'bg-[var(--color-valendor-lilac)]',
    icon: Camera,
    description:
      'Editorial wedding photography with soft natural tones, candid coverage and full-day storytelling packages for refined Sri Lankan celebrations.',
    portfolioTitle: 'A soft editorial style for meaningful celebrations.',
    portfolioNote:
      'Portfolio imagery will come from uploaded vendor gallery assets once this page is connected to the backend profile API.',
    packages: [
      {
        title: 'Classic Wedding Story',
        price: 'From LKR 120k',
        text: 'Full-day photography coverage, edited gallery, online delivery and highlight portraits.',
      },
      {
        title: 'Editorial Couple Session',
        price: 'From LKR 45k',
        text: 'Pre-shoot session with mood-board planning, location guidance and 80 edited images.',
      },
      {
        title: 'Complete Photo + Video',
        price: 'From LKR 260k',
        text: 'Photography, cinematic highlight film, ceremony coverage and vendor coordination notes.',
      },
    ],
    portfolio: [
      'bg-[var(--color-valendor-lilac)]',
      'bg-[var(--color-powder-blue)]',
      'bg-[var(--color-dusty-olive)]',
      'bg-[var(--color-rosewood)]',
    ],
  },
  'saffron-table-events': {
    name: 'Saffron Table Events',
    category: 'Catering',
    location: 'Kandy',
    rating: '4.8',
    reviews: '64 reviews',
    responseTime: 'Responds within 12h',
    startingPrice: 'LKR 2,800 / guest',
    eventsCovered: '140+',
    availability: 'Limited',
    accent: 'bg-[var(--color-dusty-olive)]',
    icon: ChefHat,
    description:
      'Premium buffet, plated menus and custom Sri Lankan fusion catering for weddings, university events and corporate celebrations.',
    portfolioTitle: 'Elegant menus and tablescapes designed around the event mood.',
    portfolioNote:
      'Food presentation, buffet layouts and menu photography will be shown from vendor-uploaded gallery assets later.',
    packages: [
      {
        title: 'Classic Buffet Menu',
        price: 'From LKR 2,800 / guest',
        text: 'Rice, curries, mains, salads, desserts and service staff for elegant private events.',
      },
      {
        title: 'Premium Wedding Banquet',
        price: 'From LKR 4,500 / guest',
        text: 'Expanded buffet or plated service with welcome drinks, desserts and custom menu planning.',
      },
      {
        title: 'Corporate Dining Setup',
        price: 'From LKR 3,200 / guest',
        text: 'Professional catering for conferences, launches and formal business gatherings.',
      },
    ],
    portfolio: [
      'bg-[var(--color-dusty-olive)]',
      'bg-[var(--color-light-champagne)]',
      'bg-[var(--color-powder-blue)]',
      'bg-[var(--color-muted-burgundy)]',
    ],
  },
  'bloom-and-velvet-decor': {
    name: 'Bloom & Velvet Decor',
    category: 'Decorations',
    location: 'Negombo',
    rating: '4.7',
    reviews: '51 reviews',
    responseTime: 'Responds within 1 day',
    startingPrice: 'LKR 180k',
    eventsCovered: '95+',
    availability: 'Open',
    accent: 'bg-[var(--color-rosewood)]',
    icon: Flower2,
    description:
      'Floral styling, stage concepts, tablescapes and romantic mood-board driven event decoration for refined celebrations.',
    portfolioTitle: 'Romantic floral styling with velvet-soft event atmosphere.',
    portfolioNote:
      'Stage concepts, floral installations and decor boards will be displayed from real vendor portfolio uploads later.',
    packages: [
      {
        title: 'Intimate Floral Styling',
        price: 'From LKR 180k',
        text: 'Entrance florals, table styling, aisle details and compact ceremony decoration.',
      },
      {
        title: 'Full Wedding Decor',
        price: 'From LKR 420k',
        text: 'Stage design, ceremony styling, floral arrangements, tablescapes and lighting coordination.',
      },
      {
        title: 'Luxury Reception Concept',
        price: 'From LKR 650k',
        text: 'Mood-board led premium styling with custom structures, florals, lounge details and installation planning.',
      },
    ],
    portfolio: [
      'bg-[var(--color-rosewood)]',
      'bg-[var(--color-valendor-lilac)]',
      'bg-[var(--color-light-champagne)]',
      'bg-[var(--color-dusty-olive)]',
    ],
  },
  'azure-rhythm-collective': {
    name: 'Azure Rhythm Collective',
    category: 'Music',
    location: 'Galle',
    rating: '4.9',
    reviews: '39 reviews',
    responseTime: 'Responds within 24h',
    startingPrice: 'LKR 95k',
    eventsCovered: '75+',
    availability: 'Open',
    accent: 'bg-[var(--color-powder-blue)]',
    icon: Music2,
    description:
      'Live bands, acoustic sets and DJ entertainment with curated playlists for elegant weddings, parties and corporate events.',
    portfolioTitle: 'Curated soundtracks for calm, elegant and memorable events.',
    portfolioNote:
      'Performance clips, stage setups and event ambience visuals will come from vendor media uploads once connected.',
    packages: [
      {
        title: 'Acoustic Welcome Set',
        price: 'From LKR 95k',
        text: 'Soft acoustic performance for guest arrival, cocktail hours and intimate ceremonies.',
      },
      {
        title: 'Live Band Evening',
        price: 'From LKR 180k',
        text: 'Full live band setup with curated setlist, soundcheck and event flow coordination.',
      },
      {
        title: 'DJ + Live Hybrid',
        price: 'From LKR 240k',
        text: 'DJ entertainment with live musicians, dance-floor transitions and premium reception energy.',
      },
    ],
    portfolio: [
      'bg-[var(--color-powder-blue)]',
      'bg-[var(--color-deep-plum)]',
      'bg-[var(--color-valendor-lilac)]',
      'bg-[var(--color-dusty-olive)]',
    ],
  },
};

export function VendorDetailPage() {
  const { vendorSlug } = useParams();
  const vendor =
    vendorDetails[vendorSlug as keyof typeof vendorDetails] ?? vendorDetails['luna-frame-studio'];

  const VendorIcon = vendor.icon;

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
                className={`relative min-h-[420px] overflow-hidden rounded-[2rem] ${vendor.accent} shadow-[0_24px_70px_rgba(31,27,29,0.16)]`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.62),transparent_30%),linear-gradient(135deg,rgba(93,58,85,0.18),rgba(255,255,255,0.08))]" />

                <button
                  type="button"
                  className="absolute right-5 top-5 grid size-11 place-items-center rounded-full border border-white/50 bg-white/30 text-[var(--color-near-black)] backdrop-blur-xl"
                  aria-label="Save vendor"
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
                    {vendor.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-8 p-1 lg:p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-chip" data-tone="blue">
                      {vendor.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(142,151,115,0.18)] px-3 py-1 text-xs font-black text-[#3d452f]">
                      <BadgeCheck className="size-3.5" />
                      Verified
                    </span>
                  </div>

                  <h1 className="mt-6 max-w-3xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                    {vendor.name}
                  </h1>

                  <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                    {vendor.description}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <span className="soft-chip text-sm font-bold">
                      <MapPin className="size-4 text-[var(--color-rosewood)]" />
                      {vendor.location}
                    </span>
                    <span className="soft-chip text-sm font-bold">
                      <Star className="size-4 fill-[var(--color-dusty-olive)] text-[var(--color-dusty-olive)]" />
                      {vendor.rating} · {vendor.reviews}
                    </span>
                    <span className="soft-chip text-sm font-bold">
                      <Clock className="size-4 text-[var(--color-deep-plum)]" />
                      {vendor.responseTime}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-white/55 bg-white/28 p-5 backdrop-blur-2xl">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Starting price
                    </p>
                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {vendor.startingPrice}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/55 bg-white/28 p-5 backdrop-blur-2xl">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Events covered
                    </p>
                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {vendor.eventsCovered}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/55 bg-white/28 p-5 backdrop-blur-2xl">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Availability
                    </p>
                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {vendor.availability}
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
              {vendor.portfolioTitle}
            </h2>
          </div>

          <p className="max-w-md leading-7 text-[var(--color-charcoal)]/68">
            {vendor.portfolioNote}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {vendor.portfolio.map((tone, index) => (
            <div
              key={`${vendor.name}-${tone}`}
              className={`relative min-h-64 overflow-hidden rounded-[1.75rem] ${tone} shadow-[0_18px_48px_rgba(31,27,29,0.12)]`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.24),transparent)]" />
              <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/50 bg-white/30 px-3 py-2 text-xs font-black text-[var(--color-near-black)] backdrop-blur-xl">
                <Image className="size-4" />
                Shot {index + 1}
              </div>
            </div>
          ))}
        </div>
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

        <div className="grid gap-5 lg:grid-cols-3">
          {vendor.packages.map((item) => (
            <article key={item.title} className="luxe-card p-6">
              <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                <PackageCheck className="size-6" />
              </div>

              <h3 className="mt-8 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                {item.title}
              </h3>

              <p className="mt-3 text-lg font-black tracking-[-0.035em] text-[var(--color-rosewood)]">
                {item.price}
              </p>

              <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">{item.text}</p>

              <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/66">
                <CheckCircle2 className="size-4 text-[var(--color-dusty-olive)]" />
                Structured quotation available
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
