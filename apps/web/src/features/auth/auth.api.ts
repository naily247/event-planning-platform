import { api } from '../../lib/api';

export type AuthUserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export type AuthAccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DEACTIVATED';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: AuthUserRole;
  status: AuthAccountStatus;
};

export type CurrentUser = AuthUser & {
  customer: {
    id: string;
    phone: string | null;
  } | null;
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    verificationStatus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  } | null;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterCustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export type RegisterVendorInput = {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  password: string;
};

export type UpdateCurrentUserInput = {
  firstName?: string;
  lastName?: string;
  phone?: {
    country: string;
    number: string;
  } | null;
};

export type ChangeCurrentUserPasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type ChangeCurrentUserPasswordResponse = {
  message: string;
};

export async function login(input: LoginInput) {
  const response = await api.post<ApiSuccessResponse<AuthResponse>>('/auth/login', input);

  return response.data.data;
}

export async function registerCustomer(input: RegisterCustomerInput) {
  const response = await api.post<ApiSuccessResponse<AuthResponse>>(
    '/auth/register/customer',
    input,
  );

  return response.data.data;
}

export async function registerVendor(input: RegisterVendorInput) {
  const response = await api.post<ApiSuccessResponse<AuthResponse>>('/auth/register/vendor', input);

  return response.data.data;
}

export async function getCurrentUser() {
  const response = await api.get<ApiSuccessResponse<CurrentUser>>('/auth/me');

  return response.data.data;
}

export async function updateCurrentUser(input: UpdateCurrentUserInput) {
  const response = await api.patch<ApiSuccessResponse<CurrentUser>>('/auth/me', input);

  return response.data.data;
}

export async function changeCurrentUserPassword(input: ChangeCurrentUserPasswordInput) {
  const response = await api.patch<ApiSuccessResponse<ChangeCurrentUserPasswordResponse>>(
    '/auth/me/password',
    input,
  );

  return response.data.data;
}

export async function uploadCurrentUserProfileImage(file: File) {
  const formData = new FormData();

  formData.append('file', file);

  const response = await api.post<ApiSuccessResponse<CurrentUser>>(
    '/auth/me/profile-image',
    formData,
  );

  return response.data.data;
}

export async function removeCurrentUserProfileImage() {
  const response = await api.delete<ApiSuccessResponse<CurrentUser>>('/auth/me/profile-image');

  return response.data.data;
}
