import {
  CircleAlert,
  CircleDollarSign,
  Eye,
  EyeOff,
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
  const descriptionValue = form.watch('description') ?? '';
  const isActive = form.watch('isActive');

  return (
    <form className="mt-8 grid gap-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <section className="rounded-[26px] border border-white/65 bg-white/28 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
            <Layers3 className="size-5" />
          </div>

          <div>
            <h3 className="text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
              Package essentials
            </h3>

            <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/56">
              Define what the package is, which service category it belongs to, and what customers
              should expect.
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
            ) : null}

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

              <span className="text-xs font-semibold text-[var(--color-charcoal)]/42">
                Max 120 characters
              </span>
            </div>

            <input
              className="form-field bg-white/40"
              type="text"
              placeholder="Premium wedding photography"
              disabled={isSubmitting}
              {...form.register('title', {
                required: 'Enter a package title.',
                minLength: {
                  value: 2,
                  message: 'Title must contain at least 2 characters.',
                },
                maxLength: {
                  value: 120,
                  message: 'Title must not exceed 120 characters.',
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
                Use a clear customer-facing title that explains the type of service.
              </p>
            )}
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                Description
              </span>

              <span className="text-xs font-semibold text-[var(--color-charcoal)]/42">
                {descriptionValue.length}/1000
              </span>
            </div>

            <textarea
              className="form-field min-h-36 resize-y bg-white/40"
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
                Mention inclusions, coverage, ideal event types, and any important limitations.
              </p>
            )}
          </label>
        </div>
      </section>

      <section className="rounded-[26px] border border-white/65 bg-white/28 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(214,190,177,0.22)] text-[var(--color-rosewood)]">
            <CircleDollarSign className="size-5" />
          </div>

          <div>
            <h3 className="text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
              Pricing and visibility
            </h3>

            <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/56">
              Set a starting price and decide whether customers can currently discover this package.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-[1.1fr_0.9fr]">
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
                Leave blank when the final price depends entirely on customer requirements.
              </p>
            )}
          </label>

          <label
            className={[
              'relative flex cursor-pointer items-start gap-4 overflow-hidden rounded-[22px] border p-5 transition duration-300',
              isActive
                ? 'border-[rgba(91,61,82,0.2)] bg-[rgba(183,167,200,0.16)]'
                : 'border-white/60 bg-white/32',
              isSubmitting ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5',
            ].join(' ')}
          >
            <div className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-white/30 blur-2xl" />

            <input
              type="checkbox"
              className="sr-only"
              disabled={isSubmitting}
              {...form.register('isActive')}
            />

            <div
              className={[
                'relative mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl transition',
                isActive
                  ? 'bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.18)]'
                  : 'border border-white/70 bg-white/46 text-[var(--color-charcoal)]/46',
              ].join(' ')}
            >
              {isActive ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
            </div>

            <span className="relative">
              <span className="block text-sm font-black text-[var(--color-near-black)]">
                {isActive ? 'Visible to customers' : 'Hidden from customers'}
              </span>

              <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                {isActive
                  ? 'This package can appear publicly on your vendor profile.'
                  : 'You can keep editing this package without displaying it publicly.'}
              </span>
            </span>
          </label>
        </div>
      </section>

      {submissionError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.1)] px-4 py-4 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
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
          disabled={isSubmitting || categories.length === 0}
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
              : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
