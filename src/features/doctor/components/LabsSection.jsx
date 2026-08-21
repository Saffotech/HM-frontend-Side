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
  inferTestCategory,
} from '@/shared/utils/doctorLabView';
import { useDoctorPatientVisitsQuery } from '@/features/doctor/hooks/useDoctorPatientQuery';
import {
  LAB_DEPARTMENTS,
  LAB_PRIORITIES,
  inferLabCategory,
} from '@/features/doctor/constants';
import { useLabRoutingDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import {
  departmentCode,
  inferLabDeptCodeFromOrder,
  labDepartmentLabel,
  resolveLabDepartmentId,
} from '@/shared/utils/labDepartments';
import PatientHistoryProfile from './PatientHistoryProfile';
import LabTestNameField from './LabTestNameField';
import { resolveDoctorPatient } from '@/features/doctor/utils/patientHistory';
import {
  DOCTOR_ENCOUNTER_MODE,
  labOrderMatchesEncounterMode,
} from '@/features/doctor/utils/encounterType';
import { Button, Input, Label, Select, Modal } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import StatusPill from './StatusPill';
import DoctorLabReportModal from './DoctorLabReportModal';
import '../styles/doctor-ui.css';

function CategoryCell({ category, testName, departmentName }) {
  const label = inferTestCategory(testName, category, departmentName);
  const isRad = label === 'Radiology';
  const Icon = isRad ? Scan : Beaker;
  return (
    <span className="doc-labs-category">
      <Icon size={14} aria-hidden />
      {label}
    </span>
  );
}

function LabEditModal({ test, open, onClose, onSave, saving }) {
  const labRoutingQuery = useLabRoutingDepartmentsQuery({ enabled: open });
  const labRoutingDepts = labRoutingQuery.data ?? [];
  const [deptCode, setDeptCode] = useState('');
  const [testName, setTestName] = useState(test?.testName ?? '');
  const [otherTest, setOtherTest] = useState(false);
  const [priority, setPriority] = useState(test?.priority ?? 'Normal');
  const [clinicalNotes, setClinicalNotes] = useState(test?.clinicalNotes ?? '');

  useEffect(() => {
    if (!open || !test) return;
    setDeptCode(inferLabDeptCodeFromOrder(test, labRoutingQuery.data ?? []));
    setTestName(test.testName);
    setOtherTest(false);
    setPriority(test.priority);
    setClinicalNotes(test.clinicalNotes);
  }, [open, test, labRoutingQuery.data]);

  if (!test) return null;

  const handleSave = () => {
    if (!deptCode) {
      toast.error('Please select Laboratory or Radiology');
      return;
    }
    if (!String(testName ?? '').trim()) {
      toast.error('Please select or enter a test');
      return;
    }
    const departmentId = resolveLabDepartmentId(labRoutingDepts, deptCode);
    onSave({
      testName: String(testName).trim(),
      category: inferLabCategory(testName, deptCode),
      departmentId: departmentId ?? undefined,
      priority,
      clinicalNotes,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Edit lab order"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <Select
        label="Lab Department *"
        value={deptCode}
        onChange={(code) => {
          setDeptCode(code);
          setTestName('');
          setOtherTest(false);
        }}
        placeholder={labRoutingQuery.isLoading ? 'Loading…' : 'Laboratory or Radiology'}
        options={
          labRoutingDepts.length
            ? labRoutingDepts.map((d) => ({
                value: departmentCode(d),
                label: d.name || labDepartmentLabel(d),
              }))
            : LAB_DEPARTMENTS.map((d) => ({ value: d.code, label: d.label }))
        }
      />
      <LabTestNameField
        label="Test name"
        deptCode={deptCode}
        testName={testName}
        otherTest={otherTest}
        onChange={({ testName: nextName, otherTest: nextOther }) => {
          setTestName(nextName);
          setOtherTest(nextOther);
        }}
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

function LabTestsList({
  tests,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onRowClick,
  onEdit,
  onCancel,
  onViewReport,
}) {
  const searched = useMemo(() => {
    const q = String(search ?? '').trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((t) => {
      const name = String(t.patientName ?? '').toLowerCase();
      const id = String(t.patientId ?? '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [tests, search]);

  const counts = useMemo(() => countDoctorLabFilters(searched), [searched]);
  const filtered = useMemo(
    () => filterDoctorLabTests(searched, filter),
    [searched, filter]
  );

  return (
    <>
      <header className="doc-labs-toolbar">
        <h2>Lab Tests</h2>
        <div className="doc-labs-search">
          <Input
            className="doc-labs-search__field"
            placeholder="Search patient by name or ID…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search patient"
          />
        </div>
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
      </header>

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
                  {String(search ?? '').trim()
                    ? 'No lab tests match this patient search.'
                    : 'No lab tests in this category.'}
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
                    <CategoryCell
                      category={t.category}
                      testName={t.testName}
                      departmentName={t.departmentName}
                    />
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
                            <Button size="sm" variant="outline" className="doc-labs-edit-btn" onClick={() => onEdit(t)}>
                              Edit
                            </Button>
                          )}
                          {t.canCancel && (
                            <Button size="sm" variant="outline" className="doc-labs-cancel-btn" onClick={() => onCancel(t)}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                      {t.reportAvailable && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="doc-labs-view-btn"
                          onClick={() => onViewReport?.(t)}
                        >
                          <Eye size={14} aria-hidden />
                          View report
                        </Button>
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

export default function LabsSection({ encounterMode = DOCTOR_ENCOUNTER_MODE.OPD }) {
  const { data: tests = [], isLoading } = useDoctorLabTestsQuery();
  const updateLab = useUpdateLabTestMutation();
  const cancelLab = useCancelLabTestMutation();
  const { data: patientVisitsData } = useDoctorPatientVisitsQuery({ limit: 500 });
  const patientVisits = patientVisitsData?.visits ?? [];
  const patientSourceByDbId = useMemo(() => {
    const map = new Map();
    for (const row of patientVisits) {
      if (row.patientId == null) continue;
      map.set(
        Number(row.patientId),
        row.registrationSource ?? row.encounterType ?? 'OPD',
      );
    }
    return map;
  }, [patientVisits]);
  const modeFilteredTests = useMemo(
    () =>
      tests.filter((test) =>
        labOrderMatchesEncounterMode(test, encounterMode, patientSourceByDbId),
      ),
    [tests, encounterMode, patientSourceByDbId],
  );
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [profilePatient, setProfilePatient] = useState(null);
  const [editTest, setEditTest] = useState(null);
  const [reportTest, setReportTest] = useState(null);

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
        encounterMode={encounterMode}
      />
    );
  }

  return (
    <div className="doc-page">
      {isLoading && <p className="text-muted">Loading lab tests…</p>}
      <LabTestsList
        tests={modeFilteredTests}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        onRowClick={(t) =>
          setProfilePatient(resolveDoctorPatient(patientVisits, t.patientId, t.patientName))
        }
        onEdit={setEditTest}
        onCancel={handleCancel}
        onViewReport={setReportTest}
      />
      <LabEditModal
        test={editTest}
        open={!!editTest}
        onClose={() => setEditTest(null)}
        onSave={handleSaveEdit}
        saving={updateLab.isPending}
      />
      <DoctorLabReportModal
        test={reportTest}
        open={reportTest != null}
        onClose={() => setReportTest(null)}
      />
    </div>
  );
}
