/**
 * IPD React Query hooks — wire pages to live `/ipd/*` APIs.
 * Isolated to IPD; does not touch OPD/Doctor/Nurse query keys except shared patients.
 */

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { mutationOnError } from '@/shared/utils/mutationErrors';
import { syncAuthProfileAvatar } from '@/shared/utils/syncAuthProfileAvatar';
import {
  getIpdDashboardStats,
  getIpdPatients,
  getIpdPatientDetail,
  registerIpdPatient,
  getIpdDepartments,
  getIpdDoctorsByDepartment,
  createIpdAdmission,
  updateIpdAdmission,
  getIpdBeds,
  getIpdWardStats,
  transferIpdBed,
  getIpdRunningBills,
  getIpdBillPreview,
  generateIpdBill,
  getIpdBillInvoice,
  getIpdPaymentHistory,
  payIpdBill,
  completeIpdDischarge,
  getIpdProfile,
  updateIpdProfile,
  uploadIpdProfileImage,
  deleteIpdProfileImage,
} from '@/features/ipd/api';
import { IPD_PAGE_SIZE } from '@/features/ipd/utils/constants';
import { invalidateDoctorIpdAdmissions } from '@/features/doctor/utils/doctorDashboardCache';
import { bumpDoctorIpdCache } from '@/shared/utils/doctorIpdSync';

function invalidateIpdDomain(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.ipd.all });
}

function notifyDoctorIpdChange(queryClient) {
  invalidateDoctorIpdAdmissions(queryClient);
  bumpDoctorIpdCache();
}

async function fetchIpdProfile(token) {
  const profile = await getIpdProfile(token);
  const data = { profile };
  syncAuthProfileAvatar(data);
  return data;
}

export function useIpdDashboardQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.dashboard,
    queryFn: () => getIpdDashboardStats(token),
    retry: 1,
    staleTime: 30_000,
  });
}

export function useIpdPatientsQuery(filters = {}) {
  const token = useQueryToken();
  const params = {
    search: filters.search?.trim() || undefined,
    status: filters.status || undefined,
    ward: filters.ward || undefined,
    doctor_id: filters.doctorId || undefined,
    admission_date: filters.admissionDate || undefined,
    page: filters.page ?? 1,
    limit: filters.limit ?? IPD_PAGE_SIZE,
  };

  return useQuery({
    queryKey: queryKeys.ipd.patients(params),
    queryFn: () => getIpdPatients(params, token),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

export function useIpdAdmissionDetailQuery(admissionId) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.admission(admissionId),
    queryFn: () => getIpdPatientDetail(admissionId, token),
    enabled: Boolean(admissionId),
    retry: 1,
  });
}

export function useIpdBedsQuery(filters = {}) {
  const token = useQueryToken();
  const params = {
    ward: filters.ward || undefined,
    status: filters.status || undefined,
    search: filters.search?.trim() || undefined,
  };
  return useQuery({
    queryKey: queryKeys.ipd.beds(params),
    queryFn: () => getIpdBeds(params, token),
    staleTime: 15_000,
  });
}

export function useIpdWardStatsQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => getIpdWardStats(token),
    staleTime: 20_000,
  });
}

export function useIpdRunningBillsQuery(filters = {}) {
  const token = useQueryToken();
  const params = {
    page: filters.page ?? 1,
    limit: filters.limit ?? IPD_PAGE_SIZE,
  };
  return useQuery({
    queryKey: queryKeys.ipd.runningBills(params),
    queryFn: () => getIpdRunningBills(params, token),
    placeholderData: keepPreviousData,
  });
}

export function useIpdBillPreviewQuery(admissionId) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.billPreview(admissionId),
    queryFn: () => getIpdBillPreview(admissionId, token),
    enabled: Boolean(admissionId),
  });
}

export function useIpdBillInvoiceQuery(billId, options = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.billInvoice(billId),
    queryFn: () => getIpdBillInvoice(billId, token),
    enabled: options.enabled !== false && Boolean(billId),
  });
}

export function useIpdPaymentHistoryQuery(filters = {}) {
  const token = useQueryToken();
  const params = {
    search: filters.search?.trim() || undefined,
    payment_mode:
      filters.modeFilter && filters.modeFilter !== 'all'
        ? String(filters.modeFilter).toLowerCase()
        : undefined,
    page: filters.page ?? 1,
    limit: filters.limit ?? IPD_PAGE_SIZE,
  };
  return useQuery({
    queryKey: queryKeys.ipd.paymentHistory(params),
    queryFn: () => getIpdPaymentHistory(params, token),
    placeholderData: keepPreviousData,
  });
}

export function useIpdProfileQuery(options = {}) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.profile,
    queryFn: () => fetchIpdProfile(token),
    enabled: options.enabled !== false && Boolean(token),
    retry: 1,
  });
}

export function useIpdDepartmentsQuery() {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.departments,
    queryFn: () => getIpdDepartments(token),
    staleTime: 5 * 60_000,
  });
}

export function useIpdDoctorsByDepartmentQuery(departmentId) {
  const token = useQueryToken();
  return useQuery({
    queryKey: queryKeys.ipd.doctors(departmentId),
    queryFn: () => getIpdDoctorsByDepartment(departmentId, token),
    enabled: Boolean(departmentId),
    staleTime: 5 * 60_000,
  });
}

export function useRegisterIpdPatientMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => registerIpdPatient(payload, token),
    onSuccess: () => {
      // Shared Patient Master — invalidate hospital-wide patient search caches.
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
    onError: mutationOnError,
  });
}

export function useCreateIpdAdmissionMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createIpdAdmission(payload, token),
    onSuccess: () => {
      invalidateIpdDomain(queryClient);
      notifyDoctorIpdChange(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useUpdateIpdAdmissionMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, payload }) =>
      updateIpdAdmission(admissionId, payload, token),
    onSuccess: (_data, variables) => {
      invalidateIpdDomain(queryClient);
      notifyDoctorIpdChange(queryClient);
      if (variables?.admissionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.ipd.admission(variables.admissionId),
        });
      }
    },
    onError: mutationOnError,
  });
}

export function useTransferIpdBedMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transferIpdBed(payload, token),
    onSuccess: () => {
      invalidateIpdDomain(queryClient);
      notifyDoctorIpdChange(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useGenerateIpdBillMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => generateIpdBill(payload, token),
    onSuccess: (_data, variables) => {
      invalidateIpdDomain(queryClient);
      if (variables?.admission_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.ipd.billPreview(variables.admission_id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.ipd.admission(variables.admission_id),
        });
      }
    },
    onError: mutationOnError,
  });
}

export function usePayIpdBillMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, payload }) => payIpdBill(billId, payload, token),
    onSuccess: () => {
      invalidateIpdDomain(queryClient);
      notifyDoctorIpdChange(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useCompleteIpdDischargeMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ admissionId, payload }) =>
      completeIpdDischarge(admissionId, payload ?? {}, token),
    onSuccess: () => {
      invalidateIpdDomain(queryClient);
      notifyDoctorIpdChange(queryClient);
    },
    onError: mutationOnError,
  });
}

export function useUpdateIpdProfileMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      await updateIpdProfile(payload, token);
      return fetchIpdProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.ipd.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useUploadIpdProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      await uploadIpdProfileImage(file, token);
      return fetchIpdProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.ipd.profile, data);
    },
    onError: mutationOnError,
  });
}

export function useDeleteIpdProfileImageMutation() {
  const token = useQueryToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteIpdProfileImage(token);
      return fetchIpdProfile(token);
    },
    onSuccess: (data) => {
      syncAuthProfileAvatar(data);
      queryClient.setQueryData(queryKeys.ipd.profile, data);
    },
    onError: mutationOnError,
  });
}
