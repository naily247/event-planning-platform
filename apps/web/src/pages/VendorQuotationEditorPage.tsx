import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileText,
  LoaderCircle,
  Save,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createVendorQuotationDraft,
  getVendorQuotationDraft,
  getVendorQuotationRequestById,
  sendVendorQuotationDraft,
  updateVendorQuotationDraft,
  type CreateVendorQuotationDraftInput,
  type VendorQuotation,
} from '../features/quotationRequests/quotationRequest.api';

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
  const exceeded = current > maximum;

  return (
    <span
      className={[
        'rounded-full px-2.5 py-1 text-[0.65rem] font-black',
        exceeded
          ? 'bg-red-100 text-red-600'
          : 'bg-[rgba(183,167,200,0.14)] text-[var(--color-charcoal)]/46',
      ].join(' ')}
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
  const [savedForm, setSavedForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [initialized, setInitialized] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [operationError, setOperationError] = useState('');
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

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
      const draftForm = mapDraftToForm(draftQuery.data);

      setForm(draftForm);
      setSavedForm(draftForm);
      setInitialized(true);
      return;
    }

    if (draftNotFound) {
      setForm(emptyForm);
      setSavedForm(emptyForm);
      setInitialized(true);
    }
  }, [draftNotFound, draftQuery.data, initialized]);

  const isDirty = useMemo(
    () =>
      form.proposedPrice !== savedForm.proposedPrice ||
      form.depositAmount !== savedForm.depositAmount ||
      form.inclusions !== savedForm.inclusions ||
      form.exclusions !== savedForm.exclusions ||
      form.terms !== savedForm.terms ||
      form.expiresAt !== savedForm.expiresAt,
    [form, savedForm],
  );

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

      const savedDraftForm = mapDraftToForm(savedDraft);

      setForm(savedDraftForm);
      setSavedForm(savedDraftForm);
      setErrors({});

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
    if (!isDirty) {
      setOperationError('');
      setSuccessMessage(
        draftExists
          ? 'No changes to save. Your quotation draft is already up to date.'
          : 'Enter your quotation details before saving a draft.',
      );
      return;
    }

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setOperationError('Please correct the highlighted quotation fields.');
      setSuccessMessage('');
      return;
    }

    saveMutation.mutate(createPayload(form));
  }

  function handleLeaveEditor() {
    if (saveMutation.isPending || sendMutation.isPending) {
      return;
    }

    if (isDirty) {
      setShowDiscardConfirmation(true);
      return;
    }

    navigate(`/vendor/quotation-requests/${quotationRequestId}`);
  }

  function handleDiscardAndLeave() {
    if (saveMutation.isPending || sendMutation.isPending) {
      return;
    }

    setShowDiscardConfirmation(false);
    setErrors({});
    setSuccessMessage('');
    setOperationError('');

    navigate(`/vendor/quotation-requests/${quotationRequestId}`);
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
      <main className="workspace-shell grid min-h-screen place-items-center px-4 py-8">
        <div className="w-full max-w-3xl rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
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
    <main className="workspace-shell relative">
      <div className="workspace-container w-full max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={handleLeaveEditor}
              disabled={saveMutation.isPending || sendMutation.isPending}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/60 bg-white/36 px-4 py-2.5 text-sm font-black text-[var(--color-charcoal)] transition hover:-translate-y-0.5 hover:bg-white/58 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <span aria-hidden="true">←</span>
              Quotation request
            </button>

            <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <h1 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                Quotation editor
              </h1>
            </div>
          </div>
        </header>

        <div className="pb-10 pt-6">
          {loading ? (
            <div className="grid min-h-[420px] place-items-center rounded-[2rem] border border-white/60 bg-white/44 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl">
              <div className="text-center">
                <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--color-deep-plum)]" />

                <p className="mt-4 text-lg font-black text-[var(--color-near-black)]">
                  Preparing quotation editor
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/48">
                  Restoring your request and saved draft.
                </p>
              </div>
            </div>
          ) : requestUnavailable ? (
            <section className="grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center">
              <div className="max-w-lg">
                <AlertCircle className="mx-auto size-9 text-red-500" />

                <h1 className="mt-4 text-2xl font-black text-red-900">
                  Quotation request could not be loaded
                </h1>

                <p className="mt-3 text-sm leading-7 text-red-700">
                  {getErrorMessage(requestQuery.error)}
                </p>
              </div>
            </section>
          ) : draftLoadFailed ? (
            <section className="grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center">
              <div className="max-w-lg">
                <AlertCircle className="mx-auto size-9 text-red-500" />

                <h1 className="mt-4 text-2xl font-black text-red-900">
                  Quotation draft could not be loaded
                </h1>

                <p className="mt-3 text-sm leading-7 text-red-700">
                  {getErrorMessage(draftQuery.error)}
                </p>

                <button
                  type="button"
                  onClick={() => draftQuery.refetch()}
                  className="mt-5 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white"
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_24px_70px_rgba(64,42,51,0.10)] backdrop-blur-2xl">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[rgba(183,167,200,0.23)] blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-36 left-[28%] size-72 rounded-full bg-[rgba(142,92,103,0.10)] blur-3xl"
                />

                <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:p-10">
                  <div>
                    <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                      <FileCheck2 className="size-4" />
                      {draftExists ? 'Saved quotation draft' : 'New quotation'}
                    </div>

                    <h2 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                      Build a clear offer your customer can confidently review.
                    </h2>

                    <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                      Prepare pricing, service inclusions, exclusions, terms and validity for{' '}
                      <strong className="font-black text-[var(--color-near-black)]">
                        {request.event.name}
                      </strong>
                      .
                    </p>

                    <div className="mt-7 flex flex-wrap gap-2.5">
                      <span className="soft-chip text-xs font-black">
                        <FileText className="size-4" />
                        {request.status.replaceAll('_', ' ')}
                      </span>

                      <span className="soft-chip text-xs font-black">
                        <CircleDollarSign className="size-4" />
                        Structured pricing
                      </span>

                      <span className="soft-chip text-xs font-black">
                        <ShieldCheck className="size-4" />
                        Customer-ready terms
                      </span>
                    </div>
                  </div>

                  <article className="relative overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/52 p-5 shadow-[0_18px_52px_rgba(31,27,29,0.08)] backdrop-blur-2xl sm:p-6">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Quotation status
                        </p>

                        <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          {draftExists ? 'Draft in progress' : 'Ready to prepare'}
                        </h3>
                      </div>

                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                        <FileCheck2 className="size-5" />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                          Request
                        </p>

                        <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                          {request.event.name}
                        </p>
                      </div>

                      <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                        <div className="flex items-start gap-3">
                          <CalendarClock className="mt-0.5 size-4 shrink-0 text-[var(--color-deep-plum)]" />

                          <div>
                            <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                              Response deadline
                            </p>

                            <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                              {request.responseDueAt
                                ? new Intl.DateTimeFormat('en-US', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  }).format(new Date(request.responseDueAt))
                                : 'No deadline'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              {editingDisabled ? (
                <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-amber-200/80 bg-amber-50/70 p-5">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" />

                  <div>
                    <p className="font-black text-amber-900">Quotation editing is unavailable</p>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      This request has already been quoted, closed, accepted, declined, or its
                      response deadline has passed.
                    </p>
                  </div>
                </div>
              ) : null}

              {successMessage ? (
                <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-5">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />

                  <p className="text-sm font-bold text-emerald-800">{successMessage}</p>
                </div>
              ) : null}

              {operationError ? (
                <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-red-200 bg-red-50/70 p-5">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-700" />

                  <p className="text-sm font-bold text-red-800">{operationError}</p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.36fr_0.64fr]">
                <section className="space-y-6">
                  <div className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <CircleDollarSign className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Financial details
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Pricing and deposit
                        </h2>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          Define the total quotation value and any upfront payment required.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]">
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
                          className={[
                            'form-field mt-2 bg-white/40',
                            errors.proposedPrice ? 'border-red-300 focus:ring-red-100' : '',
                          ].join(' ')}
                        />

                        {errors.proposedPrice ? (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            {errors.proposedPrice}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]">
                          Deposit amount
                          <span className="ml-2 font-semibold text-[var(--color-charcoal)]/40">
                            Optional
                          </span>
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={editingDisabled}
                          value={form.depositAmount}
                          onChange={(event) => updateField('depositAmount', event.target.value)}
                          placeholder="50000"
                          className={[
                            'form-field mt-2 bg-white/40',
                            errors.depositAmount ? 'border-red-300 focus:ring-red-100' : '',
                          ].join(' ')}
                        />

                        {errors.depositAmount ? (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            {errors.depositAmount}
                          </p>
                        ) : null}
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <FileText className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Service scope
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Inclusions & exclusions
                        </h2>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          Clearly state what the quoted price covers and what remains outside the
                          offer.
                        </p>
                      </div>
                    </div>

                    <label className="mt-6 block border-t border-[rgba(93,58,85,0.08)] pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-charcoal)]">
                          Inclusions
                        </span>

                        <CharacterCount current={form.inclusions.length} maximum={5000} />
                      </div>

                      <textarea
                        rows={7}
                        disabled={editingDisabled}
                        value={form.inclusions}
                        onChange={(event) => updateField('inclusions', event.target.value)}
                        placeholder="Describe everything included in this quotation..."
                        className={[
                          'form-field mt-2 min-h-44 resize-y bg-white/40 leading-7',
                          errors.inclusions ? 'border-red-300 focus:ring-red-100' : '',
                        ].join(' ')}
                      />

                      {errors.inclusions ? (
                        <p className="mt-2 text-xs font-bold text-red-600">{errors.inclusions}</p>
                      ) : null}
                    </label>

                    <label className="mt-5 block">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-charcoal)]">
                          Exclusions
                          <span className="ml-2 font-semibold text-[var(--color-charcoal)]/40">
                            Optional
                          </span>
                        </span>

                        <CharacterCount current={form.exclusions.length} maximum={5000} />
                      </div>

                      <textarea
                        rows={5}
                        disabled={editingDisabled}
                        value={form.exclusions}
                        onChange={(event) => updateField('exclusions', event.target.value)}
                        placeholder="List anything not included..."
                        className={[
                          'form-field mt-2 min-h-36 resize-y bg-white/40 leading-7',
                          errors.exclusions ? 'border-red-300 focus:ring-red-100' : '',
                        ].join(' ')}
                      />

                      {errors.exclusions ? (
                        <p className="mt-2 text-xs font-bold text-red-600">{errors.exclusions}</p>
                      ) : null}
                    </label>
                  </div>

                  <div className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <ShieldCheck className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Conditions
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Terms & validity
                        </h2>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          Define payment, cancellation, timing, and validity conditions.
                        </p>
                      </div>
                    </div>

                    <label className="mt-6 block border-t border-[rgba(93,58,85,0.08)] pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-charcoal)]">
                          Terms
                          <span className="ml-2 font-semibold text-[var(--color-charcoal)]/40">
                            Optional
                          </span>
                        </span>

                        <CharacterCount current={form.terms.length} maximum={5000} />
                      </div>

                      <textarea
                        rows={6}
                        disabled={editingDisabled}
                        value={form.terms}
                        onChange={(event) => updateField('terms', event.target.value)}
                        placeholder="Payment terms, cancellation rules, timings and other conditions..."
                        className={[
                          'form-field mt-2 min-h-40 resize-y bg-white/40 leading-7',
                          errors.terms ? 'border-red-300 focus:ring-red-100' : '',
                        ].join(' ')}
                      />

                      {errors.terms ? (
                        <p className="mt-2 text-xs font-bold text-red-600">{errors.terms}</p>
                      ) : null}
                    </label>

                    <label className="mt-5 block">
                      <span className="text-sm font-black text-[var(--color-charcoal)]">
                        Quotation expiry
                        <span className="ml-2 font-semibold text-[var(--color-charcoal)]/40">
                          Optional
                        </span>
                      </span>

                      <input
                        type="datetime-local"
                        disabled={editingDisabled}
                        value={form.expiresAt}
                        onChange={(event) => updateField('expiresAt', event.target.value)}
                        className={[
                          'form-field mt-2 bg-white/40',
                          errors.expiresAt ? 'border-red-300 focus:ring-red-100' : '',
                        ].join(' ')}
                      />

                      {errors.expiresAt ? (
                        <p className="mt-2 text-xs font-bold text-red-600">{errors.expiresAt}</p>
                      ) : null}
                    </label>
                  </div>
                </section>

                <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                  <section className="relative overflow-hidden rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <CircleDollarSign className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Quotation summary
                        </p>

                        <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          Financial breakdown
                        </h2>
                      </div>
                    </div>

                    <dl className="mt-5 space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-[1.15rem] border border-white/58 bg-white/30 px-4 py-3.5">
                        <dt className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                          Proposed price
                        </dt>

                        <dd className="text-sm font-black text-[var(--color-near-black)]">
                          {Number.isFinite(parsedPrice) && parsedPrice > 0
                            ? `LKR ${parsedPrice.toLocaleString('en-LK')}`
                            : '—'}
                        </dd>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-[1.15rem] border border-white/58 bg-white/30 px-4 py-3.5">
                        <dt className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                          Deposit
                        </dt>

                        <dd className="text-sm font-black text-[var(--color-near-black)]">
                          {parsedDeposit !== null && Number.isFinite(parsedDeposit)
                            ? `LKR ${parsedDeposit.toLocaleString('en-LK')}`
                            : 'Not required'}
                        </dd>
                      </div>

                      <div className="rounded-[1.25rem] bg-[var(--color-deep-plum)] p-4 shadow-[0_14px_34px_rgba(91,61,82,0.20)]">
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-sm font-bold text-white/72">Remaining balance</dt>

                          <dd className="text-lg font-black text-white">
                            {remainingBalance !== null && Number.isFinite(remainingBalance)
                              ? `LKR ${remainingBalance.toLocaleString('en-LK')}`
                              : '—'}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </section>

                  <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(220,186,167,0.20)] text-[var(--color-rosewood)]">
                        <CalendarClock className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Final review
                        </p>

                        <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          Before sending
                        </h2>
                      </div>
                    </div>

                    <ul className="mt-5 space-y-2.5">
                      {[
                        'Confirm the proposed price and deposit.',
                        'Clearly state all service inclusions.',
                        'List important exclusions.',
                        'Review payment and cancellation terms.',
                        'Check the quotation expiry.',
                      ].map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 rounded-[1.15rem] border border-white/58 bg-white/30 px-4 py-3"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />

                          <span className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/62">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {!editingDisabled ? (
                    <section className="relative overflow-hidden rounded-[2rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(240,231,238,0.48))] p-5 shadow-[0_18px_48px_rgba(35,24,30,0.08)] backdrop-blur-xl sm:p-6">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Quotation actions
                      </p>

                      <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        Save or send
                      </h2>

                      <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                        Save progress safely or send the completed quotation to your customer.
                      </p>

                      {isDirty ? (
                        <div className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-amber-200/75 bg-amber-50/70 p-4">
                          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />

                          <div>
                            <p className="text-sm font-black text-amber-900">
                              Unsaved quotation changes
                            </p>

                            <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                              Save your draft or send the quotation before leaving if you want to
                              keep these changes.
                            </p>
                          </div>
                        </div>
                      ) : draftExists ? (
                        <div className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-emerald-200/75 bg-emerald-50/60 p-4">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />

                          <div>
                            <p className="text-sm font-black text-emerald-900">
                              Draft is up to date
                            </p>

                            <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">
                              Your current quotation values match the last saved draft.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-5">
                        <button
                          type="button"
                          disabled={saveMutation.isPending || sendMutation.isPending || !isDirty}
                          onClick={handleSave}
                          className="btn-secondary w-full justify-center text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {saveMutation.isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Save className="size-4" />
                          )}

                          {saveMutation.isPending
                            ? 'Saving draft...'
                            : draftExists
                              ? isDirty
                                ? 'Update draft'
                                : 'Draft up to date'
                              : 'Save draft'}
                        </button>

                        <button
                          type="button"
                          disabled={saveMutation.isPending || sendMutation.isPending}
                          onClick={handleOpenSendConfirmation}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 py-3.5 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sendMutation.isPending ? (
                            <LoaderCircle className="size-4 animate-spin text-white" />
                          ) : (
                            <Send className="size-4 text-white" />
                          )}

                          <span className="text-white">Send quotation</span>
                        </button>
                      </div>
                    </section>
                  ) : null}
                </aside>
              </div>
            </>
          )}
        </div>

        {showDiscardConfirmation ? (
          <div
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.58)] px-4 py-8 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-quotation-title"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !saveMutation.isPending &&
                !sendMutation.isPending
              ) {
                setShowDiscardConfirmation(false);
              }
            }}
          >
            <div
              className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.98)] p-6 shadow-[0_34px_100px_rgba(27,17,23,0.38)] backdrop-blur-2xl sm:p-7"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-amber-100/55 blur-3xl"
              />

              <div className="relative flex items-start justify-between gap-5">
                <div className="grid size-12 shrink-0 place-items-center rounded-[1.1rem] bg-amber-50 text-amber-700">
                  <AlertCircle className="size-5" />
                </div>

                <button
                  type="button"
                  aria-label="Close discard confirmation"
                  onClick={() => setShowDiscardConfirmation(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 transition hover:bg-white/72 hover:text-[var(--color-deep-plum)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-amber-700">
                Unsaved quotation
              </p>

              <h2
                id="discard-quotation-title"
                className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
              >
                Leave without saving?
              </h2>

              <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
                You changed this quotation after the last save. Leaving now will discard those
                unsaved values.
              </p>

              <div className="relative mt-5 flex items-start gap-3 rounded-[1.2rem] border border-amber-200/75 bg-amber-50/65 p-4">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />

                <p className="text-xs font-semibold leading-5 text-amber-800">
                  {draftExists
                    ? 'Your previously saved draft will remain unchanged.'
                    : 'No quotation draft has been saved yet.'}
                </p>
              </div>

              <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirmation(false)}
                  className="btn-secondary justify-center text-sm font-black"
                >
                  Keep editing
                </button>

                <button
                  type="button"
                  onClick={handleDiscardAndLeave}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  <X className="size-4 text-white" />
                  <span className="text-white">Discard and leave</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showSendConfirmation ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !sendMutation.isPending) {
                setShowSendConfirmation(false);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="send-quotation-title"
              className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/75 bg-white/90 p-6 shadow-[0_32px_90px_rgba(35,25,30,0.28)] backdrop-blur-2xl sm:p-7"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl"
              />

              <div className="relative grid size-12 place-items-center rounded-[1.1rem] bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                <Send className="size-5" />
              </div>

              <h2
                id="send-quotation-title"
                className="relative mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
              >
                Send this quotation?
              </h2>

              <p className="relative mt-3 text-sm leading-7 text-[var(--color-charcoal)]/62">
                The latest values will be saved and then sent to the customer. Once sent, this
                workflow does not currently support editing the quotation.
              </p>

              <div className="relative mt-5 flex items-start gap-3 rounded-[1.2rem] border border-amber-200/80 bg-amber-50/80 p-4">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />

                <p className="text-sm font-semibold leading-6 text-amber-900">
                  Check pricing, inclusions, exclusions, terms and expiry before confirming.
                </p>
              </div>

              <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={sendMutation.isPending}
                  onClick={() => setShowSendConfirmation(false)}
                  className="btn-secondary justify-center text-sm font-black"
                >
                  Keep editing
                </button>

                <button
                  type="button"
                  disabled={sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin text-white" />
                  ) : (
                    <Send className="size-4 text-white" />
                  )}

                  <span className="text-white">Confirm and send</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
