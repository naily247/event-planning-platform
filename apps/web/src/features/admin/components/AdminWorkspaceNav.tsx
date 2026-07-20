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
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: Users,
  },
  {
    label: 'Vendors',
    to: '/admin/vendors',
    icon: Store,
  },
  {
    label: 'Payments',
    to: '/admin/payments',
    icon: CreditCard,
  },
  {
    label: 'Reviews',
    to: '/admin/reviews',
    icon: Star,
  },
  {
    label: 'Complaints',
    to: '/admin/complaints',
    icon: MessageSquareWarning,
  },
  {
    label: 'Reports',
    to: '/admin/reports',
    icon: BarChart3,
  },
] as const;

export function AdminWorkspaceNav() {
  return (
    <div className="sticky top-3 z-40">
      <nav
        className="glass-card flex gap-2 overflow-x-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Admin workspace sections"
      >
        {adminWorkspaceSections.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin/dashboard'}
            className={({ isActive }) =>
              [
                'soft-chip shrink-0 whitespace-nowrap text-sm font-bold transition',
                'hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.18)]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(93,58,85,0.14)]',
                isActive
                  ? 'border-[rgba(93,58,85,0.3)] bg-[linear-gradient(135deg,var(--color-near-black),var(--color-deep-plum))] text-[#fffaf5] shadow-[0_12px_28px_rgba(31,27,29,0.24)]'
                  : 'text-[var(--color-charcoal)] hover:bg-[rgba(255,252,247,0.82)] hover:text-[var(--color-deep-plum)]',
              ].join(' ')
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}

        <div
          className="soft-chip ml-auto shrink-0 border-[rgba(57,116,90,0.18)] bg-[rgba(232,246,238,0.78)] text-sm font-bold text-[#285e46]"
          aria-label="Administrator access"
        >
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          Admin access
        </div>
      </nav>
    </div>
  );
}
