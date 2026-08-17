import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from './auth.api';

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    staleTime: 30_000,
    enabled,
  });
}
