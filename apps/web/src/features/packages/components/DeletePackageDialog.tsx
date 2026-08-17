import { CircleAlert, LoaderCircle, Package, Trash2, X } from 'lucide-react';

import type { VendorServicePackage } from '../package.api';

type DeletePackageDialogProps = {
  open: boolean;
  servicePackage: VendorServicePackage | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeletePackageDialog({
  open,
  servicePackage,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeletePackageDialogProps) {
  if (!open || !servicePackage) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.58)] px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-package-title"
      aria-describedby="delete-package-description"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.98)] p-6 shadow-[0_34px_100px_rgba(27,17,23,0.38)] backdrop-blur-2xl sm:p-7"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-red-100/65 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/4 size-44 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl"
        />

        <div className="relative flex items-start justify-between gap-5">
          <div className="grid size-12 shrink-0 place-items-center rounded-[1.1rem] bg-red-50 text-red-700">
            <Trash2 className="size-5" />
          </div>

          <button
            type="button"
            aria-label="Close delete package dialog"
            disabled={isDeleting}
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 shadow-sm transition hover:bg-white/72 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-red-600">
          Permanent action
        </p>

        <h2
          id="delete-package-title"
          className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] sm:text-3xl"
        >
          Delete this service package?
        </h2>

        <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
          This will permanently remove the package from your vendor catalogue and customer-facing
          profile.
        </p>

        <div className="relative mt-5 rounded-[1.35rem] border border-white/65 bg-white/42 p-5 shadow-[0_10px_28px_rgba(35,24,30,0.04)]">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
              <Package className="size-4.5" />
            </div>

            <div className="min-w-0">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                Selected package
              </p>

              <p className="mt-2 break-words text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                {servicePackage.title}
              </p>

              <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/52">
                {servicePackage.category.name}
              </p>

              {servicePackage.basePrice ? (
                <p className="mt-2 text-xs font-black text-[var(--color-rosewood)]">
                  Starting price: LKR {Number(servicePackage.basePrice).toLocaleString('en-LK')}
                </p>
              ) : (
                <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/42">
                  Quotation-based pricing
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          id="delete-package-description"
          className="relative mt-5 flex items-start gap-3 rounded-[1.3rem] border border-red-200/80 bg-red-50/70 p-4"
        >
          <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-red-700" />

          <div>
            <p className="text-sm font-black text-red-900">This cannot be undone</p>

            <p className="mt-1 text-xs font-semibold leading-5 text-red-700">
              Customers will no longer be able to view or select this package after deletion. If you
              only want to hide it temporarily, deactivate the package instead.
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn-secondary justify-center text-sm font-black"
          >
            Keep package
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(185,28,28,0.16)] transition hover:-translate-y-0.5 hover:bg-red-800 hover:!text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isDeleting ? (
              <LoaderCircle className="size-4 animate-spin text-white" />
            ) : (
              <Trash2 className="size-4 text-white" />
            )}

            <span className="text-white">
              {isDeleting ? 'Deleting package...' : 'Delete permanently'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
