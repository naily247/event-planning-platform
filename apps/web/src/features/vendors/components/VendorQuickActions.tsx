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
    <aside className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-powder-blue)]">
        Quick actions
      </p>

      <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">Keep your business moving.</h2>

      <p className="mt-3 leading-7 text-white/68">
        Jump directly into the vendor tasks that need your attention without searching through the
        portal.
      </p>

      <div className="mt-8 space-y-3">
        {actions.map(({ label, description, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur transition hover:bg-white/18"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 text-[var(--color-powder-blue)]">
              <Icon className="size-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-white">{label}</span>

              <span className="mt-1 block text-xs font-semibold leading-5 text-white/60">
                {description}
              </span>
            </span>

            <ArrowRight className="mt-1 size-4 shrink-0 text-white/55 transition group-hover:translate-x-1 group-hover:text-white" />
          </Link>
        ))}
      </div>
    </aside>
  );
}
