import { ArrowLeft, CalendarCheck2, Sparkles } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--color-light-champagne)]">
      <div className="pointer-events-none fixed left-[8%] top-20 h-80 w-80 rounded-full bg-[rgba(183,167,200,0.30)] blur-3xl" />
      <div className="pointer-events-none fixed bottom-10 right-[8%] h-96 w-96 rounded-full bg-[rgba(175,201,216,0.28)] blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden border-r border-white/45 bg-[rgba(255,255,255,0.24)] p-10 backdrop-blur-2xl lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-full border border-white/55 bg-white/34 px-4 py-2 text-sm font-black text-[var(--color-near-black)] shadow-[0_12px_30px_rgba(31,27,29,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/48"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[var(--color-deep-plum)] text-[#fffaf5]">
                <CalendarCheck2 className="size-4" />
              </span>
              Eventure
            </Link>

            <div className="mt-20 max-w-xl">
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Sparkles className="size-4" />
                Plan with clarity
              </div>

              <h1 className="text-balance text-6xl font-black leading-[0.96] tracking-[-0.06em] text-[var(--color-near-black)]">
                Your event workspace starts here.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-8 text-[var(--color-charcoal)]/70">
                Sign in to manage vendors, quotations, bookings, budgets, guests, documents and the
                little details that make the event feel yours.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              'Structured quotation requests',
              'Vendor booking workflow',
              'Budget, task and document tracking',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/50 bg-white/30 px-4 py-3 text-sm font-bold text-[var(--color-charcoal)]/70 shadow-[0_14px_36px_rgba(31,27,29,0.08)] backdrop-blur-xl"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[31rem]">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/64 transition hover:text-[var(--color-deep-plum)]"
            >
              <ArrowLeft className="size-4" />
              Back to home
            </Link>

            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
