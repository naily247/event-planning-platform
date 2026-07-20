import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileText,
  LoaderCircle,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createVendorQuotationDraft,
  getVendorQuotationDraft,
  getVendorQuotationRequestById,
  sendVendorQuotationDraft,
  updateVendorQuotationDraft,
  type CreateVendorQuotationDraftInput,
  type VendorQuotation,
} from '../features/quotationRequests/quotationRequest.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';

type FormState = {
  proposedPrice: string;
  depositAmount: string;
  inclusions: string;
  exclusions: string;
  terms: string;
  expiresAt: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  proposedPrice: '',
  depositAmount: '',
  inclusions: '',
  exclusions: '',
  terms: '',
  expiresAt: '',
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function getErrorStatus(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const responseData = error.response.data;

    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'message' in responseData &&
      typeof responseData.message === 'string'
    ) {
      return responseData.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while processing the quotation.';
}

function mapDraftToForm(draft: VendorQuotation): FormState {
  return {
    proposedPrice: draft.proposedPrice,
    depositAmount: draft.depositAmount ?? '',
    inclusions: draft.inclusions,
    exclusions: draft.exclusions ?? '',
    terms: draft.terms ?? '',
    expiresAt: toDateTimeLocal(draft.expiresAt),
  };
}

function validateForm(form: FormState) {
  const errors: FormErrors = {};

  const proposedPrice = Number(form.proposedPrice);
  const depositAmount = form.depositAmount.trim() === '' ? null : Number(form.depositAmount);

  if (!form.proposedPrice.trim()) {
    errors.proposedPrice = 'Proposed price is required.';
  } else if (!Number.isFinite(proposedPrice) || proposedPrice <= 0) {
    errors.proposedPrice = 'Proposed price must be greater than zero.';
  } else if (proposedPrice > 9_999_999_999.99) {
    errors.proposedPrice = 'Proposed price is too large.';
  }

  if (depositAmount !== null) {
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      errors.depositAmount = 'Deposit amount cannot be negative.';
    } else if (depositAmount > 9_999_999_999.99) {
      errors.depositAmount = 'Deposit amount is too large.';
    } else if (Number.isFinite(proposedPrice) && depositAmount > proposedPrice) {
      errors.depositAmount = 'Deposit amount cannot exceed the proposed price.';
    }
  }

  const inclusionsLength = form.inclusions.trim().length;

  if (inclusionsLength < 10) {
    errors.inclusions = 'Inclusions must contain at least 10 characters.';
  } else if (inclusionsLength > 5000) {
    errors.inclusions = 'Inclusions cannot exceed 5000 characters.';
  }

  if (form.exclusions.trim().length > 5000) {
    errors.exclusions = 'Exclusions cannot exceed 5000 characters.';
  }

  if (form.terms.trim().length > 5000) {
    errors.terms = 'Terms cannot exceed 5000 characters.';
  }

  if (form.expiresAt) {
    const expiresAt = new Date(form.expiresAt);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      errors.expiresAt = 'Quotation expiry must be in the future.';
    }
  }

  return errors;
}

function createPayload(form: FormState): CreateVendorQuotationDraftInput {
  return {
    proposedPrice: Number(form.proposedPrice),
    depositAmount: form.depositAmount.trim() === '' ? null : Number(form.depositAmount),
    inclusions: form.inclusions.trim(),
    exclusions: form.exclusions.trim() || null,
    terms: form.terms.trim() || null,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
  };
}

function CharacterCount({ current, maximum }: { current: number; maximum: number }) {
  return (
    <span
      className={`text-xs ${current > maximum ? 'font-semibold text-red-600' : 'text-zinc-400'}`}
    >
      {current}/{maximum}
    </span>
  );
}

export function VendorQuotationEditorPage() {
  const { quotationRequestId } = useParams<{
    quotationRequestId: string;
  }>();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [initialized, setInitialized] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [operationError, setOperationError] = useState('');
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  const requestQuery = useQuery({
    queryKey: ['vendor-quotation-request', quotationRequestId],
    queryFn: () => getVendorQuotationRequestById(quotationRequestId as string),
    enabled: Boolean(quotationRequestId),
  });

  const draftQuery = useQuery({
    queryKey: ['vendor-quotation-draft', quotationRequestId],
    queryFn: () => getVendorQuotationDraft(quotationRequestId as string),
    enabled: Boolean(quotationRequestId),
    retry: false,
  });

  const draftNotFound = draftQuery.isError && getErrorStatus(draftQuery.error) === 404;

  const draftExists = Boolean(draftQuery.data);

  useEffect(() => {
    if (initialized) {
      return;
    }

    if (draftQuery.data) {
      setForm(mapDraftToForm(draftQuery.data));
      setInitialized(true);
      return;
    }

    if (draftNotFound) {
      setInitialized(true);
    }
  }, [draftNotFound, draftQuery.data, initialized]);

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateVendorQuotationDraftInput) => {
      if (draftExists) {
        return updateVendorQuotationDraft(quotationRequestId as string, payload);
      }

      return createVendorQuotationDraft(quotationRequestId as string, payload);
    },
    onSuccess: (savedDraft) => {
      queryClient.setQueryData(['vendor-quotation-draft', quotationRequestId], savedDraft);

      void queryClient.invalidateQueries({
        queryKey: ['vendor-quotation-request', quotationRequestId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['vendor-quotation-requests'],
      });

      setSuccessMessage(
        draftExists
          ? 'Quotation draft updated successfully.'
          : 'Quotation draft created successfully.',
      );
      setOperationError('');
    },
    onError: (error) => {
      setOperationError(getErrorMessage(error));
      setSuccessMessage('');
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const validationErrors = validateForm(form);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        throw new Error('Complete the required quotation fields before sending.');
      }

      const payload = createPayload(form);

      if (draftExists) {
        await updateVendorQuotationDraft(quotationRequestId as string, payload);
      } else {
        await createVendorQuotationDraft(quotationRequestId as string, payload);
      }

      return sendVendorQuotationDraft(quotationRequestId as string);
    },
    onSuccess: (sentQuotation) => {
      queryClient.setQueryData(['vendor-quotation-draft', quotationRequestId], sentQuotation);

      void queryClient.invalidateQueries({
        queryKey: ['vendor-quotation-request', quotationRequestId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['vendor-quotation-requests'],
      });

      setShowSendConfirmation(false);

      navigate(`/vendor/quotation-requests/${quotationRequestId}`, {
        replace: true,
      });
    },
    onError: (error) => {
      setOperationError(getErrorMessage(error));
      setSuccessMessage('');
      setShowSendConfirmation(false);
    },
  });

  const parsedPrice = Number(form.proposedPrice);
  const parsedDeposit = form.depositAmount.trim() === '' ? null : Number(form.depositAmount);

  const remainingBalance = useMemo(() => {
    if (!Number.isFinite(parsedPrice)) {
      return null;
    }

    if (parsedDeposit === null || !Number.isFinite(parsedDeposit)) {
      return parsedPrice;
    }

    return parsedPrice - parsedDeposit;
  }, [parsedDeposit, parsedPrice]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setSuccessMessage('');
    setOperationError('');
  }

  function handleSave() {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setOperationError('Please correct the highlighted quotation fields.');
      setSuccessMessage('');
      return;
    }

    saveMutation.mutate(createPayload(form));
  }

  function handleOpenSendConfirmation() {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setOperationError('Complete the required quotation fields before sending.');
      setSuccessMessage('');
      return;
    }

    setShowSendConfirmation(true);
  }

  if (!quotationRequestId) {
    return (
      <main className="min-h-screen bg-[#f5f1f0] px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-red-900">Invalid quotation request</h1>
        </div>
      </main>
    );
  }

  const request = requestQuery.data;

  const loading = requestQuery.isLoading || draftQuery.isLoading || !initialized;

  const requestUnavailable = requestQuery.isError || !request;

  const draftLoadFailed = draftQuery.isError && !draftNotFound;

  const terminalRequest = request && ['ACCEPTED', 'DECLINED', 'CLOSED'].includes(request.status);

  const deadlinePassed =
    request?.responseDueAt && new Date(request.responseDueAt).getTime() < Date.now();

  const editingDisabled =
    Boolean(terminalRequest) || Boolean(deadlinePassed) || request?.status === 'QUOTED';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(190,137,154,0.18),_transparent_34%),linear-gradient(180deg,_#f8f5f4_0%,_#f3efee_100%)] text-[#2e2529]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <VendorWorkspaceNav />

        <div className="mt-6">
          <Link
            to={`/vendor/quotation-requests/${quotationRequestId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-rose-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to request
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 flex min-h-[440px] items-center justify-center rounded-[32px] border border-white/80 bg-white/70">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-rose-700" />
              <p className="mt-4 text-sm font-medium text-zinc-500">Preparing quotation editor…</p>
            </div>
          </div>
        ) : requestUnavailable ? (
          <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h1 className="mt-4 text-xl font-semibold text-red-900">
              Quotation request could not be loaded
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
              {getErrorMessage(requestQuery.error)}
            </p>
          </section>
        ) : draftLoadFailed ? (
          <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h1 className="mt-4 text-xl font-semibold text-red-900">
              Quotation draft could not be loaded
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
              {getErrorMessage(draftQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => draftQuery.refetch()}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_24px_80px_rgba(64,42,51,0.08)] backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                    <FileCheck2 className="h-4 w-4" />
                    {draftExists ? 'Saved quotation draft' : 'New quotation'}
                  </div>

                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    Prepare quotation
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
                    Respond to <strong>{request.event.name}</strong> with complete pricing, service
                    inclusions, exclusions, terms, and validity details.
                  </p>
                </div>

                <div className="rounded-2xl border border-white bg-white/85 px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
                    Request status
                  </p>

                  <p className="mt-1 font-semibold text-[#34282e]">
                    {request.status.replaceAll('_', ' ')}
                  </p>
                </div>
              </div>
            </section>

            {editingDisabled && (
              <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                  <div>
                    <p className="font-semibold text-amber-900">Quotation editing is unavailable</p>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      This request has already been quoted, closed, accepted, declined, or its
                      response deadline has passed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
              </div>
            )}

            {operationError && (
              <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                <p className="text-sm font-medium text-red-800">{operationError}</p>
              </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              <section className="space-y-6">
                <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <CircleDollarSign className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Financial details
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">Pricing and deposit</h2>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-zinc-700">
                        Proposed price (LKR)
                      </span>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        disabled={editingDisabled}
                        value={form.proposedPrice}
                        onChange={(event) => updateField('proposedPrice', event.target.value)}
                        placeholder="150000"
                        className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 ${
                          errors.proposedPrice
                            ? 'border-red-300 focus:ring-4 focus:ring-red-100'
                            : 'border-zinc-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100'
                        }`}
                      />

                      {errors.proposedPrice && (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {errors.proposedPrice}
                        </p>
                      )}
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-zinc-700">
                        Deposit amount (optional)
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={editingDisabled}
                        value={form.depositAmount}
                        onChange={(event) => updateField('depositAmount', event.target.value)}
                        placeholder="50000"
                        className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 ${
                          errors.depositAmount
                            ? 'border-red-300 focus:ring-4 focus:ring-red-100'
                            : 'border-zinc-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100'
                        }`}
                      />

                      {errors.depositAmount && (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {errors.depositAmount}
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Service scope
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">Inclusions and exclusions</h2>
                    </div>
                  </div>

                  <label className="mt-6 block">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-zinc-700">Inclusions</span>

                      <CharacterCount current={form.inclusions.length} maximum={5000} />
                    </div>

                    <textarea
                      rows={8}
                      disabled={editingDisabled}
                      value={form.inclusions}
                      onChange={(event) => updateField('inclusions', event.target.value)}
                      placeholder="Describe everything included in this quotation..."
                      className={`mt-2 w-full resize-y rounded-2xl border bg-white px-4 py-3 text-sm leading-6 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 ${
                        errors.inclusions
                          ? 'border-red-300 focus:ring-4 focus:ring-red-100'
                          : 'border-zinc-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100'
                      }`}
                    />

                    {errors.inclusions && (
                      <p className="mt-2 text-xs font-medium text-red-600">{errors.inclusions}</p>
                    )}
                  </label>

                  <label className="mt-5 block">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-zinc-700">
                        Exclusions (optional)
                      </span>

                      <CharacterCount current={form.exclusions.length} maximum={5000} />
                    </div>

                    <textarea
                      rows={6}
                      disabled={editingDisabled}
                      value={form.exclusions}
                      onChange={(event) => updateField('exclusions', event.target.value)}
                      placeholder="List anything not included in this quotation..."
                      className={`mt-2 w-full resize-y rounded-2xl border bg-white px-4 py-3 text-sm leading-6 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 ${
                        errors.exclusions
                          ? 'border-red-300 focus:ring-4 focus:ring-red-100'
                          : 'border-zinc-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100'
                      }`}
                    />

                    {errors.exclusions && (
                      <p className="mt-2 text-xs font-medium text-red-600">{errors.exclusions}</p>
                    )}
                  </label>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Conditions
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">Terms and validity</h2>
                    </div>
                  </div>

                  <label className="mt-6 block">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-zinc-700">Terms (optional)</span>

                      <CharacterCount current={form.terms.length} maximum={5000} />
                    </div>

                    <textarea
                      rows={7}
                      disabled={editingDisabled}
                      value={form.terms}
                      onChange={(event) => updateField('terms', event.target.value)}
                      placeholder="Add payment terms, cancellation rules, timing expectations, and other conditions..."
                      className={`mt-2 w-full resize-y rounded-2xl border bg-white px-4 py-3 text-sm leading-6 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 ${
                        errors.terms
                          ? 'border-red-300 focus:ring-4 focus:ring-red-100'
                          : 'border-zinc-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100'
                      }`}
                    />

                    {errors.terms && (
                      <p className="mt-2 text-xs font-medium text-red-600">{errors.terms}</p>
                    )}
                  </label>

                  <label className="mt-5 block">
                    <span className="text-sm font-semibold text-zinc-700">
                      Quotation expiry (optional)
                    </span>

                    <input
                      type="datetime-local"
                      disabled={editingDisabled}
                      value={form.expiresAt}
                      onChange={(event) => updateField('expiresAt', event.target.value)}
                      className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 ${
                        errors.expiresAt
                          ? 'border-red-300 focus:ring-4 focus:ring-red-100'
                          : 'border-zinc-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100'
                      }`}
                    />

                    {errors.expiresAt && (
                      <p className="mt-2 text-xs font-medium text-red-600">{errors.expiresAt}</p>
                    )}
                  </label>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Quotation summary
                  </p>

                  <dl className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm text-zinc-500">Proposed price</dt>
                      <dd className="font-semibold text-[#34282e]">
                        {Number.isFinite(parsedPrice) && parsedPrice > 0
                          ? `LKR ${parsedPrice.toLocaleString('en-LK')}`
                          : '—'}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm text-zinc-500">Deposit</dt>
                      <dd className="font-semibold text-[#34282e]">
                        {parsedDeposit !== null && Number.isFinite(parsedDeposit)
                          ? `LKR ${parsedDeposit.toLocaleString('en-LK')}`
                          : 'Not required'}
                      </dd>
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-sm font-semibold text-zinc-700">Remaining balance</dt>
                        <dd className="text-lg font-semibold text-rose-800">
                          {remainingBalance !== null && Number.isFinite(remainingBalance)
                            ? `LKR ${remainingBalance.toLocaleString('en-LK')}`
                            : '—'}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </section>

                <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-5 w-5 text-rose-700" />
                    <h2 className="font-semibold text-[#34282e]">Before sending</h2>
                  </div>

                  <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                    <li>Confirm the proposed price and deposit.</li>
                    <li>Clearly state all service inclusions.</li>
                    <li>List exclusions to avoid misunderstandings.</li>
                    <li>Add relevant payment and cancellation terms.</li>
                    <li>Review the expiry date before submission.</li>
                  </ul>
                </section>

                {!editingDisabled && (
                  <section className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.08)]">
                    <button
                      type="button"
                      disabled={saveMutation.isPending || sendMutation.isPending}
                      onClick={handleSave}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      {draftExists ? 'Update draft' : 'Save draft'}
                    </button>

                    <button
                      type="button"
                      disabled={saveMutation.isPending || sendMutation.isPending}
                      onClick={handleOpenSendConfirmation}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#34282e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#4b343e] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send quotation
                    </button>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      {showSendConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSendConfirmation(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-quotation-title"
            className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <Send className="h-5 w-5" />
            </div>

            <h2 id="send-quotation-title" className="mt-5 text-xl font-semibold text-[#34282e]">
              Send this quotation?
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              The draft will be saved first and then sent to the customer. Once sent, this current
              backend workflow does not support editing or revising it.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={sendMutation.isPending}
                onClick={() => setShowSendConfirmation(false)}
                className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Keep editing
              </button>

              <button
                type="button"
                disabled={sendMutation.isPending}
                onClick={() => sendMutation.mutate()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#34282e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4b343e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Confirm and send
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
