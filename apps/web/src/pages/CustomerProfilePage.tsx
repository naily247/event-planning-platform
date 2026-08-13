import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CustomerWorkspaceHeader } from '../components/navigation/CustomerWorkspaceHeader';
import {
  removeCurrentUserProfileImage,
  updateCurrentUser,
  uploadCurrentUserProfileImage,
  type UpdateCurrentUserInput,
} from '../features/auth/auth.api';
import { useCurrentUser } from '../features/auth/useCurrentUser';

const ACCEPTED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function CustomerProfilePage() {
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('LK');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);

  const [imageValidationError, setImageValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhoneNumber(user.customer?.phone ?? '');
  }, [user]);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  const updateProfileMutation = useMutation({
    mutationFn: (input: UpdateCurrentUserInput) => updateCurrentUser(input),

    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['auth', 'me'], updatedUser);

      setFirstName(updatedUser.firstName);
      setLastName(updatedUser.lastName);
      setPhoneNumber(updatedUser.customer?.phone ?? '');

      setSuccessMessage('Your personal information has been updated successfully.');

      setIsEditing(false);
    },
  });

  const uploadProfileImageMutation = useMutation({
    mutationFn: (file: File) => uploadCurrentUserProfileImage(file),

    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['auth', 'me'], updatedUser);

      clearSelectedImage();

      setSuccessMessage('Your profile photo has been updated successfully.');
    },
  });

  const removeProfileImageMutation = useMutation({
    mutationFn: removeCurrentUserProfileImage,

    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['auth', 'me'], updatedUser);

      clearSelectedImage();

      setSuccessMessage('Your profile photo has been removed successfully.');
    },
  });

  if (currentUserQuery.isLoading) {
    return (
      <main className="page-shell min-h-screen">
        <div className="mx-auto max-w-7xl py-10">
          <div className="glass-card p-6 text-sm font-bold text-[var(--color-charcoal)]/60">
            Loading your profile...
          </div>
        </div>
      </main>
    );
  }

  if (currentUserQuery.isError || !user) {
    return (
      <main className="page-shell min-h-screen">
        <div className="mx-auto max-w-7xl py-10">
          <div className="glass-card p-6">
            <p className="font-black text-[var(--color-near-black)]">
              We couldn&apos;t load your profile.
            </p>

            <button
              type="button"
              className="btn-secondary mt-4 text-sm font-bold"
              onClick={() => {
                void currentUserQuery.refetch();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const displayedProfileImage = selectedImagePreviewUrl ?? user.profileImageUrl;

  const hasFormChanges =
    firstName.trim() !== user.firstName ||
    lastName.trim() !== user.lastName ||
    phoneNumber.trim() !== (user.customer?.phone ?? '');

  const isProfileImageBusy =
    uploadProfileImageMutation.isPending || removeProfileImageMutation.isPending;

  function clearSelectedImage() {
    setSelectedImageFile(null);
    setImageValidationError(null);

    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setSelectedImagePreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const resetForm = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhoneNumber(user.customer?.phone ?? '');
    setPhoneCountry('LK');
    setSuccessMessage(null);
  };

  const handleCancelEditing = () => {
    resetForm();
    setIsEditing(false);
  };

  const handleSaveProfile = () => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedPhone = phoneNumber.trim();

    if (!normalizedFirstName || !normalizedLastName) {
      return;
    }

    setSuccessMessage(null);

    updateProfileMutation.mutate({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      phone: normalizedPhone
        ? {
            country: phoneCountry.trim().toUpperCase(),
            number: normalizedPhone,
          }
        : null,
    });
  };

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setImageValidationError(null);
    setSuccessMessage(null);

    if (!file) {
      return;
    }

    if (!ACCEPTED_PROFILE_IMAGE_TYPES.includes(file.type)) {
      setImageValidationError('Choose a JPG, PNG, or WebP image.');

      event.target.value = '';
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setImageValidationError('Profile photos must be 5 MB or smaller.');

      event.target.value = '';
      return;
    }

    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedImageFile(file);
    setSelectedImagePreviewUrl(previewUrl);
  };

  const handleUploadSelectedImage = () => {
    if (!selectedImageFile) {
      return;
    }

    setSuccessMessage(null);
    setImageValidationError(null);

    uploadProfileImageMutation.mutate(selectedImageFile);
  };

  const handleRemoveProfileImage = () => {
    setSuccessMessage(null);
    setImageValidationError(null);

    removeProfileImageMutation.mutate();
  };

  return (
    <main className="page-shell min-h-screen">
      <div className="mx-auto max-w-7xl py-8">
        <CustomerWorkspaceHeader user={user} unreadNotificationCount={0} />

        <div className="mt-5">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)] transition hover:-translate-x-0.5"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </div>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/60 bg-white/35 shadow-[0_26px_80px_rgba(31,27,29,0.10)] backdrop-blur-xl">
          <div className="relative overflow-hidden border-b border-white/50 px-6 py-10 sm:px-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(183,167,200,0.24),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(124,74,90,0.14),transparent_38%)]" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="size-28 rounded-full object-cover shadow-[0_20px_50px_rgba(93,58,85,0.22)]"
                />
              ) : (
                <div className="grid size-28 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-3xl font-black text-white shadow-[0_20px_50px_rgba(93,58,85,0.24)]">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Customer profile
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl">
                  {user.firstName} {user.lastName}
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  Manage the personal information connected to your Eventure account.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[1.5rem] border border-white/60 bg-white/45 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Personal information
                  </p>

                  <h2 className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                    Your details
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/52">
                    Keep your contact and personal information up to date.
                  </p>
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(93,58,85,0.14)] bg-white/55 px-4 py-2.5 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.06)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/80"
                    onClick={() => {
                      setSuccessMessage(null);
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="size-4" />
                    Edit profile
                  </button>
                ) : (
                  <span className="grid size-11 place-items-center rounded-2xl bg-[rgba(93,58,85,0.09)] text-[var(--color-deep-plum)]">
                    <UserRound className="size-5" />
                  </span>
                )}
              </div>

              {!isEditing ? (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <ProfileDetail label="First name" value={user.firstName} />

                    <ProfileDetail label="Last name" value={user.lastName} />

                    <ProfileDetail
                      label="Email"
                      value={user.email}
                      icon={<Mail className="size-4" />}
                    />

                    <ProfileDetail
                      label="Phone"
                      value={user.customer?.phone ?? 'Not added yet'}
                      icon={<Phone className="size-4" />}
                    />
                  </div>

                  {successMessage ? <SuccessNotice message={successMessage} /> : null}
                </>
              ) : (
                <div className="mt-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <ProfileField
                      label="First name"
                      value={firstName}
                      onChange={setFirstName}
                      placeholder="Enter your first name"
                      autoComplete="given-name"
                    />

                    <ProfileField
                      label="Last name"
                      value={lastName}
                      onChange={setLastName}
                      placeholder="Enter your last name"
                      autoComplete="family-name"
                    />

                    <div className="sm:col-span-2">
                      <label className="block">
                        <span className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                          <Mail className="size-4" />
                          Email
                        </span>

                        <div className="mt-2 rounded-2xl border border-white/60 bg-white/35 px-4 py-3.5">
                          <p className="break-words text-sm font-black text-[var(--color-near-black)]">
                            {user.email}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/44">
                            Email changes are managed separately for account security.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block">
                        <span className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                          <Phone className="size-4" />
                          Phone
                        </span>

                        <div className="mt-2 grid gap-3 sm:grid-cols-[7rem_1fr]">
                          <div>
                            <span className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--color-charcoal)]/45">
                              Country
                            </span>

                            <input
                              type="text"
                              value={phoneCountry}
                              maxLength={2}
                              autoComplete="country"
                              placeholder="LK"
                              className="w-full rounded-2xl border border-white/65 bg-white/55 px-4 py-3.5 text-sm font-black uppercase text-[var(--color-near-black)] outline-none transition focus:border-[rgba(93,58,85,0.28)] focus:bg-white/80 focus:shadow-[0_0_0_4px_rgba(93,58,85,0.07)]"
                              onChange={(event) => {
                                setPhoneCountry(
                                  event.target.value
                                    .replace(/[^A-Za-z]/g, '')
                                    .slice(0, 2)
                                    .toUpperCase(),
                                );
                              }}
                            />
                          </div>

                          <div>
                            <span className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--color-charcoal)]/45">
                              Number
                            </span>

                            <input
                              type="tel"
                              value={phoneNumber}
                              autoComplete="tel"
                              placeholder="+94 77 123 4567"
                              className="w-full rounded-2xl border border-white/65 bg-white/55 px-4 py-3.5 text-sm font-black text-[var(--color-near-black)] outline-none transition placeholder:text-[var(--color-charcoal)]/30 focus:border-[rgba(93,58,85,0.28)] focus:bg-white/80 focus:shadow-[0_0_0_4px_rgba(93,58,85,0.07)]"
                              onChange={(event) => {
                                setPhoneNumber(event.target.value);
                              }}
                            />
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {updateProfileMutation.isError ? (
                    <ErrorNotice
                      title="We couldn't save your changes."
                      message="Check your name and phone number, then try again."
                    />
                  ) : null}

                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[rgba(93,58,85,0.09)] pt-5">
                    <button
                      type="button"
                      className="btn-primary text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        updateProfileMutation.isPending ||
                        !firstName.trim() ||
                        !lastName.trim() ||
                        !hasFormChanges
                      }
                      onClick={handleSaveProfile}
                    >
                      <Check className="size-4" />

                      {updateProfileMutation.isPending ? 'Saving...' : 'Save changes'}
                    </button>

                    <button
                      type="button"
                      className="btn-secondary text-sm font-black"
                      disabled={updateProfileMutation.isPending}
                      onClick={handleCancelEditing}
                    >
                      Cancel
                    </button>

                    {hasFormChanges ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-2 py-2 text-sm font-black text-[var(--color-charcoal)]/55 transition hover:text-[var(--color-deep-plum)]"
                        disabled={updateProfileMutation.isPending}
                        onClick={resetForm}
                      >
                        <RotateCcw className="size-4" />
                        Reset
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <section className="rounded-[1.5rem] border border-white/60 bg-white/45 p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[rgba(93,58,85,0.09)] text-[var(--color-deep-plum)]">
                    <ShieldCheck className="size-5" />
                  </span>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                      Account
                    </p>

                    <p className="mt-1 font-black text-[var(--color-near-black)]">
                      {user.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/60 bg-[linear-gradient(135deg,rgba(93,58,85,0.08),rgba(183,167,200,0.13))] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Profile photo
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      Add a photo to make your Eventure account more personal.
                    </p>
                  </div>

                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/45 text-[var(--color-deep-plum)]">
                    <Camera className="size-5" />
                  </span>
                </div>

                <div className="mt-5 flex flex-col items-center rounded-[1.5rem] border border-white/55 bg-white/30 p-5 text-center">
                  {displayedProfileImage ? (
                    <img
                      src={displayedProfileImage}
                      alt="Profile preview"
                      className="size-28 rounded-full object-cover shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                    />
                  ) : (
                    <div className="grid size-28 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-3xl font-black text-white shadow-[0_18px_38px_rgba(93,58,85,0.22)]">
                      {initials}
                    </div>
                  )}

                  {selectedImageFile ? (
                    <div className="mt-4 max-w-full">
                      <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                        {selectedImageFile.name}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                        {(selectedImageFile.size / 1024 / 1024).toFixed(2)} MB · Ready to upload
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      JPG, PNG or WebP · maximum 5 MB
                    </p>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageSelection}
                />

                {imageValidationError ? (
                  <ErrorNotice title="That photo can't be used." message={imageValidationError} />
                ) : null}

                {uploadProfileImageMutation.isError ? (
                  <ErrorNotice
                    title="The photo couldn't be uploaded."
                    message="Please try again with a valid JPG, PNG, or WebP image."
                  />
                ) : null}

                {removeProfileImageMutation.isError ? (
                  <ErrorNotice
                    title="The photo couldn't be removed."
                    message="Please try again in a moment."
                  />
                ) : null}

                <div className="mt-5 space-y-3">
                  {selectedImageFile ? (
                    <>
                      <button
                        type="button"
                        className="btn-primary w-full justify-center text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isProfileImageBusy}
                        onClick={handleUploadSelectedImage}
                      >
                        <Upload className="size-4" />

                        {uploadProfileImageMutation.isPending
                          ? 'Uploading...'
                          : user.profileImageUrl
                            ? 'Save new photo'
                            : 'Upload photo'}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary w-full justify-center text-sm font-black"
                        disabled={isProfileImageBusy}
                        onClick={clearSelectedImage}
                      >
                        <X className="size-4" />
                        Cancel selection
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary w-full justify-center text-sm font-black"
                      disabled={isProfileImageBusy}
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                    >
                      <ImagePlus className="size-4" />

                      {user.profileImageUrl ? 'Choose replacement' : 'Choose photo'}
                    </button>
                  )}

                  {user.profileImageUrl && !selectedImageFile ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.06)] px-4 py-3 text-sm font-black text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.11)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isProfileImageBusy}
                      onClick={handleRemoveProfileImage}
                    >
                      <Trash2 className="size-4" />

                      {removeProfileImageMutation.isPending ? 'Removing...' : 'Remove photo'}
                    </button>
                  ) : null}
                </div>

                <p className="mt-4 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/44">
                  Your profile photo appears in your customer workspace header and account menu.
                </p>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileDetail({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/55 bg-white/40 p-4">
      <div className="flex items-center gap-2 text-[var(--color-deep-plum)]">
        {icon}

        <p className="text-[0.68rem] font-black uppercase tracking-[0.16em]">{label}</p>
      </div>

      <p className="mt-2 break-words text-sm font-black text-[var(--color-near-black)]">{value}</p>
    </div>
  );
}

function ProfileField({
  label,
  value,
  placeholder,
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
        {label}
      </span>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={60}
        className="mt-2 w-full rounded-2xl border border-white/65 bg-white/55 px-4 py-3.5 text-sm font-black text-[var(--color-near-black)] outline-none transition placeholder:text-[var(--color-charcoal)]/30 focus:border-[rgba(93,58,85,0.28)] focus:bg-white/80 focus:shadow-[0_0_0_4px_rgba(93,58,85,0.07)]"
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </label>
  );
}

function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[rgba(93,58,85,0.12)] bg-[rgba(93,58,85,0.06)] p-4">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-deep-plum)] text-white">
        <Check className="size-4" />
      </span>

      <div>
        <p className="text-sm font-black text-[var(--color-near-black)]">Updated successfully</p>

        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
          {message}
        </p>
      </div>
    </div>
  );
}

function ErrorNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.07)] p-4">
      <p className="text-sm font-black text-[var(--color-muted-burgundy)]">{title}</p>

      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/55">
        {message}
      </p>
    </div>
  );
}
