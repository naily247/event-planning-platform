import { ArrowLeft, CalendarCheck2, CheckCircle2, Sparkles } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';

const platformHighlights = [
  'Structured quotation requests',
  'Vendor booking workflow',
  'Budget, task and document tracking',
];

export function AuthLayout() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f3f4] text-[#2e2529]">
      <div className="pointer-events-none fixed -left-24 top-16 size-[28rem] rounded-full bg-rose-200/35 blur-3xl" />
      <div className="pointer-events-none fixed -right-24 bottom-0 size-[32rem] rounded-full bg-violet-200/30 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden border-r border-white/70 bg-white/45 p-10 backdrop-blur-2xl lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div>
            <Link
              to="/"
              className="group inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-black text-[#34282e] shadow-[0_12px_35px_rgba(64,42,51,0.08)] transition duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#6f4659] text-white shadow-[0_10px_24px_rgba(111,70,89,0.22)]">
                <CalendarCheck2 className="size-4" aria-hidden="true" />
              </span>

              Eventure
            </Link>

            <div className="mt-20 max-w-xl">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-100 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#7a5063] shadow-sm">
                <Sparkles className="size-4" aria-hidden="true" />
                Plan with clarity
              </div>

              <h1 className="mt-6 text-balance text-5xl font-black leading-[0.98] tracking-[-0.06em] text-[#2e2529] xl:text-6xl">
                Your event workspace starts here.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-8 text-zinc-600">
                Sign in to manage vendors, quotations, bookings, budgets, guests, documents, and
                every detail that keeps your event moving forward.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {platformHighlights.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 py-3.5 text-sm font-bold text-zinc-700 shadow-[0_14px_38px_rgba(64,42,51,0.06)] backdrop-blur-xl"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#7a5063]">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </span>

                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[31rem]">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-zinc-600 transition duration-300 hover:text-[#6f4659] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to home
            </Link>

            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}