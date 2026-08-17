import { ArrowUpRight, CalendarDays, LogIn, Mail, Sparkles, UserPlus } from 'lucide-react';
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 size-[26rem] rounded-full bg-[rgba(93,58,85,0.34)] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-12rem] left-[34%] size-[30rem] rounded-full bg-[rgba(183,167,200,0.10)] blur-3xl"
      />

      <div className="relative">
        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.75fr)]">
          <div className="relative px-6 py-12 sm:px-10 sm:py-14 lg:px-[max(3rem,calc((100vw-1180px)/2))] lg:py-16 lg:pr-12">
            <div className="grid gap-12 xl:grid-cols-[1.15fr_0.85fr] xl:gap-16">
              <div className="max-w-xl">
                <Link
                  to="/"
                  className="group inline-flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label="Eventure home"
                >
                  <span className="grid size-12 place-items-center rounded-2xl border border-white/12 bg-white/[0.08] text-[var(--color-light-champagne)] shadow-[0_16px_38px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-white/[0.13]">
                    <CalendarDays className="size-5" />
                  </span>

                  <span>
                    <span className="block text-lg font-black tracking-[-0.035em] text-white">
                      Eventure
                    </span>

                    <span className="mt-1 block text-[0.65rem] font-black uppercase tracking-[0.22em] text-[var(--color-light-champagne)]/68">
                      Plan beautifully
                    </span>
                  </span>
                </Link>

                <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[var(--color-light-champagne)]/56">
                  Event planning, thoughtfully connected
                </p>

                <h2 className="mt-3 max-w-lg text-3xl font-black leading-[1.05] tracking-[-0.045em] text-white sm:text-4xl">
                  Build every part of your event in one place.
                </h2>

                <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-white/58 sm:text-base">
                  Discover trusted vendors, organise the details that matter and turn scattered
                  planning into one calm, connected experience.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/register"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#fffaf5] hover:shadow-[0_18px_42px_rgba(0,0,0,0.24)]"
                  >
                    <UserPlus className="size-4" />
                    Start planning
                    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.08] px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.14]"
                  >
                    <LogIn className="size-4" />
                    Log in
                  </Link>
                </div>
              </div>

              <div className="grid gap-9 sm:grid-cols-2 xl:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                    Explore
                  </p>

                  <nav aria-label="Explore Eventure" className="mt-5 space-y-2">
                    {exploreLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex w-fit items-center gap-2 py-1.5 text-sm font-bold text-white/58 transition-colors duration-300 hover:text-white"
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
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-light-champagne)]">
                    Eventure
                  </p>

                  <nav aria-label="Eventure company links" className="mt-5 space-y-2">
                    {companyLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex w-fit items-center gap-2 py-1.5 text-sm font-bold text-white/58 transition-colors duration-300 hover:text-white"
                      >
                        <span className="transition-transform duration-300 group-hover:translate-x-1">
                          {link.label}
                        </span>

                        <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </nav>

                  <Link
                    to="/contact"
                    className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2.5 text-xs font-black text-white/72 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12] hover:text-white"
                  >
                    <Mail className="size-3.5" />
                    Contact Eventure
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative min-h-[22rem] overflow-hidden border-t border-white/10 sm:min-h-[26rem] lg:min-h-full lg:border-l lg:border-t-0">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('/images/event-planning-workspace.png')",
              }}
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,27,29,0.12)_0%,rgba(31,27,29,0.62)_100%)]"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 hidden bg-[linear-gradient(90deg,var(--color-near-black)_0%,rgba(31,27,29,0.84)_12%,rgba(31,27,29,0.30)_44%,transparent_78%)] lg:block"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[rgba(93,58,85,0.08)] mix-blend-multiply"
            />

            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 size-64 rounded-full bg-white/8 blur-3xl"
            />

            <div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-8 lg:left-8 lg:right-8">
              <div className="max-w-sm rounded-[1.6rem] border border-white/14 bg-[rgba(31,27,29,0.48)] p-5 shadow-[0_22px_64px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6">
                <div className="flex items-center gap-2 text-[var(--color-light-champagne)]">
                  <Sparkles className="size-4" />

                  <p className="text-[0.66rem] font-black uppercase tracking-[0.2em]">
                    One connected platform
                  </p>
                </div>

                <p className="mt-4 text-lg font-black leading-6 tracking-[-0.025em] text-white">
                  From the first idea to the final celebration.
                </p>

                <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
                  Keep inspiration, vendors and planning decisions together as your event takes
                  shape.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="page-container flex flex-col gap-3 py-5 text-xs font-bold text-white/38 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} Eventure. All rights reserved.</p>

            <p>Plan beautifully. Celebrate confidently.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
