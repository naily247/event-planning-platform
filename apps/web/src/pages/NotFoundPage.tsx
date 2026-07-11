import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="pointer-events-none absolute left-[10%] top-20 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.3)] blur-3xl" />
      <div className="pointer-events-none absolute right-[12%] top-32 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

      <div className="page-container">
        <div className="glass-card mx-auto max-w-3xl p-8 text-center sm:p-10 lg:p-12">
          <div className="glass-card-content">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.4rem] border border-white/55 bg-white/30 shadow-[0_16px_42px_rgba(31,27,29,0.12)] backdrop-blur-2xl">
              <Compass className="size-8 text-[var(--color-deep-plum)]" />
            </div>

            <div className="soft-chip mx-auto mt-8 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
              <Sparkles className="size-4" />
              Page not found
            </div>

            <h1 className="mt-7 text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
              This page wandered off the event plan.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
              The route you opened does not exist yet, or it may have moved while the frontend
              workspace is still being built.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/" className="btn-primary text-sm font-bold">
                Back to home
                <ArrowRight className="size-4" />
              </Link>

              <Link to="/vendors" className="btn-secondary text-sm font-bold">
                Browse vendors
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
