import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);

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

      navigate('/vendor/dashboard', {
        replace: true,
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    registerMutation.mutate(values);
  });

  const firstNameError = form.formState.errors.firstName?.message;
  const lastNameError = form.formState.errors.lastName?.message;
  const businessNameError = form.formState.errors.businessName?.message;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  const registrationErrorMessage = registerMutation.isError
    ? getRegistrationErrorMessage(registerMutation.error)
    : null;

  return (
    <div className="glass-card p-6 sm:p-8">
      <Link
        to="/register"
        className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-[var(--color-charcoal)]/64 transition hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45 focus-visible:ring-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Choose account type
      </Link>

      <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
        <Sparkles aria-hidden="true" className="size-4" />
        Vendor workspace
      </div>

      <h1 className="text-4xl font-black leading-[1] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
        Bring your event services to the right clients.
      </h1>

      <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
        Create a vendor account to receive quotation requests, manage bookings, showcase your
        portfolio and build trust with verified customers.
      </p>

      <form className="mt-8 grid gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
              First name
            </span>

            <span className="relative block">
              <UserRound
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
              />

              <input
                className="form-field !pl-12"
                placeholder="First name"
                type="text"
                autoComplete="given-name"
                disabled={registerMutation.isPending}
                aria-invalid={Boolean(firstNameError)}
                aria-describedby={firstNameError ? 'vendor-register-first-name-error' : undefined}
                {...form.register('firstName')}
              />
            </span>

            {firstNameError ? (
              <span
                id="vendor-register-first-name-error"
                className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {firstNameError}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
              Last name
            </span>

            <span className="relative block">
              <UserRound
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
              />

              <input
                className="form-field !pl-12"
                placeholder="Last name"
                type="text"
                autoComplete="family-name"
                disabled={registerMutation.isPending}
                aria-invalid={Boolean(lastNameError)}
                aria-describedby={lastNameError ? 'vendor-register-last-name-error' : undefined}
                {...form.register('lastName')}
              />
            </span>

            {lastNameError ? (
              <span
                id="vendor-register-last-name-error"
                className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {lastNameError}
              </span>
            ) : null}
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Business name
          </span>

          <span className="relative block">
            <Building2
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
            />

            <input
              className="form-field !pl-12"
              placeholder="Your vendor business name"
              type="text"
              autoComplete="organization"
              disabled={registerMutation.isPending}
              aria-invalid={Boolean(businessNameError)}
              aria-describedby={
                businessNameError ? 'vendor-register-business-name-error' : undefined
              }
              {...form.register('businessName')}
            />
          </span>

          {businessNameError ? (
            <span
              id="vendor-register-business-name-error"
              className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
            >
              {businessNameError}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Email address
          </span>

          <span className="relative block">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
            />

            <input
              className="form-field !pl-12"
              placeholder="business@example.com"
              type="email"
              autoComplete="email"
              disabled={registerMutation.isPending}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'vendor-register-email-error' : undefined}
              {...form.register('email')}
            />
          </span>

          {emailError ? (
            <span
              id="vendor-register-email-error"
              className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
            >
              {emailError}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
            Password
          </span>

          <span className="relative block">
            <LockKeyhole
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
            />

            <input
              className="form-field !pl-12 !pr-12"
              placeholder="Create a strong password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={registerMutation.isPending}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={
                passwordError
                  ? 'vendor-register-password-error vendor-register-password-help'
                  : 'vendor-register-password-help'
              }
              {...form.register('password')}
            />

            <button
              type="button"
              className="absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--color-charcoal)]/46 transition hover:bg-white/36 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              disabled={registerMutation.isPending}
              onClick={() => {
                setShowPassword((current) => !current);
              }}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-5" />
              ) : (
                <Eye aria-hidden="true" className="size-5" />
              )}
            </button>
          </span>

          <span
            id="vendor-register-password-help"
            className="mt-2 block text-sm font-semibold text-[var(--color-charcoal)]/54"
          >
            Use at least 8 characters.
          </span>

          {passwordError ? (
            <span
              id="vendor-register-password-error"
              className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
            >
              {passwordError}
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
          {registerMutation.isPending ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create vendor account
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-sm font-semibold text-[var(--color-charcoal)]/62">
        Already have an account?{' '}
        <Link
          to="/login"
          className="rounded-md font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45 focus-visible:ring-offset-2"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
