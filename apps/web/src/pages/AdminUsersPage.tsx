import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  Store,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';
import {
  adminAccountStatuses,
  adminUserRoles,
  adminUserSortOptions,
  getAdminUserById,
  getAdminUsers,
  updateAdminUserStatus,
  type AdminAccountStatus,
  type AdminUser,
  type AdminUserRole,
  type AdminUserSort,
} from '../features/admin/admin.api';

const PAGE_LIMIT = 20;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

const userRoleLabels: Record<AdminUserRole, string> = {
  CUSTOMER: 'Customer',
  VENDOR: 'Vendor',
  ADMIN: 'Administrator',
};

const accountStatusLabels: Record<AdminAccountStatus, string> = {
  ACTIVE: 'Active',
  PENDING_VERIFICATION: 'Pending verification',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
};

const userSortLabels: Record<AdminUserSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name_asc: 'Name A–Z',
  name_desc: 'Name Z–A',
  email_asc: 'Email A–Z',
  email_desc: 'Email Z–A',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getStatusTone(status: AdminAccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'success';

    case 'PENDING_VERIFICATION':
      return 'warning';

    case 'SUSPENDED':
    case 'DEACTIVATED':
      return 'danger';

    default:
      return 'violet';
  }
}

function getRoleTone(_role: AdminUserRole) {
  return 'violet';
}

function UserAvatar({ user }: { user: AdminUser }) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-[rgba(91,61,82,0.10)] bg-[rgba(183,167,200,0.14)] text-xs font-black text-[var(--color-deep-plum)]">
      {initials}
    </div>
  );
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AdminAccountStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<AdminUserSort>('newest');
  const [page, setPage] = useState(1);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusReason, setStatusReason] = useState('');

  const usersQuery = useQuery({
    queryKey: [
      'admin',
      'users',
      {
        page,
        search,
        roleFilter,
        statusFilter,
        sort,
      },
    ],
    queryFn: () =>
      getAdminUsers({
        page,
        limit: PAGE_LIMIT,
        search: search || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        sort,
      }),
  });

  const userDetailQuery = useQuery({
    queryKey: ['admin', 'users', selectedUserId],
    queryFn: () => getAdminUserById(selectedUserId as string),
    enabled: Boolean(selectedUserId),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: 'ACTIVE' | 'SUSPENDED';
      reason?: string;
    }) =>
      updateAdminUserStatus(userId, {
        status,
        ...(reason?.trim() && {
          reason: reason.trim(),
        }),
      }),

    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'users'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard', 'summary'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'users', variables.userId],
      });

      setShowStatusDialog(false);
      setStatusReason('');
    },
  });

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;

  const selectedUser = userDetailQuery.data;

  const filtersAreActive =
    Boolean(search) || roleFilter !== 'ALL' || statusFilter !== 'ALL' || sort !== 'newest';

  const pageSummary = useMemo(() => {
    return {
      active: users.filter((user) => user.status === 'ACTIVE').length,
      suspended: users.filter((user) => user.status === 'SUSPENDED').length,
      vendors: users.filter((user) => user.role === 'VENDOR').length,
      customers: users.filter((user) => user.role === 'CUSTOMER').length,
    };
  }, [users]);

  function submitSearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSort('newest');
    setPage(1);
  }

  function openUser(userId: string) {
    statusMutation.reset();
    setSelectedUserId(userId);
  }

  function closeUser() {
    if (statusMutation.isPending) {
      return;
    }

    statusMutation.reset();
    setSelectedUserId(null);
    setShowStatusDialog(false);
    setStatusReason('');
  }

  function openStatusDialog() {
    statusMutation.reset();
    setStatusReason('');
    setShowStatusDialog(true);
  }

  function submitStatusChange() {
    if (!selectedUser) {
      return;
    }

    const nextStatus = selectedUser.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    if (nextStatus === 'SUSPENDED' && statusReason.trim().length < 10) {
      return;
    }

    statusMutation.mutate({
      userId: selectedUser.id,
      status: nextStatus,
      ...(nextStatus === 'SUSPENDED' && {
        reason: statusReason.trim(),
      }),
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#fbf9fa_0%,#f7f3f6_48%,#f5f3f8_100%)]">
      <div className="pointer-events-none absolute -left-40 top-40 size-[30rem] rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
      <div className="pointer-events-none absolute -right-44 top-[34rem] size-[32rem] rounded-full bg-[rgba(214,190,177,0.10)] blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <AdminWorkspaceNav />

        <main className="py-4">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-[linear-gradient(135deg,#fbf8fa_0%,#f5eff5_54%,#f1edf5_100%)] px-6 py-5 shadow-[0_18px_50px_rgba(64,42,51,0.07)] sm:px-7 sm:py-6">
            <div className="pointer-events-none absolute -right-16 -top-28 size-72 rounded-full border border-[rgba(91,61,82,0.07)]" />
            <div className="pointer-events-none absolute -right-2 -top-10 size-48 rounded-full border border-[rgba(91,61,82,0.06)]" />

            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(91,61,82,0.10)] bg-white/60 px-3 py-1.5 text-[0.64rem] font-extrabold uppercase tracking-[0.17em] text-[var(--color-deep-plum)]">
                  <Users className="size-3.5" />
                  Account administration
                </div>

                <h1 className="mt-4 max-w-4xl text-balance text-[2.25rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.7rem]">
                  Manage platform users safely and clearly.
                </h1>

                <p className="mt-3 max-w-2xl text-pretty text-sm font-medium leading-6 text-[var(--color-charcoal)]/68">
                  Search customer, vendor, and administrator accounts, inspect their platform
                  activity, and suspend or reactivate eligible users.
                </p>
              </div>

              <div className="min-w-[180px] rounded-[1.15rem] border border-[rgba(91,61,82,0.09)] bg-white/62 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Matching users
                    </p>

                    <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {usersQuery.isLoading ? '—' : (pagination?.total ?? 0)}
                    </p>
                  </div>

                  <Users className="size-4 text-[var(--color-rosewood)]" />
                </div>
              </div>
            </div>
          </section>

          {usersQuery.isLoading ? (
            <section className="state-surface mt-6">
              <div>
                <LoaderCircle className="mx-auto size-10 animate-spin text-violet-700" />

                <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                  Loading user accounts
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                  Preparing account statuses, roles, and vendor profile details.
                </p>
              </div>
            </section>
          ) : usersQuery.isError ? (
            <section className="state-surface mt-6">
              <div className="max-w-lg">
                <div className="icon-tile mx-auto">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                  Users could not be loaded
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                  {getErrorMessage(usersQuery.error, 'We could not load the user directory.')}
                </p>

                <button
                  type="button"
                  className="btn-primary mt-6 text-sm"
                  onClick={() => usersQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[1.4rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_38px_rgba(64,42,51,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <UserRoundCheck className="size-4" />
                    </div>

                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                      Active
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--color-charcoal)]/56">
                      Active on this page
                    </p>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {pageSummary.active}
                    </p>
                  </div>
                </article>

                <article className="rounded-[1.4rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_38px_rgba(64,42,51,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-700">
                      <Ban className="size-4" />
                    </div>

                    <span className="rounded-full bg-rose-50 px-2 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-rose-700">
                      Suspended
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--color-charcoal)]/56">
                      Suspended on this page
                    </p>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {pageSummary.suspended}
                    </p>
                  </div>
                </article>

                <article className="rounded-[1.4rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_38px_rgba(64,42,51,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                      <Store className="size-4" />
                    </div>

                    <span className="rounded-full bg-[rgba(183,167,200,0.10)] px-2 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
                      Vendor
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--color-charcoal)]/56">
                      Vendors on this page
                    </p>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {pageSummary.vendors}
                    </p>
                  </div>
                </article>

                <article className="rounded-[1.4rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_38px_rgba(64,42,51,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                      <CircleUserRound className="size-4" />
                    </div>

                    <span className="rounded-full bg-[rgba(183,167,200,0.10)] px-2 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
                      Customer
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--color-charcoal)]/56">
                      Customers on this page
                    </p>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {pageSummary.customers}
                    </p>
                  </div>
                </article>
              </section>
              <section className="mt-4 rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-white/82 p-4 shadow-[0_18px_50px_rgba(64,42,51,0.07)] backdrop-blur-xl sm:p-5">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                  <div>
                    <p className="section-eyebrow">User directory</p>

                    <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      Search and filter accounts
                    </h2>

                    <p className="mt-1 text-xs font-medium leading-5 text-[var(--color-charcoal)]/58">
                      Narrow the directory by role, status, name, or email address.
                    </p>
                  </div>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary min-h-0 px-4 py-2 text-xs"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2.5 lg:grid-cols-[1.35fr_0.75fr_0.85fr_0.85fr]">
                  <form
                    className="relative min-w-0"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitSearch();
                    }}
                  >
                    <input
                      className="form-field !min-h-0 !h-10 !rounded-xl !py-2 !pr-20 !pl-10 !text-sm"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search name or email"
                    />
                  </form>

                  <select
                    className="form-field !min-h-0 !h-10 !rounded-xl !py-2 !text-sm"
                    value={roleFilter}
                    onChange={(event) => {
                      setRoleFilter(event.target.value as AdminUserRole | 'ALL');
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All roles</option>

                    {adminUserRoles.map((role) => (
                      <option key={role} value={role}>
                        {userRoleLabels[role]}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-field !min-h-0 !h-10 !rounded-xl !py-2 !text-sm"
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as AdminAccountStatus | 'ALL');
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All statuses</option>

                    {adminAccountStatuses.map((status) => (
                      <option key={status} value={status}>
                        {accountStatusLabels[status]}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-field !min-h-0 !h-10 !rounded-xl !py-2 !text-sm"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as AdminUserSort);
                      setPage(1);
                    }}
                  >
                    {adminUserSortOptions.map((sortOption) => (
                      <option key={sortOption} value={sortOption}>
                        {userSortLabels[sortOption]}
                      </option>
                    ))}
                  </select>
                </div>

                {users.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-[rgba(91,61,82,0.09)] bg-white/72">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-[rgba(91,61,82,0.08)] bg-[rgba(183,167,200,0.09)] text-left">
                            <th className="px-4 py-2.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                              User
                            </th>

                            <th className="px-4 py-2.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                              Role
                            </th>

                            <th className="px-4 py-2.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                              Status
                            </th>

                            <th className="px-4 py-2.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                              Vendor profile
                            </th>

                            <th className="px-4 py-2.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                              Joined
                            </th>

                            <th className="px-4 py-2.5 text-right text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {users.map((user) => (
                            <tr
                              key={user.id}
                              className="border-b border-[rgba(91,61,82,0.06)] transition hover:bg-[rgba(183,167,200,0.07)] last:border-b-0"
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                  <UserAvatar user={user} />

                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-black text-[var(--color-near-black)]">
                                      {user.firstName} {user.lastName}
                                    </p>

                                    <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-[var(--color-charcoal)]/52">
                                      {user.email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-2.5">
                                <span className="status-chip" data-tone={getRoleTone(user.role)}>
                                  {userRoleLabels[user.role]}
                                </span>
                              </td>

                              <td className="px-4 py-2.5">
                                <span
                                  className="status-chip"
                                  data-tone={getStatusTone(user.status)}
                                >
                                  {accountStatusLabels[user.status]}
                                </span>
                              </td>

                              <td className="px-4 py-2.5">
                                {user.vendorProfile ? (
                                  <div>
                                    <p className="text-xs font-bold text-[var(--color-near-black)]">
                                      {user.vendorProfile.businessName}
                                    </p>

                                    <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/48">
                                      {user.vendorProfile.verificationStatus}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs font-semibold text-[var(--color-charcoal)]/38">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-[var(--color-charcoal)]/58">
                                {formatDate(user.createdAt)}
                              </td>

                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  className="min-h-0 rounded-xl border border-[rgba(91,61,82,0.12)] bg-[rgba(183,167,200,0.10)] px-3 py-1.5 text-xs font-black text-[var(--color-deep-plum)] transition hover:border-[rgba(91,61,82,0.20)] hover:bg-[rgba(183,167,200,0.17)]"
                                  onClick={() => openUser(user.id)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.2rem] border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(183,167,200,0.06)] px-5 py-7 text-center">
                    <Users className="mx-auto size-7 text-[var(--color-deep-plum)]/60" />

                    <h3 className="mt-3 text-base font-black text-[var(--color-near-black)]">
                      No users match these filters
                    </h3>

                    <p className="mx-auto mt-1 max-w-lg text-xs font-semibold leading-5 text-[var(--color-charcoal)]/56">
                      Try changing the search term, role, status, or sort order.
                    </p>

                    {filtersAreActive ? (
                      <button
                        type="button"
                        className="btn-secondary mt-4 text-sm"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                )}

                {pagination && pagination.totalPages > 1 ? (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-[1.1rem] border border-[rgba(91,61,82,0.09)] bg-[rgba(183,167,200,0.07)] px-4 py-3 sm:flex-row">
                    <p className="text-xs font-semibold text-[var(--color-charcoal)]/58">
                      Page{' '}
                      <span className="font-black text-[var(--color-near-black)]">
                        {pagination.page}
                      </span>{' '}
                      of{' '}
                      <span className="font-black text-[var(--color-near-black)]">
                        {pagination.totalPages}
                      </span>
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-3.5 py-2 text-xs"
                        disabled={!pagination.hasPreviousPage || usersQuery.isFetching}
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-3.5 py-2 text-xs"
                        disabled={!pagination.hasNextPage || usersQuery.isFetching}
                        onClick={() => setPage((currentPage) => currentPage + 1)}
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </main>
      </div>

      {selectedUserId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUser();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-detail-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-white/80 bg-[#fbf9fa] p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Account details</p>

                <h2 id="admin-user-detail-title" className="section-title">
                  User profile
                </h2>
              </div>

              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                onClick={closeUser}
                aria-label="Close user details"
              >
                <X className="size-5" />
              </button>
            </div>

            {userDetailQuery.isLoading ? (
              <div className="state-surface mt-6 min-h-72">
                <div>
                  <LoaderCircle className="mx-auto size-9 animate-spin text-violet-700" />

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    Loading user details
                  </p>
                </div>
              </div>
            ) : userDetailQuery.isError ? (
              <div className="feedback-surface mt-6" data-tone="danger">
                {getErrorMessage(userDetailQuery.error, 'We could not load this user account.')}
              </div>
            ) : selectedUser ? (
              <>
                <div className="mt-4 flex flex-col justify-between gap-4 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-white/72 px-4 py-3.5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-xl border border-[rgba(91,61,82,0.09)] bg-[rgba(183,167,200,0.14)] text-sm font-black text-[var(--color-deep-plum)]">
                      {selectedUser.firstName.charAt(0)}
                      {selectedUser.lastName.charAt(0)}
                    </div>

                    <div>
                      <p className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>

                      <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/54">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="status-chip" data-tone={getRoleTone(selectedUser.role)}>
                      {userRoleLabels[selectedUser.role]}
                    </span>

                    <span className="status-chip" data-tone={getStatusTone(selectedUser.status)}>
                      {accountStatusLabels[selectedUser.status]}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.1rem] border border-[rgba(91,61,82,0.08)] bg-white/64 px-4 py-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                      Joined
                    </p>

                    <p className="mt-1.5 text-sm font-bold text-[var(--color-near-black)]">
                      {formatDateTime(selectedUser.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-[1.1rem] border border-[rgba(91,61,82,0.08)] bg-white/64 px-4 py-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                      Last updated
                    </p>

                    <p className="mt-1.5 text-sm font-bold text-[var(--color-near-black)]">
                      {formatDateTime(selectedUser.updatedAt)}
                    </p>
                  </div>
                </div>

                {selectedUser.customer ? (
                  <section className="mt-3 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-white/64 p-4">
                    <p className="section-eyebrow">Customer profile</p>

                    <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <h3 className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        Customer information
                      </h3>

                      <div className="rounded-xl bg-[rgba(183,167,200,0.09)] px-3.5 py-2">
                        <p className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/44">
                          Phone
                        </p>

                        <p className="mt-0.5 text-xs font-bold text-[var(--color-near-black)]">
                          {selectedUser.customer.phone}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}

                {selectedUser.vendorProfile ? (
                  <section className="mt-3 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-white/64 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="section-eyebrow">Vendor profile</p>

                        <h3 className="mt-1 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                          {selectedUser.vendorProfile.businessName}
                        </h3>
                      </div>

                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-amber-700">
                        {selectedUser.vendorProfile.verificationStatus}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-[rgba(183,167,200,0.07)] px-3.5 py-2.5">
                        <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/44">
                          Verification
                        </p>

                        <p className="mt-1 text-xs font-bold text-[var(--color-near-black)]">
                          {selectedUser.vendorProfile.verificationStatus}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[rgba(183,167,200,0.07)] px-3.5 py-2.5">
                        <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/44">
                          Base location
                        </p>

                        <p className="mt-1 text-xs font-bold text-[var(--color-near-black)]">
                          {selectedUser.vendorProfile.baseLocation ?? 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {selectedUser.vendorProfile.description ? (
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[var(--color-charcoal)]/64">
                        {selectedUser.vendorProfile.description}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedUser.vendorProfile.categories.map((category) => (
                        <span key={category.id} className="soft-chip text-xs font-bold">
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="mt-3 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-[rgba(183,167,200,0.055)] p-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="section-eyebrow">Platform activity</p>

                      <h3 className="mt-1 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        Account usage
                      </h3>
                    </div>

                    <ShieldCheck className="size-4 text-[var(--color-deep-plum)]/55" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                    <div className="rounded-xl border border-[rgba(91,61,82,0.07)] bg-white/72 px-3 py-2.5">
                      <p className="text-[0.66rem] font-bold text-[var(--color-charcoal)]/48">
                        Events
                      </p>

                      <p className="mt-1 text-xl font-black text-[var(--color-near-black)]">
                        {selectedUser._count.createdEvents}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[rgba(91,61,82,0.07)] bg-white/72 px-3 py-2.5">
                      <p className="text-[0.66rem] font-bold text-[var(--color-charcoal)]/48">
                        Payments submitted
                      </p>

                      <p className="mt-1 text-xl font-black text-[var(--color-near-black)]">
                        {selectedUser._count.submittedPayments}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[rgba(91,61,82,0.07)] bg-white/72 px-3 py-2.5">
                      <p className="text-[0.66rem] font-bold text-[var(--color-charcoal)]/48">
                        Reviews
                      </p>

                      <p className="mt-1 text-xl font-black text-[var(--color-near-black)]">
                        {selectedUser._count.customerReviews}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[rgba(91,61,82,0.07)] bg-white/72 px-3 py-2.5">
                      <p className="text-[0.66rem] font-bold text-[var(--color-charcoal)]/48">
                        Complaints submitted
                      </p>

                      <p className="mt-1 text-xl font-black text-[var(--color-near-black)]">
                        {selectedUser._count.submittedComplaints}
                      </p>
                    </div>
                  </div>
                </section>

                {statusMutation.isError ? (
                  <div className="feedback-surface mt-6" data-tone="danger" role="alert">
                    {getErrorMessage(
                      statusMutation.error,
                      'We could not update this user account.',
                    )}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[rgba(91,61,82,0.09)] pt-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-black text-[var(--color-near-black)]">Account controls</p>

                    <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/56">
                      Administrator accounts and unsupported status transitions cannot be changed
                      through this action.
                    </p>
                  </div>

                  {selectedUser.role !== 'ADMIN' &&
                  ['ACTIVE', 'SUSPENDED'].includes(selectedUser.status) ? (
                    <button
                      type="button"
                      className={
                        selectedUser.status === 'SUSPENDED'
                          ? 'btn-primary text-sm'
                          : 'btn-danger text-sm'
                      }
                      onClick={openStatusDialog}
                    >
                      {selectedUser.status === 'SUSPENDED' ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          Reactivate account
                        </>
                      ) : (
                        <>
                          <Ban className="size-4" />
                          Suspend account
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {showStatusDialog && selectedUser ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !statusMutation.isPending) {
              setShowStatusDialog(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-status-title"
            className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-[#fbfaff] p-6 shadow-2xl"
          >
            <div className="icon-tile">
              {selectedUser.status === 'SUSPENDED' ? (
                <UserRoundCheck className="size-5" />
              ) : (
                <Ban className="size-5" />
              )}
            </div>

            <h2
              id="admin-user-status-title"
              className="mt-5 text-2xl font-black text-[var(--color-near-black)]"
            >
              {selectedUser.status === 'SUSPENDED'
                ? 'Reactivate this account?'
                : 'Suspend this account?'}
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/64">
              {selectedUser.status === 'SUSPENDED'
                ? `${selectedUser.firstName} will regain access to the platform.`
                : `${selectedUser.firstName} will lose access until an administrator reactivates the account.`}
            </p>

            {selectedUser.status !== 'SUSPENDED' ? (
              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  Suspension reason
                </span>

                <textarea
                  className="form-field min-h-28"
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  placeholder="Explain why this account is being suspended."
                  aria-invalid={statusReason.length > 0 && statusReason.trim().length < 10}
                  disabled={statusMutation.isPending}
                />

                <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/48">
                  Minimum 10 characters.
                </span>
              </label>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={statusMutation.isPending}
                onClick={() => {
                  setShowStatusDialog(false);
                  setStatusReason('');
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  selectedUser.status === 'SUSPENDED' ? 'btn-primary text-sm' : 'btn-danger text-sm'
                }
                disabled={
                  statusMutation.isPending ||
                  (selectedUser.status !== 'SUSPENDED' && statusReason.trim().length < 10)
                }
                onClick={submitStatusChange}
              >
                {statusMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : selectedUser.status === 'SUSPENDED' ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Ban className="size-4" />
                )}

                {statusMutation.isPending
                  ? 'Updating...'
                  : selectedUser.status === 'SUSPENDED'
                    ? 'Reactivate account'
                    : 'Suspend account'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
