import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Images,
  LayoutDashboard,
  MessageSquareQuote,
  PackageCheck,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const businessLinks = [
  {
    label: 'Dashboard',
    to: '/vendor/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Business profile',
    to: '/vendor/profile',
    icon: UserRound,
  },
  {
    label: 'Portfolio',
    to: '/vendor/portfolio',
    icon: Images,
  },
  {
    label: 'Packages',
    to: '/vendor/packages',
    icon: PackageCheck,
  },
  {
    label: 'Availability',
    to: '/vendor/availability',
    icon: CalendarDays,
  },
];

const workLinks = [
  {
    label: 'Quotation requests',
    to: '/vendor/quotation-requests',
    icon: MessageSquareQuote,
  },
  {
    label: 'Bookings',
    to: '/vendor/bookings',
    icon: CalendarCheck,
  },
];

const reputationLinks = [
  {
    label: 'Reviews',
    to: '/vendor/reviews',
    icon: Star,
  },
  {
    label: 'Complaints',
    to: '/vendor/complaints',
    icon: ShieldAlert,
  },
];

const accountLinks = [
  {
    label: 'Notifications',
    to: '/notifications',
    icon: Bell,
  },
  {
    label: 'Settings',
    to: '/vendor/settings',
    icon: Settings,
  },
];

export function VendorWorkspaceFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-14 w-full overflow-hidden border-t border-[#eadfd7] bg-[#2c2229] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-44 size-[34rem] rounded-full bg-[#6f4865]/30 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-20rem] left-[30%] size-[36rem] rounded-full bg-[#d7bfd0]/[0.07] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-0 h-px w-[34%] bg-gradient-to-r from-transparent via-[#ead5bb]/45 to-transparent"
      />

      <div className="relative mx-auto grid w-full lg:grid-cols-[minmax(0,1.46fr)_minmax(24rem,0.54fr)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[52%] overflow-hidden lg:block"
        >
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: "url('/images/footer/eventure-vendor-footer.png')",
              backgroundPosition: 'right center',
              backgroundSize: 'auto 112%',
            }}
          />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,#2c2229_0%,rgba(44,34,41,0.92)_10%,rgba(44,34,41,0.58)_24%,rgba(44,34,41,0.14)_42%,transparent_64%)]" />

          <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-[#2c2229]/65 via-[#2c2229]/18 to-transparent" />
        </div>

        <div className="relative z-10 px-6 py-12 sm:px-10 lg:px-[max(3rem,calc((100vw-1180px)/2))] lg:py-14 lg:pr-12">
          <div className="grid gap-11 xl:grid-cols-[1.03fr_0.97fr] xl:gap-14">
            <div className="max-w-lg">
              <Link
                to="/vendor/dashboard"
                aria-label="Eventure vendor dashboard"
                className="group inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ead5bb]/70"
              >
                <img
                  src="/images/branding/eventure-logo-navbar.png"
                  alt="Eventure"
                  className="h-[4.35rem] w-auto max-w-[17rem] object-contain brightness-[3.5] contrast-[1.1] saturate-[0.82] drop-shadow-[0_3px_12px_rgba(255,255,255,0.08)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:brightness-[3.9]"
                />
              </Link>

              <div className="mt-5 flex items-center gap-2.5">
                <span className="h-px w-7 bg-[#ead5bb]/55" />

                <p className="text-[0.66rem] font-black uppercase tracking-[0.24em] text-[#ead5bb]/75">
                  Your business on Eventure
                </p>
              </div>

              <h2 className="mt-4 max-w-md text-3xl font-black leading-[1.08] tracking-[-0.045em] text-[#fffaf6] sm:text-[2.15rem]">
                Manage the work behind every great event.
              </h2>

              <p className="mt-4 max-w-md text-sm font-medium leading-7 text-[#f8eef4]/60 sm:text-[0.95rem]">
                Keep your services, availability, quotations, bookings and reputation connected from
                one professional vendor workspace.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/vendor/dashboard"
                  className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full !bg-[#fff8f2] px-5 text-sm font-black !text-[#5d3a55] shadow-[0_14px_34px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:!bg-white hover:shadow-[0_18px_42px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ead5bb]/75"
                >
                  <LayoutDashboard className="size-4 !text-[#5d3a55]" />

                  <span className="!text-[#5d3a55]">Open dashboard</span>

                  <ArrowRight className="size-4 !text-[#5d3a55] transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>

                <Link
                  to="/vendor/quotation-requests"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#ead5bb]/25 bg-white/[0.055] px-5 text-sm font-black text-[#fffaf6] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#ead5bb]/40 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ead5bb]/55"
                >
                  <BriefcaseBusiness className="size-4 text-[#ead5bb]" />
                  Quotation requests
                </Link>
              </div>
            </div>

            <div className="grid gap-x-9 gap-y-8 sm:grid-cols-2">
              <FooterLinkGroup
                title="Business"
                ariaLabel="Vendor business navigation"
                links={businessLinks}
              />

              <FooterLinkGroup title="Work" ariaLabel="Vendor work navigation" links={workLinks} />

              <FooterLinkGroup
                title="Reputation"
                ariaLabel="Vendor reputation navigation"
                links={reputationLinks}
              />

              <FooterLinkGroup
                title="Account"
                ariaLabel="Vendor account navigation"
                links={accountLinks}
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 min-h-[22rem] overflow-hidden border-t border-white/[0.06] lg:min-h-full lg:border-l lg:border-white/[0.055] lg:border-t-0">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-[72%_center] bg-no-repeat lg:hidden"
            style={{
              backgroundImage: "url('/images/footer/eventure-vendor-footer.png')",
            }}
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(44,34,41,0.08)_0%,rgba(44,34,41,0.88)_100%)] lg:hidden"
          />

          <div className="absolute inset-x-7 bottom-8 sm:inset-x-10 lg:bottom-11 lg:left-12 lg:right-10">
            <div className="max-w-sm">
              <div className="flex items-center gap-2 text-[#ead5bb]">
                <BadgeCheck className="size-4" />

                <p className="text-[0.66rem] font-black uppercase tracking-[0.22em]">
                  Vendor workspace
                </p>
              </div>

              <p className="mt-4 text-xl font-black leading-7 tracking-[-0.03em] text-[#fffaf6] sm:text-[1.45rem]">
                Keep your business ready for the next opportunity.
              </p>

              <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/60">
                Maintain your services, respond to customers and keep every confirmed commitment
                visible from one place.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ead5bb]/15 bg-[#2c2229]/30 px-3.5 py-2 text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#ead5bb]/75 backdrop-blur-md">
                <Sparkles className="size-3.5" />
                Built for vendor coordination
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/[0.08] bg-black/[0.08]">
        <div className="page-container flex flex-col gap-2.5 py-4 text-xs font-bold text-white/36 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Eventure. All rights reserved.</p>

          <p className="text-[#ead5bb]/45">Built for professionals behind remarkable events.</p>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

type FooterLinkGroupProps = {
  title: string;
  ariaLabel: string;
  links: FooterLink[];
};

function FooterLinkGroup({ title, ariaLabel, links }: FooterLinkGroupProps) {
  return (
    <div>
      <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-[#ead5bb]">{title}</p>

      <nav aria-label={ariaLabel} className="mt-4 space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.to}
              to={link.to}
              className="group flex w-fit items-center gap-2.5 py-1.5 text-sm font-bold text-white/58 transition-colors duration-300 hover:text-white"
            >
              <Icon className="size-3.5 text-[#ead5bb]/45 transition-all duration-300 group-hover:text-[#ead5bb]" />

              <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
