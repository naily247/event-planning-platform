import {
  CalendarDays,
  CircleDollarSign,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Tag,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { VendorServicePackage } from '../package.api';
import { PackageStatusBadge } from './PackageStatusBadge';

type PackageCardProps = {
  servicePackage: VendorServicePackage;
  isUpdatingStatus?: boolean;
  isDeleting?: boolean;
  onEdit: (servicePackage: VendorServicePackage) => void;
  onToggleStatus: (servicePackage: VendorServicePackage) => void;
  onDelete: (servicePackage: VendorServicePackage) => void;
};

function formatPrice(value: string | null) {
  if (value === null) {
    return 'Custom pricing';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function PackageCard({
  servicePackage,
  isUpdatingStatus = false,
  isDeleting = false,
  onEdit,
  onToggleStatus,
  onDelete,
}: PackageCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isBusy = isUpdatingStatus || isDeleting;
  const description =
    servicePackage.description?.trim() ||
    'No description has been added for this service package yet.';

  function handleEdit() {
    setIsMenuOpen(false);
    onEdit(servicePackage);
  }

  function handleToggleStatus() {
    setIsMenuOpen(false);
    onToggleStatus(servicePackage);
  }

  function handleDelete() {
    setIsMenuOpen(false);
    onDelete(servicePackage);
  }

  return (
    <article className="group relative flex h-full flex-col overflow-visible rounded-[30px] border border-white/70 bg-white/58 p-5 shadow-[0_18px_55px_rgba(64,42,51,0.07)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1.5 hover:border-white/90 hover:shadow-[0_26px_74px_rgba(64,42,51,0.12)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
        <div className="absolute -right-16 -top-20 size-44 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl transition duration-500 group-hover:bg-[rgba(183,167,200,0.22)]" />
        <div className="absolute -bottom-20 left-8 size-36 rounded-full bg-[rgba(214,190,177,0.11)] blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <PackageStatusBadge isActive={servicePackage.isActive} />

            <h2 className="mt-4 line-clamp-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              {servicePackage.title}
            </h2>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
              disabled={isBusy}
              aria-label={`Open actions for ${servicePackage.title}`}
              aria-expanded={isMenuOpen}
              className="grid size-10 place-items-center rounded-2xl border border-white/70 bg-white/48 text-[var(--color-charcoal)]/58 shadow-[0_10px_24px_rgba(31,27,29,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/68 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(183,167,200,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <MoreHorizontal className="size-5" />
              )}
            </button>

            {isMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close package actions"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsMenuOpen(false)}
                />

                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-white/75 bg-white/92 p-2 shadow-[0_22px_60px_rgba(40,30,34,0.18)] backdrop-blur-2xl">
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[var(--color-charcoal)] transition hover:bg-[rgba(183,167,200,0.16)] hover:text-[var(--color-deep-plum)]"
                  >
                    <Pencil className="size-4" />
                    Edit package
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={isUpdatingStatus}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[var(--color-charcoal)] transition hover:bg-[rgba(183,167,200,0.16)] hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingStatus ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : servicePackage.isActive ? (
                      <PowerOff className="size-4" />
                    ) : (
                      <Power className="size-4" />
                    )}

                    {isUpdatingStatus
                      ? 'Updating status...'
                      : servicePackage.isActive
                        ? 'Set inactive'
                        : 'Set active'}
                  </button>

                  <div className="my-1 border-t border-[rgba(64,42,51,0.08)]" />

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}

                    {isDeleting ? 'Deleting...' : 'Delete package'}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex w-fit max-w-full items-center gap-2 rounded-full border border-white/65 bg-white/36 px-3 py-2 text-xs font-black text-[var(--color-rosewood)] backdrop-blur-xl">
          <Tag className="size-3.5 shrink-0" />

          <span className="truncate">{servicePackage.category.name}</span>
        </div>

        <p className="mt-4 line-clamp-4 flex-1 text-sm leading-7 text-[var(--color-charcoal)]/64">
          {description}
        </p>

        <div className="relative mt-6 overflow-hidden rounded-[22px] border border-white/70 bg-white/38 p-5 shadow-[0_12px_30px_rgba(31,27,29,0.05)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-[rgba(183,167,200,0.16)] blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/44">
                Starting price
              </p>

              <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                {formatPrice(servicePackage.basePrice)}
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/46">
                Final pricing can be refined through a quotation.
              </p>
            </div>

            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.18)]">
              <CircleDollarSign className="size-5" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/65 pt-4">
          <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-[var(--color-charcoal)]/44">
            <CalendarDays className="size-4 shrink-0" />

            <span className="truncate">Updated {formatDate(servicePackage.updatedAt)}</span>
          </div>

          <span
            className={[
              'size-2.5 shrink-0 rounded-full',
              servicePackage.isActive
                ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                : 'bg-zinc-400 shadow-[0_0_0_4px_rgba(161,161,170,0.12)]',
            ].join(' ')}
            aria-hidden="true"
          />
        </div>
      </div>
    </article>
  );
}
