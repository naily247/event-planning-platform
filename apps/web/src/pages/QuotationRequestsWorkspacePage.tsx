import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileText,
  LoaderCircle,
  MapPin,
  MessageSquareQuote,
  PackageCheck,
  Plus,
  Search,
  Send,
  Sparkles,
  Store,
  Tags,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  acceptQuotation,
  createQuotationRequest,
  getQuotationRequestQuotations,
  getQuotationRequests,
  quotationRequestStatuses,
  type CustomerQuotation,
  type CustomerQuotationRequest,
  type QuotationRequestSort,
  type QuotationRequestStatus,
  type QuotationStatus,
} from '../features/quotationRequests/quotationRequest.api';

import { createCustomerBooking, type CustomerBooking } from '../features/bookings/booking.api';

import { api } from '../lib/api';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type PublicPackage = {
  id: string;
  title: string;
  description: string | null;
  basePrice: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    baseLocation: string | null;
    serviceAreas: string[];
  };
  createdAt: string;
  updatedAt: string;
};

type PackagePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type PackageListResponse = {
  success: true;
  data: PublicPackage[];
  meta: {
    pagination: PackagePagination;
  };
};

type StatusFilter = QuotationRequestStatus | '';

const quotationRequestStatusLabels: Record<QuotationRequestStatus, string> = {
  SENT: 'Sent',
  VIEWED: 'Viewed',
  CLARIFICATION_REQUESTED: 'Clarification requested',
  QUOTED: 'Quotation received',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CLOSED: 'Closed',
};

const quotationStatusLabels: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  CLARIFICATION_REQUESTED: 'Clarification requested',
  REVISED: 'Revised',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error
      ? error.message
      : 'Something went wrong while loading quotation requests.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong while loading quotation requests.'
  );
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatLongDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const formatCurrency = (value: string | null) => {
  if (!value) {
    return 'Price on request';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Price on request';
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const toIsoDateTimeOrNull = (value: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const date = new Date(normalizedValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Choose a valid response deadline.');
  }

  if (date.getTime() <= Date.now()) {
    throw new Error('Response deadline must be in the future.');
  }

  return date.toISOString();
};

const toIsoServiceDateTime = (value: string, fieldLabel: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldLabel} is required.`);
  }

  const date = new Date(normalizedValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Choose a valid ${fieldLabel.toLowerCase()}.`);
  }

  if (date.getTime() <= Date.now()) {
    throw new Error(`${fieldLabel} must be in the future.`);
  }

  return date.toISOString();
};

const toOptionalIsoServiceDateTime = (value: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const date = new Date(normalizedValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Choose a valid service end time.');
  }

  return date.toISOString();
};

const toLocalDateTimeInput = (value: string) => {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getRequestTone = (
  status: QuotationRequestStatus,
): 'gray' | 'blue' | 'green' | 'plum' | 'rose' => {
  switch (status) {
    case 'ACCEPTED':
      return 'green';

    case 'QUOTED':
    case 'CLARIFICATION_REQUESTED':
      return 'plum';

    case 'VIEWED':
      return 'blue';

    case 'DECLINED':
    case 'CLOSED':
      return 'rose';

    case 'SENT':
    default:
      return 'gray';
  }
};

const getQuotationTone = (status: QuotationStatus): 'gray' | 'blue' | 'green' | 'plum' | 'rose' => {
  switch (status) {
    case 'ACCEPTED':
      return 'green';

    case 'REJECTED':
    case 'WITHDRAWN':
    case 'EXPIRED':
      return 'rose';

    case 'VIEWED':
      return 'blue';

    case 'SENT':
    case 'REVISED':
    case 'CLARIFICATION_REQUESTED':
      return 'plum';

    case 'DRAFT':
    default:
      return 'gray';
  }
};

const isQuotationExpired = (quotation: CustomerQuotation) =>
  Boolean(quotation.expiresAt && new Date(quotation.expiresAt).getTime() <= Date.now());

export function QuotationRequestsWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sort, setSort] = useState<QuotationRequestSort>('newest');
  const [page, setPage] = useState(1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CustomerQuotationRequest | null>(null);
  const [quotationToAccept, setQuotationToAccept] = useState<CustomerQuotation | null>(null);
  const [quotationToBook, setQuotationToBook] = useState<CustomerQuotation | null>(null);
  const [createdBooking, setCreatedBooking] = useState<CustomerBooking | null>(null);
  const [serviceStart, setServiceStart] = useState('');
  const [serviceEnd, setServiceEnd] = useState('');

  const [packageSearchInput, setPackageSearchInput] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PublicPackage | null>(null);
  const [requirements, setRequirements] = useState('');
  const [responseDueAt, setResponseDueAt] = useState('');

  const requestsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'quotation-requests',
      {
        page,
        status: statusFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getQuotationRequests({
        eventId: eventId!,
        page,
        limit: 20,
        status: statusFilter || undefined,
        sort,
      }),
  });

  const summaryQueries = useQuery({
    queryKey: ['customer', 'events', eventId, 'quotation-requests', 'summary-counts'],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const statuses: QuotationRequestStatus[] = [
        'SENT',
        'VIEWED',
        'CLARIFICATION_REQUESTED',
        'QUOTED',
        'ACCEPTED',
        'DECLINED',
        'CLOSED',
      ];

      const results = await Promise.all(
        statuses.map(async (requestStatus) => {
          const result = await getQuotationRequests({
            eventId: eventId!,
            status: requestStatus,
            page: 1,
            limit: 1,
            sort: 'newest',
          });

          return [requestStatus, result.pagination.total] as const;
        }),
      );

      return Object.fromEntries(results) as Record<QuotationRequestStatus, number>;
    },
  });

  const packagesQuery = useQuery({
    queryKey: ['public', 'packages', 'quotation-request-options', packageSearch],
    enabled: isCreateDialogOpen,
    queryFn: async () => {
      const response = await api.get<PackageListResponse>('/packages', {
        params: {
          page: 1,
          limit: 50,
          sort: 'title_asc',
          ...(packageSearch && {
            search: packageSearch,
          }),
        },
      });

      return {
        packages: response.data.data,
        pagination: response.data.meta.pagination,
      };
    },
  });

  const quotationsQuery = useQuery({
    queryKey: ['customer', 'quotation-requests', selectedRequest?.id, 'quotations'],
    enabled: Boolean(selectedRequest),
    queryFn: () => getQuotationRequestQuotations(selectedRequest!.id),
  });

  const invalidateQuotationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'quotation-requests'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard', 'customer'],
      }),
    ]);
  };

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      if (!selectedPackage) {
        throw new Error('Choose a service package.');
      }

      const normalizedRequirements = requirements.trim();

      if (normalizedRequirements.length < 10) {
        throw new Error('Requirements must contain at least 10 characters.');
      }

      if (normalizedRequirements.length > 5000) {
        throw new Error('Requirements cannot exceed 5000 characters.');
      }

      const normalizedDeadline = toIsoDateTimeOrNull(responseDueAt);

      return createQuotationRequest({
        eventId,
        packageId: selectedPackage.id,
        requirements: normalizedRequirements,
        responseDueAt: normalizedDeadline,
      });
    },

    onSuccess: async () => {
      setIsCreateDialogOpen(false);
      setSelectedPackage(null);
      setPackageSearch('');
      setPackageSearchInput('');
      setRequirements('');
      setResponseDueAt('');

      await invalidateQuotationQueries();
    },
  });

  const acceptQuotationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !quotationToAccept) {
        throw new Error('Quotation details are missing.');
      }

      return acceptQuotation(selectedRequest.id, quotationToAccept.id);
    },

    onSuccess: async () => {
      setQuotationToAccept(null);

      await Promise.all([
        invalidateQuotationQueries(),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'quotation-requests', selectedRequest?.id, 'quotations'],
        }),
      ]);
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!quotationToBook) {
        throw new Error('Accepted quotation details are missing.');
      }

      const normalizedServiceStart = toIsoServiceDateTime(serviceStart, 'Service start');

      const normalizedServiceEnd = toOptionalIsoServiceDateTime(serviceEnd);

      if (
        normalizedServiceEnd &&
        new Date(normalizedServiceEnd).getTime() <= new Date(normalizedServiceStart).getTime()
      ) {
        throw new Error('Service end must be after the service start.');
      }

      return createCustomerBooking({
        quotationId: quotationToBook.id,
        serviceStart: normalizedServiceStart,
        serviceEnd: normalizedServiceEnd,
      });
    },

    onSuccess: async (booking) => {
      setCreatedBooking(booking);
      setQuotationToBook(null);
      setServiceStart('');
      setServiceEnd('');

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'bookings'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'bookings'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['notifications'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'customer'],
        }),
      ]);
    },
  });

  const openCreateDialog = () => {
    createRequestMutation.reset();
    setSelectedPackage(null);
    setPackageSearch('');
    setPackageSearchInput('');
    setRequirements('');
    setResponseDueAt('');
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createRequestMutation.isPending) {
      return;
    }

    createRequestMutation.reset();
    setIsCreateDialogOpen(false);
    setSelectedPackage(null);
    setPackageSearch('');
    setPackageSearchInput('');
    setRequirements('');
    setResponseDueAt('');
  };

  const closeQuotationDialog = () => {
    if (acceptQuotationMutation.isPending) {
      return;
    }

    setSelectedRequest(null);
    setQuotationToAccept(null);
    acceptQuotationMutation.reset();
  };

  const openCreateBookingDialog = (quotation: CustomerQuotation) => {
    createBookingMutation.reset();
    setCreatedBooking(null);
    setQuotationToBook(quotation);
    setServiceStart(selectedRequest ? toLocalDateTimeInput(selectedRequest.event.eventDate) : '');
    setServiceEnd('');
  };

  const closeCreateBookingDialog = () => {
    if (createBookingMutation.isPending) {
      return;
    }

    createBookingMutation.reset();
    setQuotationToBook(null);
    setServiceStart('');
    setServiceEnd('');
  };

  const filtersAreActive = Boolean(statusFilter) || sort !== 'newest';

  const clearFilters = () => {
    setStatusFilter('');
    setSort('newest');
    setPage(1);
  };

  const isLoading = requestsQuery.isLoading || summaryQueries.isLoading;

  const isError = requestsQuery.isError || summaryQueries.isError;

  const firstError = requestsQuery.error ?? summaryQueries.error;

  const requestCounts = summaryQueries.data;

  const totalRequests = useMemo(() => {
    if (!requestCounts) {
      return 0;
    }

    return Object.values(requestCounts).reduce((sum, count) => sum + count, 0);
  }, [requestCounts]);

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening quotation requests
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading vendors, packages, responses and pricing activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !requestsQuery.data || !requestCounts) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Quotation workspace unavailable
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
                    void Promise.all([requestsQuery.refetch(), summaryQueries.refetch()]);
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

  const requests = requestsQuery.data.quotationRequests;
  const pagination = requestsQuery.data.pagination;

  const eventDetails = requests[0]?.event ?? null;

  const summaryCards = [
    {
      label: 'Total requests',
      value: totalRequests,
      helper: `${requestCounts.SENT + requestCounts.VIEWED} awaiting vendor action`,
      icon: MessageSquareQuote,
    },
    {
      label: 'Quotations received',
      value: requestCounts.QUOTED,
      helper: 'Ready for review and comparison',
      icon: WalletCards,
    },
    {
      label: 'Accepted',
      value: requestCounts.ACCEPTED,
      helper: 'Approved vendor proposals',
      icon: CheckCircle2,
    },
    {
      label: 'Needs clarification',
      value: requestCounts.CLARIFICATION_REQUESTED,
      helper: `${requestCounts.CLOSED + requestCounts.DECLINED} closed or declined`,
      icon: Clock3,
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
                Quotation requests
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {eventDetails?.name ?? 'Event quotations'}
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone="plum">
            <MessageSquareQuote className="size-4" />
            {totalRequests} requests
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[7%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  Vendor proposals
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Request, compare and approve vendor quotations.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Choose an active vendor package, explain what your event needs and review the
                  vendor’s final pricing before making a commitment.
                </p>
              </div>

              <div className="glass-card p-5">
                <CalendarClock className="size-6 text-[var(--color-deep-plum)]" />

                <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">Event date</p>

                <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {eventDetails
                    ? formatLongDate(eventDetails.eventDate)
                    : 'Available after the first request'}
                </p>

                <p className="mt-3 text-sm font-semibold text-[var(--color-rosewood)]">
                  {requestCounts.QUOTED} quotations currently ready
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
                    Request history
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Vendor quotation activity.
                  </h2>
                </div>

                <button
                  type="button"
                  className="btn-primary shrink-0 text-sm font-bold"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-4" />
                  Request quotation
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <select
                  className="form-field min-h-12"
                  aria-label="Filter quotation requests by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>

                  {quotationRequestStatuses.map((requestStatus) => (
                    <option key={requestStatus} value={requestStatus}>
                      {quotationRequestStatusLabels[requestStatus]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12"
                  aria-label="Sort quotation requests"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as QuotationRequestSort);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>

              {filtersAreActive ? (
                <button
                  type="button"
                  className="btn-secondary mt-4 text-sm font-bold"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : null}

              {requests.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {requests.map((request) => (
                    <article
                      key={request.id}
                      className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl sm:p-6"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="status-chip"
                              data-tone={getRequestTone(request.status)}
                            >
                              {quotationRequestStatusLabels[request.status]}
                            </span>

                            {request.package?.category ? (
                              <span className="status-chip" data-tone="gray">
                                <Tags className="size-3.5" />
                                {request.package.category.name}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                            {request.package?.title ?? 'Custom service request'}
                          </h3>

                          <Link
                            to={`/vendors/${request.vendor.slug}`}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)]"
                          >
                            <Store className="size-4" />
                            {request.vendor.businessName}
                          </Link>

                          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                            {request.requirements}
                          </p>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-2xl bg-white/28 p-4">
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                Base price
                              </p>
                              <p className="mt-2 font-black text-[var(--color-near-black)]">
                                {formatCurrency(request.package?.basePrice ?? null)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-white/28 p-4">
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                Response deadline
                              </p>
                              <p className="mt-2 font-black text-[var(--color-near-black)]">
                                {request.responseDueAt
                                  ? formatDate(request.responseDueAt)
                                  : 'No deadline'}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-white/28 p-4">
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                Requested
                              </p>
                              <p className="mt-2 font-black text-[var(--color-near-black)]">
                                {formatDate(request.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-secondary shrink-0 justify-center text-sm font-bold"
                          onClick={() => {
                            setSelectedRequest(request);
                            acceptQuotationMutation.reset();
                          }}
                        >
                          <MessageSquareQuote className="size-4" />
                          View quotations
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <MessageSquareQuote className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {filtersAreActive
                      ? 'No quotation requests match this filter'
                      : 'No quotation requests yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try changing the request status or sorting option.'
                      : 'Choose a vendor package and send the first quotation request for this event.'}
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
                      Request quotation
                    </button>
                  )}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} requests)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || requestsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || requestsQuery.isFetching}
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
                <MessageSquareQuote className="size-6 text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Request progress</h2>

                <p className="mt-3 leading-7 text-white/68">
                  Follow each request from initial delivery through vendor review, quotation and
                  acceptance.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    {
                      label: 'Sent',
                      value: requestCounts.SENT,
                    },
                    {
                      label: 'Viewed',
                      value: requestCounts.VIEWED,
                    },
                    {
                      label: 'Quoted',
                      value: requestCounts.QUOTED,
                    },
                    {
                      label: 'Accepted',
                      value: requestCounts.ACCEPTED,
                    },
                  ].map(({ label, value }) => (
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
                <PackageCheck className="size-6 text-[var(--color-deep-plum)]" />

                <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Before accepting
                </h2>

                <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  <p>Review the final proposed price.</p>
                  <p>Check the required deposit.</p>
                  <p>Read all inclusions and exclusions.</p>
                  <p>Confirm the expiry date and vendor terms.</p>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-quotation-request-title"
        >
          <div className="mx-auto max-w-5xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Send className="size-4" />
                    New quotation request
                  </div>

                  <h2
                    id="create-quotation-request-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Ask a vendor for a proposal.
                  </h2>

                  <p className="mt-3 max-w-2xl leading-7 text-[var(--color-charcoal)]/66">
                    Select an active package, describe your event needs and optionally give the
                    vendor a response deadline.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
                  aria-label="Close quotation request form"
                  disabled={createRequestMutation.isPending}
                  onClick={closeCreateDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <section>
                  <form
                    className="flex gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setPackageSearch(packageSearchInput.trim());
                    }}
                  >
                    <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-white/55 bg-white/24 px-4">
                      <Search className="size-4 shrink-0 text-[var(--color-charcoal)]/42" />

                      <input
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                        type="search"
                        placeholder="Search packages or vendors"
                        value={packageSearchInput}
                        disabled={createRequestMutation.isPending}
                        onChange={(event) => {
                          setPackageSearchInput(event.target.value);
                        }}
                      />
                    </div>

                    <button type="submit" className="btn-secondary px-4 text-sm font-bold">
                      Search
                    </button>
                  </form>

                  <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                    {packagesQuery.isLoading ? (
                      <div className="grid min-h-44 place-items-center rounded-2xl border border-white/55 bg-white/20">
                        <LoaderCircle className="size-7 animate-spin text-[var(--color-deep-plum)]" />
                      </div>
                    ) : null}

                    {packagesQuery.isError ? (
                      <div
                        role="alert"
                        className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                      >
                        {getApiErrorMessage(packagesQuery.error)}
                      </div>
                    ) : null}

                    {(packagesQuery.data?.packages ?? []).map((servicePackage) => {
                      const isSelected = selectedPackage?.id === servicePackage.id;

                      return (
                        <button
                          key={servicePackage.id}
                          type="button"
                          className={
                            isSelected
                              ? 'w-full rounded-[1.35rem] border border-[rgba(93,58,85,0.34)] bg-[rgba(93,58,85,0.10)] p-4 text-left'
                              : 'w-full rounded-[1.35rem] border border-white/55 bg-white/24 p-4 text-left transition hover:bg-white/34'
                          }
                          disabled={createRequestMutation.isPending}
                          onClick={() => {
                            createRequestMutation.reset();
                            setSelectedPackage(servicePackage);
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-black text-[var(--color-near-black)]">
                                {servicePackage.title}
                              </p>

                              <p className="mt-1 text-sm font-bold text-[var(--color-deep-plum)]">
                                {servicePackage.vendor.businessName}
                              </p>
                            </div>

                            <span className="text-sm font-black text-[var(--color-rosewood)]">
                              {formatCurrency(servicePackage.basePrice)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="status-chip" data-tone="gray">
                              <Tags className="size-3.5" />
                              {servicePackage.category.name}
                            </span>

                            {servicePackage.vendor.baseLocation ? (
                              <span className="status-chip" data-tone="blue">
                                <MapPin className="size-3.5" />
                                {servicePackage.vendor.baseLocation}
                              </span>
                            ) : null}
                          </div>

                          {servicePackage.description ? (
                            <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                              {servicePackage.description}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}

                    {packagesQuery.data && packagesQuery.data.packages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/70 bg-white/20 p-6 text-center">
                        <PackageCheck className="mx-auto size-8 text-[var(--color-deep-plum)]" />
                        <p className="mt-3 font-black text-[var(--color-near-black)]">
                          No packages found
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-white/55 bg-white/20 p-5 sm:p-6">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                    Request details
                  </p>

                  {selectedPackage ? (
                    <div className="mt-5 rounded-2xl bg-white/28 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-[var(--color-near-black)]">
                            {selectedPackage.title}
                          </p>
                          <p className="mt-1 text-sm font-bold text-[var(--color-deep-plum)]">
                            {selectedPackage.vendor.businessName}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="text-sm font-black text-[var(--color-muted-burgundy)]"
                          disabled={createRequestMutation.isPending}
                          onClick={() => {
                            setSelectedPackage(null);
                          }}
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-white/70 bg-white/18 p-5 text-center">
                      <ChevronDown className="mx-auto size-6 text-[var(--color-deep-plum)]" />
                      <p className="mt-3 text-sm font-bold text-[var(--color-charcoal)]/62">
                        Choose a package from the list.
                      </p>
                    </div>
                  )}

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-black">Event requirements</span>

                    <textarea
                      className="form-field min-h-40 resize-y"
                      maxLength={5000}
                      value={requirements}
                      disabled={createRequestMutation.isPending}
                      placeholder="Describe the service, preferred style, quantities, timings and special requirements."
                      onChange={(event) => {
                        createRequestMutation.reset();
                        setRequirements(event.target.value);
                      }}
                    />
                  </label>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-black">Response deadline</span>

                    <input
                      className="form-field"
                      type="datetime-local"
                      value={responseDueAt}
                      disabled={createRequestMutation.isPending}
                      onChange={(event) => {
                        createRequestMutation.reset();
                        setResponseDueAt(event.target.value);
                      }}
                    />

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      Optional. The deadline must be in the future and before the event date.
                    </p>
                  </label>

                  {createRequestMutation.isError ? (
                    <div
                      role="alert"
                      className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                    >
                      {getApiErrorMessage(createRequestMutation.error)}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={createRequestMutation.isPending}
                      onClick={closeCreateDialog}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="btn-primary justify-center text-sm font-bold"
                      disabled={createRequestMutation.isPending}
                      onClick={() => {
                        createRequestMutation.mutate();
                      }}
                    >
                      {createRequestMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}

                      {createRequestMutation.isPending ? 'Sending request...' : 'Send request'}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedRequest ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quotation-comparison-title"
        >
          <div className="mx-auto max-w-6xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <MessageSquareQuote className="size-4" />
                    Quotation comparison
                  </div>

                  <h2
                    id="quotation-comparison-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    {selectedRequest.package?.title ?? 'Vendor quotation'}
                  </h2>

                  <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                    {selectedRequest.vendor.businessName}
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
                  aria-label="Close quotation comparison"
                  disabled={acceptQuotationMutation.isPending}
                  onClick={closeQuotationDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              {quotationsQuery.isLoading ? (
                <div className="mt-8 grid min-h-60 place-items-center rounded-2xl bg-white/18">
                  <LoaderCircle className="size-8 animate-spin text-[var(--color-deep-plum)]" />
                </div>
              ) : null}

              {quotationsQuery.isError ? (
                <div
                  role="alert"
                  className="mt-8 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                >
                  {getApiErrorMessage(quotationsQuery.error)}
                </div>
              ) : null}

              {quotationsQuery.data && quotationsQuery.data.length > 0 ? (
                <div className="mt-8 grid gap-5 lg:grid-cols-2">
                  {quotationsQuery.data.map((quotation) => {
                    const expired = isQuotationExpired(quotation);
                    const canAccept =
                      selectedRequest.status === 'QUOTED' &&
                      quotation.status === 'SENT' &&
                      !expired;

                    return (
                      <article
                        key={quotation.id}
                        className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl sm:p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span
                              className="status-chip"
                              data-tone={getQuotationTone(quotation.status)}
                            >
                              {quotationStatusLabels[quotation.status]}
                            </span>

                            <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                              Quotation version {quotation.version}
                            </h3>
                          </div>

                          <span className="text-sm font-black text-[var(--color-charcoal)]/52">
                            {formatDate(quotation.createdAt)}
                          </span>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-white/28 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">
                              Proposed price
                            </p>
                            <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                              {formatCurrency(quotation.proposedPrice)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white/28 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">
                              Deposit
                            </p>
                            <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                              {quotation.depositAmount
                                ? formatCurrency(quotation.depositAmount)
                                : 'No deposit'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5">
                          <p className="text-sm font-black text-[var(--color-charcoal)]/58">
                            Inclusions
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {quotation.inclusions}
                          </p>
                        </div>

                        {quotation.exclusions ? (
                          <div className="mt-5">
                            <p className="text-sm font-black text-[var(--color-charcoal)]/58">
                              Exclusions
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                              {quotation.exclusions}
                            </p>
                          </div>
                        ) : null}

                        {quotation.terms ? (
                          <div className="mt-5">
                            <p className="text-sm font-black text-[var(--color-charcoal)]/58">
                              Terms
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                              {quotation.terms}
                            </p>
                          </div>
                        ) : null}

                        <div className="mt-5 rounded-2xl bg-white/22 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">
                            Expiry
                          </p>

                          <p className="mt-2 font-black text-[var(--color-near-black)]">
                            {quotation.expiresAt
                              ? formatDate(quotation.expiresAt)
                              : 'No expiry date'}
                          </p>

                          {expired ? (
                            <p className="mt-2 text-sm font-bold text-[var(--color-muted-burgundy)]">
                              This quotation has expired.
                            </p>
                          ) : null}
                        </div>

                        {canAccept ? (
                          <button
                            type="button"
                            className="btn-primary mt-6 w-full justify-center text-sm font-bold"
                            onClick={() => {
                              acceptQuotationMutation.reset();
                              setQuotationToAccept(quotation);
                            }}
                          >
                            <CheckCircle2 className="size-4" />
                            Accept quotation
                          </button>
                        ) : null}
                        {quotation.status === 'ACCEPTED' ? (
                          <button
                            type="button"
                            className="btn-primary mt-6 w-full justify-center text-sm font-bold"
                            onClick={() => {
                              openCreateBookingDialog(quotation);
                            }}
                          >
                            <CalendarRange className="size-4" />
                            Create booking
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {quotationsQuery.data && quotationsQuery.data.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <MessageSquareQuote className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    No quotation received yet
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    The vendor has not sent a quotation for this request.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {quotationToAccept && selectedRequest ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-quotation-title"
        >
          <div className="glass-card w-full max-w-lg p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(89,133,113,0.14)] text-[#3f735d]">
              <CheckCircle2 className="size-7" />
            </div>

            <h2
              id="accept-quotation-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Accept this quotation?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              You are accepting <strong>{formatCurrency(quotationToAccept.proposedPrice)}</strong>{' '}
              from <strong>{selectedRequest.vendor.businessName}</strong>. Other active quotation
              versions for this request will be rejected.
            </p>

            {acceptQuotationMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(acceptQuotationMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={acceptQuotationMutation.isPending}
                onClick={() => {
                  setQuotationToAccept(null);
                  acceptQuotationMutation.reset();
                }}
              >
                Review again
              </button>

              <button
                type="button"
                className="btn-primary justify-center text-sm font-bold"
                disabled={acceptQuotationMutation.isPending}
                onClick={() => {
                  acceptQuotationMutation.mutate();
                }}
              >
                {acceptQuotationMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}

                {acceptQuotationMutation.isPending
                  ? 'Accepting quotation...'
                  : 'Confirm acceptance'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Create Booking Dialog */}
      {quotationToBook ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(31,27,29,0.55)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-booking-title"
        >
          <div className="glass-card w-full max-w-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="soft-chip mb-4 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <CalendarRange className="size-4" />
                  Create booking
                </div>

                <h2
                  id="create-booking-title"
                  className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  Schedule this vendor
                </h2>

                <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/66">
                  Choose when this service should begin. The booking will be created from the
                  accepted quotation.
                </p>
              </div>

              <button
                type="button"
                className="grid size-11 place-items-center rounded-full border border-white/55 bg-white/28"
                onClick={closeCreateBookingDialog}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black">Service start</span>

                <input
                  type="datetime-local"
                  className="form-field min-h-12"
                  value={serviceStart}
                  disabled={createBookingMutation.isPending}
                  onChange={(event) => {
                    createBookingMutation.reset();
                    setServiceStart(event.target.value);
                  }}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black">Service end (optional)</span>

                <input
                  type="datetime-local"
                  className="form-field min-h-12"
                  value={serviceEnd}
                  disabled={createBookingMutation.isPending}
                  onChange={(event) => {
                    createBookingMutation.reset();
                    setServiceEnd(event.target.value);
                  }}
                />
              </label>

              {createBookingMutation.isError ? (
                <div className="rounded-2xl border border-[rgba(124,74,90,0.24)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]">
                  {getApiErrorMessage(createBookingMutation.error)}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="btn-secondary justify-center text-sm font-bold"
                  disabled={createBookingMutation.isPending}
                  onClick={closeCreateBookingDialog}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn-primary justify-center text-sm font-bold"
                  disabled={createBookingMutation.isPending}
                  onClick={() => {
                    createBookingMutation.mutate();
                  }}
                >
                  {createBookingMutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CalendarRange className="size-4" />
                      Create booking
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Booking Success Dialog */}
      {createdBooking ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(31,27,29,0.55)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card w-full max-w-lg p-8 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[rgba(89,133,113,0.12)] text-[#3f735d]">
              <CheckCircle2 className="size-8" />
            </div>

            <h2 className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
              Booking created
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/66">
              Your booking has been created successfully. The vendor will now receive the booking
              request for confirmation.
            </p>

            <div className="mt-8 flex justify-center">
              <Link to={`/events/${eventId}/bookings`} className="btn-primary text-sm font-bold">
                Open bookings
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
