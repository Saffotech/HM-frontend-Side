/**
 * IPD billing React Query hooks — insurance + self-pay data layer.
 * UI components should consume these instead of dummy/sessionStorage directly.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { useIpdAdmissionDetailQuery } from '@/features/ipd/hooks/useIpdQuery';
import {
  fetchIpdInsuranceBillingBundle,
  fetchIpdSelfPayBillingBundle,
  saveIpdInsuranceClaimAmounts,
  saveIpdInsuranceDailyCharges,
  saveIpdInsuranceFinalCharges,
  saveIpdSelfPayDailyCharges,
  saveIpdSelfPayFinalCharges,
} from '@/features/ipd/billing/ipdBillingRepository';
import {
  selectDailyBillingFromBundle,
  selectFinalBillingFromBundle,
  selectBillingTransactionsFromBundle,
} from '@/features/ipd/billing/ipdBillingMapper';

function invalidateIpdBillingQueries(queryClient, { admissionId, patientId, claimId }) {
  queryClient.invalidateQueries({ queryKey: ['ipd', 'billing'] });
  if (admissionId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.ipd.dailyBilling(admissionId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.ipd.finalBilling(admissionId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.ipd.billingAdmission(admissionId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.ipd.billPreview(admissionId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.ipd.admission(admissionId),
    });
  }
  if (patientId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.ipd.insuranceBillingBundle(patientId),
    });
  }
}

export function useIpdInsuranceBillingBundleQuery({
  patientId,
  insuranceAdmit,
  enabled = true,
} = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.insuranceBillingBundle(patientId),
    queryFn: () =>
      fetchIpdInsuranceBillingBundle({ patientId, insuranceAdmit }, token),
    enabled: enabled && Boolean(patientId),
    staleTime: 10_000,
  });
}

/** Combined billing bundle — insurance (dummy/API) or self-pay by admission. */
export function useIpdBillingQuery({
  patientId,
  insuranceAdmit,
  admissionId,
  mode = 'insurance',
  enabled = true,
} = {}) {
  const token = useQueryToken();
  const isInsurance = mode === 'insurance';

  return useQuery({
    queryKey: isInsurance
      ? queryKeys.ipd.insuranceBillingBundle(patientId)
      : queryKeys.ipd.billingAdmission(admissionId),
    queryFn: () =>
      isInsurance
        ? fetchIpdInsuranceBillingBundle({ patientId, insuranceAdmit }, token)
        : fetchIpdSelfPayBillingBundle({ admissionId, patientId }, token),
    enabled: enabled && (isInsurance ? Boolean(patientId) : Boolean(admissionId)),
    staleTime: 10_000,
  });
}

export function useIpdDailyBillingQuery(params = {}) {
  const query = useIpdBillingQuery(params);
  return {
    ...query,
    data: selectDailyBillingFromBundle(query.data),
    transactions: selectBillingTransactionsFromBundle(query.data),
    bundle: query.data,
  };
}

export function useIpdFinalBillingQuery(params = {}) {
  const query = useIpdBillingQuery(params);
  return {
    ...query,
    data: selectFinalBillingFromBundle(query.data),
    bundle: query.data,
  };
}

export function useSaveIpdFinalBillingMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, charges, patientId, insuranceAdmit }) =>
      saveIpdInsuranceFinalCharges(
        { claimId, charges, patientId, insuranceAdmit },
        token,
      ),
    onSuccess: (bundle, variables) => {
      if (bundle) {
        queryClient.setQueryData(
          queryKeys.ipd.insuranceBillingBundle(variables.patientId),
          bundle,
        );
      }
      invalidateIpdBillingQueries(queryClient, {
        admissionId: bundle?.admissionId,
        patientId: variables.patientId,
        claimId: variables.claimId,
      });
    },
    onError: mutationOnError,
  });
}

export function useSaveIpdDailyBillingMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, dailyCharges, patientId, insuranceAdmit }) =>
      saveIpdInsuranceDailyCharges(
        { claimId, dailyCharges, patientId, insuranceAdmit },
        token,
      ),
    onSuccess: (bundle, variables) => {
      if (bundle) {
        queryClient.setQueryData(
          queryKeys.ipd.insuranceBillingBundle(variables.patientId),
          bundle,
        );
      }
      invalidateIpdBillingQueries(queryClient, {
        admissionId: bundle?.admissionId,
        patientId: variables.patientId,
        claimId: variables.claimId,
      });
    },
    onError: mutationOnError,
  });
}

export function useSaveIpdInsuranceClaimMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, patch, patientId, insuranceAdmit }) =>
      saveIpdInsuranceClaimAmounts(
        { claimId, patch, patientId, insuranceAdmit },
        token,
      ),
    onSuccess: (bundle, variables) => {
      if (bundle) {
        queryClient.setQueryData(
          queryKeys.ipd.insuranceBillingBundle(variables.patientId),
          bundle,
        );
      }
      invalidateIpdBillingQueries(queryClient, {
        admissionId: bundle?.admissionId,
        patientId: variables.patientId,
        claimId: variables.claimId,
      });
    },
    onError: mutationOnError,
  });
}

export function useIpdSelfPayBillingBundleQuery({
  admissionId,
  patientId,
  preview,
  admittedAt,
  doctorVisits,
  enabled = true,
} = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.billingAdmission(admissionId),
    queryFn: () =>
      fetchIpdSelfPayBillingBundle(
        { admissionId, patientId, preview, admittedAt, doctorVisits },
        token,
      ),
    enabled: enabled && Boolean(admissionId),
    staleTime: 10_000,
  });
}

export function useSaveIpdSelfPayFinalBillingMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, charges, previewItems, admittedAt, doctorVisits }) =>
      saveIpdSelfPayFinalCharges(
        { admissionId, charges, previewItems, admittedAt, doctorVisits },
        token,
      ),
    onSuccess: (bundle, variables) => {
      if (bundle) {
        queryClient.setQueryData(
          queryKeys.ipd.billingAdmission(variables.admissionId),
          bundle,
        );
      }
      invalidateIpdBillingQueries(queryClient, {
        admissionId: variables.admissionId,
      });
    },
    onError: mutationOnError,
  });
}

export function useSaveIpdSelfPayDailyBillingMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, dailyCharges, previewItems, admittedAt, doctorVisits }) =>
      saveIpdSelfPayDailyCharges(
        { admissionId, dailyCharges, previewItems, admittedAt, doctorVisits },
        token,
      ),
    onSuccess: (bundle, variables) => {
      if (bundle) {
        queryClient.setQueryData(
          queryKeys.ipd.billingAdmission(variables.admissionId),
          bundle,
        );
      }
      invalidateIpdBillingQueries(queryClient, {
        admissionId: variables.admissionId,
      });
    },
    onError: mutationOnError,
  });
}

/**
 * Patient profile billing context — links admission → billing records.
 * Does not change patient profile UI; ready for future wiring.
 */
export function useIpdPatientBillingContext(admissionId) {
  const admissionQuery = useIpdAdmissionDetailQuery(admissionId);
  const billingQuery = useIpdBillingQuery({
    admissionId,
    mode: 'self_pay',
    enabled: Boolean(admissionId),
  });

  const admission = admissionQuery.data;
  const patientId =
    admission?.patient_id ??
    admission?.patient?.id ??
    billingQuery.data?.patientId ??
    null;

  return {
    admissionId: admissionId ? String(admissionId) : null,
    patientId: patientId != null ? String(patientId) : null,
    admission,
    runningBill: admission?.running_bill ?? null,
    transactions: billingQuery.data?.transactions ?? [],
    dailyCharges: billingQuery.data?.dailyCharges ?? [],
    finalBilling: billingQuery.data?.finalBilling ?? null,
    isLoading: admissionQuery.isLoading || billingQuery.isLoading,
    isError: admissionQuery.isError || billingQuery.isError,
    refetch: () => {
      admissionQuery.refetch();
      billingQuery.refetch();
    },
  };
}
