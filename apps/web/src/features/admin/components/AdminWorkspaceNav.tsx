import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  MessageSquareWarning,
  ShieldCheck,
  Star,
  Store,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const adminWorkspaceSections = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: LayoutDashboard,
    tone: 'from-violet-250 to-indigo-500',
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: Users,
    tone: 'from-indigo-250 to-violet-500',
  },
  {
    label: 'Vendors',
    to: '/admin/vendors',
    icon: Store,
    tone: 'from-amber-100 to-orange-400',
  },
  {
    label: 'Payments',
    to: '/admin/payments',
    icon: CreditCard,
    tone: 'from-sky-100 to-cyan-400',
  },
  {
    label: 'Reviews',
    to: '/admin/reviews',
    icon: Star,
    tone: 'from-fuchsia-150 to-violet-500',
  },
  {
    label: 'Complaints',
    to: '/admin/complaints',
    icon: MessageSquareWarning,
    tone: 'from-rose-250 to-pink-500',
  },
  {
    label: 'Reports',
    to: '/admin/reports',
    icon: BarChart3,
    tone: 'from-emerald-250 to-teal-500',
  },
] as const;

export function AdminWorkspaceNav() {
  return (
    <div className="sticky top-3 z-40">
      <nav
        aria-label="Admin workspace sections"
        className="flex gap-2 overflow-x-auto rounded-[22px] border border-violet-100/90 bg-white/85 p-3 shadow-[0_16px_45px_rgba(109,94,245,0.11)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {adminWorkspaceSections.map(({ label, to, icon: Icon, tone }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin/dashboard'}
            className={({ isActive }) =>
              [
                'group relative inline-flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition duration-200',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100',
                isActive
                  ? 'border-violet-200/80 bg-gradient-to-r text-slate-800 shadow-[0_8px_20px_rgba(109,94,245,0.12)]'
                  : 'border-transparent text-slate-600 hover:border-violet-100 hover:bg-violet-50/70 hover:text-violet-800',
                isActive ? tone : '',
              ].join(' ')
            }
          >
            <span className="pointer-events-none absolute inset-0 bg-white/0 transition group-hover:bg-white/[0.04]" />

            <Icon className="relative size-4 shrink-0" aria-hidden="true" />
            <span className="relative">{label}</span>
          </NavLink>
        ))}

        <div
          aria-label="Administrator access"
          className="ml-auto inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-violet-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-[0_8px_22px_rgba(16,185,129,0.08)]"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-white/80 text-emerald-600 shadow-sm">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          </span>
          Admin access
        </div>
      </nav>
    </div>
  );
}
