/**
 * Bed transfer modal — live POST `/ipd/beds/transfer`.
 * Prefers admission list; falls back to occupied beds (backend may create admission).
 */

import { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import {
  useIpdBedsQuery,
  useIpdPatientsQuery,
  useTransferIpdBedMutation,
} from '@/features/ipd/hooks/useIpdQuery';
import { useIpdWardOptions } from '@/features/ipd/hooks/useIpdWardOptions';
import { useIpdBedRateLookup } from '@/features/ipd/hooks/useIpdBedRateLookup';
import { IPD_ADMISSION_STATUS } from '@/features/ipd/utils/constants';
import { formatCurrency } from '@/shared/utils/formatCurrency';

function patientLabel(row) {
  const name = row.patient_name || 'Patient';
  const uid = row.patient_uid || row.admission_no || (row.id != null ? `#${row.id}` : '');
  const bed = [row.ward_name, row.bed_number].filter(Boolean).join('/');
  return [name, uid, bed].filter(Boolean).join(' · ');
}

export default function BedTransferModal({
  open,
  onClose,
  initialAdmissionId = '',
  initialBed = null,
  lockAdmission = false,
}) {
  const [admissionId, setAdmissionId] = useState('');
  const [fromBedId, setFromBedId] = useState('');
  const [ward, setWard] = useState('');
  const [newBedId, setNewBedId] = useState('');
  const [error, setError] = useState('');

  const admissionsQuery = useIpdPatientsQuery({
    status: IPD_ADMISSION_STATUS.ADMITTED,
    limit: 100,
  });
  const admissions = admissionsQuery.data?.items ?? [];

  const occupiedBedsQuery = useIpdBedsQuery({ status: 'occupied' });
  const occupiedBeds = useMemo(
    () => (occupiedBedsQuery.data?.beds ?? []).filter((b) => b.status === 'occupied'),
    [occupiedBedsQuery.data]
  );

  const bedsQuery = useIpdBedsQuery({
    ward: ward || undefined,
    status: 'available',
  });
  const availableBeds = (bedsQuery.data?.beds ?? []).filter(
    (bed) => bed.status === 'available'
  );
  const { wardOptions, isLoading: wardsLoading } = useIpdWardOptions();
  const { getRate } = useIpdBedRateLookup();
  const transferMutation = useTransferIpdBedMutation();

  const seededFromBed = Boolean(initialBed?.id);
  const sourceLocked = Boolean(
    lockAdmission && (initialAdmissionId || seededFromBed)
  );

  const selectedAdmission = admissions.find(
    (row) => String(row.id) === String(admissionId)
  );
  const selectedOccupied = occupiedBeds.find(
    (row) => String(row.id) === String(fromBedId)
  );

  const currentBedLabel = useMemo(() => {
    if (selectedAdmission) {
      return `${selectedAdmission.ward_name || '—'} / ${selectedAdmission.bed_number || '—'}`;
    }
    if (selectedOccupied) {
      return `${selectedOccupied.ward_name || '—'} / ${selectedOccupied.bed_number || '—'}`;
    }
    if (initialBed) {
      return `${initialBed.ward_name || '—'} / ${initialBed.bed_number || '—'}`;
    }
    return '—';
  }, [selectedAdmission, selectedOccupied, initialBed]);

  const currentPatientLabel = useMemo(() => {
    if (selectedAdmission) return patientLabel(selectedAdmission);
    if (selectedOccupied) return patientLabel(selectedOccupied);
    if (initialBed) return patientLabel(initialBed);
    return '';
  }, [selectedAdmission, selectedOccupied, initialBed]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setNewBedId('');
    if (initialAdmissionId) {
      setAdmissionId(String(initialAdmissionId));
      setFromBedId('');
    } else if (initialBed?.id) {
      setFromBedId(String(initialBed.id));
      setAdmissionId('');
      if (initialBed.ward_name) setWard(initialBed.ward_name);
    } else {
      setAdmissionId('');
      setFromBedId('');
      setWard('');
    }
    admissionsQuery.refetch();
    occupiedBedsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on open/seed
  }, [open, initialAdmissionId, initialBed?.id]);

  useEffect(() => {
    if (selectedAdmission?.ward_name) {
      setWard(selectedAdmission.ward_name);
    } else if (selectedOccupied?.ward_name) {
      setWard(selectedOccupied.ward_name);
    }
  }, [
    selectedAdmission?.id,
    selectedAdmission?.ward_name,
    selectedOccupied?.id,
    selectedOccupied?.ward_name,
  ]);

  const reset = () => {
    setAdmissionId('');
    setFromBedId('');
    setWard('');
    setNewBedId('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!admissionId && !fromBedId) {
      setError('Select an admitted patient');
      return;
    }
    if (!newBedId) {
      setError('Select a new available bed');
      return;
    }
    if (fromBedId && String(fromBedId) === String(newBedId)) {
      setError('Choose a different bed than the current one');
      return;
    }

    try {
      const payload = {
        new_bed_id: Number(newBedId),
      };
      if (admissionId) {
        payload.admission_id = Number(admissionId);
      } else {
        payload.from_bed_id = Number(fromBedId);
      }
      await transferMutation.mutateAsync(payload);
      toast.success('Patient transferred to the new bed');
      handleClose();
    } catch (err) {
      setError(err?.message || 'Transfer failed');
    }
  };

  const useOccupiedFallback =
    !seededFromBed && !initialAdmissionId && admissions.length === 0;

  const sourceLoading =
    admissionsQuery.isLoading ||
    (useOccupiedFallback && occupiedBedsQuery.isLoading);

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Transfer Bed"
      size="md"
      panelClassName="ipd-xfer-modal"
      footer={
        <div className="ipd-xfer-modal__actions">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="ipd-xfer-form"
            disabled={transferMutation.isPending}
          >
            {transferMutation.isPending ? 'Transferring…' : 'Confirm Transfer'}
          </Button>
        </div>
      }
    >
      <form id="ipd-xfer-form" className="ipd-modal-form ipd-xfer-modal__form" onSubmit={onSubmit}>
        <p className="ipd-xfer-modal__desc">
          Move an admitted patient to another available bed.
        </p>

        {sourceLocked ? (
          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-xfer-patient">
              Patient
            </label>
            <input
              id="ipd-xfer-patient"
              className="ipd-input"
              value={currentPatientLabel || '—'}
              disabled
              readOnly
            />
          </div>
        ) : (
          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-xfer-admission">
              Admission / patient
            </label>
            <select
              id="ipd-xfer-admission"
              className="ipd-select"
              value={
                useOccupiedFallback
                  ? fromBedId
                  : admissionId
              }
              disabled={sourceLoading}
              onChange={(e) => {
                const value = e.target.value;
                if (useOccupiedFallback) {
                  setFromBedId(value);
                  setAdmissionId('');
                  const bed = occupiedBeds.find((b) => String(b.id) === value);
                  if (bed?.ward_name) setWard(bed.ward_name);
                } else {
                  setAdmissionId(value);
                  setFromBedId('');
                }
                setNewBedId('');
                setError('');
              }}
            >
              <option value="">
                {sourceLoading
                  ? 'Loading…'
                  : useOccupiedFallback
                    ? 'Select occupied bed / patient…'
                    : 'Select admitted patient…'}
              </option>
              {useOccupiedFallback
                ? occupiedBeds.map((bed) => (
                    <option key={`bed-${bed.id}`} value={bed.id}>
                      {patientLabel(bed)}
                    </option>
                  ))
                : admissions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {patientLabel(row)}
                    </option>
                  ))}
            </select>
            {!sourceLoading && useOccupiedFallback && occupiedBeds.length === 0 ? (
              <p className="ipd-field-error" role="status">
                No occupied beds found to transfer.
              </p>
            ) : null}
            {admissionsQuery.isError ? (
              <p className="ipd-field-error" role="alert">
                {admissionsQuery.error?.message || 'Could not load admissions'}
              </p>
            ) : null}
          </div>
        )}

        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-xfer-from">
            Current bed
          </label>
          <input
            id="ipd-xfer-from"
            className="ipd-input"
            value={currentBedLabel}
            disabled
            readOnly
          />
        </div>
        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-xfer-ward">
            New ward
          </label>
          <select
            id="ipd-xfer-ward"
            className="ipd-select"
            value={ward}
            onChange={(e) => {
              setWard(e.target.value);
              setNewBedId('');
            }}
            disabled={wardsLoading}
          >
            <option value="">
              {wardsLoading
                ? 'Loading wards…'
                : wardOptions.length === 0
                  ? 'No wards in inventory'
                  : 'Select ward…'}
            </option>
            {wardOptions.map((w) => {
              const rate = getRate(w);
              return (
                <option key={w} value={w}>
                  {rate != null ? `${w} · ${formatCurrency(rate, { empty: '—' })}/day` : w}
                </option>
              );
            })}
          </select>
        </div>
        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-xfer-bed">
            New bed
          </label>
          <select
            id="ipd-xfer-bed"
            className="ipd-select"
            value={newBedId}
            onChange={(e) => setNewBedId(e.target.value)}
            disabled={!ward}
          >
            <option value="">{!ward ? 'Select ward first…' : 'Select bed…'}</option>
            {availableBeds.map((bed) => {
              const rate = getRate(bed);
              return (
                <option key={bed.id} value={bed.id}>
                  {rate != null
                    ? `${bed.bed_number} · ${formatCurrency(rate, { empty: '—' })}/day`
                    : bed.bed_number}
                </option>
              );
            })}
          </select>
        </div>
        {error ? (
          <p className="ipd-field-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
