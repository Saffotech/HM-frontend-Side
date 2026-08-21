import {
  getLabDashboard,
  getLabOrders,
  getLabOrderById,
  patchSampleCollected,
  patchProcessing,
  postLabReport,
  patchCompleteOrder,
  postLabReportFile,
  getLabReports,
  getLabReportById,
  fetchLabReportFileBlob,
} from '@/features/lab/api/lab';
import {
  apiToUiLabDashboard,
  apiToUiLabOrderDetail,
  apiToUiLabReportDetail,
  buildLabOrdersQueryParams,
  buildLabReportsQueryParams,
  mapLabOrderList,
  mapLabReportList,
  uiToApiLabReportBody,
  datetimeLocalToApi,
} from '@/shared/api/mappers/labMapper';

export async function fetchLabDashboardStats(token) {
  const raw = await getLabDashboard(token);
  return apiToUiLabDashboard(raw);
}

export async function fetchLabOrders(filters = {}, token) {
  const params = buildLabOrdersQueryParams(filters);
  const raw = await getLabOrders(params, token);
  return mapLabOrderList(raw);
}

export async function fetchLabOrderById(orderId, token) {
  const raw = await getLabOrderById(orderId, token);
  return apiToUiLabOrderDetail(raw);
}

export async function fetchLabReports(filters = {}, token) {
  const params = buildLabReportsQueryParams(filters);
  const raw = await getLabReports(params, token);
  return mapLabReportList(raw);
}

export async function fetchLabReportById(reportId, token) {
  const raw = await getLabReportById(reportId, token);
  return apiToUiLabReportDetail(raw);
}

export async function downloadLabReportFile(reportId, token) {
  return fetchLabReportFileBlob(reportId, token);
}

export async function uploadLabReportFile(orderId, file, token) {
  return postLabReportFile(orderId, file, token);
}

/**
 * Full backend workflow: sample → processing → report → complete.
 * Either a report file or at least one test parameter is required.
 */
export async function submitLabOrderWorkflow(orderId, { currentStatus, form, file }, token) {
  const hasParameters = (form?.parameters ?? []).some((p) => String(p?.parameter_name ?? '').trim());
  if (!file && !hasParameters) {
    const err = new Error('Upload a report file or enter at least one test parameter');
    err.status = 400;
    throw err;
  }

  const sampleAt = datetimeLocalToApi(form.sampleCollectedAt);
  const performedAt = datetimeLocalToApi(form.testPerformedAt);
  const reportBody = uiToApiLabReportBody(form, file);

  if (currentStatus === 'ordered') {
    await patchSampleCollected(orderId, { sample_collected_at: sampleAt }, token);
  }

  const statusAfterSample = currentStatus === 'ordered' ? 'sample_collected' : currentStatus;
  if (statusAfterSample === 'sample_collected') {
    await patchProcessing(orderId, { test_performed_at: performedAt }, token);
  }

  await postLabReport(orderId, reportBody, token);
  await patchCompleteOrder(orderId, token);

  if (file) {
    await postLabReportFile(orderId, file, token);
  }

  return { orderId, status: 'completed' };
}
