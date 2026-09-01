/**
 * IPD billing React Query hooks — insurance + self-pay data layer.
 * UI components should consume these instead of reading billing data from the page.
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
  addIpdInsurancePatientPayment,
  addIpdInsurancePayment,
  getIpdAdmissionInsurance,
  getIpdInsuranceBills,
  getIpdInsuranceClaim,
  getIpdInsurancePatient,
  getIpdInsurancePatients,
  updateIpdAdmissionInsurance,
  updateIpdInsuranceClaim,
  updateIpdInsurancePatient,
} from '@/features/ipd/api/insurance';
import {
  selectDailyBillingFromBundle,
  selectFinalBillingFromBundle,
  selectBillingTransactionsFromBundle,
} from '@/features/ipd/billing/ipdBillingMapper';

/** Narrow invalidation after insurance hospital/daily charge save — bundle already in cache. */
function invalidateInsuranceChargeSaveQueries(
  queryClient,
  { admissionId, claimId } = {},
) {
  queryClient.invalidateQueries({ queryKey: ['ipd', 'billing', 'running'] });
  if (admissionId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.ipd.billPreview(admissionId),
    });
  }
  if (claimId) {
    queryClient.invalidateQueries({
      queryKey: ['ipd', 'insurance', 'claim', claimId],
    });
  }
}

/** Narrow invalidation after self-pay hospital/daily charge save — bundle already in cache. */
function invalidateSelfPayChargeSaveQueries(queryClient, { admissionId } = {}) {
  queryClient.invalidateQueries({ queryKey: ['ipd', 'billing', 'running'] });
  if (admissionId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.ipd.billPreview(admissionId),
    });
  }
}

function invalidateIpdInsuranceBills(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['ipd', 'insurance', 'bills'] });
}

function invalidateIpdInsurancePatientLists(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['ipd', 'insurance', 'patients'] });
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

/** Combined billing bundle — insurance or self-pay by admission. */
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
    mutationFn: (variables) => {
      const existingBundle = queryClient.getQueryData(
        queryKeys.ipd.insuranceBillingBundle(variables.patientId),
      );
      return saveIpdInsuranceFinalCharges(
        { ...variables, existingBundle },
        token,
      );
    },
    onSuccess: (bundle, variables) => {
      if (bundle) {
        queryClient.setQueryData(
          queryKeys.ipd.insuranceBillingBundle(variables.patientId),
          bundle,
        );
      }
      invalidateInsuranceChargeSaveQueries(queryClient, {
        admissionId: bundle?.admissionId,
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
    mutationFn: (variables) => {
      const existingBundle = queryClient.getQueryData(
        queryKeys.ipd.insuranceBillingBundle(variables.patientId),
      );
      return saveIpdInsuranceDailyCharges(
        { ...variables, existingBundle },
        token,
      );
    },
    onSuccess: (bundle, variables) => {
      if (bundle) {
        queryClient.setQueryData(
          queryKeys.ipd.insuranceBillingBundle(variables.patientId),
          bundle,
        );
      }
      invalidateInsuranceChargeSaveQueries(queryClient, {
        admissionId: bundle?.admissionId,
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
    mutationFn: (variables) => {
      const existingBundle = queryClient.getQueryData(
        queryKeys.ipd.insuranceBillingBundle(variables.patientId),
      );
      return saveIpdInsuranceClaimAmounts(
        { ...variables, existingBundle },
        token,
      );
    },
    onSuccess: (bundle, variables) => {
      if (bundle) {
        queryClient.setQueryData(
          queryKeys.ipd.insuranceBillingBundle(variables.patientId),
          bundle,
        );
      }
      if (variables.claimId) {
        queryClient.invalidateQueries({
          queryKey: ['ipd', 'insurance', 'claim', variables.claimId],
        });
      }
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
      invalidateSelfPayChargeSaveQueries(queryClient, {
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
      invalidateSelfPayChargeSaveQueries(queryClient, {
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

const insuranceQueryKeys = {
  patients: (filters) => ['ipd', 'insurance', 'patients', filters],
  patient: (patientId) => ['ipd', 'insurance', 'patient', patientId],
  claim: (claimId) => ['ipd', 'insurance', 'claim', claimId],
  bills: (filters) => ['ipd', 'insurance', 'bills', filters],
  admission: (admissionId) => ['ipd', 'insurance', 'admission', admissionId],
};

export function useIpdInsurancePatientsQuery(filters = {}, options = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: insuranceQueryKeys.patients(filters),
    queryFn: () => getIpdInsurancePatients(filters, token),
    enabled: options.enabled !== false && Boolean(token),
    staleTime: 10_000,
  });
}

export function useIpdInsurancePatientQuery(patientId, options = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: insuranceQueryKeys.patient(patientId),
    queryFn: () => getIpdInsurancePatient(patientId, token),
    enabled: options.enabled !== false && Boolean(patientId) && Boolean(token),
    staleTime: 10_000,
  });
}

export function useIpdInsuranceBillsQuery(filters = {}, options = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: insuranceQueryKeys.bills(filters),
    queryFn: () => getIpdInsuranceBills(filters, token),
    enabled: options.enabled !== false && Boolean(token),
    staleTime: 10_000,
  });
}

export function useIpdInsuranceClaimQuery(claimId, options = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: insuranceQueryKeys.claim(claimId),
    queryFn: () => getIpdInsuranceClaim(claimId, token),
    enabled: options.enabled !== false && Boolean(claimId) && Boolean(token),
    staleTime: 10_000,
  });
}

export function useIpdAdmissionInsuranceQuery(admissionId, options = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: insuranceQueryKeys.admission(admissionId),
    queryFn: () => getIpdAdmissionInsurance(admissionId, token),
    enabled: options.enabled !== false && Boolean(admissionId) && Boolean(token),
    staleTime: 10_000,
  });
}

export function useUpdateIpdInsuranceClaimMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, payload }) =>
      updateIpdInsuranceClaim(claimId, payload, token),
    onSuccess: (_data, variables) => {
      if (variables.claimId) {
        queryClient.invalidateQueries({
          queryKey: insuranceQueryKeys.claim(variables.claimId),
        });
      }
      invalidateIpdInsuranceBills(queryClient);
      invalidateIpdInsurancePatientLists(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useUpdateIpdInsurancePatientMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, payload }) =>
      updateIpdInsurancePatient(patientId, payload, token),
    onSuccess: (_data, variables) => {
      if (variables.patientId) {
        queryClient.invalidateQueries({
          queryKey: insuranceQueryKeys.patient(variables.patientId),
        });
      }
      invalidateIpdInsurancePatientLists(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useUpdateIpdAdmissionInsuranceMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, payload }) =>
      updateIpdAdmissionInsurance(admissionId, payload, token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceQueryKeys.admission(variables.admissionId),
      });
    },
    onError: mutationOnError,
  });
}

export function useAddIpdInsurancePaymentMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, payload }) =>
      addIpdInsurancePayment(claimId, payload, token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceQueryKeys.claim(variables.claimId),
      });
    },
    onError: mutationOnError,
  });
}

export function useAddIpdInsurancePatientPaymentMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, payload }) =>
      addIpdInsurancePatientPayment(claimId, payload, token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceQueryKeys.claim(variables.claimId),
      });
    },
    onError: mutationOnError,
  });
}
