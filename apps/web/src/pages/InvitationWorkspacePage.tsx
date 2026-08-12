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
  LockKeyhole,
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
import { useEffect, useState } from 'react';
import { getGuests, type Guest } from '../features/guests/guest.api';
import { PageBackButton } from '../components/navigation/PageBackButton';
import { InvitationHero } from '../features/events/InvitationHero';
import {
  getCustomerEventById,
  updateCustomerEvent,
  type CustomerEvent,
  type EventInvitationTemplate,
} from '../features/events/event.api';
import {
  getDefaultInvitationCustomization,
  getDefaultInvitationTemplate,
  getInvitationTemplate,
  getInvitationTemplatesForEventType,
  invitationFontOptions,
  type InvitationFontOption,
} from '../features/events/invitationTemplates';
import {
  canManageInvitationWorkflow,
  getInvitationWorkflowLockedMessage,
} from '../features/events/eventLifecycle';

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

const getEventStatusTone = (status: CustomerEvent['status']) => {
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

  const [selectedInvitationTemplate, setSelectedInvitationTemplate] =
    useState<EventInvitationTemplate | null>(null);

  const [selectedInvitationArtwork, setSelectedInvitationArtwork] = useState<1 | 2>(1);

  const [selectedInvitationFont, setSelectedInvitationFont] =
    useState<InvitationFontOption>('modern');

  const eventQuery = useQuery({
    queryKey: ['customer', 'events', eventId],
    enabled: Boolean(eventId),
    queryFn: () => getCustomerEventById(eventId!),
  });

  const invitationEventStatus = eventQuery.data?.status;
  const invitationEventDate = eventQuery.data?.eventDate;

  const isInvitationWorkflowEditable =
    invitationEventStatus !== undefined && invitationEventDate !== undefined
      ? canManageInvitationWorkflow(invitationEventStatus, invitationEventDate)
      : false;

  const invitationWorkflowLockedMessage =
    invitationEventStatus !== undefined &&
    invitationEventDate !== undefined &&
    !isInvitationWorkflowEditable
      ? getInvitationWorkflowLockedMessage(invitationEventStatus, invitationEventDate)
      : null;

  useEffect(() => {
    const event = eventQuery.data;

    if (!event) {
      return;
    }

    const defaultTemplate = getDefaultInvitationTemplate(event.eventType);

    const templateId = event.invitationTemplate ?? defaultTemplate?.id ?? null;
    const template = getInvitationTemplate(templateId);

    setSelectedInvitationTemplate(templateId);

    if (!template) {
      return;
    }

    const defaults = getDefaultInvitationCustomization(template);

    setSelectedInvitationArtwork(event.invitationArtwork === 2 ? 2 : defaults.artwork);

    setSelectedInvitationFont(
      invitationFontOptions.some((option) => option.id === event.invitationFont)
        ? (event.invitationFont as InvitationFontOption)
        : defaults.font,
    );
  }, [
    eventQuery.data?.eventType,
    eventQuery.data?.id,
    eventQuery.data?.invitationTemplate,
    eventQuery.data?.invitationArtwork,
    eventQuery.data?.invitationFont,
  ]);

  const updateInvitationDesignMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !selectedInvitationTemplate) {
        throw new Error('Invitation design details are missing.');
      }

      return updateCustomerEvent(eventId, {
        invitationTemplate: selectedInvitationTemplate,
        invitationArtwork: selectedInvitationArtwork,
        invitationFont: selectedInvitationFont,

        // These controls are no longer part of the product design.
        invitationGradient: null,
        invitationAccentColor: null,
        invitationArtworkPosition: null,
      });
    },

    onSuccess: async (updatedEvent) => {
      const defaultTemplate = getDefaultInvitationTemplate(updatedEvent.eventType);

      const templateId = updatedEvent.invitationTemplate ?? defaultTemplate?.id ?? null;

      const template = getInvitationTemplate(templateId);

      setSelectedInvitationTemplate(templateId);

      if (template) {
        const defaults = getDefaultInvitationCustomization(template);

        setSelectedInvitationArtwork(updatedEvent.invitationArtwork === 2 ? 2 : defaults.artwork);

        setSelectedInvitationFont(
          invitationFontOptions.some((option) => option.id === updatedEvent.invitationFont)
            ? (updatedEvent.invitationFont as InvitationFontOption)
            : defaults.font,
        );
      }

      queryClient.setQueryData(['customer', 'events', eventId], updatedEvent);

      await queryClient.invalidateQueries({
        queryKey: ['customer', 'events'],
      });
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

        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId],
        }),

        queryClient.invalidateQueries({
          queryKey: ['customer', 'events'],
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
    if (!isInvitationWorkflowEditable) {
      return;
    }

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
    if (!isInvitationWorkflowEditable) {
      return;
    }

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
    if (!isInvitationWorkflowEditable) {
      return;
    }

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
  const isInvitationDesignConfirmed = event.invitationDesignConfirmedAt !== null;

  const isInvitationDesignLocked = isInvitationDesignConfirmed || !isInvitationWorkflowEditable;

  const invitationTemplates = getInvitationTemplatesForEventType(event.eventType);
  const defaultInvitationTemplate = getDefaultInvitationTemplate(event.eventType);

  const savedInvitationTemplate = event.invitationTemplate ?? defaultInvitationTemplate?.id ?? null;

  const previewInvitationTemplate = selectedInvitationTemplate ?? savedInvitationTemplate;

  const previewTemplateDefinition = getInvitationTemplate(previewInvitationTemplate);

  const savedTemplateDefinition = getInvitationTemplate(savedInvitationTemplate);

  const savedDefaults = savedTemplateDefinition
    ? getDefaultInvitationCustomization(savedTemplateDefinition)
    : null;

  const savedInvitationArtwork = event.invitationArtwork === 2 ? 2 : (savedDefaults?.artwork ?? 1);

  const savedInvitationFont = invitationFontOptions.some(
    (option) => option.id === event.invitationFont,
  )
    ? (event.invitationFont as InvitationFontOption)
    : (savedDefaults?.font ?? 'modern');

  const hasInvitationDesignChanges =
    Boolean(previewInvitationTemplate) &&
    (previewInvitationTemplate !== savedInvitationTemplate ||
      selectedInvitationArtwork !== savedInvitationArtwork ||
      selectedInvitationFont !== savedInvitationFont);

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
          {invitationWorkflowLockedMessage ? (
            <div className="mb-6 flex items-start gap-4 rounded-[1.5rem] border border-[rgba(93,58,85,0.14)] bg-[rgba(255,255,255,0.58)] px-5 py-4 shadow-[0_14px_36px_rgba(31,27,29,0.05)] backdrop-blur-xl">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                <LockKeyhole aria-hidden="true" className="size-5" />
              </span>

              <div>
                <p className="text-sm font-black text-[var(--color-near-black)]">
                  Invitation activity is closed
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  {invitationWorkflowLockedMessage}
                </p>
              </div>
            </div>
          ) : null}
          <section className="relative isolate min-h-[22rem] overflow-hidden rounded-[2.5rem] border border-white/68 bg-[#fffaf6] px-6 py-5 shadow-[0_26px_78px_rgba(31,27,29,0.11)] sm:px-7 sm:py-6 lg:px-8 lg:py-6">
            <img
              src="/images/workspaces/shortcuts/invitations.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-30 size-full scale-[1.01] object-cover object-[76%_center] opacity-100 saturate-[0.94] contrast-[0.99] transition duration-1000"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,250,246,0.995)_0%,rgba(255,250,246,0.985)_20%,rgba(255,250,246,0.93)_34%,rgba(255,250,246,0.72)_47%,rgba(255,250,246,0.40)_58%,rgba(255,250,246,0.14)_69%,rgba(255,250,246,0.025)_79%,transparent_88%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 -z-20 w-[58%] bg-[linear-gradient(90deg,rgba(255,250,246,0.42),rgba(255,250,246,0.10),transparent)] backdrop-blur-[2.5px]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_48%,rgba(255,250,246,0.09)_100%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-28 -z-10 size-[30rem] rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
            />

            <div className="relative flex min-h-[17rem] flex-col justify-between gap-3">
              <div className="max-w-[35rem]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/44 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Invitation planning
                </div>

                <div className="mt-2.5 max-w-[32rem] rounded-[1.3rem] border border-white/44 bg-white/[0.15] px-5 py-3 shadow-[0_14px_36px_rgba(31,27,29,0.055)] backdrop-blur-[3px]">
                  <h2 className="max-w-[30rem] text-balance text-[2rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.2rem] lg:text-[2.35rem]">
                    Send, manage and track every invitation.
                  </h2>

                  <p className="mt-2.5 max-w-[30rem] text-sm font-semibold leading-[1.4rem] text-[var(--color-charcoal)]/70">
                    Create secure guest links, replace expired access, revoke compromised
                    invitations and monitor responses from one organised workspace.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="group/hero-create-invitation btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(93,58,85,0.24)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      disabled={!isInvitationWorkflowEditable}
                      onClick={openCreateInvitationDialog}
                    >
                      <Plus
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/hero-create-invitation:rotate-90"
                      />
                      Create invitation
                    </button>

                    <span className="rounded-full border border-white/72 bg-white/46 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                      <Send aria-hidden="true" className="mr-1.5 inline size-3.5" />
                      {formatEventDate(event.eventDate)}
                    </span>
                  </div>

                  <div className="mt-3 max-w-[26rem] rounded-[1.1rem] border border-white/56 bg-white/34 px-4 py-2.5 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/48">
                          Response rate
                        </p>

                        <p className="mt-1 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/54">
                          {respondedInvitationsOnPage} of {invitations.length} invitations shown
                          have responses
                        </p>
                      </div>

                      <p className="text-sm font-black text-[var(--color-deep-plum)]">
                        {pageResponseRate}%
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.09)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),#d7b7c3)] transition-[width] duration-700"
                        style={{
                          width: `${Math.min(Math.max(pageResponseRate, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid max-w-[49rem] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="group/invitation-metric rounded-[1.3rem] border border-white/68 bg-white/40 px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/56 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition duration-300 group-hover/invitation-metric:scale-105">
                    <MailCheck aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Total invitations
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {pagination.total}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {invitations.length} shown on this page
                  </p>
                </article>

                <article className="group/invitation-metric rounded-[1.3rem] border border-white/68 bg-[rgba(240,247,250,0.48)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954] transition duration-300 group-hover/invitation-metric:scale-105">
                    <Link2 aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Active
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {activeInvitationsOnPage}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Ready for guest access
                  </p>
                </article>

                <article className="group/invitation-metric rounded-[1.3rem] border border-white/68 bg-[rgba(244,246,236,0.50)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#596449] transition duration-300 group-hover/invitation-metric:scale-105">
                    <Check aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Responded
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {respondedInvitationsOnPage}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Replies on this page
                  </p>
                </article>

                <article className="group/invitation-metric rounded-[1.3rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(249,235,240,0.52)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)] transition duration-300 group-hover/invitation-metric:scale-105">
                      <Ban aria-hidden="true" className="size-4" />
                    </span>

                    <span className="rounded-full border border-[rgba(124,74,90,0.14)] bg-white/38 px-2 py-1 text-[0.52rem] font-black uppercase tracking-[0.12em] text-[var(--color-muted-burgundy)]">
                      Access status
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 divide-x divide-[rgba(124,74,90,0.12)]">
                    <div className="pr-3">
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                        Expired
                      </p>

                      <p className="mt-1 text-[1.45rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {expiredInvitationsOnPage}
                      </p>
                    </div>

                    <div className="pl-3">
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                        Revoked
                      </p>

                      <p className="mt-1 text-[1.45rem] font-black tracking-[-0.05em] text-[var(--color-muted-burgundy)]">
                        {revokedInvitationsOnPage}
                      </p>
                    </div>
                  </div>

                  <p className="mt-1.5 text-[0.66rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Links that no longer allow guest access
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="mt-7">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Guest-facing design
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Choose how your invitation should feel.
                </h2>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                  Preview one of the three curated designs created for this event type. Selecting a
                  design changes the preview only — nothing is saved until you apply it.
                </p>
              </div>

              <span
                className="status-chip w-fit"
                data-tone={
                  isInvitationDesignLocked ? 'gray' : hasInvitationDesignChanges ? 'plum' : 'green'
                }
              >
                {isInvitationDesignConfirmed || !isInvitationWorkflowEditable ? (
                  <LockKeyhole aria-hidden="true" className="size-3.5" />
                ) : (
                  <Sparkles aria-hidden="true" className="size-3.5" />
                )}

                {isInvitationDesignConfirmed
                  ? 'Design locked'
                  : !isInvitationWorkflowEditable
                    ? 'Design read-only'
                    : hasInvitationDesignChanges
                      ? 'Unsaved preview'
                      : 'Design saved'}
              </span>
            </div>

            <InvitationHero
              eventName={event.name}
              eventType={event.eventType}
              invitationTemplate={previewInvitationTemplate}
              invitationArtwork={selectedInvitationArtwork}
              invitationFont={selectedInvitationFont}
              mode="preview"
            />

            <div className="mt-6 rounded-[2rem] border border-white/62 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(242,234,246,0.42))] p-5 shadow-[0_20px_55px_rgba(31,27,29,0.06)] backdrop-blur-2xl sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Available designs
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Three curated looks for {event.eventType}.
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/54">
                    Each design contains two coordinated artworks while keeping one stable template
                    ID behind the scenes.
                  </p>
                </div>

                <span className="rounded-full border border-white/66 bg-white/42 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)] shadow-[0_8px_22px_rgba(31,27,29,0.05)] backdrop-blur-xl">
                  {invitationTemplates.length} designs
                </span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {invitationTemplates.map((template) => {
                  const isSelected = previewInvitationTemplate === template.id;
                  const isSaved = savedInvitationTemplate === template.id;
                  const primaryArtwork = template.backgrounds[0];
                  const companionArtwork = template.backgrounds[1];

                  return (
                    <button
                      key={template.id}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={isInvitationDesignLocked}
                      className={`group/template relative overflow-hidden rounded-[1.7rem] border text-left shadow-[0_16px_40px_rgba(31,27,29,0.06)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30 disabled:cursor-not-allowed ${
                        isInvitationDesignLocked
                          ? isSelected
                            ? 'border-[rgba(93,58,85,0.30)] bg-white/66 ring-2 ring-[rgba(93,58,85,0.08)]'
                            : 'border-white/52 bg-white/30 opacity-55'
                          : isSelected
                            ? 'border-[rgba(93,58,85,0.42)] bg-white/72 shadow-[0_22px_54px_rgba(93,58,85,0.14)] ring-2 ring-[rgba(93,58,85,0.12)]'
                            : 'border-white/62 bg-white/38 hover:-translate-y-1 hover:border-white/88 hover:bg-white/58 hover:shadow-[0_24px_58px_rgba(31,27,29,0.11)]'
                      }`}
                      onClick={() => {
                        updateInvitationDesignMutation.reset();

                        const defaults = getDefaultInvitationCustomization(template);

                        setSelectedInvitationTemplate(template.id);
                        setSelectedInvitationArtwork(defaults.artwork);
                        setSelectedInvitationFont(defaults.font);
                      }}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          src={primaryArtwork.imagePath}
                          alt={primaryArtwork.alt}
                          className="size-full object-cover transition duration-700 group-hover/template:scale-[1.035]"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(20,18,21,0.68)_100%)]"
                        />

                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black tracking-[-0.03em] text-white">
                              {template.name}
                            </p>

                            <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.12em] text-white/72">
                              {template.previewLabel}
                            </p>
                          </div>

                          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-white/42 bg-white/16 shadow-[0_8px_22px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                            <img
                              src={companionArtwork.imagePath}
                              alt=""
                              aria-hidden="true"
                              className="size-full object-cover"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                            {template.description}
                          </p>

                          <span
                            className={`grid size-8 shrink-0 place-items-center rounded-full border transition duration-300 ${
                              isSelected
                                ? 'border-[rgba(93,58,85,0.24)] bg-[var(--color-deep-plum)] text-white'
                                : 'border-white/66 bg-white/40 text-transparent'
                            }`}
                          >
                            <Check aria-hidden="true" className="size-4" />
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {isSelected ? (
                            <span className="status-chip" data-tone="plum">
                              Selected
                            </span>
                          ) : null}

                          {isSaved ? (
                            <span className="status-chip" data-tone="green">
                              Saved design
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {previewTemplateDefinition ? (
                <div className="mt-6 border-t border-[rgba(93,58,85,0.09)] pt-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Customise design
                    </p>

                    <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      Choose the artwork and typography.
                    </h3>

                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/54">
                      Keep the curated invitation structure while choosing the main artwork and font
                      that best suit this event.
                    </p>

                    {isInvitationDesignConfirmed ? (
                      <div className="mt-5 flex items-start gap-3 rounded-[1.35rem] border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.06)] p-4">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                          <LockKeyhole aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            Invitation design locked
                          </p>

                          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/56">
                            The first guest invitation has already been created. This saved
                            template, artwork and font now apply to every invitation for this event.
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {!isInvitationDesignConfirmed && invitationWorkflowLockedMessage ? (
                      <div className="mt-5 flex items-start gap-3 rounded-[1.35rem] border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.06)] p-4">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                          <LockKeyhole aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            Invitation design is read-only
                          </p>

                          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/56">
                            {invitationWorkflowLockedMessage}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <section className="rounded-[1.6rem] border border-white/60 bg-white/34 p-5">
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Main artwork
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                        Choose which of the two curated images leads the invitation.
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {previewTemplateDefinition.backgrounds.map((artwork, index) => {
                          const artworkNumber = (index + 1) as 1 | 2;
                          const isSelected = selectedInvitationArtwork === artworkNumber;

                          return (
                            <button
                              key={artwork.id}
                              type="button"
                              disabled={isInvitationDesignLocked}
                              className={`overflow-hidden rounded-[1.25rem] border text-left transition disabled:cursor-not-allowed ${
                                isSelected
                                  ? 'border-[rgba(93,58,85,0.42)] bg-white/72 ring-2 ring-[rgba(93,58,85,0.12)]'
                                  : isInvitationDesignLocked
                                    ? 'border-white/52 bg-white/30 opacity-55'
                                    : 'border-white/62 bg-white/38 hover:bg-white/58'
                              }`}
                              onClick={() => {
                                updateInvitationDesignMutation.reset();
                                setSelectedInvitationArtwork(artworkNumber);
                              }}
                            >
                              <img
                                src={artwork.imagePath}
                                alt={artwork.alt}
                                className="aspect-[16/10] w-full object-cover"
                              />

                              <div className="flex items-center justify-between gap-3 p-3">
                                <span className="text-sm font-black text-[var(--color-near-black)]">
                                  Artwork {artworkNumber}
                                </span>

                                {isSelected ? (
                                  <Check className="size-4 text-[var(--color-deep-plum)]" />
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-[1.6rem] border border-white/60 bg-white/34 p-5">
                      <p className="text-sm font-black text-[var(--color-near-black)]">Font</p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                        Choose the typeface used for the main invitation heading.
                      </p>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {invitationFontOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            disabled={isInvitationDesignLocked}
                            className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed ${
                              selectedInvitationFont === option.id
                                ? 'border-[rgba(93,58,85,0.36)] bg-[rgba(183,167,200,0.16)]'
                                : isInvitationDesignLocked
                                  ? 'border-white/52 bg-white/26 opacity-55'
                                  : 'border-white/58 bg-white/30 hover:bg-white/52'
                            }`}
                            onClick={() => {
                              updateInvitationDesignMutation.reset();
                              setSelectedInvitationFont(option.id);
                            }}
                          >
                            <p className="text-base font-black text-[var(--color-near-black)]">
                              {option.label}
                            </p>

                            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                              {option.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}

              {updateInvitationDesignMutation.isError ? (
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
                        Invitation design could not be saved
                      </p>

                      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                        {updateInvitationDesignMutation.error instanceof Error &&
                        !axios.isAxiosError(updateInvitationDesignMutation.error)
                          ? updateInvitationDesignMutation.error.message
                          : getApiErrorMessage(updateInvitationDesignMutation.error)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {updateInvitationDesignMutation.isSuccess && !hasInvitationDesignChanges ? (
                <div className="mt-5 rounded-[1.35rem] border border-[rgba(142,151,115,0.24)] bg-[rgba(238,244,224,0.62)] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#596449]">
                      <Check aria-hidden="true" className="size-4" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Invitation design saved
                      </p>

                      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        New and existing guest invitation links for this event will use this event
                        design.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-4 border-t border-[rgba(93,58,85,0.09)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-[var(--color-near-black)]">
                    {isInvitationDesignConfirmed
                      ? 'This invitation design is permanently locked for this event.'
                      : !isInvitationWorkflowEditable
                        ? 'This invitation design is now read-only.'
                        : hasInvitationDesignChanges
                          ? 'Your preview has unsaved changes.'
                          : 'This is the currently saved event design.'}
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                    {isInvitationDesignConfirmed
                      ? 'Every current and future guest invitation for this event uses this saved design.'
                      : !isInvitationWorkflowEditable
                        ? invitationWorkflowLockedMessage
                        : 'Design changes are stored at event level and apply to its guest invitations.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-primary min-w-40 justify-center text-sm font-bold"
                  disabled={
                    isInvitationDesignLocked ||
                    !hasInvitationDesignChanges ||
                    !previewInvitationTemplate ||
                    updateInvitationDesignMutation.isPending
                  }
                  onClick={() => {
                    updateInvitationDesignMutation.mutate();
                  }}
                >
                  {isInvitationDesignConfirmed || !isInvitationWorkflowEditable ? (
                    <LockKeyhole aria-hidden="true" className="size-4" />
                  ) : updateInvitationDesignMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Sparkles aria-hidden="true" className="size-4" />
                  )}

                  {isInvitationDesignConfirmed
                    ? 'Design locked'
                    : !isInvitationWorkflowEditable
                      ? 'Design read-only'
                      : updateInvitationDesignMutation.isPending
                        ? 'Applying design...'
                        : 'Apply design'}
                </button>
              </div>
            </div>
          </section>

          <section className="mt-7 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
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
                  className="btn-primary shrink-0 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!isInvitationWorkflowEditable}
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
                      className="group/invitation relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.38),rgba(255,255,255,0.20))] p-4 shadow-[0_18px_45px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/90 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.80),rgba(233,224,241,0.58))] hover:shadow-[0_28px_68px_rgba(31,27,29,0.11)] sm:p-5"
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
                              className="grid size-10 place-items-center rounded-2xl border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.04)] transition duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-[rgba(93,58,85,0.30)] hover:bg-[rgba(93,58,85,0.16)] hover:shadow-[0_14px_30px_rgba(93,58,85,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-none"
                              aria-label={`Regenerate invitation for ${invitation.guest.firstName} ${invitation.guest.lastName}`}
                              disabled={!isInvitationWorkflowEditable}
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
                              disabled={invitation.isRevoked || !isInvitationWorkflowEditable}
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

                        <div className="mt-5 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
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
                        className="group/first-invitation btn-primary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                        disabled={!isInvitationWorkflowEditable}
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
            </aside>
          </section>
        </main>
      </div>
      {isCreateDialogOpen && isInvitationWorkflowEditable ? (
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

      {isRegenerateDialogOpen && invitationToRegenerate && isInvitationWorkflowEditable ? (
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

      {isRevokeDialogOpen && invitationToRevoke && isInvitationWorkflowEditable ? (
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
