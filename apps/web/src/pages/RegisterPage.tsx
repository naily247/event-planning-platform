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
    <div className="glass-card p-6 sm:p-8">
      <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
        <Sparkles className="size-4" />
        Join Eventure
      </div>

      <h1 className="text-4xl font-black leading-[1] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
        Choose how you want to use Eventure.
      </h1>

      <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
        Pick the account type that matches your role. You can start with the right workspace and
        we’ll shape the experience around it.
      </p>

      <div className="mt-8 grid gap-4">
        {accountTypes.map(({ title, label, text, to, icon: Icon, badge }) => (
          <Link
            key={title}
            to={to}
            className="group rounded-[1.5rem] border border-white/55 bg-white/30 p-5 shadow-[0_18px_48px_rgba(31,27,29,0.10)] backdrop-blur-2xl transition hover:-translate-y-1 hover:bg-white/42"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                <Icon className="size-6" />
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(142,151,115,0.18)] px-3 py-1 text-xs font-black text-[#3d452f]">
                <BadgeCheck className="size-3.5" />
                {badge}
              </span>
            </div>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
              {label}
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
              {title}
            </h2>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/68">{text}</p>

            <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)]">
              Continue
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-7 text-center text-sm font-semibold text-[var(--color-charcoal)]/62">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
