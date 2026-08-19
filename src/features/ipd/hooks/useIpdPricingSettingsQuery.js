/**
 * Read-only hospital pricing from existing OPD settings API.
 * IPD role may lack opd:view — returns null pricing without throwing.
 */

import { useQuery } from '@tanstack/react-query';
import { getOpdBillingSettings } from '@/features/opd/api/opdSettings';
import { opdSettingsApiToForm } from '@/features/admin/utils/opdSettingsMapper';
import { queryKeys } from '@/shared/api/queryKeys';

export function useIpdPricingSettingsQuery() {
  return useQuery({
    queryKey: [...queryKeys.ipd.all, 'pricing-settings'],
    queryFn: async () => {
      try {
        const data = await getOpdBillingSettings();
        const form = opdSettingsApiToForm({ ...data, _source: 'api' });
        return {
          pricing: form?.pricing ?? null,
          discountRefund: form?.discount_refund ?? null,
          updatedAt: data?.updated_at ?? null,
          source: 'api',
        };
      } catch {
        return {
          pricing: null,
          discountRefund: null,
          updatedAt: null,
          source: 'unavailable',
        };
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}
