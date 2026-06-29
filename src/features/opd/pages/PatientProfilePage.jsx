import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import PatientProfileTabNav from '@/features/opd/components/patientProfile/PatientProfileTabNav';
import PatientProfilePaymentModal from '@/features/opd/components/patientProfile/PatientProfilePaymentModal';
import PatientProfileHeader from '@/features/opd/components/patientProfile/PatientProfileHeader';
import PatientProfileOverviewTab from '@/features/opd/components/patientProfile/PatientProfileOverviewTab';
import PatientProfileVisitsTab from '@/features/opd/components/patientProfile/PatientProfileVisitsTab';
import PatientProfileBillingTab from '@/features/opd/components/patientProfile/PatientProfileBillingTab';
import PatientProfileAdmissionTab from '@/features/opd/components/patientProfile/PatientProfileAdmissionTab';
import PatientProfileMedicalTab from '@/features/opd/components/patientProfile/PatientProfileMedicalTab';
import {
  usePatientQuery,
  usePatientProfileQuery,
  useDeletePatientMutation,
} from '@/shared/hooks/queries/usePatientQuery';
import { usePatientAppointmentsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import {
  useBillsQuery,
  useBillInvoiceQuery,
  BILLS_PAGE_SIZE,
} from '@/shared/hooks/queries/useBillingQuery';
import { asAppointmentList, asBillList, asBillPageMeta, asAppointmentPageMeta } from '@/shared/hooks/queries/listDataUtils';
import { useBedsQuery } from '@/shared/hooks/queries/useBedsQuery';
import { useDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import { opdReferenceApi } from '@/shared/api/services';
import { Button, QueryFeedback, ConfirmDialog } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { billCollectedAmount } from '@/shared/utils/billHelpers';
import { toast } from '@/shared/utils/toast';
import './PatientProfilePage.css';

export default function PatientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deletePatient = useDeletePatientMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [paymentDetailVisit, setPaymentDetailVisit] = useState(null);
  const { data: patient, isLoading: lp, isError: ep, error: errP } = usePatientQuery(id);
  const {
    data: profile,
    isLoading: lprof,
    isError: eprof,
    error: errProf,
  } = usePatientProfileQuery(patient?.dbId);
  const [activeTab, setActiveTab] = useState('overview');
  const [billPage, setBillPage] = useState(1);
  const [apptPage, setApptPage] = useState(1);

  useEffect(() => {
    setBillPage(1);
    setApptPage(1);
  }, [id]);

  const { data: billsData, isLoading: lbi, isError: ebi, error: errBi } = useBillsQuery({
    fetchAll: false,
    search: id,
    page: billPage,
    limit: BILLS_PAGE_SIZE,
    enabled: activeTab === 'billing' && Boolean(id),
  });
  const { data: apptsData, isLoading: la, isError: ea, error: errA } =
    usePatientAppointmentsQuery({
      patientUid: id,
      patientDbId: patient?.dbId,
      page: apptPage,
      limit: BILLS_PAGE_SIZE,
      enabled: activeTab === 'visits' && Boolean(patient),
    });
  const { data: bedData, isLoading: lb, isError: eb, error: errB } = useBedsQuery({
    enabled: activeTab === 'admission',
  });
  const { data: departments = [] } = useDepartmentsQuery();
  const beds = bedData?.beds ?? [];
  const paymentVisitId = paymentDetailVisit?.visit?.visitId ?? null;
  const {
    data: paymentInvoice,
    isLoading: loadingPayment,
    isError: errorPayment,
    error: paymentError,
  } = useBillInvoiceQuery(paymentVisitId, { enabled: paymentVisitId != null });

  const isLoading = lp || lprof;
  const isError = ep || eprof;
  const error = errP || errProf;
  if (isLoading || isError) {
    return <QueryFeedback isLoading={isLoading} isError={isError} error={error} />;
  }

  if (!patient) {
    return (
      <div className="pp-empty card card__body">
        <p>Patient not found.</p>
        <Link to={ROUTES.PATIENTS}><Button variant="outline">Back to Patients</Button></Link>
      </div>
    );
  }

  const opdVisits = profile?.visits ?? [];
  const registeredDateDisplay =
    patient.registeredDate && patient.registeredDate !== '—'
      ? patient.registeredDate
      : opdVisits.length > 0
        ? opdVisits[opdVisits.length - 1].visitDate
        : null;
  const patientAppts = asAppointmentList(apptsData);
  const apptPageMeta = asAppointmentPageMeta(apptsData);
  const patientBills = asBillList(billsData);
  const billPageMeta = asBillPageMeta(billsData);
  const patientBeds = beds.filter((b) => b.patientId === id);
  const uniqueDepts = [...new Set(opdVisits.map((v) => v.department).filter(Boolean))];
  const deptFromPatient = opdReferenceApi.findDepartment(departments, patient.deptId);
  const primaryDeptName =
    deptFromPatient?.name ??
    opdVisits[0]?.department ??
    patientAppts.find((a) => a.deptName)?.deptName ??
    uniqueDepts[0] ??
    null;
  const docName =
    patientAppts.find((a) => a.doctorName)?.doctorName ??
    opdVisits[0]?.doctorName ??
    (patient.doctorId ? `Doctor #${patient.doctorId}` : null);
  const uniqueDoctors = [
    ...new Set(
      [...opdVisits.map((v) => v.doctorName), ...patientAppts.map((a) => a.doctorName)].filter(
        Boolean
      )
    ),
  ];

  const totalBilled =
    profile?.summary?.totalBilled ??
    opdVisits.reduce((s, v) => s + (v.grandTotal ?? 0), 0);
  const totalPaid = opdVisits.reduce(
    (s, v) => s + billCollectedAmount(v.grandTotal, v.balanceDue, v.paidAmount),
    0
  );
  const outstanding =
    profile?.summary?.outstanding ??
    opdVisits.reduce((s, v) => s + (v.balanceDue ?? 0), 0);

  const tabCounts = {
    visits: profile?.summary?.totalVisits ?? opdVisits.length,
    billing: billPageMeta.total || profile?.summary?.totalVisits,
    admission: patientBeds.length,
  };

  return (
    <div className="pp">
      <ConfirmDialog
        isOpen={deleteOpen}
        message={`Delete patient ${patient.name} (${patient.id})? This cannot be undone.`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          deletePatient.mutate(patient.dbId ?? patient.id, {
            onSuccess: () => {
              toast.success('Patient deleted');
              navigate(ROUTES.PATIENTS);
            },
          });
        }}
      />

      <PatientProfilePaymentModal
        paymentDetailVisit={paymentDetailVisit}
        onClose={() => setPaymentDetailVisit(null)}
        paymentInvoice={paymentInvoice}
        loadingPayment={loadingPayment}
        errorPayment={errorPayment}
        paymentError={paymentError}
      />

      <PatientProfileHeader
        patient={patient}
        id={id}
        registeredDateDisplay={registeredDateDisplay}
        totalVisits={profile?.summary?.totalVisits ?? opdVisits.length}
        totalBilled={totalBilled}
        totalPaid={totalPaid}
        outstanding={outstanding}
        onBack={() => navigate(ROUTES.PATIENTS)}
        onDelete={() => setDeleteOpen(true)}
      />

      <div className="pp-shell">
        <PatientProfileTabNav
          activeTab={activeTab}
          onChange={setActiveTab}
          tabCounts={tabCounts}
        />

        <div className="pp-panel" role="tabpanel">
          {activeTab === 'overview' && (
            <PatientProfileOverviewTab
              patient={patient}
              opdVisits={opdVisits}
              primaryDeptName={primaryDeptName}
              docName={docName}
              expandedVisit={expandedVisit}
              setExpandedVisit={setExpandedVisit}
              setPaymentDetailVisit={setPaymentDetailVisit}
            />
          )}

          {activeTab === 'visits' && (
            <PatientProfileVisitsTab
              opdVisits={opdVisits}
              patientAppts={patientAppts}
              apptPageMeta={apptPageMeta}
              apptPage={apptPage}
              setApptPage={setApptPage}
              uniqueDoctors={uniqueDoctors}
              la={la}
              ea={ea}
              errA={errA}
            />
          )}

          {activeTab === 'billing' && (
            <PatientProfileBillingTab
              id={id}
              patientBills={patientBills}
              billPageMeta={billPageMeta}
              billPage={billPage}
              setBillPage={setBillPage}
              lbi={lbi}
              ebi={ebi}
              errBi={errBi}
            />
          )}

          {activeTab === 'admission' && (
            <PatientProfileAdmissionTab
              patientBeds={patientBeds}
              lb={lb}
              eb={eb}
              errB={errB}
            />
          )}

          {activeTab === 'medical' && (
            <PatientProfileMedicalTab uniqueDepts={uniqueDepts} />
          )}
        </div>
      </div>
    </div>
  );
}
