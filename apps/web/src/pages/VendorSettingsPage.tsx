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
import { PageBackButton } from '../components/navigation/PageBackButton';

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
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-white/58 bg-white/30 p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
        <Icon className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/40">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-black leading-6 text-[var(--color-near-black)]">
          {value}
        </p>
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
      className="group flex items-start gap-4 rounded-[1.35rem] border border-white/58 bg-white/30 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white/46 hover:shadow-[0_14px_36px_rgba(35,24,30,0.06)]"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
        <Icon className="size-4.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-black tracking-[-0.02em] text-[var(--color-near-black)]">
          {title}
        </p>

        <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-charcoal)]/54">
          {description}
        </p>
      </div>

      <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--color-charcoal)]/35 transition group-hover:translate-x-1 group-hover:text-[var(--color-deep-plum)]" />
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
    <main className="workspace-shell relative">
      <div className="workspace-container w-full max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex items-center gap-4">
            <PageBackButton
              fallback="/vendor/dashboard"
              label="Dashboard"
              className="shrink-0"
            />

            <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <h1 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                Account settings
              </h1>
            </div>
          </div>
        </header>

        <div className="pb-10 pt-6">
          <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_24px_70px_rgba(64,42,51,0.10)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[rgba(183,167,200,0.23)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 left-[30%] size-72 rounded-full bg-[rgba(214,190,177,0.12)] blur-3xl"
            />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-10 lg:p-10">
              <div>
                <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <UserRoundCog className="size-4" />
                  Account & business
                </div>

                <h2 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                  Keep your business identity clear, secure and up to date.
                </h2>

                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                  Review your account identity, vendor verification state, profile completion and
                  the business settings currently available in Eventure.
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  <span className="soft-chip text-xs font-black">
                    <ShieldCheck className="size-4" />
                    {profile
                      ? verificationLabels[profile.verificationStatus]
                      : 'Verification'}
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <CheckCircle2 className="size-4" />
                    {completion ? `${completion.percentage}% complete` : 'Profile completion'}
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <LockKeyhole className="size-4" />
                    Secure account
                  </span>
                </div>
              </div>

              <article className="relative overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/52 p-5 shadow-[0_18px_52px_rgba(31,27,29,0.08)] backdrop-blur-2xl sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.17)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Account overview
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Business readiness
                      </h3>
                    </div>

                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <Store className="size-5" />
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                    Keep your customer-facing business details complete and your account access
                    protected.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                      <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                        Profile completion
                      </p>

                      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {completion ? `${completion.percentage}%` : '—'}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/46">
                        Business information
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                      <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                        Verification
                      </p>

                      <p className="mt-2 text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        {profile
                          ? verificationLabels[profile.verificationStatus]
                          : '—'}
                      </p>

                      <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/46">
                        Vendor standing
                      </p>
                    </div>
                  </div>

                  {profile ? (
                    <div className="mt-3 rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                            Business
                          </p>

                          <p className="mt-2 text-base font-black text-[var(--color-near-black)]">
                            {profile.businessName}
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${
                            verificationStyles[profile.verificationStatus]
                          }`}
                        >
                          {verificationLabels[profile.verificationStatus]}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            </div>
          </section>

          {isLoading ? (
            <section className="mt-6 grid min-h-[420px] place-items-center rounded-[2rem] border border-white/58 bg-white/42 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl">
              <div className="text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                  <LoaderCircle className="size-6 animate-spin" />
                </div>

                <p className="mt-5 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                  Loading account settings
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/52">
                  Restoring your account and vendor profile information.
                </p>
              </div>
            </section>
          ) : isError || !user || !profile || !completion ? (
            <section className="mt-6 grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.06)]">
              <div className="max-w-lg">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-red-900">
                  Settings could not be loaded
                </h2>

                <p className="mt-3 text-sm leading-7 text-red-700">
                  {getErrorMessage(currentUserQuery.error ?? onboardingQuery.error)}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void currentUserQuery.refetch();
                    void onboardingQuery.refetch();
                  }}
                  className="mt-6 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white transition hover:bg-red-800"
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.34fr_0.66fr]">
              <div className="space-y-6">
                <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <UserRound className="size-5" />
                    </div>

                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Account identity
                      </p>

                      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Personal account details
                      </h2>

                      <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                        These details identify the account used to access your vendor workspace.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:grid-cols-2">
                    <ReadOnlyField
                      icon={UserRound}
                      label="Full name"
                      value={`${user.firstName} ${user.lastName}`.trim()}
                    />

                    <ReadOnlyField
                      icon={Mail}
                      label="Email address"
                      value={user.email}
                    />

                    <ReadOnlyField
                      icon={ShieldCheck}
                      label="Account role"
                      value={user.role}
                    />

                    <ReadOnlyField
                      icon={LockKeyhole}
                      label="Account status"
                      value={user.status.replaceAll('_', ' ')}
                    />
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-[1.35rem] border border-amber-200/80 bg-amber-50/70 p-5">
                    <LockKeyhole className="mt-0.5 size-5 shrink-0 text-amber-700" />

                    <div>
                      <p className="font-black text-amber-900">
                        Account editing is not available yet
                      </p>

                      <p className="mt-1 text-sm font-medium leading-6 text-amber-700">
                        The current backend does not support changing your email, password,
                        personal name, or account status. These fields remain read-only instead of
                        presenting controls that cannot be completed safely.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <Store className="size-5" />
                    </div>

                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Vendor identity
                      </p>

                      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Business account details
                      </h2>

                      <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                        Review the identity and verification details connected to your public
                        vendor profile.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:grid-cols-2">
                    <ReadOnlyField
                      icon={Store}
                      label="Business name"
                      value={profile.businessName}
                    />

                    <ReadOnlyField
                      icon={ExternalLink}
                      label="Public slug"
                      value={profile.slug}
                    />

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

                  {profile.rejectionReason ? (
                    <div className="mt-5 rounded-[1.35rem] border border-red-200 bg-red-50/70 p-5">
                      <p className="text-sm font-black text-red-900">
                        Verification feedback
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-red-700">
                        {profile.rejectionReason}
                      </p>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <UserRoundCog className="size-5" />
                    </div>

                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Business settings
                      </p>

                      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Manage your vendor presence
                      </h2>

                      <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                        Jump directly to the workspace areas that control what customers see and
                        when your business can accept work.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6">
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
                      description="Upload and organise images that represent your work and service quality."
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

              <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                <section className="relative overflow-hidden rounded-[2rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(240,231,238,0.48))] p-5 shadow-[0_18px_48px_rgba(35,24,30,0.08)] backdrop-blur-xl sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Profile completion
                        </p>

                        <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          Business readiness
                        </h2>
                      </div>

                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                        <CheckCircle2 className="size-4.5" />
                      </div>
                    </div>

                    <div className="mt-6 flex items-end justify-between gap-4">
                      <p className="text-5xl font-black tracking-[-0.06em] text-[var(--color-near-black)]">
                        {completion.percentage}%
                      </p>

                      <p className="pb-1 text-right text-xs font-bold leading-5 text-[var(--color-charcoal)]/48">
                        {completion.completedFields}/{completion.totalFields}
                        <br />
                        fields complete
                      </p>
                    </div>

                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[rgba(91,61,82,0.08)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-deep-plum)] transition-all duration-500"
                        style={{
                          width: `${completion.percentage}%`,
                        }}
                      />
                    </div>

                    <Link
                      to="/vendor/profile"
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 py-3.5 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.20)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white"
                    >
                      <span className="text-white">Review profile</span>
                      <ArrowRight className="size-4 text-white" />
                    </Link>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(220,186,167,0.20)] text-[var(--color-rosewood)]">
                      <LockKeyhole className="size-5" />
                    </div>

                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Account security
                      </p>

                      <h2 className="mt-2 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                        Protect your workspace access
                      </h2>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[1.15rem] border border-white/58 bg-white/30 p-4">
                      <p className="text-sm font-medium leading-6 text-[var(--color-charcoal)]/60">
                        Keep your account credentials private and avoid sharing your signed-in
                        device with other users.
                      </p>
                    </div>

                    <div className="rounded-[1.15rem] border border-white/58 bg-white/30 p-4">
                      <p className="text-sm font-medium leading-6 text-[var(--color-charcoal)]/60">
                        Sign out when using a shared or public computer. The current session is
                        stored locally in this browser.
                      </p>
                    </div>

                    <div className="rounded-[1.15rem] border border-white/58 bg-white/30 p-4">
                      <p className="text-sm font-medium leading-6 text-[var(--color-charcoal)]/60">
                        Password reset and account recovery tools are not yet available in this
                        backend version.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="relative overflow-hidden rounded-[2rem] border border-red-200/80 bg-red-50/65 p-5 shadow-[0_18px_48px_rgba(127,29,29,0.06)] sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700">
                      <LogOut className="size-5" />
                    </div>

                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-500">
                        Current session
                      </p>

                      <h2 className="mt-2 text-lg font-black tracking-[-0.03em] text-red-900">
                        End current session
                      </h2>
                    </div>
                  </div>

                  <p className="mt-5 text-sm font-medium leading-6 text-red-700">
                    Signing out removes the locally stored authentication tokens and returns you to
                    the login page.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirmation(true)}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-700 px-5 py-3.5 text-sm font-black !text-white shadow-[0_12px_28px_rgba(185,28,28,0.15)] transition hover:-translate-y-0.5 hover:bg-red-800 hover:!text-white"
                  >
                    <LogOut className="size-4 text-white" />
                    <span className="text-white">Sign out</span>
                  </button>
                </section>
              </aside>
            </div>
          )}
        </div>

        {showLogoutConfirmation ? (
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
              className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/75 bg-white/90 p-6 shadow-[0_32px_90px_rgba(38,24,31,0.24)] backdrop-blur-2xl sm:p-7"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/50 blur-3xl"
              />

              <div className="relative grid size-12 place-items-center rounded-[1.1rem] bg-red-50 text-red-700">
                <LogOut className="size-5" />
              </div>

              <h2
                id="vendor-logout-title"
                className="relative mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
              >
                Sign out of your account?
              </h2>

              <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
                Your current browser session will be cleared. You will need to enter your
                credentials again to access the vendor workspace.
              </p>

              <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirmation(false)}
                  className="btn-secondary justify-center text-sm font-black"
                >
                  Stay signed in
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(185,28,28,0.16)] transition hover:-translate-y-0.5 hover:bg-red-800 hover:!text-white"
                >
                  <LogOut className="size-4 text-white" />
                  <span className="text-white">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}