import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  Send,
  Sparkles,
  UtensilsCrossed,
  UsersRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  getPublicInvitation,
  publicRsvpStatuses,
  submitPublicRsvp,
  type PublicInvitation,
  type PublicRsvpStatus,
} from '../features/invitations/invitation.api';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const publicRsvpSchema = z.object({
  status: z.enum(publicRsvpStatuses),
  partySize: z
    .string()
    .min(1, 'Party size is required.')
    .refine((value) => {
      const partySize = Number(value);

      return Number.isInteger(partySize) && partySize >= 1 && partySize <= 100;
    }, 'Party size must be a whole number between 1 and 100.'),
  mealPreference: z.string().trim().max(100, 'Meal preference cannot exceed 100 characters.'),
  dietaryRequirements: z
    .string()
    .trim()
    .max(500, 'Dietary requirements cannot exceed 500 characters.'),
});

type PublicRsvpFormValues = z.infer<typeof publicRsvpSchema>;

const rsvpLabels: Record<PublicRsvpStatus, string> = {
  CONFIRMED: 'Yes, I’ll be there',
  DECLINED: 'Sorry, I can’t attend',
  MAYBE: 'I might attend',
};

const rsvpDescriptions: Record<PublicRsvpStatus, string> = {
  CONFIRMED: 'Count me in',
  DECLINED: 'Unable to attend',
  MAYBE: 'Still deciding',
};

const rsvpToneClasses: Record<PublicRsvpStatus, string> = {
  CONFIRMED:
    'border-[rgba(89,133,113,0.34)] bg-[linear-gradient(145deg,rgba(89,133,113,0.16),rgba(255,255,255,0.38))] shadow-[0_16px_34px_rgba(63,115,93,0.08)]',
  DECLINED:
    'border-[rgba(130,72,77,0.32)] bg-[linear-gradient(145deg,rgba(130,72,77,0.14),rgba(255,255,255,0.36))] shadow-[0_16px_34px_rgba(130,72,77,0.07)]',
  MAYBE:
    'border-[rgba(93,58,85,0.32)] bg-[linear-gradient(145deg,rgba(93,58,85,0.14),rgba(255,255,255,0.36))] shadow-[0_16px_34px_rgba(93,58,85,0.08)]',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong. Please try again.'
  );
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));

const getInitialFormValues = (invitation: PublicInvitation): PublicRsvpFormValues => {
  const initialStatus: PublicRsvpStatus =
    invitation.guest.status === 'CONFIRMED' ||
    invitation.guest.status === 'DECLINED' ||
    invitation.guest.status === 'MAYBE'
      ? invitation.guest.status
      : 'CONFIRMED';

  return {
    status: initialStatus,
    partySize: String(invitation.guest.partySize),
    mealPreference: invitation.guest.mealPreference ?? '',
    dietaryRequirements: invitation.guest.dietaryRequirements ?? '',
  };
};

const hasRsvpChanges = (invitation: PublicInvitation, values: PublicRsvpFormValues) => {
  const nextMealPreference = values.mealPreference.trim() || null;
  const nextDietaryRequirements = values.dietaryRequirements.trim() || null;

  return (
    values.status !== invitation.guest.status ||
    Number(values.partySize) !== invitation.guest.partySize ||
    nextMealPreference !== invitation.guest.mealPreference ||
    nextDietaryRequirements !== invitation.guest.dietaryRequirements
  );
};

export function PublicInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();

  const invitationQuery = useQuery({
    queryKey: ['public', 'invitation', token],
    enabled: Boolean(token),
    queryFn: () => getPublicInvitation(token!),
  });

  const form = useForm<PublicRsvpFormValues>({
    resolver: zodResolver(publicRsvpSchema),
    defaultValues: {
      status: 'CONFIRMED',
      partySize: '1',
      mealPreference: '',
      dietaryRequirements: '',
    },
    values: invitationQuery.data ? getInitialFormValues(invitationQuery.data) : undefined,
  });

  const submitRsvpMutation = useMutation({
    mutationFn: async (values: PublicRsvpFormValues) => {
      if (!token) {
        throw new Error('Invitation token is missing.');
      }

      return submitPublicRsvp(token, {
        status: values.status,
        partySize: Number(values.partySize),
        mealPreference: values.mealPreference.trim() || null,
        dietaryRequirements: values.dietaryRequirements.trim() || null,
      });
    },
    onSuccess: (updatedInvitation) => {
      queryClient.setQueryData(['public', 'invitation', token], updatedInvitation);
      form.reset(getInitialFormValues(updatedInvitation));
    },
  });

  const selectedStatus = form.watch('status');

  const clearSubmissionState = () => {
    submitRsvpMutation.reset();
    form.clearErrors('root');
  };

  if (invitationQuery.isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card relative grid min-h-80 w-full max-w-3xl overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl" />

          <div className="relative m-auto">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.4rem] border border-white/55 bg-white/30 shadow-[0_18px_45px_rgba(31,27,29,0.06)] backdrop-blur-xl">
              <LoaderCircle className="size-8 animate-spin text-[var(--color-deep-plum)]" />
            </div>

            <p className="mt-6 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              Opening your invitation
            </p>

            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
              Loading the celebration details and your RSVP information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (invitationQuery.isError || !token || !invitationQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card relative grid min-h-80 w-full max-w-3xl overflow-hidden p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute right-0 top-0 size-56 rounded-full bg-[rgba(130,72,77,0.12)] blur-3xl" />

          <div className="relative m-auto max-w-lg">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.4rem] bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)] shadow-[0_16px_38px_rgba(130,72,77,0.08)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
              Invitation unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {token
                ? getApiErrorMessage(invitationQuery.error)
                : 'This invitation link is incomplete or invalid.'}
            </p>

            {token ? (
              <button
                type="button"
                className="btn-primary mt-7 justify-center text-sm font-bold"
                onClick={() => {
                  void invitationQuery.refetch();
                }}
              >
                <RefreshCcw className="size-4" />
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const invitation = invitationQuery.data;
  const hasResponded = invitation.invitation.hasResponded;

  return (
    <div className="app-shell min-h-screen overflow-hidden px-4 py-5 text-[var(--color-charcoal)] sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="glass-card flex flex-col gap-5 rounded-[1.8rem] border border-white/55 bg-white/30 p-5 shadow-[0_18px_45px_rgba(31,27,29,0.05)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,rgba(93,58,85,0.16),rgba(255,255,255,0.36))] text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(93,58,85,0.08)]">
              <Sparkles className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--color-rosewood)]">
                Event invitation
              </p>

              <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl">
                {invitation.event.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="status-chip" data-tone={hasResponded ? 'green' : 'plum'}>
              {hasResponded ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <Clock3 className="size-3.5" />
              )}
              {hasResponded ? 'RSVP received' : 'Awaiting RSVP'}
            </span>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(93,58,85,0.16)] bg-[linear-gradient(145deg,rgba(93,58,85,0.13),rgba(255,255,255,0.34))] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(93,58,85,0.07)]">
              <Sparkles className="size-3.5" />
              {invitation.event.eventType}
            </span>
          </div>
        </header>

        <main className="py-9 sm:py-11">
          <section className="relative overflow-hidden rounded-[2.3rem] border border-white/30 px-1 py-4 sm:px-4 sm:py-8">
            <div className="pointer-events-none absolute left-[4%] top-2 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.30)] blur-3xl" />
            <div className="pointer-events-none absolute right-[4%] top-10 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.25)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.4fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  You’re invited
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Hello {invitation.guest.firstName}, let’s celebrate together.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Review the event details, confirm your attendance and share anything the host
                  should know about your party.
                </p>
              </div>

              <div className="glass-card relative overflow-hidden p-6">
                <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-[rgba(183,167,200,0.24)] blur-2xl" />

                <div className="relative">
                  <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                    <Clock3 className="size-5" />
                  </div>

                  <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                    Invitation expires
                  </p>

                  <p className="mt-2 text-xl font-black leading-7 tracking-[-0.035em] text-[var(--color-near-black)]">
                    {formatDateTime(invitation.invitation.expiresAt)}
                  </p>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                    Submit or update your response before this deadline.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-7 grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <aside className="space-y-5 lg:sticky lg:top-6">
              <article className="glass-card overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.24))] p-6 shadow-[0_24px_60px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-7">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Event details
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Everything you need to know.
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                  Keep these essential details close while planning your arrival.
                </p>

                <div className="mt-7 grid gap-3">
                  <div className="group rounded-[1.4rem] border border-white/55 bg-white/28 p-5 shadow-[0_12px_30px_rgba(31,27,29,0.04)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/38 hover:shadow-[0_18px_38px_rgba(31,27,29,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-rosewood)]">
                        <CalendarDays className="size-4.5" />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                          Date & time
                        </p>
                        <p className="mt-1 text-base font-black leading-6 text-[var(--color-near-black)]">
                          {formatDateTime(invitation.event.eventDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="group rounded-[1.4rem] border border-white/55 bg-white/28 p-5 shadow-[0_12px_30px_rgba(31,27,29,0.04)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/38 hover:shadow-[0_18px_38px_rgba(31,27,29,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-rosewood)]">
                        <MapPin className="size-4.5" />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                          Venue
                        </p>
                        <p className="mt-1 text-base font-black leading-6 text-[var(--color-near-black)]">
                          {invitation.event.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="group rounded-[1.4rem] border border-white/55 bg-white/28 p-5 shadow-[0_12px_30px_rgba(31,27,29,0.04)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/38 hover:shadow-[0_18px_38px_rgba(31,27,29,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-rosewood)]">
                        <Sparkles className="size-4.5" />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                          Theme
                        </p>
                        <p className="mt-1 text-base font-black leading-6 text-[var(--color-near-black)]">
                          {invitation.event.theme ?? 'No theme specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-7 text-[#fffaf5] shadow-[0_28px_80px_rgba(93,58,85,0.30)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_34px_90px_rgba(93,58,85,0.36)]">
                <div className="pointer-events-none absolute -right-12 -top-14 size-44 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 left-6 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl border border-white/12 bg-white/10 text-[var(--color-powder-blue)] shadow-[0_14px_30px_rgba(31,27,29,0.16)] backdrop-blur-xl">
                      <UsersRound className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white/72">
                      {invitation.guest.partySize} guest
                      {invitation.guest.partySize === 1 ? '' : 's'}
                    </span>
                  </div>

                  <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-white/52">
                    Guest information
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">Your party</h2>

                  <p className="mt-4 leading-7 text-white/70">
                    Update your party size and share meal preferences or dietary needs so the host
                    can plan confidently.
                  </p>

                  <div className="mt-7 rounded-2xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-xl">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/46">
                      Invited guest
                    </p>

                    <p className="mt-2 text-lg font-black">
                      {invitation.guest.firstName} {invitation.guest.lastName}
                    </p>
                  </div>

                  {hasResponded ? (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-bold text-white/76 backdrop-blur-xl">
                      <CheckCircle2 className="size-4 text-[var(--color-powder-blue)]" />
                      Current response: {rsvpLabels[invitation.guest.status as PublicRsvpStatus]}
                    </div>
                  ) : null}
                </div>
              </article>
            </aside>

            <article className="glass-card relative overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-16 top-28 size-56 rounded-full bg-[rgba(183,167,200,0.13)] blur-3xl" />

              <div className="relative">
                {submitRsvpMutation.isSuccess ? (
                  <div className="mb-7 rounded-[1.6rem] border border-[rgba(142,151,115,0.28)] bg-[linear-gradient(145deg,rgba(142,151,115,0.16),rgba(255,255,255,0.30))] p-5 shadow-[0_18px_40px_rgba(61,69,47,0.06)]">
                    <div className="flex items-start gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(142,151,115,0.24)] text-[#3d452f]">
                        <CheckCircle2 className="size-5" />
                      </div>

                      <div>
                        <p className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                          RSVP saved successfully
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                          The host has received your latest response and guest information.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                      RSVP
                    </p>

                    <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl">
                      {hasResponded ? 'Update your response.' : 'Will you be joining us?'}
                    </h2>

                    <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      Choose the response that best reflects your plans, then confirm your party
                      details below.
                    </p>
                  </div>

                  {hasResponded ? (
                    <span className="status-chip shrink-0" data-tone="green">
                      <Check className="size-3.5" />
                      Response on file
                    </span>
                  ) : null}
                </div>

                <form
                  className="mt-9 grid gap-7"
                  onSubmit={form.handleSubmit((values) => {
                    form.clearErrors('root');

                    if (!hasRsvpChanges(invitation, values)) {
                      form.setError('root', {
                        type: 'manual',
                        message: 'No RSVP details were changed.',
                      });

                      return;
                    }

                    submitRsvpMutation.mutate(values);
                  })}
                >
                  <fieldset disabled={submitRsvpMutation.isPending}>
                    <legend className="mb-3 text-sm font-black text-[var(--color-charcoal)]/72">
                      Your response
                    </legend>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {publicRsvpStatuses.map((status) => {
                        const isSelected = selectedStatus === status;

                        return (
                          <label
                            key={status}
                            className={`group relative cursor-pointer overflow-hidden rounded-[1.4rem] border p-5 transition duration-300 focus-within:ring-2 focus-within:ring-[rgba(93,58,85,0.26)] focus-within:ring-offset-2 focus-within:ring-offset-transparent ${
                              isSelected
                                ? rsvpToneClasses[status]
                                : 'border-white/55 bg-white/24 hover:-translate-y-0.5 hover:bg-white/38 hover:shadow-[0_14px_30px_rgba(31,27,29,0.05)]'
                            }`}
                          >
                            <input
                              className="sr-only"
                              type="radio"
                              value={status}
                              {...form.register('status', {
                                onChange: clearSubmissionState,
                              })}
                            />

                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="block text-sm font-black leading-5 text-[var(--color-near-black)]">
                                  {rsvpLabels[status]}
                                </span>

                                <span className="mt-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
                                  {rsvpDescriptions[status]}
                                </span>
                              </div>

                              <span
                                className={`grid size-6 shrink-0 place-items-center rounded-full border transition ${
                                  isSelected
                                    ? 'border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] text-white'
                                    : 'border-[rgba(31,27,29,0.18)] bg-white/30 text-transparent'
                                }`}
                              >
                                <Check className="size-3.5" />
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="rounded-[1.65rem] border border-white/52 bg-white/18 p-5 shadow-[0_16px_38px_rgba(31,27,29,0.035)] sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                        <UsersRound className="size-4.5" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Party details
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/46">
                          Tell the host who to plan for.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5">
                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                          Party size
                        </span>

                        <div className="rounded-[1.35rem] border border-white/55 bg-white/24 p-1 shadow-[0_12px_28px_rgba(31,27,29,0.035)] backdrop-blur-xl transition focus-within:border-[rgba(93,58,85,0.28)] focus-within:bg-white/34 focus-within:shadow-[0_16px_34px_rgba(93,58,85,0.07)]">
                          <input
                            className="w-full rounded-[1.05rem] border-0 bg-transparent px-4 py-3.5 text-sm font-bold text-[var(--color-near-black)] outline-none placeholder:text-[var(--color-charcoal)]/32"
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            disabled={submitRsvpMutation.isPending}
                            {...form.register('partySize', {
                              onChange: clearSubmissionState,
                            })}
                          />
                        </div>

                        {form.formState.errors.partySize ? (
                          <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                            {form.formState.errors.partySize.message}
                          </span>
                        ) : (
                          <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/42">
                            Include yourself and everyone attending with you.
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[1.65rem] border border-white/52 bg-white/18 p-5 shadow-[0_16px_38px_rgba(31,27,29,0.035)] sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-rosewood)]">
                        <UtensilsCrossed className="size-4.5" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Meal information
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/46">
                          Optional details that help the host prepare.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5">
                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                          Meal preference
                        </span>

                        <div className="rounded-[1.35rem] border border-white/55 bg-white/24 p-1 shadow-[0_12px_28px_rgba(31,27,29,0.035)] backdrop-blur-xl transition focus-within:border-[rgba(93,58,85,0.28)] focus-within:bg-white/34 focus-within:shadow-[0_16px_34px_rgba(93,58,85,0.07)]">
                          <input
                            className="w-full rounded-[1.05rem] border-0 bg-transparent px-4 py-3.5 text-sm font-bold text-[var(--color-near-black)] outline-none placeholder:text-[var(--color-charcoal)]/32"
                            type="text"
                            placeholder="e.g. Vegetarian"
                            disabled={submitRsvpMutation.isPending}
                            {...form.register('mealPreference', {
                              onChange: clearSubmissionState,
                            })}
                          />
                        </div>

                        {form.formState.errors.mealPreference ? (
                          <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                            {form.formState.errors.mealPreference.message}
                          </span>
                        ) : (
                          <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/42">
                            Mention your preferred meal type, if applicable.
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                          Dietary requirements
                        </span>

                        <div className="rounded-[1.35rem] border border-white/55 bg-white/24 p-1 shadow-[0_12px_28px_rgba(31,27,29,0.035)] backdrop-blur-xl transition focus-within:border-[rgba(93,58,85,0.28)] focus-within:bg-white/34 focus-within:shadow-[0_16px_34px_rgba(93,58,85,0.07)]">
                          <textarea
                            className="min-h-32 w-full resize-y rounded-[1.05rem] border-0 bg-transparent px-4 py-3.5 text-sm font-bold leading-6 text-[var(--color-near-black)] outline-none placeholder:text-[var(--color-charcoal)]/32"
                            placeholder="Share allergies, intolerances or other dietary needs"
                            disabled={submitRsvpMutation.isPending}
                            {...form.register('dietaryRequirements', {
                              onChange: clearSubmissionState,
                            })}
                          />
                        </div>

                        {form.formState.errors.dietaryRequirements ? (
                          <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                            {form.formState.errors.dietaryRequirements.message}
                          </span>
                        ) : (
                          <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/42">
                            This information is shared with the event host.
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  {form.formState.errors.root?.message ? (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                    >
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      {form.formState.errors.root.message}
                    </div>
                  ) : null}

                  {submitRsvpMutation.isError ? (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                    >
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      {getApiErrorMessage(submitRsvpMutation.error)}
                    </div>
                  ) : null}

                  <div className="rounded-[1.55rem] border border-white/52 bg-[linear-gradient(145deg,rgba(255,255,255,0.30),rgba(255,255,255,0.18))] p-4 shadow-[0_16px_36px_rgba(31,27,29,0.04)] sm:flex sm:items-center sm:justify-between sm:gap-5">
                    <div className="mb-4 sm:mb-0">
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Ready to send your response?
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        You can return to this link and update your RSVP before it expires.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary min-h-13 w-full shrink-0 justify-center rounded-[1.1rem] px-6 text-sm font-black shadow-[0_18px_38px_rgba(93,58,85,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(93,58,85,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
                      disabled={submitRsvpMutation.isPending}
                    >
                      {submitRsvpMutation.isPending ? (
                        <LoaderCircle className="size-5 animate-spin" />
                      ) : (
                        <Send className="size-4.5" />
                      )}

                      {submitRsvpMutation.isPending
                        ? 'Submitting RSVP...'
                        : hasResponded
                          ? 'Update my RSVP'
                          : 'Submit my RSVP'}
                    </button>
                  </div>
                </form>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
