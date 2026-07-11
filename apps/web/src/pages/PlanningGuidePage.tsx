import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Search,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '01',
    title: 'Create your event workspace',
    text: 'Add the event type, date, location, guest count, budget and planning notes so every decision stays connected to the right celebration.',
    icon: CalendarDays,
  },
  {
    number: '02',
    title: 'Discover suitable vendors',
    text: 'Browse service providers by category, location, style, ratings and pricing guidance before shortlisting your favourites.',
    icon: Search,
  },
  {
    number: '03',
    title: 'Request structured quotations',
    text: 'Send clear quotation requests with event details, package preferences, deadlines, notes and reference requirements.',
    icon: FileCheck2,
  },
  {
    number: '04',
    title: 'Compare and confirm bookings',
    text: 'Review prices, deposits, inclusions, terms and availability before accepting a quotation and moving into booking confirmation.',
    icon: BadgeCheck,
  },
];

const benefits = [
  {
    title: 'Less scattered planning',
    text: 'Keep vendors, budgets, tasks, documents and inspiration inside one organised event workspace.',
    icon: CheckCircle2,
    tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
  },
  {
    title: 'Clearer vendor decisions',
    text: 'Compare proposals by structure instead of reading through endless chats, screenshots and notes.',
    icon: FileCheck2,
    tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
  },
  {
    title: 'Better budget visibility',
    text: 'Track committed costs, paid amounts, outstanding balances and upcoming payment deadlines.',
    icon: WalletCards,
    tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
  },
];

export function PlanningGuidePage() {
  return (
    <>
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="pointer-events-none absolute left-[8%] top-16 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-24 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

        <div className="page-container">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.45fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Sparkles className="size-4" />
                See how Eventure works
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                A clearer planning guide from first idea to confirmed vendors.
              </h1>

              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                Eventure turns scattered event planning into a calm workflow: create an event,
                discover vendors, request quotations, confirm bookings and track the important
                details in one place.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary text-sm font-bold">
                  Start planning
                  <ArrowRight className="size-4" />
                </Link>

                <Link to="/vendors" className="btn-secondary text-sm font-bold">
                  Browse vendors
                </Link>
              </div>
            </div>

            <div className="glass-card p-5">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Planning rhythm</p>
              <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                4-step flow
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                Event setup → vendor discovery → quotations → bookings
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container pb-10">
        <div className="grid gap-5 lg:grid-cols-4">
          {steps.map(({ number, title, text, icon: Icon }) => (
            <article key={title} className="luxe-card p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                  {number}
                </span>

                <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <Icon className="size-5" />
                </div>
              </div>

              <h2 className="mt-10 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                {title}
              </h2>

              <p className="mt-3 leading-7 text-[var(--color-charcoal)]/68">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-container pb-24">
        <div className="glass-card overflow-hidden p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-7 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.26)]">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-white/56">
                Customer journey
              </p>

              <h2 className="mt-4 text-4xl font-black leading-[1] tracking-[-0.055em]">
                Plan beautifully without losing control.
              </h2>

              <p className="mt-5 leading-7 text-white/68">
                The public website helps customers discover vendors, but the real power starts
                inside the event workspace where quotations, bookings, payments and tasks stay
                connected.
              </p>

              <div className="mt-8 grid gap-3">
                {['Event workspace', 'Quotation comparison', 'Budget tracking'].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl bg-white/12 px-4 py-3 text-sm font-bold backdrop-blur"
                  >
                    <span>{item}</span>
                    <CheckCircle2 className="size-4 text-[var(--color-powder-blue)]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {benefits.map(({ title, text, icon: Icon, tone }) => (
                <article
                  key={title}
                  className="rounded-[1.5rem] border border-white/55 bg-white/28 p-5 shadow-[0_18px_48px_rgba(31,27,29,0.10)] backdrop-blur-2xl"
                >
                  <div className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
                    <Icon className="size-5" />
                  </div>

                  <h3 className="mt-8 text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[var(--color-charcoal)]/68">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
