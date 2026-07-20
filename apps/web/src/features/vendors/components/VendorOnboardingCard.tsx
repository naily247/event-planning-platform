import { ArrowRight, CheckCircle2, CircleAlert, Clock3, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { VendorOnboarding } from '../vendor.api';

type VendorOnboardingCardProps = {
  onboarding: VendorOnboarding;
};

const getVerificationContent = (status: VendorOnboarding['profile']['verificationStatus']) => {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Verified vendor',
        description: 'Your business profile is approved and visible to customers across Eventure.',
        icon: ShieldCheck,
        tone: 'bg-[rgba(142,151,115,0.18)] text-[#3d452f]',
        statusTone: 'success',
      };

    case 'PENDING':
      return {
        label: 'Review in progress',
        description:
          'Your profile has been submitted and is currently waiting for administrator review.',
        icon: Clock3,
        tone: 'bg-[rgba(184,145,87,0.18)] text-[#6f5328]',
        statusTone: 'warning',
      };

    case 'REJECTED':
      return {
        label: 'Changes required',
        description:
          'Your profile needs a few updates before it can be submitted for review again.',
        icon: CircleAlert,
        tone: 'bg-[rgba(142,92,103,0.16)] text-[var(--color-rosewood)]',
        statusTone: 'danger',
      };

    case 'DRAFT':
    default:
      return {
        label: 'Profile setup',
        description:
          'Complete your vendor details so customers can understand your services and trust your business.',
        icon: CheckCircle2,
        tone: 'bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]',
        statusTone: 'plum',
      };
  }
};

const formatFieldLabel = (field: string) => {
  switch (field) {
    case 'businessName':
      return 'Business name';

    case 'contactPhone':
      return 'Contact phone';

    case 'baseLocation':
      return 'Base location';

    case 'serviceAreas':
      return 'Service areas';

    case 'categories':
      return 'Service categories';

    case 'description':
    default:
      return 'Business description';
  }
};

export function VendorOnboardingCard({ onboarding }: VendorOnboardingCardProps) {
  const { profile, completion } = onboarding;
  const verificationContent = getVerificationContent(profile.verificationStatus);

  const VerificationIcon = verificationContent.icon;

  const incompleteFields = Object.entries(completion.fields)
    .filter(([, completed]) => !completed)
    .map(([field]) => formatFieldLabel(field));

  const isEditable =
    profile.verificationStatus === 'DRAFT' || profile.verificationStatus === 'REJECTED';

  const primaryAction =
    profile.verificationStatus === 'APPROVED'
      ? {
          label: 'View public profile',
          to: `/vendors/${profile.slug}`,
        }
      : {
          label: isEditable ? 'Complete profile' : 'Review profile status',
          to: '/vendor/profile',
        };

  return (
    <article className="glass-card overflow-hidden">
      <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[1fr_0.45fr]">
        <div>
          <div
            className={`grid size-12 place-items-center rounded-2xl ${verificationContent.tone}`}
          >
            <VerificationIcon className="size-6" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              Vendor onboarding
            </p>

            <span className="status-chip" data-tone={verificationContent.statusTone}>
              {profile.verificationStatus.replaceAll('_', ' ')}
            </span>
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
            {verificationContent.label}
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-[var(--color-charcoal)]/66">
            {verificationContent.description}
          </p>

          {profile.rejectionReason ? (
            <div className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] p-4">
              <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                Administrator feedback
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                {profile.rejectionReason}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={primaryAction.to} className="btn-primary text-sm font-bold">
              {primaryAction.label}
              <ArrowRight className="size-4" />
            </Link>

            {profile.verificationStatus === 'DRAFT' && completion.percentage === 100 ? (
              <Link to="/vendor/profile" className="btn-secondary text-sm font-bold">
                Submit for review
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                Profile completion
              </p>

              <p className="mt-2 text-4xl font-black tracking-[-0.055em] text-[var(--color-near-black)]">
                {completion.percentage}%
              </p>
            </div>

            <p className="text-sm font-black text-[var(--color-deep-plum)]">
              {completion.completedFields}/{completion.totalFields}
            </p>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/45">
            <div
              className="h-full rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] transition-all duration-500"
              style={{
                width: `${completion.percentage}%`,
              }}
            />
          </div>

          <div className="mt-6 space-y-3">
            {Object.entries(completion.fields).map(([field, completed]) => (
              <div
                key={field}
                className="flex items-center justify-between gap-4 rounded-2xl bg-white/25 px-4 py-3"
              >
                <span className="text-sm font-bold text-[var(--color-charcoal)]/68">
                  {formatFieldLabel(field)}
                </span>

                <span className={completed ? 'text-[#586343]' : 'text-[var(--color-rosewood)]'}>
                  {completed ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <CircleAlert className="size-5" />
                  )}
                </span>
              </div>
            ))}
          </div>

          {incompleteFields.length > 0 ? (
            <p className="mt-5 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
              Still needed: {incompleteFields.join(', ')}.
            </p>
          ) : (
            <p className="mt-5 text-sm font-semibold leading-6 text-[#586343]">
              Your required profile information is complete.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
