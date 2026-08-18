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
  <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/75 p-6 shadow-[0_28px_90px_rgba(64,42,51,0.09)] backdrop-blur-2xl sm:p-8">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-rose-100/45 blur-3xl"
    />

    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-24 -left-20 size-52 rounded-full bg-violet-100/25 blur-3xl"
    />

    <div className="relative">
      <Link
        to="/register"
        className="group mb-6 inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white/70 px-3.5 py-2 text-xs font-black text-zinc-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[#7a5063] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        Choose account type
      </Link>

      <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#7a5063]">
        <Sparkles aria-hidden="true" className="size-4" />
        Vendor workspace
      </div>

      <h1 className="max-w-md text-4xl font-black leading-[1.02] tracking-[-0.055em] text-[#2e2529] sm:text-5xl">
        Bring your services
        <span className="block text-[#7a5063]">to Eventure.</span>
      </h1>

      <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-zinc-600 sm:text-base">
        Create your vendor account to receive quotation requests, coordinate bookings and build a
        professional presence for customers discovering event services.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2.5 block text-sm font-black text-zinc-700">
              First name
            </span>

            <span className="relative block">
              <UserRound
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400"
              />

              <input
                className="form-field !min-h-12 !pl-12"
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
                className="mt-2 block text-sm font-bold text-red-700"
              >
                {firstNameError}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2.5 block text-sm font-black text-zinc-700">
              Last name
            </span>

            <span className="relative block">
              <UserRound
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400"
              />

              <input
                className="form-field !min-h-12 !pl-12"
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
                className="mt-2 block text-sm font-bold text-red-700"
              >
                {lastNameError}
              </span>
            ) : null}
          </label>
        </div>

        <label className="block">
          <span className="mb-2.5 block text-sm font-black text-zinc-700">
            Business name
          </span>

          <span className="relative block">
            <Building2
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400"
            />

            <input
              className="form-field !min-h-12 !pl-12"
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
              className="mt-2 block text-sm font-bold text-red-700"
            >
              {businessNameError}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2.5 block text-sm font-black text-zinc-700">
            Email address
          </span>

          <span className="relative block">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400"
            />

            <input
              className="form-field !min-h-12 !pl-12"
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
              className="mt-2 block text-sm font-bold text-red-700"
            >
              {emailError}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2.5 block text-sm font-black text-zinc-700">
            Password
          </span>

          <span className="relative block">
            <LockKeyhole
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400"
            />

            <input
              className="form-field !min-h-12 !pl-12 !pr-12"
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
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-[#7a5063] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-45"
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

          <div className="mt-2 flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#7a5063]/55" />

            <span
              id="vendor-register-password-help"
              className="text-sm font-semibold text-zinc-500"
            >
              Use at least 8 characters.
            </span>
          </div>

          {passwordError ? (
            <span
              id="vendor-register-password-error"
              className="mt-2 block text-sm font-bold text-red-700"
            >
              {passwordError}
            </span>
          ) : null}
        </label>

        <div className="flex items-start gap-3 rounded-[1.25rem] border border-rose-100 bg-rose-50/70 px-4 py-3.5">
          <Building2 className="mt-0.5 size-4 shrink-0 text-[#7a5063]" />

          <p className="text-sm font-medium leading-6 text-zinc-600">
            You’ll complete your service categories, contact details and portfolio during vendor
            onboarding after registration.
          </p>
        </div>

        {registrationErrorMessage ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold leading-6 text-red-700"
          >
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-red-100">
              !
            </span>

            <span>{registrationErrorMessage}</span>
          </div>
        ) : null}

        <button
          type="submit"
          className="mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#7a5063] px-5 py-3.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(122,80,99,0.20)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#684354] hover:shadow-[0_18px_40px_rgba(122,80,99,0.28)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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

      <div className="mt-7 border-t border-rose-100/80 pt-6">
        <p className="text-center text-sm font-semibold text-zinc-500">
          Already have an Eventure account?
        </p>

        <Link
          to="/login"
          className="group mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-rose-100 bg-white/70 px-4 text-sm font-black text-[#7a5063] shadow-[0_10px_28px_rgba(64,42,51,0.05)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[#684354] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
        >
          Log in
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  </div>
);
}
