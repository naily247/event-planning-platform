import { useEffect, useState } from 'react';
import { CalendarDays, Menu, Sparkles, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/vendors', label: 'Vendors' },
  {
    to: '/planning-guide',
    label: 'Planning Guide',
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
    <div className="app-shell text-[var(--color-charcoal)]">
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
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={getDesktopNavLinkClassName}
                >
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

              <Link
                to="/register"
                className="btn-primary hidden text-sm font-bold sm:inline-flex"
              >
                <Sparkles className="size-4" />
                Start planning
              </Link>

              <button
                type="button"
                aria-label={
                  isMobileMenuOpen
                    ? 'Close navigation menu'
                    : 'Open navigation menu'
                }
                aria-expanded={isMobileMenuOpen}
                aria-controls="public-mobile-navigation"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
                className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-charcoal)] shadow-[0_10px_26px_rgba(31,27,29,0.08)] backdrop-blur-xl transition hover:bg-white/45 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 md:hidden"
              >
                {isMobileMenuOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
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
              <nav
                aria-label="Mobile navigation"
                className="flex flex-col gap-1"
              >
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={getMobileNavLinkClassName}
                  >
                    <span>{link.label}</span>

                    <span
                      aria-hidden="true"
                      className="text-[var(--color-rosewood)]"
                    >
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

      <main>
        <Outlet />
      </main>
    </div>
  );
}