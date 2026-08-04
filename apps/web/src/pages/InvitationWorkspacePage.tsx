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
import { PageBackButton } from '../components/navigation/PageBackButton';

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

  const activeInvitationsOnPage = invitations.filter((invitation) => invitation.isActive).length;

  const respondedInvitationsOnPage = invitations.filter(
    (invitation) => invitation.hasResponded,
  ).length;

  const expiredInvitationsOnPage = invitations.filter((invitation) => invitation.isExpired).length;

  const revokedInvitationsOnPage = invitations.filter((invitation) => invitation.isRevoked).length;

  const pageResponseRate =
    invitations.length > 0
      ? Math.round((respondedInvitationsOnPage / invitations.length) * 100)
      : 0;

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton
              fallback={`/events/${eventId}`}
              label="Event workspace"
              className="shrink-0"
            />

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

            <div className="relative grid gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div className="flex flex-col justify-center">
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Invitation planning
                </div>

                <h2 className="max-w-4xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl sm:leading-[0.98] lg:text-[3.65rem]">
                  Send, manage and track every invitation.
                </h2>

                <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/70 sm:text-lg sm:leading-8">
                  Generate secure invitation links, replace expired access, revoke compromised links
                  and monitor guest responses from one workspace.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <div className="soft-chip">
                    <MailCheck
                      aria-hidden="true"
                      className="size-4 text-[var(--color-deep-plum)]"
                    />
                    {pagination.total} invitations created
                  </div>

                  <div className="soft-chip">
                    <Check aria-hidden="true" className="size-4 text-[var(--color-deep-plum)]" />
                    {respondedInvitationsOnPage} responses shown
                  </div>

                  <div className="soft-chip">
                    <Send aria-hidden="true" className="size-4 text-[var(--color-deep-plum)]" />

                    {formatEventDate(event.eventDate)}
                  </div>
                </div>
              </div>
              <aside className="group/invitation-health relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_28px_80px_rgba(93,58,85,0.28)] transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_34px_92px_rgba(93,58,85,0.33)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-white/10 blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-[rgba(175,201,216,0.10)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">
                        Invitation health
                      </p>

                      <p className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                        {pageResponseRate}%
                      </p>

                      <p className="mt-2 text-sm font-semibold text-white/58">
                        response rate across the invitations shown
                      </p>
                    </div>

                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] shadow-[0_12px_28px_rgba(31,27,29,0.12)] backdrop-blur transition duration-300 group-hover/invitation-health:-translate-y-0.5 group-hover/invitation-health:scale-105">
                      <MailCheck aria-hidden="true" className="size-5" />
                    </span>
                  </div>

                  <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-powder-blue),#fff4ea)] shadow-[0_0_18px_rgba(255,244,234,0.24)] transition-[width] duration-700"
                      style={{
                        width: `${Math.min(Math.max(pageResponseRate, 0), 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.12]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Active
                      </p>

                      <p className="mt-2 text-2xl font-black">{activeInvitationsOnPage}</p>

                      <p className="mt-1 text-xs font-semibold text-white/48">
                        Ready for guest access
                      </p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-[rgba(142,151,115,0.16)] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(142,151,115,0.22)]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Responded
                      </p>

                      <p className="mt-2 text-2xl font-black">{respondedInvitationsOnPage}</p>

                      <p className="mt-1 text-xs font-semibold text-white/48">
                        Guest replies received
                      </p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.07] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.11]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Expired
                      </p>

                      <p className="mt-2 text-2xl font-black">{expiredInvitationsOnPage}</p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-[rgba(142,92,103,0.18)] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(142,92,103,0.24)]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Revoked
                      </p>

                      <p className="mt-2 text-2xl font-black">{revokedInvitationsOnPage}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/12 pt-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
                        Current view
                      </p>

                      <p className="mt-1 text-sm font-black text-white/82">
                        {invitations.length} of {pagination.total} invitations shown
                      </p>
                    </div>

                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white/72">
                      <Link2 aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-12 grid gap-5 sm:grid-cols-3">
            <article className="group/inv-summary luxe-card relative overflow-hidden border-white/70 bg-white/48 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/92 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(236,226,242,0.78))] hover:shadow-[0_28px_70px_rgba(31,27,29,0.12)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/inv-summary:scale-125 group-hover/inv-summary:bg-[rgba(183,167,200,0.30)]"
              />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42 transition duration-300 group-hover/inv-summary:text-[var(--color-rosewood)]">
                Total invitations
              </p>

              <p className="mt-3 text-4xl font-black tracking-[-0.055em] text-[var(--color-near-black)] transition duration-300 group-hover/inv-summary:-translate-y-0.5 group-hover/inv-summary:text-[var(--color-deep-plum)]">
                {pagination.total}
              </p>
            </article>

            <article className="group/inv-summary luxe-card relative overflow-hidden border-white/70 bg-white/48 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/92 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(236,226,242,0.78))] hover:shadow-[0_28px_70px_rgba(31,27,29,0.12)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/inv-summary:scale-125 group-hover/inv-summary:bg-[rgba(183,167,200,0.30)]"
              />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42 transition duration-300 group-hover/inv-summary:text-[var(--color-rosewood)]">
                Active on this page
              </p>

              <p className="mt-3 text-4xl font-black tracking-[-0.055em] text-[var(--color-near-black)] transition duration-300 group-hover/inv-summary:-translate-y-0.5 group-hover/inv-summary:text-[var(--color-deep-plum)]">
                {invitations.filter((invitation) => invitation.isActive).length}
              </p>
            </article>

            <article className="group/inv-summary luxe-card relative overflow-hidden border-white/70 bg-white/48 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/92 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(236,226,242,0.78))] hover:shadow-[0_28px_70px_rgba(31,27,29,0.12)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/inv-summary:scale-125 group-hover/inv-summary:bg-[rgba(183,167,200,0.30)]"
              />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42 transition duration-300 group-hover/inv-summary:text-[var(--color-rosewood)]">
                Responded on this page
              </p>

              <p className="mt-3 text-4xl font-black tracking-[-0.055em] text-[var(--color-near-black)] transition duration-300 group-hover/inv-summary:-translate-y-0.5 group-hover/inv-summary:text-[var(--color-deep-plum)]">
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
                      className="group/invitation relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.38),rgba(255,255,255,0.20))] p-5 shadow-[0_18px_45px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/90 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.80),rgba(233,224,241,0.58))] hover:shadow-[0_28px_68px_rgba(31,27,29,0.11)] sm:p-6"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[rgba(183,167,200,0.16)] opacity-60 blur-3xl transition duration-500 group-hover/invitation:scale-125 group-hover/invitation:bg-[rgba(183,167,200,0.30)] group-hover/invitation:opacity-100"
                      />

                      <div className="relative">
                        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                          <div className="flex min-w-0 items-start gap-4">
                            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/55 bg-[rgba(183,167,200,0.22)] text-sm font-black text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(93,58,85,0.08)] transition duration-300 group-hover/invitation:-translate-y-0.5 group-hover/invitation:scale-105 group-hover/invitation:bg-[rgba(183,167,200,0.34)] group-hover/invitation:shadow-[0_16px_34px_rgba(93,58,85,0.14)]">
                              {invitation.guest.firstName.charAt(0)}
                              {invitation.guest.lastName.charAt(0)}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/invitation:translate-x-0.5 group-hover/invitation:text-[var(--color-deep-plum)]">
                                {invitation.guest.firstName} {invitation.guest.lastName}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="max-w-full truncate text-sm font-semibold text-[var(--color-charcoal)]/58">
                                  {invitation.guest.email ?? 'No email address provided'}
                                </span>

                                <span className="size-1 rounded-full bg-[var(--color-charcoal)]/24" />

                                <span className="text-sm font-semibold text-[var(--color-charcoal)]/52">
                                  Party of {invitation.guest.partySize}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-3">
                            <span
                              className="status-chip w-fit transition duration-300 group-hover/invitation:-translate-y-0.5 group-hover/invitation:scale-[1.02] group-hover/invitation:shadow-[0_8px_20px_rgba(31,27,29,0.08)]"
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
                              className="grid size-10 place-items-center rounded-2xl border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.04)] transition duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-[rgba(93,58,85,0.30)] hover:bg-[rgba(93,58,85,0.16)] hover:shadow-[0_14px_30px_rgba(93,58,85,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30"
                              aria-label={`Regenerate invitation for ${invitation.guest.firstName} ${invitation.guest.lastName}`}
                              onClick={() => {
                                openRegenerateInvitationDialog(invitation);
                              }}
                            >
                              <RefreshCcw
                                aria-hidden="true"
                                className="size-4 transition duration-300 group-hover/invitation:rotate-[10deg]"
                              />
                            </button>

                            <button
                              type="button"
                              className="grid size-10 place-items-center rounded-2xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] shadow-[0_10px_24px_rgba(31,27,29,0.04)] transition duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-[rgba(124,74,90,0.30)] hover:bg-[rgba(124,74,90,0.16)] hover:shadow-[0_14px_30px_rgba(124,74,90,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-muted-burgundy)]/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-[0_10px_24px_rgba(31,27,29,0.04)]"
                              aria-label={`Revoke invitation for ${invitation.guest.firstName} ${invitation.guest.lastName}`}
                              disabled={invitation.isRevoked}
                              onClick={() => {
                                openRevokeInvitationDialog(invitation);
                              }}
                            >
                              <Ban
                                aria-hidden="true"
                                className="size-4 transition duration-300 group-hover/invitation:rotate-[-4deg]"
                              />
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-5 text-sm sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-2xl border border-white/45 bg-white/22 p-4 transition duration-300 group-hover/invitation:border-white/72 group-hover/invitation:bg-white/38">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Guest status
                            </p>

                            <p className="mt-2 font-black leading-6 text-[var(--color-near-black)]">
                              {invitation.guest.status.replaceAll('_', ' ')}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/45 bg-white/22 p-4 transition duration-300 group-hover/invitation:border-white/72 group-hover/invitation:bg-white/38">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Expires
                            </p>

                            <p className="mt-2 font-black leading-6 text-[var(--color-near-black)]">
                              {formatEventDate(invitation.expiresAt)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/45 bg-white/22 p-4 transition duration-300 group-hover/invitation:border-white/72 group-hover/invitation:bg-white/38">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Created
                            </p>

                            <p className="mt-2 font-black leading-6 text-[var(--color-near-black)]">
                              {formatEventDate(invitation.createdAt)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/45 bg-white/22 p-4 transition duration-300 group-hover/invitation:border-white/72 group-hover/invitation:bg-white/38 sm:col-span-2 xl:col-span-3">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Last sent
                            </p>

                            <p className="mt-2 font-black leading-6 text-[var(--color-near-black)]">
                              {invitation.lastSentAt
                                ? formatEventDate(invitation.lastSentAt)
                                : 'Not recorded'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-dashed border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.50),rgba(255,255,255,0.24))] p-8 text-center shadow-[0_16px_42px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-10">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                  />

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-16 -left-12 size-40 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.06)]">
                      <MailCheck aria-hidden="true" className="size-8" />
                    </div>

                    <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      {searchQuery || statusFilter
                        ? 'No invitations match these filters'
                        : 'No invitations created yet'}
                    </p>

                    <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                      {searchQuery || statusFilter
                        ? 'Try changing the search term or invitation status filter.'
                        : 'Create the first secure invitation link for a guest and start tracking responses here.'}
                    </p>

                    {searchQuery || statusFilter ? (
                      <button
                        type="button"
                        className="btn-secondary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                        onClick={clearInvitationFilters}
                      >
                        Clear filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="group/first-invitation btn-primary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        onClick={openCreateInvitationDialog}
                      >
                        <Plus
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/first-invitation:rotate-90"
                        />
                        Create first invitation
                      </button>
                    )}
                  </div>
                </div>
              )}
              {pagination.totalPages > 1 ? (
                <div className="relative mt-8 overflow-hidden rounded-[1.5rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(228,238,243,0.32))] p-4 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-5">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                  />

                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[var(--color-deep-plum)] shadow-[0_8px_20px_rgba(31,27,29,0.05)]">
                        <MailCheck aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Page {pagination.page} of {pagination.totalPages}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/50">
                          {pagination.total} {pagination.total === 1 ? 'invitation' : 'invitations'}{' '}
                          in total
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                        disabled={!pagination.hasPreviousPage || invitationsQuery.isFetching}
                        onClick={() => {
                          setPage((currentPage) => Math.max(currentPage - 1, 1));
                        }}
                      >
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                        disabled={!pagination.hasNextPage || invitationsQuery.isFetching}
                        onClick={() => {
                          setPage((currentPage) => currentPage + 1);
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>

            <aside className="self-start space-y-5">
              <article className="group/context relative overflow-hidden rounded-[2rem] border border-white/68 bg-[linear-gradient(145deg,rgba(255,255,255,0.76),rgba(242,234,246,0.82))] p-6 shadow-[0_24px_70px_rgba(31,27,29,0.08)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/86 hover:shadow-[0_30px_78px_rgba(31,27,29,0.11)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl transition duration-500 group-hover/context:scale-125 group-hover/context:bg-[rgba(183,167,200,0.34)]"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Event context
                      </p>

                      <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                        Invitation essentials.
                      </h2>

                      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        Keep the event details visible while managing guest access.
                      </p>
                    </div>

                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(31,27,29,0.08)] transition duration-300 group-hover/context:-translate-y-0.5 group-hover/context:scale-105">
                      <Send aria-hidden="true" className="size-5" />
                    </span>
                  </div>

                  <div className="mt-7 grid gap-3">
                    <div className="rounded-[1.4rem] border border-white/60 bg-white/34 p-5 backdrop-blur-xl transition duration-300 group-hover/context:bg-white/46">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                        Event date
                      </p>

                      <p className="mt-2 text-xl font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {formatEventDate(event.eventDate)}
                      </p>
                    </div>

                    <div className="rounded-[1.4rem] border border-white/60 bg-white/34 p-5 backdrop-blur-xl transition duration-300 group-hover/context:bg-white/46">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                        Location
                      </p>

                      <p className="mt-2 text-xl font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {event.location}
                      </p>
                    </div>

                    <div className="rounded-[1.4rem] border border-white/60 bg-white/34 p-5 backdrop-blur-xl transition duration-300 group-hover/context:bg-white/46">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                        Guest target
                      </p>

                      <p className="mt-2 text-xl font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {event.guestCount ?? 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="group/health relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_82px_rgba(93,58,85,0.32)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-white/10 blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-[rgba(175,201,216,0.10)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/48">
                        Invitation health
                      </p>

                      <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
                        Current page status.
                      </h2>

                      <p className="mt-3 leading-7 text-white/64">
                        See how the invitations currently shown are progressing.
                      </p>
                    </div>

                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] shadow-[0_12px_28px_rgba(31,27,29,0.12)] backdrop-blur transition duration-300 group-hover/health:-translate-y-0.5 group-hover/health:scale-105">
                      <MailCheck aria-hidden="true" className="size-5" />
                    </span>
                  </div>

                  <div className="mt-7 rounded-[1.45rem] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-xl">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.17em] text-white/44">
                          Response rate
                        </p>

                        <p className="mt-2 text-4xl font-black tracking-[-0.055em]">
                          {pageResponseRate}%
                        </p>
                      </div>

                      <p className="text-right text-xs font-bold leading-5 text-white/46">
                        {respondedInvitationsOnPage}
                        <br />
                        responses
                      </p>
                    </div>

                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/12">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-powder-blue),#fff4ea)] shadow-[0_0_18px_rgba(255,244,234,0.24)] transition-[width] duration-700"
                        style={{
                          width: `${Math.min(Math.max(pageResponseRate, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.11]">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-white/46">
                        Active
                      </p>

                      <p className="mt-2 text-xl font-black text-white/92">
                        {activeInvitationsOnPage}
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-white/10 bg-[rgba(142,151,115,0.18)] px-4 py-3.5 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(142,151,115,0.24)]">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-white/46">
                        Responded
                      </p>

                      <p className="mt-2 text-xl font-black text-white/92">
                        {respondedInvitationsOnPage}
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.11]">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-white/46">
                        Expired
                      </p>

                      <p className="mt-2 text-xl font-black text-white/92">
                        {expiredInvitationsOnPage}
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-white/10 bg-[rgba(142,92,103,0.18)] px-4 py-3.5 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(142,92,103,0.24)]">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-white/46">
                        Revoked
                      </p>

                      <p className="mt-2 text-xl font-black text-white/92">
                        {revokedInvitationsOnPage}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/12 pt-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
                        Current view
                      </p>

                      <p className="mt-1 text-sm font-black text-white/82">
                        {invitations.length} of {pagination.total} invitations shown
                      </p>
                    </div>

                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white/72">
                      <Link2 aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>
      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.62)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-invitation-title"
          onClick={() => {
            if (!createInvitationMutation.isPending) {
              closeCreateInvitationDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-2xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(240,231,246,0.86))] shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[14%] top-[-8rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.14)] blur-3xl"
              />

              <div className="relative max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.06)]">
                        <Send aria-hidden="true" className="size-6" />
                      </span>

                      <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        New invitation
                      </span>
                    </div>

                    <h2
                      id="create-invitation-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Create a secure guest invitation.
                    </h2>

                    <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      Choose a guest, decide how long their personal link should remain active and
                      share it securely.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="status-chip" data-tone="plum">
                        <MailCheck aria-hidden="true" className="size-3.5" />
                        Personal guest access
                      </span>

                      <span className="status-chip" data-tone="blue">
                        <Link2 aria-hidden="true" className="size-3.5" />
                        Secure link
                      </span>

                      <span className="status-chip" data-tone="gray">
                        <RefreshCcw aria-hidden="true" className="size-3.5" />
                        Regeneratable
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close invitation dialog"
                    disabled={createInvitationMutation.isPending}
                    onClick={closeCreateInvitationDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                {createdInvitation ? (
                  <div className="mt-7 grid gap-5">
                    <section className="relative overflow-hidden rounded-[1.65rem] border border-[rgba(142,151,115,0.28)] bg-[linear-gradient(145deg,rgba(238,244,224,0.76),rgba(255,255,255,0.48))] p-5 shadow-[0_16px_42px_rgba(61,69,47,0.07)] sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(142,151,115,0.18)] blur-3xl"
                      />

                      <div className="relative flex items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(142,151,115,0.24)] text-[#3d452f] shadow-[0_10px_24px_rgba(61,69,47,0.08)]">
                          <Check aria-hidden="true" className="size-6" />
                        </span>

                        <div>
                          <p className="text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                            Invitation created successfully
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                            The guest link is active and ready to be shared.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(220,235,242,0.38))] p-5 shadow-[0_16px_42px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                      />

                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                            <Link2 aria-hidden="true" className="size-5" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              Invitation link
                            </p>

                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                              Copy this secure link and send it only to the intended guest.
                            </p>
                          </div>
                        </div>

                        <p className="mt-5 break-all rounded-[1.35rem] border border-white/60 bg-white/42 px-4 py-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/72">
                          {createdInvitation.invitationUrl}
                        </p>

                        <button
                          type="button"
                          className="group/copy-created-link btn-primary mt-4 w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                          onClick={() => {
                            void copyInvitationUrl();
                          }}
                        >
                          {copiedInvitationUrl ? (
                            <Check aria-hidden="true" className="size-4" />
                          ) : (
                            <Copy
                              aria-hidden="true"
                              className="size-4 transition duration-300 group-hover/copy-created-link:scale-105"
                            />
                          )}

                          {copiedInvitationUrl ? 'Link copied' : 'Copy invitation link'}
                        </button>
                      </div>
                    </section>

                    <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                          <RefreshCcw aria-hidden="true" className="size-4" />
                        </span>

                        <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                          You can regenerate or revoke this invitation later from the invitation
                          list.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-bold"
                        onClick={closeCreateInvitationDialog}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-7 grid gap-5">
                    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/32 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                      />

                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                            <MailCheck aria-hidden="true" className="size-5" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              Guest selection
                            </p>

                            <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                              Choose the invitation recipient
                            </h3>

                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                              Select the guest who should receive this personal invitation.
                            </p>
                          </div>
                        </div>

                        <label className="mt-6 block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Guest
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <select
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
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
                            Guests with an email address will also receive the invitation
                            automatically.
                          </p>
                        </label>
                      </div>
                    </section>

                    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(220,235,242,0.38))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                      />

                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                            <Link2 aria-hidden="true" className="size-5" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              Invitation settings
                            </p>

                            <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                              Set the link expiry
                            </h3>

                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                              Decide how long the invitation should remain active.
                            </p>
                          </div>
                        </div>

                        <label className="mt-6 block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Link expiry
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <div className="mt-2 flex items-center gap-3">
                            <input
                              className="form-field min-h-12"
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

                            <span className="shrink-0 rounded-2xl border border-white/60 bg-white/38 px-5 py-3 text-sm font-black text-[var(--color-charcoal)]/62 backdrop-blur-xl">
                              days
                            </span>
                          </div>

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Invitation links can remain active for between 1 and 30 days.
                          </p>
                        </label>
                      </div>
                    </section>

                    {guestsQuery.isError ? (
                      <div
                        role="alert"
                        className="rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                            <CircleAlert aria-hidden="true" className="size-4" />
                          </span>

                          <div>
                            <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                              Guest options could not be loaded
                            </p>

                            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                              {getApiErrorMessage(guestsQuery.error)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {createInvitationMutation.isError ? (
                      <div
                        role="alert"
                        className="rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                            <CircleAlert aria-hidden="true" className="size-4" />
                          </span>

                          <div>
                            <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                              Invitation could not be created
                            </p>

                            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                              {createInvitationMutation.error instanceof Error &&
                              !axios.isAxiosError(createInvitationMutation.error)
                                ? createInvitationMutation.error.message
                                : getApiErrorMessage(createInvitationMutation.error)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                          <RefreshCcw aria-hidden="true" className="size-4" />
                        </span>

                        <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                          The invitation can be regenerated or revoked later if access needs to
                          change.
                        </p>
                      </div>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                          className="group/create-invitation-submit btn-primary min-w-44 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
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
                            <Send
                              aria-hidden="true"
                              className="size-4 transition duration-300 group-hover/create-invitation-submit:-translate-y-0.5 group-hover/create-invitation-submit:translate-x-0.5"
                            />
                          )}

                          {createInvitationMutation.isPending
                            ? 'Creating invitation...'
                            : 'Create invitation'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isRegenerateDialogOpen && invitationToRegenerate ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.62)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-invitation-title"
          onClick={() => {
            if (!regenerateInvitationMutation.isPending) {
              closeRegenerateInvitationDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-2xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(240,231,246,0.86))] shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[14%] top-[-8rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.14)] blur-3xl"
              />

              <div className="relative max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.06)]">
                        <RefreshCcw aria-hidden="true" className="size-6" />
                      </span>

                      <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        Regenerate invitation
                      </span>
                    </div>

                    <h2
                      id="regenerate-invitation-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Create a fresh invitation link.
                    </h2>

                    <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      Replace the existing access token for{' '}
                      <strong className="font-black text-[var(--color-near-black)]">
                        {invitationToRegenerate.guest.firstName}{' '}
                        {invitationToRegenerate.guest.lastName}
                      </strong>{' '}
                      and issue a new secure link.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="status-chip" data-tone="plum">
                        <RefreshCcw aria-hidden="true" className="size-3.5" />
                        Fresh token
                      </span>

                      <span className="status-chip" data-tone="blue">
                        <Link2 aria-hidden="true" className="size-3.5" />
                        New secure link
                      </span>

                      <span className="status-chip" data-tone="rose">
                        <Ban aria-hidden="true" className="size-3.5" />
                        Old link disabled
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close regenerate invitation dialog"
                    disabled={regenerateInvitationMutation.isPending}
                    onClick={closeRegenerateInvitationDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                {regeneratedInvitation ? (
                  <div className="mt-7 grid gap-5">
                    <section className="relative overflow-hidden rounded-[1.65rem] border border-[rgba(142,151,115,0.28)] bg-[linear-gradient(145deg,rgba(238,244,224,0.76),rgba(255,255,255,0.48))] p-5 shadow-[0_16px_42px_rgba(61,69,47,0.07)] sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(142,151,115,0.18)] blur-3xl"
                      />

                      <div className="relative flex items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(142,151,115,0.24)] text-[#3d452f] shadow-[0_10px_24px_rgba(61,69,47,0.08)]">
                          <Check aria-hidden="true" className="size-6" />
                        </span>

                        <div>
                          <p className="text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                            Invitation regenerated successfully
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                            A new secure link is ready for{' '}
                            <strong className="font-black text-[var(--color-near-black)]">
                              {invitationToRegenerate.guest.firstName}{' '}
                              {invitationToRegenerate.guest.lastName}
                            </strong>
                            .
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="relative overflow-hidden rounded-[1.65rem] border border-[rgba(124,74,90,0.20)] bg-[linear-gradient(145deg,rgba(249,235,240,0.72),rgba(255,255,255,0.38))] p-5 shadow-[0_14px_36px_rgba(124,74,90,0.06)] sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(210,146,160,0.18)] blur-3xl"
                      />

                      <div className="relative flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                          <CircleAlert aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            The previous invitation link is now invalid
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                            Only the newly generated link below should be shared with the guest.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(220,235,242,0.38))] p-5 shadow-[0_16px_42px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                      />

                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                            <Link2 aria-hidden="true" className="size-5" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              New invitation link
                            </p>

                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                              Copy the replacement link and send it only to the intended guest.
                            </p>
                          </div>
                        </div>

                        <p className="mt-5 break-all rounded-[1.35rem] border border-white/60 bg-white/42 px-4 py-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/72">
                          {regeneratedInvitation.invitationUrl}
                        </p>

                        <button
                          type="button"
                          className="group/copy-regenerated-link btn-primary mt-4 w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                          onClick={() => {
                            void copyRegeneratedInvitationUrl();
                          }}
                        >
                          {copiedRegeneratedUrl ? (
                            <Check aria-hidden="true" className="size-4" />
                          ) : (
                            <Copy
                              aria-hidden="true"
                              className="size-4 transition duration-300 group-hover/copy-regenerated-link:scale-105"
                            />
                          )}

                          {copiedRegeneratedUrl ? 'Link copied' : 'Copy new invitation link'}
                        </button>
                      </div>
                    </section>

                    <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                          <RefreshCcw aria-hidden="true" className="size-4" />
                        </span>

                        <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                          You can regenerate or revoke this invitation again later from the
                          invitation list.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-bold"
                        onClick={closeRegenerateInvitationDialog}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-7 grid gap-5">
                    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(220,235,242,0.38))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                      />

                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                            <Link2 aria-hidden="true" className="size-5" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              Replacement settings
                            </p>

                            <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                              Set the new link expiry
                            </h3>

                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                              Choose how long the replacement invitation should remain active.
                            </p>
                          </div>
                        </div>

                        <label className="mt-6 block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            New link expiry
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <div className="mt-2 flex items-center gap-3">
                            <input
                              className="form-field min-h-12"
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

                            <span className="shrink-0 rounded-2xl border border-white/60 bg-white/38 px-5 py-3 text-sm font-black text-[var(--color-charcoal)]/62 backdrop-blur-xl">
                              days
                            </span>
                          </div>

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            The replacement link may remain active for between 1 and 30 days.
                          </p>
                        </label>
                      </div>
                    </section>

                    <div className="relative overflow-hidden rounded-[1.35rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] p-4">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[rgba(210,146,160,0.14)] blur-3xl"
                      />

                      <div className="relative flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                          <Ban aria-hidden="true" className="size-4" />
                        </span>

                        <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                          Regenerating immediately invalidates the current invitation link. The
                          guest must use the new one afterward.
                        </p>
                      </div>
                    </div>

                    {regenerateInvitationMutation.isError ? (
                      <div
                        role="alert"
                        className="rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                            <CircleAlert aria-hidden="true" className="size-4" />
                          </span>

                          <div>
                            <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                              Invitation could not be regenerated
                            </p>

                            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                              {regenerateInvitationMutation.error instanceof Error &&
                              !axios.isAxiosError(regenerateInvitationMutation.error)
                                ? regenerateInvitationMutation.error.message
                                : getApiErrorMessage(regenerateInvitationMutation.error)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                          <RefreshCcw aria-hidden="true" className="size-4" />
                        </span>

                        <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                          The replacement link will become the only valid invitation for this guest.
                        </p>
                      </div>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                          className="group/regenerate-invitation-submit btn-primary min-w-48 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                          disabled={regenerateInvitationMutation.isPending}
                          onClick={() => {
                            regenerateInvitationMutation.mutate();
                          }}
                        >
                          {regenerateInvitationMutation.isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <RefreshCcw
                              aria-hidden="true"
                              className="size-4 transition duration-300 group-hover/regenerate-invitation-submit:rotate-180"
                            />
                          )}

                          {regenerateInvitationMutation.isPending
                            ? 'Regenerating...'
                            : 'Regenerate invitation'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isRevokeDialogOpen && invitationToRevoke ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.64)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-invitation-title"
          onClick={() => {
            if (!revokeInvitationMutation.isPending) {
              closeRevokeInvitationDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(249,235,240,0.87))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-5 border-b border-[rgba(93,58,85,0.10)] pb-7">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_14px_30px_rgba(124,74,90,0.08)]">
                        <Ban aria-hidden="true" className="size-7" />
                      </span>

                      <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                        Permanent access change
                      </span>
                    </div>

                    <h2
                      id="revoke-invitation-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Revoke this invitation?
                    </h2>

                    <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      This immediately disables the current invitation link and prevents the guest
                      from using it.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close revoke invitation dialog"
                    disabled={revokeInvitationMutation.isPending}
                    onClick={closeRevokeInvitationDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <section className="relative mt-7 overflow-hidden rounded-[1.6rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(240,231,246,0.38))] p-5 shadow-[0_16px_40px_rgba(31,27,29,0.05)] backdrop-blur-xl">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                  />

                  <div className="relative flex items-center gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/55 bg-[rgba(183,167,200,0.22)] text-sm font-black text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                      {invitationToRevoke.guest.firstName.charAt(0)}
                      {invitationToRevoke.guest.lastName.charAt(0)}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {invitationToRevoke.guest.firstName} {invitationToRevoke.guest.lastName}
                      </p>

                      <p className="mt-1 truncate text-sm font-semibold text-[var(--color-charcoal)]/58">
                        {invitationToRevoke.guest.email ?? 'No email address provided'}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="status-chip" data-tone="plum">
                          Party of {invitationToRevoke.guest.partySize}
                        </span>

                        <span className="status-chip" data-tone="gray">
                          {invitationToRevoke.guest.status.replaceAll('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="relative mt-5 overflow-hidden rounded-[1.6rem] border border-[rgba(124,74,90,0.20)] bg-[linear-gradient(145deg,rgba(249,235,240,0.78),rgba(255,255,255,0.40))] p-5 shadow-[0_14px_36px_rgba(124,74,90,0.07)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(210,146,160,0.18)] blur-3xl"
                  />

                  <div className="relative flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                      <CircleAlert aria-hidden="true" className="size-5" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Guest access will be removed immediately
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                        The current invitation link will stop working as soon as you confirm. You
                        can create or regenerate another invitation later.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="mt-5 rounded-[1.35rem] border border-dashed border-[rgba(124,74,90,0.20)] bg-white/26 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)]">
                      <Link2 aria-hidden="true" className="size-4" />
                    </span>

                    <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      Revoking affects only the current access link. The guest record and any
                      existing RSVP details remain unchanged.
                    </p>
                  </div>
                </div>

                {revokeInvitationMutation.isError ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                        <CircleAlert aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                          Invitation could not be revoked
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                          {getApiErrorMessage(revokeInvitationMutation.error)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <RefreshCcw aria-hidden="true" className="size-4" />
                    </span>

                    <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                      A new invitation can be generated later if the guest needs access again.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                      className="group/revoke-invitation-confirm flex min-w-44 items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={revokeInvitationMutation.isPending}
                      onClick={() => {
                        revokeInvitationMutation.mutate();
                      }}
                    >
                      {revokeInvitationMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Ban
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/revoke-invitation-confirm:rotate-[-5deg]"
                        />
                      )}

                      {revokeInvitationMutation.isPending ? 'Revoking...' : 'Revoke invitation'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
