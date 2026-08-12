import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import LabLayout from '@/features/lab/components/LabLayout';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import {
  useLabOrderQuery,
  useSubmitLabWorkflowMutation,
} from '@/shared/hooks/queries/useLabQuery';
import { LAB_ORDER_STATUS, statusBadgeClass, statusLabel } from '@/features/lab/utils/labOrderStatus';
import { DateInput, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import {
  isLabDepartmentUnassignedError,
  LAB_DEPT_UNASSIGNED_MESSAGE,
} from '@/shared/utils/labDepartments';
import '../styles/lab.css';

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

function emptyParameterRow() {
  return { id: makeId(), parameter_name: '', value: '', unit: '', normal_range: '', flag: 'normal' };
}

/** Digits + optional decimal only (e.g. 13.5). */
function sanitizeParameterValue(raw) {
  const cleaned = String(raw ?? '').replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').replace(/\./g, '')}`;
}

/** Accepts formats like 12-16 or 12.5 - 16.0 */
function isValidNormalRange(raw) {
  return /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(String(raw ?? '').trim());
}

function isNamedParameter(param) {
  return Boolean(String(param?.parameter_name ?? '').trim());
}

export default function LabUploadReportPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const { canViewLab, canUpdateLab, canUploadReport } = useLabPermissionSet();
  const canRunWorkflow = canUpdateLab && canUploadReport;
  const orderQuery = useLabOrderQuery(orderId, {
    enabled: Number.isFinite(orderId) && canViewLab,
  });
  const submitWorkflow = useSubmitLabWorkflowMutation();

  const order = orderQuery.data;

  const [sampleCollectedAt, setSampleCollectedAt] = useState('');
  const [testPerformedAt, setTestPerformedAt] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [parameters, setParameters] = useState([emptyParameterRow()]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!order) return;
    setSampleCollectedAt(order.sampleCollectedAt ?? '');
    setTestPerformedAt(order.testPerformedAt ?? '');
    setRemarks(order.remarks ?? '');
    if (order.parameters?.length) {
      setParameters(order.parameters);
    } else {
      setParameters([emptyParameterRow()]);
    }
  }, [order]);

  const addRow = () => {
    setParameters((prev) => [...prev, emptyParameterRow()]);
  };

  const removeRow = (rowId) => {
    setParameters((prev) => prev.filter((p) => p.id !== rowId));
  };

  const updateParam = (rowId, field, val) => {
    const nextVal = field === 'value' ? sanitizeParameterValue(val) : val;
    setParameters((prev) => prev.map((p) => (p.id === rowId ? { ...p, [field]: nextVal } : p)));
    setErrors((prev) => {
      if (!prev?.parameters?.[rowId]?.[field] && !prev?.parametersGeneral) return prev;
      const next = { ...prev };
      if (next.parameters?.[rowId]) {
        const rowErrs = { ...next.parameters[rowId] };
        delete rowErrs[field];
        if (Object.keys(rowErrs).length === 0) {
          const { [rowId]: _removed, ...rest } = next.parameters;
          next.parameters = Object.keys(rest).length ? rest : undefined;
        } else {
          next.parameters = { ...next.parameters, [rowId]: rowErrs };
        }
      }
      if (next.parametersGeneral) delete next.parametersGeneral;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canRunWorkflow) {
      toast.error('You do not have permission to update lab results or upload reports');
      return;
    }

    if (order?.status === LAB_ORDER_STATUS.COMPLETED) {
      toast.error('This test is already completed');
      return;
    }
    if (order?.status === LAB_ORDER_STATUS.CANCELLED) {
      toast.error('Cannot upload report for a cancelled order');
      return;
    }

    const errs = {};
    if (!sampleCollectedAt) errs.sampleCollectedAt = 'Required';
    if (!testPerformedAt) errs.testPerformedAt = 'Required';
    if (!reportFile) errs.reportFile = 'Report file is required';

    const paramErrors = {};
    parameters.forEach((param) => {
      if (!isNamedParameter(param)) return;
      const rowErrs = {};
      const value = String(param.value ?? '').trim();
      const unit = String(param.unit ?? '').trim();
      const range = String(param.normal_range ?? '').trim();
      const flag = String(param.flag ?? '').trim();

      if (!value) rowErrs.value = 'Required';
      else if (!/^\d+(\.\d+)?$/.test(value)) rowErrs.value = 'Digits only';

      if (!unit) rowErrs.unit = 'Required';

      if (!range) rowErrs.normal_range = 'Required';
      else if (!isValidNormalRange(range)) rowErrs.normal_range = 'Use format like 12-16';

      if (!flag) rowErrs.flag = 'Required';

      if (Object.keys(rowErrs).length) paramErrors[param.id] = rowErrs;
    });

    if (Object.keys(paramErrors).length) {
      errs.parameters = paramErrors;
      errs.parametersGeneral =
        'When a parameter name is entered, value, unit, normal range, and flag are required';
    }

    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(
        errs.reportFile || errs.parametersGeneral || 'Please fix the highlighted fields',
      );
      return;
    }

    const filledParameters = parameters
      .filter(isNamedParameter)
      .map((param) => ({
        parameter_name: String(param.parameter_name).trim(),
        value: String(param.value).trim(),
        unit: String(param.unit).trim(),
        normal_range: String(param.normal_range).trim().replace(/\s*-\s*/, '-'),
        flag: param.flag,
      }));

    try {
      await submitWorkflow.mutateAsync({
        orderId,
        currentStatus: order.status,
        form: {
          sampleCollectedAt,
          testPerformedAt,
          remarks,
          parameters: filledParameters,
        },
        file: reportFile,
      });
      setSuccess(true);
      toast.success('Test completed and report saved');
      setTimeout(() => navigate(ROUTES.LAB_REPORTS), 1500);
    } catch {
      // mutationOnError handles toast
    }
  };

  if (!canViewLab) {
    return (
      <LabLayout pageTitle="Upload Report">
        <EmptyState
          icon={FlaskConical}
          title="Lab access denied"
          description="You do not have permission to view this lab order."
        />
      </LabLayout>
    );
  }

  if (!canRunWorkflow) {
    return (
      <LabLayout pageTitle="Upload Report">
        <EmptyState
          icon={FlaskConical}
          title="Results access denied"
          description="You do not have permission to update workflow or upload lab reports."
        />
        <div style={{ marginTop: '1rem' }}>
          <Link to={ROUTES.LAB_ORDERS} className="lab-btn lab-btn-secondary">
            ← Back to Orders
          </Link>
        </div>
      </LabLayout>
    );
  }

  if (!Number.isFinite(orderId)) {
    return (
      <LabLayout pageTitle="Upload Report">
        <div className="lab-empty">
          <div className="lab-empty-icon">⚠️</div>
          <h3>Invalid Order</h3>
          <Link to={ROUTES.LAB_ORDERS} className="lab-btn lab-btn-secondary" style={{ marginTop: 14 }}>
            ← Back to Orders
          </Link>
        </div>
      </LabLayout>
    );
  }

  if (orderQuery.isError || (!orderQuery.isLoading && !order)) {
    const unassigned = isLabDepartmentUnassignedError(orderQuery.error);
    const forbidden = orderQuery.error?.status === 403;
    return (
      <LabLayout pageTitle="Upload Report">
        <div className="lab-empty">
          <div className="lab-empty-icon">⚠️</div>
          <h3>
            {unassigned
              ? 'Department not assigned'
              : forbidden
                ? 'Access denied'
                : 'Order Not Found'}
          </h3>
          <p>
            {unassigned
              ? LAB_DEPT_UNASSIGNED_MESSAGE
              : forbidden
                ? 'This order is not in your lab department.'
                : (
                  <>
                    The requested order ID <strong>{id}</strong> does not exist.
                  </>
                )}
          </p>
          <Link to={ROUTES.LAB_ORDERS} className="lab-btn lab-btn-secondary" style={{ marginTop: 14 }}>
            ← Back to Orders
          </Link>
        </div>
      </LabLayout>
    );
  }

  const submitting = submitWorkflow.isPending;

  return (
    <LabLayout pageTitle="Upload Report" compact>
      <QueryFeedback
        isLoading={orderQuery.isLoading}
        isError={orderQuery.isError}
        error={orderQuery.error}
        onRetry={orderQuery.refetch}
      >
      {order && (
      <div className="lab-upload-page">
      <button
        type="button"
        className="lab-upload-back"
        onClick={() => navigate(ROUTES.LAB_ORDERS)}
      >
        <ArrowLeft size={16} aria-hidden />
        Back to Pending Tests
      </button>
      {success && (
        <div className="lab-alert success">
          <span>✅</span>
          <div>
            <strong>Saved successfully!</strong>
            <br />
            <small>Redirecting to completed reports...</small>
          </div>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="lab-alert error">
          <span>⚠️</span>
          <div>Please fix the highlighted fields before submitting.</div>
        </div>
      )}

      <div className="lab-info-panel">
        <h3>Patient &amp; Order Information</h3>
        <div className="lab-info-grid">
          <div className="lab-info-item">
            <label>Patient Name</label>
            <span>{order.patientName}</span>
          </div>
          <div className="lab-info-item">
            <label>Patient ID</label>
            <span>{order.patientId}</span>
          </div>
          <div className="lab-info-item">
            <label>Test Name</label>
            <span>{order.testName}</span>
          </div>
          <div className="lab-info-item">
            <label>Referring Doctor</label>
            <span>{order.doctorName}</span>
          </div>
          <div className="lab-info-item">
            <label>Category</label>
            <span>{order.category}</span>
          </div>
          <div className="lab-info-item">
            <label>Priority</label>
            <span>
              <span className={`lab-badge ${order.priority}`}>{order.priorityLabel ?? order.priority}</span>
            </span>
          </div>
          <div className="lab-info-item">
            <label>Status</label>
            <span>
              <span className={`lab-badge ${statusBadgeClass(order.status)}`}>{statusLabel(order.status)}</span>
            </span>
          </div>
          <div className="lab-info-item lab-info-item--notes">
            <label>Clinical notes</label>
            <span>{order.clinicalNotes?.trim() || '—'}</span>
          </div>
        </div>
      </div>

      <div className="lab-card">
        <div className="lab-card-header">
          <h2>Report Details</h2>
        </div>
        <div className="lab-card-body">
          <form onSubmit={handleSubmit} className="lab-form" noValidate>
            <div className="lab-form-row">
              <DateInput
                id="sample-collected-at"
                className="lab-field"
                label={(
                  <>
                    Sample Collected At
                    <span className="required"> *</span>
                  </>
                )}
                withTime
                value={sampleCollectedAt}
                onChange={(e) => {
                  setSampleCollectedAt(e.target.value);
                  setErrors((er) => {
                    const n = { ...er };
                    delete n.sampleCollectedAt;
                    return n;
                  });
                }}
                error={errors.sampleCollectedAt}
                disabled={order.status === LAB_ORDER_STATUS.COMPLETED}
              />
              <DateInput
                id="test-performed-at"
                className="lab-field"
                label={(
                  <>
                    Test Performed At
                    <span className="required"> *</span>
                  </>
                )}
                withTime
                value={testPerformedAt}
                onChange={(e) => {
                  setTestPerformedAt(e.target.value);
                  setErrors((er) => {
                    const n = { ...er };
                    delete n.testPerformedAt;
                    return n;
                  });
                }}
                error={errors.testPerformedAt}
                disabled={order.status === LAB_ORDER_STATUS.COMPLETED}
              />
            </div>

            <div className="lab-form-row">
              <div className="lab-field">
                <label htmlFor="report-file">
                  Report File
                  <span className="required"> *</span>
                  <small style={{ fontWeight: 400, color: '#8a9ab5', marginLeft: 6 }}>(PDF, PNG, JPG — required)</small>
                </label>
                <input
                  id="report-file"
                  type="file"
                  accept=".pdf,image/*"
                  required
                  aria-required="true"
                  onChange={(e) => {
                    setReportFile(e.target.files?.[0] ?? null);
                    setErrors((prev) => {
                      if (!prev.reportFile) return prev;
                      const next = { ...prev };
                      delete next.reportFile;
                      return next;
                    });
                  }}
                  disabled={order.status === LAB_ORDER_STATUS.COMPLETED}
                  aria-invalid={Boolean(errors.reportFile)}
                  className={errors.reportFile ? 'is-invalid' : undefined}
                />
                {errors.reportFile ? (
                  <small className="lab-param-field-error">{errors.reportFile}</small>
                ) : null}
                {reportFile ? (
                  <small style={{ color: '#059669', fontSize: '12px' }}>
                    ✓ {reportFile.name}
                  </small>
                ) : null}
              </div>
            </div>

            <div className="lab-field">
              <label htmlFor="remarks">Remarks / Notes</label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                disabled={order.status === LAB_ORDER_STATUS.COMPLETED}
              />
            </div>

            <hr className="lab-divider" />

            <div>
              <div className="lab-params-header">
                <h3>
                  Test Parameters
                  <small style={{ fontWeight: 400, color: '#8a9ab5', marginLeft: 8 }}>(optional)</small>
                </h3>
                <button type="button" className="lab-btn lab-btn-secondary lab-btn-sm" onClick={addRow}>
                  + Add Parameter
                </button>
              </div>
              {errors.parametersGeneral ? (
                <p className="lab-params-error">{errors.parametersGeneral}</p>
              ) : null}
              <div className="lab-params-table-wrap">
                <table className="lab-params-table">
                  <thead>
                    <tr>
                      <th>Parameter Name</th>
                      <th>Value</th>
                      <th>Unit</th>
                      <th>Normal Range</th>
                      <th>Flag</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {parameters.map((param) => {
                      const rowErrs = errors.parameters?.[param.id] ?? {};
                      return (
                        <tr key={param.id}>
                          <td>
                            <input
                              type="text"
                              value={param.parameter_name}
                              onChange={(e) => updateParam(param.id, 'parameter_name', e.target.value)}
                              placeholder="e.g. Hemoglobin"
                              aria-invalid={Boolean(rowErrs.parameter_name)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={param.value}
                              onChange={(e) => updateParam(param.id, 'value', e.target.value)}
                              placeholder="13.5"
                              aria-invalid={Boolean(rowErrs.value)}
                              className={rowErrs.value ? 'is-invalid' : undefined}
                            />
                            {rowErrs.value ? <small className="lab-param-field-error">{rowErrs.value}</small> : null}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={param.unit}
                              onChange={(e) => updateParam(param.id, 'unit', e.target.value)}
                              placeholder="g/dL"
                              aria-invalid={Boolean(rowErrs.unit)}
                              className={rowErrs.unit ? 'is-invalid' : undefined}
                            />
                            {rowErrs.unit ? <small className="lab-param-field-error">{rowErrs.unit}</small> : null}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={param.normal_range}
                              onChange={(e) => updateParam(param.id, 'normal_range', e.target.value)}
                              placeholder="12-16"
                              aria-invalid={Boolean(rowErrs.normal_range)}
                              className={rowErrs.normal_range ? 'is-invalid' : undefined}
                            />
                            {rowErrs.normal_range ? (
                              <small className="lab-param-field-error">{rowErrs.normal_range}</small>
                            ) : null}
                          </td>
                          <td>
                            <select
                              value={param.flag}
                              onChange={(e) => updateParam(param.id, 'flag', e.target.value)}
                              aria-invalid={Boolean(rowErrs.flag)}
                              className={rowErrs.flag ? 'is-invalid' : undefined}
                            >
                              <option value="normal">Normal</option>
                              <option value="low">Low</option>
                              <option value="high">High</option>
                            </select>
                            {rowErrs.flag ? <small className="lab-param-field-error">{rowErrs.flag}</small> : null}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="lab-btn lab-btn-danger lab-btn-sm"
                              onClick={() => removeRow(param.id)}
                              disabled={parameters.length === 1}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <hr className="lab-divider" />

            <div className="lab-form-actions">
              <button
                type="submit"
                className="lab-btn lab-btn-primary"
                disabled={submitting || success || order.status === LAB_ORDER_STATUS.COMPLETED}
              >
                {submitting ? 'Saving...' : 'Save & Complete Test'}
              </button>
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                onClick={() => navigate(ROUTES.LAB_ORDERS)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
      )}
      </QueryFeedback>
    </LabLayout>
  );
}
