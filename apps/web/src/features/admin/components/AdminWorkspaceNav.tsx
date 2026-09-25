import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  ShieldCheck,
  Star,
  Store,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../auth/auth.api';
import { clearAuthTokens } from '../../auth/auth.storage';

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

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim().charAt(0).toUpperCase() ?? '';
  const lastInitial = lastName?.trim().charAt(0).toUpperCase() ?? '';

  return `${firstInitial}${lastInitial}` || 'AD';
}

type AdminWorkspaceNavProps = {
  prominentBrand?: boolean;
};

export function AdminWorkspaceNav({ prominentBrand = false }: AdminWorkspaceNavProps) {
  const navigate = useNavigate();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });

  const user = currentUserQuery.data;

  const initials = getInitials(user?.firstName, user?.lastName);

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Administrator';

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleLogout = () => {
    setIsAccountMenuOpen(false);
    clearAuthTokens();

    navigate('/', {
      replace: true,
    });
  };

  return (
    <div className="sticky top-3 z-40">
      <nav
        aria-label="Admin workspace sections"
        className="flex items-center gap-1.5 overflow-visible rounded-[20px] border border-[rgba(91,61,82,0.10)] bg-white/82 p-2 shadow-[0_14px_38px_rgba(64,42,51,0.08)] backdrop-blur-2xl"
      >
        <Link
          to="/admin/dashboard"
          aria-label="Eventure admin dashboard"
          className={[
            'group flex shrink-0 items-center border-r border-[rgba(91,61,82,0.09)]',
            prominentBrand ? 'h-12 px-2.5 pr-4' : 'h-10 px-2 pr-3',
          ].join(' ')}
        >
          <img
            src="/images/branding/eventure-logo-navbar.png"
            alt="Eventure"
            className={[
              'w-auto object-contain brightness-[0.82] contrast-[1.28] saturate-[1.18] drop-shadow-[0_1px_1px_rgba(93,58,85,0.16)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.015]',
              prominentBrand ? 'h-[4.15rem] max-w-[10.5rem]' : 'h-[3.15rem] max-w-[8.5rem]',
            ].join(' ')}
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {adminWorkspaceSections.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin/dashboard'}
              className={({ isActive }) =>
                [
                  'group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition duration-200',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(91,61,82,0.12)]',
                  isActive
                    ? 'border-[rgba(91,61,82,0.16)] bg-[linear-gradient(135deg,rgba(91,61,82,0.14),rgba(183,167,200,0.20))] text-[var(--color-deep-plum)] shadow-[0_7px_18px_rgba(64,42,51,0.09)]'
                    : 'border-transparent text-slate-600 hover:border-[rgba(91,61,82,0.08)] hover:bg-[rgba(183,167,200,0.10)] hover:text-[var(--color-deep-plum)]',
                ].join(' ')
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div
          ref={accountMenuRef}
          className="relative ml-auto shrink-0 border-l border-[rgba(91,61,82,0.09)] pl-2"
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            className={[
              'flex h-10 items-center gap-2 rounded-xl border px-2 transition duration-200',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(91,61,82,0.12)]',
              isAccountMenuOpen
                ? 'border-[rgba(91,61,82,0.18)] bg-[rgba(183,167,200,0.14)] shadow-[0_8px_20px_rgba(64,42,51,0.08)]'
                : 'border-[rgba(91,61,82,0.10)] bg-white/58 hover:border-[rgba(91,61,82,0.16)] hover:bg-[rgba(183,167,200,0.08)]',
            ].join(' ')}
            onClick={() => {
              setIsAccountMenuOpen((current) => !current);
            }}
          >
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={displayName}
                className="size-8 shrink-0 rounded-lg object-cover shadow-sm"
              />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-[0.68rem] font-black tracking-[0.03em] text-white shadow-sm">
                {initials}
              </span>
            )}

            <span className="hidden min-w-0 text-left 2xl:block">
              <span className="block max-w-28 truncate text-xs font-black text-[var(--color-near-black)]">
                {displayName}
              </span>

              <span className="mt-0.5 block text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/46">
                Administrator
              </span>
            </span>

            <ChevronDown
              aria-hidden="true"
              className={[
                'hidden size-3.5 shrink-0 text-[var(--color-charcoal)]/48 transition-transform duration-200 xl:block',
                isAccountMenuOpen ? 'rotate-180 text-[var(--color-deep-plum)]' : '',
              ].join(' ')}
            />
          </button>

          {isAccountMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.7rem)] z-[70] w-[19rem] overflow-hidden rounded-[1.4rem] border border-white/80 bg-[rgba(255,252,249,0.97)] p-2 shadow-[0_24px_70px_rgba(64,42,51,0.18)] backdrop-blur-3xl"
            >
              <div className="rounded-[1.1rem] bg-[linear-gradient(135deg,rgba(91,61,82,0.08),rgba(183,167,200,0.15))] p-3.5">
                <div className="flex items-center gap-3">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={displayName}
                      className="size-11 shrink-0 rounded-xl object-cover shadow-[0_8px_20px_rgba(91,61,82,0.14)]"
                    />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-sm font-black text-white shadow-[0_8px_20px_rgba(91,61,82,0.16)]">
                      {initials}
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                      {displayName}
                    </p>

                    <p className="mt-0.5 truncate text-xs font-semibold text-[var(--color-charcoal)]/54">
                      {user?.email ?? 'Eventure administration'}
                    </p>

                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[rgba(91,61,82,0.10)] bg-white/60 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)]">
                      <ShieldCheck className="size-3" aria-hidden="true" />
                      Administrator
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 border-t border-[rgba(91,61,82,0.08)] pt-2">
                <button
                  type="button"
                  role="menuitem"
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[rgba(142,92,103,0.08)]"
                  onClick={handleLogout}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(142,92,103,0.09)] text-[var(--color-rosewood)] transition group-hover:bg-[rgba(142,92,103,0.14)]">
                    <LogOut className="size-4" aria-hidden="true" />
                  </span>

                  <span>
                    <span className="block text-sm font-black text-[var(--color-rosewood)]">
                      Log out
                    </span>

                    <span className="mt-0.5 block text-[0.68rem] font-semibold text-[var(--color-charcoal)]/46">
                      Sign out of Eventure administration
                    </span>
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
