import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { registerVendor } from '../features/auth/auth.api';
import { saveAuthTokens } from '../features/auth/auth.storage';

const vendorRegisterSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters.'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters.'),
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type VendorRegisterFormValues = z.infer<typeof vendorRegisterSchema>;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const getRegistrationErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'Vendor registration failed. Please try again.';
  }

  const responseData = error.response?.data;

  return (
    responseData?.message ??
    responseData?.error?.message ??
    'Vendor registration failed. Please check your details and try again.'
  );
};

export function VendorRegisterPage() {
  const navigate = useNavigate();

  const form = useForm<VendorRegisterFormValues>({
    resolver: zodResolver(vendorRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      businessName: '',
      email: '',
      password: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerVendor,
    onSuccess: (data) => {
      saveAuthTokens({
        accessToken: data.accessToken,
      });

      navigate('/dashboard', {
        replace: true,
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    registerMutation.mutate(values);
  });

  const registrationErrorMessage = registerMutation.isError
    ? getRegistrationErrorMessage(registerMutation.error)
    : null;

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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
              First name
            </span>

            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

              <input
                className="form-field !pl-12"
                placeholder="First name"
                type="text"
                autoComplete="given-name"
                disabled={registerMutation.isPending}
                {...form.register('firstName')}
              />
            </span>

            {form.formState.errors.firstName ? (
              <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                {form.formState.errors.firstName.message}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
              Last name
            </span>

            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

              <input
                className="form-field !pl-12"
                placeholder="Last name"
                type="text"
                autoComplete="family-name"
                disabled={registerMutation.isPending}
                {...form.register('lastName')}
              />
            </span>

            {form.formState.errors.lastName ? (
              <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                {form.formState.errors.lastName.message}
              </span>
            ) : null}
          </label>
        </div>

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
              autoComplete="organization"
              disabled={registerMutation.isPending}
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
            Email address
          </span>

          <span className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

            <input
              className="form-field !pl-12"
              placeholder="business@example.com"
              type="email"
              autoComplete="email"
              disabled={registerMutation.isPending}
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
            Password
          </span>

          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

            <input
              className="form-field !pl-12"
              placeholder="Create a strong password"
              type="password"
              autoComplete="new-password"
              disabled={registerMutation.isPending}
              {...form.register('password')}
            />
          </span>

          {form.formState.errors.password ? (
            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
              {form.formState.errors.password.message}
            </span>
          ) : null}
        </label>

        <div className="rounded-2xl border border-[rgba(93,58,85,0.14)] bg-white/24 px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
          You’ll complete your service categories, contact details and portfolio during vendor
          onboarding after registration.
        </div>

        {registrationErrorMessage ? (
          <div
            role="alert"
            className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
          >
            {registrationErrorMessage}
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
