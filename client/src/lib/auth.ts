import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@memoryflow/shared';
import { apiGet, apiPost } from './api';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet<{ user: SessionUser | null }>('/auth/me'),
    staleTime: 30_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    await apiPost('/auth/logout');
    qc.clear();
    window.location.href = '/login';
  };
}
