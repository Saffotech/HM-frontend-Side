import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button, StatusBadge, MoneyAmount, TablePagination } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { BILLS_PAGE_SIZE } from '@/shared/hooks/queries/useBillingQuery';

export default function PatientProfileVisitsTab({
  opdVisits,
  patientAppts,
  apptPageMeta,
  setApptPage,
  uniqueDoctors,
  la,
  ea,
  errA,
}) {
  return (
    <div className="pp-section">
      <div className="pp-section__head">
        <h3 className="pp-section__title">OPD Visit History</h3>
        <Link to={ROUTES.PATIENTS_REGISTER}>
          <Button size="sm" variant="outline"><Plus size={14} /> New Registration</Button>
        </Link>
      </div>
      {opdVisits.length === 0 ? (
        <p className="pp-placeholder">No OPD visits on record. Register the patient to create a visit and bill.</p>
      ) : (
        <ul className="pp-visit-list">
          {opdVisits.map((v) => (
            <li key={v.visitId ?? v.billNumber} className="pp-visit-card">
              <div className="pp-visit-card__main">
                <strong>{v.department ?? 'OPD Visit'}</strong>
                <span className="pp-visit-card__doctor">{v.doctorName ?? '—'}</span>
              </div>
              <div className="pp-visit-card__meta">
                <span>
                  {v.visitDate}
                  {v.visitTime ? ` · ${v.visitTime}` : ''}
                  {v.tokenNumber ? ` · Token ${v.tokenNumber}` : ''}
                </span>
                <StatusBadge status={v.paymentStatus} />
              </div>
              <p className="pp-visit-card__reason">
                Bill {v.billNumber} · <MoneyAmount value={v.grandTotal} />
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="pp-section__head pp-section__head--sub">
        <h3 className="pp-section__title">Scheduled Appointments</h3>
        <Link to={ROUTES.APPOINTMENTS_BOOK}>
          <Button size="sm"><Plus size={14} /> Book Appointment</Button>
        </Link>
      </div>
      {la ? (
        <p className="pp-placeholder">Loading appointments…</p>
      ) : ea ? (
        <p className="pp-placeholder">{errA?.message ?? 'Could not load appointments.'}</p>
      ) : patientAppts.length === 0 ? (
        <p className="pp-placeholder">No scheduled appointments.</p>
      ) : (
        <>
          <ul className="pp-visit-list">
            {patientAppts.map((a) => (
              <li key={a.id} className="pp-visit-card pp-visit-card--appt">
                <div className="pp-visit-card__main">
                  <strong>{a.deptName ?? 'Appointment'}</strong>
                  <span className="pp-visit-card__doctor">{a.doctorName}</span>
                </div>
                <div className="pp-visit-card__meta">
                  <span>
                    {a.date} · {a.time}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                {a.reason && <p className="pp-visit-card__reason">{a.reason}</p>}
              </li>
            ))}
          </ul>
          <TablePagination
            page={apptPageMeta.page}
            totalPages={apptPageMeta.totalPages}
            totalItems={apptPageMeta.total}
            pageSize={BILLS_PAGE_SIZE}
            onPageChange={setApptPage}
          />
        </>
      )}
      {uniqueDoctors.length > 0 && (
        <p className="pp-footnote">Appointment doctors: {uniqueDoctors.join(', ')}</p>
      )}
    </div>
  );
}
