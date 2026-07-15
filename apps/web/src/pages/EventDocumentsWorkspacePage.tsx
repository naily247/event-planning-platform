import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CircleAlert,
  Download,
  ExternalLink,
  FileImage,
  FilePlus2,
  Files,
  FileText,
  FolderArchive,
  Image as ImageIcon,
  LoaderCircle,
  Paperclip,
  Pencil,
  Plus,
  Replace,
  Save,
  Search,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  addEventDocumentFilesWithUpload,
  createEventDocument,
  deleteEventDocument,
  deleteEventDocumentFile,
  EVENT_DOCUMENT_MAX_FILE_SIZE,
  EVENT_DOCUMENT_MAX_FILES,
  eventDocumentAllowedMimeTypes,
  eventDocumentCategories,
  getEventDocuments,
  getEventDocumentSummary,
  replaceEventDocumentFileWithUpload,
  updateEventDocument,
  uploadInitialEventDocumentFiles,
  type EventDocument,
  type EventDocumentCategory,
  type EventDocumentFile,
  type EventDocumentFileInput,
  type EventDocumentMimeTypeFilter,
  type EventDocumentSort,
} from '../features/eventDocuments/eventDocument.api';
import { getPublicVendors, type PublicVendor } from '../features/vendors/vendor.api';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type FileTypeFilter = 'all' | EventDocumentMimeTypeFilter;
type VendorFilter = 'all' | 'linked' | 'unlinked';

type ModalProps = {
  children: ReactNode;
  labelledBy: string;
  size?: 'default' | 'large';
};

const categoryLabels: Record<EventDocumentCategory, string> = {
  CONTRACT: 'Contract',
  QUOTATION: 'Quotation',
  INVOICE: 'Invoice',
  PAYMENT_RECEIPT: 'Payment receipt',
  SCHEDULE: 'Schedule',
  GUEST_LIST: 'Guest list',
  MENU: 'Menu',
  FLOOR_PLAN: 'Floor plan',
  PERMIT: 'Permit',
  VENDOR_DOCUMENT: 'Vendor document',
  REFERENCE: 'Reference',
  OTHER: 'Other',
};

const supportedMimeTypes = new Set<string>(eventDocumentAllowedMimeTypes);

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error
      ? error.message
      : 'We could not load this document workspace. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this document workspace. Please try again.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const formatCreatedDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
  }).format(new Date(value));

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
};

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

const isImageFile = (file: EventDocumentFile) =>
  file.mimeType === 'image/jpeg' || file.mimeType === 'image/png' || file.mimeType === 'image/webp';

const validateFiles = (files: File[], maximumCount: number) => {
  if (files.length === 0) {
    throw new Error('Choose at least one document file.');
  }

  if (files.length > maximumCount) {
    throw new Error(
      `You can select a maximum of ${maximumCount} ${maximumCount === 1 ? 'file' : 'files'}.`,
    );
  }

  for (const file of files) {
    if (!supportedMimeTypes.has(file.type)) {
      throw new Error(`${file.name} is not supported. Use PDF, JPEG, PNG or WebP files.`);
    }

    if (file.size <= 0) {
      throw new Error(`${file.name} is empty and cannot be uploaded.`);
    }

    if (file.size > EVENT_DOCUMENT_MAX_FILE_SIZE) {
      throw new Error(`${file.name} exceeds the 10 MB file-size limit.`);
    }
  }
};

const mapUploadedFileToInput = (
  file: Awaited<ReturnType<typeof uploadInitialEventDocumentFiles>>[number],
): EventDocumentFileInput => ({
  fileUrl: file.fileUrl,
  filePublicId: file.filePublicId,
  originalName: file.originalName,
  mimeType: file.mimeType,
  fileSize: file.fileSize,
});

function WorkspaceModal({ children, labelledBy, size = 'default' }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div className={size === 'large' ? 'mx-auto max-w-4xl' : 'mx-auto max-w-2xl'}>
        <div className="glass-card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

export function EventDocumentsWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventDocumentCategory | ''>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>('all');
  const [sort, setSort] = useState<EventDocumentSort>('newest');
  const [page, setPage] = useState(1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<EventDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<EventDocument | null>(null);
  const [documentForNewFiles, setDocumentForNewFiles] = useState<EventDocument | null>(null);
  const [fileToReplace, setFileToReplace] = useState<{
    document: EventDocument;
    file: EventDocumentFile;
  } | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{
    document: EventDocument;
    file: EventDocumentFile;
  } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventDocumentCategory>('OTHER');
  const [vendorId, setVendorId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedReplacementFile, setSelectedReplacementFile] = useState<File | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'event-documents', 'summary'],
    enabled: Boolean(eventId),
    queryFn: () => getEventDocumentSummary(eventId!),
  });

  const documentsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'event-documents',
      'documents',
      {
        page,
        search: searchQuery,
        category: categoryFilter,
        fileType: fileTypeFilter,
        vendor: vendorFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getEventDocuments(eventId!, {
        page,
        limit: 20,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        mimeType: fileTypeFilter === 'all' ? undefined : fileTypeFilter,
        hasVendor: vendorFilter === 'all' ? undefined : vendorFilter === 'linked',
        sort,
      }),
  });

  const vendorsQuery = useQuery({
    queryKey: ['public', 'vendors', 'event-document-options'],
    queryFn: () =>
      getPublicVendors({
        page: 1,
        limit: 50,
        sort: 'name_asc',
      }),
  });

  const invalidateDocumentQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'event-documents', 'summary'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'event-documents', 'documents'],
      }),
    ]);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setVendorId('');
    setSelectedFiles([]);
    setSelectedReplacementFile(null);
  };

  const createDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim();

      if (!normalizedTitle) {
        throw new Error('Enter a title for this document.');
      }

      if (normalizedTitle.length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }

      if (normalizedDescription.length > 2000) {
        throw new Error('Description cannot exceed 2000 characters.');
      }

      validateFiles(selectedFiles, EVENT_DOCUMENT_MAX_FILES);

      const uploadedFiles = await uploadInitialEventDocumentFiles(selectedFiles);

      return createEventDocument(eventId, {
        title: normalizedTitle,
        description: normalizedDescription || null,
        category,
        vendorId: vendorId || null,
        files: uploadedFiles.map(mapUploadedFileToInput),
      });
    },

    onSuccess: async () => {
      setIsCreateDialogOpen(false);
      resetForm();
      await invalidateDocumentQueries();
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !documentToEdit) {
        throw new Error('Document details are missing.');
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim() || null;
      const normalizedVendorId = vendorId || null;

      if (!normalizedTitle) {
        throw new Error('Enter a title for this document.');
      }

      if (normalizedTitle.length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }

      if (description.trim().length > 2000) {
        throw new Error('Description cannot exceed 2000 characters.');
      }

      const input: {
        title?: string;
        description?: string | null;
        category?: EventDocumentCategory;
        vendorId?: string | null;
      } = {};

      if (normalizedTitle !== documentToEdit.title) {
        input.title = normalizedTitle;
      }

      if (normalizedDescription !== documentToEdit.description) {
        input.description = normalizedDescription;
      }

      if (category !== documentToEdit.category) {
        input.category = category;
      }

      if (normalizedVendorId !== documentToEdit.vendorId) {
        input.vendorId = normalizedVendorId;
      }

      if (Object.keys(input).length === 0) {
        throw new Error('No document details were changed.');
      }

      return updateEventDocument(eventId, documentToEdit.id, input);
    },

    onSuccess: async () => {
      setDocumentToEdit(null);
      resetForm();
      await invalidateDocumentQueries();
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !documentToDelete) {
        throw new Error('Document details are missing.');
      }

      await deleteEventDocument(eventId, documentToDelete.id);
    },

    onSuccess: async () => {
      setDocumentToDelete(null);
      await invalidateDocumentQueries();
    },
  });

  const addFilesMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !documentForNewFiles) {
        throw new Error('Document details are missing.');
      }

      const remainingFileSlots = EVENT_DOCUMENT_MAX_FILES - documentForNewFiles.files.length;

      validateFiles(selectedFiles, remainingFileSlots);

      return addEventDocumentFilesWithUpload(eventId, documentForNewFiles.id, {
        files: selectedFiles,
      });
    },

    onSuccess: async () => {
      setDocumentForNewFiles(null);
      setSelectedFiles([]);
      await invalidateDocumentQueries();
    },
  });

  const replaceFileMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !fileToReplace) {
        throw new Error('File details are missing.');
      }

      if (!selectedReplacementFile) {
        throw new Error('Choose a replacement file.');
      }

      validateFiles([selectedReplacementFile], 1);

      return replaceEventDocumentFileWithUpload(
        eventId,
        fileToReplace.document.id,
        fileToReplace.file.id,
        {
          file: selectedReplacementFile,
        },
      );
    },

    onSuccess: async () => {
      setFileToReplace(null);
      setSelectedReplacementFile(null);
      await invalidateDocumentQueries();
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !fileToDelete) {
        throw new Error('File details are missing.');
      }

      await deleteEventDocumentFile(eventId, fileToDelete.document.id, fileToDelete.file.id);
    },

    onSuccess: async () => {
      setFileToDelete(null);
      await invalidateDocumentQueries();
    },
  });

  const openCreateDialog = () => {
    createDocumentMutation.reset();
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createDocumentMutation.isPending) {
      return;
    }

    createDocumentMutation.reset();
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const openEditDialog = (document: EventDocument) => {
    updateDocumentMutation.reset();
    setDocumentToEdit(document);
    setTitle(document.title);
    setDescription(document.description ?? '');
    setCategory(document.category);
    setVendorId(document.vendorId ?? '');
  };

  const closeEditDialog = () => {
    if (updateDocumentMutation.isPending) {
      return;
    }

    updateDocumentMutation.reset();
    setDocumentToEdit(null);
    resetForm();
  };

  const openAddFilesDialog = (document: EventDocument) => {
    addFilesMutation.reset();
    setSelectedFiles([]);
    setDocumentForNewFiles(document);
  };

  const closeAddFilesDialog = () => {
    if (addFilesMutation.isPending) {
      return;
    }

    addFilesMutation.reset();
    setSelectedFiles([]);
    setDocumentForNewFiles(null);
  };

  const openReplaceFileDialog = (document: EventDocument, file: EventDocumentFile) => {
    replaceFileMutation.reset();
    setSelectedReplacementFile(null);
    setFileToReplace({ document, file });
  };

  const closeReplaceFileDialog = () => {
    if (replaceFileMutation.isPending) {
      return;
    }

    replaceFileMutation.reset();
    setSelectedReplacementFile(null);
    setFileToReplace(null);
  };

  const closeDeleteDocumentDialog = () => {
    if (deleteDocumentMutation.isPending) {
      return;
    }

    deleteDocumentMutation.reset();
    setDocumentToDelete(null);
  };

  const closeDeleteFileDialog = () => {
    if (deleteFileMutation.isPending) {
      return;
    }

    deleteFileMutation.reset();
    setFileToDelete(null);
  };

  const submitSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategoryFilter('');
    setFileTypeFilter('all');
    setVendorFilter('all');
    setSort('newest');
    setPage(1);
  };

  const isLoading = summaryQuery.isLoading || documentsQuery.isLoading;
  const isError = summaryQuery.isError || documentsQuery.isError;
  const firstError = summaryQuery.error ?? documentsQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your event documents
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading contracts, receipts, plans and event files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !documentsQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Document workspace unavailable
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
                    void Promise.all([summaryQuery.refetch(), documentsQuery.refetch()]);
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

  const workspaceSummary = summaryQuery.data;
  const documents = documentsQuery.data.documents;
  const pagination = documentsQuery.data.pagination;

  const activeCategoryCount = Object.values(workspaceSummary.summary.categoryCounts).filter(
    (count) => count > 0,
  ).length;

  const filtersAreActive =
    Boolean(searchQuery) ||
    Boolean(categoryFilter) ||
    fileTypeFilter !== 'all' ||
    vendorFilter !== 'all' ||
    sort !== 'newest';

  const summaryCards = [
    {
      label: 'Document groups',
      value: workspaceSummary.summary.totalDocuments,
      helper: `${activeCategoryCount} active categories`,
      icon: FolderArchive,
    },
    {
      label: 'Stored files',
      value: workspaceSummary.summary.totalFiles,
      helper: 'Across every document group',
      icon: Files,
    },
    {
      label: 'PDF files',
      value: workspaceSummary.summary.pdfFiles,
      helper: 'Contracts, receipts and forms',
      icon: FileText,
    },
    {
      label: 'Image files',
      value: workspaceSummary.summary.imageFiles,
      helper: `${workspaceSummary.summary.linkedVendorDocuments} vendor-linked groups`,
      icon: FileImage,
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
                Event documents
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {workspaceSummary.event.name}
              </h1>
            </div>
          </div>

          <span
            className="status-chip w-fit"
            data-tone={getEventStatusTone(workspaceSummary.event.status)}
          >
            {workspaceSummary.event.status.replaceAll('_', ' ')}
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[7%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <FolderArchive className="size-4" />
                  Planning archive
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Keep every important event file in one place.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Organise contracts, quotations, receipts, schedules, floor plans and vendor files
                  without losing track of the latest copy.
                </p>
              </div>

              <div className="glass-card p-5">
                <Paperclip className="size-6 text-[var(--color-deep-plum)]" />

                <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">Event date</p>

                <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {formatEventDate(workspaceSummary.event.eventDate)}
                </p>

                <p className="mt-3 text-sm font-semibold text-[var(--color-rosewood)]">
                  {workspaceSummary.summary.totalFiles} files organised
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper, icon: Icon }) => (
              <article key={label} className="luxe-card p-6">
                <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
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

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.28fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Document library
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Files organised for this event.
                  </h2>
                </div>

                <button
                  type="button"
                  className="btn-primary shrink-0 text-sm font-bold"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-4" />
                  Add document
                </button>
              </div>

              <form
                className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitSearch();
                }}
              >
                <div className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/24 px-4 backdrop-blur-xl">
                  <Search className="size-5 shrink-0 text-[var(--color-charcoal)]/42" />

                  <input
                    className="min-h-12 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--color-charcoal)]/42"
                    type="search"
                    placeholder="Search titles, descriptions, filenames or vendors"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                    }}
                  />
                </div>

                <select
                  className="form-field min-h-12 lg:w-48"
                  aria-label="Filter documents by category"
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value as EventDocumentCategory | '');
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>

                  {eventDocumentCategories.map((documentCategory) => (
                    <option key={documentCategory} value={documentCategory}>
                      {categoryLabels[documentCategory]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12 lg:w-40"
                  aria-label="Filter documents by file type"
                  value={fileTypeFilter}
                  onChange={(event) => {
                    setFileTypeFilter(event.target.value as FileTypeFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">All file types</option>
                  <option value="PDF">PDF files</option>
                  <option value="IMAGE">Images</option>
                </select>

                <select
                  className="form-field min-h-12 lg:w-44"
                  aria-label="Filter documents by linked vendor"
                  value={vendorFilter}
                  onChange={(event) => {
                    setVendorFilter(event.target.value as VendorFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">All vendor links</option>
                  <option value="linked">Linked vendor</option>
                  <option value="unlinked">No vendor</option>
                </select>

                <select
                  className="form-field min-h-12 lg:w-48"
                  aria-label="Sort event documents"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as EventDocumentSort);
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

                <div className="flex flex-wrap gap-3 lg:col-span-3">
                  <button type="submit" className="btn-primary text-sm font-bold">
                    <Search className="size-4" />
                    Search
                  </button>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </form>

              {documents.length > 0 ? (
                <div className="mt-8 grid gap-5 xl:grid-cols-2">
                  {documents.map((document) => (
                    <article
                      key={document.id}
                      className="overflow-hidden rounded-[1.65rem] border border-white/55 bg-white/24 backdrop-blur-2xl"
                    >
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                                <FolderArchive className="size-5" />
                              </div>

                              <div className="min-w-0">
                                <h3 className="truncate text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                                  {document.title}
                                </h3>

                                <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                                  {categoryLabels[document.category]}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="grid size-9 place-items-center rounded-full border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.16)]"
                              aria-label={`Edit ${document.title}`}
                              onClick={() => {
                                openEditDialog(document);
                              }}
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              type="button"
                              className="grid size-9 place-items-center rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
                              aria-label={`Delete ${document.title}`}
                              onClick={() => {
                                deleteDocumentMutation.reset();
                                setDocumentToDelete(document);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        {document.description ? (
                          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                            {document.description}
                          </p>
                        ) : null}

                        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                          <span>
                            {document.files.length} {document.files.length === 1 ? 'file' : 'files'}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>Added {formatCreatedDate(document.createdAt)}</span>
                        </div>

                        {document.vendor ? (
                          <Link
                            className="mt-5 flex items-center gap-2 rounded-2xl bg-white/28 px-4 py-3 text-sm font-black text-[var(--color-deep-plum)] transition hover:bg-white/38"
                            to={`/vendors/${document.vendor.slug}`}
                          >
                            <Store className="size-4" />
                            {document.vendor.businessName}
                          </Link>
                        ) : null}

                        <div className="mt-5 space-y-3">
                          {document.files.map((file) => (
                            <div
                              key={file.id}
                              className="rounded-2xl border border-white/60 bg-white/28 p-3"
                            >
                              <div className="flex items-center gap-3">
                                {isImageFile(file) ? (
                                  <img
                                    className="size-14 shrink-0 rounded-xl object-cover"
                                    src={file.fileUrl}
                                    alt=""
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)]">
                                    <FileText className="size-6" />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                                    {file.originalName}
                                  </p>

                                  <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                                    {formatFileSize(file.fileSize)}
                                  </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                  <a
                                    className="grid size-8 place-items-center rounded-full text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.10)]"
                                    href={file.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Open ${file.originalName}`}
                                  >
                                    <ExternalLink className="size-4" />
                                  </a>

                                  <a
                                    className="grid size-8 place-items-center rounded-full text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.10)]"
                                    href={file.fileUrl}
                                    download={file.originalName}
                                    aria-label={`Download ${file.originalName}`}
                                  >
                                    <Download className="size-4" />
                                  </a>

                                  <button
                                    type="button"
                                    className="grid size-8 place-items-center rounded-full text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.10)]"
                                    aria-label={`Replace ${file.originalName}`}
                                    onClick={() => {
                                      openReplaceFileDialog(document, file);
                                    }}
                                  >
                                    <Replace className="size-4" />
                                  </button>

                                  <button
                                    type="button"
                                    className="grid size-8 place-items-center rounded-full text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.10)] disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label={`Delete ${file.originalName}`}
                                    disabled={document.files.length <= 1}
                                    onClick={() => {
                                      deleteFileMutation.reset();
                                      setFileToDelete({
                                        document,
                                        file,
                                      });
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="btn-secondary mt-5 w-full justify-center text-sm font-bold"
                          disabled={document.files.length >= EVENT_DOCUMENT_MAX_FILES}
                          onClick={() => {
                            openAddFilesDialog(document);
                          }}
                        >
                          <FilePlus2 className="size-4" />
                          {document.files.length >= EVENT_DOCUMENT_MAX_FILES
                            ? 'Maximum files added'
                            : 'Add another file'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <FolderArchive className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {filtersAreActive
                      ? 'No documents match these filters'
                      : 'No event documents yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try changing the search term or document filters.'
                      : 'Upload your first contract, quotation, receipt, schedule or reference file.'}
                  </p>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary mt-5 text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary mt-5 text-sm font-bold"
                      onClick={openCreateDialog}
                    >
                      <Plus className="size-4" />
                      Add document
                    </button>
                  )}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} documents)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || documentsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || documentsQuery.isFetching}
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
              <article className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <FolderArchive className="size-6 text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">
                  Document categories
                </h2>

                <p className="mt-3 leading-7 text-white/68">
                  See how your event paperwork and references are currently organised.
                </p>

                <div className="mt-8 space-y-3">
                  {eventDocumentCategories
                    .filter(
                      (documentCategory) =>
                        workspaceSummary.summary.categoryCounts[documentCategory] > 0,
                    )
                    .map((documentCategory) => (
                      <div
                        key={documentCategory}
                        className="flex items-center justify-between rounded-2xl bg-white/14 px-4 py-3 backdrop-blur"
                      >
                        <span className="text-sm font-bold text-white/72">
                          {categoryLabels[documentCategory]}
                        </span>

                        <span className="text-lg font-black">
                          {workspaceSummary.summary.categoryCounts[documentCategory]}
                        </span>
                      </div>
                    ))}

                  {activeCategoryCount === 0 ? (
                    <p className="rounded-2xl bg-white/12 px-4 py-4 text-sm font-semibold leading-6 text-white/64">
                      Categories will appear after the first document is uploaded.
                    </p>
                  ) : null}
                </div>
              </article>

              <article className="glass-card p-6">
                <Upload className="size-6 text-[var(--color-deep-plum)]" />

                <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Upload rules
                </h2>

                <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  <p>PDF, JPEG, PNG and WebP only.</p>
                  <p>Maximum 10 MB per file.</p>
                  <p>Maximum 3 files per document group.</p>
                  <p>At least one file must always remain.</p>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {isCreateDialogOpen ? (
        <WorkspaceModal labelledBy="create-event-document-title" size="large">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <FilePlus2 className="size-4" />
                New document
              </div>

              <h2
                id="create-event-document-title"
                className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
              >
                Add files to the event library.
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-[var(--color-charcoal)]/66">
                Create one organised document group containing up to three related files.
              </p>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
              aria-label="Close document form"
              disabled={createDocumentMutation.isPending}
              onClick={closeCreateDialog}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  Title
                </span>

                <input
                  className="form-field"
                  type="text"
                  maxLength={150}
                  value={title}
                  disabled={createDocumentMutation.isPending}
                  onChange={(event) => {
                    createDocumentMutation.reset();
                    setTitle(event.target.value);
                  }}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  Category
                </span>

                <select
                  className="form-field"
                  value={category}
                  disabled={createDocumentMutation.isPending}
                  onChange={(event) => {
                    createDocumentMutation.reset();
                    setCategory(event.target.value as EventDocumentCategory);
                  }}
                >
                  {eventDocumentCategories.map((documentCategory) => (
                    <option key={documentCategory} value={documentCategory}>
                      {categoryLabels[documentCategory]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Description
              </span>

              <textarea
                className="form-field min-h-28 resize-y"
                maxLength={2000}
                value={description}
                disabled={createDocumentMutation.isPending}
                onChange={(event) => {
                  createDocumentMutation.reset();
                  setDescription(event.target.value);
                }}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Linked vendor
              </span>

              <select
                className="form-field"
                value={vendorId}
                disabled={createDocumentMutation.isPending || vendorsQuery.isLoading}
                onChange={(event) => {
                  createDocumentMutation.reset();
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
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Document files
              </span>

              <div className="rounded-[1.5rem] border border-dashed border-[rgba(93,58,85,0.28)] bg-white/20 p-5">
                <input
                  className="block w-full text-sm font-semibold text-[var(--color-charcoal)]/66 file:mr-4 file:rounded-xl file:border-0 file:bg-[rgba(93,58,85,0.12)] file:px-4 file:py-2 file:text-sm file:font-black file:text-[var(--color-deep-plum)]"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  disabled={createDocumentMutation.isPending}
                  onChange={(event) => {
                    createDocumentMutation.reset();
                    setSelectedFiles(Array.from(event.target.files ?? []));
                  }}
                />

                <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                  Choose one to three PDF or image files. Each file must be 10 MB or smaller.
                </p>

                {selectedFiles.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/28 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                            {file.name}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                            {formatFileSize(file.size)}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.10)]"
                          aria-label={`Remove ${file.name}`}
                          disabled={createDocumentMutation.isPending}
                          onClick={() => {
                            setSelectedFiles((currentFiles) =>
                              currentFiles.filter((currentFile) => currentFile !== file),
                            );
                          }}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>

            {vendorsQuery.isError ? (
              <div
                role="alert"
                className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(vendorsQuery.error)}
              </div>
            ) : null}

            {createDocumentMutation.isError ? (
              <div
                role="alert"
                className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(createDocumentMutation.error)}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={createDocumentMutation.isPending}
                onClick={closeCreateDialog}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary justify-center text-sm font-bold"
                disabled={createDocumentMutation.isPending}
                onClick={() => {
                  createDocumentMutation.mutate();
                }}
              >
                {createDocumentMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}

                {createDocumentMutation.isPending ? 'Uploading document...' : 'Add document'}
              </button>
            </div>
          </div>
        </WorkspaceModal>
      ) : null}

      {documentToEdit ? (
        <WorkspaceModal labelledBy="edit-event-document-title">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <Pencil className="size-4" />
                Edit document
              </div>

              <h2
                id="edit-event-document-title"
                className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
              >
                Update document details.
              </h2>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
              aria-label="Close edit document form"
              disabled={updateDocumentMutation.isPending}
              onClick={closeEditDialog}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            <label>
              <span className="mb-2 block text-sm font-black">Title</span>

              <input
                className="form-field"
                type="text"
                maxLength={150}
                value={title}
                disabled={updateDocumentMutation.isPending}
                onChange={(event) => {
                  updateDocumentMutation.reset();
                  setTitle(event.target.value);
                }}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black">Description</span>

              <textarea
                className="form-field min-h-28 resize-y"
                maxLength={2000}
                value={description}
                disabled={updateDocumentMutation.isPending}
                onChange={(event) => {
                  updateDocumentMutation.reset();
                  setDescription(event.target.value);
                }}
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-black">Category</span>

                <select
                  className="form-field"
                  value={category}
                  disabled={updateDocumentMutation.isPending}
                  onChange={(event) => {
                    updateDocumentMutation.reset();
                    setCategory(event.target.value as EventDocumentCategory);
                  }}
                >
                  {eventDocumentCategories.map((documentCategory) => (
                    <option key={documentCategory} value={documentCategory}>
                      {categoryLabels[documentCategory]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-black">Linked vendor</span>

                <select
                  className="form-field"
                  value={vendorId}
                  disabled={updateDocumentMutation.isPending || vendorsQuery.isLoading}
                  onChange={(event) => {
                    updateDocumentMutation.reset();
                    setVendorId(event.target.value);
                  }}
                >
                  <option value="">No linked vendor</option>

                  {(vendorsQuery.data?.vendors ?? []).map((vendor: PublicVendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.businessName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {updateDocumentMutation.isError ? (
              <div
                role="alert"
                className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(updateDocumentMutation.error)}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={updateDocumentMutation.isPending}
                onClick={closeEditDialog}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary justify-center text-sm font-bold"
                disabled={updateDocumentMutation.isPending}
                onClick={() => {
                  updateDocumentMutation.mutate();
                }}
              >
                {updateDocumentMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}

                {updateDocumentMutation.isPending ? 'Saving changes...' : 'Save changes'}
              </button>
            </div>
          </div>
        </WorkspaceModal>
      ) : null}

      {documentForNewFiles ? (
        <WorkspaceModal labelledBy="add-document-files-title">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <FilePlus2 className="size-4" />
                Add files
              </div>

              <h2
                id="add-document-files-title"
                className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
              >
                Add files to {documentForNewFiles.title}.
              </h2>

              <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                {EVENT_DOCUMENT_MAX_FILES - documentForNewFiles.files.length} file slots remain.
              </p>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
              aria-label="Close add files form"
              disabled={addFilesMutation.isPending}
              onClick={closeAddFilesDialog}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            <input
              className="block w-full text-sm font-semibold file:mr-4 file:rounded-xl file:border-0 file:bg-[rgba(93,58,85,0.12)] file:px-4 file:py-2 file:text-sm file:font-black file:text-[var(--color-deep-plum)]"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              disabled={addFilesMutation.isPending}
              onChange={(event) => {
                addFilesMutation.reset();
                setSelectedFiles(Array.from(event.target.files ?? []));
              }}
            />

            {selectedFiles.length > 0 ? (
              <div className="space-y-2">
                {selectedFiles.map((file) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="rounded-2xl border border-white/60 bg-white/28 px-4 py-3"
                  >
                    <p className="truncate text-sm font-black">{file.name}</p>
                    <p className="mt-1 text-xs font-semibold opacity-55">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {addFilesMutation.isError ? (
              <div
                role="alert"
                className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(addFilesMutation.error)}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={addFilesMutation.isPending}
                onClick={closeAddFilesDialog}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary justify-center text-sm font-bold"
                disabled={addFilesMutation.isPending}
                onClick={() => {
                  addFilesMutation.mutate();
                }}
              >
                {addFilesMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}

                {addFilesMutation.isPending ? 'Uploading files...' : 'Add files'}
              </button>
            </div>
          </div>
        </WorkspaceModal>
      ) : null}

      {fileToReplace ? (
        <WorkspaceModal labelledBy="replace-document-file-title">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <Replace className="size-4" />
                Replace file
              </div>

              <h2
                id="replace-document-file-title"
                className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
              >
                Replace {fileToReplace.file.originalName}.
              </h2>

              <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                The previous Cloudinary file will be removed after replacement.
              </p>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
              aria-label="Close replacement form"
              disabled={replaceFileMutation.isPending}
              onClick={closeReplaceFileDialog}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            <input
              className="block w-full text-sm font-semibold file:mr-4 file:rounded-xl file:border-0 file:bg-[rgba(93,58,85,0.12)] file:px-4 file:py-2 file:text-sm file:font-black file:text-[var(--color-deep-plum)]"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              disabled={replaceFileMutation.isPending}
              onChange={(event) => {
                replaceFileMutation.reset();
                setSelectedReplacementFile(event.target.files?.[0] ?? null);
              }}
            />

            {selectedReplacementFile ? (
              <div className="rounded-2xl border border-white/60 bg-white/28 px-4 py-3">
                <p className="truncate text-sm font-black">{selectedReplacementFile.name}</p>
                <p className="mt-1 text-xs font-semibold opacity-55">
                  {formatFileSize(selectedReplacementFile.size)}
                </p>
              </div>
            ) : null}

            {replaceFileMutation.isError ? (
              <div
                role="alert"
                className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(replaceFileMutation.error)}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={replaceFileMutation.isPending}
                onClick={closeReplaceFileDialog}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary justify-center text-sm font-bold"
                disabled={replaceFileMutation.isPending}
                onClick={() => {
                  replaceFileMutation.mutate();
                }}
              >
                {replaceFileMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Replace className="size-4" />
                )}

                {replaceFileMutation.isPending ? 'Replacing file...' : 'Replace file'}
              </button>
            </div>
          </div>
        </WorkspaceModal>
      ) : null}

      {documentToDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-document-title"
        >
          <div className="glass-card w-full max-w-lg p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-event-document-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Delete this document?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              <strong>{documentToDelete.title}</strong> and all {documentToDelete.files.length}{' '}
              associated files will be permanently removed.
            </p>

            {deleteDocumentMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteDocumentMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={deleteDocumentMutation.isPending}
                onClick={closeDeleteDocumentDialog}
              >
                Keep document
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={deleteDocumentMutation.isPending}
                onClick={() => {
                  deleteDocumentMutation.mutate();
                }}
              >
                {deleteDocumentMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteDocumentMutation.isPending ? 'Deleting...' : 'Delete document'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {fileToDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-document-file-title"
        >
          <div className="glass-card w-full max-w-lg p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-event-document-file-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Delete this file?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              <strong>{fileToDelete.file.originalName}</strong> will be removed from{' '}
              <strong>{fileToDelete.document.title}</strong> and from cloud storage.
            </p>

            {deleteFileMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteFileMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={deleteFileMutation.isPending}
                onClick={closeDeleteFileDialog}
              >
                Keep file
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={deleteFileMutation.isPending}
                onClick={() => {
                  deleteFileMutation.mutate();
                }}
              >
                {deleteFileMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteFileMutation.isPending ? 'Deleting...' : 'Delete file'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
