import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MapPin,
  Send,
  Sparkles,
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

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'Something went wrong. Please try again.';
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

  if (invitationQuery.isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your invitation
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading the event details and your RSVP information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (invitationQuery.isError || !token || !invitationQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Invitation unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {token
                ? getApiErrorMessage(invitationQuery.error)
                : 'The invitation link is invalid.'}
            </p>

            {token ? (
              <button
                type="button"
                className="btn-primary mt-6 text-sm font-bold"
                onClick={() => {
                  void invitationQuery.refetch();
                }}
              >
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
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              Event invitation
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
              {invitation.event.name}
            </h1>
          </div>

          <span className="status-chip w-fit" data-tone="plum">
            {invitation.event.eventType}
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[8%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.26)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  You’re invited
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Hello {invitation.guest.firstName}, we’d love to celebrate with you.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Please review the event details and let the host know whether you can attend.
                </p>
              </div>

              <div className="glass-card p-5">
                <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                  Invitation expires
                </p>

                <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {formatDateTime(invitation.invitation.expiresAt)}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
            <aside className="space-y-5">
              <article className="glass-card p-6 sm:p-7">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Event details
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Everything you need to know.
                </h2>

                <div className="mt-8 space-y-3">
                  <div className="rounded-2xl bg-white/28 p-5 backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                      <CalendarDays className="size-4 text-[var(--color-rosewood)]" />
                      Date and time
                    </div>

                    <p className="mt-3 font-black text-[var(--color-near-black)]">
                      {formatDateTime(invitation.event.eventDate)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/28 p-5 backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                      <MapPin className="size-4 text-[var(--color-rosewood)]" />
                      Location
                    </div>

                    <p className="mt-3 font-black text-[var(--color-near-black)]">
                      {invitation.event.location}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/28 p-5 backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                      <Sparkles className="size-4 text-[var(--color-rosewood)]" />
                      Theme
                    </div>

                    <p className="mt-3 font-black text-[var(--color-near-black)]">
                      {invitation.event.theme ?? 'No theme specified'}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <UsersRound className="size-6 text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Your party</h2>

                <p className="mt-3 leading-7 text-white/68">
                  You may update the number of people attending with you and share any meal or
                  dietary requirements.
                </p>
              </article>
            </aside>

            <article className="glass-card p-6 sm:p-8">
              {submitRsvpMutation.isSuccess ? (
                <div className="rounded-[1.5rem] border border-[rgba(142,151,115,0.28)] bg-[rgba(142,151,115,0.12)] p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(142,151,115,0.24)] text-[#3d452f]">
                      <CheckCircle2 className="size-5" />
                    </div>

                    <div>
                      <p className="font-black text-[var(--color-near-black)]">
                        RSVP submitted successfully
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/60">
                        The host has received your updated response.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                RSVP
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {hasResponded ? 'Update your response.' : 'Will you be joining us?'}
              </h2>

              <form
                className="mt-8 grid gap-5"
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
                <div className="grid gap-3 sm:grid-cols-3">
                  {publicRsvpStatuses.map((status) => (
                    <label
                      key={status}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        selectedStatus === status
                          ? 'border-[rgba(93,58,85,0.34)] bg-[rgba(93,58,85,0.12)]'
                          : 'border-white/55 bg-white/24 hover:bg-white/34'
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        value={status}
                        disabled={submitRsvpMutation.isPending}
                        {...form.register('status', {
                          onChange: () => {
                            submitRsvpMutation.reset();
                            form.clearErrors('root');
                          },
                        })}
                      />

                      <span className="text-sm font-black text-[var(--color-near-black)]">
                        {rsvpLabels[status]}
                      </span>
                    </label>
                  ))}
                </div>

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
                    disabled={submitRsvpMutation.isPending}
                    {...form.register('partySize', {
                      onChange: () => {
                        submitRsvpMutation.reset();
                        form.clearErrors('root');
                      },
                    })}
                  />

                  {form.formState.errors.partySize ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {form.formState.errors.partySize.message}
                    </span>
                  ) : null}
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Meal preference
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    placeholder="Vegetarian"
                    disabled={submitRsvpMutation.isPending}
                    {...form.register('mealPreference', {
                      onChange: () => {
                        submitRsvpMutation.reset();
                        form.clearErrors('root');
                      },
                    })}
                  />

                  {form.formState.errors.mealPreference ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {form.formState.errors.mealPreference.message}
                    </span>
                  ) : null}
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Dietary requirements
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    disabled={submitRsvpMutation.isPending}
                    {...form.register('dietaryRequirements', {
                      onChange: () => {
                        submitRsvpMutation.reset();
                        form.clearErrors('root');
                      },
                    })}
                  />

                  {form.formState.errors.dietaryRequirements ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {form.formState.errors.dietaryRequirements.message}
                    </span>
                  ) : null}
                </label>
                {form.formState.errors.root?.message ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {form.formState.errors.root.message}
                  </div>
                ) : null}
                {submitRsvpMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(submitRsvpMutation.error)}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="btn-primary justify-center text-sm font-bold"
                  disabled={submitRsvpMutation.isPending}
                >
                  {submitRsvpMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}

                  {submitRsvpMutation.isPending
                    ? 'Submitting RSVP...'
                    : hasResponded
                      ? 'Update RSVP'
                      : 'Submit RSVP'}
                </button>
              </form>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
