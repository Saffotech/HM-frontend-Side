/**
 * Insurance patient profile — shown when Open is clicked from Patients
 * (Payment type = Insurance). Care team uses the same admission APIs as self-pay.
 */

import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import AdmissionCareTeamEditor from '@/features/ipd/components/AdmissionCareTeamEditor';
import EditInsuranceModal from '@/features/ipd/components/EditInsuranceModal';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import IpdStatusBadge from '@/features/ipd/components/IpdStatusBadge';
import useIpdBackNavigation from '@/features/ipd/hooks/useIpdBackNavigation';
import {
  useIpdInsurancePatientQuery,
  useUpdateIpdInsurancePatientMutation,
} from '@/features/ipd/hooks/useIpdBillingQuery';
import { useIpdAdmissionDetailQuery } from '@/features/ipd/hooks/useIpdQuery';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { mapInsuranceClaim } from '@/features/ipd/utils/mapInsuranceApi';

function Field({ label, children, wide = false }) {
  return (
    <div className={`ipd-pd-field${wide ? ' ipd-pd-field--wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}

function pickAdmissionId(...sources) {
  for (const source of sources) {
    const value = source?.admission_id ?? source?.admissionId ?? null;
    if (value != null && String(value).trim() !== '') return value;
  }
  return null;
}

function formatInsDate(raw) {
  if (raw == null || raw === '' || raw === '—') return '—';
  const text = String(raw).trim();
  if (text.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(text)) {
    return formatIpdDateTime(text);
  }
  return text;
}

function claimChipClass(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('approved') || text.includes('settled') || text.includes('paid')) {
    return 'ipd-ins-chip ipd-ins-chip--active';
  }
  if (text.includes('reject') || text.includes('denied')) {
    return 'ipd-ins-chip ipd-ins-chip--pending';
  }
  return 'ipd-ins-chip ipd-ins-chip--warn';
}

export default function IpdInsurancePatientPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useIpdBackNavigation(
    `${ROUTES.IPD_PATIENTS}?paymentType=insurance_cashless`,
  );
  const { canAdmit } = useIpdPermissionSet();

  const patientQuery = useIpdInsurancePatientQuery(patientId);
  const updatePatientMutation = useUpdateIpdInsurancePatientMutation();
  const navAdmit = location.state?.insuranceAdmit;

  const admissionId =
    pickAdmissionId(
      patientQuery.data?.patient,
      patientQuery.data?.claim,
      navAdmit?.patient,
      navAdmit?.claim,
    ) ?? navAdmit?.admission?.id ?? null;
  const admissionQuery = useIpdAdmissionDetailQuery(admissionId);

  const { patient, claim: seedClaim } = useMemo(() => {
    if (patientQuery.data?.patient && patientQuery.data?.claim) {
      return {
        patient: {
          id: patientQuery.data.patient.id ?? patientQuery.data.patient.uhid,
          patientName:
            patientQuery.data.patient.patientName ??
            patientQuery.data.patient.patient_name,
          ageGender:
            patientQuery.data.patient.ageGender ??
            patientQuery.data.patient.age_gender,
          phone: patientQuery.data.patient.phone,
          uhid: patientQuery.data.patient.uhid,
          coverage: patientQuery.data.patient.coverage,
          registeredOn:
            patientQuery.data.patient.registeredOn ??
            patientQuery.data.patient.registered_on,
        },
        claim: mapInsuranceClaim(patientQuery.data.claim),
      };
    }
    if (navAdmit?.patient && navAdmit?.claim) {
      return { patient: navAdmit.patient, claim: navAdmit.claim };
    }
    return { patient: null, claim: null };
  }, [patientQuery.data, navAdmit]);

  const [editOpen, setEditOpen] = useState(false);
  const [insurance, setInsurance] = useState(null);

  const claim = useMemo(() => {
    if (!seedClaim) return null;
    return { ...seedClaim, ...(insurance ?? {}) };
  }, [seedClaim, insurance]);

  const liveAdmission = admissionQuery.data?.admission ?? null;
  const visits = admissionQuery.data?.doctor_visits ?? [];
  const careTeam = admissionQuery.data?.care_team ?? [];
  const fallbackAdmission =
    !liveAdmission && claim
      ? {
          id: admissionId,
          admission_no: claim.ipdId,
          patient_uid: patient?.uhid,
          ward_name: null,
          bed_number: null,
          doctor_name: claim.doctor,
          department_name: '—',
          status: null,
        }
      : null;
  const admission = liveAdmission ?? fallbackAdmission;
  const wardBed = liveAdmission
    ? `${liveAdmission.ward_name || '—'} / ${liveAdmission.bed_number || '—'}`
    : claim?.wardRoom || '—';

  if (patientQuery.isLoading) {
    return (
      <div className="ipd-page ipd-page--compact">
        <QueryFeedback isLoading />
      </div>
    );
  }

  if (patientQuery.isError) {
    return (
      <div className="ipd-page ipd-page--compact">
        <QueryFeedback
          isError
          error={patientQuery.error}
          onRetry={patientQuery.refetch}
        />
      </div>
    );
  }

  if (!patient || !claim) {
    return (
      <div className="ipd-page ipd-page--compact">
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
    <div className="ipd-page ipd-page--compact ipd-ins-patient">
      <IpdPageHeader
        title={patient.patientName}
        subtitle={[
          patient.uhid ? `Patient ID ${patient.uhid}` : null,
          patient.ageGender,
          patient.phone,
          patient.registeredOn ? `Registered ${formatInsDate(patient.registeredOn)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        middle={
          <div className="ipd-ins-patient__coverage">
            <span className="ipd-ins-patient__coverage-label">Coverage</span>
            <span className="ipd-ins-chip ipd-ins-chip--coverage">
              {patient.coverage}
            </span>
          </div>
        }
        actions={
          <>
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
            <Button type="button" variant="secondary" size="sm" onClick={goBack}>
              Back
            </Button>
          </>
        }
      />

      <div className="ipd-pd-stack">
        <div className="ipd-card">
          <div className="ipd-card__head ipd-pd-head">
            <div className="ipd-pd-head__left">
              <h2 className="ipd-card__title">Insurance details</h2>
              <span className="ipd-ins-chip ipd-ins-chip--active">
                {claim.policyStatus}
              </span>
            </div>
          </div>
          <div className="ipd-card__body ipd-pd-body">
            <dl className="ipd-pd-grid">
              <Field label="Insurance Company">{claim.insurer}</Field>
              <Field label="Policy Number">{claim.policyNo}</Field>
              <Field label="Policy Holder">{claim.policyHolder}</Field>
              <Field label="Relationship">{claim.relationship}</Field>
              <Field label="Claimed Amount">
                {formatCurrency(claim.claimed, { empty: '—' })}
              </Field>
              <Field label="Estimate Amount">
                {formatCurrency(claim.estimateAmount, { empty: '—' })}
              </Field>
            </dl>
          </div>
        </div>

        <div className="ipd-card">
          <div className="ipd-card__head ipd-pd-head">
            <div className="ipd-pd-head__left">
              <h2 className="ipd-card__title">Admission</h2>
              {liveAdmission?.status ? (
                <IpdStatusBadge status={liveAdmission.status} />
              ) : (
                <span className="ipd-ins-chip ipd-ins-chip--coverage">
                  {claim.coverage}
                </span>
              )}
            </div>
          </div>
          <div className="ipd-card__body ipd-pd-body">
            {admissionQuery.isLoading ? (
              <div className="ipd-pl-skeletons">
                <div className="ipd-skeleton" />
                <div className="ipd-skeleton" />
                <div className="ipd-skeleton" />
              </div>
            ) : (
              <>
                <dl className="ipd-pd-grid">
                  <Field label="Admission No.">
                    {liveAdmission?.admission_no || claim.ipdId}
                  </Field>
                  <Field label="Patient ID">
                    {liveAdmission?.patient_uid || patient.uhid}
                  </Field>
                  <Field label="Ward / Bed">{wardBed}</Field>
                  <Field label="Length of stay">
                    {liveAdmission?.length_of_stay_days != null
                      ? `${liveAdmission.length_of_stay_days} day(s)`
                      : '—'}
                  </Field>
                  <Field label="Admitted">
                    {liveAdmission?.admitted_at
                      ? formatIpdDateTime(liveAdmission.admitted_at)
                      : formatInsDate(claim.admissionDate)}
                  </Field>
                  <Field label="Discharged">
                    {liveAdmission?.discharged_at
                      ? formatIpdDateTime(liveAdmission.discharged_at)
                      : liveAdmission?.status === 'admitted'
                        ? 'Still admitted'
                        : formatInsDate(claim.dischargeDate)}
                  </Field>
                </dl>

                {admissionQuery.isError ? (
                  <p className="ipd-pd-muted" style={{ marginTop: '0.75rem' }}>
                    Admission detail could not be loaded. Care team add/remove
                    needs a live admission.
                  </p>
                ) : (
                  <div className="ipd-pd-care">
                    <div className="ipd-pd-care__label">Care team</div>
                    <AdmissionCareTeamEditor
                      admission={admission}
                      visits={visits}
                      careTeam={careTeam}
                      canEdit={canAdmit}
                      compact
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="ipd-card">
          <div className="ipd-card__head ipd-pd-head">
            <div className="ipd-pd-head__left">
              <h2 className="ipd-card__title">Insurance history</h2>
            </div>
          </div>
          <div className="ipd-card__body ipd-pd-body">
            <div className="ipd-ins-history-row ipd-ins-history-row--card">
              <div className="ipd-ins-history-row__main">
                <strong>{claim.ipdId}</strong>
                <p className="ipd-page__subtitle">
                  {formatInsDate(claim.createdLabel || claim.admissionDate)}
                </p>
              </div>
              <div className="ipd-ins-history-row__money">
                <span>
                  <em>Bill</em> {formatCurrency(claim.netBill, { empty: '—' })}
                </span>
                <span className="ipd-claim-amt--ok">
                  <em>Estimate</em>{' '}
                  {formatCurrency(claim.estimateAmount, { empty: '—' })}
                </span>
              </div>
              <span className={claimChipClass(claim.statusLabel)}>
                {claim.statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <EditInsuranceModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={claim}
        onSave={async (next) => {
          try {
            await updatePatientMutation.mutateAsync({
              patientId,
              payload: next,
            });
            setInsurance((prev) => ({ ...(prev ?? {}), ...next }));
            toast.success('Insurance details updated');
          } catch {
            // mutationOnError already toasts
          }
        }}
      />
    </div>
  );
}
