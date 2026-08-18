import { ArrowLeft, CheckCircle2, Home, Sparkles } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

const platformHighlights = [
  'Discover and coordinate trusted vendors',
  'Compare structured quotations clearly',
  'Keep bookings, budgets and planning connected',
];

export function AuthLayout() {
  const navigate = useNavigate();

  const handleBack = () => {
    const historyIndex =
      typeof window !== 'undefined' && typeof window.history.state?.idx === 'number'
        ? window.history.state.idx
        : 0;

    if (historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-soft-ivory)] text-[var(--color-charcoal)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-32 top-12 size-[30rem] rounded-full bg-[var(--color-lilac)]/24 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-28 bottom-[-4rem] size-[34rem] rounded-full bg-[var(--color-powder-blue)]/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[42%] top-[38%] size-72 rounded-full bg-[var(--color-dusty-olive)]/8 blur-3xl"
      />

      <div className="relative grid min-h-screen lg:grid-cols-[0.94fr_1.06fr]">
        <section className="relative hidden overflow-hidden border-r border-white/55 bg-white/24 p-10 backdrop-blur-2xl lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-[var(--color-lilac)]/16 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-[-5rem] size-80 rounded-full bg-[var(--color-powder-blue)]/14 blur-3xl"
          />

          <div className="relative">
            <Link
              to="/"
              className="group inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40"
              aria-label="Eventure home"
            >
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-5 rounded-full bg-[var(--color-deep-plum)]/10 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                />

                <img
                  src="/images/branding/eventure-logo-navbar.png"
                  alt="Eventure"
                  className="relative h-16 w-auto max-w-[16rem] object-contain transition duration-300 group-hover:-translate-y-0.5 xl:h-18 xl:max-w-[18rem]"
                />
              </div>
            </Link>

            <div className="mt-20 max-w-xl xl:mt-24">
              <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <Sparkles className="size-4" />
                One connected planning experience
              </div>

              <h1 className="mt-7 text-balance text-5xl font-black leading-[0.97] tracking-[-0.06em] text-[var(--color-near-black)] xl:text-6xl">
                Every important event detail,
                <span className="block text-[var(--color-deep-plum)]">ready when you are.</span>
              </h1>

              <p className="mt-7 max-w-lg text-lg font-medium leading-8 text-[var(--color-charcoal)]/68">
                Sign in or create your Eventure account to bring vendors, quotations, bookings and
                event planning into one structured workspace.
              </p>
            </div>
          </div>

          <div className="relative mt-14 grid max-w-xl gap-3">
            {platformHighlights.map((item, index) => (
              <div
                key={item}
                className="group flex items-center gap-4 rounded-[1.35rem] border border-white/58 bg-white/32 px-4 py-4 shadow-[0_14px_38px_rgba(31,27,29,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/46"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)] transition duration-300 group-hover:bg-[var(--color-deep-plum)] group-hover:text-white">
                  <CheckCircle2 className="size-4.5" />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--color-near-black)]">{item}</p>

                  <p className="mt-1 text-[0.67rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/35">
                    Eventure · {String(index + 1).padStart(2, '0')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-[32rem]">
            <div className="mb-8 flex items-center justify-between gap-4 lg:mb-7">
              <button
                type="button"
                onClick={handleBack}
                className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/58 bg-white/32 px-4 text-sm font-black text-[var(--color-charcoal)]/70 shadow-[0_10px_28px_rgba(31,27,29,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/52 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40"
              >
                <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                Back
              </button>

              <Link
                to="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-black text-[var(--color-charcoal)]/54 transition hover:bg-white/30 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 lg:hidden"
              >
                <Home className="size-4" />
                Home
              </Link>
            </div>

            <Link
              to="/"
              className="group mb-8 inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 lg:hidden"
              aria-label="Eventure home"
            >
              <img
                src="/images/branding/eventure-logo-navbar.png"
                alt="Eventure"
                className="h-14 w-auto max-w-[14rem] object-contain transition duration-300 group-hover:-translate-y-0.5 sm:h-15 sm:max-w-[15rem]"
              />
            </Link>

            <div className="relative">
              <Outlet />
            </div>

            <div className="mt-8 flex items-center justify-center text-center text-xs font-bold text-[var(--color-charcoal)]/38">
              <span>Eventure · Plan beautifully. Celebrate confidently.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
