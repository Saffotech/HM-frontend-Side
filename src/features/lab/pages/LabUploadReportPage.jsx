import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LabLayout from '@/features/lab/components/LabLayout';
import {
  useLabOrderQuery,
  useSubmitLabWorkflowMutation,
} from '@/shared/hooks/queries/useLabQuery';
import { LAB_ORDER_STATUS, statusBadgeClass, statusLabel } from '@/features/lab/utils/labOrderStatus';
import { DateInput, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import '../styles/lab.css';

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

function emptyParameterRow() {
  return { id: makeId(), parameter_name: '', value: '', unit: '', normal_range: '', flag: 'normal' };
}

export default function LabUploadReportPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const orderQuery = useLabOrderQuery(orderId, { enabled: Number.isFinite(orderId) });
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
    setParameters((prev) => prev.map((p) => (p.id === rowId ? { ...p, [field]: val } : p)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await submitWorkflow.mutateAsync({
        orderId,
        currentStatus: order.status,
        form: {
          sampleCollectedAt,
          testPerformedAt,
          remarks,
          parameters: parameters.map(({ id: rowId, ...rest }) => rest),
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
    return (
      <LabLayout pageTitle="Upload Report">
        <div className="lab-empty">
          <div className="lab-empty-icon">⚠️</div>
          <h3>Order Not Found</h3>
          <p>
            The requested order ID <strong>{id}</strong> does not exist.
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
                  <small style={{ fontWeight: 400, color: '#8a9ab5', marginLeft: 6 }}>(PDF, PNG, JPG — uploaded after complete)</small>
                </label>
                <input
                  id="report-file"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
                  disabled={order.status === LAB_ORDER_STATUS.COMPLETED}
                />
                {(reportFile || order.reportFileName) && (
                  <small style={{ color: '#059669', fontSize: '12px' }}>
                    ✓ {reportFile?.name ?? order.reportFileName}
                  </small>
                )}
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
                <h3>Test Parameters</h3>
                <button type="button" className="lab-btn lab-btn-secondary lab-btn-sm" onClick={addRow}>
                  + Add Parameter
                </button>
              </div>
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
                    {parameters.map((param) => (
                      <tr key={param.id}>
                        <td>
                          <input
                            type="text"
                            value={param.parameter_name}
                            onChange={(e) => updateParam(param.id, 'parameter_name', e.target.value)}
                            placeholder="e.g. Hemoglobin"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => updateParam(param.id, 'value', e.target.value)}
                            placeholder="13.5"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={param.unit}
                            onChange={(e) => updateParam(param.id, 'unit', e.target.value)}
                            placeholder="g/dL"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={param.normal_range}
                            onChange={(e) => updateParam(param.id, 'normal_range', e.target.value)}
                            placeholder="12–16"
                          />
                        </td>
                        <td>
                          <select
                            value={param.flag}
                            onChange={(e) => updateParam(param.id, 'flag', e.target.value)}
                          >
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                            <option value="high">High</option>
                          </select>
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
                    ))}
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
