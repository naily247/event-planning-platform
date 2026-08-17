import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings2,
  Store,
  UserRoundCog,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../features/auth/auth.api';
import { clearAuthTokens } from '../../features/auth/auth.storage';
import { getUnreadNotificationCount } from '../../features/notifications/notification.api';
import { getVendorOnboardingProfile } from '../../features/vendors/vendor.api';

const getInitials = (firstName?: string, lastName?: string) => {
  const firstInitial = firstName?.trim().charAt(0).toUpperCase() ?? '';
  const lastInitial = lastName?.trim().charAt(0).toUpperCase() ?? '';

  return `${firstInitial}${lastInitial}` || 'EV';
};

const vendorLogoMap: Record<string, string> = {
  'luna-frame-studio': '/images/vendors/logos/luna-frame-studio.png',
  'velvet-moments': '/images/vendors/logos/velvet-moments.png',
  'aroma-catering': '/images/vendors/logos/aroma-catering.png',
  'sweet-layers': '/images/vendors/logos/sweet-layers.png',
  'bloom-atelier': '/images/vendors/logos/bloom-atelier.png',
  'echo-entertainment': '/images/vendors/logos/echo-entertainment.png',
  'elite-transport': '/images/vendors/logos/elite-transport.png',
  'grand-horizon-ballroom': '/images/vendors/logos/grand-horizon-ballroom.png',
};

const createVendorSlug = (businessName: string) =>
  businessName
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function VendorWorkspaceHeader() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });

  const onboardingQuery = useQuery({
    queryKey: ['vendors', 'me', 'onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const unreadNotificationsQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
  });

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
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
    navigate('/', { replace: true });
  };

  const user = currentUserQuery.data;
  const onboarding = onboardingQuery.data;
  const unreadNotificationCount = unreadNotificationsQuery.data?.unreadCount ?? 0;

  const initials = getInitials(user?.firstName, user?.lastName);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : (onboarding?.profile.businessName ?? 'Vendor account');

  const businessName = onboarding?.profile.businessName ?? 'Vendor workspace';

  const businessSlug = onboarding?.profile.businessName
    ? createVendorSlug(onboarding.profile.businessName)
    : '';

  const businessLogoUrl = businessSlug ? (vendorLogoMap[businessSlug] ?? null) : null;

  return (
    <header className="glass-card relative z-50 !overflow-visible flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <Link to="/" className="group flex min-w-0 items-center" aria-label="Eventure home">
        <img
          src="/images/branding/eventure-logo-navbar.png"
          alt="Eventure"
          className="h-[5rem] w-auto max-w-[23rem] object-contain brightness-[0.82] contrast-[1.28] saturate-[1.18] drop-shadow-[0_1px_1px_rgba(93,58,85,0.20)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.015]"
        />
      </Link>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <Link
          to="/vendor/notifications"
          className="soft-chip relative text-sm font-bold transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(255,252,247,0.82)] hover:text-[var(--color-deep-plum)]"
        >
          <Bell className="size-4" aria-hidden="true" />

          <span className="hidden sm:inline">Notifications</span>

          {unreadNotificationCount > 0 ? (
            <span className="grid min-w-5 place-items-center rounded-full bg-[var(--color-muted-burgundy)] px-1.5 py-0.5 text-[0.65rem] font-black leading-none text-[#fffaf5]">
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          ) : null}
        </Link>

        <Link
          to="/vendor/dashboard"
          className="soft-chip hidden text-sm font-bold transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(255,252,247,0.82)] hover:text-[var(--color-deep-plum)] sm:inline-flex"
        >
          <LayoutDashboard className="size-4" aria-hidden="true" />
          Dashboard
        </Link>

        <Link
          to="/vendors"
          state={{
            source: 'vendor-workspace',
            returnTo: '/vendor/dashboard',
            returnLabel: 'Back to vendor dashboard',
          }}
          className="soft-chip hidden text-sm font-bold transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(255,252,247,0.82)] hover:text-[var(--color-deep-plum)] md:inline-flex"
        >
          <Store className="size-4" aria-hidden="true" />
          Marketplace
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            className={[
              'flex min-w-0 items-center gap-3 rounded-[1.15rem] border px-2.5 py-2 text-left',
              'transition duration-300 ease-out',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(93,58,85,0.14)]',
              isAccountMenuOpen
                ? 'border-[rgba(93,58,85,0.24)] bg-white/85 shadow-[0_14px_36px_rgba(64,42,51,0.12)]'
                : 'border-white/70 bg-white/45 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.18)] hover:bg-white/75',
            ].join(' ')}
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            onClick={() => {
              setIsAccountMenuOpen((current) => !current);
            }}
          >
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/70 bg-white shadow-[0_8px_20px_rgba(93,58,85,0.14)]">
              {businessLogoUrl ? (
                <img
                  src={businessLogoUrl}
                  alt={`${businessName} logo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-xs font-black tracking-[0.04em] text-[#fffaf5]">
                  {initials}
                </span>
              )}
            </span>

            <span className="hidden min-w-0 xl:block">
              <span className="block max-w-40 truncate text-sm font-black text-[var(--color-near-black)]">
                {displayName}
              </span>
              <span className="mt-0.5 block max-w-40 truncate text-[0.68rem] font-bold text-[var(--color-charcoal)]/55">
                {businessName}
              </span>
            </span>

            <ChevronDown
              className={[
                'size-4 shrink-0 text-[var(--color-charcoal)]/55 transition-transform duration-300',
                isAccountMenuOpen ? 'rotate-180' : '',
              ].join(' ')}
              aria-hidden="true"
            />
          </button>

          {isAccountMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.7rem)] z-[70] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[1.45rem] border border-white/80 bg-[rgba(255,252,249,0.97)] p-2 shadow-[0_24px_70px_rgba(64,42,51,0.18)] backdrop-blur-3xl"
            >
              <div className="border-b border-[rgba(93,58,85,0.08)] px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/75 bg-white shadow-[0_8px_20px_rgba(93,58,85,0.12)]">
                    {businessLogoUrl ? (
                      <img
                        src={businessLogoUrl}
                        alt={`${businessName} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-sm font-black text-[#fffaf5]">
                        {initials}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                      {displayName}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[var(--color-charcoal)]/58">
                      {businessName}
                    </p>
                    <p className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Vendor account
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <Link
                  to="/vendor/profile"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--color-charcoal)] transition hover:bg-[rgba(93,58,85,0.07)] hover:text-[var(--color-deep-plum)]"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  <UserRoundCog className="size-4" aria-hidden="true" />
                  Business profile
                </Link>

                <Link
                  to="/vendor/settings"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--color-charcoal)] transition hover:bg-[rgba(93,58,85,0.07)] hover:text-[var(--color-deep-plum)]"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  <Settings2 className="size-4" aria-hidden="true" />
                  Account settings
                </Link>

                <Link
                  to="/vendor/notifications"
                  role="menuitem"
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--color-charcoal)] transition hover:bg-[rgba(93,58,85,0.07)] hover:text-[var(--color-deep-plum)]"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <Bell className="size-4" aria-hidden="true" />
                    Notifications
                  </span>

                  {unreadNotificationCount > 0 ? (
                    <span className="rounded-full bg-[rgba(142,92,103,0.14)] px-2 py-0.5 text-[0.65rem] font-black text-[var(--color-rosewood)]">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  ) : null}
                </Link>

                <Link
                  to="/vendor/bookings"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--color-charcoal)] transition hover:bg-[rgba(93,58,85,0.07)] hover:text-[var(--color-deep-plum)] md:hidden"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  <BriefcaseBusiness className="size-4" aria-hidden="true" />
                  Bookings
                </Link>
              </div>

              <div className="border-t border-[rgba(93,58,85,0.08)] pt-2">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[var(--color-rosewood)] transition hover:bg-[rgba(142,92,103,0.08)]"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" aria-hidden="true" />

                  <span>
                    <span className="block">Log out</span>
                    <span className="mt-0.5 block text-[0.68rem] font-semibold text-[var(--color-charcoal)]/48">
                      Sign out of your Eventure vendor account
                    </span>
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
