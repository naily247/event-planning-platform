import { CircleCheck, CircleOff } from 'lucide-react';

type PackageStatusBadgeProps = {
  isActive: boolean;
};

export function PackageStatusBadge({ isActive }: PackageStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
        isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-zinc-200 bg-zinc-100 text-zinc-600',
      ].join(' ')}
    >
      {isActive ? (
        <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <CircleOff className="h-3.5 w-3.5" aria-hidden="true" />
      )}

      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
