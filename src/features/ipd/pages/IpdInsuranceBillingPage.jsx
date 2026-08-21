/**
 * Insurance IPD billing — charge breakdown with add/remove (dummy until API).
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Printer, ChevronDown } from 'lucide-react';
import { Button, DateInput, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdInsuranceBillPrintSheet from '@/features/ipd/components/IpdInsuranceBillPrintSheet';
import useIpdBackNavigation from '@/features/ipd/hooks/useIpdBackNavigation';
import {
  useIpdInsuranceBillingBundleQuery,
  useSaveIpdDailyBillingMutation,
  useSaveIpdFinalBillingMutation,
  useSaveIpdInsuranceClaimMutation,
} from '@/features/ipd/hooks/useIpdBillingQuery';
import { initChargeHeadsFromClaim } from '@/features/ipd/billing/ipdBillingMapper';
import { buildInsuranceIpdBillPrintModel } from '@/features/ipd/utils/buildInsuranceIpdBillPrintModel';
import { formatIpdMoney } from '@/features/ipd/utils/ipdFormat';
import {
  calculateInsuranceChargeTotals,
  cloneDefaultChargeHeads,
  createCustomChargeHead,
  isDefaultChargeHead,
  isDiscountCharge,
  normalizeInsuranceChargeHeads,
  sortInsuranceChargeHeads,
} from '@/features/ipd/utils/insuranceChargeHeads';
import {
  calculateDailyChargesTotal,
  createDailyCharge,
  getDailyChargeItemPlaceholder,
  groupDailyChargesByDate,
  initDailyCharges,
  patchDailyCharge,
  sortDailyCharges,
} from '@/features/ipd/utils/insuranceDailyCharges';
import { toast } from '@/shared/utils/toast';
import IpdDailyChargesGroupItems from '@/features/ipd/components/IpdDailyChargesGroupItems';

function Fact({ label, value }) {
  return (
    <div className="ipd-claim-kv">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}

function money(n) {
  return formatIpdMoney(n);
}

function formatChargeDate(iso) {
  if (!iso) return '—';
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function groupHospitalChargeBuckets(chargeRows) {
  const buckets = [
    { id: 'clinical', label: 'Stay & clinical', rows: [] },
    { id: 'diagnostics', label: 'Lab & pharmacy', rows: [] },
    { id: 'adjustments', label: 'Misc & discount', rows: [] },
    { id: 'custom', label: 'Additional heads', rows: [] },
  ];

  chargeRows.forEach((row) => {
    if (!isDefaultChargeHead(row)) {
      buckets[3].rows.push(row);
    } else if (isDiscountCharge(row) || row.id === 'misc') {
      buckets[2].rows.push(row);
    } else if (row.id === 'lab' || row.id === 'pharmacy') {
      buckets[1].rows.push(row);
    } else {
      buckets[0].rows.push(row);
    }
  });

  return buckets.filter((bucket) => bucket.rows.length > 0);
}

function initCharges(claim) {
  return initChargeHeadsFromClaim(claim);
}

export default function IpdInsuranceBillingPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const insuranceAdmit = location.state?.insuranceAdmit;
  const goBack = useIpdBackNavigation(
    `${ROUTES.IPD_BILLING}?paymentType=insurance_cashless`,
  );

  const bundleQuery = useIpdInsuranceBillingBundleQuery({
    patientId,
    insuranceAdmit,
  });
  const saveFinalBillingMutation = useSaveIpdFinalBillingMutation();
  const saveDailyBillingMutation = useSaveIpdDailyBillingMutation();
  const saveClaimMutation = useSaveIpdInsuranceClaimMutation();

  const patient = bundleQuery.data?.patient;
  const claim = bundleQuery.data?.claim;

  const [charges, setCharges] = useState(() => initCharges(claim));
  const [useInsurance, setUseInsurance] = useState(true);
  const [focusHead, setFocusHead] = useState('room');
  const [newHeadLabel, setNewHeadLabel] = useState('');
  const [newHeadAmount, setNewHeadAmount] = useState('');
  const [savedClaim, setSavedClaim] = useState(claim);
  const [claimedInput, setClaimedInput] = useState(
    () => (claim?.claimed != null && claim.claimed !== '' ? String(claim.claimed) : ''),
  );
  const [estimateInput, setEstimateInput] = useState(
    () =>
      claim?.estimateAmount != null && claim.estimateAmount !== ''
        ? String(claim.estimateAmount)
        : '',
  );
  const [patientPayInput, setPatientPayInput] = useState('');
  const [claimEditing, setClaimEditing] = useState(false);
  const [dailyCharges, setDailyCharges] = useState(() => initDailyCharges(claim));
  const [newDailyDate, setNewDailyDate] = useState(todayIsoDate);
  const [newDailyHead, setNewDailyHead] = useState('Pharmacy');
  const [newDailyItem, setNewDailyItem] = useState('');
  const [newDailyQty, setNewDailyQty] = useState('1');
  const [newDailyAmount, setNewDailyAmount] = useState('');
  const [expandedDailyDate, setExpandedDailyDate] = useState(null);

  useEffect(() => {
    if (!claim) return;
    setCharges(initCharges(claim));
    setSavedClaim(claim);
    setClaimedInput(
      claim.claimed != null && claim.claimed !== '' ? String(claim.claimed) : '',
    );
    setEstimateInput(
      claim.estimateAmount != null && claim.estimateAmount !== ''
        ? String(claim.estimateAmount)
        : '',
    );
    setPatientPayInput('');
    setClaimEditing(false);
    setDailyCharges(initDailyCharges(claim));
    setExpandedDailyDate(null);
  }, [claim?.id]);

  const totals = useMemo(
    () => calculateInsuranceChargeTotals(charges),
    [charges],
  );

  const dailyChargeGroups = useMemo(
    () => groupDailyChargesByDate(dailyCharges),
    [dailyCharges],
  );

  const hospitalChargeBuckets = useMemo(
    () => groupHospitalChargeBuckets(charges),
    [charges],
  );

  const printModel = useMemo(() => {
    const activeClaim = savedClaim ?? claim;
    if (!patient || !activeClaim) return null;
    return buildInsuranceIpdBillPrintModel({
      claim: activeClaim,
      patient,
      charges,
      grossBill: totals.displayGross,
      useInsurance,
    });
  }, [claim, savedClaim, patient, charges, totals.displayGross, useInsurance]);

  const onPrint = () => {
    if (!printModel) return;
    window.print();
  };

  if (bundleQuery.isLoading) {
    return (
      <div className="ipd-page">
        <QueryFeedback loading />
      </div>
    );
  }

  if (!patient || !claim) {
    return (
      <div className="ipd-page">
        <EmptyState
          title="Billing not found"
          actionLabel="Back to bills"
          onAction={goBack}
        />
      </div>
    );
  }

  const setAmount = (id, value) => {
    setCharges((prev) =>
      prev.map((row) => (row.id === id ? { ...row, amount: value } : row)),
    );
  };

  const setLabel = (id, value) => {
    setCharges((prev) =>
      prev.map((row) => (row.id === id ? { ...row, label: value } : row)),
    );
  };

  const removeCharge = (id) => {
    setCharges((prev) => prev.filter((row) => row.id !== id));
  };

  const addChargeHead = () => {
    const label = newHeadLabel.trim();
    if (!label) {
      toast.error('Enter a charge head name');
      return;
    }
    const amount = Number(newHeadAmount) || 0;
    setCharges((prev) =>
      sortInsuranceChargeHeads([
        ...prev,
        createCustomChargeHead(label, amount),
      ]),
    );
    setNewHeadLabel('');
    setNewHeadAmount('');
    toast.success('Charge head added — save to keep changes');
  };

  const handleSaveCharges = () => {
    saveFinalBillingMutation.mutate(
      {
        claimId: claim.id,
        charges,
        patientId,
        insuranceAdmit,
      },
      {
        onSuccess: (bundle) => {
          if (!bundle?.claim) {
            toast.error('Unable to save charges');
            return;
          }
          setSavedClaim(bundle.claim);
          setCharges(
            sortInsuranceChargeHeads(
              normalizeInsuranceChargeHeads(bundle.claim.charges),
            ),
          );
          toast.success('Hospital charges saved');
        },
        onError: () => toast.error('Unable to save charges'),
      },
    );
  };

  const updateDailyCharge = (id, patch) => {
    setDailyCharges((prev) =>
      sortDailyCharges(
        prev.map((row) =>
          row.id === id ? patchDailyCharge(row, patch) : row,
        ),
      ),
    );
  };

  const removeDailyCharge = (id) => {
    setDailyCharges((prev) => prev.filter((row) => row.id !== id));
  };

  const addDailyCharge = () => {
    const amount = Number(newDailyAmount);
    const quantity = Number(newDailyQty);
    const itemName = newDailyItem.trim();
    if (!newDailyDate) {
      toast.error('Select a charge date');
      return;
    }
    if (!itemName) {
      toast.error(`Enter ${getDailyChargeItemPlaceholder(newDailyHead).toLowerCase()}`);
      return;
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const created = createDailyCharge({
      charge_date: newDailyDate,
      head: newDailyHead,
      item_name: itemName,
      quantity,
      amount,
    });
    if (!created) {
      toast.error('Unable to add daily charge');
      return;
    }
    setDailyCharges((prev) => sortDailyCharges([...prev, created]));
    setNewDailyItem('');
    setNewDailyQty('1');
    setNewDailyAmount('');
    setExpandedDailyDate(newDailyDate);
    toast.success('Daily charge added — save to keep');
  };

  const toggleDailyDate = (date) => {
    setExpandedDailyDate((prev) => (prev === date ? null : date));
  };

  const handleSaveDailyCharges = () => {
    const invalid = dailyCharges.find((row) => !String(row.item_name ?? '').trim());
    if (invalid) {
      toast.error('Every row needs an item name (medicine, treatment, etc.)');
      return;
    }
    saveDailyBillingMutation.mutate(
      {
        claimId: claim.id,
        dailyCharges,
        patientId,
        insuranceAdmit,
      },
      {
        onSuccess: (bundle) => {
          if (!bundle?.claim) {
            toast.error('Unable to save daily charges');
            return;
          }
          setSavedClaim(bundle.claim);
          setDailyCharges(initDailyCharges(bundle.claim));
          setCharges(
            sortInsuranceChargeHeads(
              normalizeInsuranceChargeHeads(bundle.claim.charges),
            ),
          );
          toast.success('Daily charges saved · hospital totals updated');
        },
        onError: () => toast.error('Unable to save daily charges'),
      },
    );
  };

  const handleSaveClaimAmounts = () => {
    const claimed = Number(claimedInput) || 0;
    const estimateAmount = String(estimateInput).trim()
      ? Number(estimateInput)
      : 0;
    const addPay = String(patientPayInput).trim()
      ? Number(patientPayInput)
      : 0;
    const alreadyPaid =
      Number((savedClaim ?? claim).patientPaid) || 0;
    if (Number.isNaN(claimed) || claimed < 0) {
      toast.error('Enter a valid claim amount');
      return;
    }
    if (Number.isNaN(estimateAmount) || estimateAmount < 0) {
      toast.error('Enter a valid estimate amount');
      return;
    }
    if (Number.isNaN(addPay) || addPay < 0) {
      toast.error('Enter a valid patient pay amount');
      return;
    }
    const patientPaid = alreadyPaid + addPay;
    saveClaimMutation.mutate(
      {
        claimId: claim.id,
        patch: {
          claimed,
          estimateAmount,
          patientPaid,
        },
        patientId,
        insuranceAdmit,
      },
      {
        onSuccess: (bundle) => {
          if (!bundle?.claim) {
            toast.error('Unable to save claim amounts');
            return;
          }
          setSavedClaim(bundle.claim);
          setPatientPayInput('');
          setClaimEditing(false);
          toast.success(
            addPay > 0
              ? `Patient pay added · total ${money(patientPaid)}`
              : 'Insurance claim updated',
          );
        },
        onError: () => toast.error('Unable to save claim amounts'),
      },
    );
  };

  const actualBill = Number(totals.displayGross) || 0;
  const estimateAmount = Number(estimateInput) || 0;
  const insuranceCovered = estimateAmount;
  const outstandingAmount = Math.max(0, actualBill - insuranceCovered);
  const patientPayable = Math.max(0, actualBill - estimateAmount);
  const alreadyPaid = Number((savedClaim ?? claim).patientPaid) || 0;
  const addPay = Number(patientPayInput) || 0;
  const patientPay = alreadyPaid + addPay;
  const patientPayOutstanding = Math.max(0, patientPayable - patientPay);
  const dailyChargesTotal = calculateDailyChargesTotal(dailyCharges);

  return (
    <div className="ipd-page ipd-ins-billing">
      <div className="no-print">
      <div className="ipd-ins-patient__header">
        <div>
          <h1 className="ipd-page__title">IPD Billing — {claim.ipdId}</h1>
          <p className="ipd-page__subtitle">
            {claim.patientName} · Patient ID {claim.uhid} · {claim.doctor} · {claim.wardRoom}
          </p>
        </div>
        <div className="ipd-form-actions">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={goBack}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate(
                ROUTES.IPD_INSURANCE_PATIENT.replace(':patientId', patient.id),
                { state: location.state },
              )
            }
          >
            Patient Profile
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrint}
          >
            <Printer size={16} aria-hidden /> Print
          </Button>
        </div>
      </div>

      <div className="ipd-ins-billing__top">
        <div className="ipd-card">
          <div className="ipd-card__head">
            <h2 className="ipd-card__title">Hospital Charges</h2>
            <Button type="button" size="sm" onClick={handleSaveCharges}>
              Save Charges
            </Button>
          </div>
          <div className="ipd-card__body ipd-ins-charge-card">
            <p className="ipd-ins-charge-card__hint">
              Totals by charge head — save daily charges to auto-update amounts.
            </p>

            <div className="ipd-ins-charge-bucket">
              <table className="ipd-ins-charge-table">
                <thead>
                  <tr>
                    <th>Charge head</th>
                    <th className="ipd-num">Amount (₹)</th>
                    <th className="ipd-ins-charge-table__action" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {hospitalChargeBuckets.map((bucket) => (
                    <Fragment key={bucket.id}>
                      <tr className="ipd-ins-charge-table__section">
                        <th colSpan={3} scope="rowgroup">
                          {bucket.label}
                        </th>
                      </tr>
                      {bucket.rows.map((row) => (
                        <tr
                          key={row.id}
                          className={`ipd-ins-charge-table__row${
                            focusHead === row.id ? ' ipd-ins-charge-table__row--focus' : ''
                          }${isDiscountCharge(row) ? ' ipd-ins-charge-table__row--discount' : ''}`}
                        >
                          <td>
                            {isDefaultChargeHead(row) ? (
                              <span className="ipd-ins-charge-table__label">{row.label}</span>
                            ) : (
                              <input
                                className="ipd-input ipd-ins-charge-table__name-input"
                                value={row.label}
                                onFocus={() => setFocusHead(row.id)}
                                onChange={(e) => setLabel(row.id, e.target.value)}
                                aria-label="Charge head name"
                              />
                            )}
                          </td>
                          <td className="ipd-num">
                            <input
                              className="ipd-input ipd-ins-charge-input ipd-ins-charge-table__amount-input"
                              value={row.amount}
                              onFocus={() => setFocusHead(row.id)}
                              onChange={(e) =>
                                setAmount(row.id, e.target.value.replace(/[^\d.]/g, ''))
                              }
                              inputMode="decimal"
                              aria-label={`Amount for ${row.label}`}
                            />
                          </td>
                          <td className="ipd-ins-charge-table__action">
                            {!isDefaultChargeHead(row) ? (
                              <button
                                type="button"
                                className="ipd-text-link ipd-ins-charge-remove"
                                onClick={() => removeCharge(row.id)}
                              >
                                Remove
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="ipd-ins-charge-table__add-row">
                    <td colSpan={3}>
                      <div className="ipd-ins-charge-table__add">
                        <input
                          className="ipd-input ipd-ins-charge-table__name-input"
                          value={newHeadLabel}
                          onChange={(e) => setNewHeadLabel(e.target.value)}
                          placeholder="New charge head"
                          aria-label="New charge head"
                        />
                        <input
                          className="ipd-input ipd-ins-charge-input ipd-ins-charge-table__amount-input"
                          value={newHeadAmount}
                          onChange={(e) =>
                            setNewHeadAmount(e.target.value.replace(/[^\d.]/g, ''))
                          }
                          placeholder="0"
                          inputMode="decimal"
                          aria-label="New charge amount"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={addChargeHead}
                        >
                          + Add
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr className="ipd-ins-charge-table__total-row">
                    <th scope="row">Gross bill</th>
                    <td className="ipd-num">
                      <strong>{money(totals.displayGross)}</strong>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="ipd-ins-billing__side">
          <div className="ipd-card">
            <div className="ipd-card__head">
              <h2 className="ipd-card__title">Insurance Claim</h2>
              {claimEditing ? (
                <Button type="button" size="sm" onClick={handleSaveClaimAmounts}>
                  Save
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPatientPayInput('');
                    setClaimEditing(true);
                  }}
                >
                  Update
                </Button>
              )}
            </div>
            <div className="ipd-card__body">
              <dl className="ipd-claim-facts">
                <div className="ipd-claim-kv">
                  <dt>
                    <label htmlFor="ipd-bill-claim-amount">Claim Amount</label>
                  </dt>
                  <dd>
                    <input
                      id="ipd-bill-claim-amount"
                      className="ipd-input"
                      value={claimedInput}
                      onChange={(e) =>
                        setClaimedInput(e.target.value.replace(/[^\d.]/g, ''))
                      }
                      placeholder="0"
                      inputMode="decimal"
                      disabled={!claimEditing}
                    />
                  </dd>
                </div>
                <div className="ipd-claim-kv">
                  <dt>
                    <label htmlFor="ipd-bill-estimate-amount">
                      Estimate Amount
                    </label>
                  </dt>
                  <dd>
                    <input
                      id="ipd-bill-estimate-amount"
                      className="ipd-input"
                      value={estimateInput}
                      onChange={(e) =>
                        setEstimateInput(e.target.value.replace(/[^\d.]/g, ''))
                      }
                      placeholder="0"
                      inputMode="decimal"
                      disabled={!claimEditing}
                    />
                  </dd>
                </div>
                <Fact label="Hospital Bill" value={money(actualBill)} />
                <Fact
                  label="Insurance Covered"
                  value={
                    <span className="ipd-claim-amt--ok">
                      {money(insuranceCovered)}
                    </span>
                  }
                />
                <Fact
                  label="Outstanding Amount"
                  value={
                    <span className="ipd-claim-amt--due">
                      {money(outstandingAmount)}
                    </span>
                  }
                />
              </dl>

              <p className="ipd-claim-section-label" style={{ marginTop: '0.85rem' }}>
                Patient Payable
              </p>
              <dl className="ipd-claim-facts">
                <Fact
                  label="Paid so far"
                  value={
                    <span className="ipd-claim-amt--ok">
                      {money(alreadyPaid)}
                    </span>
                  }
                />
                {claimEditing ? (
                  <div className="ipd-claim-kv">
                    <dt>
                      <label htmlFor="ipd-bill-patient-pay">Add amount</label>
                    </dt>
                    <dd>
                      <input
                        id="ipd-bill-patient-pay"
                        className="ipd-input"
                        value={patientPayInput}
                        onChange={(e) =>
                          setPatientPayInput(
                            e.target.value.replace(/[^\d.]/g, ''),
                          )
                        }
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </dd>
                  </div>
                ) : null}
                <Fact
                  label="Patient Pay Outstanding"
                  value={
                    <span
                      className={
                        patientPayOutstanding > 0
                          ? 'ipd-claim-amt--due'
                          : 'ipd-claim-amt--ok'
                      }
                    >
                      {money(patientPayOutstanding)}
                    </span>
                  }
                />
              </dl>
            </div>
          </div>

          <div className="ipd-card ipd-ins-toggle-card">
            <div>
              <strong>Use this insurance for this admission</strong>
              <p className="ipd-page__subtitle">
                Active policy detected for {claim.patientName}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              className={`ipd-ins-switch${
                useInsurance ? ' ipd-ins-switch--on' : ''
              }`}
              aria-checked={useInsurance}
              aria-label="Use this insurance for this admission"
              onClick={() => setUseInsurance((v) => !v)}
            />
          </div>
        </div>
      </div>

      <div className="ipd-card ipd-ins-daily-charges">
        <div className="ipd-card__head">
          <div>
            <h2 className="ipd-card__title">Daily Charges</h2>
            <p className="ipd-page__subtitle ipd-ins-daily-charges__hint">
              {claim.ipdId} · each row is one item (medicine, treatment, room, etc.)
            </p>
          </div>
          <Button type="button" size="sm" onClick={handleSaveDailyCharges}>
            Save Daily Charges
          </Button>
        </div>
        <div className="ipd-card__body">
          {dailyCharges.length === 0 ? (
            <p className="ipd-page__subtitle">
              No daily charges yet. Add room, doctor, lab, or pharmacy entries below.
            </p>
          ) : (
            <div className="ipd-ins-daily-groups">
              {dailyChargeGroups.map((group) => {
                const isOpen = expandedDailyDate === group.charge_date;
                return (
                  <div
                    key={group.charge_date}
                    className={`ipd-ins-daily-group${
                      isOpen ? ' ipd-ins-daily-group--open' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="ipd-ins-daily-group__trigger"
                      onClick={() => toggleDailyDate(group.charge_date)}
                      aria-expanded={isOpen}
                    >
                      <span className="ipd-ins-daily-group__date">
                        {formatChargeDate(group.charge_date)}
                      </span>
                      <span className="ipd-ins-daily-group__meta">
                        {group.itemCount} item{group.itemCount === 1 ? '' : 's'} ·{' '}
                        {group.categories.join(' · ')}
                      </span>
                      <strong className="ipd-ins-daily-group__total">
                        {money(group.total)}
                      </strong>
                      <ChevronDown
                        size={18}
                        aria-hidden
                        className={`ipd-ins-daily-group__chev${
                          isOpen ? ' ipd-ins-daily-group__chev--open' : ''
                        }`}
                      />
                    </button>
                    {isOpen ? (
                      <div className="ipd-ins-daily-group__panel">
                        <IpdDailyChargesGroupItems
                          items={group.items}
                          chargeDate={group.charge_date}
                          updateDailyCharge={updateDailyCharge}
                          removeDailyCharge={removeDailyCharge}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <p className="ipd-claim-section-label ipd-ins-daily-add-label">
            Add charge
          </p>
          <div className="ipd-ins-daily-add">
            <DateInput
              value={newDailyDate}
              onChange={setNewDailyDate}
              aria-label="New daily charge date"
            />
            <input
              className="ipd-input"
              value={newDailyHead}
              onChange={(e) => setNewDailyHead(e.target.value)}
              placeholder="e.g. Pharmacy"
              aria-label="New daily charge head"
            />
            <input
              className="ipd-input"
              value={newDailyItem}
              onChange={(e) => setNewDailyItem(e.target.value)}
              placeholder={getDailyChargeItemPlaceholder(newDailyHead)}
              aria-label="New daily charge item"
            />
            <input
              className="ipd-input ipd-ins-daily-qty-input"
              value={newDailyQty}
              onChange={(e) =>
                setNewDailyQty(e.target.value.replace(/[^\d.]/g, ''))
              }
              placeholder="Qty"
              inputMode="decimal"
              aria-label="New daily charge quantity"
            />
            <input
              className="ipd-input ipd-ins-charge-input"
              value={newDailyAmount}
              onChange={(e) =>
                setNewDailyAmount(e.target.value.replace(/[^\d.]/g, ''))
              }
              placeholder="0"
              inputMode="decimal"
              aria-label="New daily charge amount"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addDailyCharge}>
              + Add
            </Button>
          </div>

          <div className="ipd-ins-daily-total">
            <span>
              {dailyChargeGroups.length} day
              {dailyChargeGroups.length === 1 ? '' : 's'} · {dailyCharges.length}{' '}
              item{dailyCharges.length === 1 ? '' : 's'}
            </span>
            <strong>{money(dailyChargesTotal)}</strong>
            <span className="ipd-ins-daily-total__note">
              Saves roll up into hospital charge heads
            </span>
          </div>
        </div>
      </div>

      {useInsurance ? (
        <>
          <div className="ipd-card">
            <div className="ipd-card__head">
              <h2 className="ipd-card__title">
                Insurance Linked To This Admission
              </h2>
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
                <Fact label="Claimed Amount" value={money(claim.claimed)} />
                <Fact
                  label="Estimate Amount"
                  value={money(claim.estimateAmount)}
                />
              </dl>
            </div>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={goBack}
        className="btn btn--secondary btn--sm"
        style={{ alignSelf: 'flex-start' }}
      >
        Back to bills
      </button>
      </div>

      <IpdInsuranceBillPrintSheet
        model={printModel}
        className="bill-print-zone--offscreen"
      />
    </div>
  );
}
