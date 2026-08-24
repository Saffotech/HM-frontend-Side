/**
 * IPD insurance API boundary.
 *
 * TODO(backend): replace pendingContract() with apiClient calls once the
 * insurance contract is agreed. Do not invent URLs or response shapes here.
 */

export const IPD_INSURANCE_API_READY = false;

export const IPD_INSURANCE_API_PENDING = 'IPD_INSURANCE_API_PENDING';

function pendingContract(feature) {
  const error = new Error(
    `${feature} is waiting for the backend insurance API contract.`,
  );
  error.code = IPD_INSURANCE_API_PENDING;
  return error;
}

function assertInsuranceApi(feature) {
  if (!IPD_INSURANCE_API_READY) {
    throw pendingContract(feature);
  }
}

/** List cashless insurance patients for the IPD patients table. */
export async function getIpdInsurancePatients(params, token) {
  void params;
  void token;
  // TODO(backend): GET insurance patient list
  // Expected items: id, admissionId, claimId, patientName, uhid, ageGender,
  // coverage, insurer, policyNo, availableSi, policyStatus
  if (!IPD_INSURANCE_API_READY) {
    return { items: [], total: 0 };
  }
  assertInsuranceApi('Insurance patient list');
  return { items: [], total: 0 };
}

/** Insurance patient profile + current claim for /ipd/insurance/patients/:id */
export async function getIpdInsurancePatient(patientId, token) {
  void patientId;
  void token;
  // TODO(backend): GET insurance patient by id
  if (!IPD_INSURANCE_API_READY) return null;
  assertInsuranceApi('Insurance patient detail');
  return null;
}

/** Cashless insurance bills for the IPD bills table. */
export async function getIpdInsuranceBills(params, token) {
  void params;
  void token;
  // TODO(backend): GET insurance bills / claims list
  // Expected items: id, patientId, ipdId, patientName, uhid, ageGender,
  // admitted, doctor, wardRoom, coverage, netBill, approved, claimLabel
  if (!IPD_INSURANCE_API_READY) {
    return { items: [], total: 0 };
  }
  assertInsuranceApi('Insurance bills list');
  return { items: [], total: 0 };
}

/** Single insurance claim for claim-detail UI. */
export async function getIpdInsuranceClaim(claimId, token) {
  void claimId;
  void token;
  // TODO(backend): GET insurance claim by id
  if (!IPD_INSURANCE_API_READY) return null;
  assertInsuranceApi('Insurance claim detail');
  return null;
}

/** Copay / pay-and-claim insurance profile on an admission. */
export async function getIpdAdmissionInsurance(admissionId, token) {
  void admissionId;
  void token;
  // TODO(backend): GET admission insurance profile
  if (!IPD_INSURANCE_API_READY) return null;
  assertInsuranceApi('Admission insurance profile');
  return null;
}

export async function updateIpdInsuranceClaim(claimId, payload, token) {
  void payload;
  void token;
  assertInsuranceApi(`Update insurance claim ${claimId}`);
}

export async function updateIpdInsurancePatient(patientId, payload, token) {
  void payload;
  void token;
  assertInsuranceApi(`Update insurance patient ${patientId}`);
}

export async function updateIpdAdmissionInsurance(admissionId, payload, token) {
  void payload;
  void token;
  assertInsuranceApi(`Update admission insurance ${admissionId}`);
}

export async function addIpdInsurancePayment(claimId, payload, token) {
  void payload;
  void token;
  assertInsuranceApi(`Add insurance payment for claim ${claimId}`);
}

export async function addIpdInsurancePatientPayment(claimId, payload, token) {
  void payload;
  void token;
  assertInsuranceApi(`Add patient payment for claim ${claimId}`);
}
