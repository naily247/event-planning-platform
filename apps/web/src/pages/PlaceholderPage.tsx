import { ArrowRight, Layers3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="pointer-events-none absolute left-[12%] top-20 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
      <div className="pointer-events-none absolute right-[10%] top-32 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

      <div className="page-container">
        <div className="glass-card mx-auto max-w-4xl p-8 sm:p-10 lg:p-12">
          <div className="glass-card-content">
            <div className="soft-chip mb-8 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
              <Sparkles className="size-4" />
              Foundation page
            </div>

            <div className="grid gap-10 lg:grid-cols-[1fr_0.72fr] lg:items-end">
              <div>
                <h1 className="text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  {title}
                </h1>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  This route is reserved for its dedicated feature module, API integration, loading
                  states, validation and responsive design. The visual foundation is ready, and the
                  full experience will be built section by section.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                  <Link to="/" className="btn-primary text-sm font-bold">
                    Back to home
                    <ArrowRight className="size-4" />
                  </Link>

                  <Link to="/vendors" className="btn-secondary text-sm font-bold">
                    Browse vendors
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/55 bg-white/24 p-5 shadow-[0_18px_48px_rgba(31,27,29,0.12)] backdrop-blur-2xl">
                <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.28)] text-[var(--color-deep-plum)]">
                  <Layers3 className="size-6" />
                </div>

                <p className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                  Next build layer
                </p>

                <ul className="mt-5 space-y-3 text-sm font-semibold text-[var(--color-charcoal)]/70">
                  <li>Dedicated page layout</li>
                  <li>Backend API connection</li>
                  <li>Forms, filters and states</li>
                  <li>Responsive final polish</li>
                </ul>

                <div className="mt-8 rounded-2xl bg-white/36 p-4 backdrop-blur-xl">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Design direction
                  </p>
                  <p className="mt-1 text-lg font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Cool Rich Editorial
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
