/**
 * Admit patient form — existing patient search OR register new (Patient Master only).
 * Registration creates UHID demographics via POST /ipd/patients/register — no OPD visit/bill.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, DateInput } from "@/shared/components/common";
import { BLOOD_GROUPS, GENDERS, ROUTES } from "@/shared/constants";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { usePatientsQuery } from "@/shared/hooks/queries/usePatientQuery";
import { asPatientList } from "@/shared/hooks/queries/listDataUtils";
import {
  uiToApiPatient,
  apiToUiPatient,
} from "@/shared/api/mappers/patientMapper";
import { formatAadhaarInput } from "@/shared/utils/validators";
import { toast } from "@/shared/utils/toast";
import { useIpdPermissionSet } from "@/features/ipd/hooks/useIpdPermission";
import IpdPermissionButton from "@/features/ipd/components/IpdPermissionButton";
import {
  useCreateIpdAdmissionMutation,
  useIpdBedsQuery,
  useIpdDepartmentsQuery,
  useIpdDoctorsByDepartmentQuery,
  useRegisterIpdPatientMutation,
} from "@/features/ipd/hooks/useIpdQuery";
import { useIpdWardOptions } from "@/features/ipd/hooks/useIpdWardOptions";
import { useIpdBedRateLookup } from "@/features/ipd/hooks/useIpdBedRateLookup";
import { toIsoAdmissionDate } from '@/features/ipd/utils/ipdFormat';
import {
  buildInsuranceAdmitContext,
  buildPayAndClaimInsuranceProfile,
  insuranceAdmitRouteId,
} from "@/features/ipd/utils/insuranceAdmitPayload";
import { validateRegisterPatient } from "@/features/opd/utils/registerPatientUtils";
import { formatCurrency } from '@/shared/utils/formatCurrency';

const INITIAL = {
  patientMode: "existing", // existing | register
  patientSearch: "",
  patientDbId: "",
  selectedLabel: "",
  // register demographics
  name: "",
  gender: "",
  phone: "",
  dob: "",
  bloodGroup: "",
  address: "",
  state: "",
  aadhaar: "",
  // admission
  ward: "",
  bedId: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  departmentId: "",
  doctorId: "",
  // payment (UI only — not sent to admission API)
  paymentMode: "", // self | insurance
  selfPayMethod: "", // cash | card | upi
  insuranceClaimType: "", // cashless | pay_and_claim
  insuranceCompany: "",
  memberId: "",
  policyNumber: "",
  policyHolderName: "",
  relationship: "",
  claimedAmount: "",
  estimateAmount: "",
};

function toIsoDateParam(value) {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function validateAdmission(values) {
  const errors = {};
  if (!values.patientDbId) {
    errors.patient =
      values.patientMode === "register"
        ? "Register a patient first, or switch to search"
        : "Select a patient from the search results";
  }
  if (!values.ward) errors.ward = "Ward is required";
  if (!values.bedId) errors.bed = "Bed is required";
  if (!toIsoDateParam(values.admissionDate))
    errors.admissionDate = "Admission date is required";
  if (!values.paymentMode) errors.paymentMode = "Payment mode is required";
  if (values.paymentMode === "self" && !values.selfPayMethod) {
    errors.selfPayMethod = "Select Cash, Card, or UPI";
  }
  if (values.paymentMode === "insurance") {
    if (!values.insuranceClaimType) {
      errors.insuranceClaimType = "Select Cashless or Copay";
    } else {
      if (!String(values.insuranceCompany || "").trim()) {
        errors.insuranceCompany = "Insurance company is required";
      }
      if (!String(values.policyNumber || "").trim()) {
        errors.policyNumber = "Policy number is required";
      }
      if (!String(values.policyHolderName || "").trim()) {
        errors.policyHolderName = "Policy holder name is required";
      }
      if (!String(values.relationship || "").trim()) {
        errors.relationship = "Relationship is required";
      }
      const claimed = Number(values.claimedAmount);
      if (Number.isNaN(claimed) || claimed <= 0) {
        errors.claimedAmount = "Enter a valid claimed amount";
      }
      if (String(values.estimateAmount || "").trim()) {
        const estimate = Number(values.estimateAmount);
        if (Number.isNaN(estimate) || estimate < 0) {
          errors.estimateAmount = "Enter a valid estimate amount";
        }
      }
    }
  }
  return errors;
}

export default function AdmitPatientForm() {
  const navigate = useNavigate();
  const { canAdmit, canCreatePatient } = useIpdPermissionSet();
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const debouncedSearch = useDebouncedValue(values.patientSearch, 300);
  const patientsQuery = usePatientsQuery({
    fetchAll: false,
    search: debouncedSearch,
    page: 1,
    limit: 10,
    enabled:
      values.patientMode === "existing" &&
      !values.patientDbId &&
      debouncedSearch.trim().length >= 2,
  });
  const patientOptions = asPatientList(patientsQuery.data);

  const bedsQuery = useIpdBedsQuery({
    ward: values.ward || undefined,
    status: "available",
  });
  const availableBeds = (bedsQuery.data?.beds ?? []).filter(
    (bed) => bed.status === "available",
  );
  const { wardOptions, isLoading: wardsLoading } = useIpdWardOptions();
  const { getRate, ratesAvailable } = useIpdBedRateLookup();

  const departmentsQuery = useIpdDepartmentsQuery();
  const doctorsQuery = useIpdDoctorsByDepartmentQuery(
    values.departmentId || null,
  );

  const admitMutation = useCreateIpdAdmissionMutation();
  const registerMutation = useRegisterIpdPatientMutation();

  const set = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "ward") next.bedId = "";
      if (key === "departmentId") next.doctorId = "";
      if (key === "patientSearch") {
        next.patientDbId = "";
        next.selectedLabel = "";
      }
      if (key === "patientMode") {
        next.patientSearch = "";
        next.patientDbId = "";
        next.selectedLabel = "";
        next.name = "";
        next.gender = "";
        next.phone = "";
        next.dob = "";
        next.bloodGroup = "";
        next.address = "";
        next.state = "";
        next.aadhaar = "";
      }
      if (key === "paymentMode") {
        next.selfPayMethod = "";
        next.insuranceClaimType = "";
        next.insuranceCompany = "";
        next.memberId = "";
        next.policyNumber = "";
        next.policyHolderName = "";
        next.relationship = "";
        next.claimedAmount = "";
        next.estimateAmount = "";
      }
      return next;
    });
    setSubmitError("");
    setRegisterError("");
  };

  const selectPatient = (patient) => {
    setValues((prev) => ({
      ...prev,
      patientMode: "existing",
      patientDbId: String(patient.dbId),
      patientSearch: patient.name || prev.patientSearch,
      selectedLabel: [patient.name, patient.id].filter(Boolean).join(" · "),
    }));
    setErrors((prev) => ({ ...prev, patient: undefined }));
    setRegisterError("");
  };

  const onRegisterPatient = async () => {
    setRegisterError("");
    const demoErrors = validateRegisterPatient({
      name: values.name,
      phone: values.phone,
      dob: values.dob,
      aadhaar: values.aadhaar,
    });
    setErrors((prev) => ({ ...prev, ...demoErrors }));
    if (Object.keys(demoErrors).length > 0) return;

    const raw = uiToApiPatient({
      name: values.name,
      gender: values.gender || undefined,
      phone: values.phone.replace(/\s/g, ""),
      dob: values.dob,
      bloodGroup: values.bloodGroup || undefined,
      address: values.address || undefined,
      state: values.state || undefined,
      aadhaar: values.aadhaar,
    });
    const payload = Object.fromEntries(
      Object.entries(raw).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );

    try {
      const result = await registerMutation.mutateAsync(payload);
      const uiPatient = apiToUiPatient(result.patient ?? result);
      toast.success(
        `Registered ${uiPatient?.name || result.patient_uid} — continue admission`,
      );
      selectPatient({
        dbId: result.patient_id ?? uiPatient?.dbId,
        id: result.patient_uid ?? uiPatient?.id,
        name: uiPatient?.name,
      });
    } catch (err) {
      setRegisterError(
        err?.message || "Patient registration failed. Please try again.",
      );
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError("");
    const nextErrors = validateAdmission(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      patient_id: Number(values.patientDbId),
      bed_id: Number(values.bedId),
      doctor_id: values.doctorId ? Number(values.doctorId) : null,
      department_id: values.departmentId ? Number(values.departmentId) : null,
      admission_date: toIsoAdmissionDate(values.admissionDate),
      diagnosis: null,
      notes: null,
    };

    try {
      const created = await admitMutation.mutateAsync(payload);
      toast.success(
        `Admitted ${created?.patient_name || "patient"} successfully`,
      );

      if (values.paymentMode === "insurance") {
        if (values.insuranceClaimType === "pay_and_claim") {
          const profile = buildPayAndClaimInsuranceProfile(created, values);
          navigate(
            ROUTES.IPD_PATIENT_DETAIL.replace(
              ":admissionId",
              String(created.id),
            ),
            { state: { payAndClaimInsurance: profile } },
          );
          return;
        }

        const insuranceAdmit = buildInsuranceAdmitContext(created, values);
        const routePatientId = insuranceAdmitRouteId(created);
        navigate(
          ROUTES.IPD_INSURANCE_PATIENT.replace(":patientId", routePatientId),
          { state: { insuranceAdmit } },
        );
        return;
      }

      navigate(
        ROUTES.IPD_PATIENT_DETAIL.replace(":admissionId", String(created.id)),
      );
    } catch (err) {
      setSubmitError(err?.message || "Admission failed. Please try again.");
    }
  };

  const show = (key) => touched && errors[key];

  const selectedBed = availableBeds.find(
    (bed) => String(bed.id) === String(values.bedId),
  );
  const selectedDepartment = (departmentsQuery.data ?? []).find(
    (dept) => String(dept.id) === String(values.departmentId),
  );
  const selectedDoctor = (doctorsQuery.data ?? []).find(
    (doc) => String(doc.id) === String(values.doctorId),
  );

  const summaryRows = [
    { label: "Patient", value: values.selectedLabel },
    { label: "Ward", value: values.ward },
    { label: "Bed", value: selectedBed?.bed_number },
    { label: "Admission date", value: values.admissionDate },
    { label: "Department", value: selectedDepartment?.name },
    { label: "Doctor", value: selectedDoctor?.name },
    {
      label: "Payment",
      value:
        values.paymentMode === "self" && values.selfPayMethod
          ? `Self · ${
              { cash: "Cash", card: "Card", upi: "UPI" }[values.selfPayMethod]
            }`
          : values.paymentMode === "insurance" && values.insuranceClaimType
            ? `Insurance · ${
                values.insuranceClaimType === "cashless"
                  ? "Cashless"
                  : "Copay"
              }`
            : values.paymentMode === "self"
              ? "Self"
              : values.paymentMode === "insurance"
                ? "Insurance"
                : "",
    },
  ];
  const paymentReady =
    values.paymentMode === "self"
      ? Boolean(values.selfPayMethod)
      : values.paymentMode === "insurance"
        ? Boolean(
            values.insuranceClaimType &&
              String(values.insuranceCompany || "").trim() &&
              String(values.policyNumber || "").trim() &&
              String(values.policyHolderName || "").trim() &&
              String(values.relationship || "").trim() &&
              Number(values.claimedAmount) > 0,
          )
        : false;
  const readyToAdmit = Boolean(
    values.patientDbId && values.ward && values.bedId && paymentReady,
  );

  return (
    <form className="ipd-admit-layout" onSubmit={onSubmit} noValidate>
      <div className="ipd-admit-main">
        <div className="ipd-card">
          <div className="ipd-card__head">
            <h2 className="ipd-card__title">
              <span className="ipd-step-badge">1</span>
              Patient
            </h2>
            <div
              className="ipd-mode-toggle"
              role="tablist"
              aria-label="Patient workflow"
            >
              <button
                type="button"
                role="tab"
                aria-selected={values.patientMode === "existing"}
                className={`ipd-mode-toggle__btn${
                  values.patientMode === "existing"
                    ? " ipd-mode-toggle__btn--active"
                    : ""
                }`}
                onClick={() => set("patientMode", "existing")}
              >
                Existing patient
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={values.patientMode === "register"}
                className={`ipd-mode-toggle__btn${
                  values.patientMode === "register"
                    ? " ipd-mode-toggle__btn--active"
                    : ""
                }`}
                onClick={() => set("patientMode", "register")}
                disabled={!canCreatePatient}
                title={
                  canCreatePatient
                    ? "Register Patient Master (no OPD visit)"
                    : "You do not have permission to register patients"
                }
              >
                Register new
              </button>
            </div>
          </div>

          <div className="ipd-card__body">
            {values.patientMode === "existing" ? (
              <div className="ipd-form-grid">
                {values.patientDbId ? (
                  <div className="ipd-form-grid--full">
                    <div className="ipd-selected-patient ipd-selected-patient--confirmed">
                      <div>
                        <span className="ipd-selected-patient__label">
                          Selected patient
                        </span>
                        <strong>{values.selectedLabel}</strong>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setValues((prev) => ({
                            ...prev,
                            patientDbId: "",
                            selectedLabel: "",
                            patientSearch: "",
                          }));
                          setErrors((prev) => ({
                            ...prev,
                            patient: undefined,
                          }));
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="ipd-toolbar__field ipd-form-grid--full">
                    <label
                      className="ipd-toolbar__label"
                      htmlFor="ipd-admit-search"
                    >
                      Patient search
                    </label>
                    <input
                      id="ipd-admit-search"
                      className="ipd-input"
                      value={values.patientSearch}
                      onChange={(e) => set("patientSearch", e.target.value)}
                      placeholder="Search patient"
                    />
                    {show("patient") ? (
                      <span className="ipd-field-error">{errors.patient}</span>
                    ) : null}
                    {debouncedSearch.trim().length >= 2 ? (
                      <div
                        className="ipd-table-wrap"
                        style={{ marginTop: "0.75rem" }}
                      >
                        {patientsQuery.isLoading ? (
                          <p className="ipd-page__subtitle">Searching…</p>
                        ) : patientOptions.length === 0 ? (
                          <p className="ipd-page__subtitle">
                            No patients found.{" "}
                            {canCreatePatient ? (
                              <button
                                type="button"
                                className="ipd-text-link"
                                onClick={() => set("patientMode", "register")}
                              >
                                Register new patient
                              </button>
                            ) : null}
                          </p>
                        ) : (
                          <table className="ipd-table">
                            <thead>
                              <tr>
                                <th>UHID</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {patientOptions.map((patient) => (
                                <tr key={patient.dbId ?? patient.id}>
                                  <td>{patient.id || "—"}</td>
                                  <td>{patient.name || "—"}</td>
                                  <td>{patient.phone || "—"}</td>
                                  <td>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => selectPatient(patient)}
                                    >
                                      Select
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="ipd-form-grid">
                <p className="ipd-page__subtitle ipd-form-grid--full">
                  Creates Patient Master only (UHID). No OPD visit, token, or
                  consultation bill.
                </p>
                <div className="ipd-toolbar__field ipd-form-grid--full">
                  <label className="ipd-toolbar__label" htmlFor="ipd-reg-name">
                    Full name *
                  </label>
                  <input
                    id="ipd-reg-name"
                    className="ipd-input"
                    value={values.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Patient full name"
                  />
                  {errors.name ? (
                    <span className="ipd-field-error">{errors.name}</span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label className="ipd-toolbar__label" htmlFor="ipd-reg-phone">
                    Phone *
                  </label>
                  <input
                    id="ipd-reg-phone"
                    className="ipd-input"
                    value={values.phone}
                    onChange={(e) =>
                      set(
                        "phone",
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                  />
                  {errors.phone ? (
                    <span className="ipd-field-error">{errors.phone}</span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-reg-gender"
                  >
                    Gender
                  </label>
                  <select
                    id="ipd-reg-gender"
                    className="ipd-select"
                    value={values.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option value="">Optional…</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ipd-toolbar__field">
                  <label className="ipd-toolbar__label" htmlFor="ipd-reg-dob">
                    Date of birth *
                  </label>
                  <DateInput
                    id="ipd-reg-dob"
                    className="ipd-date-input"
                    value={toIsoDateParam(values.dob)}
                    onChange={(e) => set("dob", toIsoDateParam(e.target.value))}
                    placeholder="DD/MM/YYYY"
                    aria-label="Date of birth"
                  />
                  {errors.dob ? (
                    <span className="ipd-field-error">{errors.dob}</span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label className="ipd-toolbar__label" htmlFor="ipd-reg-blood">
                    Blood group
                  </label>
                  <select
                    id="ipd-reg-blood"
                    className="ipd-select"
                    value={values.bloodGroup}
                    onChange={(e) => set("bloodGroup", e.target.value)}
                  >
                    <option value="">Optional…</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ipd-toolbar__field">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-reg-aadhaar"
                  >
                    Aadhaar *
                  </label>
                  <input
                    id="ipd-reg-aadhaar"
                    className="ipd-input"
                    value={values.aadhaar}
                    onChange={(e) =>
                      set("aadhaar", formatAadhaarInput(e.target.value))
                    }
                    placeholder="XXXX-XXXX-XXXX"
                    inputMode="numeric"
                  />
                  {errors.aadhaar ? (
                    <span className="ipd-field-error">{errors.aadhaar}</span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label className="ipd-toolbar__label" htmlFor="ipd-reg-state">
                    State
                  </label>
                  <input
                    id="ipd-reg-state"
                    className="ipd-input"
                    value={values.state}
                    onChange={(e) => set("state", e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="ipd-toolbar__field ipd-form-grid--full">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-reg-address"
                  >
                    Address
                  </label>
                  <input
                    id="ipd-reg-address"
                    className="ipd-input"
                    value={values.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                {registerError ? (
                  <p
                    className="ipd-field-error ipd-form-grid--full"
                    role="alert"
                  >
                    {registerError}
                  </p>
                ) : null}
                <div className="ipd-form-actions ipd-form-grid--full">
                  <IpdPermissionButton
                    allowed={canCreatePatient}
                    deniedMessage="You do not have permission to register patients"
                    type="button"
                    className="btn btn--secondary"
                    disabled={registerMutation.isPending}
                    onClick={onRegisterPatient}
                  >
                    {registerMutation.isPending
                      ? "Registering…"
                      : "Register patient"}
                  </IpdPermissionButton>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ipd-card">
          <div className="ipd-card__head">
            <h2 className="ipd-card__title">
              <span className="ipd-step-badge">2</span>
              Admission details
            </h2>
          </div>
          <div className="ipd-card__body ipd-form-grid">
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-admit-ward">
                Ward
              </label>
              <select
                id="ipd-admit-ward"
                className="ipd-select"
                value={values.ward}
                onChange={(e) => set("ward", e.target.value)}
                disabled={wardsLoading}
              >
                <option value="">
                  {wardsLoading
                    ? "Loading wards…"
                    : wardOptions.length === 0
                      ? "No wards in inventory"
                      : "Select ward…"}
                </option>
                {wardOptions.map((w) => {
                  const rate = ratesAvailable ? getRate(w) : null;
                  return (
                    <option key={w} value={w}>
                      {rate != null
                        ? `${w} · ${formatCurrency(rate, { empty: '—' })}/day`
                        : w}
                    </option>
                  );
                })}
              </select>
              {show("ward") ? (
                <span className="ipd-field-error">{errors.ward}</span>
              ) : null}
            </div>
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-admit-bed">
                Bed
              </label>
              <select
                id="ipd-admit-bed"
                className="ipd-select"
                value={values.bedId}
                onChange={(e) => set("bedId", e.target.value)}
                disabled={!values.ward || bedsQuery.isLoading}
              >
                <option value="">
                  {!values.ward
                    ? "Select ward first…"
                    : bedsQuery.isLoading
                      ? "Loading beds…"
                      : availableBeds.length === 0
                        ? "No available beds"
                        : "Select bed…"}
                </option>
                {availableBeds.map((bed) => {
                  const rate = ratesAvailable ? getRate(bed) : null;
                  return (
                    <option key={bed.id} value={bed.id}>
                      {rate != null
                        ? `${bed.bed_number} · ${formatCurrency(rate, { empty: '—' })}/day`
                        : bed.bed_number}
                    </option>
                  );
                })}
              </select>
              {show("bed") ? (
                <span className="ipd-field-error">{errors.bed}</span>
              ) : null}
            </div>
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-admit-date">
                Admission date
              </label>
              <DateInput
                id="ipd-admit-date"
                className="ipd-date-input"
                value={toIsoDateParam(values.admissionDate)}
                onChange={(e) =>
                  set("admissionDate", toIsoDateParam(e.target.value))
                }
                placeholder="DD/MM/YYYY"
                aria-label="Admission date"
              />
              {show("admissionDate") ? (
                <span className="ipd-field-error">{errors.admissionDate}</span>
              ) : null}
            </div>
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-admit-dept">
                Department
              </label>
              <select
                id="ipd-admit-dept"
                className="ipd-select"
                value={values.departmentId}
                onChange={(e) => set("departmentId", e.target.value)}
                disabled={departmentsQuery.isLoading}
              >
                <option value="">
                  {departmentsQuery.isLoading
                    ? "Loading departments…"
                    : (departmentsQuery.data ?? []).length === 0
                      ? "No departments available"
                      : "Optional…"}
                </option>
                {(departmentsQuery.data ?? []).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-admit-doctor">
                Doctor
              </label>
              <select
                id="ipd-admit-doctor"
                className="ipd-select"
                value={values.doctorId}
                onChange={(e) => set("doctorId", e.target.value)}
                disabled={!values.departmentId || doctorsQuery.isLoading}
              >
                <option value="">
                  {!values.departmentId
                    ? "Select department first…"
                    : doctorsQuery.isLoading
                      ? "Loading doctors…"
                      : (doctorsQuery.data ?? []).length === 0
                        ? "No doctors in this department"
                        : "Optional…"}
                </option>
                {(doctorsQuery.data ?? []).map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="ipd-card">
          <div className="ipd-card__head">
            <h2 className="ipd-card__title">
              <span className="ipd-step-badge">3</span>
              Payment
            </h2>
          </div>
          <div className="ipd-card__body ipd-form-grid">
            <div className="ipd-toolbar__field">
              <label
                className="ipd-toolbar__label"
                htmlFor="ipd-admit-pay-mode"
              >
                Payment mode
              </label>
              <select
                id="ipd-admit-pay-mode"
                className="ipd-select"
                value={values.paymentMode}
                onChange={(e) => set("paymentMode", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="self">Self</option>
                <option value="insurance">Insurance</option>
              </select>
              {show("paymentMode") ? (
                <span className="ipd-field-error">{errors.paymentMode}</span>
              ) : null}
            </div>

            {values.paymentMode === "self" ? (
              <div className="ipd-toolbar__field">
                <label
                  className="ipd-toolbar__label"
                  htmlFor="ipd-admit-self-method"
                >
                  Method
                </label>
                <select
                  id="ipd-admit-self-method"
                  className="ipd-select"
                  value={values.selfPayMethod}
                  onChange={(e) => set("selfPayMethod", e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
                {show("selfPayMethod") ? (
                  <span className="ipd-field-error">
                    {errors.selfPayMethod}
                  </span>
                ) : null}
              </div>
            ) : null}

            {values.paymentMode === "insurance" ? (
              <div className="ipd-toolbar__field">
                <label
                  className="ipd-toolbar__label"
                  htmlFor="ipd-admit-claim-type"
                >
                  Claim type
                </label>
                <select
                  id="ipd-admit-claim-type"
                  className="ipd-select"
                  value={values.insuranceClaimType}
                  onChange={(e) => set("insuranceClaimType", e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="cashless">Cashless</option>
                  <option value="pay_and_claim">Copay</option>
                </select>
                {show("insuranceClaimType") ? (
                  <span className="ipd-field-error">
                    {errors.insuranceClaimType}
                  </span>
                ) : null}
              </div>
            ) : null}

            {values.paymentMode === "insurance" &&
            values.insuranceClaimType ? (
              <>
                <div className="ipd-toolbar__field">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-admit-ins-company"
                  >
                    Insurance company
                  </label>
                  <input
                    id="ipd-admit-ins-company"
                    className="ipd-input"
                    value={values.insuranceCompany}
                    onChange={(e) => set("insuranceCompany", e.target.value)}
                    placeholder="Company name"
                  />
                  {show("insuranceCompany") ? (
                    <span className="ipd-field-error">
                      {errors.insuranceCompany}
                    </span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-admit-policy-no"
                  >
                    Policy number
                  </label>
                  <input
                    id="ipd-admit-policy-no"
                    className="ipd-input"
                    value={values.policyNumber}
                    onChange={(e) => set("policyNumber", e.target.value)}
                    placeholder="Policy number"
                  />
                  {show("policyNumber") ? (
                    <span className="ipd-field-error">
                      {errors.policyNumber}
                    </span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-admit-holder"
                  >
                    Policy holder name
                  </label>
                  <input
                    id="ipd-admit-holder"
                    className="ipd-input"
                    value={values.policyHolderName}
                    onChange={(e) => set("policyHolderName", e.target.value)}
                    placeholder="Full name"
                  />
                  {show("policyHolderName") ? (
                    <span className="ipd-field-error">
                      {errors.policyHolderName}
                    </span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-admit-relation"
                  >
                    Relationship
                  </label>
                  <input
                    id="ipd-admit-relation"
                    className="ipd-input"
                    value={values.relationship}
                    onChange={(e) => set("relationship", e.target.value)}
                    placeholder="e.g. Self, Spouse"
                  />
                  {show("relationship") ? (
                    <span className="ipd-field-error">
                      {errors.relationship}
                    </span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-admit-claimed-amount"
                  >
                    Claimed amount
                  </label>
                  <input
                    id="ipd-admit-claimed-amount"
                    className="ipd-input"
                    value={values.claimedAmount}
                    onChange={(e) =>
                      set("claimedAmount", e.target.value.replace(/[^\d.]/g, ""))
                    }
                    placeholder="0"
                    inputMode="decimal"
                  />
                  {show("claimedAmount") ? (
                    <span className="ipd-field-error">
                      {errors.claimedAmount}
                    </span>
                  ) : null}
                </div>
                <div className="ipd-toolbar__field">
                  <label
                    className="ipd-toolbar__label"
                    htmlFor="ipd-admit-estimate-amount"
                  >
                    Estimate amount (optional)
                  </label>
                  <input
                    id="ipd-admit-estimate-amount"
                    className="ipd-input"
                    value={values.estimateAmount}
                    onChange={(e) =>
                      set(
                        "estimateAmount",
                        e.target.value.replace(/[^\d.]/g, ""),
                      )
                    }
                    placeholder="Optional"
                    inputMode="decimal"
                  />
                  {show("estimateAmount") ? (
                    <span className="ipd-field-error">
                      {errors.estimateAmount}
                    </span>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="ipd-admit-rail">
        <div className="ipd-card ipd-admit-summary">
          <div className="ipd-card__head">
            <h2 className="ipd-card__title">Admission summary</h2>
            <span
              className={`ipd-ready-pill${
                readyToAdmit ? " ipd-ready-pill--ok" : ""
              }`}
            >
              {readyToAdmit ? "Ready" : "Incomplete"}
            </span>
          </div>
          <div className="ipd-card__body">
            <dl className="ipd-summary-list">
              {summaryRows.map((row) => (
                <div key={row.label} className="ipd-summary-list__row">
                  <dt>{row.label}</dt>
                  <dd className={row.value ? "" : "ipd-summary-list__empty"}>
                    {row.value || "Not set"}
                  </dd>
                </div>
              ))}
            </dl>

            {submitError ? (
              <p
                className="ipd-field-error"
                role="alert"
                style={{ marginTop: "0.75rem" }}
              >
                {submitError}
              </p>
            ) : null}

            <div className="ipd-admit-actions">
              <IpdPermissionButton
                allowed={canAdmit}
                deniedMessage="You do not have permission to admit patients"
                type="submit"
                className="btn btn--primary"
                disabled={admitMutation.isPending || !values.patientDbId}
              >
                {admitMutation.isPending ? "Admitting…" : "Admit patient"}
              </IpdPermissionButton>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setValues(INITIAL);
                  setErrors({});
                  setTouched(false);
                  setSubmitError("");
                  setRegisterError("");
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}
