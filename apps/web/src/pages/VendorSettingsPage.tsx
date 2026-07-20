import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ExternalLink,
  Images,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Store,
  UserRound,
  UserRoundCog,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../features/auth/auth.api';
import { clearAuthTokens } from '../features/auth/auth.storage';
import {
  getVendorOnboardingProfile,
  type VendorVerificationStatus,
} from '../features/vendors/vendor.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';

const verificationLabels: Record<VendorVerificationStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const verificationStyles: Record<VendorVerificationStatus, string> = {
  DRAFT: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
};

function formatDate(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const responseData = error.response.data;

    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'message' in responseData &&
      typeof responseData.message === 'string'
    ) {
      return responseData.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load vendor settings right now.';
}

function ReadOnlyField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-700 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>

        <p className="mt-1 break-words text-sm font-medium leading-6 text-zinc-700">{value}</p>
      </div>
    </div>
  );
}

function SettingsShortcut({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: typeof UserRoundCog;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_14px_45px_rgba(64,42,51,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(64,42,51,0.1)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#34282e]">{title}</p>

        <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
      </div>

      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-rose-700" />
    </Link>
  );
}

export function VendorSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });

  const onboardingQuery = useQuery({
    queryKey: ['vendor-onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const isLoading = currentUserQuery.isLoading || onboardingQuery.isLoading;

  const isError = currentUserQuery.isError || onboardingQuery.isError;

  const user = currentUserQuery.data;
  const onboarding = onboardingQuery.data;
  const profile = onboarding?.profile;
  const completion = onboarding?.completion;

  function handleLogout() {
    clearAuthTokens();
    queryClient.clear();
    navigate('/login', {
      replace: true,
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(190,137,154,0.18),_transparent_34%),linear-gradient(180deg,_#f8f5f4_0%,_#f3efee_100%)] text-[#2e2529]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <VendorWorkspaceNav />

        <section className="mt-6 overflow-hidden rounded-[32px] border border-white/80 bg-white/65 p-6 shadow-[0_24px_80px_rgba(64,42,51,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <UserRoundCog className="h-4 w-4" />
                Vendor account
              </div>

              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[#2e2529] sm:text-4xl">
                Settings and account
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
                Review your account identity, vendor verification state, and the business settings
                currently available in the platform.
              </p>
            </div>

            {profile && (
              <span
                className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold ${
                  verificationStyles[profile.verificationStatus]
                }`}
              >
                {verificationLabels[profile.verificationStatus]}
              </span>
            )}
          </div>
        </section>

        {isLoading ? (
          <section className="mt-6 flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/80 bg-white/70">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-rose-700" />

              <p className="mt-4 text-sm font-medium text-zinc-500">Loading account settings…</p>
            </div>
          </section>
        ) : isError || !user || !profile || !completion ? (
          <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h2 className="mt-4 text-lg font-semibold text-red-900">
              Settings could not be loaded
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
              {getErrorMessage(currentUserQuery.error ?? onboardingQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => {
                void currentUserQuery.refetch();
                void onboardingQuery.refetch();
              }}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Try again
            </button>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      Account identity
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-[#34282e]">
                      Personal account details
                    </h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <ReadOnlyField
                    icon={UserRound}
                    label="Full name"
                    value={`${user.firstName} ${user.lastName}`.trim()}
                  />

                  <ReadOnlyField icon={Mail} label="Email address" value={user.email} />

                  <ReadOnlyField icon={ShieldCheck} label="Account role" value={user.role} />

                  <ReadOnlyField
                    icon={LockKeyhole}
                    label="Account status"
                    value={user.status.replaceAll('_', ' ')}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                    <div>
                      <p className="font-semibold text-amber-900">
                        Account editing is not available yet
                      </p>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        The current backend does not support changing your email, password, personal
                        name, or account status. These fields are intentionally read-only instead of
                        presenting controls that cannot be completed safely.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <Store className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      Vendor identity
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-[#34282e]">
                      Business account details
                    </h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <ReadOnlyField icon={Store} label="Business name" value={profile.businessName} />

                  <ReadOnlyField icon={ExternalLink} label="Public slug" value={profile.slug} />

                  <ReadOnlyField
                    icon={ShieldCheck}
                    label="Verification status"
                    value={verificationLabels[profile.verificationStatus]}
                  />

                  <ReadOnlyField
                    icon={CheckCircle2}
                    label="Profile completion"
                    value={`${completion.percentage}%`}
                  />

                  <ReadOnlyField
                    icon={CalendarRange}
                    label="Submitted"
                    value={formatDate(profile.submittedAt)}
                  />

                  <ReadOnlyField
                    icon={CalendarRange}
                    label="Reviewed"
                    value={formatDate(profile.reviewedAt)}
                  />
                </div>

                {profile.rejectionReason && (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm font-semibold text-red-900">Verification feedback</p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">
                      {profile.rejectionReason}
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <UserRoundCog className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      Business settings
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-[#34282e]">
                      Manage your vendor presence
                    </h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  <SettingsShortcut
                    to="/vendor/profile"
                    icon={UserRoundCog}
                    title="Vendor profile"
                    description="Manage business information, service areas, categories, and onboarding status."
                  />

                  <SettingsShortcut
                    to="/vendor/portfolio"
                    icon={Images}
                    title="Portfolio"
                    description="Upload and organize images that represent your work and service quality."
                  />

                  <SettingsShortcut
                    to="/vendor/availability"
                    icon={CalendarRange}
                    title="Availability"
                    description="Block unavailable dates and review committed booking periods."
                  />
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.08)] backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Profile completion
                </p>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <p className="text-5xl font-semibold tracking-tight text-[#34282e]">
                    {completion.percentage}%
                  </p>

                  <p className="pb-1 text-sm font-medium text-zinc-500">
                    {completion.completedFields}/{completion.totalFields} fields complete
                  </p>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-[#7a5063]"
                    style={{
                      width: `${completion.percentage}%`,
                    }}
                  />
                </div>

                <Link
                  to="/vendor/profile"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800"
                >
                  Review profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </section>

              <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="h-5 w-5 text-rose-700" />

                  <h2 className="font-semibold text-[#34282e]">Security guidance</h2>
                </div>

                <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-600">
                  <p>
                    Keep your account credentials private and avoid sharing your signed-in device
                    with other users.
                  </p>

                  <p>
                    Sign out when using a shared or public computer. The current session is stored
                    locally in this browser.
                  </p>

                  <p>
                    Password reset and account recovery tools are not yet available in this backend
                    version.
                  </p>
                </div>
              </section>

              <section className="rounded-[28px] border border-red-200 bg-red-50 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <LogOut className="h-5 w-5 text-red-700" />

                  <h2 className="font-semibold text-red-900">End current session</h2>
                </div>

                <p className="mt-3 text-sm leading-6 text-red-700">
                  Signing out removes the locally stored authentication tokens and returns you to
                  the login page.
                </p>

                <button
                  type="button"
                  onClick={() => setShowLogoutConfirmation(true)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </section>
            </aside>
          </div>
        )}
      </div>

      {showLogoutConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirmation(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-logout-title"
            className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <LogOut className="h-5 w-5" />
            </div>

            <h2 id="vendor-logout-title" className="mt-5 text-xl font-semibold text-[#34282e]">
              Sign out of your account?
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Your current browser session will be cleared. You will need to enter your credentials
              again to access the vendor workspace.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmation(false)}
                className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Stay signed in
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
