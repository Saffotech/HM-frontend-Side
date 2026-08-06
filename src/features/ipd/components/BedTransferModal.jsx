/**
 * Bed transfer modal — live POST `/ipd/beds/transfer`.
 */

import { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '@/shared/components/common';
import { WARDS } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import {
  useIpdBedsQuery,
  useIpdPatientsQuery,
  useTransferIpdBedMutation,
} from '@/features/ipd/hooks/useIpdQuery';
import { IPD_ADMISSION_STATUS } from '@/features/ipd/utils/constants';

export default function BedTransferModal({
  open,
  onClose,
  initialAdmissionId = '',
}) {
  const [admissionId, setAdmissionId] = useState('');
  const [ward, setWard] = useState('');
  const [newBedId, setNewBedId] = useState('');
  const [error, setError] = useState('');

  const admissionsQuery = useIpdPatientsQuery({
    status: IPD_ADMISSION_STATUS.ADMITTED,
    limit: 100,
  });
  const admissions = admissionsQuery.data?.items ?? [];
  const selected = admissions.find((row) => String(row.id) === String(admissionId));

  const bedsQuery = useIpdBedsQuery({
    ward: ward || undefined,
    status: 'available',
  });
  const availableBeds = (bedsQuery.data?.beds ?? []).filter(
    (bed) => bed.status === 'available'
  );
  const wardOptions = useMemo(() => WARDS ?? [], []);
  const transferMutation = useTransferIpdBedMutation();

  useEffect(() => {
    if (open && initialAdmissionId) {
      setAdmissionId(String(initialAdmissionId));
    }
  }, [open, initialAdmissionId]);

  useEffect(() => {
    if (selected?.ward_name) {
      setWard(selected.ward_name);
    }
  }, [selected?.id, selected?.ward_name]);

  const reset = () => {
    setAdmissionId('');
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
    if (!admissionId) {
      setError('Select an admitted patient');
      return;
    }
    if (!newBedId) {
      setError('Select a new available bed');
      return;
    }

    try {
      await transferMutation.mutateAsync({
        admission_id: Number(admissionId),
        new_bed_id: Number(newBedId),
      });
      toast.success('Patient transferred to the new bed');
      handleClose();
    } catch (err) {
      setError(err?.message || 'Transfer failed');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Transfer Bed"
      footer={
        <div className="ipd-form-actions">
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
      <form id="ipd-xfer-form" className="ipd-modal-form" onSubmit={onSubmit}>
        <p className="ipd-page__subtitle">
          Move an admitted patient to another available bed.
        </p>
        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-xfer-admission">
            Admission / patient
          </label>
          <select
            id="ipd-xfer-admission"
            className="ipd-select"
            value={admissionId}
            onChange={(e) => {
              setAdmissionId(e.target.value);
              setNewBedId('');
              setError('');
            }}
          >
            <option value="">
              {admissionsQuery.isLoading ? 'Loading…' : 'Select admitted patient…'}
            </option>
            {admissions.map((row) => (
              <option key={row.id} value={row.id}>
                {row.patient_name} · {row.admission_no || `#${row.id}`} ·{' '}
                {row.ward_name}/{row.bed_number}
              </option>
            ))}
          </select>
        </div>
        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-xfer-from">
            Current bed
          </label>
          <input
            id="ipd-xfer-from"
            className="ipd-input"
            value={
              selected
                ? `${selected.ward_name || '—'} / ${selected.bed_number || '—'}`
                : '—'
            }
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
          >
            <option value="">Select ward…</option>
            {wardOptions.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
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
            {availableBeds.map((bed) => (
              <option key={bed.id} value={bed.id}>
                {bed.bed_number}
              </option>
            ))}
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
