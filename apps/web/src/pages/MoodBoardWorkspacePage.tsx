import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Image,
  Images,
  Link2,
  LoaderCircle,
  Palette,
  Plus,
  Search,
  Sparkles,
  Store,
  Save,
  Upload,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createMoodBoardItem,
  createMoodBoardItemWithUpload,
  getMoodBoardItems,
  getMoodBoardSummary,
  moodBoardCategories,
  updateMoodBoardItem,
  deleteMoodBoardItem,
  type MoodBoardCategory,
  type MoodBoardItem,
  type MoodBoardSort,
} from '../features/moodBoards/moodBoard.api';
import { getPublicVendors, type PublicVendor } from '../features/vendors/vendor.api';
import { PageBackButton } from '../components/navigation/PageBackButton';
import { canManageWorkspace, getWorkspaceLockedMessage } from '../features/events/eventLifecycle';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type MoodBoardCreationMode = 'upload' | 'url';

const categoryLabels: Record<MoodBoardCategory, string> = {
  DECORATION: 'Decoration',
  FLOWERS: 'Flowers',
  OUTFIT: 'Outfit',
  CAKE: 'Cake',
  INVITATION: 'Invitation',
  PHOTOGRAPHY: 'Photography',
  VENUE: 'Venue',
  TABLE_SETTING: 'Table setting',
  COLOR_PALETTE: 'Colour palette',
  ENTERTAINMENT: 'Entertainment',
  OTHER: 'Other',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load this mood board. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this mood board. Please try again.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const getEventStatusTone = (status: string) => {
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

export function MoodBoardWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();

  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<MoodBoardCreationMode>('upload');

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MoodBoardCategory>('OTHER');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [colorTagsInput, setColorTagsInput] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [itemToEdit, setItemToEdit] = useState<MoodBoardItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MoodBoardItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MoodBoardCategory | ''>('');
  const [visualFilter, setVisualFilter] = useState<'all' | 'images' | 'sources'>('all');
  const [sort, setSort] = useState<MoodBoardSort>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedImage);

    setSelectedImagePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedImage]);

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'mood-board', 'summary'],
    enabled: Boolean(eventId),
    queryFn: () => getMoodBoardSummary(eventId!),
  });

  const moodBoardEventStatus = summaryQuery.data?.event.status;

  const isMoodBoardEditable =
    moodBoardEventStatus !== undefined
      ? canManageWorkspace(moodBoardEventStatus, 'MOOD_BOARD')
      : false;

  const moodBoardLockedMessage =
    moodBoardEventStatus !== undefined && !isMoodBoardEditable
      ? getWorkspaceLockedMessage(moodBoardEventStatus, 'MOOD_BOARD')
      : null;

  const itemsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'mood-board',
      'items',
      {
        page,
        search: searchQuery,
        category: categoryFilter,
        visualFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getMoodBoardItems(eventId!, {
        page,
        limit: 20,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        hasImage: visualFilter === 'images' ? true : undefined,
        hasSource: visualFilter === 'sources' ? true : undefined,
        sort,
      }),
  });

  const previewItemsQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'mood-board', 'preview-items'],
    enabled: Boolean(eventId),
    queryFn: () =>
      getMoodBoardItems(eventId!, {
        page: 1,
        limit: 12,
        hasImage: true,
        sort: 'newest',
      }),
  });

  const vendorsQuery = useQuery({
    queryKey: ['public', 'vendors', 'mood-board-options'],
    queryFn: () =>
      getPublicVendors({
        page: 1,
        limit: 50,
        sort: 'name_asc',
      }),
  });

  const getColorTags = () => [
    ...new Set(
      colorTagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];

  const createMoodBoardItemMutation = useMutation({
    mutationFn: async () => {
      if (!isMoodBoardEditable) {
        throw new Error(
          moodBoardLockedMessage ?? 'Mood-board changes are unavailable for this event.',
        );
      }

      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim();
      const normalizedImageUrl = imageUrl.trim();
      const normalizedSourceUrl = sourceUrl.trim();
      const colorTags = getColorTags();

      if (!normalizedTitle) {
        throw new Error('Enter a title for this inspiration item.');
      }

      if (normalizedTitle.length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }

      if (normalizedDescription.length > 2000) {
        throw new Error('Description cannot exceed 2000 characters.');
      }

      if (colorTags.length > 20) {
        throw new Error('A mood-board item cannot contain more than 20 colour tags.');
      }

      if (colorTags.some((tag) => tag.length > 50)) {
        throw new Error('Each colour tag cannot exceed 50 characters.');
      }

      if (creationMode === 'upload') {
        if (!selectedImage) {
          throw new Error('Choose an image to upload.');
        }

        return createMoodBoardItemWithUpload(eventId, {
          image: selectedImage,
          title: normalizedTitle,
          description: normalizedDescription || null,
          category,
          sourceUrl: normalizedSourceUrl || null,
          colorTags,
          vendorId: vendorId || null,
        });
      }

      if (!normalizedImageUrl && !normalizedSourceUrl) {
        throw new Error('Enter either an image URL or a source URL.');
      }

      return createMoodBoardItem(eventId, {
        title: normalizedTitle,
        description: normalizedDescription || null,
        category,
        imageUrl: normalizedImageUrl || null,
        sourceUrl: normalizedSourceUrl || null,
        colorTags,
        vendorId: vendorId || null,
      });
    },

    onSuccess: async () => {
      setIsCreateDialogOpen(false);
      setCreationMode('upload');
      setSelectedImage(null);
      setSelectedImagePreviewUrl(null);
      setTitle('');
      setDescription('');
      setCategory('OTHER');
      setImageUrl('');
      setSourceUrl('');
      setColorTagsInput('');
      setVendorId('');

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'items'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'preview-items'],
        }),
      ]);
    },
  });

  const updateMoodBoardItemMutation = useMutation({
    mutationFn: async () => {
      if (!isMoodBoardEditable) {
        throw new Error(
          moodBoardLockedMessage ?? 'Mood-board changes are unavailable for this event.',
        );
      }

      if (!eventId || !itemToEdit) {
        throw new Error('Mood-board item details are missing.');
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim() || null;
      const normalizedImageUrl = imageUrl.trim() || null;
      const normalizedSourceUrl = sourceUrl.trim() || null;
      const colorTags = getColorTags();

      if (!normalizedTitle) {
        throw new Error('Enter a title for this inspiration item.');
      }

      if (normalizedTitle.length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }

      if (description.trim().length > 2000) {
        throw new Error('Description cannot exceed 2000 characters.');
      }

      if (!normalizedImageUrl && !normalizedSourceUrl) {
        throw new Error('The item must keep either an image URL or a source URL.');
      }

      if (colorTags.length > 20) {
        throw new Error('A mood-board item cannot contain more than 20 colour tags.');
      }

      if (colorTags.some((tag) => tag.length > 50)) {
        throw new Error('Each colour tag cannot exceed 50 characters.');
      }

      const input: {
        title?: string;
        description?: string | null;
        category?: MoodBoardCategory;
        imageUrl?: string | null;
        sourceUrl?: string | null;
        colorTags?: string[];
        vendorId?: string | null;
      } = {};

      if (normalizedTitle !== itemToEdit.title) {
        input.title = normalizedTitle;
      }

      if (normalizedDescription !== itemToEdit.description) {
        input.description = normalizedDescription;
      }

      if (category !== itemToEdit.category) {
        input.category = category;
      }

      if (normalizedImageUrl !== itemToEdit.imageUrl) {
        input.imageUrl = normalizedImageUrl;
      }

      if (normalizedSourceUrl !== itemToEdit.sourceUrl) {
        input.sourceUrl = normalizedSourceUrl;
      }

      const currentColorTags = [...itemToEdit.colorTags].sort();
      const nextColorTags = [...colorTags].sort();

      if (JSON.stringify(currentColorTags) !== JSON.stringify(nextColorTags)) {
        input.colorTags = colorTags;
      }

      const normalizedVendorId = vendorId || null;

      if (normalizedVendorId !== itemToEdit.vendorId) {
        input.vendorId = normalizedVendorId;
      }

      if (Object.keys(input).length === 0) {
        throw new Error('No inspiration details were changed.');
      }

      return updateMoodBoardItem(eventId, itemToEdit.id, input);
    },

    onSuccess: async () => {
      setItemToEdit(null);
      setIsEditDialogOpen(false);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'items'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'preview-items'],
        }),
      ]);
    },
  });

  const deleteMoodBoardItemMutation = useMutation({
    mutationFn: async () => {
      if (!isMoodBoardEditable) {
        throw new Error(
          moodBoardLockedMessage ?? 'Mood-board changes are unavailable for this event.',
        );
      }

      if (!eventId || !itemToDelete) {
        throw new Error('Mood-board item details are missing.');
      }

      await deleteMoodBoardItem(eventId, itemToDelete.id);
    },

    onSuccess: async () => {
      setItemToDelete(null);
      setIsDeleteDialogOpen(false);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'items'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'preview-items'],
        }),
      ]);
    },
  });

  const openDeleteDialog = (item: MoodBoardItem) => {
    if (!isMoodBoardEditable) {
      return;
    }

    deleteMoodBoardItemMutation.reset();
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleteMoodBoardItemMutation.isPending) {
      return;
    }

    deleteMoodBoardItemMutation.reset();
    setItemToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const openEditDialog = (item: MoodBoardItem) => {
    if (!isMoodBoardEditable) {
      return;
    }

    updateMoodBoardItemMutation.reset();

    setItemToEdit(item);
    setTitle(item.title);
    setDescription(item.description ?? '');
    setCategory(item.category);
    setImageUrl(item.imageUrl ?? '');
    setSourceUrl(item.sourceUrl ?? '');
    setColorTagsInput(item.colorTags.join(', '));
    setVendorId(item.vendorId ?? '');
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    if (updateMoodBoardItemMutation.isPending) {
      return;
    }

    updateMoodBoardItemMutation.reset();
    setItemToEdit(null);
    setIsEditDialogOpen(false);
  };

  const openCreateDialog = () => {
    if (!isMoodBoardEditable) {
      return;
    }

    createMoodBoardItemMutation.reset();
    setCreationMode('upload');
    setSelectedImage(null);
    setSelectedImagePreviewUrl(null);
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setImageUrl('');
    setSourceUrl('');
    setColorTagsInput('');
    setVendorId('');
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createMoodBoardItemMutation.isPending) {
      return;
    }

    createMoodBoardItemMutation.reset();
    setSelectedImage(null);
    setSelectedImagePreviewUrl(null);
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setImageUrl('');
    setSourceUrl('');
    setColorTagsInput('');
    setVendorId('');
    setCreationMode('upload');
    setIsCreateDialogOpen(false);
  };

  const submitSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategoryFilter('');
    setVisualFilter('all');
    setSort('newest');
    setPage(1);
  };

  const isLoading = summaryQuery.isLoading || itemsQuery.isLoading;
  const isError = summaryQuery.isError || itemsQuery.isError;
  const firstError = summaryQuery.error ?? itemsQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your mood board
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading inspiration, colour ideas and visual references.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !itemsQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Mood board unavailable
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
                    void Promise.all([summaryQuery.refetch(), itemsQuery.refetch()]);
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

  const moodBoardSummary = summaryQuery.data;
  const items = itemsQuery.data.items;

  const eventStatus = moodBoardSummary.event.status;

  const isReadOnly = eventStatus === 'COMPLETED' || eventStatus === 'CANCELLED';

  const canEdit = eventStatus === 'DRAFT' || eventStatus === 'PLANNING' || eventStatus === 'ACTIVE';
  const pagination = itemsQuery.data.pagination;

  const previewItems = (previewItemsQuery.data?.items ?? [])
    .filter((item) => Boolean(item.imageUrl))
    .slice(0, 6);

  const previewLayouts = [
    {
      top: '3%',
      left: '3%',
      width: '42%',
      height: '42%',
      rotation: '-4deg',
      zIndex: 3,
    },
    {
      top: '8%',
      right: '2%',
      width: '47%',
      height: '48%',
      rotation: '3deg',
      zIndex: 2,
    },
    {
      bottom: '4%',
      left: '5%',
      width: '38%',
      height: '43%',
      rotation: '3deg',
      zIndex: 5,
    },
    {
      bottom: '2%',
      left: '34%',
      width: '37%',
      height: '39%',
      rotation: '-3deg',
      zIndex: 6,
    },
    {
      bottom: '7%',
      right: '1%',
      width: '34%',
      height: '38%',
      rotation: '4deg',
      zIndex: 4,
    },
    {
      top: '29%',
      left: '29%',
      width: '35%',
      height: '36%',
      rotation: '-1.5deg',
      zIndex: 7,
    },
  ] as const;

  const activeCategoryCount = Object.values(moodBoardSummary.summary.categoryCounts).filter(
    (count) => count > 0,
  ).length;

  const filtersAreActive =
    Boolean(searchQuery) || Boolean(categoryFilter) || visualFilter !== 'all' || sort !== 'newest';

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
                Mood board
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {moodBoardSummary.event.name}
              </h1>
            </div>
          </div>

          <span
            className="status-chip w-fit"
            data-tone={getEventStatusTone(moodBoardSummary.event.status)}
          >
            {moodBoardSummary.event.status.replaceAll('_', ' ')}
          </span>
        </header>

        <main className="py-10">
          <section className="relative isolate min-h-[22rem] overflow-hidden rounded-[2.5rem] border border-white/68 bg-[#fffaf6] px-6 py-5 shadow-[0_26px_78px_rgba(31,27,29,0.11)] sm:px-7 sm:py-6 lg:px-8 lg:py-6">
            <img
              src="/images/workspaces/shortcuts/moodboard.png"
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
                  Creative direction
                </div>

                <div className="mt-2.5 max-w-[32rem] rounded-[1.3rem] border border-white/44 bg-white/[0.15] px-5 py-3 shadow-[0_14px_36px_rgba(31,27,29,0.055)] backdrop-blur-[3px]">
                  <h2 className="max-w-[30rem] text-balance text-[2rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.2rem] lg:text-[2.35rem]">
                    Shape the look and
                    <br />
                    feeling of your event.
                  </h2>

                  <p className="mt-2.5 max-w-[30rem] text-sm font-semibold leading-[1.4rem] text-[var(--color-charcoal)]/70">
                    Collect visual references, organise colour ideas and connect every creative
                    decision to the event you are planning.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!canEdit}
                      className="group/hero-add-inspiration btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(93,58,85,0.24)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      onClick={() => {
                        if (!canEdit) return;
                        openCreateDialog();
                      }}
                    >
                      <Plus
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/hero-add-inspiration:rotate-90"
                      />
                      Add inspiration
                    </button>

                    <span className="rounded-full border border-white/72 bg-white/46 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                      <Palette aria-hidden="true" className="mr-1.5 inline size-3.5" />
                      {formatEventDate(moodBoardSummary.event.eventDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid max-w-[49rem] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="group/mood-metric rounded-[1.3rem] border border-white/68 bg-white/40 px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/56 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition duration-300 group-hover/mood-metric:scale-105">
                    <Images aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Inspiration items
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {moodBoardSummary.summary.totalItems}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {activeCategoryCount} active categories
                  </p>
                </article>

                <article className="group/mood-metric rounded-[1.3rem] border border-white/68 bg-[rgba(240,247,250,0.48)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954] transition duration-300 group-hover/mood-metric:scale-105">
                    <Image aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Visual references
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {moodBoardSummary.summary.itemsWithImages}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Items with saved images
                  </p>
                </article>

                <article className="group/mood-metric rounded-[1.3rem] border border-white/68 bg-[rgba(249,242,231,0.50)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(220,183,150,0.24)] text-[var(--color-rosewood)] transition duration-300 group-hover/mood-metric:scale-105">
                    <Link2 aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    External sources
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {moodBoardSummary.summary.itemsWithSources}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Saved reference links
                  </p>
                </article>

                <article className="group/mood-metric rounded-[1.3rem] border border-white/68 bg-[rgba(244,246,236,0.50)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#596449] transition duration-300 group-hover/mood-metric:scale-105">
                    <Store aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Linked vendors
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {moodBoardSummary.summary.linkedVendorItems}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Ideas connected to vendors
                  </p>
                </article>
              </div>
            </div>
          </section>

          {moodBoardLockedMessage ? (
            <div className="mt-6 flex items-start gap-4 rounded-[1.5rem] border border-[rgba(93,58,85,0.14)] bg-[rgba(255,255,255,0.58)] px-5 py-4 shadow-[0_14px_36px_rgba(31,27,29,0.05)] backdrop-blur-xl">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                <CircleAlert aria-hidden="true" className="size-5" />
              </span>

              <div>
                <p className="text-sm font-black text-[var(--color-near-black)]">
                  Mood board is read-only
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  {moodBoardLockedMessage}
                </p>
              </div>
            </div>
          ) : null}

          <section className="relative mt-7 overflow-hidden rounded-[2.25rem] border border-white/64 bg-[linear-gradient(145deg,rgba(255,255,255,0.50),rgba(239,230,244,0.30))] p-5 shadow-[0_22px_64px_rgba(31,27,29,0.08)] backdrop-blur-3xl sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 left-[18%] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
            />

            <div className="relative">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                      <Images aria-hidden="true" className="size-5" />
                    </span>

                    <span className="status-chip" data-tone="plum">
                      {moodBoardSummary.summary.itemsWithImages}{' '}
                      {moodBoardSummary.summary.itemsWithImages === 1
                        ? 'visual reference'
                        : 'visual references'}
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Live mood board
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Your visual direction, collected together.
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/58">
                    A living preview of the images shaping this event. Titles remain visible so
                    every reference keeps its meaning.
                  </p>
                </div>

                <button
                  type="button"
                  className="group/preview-add-inspiration btn-primary shrink-0 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  disabled={!isMoodBoardEditable}
                  title={!isMoodBoardEditable ? (moodBoardLockedMessage ?? undefined) : undefined}
                  onClick={openCreateDialog}
                >
                  <Plus
                    aria-hidden="true"
                    className="size-4 transition duration-300 group-hover/preview-add-inspiration:rotate-90"
                  />
                  Add inspiration
                </button>
              </div>

              <div className="relative mt-6 min-h-[23rem] overflow-hidden rounded-[1.85rem] border border-white/72 bg-[linear-gradient(145deg,rgba(255,255,255,0.60),rgba(244,235,247,0.36))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_46px_rgba(31,27,29,0.08)] sm:min-h-[28rem] sm:p-5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,rgba(93,58,85,0.10)_1px,transparent_0)] [background-size:24px_24px]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-[rgba(255,228,210,0.18)] blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -right-20 size-72 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                />

                {previewItems.length > 0 ? (
                  <div className="relative mx-auto h-[21rem] w-full max-w-5xl sm:h-[26rem]">
                    {previewItems.map((item, index) => {
                      const layout = previewLayouts[index];

                      return (
                        <article
                          key={item.id}
                          className="group/preview-item absolute overflow-hidden rounded-[1.1rem] border-[4px] border-white/90 bg-white shadow-[0_16px_38px_rgba(31,27,29,0.20)] transition-all duration-500 hover:z-30 hover:scale-[1.04] hover:rotate-0 hover:shadow-[0_24px_54px_rgba(31,27,29,0.26)]"
                          style={{
                            top: 'top' in layout ? layout.top : undefined,
                            bottom: 'bottom' in layout ? layout.bottom : undefined,
                            left: 'left' in layout ? layout.left : undefined,
                            right: 'right' in layout ? layout.right : undefined,
                            width: layout.width,
                            height: layout.height,
                            zIndex: layout.zIndex,
                            transform: `rotate(${layout.rotation})`,
                          }}
                        >
                          <img
                            src={item.imageUrl!}
                            alt={item.title}
                            className="size-full object-cover transition duration-500 group-hover/preview-item:scale-[1.045]"
                          />

                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.46)] via-transparent to-transparent"
                          />

                          <span className="absolute bottom-2 left-2 right-2 truncate rounded-full border border-white/52 bg-[rgba(255,255,255,0.78)] px-3 py-1.5 text-[0.65rem] font-black text-[var(--color-near-black)] shadow-[0_8px_20px_rgba(31,27,29,0.16)] backdrop-blur-xl sm:text-xs">
                            {item.title}
                          </span>
                        </article>
                      );
                    })}

                    {moodBoardSummary.summary.itemsWithImages > previewItems.length ? (
                      <span className="absolute right-3 top-3 z-40 rounded-full border border-white/76 bg-white/78 px-3.5 py-2 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.13)] backdrop-blur-xl">
                        +{moodBoardSummary.summary.itemsWithImages - previewItems.length} more
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative grid min-h-[21rem] place-items-center px-5 text-center sm:min-h-[26rem]">
                    <div>
                      <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.07)]">
                        <Images aria-hidden="true" className="size-8" />
                      </div>

                      <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        Your visual preview is ready to grow.
                      </p>

                      <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/58">
                        Add inspiration with an uploaded image or image URL. Your references will
                        appear here as a scattered visual collection.
                      </p>

                      <button
                        type="button"
                        className="group/empty-preview-add btn-primary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        disabled={!isMoodBoardEditable}
                        title={
                          !isMoodBoardEditable ? (moodBoardLockedMessage ?? undefined) : undefined
                        }
                        onClick={openCreateDialog}
                      >
                        <Plus
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/empty-preview-add:rotate-90"
                        />
                        Add first inspiration
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <article className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(255,255,255,0.22))] p-6 shadow-[0_22px_64px_rgba(31,27,29,0.07)] backdrop-blur-3xl sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 left-[18%] size-52 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <Images aria-hidden="true" className="size-5" />
                      </div>

                      <span className="status-chip" data-tone="plum">
                        {pagination.total} {pagination.total === 1 ? 'idea' : 'ideas'}
                      </span>
                    </div>

                    <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                      Inspiration board
                    </p>

                    <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                      Ideas collected for this celebration.
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/58">
                      Search, filter and review the references shaping the event’s visual direction.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="group/add-board-inspiration btn-primary shrink-0 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                    disabled={!isMoodBoardEditable}
                    title={!isMoodBoardEditable ? (moodBoardLockedMessage ?? undefined) : undefined}
                    onClick={openCreateDialog}
                  >
                    <Plus
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/add-board-inspiration:rotate-90"
                    />
                    Add inspiration
                  </button>
                </div>

                <form
                  className="mt-7 rounded-[1.65rem] border border-white/56 bg-white/28 p-5 backdrop-blur-xl"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSearch();
                  }}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_12rem_11rem_12rem]">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Search inspiration
                      </span>

                      <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-white/60 bg-white/34 px-4 transition duration-300 focus-within:border-[rgba(93,58,85,0.24)] focus-within:bg-white/52">
                        <Search
                          aria-hidden="true"
                          className="size-5 shrink-0 text-[var(--color-charcoal)]/42"
                        />

                        <input
                          className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--color-charcoal)]/40"
                          type="search"
                          placeholder="Titles, descriptions, sources or vendors"
                          value={searchInput}
                          onChange={(event) => {
                            setSearchInput(event.target.value);
                          }}
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Category
                      </span>

                      <select
                        className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                        aria-label="Filter mood-board items by category"
                        value={categoryFilter}
                        onChange={(event) => {
                          setCategoryFilter(event.target.value as MoodBoardCategory | '');
                          setPage(1);
                        }}
                      >
                        <option value="">All categories</option>

                        {moodBoardCategories.map((itemCategory) => (
                          <option key={itemCategory} value={itemCategory}>
                            {categoryLabels[itemCategory]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Reference
                      </span>

                      <select
                        className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                        aria-label="Filter mood-board items by reference type"
                        value={visualFilter}
                        onChange={(event) => {
                          setVisualFilter(event.target.value as 'all' | 'images' | 'sources');
                          setPage(1);
                        }}
                      >
                        <option value="all">All references</option>
                        <option value="images">With images</option>
                        <option value="sources">With source links</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Sort order
                      </span>

                      <select
                        className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                        aria-label="Sort mood-board items"
                        value={sort}
                        onChange={(event) => {
                          setSort(event.target.value as MoodBoardSort);
                          setPage(1);
                        }}
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="title_asc">Title A–Z</option>
                        <option value="title_desc">Title Z–A</option>
                        <option value="category_asc">Category A–Z</option>
                        <option value="category_desc">Category Z–A</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="group/search-board btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(93,58,85,0.20)]"
                      >
                        <Search
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/search-board:scale-105"
                        />
                        Search
                      </button>

                      {filtersAreActive ? (
                        <button
                          type="button"
                          className="btn-secondary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>

                    <p className="text-sm font-bold text-[var(--color-charcoal)]/52">
                      Showing {items.length} of {pagination.total}{' '}
                      {pagination.total === 1 ? 'idea' : 'ideas'}
                    </p>
                  </div>
                </form>

                {filtersAreActive ? (
                  <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[1.35rem] border border-white/56 bg-white/24 p-4">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/44">
                      Active filters
                    </span>

                    {searchQuery ? (
                      <span className="status-chip" data-tone="plum">
                        Search: {searchQuery}
                      </span>
                    ) : null}

                    {categoryFilter ? (
                      <span className="status-chip" data-tone="blue">
                        {categoryLabels[categoryFilter]}
                      </span>
                    ) : null}

                    {visualFilter !== 'all' ? (
                      <span className="status-chip" data-tone="gray">
                        {visualFilter === 'images' ? 'With images' : 'With sources'}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {items.length > 0 ? (
                  <div className="mt-8 grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        className="group min-w-0 overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/34 shadow-[0_14px_36px_rgba(31,27,29,0.055)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/85 hover:bg-white/48 hover:shadow-[0_24px_58px_rgba(31,27,29,0.11)]"
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-14 -top-14 z-10 size-40 rounded-full bg-[rgba(183,167,200,0.18)] opacity-0 blur-3xl transition duration-500 group-hover/mood-item:scale-125 group-hover/mood-item:opacity-100"
                        />

                        {item.imageUrl ? (
                          <div className="relative overflow-hidden">
                            <img
                              className="aspect-[4/3] w-full object-cover transition duration-500 group-hover/mood-item:scale-[1.045]"
                              src={item.imageUrl}
                              alt={item.title}
                              loading="lazy"
                            />

                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.22)] via-transparent to-transparent"
                            />
                          </div>
                        ) : (
                          <div className="grid aspect-[4/3] place-items-center bg-[linear-gradient(135deg,rgba(183,167,200,0.30),rgba(175,201,216,0.26))]">
                            <Link2
                              aria-hidden="true"
                              className="size-10 text-[var(--color-deep-plum)] transition duration-300 group-hover/mood-item:scale-110"
                            />
                          </div>
                        )}

                        <div className="relative border-t border-white/45 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <span className="status-chip" data-tone="plum">
                                {categoryLabels[item.category]}
                              </span>

                              <h3 className="mt-4 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/mood-item:text-[var(--color-deep-plum)]">
                                {item.title}
                              </h3>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {item.sourceUrl ? (
                                <a
                                  className="group/source-link grid size-9 place-items-center rounded-xl border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[rgba(93,58,85,0.16)] hover:shadow-[0_10px_22px_rgba(31,27,29,0.08)]"
                                  href={item.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Open source for ${item.title}`}
                                >
                                  <ExternalLink
                                    aria-hidden="true"
                                    className="size-4 transition duration-300 group-hover/source-link:-translate-y-0.5 group-hover/source-link:translate-x-0.5"
                                  />
                                </a>
                              ) : null}

                              <button
                                type="button"
                                className="group/edit-mood-item grid size-9 place-items-center rounded-xl border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[rgba(93,58,85,0.16)] hover:shadow-[0_10px_22px_rgba(31,27,29,0.08)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                aria-label={`Edit ${item.title}`}
                                disabled={!isMoodBoardEditable}
                                title={
                                  !isMoodBoardEditable
                                    ? (moodBoardLockedMessage ?? undefined)
                                    : undefined
                                }
                                onClick={() => {
                                  openEditDialog(item);
                                }}
                              >
                                <Pencil
                                  aria-hidden="true"
                                  className="size-4 transition duration-300 group-hover/edit-mood-item:rotate-[3deg]"
                                />
                              </button>

                              <button
                                type="button"
                                className="group/delete-mood-item grid size-9 place-items-center rounded-xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.16)] hover:shadow-[0_10px_22px_rgba(124,74,90,0.10)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                aria-label={`Delete ${item.title}`}
                                disabled={!isMoodBoardEditable}
                                title={
                                  !isMoodBoardEditable
                                    ? (moodBoardLockedMessage ?? undefined)
                                    : undefined
                                }
                                onClick={() => {
                                  openDeleteDialog(item);
                                }}
                              >
                                <Trash2
                                  aria-hidden="true"
                                  className="size-4 transition duration-300 group-hover/delete-mood-item:scale-105"
                                />
                              </button>
                            </div>
                          </div>

                          {item.description ? (
                            <div className="mt-4 rounded-[1.25rem] border border-white/50 bg-white/28 p-4 transition duration-300 group-hover/mood-item:border-white/72 group-hover/mood-item:bg-white/42">
                              <p className="line-clamp-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                                {item.description}
                              </p>
                            </div>
                          ) : null}

                          {item.colorTags.length > 0 ? (
                            <div className="mt-5 flex flex-wrap gap-2">
                              {item.colorTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-white/60 bg-white/34 px-3 py-1 text-xs font-black text-[var(--color-deep-plum)] transition duration-300 group-hover/mood-item:border-white/82 group-hover/mood-item:bg-white/48"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {item.vendor ? (
                            <Link
                              className="group/vendor-link mt-5 flex items-center gap-3 rounded-[1.25rem] border border-white/50 bg-white/30 px-4 py-3 text-sm font-black text-[var(--color-deep-plum)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/74 hover:bg-white/46 hover:shadow-[0_12px_28px_rgba(31,27,29,0.07)]"
                              to={`/vendors/${item.vendor.slug}`}
                            >
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.22)] text-[#3b515b]">
                                <Store aria-hidden="true" className="size-4" />
                              </span>

                              <span className="min-w-0 flex-1 truncate">
                                {item.vendor.businessName}
                              </span>

                              <ExternalLink
                                aria-hidden="true"
                                className="size-4 transition duration-300 group-hover/vendor-link:-translate-y-0.5 group-hover/vendor-link:translate-x-0.5"
                              />
                            </Link>
                          ) : null}
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
                        <Palette aria-hidden="true" className="size-8" />
                      </div>

                      <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        {filtersAreActive
                          ? 'No inspiration matches these filters'
                          : 'No inspiration added yet'}
                      </p>

                      <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                        {filtersAreActive
                          ? 'Try changing the search term, category, reference type or sort order.'
                          : 'Add your first visual reference, source link or creative idea to start shaping the event.'}
                      </p>

                      {filtersAreActive ? (
                        <button
                          type="button"
                          className="btn-secondary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="group/first-inspiration btn-primary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                          disabled={!isMoodBoardEditable}
                          title={
                            !isMoodBoardEditable ? (moodBoardLockedMessage ?? undefined) : undefined
                          }
                          onClick={openCreateDialog}
                        >
                          <Plus
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/first-inspiration:rotate-90"
                          />
                          Add inspiration
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
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[var(--color-deep-plum)]">
                          <Images aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            Page {pagination.page} of {pagination.totalPages}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/50">
                            {pagination.total} {pagination.total === 1 ? 'idea' : 'ideas'} in total
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="btn-secondary min-w-28 justify-center text-sm font-bold"
                          disabled={!pagination.hasPreviousPage || itemsQuery.isFetching}
                          onClick={() => {
                            setPage((currentPage) => Math.max(currentPage - 1, 1));
                          }}
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          className="btn-secondary min-w-28 justify-center text-sm font-bold"
                          disabled={!pagination.hasNextPage || itemsQuery.isFetching}
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
              </div>
            </article>

            <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              <article className="group/category-panel relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_32px_86px_rgba(93,58,85,0.34)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-3xl transition duration-500 group-hover/category-panel:scale-125"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl border border-white/14 bg-white/12 text-[var(--color-powder-blue)]">
                      <Palette aria-hidden="true" className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/74">
                      {activeCategoryCount} active
                    </span>
                  </div>

                  <p className="mt-7 text-xs font-black uppercase tracking-[0.20em] text-white/48">
                    Creative coverage
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
                    Creative categories
                  </h2>

                  <p className="mt-3 leading-7 text-white/68">
                    See which parts of the event already have saved inspiration.
                  </p>

                  <div className="mt-7 space-y-3">
                    {moodBoardCategories
                      .filter(
                        (itemCategory) => moodBoardSummary.summary.categoryCounts[itemCategory] > 0,
                      )
                      .map((itemCategory) => (
                        <div
                          key={itemCategory}
                          className="group/category-row flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.15]"
                        >
                          <span className="truncate text-sm font-black text-white/82">
                            {categoryLabels[itemCategory]}
                          </span>

                          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/12 text-lg font-black">
                            {moodBoardSummary.summary.categoryCounts[itemCategory]}
                          </span>
                        </div>
                      ))}

                    {activeCategoryCount === 0 ? (
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-4">
                        <p className="text-sm font-semibold leading-6 text-white/64">
                          Categories will appear here after inspiration items are added.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>

              <article className="group/visual-story glass-card relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:shadow-[0_24px_60px_rgba(31,27,29,0.10)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-12 size-44 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/visual-story:scale-125"
                />

                <div className="relative">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                    <Sparkles aria-hidden="true" className="size-6" />
                  </div>

                  <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Creative guidance
                  </p>

                  <h2 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    Build a clear visual story
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                    Save references across styling, venue, stationery, food and entertainment so
                    your choices feel connected rather than collected at random.
                  </p>

                  <button
                    type="button"
                    className="group/add-another-idea btn-secondary mt-6 w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                    disabled={!isMoodBoardEditable}
                    title={!isMoodBoardEditable ? (moodBoardLockedMessage ?? undefined) : undefined}
                    onClick={openCreateDialog}
                  >
                    <Plus
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/add-another-idea:rotate-90"
                    />
                    Add another idea
                  </button>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>
      {isCreateDialogOpen && isMoodBoardEditable ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-mood-board-item-title"
          onClick={() => {
            if (!createMoodBoardItemMutation.isPending) {
              closeCreateDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-3xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(240,231,246,0.85))] shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[22%] top-[-7rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.12)] blur-3xl"
              />

              <div className="relative max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <Palette aria-hidden="true" className="size-6" />
                      </div>

                      <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        New inspiration
                      </span>
                    </div>

                    <h2
                      id="create-mood-board-item-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Add an idea to your mood board.
                    </h2>

                    <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      Upload an image or save a visual reference from another website, then organise
                      it with creative notes and colour tags.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="status-chip" data-tone="plum">
                        <Image aria-hidden="true" className="size-3.5" />
                        Visual reference
                      </span>

                      <span className="status-chip" data-tone="blue">
                        <Palette aria-hidden="true" className="size-3.5" />
                        Colour direction
                      </span>

                      <span className="status-chip" data-tone="gray">
                        <Store aria-hidden="true" className="size-3.5" />
                        Optional vendor
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close inspiration form"
                    disabled={createMoodBoardItemMutation.isPending}
                    onClick={closeCreateDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <div className="relative mt-8 overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.58),rgba(232,242,246,0.34))] p-3 shadow-[0_16px_42px_rgba(31,27,29,0.05)] backdrop-blur-xl">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
                  />

                  <div className="relative grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={
                        creationMode === 'upload'
                          ? 'group/source-upload relative overflow-hidden rounded-[1.35rem] border border-[rgba(93,58,85,0.24)] bg-[linear-gradient(145deg,rgba(93,58,85,0.96),rgba(124,74,90,0.90))] p-4 text-left text-white shadow-[0_14px_34px_rgba(93,58,85,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(93,58,85,0.28)]'
                          : 'group/source-upload rounded-[1.35rem] border border-white/56 bg-white/28 p-4 text-left text-[var(--color-charcoal)] shadow-[0_8px_22px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/48 hover:shadow-[0_14px_30px_rgba(31,27,29,0.08)]'
                      }
                      disabled={createMoodBoardItemMutation.isPending}
                      onClick={() => {
                        createMoodBoardItemMutation.reset();
                        setImageUrl('');
                        setCreationMode('upload');
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={
                            creationMode === 'upload'
                              ? 'grid size-11 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/12 text-white'
                              : 'grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]'
                          }
                        >
                          <Upload
                            aria-hidden="true"
                            className="size-5 transition duration-300 group-hover/source-upload:-translate-y-0.5"
                          />
                        </span>

                        <span className="min-w-0">
                          <span className="block text-sm font-black">Upload image</span>

                          <span
                            className={
                              creationMode === 'upload'
                                ? 'mt-1 block text-xs font-semibold leading-5 text-white/62'
                                : 'mt-1 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50'
                            }
                          >
                            Choose a visual directly from your device.
                          </span>
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={
                        creationMode === 'url'
                          ? 'group/source-url relative overflow-hidden rounded-[1.35rem] border border-[rgba(93,58,85,0.24)] bg-[linear-gradient(145deg,rgba(93,58,85,0.96),rgba(124,74,90,0.90))] p-4 text-left text-white shadow-[0_14px_34px_rgba(93,58,85,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(93,58,85,0.28)]'
                          : 'group/source-url rounded-[1.35rem] border border-white/56 bg-white/28 p-4 text-left text-[var(--color-charcoal)] shadow-[0_8px_22px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/48 hover:shadow-[0_14px_30px_rgba(31,27,29,0.08)]'
                      }
                      disabled={createMoodBoardItemMutation.isPending}
                      onClick={() => {
                        createMoodBoardItemMutation.reset();
                        setSelectedImage(null);
                        setSelectedImagePreviewUrl(null);
                        setCreationMode('url');
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={
                            creationMode === 'url'
                              ? 'grid size-11 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/12 text-white'
                              : 'grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[#3b515b]'
                          }
                        >
                          <Link2
                            aria-hidden="true"
                            className="size-5 transition duration-300 group-hover/source-url:-translate-y-0.5 group-hover/source-url:translate-x-0.5"
                          />
                        </span>

                        <span className="min-w-0">
                          <span className="block text-sm font-black">Use URL</span>

                          <span
                            className={
                              creationMode === 'url'
                                ? 'mt-1 block text-xs font-semibold leading-5 text-white/62'
                                : 'mt-1 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50'
                            }
                          >
                            Save an image or source from another website.
                          </span>
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-5">
                  {creationMode === 'upload' ? (
                    <section className="group/upload-inspiration relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(220,235,242,0.40))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)] sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/upload-inspiration:scale-125"
                      />

                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/upload-inspiration:-translate-y-0.5 group-hover/upload-inspiration:scale-105">
                            <Upload aria-hidden="true" className="size-6" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              Image upload
                            </p>

                            <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                              Choose an inspiration image
                            </h3>

                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                              Upload one clear visual reference from your device.
                            </p>
                          </div>
                        </div>

                        <label className="mt-6 block cursor-pointer">
                          <span className="sr-only">Choose inspiration image</span>

                          <div className="rounded-[1.5rem] border border-dashed border-[rgba(93,58,85,0.28)] bg-white/28 p-6 text-center transition-all duration-300 hover:border-[rgba(93,58,85,0.40)] hover:bg-white/42">
                            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(31,27,29,0.05)]">
                              <Image aria-hidden="true" className="size-7" />
                            </div>

                            <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                              Select an image from your device
                            </p>

                            <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                              Choose a supported image file to use as this mood-board reference.
                            </p>

                            <span className="btn-secondary mt-5 inline-flex justify-center text-sm font-bold">
                              <Upload aria-hidden="true" className="size-4" />
                              Browse image
                            </span>

                            <input
                              className="sr-only"
                              type="file"
                              accept="image/*"
                              disabled={createMoodBoardItemMutation.isPending}
                              onChange={(event) => {
                                createMoodBoardItemMutation.reset();
                                setSelectedImage(event.target.files?.[0] ?? null);
                              }}
                            />
                          </div>
                        </label>

                        {selectedImage && selectedImagePreviewUrl ? (
                          <article className="group/upload-preview relative mt-5 overflow-hidden rounded-[1.45rem] border border-white/58 bg-white/34 shadow-[0_12px_32px_rgba(31,27,29,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/46 hover:shadow-[0_18px_42px_rgba(31,27,29,0.09)]">
                            <div className="relative overflow-hidden">
                              <img
                                src={selectedImagePreviewUrl}
                                alt="Selected inspiration preview"
                                className="aspect-[16/9] w-full object-cover transition duration-500 group-hover/upload-preview:scale-[1.025]"
                              />

                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.18)] via-transparent to-transparent"
                              />
                            </div>

                            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                                  {selectedImage.name}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="status-chip" data-tone="blue">
                                    Image selected
                                  </span>

                                  <span className="text-xs font-semibold text-[var(--color-charcoal)]/50">
                                    {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="group/remove-upload btn-secondary shrink-0 justify-center text-sm font-bold"
                                disabled={createMoodBoardItemMutation.isPending}
                                onClick={() => {
                                  createMoodBoardItemMutation.reset();
                                  setSelectedImage(null);
                                  setSelectedImagePreviewUrl(null);
                                }}
                              >
                                <X
                                  aria-hidden="true"
                                  className="size-4 transition duration-300 group-hover/remove-upload:rotate-90"
                                />
                                Remove
                              </button>
                            </div>
                          </article>
                        ) : (
                          <div className="mt-5 rounded-[1.35rem] border border-dashed border-white/70 bg-white/22 p-4">
                            <div className="flex items-start gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                                <Image aria-hidden="true" className="size-4" />
                              </span>

                              <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                                No image selected yet. Choose one before adding this inspiration
                                item.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  ) : (
                    <section className="group/url-inspiration relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(240,231,246,0.38))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)] sm:p-6">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl transition duration-500 group-hover/url-inspiration:scale-125"
                      />

                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/url-inspiration:-translate-y-0.5 group-hover/url-inspiration:scale-105">
                            <Link2 aria-hidden="true" className="size-6" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              External reference
                            </p>

                            <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                              Save an image from a URL
                            </h3>

                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                              Add a direct image link, a source link or both.
                            </p>
                          </div>
                        </div>

                        <label className="mt-6 block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Image URL
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="url"
                            placeholder="https://example.com/inspiration.jpg"
                            value={imageUrl}
                            disabled={createMoodBoardItemMutation.isPending}
                            onChange={(event) => {
                              createMoodBoardItemMutation.reset();
                              setImageUrl(event.target.value);
                            }}
                          />

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Optional when a source URL will be provided later in the form.
                          </p>
                        </label>

                        <div className="mt-5 rounded-[1.35rem] border border-[rgba(183,167,200,0.22)] bg-[rgba(240,231,246,0.30)] p-4">
                          <div className="flex items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                              <Link2 aria-hidden="true" className="size-4" />
                            </span>

                            <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                              At least one image URL or source URL must remain before this
                              inspiration item can be saved.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  <div className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/30 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                    />

                    <div className="relative">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Inspiration details
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Name and organise this idea.
                      </h3>

                      <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        Give the reference a clear title and place it in the most relevant creative
                        category.
                      </p>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="flex items-center justify-between gap-4">
                            <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                              Title
                              <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                            </span>

                            <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                              {title.length.toLocaleString('en-LK')} / 150
                            </span>
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="text"
                            maxLength={150}
                            value={title}
                            disabled={createMoodBoardItemMutation.isPending}
                            placeholder="e.g. Sage garden table setting"
                            onChange={(event) => {
                              createMoodBoardItemMutation.reset();
                              setTitle(event.target.value);
                            }}
                          />

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Use a short title that makes this inspiration easy to recognise.
                          </p>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Category
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <select
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            value={category}
                            disabled={createMoodBoardItemMutation.isPending}
                            onChange={(event) => {
                              createMoodBoardItemMutation.reset();
                              setCategory(event.target.value as MoodBoardCategory);
                            }}
                          >
                            {moodBoardCategories.map((itemCategory) => (
                              <option key={itemCategory} value={itemCategory}>
                                {categoryLabels[itemCategory]}
                              </option>
                            ))}
                          </select>

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            The category determines where this idea belongs in the creative board.
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>

                  <label className="relative block overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/30 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                          <Pencil aria-hidden="true" className="size-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                              Description
                            </span>

                            <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                              {description.length.toLocaleString('en-LK')} / 2,000
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Add context about the visual direction, details you like or ideas you
                            want to preserve.
                          </p>
                        </div>
                      </div>

                      <textarea
                        className="form-field mt-5 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                        maxLength={2000}
                        value={description}
                        disabled={createMoodBoardItemMutation.isPending}
                        placeholder="Describe the colours, textures, composition or details that inspired you."
                        onChange={(event) => {
                          createMoodBoardItemMutation.reset();
                          setDescription(event.target.value);
                        }}
                      />

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Optional. Use this space to explain how the idea could influence the event
                        design.
                      </p>
                    </div>
                  </label>

                  <label className="relative block overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.64),rgba(240,231,246,0.34))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                          <Link2 aria-hidden="true" className="size-5" />
                        </span>

                        <div className="min-w-0">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Source URL
                          </span>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Save the original page so you can revisit, credit or compare the
                            reference later.
                          </p>
                        </div>
                      </div>

                      <input
                        className="form-field mt-5 min-h-12 transition duration-300 focus:bg-white/52"
                        type="url"
                        placeholder="https://example.com/reference"
                        value={sourceUrl}
                        disabled={createMoodBoardItemMutation.isPending}
                        onChange={(event) => {
                          createMoodBoardItemMutation.reset();
                          setSourceUrl(event.target.value);
                        }}
                      />

                      <div className="mt-4 flex items-start gap-3 rounded-[1.25rem] border border-[rgba(183,167,200,0.20)] bg-[rgba(240,231,246,0.28)] p-4">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                          <ExternalLink aria-hidden="true" className="size-4" />
                        </span>

                        <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/56">
                          Optional when uploading an image. In URL mode, either this field or the
                          image URL must be provided.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className="relative block overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.64),rgba(248,235,223,0.34))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(255,228,210,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(255,228,210,0.26)] text-[var(--color-rosewood)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                          <Palette aria-hidden="true" className="size-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                              Colour tags
                            </span>

                            <span className="text-xs font-black text-[var(--color-charcoal)]/44">
                              {getColorTags().length} / 20 tags
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Capture the main colours or finishes that define this inspiration.
                          </p>
                        </div>
                      </div>

                      <input
                        className="form-field mt-5 min-h-12 transition duration-300 focus:bg-white/52"
                        type="text"
                        placeholder="Ivory, sage green, gold"
                        value={colorTagsInput}
                        disabled={createMoodBoardItemMutation.isPending}
                        onChange={(event) => {
                          createMoodBoardItemMutation.reset();
                          setColorTagsInput(event.target.value);
                        }}
                      />

                      <div className="mt-4 flex items-start gap-3 rounded-[1.25rem] border border-[rgba(255,228,210,0.24)] bg-[rgba(255,248,241,0.34)] p-4">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(255,228,210,0.26)] text-[var(--color-rosewood)]">
                          <Sparkles aria-hidden="true" className="size-4" />
                        </span>

                        <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/56">
                          Separate multiple colour names or codes with commas. Each tag can contain
                          up to 50 characters.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className="relative block overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.64),rgba(220,235,242,0.34))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[#3b515b]">
                          <Store aria-hidden="true" className="size-5" />
                        </span>

                        <div className="min-w-0">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Linked vendor
                          </span>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Optionally connect this inspiration to a marketplace vendor.
                          </p>
                        </div>
                      </div>

                      <select
                        className="form-field mt-5 min-h-12 transition duration-300 focus:bg-white/52"
                        value={vendorId}
                        disabled={createMoodBoardItemMutation.isPending || vendorsQuery.isLoading}
                        onChange={(event) => {
                          createMoodBoardItemMutation.reset();
                          setVendorId(event.target.value);
                        }}
                      >
                        <option value="">
                          {vendorsQuery.isLoading ? 'Loading vendors...' : 'No linked vendor'}
                        </option>

                        {(vendorsQuery.data?.vendors ?? []).map((vendor: PublicVendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.businessName}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Leave this empty when the idea is not connected to a specific vendor.
                      </p>
                    </div>
                  </label>

                  {vendorsQuery.isError ? (
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
                            Vendor options could not be loaded
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {getApiErrorMessage(vendorsQuery.error)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {createMoodBoardItemMutation.isError ? (
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
                            Inspiration could not be created
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {createMoodBoardItemMutation.error instanceof Error &&
                            !axios.isAxiosError(createMoodBoardItemMutation.error)
                              ? createMoodBoardItemMutation.error.message
                              : getApiErrorMessage(createMoodBoardItemMutation.error)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Palette aria-hidden="true" className="size-4" />
                      </span>

                      <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                        This reference will be saved to the event mood board and can be edited
                        later.
                      </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-bold"
                        disabled={createMoodBoardItemMutation.isPending}
                        onClick={closeCreateDialog}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="group/create-inspiration btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(93,58,85,0.20)]"
                        disabled={createMoodBoardItemMutation.isPending}
                        onClick={() => {
                          createMoodBoardItemMutation.mutate();
                        }}
                      >
                        {createMoodBoardItemMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Save
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/create-inspiration:scale-105"
                          />
                        )}

                        {createMoodBoardItemMutation.isPending
                          ? creationMode === 'upload'
                            ? 'Uploading inspiration...'
                            : 'Saving inspiration...'
                          : 'Add inspiration'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isEditDialogOpen && isMoodBoardEditable && itemToEdit ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-mood-board-item-title"
          onClick={() => {
            if (!updateMoodBoardItemMutation.isPending) {
              closeEditDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-3xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(240,231,246,0.85))] shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[22%] top-[-7rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.12)] blur-3xl"
              />

              <div className="relative max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <Pencil aria-hidden="true" className="size-6" />
                      </div>

                      <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        Edit inspiration
                      </span>
                    </div>

                    <h2
                      id="edit-mood-board-item-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Refine this mood-board idea.
                    </h2>

                    <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      Update the visual reference, creative notes, category, colour direction or
                      linked vendor.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="status-chip" data-tone="plum">
                        <Palette aria-hidden="true" className="size-3.5" />
                        {categoryLabels[itemToEdit.category]}
                      </span>

                      {itemToEdit.imageUrl ? (
                        <span className="status-chip" data-tone="blue">
                          <Image aria-hidden="true" className="size-3.5" />
                          Image saved
                        </span>
                      ) : null}

                      {itemToEdit.vendor ? (
                        <span className="status-chip" data-tone="gray">
                          <Store aria-hidden="true" className="size-3.5" />
                          Vendor linked
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close edit inspiration form"
                    disabled={updateMoodBoardItemMutation.isPending}
                    onClick={closeEditDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <div className="mt-8 grid gap-5">
                  {itemToEdit.imagePublicId ? (
                    <div className="relative overflow-hidden rounded-[1.4rem] border border-[rgba(183,167,200,0.22)] bg-[rgba(240,231,246,0.30)] p-4">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                      />

                      <div className="relative flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                          <Upload aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            Platform-uploaded image
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                            You can keep or remove this image. Replacing it with another uploaded
                            file will be available once image replacement is supported by the
                            backend.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/30 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                    />

                    <div className="relative">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Inspiration details
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Update how this idea is organised.
                      </h3>

                      <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        Refine its title, category and creative description.
                      </p>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="flex items-center justify-between gap-4">
                            <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                              Title
                              <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                            </span>

                            <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                              {title.length.toLocaleString('en-LK')} / 150
                            </span>
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="text"
                            maxLength={150}
                            value={title}
                            disabled={updateMoodBoardItemMutation.isPending}
                            placeholder="Enter a clear inspiration title"
                            onChange={(event) => {
                              updateMoodBoardItemMutation.reset();
                              setTitle(event.target.value);
                            }}
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Category
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <select
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            value={category}
                            disabled={updateMoodBoardItemMutation.isPending}
                            onChange={(event) => {
                              updateMoodBoardItemMutation.reset();
                              setCategory(event.target.value as MoodBoardCategory);
                            }}
                          >
                            {moodBoardCategories.map((itemCategory) => (
                              <option key={itemCategory} value={itemCategory}>
                                {categoryLabels[itemCategory]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="mt-5 block">
                        <span className="flex items-center justify-between gap-4">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Description
                          </span>

                          <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                            {description.length.toLocaleString('en-LK')} / 2,000
                          </span>
                        </span>

                        <textarea
                          className="form-field mt-2 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                          maxLength={2000}
                          value={description}
                          disabled={updateMoodBoardItemMutation.isPending}
                          placeholder="Describe the colours, textures or details that matter."
                          onChange={(event) => {
                            updateMoodBoardItemMutation.reset();
                            setDescription(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Optional. Explain how this reference influences the event’s creative
                          direction.
                        </p>
                      </label>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(240,231,246,0.34))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                          <Link2 aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Visual references
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Keep at least one image URL or source URL attached to this idea.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Image URL
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="url"
                            placeholder="https://example.com/inspiration.jpg"
                            value={imageUrl}
                            disabled={updateMoodBoardItemMutation.isPending}
                            onChange={(event) => {
                              updateMoodBoardItemMutation.reset();
                              setImageUrl(event.target.value);
                            }}
                          />

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Clearing this removes the image. A source URL must remain when no image
                            is present.
                          </p>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Source URL
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="url"
                            placeholder="https://example.com/reference"
                            value={sourceUrl}
                            disabled={updateMoodBoardItemMutation.isPending}
                            onChange={(event) => {
                              updateMoodBoardItemMutation.reset();
                              setSourceUrl(event.target.value);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.64),rgba(248,235,223,0.34))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(255,228,210,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(255,228,210,0.26)] text-[var(--color-rosewood)]">
                          <Palette aria-hidden="true" className="size-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-black text-[var(--color-charcoal)]/74">
                              Colour direction
                            </p>

                            <span className="text-xs font-black text-[var(--color-charcoal)]/44">
                              {getColorTags().length} / 20 tags
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Update the colours or finishes represented by this reference.
                          </p>
                        </div>
                      </div>

                      <input
                        className="form-field mt-5 min-h-12 transition duration-300 focus:bg-white/52"
                        type="text"
                        placeholder="Ivory, sage green, gold"
                        value={colorTagsInput}
                        disabled={updateMoodBoardItemMutation.isPending}
                        onChange={(event) => {
                          updateMoodBoardItemMutation.reset();
                          setColorTagsInput(event.target.value);
                        }}
                      />

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Separate multiple colour names or codes with commas.
                      </p>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.64),rgba(220,235,242,0.34))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[#3b515b]">
                          <Store aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Linked vendor
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Keep, change or remove the vendor connected to this inspiration.
                          </p>
                        </div>
                      </div>

                      <select
                        className="form-field mt-5 min-h-12 transition duration-300 focus:bg-white/52"
                        value={vendorId}
                        disabled={updateMoodBoardItemMutation.isPending || vendorsQuery.isLoading}
                        onChange={(event) => {
                          updateMoodBoardItemMutation.reset();
                          setVendorId(event.target.value);
                        }}
                      >
                        <option value="">
                          {vendorsQuery.isLoading ? 'Loading vendors...' : 'No linked vendor'}
                        </option>

                        {(vendorsQuery.data?.vendors ?? []).map((vendor: PublicVendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.businessName}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Leave empty to remove the existing vendor link.
                      </p>
                    </div>
                  </section>

                  {updateMoodBoardItemMutation.isError ? (
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
                            Inspiration changes could not be saved
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {updateMoodBoardItemMutation.error instanceof Error &&
                            !axios.isAxiosError(updateMoodBoardItemMutation.error)
                              ? updateMoodBoardItemMutation.error.message
                              : getApiErrorMessage(updateMoodBoardItemMutation.error)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Pencil aria-hidden="true" className="size-4" />
                      </span>

                      <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                        Saving updates this inspiration item while keeping it in the same event mood
                        board.
                      </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-bold"
                        disabled={updateMoodBoardItemMutation.isPending}
                        onClick={closeEditDialog}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="group/save-inspiration-changes btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(93,58,85,0.20)]"
                        disabled={updateMoodBoardItemMutation.isPending}
                        onClick={() => {
                          updateMoodBoardItemMutation.mutate();
                        }}
                      >
                        {updateMoodBoardItemMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Save
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/save-inspiration-changes:scale-105"
                          />
                        )}

                        {updateMoodBoardItemMutation.isPending
                          ? 'Saving changes...'
                          : 'Save changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteDialogOpen && isMoodBoardEditable && itemToDelete ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-mood-board-item-title"
          onClick={() => {
            if (!deleteMoodBoardItemMutation.isPending) {
              closeDeleteDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(249,235,240,0.85))] p-6 shadow-[0_40px_110px_rgba(31,27,29,0.26)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-14 place-items-center rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_12px_28px_rgba(124,74,90,0.08)]">
                    <Trash2 aria-hidden="true" className="size-7" />
                  </div>

                  <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                    Permanent action
                  </span>
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                  Delete inspiration
                </p>

                <h2
                  id="delete-mood-board-item-title"
                  className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  Delete this idea?
                </h2>

                <p className="mt-4 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66">
                  <strong className="font-black text-[var(--color-near-black)]">
                    {itemToDelete.title}
                  </strong>{' '}
                  will be permanently removed from this event mood board.
                </p>

                <div className="mt-6 overflow-hidden rounded-[1.45rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.08)]">
                  {itemToDelete.imageUrl ? (
                    <div className="relative overflow-hidden">
                      <img
                        src={itemToDelete.imageUrl}
                        alt={itemToDelete.title}
                        className="aspect-[16/9] w-full object-cover"
                      />

                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.24)] via-transparent to-transparent"
                      />
                    </div>
                  ) : (
                    <div className="grid aspect-[16/7] place-items-center bg-[linear-gradient(135deg,rgba(183,167,200,0.24),rgba(175,201,216,0.22))]">
                      <Link2 aria-hidden="true" className="size-9 text-[var(--color-deep-plum)]" />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-chip" data-tone="plum">
                        <Palette aria-hidden="true" className="size-3.5" />
                        {categoryLabels[itemToDelete.category]}
                      </span>

                      {itemToDelete.vendor ? (
                        <span className="status-chip" data-tone="blue">
                          <Store aria-hidden="true" className="size-3.5" />
                          Vendor linked
                        </span>
                      ) : null}

                      {itemToDelete.sourceUrl ? (
                        <span className="status-chip" data-tone="gray">
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                          Source saved
                        </span>
                      ) : null}
                    </div>

                    {itemToDelete.description ? (
                      <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                        {itemToDelete.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                {itemToDelete.imagePublicId ? (
                  <div className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                        <Image aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        The uploaded image will also be removed from cloud storage.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 rounded-[1.35rem] border border-dashed border-[rgba(124,74,90,0.20)] bg-white/24 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)]">
                      <CircleAlert aria-hidden="true" className="size-4" />
                    </span>

                    <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      This action cannot be undone after the inspiration item has been deleted.
                    </p>
                  </div>
                </div>

                {deleteMoodBoardItemMutation.isError ? (
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
                          Inspiration could not be deleted
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                          {getApiErrorMessage(deleteMoodBoardItemMutation.error)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={deleteMoodBoardItemMutation.isPending}
                    onClick={closeDeleteDialog}
                  >
                    Keep inspiration
                  </button>

                  <button
                    type="button"
                    className="group/delete-inspiration-confirm flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deleteMoodBoardItemMutation.isPending}
                    onClick={() => {
                      deleteMoodBoardItemMutation.mutate();
                    }}
                  >
                    {deleteMoodBoardItemMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/delete-inspiration-confirm:scale-105"
                      />
                    )}

                    {deleteMoodBoardItemMutation.isPending
                      ? 'Deleting inspiration...'
                      : 'Delete inspiration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
