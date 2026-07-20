import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MailCheck,
  Search,
  Sparkles,
  UserCheck,
  UserRoundPlus,
  UsersRound,
  UserX,
  Save,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  createGuest,
  deleteGuest,
  getGuestSummary,
  getGuests,
  guestStatuses,
  updateGuest,
  updateGuestRsvp,
  type Guest,
  type GuestSort,
  type GuestStatus,
} from '../features/guests/guest.api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const guestFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required.')
    .max(100, 'First name cannot exceed 100 characters.'),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required.')
    .max(100, 'Last name cannot exceed 100 characters.'),

  email: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || z.string().email().safeParse(value).success,
      'Enter a valid email address.',
    ),

  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.length >= 7,
      'Phone number must contain at least 7 characters.',
    )
    .refine((value) => value.length <= 30, 'Phone number cannot exceed 30 characters.'),

  groupName: z.string().trim().max(100, 'Group name cannot exceed 100 characters.'),

  status: z.enum(guestStatuses),

  partySize: z
    .string()
    .min(1, 'Party size is required.')
    .refine((value) => {
      const partySize = Number(value);

      return Number.isInteger(partySize) && partySize >= 1 && partySize <= 100;
    }, 'Party size must be a whole number between 1 and 100.'),

  mealPreference: z.string().trim().max(255, 'Meal preference cannot exceed 255 characters.'),

  dietaryRequirements: z
    .string()
    .trim()
    .max(1000, 'Dietary requirements cannot exceed 1000 characters.'),

  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters.'),
});

type GuestFormValues = z.infer<typeof guestFormSchema>;

const guestStatusLabels: Record<GuestStatus, string> = {
  NOT_INVITED: 'Not invited',
  INVITED: 'Invited',
  CONFIRMED: 'Confirmed',
  DECLINED: 'Declined',
  MAYBE: 'Maybe',
};

const getStatusTone = (status: GuestStatus) => {
  switch (status) {
    case 'CONFIRMED':
      return 'green';

    case 'DECLINED':
      return 'rose';

    case 'INVITED':
    case 'MAYBE':
      return 'plum';

    case 'NOT_INVITED':
    default:
      return 'neutral';
  }
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load this guest workspace. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this guest workspace. Please try again.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const formatGuestName = (guest: Guest) => `${guest.firstName} ${guest.lastName}`.trim();

export function GuestWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();

  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GuestStatus | ''>('');
  const [sort, setSort] = useState<GuestSort>('newest');
  const [page, setPage] = useState(1);
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const guestForm = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      groupName: '',
      status: 'NOT_INVITED',
      partySize: '1',
      mealPreference: '',
      dietaryRequirements: '',
      notes: '',
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
    enabled: Boolean(eventId),
    queryFn: () => getGuestSummary(eventId!),
  });

  const guestsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'guests',
      'list',
      {
        page,
        search: searchQuery,
        status: statusFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getGuests(eventId!, {
        page,
        limit: 20,
        sort,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      }),
  });

  const createGuestMutation = useMutation({
    mutationFn: async (values: GuestFormValues) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      return createGuest(eventId, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        groupName: values.groupName.trim() || null,
        status: values.status,
        partySize: Number(values.partySize),
        mealPreference: values.mealPreference.trim() || null,
        dietaryRequirements: values.dietaryRequirements.trim() || null,
        notes: values.notes.trim() || null,
      });
    },

    onSuccess: async () => {
      setIsGuestFormOpen(false);
      guestForm.reset();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'list'],
        }),
      ]);
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async (values: GuestFormValues) => {
      if (!eventId || !guestToEdit) {
        throw new Error('Guest details are missing.');
      }

      const input: {
        firstName?: string;
        lastName?: string;
        email?: string | null;
        phone?: string | null;
        groupName?: string | null;
        partySize?: number;
        mealPreference?: string | null;
        dietaryRequirements?: string | null;
        notes?: string | null;
      } = {};

      const nextFirstName = values.firstName.trim();
      const nextLastName = values.lastName.trim();
      const nextEmail = values.email.trim().toLowerCase() || null;
      const nextPhone = values.phone.trim() || null;
      const nextGroupName = values.groupName.trim() || null;
      const nextPartySize = Number(values.partySize);
      const nextMealPreference = values.mealPreference.trim() || null;
      const nextDietaryRequirements = values.dietaryRequirements.trim() || null;
      const nextNotes = values.notes.trim() || null;

      if (nextFirstName !== guestToEdit.firstName) {
        input.firstName = nextFirstName;
      }

      if (nextLastName !== guestToEdit.lastName) {
        input.lastName = nextLastName;
      }

      if (nextEmail !== guestToEdit.email) {
        input.email = nextEmail;
      }

      if (nextPhone !== guestToEdit.phone) {
        input.phone = nextPhone;
      }

      if (nextGroupName !== guestToEdit.groupName) {
        input.groupName = nextGroupName;
      }

      if (nextPartySize !== guestToEdit.partySize) {
        input.partySize = nextPartySize;
      }

      if (nextMealPreference !== guestToEdit.mealPreference) {
        input.mealPreference = nextMealPreference;
      }

      if (nextDietaryRequirements !== guestToEdit.dietaryRequirements) {
        input.dietaryRequirements = nextDietaryRequirements;
      }

      if (nextNotes !== guestToEdit.notes) {
        input.notes = nextNotes;
      }

      return updateGuest(eventId, guestToEdit.id, input);
    },

    onSuccess: async () => {
      setGuestToEdit(null);
      setIsGuestFormOpen(false);
      guestForm.reset();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'list'],
        }),
      ]);
    },
  });

  const updateGuestRsvpMutation = useMutation({
    mutationFn: async ({ guestId, status }: { guestId: string; status: GuestStatus }) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      return updateGuestRsvp(eventId, guestId, {
        status,
      });
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'list'],
        }),
      ]);
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !guestToDelete) {
        throw new Error('Guest details are missing.');
      }

      await deleteGuest(eventId, guestToDelete.id);
    },

    onSuccess: async () => {
      setGuestToDelete(null);
      setIsDeleteDialogOpen(false);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'list'],
        }),
      ]);
    },
  });
  const openEditGuestForm = (guest: Guest) => {
    createGuestMutation.reset();
    updateGuestMutation.reset();
    guestForm.clearErrors();

    guestForm.reset({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email ?? '',
      phone: guest.phone ?? '',
      groupName: guest.groupName ?? '',
      status: guest.status,
      partySize: String(guest.partySize),
      mealPreference: guest.mealPreference ?? '',
      dietaryRequirements: guest.dietaryRequirements ?? '',
      notes: guest.notes ?? '',
    });

    setGuestToEdit(guest);
    setIsGuestFormOpen(true);
  };

  const openDeleteGuestDialog = (guest: Guest) => {
    deleteGuestMutation.reset();
    setGuestToDelete(guest);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteGuestDialog = () => {
    if (deleteGuestMutation.isPending) {
      return;
    }

    deleteGuestMutation.reset();
    setGuestToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const openGuestForm = () => {
    createGuestMutation.reset();
    updateGuestMutation.reset();
    guestForm.clearErrors();

    guestForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      groupName: '',
      status: 'NOT_INVITED',
      partySize: '1',
      mealPreference: '',
      dietaryRequirements: '',
      notes: '',
    });

    setGuestToEdit(null);
    setIsGuestFormOpen(true);
  };

  const closeGuestForm = () => {
    if (createGuestMutation.isPending || updateGuestMutation.isPending) {
      return;
    }

    createGuestMutation.reset();
    updateGuestMutation.reset();
    guestForm.clearErrors();
    setGuestToEdit(null);
    setIsGuestFormOpen(false);
  };

  const submitGuest = guestForm.handleSubmit((values) => {
    guestForm.clearErrors('root');

    if (guestToEdit) {
      const nextFirstName = values.firstName.trim();
      const nextLastName = values.lastName.trim();
      const nextEmail = values.email.trim().toLowerCase() || null;
      const nextPhone = values.phone.trim() || null;
      const nextGroupName = values.groupName.trim() || null;
      const nextPartySize = Number(values.partySize);
      const nextMealPreference = values.mealPreference.trim() || null;
      const nextDietaryRequirements = values.dietaryRequirements.trim() || null;
      const nextNotes = values.notes.trim() || null;

      const hasChanges =
        nextFirstName !== guestToEdit.firstName ||
        nextLastName !== guestToEdit.lastName ||
        nextEmail !== guestToEdit.email ||
        nextPhone !== guestToEdit.phone ||
        nextGroupName !== guestToEdit.groupName ||
        nextPartySize !== guestToEdit.partySize ||
        nextMealPreference !== guestToEdit.mealPreference ||
        nextDietaryRequirements !== guestToEdit.dietaryRequirements ||
        nextNotes !== guestToEdit.notes;

      if (!hasChanges) {
        guestForm.setError('root', {
          type: 'manual',
          message: 'No guest details were changed.',
        });

        return;
      }

      updateGuestMutation.mutate(values);
      return;
    }

    createGuestMutation.mutate(values);
  });

  const submitGuestSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearGuestFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('');
    setSort('newest');
    setPage(1);
  };

  const isLoading = summaryQuery.isLoading || guestsQuery.isLoading;
  const isError = summaryQuery.isError || guestsQuery.isError;
  const firstError = summaryQuery.error ?? guestsQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading guest workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Gathering guest details, RSVP responses and attendance totals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !guestsQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Guest workspace unavailable
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
                    void Promise.all([summaryQuery.refetch(), guestsQuery.refetch()]);
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

  const guestSummary = summaryQuery.data;
  const guests = guestsQuery.data.guests;
  const pagination = guestsQuery.data.pagination;
  const isGuestMutationPending = createGuestMutation.isPending || updateGuestMutation.isPending;

  const summaryCards = [
    {
      label: 'Guest records',
      value: guestSummary.summary.totalGuests,
      helper: `${guestSummary.summary.totalExpectedAttendees} expected attendees`,
      icon: UsersRound,
      tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
    },
    {
      label: 'Confirmed',
      value: guestSummary.summary.confirmed,
      helper: `${guestSummary.summary.confirmedAttendees} attending`,
      icon: UserCheck,
      tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
    },
    {
      label: 'Awaiting response',
      value: guestSummary.summary.invited + guestSummary.summary.notInvited,
      helper: `${guestSummary.summary.invited} already invited`,
      icon: Clock3,
      tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
    },
    {
      label: 'Declined',
      value: guestSummary.summary.declined,
      helper: `${guestSummary.summary.maybe} marked maybe`,
      icon: UserX,
      tone: 'bg-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]',
    },
  ];

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
                Guest management
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {guestSummary.event.name}
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone="plum">
            {guestSummary.event.status.replaceAll('_', ' ')}
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
                  Guest planning
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Keep every guest, response and party detail organised.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Manage contact details, party sizes, groups, meal preferences, dietary needs and
                  RSVP responses from one workspace.
                </p>
              </div>

              <div className="glass-card p-5">
                <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Response rate</p>

                <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {guestSummary.summary.responseRate}%
                </p>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/40">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))]"
                    style={{
                      width: `${Math.min(Math.max(guestSummary.summary.responseRate, 0), 100)}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-sm font-semibold text-[var(--color-rosewood)]">
                  {guestSummary.summary.respondedGuests} of {guestSummary.summary.invitedGuests}{' '}
                  invited guests responded
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper, icon: Icon, tone }) => (
              <article key={label} className="luxe-card p-6">
                <div className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
                  <Icon className="size-5" />
                </div>

                <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">{label}</p>

                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {value}
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                  {helper}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Guest list
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Everyone invited to the celebration.
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="soft-chip w-fit">{pagination.total} guests</span>

                  <button
                    type="button"
                    className="btn-primary text-sm font-bold"
                    onClick={openGuestForm}
                  >
                    <UserRoundPlus className="size-4" />
                    Add guest
                  </button>
                </div>
              </div>

              <form
                className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitGuestSearch();
                }}
              >
                <div className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/24 px-4 backdrop-blur-xl">
                  <Search className="size-5 shrink-0 text-[var(--color-charcoal)]/42" />

                  <input
                    className="min-h-12 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--color-charcoal)]/42"
                    type="search"
                    placeholder="Search by name, email, phone or group"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                    }}
                  />
                </div>

                <select
                  className="form-field min-h-12 lg:w-44"
                  aria-label="Filter guests by RSVP status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as GuestStatus | '');
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>

                  {guestStatuses.map((status) => (
                    <option key={status} value={status}>
                      {guestStatusLabels[status]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12 lg:w-52"
                  aria-label="Sort guests"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as GuestSort);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                  <option value="party_size_highest">Largest party first</option>
                  <option value="party_size_lowest">Smallest party first</option>
                </select>

                <div className="flex flex-wrap gap-3 lg:col-span-3">
                  <button type="submit" className="btn-primary text-sm font-bold">
                    <Search className="size-4" />
                    Search
                  </button>

                  {searchQuery || statusFilter || sort !== 'newest' ? (
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={clearGuestFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </form>

              {guests.length > 0 ? (
                <div className="mt-8 grid gap-4">
                  {guests.map((guest) => (
                    <article
                      key={guest.id}
                      className="rounded-[1.5rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            {formatGuestName(guest)}
                          </p>

                          <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/58">
                            {guest.groupName ?? 'No guest group'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <select
                            className="min-h-9 rounded-full border border-white/55 bg-white/34 px-3 text-xs font-black text-[var(--color-deep-plum)] outline-none backdrop-blur-xl"
                            aria-label={`Update RSVP status for ${formatGuestName(guest)}`}
                            value={guest.status}
                            disabled={
                              updateGuestRsvpMutation.isPending &&
                              updateGuestRsvpMutation.variables?.guestId === guest.id
                            }
                            onChange={(event) => {
                              const status = event.target.value as GuestStatus;

                              if (status === guest.status) {
                                return;
                              }

                              updateGuestRsvpMutation.mutate({
                                guestId: guest.id,
                                status,
                              });
                            }}
                          >
                            {guestStatuses.map((status) => (
                              <option key={status} value={status}>
                                {guestStatusLabels[status]}
                              </option>
                            ))}
                          </select>

                          <span
                            className="status-chip w-fit"
                            data-tone={getStatusTone(guest.status)}
                          >
                            {guestStatusLabels[guest.status]}
                          </span>

                          <button
                            type="button"
                            className="grid size-9 place-items-center rounded-full border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.16)]"
                            aria-label={`Edit ${formatGuestName(guest)}`}
                            onClick={() => {
                              openEditGuestForm(guest);
                            }}
                          >
                            <Pencil className="size-4" />
                          </button>

                          <button
                            type="button"
                            className="grid size-9 place-items-center rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
                            aria-label={`Delete ${formatGuestName(guest)}`}
                            onClick={() => {
                              openDeleteGuestDialog(guest);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                      {updateGuestRsvpMutation.isError &&
                      updateGuestRsvpMutation.variables?.guestId === guest.id ? (
                        <div
                          role="alert"
                          className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                        >
                          {getApiErrorMessage(updateGuestRsvpMutation.error)}
                        </div>
                      ) : null}

                      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                        <p className="font-semibold text-[var(--color-charcoal)]/62">
                          Party size:{' '}
                          <span className="font-black text-[var(--color-near-black)]">
                            {guest.partySize}
                          </span>
                        </p>

                        <p className="font-semibold text-[var(--color-charcoal)]/62">
                          Meal:{' '}
                          <span className="font-black text-[var(--color-near-black)]">
                            {guest.mealPreference ?? 'Not specified'}
                          </span>
                        </p>

                        <p className="font-semibold text-[var(--color-charcoal)]/62">
                          Email:{' '}
                          <span className="font-black text-[var(--color-near-black)]">
                            {guest.email ?? 'Not provided'}
                          </span>
                        </p>

                        <p className="font-semibold text-[var(--color-charcoal)]/62">
                          Phone:{' '}
                          <span className="font-black text-[var(--color-near-black)]">
                            {guest.phone ?? 'Not provided'}
                          </span>
                        </p>
                      </div>

                      <>
                        {guest.dietaryRequirements ? (
                          <div className="mt-5 rounded-2xl bg-white/28 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              Dietary requirements
                            </p>

                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                              {guest.dietaryRequirements}
                            </p>
                          </div>
                        ) : null}

                        {guest.notes ? (
                          <div className="mt-4 rounded-2xl bg-white/28 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                              Notes
                            </p>

                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                              {guest.notes}
                            </p>
                          </div>
                        ) : null}
                      </>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <UsersRound className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {searchQuery || statusFilter
                      ? 'No guests match these filters'
                      : 'No guests added yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {searchQuery || statusFilter
                      ? 'Try changing the search term or RSVP status filter.'
                      : 'Add the first guest to begin tracking invitations, responses and attendance.'}
                  </p>
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} guests)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || guestsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || guestsQuery.isFetching}
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
                  Event target
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Planned attendance.
                </h2>

                <div className="mt-8 rounded-2xl bg-white/28 p-5 backdrop-blur-xl">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                    Planned guest count
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {guestSummary.event.plannedGuestCount ?? 'Not set'}
                  </p>
                </div>

                <div className="mt-3 rounded-2xl bg-white/28 p-5 backdrop-blur-xl">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                    Current expected attendance
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {guestSummary.summary.totalExpectedAttendees}
                  </p>
                </div>
              </article>

              <article className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <MailCheck className="size-6 text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">RSVP overview</h2>

                <p className="mt-3 leading-7 text-white/68">
                  Keep track of who has been invited and which guests still need a response
                  reminder.
                </p>

                <div className="mt-8 space-y-3">
                  {(
                    [
                      ['Not invited', guestSummary.summary.notInvited],
                      ['Invited', guestSummary.summary.invited],
                      ['Confirmed', guestSummary.summary.confirmed],
                      ['Maybe', guestSummary.summary.maybe],
                      ['Declined', guestSummary.summary.declined],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl bg-white/14 px-4 py-3 backdrop-blur"
                    >
                      <span className="text-sm font-bold text-white/72">{label}</span>

                      <span className="text-lg font-black">{value}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Event date
                </p>

                <p className="mt-3 text-xl font-black text-[var(--color-near-black)]">
                  {formatEventDate(guestSummary.event.eventDate)}
                </p>
              </article>
            </aside>
          </section>
        </main>
      </div>
      {isGuestFormOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-guest-title"
        >
          <div className="mx-auto max-w-3xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    {guestToEdit ? (
                      <Pencil className="size-4" />
                    ) : (
                      <UserRoundPlus className="size-4" />
                    )}

                    {guestToEdit ? 'Edit guest' : 'New guest'}
                  </div>

                  <h2
                    id="create-guest-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    {guestToEdit ? 'Update guest details.' : 'Add someone to the guest list.'}
                  </h2>

                  <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                    {guestToEdit
                      ? 'Change contact details, party information, meal preferences or notes.'
                      : 'Record their contact details, party size, RSVP status and meal requirements.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close guest form"
                  disabled={isGuestMutationPending}
                  onClick={closeGuestForm}
                >
                  <X className="size-5" />
                </button>
              </div>

              <form className="mt-8 grid gap-5" onSubmit={submitGuest}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      First name
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      disabled={isGuestMutationPending}
                      {...guestForm.register('firstName')}
                    />

                    {guestForm.formState.errors.firstName ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {guestForm.formState.errors.firstName.message}
                      </span>
                    ) : null}
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Last name
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      disabled={isGuestMutationPending}
                      {...guestForm.register('lastName')}
                    />

                    {guestForm.formState.errors.lastName ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {guestForm.formState.errors.lastName.message}
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Email
                    </span>

                    <input
                      className="form-field"
                      type="email"
                      disabled={isGuestMutationPending}
                      {...guestForm.register('email')}
                    />

                    {guestForm.formState.errors.email ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {guestForm.formState.errors.email.message}
                      </span>
                    ) : null}
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Phone
                    </span>

                    <input
                      className="form-field"
                      type="tel"
                      disabled={isGuestMutationPending}
                      {...guestForm.register('phone')}
                    />

                    {guestForm.formState.errors.phone ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {guestForm.formState.errors.phone.message}
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Guest group
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      placeholder="Family"
                      disabled={isGuestMutationPending}
                      {...guestForm.register('groupName')}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Party size
                    </span>

                    <input
                      className="form-field"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      disabled={isGuestMutationPending}
                      {...guestForm.register('partySize')}
                    />

                    {guestForm.formState.errors.partySize ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {guestForm.formState.errors.partySize.message}
                      </span>
                    ) : null}
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      RSVP status
                    </span>

                    <select
                      className="form-field"
                      disabled={isGuestMutationPending}
                      {...guestForm.register('status')}
                    >
                      {guestStatuses.map((status) => (
                        <option key={status} value={status}>
                          {guestStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Meal preference
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    placeholder="Vegetarian"
                    disabled={isGuestMutationPending}
                    {...guestForm.register('mealPreference')}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Dietary requirements
                  </span>

                  <textarea
                    className="form-field min-h-24 resize-y"
                    disabled={isGuestMutationPending}
                    {...guestForm.register('dietaryRequirements')}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Notes
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    disabled={isGuestMutationPending}
                    {...guestForm.register('notes')}
                  />
                </label>

                {guestForm.formState.errors.root?.message ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {guestForm.formState.errors.root.message}
                  </div>
                ) : null}

                {createGuestMutation.isError || updateGuestMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(
                      guestToEdit ? updateGuestMutation.error : createGuestMutation.error,
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={isGuestMutationPending}
                    onClick={closeGuestForm}
                  >
                    Keep guest
                  </button>

                  <button
                    type="submit"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={isGuestMutationPending}
                  >
                    {isGuestMutationPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {updateGuestMutation.isPending
                      ? 'Saving guest...'
                      : createGuestMutation.isPending
                        ? 'Adding guest...'
                        : guestToEdit
                          ? 'Save changes'
                          : 'Add guest'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteDialogOpen && guestToDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-guest-title"
          onClick={() => {
            if (!deleteGuestMutation.isPending) {
              closeDeleteGuestDialog();
            }
          }}
        >
          <div
            className="glass-card w-full max-w-md p-8"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-guest-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Delete {formatGuestName(guestToDelete)}?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/66">
              This permanently removes the guest from your event. This action cannot be undone.
            </p>

            {deleteGuestMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteGuestMutation.error)}
              </div>
            ) : null}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary text-sm font-bold"
                disabled={deleteGuestMutation.isPending}
                onClick={closeDeleteGuestDialog}
              >
                Keep guest
              </button>

              <button
                type="button"
                className="btn-primary bg-[var(--color-muted-burgundy)] text-sm font-bold"
                disabled={deleteGuestMutation.isPending}
                onClick={() => {
                  deleteGuestMutation.mutate();
                }}
              >
                {deleteGuestMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteGuestMutation.isPending ? 'Deleting...' : 'Delete guest'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
