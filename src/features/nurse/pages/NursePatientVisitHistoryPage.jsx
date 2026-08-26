import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Pencil, Stethoscope, Trash2 } from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePagination from '@/features/nurse/components/NursePagination';
import { toast } from '@/shared/utils/toast';
import NurseConfirmDialog from '@/features/nurse/components/NurseConfirmDialog';
import NurseEditVisitModal from '@/features/nurse/components/NurseEditVisitModal';
import {
  useNurseDoctorVisitsQuery,
  useNurseActiveDoctorsQuery,
  useVoidDoctorVisitMutation,
} from '@/shared/hooks/queries/useNurseQuery';
import { formatPatientIdDisplay } from '@/shared/api/mappers/nurseMapper';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';

const PAGE_SIZE = 10;

function formatVisitTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function NursePatientVisitHistoryPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const patient = location.state?.patient ?? null;

  const [page, setPage] = useState(1);
  const [editingVisit, setEditingVisit] = useState(null);
  const [voidingVisit, setVoidingVisit] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const voidVisit = useVoidDoctorVisitMutation(voidingVisit?.id);

  const { data, isLoading, isError } = useNurseDoctorVisitsQuery(
    { patient_id: patientId ? Number(patientId) : undefined, page: 1, page_size: 100 },
    { enabled: Boolean(patientId) },
  );

  const { data: doctorsData } = useNurseActiveDoctorsQuery(
    { page: 1, page_size: 100 },
    { enabled: Boolean(patientId) },
  );

  const doctorDepartmentMap = useMemo(() => {
    const map = new Map();
    for (const doc of doctorsData?.doctors ?? []) {
      map.set(Number(doc.id), String(doc.specialization || '').trim());
    }
    return map;
  }, [doctorsData?.doctors]);

  const visits = useMemo(
    () =>
      (data?.items ?? [])
        .filter((v) => !v.is_voided)
        .sort((a, b) => new Date(b.visited_at) - new Date(a.visited_at)),
    [data?.items],
  );

  useEffect(() => {
    setPage(1);
  }, [patientId]);

  const pageCount = Math.max(1, Math.ceil(visits.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const pagedVisits = useMemo(
    () => visits.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [visits, safePage],
  );

  const lastVisit = visits[0] ?? null;

  const handleVoid = async () => {
    if (String(voidReason).trim().length < 3) {
      toast.error('Please provide a void reason (min 3 characters)');
      return;
    }
    try {
      await voidVisit.mutateAsync({ void_reason: voidReason.trim() });
      toast.success('Doctor visit deleted');
      setVoidingVisit(null);
      setVoidReason('');
    } catch {
      // mutationOnError toasts most failures
    }
  };

  return (
    <NurseLayout>
      <div className="nurse-page nurse-visit-history-page">
        <div className="nurse-visit-history-page__top">
          <div className="nurse-visit-history-page__identity">
            <div className="nurse-doctor-visits-page__icon" aria-hidden>
              <Stethoscope size={20} />
            </div>
            <div>
              <h1 className="nurse-visit-history-page__title">
                Patient History · {patient?.patient_name || 'Patient'}
              </h1>
              <p className="nurse-visit-history-page__meta">
                {patient ? (
                  <>
                    <span>Patient ID: <strong>{formatPatientIdDisplay(patient)}</strong></span>
                    <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                    <span>Ward: <strong>{patient.ward_name || '—'}</strong></span>
                    <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                    <span>Bed: <strong>{patient.bed_number || '—'}</strong></span>
                    <span className="nurse-vital-detail__dot" aria-hidden>·</span>
                    <span>Admitted: <strong>{formatIpdDateTime(patient.admitted_at)}</strong></span>
                  </>
                ) : (
                  <span>Patient ID: <strong>{patientId}</strong></span>
                )}
              </p>
            </div>
          </div>
          <div className="nurse-vital-detail__actions">
            <button
              type="button"
              className="nurse-btn nurse-btn--secondary"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        <div className="nurse-visit-history__last nurse-card">
          <h3 className="nurse-visit-history__section-title">Last log visit</h3>
          {isLoading ? (
            <p className="nurse-visit-history__empty">Loading visits...</p>
          ) : isError ? (
            <p className="nurse-visit-history__empty">Could not load visits.</p>
          ) : lastVisit ? (
            <div className="nurse-visit-history__last-grid">
              <div className="nurse-visit-history__last-row">
                <div>
                  <span className="nurse-visit-history__label">Visited at</span>
                  <span className="nurse-visit-history__value">
                    {formatVisitTime(lastVisit.visited_at)}
                  </span>
                </div>
                <div>
                  <span className="nurse-visit-history__label">Doctor</span>
                  <span className="nurse-visit-history__value">
                    {lastVisit.doctor_name || '—'}
                  </span>
                </div>
                <div>
                  <span className="nurse-visit-history__label">Department</span>
                  <span className="nurse-visit-history__value">
                    {doctorDepartmentMap.get(Number(lastVisit.doctor_id)) || '—'}
                  </span>
                </div>
                <div>
                  <span className="nurse-visit-history__label">Logged by</span>
                  <span className="nurse-visit-history__value">
                    {lastVisit.recorded_by_name || '—'}
                  </span>
                </div>
              </div>
              <div className="nurse-visit-history__last-row nurse-visit-history__last-row--secondary">
                <div className="nurse-visit-history__notes-block">
                  <span className="nurse-visit-history__label">Notes</span>
                  <span className="nurse-visit-history__notes-text">
                    {lastVisit.notes || '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="nurse-visit-history__empty">
              No doctor visits logged for this patient yet.
            </p>
          )}
        </div>

        <div className="nurse-visit-history__list nurse-card">
          <h3 className="nurse-visit-history__section-title">
            All visits
            <span className="nurse-visit-history__count">{visits.length}</span>
          </h3>
          {isLoading ? (
            <p className="nurse-visit-history__empty">Loading visits...</p>
          ) : visits.length === 0 ? (
            <p className="nurse-visit-history__empty">No visits recorded.</p>
          ) : (
            <>
              <div className="nurse-table-wrap">
                <table className="nurse-table">
                  <thead>
                    <tr>
                      <th>Visited at</th>
                      <th>Doctor</th>
                      <th>Doctor department</th>
                      <th>Logged by</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedVisits.map((visit) => (
                      <tr key={visit.id}>
                        <td>{formatVisitTime(visit.visited_at)}</td>
                        <td>{visit.doctor_name || '—'}</td>
                        <td>{doctorDepartmentMap.get(Number(visit.doctor_id)) || '—'}</td>
                        <td>{visit.recorded_by_name || '—'}</td>
                        <td className="nurse-visit-history__notes">
                          {visit.notes ? (
                            <span className="nurse-visit-history__notes-cell">
                              {visit.notes}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <div className="nurse-doctor-visits__actions">
                            <button
                              type="button"
                              className="nurse-btn nurse-btn--ghost nurse-doctor-visits__action"
                              onClick={() => setEditingVisit(visit)}
                              aria-label={`Edit visit for ${patient?.patient_name || 'patient'}`}
                            >
                              <Pencil size={15} />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="nurse-btn nurse-btn--ghost nurse-doctor-visits__action nurse-doctor-visits__action--danger"
                              onClick={() => {
                                setVoidingVisit(visit);
                                setVoidReason('');
                              }}
                              aria-label={`Delete visit for ${patient?.patient_name || 'patient'}`}
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <NursePagination
                page={safePage}
                pageSize={PAGE_SIZE}
                total={visits.length}
                hasNextPage={safePage < pageCount}
                itemCount={pagedVisits.length}
                onChange={setPage}
              />
            </>
          )}
        </div>
      </div>

      {editingVisit && (
        <NurseEditVisitModal
          open={Boolean(editingVisit)}
          visit={editingVisit}
          onClose={() => setEditingVisit(null)}
        />
      )}

      <NurseConfirmDialog
        open={Boolean(voidingVisit)}
        title="Delete doctor visit"
        subtitle="This action cannot be undone"
        description={
          <div className="nurse-void-form">
            <p>
              Deleting this visit removes it from active records. Please provide a reason.
            </p>
            <textarea
              className="nurse-input nurse-void-form__reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason for deletion (required)"
              rows={3}
              autoFocus
            />
          </div>
        }
        confirmLabel={voidVisit.isPending ? 'Deleting...' : 'Delete visit'}
        variant="danger"
        onConfirm={handleVoid}
        onCancel={() => setVoidingVisit(null)}
      />
    </NurseLayout>
  );
}
