import { useAuthStore } from '@/shared/store/useAuthStore';

/** Auth token for TanStack Query fetch functions */
export function useQueryToken() {
  return useAuthStore((s) => s.token);
}
