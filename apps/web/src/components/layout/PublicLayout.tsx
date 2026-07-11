import { CalendarDays, Sparkles } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';

const navLinks = [
  { to: '/vendors', label: 'Vendors', hint: 'Explore trusted event vendors' },
  {
    to: '/planning-guide',
    label: 'Planning Guide',
    hint: 'See how Eventure works',
  },
];

export function PublicLayout() {
  return (
    <div className="app-shell text-[var(--color-charcoal)]">
      <header className="sticky top-0 z-30 border-b border-white/35 bg-white/20 backdrop-blur-2xl">
        <div className="page-container flex items-center justify-between py-4">
          <Link to="/" className="group flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl transition group-hover:-translate-y-0.5">
              <CalendarDays className="size-5 text-[var(--color-deep-plum)]" />
            </span>

            <span className="flex flex-col leading-none">
              <span className="text-base font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                Eventure
              </span>
              <span className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Plan beautifully
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-white/40 bg-white/25 p-1 shadow-[0_12px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group relative rounded-full px-4 py-2 text-sm font-bold text-[var(--color-charcoal)]/80 transition hover:bg-white/40 hover:text-[var(--color-deep-plum)]"
              >
                {link.label}

                {'hint' in link ? (
                  <span className="pointer-events-none absolute left-1/2 top-full mt-3 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/50 bg-white/60 px-3 py-1.5 text-xs font-bold text-[var(--color-charcoal)]/70 shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl group-hover:block">
                    {link.hint}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-charcoal)]/80 transition hover:bg-white/40 hover:text-[var(--color-deep-plum)]"
            >
              Log in
            </Link>

            <Link to="/register" className="btn-primary text-sm font-bold">
              <Sparkles className="size-4" />
              Start planning
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
