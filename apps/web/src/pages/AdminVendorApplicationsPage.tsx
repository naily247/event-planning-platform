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
    <div className="rounded-2xl border border-white/80 bg-white/60 p-4">
      <div className="flex items-start gap-3">
        <div className="icon-tile shrink-0">
          <Icon className="size-4" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-bold leading-6 text-[var(--color-near-black)]">
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
    <article className="workspace-card p-5">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
            <Store className="size-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
              {application.businessName}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
              {application.user.firstName} {application.user.lastName}
            </p>

            <p className="mt-1 break-all text-xs font-semibold text-[var(--color-charcoal)]/46">
              {application.user.email}
            </p>
          </div>
        </div>

        <span className="status-chip w-fit" data-tone="warning">
          Pending review
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/48 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Location
          </p>

          <p className="mt-2 text-sm font-bold text-[var(--color-near-black)]">
            {application.baseLocation ?? 'Not provided'}
          </p>
        </div>

        <div className="rounded-2xl bg-white/48 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Submitted
          </p>

          <p className="mt-2 text-sm font-bold text-[var(--color-near-black)]">
            {formatDate(application.submittedAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {application.categories.length > 0 ? (
          application.categories.map((category) => (
            <span key={category.id} className="soft-chip text-xs font-bold">
              {category.name}
            </span>
          ))
        ) : (
          <span className="soft-chip text-xs font-bold">No categories selected</span>
        )}
      </div>

      <button
        type="button"
        className="btn-secondary mt-6 w-full text-sm"
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
    <div className="workspace-shell">
      <div className="workspace-container">
        <AdminWorkspaceNav />

        <main className="py-8">
          <section className="workspace-hero">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <ShieldCheck className="size-4" />
                  Vendor verification
                </div>

                <h1 className="max-w-4xl text-balance text-4xl font-black leading-[1] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                  Review vendor applications with confidence.
                </h1>

                <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/68">
                  Inspect business information, service categories, locations, contact details, and
                  submission history before approving or rejecting marketplace access.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/72 px-5 py-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                  Pending applications
                </p>

                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {applicationsQuery.isLoading ? '—' : (applicationsQuery.data?.count ?? 0)}
                </p>
              </div>
            </div>
          </section>

          {applicationsQuery.isLoading ? (
            <section className="state-surface mt-6">
              <div>
                <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

                <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                  Loading vendor applications
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                  Preparing pending submissions and business details.
                </p>
              </div>
            </section>
          ) : applicationsQuery.isError ? (
            <section className="state-surface mt-6">
              <div className="max-w-lg">
                <div className="icon-tile mx-auto">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                  Vendor applications could not be loaded
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                  {getErrorMessage(
                    applicationsQuery.error,
                    'We could not load pending vendor applications.',
                  )}
                </p>

                <button
                  type="button"
                  className="btn-primary mt-6 text-sm"
                  onClick={() => applicationsQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <section className="workspace-panel mt-6">
              <div>
                <p className="section-eyebrow">Verification queue</p>

                <h2 className="section-title">Pending vendor applications</h2>

                <p className="section-description">
                  Applications are ordered by submission time, with the oldest submissions appearing
                  first.
                </p>
              </div>

              {applications.length > 0 ? (
                <div className="mt-7 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {applications.map((application) => (
                    <VendorApplicationCard
                      key={application.id}
                      application={application}
                      onView={openApplication}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-surface mt-7">
                  <BadgeCheck className="mx-auto size-9 text-[var(--color-deep-plum)]/64" />

                  <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    The verification queue is clear
                  </h3>

                  <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                    New vendor submissions will appear here when profiles are sent for administrator
                    review.
                  </p>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {selectedApplicationId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
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
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/80 bg-[#fbf8f5] p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Vendor application</p>

                <h2 id="admin-vendor-application-title" className="section-title">
                  Application review
                </h2>
              </div>

              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                onClick={closeApplication}
                aria-label="Close vendor application"
              >
                <X className="size-5" />
              </button>
            </div>

            {applicationDetailQuery.isLoading ? (
              <div className="state-surface mt-6 min-h-72">
                <div>
                  <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--color-deep-plum)]" />

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    Loading application details
                  </p>
                </div>
              </div>
            ) : applicationDetailQuery.isError ? (
              <div className="feedback-surface mt-6" data-tone="danger">
                {getErrorMessage(
                  applicationDetailQuery.error,
                  'We could not load this vendor application.',
                )}
              </div>
            ) : selectedApplication ? (
              <>
                <div className="mt-6 flex flex-col justify-between gap-5 rounded-2xl border border-white/80 bg-white/72 p-5 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-4">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                      <Building2 className="size-6" />
                    </div>

                    <div>
                      <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        {selectedApplication.businessName}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
                        Submitted by {selectedApplication.user.firstName}{' '}
                        {selectedApplication.user.lastName}
                      </p>
                    </div>
                  </div>

                  <span className="status-chip w-fit" data-tone="warning">
                    {selectedApplication.verificationStatus}
                  </span>
                </div>

                <section className="workspace-panel mt-6">
                  <p className="section-eyebrow">Business information</p>

                  <h3 className="section-title">Vendor details</h3>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

                  <div className="mt-6 rounded-2xl border border-white/80 bg-white/60 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                      Business description
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-charcoal)]/68">
                      {selectedApplication.description ?? 'No business description was provided.'}
                    </p>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                      Service areas
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedApplication.serviceAreas.length > 0 ? (
                        selectedApplication.serviceAreas.map((area) => (
                          <span key={area} className="soft-chip text-xs font-bold">
                            {area}
                          </span>
                        ))
                      ) : (
                        <span className="soft-chip text-xs font-bold">
                          No service areas provided
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                      Service categories
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedApplication.categories.length > 0 ? (
                        selectedApplication.categories.map((category) => (
                          <span key={category.id} className="soft-chip text-xs font-bold">
                            {category.name}
                          </span>
                        ))
                      ) : (
                        <span className="soft-chip text-xs font-bold">No categories selected</span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="workspace-panel mt-6">
                  <p className="section-eyebrow">Account owner</p>

                  <h3 className="section-title">Vendor account</h3>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

                {selectedApplication.website ? (
                  <Link
                    to={selectedApplication.website}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary mt-6 w-fit text-sm"
                  >
                    <ExternalLink className="size-4" />
                    Open vendor website
                  </Link>
                ) : null}

                {approveMutation.isError || rejectMutation.isError ? (
                  <div className="feedback-surface mt-6" data-tone="danger" role="alert">
                    {getErrorMessage(
                      approveMutation.error ?? rejectMutation.error,
                      'We could not complete this vendor application decision.',
                    )}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col justify-between gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-black text-[var(--color-near-black)]">
                      Verification decision
                    </p>

                    <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--color-charcoal)]/56">
                      Approving publishes the vendor to the marketplace. Rejecting returns the
                      profile with actionable feedback.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="btn-danger text-sm"
                      disabled={isDecisionPending}
                      onClick={() => {
                        rejectMutation.reset();
                        setRejectionReason('');
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="size-4" />
                      Reject application
                    </button>

                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={isDecisionPending}
                      onClick={handleApprove}
                    >
                      {approveMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
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
            className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-[#fbf8f5] p-6 shadow-2xl"
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
