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
    <div className="glass-card p-6 sm:p-8">
      <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
        <Sparkles aria-hidden="true" className="size-4" />
        Welcome back
      </div>

      <h1 className="text-4xl font-black leading-[1] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
        Log in to your event workspace.
      </h1>

      <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
        Continue planning your events, reviewing vendor responses and keeping your booking details
        beautifully organised.
      </p>

      <form className="mt-8 grid gap-4" onSubmit={onSubmit} noValidate>
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
              className="absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--color-charcoal)]/46 transition hover:bg-white/36 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45"
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
            className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
          >
            {loginErrorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-primary mt-2 w-full justify-center font-bold"
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

      <p className="mt-7 text-center text-sm font-semibold text-[var(--color-charcoal)]/62">
        New to Eventure?{' '}
        <Link
          to="/register"
          className="font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}