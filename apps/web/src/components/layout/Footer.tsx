import { ArrowRight, ArrowUpRight, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const exploreLinks = [
  {
    label: 'Browse vendors',
    to: '/vendors',
  },
  {
    label: 'Planning guide',
    to: '/planning-guide',
  },
  {
    label: 'About Eventure',
    to: '/about',
  },
];

const companyLinks = [
  {
    label: 'Contact',
    to: '/contact',
  },
  {
    label: 'Privacy',
    to: '/privacy',
  },
  {
    label: 'Terms',
    to: '/terms',
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[var(--color-near-black)] text-white">
      {/* ambient brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-28 size-[28rem] rounded-full bg-[var(--color-deep-plum)]/32 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-14rem] left-[25%] size-[30rem] rounded-full bg-[var(--color-lilac)]/8 blur-3xl"
      />

      {/* MAIN FOOTER */}
      <div className="relative min-h-[25rem] overflow-hidden">
        {/* right-side cinematic artwork */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 hidden w-[54%] overflow-hidden lg:block"
        >
          <div className="footer-scene absolute -inset-4">
            <img
              src="/images/footer/eventure-public-footer.png"
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>

          {/* main left fade */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-near-black)_0%,rgba(31,27,29,0.97)_8%,rgba(31,27,29,0.78)_27%,rgba(31,27,29,0.34)_54%,rgba(31,27,29,0.08)_78%,rgba(31,27,29,0.02)_100%)]" />

          {/* bottom grounding fade */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,27,29,0.02)_30%,rgba(31,27,29,0.42)_100%)]" />

          {/* subtle plum grading */}
          <div className="absolute inset-0 bg-[var(--color-deep-plum)]/[0.06] mix-blend-multiply" />
        </div>

        {/* mobile image */}
        <div className="relative h-60 overflow-hidden border-b border-white/10 sm:h-72 lg:hidden">
          <div className="footer-scene absolute -inset-4">
            <img
              src="/images/footer/eventure-public-footer.png"
              alt=""
              className="h-full w-full object-cover object-[72%_center]"
            />
          </div>

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,27,29,0.18)_0%,rgba(31,27,29,0.82)_100%)]" />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-near-black)_0%,rgba(31,27,29,0.38)_55%,rgba(31,27,29,0.06)_100%)]" />
        </div>

        <div className="page-container relative z-10">
          <div className="grid gap-10 py-10 sm:py-12 lg:min-h-[25rem] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
            {/* LEFT: BRAND + ACTIONS */}
            <div className="max-w-xl">
              <Link
                to="/"
                aria-label="Eventure home"
                className="group inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-6 rounded-full bg-[var(--color-deep-plum)]/20 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                  />

                  <img
                    src="/images/branding/eventure-logo-navbar.png"
                    alt="Eventure"
                    className="relative h-18 w-auto max-w-[18rem] brightness-0 invert sm:h-20 sm:max-w-[20rem]"
                  />
                </div>
              </Link>

              <p className="mt-6 text-[0.65rem] font-black uppercase tracking-[0.24em] text-[var(--color-light-champagne)]/58">
                Event planning, thoughtfully connected
              </p>

              <h2 className="mt-3 max-w-lg text-3xl font-black leading-[1.04] tracking-[-0.045em] text-white sm:text-[2.55rem]">
                One platform for every side of the event.
              </h2>

              <p className="mt-4 max-w-lg text-sm font-medium leading-7 text-white/55">
                Plan the experience, discover the right services and keep every important decision
                connected from beginning to celebration.
              </p>

              {/* primary actions */}
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/80 bg-white px-5 text-sm font-black !text-[var(--color-deep-plum)] shadow-[0_16px_38px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-light-champagne)] hover:!text-[var(--color-near-black)] hover:shadow-[0_20px_46px_rgba(0,0,0,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <UserPlus className="size-4" />
                  Start planning
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/login"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/16 bg-white/[0.08] px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/24 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <LogIn className="size-4" />
                  Log in
                  <ArrowRight className="size-4 opacity-60 transition-transform duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </Link>
              </div>

              <Link
                to="/register/vendor"
                className="group mt-4 inline-flex items-center gap-2 text-xs font-black text-white/45 transition duration-300 hover:text-[var(--color-light-champagne)]"
              >
                Joining as a vendor? Create a vendor account
                <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>

            {/* RIGHT / LINK AREA */}
            <div className="lg:justify-self-start lg:pl-10 xl:pl-14">
              <div className="grid gap-8 sm:grid-cols-2 lg:min-w-[23rem] lg:gap-10">
                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-[var(--color-light-champagne)]">
                    Explore
                  </p>

                  <nav aria-label="Explore Eventure" className="mt-3 space-y-1">
                    {exploreLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex w-fit items-center gap-2 py-1.5 text-sm font-bold text-white/50 transition duration-300 hover:text-white"
                      >
                        <span className="transition-transform duration-300 group-hover:translate-x-1">
                          {link.label}
                        </span>

                        <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </nav>
                </div>

                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-[var(--color-light-champagne)]">
                    Eventure
                  </p>

                  <nav aria-label="Eventure company links" className="mt-3 space-y-1">
                    {companyLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex w-fit items-center gap-2 py-1.5 text-sm font-bold text-white/50 transition duration-300 hover:text-white"
                      >
                        <span className="transition-transform duration-300 group-hover:translate-x-1">
                          {link.label}
                        </span>

                        <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </nav>
                </div>
              </div>

              {/* little footer signature */}
              <div className="mt-7 hidden max-w-sm rounded-[1.35rem] border border-white/12 bg-[rgba(31,27,29,0.44)] px-4 py-3.5 shadow-[0_16px_42px_rgba(0,0,0,0.18)] backdrop-blur-2xl lg:block">
                <p className="text-[0.61rem] font-black uppercase tracking-[0.18em] text-[var(--color-light-champagne)]/66">
                  Customers plan · Vendors deliver
                </p>

                <p className="mt-1.5 text-xs font-bold leading-5 text-white/55">
                  Eventure keeps both sides connected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COPYRIGHT BAR */}
      <div className="relative z-20 border-t border-white/10 bg-[rgba(31,27,29,0.78)] backdrop-blur-xl">
        <div className="page-container flex flex-col gap-2 py-4 text-[0.68rem] font-bold text-white/34 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Eventure. All rights reserved.</p>

          <p>Plan beautifully. Celebrate confidently.</p>
        </div>
      </div>

      <style>{`
        @keyframes footerSceneBreathing {
          0%,
          100% {
            transform: scale(1.01) translate3d(0, 0, 0);
          }

          50% {
            transform: scale(1.035) translate3d(-4px, -2px, 0);
          }
        }

        .footer-scene {
          animation: footerSceneBreathing 14s ease-in-out infinite;
          transform-origin: center;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .footer-scene {
            animation: none;
          }
        }
      `}</style>
    </footer>
  );
}
