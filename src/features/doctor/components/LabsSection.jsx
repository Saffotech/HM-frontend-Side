import { useMemo, useState, useEffect } from 'react';
import { Beaker, Eye, Scan } from 'lucide-react';
import {
  useDoctorLabTestsQuery,
  useUpdateLabTestMutation,
  useCancelLabTestMutation,
} from '@/features/doctor/hooks/useDoctorLabQuery';
import {
  DOCTOR_LAB_FILTERS,
  countDoctorLabFilters,
  filterDoctorLabTests,
} from '@/shared/utils/doctorLabView';
import { useDoctorPatientVisitsQuery } from '@/features/doctor/hooks/useDoctorPatientQuery';
import { LAB_CATEGORIES, LAB_PRIORITIES } from '@/features/doctor/constants';
import PatientHistoryProfile from './PatientHistoryProfile';
import { resolveDoctorPatient } from '@/features/doctor/utils/patientHistory';
import { Button, Input, Label, Select, Modal } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import StatusPill from './StatusPill';
import '../styles/doctor-ui.css';

function CategoryCell({ category }) {
  const isRad = category === 'Radiology';
  const Icon = isRad ? Scan : Beaker;
  return (
    <span className="doc-labs-category">
      <Icon size={14} aria-hidden />
      {category}
    </span>
  );
}

function LabEditModal({ test, open, onClose, onSave, saving }) {
  const [testName, setTestName] = useState(test?.testName ?? '');
  const [category, setCategory] = useState(test?.category ?? 'Blood');
  const [priority, setPriority] = useState(test?.priority ?? 'Normal');
  const [clinicalNotes, setClinicalNotes] = useState(test?.clinicalNotes ?? '');

  useEffect(() => {
    if (!open || !test) return;
    setTestName(test.testName);
    setCategory(test.category);
    setPriority(test.priority);
    setClinicalNotes(test.clinicalNotes);
  }, [open, test]);

  if (!test) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Edit lab order"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={() => onSave({ testName, category, priority, clinicalNotes })}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <Input label="Test name" value={testName} onChange={(e) => setTestName(e.target.value)} />
      <Select
        label="Category *"
        value={category}
        onChange={setCategory}
        options={LAB_CATEGORIES.map((c) => ({ value: c, label: c }))}
      />
      <Select
        label="Priority"
        value={priority}
        onChange={setPriority}
        options={LAB_PRIORITIES.map((p) => ({ value: p, label: p }))}
      />
      <Label>Clinical notes</Label>
      <Input value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} />
    </Modal>
  );
}

function LabTestsList({ tests, filter, onFilterChange, onRowClick, onEdit, onCancel }) {
  const counts = useMemo(() => countDoctorLabFilters(tests), [tests]);
  const filtered = useMemo(
    () => filterDoctorLabTests(tests, filter),
    [tests, filter]
  );

  return (
    <>
      <header className="doc-labs-header">
        <h2>Lab Tests</h2>
        <p>Order tests from a completed consultation. Update or cancel only while status is Ordered.</p>
      </header>

      <div className="doc-labs-filters" role="tablist" aria-label="Filter lab tests">
        {DOCTOR_LAB_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`doc-labs-filter${filter === f.id ? ' doc-labs-filter--active' : ''}`}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label} ({counts[f.id] ?? 0})
          </button>
        ))}
      </div>

      <div className="doc-card doc-card__body--flush table-wrap">
        <table className="data-table doc-labs-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Test</th>
              <th>Category</th>
              <th>Ordered</th>
              <th>Status</th>
              <th className="doc-labs-table__actions-head">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                  No lab tests in this category.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr
                  key={t.id}
                  className="doc-labs-row"
                  tabIndex={0}
                  role="button"
                  aria-label={`View profile for ${t.patientName}`}
                  onClick={() => onRowClick(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(t);
                    }
                  }}
                >
                  <td>
                    <strong>{t.patientName}</strong>
                    <span className="doc-labs-patient-id">{t.patientId}</span>
                  </td>
                  <td>{t.testName}</td>
                  <td>
                    <CategoryCell category={t.category} />
                  </td>
                  <td>{t.orderedDisplay}</td>
                  <td>
                    <StatusPill status={t.doctorStatus} />
                  </td>
                  <td
                    className="doc-labs-table__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="doc-labs-table__actions-inner">
                      {(t.canUpdate || t.canCancel) && (
                        <div className="doc-labs-table__actions-btns">
                          {t.canUpdate && (
                            <Button size="sm" variant="outline" onClick={() => onEdit(t)}>
                              Edit
                            </Button>
                          )}
                          {t.canCancel && (
                            <Button size="sm" variant="outline" onClick={() => onCancel(t)}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                      {t.reportAvailable && (
                        <span className="doc-labs-view-btn doc-labs-view-btn--inline">
                          <Eye size={14} aria-hidden />
                          Report
                        </span>
                      )}
                      {!t.reportAvailable && !t.canCancel && !t.canUpdate && (
                        <span className="doc-labs-awaiting">Awaiting lab</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function LabsSection() {
  const { data: tests = [], isLoading } = useDoctorLabTestsQuery();
  const updateLab = useUpdateLabTestMutation();
  const cancelLab = useCancelLabTestMutation();
  const { data: patientVisitsData } = useDoctorPatientVisitsQuery();
  const patientVisits = patientVisitsData?.visits ?? [];
  const [filter, setFilter] = useState('all');
  const [profilePatient, setProfilePatient] = useState(null);
  const [editTest, setEditTest] = useState(null);

  const handleCancel = async (test) => {
    if (!window.confirm(`Cancel lab order "${test.testName}"?`)) return;
    try {
      await cancelLab.mutateAsync(test.id);
      toast.success('Lab order cancelled');
    } catch (err) {
      toast.error(err?.message ?? 'Failed to cancel');
    }
  };

  const handleSaveEdit = async (payload) => {
    if (!editTest) return;
    try {
      await updateLab.mutateAsync({ testId: editTest.id, payload });
      toast.success('Lab order updated');
      setEditTest(null);
    } catch (err) {
      toast.error(err?.message ?? 'Failed to update');
    }
  };

  if (profilePatient) {
    return (
      <PatientHistoryProfile
        patient={profilePatient}
        onBack={() => setProfilePatient(null)}
        backLabel="Back to Lab Tests"
      />
    );
  }

  return (
    <div className="doc-page">
      {isLoading && <p className="text-muted">Loading lab tests…</p>}
      <LabTestsList
        tests={tests}
        filter={filter}
        onFilterChange={setFilter}
        onRowClick={(t) =>
          setProfilePatient(resolveDoctorPatient(patientVisits, t.patientId, t.patientName))
        }
        onEdit={setEditTest}
        onCancel={handleCancel}
      />
      <LabEditModal
        test={editTest}
        open={!!editTest}
        onClose={() => setEditTest(null)}
        onSave={handleSaveEdit}
        saving={updateLab.isPending}
      />
    </div>
  );
}
