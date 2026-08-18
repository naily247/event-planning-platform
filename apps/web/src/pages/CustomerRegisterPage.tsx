import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { registerCustomer } from '../features/auth/auth.api';
import { saveAuthTokens } from '../features/auth/auth.storage';

const customerRegisterSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters.'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number.')
    .regex(/^[+\d][\d\s()-]{6,}$/, 'Enter a valid phone number.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type CustomerRegisterFormValues = z.infer<typeof customerRegisterSchema>;

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
    return 'Registration failed. Please try again.';
  }

  const responseData = error.response?.data;

  return (
    responseData?.message ??
    responseData?.error?.message ??
    'Registration failed. Please check your details and try again.'
  );
};

export function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CustomerRegisterFormValues>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerCustomer,
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

  const firstNameError = form.formState.errors.firstName?.message;
  const lastNameError = form.formState.errors.lastName?.message;
  const emailError = form.formState.errors.email?.message;
  const phoneError = form.formState.errors.phone?.message;
  const passwordError = form.formState.errors.password?.message;

  const registrationErrorMessage = registerMutation.isError
    ? getRegistrationErrorMessage(registerMutation.error)
    : null;

  return (
  <div className="relative overflow-hidden rounded-[2rem] border border-white/62 bg-white/34 p-6 shadow-[0_28px_90px_rgba(31,27,29,0.10)] backdrop-blur-2xl sm:p-8">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-[var(--color-lilac)]/18 blur-3xl"
    />

    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-24 -left-20 size-52 rounded-full bg-[var(--color-powder-blue)]/14 blur-3xl"
    />

    <div className="relative">
      <Link
        to="/register"
        className="group mb-6 inline-flex items-center gap-2 rounded-full border border-white/58 bg-white/28 px-3.5 py-2 text-xs font-black text-[var(--color-charcoal)]/60 transition duration-300 hover:bg-white/48 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        Choose account type
      </Link>

      <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
        <Sparkles aria-hidden="true" className="size-4" />
        Customer workspace
      </div>

      <h1 className="max-w-md text-4xl font-black leading-[1.02] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
        Start planning with
        <span className="block text-[var(--color-deep-plum)]">Eventure.</span>
      </h1>

      <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-[var(--color-charcoal)]/66 sm:text-base">
        Create your customer account to organise events, discover vendors, request quotations and
        manage your planning from one connected workspace.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2.5 block text-sm font-black text-[var(--color-charcoal)]/74">
              First name
            </span>

            <span className="relative block">
              <UserRound
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
              />

              <input
                className="form-field !min-h-12 !pl-12"
                placeholder="First name"
                type="text"
                autoComplete="given-name"
                disabled={registerMutation.isPending}
                aria-invalid={Boolean(firstNameError)}
                aria-describedby={firstNameError ? 'customer-register-first-name-error' : undefined}
                {...form.register('firstName')}
              />
            </span>

            {firstNameError ? (
              <span
                id="customer-register-first-name-error"
                className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {firstNameError}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2.5 block text-sm font-black text-[var(--color-charcoal)]/74">
              Last name
            </span>

            <span className="relative block">
              <UserRound
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
              />

              <input
                className="form-field !min-h-12 !pl-12"
                placeholder="Last name"
                type="text"
                autoComplete="family-name"
                disabled={registerMutation.isPending}
                aria-invalid={Boolean(lastNameError)}
                aria-describedby={lastNameError ? 'customer-register-last-name-error' : undefined}
                {...form.register('lastName')}
              />
            </span>

            {lastNameError ? (
              <span
                id="customer-register-last-name-error"
                className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {lastNameError}
              </span>
            ) : null}
          </label>
        </div>

        <label className="block">
          <span className="mb-2.5 block text-sm font-black text-[var(--color-charcoal)]/74">
            Email address
          </span>

          <span className="relative block">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
            />

            <input
              className="form-field !min-h-12 !pl-12"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              disabled={registerMutation.isPending}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'customer-register-email-error' : undefined}
              {...form.register('email')}
            />
          </span>

          {emailError ? (
            <span
              id="customer-register-email-error"
              className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
            >
              {emailError}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2.5 block text-sm font-black text-[var(--color-charcoal)]/74">
            Phone number
          </span>

          <span className="relative block">
            <Phone
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
            />

            <input
              className="form-field !min-h-12 !pl-12"
              placeholder="+94 77 123 4567"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              disabled={registerMutation.isPending}
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? 'customer-register-phone-error' : undefined}
              {...form.register('phone')}
            />
          </span>

          {phoneError ? (
            <span
              id="customer-register-phone-error"
              className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
            >
              {phoneError}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2.5 block text-sm font-black text-[var(--color-charcoal)]/74">
            Password
          </span>

          <span className="relative block">
            <LockKeyhole
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42"
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
                  ? 'customer-register-password-error customer-register-password-help'
                  : 'customer-register-password-help'
              }
              {...form.register('password')}
            />

            <button
              type="button"
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[var(--color-charcoal)]/46 transition hover:bg-white/45 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45 disabled:cursor-not-allowed disabled:opacity-45"
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
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-dusty-olive)]" />

            <span
              id="customer-register-password-help"
              className="text-sm font-semibold text-[var(--color-charcoal)]/54"
            >
              Use at least 8 characters.
            </span>
          </div>

          {passwordError ? (
            <span
              id="customer-register-password-error"
              className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
            >
              {passwordError}
            </span>
          ) : null}
        </label>

        {registrationErrorMessage ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[1.25rem] border border-[rgba(124,74,90,0.20)] bg-[rgba(124,74,90,0.08)] px-4 py-3.5 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
          >
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[rgba(124,74,90,0.10)]">
              !
            </span>

            <span>{registrationErrorMessage}</span>
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-primary mt-1 min-h-12 w-full justify-center text-sm font-black"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create customer account
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 border-t border-[var(--color-charcoal)]/8 pt-6">
        <p className="text-center text-sm font-semibold text-[var(--color-charcoal)]/60">
          Already have an Eventure account?
        </p>

        <Link
          to="/login"
          className="group mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/34 px-4 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.05)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/54 hover:text-[var(--color-rosewood)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40"
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
