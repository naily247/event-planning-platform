import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CircleAlert, Layers3, LoaderCircle, PackagePlus, Pencil, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DeletePackageDialog } from '../features/packages/components/DeletePackageDialog';
import { PackageForm, type PackageFormValues } from '../features/packages/components/PackageForm';
import { PackageCard } from '../features/packages/components/PackageCard';
import {
  createServicePackage,
  deleteServicePackage,
  getVendorPackages,
  updateServicePackage,
  updateServicePackageStatus,
  type VendorServicePackage,
} from '../features/packages/package.api';
import { getVendorOnboardingProfile } from '../features/vendors/vendor.api';

const packageFormSchema = z.object({
  categoryId: z.string().trim().min(1, 'Choose a service category.'),

  title: z
    .string()
    .trim()
    .min(2, 'Title must contain at least 2 characters.')
    .max(120, 'Title must not exceed 120 characters.'),

  description: z.string().trim().max(1000, 'Description must not exceed 1000 characters.'),

  basePrice: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) {
        return true;
      }

      const price = Number(value);

      return Number.isFinite(price) && price >= 0;
    }, 'Enter a valid non-negative price.'),

  isActive: z.boolean(),
});

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
};

const getInitialPackageFormValues = (servicePackage?: VendorServicePackage): PackageFormValues => ({
  categoryId: servicePackage?.category.id ?? '',
  title: servicePackage?.title ?? '',
  description: servicePackage?.description ?? '',
  basePrice: servicePackage?.basePrice ?? '',
  isActive: servicePackage?.isActive ?? true,
});

export function VendorPackagesPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<VendorServicePackage | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<VendorServicePackage | null>(null);

  const [showCreateDiscardConfirmation, setShowCreateDiscardConfirmation] = useState(false);
  const [showEditDiscardConfirmation, setShowEditDiscardConfirmation] = useState(false);

  const [updatingStatusPackageId, setUpdatingStatusPackageId] = useState<string | null>(null);

  const createForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: getInitialPackageFormValues(),
  });

  const editForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: getInitialPackageFormValues(),
  });

  const packagesQuery = useQuery({
    queryKey: ['packages', 'vendor'],
    queryFn: () => getVendorPackages(),
  });

  const onboardingQuery = useQuery({
    queryKey: ['vendors', 'me', 'onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const sortedPackages = useMemo(() => {
    return [...(packagesQuery.data ?? [])].sort(
      (firstPackage, secondPackage) =>
        new Date(secondPackage.createdAt).getTime() - new Date(firstPackage.createdAt).getTime(),
    );
  }, [packagesQuery.data]);

  const filteredPackages = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return sortedPackages.filter((servicePackage) => {
      const matchesSearch =
        !normalizedSearch ||
        servicePackage.title.toLowerCase().includes(normalizedSearch) ||
        servicePackage.category.name.toLowerCase().includes(normalizedSearch) ||
        servicePackage.description?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && servicePackage.isActive) ||
        (statusFilter === 'inactive' && !servicePackage.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, sortedPackages, statusFilter]);

  const createMutation = useMutation({
    mutationFn: (values: PackageFormValues) =>
      createServicePackage({
        categoryId: values.categoryId,
        title: values.title.trim(),
        description: values.description.trim() || null,
        basePrice: values.basePrice.trim() ? Number(values.basePrice) : null,
        isActive: values.isActive,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['packages', 'vendor'],
      });

      createForm.reset(getInitialPackageFormValues());
      setShowCreateDiscardConfirmation(false);
      setIsCreateDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ packageId, values }: { packageId: string; values: PackageFormValues }) =>
      updateServicePackage(packageId, {
        categoryId: values.categoryId,
        title: values.title.trim(),
        description: values.description.trim() || null,
        basePrice: values.basePrice.trim() ? Number(values.basePrice) : null,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['packages', 'vendor'],
      });

      setEditingPackage(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (servicePackage: VendorServicePackage) =>
      updateServicePackageStatus(servicePackage.id, {
        isActive: !servicePackage.isActive,
      }),

    onMutate: (servicePackage) => {
      setUpdatingStatusPackageId(servicePackage.id);
    },

    onSettled: () => {
      setUpdatingStatusPackageId(null);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['packages', 'vendor'],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteServicePackage,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['packages', 'vendor'],
      });

      setDeletingPackage(null);
    },
  });

  const categories = onboardingQuery.data?.profile.categories ?? [];

  const activePackageCount = sortedPackages.filter(
    (servicePackage) => servicePackage.isActive,
  ).length;

  const inactivePackageCount = sortedPackages.length - activePackageCount;

  const openCreateDialog = () => {
    createMutation.reset();
    createForm.clearErrors();
    createForm.reset(getInitialPackageFormValues());
    setShowCreateDiscardConfirmation(false);
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createMutation.isPending) {
      return;
    }

    if (createForm.formState.isDirty) {
      setShowCreateDiscardConfirmation(true);
      return;
    }

    createMutation.reset();
    createForm.clearErrors();
    createForm.reset(getInitialPackageFormValues());
    setIsCreateDialogOpen(false);
  };

  const discardCreateChanges = () => {
    if (createMutation.isPending) {
      return;
    }

    setShowCreateDiscardConfirmation(false);
    createMutation.reset();
    createForm.clearErrors();
    createForm.reset(getInitialPackageFormValues());
    setIsCreateDialogOpen(false);
  };

  const openEditDialog = (servicePackage: VendorServicePackage) => {
    updateMutation.reset();
    editForm.clearErrors();
    editForm.reset(getInitialPackageFormValues(servicePackage));
    setShowEditDiscardConfirmation(false);
    setEditingPackage(servicePackage);
  };

  const closeEditDialog = () => {
    if (updateMutation.isPending) {
      return;
    }

    if (editForm.formState.isDirty) {
      setShowEditDiscardConfirmation(true);
      return;
    }

    updateMutation.reset();
    editForm.clearErrors();
    setEditingPackage(null);
  };

  const discardEditChanges = () => {
    if (updateMutation.isPending) {
      return;
    }

    setShowEditDiscardConfirmation(false);
    updateMutation.reset();
    editForm.clearErrors();

    if (editingPackage) {
      editForm.reset(getInitialPackageFormValues(editingPackage));
    }

    setEditingPackage(null);
  };

  if (packagesQuery.isLoading || onboardingQuery.isLoading) {
    return (
      <div className="workspace-shell relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute left-[8%] top-16 size-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-20 size-80 rounded-full bg-[rgba(175,201,216,0.2)] blur-3xl" />

        <div className="glass-card relative grid min-h-[30rem] w-full max-w-3xl place-items-center overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.15)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[rgba(214,190,177,0.13)] blur-3xl" />

          <div className="relative max-w-lg">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.35rem] bg-[var(--color-deep-plum)] text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)]">
              <LoaderCircle className="size-7 animate-spin" />
            </div>

            <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              Loading your packages
            </p>

            <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/62">
              Preparing your service offers, category details, pricing, and publication status.
            </p>

            <div className="mx-auto mt-7 flex max-w-sm items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/55">
                <span className="block h-full w-2/3 animate-pulse rounded-full bg-[var(--color-deep-plum)]" />
              </span>

              <Layers3 className="size-4 text-[var(--color-rosewood)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    packagesQuery.isError ||
    onboardingQuery.isError ||
    !packagesQuery.data ||
    !onboardingQuery.data
  ) {
    return (
      <div className="workspace-shell relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute left-[8%] top-16 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-20 size-80 rounded-full bg-[rgba(214,190,177,0.18)] blur-3xl" />

        <div className="glass-card relative grid min-h-[30rem] w-full max-w-3xl place-items-center overflow-hidden p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-red-100/65 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl" />

          <div className="relative max-w-xl">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.35rem] bg-[rgba(130,72,77,0.11)] text-[var(--color-rosewood)] shadow-[0_14px_34px_rgba(64,42,51,0.08)]">
              <CircleAlert className="size-7" />
            </div>

            <h1 className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-3xl">
              Packages unavailable
            </h1>

            <p className="mt-4 text-sm leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
              {getErrorMessage(
                packagesQuery.error ?? onboardingQuery.error,
                'We could not load your vendor packages.',
              )}
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-primary text-sm font-bold"
                onClick={() => {
                  void Promise.all([packagesQuery.refetch(), onboardingQuery.refetch()]);
                }}
              >
                Try again
              </button>
            </div>

            <p className="mt-6 text-xs font-semibold text-[var(--color-charcoal)]/46">
              Your saved package data will remain unchanged while you retry.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="workspace-shell relative">
      <div className="workspace-container max-w-7xl">
        <main className="pb-6 pt-2">
          {/* Compact package overview */}
          <section className="relative isolate overflow-hidden rounded-[1.6rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_16px_44px_rgba(64,42,51,0.08)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 left-[30%] size-64 rounded-full bg-[rgba(142,92,103,0.08)] blur-3xl"
            />

            <div className="relative grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-7 lg:px-6">
              <div className="min-w-0">
                <div className="soft-chip w-fit text-[0.6rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)]">
                  <Layers3 className="size-3.5" />
                  Service packages
                </div>

                <h1 className="mt-2.5 max-w-3xl text-balance text-[1.85rem] font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-[2.15rem]">
                  Turn your services into clear customer-ready offers.
                </h1>

                <p className="mt-2 max-w-3xl text-[0.8rem] font-medium leading-5 text-[var(--color-charcoal)]/62">
                  Organise your services, starting prices, and package details so customers can
                  understand what you offer before requesting a quotation.
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="soft-chip text-[0.65rem] font-black">
                    <Layers3 className="size-3.5" />
                    {sortedPackages.length} total
                  </span>

                  <span className="soft-chip text-[0.65rem] font-black">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {activePackageCount} active
                  </span>

                  <span className="soft-chip text-[0.65rem] font-black">
                    <span className="size-1.5 rounded-full bg-[var(--color-muted-burgundy)]/55" />
                    {inactivePackageCount} inactive
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
                <div className="rounded-[1.15rem] border border-white/68 bg-white/46 px-3.5 py-2.5 shadow-[0_10px_26px_rgba(31,27,29,0.05)] backdrop-blur-xl lg:min-w-[16rem]">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <Layers3 className="size-3.5" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[0.56rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                        Package visibility
                      </p>

                      <p className="text-sm font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {activePackageCount > 0 ? 'Customer-ready' : 'Needs attention'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-1.5 text-[0.65rem] font-semibold leading-4 text-[var(--color-charcoal)]/56">
                    {activePackageCount > 0
                      ? `${activePackageCount} ${
                          activePackageCount === 1 ? 'package is' : 'packages are'
                        } currently visible to customers.`
                      : 'Activate a package so customers can explore your service options.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-primary justify-center px-5 py-2.5 text-xs font-bold"
                  onClick={openCreateDialog}
                >
                  <PackagePlus className="size-4" />
                  Create package
                </button>
              </div>
            </div>
          </section>

          {sortedPackages.length > 0 ? (
            <section className="mt-2.5">
              <div className="rounded-[1.25rem] border border-white/58 bg-white/36 px-4 py-2.5 shadow-[0_10px_28px_rgba(35,24,30,0.045)] backdrop-blur-xl">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="shrink-0">
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Service offers
                      </p>

                      <h2 className="mt-0.5 text-base font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        Your service packages
                      </h2>
                    </div>

                    <p className="text-[0.65rem] font-medium text-[var(--color-charcoal)]/50">
                      Search, filter, update visibility, edit details, or remove packages.
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {(['all', 'active', 'inactive'] as const).map((filterOption) => {
                      const filterCount =
                        filterOption === 'all'
                          ? sortedPackages.length
                          : filterOption === 'active'
                            ? activePackageCount
                            : inactivePackageCount;

                      return (
                        <button
                          key={filterOption}
                          type="button"
                          onClick={() => setStatusFilter(filterOption)}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-black capitalize transition duration-300',
                            statusFilter === filterOption
                              ? 'bg-[var(--color-deep-plum)] text-white shadow-[0_7px_18px_rgba(91,61,82,0.16)]'
                              : 'border border-white/60 bg-white/38 text-[var(--color-charcoal)] hover:bg-white/58 hover:text-[var(--color-deep-plum)]',
                          ].join(' ')}
                        >
                          {filterOption}

                          <span
                            className={[
                              'rounded-full px-1.5 py-0.5 text-[0.56rem] font-black',
                              statusFilter === filterOption
                                ? 'bg-white/18 text-white'
                                : 'bg-white/55 text-[var(--color-charcoal)]/58',
                            ].join(' ')}
                          >
                            {filterCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="relative mt-2 block">
                  <span className="sr-only">Search packages</span>

                  <span className="pointer-events-none absolute inset-y-0 left-0 z-10 grid w-10 place-items-center">
                    <Search className="size-3.5 text-[var(--color-charcoal)]/38" />
                  </span>

                  <input
                    type="search"
                    className="form-field !min-h-9 !py-1.5 !pl-10 !pr-10 text-sm"
                    placeholder="Search packages by title, category, or description"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />

                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-1.5 z-10 my-auto grid size-6 place-items-center rounded-full text-[var(--color-charcoal)]/48 transition hover:bg-white/50 hover:text-[var(--color-deep-plum)]"
                      aria-label="Clear package search"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </label>
              </div>
            </section>
          ) : null}

          {sortedPackages.length === 0 ? (
            <section className="mt-4 overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/46 p-5 shadow-[0_18px_50px_rgba(31,27,29,0.07)] backdrop-blur-xl">
              <div className="grid gap-5 lg:grid-cols-[0.42fr_1fr] lg:items-center">
                <div className="grid min-h-48 place-items-center rounded-[1.4rem] border border-dashed border-[rgba(93,58,85,0.18)] bg-[linear-gradient(145deg,rgba(183,167,200,0.16),rgba(255,255,255,0.28))] p-5">
                  <div className="text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-[1.15rem] bg-white/48 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.08)]">
                      <PackagePlus className="size-5" />
                    </div>

                    <p className="mt-3 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                      No packages yet
                    </p>

                    <p className="mt-1 text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      Your catalogue starts here.
                    </p>
                  </div>
                </div>

                <div className="max-w-2xl">
                  <p className="section-eyebrow">Build your offer</p>

                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Create your first customer-ready package.
                  </h2>

                  <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/60">
                    Package your services into a clear offer with a category, pricing, and useful
                    context so customers know what they can request.
                  </p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[1.1rem] border border-white/56 bg-white/30 p-3">
                      <p className="text-xs font-black text-[var(--color-near-black)]">
                        Define the service
                      </p>

                      <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/50">
                        Give customers a clear package title.
                      </p>
                    </div>

                    <div className="rounded-[1.1rem] border border-white/56 bg-white/30 p-3">
                      <p className="text-xs font-black text-[var(--color-near-black)]">
                        Set expectations
                      </p>

                      <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/50">
                        Explain the service and starting price.
                      </p>
                    </div>

                    <div className="rounded-[1.1rem] border border-white/56 bg-white/30 p-3">
                      <p className="text-xs font-black text-[var(--color-near-black)]">
                        Publish when ready
                      </p>

                      <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/50">
                        Control whether customers can see it.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary mt-4 text-sm font-bold"
                    onClick={openCreateDialog}
                  >
                    <PackagePlus className="size-4" />
                    Create first package
                  </button>
                </div>
              </div>
            </section>
          ) : filteredPackages.length === 0 ? (
            <section className="mt-4 grid min-h-52 place-items-center rounded-[1.75rem] border border-white/60 bg-white/46 p-6 text-center shadow-[0_18px_50px_rgba(31,27,29,0.07)] backdrop-blur-xl">
              <div className="max-w-md">
                <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                  <Search className="size-5" />
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  No matching packages
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                  No packages match your current search and status filter.
                </p>

                <button
                  type="button"
                  className="btn-secondary mt-4 text-sm font-bold"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  <X className="size-4" />
                  Clear filters
                </button>
              </div>
            </section>
          ) : (
            <section
              className={[
                'mt-4 grid gap-4',
                filteredPackages.length === 1 ? 'max-w-3xl grid-cols-1' : 'md:grid-cols-2',
              ].join(' ')}
            >
              {filteredPackages.map((servicePackage) => (
                <PackageCard
                  key={servicePackage.id}
                  servicePackage={servicePackage}
                  isUpdatingStatus={updatingStatusPackageId === servicePackage.id}
                  isDeleting={deleteMutation.isPending && deletingPackage?.id === servicePackage.id}
                  onEdit={openEditDialog}
                  onToggleStatus={(selectedPackage) => {
                    statusMutation.reset();
                    statusMutation.mutate(selectedPackage);
                  }}
                  onDelete={(selectedPackage) => {
                    deleteMutation.reset();
                    setDeletingPackage(selectedPackage);
                  }}
                />
              ))}
            </section>
          )}

          {statusMutation.isError ? (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-5 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
            >
              {getErrorMessage(statusMutation.error, 'We could not update the package status.')}
            </div>
          ) : null}
        </main>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.54)] px-4 py-6 backdrop-blur-md sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-package-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateDialog();
            }
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
            <div
              className="relative w-full overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.96)] shadow-[0_34px_100px_rgba(27,17,23,0.34)] backdrop-blur-2xl"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 left-[18%] size-64 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl"
              />

              <div className="relative border-b border-[rgba(93,58,85,0.08)] px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="soft-chip w-fit text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)]">
                      <PackagePlus className="size-3.5" />
                      New service package
                    </div>

                    <h2
                      id="create-package-title"
                      className="mt-4 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl"
                    >
                      Create a customer-ready offer
                    </h2>

                    <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                      Define the service, starting price and customer visibility before adding this
                      package to your catalogue.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Close create package dialog"
                    disabled={createMutation.isPending}
                    onClick={closeCreateDialog}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 shadow-sm transition hover:bg-white/72 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>
              </div>

              <div className="relative max-h-[calc(100vh-10rem)] overflow-y-auto px-5 pb-6 sm:px-7">
                <PackageForm
                  mode="create"
                  form={createForm}
                  categories={categories}
                  isSubmitting={createMutation.isPending}
                  submissionError={
                    createMutation.isError
                      ? getErrorMessage(
                          createMutation.error,
                          'We could not create this service package.',
                        )
                      : null
                  }
                  onSubmit={(values) => createMutation.mutate(values)}
                  onCancel={closeCreateDialog}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateDiscardConfirmation && isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(31,27,29,0.60)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-package-create-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !createMutation.isPending) {
              setShowCreateDiscardConfirmation(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.98)] p-6 shadow-[0_34px_100px_rgba(27,17,23,0.38)] backdrop-blur-2xl sm:p-7"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-amber-100/55 blur-3xl"
            />

            <div className="relative grid size-12 place-items-center rounded-[1.1rem] bg-amber-50 text-amber-700">
              <CircleAlert className="size-5" />
            </div>

            <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-amber-700">
              Unsaved package
            </p>

            <h2
              id="discard-package-create-title"
              className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
            >
              Discard this new package?
            </h2>

            <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
              You have entered package information that has not been created yet. Closing now will
              permanently discard everything you entered in this form.
            </p>

            <div className="relative mt-5 rounded-[1.25rem] border border-amber-200/70 bg-amber-50/55 p-4">
              <p className="text-xs font-semibold leading-5 text-amber-800">
                Nothing has been saved to your service catalogue yet.
              </p>
            </div>

            <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-black"
                onClick={() => {
                  setShowCreateDiscardConfirmation(false);
                }}
              >
                Keep editing
              </button>

              <button
                type="button"
                onClick={discardCreateChanges}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
              >
                <X className="size-4 text-white" />
                <span className="text-white">Discard package</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingPackage ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.52)] px-4 py-6 backdrop-blur-md sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-package-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditDialog();
            }
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
            <div
              className="relative w-full overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.94)] shadow-[0_34px_100px_rgba(27,17,23,0.32)] backdrop-blur-2xl"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 left-[18%] size-64 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl"
              />

              <div className="relative border-b border-[rgba(93,58,85,0.08)] px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="soft-chip w-fit text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)]">
                      <Pencil className="size-3.5" />
                      Edit service package
                    </div>

                    <h2
                      id="edit-package-title"
                      className="mt-4 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl"
                    >
                      Refine package details
                    </h2>

                    <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                      Update the customer-facing package information. Visibility is managed
                      separately from the package card.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Close edit package dialog"
                    disabled={updateMutation.isPending}
                    onClick={closeEditDialog}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 shadow-sm transition hover:bg-white/72 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>
              </div>

              <div className="relative max-h-[calc(100vh-10rem)] overflow-y-auto px-5 pb-6 sm:px-7">
                <PackageForm
                  mode="edit"
                  form={editForm}
                  categories={categories}
                  isSubmitting={updateMutation.isPending}
                  submissionError={
                    updateMutation.isError
                      ? getErrorMessage(
                          updateMutation.error,
                          'We could not update this service package.',
                        )
                      : null
                  }
                  onSubmit={(values) => {
                    updateMutation.mutate({
                      packageId: editingPackage.id,
                      values,
                    });
                  }}
                  onCancel={closeEditDialog}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showEditDiscardConfirmation && editingPackage ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(31,27,29,0.58)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-package-edit-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updateMutation.isPending) {
              setShowEditDiscardConfirmation(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.97)] p-6 shadow-[0_34px_100px_rgba(27,17,23,0.34)] backdrop-blur-2xl sm:p-7"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-amber-100/50 blur-3xl"
            />

            <div className="relative grid size-12 place-items-center rounded-[1.1rem] bg-amber-50 text-amber-700">
              <CircleAlert className="size-5" />
            </div>

            <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-amber-700">
              Unsaved changes
            </p>

            <h2
              id="discard-package-edit-title"
              className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
            >
              Discard package changes?
            </h2>

            <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
              You changed{' '}
              <strong className="font-black text-[var(--color-near-black)]">
                {editingPackage.title}
              </strong>{' '}
              but have not saved the updates. Closing now will restore the last saved package
              details.
            </p>

            <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-black"
                onClick={() => {
                  setShowEditDiscardConfirmation(false);
                }}
              >
                Keep editing
              </button>

              <button
                type="button"
                onClick={discardEditChanges}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
              >
                <X className="size-4 text-white" />
                <span className="text-white">Discard changes</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DeletePackageDialog
        open={Boolean(deletingPackage)}
        servicePackage={deletingPackage}
        isDeleting={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) {
            return;
          }

          deleteMutation.reset();
          setDeletingPackage(null);
        }}
        onConfirm={() => {
          if (!deletingPackage) {
            return;
          }

          deleteMutation.mutate(deletingPackage.id);
        }}
      />
    </div>
  );
}
