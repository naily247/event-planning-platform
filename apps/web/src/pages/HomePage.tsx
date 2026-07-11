import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: CalendarDays,
    title: 'One event workspace',
    text: 'Bring vendors, schedules, tasks, documents, guests and inspiration into one calm planning space.',
    tone: 'bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]',
  },
  {
    icon: FileCheck2,
    title: 'Comparable quotations',
    text: 'Request structured proposals and compare inclusions, deposits, terms, expiry dates and vendor responses.',
    tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
  },
  {
    icon: WalletCards,
    title: 'Visible commitments',
    text: 'Track budgets, payments, deposits, outstanding balances and agreed costs without spreadsheet chaos.',
    tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
  },
];

const planningStats = [
  { label: 'Guest list', value: '248', icon: UsersRound },
  { label: 'Budget used', value: '62%', icon: WalletCards },
  { label: 'Tasks done', value: '34', icon: CheckCircle2 },
];

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-[8%] top-16 h-64 w-64 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-28 h-72 w-72 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

        <div className="page-container grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="relative z-10">
            <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
              <Sparkles className="size-4" />
              Plan clearly. Celebrate fully.
            </div>

            <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl lg:text-7xl">
              Every vendor, decision and deadline — finally in one elegant place.
            </h1>

            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/72">
              A premium event-planning workspace for discovering trusted vendors, comparing
              quotations, managing budgets and coordinating every detail without scattered chats,
              lost notes and spreadsheet drama.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary text-sm font-bold">
                Start planning
                <ArrowRight className="size-4" />
              </Link>

              <Link to="/vendors" className="btn-secondary text-sm font-bold">
                Browse vendors
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              {planningStats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass-card rounded-3xl p-4">
                  <Icon className="size-5 text-[var(--color-rosewood)]" />
                  <p className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    {value}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/62">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="glass-card relative min-h-[540px] overflow-hidden border-white/70 bg-white/15 p-4 shadow-[0_30px_90px_rgba(31,27,29,0.20)]">
              <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-[rgba(183,167,200,0.45)] blur-3xl" />
              <div className="absolute right-4 top-24 h-64 w-64 rounded-full bg-[rgba(175,201,216,0.42)] blur-3xl" />
              <div className="absolute bottom-16 left-20 h-48 w-48 rounded-full bg-[rgba(142,151,115,0.22)] blur-3xl" />
              <div className="absolute bottom-10 right-8 h-36 w-36 rounded-full bg-[rgba(175,201,216,0.28)] blur-3xl" />

              <div className="glass-card-content grid h-full min-h-[508px] gap-4">
                <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(93,58,85,0.96),rgba(124,74,90,0.9))] p-7 text-[#fffaf5] shadow-[0_22px_60px_rgba(93,58,85,0.28)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/56">
                        Wedding workspace
                      </p>
                      <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Aarav & Maya</h2>
                    </div>

                    <span className="rounded-full bg-white/14 px-3 py-1.5 text-xs font-bold text-white/82 backdrop-blur">
                      Active
                    </span>
                  </div>

                  <div className="mt-16">
                    <p className="text-6xl font-black tracking-[-0.06em]">68%</p>
                    <p className="mt-2 text-sm font-semibold text-white/62">planning progress</p>
                  </div>

                  <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/16">
                    <div className="h-full w-[68%] rounded-full bg-[var(--color-powder-blue)]" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/55 bg-white/28 p-6 shadow-[0_18px_44px_rgba(31,27,29,0.12)] backdrop-blur-2xl">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Budget remaining
                    </p>
                    <p className="mt-12 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      LKR 485k
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-dusty-olive)]">
                      Healthy buffer
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/55 bg-white/24 p-6 shadow-[0_18px_44px_rgba(31,27,29,0.12)] backdrop-blur-2xl">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Next deadline
                    </p>
                    <p className="mt-12 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                      Photography deposit
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                      Due in 4 days
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/60 bg-white/24 p-5 shadow-[0_18px_48px_rgba(31,27,29,0.12)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                        Vendor responses
                      </p>
                      <p className="mt-1 text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        7 quotations ready
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-full border border-white/50 bg-white/28 px-3 py-2 backdrop-blur-xl">
                      <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Mood
                      </span>
                      <div className="flex -space-x-2">
                        <span className="size-8 rounded-full border-2 border-white bg-[var(--color-valendor-lilac)]" />
                        <span className="size-8 rounded-full border-2 border-white bg-[var(--color-powder-blue)]" />
                        <span className="size-8 rounded-full border-2 border-white bg-[var(--color-dusty-olive)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container pb-24">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--color-rosewood)]">
              Built for real coordination
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl">
              Everything important gets a proper place.
            </h2>
          </div>

          <p className="max-w-md text-pretty leading-7 text-[var(--color-charcoal)]/68">
            The platform keeps planning emotional and beautiful on the surface, but structured and
            reliable underneath.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text, tone }) => (
            <article
              key={title}
              className="luxe-card p-7 transition hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(31,27,29,0.14)]"
            >
              <div className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
                <Icon className="size-6" />
              </div>

              <h3 className="mt-10 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                {title}
              </h3>

              <p className="mt-3 leading-7 text-[var(--color-charcoal)]/68">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
