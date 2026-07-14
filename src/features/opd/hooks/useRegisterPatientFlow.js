import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAddPatientMutation,
  useAddOpdVisitMutation,
} from '@/shared/hooks/queries/usePatientQuery';
import { useBookAppointmentMutation } from '@/shared/hooks/queries/useAppointmentQuery';
import { patientsApi, billsApi } from '@/shared/api/services';
import { uiToApiPatientRegister } from '@/shared/api/mappers/patientMapper';
import { buildScheduledAt } from '@/shared/api/mappers/appointmentMapper';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { REGISTRATION_FEE, TAX_RATE } from '@/shared/constants';
import { trimForm } from '@/shared/utils/trimForm';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import {
  calcBillTotals,
  generateAppointmentId,
  generateBillId,
  getBillStatus,
} from '@/shared/utils/billHelpers';
import { requiresTransactionReference, validatePaymentTransactionRef } from '@/shared/utils/validators';
import { toast } from '@/shared/utils/toast';
import {
  formatAppointmentDisplay,
  REGISTER_PATIENT_INITIAL_FORM,
  todayIso,
  validateRegisterPatient,
} from '@/features/opd/utils/registerPatientUtils';

export function useRegisterPatientFlow() {
  const token = useQueryToken();
  const navigate = useNavigate();

  const addPatient = useAddPatientMutation();
  const addOpdVisit = useAddOpdVisitMutation();
  const bookAppointment = useBookAppointmentMutation();

  const [stage, setStage] = useState('form');
  const [billPreview, setBillPreview] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentRefError, setPaymentRefError] = useState('');
  const [appointmentDateStr, setAppointmentDateStr] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [existingPatient, setExistingPatient] = useState(null);
  const [revisitConfirmed, setRevisitConfirmed] = useState(false);

  const isRevisitPatient = Boolean(revisitConfirmed && existingPatient?.found);
  const { values: form, errors, handleChange, handleSubmit } = useFormValidation(
    REGISTER_PATIENT_INITIAL_FORM,
    (values) => validateRegisterPatient(values, { isRevisit: isRevisitPatient })
  );

  const set = (key, val) => handleChange(key, val);

  const isSaving =
    addPatient.isPending ||
    addOpdVisit.isPending ||
    bookAppointment.isPending;

  const handlePhoneBlur = async () => {
    const phone = (form.phone || '').replace(/\s/g, '');
    if (phone.length !== 10) {
      setExistingPatient(null);
      setRevisitConfirmed(false);
      return;
    }
    try {
      const lookup = await patientsApi.searchPatientByPhoneApi(phone, token);
      setExistingPatient(lookup?.found ? lookup : null);
      setRevisitConfirmed(false);
    } catch {
      setExistingPatient(null);
      setRevisitConfirmed(false);
    }
  };

  const resetAppointmentSlot = () => {
    setAppointmentDateStr('');
    setAppointmentTime('');
  };

  const handleDoctorChange = (doctorId) => {
    set('doctorId', doctorId);
    setAppointmentDateStr(todayIso());
    setAppointmentTime('');
  };

  const validateAppointmentSlot = () => {
    if (!form.doctorId) {
      toast.error('Please select a doctor');
      return false;
    }
    if (!appointmentDateStr) {
      toast.error('Please select an appointment date');
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(`${appointmentDateStr}T12:00:00`);
    picked.setHours(0, 0, 0, 0);
    if (picked < today) {
      toast.error('Appointment date cannot be in the past');
      return false;
    }
    if (!appointmentTime) {
      toast.error('Please select an available time slot');
      return false;
    }
    return true;
  };

  const buildAppointmentPayload = (patientUid, patientDbId, trimmed, selectedDoctor, selectedDept) => ({
    id: generateAppointmentId(0),
    patientId: patientUid,
    patientDbId,
    patientName: trimmed.name,
    deptId: form.deptId,
    deptName: selectedDept?.name,
    doctorId: form.doctorId,
    doctorName: selectedDoctor?.name?.startsWith('Dr.')
      ? selectedDoctor.name
      : `Dr. ${selectedDoctor?.name ?? ''}`,
    date: new Date(`${appointmentDateStr}T12:00:00`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: appointmentTime,
    status: 'Scheduled',
    type: 'New',
    reason: 'New patient registration',
    notes: 'Booked during registration',
  });

  const resolvePatientDbId = async (phone) => {
    const search = await patientsApi.searchPatientByPhoneApi(phone, token);
    return search?.dbId ?? search?.patient?.dbId ?? null;
  };

  const getOnSubmit = (selectedDoctor) => handleSubmit(async (rawValues) => {
    if (!selectedDoctor || !validateAppointmentSlot()) return;

    const formData = trimForm(rawValues);
    const docFee = selectedDoctor.fee || 0;
    const regFee = isRevisitPatient ? 0 : REGISTRATION_FEE;
    const items = [
      ...(regFee > 0 ? [{ name: 'Registration Fee', qty: 1, unitPrice: regFee }] : []),
      { name: `Dr. ${selectedDoctor.name} Consultation`, qty: 1, unitPrice: docFee },
    ];

    let subtotal;
    let tax;
    let grandTotal;
    let previewItems = items;

    const apiPreview = await billsApi.fetchBillPreview(
      {
        registrationFee: regFee,
        consultationFee: docFee,
        gstPercent: TAX_RATE * 100,
        registerBody: uiToApiPatientRegister({
          ...formData,
          deptId: form.deptId,
          doctorId: form.doctorId,
          registrationFee: regFee,
          consultationFee: docFee,
          gstPercent: TAX_RATE * 100,
        }),
      },
      token
    );
    if (apiPreview) {
      subtotal = apiPreview.subtotal;
      tax = apiPreview.tax;
      grandTotal = apiPreview.total;
      if (apiPreview.items?.length) previewItems = apiPreview.items;
    }

    if (subtotal == null) {
      const totals = calcBillTotals(items);
      subtotal = totals.subtotal;
      tax = totals.tax;
      grandTotal = totals.grandTotal;
    }

    const billId = generateBillId(0);

    setBillPreview({
      billId,
      items: previewItems,
      subtotal,
      tax,
      total: grandTotal,
      formData,
      doctor: selectedDoctor,
      isRevisit: isRevisitPatient,
      existingPatient: existingPatient?.patient ?? null,
      appointment: {
        dateStr: appointmentDateStr,
        time: appointmentTime,
        displayDate: formatAppointmentDisplay(appointmentDateStr),
      },
    });

    setPaymentAmount(String(grandTotal));
    setStage('bill');
  });

  const confirmPayment = async (selectedDoctor, selectedDept) => {
    if (!billPreview || isSaving) return;

    const paid = Math.min(parseFloat(paymentAmount) || 0, billPreview.total);
    const { status, balance } = getBillStatus(paid, billPreview.total);
    const trimmed = trimForm(billPreview.formData);
    const refError = validatePaymentTransactionRef(paymentMode, paymentRef, {
      paidAmount: paid,
      payLater: false,
    });
    if (refError) {
      setPaymentRefError(refError);
      toast.error(refError);
      return;
    }
    setPaymentRefError('');

    const scheduledAt = buildScheduledAt(appointmentDateStr, appointmentTime);

    try {
      const visitPayload = {
        ...trimmed,
        deptId: form.deptId,
        doctorId: form.doctorId,
        registrationFee: billPreview.isRevisit ? 0 : REGISTRATION_FEE,
        consultationFee: selectedDoctor?.fee ?? 800,
        gstPercent: TAX_RATE * 100,
        paymentMode,
        amountReceived: paid,
        paymentRef: paymentRef.trim() || undefined,
        waiveRegistrationFee: billPreview.isRevisit,
        scheduledAt,
      };

      const result = billPreview.isRevisit
        ? await addOpdVisit.mutateAsync({
            ...visitPayload,
            dbId: existingPatient?.dbId ?? existingPatient?.patient?.dbId,
            id: existingPatient?.patient?.id,
          })
        : await addPatient.mutateAsync({
            ...visitPayload,
            registrationFee: REGISTRATION_FEE,
          });

      // Backend creates/links one appointment during register/visit.
      // Only fall back to book if older backend returns no appointment_id.
      let appointmentSummary = {
        ...billPreview.appointment,
        id: result.appointmentUid ?? result.appointmentId ?? null,
        scheduledAt: result.scheduledAt ?? scheduledAt,
      };

      const autoAppointmentId = result.appointmentId ?? result.raw?.appointment_id ?? null;
      if (!autoAppointmentId) {
        try {
          const patientDbId =
            result.patientDbId
            ?? (await resolvePatientDbId(trimmed.phone));
          if (patientDbId) {
            const appt = await bookAppointment.mutateAsync(
              buildAppointmentPayload(
                result.patientId,
                patientDbId,
                trimmed,
                selectedDoctor,
                selectedDept,
              ),
            );
            appointmentSummary = { ...billPreview.appointment, id: appt?.id };
          } else {
            toast.warning('Patient registered, but appointment could not be linked. Book manually.');
          }
        } catch {
          toast.warning('Patient registered, but appointment booking failed. Book from Appointments.');
        }
      }

      setSuccessData({
        patient: { ...trimmed, id: result.patientId },
        bill: {
          id: result.billNumber,
          visitId: result.visitId,
          tokenNumber: result.tokenNumber,
          total: billPreview.total,
          paid,
          balance,
          status,
        },
        appointment: appointmentSummary,
        paid,
        billStatus: status,
      });
      setStage('success');
      toast.success(
        billPreview.isRevisit
          ? 'Revisit recorded and appointment booked'
          : 'Patient registered and appointment booked'
      );
    } catch {
      /* mutationOnError handles toast */
    }
  };

  const handlePaymentModeChange = (value) => {
    setPaymentMode(value);
    if (!requiresTransactionReference(value)) {
      setPaymentRef('');
      setPaymentRefError('');
    }
  };

  return {
    form,
    errors,
    set,
    stage,
    setStage,
    billPreview,
    paymentAmount,
    setPaymentAmount,
    paymentMode,
    paymentRef,
    paymentRefError,
    setPaymentRef,
    setPaymentRefError,
    appointmentDateStr,
    setAppointmentDateStr,
    appointmentTime,
    setAppointmentTime,
    successData,
    existingPatient,
    setExistingPatient,
    revisitConfirmed,
    setRevisitConfirmed,
    isRevisitPatient,
    isSaving,
    handlePhoneBlur,
    resetAppointmentSlot,
    handleDoctorChange,
    getOnSubmit,
    confirmPayment,
    handlePaymentModeChange,
    navigate,
  };
}
