import { useState } from 'react';
import { ArrowRight, Bell, ChevronDown, LogOut, Plus, Settings, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthTokens } from '../../features/auth/auth.storage';

export type CustomerWorkspaceHeaderUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DEACTIVATED';
  profileImageUrl?: string | null;
};

type CustomerWorkspaceHeaderProps = {
  user: CustomerWorkspaceHeaderUser;
  unreadNotificationCount?: number;
};

export function CustomerWorkspaceHeader({
  user,
  unreadNotificationCount = 0,
}: CustomerWorkspaceHeaderProps) {
  const navigate = useNavigate();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const userInitials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const handleLogout = () => {
    setIsAccountMenuOpen(false);
    clearAuthTokens();

    navigate('/login', {
      replace: true,
    });
  };

  return (
    <header className="glass-card relative z-30 flex flex-col gap-5 !overflow-visible p-5 sm:flex-row sm:items-center sm:justify-between">
      <Link to="/" className="group flex min-w-0 items-center" aria-label="Eventure home">
        <img
          src="/images/branding/eventure-logo-navbar.png"
          alt="Eventure"
          className="h-[5rem] w-auto max-w-[23rem] object-contain brightness-[0.82] contrast-[1.28] saturate-[1.18] drop-shadow-[0_1px_1px_rgba(93,58,85,0.20)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.015]"
        />
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/notifications"
          className="soft-chip text-sm font-bold transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(93,58,85,0.92)] hover:text-[#fffaf5]"
        >
          <Bell className="size-4" />
          {unreadNotificationCount}{' '}
          {unreadNotificationCount === 1 ? 'unread update' : 'unread updates'}
        </Link>

        <Link to="/vendors" className="btn-secondary text-sm font-bold">
          Browse vendors
        </Link>

        <Link to="/events" className="btn-primary text-sm font-bold">
          <Plus className="size-4" />
          My events
        </Link>

        <div className="relative">
          <button
            type="button"
            className={`group flex items-center gap-3 rounded-2xl border px-3 py-2 backdrop-blur-xl transition-all duration-300 ${
              isAccountMenuOpen
                ? 'border-[rgba(93,58,85,0.22)] bg-white/52 shadow-[0_14px_36px_rgba(31,27,29,0.10)]'
                : 'border-white/45 bg-white/28 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.18)] hover:bg-white/46'
            }`}
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            onClick={() => {
              setIsAccountMenuOpen((current) => !current);
            }}
          >
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="size-11 shrink-0 rounded-full object-cover shadow-[0_10px_24px_rgba(93,58,85,0.18)]"
              />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-sm font-black text-white shadow-[0_10px_24px_rgba(93,58,85,0.22)] transition-transform duration-300 group-hover:scale-105">
                {userInitials}
              </span>
            )}

            <span className="hidden min-w-0 text-left lg:block">
              <span className="block max-w-36 truncate text-sm font-black text-[var(--color-near-black)]">
                {user.firstName} {user.lastName}
              </span>

              <span className="mt-0.5 block text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50">
                Customer
              </span>
            </span>

            <ChevronDown
              aria-hidden="true"
              className={`hidden size-4 text-[var(--color-charcoal)]/48 transition-all duration-300 lg:block ${
                isAccountMenuOpen
                  ? 'rotate-180 text-[var(--color-deep-plum)]'
                  : 'group-hover:text-[var(--color-deep-plum)]'
              }`}
            />
          </button>

          {isAccountMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[19rem] overflow-hidden rounded-[1.6rem] border border-white/60 bg-[rgba(250,246,243,0.94)] p-2 shadow-[0_28px_80px_rgba(31,27,29,0.18)] backdrop-blur-2xl"
            >
              <div className="rounded-[1.25rem] bg-[linear-gradient(135deg,rgba(93,58,85,0.10),rgba(183,167,200,0.16))] p-4">
                <div className="flex items-center gap-3">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="size-12 shrink-0 rounded-full object-cover shadow-[0_10px_24px_rgba(93,58,85,0.18)]"
                    />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-sm font-black text-white shadow-[0_10px_24px_rgba(93,58,85,0.20)]">
                      {userInitials}
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                      {user.firstName} {user.lastName}
                    </p>

                    <p className="mt-1 truncate text-xs font-semibold text-[var(--color-charcoal)]/55">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-3 text-left opacity-55"
                  disabled
                  title="Profile page will be added next"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.09)] text-[var(--color-deep-plum)]">
                    <UserRound className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-[var(--color-near-black)]">
                      My profile
                    </span>

                    <span className="mt-0.5 block text-[0.68rem] font-semibold text-[var(--color-charcoal)]/48">
                      Personal details and profile photo
                    </span>
                  </span>

                  <span className="rounded-full bg-[rgba(93,58,85,0.08)] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
                    Next
                  </span>
                </button>

                <button
                  type="button"
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-3 text-left opacity-55"
                  disabled
                  title="Account settings will be added next"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.09)] text-[var(--color-deep-plum)]">
                    <Settings className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-[var(--color-near-black)]">
                      Account settings
                    </span>

                    <span className="mt-0.5 block text-[0.68rem] font-semibold text-[var(--color-charcoal)]/48">
                      Preferences and security
                    </span>
                  </span>

                  <span className="rounded-full bg-[rgba(93,58,85,0.08)] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
                    Next
                  </span>
                </button>

                <Link
                  to="/notifications"
                  role="menuitem"
                  className="group/menu-item flex w-full items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 hover:bg-[rgba(93,58,85,0.08)]"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                  }}
                >
                  <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                    <Bell className="size-4" />

                    {unreadNotificationCount > 0 ? (
                      <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[var(--color-muted-burgundy)] px-1 text-[0.55rem] font-black leading-4 text-white">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                      </span>
                    ) : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-[var(--color-near-black)]">
                      Notifications
                    </span>

                    <span className="mt-0.5 block text-[0.68rem] font-semibold text-[var(--color-charcoal)]/48">
                      Review your latest updates
                    </span>
                  </span>

                  <ArrowRight className="size-4 text-[var(--color-charcoal)]/35 transition-transform duration-200 group-hover/menu-item:translate-x-0.5 group-hover/menu-item:text-[var(--color-deep-plum)]" />
                </Link>
              </div>

              <div className="mt-2 border-t border-[rgba(93,58,85,0.10)] pt-2">
                <button
                  type="button"
                  role="menuitem"
                  className="group/logout flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-200 hover:bg-[rgba(124,74,90,0.10)]"
                  onClick={handleLogout}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)] transition-colors duration-200 group-hover/logout:bg-[rgba(124,74,90,0.16)]">
                    <LogOut className="size-4" />
                  </span>

                  <span>
                    <span className="block text-sm font-black text-[var(--color-muted-burgundy)]">
                      Log out
                    </span>

                    <span className="mt-0.5 block text-[0.68rem] font-semibold text-[var(--color-charcoal)]/46">
                      Sign out of your Eventure account
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
