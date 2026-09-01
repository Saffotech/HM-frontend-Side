/**
 * Insurance IPD billing — charge breakdown with add/remove.
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdInsuranceBillPrintSheet from '@/features/ipd/components/IpdInsuranceBillPrintSheet';
import IpdInsuranceClaimBillingCard from '@/features/ipd/components/IpdInsuranceClaimBillingCard';
import IpdHospitalChargesCard, {
  calculateInsuranceChargeTotals,
  normalizeInsuranceChargeHeads,
  sortInsuranceChargeHeads,
} from '@/features/ipd/components/IpdHospitalChargesCard';
import IpdDailyChargesCard from '@/features/ipd/components/IpdDailyChargesCard';
import useIpdBackNavigation from '@/features/ipd/hooks/useIpdBackNavigation';
import {
  useIpdInsuranceBillingBundleQuery,
  useSaveIpdDailyBillingMutation,
  useSaveIpdFinalBillingMutation,
} from '@/features/ipd/hooks/useIpdBillingQuery';
import { initChargeHeadsFromClaim } from '@/features/ipd/billing/ipdBillingMapper';
import { buildInsuranceIpdBillPrintModel } from '@/features/ipd/utils/buildInsuranceIpdBillPrintModel';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { initDailyCharges } from '@/features/ipd/utils/insuranceDailyCharges';
import { toast } from '@/shared/utils/toast';

function Fact({ label, value }) {
  return (
    <div className="ipd-claim-kv">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}

function money(n) {
  return formatCurrency(n, { empty: '—' });
}

function initCharges(claim) {
  return initChargeHeadsFromClaim(claim);
}

function chargeHeadsMatch(prev, next) {
  if (prev === next) return true;
  if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) {
    return false;
  }
  return prev.every((row, i) => {
    const n = next[i];
    return (
      row.id === n.id &&
      String(row.amount) === String(n.amount) &&
      row.label === n.label
    );
  });
}

function dailyChargesMatch(prev, next) {
  if (prev === next) return true;
  if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) {
    return false;
  }
  return prev.every((row, i) => {
    const n = next[i];
    return (
      row.id === n.id &&
      String(row.amount) === String(n.amount) &&
      String(row.quantity) === String(n.quantity) &&
      row.item_name === n.item_name &&
      row.head === n.head &&
      row.charge_date === n.charge_date
    );
  });
}

function claimsMatchForSync(prev, next) {
  if (prev === next) return true;
  if (!prev || !next || prev.id !== next.id) return false;
  return (
    prev.patientPaid === next.patientPaid &&
    prev.claimed === next.claimed &&
    prev.estimateAmount === next.estimateAmount
  );
}

const IpdInsuranceLinkedCard = memo(function IpdInsuranceLinkedCard({ claim }) {
  return (
    <div className="ipd-card">
      <div className="ipd-card__head">
        <h2 className="ipd-card__title">Insurance Linked To This Admission</h2>
        <span className="ipd-ins-chip ipd-ins-chip--active">{claim.policyStatus}</span>
      </div>
      <div className="ipd-card__body">
        <dl className="ipd-claim-ins-grid">
          <Fact label="Insurance Company" value={claim.insurer} />
          <Fact label="Policy Number" value={claim.policyNo} />
          <Fact label="Policy Holder" value={claim.policyHolder} />
          <Fact label="Relationship" value={claim.relationship} />
          <Fact label="Claimed Amount" value={money(claim.claimed)} />
          <Fact label="Estimate Amount" value={money(claim.estimateAmount)} />
        </dl>
      </div>
    </div>
  );
});

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

  const patient = bundleQuery.data?.patient;
  const claim = bundleQuery.data?.claim;

  const [charges, setCharges] = useState(() => initCharges(claim));
  const [useInsurance, setUseInsurance] = useState(true);
  const [savedClaim, setSavedClaim] = useState(claim);
  const [dailyCharges, setDailyCharges] = useState(() => initDailyCharges(claim));
  const [printSheetMounted, setPrintSheetMounted] = useState(false);

  useEffect(() => {
    if (!claim) return;
    setCharges(initCharges(claim));
    setSavedClaim(claim);
    setDailyCharges(initDailyCharges(claim));
  }, [claim?.id]);

  // When live billing bundle arrives (auto bed/visit/pharmacy), refresh UI totals.
  useEffect(() => {
    const heads = bundleQuery.data?.finalBilling?.chargeHeads;
    if (Array.isArray(heads) && heads.length) {
      setCharges((prev) => (chargeHeadsMatch(prev, heads) ? prev : heads));
    }
    const daily = bundleQuery.data?.dailyCharges;
    if (Array.isArray(daily)) {
      setDailyCharges((prev) => (dailyChargesMatch(prev, daily) ? prev : daily));
    }
    const bundleClaim = bundleQuery.data?.claim;
    if (bundleClaim) {
      setSavedClaim((prev) =>
        claimsMatchForSync(prev, bundleClaim) ? prev : bundleClaim,
      );
    }
  }, [bundleQuery.dataUpdatedAt]);

  const totals = useMemo(
    () => calculateInsuranceChargeTotals(charges),
    [charges],
  );

  const actualBill = Number(totals.displayGross) || 0;

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

  const onPrint = useCallback(() => {
    if (!printModel) return;
    if (!printSheetMounted) {
      setPrintSheetMounted(true);
      window.setTimeout(() => window.print(), 100);
      return;
    }
    window.print();
  }, [printModel, printSheetMounted]);

  const handleChargesChange = useCallback((next) => {
    setCharges(next);
  }, []);

  const handleDailyChargesChange = useCallback((next) => {
    setDailyCharges(next);
  }, []);

  const handleClaimSaved = useCallback((updatedClaim) => {
    setSavedClaim(updatedClaim);
  }, []);

  const handleSaveCharges = useCallback(() => {
    if (!claim) return;
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
  }, [
    claim,
    charges,
    patientId,
    insuranceAdmit,
    saveFinalBillingMutation,
  ]);

  const handleSaveDailyCharges = useCallback(() => {
    if (!claim) return;
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
  }, [
    claim,
    dailyCharges,
    patientId,
    insuranceAdmit,
    saveDailyBillingMutation,
  ]);

  if (bundleQuery.isLoading) {
    return (
      <div className="ipd-page">
        <QueryFeedback isLoading />
      </div>
    );
  }

  if (bundleQuery.isError) {
    return (
      <div className="ipd-page">
        <QueryFeedback
          isError
          error={bundleQuery.error}
          onRetry={bundleQuery.refetch}
        />
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

  return (
    <div className="ipd-page ipd-ins-billing">
      <div className="no-print">
        <div className="ipd-ins-patient__header">
          <div>
            <h1 className="ipd-page__title">IPD Billing — {claim.ipdId}</h1>
            <p className="ipd-page__subtitle">
              {claim.patientName} · Patient ID {claim.uhid} · {claim.doctor} ·{' '}
              {claim.wardRoom}
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
          <IpdHospitalChargesCard
            charges={charges}
            onChargesChange={handleChargesChange}
            onSave={handleSaveCharges}
            saving={saveFinalBillingMutation.isPending}
            hint="Totals by charge head — save daily charges to auto-update amounts."
          />

          <div className="ipd-ins-billing__side">
            <IpdInsuranceClaimBillingCard
              claim={claim}
              savedClaim={savedClaim}
              actualBill={actualBill}
              patientId={patientId}
              insuranceAdmit={insuranceAdmit}
              onClaimSaved={handleClaimSaved}
            />

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

        <IpdDailyChargesCard
          dailyCharges={dailyCharges}
          onDailyChargesChange={handleDailyChargesChange}
          onSave={handleSaveDailyCharges}
          saving={saveDailyBillingMutation.isPending}
          subtitle={`${claim.ipdId} · each row is one item (medicine, treatment, room, etc.)`}
        />

        {useInsurance ? <IpdInsuranceLinkedCard claim={claim} /> : null}

        <button
          type="button"
          onClick={goBack}
          className="btn btn--secondary btn--sm"
          style={{ alignSelf: 'flex-start' }}
        >
          Back to bills
        </button>
      </div>

      {printSheetMounted && printModel ? (
        <IpdInsuranceBillPrintSheet
          model={printModel}
          className="bill-print-zone--offscreen"
        />
      ) : null}
    </div>
  );
}
