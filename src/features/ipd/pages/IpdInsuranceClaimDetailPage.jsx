/**
 * Insurance claim detail — status actions and payments.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import useIpdBackNavigation from '@/features/ipd/hooks/useIpdBackNavigation';
import AddInsurancePaymentModal from '@/features/ipd/components/AddInsurancePaymentModal';
import AddPatientPaymentModal from '@/features/ipd/components/AddPatientPaymentModal';
import ClaimStatusActionModal from '@/features/ipd/components/ClaimStatusActionModal';
import CloseClaimConfirmModal from '@/features/ipd/components/CloseClaimConfirmModal';
import UpdateApprovedAmountModal from '@/features/ipd/components/UpdateApprovedAmountModal';
import {
  CLAIM_STATUS,
  canTransitionClaimStatus,
  claimStatusChipClass,
  resolveStatusFromApprovedAmount,
} from '@/features/ipd/utils/claimStatusConstants';
import { recalculateClaimFinancials } from '@/features/ipd/utils/insuranceClaimFinancials';
import { mapInsuranceClaim } from '@/features/ipd/utils/mapInsuranceApi';
import {
  useAddIpdInsurancePatientPaymentMutation,
  useAddIpdInsurancePaymentMutation,
  useIpdInsuranceClaimQuery,
  useUpdateIpdInsuranceClaimMutation,
} from '@/features/ipd/hooks/useIpdBillingQuery';
import { formatIpdMoney } from '@/features/ipd/utils/ipdFormat';
import { toast } from '@/shared/utils/toast';

const TABS = [
  { id: 'responsibility', label: 'Patient Responsibility' },
  { id: 'insPayments', label: 'Insurance Payments' },
  { id: 'patientPayments', label: 'Patient Payments' },
];

const REASON_OPTIONS = [
  'Copay',
  'Non-covered medicines',
  'Room-rent difference',
  'Other',
];

function money(n) {
  return formatIpdMoney(n);
}

function Field({ label, value, tone, fullRow = false }) {
  return (
    <div
      className={`ipd-claim-kv${fullRow ? ' ipd-claim-kv--full-row' : ''}`}
    >
      <dt>{label}</dt>
      <dd className={tone ? `ipd-claim-amt--${tone}` : undefined}>{value}</dd>
    </div>
  );
}

export default function IpdInsuranceClaimDetailPage() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const claimQuery = useIpdInsuranceClaimQuery(claimId);
  const updateClaimMutation = useUpdateIpdInsuranceClaimMutation();
  const addInsurancePaymentMutation = useAddIpdInsurancePaymentMutation();
  const addPatientPaymentMutation = useAddIpdInsurancePatientPaymentMutation();
  const loadedClaim = useMemo(
    () => (claimQuery.data ? mapInsuranceClaim(claimQuery.data) : null),
    [claimQuery.data],
  );
  const goBack = useIpdBackNavigation(
    loadedClaim?.patientId
      ? ROUTES.IPD_INSURANCE_PATIENT.replace(
          ':patientId',
          String(loadedClaim.patientId),
        )
      : ROUTES.IPD_PATIENTS,
  );
  const initialClaim = loadedClaim;

  const [claim, setClaim] = useState(initialClaim);
  const [claimedAmount, setClaimedAmount] = useState(
    String(initialClaim?.claimed ?? ''),
  );
  const [lines, setLines] = useState(initialClaim?.responsibilityLines ?? []);
  const [newReason, setNewReason] = useState('Copay');
  const [newAmount, setNewAmount] = useState('');
  const [tab, setTab] = useState('responsibility');
  const [insPayOpen, setInsPayOpen] = useState(false);
  const [patPayOpen, setPatPayOpen] = useState(false);
  const [statusAction, setStatusAction] = useState(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [updateApprovedOpen, setUpdateApprovedOpen] = useState(false);
  const [insurancePayments, setInsurancePayments] = useState(
    initialClaim?.insurancePayments ?? [],
  );
  const [patientPayments, setPatientPayments] = useState(
    initialClaim?.patientPayments ?? [],
  );

  useEffect(() => {
    const next = loadedClaim;
    setClaim(next);
    setClaimedAmount(String(next?.claimed ?? ''));
    setLines(next?.responsibilityLines ?? []);
    setInsurancePayments(next?.insurancePayments ?? []);
    setPatientPayments(next?.patientPayments ?? []);
  }, [claimId, loadedClaim]);

  const insurancePatient = useMemo(
    () => (claim?.patientId ? { id: claim.patientId } : null),
    [claim],
  );

  const breakdownTotal = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
    [lines],
  );

  const isClosed = claim?.status === CLAIM_STATUS.CLOSED;
  const canClose =
    claim?.status === CLAIM_STATUS.APPROVED ||
    claim?.status === CLAIM_STATUS.PARTIALLY_APPROVED ||
    claim?.status === CLAIM_STATUS.REJECTED;
  const canUpdateApproved =
    claim?.status === CLAIM_STATUS.APPROVED ||
    claim?.status === CLAIM_STATUS.PARTIALLY_APPROVED;

  const applyClaimUpdate = (patch) => {
    if (!claim) return null;
    const financials = recalculateClaimFinancials(claim, {
      ...patch,
      responsibilityLines: lines,
    });
    const updated = {
      ...claim,
      ...patch,
      ...financials,
      responsibilityLines: lines,
    };
    setClaim(updated);
    setClaimedAmount(String(updated.claimed ?? ''));
    updateClaimMutation.mutate({ claimId, payload: updated });
    return updated;
  };

  const handleStatusAction = ({ status, claimedAmount: claimed, approvedAmount, changeReason }) => {
    if (!canTransitionClaimStatus(claim.status, status)) {
      toast.error('This status change is not allowed.');
      return;
    }
    const updated = applyClaimUpdate({
      status,
      claimed,
      approved: approvedAmount,
      changeReason,
    });
    if (updated) {
      toast.success(`Claim marked as ${updated.statusLabel}`);
    }
  };

  const handleCloseClaim = () => {
    if (!canTransitionClaimStatus(claim.status, CLAIM_STATUS.CLOSED)) {
      toast.error('This claim cannot be closed from its current status.');
      return;
    }
    const updated = applyClaimUpdate({ status: CLAIM_STATUS.CLOSED });
    if (updated) {
      toast.success('Claim closed');
      setCloseConfirmOpen(false);
    }
  };

  const handleUpdateApprovedAmount = ({ approvedAmount, changeReason }) => {
    const nextStatus = resolveStatusFromApprovedAmount(claim.claimed, approvedAmount);
    const updated = applyClaimUpdate({
      approved: approvedAmount,
      status: nextStatus,
      changeReason: changeReason || claim.changeReason,
    });
    if (updated) {
      toast.success('Approved amount added');
      setUpdateApprovedOpen(false);
    }
  };

  const handleSaveClaimedAmount = () => {
    const claimed = Number(claimedAmount);
    if (Number.isNaN(claimed) || claimed <= 0) {
      toast.error('Enter a valid claimed amount.');
      return;
    }
    const updated = applyClaimUpdate({ claimed });
    if (updated) toast.success('Claimed amount saved');
  };

  if (claimQuery.isLoading) {
    return (
      <div className="ipd-page">
        <QueryFeedback isLoading />
      </div>
    );
  }

  if (claimQuery.isError) {
    return (
      <div className="ipd-page">
        <IpdPageHeader
          title="Insurance Claim"
          actions={
            <button type="button" onClick={goBack} className="btn btn--secondary">
              Back
            </button>
          }
        />
        <QueryFeedback
          isError
          error={claimQuery.error}
          onRetry={claimQuery.refetch}
        />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="ipd-page">
        <IpdPageHeader
          title="Insurance Claim"
          actions={
            <button type="button" onClick={goBack} className="btn btn--secondary">
              Back
            </button>
          }
        />
        <EmptyState title="Claim not found" />
      </div>
    );
  }

  const addLine = () => {
    const amount = Number(newAmount);
    if (!newReason || Number.isNaN(amount) || amount <= 0) return;
    const nextLines = [
      ...lines,
      { id: `r-${Date.now()}`, reason: newReason, amount },
    ];
    setLines(nextLines);
    const financials = recalculateClaimFinancials(claim, {
      responsibilityLines: nextLines,
    });
    const updated = {
      ...claim,
      responsibilityLines: nextLines,
      ...financials,
    };
    setClaim(updated);
    updateClaimMutation.mutate({ claimId, payload: updated });
    setNewAmount('');
  };

  return (
    <div className="ipd-page ipd-claim-detail">
      <IpdPageHeader
        title={`Claim ${claim.id}`}
        subtitle={`${claim.patientName} · Patient ID ${claim.uhid} · ${claim.ipdId} · Created ${claim.createdLabel}`}
        actions={
          <>
            <span
              className={`ipd-ins-chip ${claimStatusChipClass(claim.status)}`}
            >
              {claim.statusLabel}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setInsPayOpen(true)}
              disabled={isClosed}
            >
              Add Insurance Payment
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPatPayOpen(true)}
              disabled={isClosed}
            >
              Add Patient Payment
            </Button>
            <button
              type="button"
              onClick={goBack}
              className="btn btn--secondary btn--sm"
            >
              Back
            </button>
          </>
        }
      />

      <div className="ipd-claim-three">
        <div className="ipd-card">
          <div className="ipd-card__head">
            <h2 className="ipd-card__title">Claim Review &amp; Approval</h2>
          </div>
          <div className="ipd-card__body ipd-claim-facts ipd-claim-review-grid">
            <Field
              label="Claim Status"
              value={
                <span
                  className={`ipd-ins-chip ${claimStatusChipClass(claim.status)}`}
                >
                  {claim.statusLabel}
                </span>
              }
            />

            {claim.status === CLAIM_STATUS.SUBMITTED ? (
              <>
                <div className="ipd-claim-kv">
                  <dt>
                    <label htmlFor="ipd-cd-claimed">Claimed Amount (₹)</label>
                  </dt>
                  <dd>
                    <input
                      id="ipd-cd-claimed"
                      className="ipd-input"
                      value={claimedAmount}
                      onChange={(e) => setClaimedAmount(e.target.value)}
                      inputMode="decimal"
                    />
                  </dd>
                </div>
                <div className="ipd-claim-status-actions">
                  <Button type="button" variant="secondary" size="sm" onClick={handleSaveClaimedAmount}>
                    Save Claimed Amount
                  </Button>
                  <Button type="button" size="sm" onClick={() => setStatusAction('approve')}>
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setStatusAction('partially_approve')}
                  >
                    Partially Approve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setStatusAction('reject')}
                  >
                    Reject
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Field label="Claimed Amount" value={money(claim.claimed)} />
                {(claim.status === CLAIM_STATUS.APPROVED ||
                  claim.status === CLAIM_STATUS.PARTIALLY_APPROVED) && (
                  <Field
                    fullRow
                    label="Approved Amount"
                    value={
                      <span className="ipd-claim-amt--ok">
                        {money(claim.approved)}
                      </span>
                    }
                  />
                )}
                {claim.changeReason ? (
                  <Field fullRow label="Reason" value={claim.changeReason} />
                ) : null}
                {canUpdateApproved || canClose ? (
                  <div className="ipd-claim-status-actions">
                    {canUpdateApproved ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setUpdateApprovedOpen(true)}
                      >
                        Add Approved Amount
                      </Button>
                    ) : null}
                    {canClose ? (
                      <Button type="button" size="sm" onClick={() => setCloseConfirmOpen(true)}>
                        Close Claim
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {isClosed ? (
                  <p className="ipd-page__subtitle">
                    This claim is closed. No further status changes are allowed.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="ipd-card">
          <div className="ipd-card__head">
            <h2 className="ipd-card__title">Patient &amp; IPD</h2>
          </div>
          <div className="ipd-card__body">
            <dl className="ipd-claim-facts">
              <Field label="Patient" value={claim.patientName} />
              <Field label="Patient ID" value={claim.uhid} />
              <Field label="Age / Gender" value={claim.ageGender} />
              <Field label="IPD Admission" value={claim.ipdId} />
              <Field label="Admission Date" value={claim.admissionDate} />
              <Field label="Discharge Date" value={claim.dischargeDate} />
              <Field label="Doctor" value={claim.doctor} />
              <Field label="Ward / Room" value={claim.wardRoom} />
            </dl>
          </div>
        </div>

        <div className="ipd-card">
          <div className="ipd-card__head">
            <h2 className="ipd-card__title">Hospital Billing</h2>
          </div>
          <div className="ipd-card__body">
            <dl className="ipd-claim-kv-list ipd-claim-billing-list">
              <Field
                label="Gross Bill"
                value={
                  <span className="ipd-claim-strike">{money(claim.grossBill)}</span>
                }
              />
              <Field
                label="Discount"
                value={
                  <span className="ipd-claim-strike">{money(claim.discount)}</span>
                }
              />
              <div className="ipd-claim-divider" />
              <Field label="Net Hospital Bill" value={money(claim.netBill)} />
              <div className="ipd-claim-divider" />
              <Field label="Claimed Amount" value={money(claim.claimed)} />
              <Field
                label="Approved Amount"
                value={money(claim.approved)}
                tone="ok"
              />
              <Field
                label="Rejected / Not Approved"
                value={money(claim.notApproved)}
                tone="warn"
              />
              <Field
                label="Patient Responsibility"
                value={money(claim.patientResponsibility)}
              />
            </dl>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="ipd-claim-billing-btn"
              disabled={!insurancePatient?.id}
              onClick={() => {
                if (!insurancePatient?.id) return;
                navigate(
                  ROUTES.IPD_INSURANCE_BILLING.replace(
                    ':patientId',
                    insurancePatient.id,
                  ),
                );
              }}
            >
              Open IPD Bill
            </Button>
          </div>
        </div>
      </div>

      <div className="ipd-card">
        <div className="ipd-card__body ipd-claim-summary-grid">
          <section>
            <h3 className="ipd-claim-section-label">Hospital &amp; claim</h3>
            <dl className="ipd-claim-kv-list">
              <Field label="Net Hospital Bill" value={money(claim.netBill)} />
              <Field label="Insurance Claim Amount" value={money(claim.claimed)} />
              <Field
                label="Insurance Approved"
                value={money(claim.approved)}
                tone="ok"
              />
              <Field
                label="Not Approved"
                value={money(claim.notApproved)}
                tone="warn"
              />
            </dl>
          </section>
          <section>
            <h3 className="ipd-claim-section-label">
              Insurance collection
              <span className="ipd-ins-chip ipd-ins-chip--warn">
                {claim.insPaymentLabel}
              </span>
            </h3>
            <dl className="ipd-claim-kv-list">
              <Field
                label="Insurance Received"
                value={money(claim.insReceived)}
                tone="ok"
              />
              <Field
                label="Insurance Outstanding"
                value={money(claim.insOutstanding)}
                tone="due"
              />
            </dl>
          </section>
          <section>
            <h3 className="ipd-claim-section-label">
              Patient collection
              <span className="ipd-ins-chip ipd-ins-chip--warn">
                {claim.patientPaymentLabel}
              </span>
            </h3>
            <dl className="ipd-claim-kv-list">
              <Field
                label="Patient Responsibility"
                value={money(claim.patientResponsibility)}
              />
              <Field
                label="Patient Paid"
                value={money(claim.patientPaid)}
                tone="ok"
              />
              <Field
                label="Patient Outstanding"
                value={money(claim.patientOutstanding)}
                tone="due"
              />
            </dl>
          </section>
        </div>
      </div>

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">Insurance</h2>
          <span className="ipd-ins-chip ipd-ins-chip--active">
            {claim.policyStatus}
          </span>
        </div>
        <div className="ipd-card__body">
          <dl className="ipd-claim-ins-grid">
            <Field label="Insurance Company" value={claim.insurer} />
            <Field label="Policy Number" value={claim.policyNo} />
            <Field label="Policy Holder" value={claim.policyHolder} />
            <Field label="Relationship" value={claim.relationship} />
            <Field label="Claimed Amount" value={money(claim.claimed)} />
            <Field
              label="Estimate Amount"
              value={money(claim.estimateAmount)}
            />
          </dl>
        </div>
      </div>

      <div className="ipd-card">
        <div className="ipd-claim-tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`ipd-claim-tabs__btn${
                tab === item.id ? ' ipd-claim-tabs__btn--active' : ''
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ipd-card__body">
          {tab === 'responsibility' ? (
            <>
              <h3 className="ipd-card__title">Patient Responsibility Breakdown</h3>
              <div className="ipd-table-wrap">
                <table className="ipd-table ipd-table--claim-lines">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th>Amount</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.reason}</td>
                        <td>{money(line.amount)}</td>
                        <td>
                          <button
                            type="button"
                            className="ipd-text-link"
                            disabled={isClosed}
                            onClick={() => {
                              const nextLines = lines.filter(
                                (item) => item.id !== line.id,
                              );
                              setLines(nextLines);
                              const financials = recalculateClaimFinancials(claim, {
                                responsibilityLines: nextLines,
                              });
                              const updated = {
                                ...claim,
                                responsibilityLines: nextLines,
                                ...financials,
                              };
                              setClaim(updated);
                              updateClaimMutation.mutate({ claimId, payload: updated });
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ipd-claim-line-totals">
                <div>
                  <span>Breakdown Total</span>
                  <strong>{money(breakdownTotal)}</strong>
                </div>
                <div className="ipd-page__subtitle">
                  <span>Applied Patient Responsibility</span>
                  <span>{money(claim.patientResponsibility)}</span>
                </div>
              </div>
              {!isClosed ? (
                <div className="ipd-claim-add-line">
                  <div className="ipd-toolbar__field">
                    <label className="ipd-toolbar__label" htmlFor="ipd-cd-line-reason">
                      Reason
                    </label>
                    <select
                      id="ipd-cd-line-reason"
                      className="ipd-select"
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                    >
                      {REASON_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ipd-toolbar__field">
                    <label className="ipd-toolbar__label" htmlFor="ipd-cd-line-amt">
                      Amount (₹)
                    </label>
                    <input
                      id="ipd-cd-line-amt"
                      className="ipd-input"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={addLine}>
                    Add Line
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}

          {tab === 'insPayments' ? (
            <>
              <div className="ipd-claim-tab-head">
                <h3 className="ipd-card__title">Insurance Payments Received</h3>
                {!isClosed ? (
                  <Button type="button" size="sm" onClick={() => setInsPayOpen(true)}>
                    + Add Insurance Payment
                  </Button>
                ) : null}
              </div>
              <div className="ipd-table-wrap">
                <table className="ipd-table">
                  <thead>
                    <tr>
                      <th>Payment ID</th>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Reference</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insurancePayments.map((pay) => (
                      <tr key={pay.id}>
                        <td>
                          <strong>{pay.id}</strong>
                        </td>
                        <td>{pay.date}</td>
                        <td>{pay.mode}</td>
                        <td>{pay.reference}</td>
                        <td>{money(pay.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ipd-claim-line-totals">
                <div>
                  <span>Total Received</span>
                  <strong>{money(claim.insReceived)}</strong>
                </div>
                <div className="ipd-claim-amt--due">
                  <span>Insurance Outstanding</span>
                  <span>{money(claim.insOutstanding)}</span>
                </div>
              </div>
            </>
          ) : null}

          {tab === 'patientPayments' ? (
            <>
              <div className="ipd-claim-tab-head">
                <h3 className="ipd-card__title">Patient Payments</h3>
                {!isClosed ? (
                  <Button type="button" size="sm" onClick={() => setPatPayOpen(true)}>
                    Add Patient Payment
                  </Button>
                ) : null}
              </div>
              <div className="ipd-table-wrap">
                <table className="ipd-table">
                  <thead>
                    <tr>
                      <th>Payment ID</th>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Reference</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientPayments.map((pay) => (
                      <tr key={pay.id}>
                        <td>
                          <strong>{pay.id}</strong>
                        </td>
                        <td>{pay.date}</td>
                        <td>{pay.mode}</td>
                        <td>{pay.reference}</td>
                        <td>{money(pay.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ipd-claim-line-totals">
                <div>
                  <span>Total Paid</span>
                  <strong>{money(claim.patientPaid)}</strong>
                </div>
                <div className="ipd-claim-amt--due">
                  <span>Patient Outstanding</span>
                  <span>{money(claim.patientOutstanding)}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ClaimStatusActionModal
        open={Boolean(statusAction)}
        actionType={statusAction}
        claimedAmount={Number(claimedAmount) || claim.claimed}
        onClose={() => setStatusAction(null)}
        onConfirm={handleStatusAction}
      />

      <CloseClaimConfirmModal
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={handleCloseClaim}
      />

      <UpdateApprovedAmountModal
        open={updateApprovedOpen}
        claimedAmount={claim.claimed}
        currentApprovedAmount={claim.approved}
        onClose={() => setUpdateApprovedOpen(false)}
        onConfirm={handleUpdateApprovedAmount}
      />

      <AddInsurancePaymentModal
        open={insPayOpen}
        onClose={() => setInsPayOpen(false)}
        outstanding={claim.insOutstanding}
        onSave={(payment) => {
          addInsurancePaymentMutation.mutate({
            claimId,
            payload: payment,
          });
          setTab('insPayments');
        }}
      />

      <AddPatientPaymentModal
        open={patPayOpen}
        onClose={() => setPatPayOpen(false)}
        outstanding={claim.patientOutstanding}
        onSave={(payment) => {
          addPatientPaymentMutation.mutate({
            claimId,
            payload: payment,
          });
          setTab('patientPayments');
        }}
      />
    </div>
  );
}
