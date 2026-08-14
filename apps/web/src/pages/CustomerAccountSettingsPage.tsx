import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CustomerWorkspaceHeader } from '../components/navigation/CustomerWorkspaceHeader';
import {
  changeCurrentUserPassword,
  type ChangeCurrentUserPasswordInput,
} from '../features/auth/auth.api';
import { useCurrentUser } from '../features/auth/useCurrentUser';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

export function CustomerAccountSettingsPage() {
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordChecks = useMemo(
    () => ({
      length:
        newPassword.length >= PASSWORD_MIN_LENGTH && newPassword.length <= PASSWORD_MAX_LENGTH,
      letter: /[A-Za-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    }),
    [newPassword],
  );

  const passwordPolicyPassed =
    passwordChecks.length &&
    passwordChecks.letter &&
    passwordChecks.number &&
    passwordChecks.special;

  const passwordsMatch = confirmNewPassword.length > 0 && newPassword === confirmNewPassword;

  const changePasswordMutation = useMutation({
    mutationFn: (input: ChangeCurrentUserPasswordInput) => changeCurrentUserPassword(input),

    onSuccess: (result) => {
      setSuccessMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    },
  });

  if (currentUserQuery.isLoading) {
    return (
      <main className="page-shell min-h-screen">
        <div className="mx-auto max-w-7xl py-10">
          <div className="glass-card p-6 text-sm font-bold text-[var(--color-charcoal)]/60">
            Loading account settings...
          </div>
        </div>
      </main>
    );
  }

  if (currentUserQuery.isError || !user) {
    return (
      <main className="page-shell min-h-screen">
        <div className="mx-auto max-w-7xl py-10">
          <div className="glass-card p-6">
            <p className="font-black text-[var(--color-near-black)]">
              We couldn&apos;t load your account settings.
            </p>

            <button
              type="button"
              className="btn-secondary mt-4 text-sm font-bold"
              onClick={() => {
                void currentUserQuery.refetch();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmNewPassword.length > 0 &&
    passwordPolicyPassed &&
    passwordsMatch &&
    !changePasswordMutation.isPending;

  const handleChangePassword = () => {
    if (!canSubmit) {
      return;
    }

    setSuccessMessage(null);

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <main className="page-shell min-h-screen">
      <div className="mx-auto max-w-7xl py-8">
        <CustomerWorkspaceHeader user={user} unreadNotificationCount={0} />

        <div className="mt-5">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)] transition hover:-translate-x-0.5"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </div>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/60 bg-white/35 shadow-[0_26px_80px_rgba(31,27,29,0.10)] backdrop-blur-xl">
          <div className="relative overflow-hidden border-b border-white/50 px-6 py-10 sm:px-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(183,167,200,0.24),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(124,74,90,0.14),transparent_38%)]" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="size-28 rounded-full object-cover shadow-[0_20px_50px_rgba(93,58,85,0.22)]"
                />
              ) : (
                <div className="grid size-28 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-3xl font-black text-white shadow-[0_20px_50px_rgba(93,58,85,0.24)]">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Account settings
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl">
                  Security & account
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  Review your account identity and manage your password securely.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr]">
            <aside className="space-y-5">
              <section className="rounded-[1.5rem] border border-white/60 bg-white/45 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Account identity
                    </p>

                    <h2 className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                      Account overview
                    </h2>
                  </div>

                  <span className="grid size-11 place-items-center rounded-2xl bg-[rgba(93,58,85,0.09)] text-[var(--color-deep-plum)]">
                    <UserRound className="size-5" />
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <AccountDetail
                    label="Email"
                    value={user.email}
                    icon={<Mail className="size-4" />}
                  />

                  <AccountDetail
                    label="Role"
                    value={formatEnumValue(user.role)}
                    icon={<UserRound className="size-4" />}
                  />

                  <AccountDetail
                    label="Status"
                    value={formatEnumValue(user.status)}
                    icon={<ShieldCheck className="size-4" />}
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-[rgba(93,58,85,0.17)] bg-[rgba(93,58,85,0.04)] p-4">
                  <p className="text-sm font-black text-[var(--color-near-black)]">
                    Email changes are currently locked
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                    Changing an account email requires an email verification flow, so it isn&apos;t
                    available from this page yet.
                  </p>
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/60 bg-[linear-gradient(135deg,rgba(93,58,85,0.08),rgba(183,167,200,0.13))] p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/45 text-[var(--color-deep-plum)]">
                    <LockKeyhole className="size-5" />
                  </span>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                      Security
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      Your current password must be verified before a new password can replace it.
                    </p>
                  </div>
                </div>
              </section>
            </aside>

            <section className="rounded-[1.5rem] border border-white/60 bg-white/45 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Password & security
                  </p>

                  <h2 className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                    Change password
                  </h2>

                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/52">
                    Use a password you don&apos;t use elsewhere.
                  </p>
                </div>

                <span className="grid size-11 place-items-center rounded-2xl bg-[rgba(93,58,85,0.09)] text-[var(--color-deep-plum)]">
                  <KeyRound className="size-5" />
                </span>
              </div>

              <div className="mt-7 space-y-5">
                <PasswordField
                  label="Current password"
                  value={currentPassword}
                  showPassword={showCurrentPassword}
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                  onChange={(value) => {
                    setCurrentPassword(value);
                    setSuccessMessage(null);
                  }}
                  onToggleVisibility={() => {
                    setShowCurrentPassword((value) => !value);
                  }}
                />

                <PasswordField
                  label="New password"
                  value={newPassword}
                  showPassword={showNewPassword}
                  autoComplete="new-password"
                  placeholder="Create a new password"
                  onChange={(value) => {
                    setNewPassword(value);
                    setSuccessMessage(null);
                  }}
                  onToggleVisibility={() => {
                    setShowNewPassword((value) => !value);
                  }}
                />

                <PasswordField
                  label="Confirm new password"
                  value={confirmNewPassword}
                  showPassword={showConfirmPassword}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  onChange={(value) => {
                    setConfirmNewPassword(value);
                    setSuccessMessage(null);
                  }}
                  onToggleVisibility={() => {
                    setShowConfirmPassword((value) => !value);
                  }}
                />
              </div>

              <div className="mt-6 rounded-[1.35rem] border border-white/60 bg-white/32 p-5">
                <p className="text-sm font-black text-[var(--color-near-black)]">
                  Password requirements
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <PasswordRequirement passed={passwordChecks.length} label="8–72 characters" />

                  <PasswordRequirement passed={passwordChecks.letter} label="At least one letter" />

                  <PasswordRequirement passed={passwordChecks.number} label="At least one number" />

                  <PasswordRequirement
                    passed={passwordChecks.special}
                    label="At least one special character"
                  />
                </div>

                {confirmNewPassword ? (
                  <div className="mt-4 border-t border-[rgba(93,58,85,0.08)] pt-4">
                    <PasswordRequirement
                      passed={passwordsMatch}
                      label={passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    />
                  </div>
                ) : null}
              </div>

              {changePasswordMutation.isError ? (
                <div className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.07)] p-4">
                  <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                    Password change failed
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/55">
                    Check your current password and make sure your new password meets all
                    requirements and is different from the old one.
                  </p>
                </div>
              ) : null}

              {successMessage ? (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[rgba(93,58,85,0.12)] bg-[rgba(93,58,85,0.06)] p-4">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-deep-plum)] text-white">
                    <Check className="size-4" />
                  </span>

                  <div>
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Password updated
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                      {successMessage}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 border-t border-[rgba(93,58,85,0.09)] pt-5">
                <button
                  type="button"
                  className="btn-primary text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSubmit}
                  onClick={handleChangePassword}
                >
                  <KeyRound className="size-4" />

                  {changePasswordMutation.isPending ? 'Updating password...' : 'Change password'}
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function PasswordField({
  label,
  value,
  showPassword,
  autoComplete,
  placeholder,
  onChange,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  showPassword: boolean;
  autoComplete: string;
  placeholder: string;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
        {label}
      </span>

      <div className="relative mt-2">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/65 bg-white/55 px-4 py-3.5 pr-12 text-sm font-black text-[var(--color-near-black)] outline-none transition placeholder:text-[var(--color-charcoal)]/30 focus:border-[rgba(93,58,85,0.28)] focus:bg-white/80 focus:shadow-[0_0_0_4px_rgba(93,58,85,0.07)]"
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />

        <button
          type="button"
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-xl text-[var(--color-charcoal)]/50 transition hover:bg-[rgba(93,58,85,0.08)] hover:text-[var(--color-deep-plum)]"
          onClick={onToggleVisibility}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );
}

function PasswordRequirement({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs font-bold ${
        passed ? 'text-[var(--color-deep-plum)]' : 'text-[var(--color-charcoal)]/45'
      }`}
    >
      <span
        className={`grid size-5 shrink-0 place-items-center rounded-full ${
          passed ? 'bg-[rgba(93,58,85,0.11)]' : 'bg-black/[0.035]'
        }`}
      >
        <Check className="size-3" />
      </span>

      <span>{label}</span>
    </div>
  );
}

function AccountDetail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/55 bg-white/40 p-4">
      <div className="flex items-center gap-2 text-[var(--color-deep-plum)]">
        {icon}

        <p className="text-[0.68rem] font-black uppercase tracking-[0.16em]">{label}</p>
      </div>

      <p className="mt-2 break-words text-sm font-black text-[var(--color-near-black)]">{value}</p>
    </div>
  );
}

function formatEnumValue(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
