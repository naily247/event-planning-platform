import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  ImagePlus,
  Images,
  LoaderCircle,
  Pencil,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  deleteVendorPortfolioItem,
  getVendorPortfolio,
  reorderVendorPortfolioItems,
  updateVendorPortfolioItem,
  uploadVendorPortfolioImage,
  type VendorPortfolioItem,
} from '../features/vendors/vendor.api';
import { PageBackButton } from '../components/navigation/PageBackButton';

const portfolioFormSchema = z.object({
  title: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 2, {
      message: 'Title must contain at least 2 characters.',
    })
    .refine((value) => value.length <= 120, {
      message: 'Title must not exceed 120 characters.',
    }),

  description: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 3, {
      message: 'Description must contain at least 3 characters.',
    })
    .refine((value) => value.length <= 500, {
      message: 'Description must not exceed 500 characters.',
    }),

  displayOrder: z
    .string()
    .trim()
    .refine((value) => {
      const order = Number(value);

      return Number.isInteger(order) && order >= 0 && order <= 1000;
    }, 'Display order must be a whole number between 0 and 1000.'),

  isFeatured: z.boolean(),
});

type PortfolioFormValues = z.infer<typeof portfolioFormSchema>;

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

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitialFormValues = (portfolioItem?: VendorPortfolioItem): PortfolioFormValues => ({
  title: portfolioItem?.title ?? '',
  description: portfolioItem?.description ?? '',
  displayOrder: String(portfolioItem?.displayOrder ?? 0),
  isFeatured: portfolioItem?.isFeatured ?? false,
});

export function VendorPortfolioPage() {
  const queryClient = useQueryClient();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
const [editingItem, setEditingItem] = useState<VendorPortfolioItem | null>(null);
const [deletingItem, setDeletingItem] = useState<VendorPortfolioItem | null>(null);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [showEditDiscardConfirmation, setShowEditDiscardConfirmation] = useState(false);

  const selectedFilePreviewUrl = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  const uploadForm = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: getInitialFormValues(),
  });

  const editForm = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: getInitialFormValues(),
  });

  const portfolioQuery = useQuery({
    queryKey: ['vendors', 'me', 'portfolio'],
    queryFn: getVendorPortfolio,
  });

  const sortedPortfolio = useMemo(() => {
    return [...(portfolioQuery.data ?? [])].sort((first, second) => {
      if (first.displayOrder !== second.displayOrder) {
        return first.displayOrder - second.displayOrder;
      }

      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }, [portfolioQuery.data]);

  useEffect(() => {
    if (!editingItem) {
      return;
    }

    editForm.reset(getInitialFormValues(editingItem));
  }, [editForm, editingItem]);

  useEffect(() => {
    return () => {
      if (selectedFilePreviewUrl) {
        URL.revokeObjectURL(selectedFilePreviewUrl);
      }
    };
  }, [selectedFilePreviewUrl]);

  const uploadMutation = useMutation({
    mutationFn: async ({ values, file }: { values: PortfolioFormValues; file: File }) =>
      uploadVendorPortfolioImage({
        file,
        title: values.title.trim() || undefined,
        description: values.description.trim() || undefined,
        displayOrder: Number(values.displayOrder),
        isFeatured: values.isFeatured,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'portfolio'],
      });

      uploadForm.reset(getInitialFormValues());
      setSelectedFile(null);
      setIsUploadDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      portfolioItemId,
      values,
    }: {
      portfolioItemId: string;
      values: PortfolioFormValues;
    }) =>
      updateVendorPortfolioItem(portfolioItemId, {
        title: values.title.trim() || null,
        description: values.description.trim() || null,
        displayOrder: Number(values.displayOrder),
        isFeatured: values.isFeatured,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'portfolio'],
      });

      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendorPortfolioItem,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'portfolio'],
      });

      setDeletingItem(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({
      portfolioItemId,
      direction,
    }: {
      portfolioItemId: string;
      direction: 'up' | 'down';
    }) => {
      const currentIndex = sortedPortfolio.findIndex((item) => item.id === portfolioItemId);

      if (currentIndex === -1) {
        return;
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sortedPortfolio.length) {
        return;
      }

      const reorderedItems = [...sortedPortfolio];

      const currentItem = reorderedItems[currentIndex];
      const targetItem = reorderedItems[targetIndex];

      reorderedItems[currentIndex] = targetItem;
      reorderedItems[targetIndex] = currentItem;

      await reorderVendorPortfolioItems({
        items: reorderedItems.map((item, index) => ({
          portfolioItemId: item.id,
          displayOrder: index,
        })),
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'portfolio'],
      });
    },
  });

  const handleSelectedUploadFile = (file: File | null) => {
    if (file && !file.type.startsWith('image/')) {
      setSelectedFile(null);

      uploadForm.setError('root', {
        type: 'manual',
        message: 'Choose a valid image file.',
      });

      return;
    }

    setSelectedFile(file);
    uploadForm.clearErrors('root');
  };

  const openUploadDialog = () => {
    uploadMutation.reset();
    uploadForm.clearErrors();
    uploadForm.reset(getInitialFormValues());
    setSelectedFile(null);
    setIsUploadDialogOpen(true);
  };

  const closeUploadDialog = () => {
    if (uploadMutation.isPending) {
      return;
    }

    uploadMutation.reset();
    uploadForm.clearErrors();
    setSelectedFile(null);
    setIsUploadDialogOpen(false);
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
  setEditingItem(null);
};

const discardEditChanges = () => {
  if (updateMutation.isPending) {
    return;
  }

  setShowEditDiscardConfirmation(false);
  updateMutation.reset();
  editForm.clearErrors();

  if (editingItem) {
    editForm.reset(getInitialFormValues(editingItem));
  }

  setEditingItem(null);
};

  const onUpload = uploadForm.handleSubmit((values) => {
    if (!selectedFile) {
      uploadForm.setError('root', {
        type: 'manual',
        message: 'Choose an image before uploading.',
      });

      return;
    }

    uploadMutation.mutate({
      values,
      file: selectedFile,
    });
  });

  const onEdit = editForm.handleSubmit((values) => {
    if (!editingItem) {
      return;
    }

    updateMutation.mutate({
      portfolioItemId: editingItem.id,
      values,
    });
  });

  if (portfolioQuery.isLoading) {
    return (
      <div className="workspace-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading your portfolio
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Gathering your uploaded work and preparing the portfolio manager.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (portfolioQuery.isError || !portfolioQuery.data) {
    return (
      <div className="workspace-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <CircleAlert className="mx-auto size-10 text-[var(--color-rosewood)]" />

            <h1 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Portfolio unavailable
            </h1>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(portfolioQuery.error, 'We could not load your vendor portfolio.')}
            </p>

            <button
              type="button"
              className="btn-primary mt-6 text-sm font-bold"
              onClick={() => {
                void portfolioQuery.refetch();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const featuredCount = sortedPortfolio.filter((item) => item.isFeatured).length;

  const portfolioCompletion = Math.min(100, sortedPortfolio.length * 12 + featuredCount * 8);

  const portfolioHealth =
    portfolioCompletion >= 85
      ? {
          label: 'Excellent',
          message: 'Your portfolio presents a strong and organised customer experience.',
        }
      : portfolioCompletion >= 55
        ? {
            label: 'Growing',
            message: 'Your portfolio is taking shape. A few more strong examples will improve it.',
          }
        : {
            label: 'Getting started',
            message: 'Add more examples and feature your strongest work to build customer trust.',
          };

  return (
    <div className="workspace-shell relative">
      <div className="workspace-container max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="shrink-0" />

              <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                  Vendor workspace
                </p>

                <h1 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                  Portfolio management
                </h1>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary w-fit text-sm font-bold"
              onClick={openUploadDialog}
            >
              <ImagePlus className="size-4" />
              Upload image
            </button>
          </div>
        </header>

        <main className="pb-10 pt-6">
          <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_24px_70px_rgba(64,42,51,0.10)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[rgba(183,167,200,0.23)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 left-[32%] size-72 rounded-full bg-[rgba(142,92,103,0.10)] blur-3xl"
            />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:p-10">
              <div>
                <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <Images className="size-4" />
                  Service portfolio
                </div>

                <h2 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                  Show customers the work that represents you best.
                </h2>

                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                  Curate real examples of your services, organise their display order, and highlight
                  the work customers should notice first.
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  <span className="soft-chip text-xs font-black">
                    <Images className="size-4" />
                    {sortedPortfolio.length} {sortedPortfolio.length === 1 ? 'item' : 'items'}
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <Star className="size-4" />
                    {featuredCount} featured
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <Sparkles className="size-4" />
                    {portfolioHealth.label}
                  </span>
                </div>
              </div>

              <article className="relative overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/52 p-5 shadow-[0_18px_52px_rgba(31,27,29,0.08)] backdrop-blur-2xl sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.17)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Portfolio health
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        {portfolioHealth.label}
                      </h3>
                    </div>

                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <Sparkles className="size-5" />
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                    {portfolioHealth.message}
                  </p>

                  <div className="mt-6 rounded-[1.35rem] border border-white/62 bg-white/34 p-4">
                    <div className="flex items-end justify-between gap-5">
                      <div>
                        <p className="text-[0.67rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                          Portfolio completion
                        </p>

                        <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-[var(--color-near-black)]">
                          {portfolioCompletion}%
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black text-[var(--color-deep-plum)]">
                          {sortedPortfolio.length}
                        </p>

                        <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/44">
                          uploaded works
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.09)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),var(--color-valendor-lilac))] transition-[width] duration-700"
                        style={{
                          width: `${portfolioCompletion}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2">
                    <div className="flex items-center gap-3 text-xs font-bold leading-5 text-[var(--color-charcoal)]/55">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(91,61,82,0.10)] text-[var(--color-deep-plum)]">
                        <Star className="size-3.5" />
                      </span>
                      Feature the work that best represents your service quality.
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold leading-5 text-[var(--color-charcoal)]/55">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(91,61,82,0.10)] text-[var(--color-deep-plum)]">
                        <Images className="size-3.5" />
                      </span>
                      Keep enough variety for customers to understand your style.
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          {sortedPortfolio.length === 0 ? (
            <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/60 bg-white/46 p-6 shadow-[0_20px_56px_rgba(31,27,29,0.07)] backdrop-blur-xl sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.58fr_1fr] lg:items-center">
                <div className="grid min-h-72 place-items-center rounded-[1.75rem] border border-dashed border-[rgba(93,58,85,0.18)] bg-[linear-gradient(145deg,rgba(183,167,200,0.16),rgba(255,255,255,0.28))] p-6">
                  <div className="text-center">
                    <div className="mx-auto grid size-16 place-items-center rounded-[1.4rem] bg-white/48 text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.08)]">
                      <ImagePlus className="size-7" />
                    </div>

                    <p className="mt-5 text-sm font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                      Portfolio empty
                    </p>

                    <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      Your work belongs here.
                    </p>
                  </div>
                </div>

                <div className="max-w-2xl">
                  <p className="section-eyebrow">Build customer confidence</p>

                  <h2 className="section-title">Start with your strongest work.</h2>

                  <p className="section-description max-w-xl">
                    Upload a small, intentional collection of work that helps customers understand
                    your quality, style, and the events or services your business can deliver.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.35rem] border border-white/56 bg-white/30 p-4">
                      <Star className="size-5 text-[var(--color-deep-plum)]" />

                      <p className="mt-3 text-sm font-black text-[var(--color-near-black)]">
                        Feature your best example
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                        Lead with the work that makes the strongest first impression.
                      </p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/56 bg-white/30 p-4">
                      <Images className="size-5 text-[var(--color-deep-plum)]" />

                      <p className="mt-3 text-sm font-black text-[var(--color-near-black)]">
                        Add meaningful variety
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                        Show different services, event styles, settings, or outcomes.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary mt-7 text-sm font-bold"
                    onClick={openUploadDialog}
                  >
                    <Upload className="size-4" />
                    Upload your first image
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="section-eyebrow">Published work</p>

                  <h2 className="section-title">Your portfolio collection</h2>

                  <p className="section-description">
                    Reorder, feature, edit, or remove the work customers see on your public profile.
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="soft-chip text-xs font-black">
                    <Images className="size-4" />
                    {sortedPortfolio.length} total
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <Star className="size-4" />
                    {featuredCount} featured
                  </span>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sortedPortfolio.map((portfolioItem, index) => (
                  <article
                    key={portfolioItem.id}
                    className="group flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-white/58 bg-white/42 p-3 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_65px_rgba(35,24,30,0.12)]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[var(--color-light-champagne)]">
                      <img
                        src={portfolioItem.imageUrl}
                        alt={portfolioItem.title ?? `Vendor portfolio item ${index + 1}`}
                        className="absolute inset-0 size-full object-cover transition duration-700 ease-out group-hover:scale-[1.045]"
                      />

                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,12,17,0.04)_20%,rgba(20,12,17,0.12)_58%,rgba(20,12,17,0.78)_100%)]" />

                      <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-white/32 bg-black/20 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
                          Work {String(index + 1).padStart(2, '0')}
                        </span>

                        {portfolioItem.isFeatured ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/34 bg-white/22 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-white backdrop-blur-xl">
                            <Star className="size-3.5 fill-white" />
                            Featured
                          </span>
                        ) : null}
                      </div>

                      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 text-white">
                          <p className="text-[0.64rem] font-black uppercase tracking-[0.15em] text-white/60">
                            Display order
                          </p>

                          <p className="mt-1 text-sm font-black">Position {index + 1}</p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            className="grid size-9 place-items-center rounded-full border border-white/34 bg-black/18 text-white backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Move portfolio item up"
                            disabled={index === 0 || reorderMutation.isPending}
                            onClick={() => {
                              reorderMutation.mutate({
                                portfolioItemId: portfolioItem.id,
                                direction: 'up',
                              });
                            }}
                          >
                            <ArrowUp className="size-4" />
                          </button>

                          <button
                            type="button"
                            className="grid size-9 place-items-center rounded-full border border-white/34 bg-black/18 text-white backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Move portfolio item down"
                            disabled={
                              index === sortedPortfolio.length - 1 || reorderMutation.isPending
                            }
                            onClick={() => {
                              reorderMutation.mutate({
                                portfolioItemId: portfolioItem.id,
                                direction: 'down',
                              });
                            }}
                          >
                            <ArrowDown className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[0.65rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                            Portfolio item
                          </p>

                          <h3 className="mt-1.5 line-clamp-2 text-xl font-black leading-tight tracking-[-0.035em] text-[var(--color-near-black)]">
                            {portfolioItem.title ?? `Portfolio item ${index + 1}`}
                          </h3>
                        </div>

                        {portfolioItem.isFeatured ? (
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                            <Star className="size-4 fill-current" />
                          </div>
                        ) : null}
                      </div>

                      {portfolioItem.description ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-charcoal)]/58">
                          {portfolioItem.description}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm italic leading-6 text-[var(--color-charcoal)]/40">
                          Add a short description to give customers useful context.
                        </p>
                      )}

                      <div className="mt-auto pt-5">
                        <div className="flex items-center justify-between gap-4 border-t border-[rgba(93,58,85,0.08)] pt-4">
                          <div className="min-w-0">
                            <p
                              className="truncate text-xs font-bold text-[var(--color-charcoal)]/48"
                              title={portfolioItem.originalName}
                            >
                              {portfolioItem.originalName}
                            </p>

                            <p className="mt-1 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/34">
                              {formatFileSize(portfolioItem.fileSize)}
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/38 px-3.5 text-xs font-black text-[var(--color-charcoal)] transition hover:-translate-y-0.5 hover:text-[var(--color-deep-plum)]"
                              onClick={() => {
  updateMutation.reset();
  setShowEditDiscardConfirmation(false);
  setEditingItem(portfolioItem);
}}
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </button>

                            <button
                              type="button"
                              className="grid size-9 place-items-center rounded-full border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] transition hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.14)]"
                              aria-label="Delete portfolio item"
                              onClick={() => {
                                deleteMutation.reset();
                                setDeletingItem(portfolioItem);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {reorderMutation.isError ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-5 py-4 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
            >
              {getErrorMessage(reorderMutation.error, 'We could not reorder your portfolio.')}
            </div>
          ) : null}
        </main>
      </div>

      {isUploadDialogOpen ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.52)] px-4 py-6 backdrop-blur-md sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-portfolio-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUploadDialog();
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
                      <ImagePlus className="size-3.5" />
                      Add portfolio work
                    </div>

                    <h2
                      id="upload-portfolio-title"
                      className="mt-4 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl"
                    >
                      Upload portfolio image
                    </h2>

                    <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                      Add a strong example of your work and provide enough context for customers to
                      understand what they are seeing.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Close portfolio upload"
                    disabled={uploadMutation.isPending}
                    onClick={closeUploadDialog}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 shadow-sm transition hover:bg-white/72 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>
              </div>

              <form onSubmit={onUpload}>
                <div className="relative max-h-[calc(100vh-14rem)] overflow-y-auto px-5 py-6 sm:px-7">
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Portfolio image
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Choose a clear, high-quality image that represents your actual work.
                        </p>
                      </div>

                      {selectedFile ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-emerald-700">
                          <Check className="size-3" />
                          Ready
                        </span>
                      ) : null}
                    </div>

                    <input
                      id="portfolio-image-upload"
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      disabled={uploadMutation.isPending}
                      onChange={(event) => {
                        handleSelectedUploadFile(event.target.files?.[0] ?? null);
                        event.target.value = '';
                      }}
                    />

                    {selectedFile && selectedFilePreviewUrl ? (
                      <div className="overflow-hidden rounded-[1.7rem] border border-white/66 bg-white/38 p-3 shadow-[0_18px_48px_rgba(35,24,30,0.08)]">
                        <div className="group relative aspect-[16/9] overflow-hidden rounded-[1.4rem] bg-[var(--color-light-champagne)]">
                          <img
                            src={selectedFilePreviewUrl}
                            alt="Selected portfolio preview"
                            className="absolute inset-0 size-full object-cover"
                          />

                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,12,17,0.03)_35%,rgba(20,12,17,0.78)_100%)]" />

                          <div className="absolute inset-x-4 bottom-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0 text-white">
                              <p className="truncate text-sm font-black" title={selectedFile.name}>
                                {selectedFile.name}
                              </p>

                              <p className="mt-1 text-xs font-semibold text-white/68">
                                {formatFileSize(selectedFile.size)}
                                {selectedFile.type ? ` · ${selectedFile.type}` : ''}
                              </p>
                            </div>

                            <div className="flex shrink-0 gap-2">
                              <label
                                htmlFor="portfolio-image-upload"
                                className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/32 bg-black/18 px-4 text-xs font-black text-white backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-deep-plum)]"
                              >
                                <ImagePlus className="size-4" />
                                Replace
                              </label>

                              <button
                                type="button"
                                aria-label="Remove selected image"
                                disabled={uploadMutation.isPending}
                                onClick={() => handleSelectedUploadFile(null)}
                                className="grid size-10 place-items-center rounded-full border border-white/32 bg-black/18 text-white backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-muted-burgundy)] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="portfolio-image-upload"
                        className="group flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-[1.7rem] border border-dashed border-[rgba(91,61,82,0.24)] bg-white/28 px-6 py-9 text-center transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.42)] hover:bg-white/46 hover:shadow-[0_18px_46px_rgba(35,24,30,0.07)]"
                        onDragOver={(event) => {
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();

                          if (uploadMutation.isPending) {
                            return;
                          }

                          handleSelectedUploadFile(event.dataTransfer.files?.[0] ?? null);
                        }}
                      >
                        <div className="grid size-14 place-items-center rounded-[1.25rem] bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)] transition duration-300 group-hover:scale-105">
                          <Upload className="size-6" />
                        </div>

                        <p className="mt-4 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                          Drop an image here
                        </p>

                        <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-[var(--color-charcoal)]/54">
                          Or browse your device and choose the work you want customers to see.
                        </p>

                        <span className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/65 bg-white/48 px-5 text-xs font-black text-[var(--color-deep-plum)] shadow-sm">
                          <ImagePlus className="size-4" />
                          Choose image
                        </span>

                        <p className="mt-3 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/38">
                          JPG, PNG, WebP and other supported image formats
                        </p>
                      </label>
                    )}
                  </div>

                  <div className="my-6 h-px bg-[rgba(93,58,85,0.08)]" />

                  <div className="grid gap-5">
                    <label className="block">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Title
                        </span>

                        <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                          {(uploadForm.watch('title') ?? '').length}/120
                        </span>
                      </div>

                      <input
                        className="form-field bg-white/42"
                        type="text"
                        placeholder="Elegant Garden Reception"
                        disabled={uploadMutation.isPending}
                        {...uploadForm.register('title')}
                      />

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                        Give customers a short, memorable title for this work.
                      </p>

                      {uploadForm.formState.errors.title ? (
                        <span className="field-error mt-2 block">
                          {uploadForm.formState.errors.title.message}
                        </span>
                      ) : null}
                    </label>

                    <label className="block">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Description
                        </span>

                        <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                          {(uploadForm.watch('description') ?? '').length}/500
                        </span>
                      </div>

                      <textarea
                        className="form-field min-h-32 resize-y bg-white/42 leading-7"
                        placeholder="Describe the event, venue, styling, lighting, or the services showcased in this image..."
                        disabled={uploadMutation.isPending}
                        {...uploadForm.register('description')}
                      />

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                        Add enough context for customers to understand what this image demonstrates.
                      </p>

                      {uploadForm.formState.errors.description ? (
                        <span className="field-error mt-2 block">
                          {uploadForm.formState.errors.description.message}
                        </span>
                      ) : null}
                    </label>

                    <div className="grid gap-4 sm:grid-cols-[0.42fr_0.58fr]">
                      <label className="block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                          Display order
                        </span>

                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                          Lower numbers appear first.
                        </p>

                        <input
                          className="form-field mt-2 bg-white/42"
                          type="number"
                          min="0"
                          max="1000"
                          step="1"
                          disabled={uploadMutation.isPending}
                          {...uploadForm.register('displayOrder')}
                        />

                        {uploadForm.formState.errors.displayOrder ? (
                          <span className="field-error mt-2 block">
                            {uploadForm.formState.errors.displayOrder.message}
                          </span>
                        ) : null}
                      </label>

                      <label className="group relative flex cursor-pointer overflow-hidden rounded-[1.45rem] border border-white/60 bg-white/32 p-4 transition duration-300 hover:border-[rgba(91,61,82,0.28)] hover:bg-white/46">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          disabled={uploadMutation.isPending}
                          {...uploadForm.register('isFeatured')}
                        />

                        <div className="flex w-full items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--color-rosewood)]">
                              <Star className="size-3.5" />
                              Featured work
                            </div>

                            <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                              Highlight this image
                            </p>

                            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                              Give this work extra prominence in your portfolio.
                            </p>
                          </div>

                          <div className="flex h-7 w-12 shrink-0 items-center rounded-full bg-[rgba(150,150,150,0.28)] p-1 transition duration-300 peer-checked:bg-[var(--color-deep-plum)]">
                            <div className="size-5 rounded-full bg-white shadow-md transition duration-300 peer-checked:translate-x-5" />
                          </div>
                        </div>

                        <div className="pointer-events-none absolute inset-0 rounded-[1.45rem] border-2 border-transparent transition duration-300 peer-checked:border-[rgba(91,61,82,0.24)]" />
                      </label>
                    </div>
                  </div>

                  {uploadForm.formState.errors.root?.message ? (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]" />

                      <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                        {uploadForm.formState.errors.root.message}
                      </p>
                    </div>
                  ) : null}

                  {uploadMutation.isError ? (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]" />

                      <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                        {getErrorMessage(
                          uploadMutation.error,
                          'We could not upload this portfolio image.',
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="relative border-t border-[rgba(93,58,85,0.08)] bg-white/38 px-5 py-4 backdrop-blur-xl sm:px-7">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="hidden max-w-sm text-xs font-semibold leading-5 text-[var(--color-charcoal)]/42 sm:block">
                      Your image and details will be added directly to your customer-facing
                      portfolio.
                    </p>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-black"
                        disabled={uploadMutation.isPending}
                        onClick={closeUploadDialog}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.20)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                        disabled={uploadMutation.isPending}
                      >
                        {uploadMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin text-white" />
                        ) : (
                          <Upload className="size-4 text-white" />
                        )}

                        <span className="text-white">
                          {uploadMutation.isPending ? 'Uploading...' : 'Upload image'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.52)] px-4 py-6 backdrop-blur-md sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-portfolio-title"
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

              <div className="relative border-b border-[rgba(93,58,85,0.08)] px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="soft-chip w-fit text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)]">
                      <Pencil className="size-3.5" />
                      Edit portfolio item
                    </div>

                    <h2
                      id="edit-portfolio-title"
                      className="mt-4 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl"
                    >
                      Refine portfolio details
                    </h2>

                    <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                      Update the customer-facing title, description, display position, or featured
                      state without replacing the uploaded image.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Close portfolio editor"
                    disabled={updateMutation.isPending}
                    onClick={closeEditDialog}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 shadow-sm transition hover:bg-white/72 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>
              </div>

              <form onSubmit={onEdit}>
                <div className="relative max-h-[calc(100vh-14rem)] overflow-y-auto px-5 py-6 sm:px-7">
                  <div className="overflow-hidden rounded-[1.55rem] border border-white/60 bg-white/34 p-3">
                    <div className="grid gap-4 sm:grid-cols-[8rem_1fr] sm:items-center">
                      <img
                        src={editingItem.imageUrl}
                        alt={editingItem.title ?? editingItem.originalName}
                        className="aspect-[4/3] w-full rounded-[1.2rem] object-cover sm:h-24"
                      />

                      <div className="min-w-0">
                        <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-rosewood)]">
                          Current image
                        </p>

                        <p
                          className="mt-2 truncate text-sm font-black text-[var(--color-near-black)]"
                          title={editingItem.originalName}
                        >
                          {editingItem.originalName}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/44">
                          {formatFileSize(editingItem.fileSize)}
                        </p>

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Image replacement is not part of this edit action. Upload a new portfolio
                          item if you need different artwork.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="my-6 h-px bg-[rgba(93,58,85,0.08)]" />

                  <div className="grid gap-5">
                    <label className="block">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Title
                        </span>

                        <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                          {(editForm.watch('title') ?? '').length}/120
                        </span>
                      </div>

                      <input
                        className="form-field bg-white/42"
                        type="text"
                        placeholder="Elegant Garden Reception"
                        disabled={updateMutation.isPending}
                        {...editForm.register('title')}
                      />

                      <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/46">
                        A clear title makes this work easier for customers to recognise.
                      </p>

                      {editForm.formState.errors.title ? (
                        <span className="field-error mt-2 block">
                          {editForm.formState.errors.title.message}
                        </span>
                      ) : null}
                    </label>

                    <label className="block">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Description
                        </span>

                        <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                          {(editForm.watch('description') ?? '').length}/500
                        </span>
                      </div>

                      <textarea
                        className="form-field min-h-32 resize-y bg-white/42 leading-7"
                        placeholder="Describe what makes this project unique..."
                        disabled={updateMutation.isPending}
                        {...editForm.register('description')}
                      />

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                        Update the context behind this work whenever your portfolio evolves.
                      </p>

                      {editForm.formState.errors.description ? (
                        <span className="field-error mt-2 block">
                          {editForm.formState.errors.description.message}
                        </span>
                      ) : null}
                    </label>

                    <div className="grid gap-4 sm:grid-cols-[0.42fr_0.58fr]">
                      <label className="block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                          Display order
                        </span>

                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                          Lower numbers appear first.
                        </p>

                        <input
                          className="form-field mt-2 bg-white/42"
                          type="number"
                          min="0"
                          max="1000"
                          step="1"
                          disabled={updateMutation.isPending}
                          {...editForm.register('displayOrder')}
                        />

                        {editForm.formState.errors.displayOrder ? (
                          <span className="field-error mt-2 block">
                            {editForm.formState.errors.displayOrder.message}
                          </span>
                        ) : null}
                      </label>

                      <label className="group relative flex cursor-pointer overflow-hidden rounded-[1.45rem] border border-white/60 bg-white/32 p-4 transition duration-300 hover:border-[rgba(91,61,82,0.28)] hover:bg-white/46">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          disabled={updateMutation.isPending}
                          {...editForm.register('isFeatured')}
                        />

                        <div className="flex w-full items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--color-rosewood)]">
                              <Star className="size-3.5" />
                              Featured work
                            </div>

                            <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                              Highlight this image
                            </p>

                            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                              Give this item extra prominence in your customer-facing portfolio.
                            </p>
                          </div>

                          <div className="flex h-7 w-12 shrink-0 items-center rounded-full bg-[rgba(150,150,150,0.28)] p-1 transition duration-300 peer-checked:bg-[var(--color-deep-plum)]">
                            <div className="size-5 rounded-full bg-white shadow-md transition duration-300 peer-checked:translate-x-5" />
                          </div>
                        </div>

                        <div className="pointer-events-none absolute inset-0 rounded-[1.45rem] border-2 border-transparent transition duration-300 peer-checked:border-[rgba(91,61,82,0.24)]" />
                      </label>
                    </div>
                  </div>
{!editForm.formState.isDirty ? (
  <div className="flex items-start gap-3 rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
      <Check className="size-4" />
    </div>

    <div>
      <p className="text-sm font-black text-[var(--color-near-black)]">
        No unsaved changes
      </p>

      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
        Update at least one portfolio detail before saving.
      </p>
    </div>
  </div>
) : (
  <div className="flex items-start gap-3 rounded-[1.2rem] border border-amber-200/70 bg-amber-50/65 p-4">
    <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />

    <div>
      <p className="text-sm font-black text-amber-900">
        You have unsaved changes
      </p>

      <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
        Save these updates before closing the editor, or discard them if you no longer want them.
      </p>
    </div>
  </div>
)}

                  {updateMutation.isError ? (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]" />

                      <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                        {getErrorMessage(
                          updateMutation.error,
                          'We could not update this portfolio item.',
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="relative border-t border-[rgba(93,58,85,0.08)] bg-white/38 px-5 py-4 backdrop-blur-xl sm:px-7">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-black"
                      disabled={updateMutation.isPending}
                      onClick={closeEditDialog}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.20)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                      disabled={updateMutation.isPending || !editForm.formState.isDirty}
                    >
                      {updateMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin text-white" />
                      ) : (
                        <Save className="size-4 text-white" />
                      )}

                      <span className="text-white">
  {updateMutation.isPending
    ? 'Saving...'
    : editForm.formState.isDirty
      ? 'Save changes'
      : 'No changes to save'}
</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
{showEditDiscardConfirmation && editingItem ? (
  <div
    className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby="discard-portfolio-edit-title"
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
        className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
      />

      <div className="relative grid size-12 place-items-center rounded-[1.1rem] bg-amber-50 text-amber-700">
        <CircleAlert className="size-5" />
      </div>

      <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-amber-700">
        Unsaved changes
      </p>

      <h2
        id="discard-portfolio-edit-title"
        className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
      >
        Discard your changes?
      </h2>

      <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
        You changed this portfolio item but have not saved the updates. Closing the editor now will
        restore the last saved version.
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
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
          onClick={discardEditChanges}
        >
          <Trash2 className="size-4 text-white" />

          <span className="text-white">Discard changes</span>
        </button>
      </div>
    </div>
  </div>
) : null}

      {deletingItem ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.52)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-portfolio-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteMutation.isPending) {
              setDeletingItem(null);
              deleteMutation.reset();
            }
          }}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.96)] p-6 shadow-[0_34px_100px_rgba(27,17,23,0.32)] backdrop-blur-2xl sm:p-7"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/55 blur-3xl"
            />

            <div className="relative grid size-12 place-items-center rounded-[1.1rem] bg-red-50 text-red-700">
              <Trash2 className="size-5" />
            </div>

            <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-red-500">
              Permanent action
            </p>

            <h2
              id="delete-portfolio-title"
              className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
            >
              Delete this portfolio image?
            </h2>

            <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
              This permanently removes{' '}
              <strong className="font-black text-[var(--color-near-black)]">
                {deletingItem.title ?? deletingItem.originalName}
              </strong>{' '}
              from your portfolio and its connected Cloudinary storage.
            </p>

            <div className="relative mt-5 overflow-hidden rounded-[1.35rem] border border-white/62 bg-white/38 p-3">
              <div className="grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-center">
                <img
                  src={deletingItem.imageUrl}
                  alt={deletingItem.title ?? deletingItem.originalName}
                  className="aspect-[4/3] w-full rounded-[1.05rem] object-cover sm:h-20"
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                    {deletingItem.title ?? 'Untitled portfolio work'}
                  </p>

                  <p
                    className="mt-1 truncate text-xs font-semibold text-[var(--color-charcoal)]/46"
                    title={deletingItem.originalName}
                  >
                    {deletingItem.originalName}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/36">
                    {formatFileSize(deletingItem.fileSize)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-5 flex items-start gap-3 rounded-[1.2rem] border border-red-200/80 bg-red-50/70 p-4">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-700" />

              <p className="text-xs font-semibold leading-5 text-red-800">
                This action cannot be undone. Upload the image again later if you want it restored.
              </p>
            </div>

            {deleteMutation.isError ? (
              <div
                role="alert"
                className="relative mt-4 flex items-start gap-3 rounded-[1.2rem] border border-red-200 bg-red-50 p-4"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-700" />

                <p className="text-sm font-bold leading-6 text-red-800">
                  {getErrorMessage(
                    deleteMutation.error,
                    'We could not delete this portfolio item.',
                  )}
                </p>
              </div>
            ) : null}

            <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-black"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setDeletingItem(null);
                  deleteMutation.reset();
                }}
              >
                Keep image
              </button>

              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deletingItem.id);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(185,28,28,0.16)] transition hover:-translate-y-0.5 hover:bg-red-800 hover:!text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {deleteMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin text-white" />
                ) : (
                  <Trash2 className="size-4 text-white" />
                )}

                <span className="text-white">
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete permanently'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
