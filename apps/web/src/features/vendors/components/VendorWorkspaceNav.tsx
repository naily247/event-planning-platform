import {
  BriefcaseBusiness,
  CalendarRange,
  Images,
  LayoutDashboard,
  MessageSquareQuote,
  Package,
  Settings2,
  ShieldAlert,
  Star,
  UserRoundCog,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const vendorWorkspaceSections = [
  {
    label: 'Overview',
    to: '/vendor/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Profile',
    to: '/vendor/profile',
    icon: UserRoundCog,
  },
  {
    label: 'Portfolio',
    to: '/vendor/portfolio',
    icon: Images,
  },
  {
    label: 'Packages',
    to: '/vendor/packages',
    icon: Package,
  },
  {
    label: 'Availability',
    to: '/vendor/availability',
    icon: CalendarRange,
  },
  {
    label: 'Quotations',
    to: '/vendor/quotation-requests',
    icon: MessageSquareQuote,
  },
  {
    label: 'Bookings',
    to: '/vendor/bookings',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Reviews',
    to: '/vendor/reviews',
    icon: Star,
  },
  {
    label: 'Complaints',
    to: '/vendor/complaints',
    icon: ShieldAlert,
  },
  {
    label: 'Settings',
    to: '/vendor/settings',
    icon: Settings2,
  },
] as const;

export function VendorWorkspaceNav() {
  return (
    <div className="sticky top-3 z-40">
      <nav
        className="glass-card flex gap-2 overflow-x-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Vendor workspace sections"
      >
        {vendorWorkspaceSections.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/vendor/dashboard'}
            className={({ isActive }) =>
              [
                'soft-chip relative shrink-0 whitespace-nowrap text-sm font-bold transition',
                'hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.18)]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(93,58,85,0.14)]',
                isActive
                  ? 'border-[rgba(93,58,85,0.3)] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-[#fffaf5] shadow-[0_12px_28px_rgba(93,58,85,0.24)]'
                  : 'text-[var(--color-charcoal)] hover:bg-[rgba(255,252,247,0.82)] hover:text-[var(--color-deep-plum)]',
              ].join(' ')
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
