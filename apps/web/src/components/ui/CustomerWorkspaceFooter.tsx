import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Sparkles,
  Store,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const workspaceLinks = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'My events',
    to: '/events',
    icon: CalendarDays,
  },
  {
    label: 'Notifications',
    to: '/notifications',
    icon: Bell,
  },
];

const discoverLinks = [
  {
    label: 'Browse vendors',
    to: '/vendors',
    icon: Store,
  },
  {
    label: 'Planning guide',
    to: '/planning-guide',
    icon: Sparkles,
  },
];

const accountLinks = [
  {
    label: 'My profile',
    to: '/customer/profile',
    icon: UserRound,
  },
  {
    label: 'Account settings',
    to: '/customer/account-settings',
    icon: Settings,
  },
];

const eventureLinks = [
  {
    label: 'About Eventure',
    to: '/about',
  },
  {
    label: 'Contact',
    to: '/contact',
  },
  {
    label: 'Privacy & Terms',
    to: '/privacy',
  },
  
];

export function CustomerWorkspaceFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-16 w-full overflow-hidden bg-[var(--color-near-black)] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 size-[30rem] rounded-full bg-[rgba(93,58,85,0.34)] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-17rem] left-[34%] size-[34rem] rounded-full bg-[rgba(183,167,200,0.08)] blur-3xl"
      />

      <div className="relative mx-auto grid w-full lg:grid-cols-[minmax(0,1.4fr)_minmax(25rem,0.6fr)]">
        <div className="px-6 py-14 sm:px-10 lg:px-[max(3rem,calc((100vw-1180px)/2))] lg:py-16 lg:pr-14">
          <div className="grid gap-14 xl:grid-cols-[1.08fr_0.92fr] xl:gap-16">
            <div className="max-w-lg">
              <Link
                to="/"
                aria-label="Eventure home"
                className="group inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              >
                <img
                  src="/images/branding/eventure-logo-navbar.png"
                  alt="Eventure"
                  className="h-[5rem] w-auto max-w-[18rem] object-contain brightness-[3.6] contrast-[1.15] saturate-[0.85] drop-shadow-[0_2px_10px_rgba(255,255,255,0.10)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:brightness-[4]"
                />
              </Link>

              <p className="mt-6 text-[0.68rem] font-black uppercase tracking-[0.24em] text-[var(--color-light-champagne)]/62">
                Your planning space
              </p>

              <h2 className="mt-4 max-w-md text-3xl font-black leading-[1.08] tracking-[-0.045em] text-white sm:text-4xl">
                Keep every event detail connected.
              </h2>

              <p className="mt-5 max-w-md text-sm font-medium leading-7 text-white/60 sm:text-base">
                Move between events, vendors, updates and planning tools without losing sight of
                what matters next.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/dashboard"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full !bg-[#fffaf5] px-5 text-sm font-black !text-[#5d3a55] shadow-[0_16px_38px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:!bg-white hover:shadow-[0_20px_46px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <LayoutDashboard className="size-4 !text-[#5d3a55]" />
                  <span className="!text-[#5d3a55]">Go to dashboard</span>

                  <ArrowRight className="size-4 !text-[#5d3a55] transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>

                <Link
                  to="/events"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/22 bg-white/[0.07] px-5 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/32 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
                >
                  <CalendarDays className="size-4" />
                  My events
                </Link>
              </div>
            </div>

            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                  Workspace
                </p>

                <nav aria-label="Customer workspace footer navigation" className="mt-5 space-y-2">
                  {workspaceLinks.map((link) => {
                    const Icon = link.icon;

                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex w-fit items-center gap-2.5 py-1.5 text-sm font-bold text-white/62 transition-colors duration-300 hover:text-white"
                      >
                        <Icon className="size-3.5 text-white/40 transition-colors duration-300 group-hover:text-[var(--color-light-champagne)]" />

                        <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                          {link.label}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                  Discover
                </p>

                <nav aria-label="Customer discovery navigation" className="mt-5 space-y-2">
                  {discoverLinks.map((link) => {
                    const Icon = link.icon;

                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex w-fit items-center gap-2.5 py-1.5 text-sm font-bold text-white/62 transition-colors duration-300 hover:text-white"
                      >
                        <Icon className="size-3.5 text-white/40 transition-colors duration-300 group-hover:text-[var(--color-light-champagne)]" />

                        <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                          {link.label}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                  Account
                </p>

                <nav aria-label="Customer account navigation" className="mt-5 space-y-2">
                  {accountLinks.map((link) => {
                    const Icon = link.icon;

                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex w-fit items-center gap-2.5 py-1.5 text-sm font-bold text-white/62 transition-colors duration-300 hover:text-white"
                      >
                        <Icon className="size-3.5 text-white/40 transition-colors duration-300 group-hover:text-[var(--color-light-champagne)]" />

                        <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                          {link.label}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                  Eventure
                </p>

                <nav aria-label="Eventure footer navigation" className="mt-5 space-y-2">
                  {eventureLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="group flex w-fit items-center gap-2 py-1.5 text-sm font-bold text-white/62 transition-colors duration-300 hover:text-white"
                    >
                      <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                        {link.label}
                      </span>

                      <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[25rem] overflow-hidden lg:min-h-full">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{
              backgroundImage: "url('/images/event-planning-workspace.png')",
            }}
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,27,29,0.22)_0%,rgba(31,27,29,0.78)_100%)]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 hidden bg-[linear-gradient(90deg,var(--color-near-black)_0%,rgba(31,27,29,0.88)_13%,rgba(31,27,29,0.36)_48%,transparent_86%)] lg:block"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[rgba(93,58,85,0.12)] mix-blend-multiply"
          />

          <div
            aria-hidden="true"
            className="absolute right-[-8rem] top-[-7rem] size-[24rem] rounded-full border border-white/[0.04]"
          />

          <div
            aria-hidden="true"
            className="absolute right-[-3rem] top-[-2rem] size-[17rem] rounded-full border border-white/[0.035]"
          />

          <div className="absolute inset-x-7 bottom-10 sm:inset-x-10 lg:bottom-14 lg:left-14 lg:right-12">
            <div className="max-w-md">
              <div className="flex items-center gap-2 text-[var(--color-light-champagne)]">
                <Sparkles className="size-4" />

                <p className="text-[0.68rem] font-black uppercase tracking-[0.22em]">
                  Customer planning
                </p>
              </div>

              <p className="mt-5 text-xl font-black leading-7 tracking-[-0.03em] text-white sm:text-2xl">
                Your plans stay connected as the event evolves.
              </p>

              <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/62">
                Return to your dashboard, continue an event or explore trusted vendors whenever you
                need them.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/[0.09]">
        <div className="page-container flex flex-col gap-3 py-5 text-xs font-bold text-white/38 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Eventure. All rights reserved.</p>

          <p>Every detail, thoughtfully kept together.</p>
        </div>
      </div>
    </footer>
  );
}
