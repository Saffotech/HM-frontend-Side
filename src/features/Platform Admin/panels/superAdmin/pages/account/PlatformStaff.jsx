import { useState } from "react";
import { hasPlatformAccessToken } from "../../../../shared/api/platformSession";
import { createPlatformStaff } from "../../../../shared/api/platformStaffApi";
import {
  PLATFORM_STAFF_ROLES,
  createSubmitGuard,
  interpretStaffError,
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
  const [created, setCreated] = useState([]);
  const [guard] = useState(() => createSubmitGuard());
  const signedIn = hasPlatformAccessToken();

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
      setCreated((current) => [notice, ...current.filter((item) => item.userId !== notice.userId)]);
      setValues(blank);
      setErrors({});
      setOpen(false);
      push(`${notice.message}. ${displayName(notice)} (${notice.email}) was created.`, "success");
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
          <h1>Platform Staff</h1>
          <p>Manage CRM and Accountant accounts for your SaffoCare platform.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Register Staff</Button>
      </header>

      <p className="platform-staff-note">
        Accounts registered in this visit are listed below. A platform staff directory is not available from the server.
      </p>

      <DataTable
        rows={created}
        columns={columns}
        emptyTitle="No platform staff registered in this visit"
        emptyMessage="Use Register Staff to create a CRM or Accountant account. Hospital staff are not registered here."
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
              Sign in with a platform admin account before registering staff.
            </p>
          )}
          {formError && (
            <div className="platform-staff-alert" role="alert">
              <p>{formError}</p>
              {retryable && (
                <Button onClick={() => register(values)} disabled={submitting}>
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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registering…" : "Register Staff"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
