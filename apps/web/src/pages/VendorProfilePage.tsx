import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CircleAlert,
  Clock3,
  Globe2,
  LoaderCircle,
  MapPin,
  Phone,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { getServiceCategories } from '../features/categories/category.api';
import {
  getVendorOnboardingProfile,
  submitVendorOnboardingProfile,
  updateVendorCategories,
  updateVendorOnboardingProfile,
  type VendorOnboarding,
} from '../features/vendors/vendor.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';

const optionalDescriptionSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || value.length >= 20, {
    message: 'Business description must contain at least 20 characters.',
  })
  .refine((value) => value.length <= 2000, {
    message: 'Business description must not exceed 2000 characters.',
  });

const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^\+[1-9]\d{7,14}$/.test(value), {
    message: 'Use international format, for example +94771234567.',
  });

const optionalWebsiteSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value.length === 0) {
      return true;
    }

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, 'Enter a valid website URL.');

const optionalLocationSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || value.length >= 2, {
    message: 'Base location must contain at least 2 characters.',
  })
  .refine((value) => value.length <= 120, {
    message: 'Base location must not exceed 120 characters.',
  });

const vendorProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Business name must contain at least 2 characters.')
    .max(120, 'Business name must not exceed 120 characters.'),

  description: optionalDescriptionSchema,

  contactPhone: optionalPhoneSchema,

  website: optionalWebsiteSchema,

  baseLocation: optionalLocationSchema,

  serviceAreas: z
    .string()
    .trim()
    .refine(
      (value) =>
        value
          .split(',')
          .map((area) => area.trim())
          .filter(Boolean).length <= 20,
      {
        message: 'You can add a maximum of 20 service areas.',
      },
    ),

  categoryIds: z.array(z.string()).max(5, 'You can select a maximum of 5 service categories.'),
});

type VendorProfileFormValues = z.infer<typeof vendorProfileSchema>;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
    details?: {
      incompleteFields?: string[];
    };
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
};

const getStatusContent = (status: VendorOnboarding['profile']['verificationStatus']) => {
  switch (status) {
    case 'APPROVED':
      return {
        title: 'Your vendor profile is approved',
        description: 'Your business is verified and can appear in the public Eventure marketplace.',
        icon: BadgeCheck,
        tone: 'bg-[rgba(142,151,115,0.20)] text-[#3d452f]',
        statusTone: 'success',
      };

    case 'PENDING':
      return {
        title: 'Your profile is under review',
        description:
          'Editing is temporarily locked while an administrator reviews your vendor information.',
        icon: Clock3,
        tone: 'bg-[rgba(184,145,87,0.18)] text-[#6f5328]',
        statusTone: 'warning',
      };

    case 'REJECTED':
      return {
        title: 'Your profile needs changes',
        description:
          'Review the administrator feedback, update your information, and submit it again.',
        icon: CircleAlert,
        tone: 'bg-[rgba(142,92,103,0.16)] text-[var(--color-rosewood)]',
        statusTone: 'danger',
      };

    case 'DRAFT':
    default:
      return {
        title: 'Complete your vendor profile',
        description:
          'Add the information customers need before submitting your business for verification.',
        icon: Sparkles,
        tone: 'bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]',
        statusTone: 'plum',
      };
  }
};

const getServiceAreas = (value: string) =>
  value
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean)
    .filter((area, index, areas) => areas.indexOf(area) === index);

export function VendorProfilePage() {
  const queryClient = useQueryClient();

  const onboardingQuery = useQuery({
    queryKey: ['vendors', 'me', 'onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const categoriesQuery = useQuery({
    queryKey: ['service-categories'],
    queryFn: getServiceCategories,
  });

  const form = useForm<VendorProfileFormValues>({
    resolver: zodResolver(vendorProfileSchema),
    defaultValues: {
      businessName: '',
      description: '',
      contactPhone: '',
      website: '',
      baseLocation: '',
      serviceAreas: '',
      categoryIds: [],
    },
  });

  useEffect(() => {
    const onboarding = onboardingQuery.data;

    if (!onboarding) {
      return;
    }

    form.reset({
      businessName: onboarding.profile.businessName,
      description: onboarding.profile.description ?? '',
      contactPhone: onboarding.profile.contactPhone ?? '',
      website: onboarding.profile.website ?? '',
      baseLocation: onboarding.profile.baseLocation ?? '',
      serviceAreas: onboarding.profile.serviceAreas.join(', '),
      categoryIds: onboarding.profile.categories.map((category) => category.id),
    });
  }, [form, onboardingQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: VendorProfileFormValues) => {
      await updateVendorOnboardingProfile({
        businessName: values.businessName.trim(),
        description: values.description.trim() || null,
        contactPhone: values.contactPhone.trim() || null,
        website: values.website.trim() || null,
        baseLocation: values.baseLocation.trim() || null,
        serviceAreas: getServiceAreas(values.serviceAreas),
      });

      if (values.categoryIds.length > 0) {
        await updateVendorCategories({
          categoryIds: values.categoryIds,
        });
      }

      return getVendorOnboardingProfile();
    },

    onSuccess: (onboarding) => {
      queryClient.setQueryData(['vendors', 'me', 'onboarding'], onboarding);

      form.reset({
        businessName: onboarding.profile.businessName,
        description: onboarding.profile.description ?? '',
        contactPhone: onboarding.profile.contactPhone ?? '',
        website: onboarding.profile.website ?? '',
        baseLocation: onboarding.profile.baseLocation ?? '',
        serviceAreas: onboarding.profile.serviceAreas.join(', '),
        categoryIds: onboarding.profile.categories.map((category) => category.id),
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: submitVendorOnboardingProfile,

    onSuccess: (onboarding) => {
      queryClient.setQueryData(['vendors', 'me', 'onboarding'], onboarding);
    },
  });

  const onSave = form.handleSubmit((values) => {
    saveMutation.mutate(values);
  });

  const handleSubmitForReview = () => {
    submitMutation.mutate();
  };

  const isLoading = onboardingQuery.isLoading || categoriesQuery.isLoading;

  const loadError = onboardingQuery.error ?? categoriesQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="state-surface w-full max-w-3xl">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading your vendor profile
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Preparing your business details, categories, and verification status.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !onboardingQuery.data || !categoriesQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="state-surface w-full max-w-3xl">
          <div className="max-w-lg">
            <div className="icon-tile mx-auto">
              <CircleAlert className="size-6" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Vendor profile unavailable
            </h1>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(
                loadError,
                'We could not load your vendor profile. Please try again.',
              )}
            </p>

            <button
              type="button"
              className="btn-primary mt-6 text-sm font-bold"
              onClick={() => {
                void Promise.all([onboardingQuery.refetch(), categoriesQuery.refetch()]);
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const onboarding = onboardingQuery.data;
  const categories = categoriesQuery.data;

  const statusContent = getStatusContent(onboarding.profile.verificationStatus);

  const StatusIcon = statusContent.icon;

  const isEditable =
    onboarding.profile.verificationStatus === 'DRAFT' ||
    onboarding.profile.verificationStatus === 'REJECTED';

  const canSubmit =
    onboarding.profile.verificationStatus === 'DRAFT' &&
    onboarding.completion.percentage === 100 &&
    !form.formState.isDirty;

  const selectedCategoryIds = form.watch('categoryIds');

  const saveError = saveMutation.isError
    ? getErrorMessage(saveMutation.error, 'We could not save your vendor profile.')
    : null;

  const submitError = submitMutation.isError
    ? getErrorMessage(submitMutation.error, 'We could not submit your profile for review.')
    : null;

  return (
    <div className="workspace-shell">
      <div className="workspace-container max-w-6xl">
        <header className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
            >
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>

            <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              Vendor workspace
            </p>
          </div>

          <span className="status-chip w-fit" data-tone={statusContent.statusTone}>
            {onboarding.profile.verificationStatus.replaceAll('_', ' ')}
          </span>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <main className="py-10">
          <section className="workspace-hero grid gap-6 lg:grid-cols-[1fr_0.4fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Building2 className="size-4" />
                Business profile
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Present your business with clarity and confidence.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-charcoal)]/70">
                Complete the details customers use to understand your services, location,
                experience, and suitability for their event.
              </p>
            </div>

            <article className="glass-card p-5">
              <div className={`grid size-12 place-items-center rounded-2xl ${statusContent.tone}`}>
                <StatusIcon className="size-6" />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                {statusContent.title}
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                {statusContent.description}
              </p>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/42">
                <div
                  className="h-full rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))]"
                  style={{
                    width: `${onboarding.completion.percentage}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm font-black text-[var(--color-deep-plum)]">
                {onboarding.completion.percentage}% complete
                {onboarding.completion.percentage < 100
                  ? ` • ${100 - onboarding.completion.percentage}% remaining`
                  : ' • Ready for submission'}
              </p>
            </article>
          </section>

          {onboarding.profile.rejectionReason ? (
            <section className="feedback-surface mt-6" data-tone="danger">
              <div>
                <p className="text-sm font-black">Administrator feedback</p>

                <p className="mt-2 leading-7">{onboarding.profile.rejectionReason}</p>
              </div>
            </section>
          ) : null}

          <form className="mt-6 grid gap-6" onSubmit={onSave}>
            <section className="workspace-panel">
              <div>
                <p className="section-eyebrow">Business information</p>

                <h2 className="section-title">Core vendor details</h2>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Business name
                  </span>

                  <span className="relative block">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                    <input
                      className="form-field !pl-12"
                      type="text"
                      aria-invalid={Boolean(form.formState.errors.businessName)}
                      disabled={!isEditable || saveMutation.isPending}
                      {...form.register('businessName')}
                    />
                  </span>

                  {form.formState.errors.businessName ? (
                    <span className="field-error block">
                      {form.formState.errors.businessName.message}
                    </span>
                  ) : null}
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Business description
                  </span>

                  <textarea
                    className="form-field min-h-36 resize-y"
                    placeholder="Describe your experience, style, services, and what makes your business distinctive."
                    aria-invalid={Boolean(form.formState.errors.description)}
                    disabled={!isEditable || saveMutation.isPending}
                    {...form.register('description')}
                  />

                  {form.formState.errors.description ? (
                    <span className="field-error block">
                      {form.formState.errors.description.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Contact phone
                  </span>

                  <span className="relative block">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                    <input
                      className="form-field !pl-12"
                      type="tel"
                      placeholder="+94771234567"
                      aria-invalid={Boolean(form.formState.errors.contactPhone)}
                      disabled={!isEditable || saveMutation.isPending}
                      {...form.register('contactPhone')}
                    />
                  </span>

                  {form.formState.errors.contactPhone ? (
                    <span className="field-error block">
                      {form.formState.errors.contactPhone.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Website
                  </span>

                  <span className="relative block">
                    <Globe2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                    <input
                      className="form-field !pl-12"
                      type="url"
                      placeholder="https://example.com"
                      aria-invalid={Boolean(form.formState.errors.website)}
                      disabled={!isEditable || saveMutation.isPending}
                      {...form.register('website')}
                    />
                  </span>

                  {form.formState.errors.website ? (
                    <span className="field-error block">
                      {form.formState.errors.website.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Base location
                  </span>

                  <span className="relative block">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                    <input
                      className="form-field !pl-12"
                      type="text"
                      placeholder="Colombo"
                      aria-invalid={Boolean(form.formState.errors.baseLocation)}
                      disabled={!isEditable || saveMutation.isPending}
                      {...form.register('baseLocation')}
                    />
                  </span>

                  {form.formState.errors.baseLocation ? (
                    <span className="field-error block">
                      {form.formState.errors.baseLocation.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Service areas
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    placeholder="Colombo, Gampaha, Kandy"
                    aria-invalid={Boolean(form.formState.errors.serviceAreas)}
                    disabled={!isEditable || saveMutation.isPending}
                    {...form.register('serviceAreas')}
                  />

                  <span className="mt-2 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                    Separate multiple areas using commas.
                  </span>

                  {form.formState.errors.serviceAreas ? (
                    <span className="field-error block">
                      {form.formState.errors.serviceAreas.message}
                    </span>
                  ) : null}
                </label>
              </div>
            </section>

            <section className="workspace-panel">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="section-eyebrow">Service categories</p>

                  <h2 className="section-title">What does your business provide?</h2>

                  <p className="section-description">
                    Select up to five categories. These help customers discover your business in the
                    marketplace.
                  </p>
                </div>

                <span className="soft-chip w-fit text-xs font-black">
                  {selectedCategoryIds.length}/5 selected
                </span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => {
                  const isSelected = selectedCategoryIds.includes(category.id);

                  return (
                    <label
                      key={category.id}
                      className={
                        isSelected
                          ? 'cursor-pointer rounded-2xl border border-[rgba(93,58,85,0.28)] bg-[rgba(93,58,85,0.10)] p-4'
                          : 'cursor-pointer rounded-2xl border border-white/55 bg-white/24 p-4 transition hover:bg-white/34'
                      }
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        value={category.id}
                        disabled={
                          !isEditable ||
                          saveMutation.isPending ||
                          (!isSelected && selectedCategoryIds.length >= 5)
                        }
                        {...form.register('categoryIds')}
                      />

                      <span className="flex items-center justify-between gap-3">
                        <span>
                          <span className="block text-sm font-black text-[var(--color-near-black)]">
                            {category.name}
                          </span>

                          <span className="mt-1 block text-xs font-semibold text-[var(--color-charcoal)]/50">
                            {category.slug}
                          </span>
                        </span>

                        <span
                          className={
                            isSelected
                              ? 'grid size-8 place-items-center rounded-xl bg-[var(--color-deep-plum)] text-white'
                              : 'grid size-8 place-items-center rounded-xl bg-white/38 text-transparent'
                          }
                        >
                          <Check className="size-4" />
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {form.formState.errors.categoryIds ? (
                <p className="field-error mt-4">{form.formState.errors.categoryIds.message}</p>
              ) : null}
            </section>

            {saveError || submitError ? (
              <div role="alert" className="feedback-surface" data-tone="danger">
                {saveError ?? submitError}
              </div>
            ) : null}

            {saveMutation.isSuccess ? (
              <div className="feedback-surface" data-tone="success">
                Your vendor profile was saved successfully.
              </div>
            ) : null}

            <section className="workspace-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-[var(--color-near-black)]">
                  {isEditable
                    ? 'Save your changes before submitting.'
                    : 'This profile is currently locked for editing.'}
                </p>

                <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/58">
                  A profile must reach 100% completion before it can be reviewed.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isEditable ? (
                  <button
                    type="submit"
                    className="btn-secondary text-sm font-bold"
                    disabled={
                      saveMutation.isPending || submitMutation.isPending || !form.formState.isDirty
                    }
                  >
                    {saveMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {saveMutation.isPending ? 'Saving...' : 'Save profile'}
                  </button>
                ) : null}

                {onboarding.profile.verificationStatus === 'DRAFT' ? (
                  <button
                    type="button"
                    className="btn-primary text-sm font-bold"
                    disabled={!canSubmit || saveMutation.isPending || submitMutation.isPending}
                    onClick={handleSubmitForReview}
                  >
                    {submitMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}

                    {submitMutation.isPending ? 'Submitting...' : 'Submit for review'}
                  </button>
                ) : null}

                {onboarding.profile.verificationStatus === 'APPROVED' ? (
                  <Link
                    to={`/vendors/${onboarding.profile.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-sm font-bold"
                  >
                    View public profile
                  </Link>
                ) : null}
              </div>
            </section>
          </form>
        </main>
      </div>
    </div>
  );
}
