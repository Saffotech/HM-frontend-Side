import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { hasPlatformAccessToken } from "../../../../shared/api/platformSession";
import { createPlatformStaff, listPlatformStaff } from "../../../../shared/api/platformStaffApi";
import {
  PLATFORM_STAFF_ROLES,
  createSubmitGuard,
  interpretStaffError,
  mapStaffDirectory,
  platformStaffRoleLabel,
  staffCreatedNotice,
  validatePlatformStaff,
} from "../../../../shared/api/platformStaff";
import Button from "../../../../shared/components/Button";
import DataTable from "../../../../shared/components/DataTable";
import Input from "../../../../shared/components/Input";
import Modal from "../../../../shared/components/Modal";
import PasswordField from "../../../../shared/components/PasswordField";
import Select from "../../../../shared/components/Select";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { useToast } from "../../../../shared/hooks/useToast";
import { UNIVERSAL_LOGIN } from "../../../../shared/paths";
import { canSubmitRegistration } from "../../../../shared/utils/registrationGate";
import "./PlatformStaff.css";

const blank = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "",
};

function Label({ text, optional = false }) {
  return (
    <>
      {text}
      {!optional && <span className="req" aria-hidden="true"> *</span>}
    </>
  );
}

function displayName(person) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email;
}

export default function PlatformStaff() {
  const { signOutPortal } = usePlatform();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [guard] = useState(() => createSubmitGuard());
  const signedIn = hasPlatformAccessToken();
  const canSubmit = canSubmitRegistration({ signedIn, busy: submitting });

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const body = await listPlatformStaff();
      const mapped = mapStaffDirectory(body);
      if (!mapped.ok) {
        setListError("Staff directory response was not a list.");
        return;
      }
      setRows(mapped.rows);
    } catch (error) {
      const result = interpretStaffError(error);
      setListError(result.toast);
      if (result.unauthenticated && signedIn) signOutPortal("platform");
    } finally {
      setLoading(false);
    }
  }, [signOutPortal, signedIn]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setErrors({});
    setFormError("");
    setRetryable(false);
  };

  const register = async (formValues) => {
    if (!canSubmitRegistration({ signedIn, busy: false })) return;
    if (!guard.tryStart()) return;
    const nextErrors = validatePlatformStaff(formValues);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setFormError("");
      setRetryable(false);
      guard.finish();
      return;
    }

    setSubmitting(true);
    setFormError("");
    setRetryable(false);
    try {
      const body = await createPlatformStaff(formValues);
      const notice = staffCreatedNotice(body);
      if (!notice) {
        setFormError("Registration did not confirm the new account. It was not marked as created.");
        return;
      }
      setValues(blank);
      setErrors({});
      setOpen(false);
      push(`${notice.message}. ${displayName(notice)} (${notice.email}) was created.`, "success");
      await loadStaff();
    } catch (error) {
      const result = interpretStaffError(error);
      if (Object.keys(result.fieldErrors).length) {
        setErrors((current) => ({ ...current, ...result.fieldErrors }));
      }
      setFormError(result.toast);
      setRetryable(result.retryable);
      if (result.unauthenticated && signedIn) signOutPortal("platform");
    } finally {
      setSubmitting(false);
      guard.finish();
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmitRegistration({ signedIn, busy: submitting })) return;
    register(values);
  };

  const columns = [
    { key: "name", label: "Name", render: (row) => displayName(row) },
    { key: "email", label: "Email", render: (row) => row.email },
    { key: "role", label: "Role", render: (row) => platformStaffRoleLabel(row.role) || row.role },
    { key: "status", label: "Status", render: (row) => (row.isActive ? "Active" : "Inactive") },
  ];

  return (
    <section className="platform-staff-page">
      <header className="platform-staff-header">
        <div>
          <h1 className="platform-sr-only">Platform Staff</h1>
          <p>Manage CRM and Accountant accounts for your SaffoCare platform.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Register Staff</Button>
      </header>

      <p className="platform-staff-note">
        CRM and accountant accounts. The platform admin and hospital staff are not listed, and passwords are never shown.
      </p>
      {listError && (
        <div className="platform-staff-alert" role="alert">
          <p>{listError}</p>
          <Button onClick={loadStaff} disabled={loading}>{loading ? "Loading…" : "Try again"}</Button>
        </div>
      )}

      <DataTable
        rows={loading && rows.length === 0 ? [] : rows}
        columns={columns}
        emptyTitle={loading ? "Loading platform staff" : "No CRM or accountant accounts"}
        emptyMessage={loading ? "Fetching the staff directory." : "Use Register Staff to create a CRM or Accountant account. Hospital staff are not registered here."}
      />

      <Modal
        open={open}
        title="Register Staff"
        subtitle="Creates a CRM or Accountant account with no hospital attached."
        onClose={close}
        size="lg"
      >
        <form className="platform-staff-form" onSubmit={submit} noValidate>
          {!signedIn && (
            <p className="platform-staff-alert" role="alert">
              Sign in with a platform admin account before registering staff.{" "}
              <Link to={UNIVERSAL_LOGIN}>Go to sign in</Link>
            </p>
          )}
          {formError && (
            <div className="platform-staff-alert" role="alert">
              <p>{formError}</p>
              {retryable && (
                <Button onClick={() => register(values)} disabled={!canSubmit}>
                  {submitting ? "Retrying…" : "Retry"}
                </Button>
              )}
            </div>
          )}
          <div className="platform-staff-grid">
            <Input
              label={<Label text="First Name" />}
              value={values.firstName}
              error={errors.firstName}
              maxLength={100}
              autoComplete="given-name"
              onChange={(event) => setField("firstName", event.target.value)}
            />
            <Input
              label={<Label text="Last Name" optional />}
              value={values.lastName}
              error={errors.lastName}
              maxLength={100}
              autoComplete="family-name"
              onChange={(event) => setField("lastName", event.target.value)}
            />
            <Input
              label={<Label text="Email" />}
              type="email"
              value={values.email}
              error={errors.email}
              autoComplete="off"
              onChange={(event) => setField("email", event.target.value)}
            />
            <PasswordField
              label={<Label text="Password" />}
              value={values.password}
              error={errors.password}
              hint="8–128 characters."
              autoComplete="new-password"
              maxLength={128}
              onChange={(event) => setField("password", event.target.value)}
            />
            <Select
              label={<Label text="Role" />}
              value={values.role}
              error={errors.role}
              onChange={(event) => setField("role", event.target.value)}
            >
              <option value="">Select a role</option>
              {PLATFORM_STAFF_ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </Select>
          </div>
          <p className="platform-staff-required"><span className="req">*</span> Required field</p>
          <div className="platform-staff-actions">
            <Button variant="secondary" onClick={close} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Registering…" : "Register Staff"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
