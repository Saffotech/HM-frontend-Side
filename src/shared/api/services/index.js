/**
 * Unified API layer — app code imports from here only.
 * OPD, Doctor, and Pharmacy use live backend HTTP.
 */

export * as patientsApi from './patients';
export * as appointmentsApi from './appointments';
export * as billsApi from './bills';
export * as bedsApi from './beds';
export * as opdReferenceApi from './opdReference';
export * as opdDashboardApi from './opdDashboard';
export * as doctorClinicalApi from './doctorClinical';
export * as doctorAppointmentsApi from './doctorAppointments';
export * as doctorQueueApi from './doctorQueue';
export * as doctorPatientsApi from './doctorPatients';
export * as doctorPrescriptionsApi from './doctorPrescriptions';
export * as doctorLabsApi from './doctorLabs';
export * as pharmacyApi from './pharmacy';
