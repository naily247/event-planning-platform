import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
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
import { Link } from 'react-router-dom';
import { z } from 'zod';
import {
  deleteVendorPortfolioItem,
  getVendorPortfolio,
  reorderVendorPortfolioItems,
  updateVendorPortfolioItem,
  uploadVendorPortfolioImage,
  type VendorPortfolioItem,
} from '../features/vendors/vendor.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';
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

    updateMutation.reset();
    editForm.clearErrors();
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
    <div className="workspace-shell">
      <div className="workspace-container max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="shrink-0" />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <p className="mt-1 font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                Portfolio management
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary text-sm font-bold"
            onClick={openUploadDialog}
          >
            <ImagePlus className="size-4" />
            Upload image
          </button>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <main className="py-10">
          <section className="grid gap-6 lg:grid-cols-[1fr_0.38fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Images className="size-4" />
                Portfolio
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Show customers what your business does best.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-charcoal)]/70">
                Upload selected work, add meaningful context, organise the display order, and
                feature the images that best represent your services.
              </p>
            </div>

            <article className="glass-card overflow-hidden p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                    Portfolio health
                  </p>

                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    {portfolioHealth.label}
                  </h2>
                </div>

                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-5" />
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-[var(--color-charcoal)]/60">
                {portfolioHealth.message}
              </p>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/48">
                    Completion
                  </p>

                  <p className="text-sm font-black text-[var(--color-deep-plum)]">
                    {portfolioCompletion}%
                  </p>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/42">
                  <div
                    className="h-full rounded-full bg-[var(--color-deep-plum)] transition-[width] duration-700"
                    style={{
                      width: `${portfolioCompletion}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[1.35rem] border border-white/50 bg-white/28 p-4">
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {sortedPortfolio.length}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/48">
                    Portfolio items
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-white/50 bg-white/28 p-4">
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {featuredCount}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/48">
                    Featured works
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-white/48 pt-5">
                <div className="flex items-center gap-3 text-sm font-bold text-[var(--color-charcoal)]/62">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[rgba(91,61,82,0.12)] text-[var(--color-deep-plum)]">
                    <Star className="size-3.5" />
                  </span>
                  Feature your strongest customer-facing work
                </div>

                <div className="flex items-center gap-3 text-sm font-bold text-[var(--color-charcoal)]/62">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[rgba(91,61,82,0.12)] text-[var(--color-deep-plum)]">
                    <Images className="size-3.5" />
                  </span>
                  Add varied examples across your services
                </div>
              </div>
            </article>
          </section>

          {sortedPortfolio.length === 0 ? (
            <section className="glass-card relative mt-8 overflow-hidden p-6 sm:p-8 lg:p-10">
              <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl" />

              <div className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-[rgba(221,188,163,0.16)] blur-3xl" />

              <div className="relative grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div className="rounded-[2rem] border border-white/55 bg-white/26 p-4 shadow-[0_20px_60px_rgba(35,24,30,0.08)]">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-[rgba(183,167,200,0.22)] p-4">
                      <div className="flex h-full flex-col justify-between rounded-[1.1rem] border border-white/48 bg-white/24 p-4">
                        <div className="grid size-10 place-items-center rounded-xl bg-white/42 text-[var(--color-deep-plum)]">
                          <Images className="size-5" />
                        </div>

                        <div>
                          <div className="h-2.5 w-16 rounded-full bg-white/60" />
                          <div className="mt-2 h-2 w-10 rounded-full bg-white/38" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="aspect-square rounded-[1.4rem] border border-white/50 bg-[rgba(221,188,163,0.2)] p-4">
                        <div className="grid h-full place-items-center rounded-[1.05rem] border border-dashed border-white/64 bg-white/22 text-[var(--color-rosewood)]">
                          <Star className="size-6" />
                        </div>
                      </div>

                      <div className="aspect-square rounded-[1.4rem] border border-white/50 bg-white/24 p-4">
                        <div className="grid h-full place-items-center rounded-[1.05rem] bg-[rgba(91,61,82,0.1)] text-[var(--color-deep-plum)]">
                          <ImagePlus className="size-7" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.35rem] border border-white/50 bg-white/28 px-4 py-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                        Your work
                      </p>

                      <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                        Ready to be discovered
                      </p>
                    </div>

                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.2)] text-[var(--color-deep-plum)]">
                      <Sparkles className="size-5" />
                    </div>
                  </div>
                </div>

                <div className="max-w-2xl">
                  <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)]">
                    <ImagePlus className="size-4" />
                    Start your portfolio
                  </div>

                  <h2 className="mt-6 text-4xl font-black leading-tight tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                    Turn your best work into customer confidence.
                  </h2>

                  <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-charcoal)]/64">
                    Add a few carefully selected images that show your style, service quality, and
                    the kinds of events you can deliver.
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-[1.3rem] border border-white/50 bg-white/24 p-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(91,61,82,0.11)] text-[var(--color-deep-plum)]">
                        <Star className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Lead with strong work
                        </p>

                        <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/52">
                          Feature the images that best represent your business.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-[1.3rem] border border-white/50 bg-white/24 p-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(91,61,82,0.11)] text-[var(--color-deep-plum)]">
                        <Images className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Show variety
                        </p>

                        <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/52">
                          Include different settings, services, and event types.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary mt-8 text-sm font-bold"
                    onClick={openUploadDialog}
                  >
                    <Upload className="size-4" />
                    Upload your first image
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sortedPortfolio.map((portfolioItem, index) => (
                <article
                  key={portfolioItem.id}
                  className="group overflow-hidden rounded-[2rem] border border-white/55 bg-white/32 p-3 shadow-[0_20px_55px_rgba(35,24,30,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_75px_rgba(35,24,30,0.14)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-[var(--color-light-champagne)]">
                    <img
                      src={portfolioItem.imageUrl}
                      alt={portfolioItem.title ?? `Vendor portfolio item ${index + 1}`}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.055]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(25,16,21,0.82)] via-[rgba(25,16,21,0.06)] to-transparent opacity-75 transition duration-500 group-hover:opacity-90" />

                    <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full border border-white/35 bg-black/18 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
                        Work {String(index + 1).padStart(2, '0')}
                      </span>

                      {portfolioItem.isFeatured ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.40)] bg-white/24 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white backdrop-blur-xl">
                          <Star className="size-3.5 fill-white" />
                          Featured work
                        </span>
                      ) : null}
                    </div>

                    <div className="absolute inset-x-4 bottom-4 flex translate-y-2 items-center justify-end gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <button
                        type="button"
                        className="grid size-10 place-items-center rounded-full border border-white/35 bg-white/22 text-white shadow-lg backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="grid size-10 place-items-center rounded-full border border-white/35 bg-white/22 text-white shadow-lg backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Move portfolio item down"
                        disabled={index === sortedPortfolio.length - 1 || reorderMutation.isPending}
                        onClick={() => {
                          reorderMutation.mutate({
                            portfolioItemId: portfolioItem.id,
                            direction: 'down',
                          });
                        }}
                      >
                        <ArrowDown className="size-4" />
                      </button>

                      <button
                        type="button"
                        className="grid size-10 place-items-center rounded-full border border-white/35 bg-white/22 text-white shadow-lg backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-deep-plum)]"
                        aria-label="Edit portfolio item"
                        onClick={() => {
                          updateMutation.reset();
                          setEditingItem(portfolioItem);
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-2 pb-2 pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Portfolio item
                        </p>

                        <h2 className="mt-2 line-clamp-2 text-xl font-black leading-tight tracking-[-0.035em] text-[var(--color-near-black)]">
                          {portfolioItem.title ?? `Portfolio item ${index + 1}`}
                        </h2>
                      </div>

                      <span className="shrink-0 rounded-full border border-white/55 bg-white/36 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/55">
                        Order {portfolioItem.displayOrder}
                      </span>
                    </div>

                    {portfolioItem.description ? (
                      <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[var(--color-charcoal)]/62">
                        {portfolioItem.description}
                      </p>
                    ) : (
                      <p className="mt-3 min-h-[4.5rem] text-sm italic leading-6 text-[var(--color-charcoal)]/42">
                        Add a short description to help customers understand this work.
                      </p>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/50 pt-4">
                      <div className="min-w-0">
                        <p
                          className="truncate text-xs font-bold text-[var(--color-charcoal)]/52"
                          title={portfolioItem.originalName}
                        >
                          {portfolioItem.originalName}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/38">
                          {formatFileSize(portfolioItem.fileSize)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/38 px-4 text-xs font-black text-[var(--color-charcoal)] transition hover:-translate-y-0.5 hover:text-[var(--color-deep-plum)]"
                          onClick={() => {
                            updateMutation.reset();
                            setEditingItem(portfolioItem);
                          }}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="grid size-10 place-items-center rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] text-[var(--color-muted-burgundy)] transition hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.15)]"
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
                </article>
              ))}
            </section>
          )}

          {reorderMutation.isError ? (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-5 py-4 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
            >
              {getErrorMessage(reorderMutation.error, 'We could not reorder your portfolio.')}
            </div>
          ) : null}
        </main>
      </div>

      {isUploadDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-portfolio-title"
          onClick={closeUploadDialog}
        >
          <div
            className="mx-auto max-w-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <ImagePlus className="size-4" />
                    Add portfolio work
                  </div>

                  <h2
                    id="upload-portfolio-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Upload a portfolio image.
                  </h2>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)]"
                  disabled={uploadMutation.isPending}
                  onClick={closeUploadDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              <form className="mt-8 grid gap-5" onSubmit={onUpload}>
                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-[var(--color-charcoal)]/76">
                        Portfolio image
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Choose a clear, high-quality image that represents your work.
                      </p>
                    </div>

                    {selectedFile ? (
                      <span className="shrink-0 rounded-full border border-white/55 bg-white/34 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
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
                    <div className="overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/28 p-3 shadow-[0_18px_45px_rgba(35,24,30,0.08)]">
                      <div className="group relative aspect-[16/10] overflow-hidden rounded-[1.4rem] bg-[var(--color-light-champagne)]">
                        <img
                          src={selectedFilePreviewUrl}
                          alt="Selected portfolio preview"
                          className="absolute inset-0 h-full w-full object-cover"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(25,16,21,0.72)] via-transparent to-transparent" />

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
                              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/35 bg-white/20 px-4 text-xs font-black text-white backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-deep-plum)]"
                            >
                              <ImagePlus className="size-4" />
                              Replace
                            </label>

                            <button
                              type="button"
                              className="grid size-10 place-items-center rounded-full border border-white/35 bg-white/20 text-white backdrop-blur-xl transition hover:bg-white hover:text-[var(--color-muted-burgundy)]"
                              aria-label="Remove selected image"
                              disabled={uploadMutation.isPending}
                              onClick={() => {
                                handleSelectedUploadFile(null);
                              }}
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
                      className="group flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[rgba(91,61,82,0.28)] bg-white/22 px-6 py-10 text-center transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.48)] hover:bg-white/34 hover:shadow-[0_18px_45px_rgba(35,24,30,0.08)]"
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
                      <div className="grid size-16 place-items-center rounded-[1.4rem] bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition duration-300 group-hover:scale-105">
                        <Upload className="size-7" />
                      </div>

                      <p className="mt-5 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        Drop an image here
                      </p>

                      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-charcoal)]/56">
                        Or click to browse your device and choose the work you want customers to
                        see.
                      </p>

                      <span className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/40 px-5 text-xs font-black text-[var(--color-deep-plum)]">
                        <ImagePlus className="size-4" />
                        Choose image
                      </span>

                      <p className="mt-4 text-xs font-semibold text-[var(--color-charcoal)]/40">
                        JPG, PNG, WebP and other supported image formats
                      </p>
                    </label>
                  )}
                </div>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Title
                    </span>

                    <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                      {(uploadForm.watch('title') ?? '').length}/120
                    </span>
                  </div>

                  <input
                    className="form-field"
                    type="text"
                    placeholder="Elegant Garden Reception"
                    disabled={uploadMutation.isPending}
                    {...uploadForm.register('title')}
                  />

                  <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/46">
                    Give customers a short, memorable title.
                  </p>

                  {uploadForm.formState.errors.title ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {uploadForm.formState.errors.title.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Description
                    </span>

                    <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                      {(uploadForm.watch('description') ?? '').length}/500
                    </span>
                  </div>

                  <textarea
                    className="form-field min-h-32 resize-y"
                    placeholder="Describe the event, venue, styling, lighting, or the services showcased in this image..."
                    disabled={uploadMutation.isPending}
                    {...uploadForm.register('description')}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                    Good descriptions help customers understand what makes this work special.
                  </p>

                  {uploadForm.formState.errors.description ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {uploadForm.formState.errors.description.message}
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Display order
                      <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/46">
                        Lower numbers appear first in your public portfolio.
                      </p>
                    </span>

                    <input
                      className="form-field"
                      type="number"
                      min="0"
                      max="1000"
                      step="1"
                      disabled={uploadMutation.isPending}
                      {...uploadForm.register('displayOrder')}
                    />

                    {uploadForm.formState.errors.displayOrder ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {uploadForm.formState.errors.displayOrder.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="group relative flex cursor-pointer overflow-hidden rounded-[1.6rem] border border-white/55 bg-white/28 p-5 transition duration-300 hover:border-[rgba(91,61,82,0.32)] hover:bg-white/36 hover:shadow-[0_16px_40px_rgba(35,24,30,0.08)]">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      disabled={uploadMutation.isPending}
                      {...uploadForm.register('isFeatured')}
                    />

                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(183,167,200,0.18)] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]">
                          <Sparkles className="size-3.5" />
                          Featured
                        </div>

                        <h3 className="mt-4 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          Highlight this portfolio item
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                          Featured images help customers immediately notice your strongest work and
                          create a better first impression.
                        </p>
                      </div>

                      <div className="flex h-7 w-12 shrink-0 items-center rounded-full bg-[rgba(160,160,160,0.35)] p-1 transition duration-300 peer-checked:bg-[var(--color-deep-plum)]">
                        <div className="size-5 rounded-full bg-white shadow-md transition duration-300 peer-checked:translate-x-5" />
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 rounded-[1.6rem] border-2 border-transparent transition duration-300 peer-checked:border-[rgba(91,61,82,0.28)]" />
                  </label>
                </div>

                {uploadForm.formState.errors.root?.message ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                  >
                    {uploadForm.formState.errors.root.message}
                  </div>
                ) : null}

                {uploadMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                  >
                    {getErrorMessage(
                      uploadMutation.error,
                      'We could not upload this portfolio image.',
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={uploadMutation.isPending}
                    onClick={closeUploadDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}

                    {uploadMutation.isPending ? 'Uploading...' : 'Upload image'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-portfolio-title"
          onClick={closeEditDialog}
        >
          <div
            className="mx-auto max-w-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Pencil className="size-4" />
                    Edit portfolio item
                  </div>

                  <h2
                    id="edit-portfolio-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Refine the portfolio details.
                  </h2>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)]"
                  disabled={updateMutation.isPending}
                  onClick={closeEditDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              <form className="mt-8 grid gap-5" onSubmit={onEdit}>
                <label className="block">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Title
                    </span>

                    <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                      {(editForm.watch('title') ?? '').length}/120
                    </span>
                  </div>

                  <input
                    className="form-field"
                    type="text"
                    placeholder="Elegant Garden Reception"
                    disabled={updateMutation.isPending}
                    {...editForm.register('title')}
                  />

                  <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/46">
                    A memorable title makes this work easier to recognise.
                  </p>

                  {editForm.formState.errors.title ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {editForm.formState.errors.title.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Description
                    </span>

                    <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                      {(editForm.watch('description') ?? '').length}/500
                    </span>
                  </div>

                  <textarea
                    className="form-field min-h-32 resize-y"
                    placeholder="Describe what makes this project unique..."
                    disabled={updateMutation.isPending}
                    {...editForm.register('description')}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                    Update the story behind this portfolio item whenever your work evolves.
                  </p>

                  {editForm.formState.errors.description ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {editForm.formState.errors.description.message}
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Display order
                      <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/46">
                        Lower numbers appear first in your public portfolio.
                      </p>
                    </span>

                    <input
                      className="form-field"
                      type="number"
                      min="0"
                      max="1000"
                      step="1"
                      disabled={updateMutation.isPending}
                      {...editForm.register('displayOrder')}
                    />

                    {editForm.formState.errors.displayOrder ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {editForm.formState.errors.displayOrder.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="group relative flex cursor-pointer overflow-hidden rounded-[1.6rem] border border-white/55 bg-white/28 p-5 transition duration-300 hover:border-[rgba(91,61,82,0.32)] hover:bg-white/36 hover:shadow-[0_16px_40px_rgba(35,24,30,0.08)]">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      disabled={updateMutation.isPending}
                      {...editForm.register('isFeatured')}
                    />

                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(183,167,200,0.18)] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]">
                          <Sparkles className="size-3.5" />
                          Featured
                        </div>

                        <h3 className="mt-4 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          Highlight this portfolio item
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                          Featured items appear more prominently in your public portfolio and help
                          customers notice your best work first.
                        </p>
                      </div>

                      <div className="flex h-7 w-12 shrink-0 items-center rounded-full bg-[rgba(160,160,160,0.35)] p-1 transition duration-300 peer-checked:bg-[var(--color-deep-plum)]">
                        <div className="size-5 rounded-full bg-white shadow-md transition duration-300 peer-checked:translate-x-5" />
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 rounded-[1.6rem] border-2 border-transparent transition duration-300 peer-checked:border-[rgba(91,61,82,0.28)]" />
                  </label>
                </div>

                {updateMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                  >
                    {getErrorMessage(
                      updateMutation.error,
                      'We could not update this portfolio item.',
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={updateMutation.isPending}
                    onClick={closeEditDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {deletingItem ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-portfolio-title"
          onClick={() => {
            if (!deleteMutation.isPending) {
              setDeletingItem(null);
              deleteMutation.reset();
            }
          }}
        >
          <div
            className="glass-card w-full max-w-lg p-6 sm:p-8"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-portfolio-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Delete this portfolio image?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              This permanently removes{' '}
              <strong>{deletingItem.title ?? deletingItem.originalName}</strong> from your portfolio
              and Cloudinary storage.
            </p>

            {deleteMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getErrorMessage(deleteMutation.error, 'We could not delete this portfolio item.')}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
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
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deletingItem.id);
                }}
              >
                {deleteMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteMutation.isPending ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
