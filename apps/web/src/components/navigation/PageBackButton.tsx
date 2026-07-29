import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

type PageBackButtonProps = {
  fallback: string;
  label?: string;
  className?: string;
};

export function PageBackButton({
  fallback,
  label = 'Back',
  className = '',
}: PageBackButtonProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }

    navigate(fallback, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/55 bg-white/35 px-4 text-sm font-bold text-[var(--color-charcoal)] shadow-[0_12px_30px_rgba(31,27,29,0.1)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/55 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${className}`}
    >
      <ArrowLeft className="size-4" />
      <span>{label}</span>
    </button>
  );
}