import { api } from '../../lib/api';

export type AuthUserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthUserRole;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterCustomerInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type RegisterVendorInput = {
  ownerName: string;
  businessName: string;
  category: string;
  email: string;
  phone: string;
  password: string;
};

export async function login(input: LoginInput) {
  const response = await api.post<AuthResponse>('/auth/login', input);
  return response.data;
}

export async function registerCustomer(input: RegisterCustomerInput) {
  const response = await api.post<AuthResponse>('/auth/register/customer', input);
  return response.data;
}

export async function registerVendor(input: RegisterVendorInput) {
  const response = await api.post<AuthResponse>('/auth/register/vendor', input);
  return response.data;
}
