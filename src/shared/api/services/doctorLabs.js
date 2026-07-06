import {
  getLabTests,
  createLabTest,
  updateLabTest,
  cancelLabTest,
  getLabTestReport,
  fetchLabTestReportFileBlob,
} from '@/features/doctor/api/labs';
import {
  apiToUiLabTest,
  apiToUiDoctorLabReport,
  uiToApiLabTestCreate,
  uiToApiLabTestUpdate,
  mapLabTestList,
} from '@/shared/api/mappers/clinicalMapper';

export async function fetchLabTests(token, params = {}) {
  return mapLabTestList(await getLabTests(token, params));
}

export async function fetchLabTestReport(testId, token) {
  return apiToUiDoctorLabReport(await getLabTestReport(testId, token));
}

export async function downloadLabTestReportFile(testId, token) {
  return fetchLabTestReportFileBlob(testId, token);
}

export async function addLabTest(payload, token) {
  const body = uiToApiLabTestCreate(payload);
  return apiToUiLabTest(await createLabTest(body, token));
}

export async function patchLabTest(testId, payload, token) {
  const body = uiToApiLabTestUpdate(payload);
  return apiToUiLabTest(await updateLabTest(testId, body, token));
}

export async function cancelLabTestById(testId, token) {
  await cancelLabTest(testId, token);
  return { id: testId, status: 'Cancelled' };
}
