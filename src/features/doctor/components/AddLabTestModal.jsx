import { useEffect, useMemo, useState } from 'react';
import { useCreateLabTestMutation } from '@/features/doctor/hooks/useDoctorLabQuery';
import {
  LAB_DEPARTMENTS,
  LAB_PRIORITIES,
  inferLabCategory,
} from '@/features/doctor/constants';
import { useLabRoutingDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import {
  departmentCode,
  labDepartmentLabel,
  resolveLabDepartmentId,
} from '@/shared/utils/labDepartments';
import { findPatientLabOrderLink } from '@/features/doctor/utils/patientLabOrderLinks';
import LabTestNameField from './LabTestNameField';
import { Button, Modal, Select, Textarea } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';

const EMPTY_FORM = {
  deptCode: '',
  testName: '',
  otherTest: false,
  priority: 'Normal',
  clinicalNotes: '',
};

export default function AddLabTestModal({
  open,
  onClose,
  patientUid,
  patientName,
  linkOptions = [],
  onSuccess,
}) {
  const createLabTest = useCreateLabTestMutation();
  const labRoutingQuery = useLabRoutingDepartmentsQuery({ enabled: open });
  const labRoutingDepts = labRoutingQuery.data ?? [];

  const defaultLinkKey = linkOptions[0]?.key ?? '';
  const [linkKey, setLinkKey] = useState(defaultLinkKey);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setLinkKey(linkOptions[0]?.key ?? '');
    setForm(EMPTY_FORM);
  }, [open, linkOptions]);

  const selectedLink = useMemo(
    () => findPatientLabOrderLink(linkOptions, linkKey),
    [linkOptions, linkKey],
  );

  const deptOptions = labRoutingDepts.length
    ? labRoutingDepts.map((d) => ({
        value: departmentCode(d),
        label: d.name || labDepartmentLabel(d),
      }))
    : LAB_DEPARTMENTS.map((d) => ({ value: d.code, label: d.label }));

  const handleSubmit = async () => {
    if (!selectedLink) {
      toast.error('No active visit or admission to order labs against');
      return;
    }
    if (!form.deptCode) {
      toast.error('Please select Laboratory or Radiology');
      return;
    }
    if (!String(form.testName ?? '').trim()) {
      toast.error('Please select or enter a test');
      return;
    }

    const departmentId = resolveLabDepartmentId(labRoutingDepts, form.deptCode);
    const payload = {
      patientUid,
      patientName,
      testName: String(form.testName).trim(),
      category: inferLabCategory(form.testName, form.deptCode),
      departmentId: departmentId ?? undefined,
      priority: form.priority || 'Normal',
      clinicalNotes: form.clinicalNotes,
    };

    if (selectedLink.admissionId != null) {
      payload.admissionId = selectedLink.admissionId;
    } else {
      payload.appointmentDbId = selectedLink.appointmentDbId;
    }

    try {
      await createLabTest.mutateAsync(payload);
      toast.success('Lab test ordered');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = String(err?.message ?? '');
      if (!/already been ordered/i.test(msg)) {
        // mutationOnError toasts most failures
      }
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Add lab test${patientName ? ` · ${patientName}` : ''}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={createLabTest.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createLabTest.isPending || linkOptions.length === 0}
          >
            {createLabTest.isPending ? 'Ordering…' : 'Order test'}
          </Button>
        </>
      }
    >
      {linkOptions.length === 0 ? (
        <p className="text-muted doc-profile-add-lab-empty">
          No active OPD appointment or admitted IPD stay found for this patient. Lab orders must
          be linked to a visit or admission.
        </p>
      ) : (
        <>
          {linkOptions.length > 1 ? (
            <Select
              label="Link to visit *"
              value={linkKey}
              onChange={setLinkKey}
              options={linkOptions.map((link) => ({
                value: link.key,
                label: link.label,
              }))}
            />
          ) : (
            <p className="doc-profile-add-lab-link text-muted">
              Linked to: <strong>{selectedLink?.label}</strong>
            </p>
          )}

          <Select
            label="Lab Department *"
            value={form.deptCode}
            onChange={(deptCode) =>
              setForm((prev) => ({
                ...prev,
                deptCode,
                testName: '',
                otherTest: false,
              }))
            }
            placeholder={labRoutingQuery.isLoading ? 'Loading…' : 'Laboratory or Radiology'}
            options={deptOptions}
          />

          <LabTestNameField
            label="Test *"
            deptCode={form.deptCode}
            testName={form.testName}
            otherTest={form.otherTest}
            onChange={({ testName, otherTest }) =>
              setForm((prev) => ({ ...prev, testName, otherTest }))
            }
          />

          <Select
            label="Priority"
            value={form.priority}
            onChange={(priority) => setForm((prev) => ({ ...prev, priority }))}
            options={LAB_PRIORITIES.map((p) => ({ value: p, label: p }))}
          />

          <Textarea
            label="Clinical notes"
            rows={2}
            value={form.clinicalNotes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, clinicalNotes: e.target.value }))
            }
          />
        </>
      )}
    </Modal>
  );
}
