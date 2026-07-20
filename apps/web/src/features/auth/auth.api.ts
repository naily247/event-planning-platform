import { api } from '../../lib/api';

export type AuthUserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export type AuthAccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DEACTIVATED';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AuthUserRole;
  status: AuthAccountStatus;
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
  const response = await api.get<ApiSuccessResponse<AuthUser>>('/auth/me');

  return response.data.data;
}
