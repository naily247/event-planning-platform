import { BadgeCheck, Building2, ExternalLink, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

type VendorPublicPreviewCardProps = {
  businessName: string;
  slug: string;
  logoUrl: string | null;
  initials: string;
  categoryName: string;
  baseLocation: string;
  verificationStatus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  description: string | null;
};

export function VendorPublicPreviewCard({
  businessName,
  slug,
  logoUrl,
  initials,
  categoryName,
  baseLocation,
  verificationStatus,
  description,
}: VendorPublicPreviewCardProps) {
  const isApproved = verificationStatus === 'APPROVED';

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/58 shadow-[0_22px_52px_rgba(65,43,53,0.10)] backdrop-blur-xl">
      <div className="relative h-32 overflow-hidden bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))]">
        <div className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-white/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-8 size-44 rounded-full bg-black/12 blur-3xl" />

        <div className="absolute left-5 top-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/12 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/82 backdrop-blur-md">
            Customers currently see
          </span>
        </div>
      </div>

      <div className="relative px-5 pb-5">
        <div className="-mt-10 flex items-end justify-between gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_16px_34px_rgba(52,35,43,0.18)]">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${businessName} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#8f6277,#58374f)] text-xl font-black text-white">
                {initials}
              </div>
            )}
          </div>

          {isApproved ? (
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,151,115,0.17)] px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[#46503a]">
              <BadgeCheck className="size-3.5" />
              Verified
            </span>
          ) : (
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[rgba(93,58,85,0.09)] px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)]">
              Preview
            </span>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
            {businessName}
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(93,58,85,0.07)] px-3 py-1.5 text-xs font-black text-[var(--color-deep-plum)]">
              <Building2 className="size-3.5" />
              {categoryName}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(93,58,85,0.07)] px-3 py-1.5 text-xs font-black text-[var(--color-deep-plum)]">
              <MapPin className="size-3.5" />
              {baseLocation}
            </span>
          </div>

          <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
            {description?.trim() ||
              'Add a business description to help customers understand your services and style.'}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[rgba(93,58,85,0.09)] pt-4">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--color-near-black)]">
            <span className="inline-flex items-center gap-1">
              <Star className="size-4 fill-current text-[var(--color-rosewood)]" />
              New
            </span>

            <span className="text-[var(--color-charcoal)]/36">•</span>

            <span className="text-xs font-bold text-[var(--color-charcoal)]/48">
              Customer reviews
            </span>
          </div>

          {isApproved ? (
            <Link
              to={`/vendors/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
            >
              Open profile
              <ExternalLink className="size-3.5" />
            </Link>
          ) : (
            <span className="text-xs font-black text-[var(--color-charcoal)]/38">
              Not public yet
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
