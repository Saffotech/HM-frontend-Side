/**
 * Insurance patient profile — UI preview when Open is clicked
 * from Patients list (Payment type = Insurance).
 */

import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import EditInsuranceModal from '@/features/ipd/components/EditInsuranceModal';
import useIpdBackNavigation from '@/features/ipd/hooks/useIpdBackNavigation';
import {
  loadInsuranceAdmitContext,
  persistInsuranceAdmitContext,
  resolveInsurancePatientContext,
  updateInsuranceClaim,
} from '@/features/ipd/utils/dummyInsuranceClaim';
import { formatIpdMoney } from '@/features/ipd/utils/ipdFormat';

function Fact({ label, value }) {
  return (
    <div className="ipd-claim-kv">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}

export default function IpdInsurancePatientPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useIpdBackNavigation(
    `${ROUTES.IPD_PATIENTS}?paymentType=insurance_cashless`,
  );

  const { patient, claim: seedClaim } = useMemo(
    () =>
      resolveInsurancePatientContext(
        patientId,
        location.state?.insuranceAdmit,
      ),
    [patientId, location.state],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [insurance, setInsurance] = useState(null);

  const claim = useMemo(() => {
    if (!seedClaim) return null;
    return { ...seedClaim, ...(insurance ?? {}) };
  }, [seedClaim, insurance]);

  if (!patient || !claim) {
    return (
      <div className="ipd-page">
        <EmptyState
          title="Patient not found"
          description="This insurance patient record is not available."
          actionLabel="Back to patients"
          onAction={goBack}
        />
      </div>
    );
  }

  return (
    <div className="ipd-page ipd-ins-patient">
      <div className="ipd-ins-patient__header">
        <div className="ipd-ins-patient__intro">
          <h1 className="ipd-page__title">{patient.patientName}</h1>
          <p className="ipd-page__subtitle">
            Patient ID {patient.uhid} · {patient.ageGender} · {patient.phone}
          </p>
          <div className="ipd-ins-patient__coverage">
            <span className="ipd-ins-patient__coverage-label">Coverage Type:</span>
            <span className="ipd-ins-chip ipd-ins-chip--coverage">
              {patient.coverage}
            </span>
          </div>
        </div>
        <div className="ipd-form-actions">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            Edit Insurance
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              navigate(
                ROUTES.IPD_INSURANCE_BILLING.replace(':patientId', patient.id),
                { state: location.state },
              )
            }
          >
            View Billing
          </Button>
          <button
            type="button"
            onClick={goBack}
            className="btn btn--secondary btn--sm"
          >
            Back
          </button>
        </div>
      </div>

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">Insurance Details</h2>
          <span className="ipd-ins-chip ipd-ins-chip--active">
            {claim.policyStatus}
          </span>
        </div>
        <div className="ipd-card__body">
          <dl className="ipd-claim-ins-grid">
            <Fact label="Insurance Company" value={claim.insurer} />
            <Fact label="Policy Number" value={claim.policyNo} />
            <Fact label="Policy Holder" value={claim.policyHolder} />
            <Fact label="Relationship" value={claim.relationship} />
            <Fact
              label="Claimed Amount"
              value={formatIpdMoney(claim.claimed)}
            />
            <Fact
              label="Estimate Amount"
              value={formatIpdMoney(claim.estimateAmount)}
            />
          </dl>
        </div>
      </div>

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">IPD Admissions</h2>
        </div>
        <div className="ipd-card__body">
          <div className="ipd-ins-history-row">
            <div className="ipd-ins-history-row__main">
              <strong>{claim.ipdId}</strong>
              <p className="ipd-page__subtitle">
                {claim.admissionDate} → {claim.dischargeDate} · {claim.doctor} ·{' '}
                {claim.wardRoom}
              </p>
            </div>
            <span className="ipd-ins-chip ipd-ins-chip--coverage">
              {claim.coverage}
            </span>
          </div>
        </div>
      </div>

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">Insurance History</h2>
        </div>
        <div className="ipd-card__body">
          <button
            type="button"
            className="ipd-ins-history-row ipd-ins-history-row--clickable"
            onClick={() =>
              navigate(
                ROUTES.IPD_INSURANCE_CLAIM_DETAIL.replace(
                  ':claimId',
                  claim.id,
                ),
              )
            }
          >
            <div className="ipd-ins-history-row__main">
              <strong>{claim.ipdId}</strong>
              <p className="ipd-page__subtitle">
                {claim.id} · {claim.createdLabel}
              </p>
            </div>
            <div className="ipd-ins-history-row__money">
              <span>Bill {formatIpdMoney(claim.netBill)}</span>
              <span className="ipd-claim-amt--ok">
                Approved {formatIpdMoney(claim.approved)}
              </span>
              <span>Patient {formatIpdMoney(claim.patientResponsibility)}</span>
            </div>
            <span className="ipd-ins-chip ipd-ins-chip--warn">
              {claim.statusLabel}
            </span>
          </button>
        </div>
      </div>

      <div className="ipd-ins-patient__meta">
        <span className="ipd-toolbar__label">Registered On</span>
        <strong>{patient.registeredOn}</strong>
      </div>

      <EditInsuranceModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={claim}
        onSave={(next) => {
          setInsurance((prev) => {
            const merged = { ...(prev ?? {}), ...next };
            const ctx = loadInsuranceAdmitContext(patientId);
            if (ctx?.claim) {
              persistInsuranceAdmitContext(patientId, {
                ...ctx,
                claim: { ...ctx.claim, ...merged },
                patient: {
                  ...ctx.patient,
                  insurer: merged.insurer ?? ctx.patient.insurer,
                  policyNo: merged.policyNo ?? ctx.patient.policyNo,
                },
              });
            }
            if (seedClaim?.id) {
              updateInsuranceClaim(seedClaim.id, merged);
            }
            return merged;
          });
        }}
      />
    </div>
  );
}
