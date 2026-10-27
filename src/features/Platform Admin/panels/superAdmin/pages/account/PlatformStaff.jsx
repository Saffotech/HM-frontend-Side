import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { hasPlatformAccessToken } from "../../../../shared/api/platformSession";
import {
  createPlatformStaff,
  listPlatformStaff,
} from "../../../../shared/api/platformStaffApi";
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
      {!optional && (
        <span className="req" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </>
  );
}

function displayName(person) {
  return (
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    person.email
  );
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
  const [query, setQuery] = useState("");
  const [staffFilter, setStaffFilter] = useState("all");
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
        setFormError(
          "Registration did not confirm the new account. It was not marked as created.",
        );
        return;
      }
      setValues(blank);
      setErrors({});
      setOpen(false);
      push(
        `${notice.message}. ${displayName(notice)} (${notice.email}) was created.`,
        "success",
      );
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
    {
      key: "name",
      label: "Staff member",
      render: (row) => (
        <span className="platform-staff-person">
          <span className="platform-staff-avatar" aria-hidden="true">
            {displayName(row)
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <span>
            <strong>{displayName(row)}</strong>
            <small>Platform account</small>
          </span>
        </span>
      ),
    },
    { key: "email", label: "Email", render: (row) => row.email },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <span
          className={`platform-staff-role platform-staff-role--${String(row.role).toLowerCase()}`}
        >
          {platformStaffRoleLabel(row.role) || row.role}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`platform-staff-status ${row.isActive ? "is-active" : "is-inactive"}`}
        >
          <i />
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];
  const activeCount = rows.filter((row) => row.isActive).length;
  const crmCount = rows.filter(
    (row) => String(row.role).toLowerCase() === "crm",
  ).length;
  const accountantCount = rows.filter(
    (row) => String(row.role).toLowerCase() === "accountant",
  ).length;
  const filteredRows = rows.filter((row) => {
    const role = String(row.role).toLowerCase();
    const matchesFilter =
      staffFilter === "all" ||
      (staffFilter === "active" ? row.isActive : role === staffFilter);
    const term = query.trim().toLowerCase();
    return (
      matchesFilter &&
      (!term || `${displayName(row)} ${row.email}`.toLowerCase().includes(term))
    );
  });

  return (
    <section className="platform-staff-page">
      <div className="platform-staff-summary" aria-label="Staff summary">
        <button className="platform-staff-register-card" onClick={() => setOpen(true)}>
          <span className="register-card-icon" aria-hidden="true">＋</span>
          <span className="register-card-copy"><strong>Register staff</strong></span>
          <span className="register-card-arrow" aria-hidden="true">→</span>
        </button>
        <button className={`platform-staff-filter-card${staffFilter === "all" ? " is-selected" : ""}`} onClick={() => setStaffFilter("all")} aria-pressed={staffFilter === "all"}>
          <span className="summary-icon summary-icon--total">✦</span>
          <div>
            <small>Total staff</small>
            <strong>{loading ? "—" : rows.length}</strong>
          </div>
        </button>
        <button className={`platform-staff-filter-card${staffFilter === "active" ? " is-selected" : ""}`} onClick={() => setStaffFilter("active")} aria-pressed={staffFilter === "active"}>
          <span className="summary-icon summary-icon--active">✓</span>
          <div>
            <small>Active accounts</small>
            <strong>{loading ? "—" : activeCount}</strong>
          </div>
        </button>
        <button className={`platform-staff-filter-card${staffFilter === "crm" ? " is-selected" : ""}`} onClick={() => setStaffFilter("crm")} aria-pressed={staffFilter === "crm"}>
          <span className="summary-icon summary-icon--crm">◈</span>
          <div>
            <small>CRM team</small>
            <strong>{loading ? "—" : crmCount}</strong>
          </div>
        </button>
        <button className={`platform-staff-filter-card${staffFilter === "accountant" ? " is-selected" : ""}`} onClick={() => setStaffFilter("accountant")} aria-pressed={staffFilter === "accountant"}>
          <span className="summary-icon summary-icon--finance">＄</span>
          <div>
            <small>Accountants</small>
            <strong>{loading ? "—" : accountantCount}</strong>
          </div>
        </button>
      </div>
      {listError && (
        <div className="platform-staff-alert" role="alert">
          <p>{listError}</p>
          <Button onClick={loadStaff} disabled={loading}>
            {loading ? "Loading…" : "Try again"}
          </Button>
        </div>
      )}

      <section className="platform-staff-directory">
        <div className="platform-staff-directory-head">
          <div>
            <h2>Staff directory</h2>
          </div>
          <span className="platform-staff-total">
            {filteredRows.length}{" "}
            {filteredRows.length === 1 ? "member" : "members"}
          </span>
        </div>
        <div className="platform-staff-toolbar">
          <label className="platform-staff-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email"
              aria-label="Search staff"
            />
          </label>
        </div>
        <DataTable
          rows={loading && rows.length === 0 ? [] : filteredRows}
          columns={columns}
          emptyTitle={
            loading ? "Loading platform staff" : "No CRM or accountant accounts"
          }
          emptyMessage={
            loading
              ? "Fetching the staff directory."
              : query || staffFilter !== "all"
                ? "Try changing your search or selected staff card."
                : "Use Register Staff to create a CRM or Accountant account. Hospital staff are not registered here."
          }
        />
        <p className="platform-staff-footnote">
          Platform admins and hospital staff are not included. Passwords are
          never displayed.
        </p>
      </section>

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
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </div>
          <p className="platform-staff-required">
            <span className="req">*</span> Required field
          </p>
          <div className="platform-staff-actions">
            <Button variant="secondary" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Registering…" : "Register Staff"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
