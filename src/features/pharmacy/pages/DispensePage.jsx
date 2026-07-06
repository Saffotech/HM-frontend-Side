import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PharmacyLayout from '@/features/pharmacy/components/PharmacyLayout';
import PharmacyStatusBadge from '@/features/pharmacy/components/PharmacyStatusBadge';
import AllergyBanner from '@/features/pharmacy/components/AllergyBanner';
import { Button, QueryFeedback, Textarea } from '@/shared/components/common';
import {
  usePharmacyPrescriptionQuery,
  useDispenseMutation,
} from '@/shared/hooks/queries/usePharmacyQuery';
import { ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import { formatPharmacyPatientIdDisplay } from '@/shared/api/mappers/pharmacyMapper';
import { fetchPrescriptionById } from '@/shared/api/services/pharmacy';
import { queryKeys } from '@/shared/api/queryKeys';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import {
  enrichPrescriptionItems,
  validateItemDispenseInputs,
  buildDispenseSummary,
  buildDispensePayload,
  parseDispenseQuantityInput,
  getPrescriptionItemDbId,
} from '@/features/pharmacy/utils/dispenseWorkflow';
import {
  formatHumanInstructions,
  formatQuantityLabel,
  formatSummaryQuantity,
  inferMedicineUnit,
} from '@/features/pharmacy/utils/prescriptionQuantity';
import './DispensePage.css';

function dispenseWasApplied(beforeItems, afterItems, quantitiesByItemId) {
  return beforeItems.some((before) => {
    const itemId = getPrescriptionItemDbId(before);
    const after = afterItems.find((row) => getPrescriptionItemDbId(row) === itemId);
    if (!after) return false;
    const requested = parseDispenseQuantityInput(quantitiesByItemId[before.id]) ?? 0;
    if (requested <= 0) return false;
    return Number(after.quantity_dispensed) > Number(before.quantity_dispensed);
  });
}

export default function DispensePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useQueryToken();
  const { data: rx, isLoading, isError, error } = usePharmacyPrescriptionQuery(id);
  const dispenseMutation = useDispenseMutation();

  const enrichedItems = useMemo(
    () => (rx ? enrichPrescriptionItems(rx) : []),
    [rx]
  );

  const [quantities, setQuantities] = useState({});
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [rowErrors, setRowErrors] = useState({});

  const summary = useMemo(
    () => buildDispenseSummary(enrichedItems, quantities),
    [enrichedItems, quantities]
  );

  const activeMedicineNames = useMemo(
    () =>
      enrichedItems
        .filter((item) => (parseDispenseQuantityInput(quantities[item.id]) ?? 0) > 0)
        .map((item) => item.medicine_name),
    [enrichedItems, quantities]
  );

  const allFullyDispensed =
    enrichedItems.length > 0 && enrichedItems.every((item) => item.quantity_remaining <= 0);

  const handleQuantityChange = (itemId, value) => {
    setQuantities((prev) => ({ ...prev, [itemId]: value }));
    setRowErrors((prev) => {
      if (!prev[itemId]) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateItemDispenseInputs(enrichedItems, quantities);
    setRowErrors(validation.rowErrors);
    setFormError(validation.formError);
    if (!validation.valid) return;

    const missingLineIds = enrichedItems.filter((item) => !getPrescriptionItemDbId(item));
    if (missingLineIds.length > 0) {
      setFormError('Medicine line ids are missing. Refresh the page and try again.');
      return;
    }

    const body = buildDispensePayload(enrichedItems, quantities, remarks);
    if (!body.items?.length) {
      setFormError('Enter a dispense quantity for at least one medicine.');
      return;
    }

    try {
      await dispenseMutation.mutateAsync({ prescriptionId: id, body });
      toast.success('Dispensed successfully');
      navigate(`/pharmacy/prescriptions/${id}`);
    } catch (err) {
      if (err?.status >= 500 && token) {
        try {
          const refreshed = await fetchPrescriptionById(id, token);
          const afterItems = enrichPrescriptionItems(refreshed);
          if (
            refreshed?.status !== rx?.status
            || dispenseWasApplied(enrichedItems, afterItems, quantities)
          ) {
            queryClient.invalidateQueries({ queryKey: queryKeys.pharmacy.all });
            toast.success('Dispense completed');
            navigate(`/pharmacy/prescriptions/${id}`);
            return;
          }
        } catch {
          // fall through to error message
        }
      }

      const message = err?.message || 'Failed to dispense medicine.';
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <PharmacyLayout compact>
      <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
        {rx && (
          <div className="pharmacy-dispense-page page-container">
            <header className="pharmacy-dispense-header">
              <Button variant="ghost" onClick={() => navigate(`/pharmacy/prescriptions/${id}`)}>
                Back to prescription
              </Button>
              <PharmacyStatusBadge status={rx.status} />
            </header>

            <AllergyBanner allergies={rx.patient?.allergies} className="pharmacy-dispense-allergy" />

            <div className="card pharmacy-dispense-card">
              <div className="pharmacy-dispense-patient-strip">
                <div className="pharmacy-dispense-patient-strip__main">
                  <span className="pharmacy-dispense-patient-strip__name">{rx.patient?.name}</span>
                  <span className="pharmacy-table__patient-id">{formatPharmacyPatientIdDisplay(rx)}</span>
                </div>
                <div className="pharmacy-dispense-patient-strip__meta">
                  <span>
                    <span className="pharmacy-dispense-patient-strip__label">Phone</span>
                    {rx.patient_phone || rx.patient?.phone || '—'}
                  </span>
                  <span>
                    <span className="pharmacy-dispense-patient-strip__label">Allergies</span>
                    {rx.patient?.allergies || 'None'}
                  </span>
                  <span>
                    <span className="pharmacy-dispense-patient-strip__label">Medicines</span>
                    {enrichedItems.length}
                  </span>
                </div>
              </div>

              {allFullyDispensed ? (
                <p className="pharmacy-dispense-empty">
                  All medicines for this prescription have been dispensed.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="pharmacy-dispense-form">
                  <div className="pharmacy-dispense-table-wrap">
                    <table className="pharmacy-dispense-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Instructions</th>
                          <th className="pharmacy-dispense-table__qty">Total Required</th>
                          <th className="pharmacy-dispense-table__qty">Already Dispensed</th>
                          <th className="pharmacy-dispense-table__qty">Remaining</th>
                          <th className="pharmacy-dispense-table__input-col">Give Now</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrichedItems.map((item) => {
                          const disabled = item.quantity_remaining <= 0;
                          const instructions =
                            item.instructions_label || formatHumanInstructions(item);

                          return (
                            <tr key={item.id} className={disabled ? 'is-complete' : undefined}>
                              <td className="pharmacy-dispense-table__med">
                                <span className="pharmacy-dispense-table__med-name">
                                  {item.medicine_name}
                                </span>
                              </td>
                              <td className="pharmacy-dispense-table__instructions">
                                {instructions}
                              </td>
                              <td className="pharmacy-dispense-table__qty pharmacy-dispense-table__qty--emphasis">
                                {formatQuantityLabel(item.quantity_prescribed, item.medicine_name)}
                              </td>
                              <td className="pharmacy-dispense-table__qty">
                                {formatQuantityLabel(item.quantity_dispensed, item.medicine_name)}
                              </td>
                              <td className="pharmacy-dispense-table__qty pharmacy-dispense-table__qty--remaining">
                                {formatQuantityLabel(item.quantity_remaining, item.medicine_name)}
                              </td>
                              <td className="pharmacy-dispense-table__input-col">
                                <div className="pharmacy-dispense-give-now">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.quantity_remaining}
                                    step={1}
                                    inputMode="numeric"
                                    className={`pharmacy-dispense-qty-input${
                                      rowErrors[item.id] ? ' pharmacy-dispense-qty-input--error' : ''
                                    }`}
                                    aria-label={`Give now for ${item.medicine_name}`}
                                    placeholder="0"
                                    disabled={disabled}
                                    value={quantities[item.id] ?? ''}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                    aria-invalid={Boolean(rowErrors[item.id])}
                                    aria-describedby={
                                      rowErrors[item.id] ? `dispense-err-${item.id}` : undefined
                                    }
                                  />
                                  {!disabled && (
                                    <span className="pharmacy-dispense-give-now__unit">
                                      {inferMedicineUnit(item.medicine_name, 2)}
                                    </span>
                                  )}
                                </div>
                                {rowErrors[item.id] && (
                                  <p
                                    id={`dispense-err-${item.id}`}
                                    className="pharmacy-dispense-row-error"
                                    role="alert"
                                  >
                                    {rowErrors[item.id]}
                                  </p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pharmacy-dispense-footer">
                    <div className="pharmacy-dispense-stats" aria-live="polite">
                      <div className="pharmacy-dispense-stat">
                        <span className="pharmacy-dispense-stat__label">Medicines</span>
                        <span className="pharmacy-dispense-stat__value">{summary.medicinesCount}</span>
                      </div>
                      <div className="pharmacy-dispense-stat">
                        <span className="pharmacy-dispense-stat__label">Giving Now</span>
                        <span className="pharmacy-dispense-stat__value">
                          {formatSummaryQuantity(summary.totalNow, activeMedicineNames)}
                        </span>
                      </div>
                      <div className="pharmacy-dispense-stat">
                        <span className="pharmacy-dispense-stat__label">Remaining After Dispense</span>
                        <span className="pharmacy-dispense-stat__value">
                          {formatSummaryQuantity(
                            summary.totalRemainingAfter,
                            enrichedItems.map((item) => item.medicine_name)
                          )}
                        </span>
                      </div>
                    </div>

                    <Textarea
                      className="pharmacy-dispense-remarks"
                      label="Remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Optional notes for this dispense"
                      rows={2}
                    />

                    <div className="pharmacy-dispense-actions">
                      {formError && (
                        <p className="pharmacy-form-error" role="alert">
                          {formError}
                        </p>
                      )}
                      <div className="pharmacy-dispense-actions__buttons">
                        <Button type="submit" disabled={dispenseMutation.isPending}>
                          {dispenseMutation.isPending ? 'Dispensing…' : 'Confirm dispense'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => navigate(ROUTES.PHARMACY_PRESCRIPTIONS)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </QueryFeedback>
      {isError && (
        <Button variant="ghost" onClick={() => navigate(`/pharmacy/prescriptions/${id}`)}>
          Back
        </Button>
      )}
    </PharmacyLayout>
  );
}
