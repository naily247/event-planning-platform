import { CalendarDays, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

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

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
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
                Bring ideas, vendors, schedules and details together before the celebration begins.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="page-container flex flex-col gap-4 py-7 text-xs font-semibold text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} Eventure. All rights reserved.</p>

            <p>Thoughtfully built for unforgettable events.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
