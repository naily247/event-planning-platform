import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  LockKeyhole,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { registerVendor } from '../features/auth/auth.api';
import { saveAuthTokens } from '../features/auth/auth.storage';

const vendorCategories = [
  'Photography',
  'Catering',
  'Decorations',
  'Music',
  'Venue',
  'Makeup',
  'Other',
];

const vendorRegisterSchema = z.object({
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters.'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters.'),
  category: z.string().min(1, 'Choose your main service category.'),
  email: z.string().email('Enter a valid email address.'),
  phone: z.string().min(7, 'Enter a valid phone number.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type VendorRegisterFormValues = z.infer<typeof vendorRegisterSchema>;

export function VendorRegisterPage() {
  const navigate = useNavigate();

  const form = useForm<VendorRegisterFormValues>({
    resolver: zodResolver(vendorRegisterSchema),
    defaultValues: {
      ownerName: '',
      businessName: '',
      category: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerVendor,
    onSuccess: (data) => {
      saveAuthTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      navigate('/dashboard');
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    registerMutation.mutate(values);
  });

  return (
    <div className="glass-card p-6 sm:p-8">
      <Link
        to="/register"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/64 transition hover:text-[var(--color-deep-plum)]"
      >
        <ArrowLeft className="size-4" />
        Choose account type
      </Link>

      <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
        <Sparkles className="size-4" />
        Vendor workspace
      </div>

      <h1 className="text-4xl font-black leading-[1] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
        Bring your event services to the right clients.
      </h1>

      <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
        Create a vendor account to receive quotation requests, manage bookings, showcase your
        portfolio and build trust with verified customers.
      </p>

      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Owner name
          </span>

          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />
            <input
              className="form-field !pl-12"
              placeholder="Your full name"
              type="text"
              {...form.register('ownerName')}
            />
          </span>

          {form.formState.errors.ownerName ? (
            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
              {form.formState.errors.ownerName.message}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Business name
          </span>

          <span className="relative block">
            <Building2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />
            <input
              className="form-field !pl-12"
              placeholder="Your vendor business name"
              type="text"
              {...form.register('businessName')}
            />
          </span>

          {form.formState.errors.businessName ? (
            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
              {form.formState.errors.businessName.message}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Service category
          </span>

          <span className="relative block">
            <BriefcaseBusiness className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />
            <select className="form-field !pl-12" {...form.register('category')}>
              <option value="">Choose your main category</option>
              {vendorCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </span>

          {form.formState.errors.category ? (
            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
              {form.formState.errors.category.message}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Email address
          </span>

          <span className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />
            <input
              className="form-field !pl-12"
              placeholder="business@example.com"
              type="email"
              {...form.register('email')}
            />
          </span>

          {form.formState.errors.email ? (
            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
              {form.formState.errors.email.message}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Phone number
          </span>

          <span className="relative block">
            <Phone className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />
            <input
              className="form-field !pl-12"
              placeholder="+94 77 123 4567"
              type="tel"
              {...form.register('phone')}
            />
          </span>

          {form.formState.errors.phone ? (
            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
              {form.formState.errors.phone.message}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Password
          </span>

          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />
            <input
              className="form-field !pl-12"
              placeholder="Create a strong password"
              type="password"
              {...form.register('password')}
            />
          </span>

          {form.formState.errors.password ? (
            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
              {form.formState.errors.password.message}
            </span>
          ) : null}
        </label>

        {registerMutation.isError ? (
          <div className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
            Vendor registration failed. Please check your details and try again.
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-primary mt-2 w-full justify-center font-bold"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? 'Creating account...' : 'Create vendor account'}
          <ArrowRight className="size-4" />
        </button>
      </form>

      <p className="mt-7 text-center text-sm font-semibold text-[var(--color-charcoal)]/62">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
