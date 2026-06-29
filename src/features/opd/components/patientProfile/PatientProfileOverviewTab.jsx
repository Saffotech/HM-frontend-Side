import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, StatusBadge, MoneyAmount } from '@/shared/components/common';
import { billCollectedAmount } from '@/shared/utils/billHelpers';
import { maskAadhaarDisplay } from '@/shared/utils/validators';

export default function PatientProfileOverviewTab({
  patient,
  opdVisits,
  primaryDeptName,
  docName,
  expandedVisit,
  setExpandedVisit,
  setPaymentDetailVisit,
}) {
  return (
    <div className="pp-overview">
      <div className="pp-card">
        <h3 className="pp-card__title">Personal Information</h3>
        <dl className="pp-dl">
          <div className="pp-dl__row">
            <dt>Gender</dt>
            <dd>{patient.gender || '—'}</dd>
          </div>
          <div className="pp-dl__row">
            <dt>Blood Group</dt>
            <dd className="pp-dl__blood">{patient.bloodGroup || '—'}</dd>
          </div>
          <div className="pp-dl__row">
            <dt>Phone</dt>
            <dd>{patient.phone || '—'}</dd>
          </div>
          <div className="pp-dl__row">
            <dt>Aadhaar</dt>
            <dd>{patient.aadhaar ? maskAadhaarDisplay(patient.aadhaar) : '—'}</dd>
          </div>
          <div className="pp-dl__row">
            <dt>State</dt>
            <dd>{patient.state || '—'}</dd>
          </div>
          {patient.address && (
            <div className="pp-dl__row pp-dl__row--full">
              <dt><MapPin size={14} aria-hidden /> Address</dt>
              <dd>{patient.address}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="pp-card">
        <h3 className="pp-card__title">Primary Care</h3>
        <div className="pp-care">
          <div className="pp-care__block">
            <span className="pp-care__label">Department</span>
            <span className="pp-care__value">{primaryDeptName || '—'}</span>
          </div>
          <div className="pp-care__block">
            <span className="pp-care__label">Doctor</span>
            <span className="pp-care__value pp-care__value--doctor">
              {docName ?? '—'}
            </span>
          </div>
          <div className="pp-care__block">
            <span className="pp-care__label">Specialization</span>
            <span className="pp-care__value">—</span>
          </div>
        </div>
      </div>

      <div className="pp-card pp-card--wide">
        <h3 className="pp-card__title">
          Visit Summary
          <span className="pp-card__title-count">{opdVisits.length}</span>
        </h3>
        {opdVisits.length === 0 ? (
          <p className="pp-card__lead" style={{ color: 'var(--color-text-muted)' }}>
            No OPD visits yet.
          </p>
        ) : (
          <div className="pp-visit-summary-list">
            {opdVisits.map((v, idx) => {
              const key = v.visitId ?? v.billNumber ?? idx;
              const isOpen = expandedVisit === key;
              return (
                <div key={key} className={`pp-vs-card${isOpen ? ' pp-vs-card--open' : ''}`}>
                  <button
                    type="button"
                    className="pp-vs-card__header"
                    onClick={() => setExpandedVisit(isOpen ? null : key)}
                  >
                    <span className="pp-vs-card__num">Visit {opdVisits.length - idx}</span>
                    <span className="pp-vs-card__date">{v.visitDate}</span>
                    <span className="pp-vs-card__dept">{v.department ?? 'OPD'}</span>
                    <StatusBadge status={v.paymentStatus} />
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  {isOpen && (
                    <div className="pp-vs-card__body">
                      <div className="pp-vs-row">
                        <span className="pp-vs-label">Doctor</span>
                        <span className="pp-vs-value pp-vs-value--teal">{v.doctorName ?? '—'}</span>
                      </div>
                      <div className="pp-vs-row">
                        <span className="pp-vs-label">Department</span>
                        <span className="pp-vs-value">{v.department ?? '—'}</span>
                      </div>
                      <div className="pp-vs-row">
                        <span className="pp-vs-label">Bill No.</span>
                        <span className="pp-vs-value">{v.billNumber ?? '—'}</span>
                      </div>
                      <div className="pp-vs-row">
                        <span className="pp-vs-label">Total</span>
                        <span className="pp-vs-value"><MoneyAmount amount={v.grandTotal} /></span>
                      </div>
                      <div className="pp-vs-row">
                        <span className="pp-vs-label">Paid</span>
                        <span className="pp-vs-value"><MoneyAmount amount={billCollectedAmount(v.grandTotal, v.balanceDue, v.paidAmount)} /></span>
                      </div>
                      <div className="pp-vs-row">
                        <span className="pp-vs-label">Balance</span>
                        <span className={`pp-vs-value${v.balanceDue > 0 ? ' pp-vs-value--red' : ' pp-vs-value--green'}`}>
                          <MoneyAmount amount={v.balanceDue} />
                        </span>
                      </div>
                      <div className="pp-vs-row pp-vs-row--time">
                        <div>
                          <span className="pp-vs-label">Time</span>
                          <span className="pp-vs-value">{v.visitTime ?? '—'}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPaymentDetailVisit({
                              visit: v,
                              visitNum: opdVisits.length - idx,
                            })
                          }
                        >
                          View Payment Details
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
