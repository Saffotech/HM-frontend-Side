import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LabLayout from '@/features/lab/components/LabLayout';
import { ensureMockLabDataLoaded, getLabOrders, submitLabReport } from '@/features/lab/data/labStore';
import { notifyLabStoreUpdated } from '@/features/lab/hooks/useLabStore';
import { LAB_ORDER_STATUS, LAB_STATUS_META } from '@/features/lab/utils/labOrderStatus';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import '../styles/lab.css';

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

export default function LabUploadReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;
    ensureMockLabDataLoaded().then(() => {
      if (!cancelled) {
        setOrder(getLabOrders().find((o) => o.id === id) ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const [sampleCollectedAt, setSampleCollectedAt] = useState(order?.sampleCollectedAt ?? '');
  const [testPerformedAt, setTestPerformedAt] = useState(order?.testPerformedAt ?? '');
  const [reportFile, setReportFile] = useState(null);
  const [remarks, setRemarks] = useState(order?.remarks ?? '');
  const [status, setStatus] = useState(
    order?.status === LAB_ORDER_STATUS.IN_PROGRESS ? 'completed' : 'in_progress'
  );
  const [parameters, setParameters] = useState(() => {
    if (order?.parameters?.length) {
      return order.parameters.map((p, i) => ({
        id: p.id ?? `p-${i}`,
        parameter_name: p.parameter_name ?? '',
        value: p.value ?? '',
        unit: p.unit ?? '',
        normal_range: p.normal_range ?? '',
        flag: p.flag ?? 'normal',
      }));
    }
    return [{ id: makeId(), parameter_name: '', value: '', unit: '', normal_range: '', flag: 'normal' }];
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const addRow = () => {
    setParameters((prev) => [
      ...prev,
      { id: makeId(), parameter_name: '', value: '', unit: '', normal_range: '', flag: 'normal' },
    ]);
  };

  const removeRow = (rowId) => {
    setParameters((prev) => prev.filter((p) => p.id !== rowId));
  };

  const updateParam = (rowId, field, val) => {
    setParameters((prev) => prev.map((p) => (p.id === rowId ? { ...p, [field]: val } : p)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!sampleCollectedAt) errs.sampleCollectedAt = 'Required';
    if (!testPerformedAt) errs.testPerformedAt = 'Required';
    if (status === LAB_ORDER_STATUS.COMPLETED && !reportFile && !order?.reportFileName) {
      errs.reportFile = 'Please attach a report file to mark as Completed';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const { report } = submitLabReport(id, {
        status,
        sampleCollectedAt,
        testPerformedAt,
        remarks,
        parameters: parameters.map((param) => {
          const { id, ...rest } = param;
          void id;
          return rest;
        }),
        fileName: reportFile?.name ?? order?.reportFileName ?? null,
      });
      notifyLabStoreUpdated();
      setSuccess(true);
      if (status === LAB_ORDER_STATUS.COMPLETED) {
        toast.success(`Report uploaded — ${report?.reportId ?? 'saved'}`);
        setTimeout(() => navigate(ROUTES.LAB_REPORTS), 1500);
      } else {
        toast.success('Saved as In Progress — test stays on your open worklist');
        setTimeout(() => navigate(`${ROUTES.LAB_ORDERS}?view=in_progress`), 1200);
      }
    } catch {
      toast.error('Could not save report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) {
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

  const stage = LAB_STATUS_META[order.status] ?? LAB_STATUS_META.pending;

  return (
    <LabLayout pageTitle="Upload Report">
      <div className="lab-page-header">
        <div className="lab-breadcrumb">
          <span>Lab Portal</span>
          <span className="sep">›</span>
          <Link to={ROUTES.LAB_ORDERS} style={{ color: '#1a9fd4', textDecoration: 'none' }}>
            Pending Tests
          </Link>
          <span className="sep">›</span>
          <span className="current">Upload — {order.id}</span>
        </div>
        <h1>Upload Lab Report</h1>
        <p>Save as In Progress while working, or Completed when the report file is ready</p>
      </div>

      <div className="lab-status-flow lab-status-flow--compact">
        <div className={`lab-status-flow__step${order.status === 'pending' ? ' is-current' : order.status !== 'pending' ? ' is-done' : ''}`}>
          <span>1</span> Waiting
        </div>
        <div className="lab-status-flow__line" />
        <div className={`lab-status-flow__step${order.status === 'in_progress' ? ' is-current' : order.status === 'completed' ? ' is-done' : ''}`}>
          <span>2</span> In Progress
        </div>
        <div className="lab-status-flow__line" />
        <div className={`lab-status-flow__step${order.status === 'completed' ? ' is-current is-done' : ''}`}>
          <span>3</span> Completed
        </div>
      </div>

      <div className="lab-alert info">
        <span>ℹ️</span>
        <div>
          <strong>Current stage: {stage.label}</strong> — {stage.description}
          <br />
          <small>{stage.nextStep}</small>
        </div>
      </div>

      {success && (
        <div className="lab-alert success">
          <span>✅</span>
          <div>
            <strong>Saved successfully!</strong>
            <br />
            <small>
              {status === LAB_ORDER_STATUS.COMPLETED
                ? 'Redirecting to completed reports...'
                : 'Redirecting to in-progress list...'}
            </small>
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
              <span className={`lab-badge ${order.priority}`}>{order.priority}</span>
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
              <div className="lab-field">
                <label htmlFor="sample-collected-at">
                  Sample Collected At <span className="required">*</span>
                </label>
                <input
                  id="sample-collected-at"
                  type="datetime-local"
                  value={sampleCollectedAt}
                  onChange={(e) => {
                    setSampleCollectedAt(e.target.value);
                    setErrors((er) => {
                      const n = { ...er };
                      delete n.sampleCollectedAt;
                      return n;
                    });
                  }}
                  style={errors.sampleCollectedAt ? { borderColor: '#dc2626' } : {}}
                />
                {errors.sampleCollectedAt && (
                  <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.sampleCollectedAt}</span>
                )}
              </div>
              <div className="lab-field">
                <label htmlFor="test-performed-at">
                  Test Performed At <span className="required">*</span>
                </label>
                <input
                  id="test-performed-at"
                  type="datetime-local"
                  value={testPerformedAt}
                  onChange={(e) => {
                    setTestPerformedAt(e.target.value);
                    setErrors((er) => {
                      const n = { ...er };
                      delete n.testPerformedAt;
                      return n;
                    });
                  }}
                  style={errors.testPerformedAt ? { borderColor: '#dc2626' } : {}}
                />
                {errors.testPerformedAt && (
                  <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.testPerformedAt}</span>
                )}
              </div>
            </div>

            <div className="lab-form-row">
              <div className="lab-field">
                <label htmlFor="report-file">
                  Report File
                  {status === LAB_ORDER_STATUS.COMPLETED && <span className="required"> *</span>}
                  <small style={{ fontWeight: 400, color: '#8a9ab5', marginLeft: 6 }}>(PDF, PNG, JPG)</small>
                </label>
                <input
                  id="report-file"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    setReportFile(e.target.files?.[0] ?? null);
                    setErrors((er) => {
                      const n = { ...er };
                      delete n.reportFile;
                      return n;
                    });
                  }}
                  style={errors.reportFile ? { borderColor: '#dc2626' } : {}}
                />
                {(reportFile || order.reportFileName) && (
                  <small style={{ color: '#059669', fontSize: '12px' }}>
                    ✓ {reportFile?.name ?? order.reportFileName}
                  </small>
                )}
                {errors.reportFile && (
                  <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.reportFile}</span>
                )}
              </div>
              <div className="lab-field">
                <label htmlFor="report-status">Save as status</label>
                <select id="report-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="in_progress">In Progress — still working on this test</option>
                  <option value="completed">Completed — report ready, remove from open list</option>
                </select>
                <small style={{ color: '#6b7f99', fontSize: '12px' }}>
                  In Progress keeps the test on your open worklist. Completed moves it to archive.
                </small>
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
                            <option value="critical">Critical</option>
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
              <button type="submit" className="lab-btn lab-btn-primary" disabled={submitting || success}>
                {submitting
                  ? 'Saving...'
                  : status === LAB_ORDER_STATUS.COMPLETED
                    ? 'Submit & mark Completed'
                    : 'Save as In Progress'}
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
    </LabLayout>
  );
}
