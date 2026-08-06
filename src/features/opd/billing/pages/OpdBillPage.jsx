import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  usePatientsQuery,
  usePatientQuery,
  usePatientProfileQuery,
} from '@/shared/hooks/queries/usePatientQuery';
import { useBillsQuery, useCreateBillMutation } from '@/shared/hooks/queries/useBillingQuery';
import { usePatientAppointmentsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import { useDepartmentsQuery, useDoctorsByDepartmentQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import {
  asPatientList,
  asBillList,
  asAppointmentList,
} from '@/shared/hooks/queries/listDataUtils';
import { Button, QueryFeedback } from '@/shared/components/common';
import { QUICK_BILL_ITEMS } from '@/shared/constants/billing';
import { ROUTES } from '@/shared/constants';
import { calcBillTotals, generateBillId } from '@/shared/utils/billHelpers';
import {
  createOpdBillRecord,
  pickAppointmentForBillPrefill,
  resolveServiceFromAppointment,
} from '@/features/opd/billing/utils/opdBilling';
import {
  resolveTodayBills,
  buildBillingContextSummary,
  findLikelyDuplicateBills,
} from '@/features/opd/billing/utils/opdBillContextUtils';
import { toast } from '@/shared/utils/toast';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { validatePaymentTransactionRef } from '@/shared/utils/validators';
import { createEmptyBillLineRow } from '@/features/opd/billing/utils/opdBillFormUtils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useOpdPricingControls, useOpdPaymentControls, resolveConsultationFee as resolveConsultFee } from '@/features/opd/hooks/useOpdBillingSettingsQuery';
import OpdBillPatientSection from '@/features/opd/billing/components/OpdBillPatientSection';
import OpdBillItemsTable from '@/features/opd/billing/components/OpdBillItemsTable';
import OpdBillItemsStepFooter from '@/features/opd/billing/components/OpdBillItemsStepFooter';
import OpdBillItemsRecap from '@/features/opd/billing/components/OpdBillItemsRecap';
import OpdBillPaymentFooter from '@/features/opd/billing/components/OpdBillPaymentFooter';
import OpdBillSuccessModal from '@/features/opd/billing/components/OpdBillSuccessModal';
import OpdBillConfirmDialog from '@/features/opd/billing/components/OpdBillConfirmDialog';
import './OpdBillPage.css';

const PATIENT_PAGE_SIZE = 50;

function isConsultationLine(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .includes('consultation');
}

function isRegistrationLine(name) {
  const n = String(name || '')
    .trim()
    .toLowerCase();
  return n === 'registration fee' || n === 'registration';
}

export default function OpdBillPage() {
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedPatientSearch = useDebouncedValue(patientSearch.trim(), 300);
  const patientSearchSynced = patientSearch.trim() === debouncedPatientSearch;

  const { data: patientsData, isLoading: lp, isError: ep, error: errP } = usePatientsQuery({
    fetchAll: false,
    search: debouncedPatientSearch || undefined,
    page: 1,
    limit: PATIENT_PAGE_SIZE,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
  const patients = useMemo(() => asPatientList(patientsData), [patientsData]);
  const createBill = useCreateBillMutation();
  const {
    pricing,
    gstPercent,
    taxRate,
    allowManualPriceEntry,
    billItems: pricingBillItems,
  } = useOpdPricingControls();
  const { enabledPaymentModes } = useOpdPaymentControls();
  const isLoading = lp;
  const isError = ep;
  const error = errP;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [patientId, setPatientId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [items, setItems] = useState([createEmptyBillLineRow()]);
  const [mode, setMode] = useState('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [payLater, setPayLater] = useState(false);
  const [successBill, setSuccessBill] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [quickAddSelection, setQuickAddSelection] = useState('');
  const itemsScrollRef = useRef(null);
  const prevItemsCountRef = useRef(1);
  const prefillDoneForPatientRef = useRef(null);
  const [billAppointment, setBillAppointment] = useState(null);
  const [existingBillAcknowledged, setExistingBillAcknowledged] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [billStep, setBillStep] = useState('items');
  const pendingBillRef = useRef(null);

  const { data: departments = [] } = useDepartmentsQuery();
  const { data: doctors = [] } = useDoctorsByDepartmentQuery(deptId);
  const { data: patientDetail } = usePatientQuery(patientId);
  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? patientDetail ?? null,
    [patients, patientId, patientDetail],
  );

  const { data: patientProfile } = usePatientProfileQuery(selectedPatient?.dbId);
  const profilePatient = patientProfile?.patient;
  const displayPatient = useMemo(() => {
    if (!selectedPatient) return null;
    return {
      ...selectedPatient,
      age: selectedPatient.age ?? profilePatient?.age,
      gender: selectedPatient.gender ?? profilePatient?.gender,
      dob: selectedPatient.dob ?? profilePatient?.dob,
      phone: selectedPatient.phone ?? profilePatient?.phone,
      bloodGroup: selectedPatient.bloodGroup ?? profilePatient?.bloodGroup,
    };
  }, [selectedPatient, profilePatient]);

  const { data: patientApptsData, isFetched: patientApptsFetched } =
    usePatientAppointmentsQuery({
      patientUid: selectedPatient?.id,
      patientDbId: selectedPatient?.dbId,
      page: 1,
      limit: 20,
      enabled: Boolean(selectedPatient?.dbId || selectedPatient?.id),
    });
  const patientAppointments = asAppointmentList(patientApptsData);

  // Keep lightweight today bills fetch; profile covers outstanding + recent history.
  const { data: todayBillsData } = useBillsQuery({
    fetchAll: false,
    search: selectedPatient?.id || undefined,
    today_only: true,
    page: 1,
    limit: 20,
    enabled: Boolean(patientId && selectedPatient?.id),
  });
  const todayBillsRaw = asBillList(todayBillsData);
  const { subtotal, tax, grandTotal } = calcBillTotals(items, taxRate);

  const todayBills = useMemo(
    () =>
      resolveTodayBills({
        todayBills: todayBillsRaw,
        profileVisits: patientProfile?.visits ?? [],
        patientUid: selectedPatient?.id,
      }),
    [todayBillsRaw, patientProfile?.visits, selectedPatient?.id],
  );

  const service = useMemo(() => {
    if (!displayPatient) return null;
    const billingContext =
      billAppointment ?? (deptId || doctorId ? { deptId, doctorId } : null);
    return resolveServiceFromAppointment(billingContext, displayPatient, {
      departments,
      doctors,
    });
  }, [displayPatient, billAppointment, deptId, doctorId, departments, doctors]);

  const billingContext = useMemo(() => {
    if (!selectedPatient) return null;
    return buildBillingContextSummary({
      outstanding: patientProfile?.summary?.outstanding ?? 0,
      todayBills,
      recentVisits: patientProfile?.visits ?? [],
      appointment: billAppointment,
    });
  }, [selectedPatient, patientProfile, todayBills, billAppointment]);

  const duplicateBills = useMemo(
    () =>
      findLikelyDuplicateBills({
        todayBills,
        appointment: billAppointment,
        doctorId,
        doctorName: service?.doctorName ?? billAppointment?.doctorName,
        deptId,
        deptName: service?.deptName ?? billAppointment?.deptName,
      }),
    [todayBills, billAppointment, doctorId, deptId, service],
  );

  const patientOptions = useMemo(() => {
    const opts = [
      { value: '', label: 'Clear selection' },
      ...patients.map((p) => ({
        value: p.id,
        label: p.name,
        sublabel: p.phone,
        badge: p.id,
      })),
    ];
    // Keep selected patient visible even if search/page refetch omits them
    // (prevents Select Patient label flicker).
    if (
      displayPatient?.id &&
      !opts.some((o) => String(o.value) === String(displayPatient.id))
    ) {
      opts.splice(1, 0, {
        value: displayPatient.id,
        label: displayPatient.name,
        sublabel: displayPatient.phone,
        badge: displayPatient.id,
      });
    }
    return opts;
  }, [patients, displayPatient]);

  const handlePatientSearchChange = useCallback((term) => {
    setPatientSearch((prev) => (prev === term ? prev : term));
  }, []);

  const handleDeptChange = useCallback((id) => {
    setDeptId(id ? String(id) : '');
    setDoctorId('');
  }, []);

  const handleDoctorChange = useCallback((id) => {
    setDoctorId(id ? String(id) : '');
  }, []);
  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) setPatientId(pid);
  }, [searchParams]);

  useEffect(() => {
    setDeptId('');
    setDoctorId('');
    prefillDoneForPatientRef.current = null;
    setBillAppointment(null);
    setExistingBillAcknowledged(false);
    setConfirmOpen(false);
    setBillStep('items');
    pendingBillRef.current = null;
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setDeptId('');
      setDoctorId('');
      setBillAppointment(null);
      prefillDoneForPatientRef.current = null;
      return;
    }
    if (prefillDoneForPatientRef.current === patientId) return;
    if (!patientApptsFetched) return;

    const best = pickAppointmentForBillPrefill(patientAppointments);
    setBillAppointment(best);
    if (best?.deptId) setDeptId(String(best.deptId));
    if (best?.doctorId) setDoctorId(String(best.doctorId));
    prefillDoneForPatientRef.current = patientId;
  }, [patientId, patientApptsFetched, patientAppointments]);

  useEffect(() => {
    if (items.length > prevItemsCountRef.current && itemsScrollRef.current) {
      itemsScrollRef.current.scrollTop = itemsScrollRef.current.scrollHeight;
    }
    prevItemsCountRef.current = items.length;
  }, [items.length]);

  useEffect(() => {
    if (!payLater) setAmountReceived(String(grandTotal || ''));
  }, [grandTotal, payLater]);

  // Keep Consultation line in sync with Admin pricing (doctor → dept → hospital).
  useEffect(() => {
    if (!deptId && !doctorId) return;
    const fee = resolveConsultFee(pricing, {
      doctorId,
      departmentId: deptId,
    });
    setItems((prev) => {
      const consultIdx = prev.findIndex((row) => isConsultationLine(row.name));
      if (consultIdx >= 0) {
        const current = prev[consultIdx];
        if (Number(current.unitPrice) === Number(fee) && current.name === 'Consultation') {
          return prev;
        }
        const next = [...prev];
        next[consultIdx] = {
          ...current,
          name: 'Consultation',
          unitPrice: fee,
          fromCatalog: true,
        };
        return next;
      }
      const emptyIdx = prev.findIndex((row) => !row.name && Number(row.unitPrice) === 0);
      if (emptyIdx >= 0) {
        const next = [...prev];
        next[emptyIdx] = {
          ...next[emptyIdx],
          name: 'Consultation',
          unitPrice: fee,
          fromCatalog: true,
        };
        return next;
      }
      return [
        ...prev,
        {
          ...createEmptyBillLineRow(),
          name: 'Consultation',
          unitPrice: fee,
          fromCatalog: true,
        },
      ];
    });
  }, [deptId, doctorId, pricing]);

  const handlePatientChange = useCallback((id) => {
    setPatientId(id);
    setPatientSearch('');
    setDeptId('');
    setDoctorId('');
    prefillDoneForPatientRef.current = null;
    setBillAppointment(null);
    setItems([createEmptyBillLineRow()]);
    setExistingBillAcknowledged(false);
    setBillStep('items');
    if (fieldErrors.patientId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.patientId;
        return next;
      });
    }
  }, [fieldErrors.patientId]);

  const handleOpenBill = useCallback(
    (billIdOrPath) => {
      if (!billIdOrPath) {
        navigate(ROUTES.BILLING);
        return;
      }
      if (String(billIdOrPath).startsWith('/')) {
        navigate(billIdOrPath);
        return;
      }
      navigate(ROUTES.BILLING_VIEW.replace(':id', encodeURIComponent(String(billIdOrPath))));
    },
    [navigate],
  );

  const handleOpenOutstanding = useCallback(() => {
    navigate(ROUTES.BILLING);
  }, [navigate]);

  const addItem = () => setItems([...items, createEmptyBillLineRow()]);
  const removeItem = (id) => items.length > 1 && setItems(items.filter((i) => i.id !== id));
  const updateItem = (id, field, value) =>
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const addQuickItem = (name, price) => {
    const emptyIdx = items.findIndex((i) => !i.name && i.unitPrice === 0);
    if (emptyIdx >= 0) {
      const updated = [...items];
      updated[emptyIdx] = {
        ...updated[emptyIdx],
        name,
        unitPrice: price,
        fromCatalog: true,
      };
      setItems(updated);
    } else {
      setItems([
        ...items,
        { ...createEmptyBillLineRow(), name, unitPrice: price, fromCatalog: true },
      ]);
    }
  };

  const handleQuickAddSelect = (value) => {
    if (!value) return;
    const catalog = pricingBillItems?.length ? pricingBillItems : QUICK_BILL_ITEMS;
    const item = catalog.find((qi) => qi.name === value);
    if (item) addQuickItem(item.name, item.price);
    setQuickAddSelection('');
  };

  const validateItemsStep = () => {
    const nextErrors = {};
    if (!patientId) nextErrors.patientId = 'Patient is required';
    if (!grandTotal || grandTotal <= 0) nextErrors.amount = 'Amount must be greater than 0';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return false;

    if (!patientApptsFetched) {
      toast.error('Loading appointment details. Please wait.');
      return false;
    }
    if (!deptId || !doctorId) {
      toast.error('Select department and doctor to continue.');
      return false;
    }
    if (items.some((i) => !i.name || i.unitPrice <= 0)) {
      toast.error('Complete all item fields');
      return false;
    }
    return true;
  };

  const handleContinueToPayment = () => {
    if (!validateItemsStep()) return;
    setBillStep('payment');
  };

  const buildValidatedBill = () => {
    if (!validateItemsStep()) return null;

    const received = payLater ? 0 : Number(amountReceived);
    if (isNaN(received) || received < 0 || received > grandTotal) {
      toast.error(`Amount received must be between 0 and ${formatCurrency(grandTotal)}`);
      return null;
    }
    const refError = validatePaymentTransactionRef(mode, paymentRef, {
      paidAmount: received,
      payLater,
    });
    if (refError) {
      setFieldErrors((prev) => ({ ...prev, paymentRef: refError }));
      toast.error(refError);
      return null;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.paymentRef;
      return next;
    });

    const resolvedConsult = resolveConsultFee(pricing, {
      doctorId,
      departmentId: deptId,
    });
    let registrationFee = 0;
    let consultationFee = resolvedConsult;
    const extraItems = [];

    for (const row of items) {
      if (isRegistrationLine(row.name)) {
        registrationFee = Number(row.unitPrice) || 0;
        continue;
      }
      if (isConsultationLine(row.name)) {
        consultationFee = Number(row.unitPrice) || resolvedConsult;
        continue;
      }
      extraItems.push(row);
    }

    const newBillId = generateBillId(0);
    const trimmedRef = paymentRef.trim();
    const newBill = createOpdBillRecord({
      billId: newBillId,
      patient: displayPatient ?? selectedPatient,
      items: extraItems,
      grandTotal,
      amountReceived: received,
      paymentMode: mode,
      appointment: billAppointment,
      visitType: 'Walk-in',
      paymentRef: trimmedRef || undefined,
      notes: '',
      registrationFee,
      consultationFee,
      gstPercent,
    });
    newBill.paymentRef = trimmedRef || undefined;
    newBill.payLater = payLater;
    newBill.deptId = deptId;
    newBill.doctorId = doctorId;
    newBill.doctorName = service?.doctorName;
    newBill.deptName = service?.deptName;
    return { newBill, newBillId };
  };

  const submitBill = (newBill, newBillId) => {
    createBill.mutate(newBill, {
      onSuccess: (saved) => {
        setConfirmOpen(false);
        pendingBillRef.current = null;
        const billId = saved?.id ?? newBillId;
        setSuccessBill({
          id: billId,
          patientName: selectedPatient?.name || 'Patient',
          grandTotal,
          paid: newBill.paid,
          balance: newBill.balance,
          status: newBill.status,
          paymentMode: newBill.paymentMode,
        });
        toast.success(
          newBill.status === 'Paid'
            ? 'Bill generated and paid'
            : newBill.status === 'Partial'
              ? 'Bill saved — partial payment recorded'
              : 'Bill saved — payment pending'
        );
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const built = buildValidatedBill();
    if (!built) return;
    pendingBillRef.current = built;
    setConfirmOpen(true);
  };

  const handleConfirmGenerate = () => {
    const pending = pendingBillRef.current;
    if (!pending) {
      setConfirmOpen(false);
      return;
    }
    submitBill(pending.newBill, pending.newBillId);
  };

  const serviceReady = Boolean(deptId && doctorId);
  const itemsStepDisabled =
    !patientId ||
    !serviceReady ||
    (Boolean(selectedPatient) && !patientApptsFetched) ||
    !grandTotal ||
    grandTotal <= 0;

  const confirmSummary = {
    patientName: displayPatient?.name ?? selectedPatient?.name,
    uhid: displayPatient?.id ?? selectedPatient?.id,
    doctorName: service?.doctorName,
    deptName: service?.deptName,
    appointmentLabel:
      billAppointment?.date && billAppointment?.time
        ? `${billAppointment.date} at ${billAppointment.time}`
        : billAppointment?.date || null,
    grandTotal,
    outstanding: billingContext?.outstanding ?? 0,
    todayBillCount: billingContext?.todayCount ?? 0,
  };

  const handleSuccessClose = () => {
    setSuccessBill(null);
    navigate(ROUTES.BILLING);
  };

  return (
    <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
    <div className="opd-bill page-container">
      <div className="opd-bill__toolbar">
        <Button variant="outline" size="sm" type="button" onClick={() => navigate(ROUTES.BILLING)}>
          <ArrowLeft size={16} /> Back
        </Button>
      </div>
      <div className="card card__body opd-bill__card">
        <form onSubmit={handleSubmit} className="opd-form">
          <OpdBillPatientSection
            patientOptions={patientOptions}
            patientId={patientId}
            onPatientChange={handlePatientChange}
            onPatientSearchChange={handlePatientSearchChange}
            patientSearchSynced={patientSearchSynced}
            fieldErrors={fieldErrors}
            selectedPatient={displayPatient}
            service={service}
            billAppointment={billAppointment}
            patientApptsFetched={patientApptsFetched}
            serviceReady={serviceReady}
            departments={departments}
            doctors={doctors}
            deptId={deptId}
            doctorId={doctorId}
            onDeptChange={handleDeptChange}
            onDoctorChange={handleDoctorChange}
            billingContext={billingContext}
            duplicateBills={duplicateBills}
            existingBillAcknowledged={existingBillAcknowledged}
            onAcknowledgeExistingBill={() => setExistingBillAcknowledged(true)}
            onOpenBill={handleOpenBill}
            onOpenOutstanding={handleOpenOutstanding}
          />

          {billStep === 'items' ? (
            <>
              <OpdBillItemsTable
                items={items}
                itemsScrollRef={itemsScrollRef}
                quickAddSelection={quickAddSelection}
                onQuickAddSelect={handleQuickAddSelect}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                onAddItem={addItem}
                billItems={pricingBillItems}
                allowManualPriceEntry={allowManualPriceEntry}
              />
              <OpdBillItemsStepFooter
                subtotal={subtotal}
                tax={tax}
                grandTotal={grandTotal}
                gstPercent={gstPercent}
                onContinue={handleContinueToPayment}
                disabled={itemsStepDisabled}
              />
            </>
          ) : (
            <>
              <OpdBillItemsRecap
                items={items}
                subtotal={subtotal}
                tax={tax}
                grandTotal={grandTotal}
                gstPercent={gstPercent}
              />
              <OpdBillPaymentFooter
                mode={mode}
                setMode={setMode}
                setPaymentRef={setPaymentRef}
                payLater={payLater}
                setPayLater={setPayLater}
                amountReceived={amountReceived}
                setAmountReceived={setAmountReceived}
                paymentRef={paymentRef}
                fieldErrors={fieldErrors}
                subtotal={subtotal}
                tax={tax}
                grandTotal={grandTotal}
                gstPercent={gstPercent}
                createBillPending={createBill.isPending}
                patientId={patientId}
                serviceReady={serviceReady}
                selectedPatient={selectedPatient}
                patientApptsFetched={patientApptsFetched}
                enabledPaymentModes={enabledPaymentModes}
                onBack={() => setBillStep('items')}
              />
            </>
          )}
        </form>
      </div>

      <OpdBillConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          pendingBillRef.current = null;
        }}
        onConfirm={handleConfirmGenerate}
        confirming={createBill.isPending}
        summary={confirmSummary}
      />

      <OpdBillSuccessModal
        successBill={successBill}
        onClose={handleSuccessClose}
      />
    </div>
    </QueryFeedback>
  );
}
