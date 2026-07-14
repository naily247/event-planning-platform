import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  Ban,
  Check,
  CircleAlert,
  Copy,
  Link2,
  LoaderCircle,
  MailCheck,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  createInvitation,
  getEventInvitations,
  regenerateInvitation,
  revokeInvitation,
  type Invitation,
  type InvitationPagination,
  type InvitationSort,
  type InvitationStatusFilter,
  type InvitationWithLink,
} from '../features/invitations/invitation.api';
import { api } from '../lib/api';
import { useState } from 'react';
import { getGuests, type Guest } from '../features/guests/guest.api';

type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

type CustomerEvent = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: number | null;
  plannedBudget: string | null;
  theme: string | null;
  requirements: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load this invitation workspace. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this invitation workspace. Please try again.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const getEventStatusTone = (status: EventStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'blue';

    case 'PLANNING':
      return 'plum';

    case 'COMPLETED':
      return 'green';

    case 'CANCELLED':
      return 'rose';

    case 'DRAFT':
    default:
      return 'gray';
  }
};

const emptyPagination: InvitationPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export function InvitationWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('14');
  const [createdInvitation, setCreatedInvitation] = useState<InvitationWithLink | null>(null);
  const [copiedInvitationUrl, setCopiedInvitationUrl] = useState(false);
  const [invitationToRegenerate, setInvitationToRegenerate] = useState<Invitation | null>(null);

  const [invitationToRevoke, setInvitationToRevoke] = useState<Invitation | null>(null);

  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);

  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);

  const [regenerateExpiresInDays, setRegenerateExpiresInDays] = useState('14');

  const [regeneratedInvitation, setRegeneratedInvitation] = useState<InvitationWithLink | null>(
    null,
  );

  const [copiedRegeneratedUrl, setCopiedRegeneratedUrl] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvitationStatusFilter | ''>('');
  const [sort, setSort] = useState<InvitationSort>('newest');
  const [page, setPage] = useState(1);

  const eventQuery = useQuery({
    queryKey: ['customer', 'events', eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const response = await api.get<ApiSuccessResponse<CustomerEvent>>(`/events/${eventId}`);

      return response.data.data;
    },
  });

  const invitationsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'invitations',
      {
        page,
        search: searchQuery,
        status: statusFilter,
        sort,
      },
    ],

    enabled: Boolean(eventId),

    queryFn: () =>
      getEventInvitations(eventId!, {
        page,
        limit: 10,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        sort,
      }),
  });
  const guestsQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'guests', 'invitation-options'],
    enabled: Boolean(eventId) && isCreateDialogOpen,
    queryFn: () =>
      getGuests(eventId!, {
        page: 1,
        limit: 100,
        sort: 'name_asc',
      }),
  });

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      if (!selectedGuestId) {
        throw new Error('Choose a guest before creating the invitation.');
      }

      const expiryDays = Number(expiresInDays);

      if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 30) {
        throw new Error('Invitation expiry must be a whole number between 1 and 30 days.');
      }

      return createInvitation(eventId, selectedGuestId, {
        expiresInDays: expiryDays,
      });
    },

    onSuccess: async (invitation) => {
      setCreatedInvitation(invitation);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'invitations'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests'],
        }),
      ]);
    },
  });

  const regenerateInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !invitationToRegenerate) {
        throw new Error('Invitation details are missing.');
      }

      const expiryDays = Number(regenerateExpiresInDays);

      if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 30) {
        throw new Error('Invitation expiry must be a whole number between 1 and 30 days.');
      }

      return regenerateInvitation(eventId, invitationToRegenerate.guestId, {
        expiresInDays: expiryDays,
      });
    },

    onSuccess: async (invitation) => {
      setRegeneratedInvitation(invitation);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'invitations'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests'],
        }),
      ]);
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !invitationToRevoke) {
        throw new Error('Invitation details are missing.');
      }

      return revokeInvitation(eventId, invitationToRevoke.guestId);
    },

    onSuccess: async () => {
      setInvitationToRevoke(null);
      setIsRevokeDialogOpen(false);

      await queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'invitations'],
      });
    },
  });

  const openRegenerateInvitationDialog = (invitation: Invitation) => {
    regenerateInvitationMutation.reset();
    setInvitationToRegenerate(invitation);
    setRegenerateExpiresInDays('14');
    setRegeneratedInvitation(null);
    setCopiedRegeneratedUrl(false);
    setIsRegenerateDialogOpen(true);
  };

  const closeRegenerateInvitationDialog = () => {
    if (regenerateInvitationMutation.isPending) {
      return;
    }

    regenerateInvitationMutation.reset();
    setInvitationToRegenerate(null);
    setRegenerateExpiresInDays('14');
    setRegeneratedInvitation(null);
    setCopiedRegeneratedUrl(false);
    setIsRegenerateDialogOpen(false);
  };

  const openRevokeInvitationDialog = (invitation: Invitation) => {
    revokeInvitationMutation.reset();
    setInvitationToRevoke(invitation);
    setIsRevokeDialogOpen(true);
  };

  const closeRevokeInvitationDialog = () => {
    if (revokeInvitationMutation.isPending) {
      return;
    }

    revokeInvitationMutation.reset();
    setInvitationToRevoke(null);
    setIsRevokeDialogOpen(false);
  };

  const openCreateInvitationDialog = () => {
    createInvitationMutation.reset();
    setSelectedGuestId('');
    setExpiresInDays('14');
    setCreatedInvitation(null);
    setCopiedInvitationUrl(false);
    setIsCreateDialogOpen(true);
  };

  const closeCreateInvitationDialog = () => {
    if (createInvitationMutation.isPending) {
      return;
    }

    createInvitationMutation.reset();
    setSelectedGuestId('');
    setExpiresInDays('14');
    setCreatedInvitation(null);
    setCopiedInvitationUrl(false);
    setIsCreateDialogOpen(false);
  };

  const copyInvitationUrl = async () => {
    if (!createdInvitation) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdInvitation.invitationUrl);
      setCopiedInvitationUrl(true);
    } catch {
      setCopiedInvitationUrl(false);
    }
  };

  const copyRegeneratedInvitationUrl = async () => {
    if (!regeneratedInvitation) {
      return;
    }

    try {
      await navigator.clipboard.writeText(regeneratedInvitation.invitationUrl);

      setCopiedRegeneratedUrl(true);
    } catch {
      setCopiedRegeneratedUrl(false);
    }
  };

  const submitInvitationSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearInvitationFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('');
    setSort('newest');
    setPage(1);
  };

  const isLoading = eventQuery.isLoading || invitationsQuery.isLoading;
  const isError = eventQuery.isError || invitationsQuery.isError;
  const firstError = eventQuery.error ?? invitationsQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your invitation workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading invitations, guest responses and sharing details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !eventQuery.data || !invitationsQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Invitation workspace unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {eventId ? getApiErrorMessage(firstError) : 'The event address is invalid.'}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {eventId ? (
                <button
                  type="button"
                  className="btn-primary text-sm font-bold"
                  onClick={() => {
                    void Promise.all([eventQuery.refetch(), invitationsQuery.refetch()]);
                  }}
                >
                  Try again
                </button>
              ) : null}

              <Link to="/events" className="btn-secondary text-sm font-bold">
                <ArrowLeft className="size-4" />
                Back to events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const event = eventQuery.data;
  const invitations = invitationsQuery.data.invitations;
  const pagination = invitationsQuery.data.pagination ?? emptyPagination;

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/events/${eventId}`}
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to event workspace"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Invitation management
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {event.name}
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone={getEventStatusTone(event.status)}>
            {event.status.replaceAll('_', ' ')}
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[8%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  Invitation planning
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Send, manage and track every invitation.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Generate secure invitation links, resend invitations, revoke access and monitor
                  guest responses from one workspace.
                </p>
              </div>

              <div className="glass-card p-5">
                <MailCheck className="size-6 text-[var(--color-deep-plum)]" />

                <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">
                  Invitations created
                </p>

                <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {pagination.total}
                </p>

                <p className="mt-3 text-sm font-semibold text-[var(--color-rosewood)]">
                  {invitations.length} currently shown on this page
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="luxe-card p-6">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Total invitations</p>

              <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {pagination.total}
              </p>
            </article>

            <article className="luxe-card p-6">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                Active on this page
              </p>

              <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {invitations.filter((invitation) => invitation.isActive).length}
              </p>
            </article>

            <article className="luxe-card p-6">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                Responded on this page
              </p>

              <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {invitations.filter((invitation) => invitation.hasResponded).length}
              </p>
            </article>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Invitation list
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Invitations generated for your guests.
                  </h2>
                </div>

                <button
                  type="button"
                  className="btn-primary shrink-0 text-sm font-bold"
                  onClick={openCreateInvitationDialog}
                >
                  <Plus className="size-4" />
                  Create invitation
                </button>
              </div>
              <form
                className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitInvitationSearch();
                }}
              >
                <div className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/24 px-4 backdrop-blur-xl">
                  <MailCheck className="size-5 shrink-0 text-[var(--color-charcoal)]/42" />

                  <input
                    className="min-h-12 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--color-charcoal)]/42"
                    type="search"
                    placeholder="Search by guest name or email"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                    }}
                  />
                </div>

                <select
                  className="form-field min-h-12 lg:w-48"
                  aria-label="Filter invitations by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as InvitationStatusFilter | '');
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                  <option value="responded">Responded</option>
                  <option value="unresponded">Unresponded</option>
                </select>

                <select
                  className="form-field min-h-12 lg:w-52"
                  aria-label="Sort invitations"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as InvitationSort);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="expires_soon">Expiring soon</option>
                  <option value="guest_name_asc">Guest name A–Z</option>
                  <option value="guest_name_desc">Guest name Z–A</option>
                </select>

                <div className="flex flex-wrap gap-3 lg:col-span-3">
                  <button type="submit" className="btn-primary text-sm font-bold">
                    Search
                  </button>

                  {searchQuery || statusFilter || sort !== 'newest' ? (
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={clearInvitationFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </form>

              {invitations.length > 0 ? (
                <div className="mt-8 grid gap-4">
                  {invitations.map((invitation) => (
                    <article
                      key={invitation.id}
                      className="rounded-[1.5rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            {invitation.guest.firstName} {invitation.guest.lastName}
                          </p>

                          <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/58">
                            {invitation.guest.email ?? 'No email address provided'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span
                            className="status-chip w-fit"
                            data-tone={
                              invitation.isRevoked
                                ? 'rose'
                                : invitation.isExpired
                                  ? 'gray'
                                  : invitation.hasResponded
                                    ? 'green'
                                    : 'plum'
                            }
                          >
                            {invitation.isRevoked
                              ? 'Revoked'
                              : invitation.isExpired
                                ? 'Expired'
                                : invitation.hasResponded
                                  ? 'Responded'
                                  : 'Active'}
                          </span>

                          <button
                            type="button"
                            className="grid size-9 place-items-center rounded-full border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.16)]"
                            aria-label={`Regenerate invitation for ${invitation.guest.firstName} ${invitation.guest.lastName}`}
                            onClick={() => {
                              openRegenerateInvitationDialog(invitation);
                            }}
                          >
                            <RefreshCcw className="size-4" />
                          </button>

                          <button
                            type="button"
                            className="grid size-9 place-items-center rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)] disabled:cursor-not-allowed disabled:opacity-45"
                            aria-label={`Revoke invitation for ${invitation.guest.firstName} ${invitation.guest.lastName}`}
                            disabled={invitation.isRevoked}
                            onClick={() => {
                              openRevokeInvitationDialog(invitation);
                            }}
                          >
                            <Ban className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                        <p className="font-semibold text-[var(--color-charcoal)]/62">
                          Guest status:{' '}
                          <span className="font-black text-[var(--color-near-black)]">
                            {invitation.guest.status.replaceAll('_', ' ')}
                          </span>
                        </p>

                        <p className="font-semibold text-[var(--color-charcoal)]/62">
                          Party size:{' '}
                          <span className="font-black text-[var(--color-near-black)]">
                            {invitation.guest.partySize}
                          </span>
                        </p>

                        <p className="font-semibold text-[var(--color-charcoal)]/62">
                          Expires:{' '}
                          <span className="font-black text-[var(--color-near-black)]">
                            {formatEventDate(invitation.expiresAt)}
                          </span>
                        </p>

                        <p className="font-semibold text-[var(--color-charcoal)]/62">
                          Last sent:{' '}
                          <span className="font-black text-[var(--color-near-black)]">
                            {invitation.lastSentAt
                              ? formatEventDate(invitation.lastSentAt)
                              : 'Not recorded'}
                          </span>
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <MailCheck className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {searchQuery || statusFilter
                      ? 'No invitations match these filters'
                      : 'No invitations created yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {searchQuery || statusFilter
                      ? 'Try changing the search term or invitation status filter.'
                      : 'Invitations will appear here after they are generated for guests.'}
                  </p>
                </div>
              )}
              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} invitations)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || invitationsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || invitationsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => currentPage + 1);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </article>

            <aside className="space-y-5">
              <article className="glass-card p-6 sm:p-7">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Event details
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Invitation context.
                </h2>

                <div className="mt-8 rounded-2xl bg-white/28 p-5 backdrop-blur-xl">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Event date</p>

                  <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                    {formatEventDate(event.eventDate)}
                  </p>
                </div>

                <div className="mt-3 rounded-2xl bg-white/28 p-5 backdrop-blur-xl">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Location</p>

                  <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                    {event.location}
                  </p>
                </div>
              </article>

              <article className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <MailCheck className="size-6 text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Invitation tools</h2>

                <p className="mt-3 leading-7 text-white/68">
                  Creation, regeneration, revocation, sharing and filtering controls will be
                  connected in the next steps.
                </p>
              </article>
            </aside>
          </section>
        </main>
      </div>
      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-invitation-title"
        >
          <div className="mx-auto max-w-2xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Send className="size-4" />
                    New invitation
                  </div>

                  <h2
                    id="create-invitation-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Create a secure guest invitation.
                  </h2>

                  <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                    Choose a guest and set how long their invitation link should remain active.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close invitation dialog"
                  disabled={createInvitationMutation.isPending}
                  onClick={closeCreateInvitationDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              {createdInvitation ? (
                <div className="mt-8">
                  <div className="rounded-[1.5rem] border border-[rgba(142,151,115,0.28)] bg-[rgba(142,151,115,0.12)] p-5">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(142,151,115,0.24)] text-[#3d452f]">
                        <Check className="size-5" />
                      </div>

                      <div>
                        <p className="font-black text-[var(--color-near-black)]">
                          Invitation created successfully
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/60">
                          The invitation is active and ready to share.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-white/55 bg-white/24 p-5">
                    <div className="flex items-center gap-2 text-sm font-black text-[var(--color-rosewood)]">
                      <Link2 className="size-4" />
                      Invitation link
                    </div>

                    <p className="mt-3 break-all rounded-2xl bg-white/35 px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/72">
                      {createdInvitation.invitationUrl}
                    </p>

                    <button
                      type="button"
                      className="btn-primary mt-4 w-full justify-center text-sm font-bold"
                      onClick={() => {
                        void copyInvitationUrl();
                      }}
                    >
                      {copiedInvitationUrl ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}

                      {copiedInvitationUrl ? 'Link copied' : 'Copy invitation link'}
                    </button>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={closeCreateInvitationDialog}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 grid gap-5">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Guest
                    </span>

                    <select
                      className="form-field"
                      value={selectedGuestId}
                      disabled={createInvitationMutation.isPending || guestsQuery.isLoading}
                      onChange={(event) => {
                        createInvitationMutation.reset();
                        setSelectedGuestId(event.target.value);
                      }}
                    >
                      <option value="">
                        {guestsQuery.isLoading ? 'Loading guests...' : 'Choose a guest'}
                      </option>

                      {(guestsQuery.data?.guests ?? []).map((guest: Guest) => (
                        <option key={guest.id} value={guest.id}>
                          {guest.firstName} {guest.lastName}
                          {guest.email ? ` — ${guest.email}` : ' — no email'}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      Guests with an email address will also receive the invitation automatically.
                    </p>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Link expiry
                    </span>

                    <div className="flex items-center gap-3">
                      <input
                        className="form-field"
                        type="number"
                        min="1"
                        max="30"
                        step="1"
                        value={expiresInDays}
                        disabled={createInvitationMutation.isPending}
                        onChange={(event) => {
                          createInvitationMutation.reset();
                          setExpiresInDays(event.target.value);
                        }}
                      />

                      <span className="shrink-0 text-sm font-black text-[var(--color-charcoal)]/60">
                        days
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      Invitations may remain active for between 1 and 30 days.
                    </p>
                  </label>

                  {guestsQuery.isError ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                    >
                      {getApiErrorMessage(guestsQuery.error)}
                    </div>
                  ) : null}

                  {createInvitationMutation.isError ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                    >
                      {createInvitationMutation.error instanceof Error &&
                      !axios.isAxiosError(createInvitationMutation.error)
                        ? createInvitationMutation.error.message
                        : getApiErrorMessage(createInvitationMutation.error)}
                    </div>
                  ) : null}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={createInvitationMutation.isPending}
                      onClick={closeCreateInvitationDialog}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="btn-primary justify-center text-sm font-bold"
                      disabled={
                        createInvitationMutation.isPending ||
                        guestsQuery.isLoading ||
                        !selectedGuestId
                      }
                      onClick={() => {
                        createInvitationMutation.mutate();
                      }}
                    >
                      {createInvitationMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}

                      {createInvitationMutation.isPending
                        ? 'Creating invitation...'
                        : 'Create invitation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isRegenerateDialogOpen && invitationToRegenerate ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-invitation-title"
        >
          <div className="mx-auto max-w-2xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <RefreshCcw className="size-4" />
                    Regenerate invitation
                  </div>

                  <h2
                    id="regenerate-invitation-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Create a fresh invitation link.
                  </h2>

                  <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                    This replaces the existing token for{' '}
                    <strong>
                      {invitationToRegenerate.guest.firstName}{' '}
                      {invitationToRegenerate.guest.lastName}
                    </strong>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close regenerate invitation dialog"
                  disabled={regenerateInvitationMutation.isPending}
                  onClick={closeRegenerateInvitationDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              {regeneratedInvitation ? (
                <div className="mt-8">
                  <div className="rounded-[1.5rem] border border-[rgba(142,151,115,0.28)] bg-[rgba(142,151,115,0.12)] p-5">
                    <p className="font-black text-[var(--color-near-black)]">
                      Invitation regenerated successfully
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/60">
                      The previous link is no longer valid.
                    </p>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-white/55 bg-white/24 p-5">
                    <div className="flex items-center gap-2 text-sm font-black text-[var(--color-rosewood)]">
                      <Link2 className="size-4" />
                      New invitation link
                    </div>

                    <p className="mt-3 break-all rounded-2xl bg-white/35 px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/72">
                      {regeneratedInvitation.invitationUrl}
                    </p>

                    <button
                      type="button"
                      className="btn-primary mt-4 w-full justify-center text-sm font-bold"
                      onClick={() => {
                        void copyRegeneratedInvitationUrl();
                      }}
                    >
                      {copiedRegeneratedUrl ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}

                      {copiedRegeneratedUrl ? 'Link copied' : 'Copy new invitation link'}
                    </button>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={closeRegenerateInvitationDialog}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 grid gap-5">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      New link expiry
                    </span>

                    <div className="flex items-center gap-3">
                      <input
                        className="form-field"
                        type="number"
                        min="1"
                        max="30"
                        step="1"
                        value={regenerateExpiresInDays}
                        disabled={regenerateInvitationMutation.isPending}
                        onChange={(event) => {
                          regenerateInvitationMutation.reset();
                          setRegenerateExpiresInDays(event.target.value);
                        }}
                      />

                      <span className="shrink-0 text-sm font-black text-[var(--color-charcoal)]/60">
                        days
                      </span>
                    </div>
                  </label>

                  {regenerateInvitationMutation.isError ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                    >
                      {regenerateInvitationMutation.error instanceof Error &&
                      !axios.isAxiosError(regenerateInvitationMutation.error)
                        ? regenerateInvitationMutation.error.message
                        : getApiErrorMessage(regenerateInvitationMutation.error)}
                    </div>
                  ) : null}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={regenerateInvitationMutation.isPending}
                      onClick={closeRegenerateInvitationDialog}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="btn-primary justify-center text-sm font-bold"
                      disabled={regenerateInvitationMutation.isPending}
                      onClick={() => {
                        regenerateInvitationMutation.mutate();
                      }}
                    >
                      {regenerateInvitationMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="size-4" />
                      )}

                      {regenerateInvitationMutation.isPending
                        ? 'Regenerating...'
                        : 'Regenerate invitation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isRevokeDialogOpen && invitationToRevoke ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-invitation-title"
        >
          <div className="glass-card w-full max-w-lg p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Ban className="size-7" />
            </div>

            <h2
              id="revoke-invitation-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Revoke this invitation?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              The current invitation link for{' '}
              <strong>
                {invitationToRevoke.guest.firstName} {invitationToRevoke.guest.lastName}
              </strong>{' '}
              will stop working immediately.
            </p>

            {revokeInvitationMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(revokeInvitationMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={revokeInvitationMutation.isPending}
                onClick={closeRevokeInvitationDialog}
              >
                Keep invitation
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={revokeInvitationMutation.isPending}
                onClick={() => {
                  revokeInvitationMutation.mutate();
                }}
              >
                {revokeInvitationMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Ban className="size-4" />
                )}

                {revokeInvitationMutation.isPending ? 'Revoking...' : 'Revoke invitation'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
