import { ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarHeart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const accountTypes = [
  {
    title: 'I am planning an event',
    label: 'Customer account',
    text: 'Create events, discover vendors, request quotations, confirm bookings and manage your planning workspace.',
    to: '/register/customer',
    icon: CalendarHeart,
    badge: 'For customers',
  },
  {
    title: 'I provide event services',
    label: 'Vendor account',
    text: 'Create your vendor profile, receive quotation requests, manage bookings and showcase your portfolio.',
    to: '/register/vendor',
    icon: BriefcaseBusiness,
    badge: 'For vendors',
  },
];

export function RegisterPage() {
  return (
  <div className="relative overflow-hidden rounded-[2rem] border border-white/62 bg-white/34 p-6 shadow-[0_28px_90px_rgba(31,27,29,0.10)] backdrop-blur-2xl sm:p-8">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-[var(--color-lilac)]/18 blur-3xl"
    />

    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-24 -left-20 size-52 rounded-full bg-[var(--color-powder-blue)]/14 blur-3xl"
    />

    <div className="relative">
      <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
        <Sparkles className="size-4" />
        Join Eventure
      </div>

      <h1 className="max-w-md text-4xl font-black leading-[1.02] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
        Choose your
        <span className="block text-[var(--color-deep-plum)]">
          Eventure experience.
        </span>
      </h1>

      <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-[var(--color-charcoal)]/66 sm:text-base">
        Select the account type that matches how you will use the platform. We’ll take you directly
        into the right registration flow.
      </p>

      <div className="mt-8 grid gap-4">
        {accountTypes.map(({ title, label, text, to, icon: Icon, badge }, index) => (
          <Link
            key={title}
            to={to}
            className="group relative overflow-hidden rounded-[1.6rem] border border-white/58 bg-white/30 p-5 shadow-[0_18px_48px_rgba(31,27,29,0.08)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-white/78 hover:bg-white/46 hover:shadow-[0_24px_60px_rgba(31,27,29,0.12)] sm:p-6"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[var(--color-lilac)]/10 blur-2xl transition duration-300 group-hover:bg-[var(--color-lilac)]/18"
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition duration-300 group-hover:bg-[var(--color-deep-plum)] group-hover:text-white">
                  <Icon className="size-6" />
                </div>

                <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(142,151,115,0.16)] bg-[rgba(142,151,115,0.16)] px-3 py-1 text-xs font-black text-[#3d452f]">
                  <BadgeCheck className="size-3.5" />
                  {badge}
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  {label}
                </p>

                <span className="text-xs font-black tracking-[0.14em] text-[var(--color-charcoal)]/28">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-[1.7rem]">
                {title}
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/66">
                {text}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-[var(--color-charcoal)]/8 pt-5">
                <span className="text-sm font-black text-[var(--color-deep-plum)]">
                  Continue
                </span>

                <span className="grid size-9 place-items-center rounded-full bg-[var(--color-deep-plum)]/8 text-[var(--color-deep-plum)] transition duration-300 group-hover:translate-x-1 group-hover:bg-[var(--color-deep-plum)] group-hover:text-white">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-7 border-t border-[var(--color-charcoal)]/8 pt-6">
        <p className="text-center text-sm font-semibold text-[var(--color-charcoal)]/60">
          Already have an Eventure account?
        </p>

        <Link
          to="/login"
          className="group mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/34 px-4 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.05)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/54 hover:text-[var(--color-rosewood)]"
        >
          Log in
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  </div>
);
}
