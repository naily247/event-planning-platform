import {
  BadgeCheck,
  Building2,
  Check,
  CircleAlert,
  Globe2,
  MapPin,
  Phone,
  Shapes,
  Sparkles,
} from 'lucide-react';

type VendorProfileHealthProps = {
  businessName: string;
  description: string | null;
  contactPhone: string | null;
  website: string | null;
  baseLocation: string | null;
  serviceAreas: string[];
  categoryCount: number;
  completionPercentage: number;
};

type HealthItem = {
  label: string;
  description: string;
  complete: boolean;
  icon: typeof Building2;
};

export function VendorProfileHealth({
  businessName,
  description,
  contactPhone,
  website,
  baseLocation,
  serviceAreas,
  categoryCount,
  completionPercentage,
}: VendorProfileHealthProps) {
  const healthItems: HealthItem[] = [
    {
      label: 'Business name',
      description: 'Customers can clearly identify your business.',
      complete: businessName.trim().length >= 2,
      icon: Building2,
    },
    {
      label: 'Business description',
      description: 'Your story explains your style, experience, and services.',
      complete: Boolean(description && description.trim().length >= 20),
      icon: Sparkles,
    },
    {
      label: 'Contact phone',
      description: 'Customers have a reliable way to contact you.',
      complete: Boolean(contactPhone?.trim()),
      icon: Phone,
    },
    {
      label: 'Website',
      description: 'Customers can explore your business beyond Eventure.',
      complete: Boolean(website?.trim()),
      icon: Globe2,
    },
    {
      label: 'Base location',
      description: 'Customers know where your business operates from.',
      complete: Boolean(baseLocation?.trim()),
      icon: MapPin,
    },
    {
      label: 'Service areas',
      description: 'Customers can see where your services are available.',
      complete: serviceAreas.length > 0,
      icon: MapPin,
    },
    {
      label: 'Service categories',
      description: 'Your business appears in the right marketplace searches.',
      complete: categoryCount > 0,
      icon: Shapes,
    },
  ];

  const completedCount = healthItems.filter((item) => item.complete).length;
  const remainingCount = healthItems.length - completedCount;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/58 shadow-[0_28px_68px_rgba(62,42,51,0.11)] backdrop-blur-xl">
      <div className="grid lg:grid-cols-[0.36fr_0.64fr]">
        <div className="relative overflow-hidden bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-7 text-white sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-black/10 blur-3xl" />

          <div className="relative">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/12">
              <BadgeCheck className="size-6" />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-white/58">
              Profile health
            </p>

            <div className="mt-4 flex items-end gap-3">
              <p className="text-5xl font-black tracking-[-0.065em]">{completionPercentage}%</p>

              <p className="pb-1 text-sm font-bold text-white/66">complete</p>
            </div>

            <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-white/72">
              {remainingCount === 0
                ? 'Your profile includes all recommended business information.'
                : `${remainingCount} profile ${
                    remainingCount === 1 ? 'detail remains' : 'details remain'
                  } before your business profile is fully complete.`}
            </p>

            <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/14">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="mt-6 flex items-center justify-between text-xs font-black">
              <span className="text-white/62">
                {completedCount}/{healthItems.length} complete
              </span>

              <span className="text-white">
                {remainingCount === 0 ? 'Profile ready' : `${remainingCount} remaining`}
              </span>
            </div>
          </div>
        </div>

        <div className="p-7 sm:p-9">
          <div>
            <p className="section-eyebrow">Profile checklist</p>

            <h2 className="section-title">Strengthen what customers see</h2>

            <p className="section-description">
              Each completed detail helps customers understand your business and trust the
              information shown across Eventure.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {healthItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.label}
                  className={
                    item.complete
                      ? 'rounded-2xl border border-[rgba(142,151,115,0.22)] bg-[rgba(142,151,115,0.09)] p-4'
                      : 'rounded-2xl border border-[rgba(142,92,103,0.16)] bg-[rgba(142,92,103,0.06)] p-4'
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        item.complete
                          ? 'grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#46503a]'
                          : 'grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(142,92,103,0.12)] text-[var(--color-rosewood)]'
                      }
                    >
                      {item.complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-[var(--color-near-black)]">
                          {item.label}
                        </h3>

                        <span
                          className={
                            item.complete
                              ? 'rounded-full bg-[rgba(142,151,115,0.16)] px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#46503a]'
                              : 'rounded-full bg-[rgba(142,92,103,0.11)] px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-rosewood)]'
                          }
                        >
                          {item.complete ? 'Complete' : 'Missing'}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/54">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {remainingCount > 0 ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[rgba(184,145,87,0.20)] bg-[rgba(184,145,87,0.08)] p-4">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-[#7a5b2f]" />

              <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                Complete the missing items when editing becomes available to give customers a
                stronger and more complete view of your business.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
