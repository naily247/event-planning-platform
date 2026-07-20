import { api } from '../../lib/api';

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export async function getServiceCategories() {
  const response = await api.get<ApiSuccessResponse<ServiceCategory[]>>('/categories');

  return response.data.data;
}
