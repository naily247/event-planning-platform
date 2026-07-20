import type { LucideIcon } from 'lucide-react';

type VendorStatCardProps = {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone: string;
};

export function VendorStatCard({ label, value, helper, icon: Icon, tone }: VendorStatCardProps) {
  return (
    <article className="luxe-card p-6 transition-transform duration-300 hover:-translate-y-1">
      <div className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
        <Icon className="size-5" />
      </div>

      <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">{label}</p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
        {value}
      </p>

      <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">{helper}</p>
    </article>
  );
}
