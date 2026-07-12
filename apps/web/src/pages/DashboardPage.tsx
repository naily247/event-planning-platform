import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Plus,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthTokens } from '../features/auth/auth.storage';

const stats = [
  {
    label: 'Planned budget',
    value: 'LKR 1.8M',
    helper: 'Total event estimate',
    icon: WalletCards,
    tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
  },
  {
    label: 'Committed',
    value: 'LKR 925k',
    helper: 'Confirmed vendor costs',
    icon: CheckCircle2,
    tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
  },
  {
    label: 'Pending quotations',
    value: '4',
    helper: 'Awaiting vendor replies',
    icon: FileCheck2,
    tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
  },
  {
    label: 'Upcoming tasks',
    value: '7',
    helper: 'Due this week',
    icon: ClipboardList,
    tone: 'bg-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]',
  },
];

const timeline = [
  { label: 'Planning', active: true },
  { label: 'Design', active: true },
  { label: 'Vendors', active: true },
  { label: 'Final checks', active: false },
];

export function DashboardPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthTokens();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl">
              <CalendarDays className="size-5 text-[var(--color-deep-plum)]" />
            </span>

            <span className="flex flex-col leading-none">
              <span className="text-base font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                Eventure
              </span>
              <span className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Customer workspace
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/vendors" className="btn-secondary text-sm font-bold">
              Browse vendors
            </Link>

            <button type="button" className="btn-primary text-sm font-bold">
              <Plus className="size-4" />
              Create event
            </button>

            <button
              type="button"
              className="btn-secondary text-sm font-bold"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </header>

        <main className="py-10">
          <section className="grid gap-6 lg:grid-cols-[1fr_0.42fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <LayoutDashboard className="size-4" />
                Customer workspace
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Good morning, your event is moving beautifully.
              </h1>

              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                Keep an eye on budgets, vendor replies, upcoming tasks and the next decisions that
                need your attention.
              </p>
            </div>

            <div className="glass-card p-5">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Active event</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                Garden Wedding
              </h2>
              <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                June 21, 2026 · Colombo
              </p>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/40">
                <div className="h-full w-[68%] rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))]" />
              </div>

              <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/62">
                68% planning progress
              </p>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value, helper, icon: Icon, tone }) => (
              <article key={label} className="luxe-card p-6">
                <div className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
                  <Icon className="size-5" />
                </div>

                <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">{label}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {value}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                  {helper}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Event overview
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Design, vendors and payments in one flow.
                  </h2>
                </div>

                <span className="status-chip w-fit" data-tone="plum">
                  In progress
                </span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                {timeline.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/28 p-4 backdrop-blur-xl">
                    <div
                      className={
                        item.active
                          ? 'size-3 rounded-full bg-[var(--color-deep-plum)]'
                          : 'size-3 rounded-full bg-[var(--color-pearl-gray)]'
                      }
                    />
                    <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/68">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl">
                <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Next deadline</p>
                <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      Photography deposit confirmation
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-rosewood)]">
                      Due in 4 days
                    </p>
                  </div>

                  <button type="button" className="btn-secondary text-sm font-bold">
                    Review details
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </article>

            <aside className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
              <Sparkles className="size-6 text-[var(--color-powder-blue)]" />

              <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Quick actions</h2>

              <p className="mt-3 leading-7 text-white/68">
                Continue the most important planning tasks without hunting through messages or
                spreadsheets.
              </p>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  className="w-full rounded-2xl bg-white/14 px-4 py-3 text-left text-sm font-bold backdrop-blur transition hover:bg-white/20"
                >
                  Create a quotation request
                </button>

                <button
                  type="button"
                  className="w-full rounded-2xl bg-white/14 px-4 py-3 text-left text-sm font-bold backdrop-blur transition hover:bg-white/20"
                >
                  Add guest list update
                </button>

                <button
                  type="button"
                  className="w-full rounded-2xl bg-white/14 px-4 py-3 text-left text-sm font-bold backdrop-blur transition hover:bg-white/20"
                >
                  Upload event document
                </button>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
