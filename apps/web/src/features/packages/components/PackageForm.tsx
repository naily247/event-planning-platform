import {
  Check,
  CircleAlert,
  CircleDollarSign,
  Eye,
  Layers3,
  LoaderCircle,
  PackagePlus,
  Save,
} from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { VendorCategory } from '../../vendors/vendor.api';

export type PackageFormValues = {
  categoryId: string;
  title: string;
  description: string;
  basePrice: string;
  isActive: boolean;
};

type PackageFormProps = {
  mode: 'create' | 'edit';
  form: UseFormReturn<PackageFormValues>;
  categories: VendorCategory[];
  isSubmitting?: boolean;
  submissionError?: string | null;
  onSubmit: (values: PackageFormValues) => void;
  onCancel: () => void;
};

export function PackageForm({
  mode,
  form,
  categories,
  isSubmitting = false,
  submissionError,
  onSubmit,
  onCancel,
}: PackageFormProps) {
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  const descriptionValue = form.watch('description') ?? '';
  const titleValue = form.watch('title') ?? '';
  const isActive = form.watch('isActive');

  const isDirty = form.formState.isDirty;

  return (
    <form className="mt-7 grid gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <section className="rounded-[1.6rem] border border-white/65 bg-white/28 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
            <Layers3 className="size-5" />
          </div>

          <div>
            <h3 className="text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
              Package essentials
            </h3>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
              Define the service, its category and the information customers need before requesting
              a quotation.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
              Service category
            </span>

            <select
              className="form-field bg-white/40"
              disabled={isSubmitting || categories.length === 0}
              {...form.register('categoryId', {
                required: 'Choose a service category.',
              })}
            >
              <option value="">Select a category</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {form.formState.errors.categoryId ? (
              <span className="mt-2 flex items-center gap-2 text-sm font-bold text-[var(--color-muted-burgundy)]">
                <CircleAlert className="size-4 shrink-0" />
                {form.formState.errors.categoryId.message}
              </span>
            ) : (
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                Choose the service category that best represents this package.
              </p>
            )}

            {categories.length === 0 ? (
              <p className="mt-2 flex items-start gap-2 text-sm font-semibold leading-6 text-[var(--color-muted-burgundy)]">
                <CircleAlert className="mt-1 size-4 shrink-0" />
                Add at least one service category to your vendor profile before creating packages.
              </p>
            ) : null}
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                Package title
              </span>

              <span
                className={[
                  'text-xs font-bold',
                  titleValue.length > 120
                    ? 'text-[var(--color-muted-burgundy)]'
                    : 'text-[var(--color-charcoal)]/42',
                ].join(' ')}
              >
                {titleValue.length}/120
              </span>
            </div>

            <input
              className="form-field bg-white/40"
              type="text"
              placeholder="Premium wedding photography"
              disabled={isSubmitting}
              {...form.register('title', {
                required: 'Enter a package title.',
                validate: (value) => {
                  const trimmedValue = value.trim();

                  if (!trimmedValue) {
                    return 'Enter a package title.';
                  }

                  if (trimmedValue.length < 2) {
                    return 'Title must contain at least 2 characters.';
                  }

                  if (trimmedValue.length > 120) {
                    return 'Title must not exceed 120 characters.';
                  }

                  return true;
                },
              })}
            />

            {form.formState.errors.title ? (
              <span className="mt-2 flex items-center gap-2 text-sm font-bold text-[var(--color-muted-burgundy)]">
                <CircleAlert className="size-4 shrink-0" />
                {form.formState.errors.title.message}
              </span>
            ) : (
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                Use a short customer-facing title that clearly describes the service.
              </p>
            )}
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                Description
              </span>

              <span
                className={[
                  'text-xs font-bold',
                  descriptionValue.length > 1000
                    ? 'text-[var(--color-muted-burgundy)]'
                    : 'text-[var(--color-charcoal)]/42',
                ].join(' ')}
              >
                {descriptionValue.length}/1000
              </span>
            </div>

            <textarea
              className="form-field min-h-32 resize-y bg-white/40 leading-7"
              placeholder="Describe what is included, who this package is ideal for, and any important service details."
              disabled={isSubmitting}
              {...form.register('description', {
                maxLength: {
                  value: 1000,
                  message: 'Description must not exceed 1000 characters.',
                },
              })}
            />

            {form.formState.errors.description ? (
              <span className="mt-2 flex items-center gap-2 text-sm font-bold text-[var(--color-muted-burgundy)]">
                <CircleAlert className="size-4 shrink-0" />
                {form.formState.errors.description.message}
              </span>
            ) : (
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                Mention inclusions, coverage, ideal event types and any important limitations.
              </p>
            )}
          </label>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/65 bg-white/28 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(214,190,177,0.22)] text-[var(--color-rosewood)]">
            <CircleDollarSign className="size-5" />
          </div>

          <div>
            <h3 className="text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
              Pricing
            </h3>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
              Give customers a useful starting point while keeping room for quotation-based pricing.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
              Starting price
            </span>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-black text-[var(--color-charcoal)]/45">
                LKR
              </span>

              <input
                className="form-field bg-white/40 pl-14"
                type="number"
                min="0"
                step="0.01"
                placeholder="150000"
                disabled={isSubmitting}
                {...form.register('basePrice', {
                  validate: (value) => {
                    if (!value.trim()) {
                      return true;
                    }

                    const price = Number(value);

                    if (!Number.isFinite(price)) {
                      return 'Enter a valid price.';
                    }

                    if (price < 0) {
                      return 'Price cannot be negative.';
                    }

                    return true;
                  },
                })}
              />
            </div>

            {form.formState.errors.basePrice ? (
              <span className="mt-2 flex items-center gap-2 text-sm font-bold text-[var(--color-muted-burgundy)]">
                <CircleAlert className="size-4 shrink-0" />
                {form.formState.errors.basePrice.message}
              </span>
            ) : (
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                Leave this blank when the final amount depends entirely on the customer's
                requirements.
              </p>
            )}
          </label>
        </div>
      </section>

      {isCreateMode ? (
        <section className="rounded-[1.6rem] border border-white/65 bg-white/28 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
              <Eye className="size-5" />
            </div>

            <div>
              <h3 className="text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                Customer visibility
              </h3>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                Decide whether this new package should become discoverable as soon as it is created.
              </p>
            </div>
          </div>

          <label
            className={[
              'relative mt-5 flex cursor-pointer items-start gap-4 overflow-hidden rounded-[1.4rem] border p-5 transition duration-300',
              isActive
                ? 'border-[rgba(91,61,82,0.22)] bg-[rgba(183,167,200,0.16)]'
                : 'border-white/60 bg-white/32',
              isSubmitting ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5',
            ].join(' ')}
          >
            <input
              type="checkbox"
              className="peer sr-only"
              disabled={isSubmitting}
              {...form.register('isActive')}
            />

            <div
              className={[
                'relative mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition duration-300',
                isActive ? 'bg-[var(--color-deep-plum)]' : 'bg-[rgba(150,150,150,0.28)]',
              ].join(' ')}
            >
              <div
                className={[
                  'size-5 rounded-full bg-white shadow-md transition duration-300',
                  isActive ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </div>

            <span className="relative min-w-0">
              <span className="block text-sm font-black text-[var(--color-near-black)]">
                {isActive ? 'Visible immediately after creation' : 'Create as a hidden package'}
              </span>

              <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                {isActive
                  ? 'Customers can discover this package on your public vendor profile once creation succeeds.'
                  : 'The package will be created but remain hidden until you activate it from the Packages page.'}
              </span>
            </span>
          </label>
        </section>
      ) : (
        <section className="rounded-[1.6rem] border border-white/65 bg-white/28 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
              <Eye className="size-5" />
            </div>

            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                Visibility
              </p>

              <h3 className="mt-1 text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                {isActive ? 'Currently visible to customers' : 'Currently hidden from customers'}
              </h3>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                Package visibility is managed separately from editing. Close this editor and use the
                Activate or Deactivate action on the package card to change its public status.
              </p>
            </div>
          </div>
        </section>
      )}

      {isEditMode ? (
        isDirty ? (
          <div className="flex items-start gap-3 rounded-[1.25rem] border border-amber-200/70 bg-amber-50/65 p-4">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />

            <div>
              <p className="text-sm font-black text-amber-900">You have unsaved changes</p>

              <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                Save these package updates before closing the editor, or discard them if you no
                longer want them.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/60 bg-white/34 p-4">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
              <Check className="size-4" />
            </div>

            <div>
              <p className="text-sm font-black text-[var(--color-near-black)]">
                No unsaved changes
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                Update at least one package detail before saving.
              </p>
            </div>
          </div>
        )
      ) : null}

      {submissionError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[1.25rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.1)] px-4 py-4 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <span>{submissionError}</span>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          className="btn-secondary justify-center text-sm font-bold"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn-primary justify-center text-sm font-bold"
          disabled={isSubmitting || categories.length === 0 || (isEditMode && !isDirty)}
        >
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : isCreateMode ? (
            <PackagePlus className="size-4" />
          ) : (
            <Save className="size-4" />
          )}

          {isSubmitting
            ? isCreateMode
              ? 'Creating package...'
              : 'Saving changes...'
            : isCreateMode
              ? 'Create package'
              : isDirty
                ? 'Save changes'
                : 'No changes to save'}
        </button>
      </div>
    </form>
  );
}
