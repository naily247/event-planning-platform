import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  approveAdminVendorApplication,
  getAdminVendorApplicationById,
  getPendingAdminVendorApplications,
  rejectAdminVendorApplication,
  type AdminVendorApplication,
} from '../features/admin/admin.api';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
function ReadOnlyDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[rgba(91,61,82,0.08)] bg-white/68 px-3.5 py-3">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
          <Icon className="size-4" />
        </div>

        <div className="min-w-0">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/44">
            {label}
          </p>

          <p className="mt-1 break-words text-xs font-bold leading-5 text-[var(--color-near-black)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function VendorApplicationCard({
  application,
  onView,
}: {
  application: AdminVendorApplication;
  onView: (applicationId: string) => void;
}) {
  return (
    <article className="group rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/72 p-4 shadow-[0_14px_38px_rgba(64,42,51,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.16)] hover:shadow-[0_18px_44px_rgba(64,42,51,0.09)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
            <Store className="size-4" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
              {application.businessName}
            </h3>

            <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/56">
              {application.user.firstName} {application.user.lastName}
            </p>

            <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-[var(--color-charcoal)]/44">
              {application.user.email}
            </p>
          </div>
        </div>

        <span className="status-chip w-fit shrink-0" data-tone="warning">
          Pending review
        </span>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl bg-[rgba(183,167,200,0.07)] px-3 py-2.5">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
            Location
          </p>

          <p className="mt-1 text-xs font-bold text-[var(--color-near-black)]">
            {application.baseLocation ?? 'Not provided'}
          </p>
        </div>

        <div className="rounded-xl bg-[rgba(183,167,200,0.07)] px-3 py-2.5">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
            Submitted
          </p>

          <p className="mt-1 text-xs font-bold text-[var(--color-near-black)]">
            {formatDate(application.submittedAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
        {application.categories.length > 0 ? (
          application.categories.map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center rounded-full border border-[rgba(91,61,82,0.09)] bg-[rgba(183,167,200,0.08)] px-2.5 py-1 text-[0.65rem] font-bold text-[var(--color-deep-plum)]"
            >
              {category.name}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center rounded-full border border-[rgba(91,61,82,0.09)] bg-[rgba(183,167,200,0.08)] px-2.5 py-1 text-[0.65rem] font-bold text-[var(--color-deep-plum)]">
            No categories selected
          </span>
        )}
      </div>

      <button
        type="button"
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-[rgba(91,61,82,0.12)] bg-[rgba(183,167,200,0.10)] px-4 text-xs font-black text-[var(--color-deep-plum)] transition hover:border-[rgba(91,61,82,0.20)] hover:bg-[rgba(183,167,200,0.17)]"
        onClick={() => onView(application.id)}
      >
        Review application
      </button>
    </article>
  );
}

export function AdminVendorApplicationsPage() {
  const queryClient = useQueryClient();

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const applicationsQuery = useQuery({
    queryKey: ['admin', 'vendors', 'pending'],
    queryFn: getPendingAdminVendorApplications,
  });

  const applicationDetailQuery = useQuery({
    queryKey: ['admin', 'vendors', selectedApplicationId],
    queryFn: () => getAdminVendorApplicationById(selectedApplicationId as string),
    enabled: Boolean(selectedApplicationId),
  });

  const approveMutation = useMutation({
    mutationFn: approveAdminVendorApplication,

    onSuccess: (_, vendorId) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'vendors', 'pending'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'vendors', vendorId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard', 'summary'],
      });

      setSelectedApplicationId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ vendorId, reason }: { vendorId: string; reason: string }) =>
      rejectAdminVendorApplication(vendorId, {
        reason,
      }),

    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'vendors', 'pending'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'vendors', variables.vendorId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard', 'summary'],
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedApplicationId(null);
    },
  });

  const applications = applicationsQuery.data?.applications ?? [];
  const selectedApplication = applicationDetailQuery.data;

  const isDecisionPending = approveMutation.isPending || rejectMutation.isPending;

  function openApplication(applicationId: string) {
    approveMutation.reset();
    rejectMutation.reset();
    setSelectedApplicationId(applicationId);
  }

  function closeApplication() {
    if (isDecisionPending) {
      return;
    }

    approveMutation.reset();
    rejectMutation.reset();
    setSelectedApplicationId(null);
    setShowRejectDialog(false);
    setRejectionReason('');
  }

  function handleApprove() {
    if (!selectedApplication) {
      return;
    }

    approveMutation.mutate(selectedApplication.id);
  }

  function handleReject() {
    if (!selectedApplication || rejectionReason.trim().length < 10) {
      return;
    }

    rejectMutation.mutate({
      vendorId: selectedApplication.id,
      reason: rejectionReason.trim(),
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#fbf9fa_0%,#f7f3f6_48%,#f5f3f8_100%)]">
  <div className="pointer-events-none absolute -left-40 top-40 size-[30rem] rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
  <div className="pointer-events-none absolute -right-44 top-[34rem] size-[32rem] rounded-full bg-[rgba(214,190,177,0.10)] blur-3xl" />

  <div className="relative mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
    <AdminWorkspaceNav />

    <main className="py-4">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-[linear-gradient(135deg,#fbf8fa_0%,#f5eff5_54%,#f1edf5_100%)] px-6 py-5 shadow-[0_18px_50px_rgba(64,42,51,0.07)] sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-16 -top-28 size-72 rounded-full border border-[rgba(91,61,82,0.07)]" />
        <div className="pointer-events-none absolute -right-2 -top-10 size-48 rounded-full border border-[rgba(91,61,82,0.06)]" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(91,61,82,0.10)] bg-white/60 px-3 py-1.5 text-[0.64rem] font-extrabold uppercase tracking-[0.17em] text-[var(--color-deep-plum)]">
              <ShieldCheck className="size-3.5" />
              Vendor verification
            </div>

            <h1 className="mt-4 max-w-4xl text-balance text-[2.25rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.7rem]">
              Review vendor applications with confidence.
            </h1>

            <p className="mt-3 max-w-2xl text-pretty text-sm font-medium leading-6 text-[var(--color-charcoal)]/68">
              Inspect business information, service categories, locations, contact details,
              and submission history before approving or rejecting marketplace access.
            </p>
          </div>

          <div className="min-w-[190px] rounded-[1.15rem] border border-[rgba(91,61,82,0.09)] bg-white/62 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  Pending applications
                </p>

                <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  {applicationsQuery.isLoading ? '—' : (applicationsQuery.data?.count ?? 0)}
                </p>
              </div>

              <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700">
                <Clock3 className="size-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {applicationsQuery.isLoading ? (
        <section className="state-surface mt-4">
          <div>
            <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
              Loading vendor applications
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
              Preparing pending submissions and business details.
            </p>
          </div>
        </section>
      ) : applicationsQuery.isError ? (
        <section className="state-surface mt-4">
          <div className="max-w-lg">
            <div className="icon-tile mx-auto">
              <AlertCircle className="size-6" />
            </div>

            <h2 className="mt-4 text-2xl font-black text-[var(--color-near-black)]">
              Vendor applications could not be loaded
            </h2>

            <p className="mt-2 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(
                applicationsQuery.error,
                'We could not load pending vendor applications.',
              )}
            </p>

            <button
              type="button"
              className="btn-primary mt-5 text-sm"
              onClick={() => applicationsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-4 rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-white/82 p-4 shadow-[0_18px_50px_rgba(64,42,51,0.07)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="section-eyebrow">Verification queue</p>

              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                Pending vendor applications
              </h2>

              <p className="mt-1 text-xs font-medium leading-5 text-[var(--color-charcoal)]/58">
                Applications are ordered by submission time, with the oldest submissions
                appearing first.
              </p>
            </div>

            {applications.length > 0 ? (
              <span className="status-chip w-fit" data-tone="warning">
                {applications.length} pending
              </span>
            ) : null}
          </div>

          {applications.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {applications.map((application) => (
                <VendorApplicationCard
                  key={application.id}
                  application={application}
                  onView={openApplication}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.2rem] border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(183,167,200,0.06)] px-5 py-7 text-center">
              <BadgeCheck className="mx-auto size-7 text-[var(--color-deep-plum)]/60" />

              <h3 className="mt-3 text-base font-black text-[var(--color-near-black)]">
                The verification queue is clear
              </h3>

              <p className="mx-auto mt-1 max-w-lg text-xs font-semibold leading-5 text-[var(--color-charcoal)]/56">
                New vendor submissions will appear here when profiles are sent for
                administrator review.
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  </div>

            {selectedApplicationId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-5 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeApplication();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-vendor-application-title"
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] border border-white/80 bg-[#fbf9fa] p-5 shadow-[0_28px_90px_rgba(64,42,51,0.18)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Vendor application</p>

                <h2
                  id="admin-vendor-application-title"
                  className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
                >
                  Application review
                </h2>
              </div>

              <button
                type="button"
                className="grid size-9 place-items-center rounded-xl border border-[rgba(91,61,82,0.10)] bg-white/72 text-[var(--color-charcoal)]/64 transition hover:bg-[rgba(183,167,200,0.10)] hover:text-[var(--color-deep-plum)]"
                onClick={closeApplication}
                aria-label="Close vendor application"
              >
                <X className="size-4" />
              </button>
            </div>

            {applicationDetailQuery.isLoading ? (
              <div className="state-surface mt-4 min-h-56">
                <div>
                  <LoaderCircle className="mx-auto size-8 animate-spin text-[var(--color-deep-plum)]" />

                  <p className="mt-3 font-black text-[var(--color-near-black)]">
                    Loading application details
                  </p>
                </div>
              </div>
            ) : applicationDetailQuery.isError ? (
              <div className="feedback-surface mt-4" data-tone="danger">
                {getErrorMessage(
                  applicationDetailQuery.error,
                  'We could not load this vendor application.',
                )}
              </div>
            ) : selectedApplication ? (
              <>
                <div className="mt-4 flex flex-col justify-between gap-4 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-white/72 px-4 py-3.5 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[rgba(91,61,82,0.09)] bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                      <Building2 className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {selectedApplication.businessName}
                      </h3>

                      <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/54">
                        Submitted by {selectedApplication.user.firstName}{' '}
                        {selectedApplication.user.lastName}
                      </p>
                    </div>
                  </div>

                  <span className="status-chip w-fit shrink-0" data-tone="warning">
                    {selectedApplication.verificationStatus}
                  </span>
                </div>

                <section className="mt-3 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-white/68 p-4">
                  <div>
                    <p className="section-eyebrow">Business information</p>

                    <h3 className="mt-1 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                      Vendor details
                    </h3>
                  </div>

                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    <ReadOnlyDetail
                      icon={Building2}
                      label="Business name"
                      value={selectedApplication.businessName}
                    />

                    <ReadOnlyDetail
                      icon={MapPin}
                      label="Base location"
                      value={selectedApplication.baseLocation ?? 'Not provided'}
                    />

                    <ReadOnlyDetail
                      icon={Phone}
                      label="Contact phone"
                      value={selectedApplication.contactPhone ?? 'Not provided'}
                    />

                    <ReadOnlyDetail
                      icon={Globe2}
                      label="Website"
                      value={selectedApplication.website ?? 'Not provided'}
                    />

                    <ReadOnlyDetail
                      icon={Clock3}
                      label="Submitted"
                      value={formatDateTime(selectedApplication.submittedAt)}
                    />

                    <ReadOnlyDetail
                      icon={CalendarDays}
                      label="Profile created"
                      value={formatDateTime(selectedApplication.createdAt)}
                    />
                  </div>

                  <div className="mt-3 rounded-[1rem] bg-[rgba(183,167,200,0.055)] px-3.5 py-3">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/44">
                      Business description
                    </p>

                    <p className="mt-1.5 whitespace-pre-wrap text-xs font-medium leading-5 text-[var(--color-charcoal)]/66">
                      {selectedApplication.description ??
                        'No business description was provided.'}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] bg-[rgba(183,167,200,0.055)] px-3.5 py-3">
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/44">
                        Service areas
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedApplication.serviceAreas.length > 0 ? (
                          selectedApplication.serviceAreas.map((area) => (
                            <span
                              key={area}
                              className="inline-flex items-center rounded-full border border-[rgba(91,61,82,0.09)] bg-white/72 px-2.5 py-1 text-[0.65rem] font-bold text-[var(--color-deep-plum)]"
                            >
                              {area}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-[rgba(91,61,82,0.09)] bg-white/72 px-2.5 py-1 text-[0.65rem] font-bold text-[var(--color-deep-plum)]">
                            No service areas provided
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1rem] bg-[rgba(183,167,200,0.055)] px-3.5 py-3">
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/44">
                        Service categories
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedApplication.categories.length > 0 ? (
                          selectedApplication.categories.map((category) => (
                            <span
                              key={category.id}
                              className="inline-flex items-center rounded-full border border-[rgba(91,61,82,0.09)] bg-white/72 px-2.5 py-1 text-[0.65rem] font-bold text-[var(--color-deep-plum)]"
                            >
                              {category.name}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-[rgba(91,61,82,0.09)] bg-white/72 px-2.5 py-1 text-[0.65rem] font-bold text-[var(--color-deep-plum)]">
                            No categories selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mt-3 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-[rgba(183,167,200,0.055)] p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="section-eyebrow">Account owner</p>

                      <h3 className="mt-1 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        Vendor account
                      </h3>
                    </div>

                    {selectedApplication.website ? (
                      <Link
                        to={selectedApplication.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 w-fit items-center justify-center gap-2 rounded-xl border border-[rgba(91,61,82,0.12)] bg-white/72 px-3.5 text-xs font-black text-[var(--color-deep-plum)] transition hover:bg-[rgba(183,167,200,0.10)]"
                      >
                        <ExternalLink className="size-3.5" />
                        Open vendor website
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                    <ReadOnlyDetail
                      icon={UserRound}
                      label="Full name"
                      value={`${selectedApplication.user.firstName} ${selectedApplication.user.lastName}`}
                    />

                    <ReadOnlyDetail
                      icon={Mail}
                      label="Email"
                      value={selectedApplication.user.email}
                    />

                    <ReadOnlyDetail
                      icon={ShieldCheck}
                      label="Account status"
                      value={selectedApplication.user.status.replaceAll('_', ' ')}
                    />
                  </div>
                </section>

                {approveMutation.isError || rejectMutation.isError ? (
                  <div className="feedback-surface mt-3" data-tone="danger" role="alert">
                    {getErrorMessage(
                      approveMutation.error ?? rejectMutation.error,
                      'We could not complete this vendor application decision.',
                    )}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-col justify-between gap-3 border-t border-[rgba(91,61,82,0.09)] pt-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Verification decision
                    </p>

                    <p className="mt-0.5 max-w-xl text-xs font-medium leading-5 text-[var(--color-charcoal)]/56">
                      Approving publishes the vendor to the marketplace. Rejecting returns
                      the profile with actionable feedback.
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="btn-danger min-h-10 px-4 text-xs"
                      disabled={isDecisionPending}
                      onClick={() => {
                        rejectMutation.reset();
                        setRejectionReason('');
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="size-3.5" />
                      Reject application
                    </button>

                    <button
                      type="button"
                      className="btn-primary min-h-10 px-4 text-xs"
                      disabled={isDecisionPending}
                      onClick={handleApprove}
                    >
                      {approveMutation.isPending ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}

                      {approveMutation.isPending ? 'Approving...' : 'Approve application'}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {showRejectDialog && selectedApplication ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !rejectMutation.isPending) {
              setShowRejectDialog(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-vendor-reject-title"
            className="w-full max-w-lg rounded-[2rem] border border-rose-100 bg-[#fffafb] p-6 shadow-[0_28px_90px_rgba(127,29,29,0.18)]"
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700">
              <XCircle className="size-5" />
            </div>

            <h2
              id="admin-vendor-reject-title"
              className="mt-5 text-2xl font-black text-[var(--color-near-black)]"
            >
              Reject this vendor application?
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/64">
              Provide clear feedback so {selectedApplication.businessName} can update the profile
              and submit it again.
            </p>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Rejection reason
              </span>

              <textarea
                className="form-field min-h-32"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Explain what must be corrected before this vendor can be approved."
                aria-invalid={rejectionReason.length > 0 && rejectionReason.trim().length < 10}
                disabled={rejectMutation.isPending}
              />

              <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/48">
                Minimum 10 characters.
              </span>
            </label>

            {rejectMutation.isError ? (
              <div className="feedback-surface mt-5" data-tone="danger" role="alert">
                {getErrorMessage(
                  rejectMutation.error,
                  'We could not reject this vendor application.',
                )}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={rejectMutation.isPending}
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-danger text-sm"
                disabled={rejectMutation.isPending || rejectionReason.trim().length < 10}
                onClick={handleReject}
              >
                {rejectMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}

                {rejectMutation.isPending ? 'Rejecting...' : 'Reject application'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
