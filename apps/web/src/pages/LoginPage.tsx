import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { login, type AuthUserRole } from '../features/auth/auth.api';
import { saveAuthTokens } from '../features/auth/auth.storage';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const getLoginErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'Login failed. Please try again.';
  }

  const responseData = error.response?.data;

  return (
    responseData?.message ??
    responseData?.error?.message ??
    'Login failed. Please check your email and password.'
  );
};

const getLoginRedirectPath = (role: AuthUserRole) => {
  switch (role) {
    case 'CUSTOMER':
      return '/dashboard';

    case 'VENDOR':
      return '/vendor/dashboard';

    case 'ADMIN':
      return '/admin/dashboard';

    default:
      return '/dashboard';
  }
};

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      saveAuthTokens({
        accessToken: data.accessToken,
      });

      navigate(getLoginRedirectPath(data.user.role), {
        replace: true,
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    loginMutation.mutate(values);
  });

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  const loginErrorMessage = loginMutation.isError
    ? getLoginErrorMessage(loginMutation.error)
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
      <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
        <Sparkles aria-hidden="true" className="size-4" />
        Welcome back
      </div>

      <h1 className="max-w-md text-4xl font-black leading-[1.02] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
        Return to your
        <span className="block text-[var(--color-deep-plum)]">
          Eventure workspace.
        </span>
      </h1>

      <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-[var(--color-charcoal)]/66 sm:text-base">
        Continue planning, review vendor activity and keep every important event detail connected in
        one place.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit} noValidate>
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
              disabled={loginMutation.isPending}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'login-email-error' : undefined}
              {...form.register('email')}
            />
          </span>

          {emailError ? (
            <span
              id="login-email-error"
              className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
            >
              {emailError}
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
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={loginMutation.isPending}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'login-password-error' : undefined}
              {...form.register('password')}
            />

            <button
              type="button"
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[var(--color-charcoal)]/46 transition hover:bg-white/45 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              disabled={loginMutation.isPending}
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

          {passwordError ? (
            <span
              id="login-password-error"
              className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
            >
              {passwordError}
            </span>
          ) : null}
        </label>

        {loginErrorMessage ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[1.25rem] border border-[rgba(124,74,90,0.20)] bg-[rgba(124,74,90,0.08)] px-4 py-3.5 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
          >
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[rgba(124,74,90,0.10)]">
              !
            </span>

            <span>{loginErrorMessage}</span>
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-primary mt-1 min-h-12 w-full justify-center text-sm font-black"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              Log in
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 border-t border-[var(--color-charcoal)]/8 pt-6">
        <p className="text-center text-sm font-semibold text-[var(--color-charcoal)]/60">
          New to Eventure?
        </p>

        <Link
          to="/register"
          className="group mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/34 px-4 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.05)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/54 hover:text-[var(--color-rosewood)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40"
        >
          Create an account
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