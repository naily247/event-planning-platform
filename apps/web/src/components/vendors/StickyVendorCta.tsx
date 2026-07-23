import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

type StickyVendorCtaProps = {
  vendorName: string;
  location: string;
  startingPrice: string;
  rating: number | null;
  reviewCount: number;
};

export function StickyVendorCta({
  vendorName,
  location,
  startingPrice,
  rating,
  reviewCount,
}: StickyVendorCtaProps) {
  const reviewLabel = reviewCount === 1 ? '1 verified review' : `${reviewCount} verified reviews`;

  return (
    <aside className="sticky top-28 hidden xl:block">
      <div className="overflow-hidden rounded-[1.8rem] border border-white/60 bg-white/38 p-6 shadow-[0_24px_70px_rgba(31,27,29,0.14)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,151,115,0.18)] px-3 py-1.5 text-xs font-black text-[#3d452f]">
            <BadgeCheck className="size-3.5" />
            Verified vendor
          </span>

          {rating !== null ? (
            <span className="inline-flex items-center gap-1 text-sm font-black text-[var(--color-near-black)]">
              <Star className="size-4 fill-[var(--color-dusty-olive)] text-[var(--color-dusty-olive)]" />
              {rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">
          Request a quotation from
        </p>

        <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
          {vendorName}
        </h3>

        <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/68">
          <MapPin className="size-4 shrink-0 text-[var(--color-rosewood)]" />
          <span>{location}</span>
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-white/60 bg-white/36 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
            Starting price
          </p>

          <p className="mt-2 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
            {startingPrice}
          </p>

          <p className="mt-2 text-xs leading-5 text-[var(--color-charcoal)]/58">
            Final pricing depends on your event details, selected services and availability.
          </p>
        </div>

        <Link to="/login" className="btn-primary mt-5 w-full justify-center text-sm font-bold">
          Request quotation
          <ArrowRight className="size-4" />
        </Link>

        <p className="mt-4 text-center text-xs font-bold text-[var(--color-charcoal)]/52">
          Sign in to send event requirements securely.
        </p>

        <div className="mt-6 border-t border-[rgba(46,42,44,0.08)] pt-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-[var(--color-charcoal)]/58">Reviews</span>

            <span className="font-black text-[var(--color-near-black)]">
              {reviewCount > 0 ? reviewLabel : 'New vendor'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
