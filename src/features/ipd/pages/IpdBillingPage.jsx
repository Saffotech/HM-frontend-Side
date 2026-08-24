/**
 * Bills list — live `/ipd/billing/running`.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import IpdPermissionButton from '@/features/ipd/components/IpdPermissionButton';
import { useIpdRunningBillsQuery } from '@/features/ipd/hooks/useIpdQuery';
import { useIpdInsuranceBillsQuery } from '@/features/ipd/hooks/useIpdBillingQuery';
import { formatIpdMoney } from '@/features/ipd/utils/ipdFormat';
import { mapInsuranceBillRow } from '@/features/ipd/utils/mapInsuranceApi';
import {
  IPD_PAYMENT_TYPE,
  IPD_PAYMENT_TYPE_GROUP,
  IPD_PAYMENT_TYPE_GROUP_OPTIONS,
  IPD_PAYMENT_TYPE_SUB_OPTIONS,
  getPaymentTypeGroup,
  isInsuranceCashlessPaymentType,
  matchesPaymentType,
  parseIpdPaymentType,
  paymentTypeQueryValue,
} from '@/features/ipd/utils/ipdPaymentTypes';

const INSURANCE_BILL_COLUMNS = [
  'IPD ID',
  'Patient',
  'Admitted',
  'Doctor / Ward',
  'Net Bill',
  'Approved',
  'Claim',
  'Action',
];

export default function IpdBillingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canViewBilling } = useIpdPermissionSet();
  const [search, setSearch] = useState('');
  const [paymentType, setPaymentType] = useState(() =>
    parseIpdPaymentType(searchParams.get('paymentType')),
  );
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError, error, refetch } = useIpdRunningBillsQuery();
  const insuranceBillsQuery = useIpdInsuranceBillsQuery(
    {},
    { enabled: isInsuranceCashlessPaymentType(paymentType) },
  );
  const paymentTypeGroup = getPaymentTypeGroup(paymentType);
  const showInsuranceCashless = isInsuranceCashlessPaymentType(paymentType);
  // Self AND copay both use the same live self-pay billing table.
  const showSelfBilling = !showInsuranceCashless;

  const updatePaymentType = (nextType) => {
    setPaymentType(nextType);
    const next = new URLSearchParams(searchParams);
    const queryValue = paymentTypeQueryValue(nextType);
    if (queryValue) next.set('paymentType', queryValue);
    else next.delete('paymentType');
    setSearchParams(next, { replace: true });
  };

  const handlePaymentGroupChange = (group) => {
    const nextType =
      group === IPD_PAYMENT_TYPE_GROUP.INSURANCE
        ? IPD_PAYMENT_TYPE.INSURANCE_CASHLESS
        : IPD_PAYMENT_TYPE.SELF;
    updatePaymentType(nextType);
  };

  const handlePaymentSubTypeChange = (raw) => {
    updatePaymentType(parseIpdPaymentType(raw));
  };

  const insuranceRows = useMemo(() => {
    const mapped = (insuranceBillsQuery.data?.items ?? []).map(mapInsuranceBillRow);
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return mapped;

    return mapped.filter((row) => {
      const hay = [
        row.ipdId,
        row.patientName,
        row.uhid,
        row.admitted,
        row.doctor,
        row.wardRoom,
        row.coverage,
        row.claimLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [debouncedSearch, insuranceBillsQuery.data?.items]);

  const rows = useMemo(() => {
    const mapped = (data?.items ?? []).map((item) => {
      const admission = item.admission ?? {};
      const total = Number(item.running_total ?? 0);
      const dueBalance = Math.max(0, Number(item.balance ?? 0));
      const paidRaw = Number(
        item.paid_amount != null
          ? item.paid_amount
          : Math.max(0, total - dueBalance),
      );
      const paidBalance = Math.min(Math.max(0, paidRaw), total);
      return {
        id: admission.id,
        patient_uid: admission.patient_uid,
        admission_no: admission.admission_no,
        patient_name: admission.patient_name,
        ward: admission.ward_name,
        bed: admission.bed_number,
        days: admission.length_of_stay_days,
        total,
        paid_balance: paidBalance,
        due_balance: dueBalance,
        open_bill_id: item.open_bill_id,
      };
    });

    const byPaymentType = mapped.filter((row) =>
      matchesPaymentType(row, paymentType),
    );

    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return byPaymentType;

    return byPaymentType.filter((row) => {
      const hay = [
        row.admission_no,
        row.id,
        row.patient_name,
        row.ward,
        row.bed,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data?.items, debouncedSearch, paymentType]);

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Bills"
        subtitle="Open IPD stays with outstanding charges"
      />

      <div className="ipd-card">
        <div className="ipd-card__head ipd-billing-card__head">
          <h2 className="ipd-card__title">Bill list</h2>
          <div className="ipd-billing-toolbar">
            <div className="ipd-toolbar__field ipd-billing-search">
              <input
                id="ipd-billing-search"
                className="ipd-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  showInsuranceCashless
                    ? 'Search patient'
                    : 'Search patient, admission, ward…'
                }
                aria-label="Search bills"
              />
            </div>
            <div className="ipd-toolbar__field ipd-billing-pay-type">
              <select
                id="ipd-billing-pay-type"
                className="ipd-select"
                value={paymentTypeGroup}
                onChange={(e) => handlePaymentGroupChange(e.target.value)}
                aria-label="Payment type"
              >
                {IPD_PAYMENT_TYPE_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {paymentTypeGroup === IPD_PAYMENT_TYPE_GROUP.INSURANCE && (
                <select
                  id="ipd-billing-insurance-sub-type"
                  className="ipd-select"
                  value={paymentType}
                  onChange={(e) => handlePaymentSubTypeChange(e.target.value)}
                  aria-label="Insurance type"
                >
                  {IPD_PAYMENT_TYPE_SUB_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
        {showInsuranceCashless ? (
          <div className="ipd-table-wrap ipd-ins-table-wrap">
            <table className="ipd-table ipd-table--insurance-bills">
              <thead>
                <tr>
                  {INSURANCE_BILL_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className={
                        col === 'Action' ? 'ipd-table__col-actions' : undefined
                      }
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {insuranceRows.length === 0 ? (
                  <tr>
                    <td colSpan={INSURANCE_BILL_COLUMNS.length}>
                      <EmptyState
                        title={
                          debouncedSearch.trim()
                            ? 'No matching insurance bills'
                            : 'No insurance bills'
                        }
                        description={
                          debouncedSearch.trim()
                            ? 'Try a different patient, IPD ID, or ward.'
                            : 'Cashless insurance claims will appear here when connected.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  insuranceRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.ipdId}</strong>
                      </td>
                      <td>
                        <strong>{row.patientName}</strong>
                        <div className="ipd-ins-meta">{row.ageGender}</div>
                      </td>
                      <td>{row.admitted}</td>
                      <td>
                        {row.doctor}
                        <div className="ipd-ins-meta">{row.wardRoom}</div>
                      </td>
                      <td>{formatIpdMoney(row.netBill)}</td>
                      <td>
                        <span className="ipd-claim-amt--ok">
                          {formatIpdMoney(row.approved)}
                        </span>
                      </td>
                      <td>
                        <span className="ipd-ins-chip ipd-ins-chip--warn">
                          {row.claimLabel}
                        </span>
                      </td>
                      <td>
                        <div className="ipd-table__actions">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={!row.patientId}
                            onClick={() => {
                              if (!row.patientId) return;
                              navigate(
                                ROUTES.IPD_INSURANCE_BILLING.replace(
                                  ':patientId',
                                  row.patientId,
                                ),
                              );
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : showSelfBilling && isError ? (
          <div className="ipd-card__body">
            <QueryFeedback isError error={error} onRetry={refetch} />
          </div>
        ) : showSelfBilling && isLoading ? (
          <div className="ipd-card__body" style={{ display: 'grid', gap: '0.5rem' }}>
            <div className="ipd-skeleton" />
            <div className="ipd-skeleton" />
          </div>
        ) : showSelfBilling ? (
          <div className="ipd-table-wrap">
            <table className="ipd-table">
              <thead>
                <tr>
                  <th>Admission</th>
                  <th>Patient</th>
                  <th>Ward / Bed</th>
                  <th>Days</th>
                  <th>Total</th>
                  <th>Paid Balance</th>
                  <th>Due Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        title={
                          debouncedSearch.trim()
                            ? 'No matching bills'
                            : 'No bills'
                        }
                        description={
                          debouncedSearch.trim()
                            ? 'Try a different patient, admission, or ward.'
                            : paymentType === IPD_PAYMENT_TYPE.INSURANCE_COPAY
                              ? 'Admit a patient with Insurance · Copay to see bills here.'
                              : 'Admitted patients with open charges will appear here.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.admission_no || row.id}</td>
                      <td>{row.patient_name || '—'}</td>
                      <td>
                        {row.ward || '—'} / {row.bed || '—'}
                      </td>
                      <td>{row.days ?? '—'}</td>
                      <td>{formatIpdMoney(row.total)}</td>
                      <td>{formatIpdMoney(row.paid_balance)}</td>
                      <td>{formatIpdMoney(row.due_balance)}</td>
                      <td>
                        <IpdPermissionButton
                          allowed={canViewBilling}
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() =>
                            navigate(
                              ROUTES.IPD_BILL_PREVIEW.replace(
                                ':admissionId',
                                String(row.id)
                              )
                            )
                          }
                        >
                          View
                        </IpdPermissionButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
