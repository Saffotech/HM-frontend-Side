import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePatientsQuery, usePatientQuery } from '@/shared/hooks/queries/usePatientQuery';
import { useBillsQuery, useCreateBillMutation } from '@/shared/hooks/queries/useBillingQuery';
import { usePatientAppointmentsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import { useDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import {
  asPatientList,
  asBillList,
  asPatientPageMeta,
  asAppointmentList,
} from '@/shared/hooks/queries/listDataUtils';
import { Button, QueryFeedback } from '@/shared/components/common';
import { QUICK_BILL_ITEMS } from '@/shared/constants/billing';
import { ROUTES } from '@/shared/constants';
import { calcBillTotals, generateBillId, hasOpenBillToday } from '@/shared/utils/billHelpers';
import {
  createOpdBillRecord,
  pickAppointmentForBillPrefill,
  resolveServiceFromAppointment,
} from '@/features/opd/billing/utils/opdBilling';
import { toast } from '@/shared/utils/toast';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { validatePaymentTransactionRef } from '@/shared/utils/validators';
import { createEmptyBillLineRow } from '@/features/opd/billing/utils/opdBillFormUtils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import OpdBillPatientSection from '@/features/opd/billing/components/OpdBillPatientSection';
import OpdBillItemsTable from '@/features/opd/billing/components/OpdBillItemsTable';
import OpdBillPaymentFooter from '@/features/opd/billing/components/OpdBillPaymentFooter';
import OpdBillSuccessModal from '@/features/opd/billing/components/OpdBillSuccessModal';
import './OpdBillPage.css';

const PATIENT_PAGE_SIZE = 20;

export default function OpdBillPage() {
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedPatientSearch = useDebouncedValue(patientSearch.trim(), 300);
  const [patientPage, setPatientPage] = useState(1);

  useEffect(() => {
    setPatientPage(1);
  }, [debouncedPatientSearch]);

  const { data: patientsData, isLoading: lp, isError: ep, error: errP } = usePatientsQuery({
    fetchAll: false,
    search: debouncedPatientSearch || undefined,
    page: patientPage,
    limit: PATIENT_PAGE_SIZE,
  });
  const patients = asPatientList(patientsData);
  const patientPageMeta = asPatientPageMeta(patientsData);
  const createBill = useCreateBillMutation();
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

  const { data: departments = [] } = useDepartmentsQuery();
  const { data: patientDetail } = usePatientQuery(patientId);
  const selectedPatient =
    patients.find((p) => p.id === patientId) ?? patientDetail ?? null;
  const { data: patientApptsData, isFetched: patientApptsFetched } =
    usePatientAppointmentsQuery({
      patientUid: selectedPatient?.id,
      patientDbId: selectedPatient?.dbId,
      page: 1,
      limit: 20,
      enabled: Boolean(selectedPatient?.dbId || selectedPatient?.id),
    });
  const patientAppointments = asAppointmentList(patientApptsData);
  const { data: todayBillsData } = useBillsQuery({
    fetchAll: false,
    search: selectedPatient?.id || undefined,
    today_only: true,
    page: 1,
    limit: 20,
    enabled: Boolean(patientId),
  });
  const todayBills = asBillList(todayBillsData);
  const { subtotal, tax, grandTotal } = calcBillTotals(items);
  const openBillToday = patientId ? hasOpenBillToday(todayBills, patientId) : false;

  const patientOptions = [
    { value: '', label: 'Clear selection' },
    ...patients.map((p) => ({
      value: p.id,
      label: p.name,
      sublabel: p.phone,
      badge: p.id,
    })),
  ];

  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) setPatientId(pid);
  }, [searchParams]);

  useEffect(() => {
    setDeptId('');
    setDoctorId('');
    prefillDoneForPatientRef.current = null;
    setBillAppointment(null);
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

  const handlePatientChange = useCallback((id) => {
    setPatientId(id);
    setDeptId('');
    setDoctorId('');
    prefillDoneForPatientRef.current = null;
    setBillAppointment(null);
    setItems([createEmptyBillLineRow()]);
    if (fieldErrors.patientId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.patientId;
        return next;
      });
    }
  }, [fieldErrors.patientId]);

  const addItem = () => setItems([...items, createEmptyBillLineRow()]);
  const removeItem = (id) => items.length > 1 && setItems(items.filter((i) => i.id !== id));
  const updateItem = (id, field, value) =>
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const addQuickItem = (name, price) => {
    const emptyIdx = items.findIndex((i) => !i.name && i.unitPrice === 0);
    if (emptyIdx >= 0) {
      const updated = [...items];
      updated[emptyIdx] = { ...updated[emptyIdx], name, unitPrice: price };
      setItems(updated);
    } else {
      setItems([...items, { ...createEmptyBillLineRow(), name, unitPrice: price }]);
    }
  };

  const handleQuickAddSelect = (value) => {
    if (!value) return;
    const item = QUICK_BILL_ITEMS.find((qi) => qi.name === value);
    if (item) addQuickItem(item.name, item.price);
    setQuickAddSelection('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!patientId) nextErrors.patientId = 'Patient is required';
    if (!grandTotal || grandTotal <= 0) nextErrors.amount = 'Amount must be greater than 0';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (!patientApptsFetched) {
      toast.error('Loading appointment details. Please wait.');
      return;
    }
    if (!deptId || !doctorId) {
      toast.error('No appointment found for this patient. Book an appointment first.');
      return;
    }

    if (items.some((i) => !i.name || i.unitPrice <= 0)) {
      toast.error('Complete all item fields');
      return;
    }

    const received = payLater ? 0 : Number(amountReceived);
    if (isNaN(received) || received < 0 || received > grandTotal) {
      toast.error(`Amount received must be between 0 and ${formatCurrency(grandTotal)}`);
      return;
    }
    const refError = validatePaymentTransactionRef(mode, paymentRef, {
      paidAmount: received,
      payLater,
    });
    if (refError) {
      setFieldErrors((prev) => ({ ...prev, paymentRef: refError }));
      toast.error(refError);
      return;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.paymentRef;
      return next;
    });

    const newBillId = generateBillId(0);
    const trimmedRef = paymentRef.trim();
    const newBill = createOpdBillRecord({
      billId: newBillId,
      patient: selectedPatient,
      items,
      grandTotal,
      amountReceived: received,
      paymentMode: mode,
      appointment: billAppointment,
      visitType: 'Walk-in',
      paymentRef: trimmedRef || undefined,
      notes: '',
    });
    newBill.paymentRef = trimmedRef || undefined;
    newBill.payLater = payLater;
    newBill.deptId = deptId;
    newBill.doctorId = doctorId;
    newBill.doctorName = service?.doctorName;
    newBill.deptName = service?.deptName;

    createBill.mutate(newBill, {
      onSuccess: (saved) => {
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

  const service = selectedPatient
    ? resolveServiceFromAppointment(billAppointment, selectedPatient, { departments })
    : null;
  const serviceReady = Boolean(deptId && doctorId);
  const billPaid = !payLater && grandTotal > 0 && (Number(amountReceived) || 0) >= grandTotal;

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
            onPatientSearchChange={setPatientSearch}
            patientPageMeta={patientPageMeta}
            onPatientPageChange={setPatientPage}
            fieldErrors={fieldErrors}
            selectedPatient={selectedPatient}
            service={service}
            billAppointment={billAppointment}
            patientApptsFetched={patientApptsFetched}
            serviceReady={serviceReady}
            openBillToday={openBillToday}
          />

          <OpdBillItemsTable
            items={items}
            itemsScrollRef={itemsScrollRef}
            quickAddSelection={quickAddSelection}
            onQuickAddSelect={handleQuickAddSelect}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onAddItem={addItem}
            billPaid={billPaid}
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
            createBillPending={createBill.isPending}
            patientId={patientId}
            serviceReady={serviceReady}
            selectedPatient={selectedPatient}
            patientApptsFetched={patientApptsFetched}
          />
        </form>
      </div>

      <OpdBillSuccessModal
        successBill={successBill}
        onClose={handleSuccessClose}
      />
    </div>
    </QueryFeedback>
  );
}
