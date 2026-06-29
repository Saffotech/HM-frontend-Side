import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PharmacyLayout from '@/features/pharmacy/components/PharmacyLayout';
import PharmacyStatusBadge from '@/features/pharmacy/components/PharmacyStatusBadge';
import AllergyBanner from '@/features/pharmacy/components/AllergyBanner';
import PharmacyDetailListModal from '@/features/pharmacy/components/PharmacyDetailListModal';
import { Button, DataTableShell, QueryFeedback } from '@/shared/components/common';
import {
  usePharmacyPrescriptionQuery,
  usePrescriptionDispenseHistoryQuery,
} from '@/shared/hooks/queries/usePharmacyQuery';
import {
  getPrescriptionDoctors,
  getPrescriptionDiagnoses,
} from '@/features/pharmacy/utils/prescriptionMeta';
import { formatHumanInstructions, formatQuantityLabel } from '@/features/pharmacy/utils/prescriptionQuantity';
import { ROUTES } from '@/shared/constants';
import './PrescriptionDetailPage.css';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailGrid({ items }) {
  return (
    <div className="pharmacy-detail-grid">
      {items.map((item) => (
        <div
          key={item.label}
          className={item.fullWidth ? 'pharmacy-detail-grid__item--full' : undefined}
        >
          <div className="pharmacy-detail-label">{item.label}</div>
          <div className="pharmacy-detail-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function MultiFieldValue({ count, label, onView, singleValue }) {
  if (count <= 1) return singleValue || '—';
  return (
    <button type="button" className="pharmacy-view-list-btn" onClick={onView}>
      View {label} ({count})
    </button>
  );
}

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: rx, isLoading, isError, error } = usePharmacyPrescriptionQuery(id);
  const { data: previousDispensing = [] } = usePrescriptionDispenseHistoryQuery(id, {
    enabled: Boolean(id),
  });
  const [listModal, setListModal] = useState(null);

  const doctors = rx ? getPrescriptionDoctors(rx) : [];
  const diagnoses = rx ? getPrescriptionDiagnoses(rx) : [];

  return (
    <PharmacyLayout compact>
      <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
        {rx && (
          <div className="pharmacy-detail-page page-stack page-container">
            <div className="pharmacy-detail-toolbar">
              <Button variant="ghost" onClick={() => navigate(ROUTES.PHARMACY_PRESCRIPTIONS)}>
                Back to list
              </Button>
              {(rx.status === 'pending' || rx.status === 'partially_dispensed') && (
                <Button onClick={() => navigate(`/pharmacy/dispense/${id}`)}>
                  Dispense medicine
                </Button>
              )}
              {rx.status === 'dispensed' && (
                <Button variant="outline" disabled>
                  Fully dispensed
                </Button>
              )}
            </div>

            <AllergyBanner allergies={rx.patient?.allergies} />

            <div className="pharmacy-detail-cards">
              <div className="card">
                <div className="card__header">
                  <h3>Patient information</h3>
                </div>
                <div className="card__body">
                  <DetailGrid
                    items={[
                      { label: 'Name', value: rx.patient?.name },
                      { label: 'Phone', value: rx.patient_phone || rx.patient?.phone || '—' },
                      {
                        label: 'Allergies',
                        value: rx.patient?.allergies || 'None noted',
                        fullWidth: true,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="card">
                <div className="card__header">
                  <h3>Prescription</h3>
                </div>
                <div className="card__body">
                  <DetailGrid
                    items={[
                      {
                        label: 'Doctor',
                        value: (
                          <MultiFieldValue
                            count={doctors.length}
                            label="Doctor"
                            singleValue={doctors[0]?.name}
                            onView={() => setListModal('doctors')}
                          />
                        ),
                      },
                      {
                        label: 'Diagnosis',
                        value: (
                          <MultiFieldValue
                            count={diagnoses.length}
                            label="Diagnosis"
                            singleValue={diagnoses[0]?.label}
                            onView={() => setListModal('diagnoses')}
                          />
                        ),
                      },
                      { label: 'Status', value: <PharmacyStatusBadge status={rx.status} /> },
                      { label: 'Created', value: fmt(rx.created_at) },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="card card--flat">
              <div className="card__header">
                <h3>Prescribed medicines</h3>
              </div>
              <DataTableShell>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Instructions</th>
                      <th>Total quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rx.prescription_items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.medicine_name}</td>
                        <td className="pharmacy-detail-instructions">
                          {item.instructions_label || formatHumanInstructions(item)}
                        </td>
                        <td className="pharmacy-detail-qty">
                          {formatQuantityLabel(item.quantity_prescribed, item.medicine_name)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableShell>
            </div>

            {previousDispensing.length > 0 && (
              <div className="card card--flat">
                <div className="card__header">
                  <h3>Previous dispensings</h3>
                </div>
                <DataTableShell>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Medicine</th>
                        <th>Quantity dispensed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousDispensing.map((row) => (
                        <tr key={row.id}>
                          <td>{fmtDt(row.dispensed_at)}</td>
                          <td>{row.medicine_name || '—'}</td>
                          <td>{row.quantity_dispensed ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DataTableShell>
              </div>
            )}
            <PharmacyDetailListModal
              isOpen={listModal === 'doctors'}
              onClose={() => setListModal(null)}
              title="Doctors"
            >
              <ul className="pharmacy-detail-list">
                {doctors.map((doctor) => (
                  <li key={doctor.id} className="pharmacy-detail-list__item">
                    <span className="pharmacy-detail-list__title">{doctor.name}</span>
                    {doctor.department && (
                      <span className="pharmacy-detail-list__meta">{doctor.department}</span>
                    )}
                  </li>
                ))}
              </ul>
            </PharmacyDetailListModal>

            <PharmacyDetailListModal
              isOpen={listModal === 'diagnoses'}
              onClose={() => setListModal(null)}
              title="Diagnoses"
            >
              <ul className="pharmacy-detail-list">
                {diagnoses.map((dx) => (
                  <li key={dx.id} className="pharmacy-detail-list__item">
                    <span className="pharmacy-detail-list__title">{dx.label}</span>
                    {dx.noted_at && (
                      <span className="pharmacy-detail-list__meta">Noted {fmt(dx.noted_at)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </PharmacyDetailListModal>
          </div>
        )}
      </QueryFeedback>
      {isError && (
        <Button variant="ghost" onClick={() => navigate(ROUTES.PHARMACY_PRESCRIPTIONS)}>
          Back to list
        </Button>
      )}
    </PharmacyLayout>
  );
}
