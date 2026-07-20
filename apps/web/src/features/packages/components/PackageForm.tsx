import type { UseFormReturn } from 'react-hook-form';
import { LoaderCircle, PackagePlus, Save } from 'lucide-react';
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

  return (
    <form className="mt-8 grid gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
          Service category
        </span>

        <select
          className="form-field"
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
          <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
            {form.formState.errors.categoryId.message}
          </span>
        ) : null}

        {categories.length === 0 ? (
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-muted-burgundy)]">
            Add at least one service category to your vendor profile before creating packages.
          </p>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
          Package title
        </span>

        <input
          className="form-field"
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
          <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
            {form.formState.errors.title.message}
          </span>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
          Description
        </span>

        <textarea
          className="form-field min-h-32 resize-y"
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
          <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
            {form.formState.errors.description.message}
          </span>
        ) : null}
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Starting price
          </span>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-black text-[var(--color-charcoal)]/45">
              LKR
            </span>

            <input
              className="form-field pl-14"
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
            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
              {form.formState.errors.basePrice.message}
            </span>
          ) : (
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
              Leave blank when pricing depends on customer requirements.
            </p>
          )}
        </label>

        <label className="flex items-center gap-4 rounded-2xl border border-white/55 bg-white/24 px-5 py-4">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-deep-plum)]"
            disabled={isSubmitting}
            {...form.register('isActive')}
          />

          <span>
            <span className="block text-sm font-black text-[var(--color-near-black)]">
              Active package
            </span>

            <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
              Active packages can appear publicly to customers.
            </span>
          </span>
        </label>
      </div>

      {submissionError ? (
        <div
          role="alert"
          className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
        >
          {submissionError}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
              ? 'Creating...'
              : 'Saving...'
            : isCreateMode
              ? 'Create package'
              : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
