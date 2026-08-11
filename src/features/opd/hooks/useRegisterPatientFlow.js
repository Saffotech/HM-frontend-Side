import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAddPatientMutation,
  useAddOpdVisitMutation,
} from '@/shared/hooks/queries/usePatientQuery';
import { useBookAppointmentMutation } from '@/shared/hooks/queries/useAppointmentQuery';
import { patientsApi, billsApi } from '@/shared/api/services';
import { buildScheduledAt } from '@/shared/api/mappers/appointmentMapper';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import { trimForm } from '@/shared/utils/trimForm';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import {
  generateAppointmentId,
  generateBillId,
  getBillStatus,
} from '@/shared/utils/billHelpers';
import { requiresTransactionReference, validatePaymentTransactionRef } from '@/shared/utils/validators';
import { toast } from '@/shared/utils/toast';
import { scrollAndFocusInvalidField } from '@/shared/utils/formFocus';
import { useOpdPricingControls } from '@/features/opd/hooks/useOpdBillingSettingsQuery';
import {
  formatAppointmentDisplay,
  REGISTER_PATIENT_INITIAL_FORM,
  todayIso,
  validateRegisterPatient,
} from '@/features/opd/utils/registerPatientUtils';

export const REGISTER_FIELD_IDS = {
  name: 'register-name',
  phone: 'register-phone',
  dob: 'register-dob',
  aadhaar: 'register-aadhaar',
  deptId: 'register-dept',
  doctorId: 'register-doctor',
  appointmentDate: 'register-appointment-date',
  appointmentTime: 'register-appointment-slots',
};

const REGISTER_FIELD_ORDER = [
  'name',
  'phone',
  'dob',
  'aadhaar',
  'deptId',
  'doctorId',
  'appointmentDate',
  'appointmentTime',
];

function readResponseGrandTotal(result) {
  const fromMapped = Number(result?.grandTotal);
  if (Number.isFinite(fromMapped) && fromMapped > 0) return fromMapped;
  const fromRaw = Number(result?.raw?.grand_total);
  if (Number.isFinite(fromRaw) && fromRaw > 0) return fromRaw;
  return null;
}

export function useRegisterPatientFlow() {
  const token = useQueryToken();
  const navigate = useNavigate();

  const addPatient = useAddPatientMutation();
  const addOpdVisit = useAddOpdVisitMutation();
  const bookAppointment = useBookAppointmentMutation();
  const {
    registrationFee,
    gstPercent,
    resolveConsultationFee,
    isLoading: pricingLoading,
    isError: pricingError,
  } = useOpdPricingControls();

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
  const [isConfirming, setIsConfirming] = useState(false);

  const isRevisitPatient = Boolean(revisitConfirmed && existingPatient?.found);
  const { values: form, errors, handleChange, setErrors } = useFormValidation(
    REGISTER_PATIENT_INITIAL_FORM,
    (values) => validateRegisterPatient(values, { isRevisit: isRevisitPatient })
  );

  const billedRegistrationFee = isRevisitPatient ? 0 : Number(registrationFee) || 0;
  const billedConsultationFee = form.doctorId
    ? Number(resolveConsultationFee(form.doctorId, form.deptId)) || 0
    : 0;
  const billedGstPercent = Number.isFinite(Number(gstPercent)) ? Number(gstPercent) : 0;
  const [billedTotal, setBilledTotal] = useState(0);

  useEffect(() => {
    if (!form.doctorId || pricingLoading || pricingError) {
      setBilledTotal(0);
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      const preview = await billsApi.fetchBillPreview(
        {
          registrationFee: billedRegistrationFee,
          consultationFee: billedConsultationFee,
          gstPercent: billedGstPercent,
        },
        token,
      );
      if (!cancelled && preview?.total != null) {
        setBilledTotal(Number(preview.total));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    form.doctorId,
    billedRegistrationFee,
    billedConsultationFee,
    billedGstPercent,
    pricingLoading,
    pricingError,
    token,
  ]);

  const set = (key, val) => handleChange(key, val);

  const isSaving =
    isConfirming ||
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

  const resolveFinalBillTotal = async (result) => {
    const fromResponse = readResponseGrandTotal(result);
    if (fromResponse != null) return fromResponse;
    if (result?.visitId != null) {
      try {
        const invoice = await billsApi.getBillInvoice(result.visitId, token);
        const fromInvoice = Number(invoice?.total ?? invoice?.grand_total);
        if (Number.isFinite(fromInvoice) && fromInvoice > 0) return fromInvoice;
      } catch {
        /* invoice is a fallback when register response has no grand_total */
      }
    }
    const fromPreview = Number(billPreview?.total);
    return Number.isFinite(fromPreview) && fromPreview > 0 ? fromPreview : null;
  };

  const getOnSubmit = (selectedDoctor) => (e) => {
    e?.preventDefault?.();
    const nextErrors = validateRegisterPatient(form, { isRevisit: isRevisitPatient });
    if (!form.deptId) nextErrors.deptId = 'Department is required';
    if (!form.doctorId) nextErrors.doctorId = 'Doctor is required';
    if (form.doctorId) {
      if (!appointmentDateStr) nextErrors.appointmentDate = 'Appointment date is required';
      if (!appointmentTime) nextErrors.appointmentTime = 'Please select a time slot';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => {
        scrollAndFocusInvalidField(nextErrors, REGISTER_FIELD_IDS, REGISTER_FIELD_ORDER);
      });
      return;
    }
    void (async () => {
      if (!selectedDoctor || !validateAppointmentSlot()) return;
      if (pricingLoading) {
        toast.error('Billing settings are still loading. Try again in a moment.');
        return;
      }
      if (pricingError) {
        toast.error('Could not load billing settings. Refresh and try again.');
        return;
      }

      try {
        const formData = trimForm(form);
        const apiPreview = await billsApi.fetchBillPreview(
          {
            registrationFee: billedRegistrationFee,
            consultationFee: billedConsultationFee,
            gstPercent: billedGstPercent,
          },
          token,
        );
        if (!apiPreview || apiPreview.total == null) {
          toast.error('Could not load the bill total from the server.');
          return;
        }

        const billId = generateBillId(0);
        setBillPreview({
          billId,
          items: apiPreview.items?.length ? apiPreview.items : [],
          subtotal: apiPreview.subtotal,
          tax: apiPreview.tax,
          total: apiPreview.total,
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

        setPaymentAmount(String(apiPreview.total));
        setStage('bill');
      } catch (err) {
        toast.error(err?.message || 'Could not generate bill');
      }
    })();
  };

  const confirmPayment = async (selectedDoctor, selectedDept) => {
    if (!billPreview || isSaving) return;

    const requestedPaid = Math.min(
      parseFloat(paymentAmount) || 0,
      Number(billPreview.total) || 0,
    );
    const trimmed = trimForm(billPreview.formData);
    const refError = validatePaymentTransactionRef(paymentMode, paymentRef, {
      paidAmount: requestedPaid,
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
      setIsConfirming(true);
      const visitPayload = {
        ...trimmed,
        deptId: form.deptId,
        doctorId: form.doctorId,
        registrationFee: billedRegistrationFee,
        consultationFee: billedConsultationFee,
        gstPercent: billedGstPercent,
        paymentMode,
        payLater: true,
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
        : await addPatient.mutateAsync(visitPayload);

      const finalTotal = await resolveFinalBillTotal(result);
      if (finalTotal == null) {
        toast.error('Patient saved, but the billed amount could not be loaded from the server.');
        setSuccessData({
          patient: { ...trimmed, id: result.patientId },
          bill: {
            id: result.billNumber,
            visitId: result.visitId,
            tokenNumber: result.tokenNumber,
            total: 0,
            paid: 0,
            balance: 0,
            status: 'Unpaid',
          },
          appointment: {
            ...billPreview.appointment,
            id: result.appointmentUid ?? result.appointmentId ?? null,
            scheduledAt: result.scheduledAt ?? scheduledAt,
          },
          paid: 0,
          billStatus: 'Unpaid',
        });
        setStage('success');
        return;
      }

      let paid = Math.min(requestedPaid, finalTotal);
      if (paid > 0) {
        try {
          await billsApi.collectBillPayment(
            result.visitId,
            {
              amount: paid,
              mode: paymentMode,
              ref: paymentRef.trim() || undefined,
            },
            token,
          );
        } catch (err) {
          paid = 0;
          toast.error(err?.message || 'Patient saved, but payment could not be recorded.');
        }
      }

      const { status, balance } = getBillStatus(paid, finalTotal);

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
          total: finalTotal,
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
    } finally {
      setIsConfirming(false);
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
    billedRegistrationFee,
    billedConsultationFee,
    billedTotal,
    resolveConsultationFee,
    handlePhoneBlur,
    resetAppointmentSlot,
    handleDoctorChange,
    getOnSubmit,
    confirmPayment,
    handlePaymentModeChange,
    navigate,
  };
}
