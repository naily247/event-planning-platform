import { ArrowUpRight, CalendarDays, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const workspaceLinks = [
  {
    label: 'Dashboard',
    to: '/dashboard',
  },
  {
    label: 'My events',
    to: '/events',
  },
  {
    label: 'Browse vendors',
    to: '/vendors',
  },
  {
    label: 'Notifications',
    to: '/notifications',
  },
];

const companyLinks = [
  {
    label: 'About Eventure',
    to: '/about',
  },
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

export function CustomerWorkspaceFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-10 overflow-hidden rounded-[2.2rem] border border-white/50 bg-[linear-gradient(145deg,rgba(255,255,255,0.38),rgba(239,228,219,0.3))] shadow-[0_24px_70px_rgba(31,27,29,0.07)] backdrop-blur-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
      />

      <div className="relative grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:gap-14 lg:px-10">
        <div className="max-w-md">
          <Link to="/" className="group inline-flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl border border-white/55 bg-white/40 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.08)] transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-2 group-hover:bg-white/60 group-hover:shadow-[0_18px_42px_rgba(31,27,29,0.13)]">
              <CalendarDays className="size-5 transition-transform duration-500 group-hover:scale-110" />
            </span>

            <span>
              <span className="block text-lg font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                Eventure
              </span>

              <span className="mt-1 block text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Customer workspace
              </span>
            </span>
          </Link>

          <h2 className="mt-6 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl">
            Every detail, thoughtfully kept together.
          </h2>

          <p className="mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
            Plan the work, coordinate the people, and keep every important commitment visible from
            one beautifully organised workspace.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/32 px-3.5 py-2 text-[0.66rem] font-black uppercase tracking-[0.17em] text-[var(--color-deep-plum)]">
            <Sparkles className="size-3.5" />
            Built for calmer planning
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
            Workspace
          </p>

          <nav aria-label="Customer workspace footer navigation" className="mt-5 space-y-2">
            {workspaceLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex w-fit items-center gap-2 py-1.5 text-sm font-bold text-[var(--color-charcoal)]/64 transition-colors duration-300 hover:text-[var(--color-deep-plum)]"
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
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
            Eventure
          </p>

          <nav aria-label="Eventure footer navigation" className="mt-5 space-y-2">
            {companyLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex w-fit items-center gap-2 py-1.5 text-sm font-bold text-[var(--color-charcoal)]/64 transition-colors duration-300 hover:text-[var(--color-deep-plum)]"
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

      <div className="relative border-t border-white/50 px-6 py-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 text-xs font-bold text-[var(--color-charcoal)]/48 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Eventure. All rights reserved.</p>

          <p className="flex items-center gap-1.5">
            Made with
            <Heart
              aria-hidden="true"
              className="size-3.5 fill-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]"
            />
            for celebrations worth remembering.
          </p>
        </div>
      </div>
    </footer>
  );
}
