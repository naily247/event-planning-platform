import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarRange,
  Images,
  MessageSquareText,
  UserRoundCog,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const actions = [
  {
    label: 'Respond to quotation requests',
    description: 'Review incoming requirements and prepare quotations.',
    to: '/vendor/quotation-requests',
    icon: MessageSquareText,
  },
  {
    label: 'Manage incoming bookings',
    description: 'Confirm, reject, cancel, or complete customer bookings.',
    to: '/vendor/bookings',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Update availability',
    description: 'Block unavailable dates and review scheduled services.',
    to: '/vendor/availability',
    icon: CalendarRange,
  },
  {
    label: 'Manage portfolio',
    description: 'Upload and organise the work customers see.',
    to: '/vendor/portfolio',
    icon: Images,
  },
  {
    label: 'Complete vendor profile',
    description: 'Maintain your business details and verification status.',
    to: '/vendor/profile',
    icon: UserRoundCog,
  },
];

export function VendorQuickActions() {
  return (
    <aside className="rounded-[1.6rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-5 text-[#fffaf5] shadow-[0_18px_50px_rgba(93,58,85,0.24)]">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-powder-blue)]">
        Quick actions
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Keep your business moving.</h2>

      <p className="mt-2 text-sm font-medium leading-6 text-white/66">
        Jump directly into the vendor tasks that need your attention.
      </p>

      <div className="mt-4 space-y-2">
        {actions.map(({ label, description, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur transition hover:bg-white/18"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/12 text-[var(--color-powder-blue)]">
              <Icon className="size-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black text-white">{label}</span>

              <span className="mt-0.5 line-clamp-1 block text-[0.68rem] font-semibold text-white/58">
                {description}
              </span>
            </span>

            <ArrowRight className="size-3.5 shrink-0 text-white/50 transition group-hover:translate-x-0.5 group-hover:text-white" />
          </Link>
        ))}
      </div>
    </aside>
  );
}
