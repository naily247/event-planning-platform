import { useEffect, useState } from 'react';
import { CalendarDays, Mail, Menu, Sparkles, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/vendors', label: 'Vendors' },
  {
    to: '/planning-guide',
    label: 'Planning Guide',
  },
];

const footerLinkGroups = [
  {
    title: 'Product',
    links: [
      { to: '/vendors', label: 'Explore vendors' },
      { to: '/planning-guide', label: 'Planning guide' },
      { to: '/register', label: 'Start planning' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About Eventure' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/terms', label: 'Terms of service' },
    ],
  },
];

const getDesktopNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    'relative rounded-full px-4 py-2 text-sm font-bold transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40',
    isActive
      ? 'bg-white/55 text-[var(--color-deep-plum)] shadow-[0_8px_22px_rgba(31,27,29,0.08)]'
      : 'text-[var(--color-charcoal)]/80 hover:bg-white/40 hover:text-[var(--color-deep-plum)]',
  ].join(' ');

const getMobileNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40',
    isActive
      ? 'bg-white/60 text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.08)]'
      : 'text-[var(--color-charcoal)]/80 hover:bg-white/40 hover:text-[var(--color-deep-plum)]',
  ].join(' ');

export function PublicLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="app-shell flex min-h-screen flex-col text-[var(--color-charcoal)]">
      <header className="sticky top-0 z-30 border-b border-white/35 bg-white/20 backdrop-blur-2xl">
        <div className="page-container">
          <div className="flex min-h-[76px] items-center justify-between gap-3 py-3">
            <Link
              to="/"
              className="group flex shrink-0 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40"
              aria-label="Eventure home"
            >
              <span className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl transition group-hover:-translate-y-0.5">
                <CalendarDays className="size-5 text-[var(--color-deep-plum)]" />
              </span>

              <span className="hidden flex-col leading-none min-[390px]:flex">
                <span className="text-base font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                  Eventure
                </span>

                <span className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Plan beautifully
                </span>
              </span>
            </Link>

            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-2 rounded-full border border-white/40 bg-white/25 p-1 shadow-[0_12px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl md:flex"
            >
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={getDesktopNavLinkClassName}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="hidden rounded-full px-4 py-2 text-sm font-bold text-[var(--color-charcoal)]/80 transition hover:bg-white/40 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 sm:inline-flex"
              >
                Log in
              </Link>

              <Link to="/register" className="btn-primary hidden text-sm font-bold sm:inline-flex">
                <Sparkles className="size-4" />
                Start planning
              </Link>

              <button
                type="button"
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="public-mobile-navigation"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
                className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-charcoal)] shadow-[0_10px_26px_rgba(31,27,29,0.08)] backdrop-blur-xl transition hover:bg-white/45 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 md:hidden"
              >
                {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>

          <div
            id="public-mobile-navigation"
            className={[
              'overflow-hidden transition-[max-height,opacity,padding] duration-300 md:hidden',
              isMobileMenuOpen
                ? 'max-h-[420px] pb-4 opacity-100'
                : 'pointer-events-none max-h-0 pb-0 opacity-0',
            ].join(' ')}
          >
            <div className="rounded-[1.75rem] border border-white/45 bg-white/30 p-3 shadow-[0_18px_50px_rgba(31,27,29,0.10)] backdrop-blur-2xl">
              <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={getMobileNavLinkClassName}>
                    <span>{link.label}</span>

                    <span aria-hidden="true" className="text-[var(--color-rosewood)]">
                      →
                    </span>
                  </NavLink>
                ))}
              </nav>

              <div className="my-3 h-px bg-[var(--color-charcoal)]/10 sm:hidden" />

              <div className="grid gap-2 sm:hidden">
                <Link
                  to="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/45 bg-white/35 px-4 py-2 text-sm font-bold text-[var(--color-charcoal)] transition hover:bg-white/55 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40"
                >
                  Log in
                </Link>

                <Link
                  to="/register"
                  className="btn-primary min-h-11 justify-center text-sm font-bold"
                >
                  <Sparkles className="size-4" />
                  Start planning
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="relative overflow-hidden border-t border-white/35 bg-[var(--color-near-black)] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-0 size-72 rounded-full bg-[var(--color-deep-plum)]/35 blur-3xl"
        />

        <div className="relative">
          <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
            <div className="relative z-10 px-6 py-14 sm:px-10 sm:py-16 lg:px-[max(3rem,calc((100vw-1180px)/2))] lg:py-20 lg:pr-12">
              <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
                <div className="max-w-md">
                  <Link
                    to="/"
                    className="group inline-flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    aria-label="Eventure home"
                  >
                    <span className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl transition group-hover:-translate-y-0.5 group-hover:bg-white/15">
                      <CalendarDays className="size-5 text-[var(--color-light-champagne)]" />
                    </span>

                    <span>
                      <span className="block text-lg font-black tracking-[-0.03em]">Eventure</span>

                      <span className="mt-1 block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--color-light-champagne)]/70">
                        Plan beautifully
                      </span>
                    </span>
                  </Link>

                  <h2 className="mt-7 text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-4xl">
                    Plan beautifully.
                    <span className="block text-[var(--color-light-champagne)]">
                      Celebrate confidently.
                    </span>
                  </h2>

                  <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-white/60 sm:text-base">
                    Organise your event, discover trusted vendors and manage every important detail
                    from one thoughtfully designed workspace.
                  </p>

                  <Link
                    to="/contact"
                    className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <Mail className="size-4" />
                    Contact Eventure
                  </Link>
                </div>

                <nav
                  aria-label="Footer navigation"
                  className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-1"
                >
                  {footerLinkGroups.map((group) => (
                    <div key={group.title}>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                        {group.title}
                      </h3>

                      <ul className="mt-5 space-y-3">
                        {group.links.map((link) => (
                          <li key={link.to}>
                            <Link
                              to={link.to}
                              className="inline-flex rounded-md text-sm font-semibold text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              </div>
            </div>

            <div className="relative min-h-[340px] overflow-hidden sm:min-h-[420px] lg:min-h-full">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center brightness-[0.9] saturate-[0.92]"
                style={{
                  backgroundImage: "url('/images/event-planning-workspace.png')",
                }}
              />

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,27,29,0.18)_0%,rgba(31,27,29,0.4)_100%)]"
              />

              <div
                aria-hidden="true"
                className="absolute inset-0 hidden bg-[linear-gradient(90deg,var(--color-near-black)_0%,rgba(31,27,29,0.88)_7%,rgba(31,27,29,0.56)_20%,rgba(31,27,29,0.28)_16%,transparent_78%)] lg:block"
              />

              <div
                aria-hidden="true"
                className="absolute inset-0 hidden bg-[linear-gradient(90deg,var(--color-near-black)_0%,rgba(31,27,29,0.96)_7%,rgba(31,27,29,0.78)_20%,rgba(31,27,29,0.28)_48%,transparent_76%)] lg:block"
              />

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[var(--color-deep-plum)]/10 mix-blend-multiply"
              />

              <div className="absolute inset-x-6 bottom-6 rounded-[1.5rem] border border-white/15 bg-[var(--color-near-black)]/45 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:inset-x-10 sm:bottom-10 sm:p-6 lg:inset-x-auto lg:bottom-10 lg:right-10 lg:max-w-xs">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                  Thoughtful planning
                </p>

                <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
                  Bring ideas, vendors, schedules and details together before the celebration
                  begins.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10">
            <div className="page-container flex flex-col gap-4 py-7 text-xs font-semibold text-white/45 sm:flex-row sm:items-center sm:justify-between">
              <p>© 2026 Eventure. All rights reserved.</p>

              <p>Thoughtfully built for unforgettable events.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
